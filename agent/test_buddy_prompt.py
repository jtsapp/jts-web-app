"""Ассерты для новой сборки промпта Speaking Buddy на стенде KZ TEST. pytest в
проекте нет — файл запускается напрямую:
    agent/venv/Scripts/python.exe agent/test_buddy_prompt.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.

Решение 25.09.2026: характер тьютора — целиком из его md, методичка —
справочник «что учить», обвязка — только функции (ученик, память, тулы, язык,
голос, эмоции, механика хода). Тон в обвязке спорил с характером и смывал его.
Обкатываем на KZ TEST: на время теста это новый Декстер с голосом Декстера.
"""
import io
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
os.environ["VOICE_STACK"] = "cascade"
os.environ.pop("KZ_TEST_PROMPT", None)

from agent import (  # noqa: E402
    BUDDY_VOICE_TUTOR,
    STANDALONE_PROMPT_PERSONAS,
    LearnerProfile,
    TUTOR_MOODS,
    _eleven_session_voice,
    _pronunciation_lang,
    _stt_kazakh_session,
    _tts_provider_for,
    build_buddy_greeting,
    build_buddy_instructions,
    build_mood_block,
    buddy_test_on,
    buddy_voice_profile,
    persona_key,
)

CHARACTER_HEADER = "==== CHARACTER"


def profile(**kw) -> LearnerProfile:
    base = dict(
        tutor="jarvis", level="A2", lang="ru", explanation_lang="ru",
        user_name="Айгерим", interests=["music"], facts=["works as a nurse"],
        topics=["weekend plans"], mistakes=["she go -> she goes"],
        due_reviews=["I go yesterday -> I went yesterday"], due_vocab=["schedule"],
        passed_units=["cafe"], next_unit="hotel",
    )
    base.update(kw)
    return LearnerProfile(**base)


p = profile()
text = build_buddy_instructions(p)
wrapper, _, character = text.partition(CHARACTER_HEADER)

# ── Кто включается ───────────────────────────────────────────────────────────
assert buddy_test_on(p)
assert buddy_test_on(profile(temper="harsh")), "тумблера 18+ больше нет: оба нрава — новый Декстер"
for other in ("gentle", "bro", "hype", "aizere"):
    assert not buddy_test_on(profile(tutor=other)), other
# В сценарии характер выключен — там своя сборка, стенд туда не лезет.
assert not buddy_test_on(profile(mode="scenario", scenario_id="ordering-coffee"))
assert not buddy_test_on(profile(mode="placement"))
# Откат секретом воркера, без деплоя кода.
os.environ["KZ_TEST_PROMPT"] = "legacy"
assert not buddy_test_on(p)
assert persona_key("jarvis", "") in STANDALONE_PROMPT_PERSONAS  # старый путь цел
os.environ.pop("KZ_TEST_PROMPT")

# ── Характер — последним блоком, из md, целиком ──────────────────────────────
assert character, "нет блока CHARACTER"
assert "# DEXTER — CHARACTER" in character
assert "Swearing — the gate" in character
assert "Your way of correcting" in character
# Служебные HTML-комментарии md в промпт не попадают.
assert "<!--" not in text and "Источник — клиентский" not in text

# ── В обвязке нет тона ───────────────────────────────────────────────────────
# Всё, что говорит «как звучать», — только в характере. Слова ищем в обвязке,
# а не во всём промпте: у Декстера «take your time» стоит в списке запретов.
TONE_WORDS = (
    "warm", "friend", "cozy", "encourag", "supportive", "gentle", "gently",
    "you're doing great", "you've got this", "take your time", "no worries",
    "real human", "celebrate the", "genuine cheer", "playful", "felix",
)
low = wrapper.lower()
for w in TONE_WORDS:
    assert w not in low, f"тон в обвязке: {w!r}"

# ── Честность: ИИ, не человек ────────────────────────────────────────────────
assert "you are an AI" in wrapper
assert "Never claim to be human" in wrapper

# ── Функции обвязки на месте ─────────────────────────────────────────────────
assert "Айгерим" in wrapper
assert "A2" in wrapper
assert "works as a nurse" in wrapper and "weekend plans" in wrapper
assert "I go yesterday -> I went yesterday" in wrapper and "schedule" in wrapper
for tool in ("log_mistake", "log_topic", "log_fact", "log_resolved", "log_review", "raise_safety_alert"):
    assert tool in wrapper, tool
assert "==== MOOD TAG" in wrapper
assert "anger" in wrapper and "gloat" in wrapper
assert "One question per turn" in wrapper
assert "Never answer your own question" in wrapper
assert "is NOT an answer" in wrapper  # тишина и каша распознавания
assert "==== REFERENCE" in wrapper
assert "A2 Level" in wrapper and "B2 Level" not in wrapper, "справочник урезан до уровня ученика"
assert "Frequent errors" in wrapper

# ── Язык: русский и английский, за казахским — к Айзере ──────────────────────
assert "Aizere" in wrapper and "Spark" not in wrapper
assert "Russian" in wrapper
# «Только английский» перебивает всё языковое.
eo = build_buddy_instructions(profile(english_only=True, lang="en", explanation_lang="en"))
assert "==== ENGLISH ONLY" in eo
# Казахский интерфейс не делает Декстера казахским: объяснения по-русски.
kz = build_buddy_instructions(profile(lang="kz", explanation_lang="kz"))
assert "EXPLANATION LANGUAGE for this learner: Russian" in kz.partition(CHARACTER_HEADER)[0]

# ── Порядок блоков: функции → справочник → характер ──────────────────────────
assert text.index("==== LEARNER") < text.index("==== MEMORY") < text.index("==== REFERENCE") < text.index(CHARACTER_HEADER)

# ── Без памяти промпт не врёт про прошлое ────────────────────────────────────
fresh = build_buddy_instructions(LearnerProfile(tutor="jarvis", level="B1", lang="ru"))
assert "First call with this learner" in fresh
assert "B1 Level" in fresh and "A2 Level" not in fresh

# ── Эмоции: набор Декстера без «подбодрить», блок без тона злого Декстера ────
assert TUTOR_MOODS["jarvis"] and "encourage" not in TUTOR_MOODS["jarvis"]
mood = build_mood_block("jarvis")
assert "anger" in mood and "encourage" not in mood
assert "мат у тебя в каждой реплике" not in mood, "строка тона злого Декстера — не для нового"

# ── Голос, распознавание, мозг — Декстера ────────────────────────────────────
vp = buddy_voice_profile(p)
assert vp.tutor == BUDDY_VOICE_TUTOR == "bro"
assert p.tutor == "jarvis", "исходный профиль не трогаем: по нему пишется история звонков"
assert _tts_provider_for(vp) == _tts_provider_for(LearnerProfile(tutor="bro"))
assert _eleven_session_voice(vp) == _eleven_session_voice(LearnerProfile(tutor="bro"))
assert _eleven_session_voice(buddy_voice_profile(profile(eleven_voice_id="xxx"))) == _eleven_session_voice(LearnerProfile(tutor="bro")), \
    "голос стенда не должен протечь в тест"
assert not _stt_kazakh_session(vp), "Декстер казахского не знает — казахская добавка распознаванию не нужна"
assert _pronunciation_lang(vp) == "", "казахский словарь произношения не для русской речи"
# Для остальных профиль не меняется.
luna = profile(tutor="gentle")
assert buddy_voice_profile(luna) is luna

# ── Приветствие ──────────────────────────────────────────────────────────────
g = build_buddy_greeting(p)
assert "CHARACTER" in g and "wait" in g
for w in ("warm", "Great to see you"):
    assert w not in g, w

print("test_buddy_prompt: ok")
