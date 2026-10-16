"""AssistantAgent: ответ звонка помощнику берётся из браузера, а не из модели
агента. Запуск напрямую (pytest в проекте нет):
    agent/venv/Scripts/python.exe agent/test_assistant_agent.py
"""
import asyncio
import io
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
os.environ["VOICE_STACK"] = "cascade"

from livekit.agents import llm  # noqa: E402

import agent as A  # noqa: E402


class FakeBrain:
    def __init__(self, phrases):
        self.phrases = phrases
        self.asked = []

    async def ask(self, text, opening=False, speech=None):
        self.asked.append((text, opening))
        self.speech = speech
        for p in self.phrases:
            yield p


def spoken(out):
    """Текст реплики без сбросов синтеза (FlushSentinel)."""
    return [x for x in out if isinstance(x, str)]


async def run(agent, ctx):
    return [x async for x in agent.llm_node(ctx, [], None)]


async def main():
    # Реплика ученика уходит в браузер, фразы ответа — в синтез с пробелом на стыке.
    brain = FakeBrain(["Домашка на Главной.", "Открываю."])
    agent = A.AssistantAgent(brain)
    assert agent._tools == [], "у помощника нет тулов памяти тьютора"
    ctx = llm.ChatContext()
    ctx.add_message(role="assistant", content="Здравствуйте!")
    ctx.add_message(role="user", content=" где домашка? ")
    out = await run(agent, ctx)
    assert brain.asked == [("где домашка?", False)], brain.asked
    assert spoken(out) == ["Домашка на Главной. ", "Открываю. "], out
    # После каждой фразы — сброс синтеза: потоковый TTS иначе держал бы первую
    # фразу, пока браузер не пришлёт вторую.
    assert [type(x).__name__ for x in out] == ["str", "FlushSentinel", "str", "FlushSentinel"], out
    # Вне сессии LiveKit речи нет — ход считается подтверждённым.
    assert brain.speech is None

    # Начало звонка: реплики ученика нет — Луна говорит первой.
    brain = FakeBrain(["Привет!"])
    agent = A.AssistantAgent(brain)
    out = await run(agent, llm.ChatContext())
    assert brain.asked == [("", True)] and spoken(out) == ["Привет! "], (brain.asked, out)

    # Пустая реплика ученика — браузер не спрашиваем вовсе.
    brain = FakeBrain(["не должно прозвучать"])
    agent = A.AssistantAgent(brain)
    ctx = llm.ChatContext()
    ctx.add_message(role="user", content="   ")
    assert await run(agent, ctx) == [] and brain.asked == []

    # Упреждающая генерация у звонка помощнику — как у тьютора; секрет
    # LUNA_CALL_PREEMPTIVE=off возвращает прежнее поведение без деплоя.
    assert A._turn_handling(None, preemptive=False)["preemptive_generation"] == {"enabled": False}
    assert A._turn_handling(None)["preemptive_generation"] == {"enabled": True}
    old = os.environ.pop("LUNA_CALL_PREEMPTIVE", None)
    try:
        assert A._luna_call_preemptive() is True
        os.environ["LUNA_CALL_PREEMPTIVE"] = "off"
        assert A._luna_call_preemptive() is False
    finally:
        os.environ.pop("LUNA_CALL_PREEMPTIVE", None)
        if old is not None:
            os.environ["LUNA_CALL_PREEMPTIVE"] = old
    assert A.parse_metadata('{"mode":"assistant","lang":"kz"}').mode == A.assistant_call.ASSISTANT_MODE

    # Перебивание: в звонке помощнику — простой VAD по первому слову, при любом
    # детекторе конца хода; у тьютора — прежние пороги.
    barge = {"mode": "vad", "min_words": 1, "min_duration": 0.5}
    assert A._turn_handling(None, barge_in=True)["interruption"] == barge
    assert A._turn_handling(object(), barge_in=True)["interruption"] == barge
    assert A._turn_handling(None, push_to_talk=True, barge_in=True)["interruption"] == barge
    assert A._turn_handling(object())["interruption"]["mode"] == "adaptive"
    assert "mode" not in A._turn_handling(None)["interruption"]
    # Конец хода в звонке помощнику ждёт не дольше 1.5 с, у тьютора — 4 с.
    assert A._turn_handling(object(), barge_in=True)["endpointing"]["max_delay"] == 1.5
    assert A._turn_handling(object())["endpointing"]["max_delay"] == 4.0
    os.environ["LUNA_CALL_INTERRUPT_MIN_SEC"] = "0.3"
    try:
        assert A._barge_in_options()["min_duration"] == 0.3
    finally:
        del os.environ["LUNA_CALL_INTERRUPT_MIN_SEC"]


asyncio.run(main())
print("ok")
