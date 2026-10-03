"""Ассерты для снятия рассуждения и тега с потока реплики. pytest в проекте нет —
файл запускается напрямую:
    VOICE_STACK=cascade agent/venv/Scripts/python.exe agent/test_reasoning_strip.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.

Фикстуры — живые ответы Haiku на промпте KZ TEST (Speaking Buddy v3.4, A0),
снятые прогоном 02.10.2026: модель без extended thinking пишет рассуждение
текстом в <thinking>…</thinking>, а реплику — после него.
"""
import random

from agent import TUTOR_MOODS, _MoodStripper, _SpeechCleaner, parse_mood_tag

LEAKED = (
    "<thinking>\nThe learner is asking me what my name is. I already told them at the "
    "start: \"Hi, I'm Dexter.\" So I should answer directly and simply.\n\nAt A0 level, I "
    "can say: \"I am Dexter.\" or \"My name is Dexter.\" Both are simple and correct.\n\n"
    "\"I am Dexter. You like your job?\" = 8 words, 2 sentences. That works.\n\n"
    "Let me be direct: \"I'm Dexter. Do you like your job?\"\n</thinking>\n\n"
    "[default] I'm Dexter. Do you like your job?"
)
SPOKEN = "I'm Dexter. Do you like your job?"


def run(text: str, chunks: list[int] | None = None, allowed=TUTOR_MOODS["jarvis"]):
    """Прогнать текст через очиститель кусками заданной длины — как стрим LLM."""
    c = _SpeechCleaner(allowed)
    out, i = [], 0
    for n in chunks or [len(text)]:
        out.append(c.feed(text[i : i + n]))
        i += n
    if i < len(text):
        out.append(c.feed(text[i:]))
    out.append(c.flush())
    return "".join(out), c


# --- рассуждение целиком в одном чанке ---------------------------------------
spoken, c = run(LEAKED)
assert spoken.strip() == SPOKEN, spoken
assert c.reasoning_cut > 0
assert c.mood == ""  # [default] — тег снят, эмоции нет

# --- стрим рвёт открывающий и закрывающий тег в любом месте -----------------
# Перебор: каждый разрез строки на два куска и сотня случайных нарезок.
for cut in range(1, len(LEAKED)):
    spoken, _ = run(LEAKED, [cut])
    assert spoken.strip() == SPOKEN, (cut, spoken)
rng = random.Random(7)
for _ in range(100):
    sizes = [rng.randint(1, 9) for _ in range(len(LEAKED))]
    spoken, _ = run(LEAKED, sizes)
    assert spoken.strip() == SPOKEN, spoken

# --- эмоция после рассуждения всё равно публикуется --------------------------
spoken, c = run("<thinking>\nOne week, broken phone: angry on their side.\n</thinking>\n\n[angry] One week? That's terrible.")
assert spoken.strip() == "One week? That's terrible.", spoken
assert (c.mood, c.intensity) == ("anger", 2)

# --- рассуждение не закрыто до конца реплики — молчим, а не читаем его -------
spoken, c = run("<thinking>\nThe learner said bye. According to the core section 10, STOP")
assert spoken == "", spoken
assert c.reasoning_cut > 0

# --- регистр и короткая форма тега ------------------------------------------
spoken, _ = run("<THINKING>plan</THINKING>[default] Tea or coffee?")
assert spoken.strip() == "Tea or coffee?", spoken
spoken, _ = run("<think>plan</think> Tea or coffee?", allowed=None)
assert spoken.strip() == "Tea or coffee?", spoken

# --- рассуждение режется и у тьютора без эмоций (сценарии, Луна вне каскада) -
spoken, c = run(LEAKED.replace("[default] ", ""), [5] * 200, allowed=None)
assert spoken.strip() == SPOKEN, spoken
assert c.mood == ""

# --- обычная речь проходит нетронутой и без задержки ------------------------
c = _SpeechCleaner(TUTOR_MOODS["jarvis"])
long_text = "You work in a bank. Do you like it there, or is it just a job for now?"
assert c.feed(long_text) == long_text
assert c.feed(" Tell me.") == " Tell me."
assert c.flush() == ""
assert c.reasoning_cut == 0
# «<» в речи — не рассуждение: после решения, что тега нет, текст уходит как есть.
spoken, c = run("Five < ten, and ten > five. Say it.", [3] * 20)
assert spoken == "Five < ten, and ten > five. Say it.", spoken
assert c.reasoning_cut == 0

# --- тег в угловых скобках: «<[default]>» (Haiku, 6 из 468 реплик v3.4) -----
assert parse_mood_tag("<[default]> Good. I like music?") == ("", 0, "Good. I like music?")
assert parse_mood_tag("<[sarcastic]> Five years.") == ("gloat", 2, "Five years.")
assert parse_mood_tag("<[mood:joy:2]>Hi") == ("joy", 2, "Hi")
s = _MoodStripper(TUTOR_MOODS["jarvis"])
assert s.feed("<") == ""
assert s.feed("[def") == ""
assert s.feed("ault]> I speak English and Russian.") == "I speak English and Russian."
spoken, _ = run("<[default]> Good. Now: I like music?", [2] * 30)
assert spoken == "Good. Now: I like music?", spoken
# Реплика кончилась прямо на теге — ни скобки, ни имени в озвучку.
spoken, c = run("<[sarcastic]>", [1] * 20)
assert spoken == "", spoken
assert c.mood == "gloat"
# Обычный тег без скобок, разорванный стримом, работает как раньше (пробел
# после тега, пришедший следующим чанком, синтезу безразличен).
spoken, c = run("[angry] One week? That's terrible.", [1] * 40)
assert spoken.strip() == "One week? That's terrible.", spoken
assert c.mood == "anger"

print("reasoning strip ok")
