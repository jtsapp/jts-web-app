"""Ассерты для Айзере — второго казахскоязычного тьютора. pytest в проекте нет —
файл запускается напрямую:
    agent/venv/Scripts/python.exe agent/test_aizere.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.

Айзере учит на казахском и английском, как Спарк, и языковые ветки промпта у
них общие (KZ_TEACHING_TUTORS). Раньше ветки сравнивали id со Спарком строкой,
и новый тьютор молча получил бы русские инструкции Луны. Голос — клон
ElevenLabs на разговорной v3: у Flash казахского нет, а откат обязан быть женским.
"""
import io
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from agent import (  # noqa: E402
    KZ_SPEAKING_TUTORS,
    KZ_TEACHING_TUTORS,
    LearnerProfile,
    PERSONA_OPENER,
    PERSONA_OVERRIDE,
    SONIOX_TTS_VOICE,
    TUTOR_MOODS,
    _eleven_http_only,
    _eleven_model_for,
    _eleven_session_voice,
    _mirror_language_rules,
    _tts_provider_for,
    _tts_speech_lang,
    build_greeting_hint,
    build_instructions,
    explanation_language_block,
    language_mode_block,
    persona_key,
    tutor_session_lang,
)

AIZERE = "aizere"


def _aizere(**kw):
    return LearnerProfile(tutor=AIZERE, **kw)


for name in (
    "ELEVEN_VOICE_ID_AIZERE", "ELEVENLABS_MODEL_AIZERE", "ELEVENLABS_MODEL",
    "TTS_PROVIDER_AIZERE", "ELEVENLABS_VOICE_ID",
):
    os.environ.pop(name, None)

# --- языки: те же ветки, что у Спарка ---------------------------------------
assert AIZERE in KZ_TEACHING_TUTORS and "hype" in KZ_TEACHING_TUTORS
assert "jarvis" not in KZ_TEACHING_TUTORS, "у KZ-стенда свой файл персоны, ветки ему не нужны"
assert AIZERE in KZ_SPEAKING_TUTORS

assert tutor_session_lang(AIZERE, "ru") == "kz", "русский интерфейс не делает её русскоязычной"
assert tutor_session_lang(AIZERE, "en") == "en"
assert _tts_speech_lang(AIZERE, "en") == "kz", "произносит по-казахски при любом интерфейсе"

mirror = _mirror_language_rules(AIZERE)
assert "RUSSIAN IS NOT YOUR LANGUAGE" in mirror
assert "KAZAKH IS NOT YOUR LANGUAGE" not in mirror

assert "EXPLANATION LANGUAGE: KAZAKH" in explanation_language_block("ru", AIZERE)
assert "EXPLANATION LANGUAGE: RUSSIAN" not in explanation_language_block("ru", AIZERE)
assert "ENGLISH ONLY" in explanation_language_block("ru", AIZERE, english_only=True)

mixed = language_mode_block("A1", "ru", interview=False, tutor=AIZERE)
assert "Kazakh" in mixed and "Russian" not in mixed

greet = build_greeting_hint(_aizere(lang="ru"))
assert "БІРІНШІ" in greet and "СНАЧАЛА" not in greet

prompt_ru = build_instructions(_aizere(lang="ru"))
assert "SPEAK RUSSIAN TO THEM" not in prompt_ru
assert "RUSSIAN IS NOT YOUR LANGUAGE" in prompt_ru
assert "Persona 'Aizere'" in prompt_ru, "черновая персона дошла до промпта"
prompt_en = build_instructions(_aizere(lang="en"))
assert "ANSWER IN KAZAKH" in prompt_en

# Луна при этом осталась русскоязычной — ветки не поехали у соседей.
assert "SPEAK RUSSIAN TO THEM" in build_instructions(LearnerProfile(tutor="gentle", lang="ru"))

# --- характер ---------------------------------------------------------------
persona = PERSONA_OVERRIDE[AIZERE]
assert "KAZAKH AND ENGLISH, NOTHING ELSE" in persona
# Инструкции персоны по-английски: русские слова в тексте тянут модель
# заговорить по-русски (урок злого Спарка). Казахские примеры реплик — можно.
for ru_word in ("ученик", "объясни", "Спокойн", "Мудрая"):
    assert ru_word not in persona, ru_word
assert AIZERE in PERSONA_OPENER
assert "Сәлем" in PERSONA_OPENER[AIZERE]
assert persona_key(AIZERE, "harsh") == AIZERE, "нрава 18+ у неё нет — остаётся базовая персона"
assert TUTOR_MOODS[AIZERE], "эмоции аватара разрешены"

# --- голос ------------------------------------------------------------------
p = _aizere(lang="kz")
assert _tts_provider_for(p) == "eleven"
assert _eleven_session_voice(p) == "2ZqnRUaCU5IaXJ45uakV", "клон, зашитый в таблицу"
assert _eleven_model_for(AIZERE) == "eleven_v3_conversational", (
    "разговорная v3: казахский есть, вдвое дешевле v3 и первый звук ~0.3 с"
)
assert _eleven_http_only("eleven_v3_conversational"), "сокета у неё нет (1006) — только HTTP /stream"
assert _eleven_http_only("eleven_v3"), "у обычной v3 тоже"
# Глобальный голос IELTS не перебивает клон, как и у KZ-стенда.
os.environ["ELEVENLABS_VOICE_ID"] = "ExpLt85FtBvm8QN4m6rB"
assert _eleven_session_voice(p) == "2ZqnRUaCU5IaXJ45uakV"
os.environ.pop("ELEVENLABS_VOICE_ID", None)
# Глобальная модель Декстера её не утаскивает на Flash.
os.environ["ELEVENLABS_MODEL"] = "eleven_flash_v2_5"
assert _eleven_model_for(AIZERE) == "eleven_v3_conversational"
os.environ.pop("ELEVENLABS_MODEL", None)
# Откат на Soniox — женский голос, а не дефолтный Owen Спарка.
assert SONIOX_TTS_VOICE[AIZERE] not in ("Owen", "Daniel", "Noah")

print("test_aizere: ok")
