"""Ассерты для стенда «Спарк тест» (ключ sparktest). pytest в проекте нет —
файл запускается напрямую:
    agent/venv/Scripts/python.exe agent/test_spark_stand.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.

05.10.2026: второе место для тестов Speaking Buddy на dev-стенде. Тот же бот,
что KZ TEST (сборка пакета v3.4; мозг с 14.10.2026 — Haiku 5.5), но персона — новый Спарк, а
сессия — живого Спарка (Soniox, Owen). Карточка с лицом, чтобы видеть эмоции:
у KZ TEST вместо лица шар.

22.10.2026 — пакет v3.5: Спарк говорит en/ru (казахский — у Айзере), и у стенда
свой голос — Gemini TTS Fenrir со стилем по тегу эмоции (05_App_Settings пакета).
Живой Спарк остаётся на Soniox.
"""
import asyncio
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
assert buddy_persona_for(LearnerProfile(tutor="jarvis")) == "luna", "KZ TEST с 14.10 — новая Луна"
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
assert "# SPARK — PERSONA v3.5" in persona and "# DEXTER" not in text
assert context_of(text)["selection"]["persona_id"] == "spark"
# Ступени ростинга — только персоне с матом; у Спарка его нет.
assert "==== YOUR WORD RATING IN THIS CALL" not in text
assert "==== LIMITS FOR EVERY REPLY" in text
# С v3.5 Спарк говорит en/ru: казахский выбор чинится в русский, как у Декстера.
assert "- supported_languages: en, ru\n" in BUDDY_PERSONAS["spark"]
assert context_of(text)["language"]["support_language"] == "ru"
kz = build_buddy_instructions(profile(explanation_lang="kz"), "spark")
assert context_of(kz)["language"]["support_language"] == "ru"

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

# ── Сессия — живого Спарка, голос — свой (Gemini Fenrir) ─────────────────────
vp = buddy_voice_profile(p)
assert vp.tutor == "hype" and p.tutor == SPARK_TEST_STAND, "исходный профиль не трогаем"
assert _tts_provider_for(vp) == "gemini" and A.TUTOR_VOICE[vp.tutor] == "Fenrir"
assert _tts_provider_for(LearnerProfile(tutor="hype")) == "soniox", "живой Спарк — на Soniox, как был"
assert vp.tts_lang == "ru"
assert buddy_voice_profile(profile(explanation_lang="kz")).tts_lang == "ru"
assert buddy_voice_profile(profile(english_only=True)).tts_lang == "en"
assert _pronunciation_lang(vp) == "", "казахский словарь цифр — не для русской речи"
# Откат голоса секретом стенда, без деплоя; секрет живого Спарка стенд не трогает.
os.environ["TTS_PROVIDER_SPARKTEST"] = "soniox"
assert _tts_provider_for(buddy_voice_profile(p)) == "soniox"
os.environ.pop("TTS_PROVIDER_SPARKTEST")
os.environ["TTS_PROVIDER_HYPE"] = "eleven"
assert _tts_provider_for(buddy_voice_profile(p)) == "gemini"
os.environ.pop("TTS_PROVIDER_HYPE")
# Сценарий с карточки — тем же голосом стенда, язык синтеза — как у живого.
scen = buddy_voice_profile(profile(mode="scenario", scenario_id="ordering-coffee"))
assert scen.tutor == "hype" and scen.tts_lang == "" and _tts_provider_for(scen) == "gemini"
# Чужой секрет TTS_PROVIDER_<КЛЮЧ> стенду без своего голоса ничего не меняет.
os.environ["TTS_PROVIDER_JARVIS"] = "fish"
assert buddy_voice_profile(LearnerProfile(tutor="jarvis", lang="ru")).tts_provider == ""
os.environ.pop("TTS_PROVIDER_JARVIS")

# ── Стиль голоса: таблица клиента из 05_App_Settings ─────────────────────────
style = A.BUDDY_VOICE_STYLES[SPARK_TEST_STAND]
assert style.base.startswith("Speak as Spark, a 20-year-old guy")
assert set(style.by_tag) == {"default", "happy", "excited", "surprised", "sarcastic", "sympathy", "confused"}
assert set(style.by_tag) == set(pack), "строка на каждую эмоцию персоны, не больше"
sym = style.prompt("sympathy")
# Обрывок «Calm, sincere…» Gemini читал вслух; «sound calm…» — нет (замер 22.10).
assert sym == style.base + " For this line, sound calm, sincere and gentle, slower, no laughter, no jokes.", sym
assert style.prompt("nope") == style.prompt("default"), "неизвестный тег — ровная строка"
# Русской реплике — одна база: с добавками Gemini повторял реплику дважды.
assert style.prompt("sympathy", russian=True) == style.base
assert A._parse_voice_style("# no table") is None


class FakeGemini(A._GeminiTTS):
    """Ловит update_options, ничего не синтезирует."""

    def __init__(self):  # noqa: D401 — без ключей и клиента
        self.prompts = []

    def update_options(self, **kw):
        self.prompts.append(kw.get("prompt"))


async def _drive(agent, chunks):
    async def _text():
        for c in chunks:
            yield c

    seen = []

    async def fake_default_tts_node(self, text, model_settings):
        # Поток синтеза открывается здесь — стиль к этому моменту уже задан.
        seen.append(list(fake.prompts))
        async for c in text:
            seen.append(c)
        if False:
            yield None

    orig = A.Agent.default.tts_node
    A.Agent.default.tts_node = fake_default_tts_node
    try:
        async for _ in agent.tts_node(_text(), None):
            pass
    finally:
        A.Agent.default.tts_node = orig
    return seen


fake = FakeGemini()
agent = A.TutorAgent("x", "dev", "http://x", tutor=SPARK_TEST_STAND, voice_style=style)
type(agent).session = property(lambda self: types.SimpleNamespace(tts=fake))
agent._shown_mood = ("celebrate", 2)
seen = asyncio.run(_drive(agent, ["Let's go, you ", "actually sent it! ", "How do you feel now?"]))
assert seen[0] == [style.prompt("excited")], seen[0]
assert "".join(seen[1:]) == "Let's go, you actually sent it! How do you feel now?", "текст не теряется"
agent._shown_mood = None
seen = asyncio.run(_drive(agent, ["Без проблем, го по-русски! ", "Но отвечай по-английски."]))
assert seen[0][-1] == style.prompt("default", russian=True)
# Синтез не Gemini (откат, фолбэк) — стиль некому отдать.
fake.prompts.clear()
type(agent).session = property(lambda self: types.SimpleNamespace(tts=object()))
seen = asyncio.run(_drive(agent, ["Hi there."]))
assert fake.prompts == [] and "".join(seen[1:]) == "Hi there."
del type(agent).session
# Остальные — как были.
luna = LearnerProfile(tutor="gentle")
assert buddy_voice_profile(luna) is luna
kz_test = LearnerProfile(tutor="jarvis", lang="ru")
assert buddy_voice_profile(kz_test).tutor == "gentle"
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

# ── Мозг — Haiku 5.5 (с 14.10, был GPT-6 Sol), замок и фильтр эха — Спарка ───
assert session_brain_model(p) == "claude-haiku-5-5"
os.environ["BRAIN_MODEL_BUDDY_SPARKTEST"] = "gpt-6-sol"
assert session_brain_model(p) == "gpt-6-sol", "откат на Sol секретом, без деплоя"
os.environ.pop("BRAIN_MODEL_BUDDY_SPARKTEST")
assert session_brain_model(profile(mode="scenario", scenario_id="x")) == _brain_model_for("hype")
assert buddy_guard_tutor(p) == "hype", "в канарейках секретов стенда нет — защиты живого Спарка"
assert buddy_guard_tutor(kz_test) == "jarvis", "у KZ TEST канарейки свои"
assert buddy_guard_tutor(luna) == "gentle"

print("test_spark_stand: ok")
