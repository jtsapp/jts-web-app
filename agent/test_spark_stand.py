"""Ассерты для стенда «Спарк тест» (ключ sparktest). pytest в проекте нет —
файл запускается напрямую:
    agent/venv/Scripts/python.exe agent/test_spark_stand.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.

05.10.2026: второе место для тестов Speaking Buddy на dev-стенде. Тот же бот,
что KZ TEST (сборка пакета v3.4, мозг GPT-6 Sol), но персона — новый Спарк, а
сессия — живого Спарка (Soniox, Owen). Карточка с лицом, чтобы видеть эмоции:
у KZ TEST вместо лица шар.
"""
import io
import json
import os
import sys
import types

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
os.environ["VOICE_STACK"] = "cascade"
os.environ.pop("KZ_TEST_PROMPT", None)
os.environ.pop("BRAIN_MODEL_BUDDY", None)

import agent as A  # noqa: E402
from agent import (  # noqa: E402
    BUDDY_PERSONAS,
    MOOD_ALIASES,
    SPARK_TEST_STAND,
    TUTOR_MOODS,
    LearnerProfile,
    _brain_model_for,
    _pronunciation_lang,
    _tts_provider_for,
    build_buddy_instructions,
    buddy_default_mood,
    buddy_guard_tutor,
    buddy_persona_for,
    buddy_test_on,
    buddy_voice_profile,
    session_brain_model,
)

PERSONA_HEADER = "==== PERSONA"


def profile(**kw) -> LearnerProfile:
    base = dict(tutor=SPARK_TEST_STAND, level="A2", lang="ru", explanation_lang="ru", user_name="Айгерим")
    base.update(kw)
    return LearnerProfile(**base)


def context_of(text: str) -> dict:
    body = text.split("==== SESSION_CONTEXT (trusted, from the application) ====\n", 1)[1]
    return json.loads(body.split("\n\n==== PERSONA", 1)[0])


p = profile()

# ── Кто включается ───────────────────────────────────────────────────────────
assert SPARK_TEST_STAND == "sparktest", "ключ зашит в token route и tutors.js"
assert buddy_test_on(p)
assert buddy_persona_for(p) == "spark"
assert buddy_persona_for(LearnerProfile(tutor="jarvis")) == "dexter", "KZ TEST остаётся Декстером"
assert not buddy_test_on(profile(mode="scenario", scenario_id="ordering-coffee"))
assert not buddy_test_on(profile(mode="placement"))
# Откат KZ TEST секретом — только ему: у «Спарк теста» прежней персоны нет.
os.environ["KZ_TEST_PROMPT"] = "legacy"
assert buddy_test_on(p)
assert not buddy_test_on(LearnerProfile(tutor="jarvis", lang="ru"))
os.environ.pop("KZ_TEST_PROMPT")
# Вне каскада тег эмоции некому снять.
os.environ["VOICE_STACK"] = "gemini-live"
assert not buddy_test_on(p)
os.environ["VOICE_STACK"] = "cascade"

# ── Промпт: тот же пакет, персона Спарка ─────────────────────────────────────
text = build_buddy_instructions(p, buddy_persona_for(p))
persona = text.partition(PERSONA_HEADER)[2]
assert "# SPARK — PERSONA v3.4" in persona and "# DEXTER" not in text
assert context_of(text)["selection"]["persona_id"] == "spark"
# Ступени ростинга — только персоне с матом; у Спарка его нет.
assert "==== YOUR TIER IN THIS CALL" not in text
assert "==== LIMITS FOR EVERY REPLY" in text
# Спарк говорит en/ru/kk — язык объяснений не чинится, как у Декстера.
assert context_of(text)["language"]["support_language"] == "ru"
kz = build_buddy_instructions(profile(explanation_lang="kz"), "spark")
assert context_of(kz)["language"]["support_language"] == "kk"

# ── Эмоции: весь набор Спарка ложится на разрешённые стенду, злости нет ──────
allowed = TUTOR_MOODS[SPARK_TEST_STAND]
line = BUDDY_PERSONAS["spark"].split("- allowed_emotions:")[1].split("\n")[0]
pack = [x.strip() for x in line.split(",")]
assert "default" in pack and "angry" not in pack
mapped = {MOOD_ALIASES.get(name, (name, 2))[0] for name in pack} - {""}
assert mapped == set(allowed), (mapped, allowed)
assert "anger" not in allowed
assert A.build_mood_block(SPARK_TEST_STAND), "без записи в TUTOR_MOODS стриппер не публикует эмоции"
# Эмоция персоны по умолчанию — ровная: публиковать до первого тега нечего.
assert buddy_default_mood("spark") is None

# ── Сессия — живого Спарка, язык синтеза — персоны ───────────────────────────
vp = buddy_voice_profile(p)
assert vp.tutor == "hype" and p.tutor == SPARK_TEST_STAND, "исходный профиль не трогаем"
assert _tts_provider_for(vp) == _tts_provider_for(LearnerProfile(tutor="hype"))
assert vp.tts_lang == "ru", "голос Спарка настроен на kk — русский читался бы с акцентом"
assert buddy_voice_profile(profile(explanation_lang="kz")).tts_lang == "kk"
assert buddy_voice_profile(profile(english_only=True)).tts_lang == "en"
assert _pronunciation_lang(vp) == "", "казахский словарь цифр — не для русской речи"
# Сценарий с карточки — голосом живого Спарка, язык синтеза — как у живого.
scen = buddy_voice_profile(profile(mode="scenario", scenario_id="ordering-coffee"))
assert scen.tutor == "hype" and scen.tts_lang == ""
# Остальные — как были.
luna = LearnerProfile(tutor="gentle")
assert buddy_voice_profile(luna) is luna
kz_test = LearnerProfile(tutor="jarvis", lang="ru")
assert buddy_voice_profile(kz_test).tutor == "bro"
os.environ["KZ_TEST_PROMPT"] = "legacy"
assert buddy_voice_profile(kz_test) is kz_test, "KZ TEST вне Buddy — со своими таблицами"
os.environ.pop("KZ_TEST_PROMPT")

# Подсказка Soniox: tts_lang важнее тьютора голоса (у hype на ru было бы kk).
calls = []
A.soniox = types.SimpleNamespace(TTS=lambda **kw: calls.append(kw) or kw)
os.environ["SONIOX_API_KEY"] = "test"
A._cascade_tts_soniox(vp)
A._cascade_tts_soniox(LearnerProfile(tutor="hype", lang="ru"))
assert calls[0]["language"] == "ru" and calls[0]["voice"] == calls[1]["voice"], calls
assert calls[1]["language"] == "kk", "живой Спарк — как был"

# ── Мозг — как у KZ TEST, замок и фильтр эха — Спарка ────────────────────────
assert session_brain_model(p) == "gpt-6-sol"
assert session_brain_model(profile(mode="scenario", scenario_id="x")) == _brain_model_for("hype")
assert buddy_guard_tutor(p) == "hype", "в канарейках секретов стенда нет — защиты живого Спарка"
assert buddy_guard_tutor(kz_test) == "jarvis", "у KZ TEST канарейки свои"
assert buddy_guard_tutor(luna) == "gentle"

print("test_spark_stand: ok")
