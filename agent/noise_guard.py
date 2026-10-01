"""Защита голосового тьютора от фона: замок на ученика и сторож конца хода.

Жалоба 01.10.2026: в шумном месте тьютор отвечает на чужие слова, сам
замолкает на полуслове и не понимает, что ученик договорил. Krisp BVC к этому
моменту уже стоял на всех звонках (`Krisp BVC: on` в логах) — но близкий голос
(телевизор рядом, сосед за столом) и музыка с пением его частично проходят, а
Soniox послушно пишет их в реплику ученика.

Здесь два независимых слоя, оба выключаются секретом воркера:

* SpeakerLock — Soniox размечает говорящих (enable_speaker_diarization), а мы
  выкидываем слова всех, кроме основного. Основной — самый громкий: ученик
  сидит у микрофона, фон дальше, и BVC его вдобавок приглушает. Выкидываем на
  уровне СЛОВ, до того как плагин склеит их в реплику: штатный
  MultiSpeakerAdapter из livekit-agents решает по реплике целиком, а плагин
  Soniox 1.6.7 отдаёт реплике говорящего ПЕРВОГО слова (_TokenAccumulator).
  При непрерывном фоне конец фразы у Soniox не наступает, и реплика «телевизор
  + ученик» целиком ушла бы телевизору — вместе со словами ученика.

* TurnWatchdog — детектор голоса держит ход открытым, пока слышит хоть что-то
  похожее на речь, и музыка с пением держит его бесконечно. Сторож закрывает ход
  сам, если «речь» идёт, а слов ученика (уже после фильтра) нет дольше порога.
"""

from __future__ import annotations

import asyncio
import json
import logging
import math
import os
import time
from statistics import median
from typing import Any, Callable

import numpy as np

try:  # pragma: no cover - плагина нет только в урезанных окружениях
    import aiohttp
    from livekit import rtc
    from livekit.plugins import soniox
    # SpeechStream пакет наружу не отдаёт — только модуль stt.
    from livekit.plugins.soniox import stt as soniox_stt
except Exception:  # pragma: no cover
    aiohttp = None
    rtc = None
    soniox = None
    soniox_stt = None

logger = logging.getLogger("jts-agent")


# ── Рубильники ───────────────────────────────────────────────────────────────
# Всё через env, как остальные ручки агента: агент катится вручную, и включить
# или откатить слой надо секретом воркера, без пересборки образа.
#
# SPEAKER_LOCK=on|off — фильтр говорящих.
# TURN_WATCHDOG_SEC=<сек> — сторож конца хода; 0 или пусто — выключен.
# NOISE_GUARD_TUTORS=bro,hype — сузить оба слоя до персон (канарейка).
# SPEAKER_LOCK_RATIO — во сколько раз новый говорящий должен быть громче
#   основного, чтобы забрать у него микрофон.
# SPEAKER_LOCK_KEEP — доля громкости ученика, начиная с которой слово
#   «чужого» говорящего всё-таки оставляем; 0 — только разметка Soniox.
SPEAKER_LOCK_DEFAULT = "on"
TURN_WATCHDOG_DEFAULT_SEC = 1.2
SPEAKER_LOCK_RATIO_DEFAULT = 1.3
# Слово «чужого» говорящего не выкидываем, если оно почти так же громкое, как
# речь ученика: при громком фоне разметка Soniox приписывает фону слова
# ученика, сказанные ПОВЕРХ фона, а громкость смеси не ниже голоса ученика.
# Замер 01.10.2026 (90 прогонов, фон −6/−12 дБ без BVC): поправка вернула 2
# слова ученика из 12 потерянных («lessons», «can») ценой ничьей по фону.
# Безударные «than», «past» тихие сами по себе — их громкостью не вернуть.
SPEAKER_LOCK_KEEP_DEFAULT = 0.75

_OFF = ("off", "0", "false", "no")


def _tutor_allowed(tutor: str) -> bool:
    only = [
        x.strip().lower()
        for x in (os.getenv("NOISE_GUARD_TUTORS") or "").split(",")
        if x.strip()
    ]
    return not only or (tutor or "").strip().lower() in only


def speaker_lock_enabled(tutor: str) -> bool:
    """Включать ли фильтр говорящих в сессии этого тьютора."""
    raw = (os.getenv("SPEAKER_LOCK") or SPEAKER_LOCK_DEFAULT).strip().lower()
    if raw in _OFF:
        return False
    return _tutor_allowed(tutor)


def speaker_lock_ratio() -> float:
    raw = (os.getenv("SPEAKER_LOCK_RATIO") or "").strip()
    if not raw:
        return SPEAKER_LOCK_RATIO_DEFAULT
    try:
        value = float(raw)
    except ValueError:
        logger.warning("SPEAKER_LOCK_RATIO=%r не число — беру %s", raw, SPEAKER_LOCK_RATIO_DEFAULT)
        return SPEAKER_LOCK_RATIO_DEFAULT
    # Меньше единицы — тихий фон отбирал бы микрофон у ученика.
    if value < 1.0:
        logger.warning("SPEAKER_LOCK_RATIO=%r меньше 1 — беру %s", raw, SPEAKER_LOCK_RATIO_DEFAULT)
        return SPEAKER_LOCK_RATIO_DEFAULT
    return value


def speaker_lock_keep() -> float:
    raw = (os.getenv("SPEAKER_LOCK_KEEP") or "").strip()
    if not raw:
        return SPEAKER_LOCK_KEEP_DEFAULT
    try:
        value = float(raw)
    except ValueError:
        logger.warning("SPEAKER_LOCK_KEEP=%r не число — беру %s", raw, SPEAKER_LOCK_KEEP_DEFAULT)
        return SPEAKER_LOCK_KEEP_DEFAULT
    if not 0 <= value <= 1:
        logger.warning("SPEAKER_LOCK_KEEP=%r вне [0, 1] — беру %s", raw, SPEAKER_LOCK_KEEP_DEFAULT)
        return SPEAKER_LOCK_KEEP_DEFAULT
    return value


def turn_watchdog_sec(tutor: str) -> float:
    """Порог сторожа в секундах; 0 — сторож выключен."""
    raw = (os.getenv("TURN_WATCHDOG_SEC") or "").strip()
    value = TURN_WATCHDOG_DEFAULT_SEC
    if raw:
        try:
            value = float(raw)
        except ValueError:
            logger.warning("TURN_WATCHDOG_SEC=%r не число — сторож выключен", raw)
            return 0.0
    if value <= 0 or math.isnan(value):
        return 0.0
    return value if _tutor_allowed(tutor) else 0.0


# ── Замок на ученика ─────────────────────────────────────────────────────────


def _is_end_token(token: dict[str, Any]) -> bool:
    # Служебные токены Soniox: конец фразы и ответ на finalize. Говорящего у
    # них нет, и выкидывать их нельзя — по <end> плагин закрывает реплику.
    return token.get("text") in ("<end>", "<fin>")


class SpeakerLock:
    """Решает по каждому слову Soniox, оставить его или выкинуть.

    Громкость считаем сами по аудио, которое ушло в Soniox: у слова есть
    start_ms/end_ms от начала сокета, и мы берём медиану RMS по окнам 100 мс,
    попавшим в этот отрезок. По громкости каждого говорящего держим
    сглаженное среднее, обновляем его только на ФИНАЛЬНЫХ словах (черновые
    Soniox присылает повторно, они перевесили бы).

    Основной говорящий — первый, у кого появилась громкость. Сменить его может
    только тот, кто громче в `ratio` раз: без запаса микрофон метался бы между
    учеником и телевизором на каждом слове.
    """

    WINDOW_SEC = 0.1
    # Час аудио на сокет — с запасом больше дневного лимита звонка.
    MAX_WINDOWS = 36000

    def __init__(
        self,
        *,
        ratio: float = SPEAKER_LOCK_RATIO_DEFAULT,
        keep: float = SPEAKER_LOCK_KEEP_DEFAULT,
        smoothing: float = 0.5,
        on_switch: Callable[[str | None, str, float, float], None] | None = None,
    ) -> None:
        self._ratio = ratio
        self._keep = keep
        self._smoothing = smoothing
        self._on_switch = on_switch
        self.reset()

    def reset(self) -> None:
        """Новый сокет Soniox: время слов снова с нуля, номера говорящих тоже."""
        self._windows: list[float] = []
        self._base = 0  # индекс первого окна в _windows (после обрезки)
        self._acc_sq = 0.0
        self._acc_n = 0
        self._window_len = 0
        self._loudness: dict[str, float] = {}
        self.primary: str | None = None
        self.kept_words = 0
        self.dropped_words = 0

    # -- аудио --------------------------------------------------------------
    def push_pcm(self, pcm: bytes, sample_rate: int) -> None:
        """Аудио ровно в том порядке, в каком оно уходит в Soniox (s16le, моно)."""
        if not pcm or sample_rate <= 0:
            return
        if not self._window_len:
            self._window_len = max(1, int(sample_rate * self.WINDOW_SEC))
        samples = np.frombuffer(pcm, dtype=np.int16).astype(np.float64)
        pos = 0
        while pos < len(samples):
            take = min(len(samples) - pos, self._window_len - self._acc_n)
            chunk = samples[pos : pos + take]
            self._acc_sq += float(np.dot(chunk, chunk))
            self._acc_n += take
            pos += take
            if self._acc_n >= self._window_len:
                self._windows.append(math.sqrt(self._acc_sq / self._acc_n))
                self._acc_sq = 0.0
                self._acc_n = 0
        if len(self._windows) > self.MAX_WINDOWS:
            cut = len(self._windows) - self.MAX_WINDOWS
            del self._windows[:cut]
            self._base += cut

    def _token_loudness(self, token: dict[str, Any]) -> float | None:
        start, end = token.get("start_ms"), token.get("end_ms")
        if start is None or end is None:
            return None
        i0 = int(float(start) / 1000 / self.WINDOW_SEC) - self._base
        i1 = int(math.ceil(float(end) / 1000 / self.WINDOW_SEC)) - self._base
        i0 = max(i0, 0)
        i1 = min(i1, len(self._windows))
        if i1 <= i0:
            return None
        return float(median(self._windows[i0:i1]))

    # -- слова --------------------------------------------------------------
    def _observe(self, speaker: str, token: dict[str, Any]) -> None:
        loud = self._token_loudness(token)
        if loud is None:
            return
        prev = self._loudness.get(speaker)
        self._loudness[speaker] = (
            loud if prev is None else prev * self._smoothing + loud * (1 - self._smoothing)
        )
        if self.primary is None:
            self.primary = speaker
            if self._on_switch:
                self._on_switch(None, speaker, self._loudness[speaker], 0.0)
            return
        if speaker == self.primary:
            return
        primary_loud = self._loudness.get(self.primary, 0.0)
        if self._loudness[speaker] > primary_loud * self._ratio:
            old = self.primary
            self.primary = speaker
            if self._on_switch:
                self._on_switch(old, speaker, self._loudness[speaker], primary_loud)

    def _loud_as_primary(self, token: dict[str, Any]) -> bool:
        if self._keep <= 0 or self.primary is None:
            return False
        primary_loud = self._loudness.get(self.primary)
        loud = self._token_loudness(token)
        return bool(primary_loud) and loud is not None and loud >= primary_loud * self._keep

    def filter_tokens(self, tokens: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], str]:
        """Оставить слова основного говорящего. Возвращает (оставленные,
        текст выкинутых ФИНАЛЬНЫХ слов) — второе только для лога."""
        kept: list[dict[str, Any]] = []
        dropped_final: list[str] = []
        for token in tokens:
            raw_speaker = token.get("speaker")
            if raw_speaker is None or _is_end_token(token):
                kept.append(token)
                continue
            speaker = str(raw_speaker)
            if token.get("is_final"):
                self._observe(speaker, token)
            # Пока основного нет (ни у кого ещё не посчитана громкость),
            # пропускаем всё: лучше лишнее слово, чем глухой тьютор.
            if self.primary is None or speaker == self.primary or self._loud_as_primary(token):
                kept.append(token)
                if token.get("is_final"):
                    self.kept_words += 1
            elif token.get("is_final"):
                self.dropped_words += 1
                dropped_final.append(str(token.get("text", "")))
        return kept, "".join(dropped_final).strip()


if aiohttp is not None and soniox is not None:

    class _FilteringWS:
        """Обёртка сокета Soniox: плагин читает из неё ответы, в которых уже
        нет слов фона. Отправка и закрытие уходят в настоящий сокет как есть."""

        def __init__(self, ws: Any, lock: SpeakerLock, log_drop: Callable[[str], None]) -> None:
            self._ws = ws
            self._lock = lock
            self._log_drop = log_drop

        def __getattr__(self, name: str) -> Any:
            return getattr(self._ws, name)

        def __aiter__(self):
            return self._iter()

        async def _iter(self):
            async for msg in self._ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    msg = self._filter(msg)
                yield msg

        def _filter(self, msg: Any) -> Any:
            try:
                content = json.loads(msg.data)
            except (TypeError, ValueError):
                return msg
            tokens = content.get("tokens")
            if not tokens:
                return msg
            kept, dropped = self._lock.filter_tokens(tokens)
            if dropped:
                self._log_drop(dropped)
            if len(kept) == len(tokens):
                return msg
            content["tokens"] = kept
            return msg._replace(data=json.dumps(content, ensure_ascii=False))

    class _GuardedSpeechStream(soniox_stt.SpeechStream):
        def __init__(self, stt: "GuardedSonioxSTT", conn_options: Any) -> None:
            super().__init__(stt=stt, conn_options=conn_options)
            self._lock = SpeakerLock(ratio=stt._ratio, keep=stt._keep, on_switch=self._log_switch)
            self._drop_buf: list[str] = []

        def _log_switch(self, old: str | None, new: str, loud: float, old_loud: float) -> None:
            if old is None:
                logger.info("Speaker lock: основной говорящий %s (громкость %.0f)", new, loud)
            else:
                logger.info(
                    "Speaker lock: основной говорящий %s → %s (громкость %.0f против %.0f)",
                    old, new, loud, old_loud,
                )

        def _log_drop(self, text: str) -> None:
            # Фон бубнит без перерыва — копим и печатаем кусками, а не по
            # строке на каждое слово.
            self._drop_buf.append(text)
            joined = " ".join(self._drop_buf)
            if len(joined) >= 60:
                logger.info("STT drop: фон «%s»", joined[:120])
                self._drop_buf = []

        async def _connect_ws(self) -> Any:
            ws = await super()._connect_ws()
            # Новый сокет — новое время слов и новые номера говорящих.
            self._lock.reset()
            self._drop_buf = []
            return _FilteringWS(ws, self._lock, self._log_drop)

        async def _prepare_audio_task(self) -> None:
            # Копия родителя (soniox 1.6.7) плюс счёт громкости: считать её надо
            # ровно по тому аудио, которое ушло в сокет, иначе время слов и окна
            # громкости разъедутся.
            if not self._ws:
                return
            async for data in self._input_ch:
                if isinstance(data, rtc.AudioFrame):
                    pcm_data = data.data.tobytes()
                    self._lock.push_pcm(pcm_data, data.sample_rate)
                    self.audio_queue.put_nowait(pcm_data)

        async def aclose(self) -> None:
            if self._lock.kept_words or self._lock.dropped_words:
                logger.info(
                    "Speaker lock: слов ученика %d, выкинуто фона %d",
                    self._lock.kept_words, self._lock.dropped_words,
                )
            await super().aclose()

    class GuardedSonioxSTT(soniox.STT):
        """soniox.STT с замком на основного говорящего. Разметку говорящих
        включает сам: без неё фильтровать нечего."""

        def __init__(
            self,
            *,
            ratio: float = SPEAKER_LOCK_RATIO_DEFAULT,
            keep: float = SPEAKER_LOCK_KEEP_DEFAULT,
            **kwargs: Any,
        ) -> None:
            params = kwargs.get("params") or soniox.STTOptions()
            params.enable_speaker_diarization = True
            kwargs["params"] = params
            super().__init__(**kwargs)
            self._ratio = ratio
            self._keep = keep

        def stream(self, *, language: Any = None, conn_options: Any = None) -> Any:
            from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS

            return _GuardedSpeechStream(
                stt=self, conn_options=conn_options or DEFAULT_API_CONNECT_OPTIONS
            )

else:  # pragma: no cover
    GuardedSonioxSTT = None  # type: ignore[assignment,misc]


# ── Сторож конца хода ────────────────────────────────────────────────────────


class TurnWatchdog:
    """Чистая логика сторожа: события на вход, «пора закрывать» на выход.

    Закрываем, когда одновременно:
      * детектор голоса считает, что ученик ещё говорит;
      * в этом ходе у ученика уже были слова;
      * нового слова нет дольше `quiet_sec`.
    Если слов в ходе не было вовсе — это чистый фон, ход не трогаем: тьютор
    просто продолжает слушать. В тихой комнате сторож не срабатывает никогда:
    детектор закрывает ход через 0.3 с тишины, раньше порога.
    """

    def __init__(self, quiet_sec: float, now: Callable[[], float] = time.monotonic) -> None:
        self.quiet_sec = quiet_sec
        self._now = now
        self.enabled = quiet_sec > 0
        self._speaking = False
        self._has_words = False
        self._last_word = 0.0

    def on_user_state(self, state: str) -> None:
        self._speaking = state == "speaking"
        if not self._speaking:
            # Ход закрылся штатно (или ученик ушёл) — копить больше нечего.
            self._has_words = False

    def on_transcript(self, text: str) -> None:
        if text and text.strip():
            self._has_words = True
            self._last_word = self._now()

    def on_agent_state(self, state: str) -> None:
        # Тьютор задумался или заговорил — ход уже отдан, слова этого хода
        # повторно закрывать нельзя.
        if state in ("thinking", "speaking"):
            self._has_words = False

    def should_commit(self) -> bool:
        if not (self.enabled and self._speaking and self._has_words):
            return False
        return self._now() - self._last_word >= self.quiet_sec

    def committed(self) -> None:
        self._has_words = False


def attach_turn_watchdog(session: Any, watchdog: TurnWatchdog, *, tick: float = 0.2) -> asyncio.Task:
    """Подписать сторожа на события сессии и запустить опрос.

    Опрос, а не таймер на каждое слово: событий «слово» много, а решение
    нужно одно, и проверка дешёвая."""

    @session.on("user_state_changed")
    def _on_user(ev: Any) -> None:
        watchdog.on_user_state(str(getattr(ev, "new_state", "")))

    @session.on("user_input_transcribed")
    def _on_words(ev: Any) -> None:
        watchdog.on_transcript(str(getattr(ev, "transcript", "") or ""))

    @session.on("agent_state_changed")
    def _on_agent(ev: Any) -> None:
        watchdog.on_agent_state(str(getattr(ev, "new_state", "")))

    async def _loop() -> None:
        while True:
            await asyncio.sleep(tick)
            if not watchdog.should_commit():
                continue
            watchdog.committed()
            held = watchdog._now() - watchdog._last_word
            logger.info(
                "TURN forced: слов ученика нет %.1f с, а детектор держит ход — закрываю",
                held,
            )
            try:
                fut = session.commit_user_turn(transcript_timeout=0.5)
            except Exception as e:  # сессия закрывается, активность сменилась
                logger.warning("TURN forced: commit_user_turn не прошёл (%s)", e)
                continue
            if fut is not None and hasattr(fut, "add_done_callback"):
                fut.add_done_callback(lambda f: f.cancelled() or f.exception())

    task = asyncio.create_task(_loop(), name="noise_guard.turn_watchdog")

    # Сессия закрылась — опрашивать больше некого. Без этого задача жила бы до
    # конца процесса воркера и звала commit_user_turn у мёртвой сессии.
    @session.on("close")
    def _on_close(ev: Any) -> None:
        task.cancel()

    return task
