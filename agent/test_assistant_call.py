"""Мост звонка Луне-помощнику (assistant_call.py). pytest в проекте нет — файл
запускается напрямую:
    agent/venv/Scripts/python.exe agent/test_assistant_call.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.
"""
import asyncio
import io
import json
import sys
from types import SimpleNamespace

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

import assistant_call as C  # noqa: E402


class FakeParticipant:
    """local_participant агента: perform_rpc пишется в журнал, а ответ браузера
    подаёт сам тест через brain.on_reply."""

    def __init__(self, fail_ask=False):
        self.calls = []
        self.fail_ask = fail_ask

    async def perform_rpc(self, *, destination_identity, method, payload, response_timeout=None):
        self.calls.append((destination_identity, method, json.loads(payload)))
        if self.fail_ask and method == C.ASK_METHOD:
            raise RuntimeError("no handler")
        return "ok"


def reply(brain, **msg):
    return asyncio.ensure_future(brain.on_reply(SimpleNamespace(payload=json.dumps(msg))))


async def collect(gen):
    return [x async for x in gen]


async def test_phrases_in_order():
    lp = FakeParticipant()
    brain = C.BrowserBrain(lp, "student-1", "ru")
    gen = brain.ask("где домашка?")
    first = asyncio.ensure_future(gen.__anext__())
    await asyncio.sleep(0)
    _, method, payload = lp.calls[0]
    assert method == C.ASK_METHOD and payload["text"] == "где домашка?" and payload["opening"] is False
    rid = payload["id"]
    assert await reply(brain, id=rid, text="Домашка на Главной.") == "ok"
    assert await first == "Домашка на Главной."
    await reply(brain, id=rid, text="Открываю.")
    await reply(brain, id=rid, end=True)
    rest = await collect(gen)
    assert rest == ["Открываю."], rest
    # Ответ кончился сам — отменять нечего.
    await asyncio.sleep(0)
    assert [m for _, m, _ in lp.calls] == [C.ASK_METHOD]


async def test_stale_reply_after_end():
    lp = FakeParticipant()
    brain = C.BrowserBrain(lp, "student-1")
    gen = brain.ask("", opening=True)
    task = asyncio.ensure_future(collect(gen))
    await asyncio.sleep(0)
    rid = lp.calls[0][2]["id"]
    assert lp.calls[0][2]["opening"] is True
    await reply(brain, id=rid, end=True)
    assert await task == []
    assert await reply(brain, id=rid, text="поздно") == "stale"
    assert await brain.on_reply(SimpleNamespace(payload="не json")) == "bad"


async def test_cancel_on_interrupt():
    lp = FakeParticipant()
    brain = C.BrowserBrain(lp, "student-1")
    gen = brain.ask("расскажи")
    first = asyncio.ensure_future(gen.__anext__())
    await asyncio.sleep(0)
    rid = lp.calls[0][2]["id"]
    await reply(brain, id=rid, text="Сейчас расскажу.")
    assert await first == "Сейчас расскажу."
    # Ученик перебил: LiveKit закрывает генератор.
    await gen.aclose()
    await asyncio.sleep(0.01)
    assert lp.calls[-1][1] == C.CANCEL_METHOD and lp.calls[-1][2] == {"id": rid}


async def test_fallback_when_browser_missing():
    lp = FakeParticipant(fail_ask=True)
    brain = C.BrowserBrain(lp, "student-1", "kz")
    assert await collect(brain.ask("сәлем")) == [C.FALLBACK["kz"]]


async def test_fallback_on_silence():
    old = C.FIRST_PHRASE_SEC
    C.FIRST_PHRASE_SEC = 0.05
    try:
        lp = FakeParticipant()
        brain = C.BrowserBrain(lp, "student-1", "en")
        assert await collect(brain.ask("hi")) == [C.FALLBACK["en"]]
    finally:
        C.FIRST_PHRASE_SEC = old


def test_texts():
    assert C.spoken("Привет.") == "Привет. "
    assert C.spoken("Привет.\n") == "Привет.\n"
    assert C.goodbye_text("kk") == C.GOODBYE["kz"]
    assert C.fallback_text("de") == C.FALLBACK["ru"]
    assert C.say_payload_text(SimpleNamespace(payload='{"text":"Шаг 1"}')) == "Шаг 1"
    assert C.say_payload_text(SimpleNamespace(payload='{"text":""}')) == ""
    assert C.say_payload_text(SimpleNamespace(payload="[]")) is None


async def main():
    await test_phrases_in_order()
    await test_stale_reply_after_end()
    await test_cancel_on_interrupt()
    await test_fallback_when_browser_missing()
    await test_fallback_on_silence()
    test_texts()


asyncio.run(main())
print("ok")
