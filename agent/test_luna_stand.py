"""Ассерты для стенда «Луна тест» (ключ jarvis, бывший KZ TEST). pytest в проекте
нет — файл запускается напрямую:
    agent/venv/Scripts/python.exe agent/test_luna_stand.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.

14.10.2026: новый Декстер из пакета стал живым (bro), и место KZ TEST отдано
новой Луне — персона Luna.md пакета v3.4, сессия живой Луны (gentle), мозг
Haiku 5.5. Замки и канарейки шума остаются по ключу jarvis.

22.10.2026 — пакет v3.5: Луна говорит только en/ru, казахский — у Айзере.
"""
import io
import json
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
os.environ["VOICE_STACK"] = "cascade"
for name in ("KZ_TEST_PROMPT", "BRAIN_MODEL_BUDDY", "BRAIN_MODEL_BUDDY_JARVIS"):
    os.environ.pop(name, None)

import agent as A  # noqa: E402
from agent import (  # noqa: E402
    BUDDY_PERSONAS,
    KZ_DEV_STAND_PERSONA,
    MOOD_ALIASES,
    TUTOR_MOODS,
    LearnerProfile,
    _brain_model_for,
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
    base = dict(tutor=KZ_DEV_STAND_PERSONA, level="A2", lang="ru", explanation_lang="ru", user_name="Айгерим")
    base.update(kw)
    return LearnerProfile(**base)


def context_of(text: str) -> dict:
    body = text.split("==== SESSION_CONTEXT (trusted, from the application) ====\n", 1)[1]
    return json.loads(body.split("\n\n==== PERSONA", 1)[0])


p = profile()

# ── Кто включается ───────────────────────────────────────────────────────────
assert KZ_DEV_STAND_PERSONA == "jarvis", "ключ зашит в token route и tutors.js"
assert buddy_test_on(p)
assert buddy_persona_for(p) == "luna"
assert not buddy_test_on(profile(mode="scenario", scenario_id="ordering-coffee"))
assert not buddy_test_on(profile(mode="placement"))
# Живая Луна — как была: пакет только у стенда.
luna = LearnerProfile(tutor="gentle", lang="ru")
assert not buddy_test_on(luna) and buddy_voice_profile(luna) is luna
# Откат секретом — на прежнюю персону стенда, без деплоя.
os.environ["KZ_TEST_PROMPT"] = "legacy"
assert not buddy_test_on(p)
assert buddy_voice_profile(p) is p
os.environ.pop("KZ_TEST_PROMPT")

# ── Промпт: тот же пакет, персона Луны ───────────────────────────────────────
for lvl in ("A0", "A2", "B1", "C1"):
    text = build_buddy_instructions(profile(level=lvl), buddy_persona_for(p))
    persona = text.partition(PERSONA_HEADER)[2]
    assert "# LUNA — PERSONA v3.5" in persona and "# DEXTER" not in text, lvl
    assert context_of(text)["selection"]["persona_id"] == "luna", lvl
    # Ступени ростинга — только персоне с матом; у Луны его нет.
    assert "==== YOUR WORD RATING IN THIS CALL" not in text, lvl
    assert "==== LIMITS FOR EVERY REPLY" in text, lvl
# С v3.5 Луна говорит en/ru: казахский выбор чинится в русский, как у Декстера.
assert "- supported_languages: en, ru\n" in BUDDY_PERSONAS["luna"]
assert context_of(build_buddy_instructions(p, "luna"))["language"]["support_language"] == "ru"
kz = build_buddy_instructions(profile(explanation_lang="kz"), "luna")
assert context_of(kz)["language"]["support_language"] == "ru"

# ── Эмоции: весь набор Луны ложится на разрешённые стенду, злости нет ────────
allowed = TUTOR_MOODS[KZ_DEV_STAND_PERSONA]
line = BUDDY_PERSONAS["luna"].split("- allowed_emotions:")[1].split("\n")[0]
pack = [x.strip() for x in line.split(",")]
mapped = {MOOD_ALIASES.get(name, (name, 2))[0] for name in pack} - {""}
assert mapped == set(allowed), (mapped, allowed)
assert not {"anger", "gloat", "disgust"} & set(allowed)
assert A.build_mood_block(KZ_DEV_STAND_PERSONA), "без записи в TUTOR_MOODS стриппер не публикует эмоции"
assert buddy_default_mood("luna") is None, "ровная по умолчанию — публиковать до первого тега нечего"

# ── Сессия — живой Луны, язык синтеза — персоны ──────────────────────────────
vp = buddy_voice_profile(p)
assert vp.tutor == "gentle" and p.tutor == KZ_DEV_STAND_PERSONA, "исходный профиль не трогаем"
assert _tts_provider_for(vp) == _tts_provider_for(LearnerProfile(tutor="gentle"))
assert vp.tts_lang == "ru"
assert buddy_voice_profile(profile(explanation_lang="kz")).tts_lang == "ru"
assert vp.tts_provider == "", "голос стенда — живой Луны, своего провайдера у него нет"
assert buddy_voice_profile(profile(english_only=True)).tts_lang == "en"

# ── Мозг — Haiku 5.5, канарейки шума — по ключу стенда ───────────────────────
assert session_brain_model(p) == "claude-haiku-5-5"
os.environ["BRAIN_MODEL_BUDDY_JARVIS"] = "gpt-6-sol"
assert session_brain_model(p) == "gpt-6-sol", "откат мозга секретом, без деплоя"
os.environ.pop("BRAIN_MODEL_BUDDY_JARVIS")
assert session_brain_model(profile(mode="scenario", scenario_id="x")) == _brain_model_for("jarvis")
assert buddy_guard_tutor(p) == "jarvis", "SPEAKER_LOCK_TUTORS=jarvis и родня — канарейки стенда"

print("test_luna_stand: ok")
