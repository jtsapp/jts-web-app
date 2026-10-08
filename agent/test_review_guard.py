"""log_review пишет только по пунктам, которые память этой сессии назвала DUE.
pytest в проекте нет — файл запускается напрямую:
    VOICE_STACK=cascade agent/venv/Scripts/python.exe agent/test_review_guard.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.

Фон (прогон KZ TEST 02.10.2026, A0, 36 разговоров по 12 ходов): Декстер звал
log_review в 126 ходах из 432 по списку «Recent learner mistakes» — по порядку,
по пункту за ход, в 107 из 128 вызовов с correct=false и без единого вопроса.
Бэкенд находит такую строку в review_item и сбрасывает её в box 0.
"""
import asyncio

from agent import (
    BUDDY_SKIP_TOOLS,
    MEMORY_TOOLS_BLOCK,
    LearnerProfile,
    TutorAgent,
    _buddy_memory_block,
    _buddy_tools_block,
    _matches_due,
    format_memory_block,
)

DUE = (
    "wrong tense: I go yesterday → I went yesterday (Past Simple)",
    "she have -> she has",
    "breakfast",
)

# --- сопоставление: модель эхом отдаёт пункт как есть или короче ------------
assert _matches_due("she have -> she has", DUE)
assert _matches_due("She have → she has.", DUE), "регистр и стрелки не важны"
assert _matches_due("I go yesterday → I went yesterday", DUE), "ярлык короче полной строки"
assert _matches_due("breakfast", DUE), "слово из DUE-словаря"
# Семантика — ровно reviewMatch.js бэкенда, иначе агент пропустит то, что база
# не найдёт, или наоборот: короткий ярлык темы относится к своему пункту…
assert _matches_due("Past Simple", DUE)
# …а одиночный токен сравнивается вхождением, без приведения к единственному.
assert not _matches_due("Breakfasts", DUE)
# Пункт из списка «Recent learner mistakes», которого нет в DUE, — мимо.
assert not _matches_due("I am go -> I go", DUE)
assert not _matches_due("I like play -> I like playing", DUE)
assert not _matches_due("word order", DUE)
assert not _matches_due("", DUE)
assert not _matches_due("she have -> she has", ()), "нет DUE — нечего отмечать"


# --- сам тул: мимо DUE не уходит ни одного POST ----------------------------
def agent_with(due):
    a = TutorAgent(instructions="x", device_id="d", api_url="https://e.invalid", tutor="jarvis", due_items=due)
    sent = []

    async def fake_post(path, body):
        sent.append((path, body))

    a._post_json = fake_post
    return a, sent


async def main():
    a, sent = agent_with(DUE)
    assert await a.log_review("I am go -> I go", False) == "ok"
    assert sent == [], "не DUE — в базу ничего"
    assert await a.log_review("she have -> she has", True) == "ok"
    assert sent == [("/api/profile/review", {"deviceId": "d", "mistake": "she have -> she has", "correct": True})]

    a, sent = agent_with(())
    await a.log_review("she have -> she has", False)
    assert sent == [], "сессия без DUE не двигает расписание вовсе"


asyncio.run(main())

# --- Speaking Buddy: отметки повторения на лету нет вовсе -------------------
# Прогон с DUE-пунктом (02.10.2026): Декстер отмечал и сам DUE-пункт без вопроса
# — 30 из 51 вызовов, «Hello» → false. Проверка по списку DUE этого не ловит,
# поэтому у Buddy тула нет; лестницу двигают показы (serves в profile.js).
DUE_LINE = "DUE items are scheduled for today"
base = dict(tutor="jarvis", level="A0", lang="ru", mistakes=["I am go -> I go"], topics=["food"])
assert DUE_LINE not in _buddy_memory_block(LearnerProfile(**base)), (
    "без DUE строки быть не должно: рядом со списком ошибок она толкала отмечать их"
)
due_block = _buddy_memory_block(LearnerProfile(**base, due_reviews=["she have -> she has"], due_vocab=["breakfast"]))
assert DUE_LINE in due_block, "DUE-пункты по-прежнему вплетаются в разговор"
assert "she have -> she has" in due_block and "breakfast" in due_block
assert "log_review" not in due_block, "у Buddy этого тула нет — не упоминать"
buddy_agent = TutorAgent(instructions="x", device_id="d", api_url="https://e.invalid", tutor="jarvis",
                         skip_tools=BUDDY_SKIP_TOOLS)
assert "log_review" not in {t.info.name for t in buddy_agent.tools}
assert "log_mistake" in {t.info.name for t in buddy_agent.tools}
tools = _buddy_tools_block()
assert "log_review" not in tools and "You have five tools" in tools, tools[:300]
assert " - log_mistake(" in tools and " - raise_safety_alert(" in tools

# У живых тьюторов память и тулы прежние.
live = format_memory_block(LearnerProfile(**base, due_reviews=["she have -> she has"]))
assert "then silently call log_review" in live
assert "log_review" in MEMORY_TOOLS_BLOCK

print("review guard ok")
