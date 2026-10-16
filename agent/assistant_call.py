"""Звонок Луне-помощнику (16.10.2026): уши и голос — агент, мозг — браузер.

Помощник по сайту уже умеет всё, что нужно в звонке: видит экран ученика
(снимок DOM), знает его домашку и план, открывает разделы, водит турами,
записывает поломки — и всё это собирает роут /api/assistant/chat по ТОКЕНУ
ученика. Переписывать это на Python значило бы держать две копии правил Луны и
отдать агенту токен аккаунта. Поэтому в звонке агент делает только то, чего не
умеет браузер в реальном времени: слушает (Soniox, детектор конца хода,
перебивание) и говорит голосом Луны. Реплику ученика он отдаёт браузеру
RPC-вызовом luna.ask, браузер спрашивает тот же чат-роут, что и окно, и
присылает ответ обратно фразами (luna.reply) — агент озвучивает их по мере
прихода, не дожидаясь конца ответа.

Скорость (16.10.2026, «как в Speaking Buddy»): вопрос уходит браузеру ещё до
того, как LiveKit решил, что ученик договорил (упреждающая генерация, как у
тьюторов). Такой ход — черновик: браузер начинает спрашивать модель, но в окне
его не показывает, пока агент не пришлёт luna.commit; LiveKit выбросил черновик
(ученик продолжил фразу) — luna.cancel с drop, и следа в окне нет.

Протокол (браузер — src/lib/assistant/callBridge.js, менять парой):
  агент → браузер  luna.ask    {id, text, opening[, pending]}  ответ «ok» сразу
  агент → браузер  luna.commit {id}                 черновик (pending) стал ходом
  браузер → агент  luna.reply  {id, text[, t]} … {id, end: true[, silent: true]}
  агент → браузер  luna.cancel {id[, drop]}         ученик перебил — ответ не нужен;
                                                    drop — ход так и не начался
  браузер → агент  luna.say    {text}               сказать шаг тура (пусто — замолчать)

`t` в первой фразе — замеры браузера (сколько ждал первый кусок ответа и что
насчитал сам роут, Server-Timing): агент пишет их в строку LATENCY luna, иначе
по логам не понять, где в звонке теряется время.

Модуль не импортирует agent.py: тот запускается скриптом и тянет за собой весь
стек, а мост проверяется отдельно (test_assistant_call.py).
"""

from __future__ import annotations

import asyncio
import itertools
import json
import logging
import time
from typing import Any, AsyncIterator

logger = logging.getLogger("jts-tutor")

ASSISTANT_MODE = "assistant"

ASK_METHOD = "luna.ask"
COMMIT_METHOD = "luna.commit"
REPLY_METHOD = "luna.reply"
CANCEL_METHOD = "luna.cancel"
SAY_METHOD = "luna.say"

# Браузер отвечает на luna.ask сразу («принял»), сам ответ идёт фразами.
ASK_RPC_SEC = 5.0
# Первая фраза: модель чата отвечает за 1–2 с, но перед ней роут спрашивает
# бэкенд о контексте ученика — запас на медленный бэкенд. Дольше — честно
# говорим, что не вышло, а не молчим.
FIRST_PHRASE_SEC = 20.0
# Между фразами — поток модели уже идёт, долгая пауза значит обрыв.
NEXT_PHRASE_SEC = 15.0

FALLBACK = {
    "ru": "Не получилось ответить. Повторите, пожалуйста.",
    "kz": "Жауап бере алмадым. Қайталап айтыңызшы.",
    "en": "Sorry, I couldn't answer that. Please say it again.",
}
GOODBYE = {
    "ru": "Время звонка на сегодня закончилось. Продолжим в чате!",
    "kz": "Бүгінгі қоңырау уақыты бітті. Чатта жалғастырайық!",
    "en": "That's all the call time for today. Let's continue in the chat!",
}


def _lang(lang: str) -> str:
    lang = (lang or "").strip().lower()
    return "kz" if lang in ("kz", "kk") else lang if lang in FALLBACK else "ru"


def fallback_text(lang: str) -> str:
    return FALLBACK[_lang(lang)]


def goodbye_text(lang: str) -> str:
    return GOODBYE[_lang(lang)]


def spoken(piece: str) -> str:
    """Фраза для синтеза: без пробела на стыке соседние фразы слиплись бы в одно
    слово («сделать.Открываю»)."""
    return piece if piece.endswith((" ", "\n")) else piece + " "


class BrowserBrain:
    """Мост к браузеру ученика: спросить ответ и принять его фразами.

    local_participant — участник агента в комнате (perform_rpc), identity —
    ученик. Один ответ за раз не навязываем: если LiveKit начал новую
    генерацию, прежняя уже отменена им самим, и её хвост просто не найдёт
    своей очереди (см. on_reply)."""

    def __init__(self, local_participant: Any, identity: str, lang: str = "ru"):
        self._lp = local_participant
        self._identity = identity
        self._lang = lang
        self._queues: dict[str, asyncio.Queue] = {}
        self._seq = itertools.count(1)
        # Держим ссылки на фоновые RPC (отмена), иначе их соберёт GC на лету.
        self._bg: set[asyncio.Task] = set()

    async def on_reply(self, data: Any) -> str:
        """RPC luna.reply. Фраза чужого (уже отменённого) ответа — «stale»."""
        try:
            msg = json.loads(getattr(data, "payload", "") or "")
        except (TypeError, ValueError):
            return "bad"
        if not isinstance(msg, dict):
            return "bad"
        queue = self._queues.get(str(msg.get("id") or ""))
        if queue is None:
            return "stale"
        queue.put_nowait(msg)
        return "ok"

    def _fire(self, method: str, payload: dict[str, Any]) -> None:
        async def run() -> None:
            try:
                await self._lp.perform_rpc(
                    destination_identity=self._identity,
                    method=method,
                    payload=json.dumps(payload, ensure_ascii=False),
                    response_timeout=ASK_RPC_SEC,
                )
            except Exception as e:  # браузер ушёл — отменять уже нечего
                logger.info("[luna-call] %s not delivered: %s", method, e)

        task = asyncio.create_task(run())
        self._bg.add(task)
        task.add_done_callback(self._bg.discard)

    def _watch_commit(self, rid: str, speech: Any, state: dict[str, Any]) -> None:
        """Черновик стал ходом — сказать браузеру. Ждём, пока LiveKit поставит
        речь в очередь (_wait_for_scheduled — так он подтверждает упреждающую
        генерацию); выброшенный черновик своей очереди не дождётся, и наблюдатель
        снимается вместе с речью."""

        async def run() -> None:
            try:
                await speech._wait_for_scheduled()
            except asyncio.CancelledError:
                return
            state["committed"] = True
            logger.info("[luna-call] commit after %.3fs", time.monotonic() - state["t0"])
            self._fire(COMMIT_METHOD, {"id": rid})

        task = asyncio.create_task(run())
        self._bg.add(task)
        task.add_done_callback(self._bg.discard)
        try:
            speech.add_done_callback(lambda _: task.cancel())
        except Exception:  # чужой объект речи — наблюдатель кончится с процессом
            pass

    async def ask(self, text: str, opening: bool = False, speech: Any = None) -> AsyncIterator[str]:
        """Фразы ответа по мере прихода. Браузер не ответил, замолчал или
        закончил ответ без единой фразы — одна запасная фраза («не получилось»),
        а не тишина в звонке. Исключения: первая реплика (браузер сам решает,
        что сказать в начале) и `silent` — ответ снят нарочно («Новый чат»).

        speech — речь LiveKit, для которой спрашиваем. Ещё не в очереди — это
        упреждающая генерация: вопрос уходит черновиком (pending), а ход
        браузер покажет по luna.commit (см. шапку модуля).

        Любой выход, кроме конца от браузера, шлёт ему luna.cancel: и ученик
        перебил, и браузер замолчал по таймауту — его запрос к модели дальше
        не нужен (ревью 16.10.2026: по таймауту стрим шёл до конца впустую)."""
        rid = f"{int(time.time() * 1000)}-{next(self._seq)}"
        queue: asyncio.Queue = asyncio.Queue()
        self._queues[rid] = queue
        pending = speech is not None and not getattr(speech, "scheduled", True)
        done = False
        said = False
        # Жизненный цикл ответа — в лог одной строкой (живой звонок 16.10.2026:
        # после первой реплики Луна молчала, а по логу было не понять, спросил ли
        # агент браузер и что тот ответил). Только длины и время — без слов
        # ученика.
        t0 = time.monotonic()
        state: dict[str, Any] = {"committed": not pending, "t0": t0}
        first: float | None = None
        phrases = 0
        outcome = "cancelled"
        try:
            payload: dict[str, Any] = {"id": rid, "text": text, "opening": opening}
            if pending:
                payload["pending"] = True
            try:
                await self._lp.perform_rpc(
                    destination_identity=self._identity,
                    method=ASK_METHOD,
                    payload=json.dumps(payload, ensure_ascii=False),
                    response_timeout=ASK_RPC_SEC,
                )
            except Exception as e:
                logger.warning("[luna-call] ask failed: %s", e)
                outcome = "ask_failed"
                yield fallback_text(self._lang)
                return
            if pending:
                self._watch_commit(rid, speech, state)
            timeout = FIRST_PHRASE_SEC
            while True:
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout)
                except asyncio.TimeoutError:
                    logger.warning("[luna-call] reply stalled (%s phrases said)", "some" if said else "no")
                    outcome = "stalled"
                    if not said:
                        yield fallback_text(self._lang)
                    return
                piece = str(msg.get("text") or "")
                if piece.strip():
                    if not said:
                        # Первая фраза ответа: сколько браузер шёл до неё и где
                        # (его замеры — в `t`). Задержку звонка мерить только так:
                        # сумма звеньев по отдельности уже врала втрое.
                        logger.info(
                            "LATENCY luna first_phrase=%.3fs pending=%s opening=%s browser=%s",
                            time.monotonic() - t0, pending, opening,
                            json.dumps(msg.get("t"), ensure_ascii=False) if msg.get("t") else "-",
                        )
                    said = True
                    phrases += 1
                    if first is None:
                        first = time.monotonic() - t0
                    yield piece
                if msg.get("end"):
                    done = True
                    outcome = "silent" if msg.get("silent") else "end"
                    if not said and not opening and not msg.get("silent"):
                        yield fallback_text(self._lang)
                    return
                timeout = NEXT_PHRASE_SEC
        finally:
            logger.info(
                "[luna-call] reply %s: %s, %d phrases, first %s, total %.2fs, asked %d chars%s%s",
                rid, outcome, phrases, f"{first:.2f}s" if first is not None else "-",
                time.monotonic() - t0, len(text or ""), " (opening)" if opening else "",
                " (draft)" if pending else "",
            )
            self._queues.pop(rid, None)
            # Генерацию оборвали снаружи (ученик перебил, LiveKit выбросил
            # черновик) — браузеру незачем дальше тратить запрос к модели. drop —
            # ход так и не начался: в окне от него не должно остаться следа.
            if not done:
                cancel: dict[str, Any] = {"id": rid}
                if not state["committed"]:
                    cancel["drop"] = True
                self._fire(CANCEL_METHOD, cancel)


def say_payload_text(data: Any) -> str | None:
    """Текст из luna.say; None — запрос битый."""
    try:
        msg = json.loads(getattr(data, "payload", "") or "")
    except (TypeError, ValueError):
        return None
    if not isinstance(msg, dict):
        return None
    return str(msg.get("text") or "")[:1200]
