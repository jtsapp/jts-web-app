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
        # Браузер замолчал — его запрос к модели больше не нужен.
        await asyncio.sleep(0.01)
        assert lp.calls[-1][1] == C.CANCEL_METHOD, lp.calls
    finally:
        C.FIRST_PHRASE_SEC = old


async def test_end_without_phrases():
    # Ответ кончился без единой фразы — запасная фраза, а не тишина...
    lp = FakeParticipant()
    brain = C.BrowserBrain(lp, "student-1", "ru")
    task = asyncio.ensure_future(collect(brain.ask("что дальше?")))
    await asyncio.sleep(0)
    await reply(brain, id=lp.calls[0][2]["id"], end=True)
    assert await task == [C.FALLBACK["ru"]]
    # ...кроме ответа, снятого нарочно («Новый чат»), и первой реплики.
    for opening, msg in ((False, {"end": True, "silent": True}), (True, {"end": True})):
        lp = FakeParticipant()
        brain = C.BrowserBrain(lp, "student-1", "ru")
        task = asyncio.ensure_future(collect(brain.ask("" if opening else "x", opening=opening)))
        await asyncio.sleep(0)
        await reply(brain, id=lp.calls[0][2]["id"], **msg)
        assert await task == [], msg
        assert [m for _, m, _ in lp.calls] == [C.ASK_METHOD]


async def settle(rounds=20):
    """Прокрутить цикл, пока фоновые RPC не дойдут. sleep(0.01) здесь мало:
    таймер Windows шагает по ~15 мс, и такой сон просыпается раньше задач,
    которым до RPC ещё несколько переходов (shield → наблюдатель → _fire)."""
    for _ in range(rounds):
        await asyncio.sleep(0)


class FakeSpeech:
    """Речь LiveKit: scheduled — подтверждена; _wait_for_scheduled ждёт
    подтверждения, add_done_callback — конца речи (выброшенный черновик)."""

    def __init__(self, scheduled=False):
        self._fut = asyncio.get_event_loop().create_future()
        if scheduled:
            self._fut.set_result(None)
        self._done = []

    @property
    def scheduled(self):
        return self._fut.done()

    async def _wait_for_scheduled(self):
        await asyncio.shield(self._fut)

    def schedule(self):
        self._fut.set_result(None)

    def add_done_callback(self, cb):
        self._done.append(cb)

    def finish(self):
        for cb in self._done:
            cb(self)


async def test_pending_commit():
    # Упреждающая генерация: вопрос уходит черновиком, ход — по подтверждению.
    lp = FakeParticipant()
    brain = C.BrowserBrain(lp, "student-1", "ru")
    speech = FakeSpeech()
    gen = brain.ask("как открыть словарь", speech=speech)
    first = asyncio.ensure_future(gen.__anext__())
    await asyncio.sleep(0)
    payload = lp.calls[0][2]
    assert payload["pending"] is True, payload
    rid = payload["id"]
    await reply(brain, id=rid, text="Словарь в меню.", t={"fetch": 900})
    assert await first == "Словарь в меню."
    assert [m for _, m, _ in lp.calls] == [C.ASK_METHOD], "до подтверждения commit не шлём"
    speech.schedule()
    await settle()
    assert lp.calls[-1][1] == C.COMMIT_METHOD and lp.calls[-1][2] == {"id": rid}, lp.calls
    await reply(brain, id=rid, end=True)
    assert await collect(gen) == []
    # Подтверждённый ход оборвали позже (ученик перебил) — cancel без drop.
    speech2 = FakeSpeech()
    gen = brain.ask("ещё", speech=speech2)
    first = asyncio.ensure_future(gen.__anext__())
    await asyncio.sleep(0)
    rid2 = lp.calls[-1][2]["id"]
    speech2.schedule()
    await reply(brain, id=rid2, text="Сейчас.")
    await first
    await settle()
    await gen.aclose()
    await settle()
    assert lp.calls[-1][1] == C.CANCEL_METHOD and lp.calls[-1][2] == {"id": rid2}, lp.calls


async def test_pending_dropped():
    # LiveKit выбросил черновик (ученик продолжил фразу): cancel с drop, commit нет.
    lp = FakeParticipant()
    brain = C.BrowserBrain(lp, "student-1", "ru")
    speech = FakeSpeech()
    gen = brain.ask("как открыть", speech=speech)
    first = asyncio.ensure_future(gen.__anext__())
    await asyncio.sleep(0)
    rid = lp.calls[0][2]["id"]
    await reply(brain, id=rid, text="Открыть можно…")
    await first
    await gen.aclose()
    speech.finish()
    await settle()
    methods = [m for _, m, _ in lp.calls]
    assert C.COMMIT_METHOD not in methods, methods
    assert lp.calls[-1][1] == C.CANCEL_METHOD and lp.calls[-1][2] == {"id": rid, "drop": True}, lp.calls


async def test_scheduled_is_not_pending():
    # Обычный ход (речь уже в очереди) — без pending и без commit, как раньше.
    lp = FakeParticipant()
    brain = C.BrowserBrain(lp, "student-1", "ru")
    task = asyncio.ensure_future(collect(brain.ask("привет", speech=FakeSpeech(scheduled=True))))
    await asyncio.sleep(0)
    assert "pending" not in lp.calls[0][2], lp.calls[0][2]
    await reply(brain, id=lp.calls[0][2]["id"], text="Привет!")
    await reply(brain, id=lp.calls[0][2]["id"], end=True)
    assert await task == ["Привет!"]
    await settle()
    assert [m for _, m, _ in lp.calls] == [C.ASK_METHOD]


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
    await test_end_without_phrases()
    await test_pending_commit()
    await test_pending_dropped()
    await test_scheduled_is_not_pending()
    test_texts()


asyncio.run(main())
print("ok")
