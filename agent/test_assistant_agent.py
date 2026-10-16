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

    async def ask(self, text, opening=False):
        self.asked.append((text, opening))
        for p in self.phrases:
            yield p


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
    assert out == ["Домашка на Главной. ", "Открываю. "], out

    # Начало звонка: реплики ученика нет — Луна говорит первой.
    brain = FakeBrain(["Привет!"])
    agent = A.AssistantAgent(brain)
    out = await run(agent, llm.ChatContext())
    assert brain.asked == [("", True)] and out == ["Привет! "], (brain.asked, out)

    # Пустая реплика ученика — браузер не спрашиваем вовсе.
    brain = FakeBrain(["не должно прозвучать"])
    agent = A.AssistantAgent(brain)
    ctx = llm.ChatContext()
    ctx.add_message(role="user", content="   ")
    assert await run(agent, ctx) == [] and brain.asked == []

    # Звонок помощнику не строит предварительную генерацию — у тьютора она есть.
    assert A._turn_handling(None, preemptive=False)["preemptive_generation"] == {"enabled": False}
    assert A._turn_handling(None)["preemptive_generation"] == {"enabled": True}
    assert A.parse_metadata('{"mode":"assistant","lang":"kz"}').mode == A.assistant_call.ASSISTANT_MODE

    # Перебивание: в звонке помощнику — простой VAD по первому слову, при любом
    # детекторе конца хода; у тьютора — прежние пороги.
    barge = {"mode": "vad", "min_words": 1, "min_duration": 0.5}
    assert A._turn_handling(None, barge_in=True)["interruption"] == barge
    assert A._turn_handling(object(), barge_in=True)["interruption"] == barge
    assert A._turn_handling(None, push_to_talk=True, barge_in=True)["interruption"] == barge
    assert A._turn_handling(object())["interruption"]["mode"] == "adaptive"
    assert "mode" not in A._turn_handling(None)["interruption"]
    os.environ["LUNA_CALL_INTERRUPT_MIN_SEC"] = "0.3"
    try:
        assert A._barge_in_options()["min_duration"] == 0.3
    finally:
        del os.environ["LUNA_CALL_INTERRUPT_MIN_SEC"]


asyncio.run(main())
print("ok")
