"""Живые Спарк (hype) и Луна (gentle) = их тестовые стенды. pytest в проекте нет:
    agent/venv/Scripts/python.exe agent/test_live_spark_luna.py
Падает с AssertionError на первом расхождении, печатает ok, когда всё сошлось.

07.11.2026 решение владельца: «Спарк тест» (sparktest) и «Луна тест» (jarvis) заменяют
живых, как 14.10 тестовый Декстер заменил bro. Сверка побайтная: промпт, приветствие,
сессия, мозг, эмоции и стиль голоса живого — ровно те, что у стенда. Отличия по ключу
намеренные и перечислены здесь же: защиты шума (замок, фильтр эха) у каждого по своим
спискам секретов, а прежняя персона живого — откатом секретом.
"""
import io
import itertools
import os
import random
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
os.environ["VOICE_STACK"] = "cascade"
for name in (
    "KZ_TEST_PROMPT", "SPARK_PROMPT", "LUNA_PROMPT", "SPARK_TEMPER", "BRAIN_MODEL_BUDDY",
    "BRAIN_MODEL_BUDDY_HYPE", "BRAIN_MODEL_BUDDY_GENTLE", "BRAIN_MODEL_BUDDY_SPARKTEST",
    "BRAIN_MODEL_BUDDY_JARVIS", "TTS_PROVIDER_HYPE", "TTS_PROVIDER_SPARKTEST",
):
    os.environ.pop(name, None)

from agent import (  # noqa: E402
    BUDDY_LIVE_MOODS,
    BUDDY_VOICE_STYLES,
    KZ_DEV_STAND_PERSONA,
    SPARK_TEST_STAND,
    TUTOR_MOODS,
    LearnerProfile,
    _brain_model_for,
    _tts_provider_for,
    buddy_default_mood,
    buddy_guard_tutor,
    buddy_persona_for,
    buddy_test_on,
    buddy_voice_profile,
    build_buddy_greeting,
    build_buddy_instructions,
    session_brain_model,
)

PAIRS = (("hype", SPARK_TEST_STAND), ("gentle", KZ_DEV_STAND_PERSONA))


def profile(tutor: str, **kw) -> LearnerProfile:
    base = dict(
        tutor=tutor, level="A2", lang="ru", explanation_lang="ru", user_name="Айгерим",
        interests=["music"], facts=["works as a nurse"], topics=["weekend plans"],
        mistakes=["she go -> she goes"], due_reviews=["I go yesterday -> I went yesterday"],
        due_vocab=["schedule"], age_group="adult",
    )
    base.update(kw)
    return LearnerProfile(**base)


def style_of(p: LearnerProfile):
    return BUDDY_VOICE_STYLES.get(buddy_persona_for(p)) or BUDDY_VOICE_STYLES.get((p.tutor or "").lower())


# ── Сборка разговора: побайтно как у стенда ─────────────────────────────────
VARIANTS = list(itertools.product(
    ("A0", "A2", "B1", "C1"),          # уровень
    ("ru", "kk", "en"),                # язык объяснений
    ("", "calm", "harsh"),             # нрав (у Луны кнопки нет, но клиент может прислать)
    ("adult", "under_18"),             # возраст
    (False, True),                     # только английский
    ((), ("prefers вы",)),             # обращение, которое Луна уже знает
))
for live, stand in PAIRS:
    for level, exp, temper, age, en_only, extra in VARIANTS:
        kw = dict(level=level, explanation_lang=exp, temper=temper, age_group=age, english_only=en_only)
        a = profile(live, **kw)
        b = profile(stand, **kw)
        a.facts = [*a.facts, *extra]
        b.facts = [*b.facts, *extra]
        tag = (live, level, exp, temper, age, en_only, extra)
        assert buddy_test_on(a) and buddy_test_on(b), tag
        persona = buddy_persona_for(a)
        assert persona == buddy_persona_for(b), tag
        # Мерка силы и угол приветствия у Спарка случайные на звонок — сверяем с тем же зерном.
        random.seed(7)
        ia = build_buddy_instructions(a, persona)
        random.seed(7)
        assert ia == build_buddy_instructions(b, persona), tag
        random.seed(7)
        ga = build_buddy_greeting(a)
        random.seed(7)
        gb = build_buddy_greeting(b)
        assert ga == gb, tag
        assert buddy_voice_profile(a) == buddy_voice_profile(b), tag
        assert session_brain_model(a) == session_brain_model(b) == "claude-haiku-5-5", tag
        assert _tts_provider_for(buddy_voice_profile(a)) == _tts_provider_for(buddy_voice_profile(b)), tag
        assert style_of(a) == style_of(b), tag
        assert buddy_default_mood(persona) == buddy_default_mood(buddy_persona_for(b)), tag

# Персоны: Спарк — два нрава стенда, Луна — новая Луна.
assert buddy_persona_for(profile("hype", temper="harsh")) == "spark_sting"
assert buddy_persona_for(profile("hype", temper="calm")) == "spark_fun"
assert buddy_persona_for(profile("hype")) == "spark_fun"
assert buddy_persona_for(profile("gentle")) == "luna"

# Эмоции: в разговоре — набор стенда, вне его — прежний набор по ключу.
assert BUDDY_LIVE_MOODS["hype"] == TUTOR_MOODS[SPARK_TEST_STAND]
assert BUDDY_LIVE_MOODS["gentle"] == TUTOR_MOODS[KZ_DEV_STAND_PERSONA]
assert "gloat" in BUDDY_LIVE_MOODS["hype"], "колкому нужна насмешка (sarcastic → gloat)"
assert buddy_default_mood("spark_sting")[0] in BUDDY_LIVE_MOODS["hype"], "фолбэк колкого не должен теряться"

# ── Голос и слух Спарка ──────────────────────────────────────────────────────
spark = profile("hype")
voice = buddy_voice_profile(spark)
assert _tts_provider_for(voice) == "gemini", "Fenrir, как у стенда"
assert voice.stt_kk_context is False, "казахской добавки Soniox у Спарка из пакета нет"
assert style_of(spark) == BUDDY_VOICE_STYLES[SPARK_TEST_STAND] is not None
assert style_of(profile("hype", temper="harsh")) == BUDDY_VOICE_STYLES["spark_sting"]
os.environ["TTS_PROVIDER_HYPE"] = "soniox"
assert _tts_provider_for(buddy_voice_profile(spark)) == "soniox", "откат голоса секретом, без деплоя"
os.environ.pop("TTS_PROVIDER_HYPE")
# Луна: голос и слух прежние (у стенда они и так её).
luna = profile("gentle")
assert _tts_provider_for(buddy_voice_profile(luna)) == "gemini"
assert buddy_voice_profile(luna).stt_kk_context is True

# Защиты шума — каждому по своим спискам секретов (у jarvis там канарейки стенда).
assert buddy_guard_tutor(spark) == "hype" == buddy_guard_tutor(profile(SPARK_TEST_STAND))
assert buddy_guard_tutor(luna) == "gentle"
assert buddy_guard_tutor(profile(KZ_DEV_STAND_PERSONA)) == KZ_DEV_STAND_PERSONA

# ── Вне разговора — прежние сборки и прежний голос ───────────────────────────
for live in ("hype", "gentle"):
    for kw in (dict(mode="scenario", scenario_id="ordering-coffee"), dict(mode="placement"), dict(mode="assistant")):
        p = profile(live, **kw)
        assert not buddy_test_on(p), (live, kw)
        assert buddy_voice_profile(p) is p, (live, kw)
        assert session_brain_model(p) == _brain_model_for(live), (live, kw)
assert _tts_provider_for(profile("hype", mode="placement")) == "soniox", "проверка уровня — прежний Спарк"

# ── Откат на прежнюю персону — секретом, каждому свой ────────────────────────
for live, stand, switch in (("hype", SPARK_TEST_STAND, "SPARK_PROMPT"), ("gentle", KZ_DEV_STAND_PERSONA, "LUNA_PROMPT")):
    os.environ[switch] = "legacy"
    p = profile(live)
    assert not buddy_test_on(p), switch
    assert buddy_voice_profile(p) is p, switch
    assert session_brain_model(p) == _brain_model_for(live), switch
    assert buddy_test_on(profile(stand)), f"{switch} стенд не трогает"
    os.environ.pop(switch)
os.environ["KZ_TEST_PROMPT"] = "legacy"
assert buddy_test_on(luna), "откат стенда живую Луну не трогает"
os.environ.pop("KZ_TEST_PROMPT")
# Мозг отдельно от персоны.
os.environ["BRAIN_MODEL_BUDDY_HYPE"] = "claude-haiku-4-5"
assert session_brain_model(spark) == "claude-haiku-4-5"
assert session_brain_model(profile(SPARK_TEST_STAND)) == "claude-haiku-5-5"
os.environ.pop("BRAIN_MODEL_BUDDY_HYPE")

print("test_live_spark_luna: ok")
