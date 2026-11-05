"""Два нрава «Спарк теста» (agent/spark_tempers.py, 04.11.2026). pytest в проекте нет:
    agent/venv/Scripts/python.exe agent/test_spark_tempers.py
Падает на первом расхождении, печатает ok, когда всё сошлось."""
import io
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
os.environ["VOICE_STACK"] = "cascade"
os.environ.pop("SPARK_TEMPER", None)
os.environ.pop("BRAIN_MODEL_BUDDY", None)
os.environ.pop("BRAIN_MODEL_BUDDY_SPARKTEST", None)

import agent as A  # noqa: E402
from agent import (  # noqa: E402
    BUDDY_CORE,
    BUDDY_PERSONAS,
    BUDDY_VOICE_STYLES,
    LearnerProfile,
    SPARK_TEST_STAND,
    build_buddy_greeting,
    build_buddy_instructions,
    buddy_default_mood,
    buddy_persona_for,
    buddy_voice_profile,
)
from dexter_tempers import patch_core  # noqa: E402
from spark_tempers import (  # noqa: E402
    SPARK_FUN_GREETING_ANGLES,
    SPARK_STING_CORE_PATCHES,
    SPARK_STING_GREETING_ANGLES,
    SPARK_STING_LINES_EN,
    SPARK_STING_LINES_RU,
)


def profile(temper="", level="B1", **kw):
    return LearnerProfile(tutor=SPARK_TEST_STAND, temper=temper, level=level, lang="ru",
                          explanation_lang="ru", user_name="Dana", **kw)


# ── Выбор нрава: колкий только по явному harsh ───────────────────────────────
assert buddy_persona_for(profile("harsh")) == "spark_sting"
for temper in ("calm", "", "мусор"):
    assert buddy_persona_for(profile(temper)) == "spark_fun", temper
os.environ["SPARK_TEMPER"] = "off"
assert buddy_persona_for(profile("harsh")) == "spark", "откат секретом — клиентский Спарк"
assert buddy_persona_for(profile("calm")) == "spark"
del os.environ["SPARK_TEMPER"]
# Живой Спарк нравов стенда не получает.
assert buddy_persona_for(LearnerProfile(tutor="bro", temper="harsh")) == "dexter_hooligan"
assert not A.buddy_test_on(LearnerProfile(tutor="hype", temper="harsh", mode="tutor"))

# ── Файлы персон ─────────────────────────────────────────────────────────────
for pid in ("spark_fun", "spark_sting"):
    text = BUDDY_PERSONAS[pid]
    assert "- supported_languages: en, ru\n" in text, pid
    assert "- profanity_supported: false\n" in text, pid
    assert f"- persona_id: {pid}\n" in text, pid
assert buddy_default_mood("spark_fun") is None
assert buddy_default_mood("spark_sting") == ("gloat", 2), "базовая эмоция колкого — сарказм, не злость"
# Эмоции ложатся на набор стенда: иначе тег снимется и лицо останется пустым, а злости нет.
for pid in ("spark_fun", "spark_sting"):
    line = BUDDY_PERSONAS[pid].split("- allowed_emotions:")[1].split("\n")[0]
    names = [x.strip() for x in line.split(",")]
    assert "angry" not in names and "furious" not in names, pid
    for name in names:
        mood = A.MOOD_ALIASES.get(name, (name, 2))[0]
        assert mood == "" or mood in A.TUTOR_MOODS[SPARK_TEST_STAND], (pid, name)
# Примеров приветствий в файлах нет: их копировали дословно, начало задаёт угол.
for pid in ("spark_fun", "spark_sting"):
    assert "SESSION_START" not in BUDDY_PERSONAS[pid].split("## Examples")[-1].split("## Illustrations")[-1], pid

# ── Ядро колкого: запреты сняты, границы и беда на месте ─────────────────────
sting = patch_core(BUDDY_CORE, SPARK_STING_CORE_PATCHES)
assert sting == A.BUDDY_CORE_VARIANTS["spark_sting"]
for gone in ("Spark, Luna and Aizere never swear or insult", "- A plain objection to the style is the stop-insults opt-out.",
             "Outside Dexter's adult roast rating, also never shame"):
    assert gone not in sting, gone
assert "**Spark's sting mode.**" in sting
for kept in ("**Hard limits in every rating.**", "**Distress.** Distress includes:", "suicide, self-harm",
             "“дебил”", "“retard”", "no insults about ethnicity, nationality, religion, gender, sexual orientation",
             "disability, health, body, appearance, accent, pronunciation, family or background"):
    assert kept in sting, kept
# Смешному ядро не подменяем: шутки над ситуацией оно разрешает само.
assert A._buddy_core_for("spark_fun") == BUDDY_CORE

# ── Промпт: блок последним и язык укола по уровню ────────────────────────────
for lvl in ("A1", "A2", "B1"):
    block = A._buddy_tier_block(profile("harsh", lvl), "spark_sting")
    assert "write the hit in Russian" in block, lvl
    assert f"level is {lvl}" in block
    assert "{level}" not in block and "{lines}" not in block
block = A._buddy_tier_block(profile("harsh", "B2"), "spark_sting")
assert "write the hit in Russian" not in block and "in English at this learner's level" in block
block = A._buddy_tier_block(profile("harsh", "C1"), "spark_sting")
assert "in English at this learner's level" in block, "C1 идёт по профилю B2"
block = A._buddy_tier_block(profile("harsh", "A2", english_only=True), "spark_sting")
assert "write the hit in Russian" not in block, "«только английский» важнее уровня"

text = build_buddy_instructions(profile("harsh"), "spark_sting")
assert text.index("==== PERSONA") < text.index("==== YOUR WORD RATING") < text.index("==== LIMITS FOR EVERY REPLY")
text = build_buddy_instructions(profile("calm"), "spark_fun")
assert text.index("==== PERSONA") < text.index("==== YOUR HUMOUR") < text.index("==== LIMITS FOR EVERY REPLY")
assert "==== YOUR WORD RATING" not in text

# Мерка силы: каждая строка чистая — без мата, слов-оскорблений и семьи.
BAD = re.compile(r"\b(fuck\w*|shit\w*|damn|hell|crap|бля\w*|пизд\w*|ху[йя]\w*|сука|блин|капец|туп\w+|дурак\w*|"
                 r"балбес\w*|лентя\w*|idiot\w*|stupid|dumb\w*|мам\w+|мать|пап\w+|родител\w+|mom|mum|mother|"
                 r"father|parents)\b", re.I)
for line in (*SPARK_STING_LINES_RU, *SPARK_STING_LINES_EN):
    assert not BAD.search(line), line
assert len(SPARK_STING_LINES_RU) >= A.SPARK_STING_LINES_PER_CALL
assert len(SPARK_STING_LINES_EN) >= A.SPARK_STING_LINES_PER_CALL

# ── Приветствие: угол свой у нрава, по-английски, имя называем ───────────────
greet = build_buddy_greeting(profile("calm"))
assert any(a in greet for a in SPARK_FUN_GREETING_ANGLES) and "Dana" in greet
greet = build_buddy_greeting(profile("harsh"))
assert any(a in greet for a in SPARK_STING_GREETING_ANGLES)
# Остальным приветствие не меняем.
assert "Angle for this greeting" not in build_buddy_greeting(LearnerProfile(tutor="bro", temper="harsh", mode="tutor"))
for angle in SPARK_STING_GREETING_ANGLES:
    assert not BAD.search(angle), angle

# ── Сессия: живого Спарка, голос Fenrir, слух без казахской добавки ──────────
for temper in ("calm", "harsh"):
    p = profile(temper)
    vp = buddy_voice_profile(p)
    assert vp.tutor == "hype" and p.tutor == SPARK_TEST_STAND
    assert A._tts_provider_for(vp) == "gemini" and A.TUTOR_VOICE[vp.tutor] == "Fenrir"
    assert A.session_brain_model(p) == "claude-haiku-5-5"
    assert not A._stt_kazakh_session(vp), "новый Спарк по-казахски не говорит"
    general = dict(A._stt_context_general(vp))
    assert general["domain"] == "online English lessons" and "register" not in general
# Сценарий с карточки стенда — тоже без добавки: голос и слух у карточки одни.
assert not A._stt_kazakh_session(buddy_voice_profile(profile("calm", scenario="x")))
# Живой Спарк и Айзере казахскую добавку не теряют.
assert A._stt_kazakh_session(LearnerProfile(tutor="hype"))
assert A._stt_kazakh_session(LearnerProfile(tutor="aizere"))
assert A._stt_kazakh_session(buddy_voice_profile(LearnerProfile(tutor="hype")))

# ── Голос по нраву ───────────────────────────────────────────────────────────
fun = BUDDY_VOICE_STYLES[SPARK_TEST_STAND]
hit = BUDDY_VOICE_STYLES["spark_sting"]
assert fun.calm_base == "", "клиентский файл — одна база, как и был"
assert fun.prompt("sympathy", russian=True) == fun.base
assert hit.calm_base and "mocking" in hit.base.lower() and "mocking" not in hit.calm_base.lower()
# Укол звучит насмешкой и по-русски, где строки тега нет.
assert hit.prompt("sarcastic", russian=True) == hit.base
assert "For this line, sound dry and unimpressed" in hit.prompt("sarcastic")
# Извинение и ровная реплика — без насмешки на обоих языках.
for tag in ("sympathy", "default"):
    assert hit.prompt(tag, russian=True) == hit.calm_base, tag
    assert hit.prompt(tag).startswith(hit.calm_base), tag
# Слова, от которых Gemini вздыхает и смеётся (05_App_Settings клиента).
for word in ("relaxed", "smiling", "laugh", "gentle", "slower"):
    for prompt in (hit.base, hit.calm_base, *hit.by_tag.values()):
        assert word not in prompt.lower(), (word, prompt)

print("test_spark_tempers: ok")
