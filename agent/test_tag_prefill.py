"""Префилл «[» у Speaking Buddy и ответ тихих тулов. pytest в проекте нет —
файл запускается напрямую:
    VOICE_STACK=cascade agent/venv/Scripts/python.exe agent/test_tag_prefill.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.

Префилл (замер KZ TEST 02.10.2026, A0, 24 разговора по 12 ходов): ответ модели
начат с «[» — дальше она пишет тег, а не <thinking>. Рассуждение текстом 7.4% →
0 из 288 ходов, немой ход «только тул» 2.3% → 0, сарказм и злость 8/8 и 8/8.

Тихие тулы памяти отвечают None, если реплика в этом ответе уже прозвучала:
иначе LiveKit зовёт модель второй раз и в 2–4% ходов тьютор говорит дважды.
"""
import asyncio

import agent as A
from livekit.agents import llm

seen: list[llm.ChatContext] = []
script: list = []


async def fake_llm_node(self, chat_ctx, tools, model_settings):
    seen.append(chat_ctx)
    for part in script:
        yield part


A.Agent.default.llm_node = fake_llm_node


def chunk(text=None, tool=None):
    delta = llm.ChoiceDelta(role="assistant", content=text)
    if tool:
        delta.tool_calls.append(llm.FunctionToolCall(name=tool, arguments="{}", call_id="c1"))
    return llm.ChatChunk(id="x", delta=delta)


def make_agent(prefill=True):
    return A.TutorAgent(instructions="x", device_id="d", api_url="https://e.invalid", tutor="jarvis",
                        moods_enabled=True, prefill_tag=prefill)


async def run(agent, ctx, parts):
    seen.clear()
    script[:] = parts
    out = []
    async for c in agent.llm_node(ctx, [], None):
        out.append(c if isinstance(c, str) else (c.delta.content or ""))
    return "".join(out)


def ctx_user():
    c = llm.ChatContext()
    c.add_message(role="system", content="SYS")
    c.add_message(role="assistant", content="Tea or coffee?")
    c.add_message(role="user", content="Tea.")
    return c


def last(ctx):
    it = ctx.items[-1]
    return getattr(it, "type", None), getattr(it, "role", None), getattr(it, "text_content", None)


async def main():
    # --- ход ученика: модель получает «[» и продолжает тег ------------------
    a = make_agent()
    ctx = ctx_user()
    spoken = await run(a, ctx, [chunk("default] You "), chunk("like tea.")])
    assert spoken.strip() == "You like tea.", spoken
    assert last(seen[0]) == ("message", "assistant", "["), last(seen[0])
    assert last(ctx) == ("message", "user", "Tea."), "префилл не должен попасть в историю"

    # Эмоция после префилла публикуется как обычно.
    a = make_agent()
    moods = []

    async def capture(mood, intensity):
        moods.append((mood, intensity))

    a._publish_mood = capture
    spoken = await run(a, ctx_user(), [chunk("sarcastic] Fourteen hours. Your bed is happy.")])
    assert spoken.strip() == "Fourteen hours. Your bed is happy.", spoken
    await asyncio.sleep(0)
    assert moods == [("gloat", 2)], moods

    # Строковые чанки (а не ChatChunk) — тоже с «[».
    a = make_agent()
    spoken = await run(a, ctx_user(), ["angry] One week? ", "That's terrible."])
    assert spoken.strip() == "One week? That's terrible.", spoken

    # Модель ответила только тулом — «[» не озвучивается сам по себе.
    a = make_agent()
    spoken = await run(a, ctx_user(), [chunk(tool="log_fact")])
    assert spoken == "", repr(spoken)

    # --- после тула и на приветствии префилла нет ---------------------------
    a = make_agent()
    c = ctx_user()
    c.items.append(llm.FunctionCall(name="log_fact", arguments="{}", call_id="c1"))
    c.items.append(llm.FunctionCallOutput(name="log_fact", call_id="c1", output="ok", is_error=False))
    spoken = await run(a, c, [])
    assert seen[0].items[-1].type == "function_call_output", "после тула модель вправе промолчать"
    assert spoken == ""

    a = make_agent()
    c = llm.ChatContext()
    c.add_message(role="system", content="SYS")
    c.add_message(role="system", content="Trusted application event: SESSION_START.")
    spoken = await run(a, c, [chunk("[default] Hi, I'm Dexter. Tea or coffee?")])
    assert last(seen[0])[1] == "system", "приветствие идёт без префилла"
    assert spoken.strip() == "Hi, I'm Dexter. Tea or coffee?", spoken

    # --- живые тьюторы: без префилла --------------------------------------
    a = make_agent(prefill=False)
    spoken = await run(a, ctx_user(), [chunk("You like tea.")])
    assert last(seen[0])[1] == "user"
    assert spoken == "You like tea.", spoken

    # --- тихие тулы памяти: второй вызов модели только если она молчала -----
    # None → LiveKit не зовёт модель второй раз (reply_required = output is not None).
    for prefill in (True, False):
        a = make_agent(prefill)
        posts = []

        async def fake_post(path, body, posts=posts):
            posts.append(path)

        a._post_json = fake_post
        await run(a, ctx_user(), [chunk("default] You like tea." if prefill else "You like tea."), chunk(tool="log_fact")])
        assert await a.log_fact("likes tea") is None, "реплика прозвучала — второго ответа не надо"
        assert await a.log_mistake("x", "y", "z", "r") is None
        assert await a.raise_safety_alert("r") is None
        assert posts == ["/api/profile/facts", "/api/profile/mistakes", "/api/profile/safety"], posts

        # Новый ответ модели — флаг заново. Ответ «только тул»: модель должна заговорить.
        await run(a, ctx_user(), [chunk(tool="log_fact")])
        assert await a.log_fact("likes tea") == "ok"

        # Пробелы и снятый тег речью не считаются.
        await run(a, ctx_user(), [chunk("default]  " if prefill else "  "), chunk(tool="log_topic")])
        assert await a.log_topic("food") == "ok"


asyncio.run(main())
print("tag prefill ok")
