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

Протокол (браузер — src/lib/assistant/callBridge.js, менять парой):
  агент → браузер  luna.ask    {id, text, opening}  ответ «ok» сразу
  браузер → агент  luna.reply  {id, text} … {id, end: true[, silent: true]}
  агент → браузер  luna.cancel {id}                 ученик перебил — ответ не нужен
  браузер → агент  luna.say    {text}               сказать шаг тура (пусто — замолчать)

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

    async def ask(self, text: str, opening: bool = False) -> AsyncIterator[str]:
        """Фразы ответа по мере прихода. Браузер не ответил, замолчал или
        закончил ответ без единой фразы — одна запасная фраза («не получилось»),
        а не тишина в звонке. Исключения: первая реплика (браузер сам решает,
        что сказать в начале) и `silent` — ответ снят нарочно («Новый чат»).

        Любой выход, кроме конца от браузера, шлёт ему luna.cancel: и ученик
        перебил, и браузер замолчал по таймауту — его запрос к модели дальше
        не нужен (ревью 16.10.2026: по таймауту стрим шёл до конца впустую)."""
        rid = f"{int(time.time() * 1000)}-{next(self._seq)}"
        queue: asyncio.Queue = asyncio.Queue()
        self._queues[rid] = queue
        done = False
        said = False
        # Жизненный цикл ответа — в лог одной строкой (живой звонок 16.10.2026:
        # после первой реплики Луна молчала, а по логу было не понять, спросил ли
        # агент браузер и что тот ответил). Только длины и время — без слов
        # ученика.
        t0 = time.monotonic()
        first: float | None = None
        phrases = 0
        outcome = "cancelled"
        browser = ""
        try:
            try:
                await self._lp.perform_rpc(
                    destination_identity=self._identity,
                    method=ASK_METHOD,
                    payload=json.dumps({"id": rid, "text": text, "opening": opening}, ensure_ascii=False),
                    response_timeout=ASK_RPC_SEC,
                )
            except Exception as e:
                logger.warning("[luna-call] ask failed: %s", e)
                outcome = "ask_failed"
                yield fallback_text(self._lang)
                return
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
                    said = True
                    phrases += 1
                    if first is None:
                        first = time.monotonic() - t0
                    yield piece
                if msg.get("end"):
                    done = True
                    outcome = "silent" if msg.get("silent") else "end"
                    browser = timing_text(msg.get("timing"))
                    if not said and not opening and not msg.get("silent"):
                        yield fallback_text(self._lang)
                    return
                timeout = NEXT_PHRASE_SEC
        finally:
            logger.info(
                "[luna-call] reply %s: %s, %d phrases, first %s, total %.2fs, asked %d chars%s%s",
                rid, outcome, phrases, f"{first:.2f}s" if first is not None else "-",
                time.monotonic() - t0, len(text or ""), " (opening)" if opening else "",
                f"; browser {browser}" if browser else "",
            )
            self._queues.pop(rid, None)
            # Генерацию оборвали снаружи (ученик перебил) — браузеру незачем
            # дальше тратить запрос к модели.
            if not done:
                self._fire(CANCEL_METHOD, {"id": rid})


def timing_text(raw: Any) -> str:
    """Тайминги, которые браузер прислал с концом ответа, — в строку лога:
    сколько он ждал заголовков чат-роута, первого куска текста и первой фразы,
    и что из этого сервер (x-assistant-timing). Только числа и короткая строка
    сервера — ничего от ученика."""
    if not isinstance(raw, dict):
        return ""
    parts = []
    for key, label in (("headersMs", "headers"), ("firstDeltaMs", "first text"), ("firstPhraseMs", "first phrase")):
        value = raw.get(key)
        if isinstance(value, (int, float)) and 0 <= value < 600_000:
            parts.append(f"{label} {value / 1000:.2f}s")
    server = raw.get("server")
    if isinstance(server, str) and server.strip():
        parts.append(f"server {server.strip()[:120]}")
    return ", ".join(parts)


def say_payload_text(data: Any) -> str | None:
    """Текст из luna.say; None — запрос битый."""
    try:
        msg = json.loads(getattr(data, "payload", "") or "")
    except (TypeError, ValueError):
        return None
    if not isinstance(msg, dict):
        return None
    return str(msg.get("text") or "")[:1200]
