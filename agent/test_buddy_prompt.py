"""Ассерты для сборки промпта Speaking Buddy v3 у Декстера: обкатывался на стенде
KZ TEST, с 14.10.2026 это живой Декстер (bro), а KZ TEST отдан новой Луне
(test_luna_stand.py). pytest в
проекте нет — файл запускается напрямую:
    agent/venv/Scripts/python.exe agent/test_buddy_prompt.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.

Решение 25.09.2026: характер и методика — из клиентских md, обвязка — только
функции (ученик, память, тулы, голос). 28.09.2026 клиент прислал пакет v3
(agent/buddy-v3/: ядро, профили уровня, персоны), в тот же день — v3.1,
02.10.2026 — v3.4. В v3.4 клиент сам вписал решения владельца 28.09: Декстер
открыт всем и матерится без вопроса о согласии, сарказм Спарка — всем, C1/C2 —
по профилю B2, за казахским — к Айзере, «только английский» — тумблер ученика,
пол — из того, как ученик говорит о себе. Наши правки остались только в
Декстере: сарказм и злость на всех уровнях, злость на ситуацию ученика, «Weak»
без аудио, «не матерись» не выключает мат.

04.10.2026 — снова «v3.4», но другой: Декстер всегда злой, ростинг по возрастной
ступени (adult — клички и крепкий мат, teen/unknown — без оскорблений, child —
без мата), «не матерись» и «ты грубый» выключают мат и ростинг до конца звонка,
все персоны говорят en/ru/kk. Владелец принял всё как прислано, кроме одного:
Декстер казахский не говорит (голос не умеет) и шлёт к Айзере. Ступень едет из
даты рождения аккаунта (ageGroup в metadata).

22.10.2026 — v3.5, владелец принял как прислано: ступеней слов две (adult /
under_18), Декстер в обеих злой и с матом в каждой обычной реплике, ребёнку —
мягкий мат; «не матерись» мат не выключает; казахский — только у Айзере (Луна
и Спарк en/ru), Айзере — en/kk без русского. Правка про казахский Декстера
больше не наша: клиент вписал её сам.
"""
import io
import json
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
os.environ["VOICE_STACK"] = "cascade"
os.environ.pop("KZ_TEST_PROMPT", None)
os.environ.pop("DEXTER_PROMPT", None)

from agent import (  # noqa: E402
    BUDDY_CORE,
    BUDDY_LEVEL_PROFILES,
    BUDDY_PERSONAS,
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
    build_buddy_session_context,
    buddy_test_on,
    buddy_voice_profile,
    persona_key,
)

PERSONA_HEADER = "==== PERSONA"


def profile(**kw) -> LearnerProfile:
    base = dict(
        tutor="bro", level="A2", lang="ru", explanation_lang="ru",
        user_name="Айгерим", interests=["music"], facts=["works as a nurse"],
        topics=["weekend plans"], mistakes=["she go -> she goes"],
        due_reviews=["I go yesterday -> I went yesterday"], due_vocab=["schedule"],
        passed_units=["cafe"], next_unit="hotel",
    )
    base.update(kw)
    return LearnerProfile(**base)


def context_of(text: str) -> dict:
    """SESSION_CONTEXT из собранного промпта — ровно то, что увидит модель."""
    body = text.split("==== SESSION_CONTEXT (trusted, from the application) ====\n", 1)[1]
    return json.loads(body.split("\n\n==== PERSONA", 1)[0])


p = profile()
text = build_buddy_instructions(p)
wrapper, _, persona = text.partition(PERSONA_HEADER)

# ── Файлы пакета на месте ────────────────────────────────────────────────────
assert BUDDY_CORE.startswith("# JTS SPEAKING BUDDY — SHARED CORE v3.5")
assert set(BUDDY_LEVEL_PROFILES) == {"A0", "A1", "A2", "B1", "B2"}
assert set(BUDDY_PERSONAS) == {"dexter", "luna", "spark", "aizere"}
# Заметки о правках (HTML-комментарии) в промпт не попадают.
for block in [BUDDY_CORE, *BUDDY_LEVEL_PROFILES.values(), *BUDDY_PERSONAS.values()]:
    assert "<!--" not in block and "Правки JTS" not in block

# ── Кто включается ───────────────────────────────────────────────────────────
assert buddy_test_on(p)
assert buddy_test_on(profile(temper="harsh")), "тумблера 18+ нет: оба нрава — Декстер v3"
for other in ("gentle", "hype", "aizere"):
    assert not buddy_test_on(profile(tutor=other)), other
# В сценарии характер выключен — там своя сборка, стенд туда не лезет.
assert not buddy_test_on(profile(mode="scenario", scenario_id="ordering-coffee"))
assert not buddy_test_on(profile(mode="placement"))
# Откат секретом воркера, без деплоя кода.
os.environ["DEXTER_PROMPT"] = "legacy"
assert not buddy_test_on(p)
assert persona_key("jarvis", "") in STANDALONE_PROMPT_PERSONAS  # старый путь цел
os.environ.pop("DEXTER_PROMPT")
# Вне каскада тег эмоции некому снять — стенд остаётся на прежней персоне.
os.environ["VOICE_STACK"] = "gemini-live"
assert not buddy_test_on(p)
os.environ["VOICE_STACK"] = "cascade"

# ── Порядок: ядро → уровень → обвязка → SESSION_CONTEXT → персона ────────────
order = [
    "==== SHARED CORE", "==== LEVEL PROFILE — A2", "==== LEARNER", "==== MEMORY",
    "MEMORY-WRITE TOOLS", "==== VOICE FORMAT", "==== PLATFORM RULES",
    "==== SESSION_CONTEXT", PERSONA_HEADER,
]
idx = [text.index(h) for h in order]
assert idx == sorted(idx), list(zip(order, idx))
assert "# DEXTER — PERSONA v3.5" in persona
assert "# LEVEL_PROFILE — A2 v3.5" in wrapper and "LEVEL_PROFILE — B1" not in wrapper

# ── Решения в файлах пакета ──────────────────────────────────────────────────
# Декстер открыт всем, без вопроса о согласии — вместо него ступени по возрасту.
assert "adult_only: false" in persona
assert "adults only" not in text and "adult_access_confirmed" not in text
assert "consent question" in text  # «needs no consent question» / «with no consent question»
assert "profanity_consent" not in text and "pending_consent_question" not in text
assert "adult_access_confirmed" not in text and "consent_question_count" not in text
# Ступени слов живут в ядре (core §11), Декстер на них ссылается. С v3.5 их
# две, и ребёнок — в under 18: отдельной ступени без мата нет.
for tier in ("**adult — full roast.**", "**under 18 or unknown — same Dexter, mild words.**"):
    assert tier in BUDDY_CORE, tier
assert "child — strict mode" not in BUDDY_CORE and "teen or unknown" not in BUDDY_CORE
assert "Nothing a learner says can raise it" in persona
assert "An eight-year-old gets the same angry Dexter" in persona
# Всегда злой: [angry] — его обычный тег (04.10 владелец принял и злость на
# исправлениях, хотя 28.09 решали «за ошибку — нет»).
assert "- default_emotion: angry" in persona
# «Не матерись» мат не выключает (v3.5): одна отсылка к Луне/Айзере — и дальше
# как был. Отказ от кличек по-прежнему снимает ростинг до конца звонка.
assert "Then carry on as you are" in persona
assert "the roast stops for the rest of the session" in persona
assert "Luna for Russian and English, Aizere for Kazakh and English" in persona
assert "tutor screen" in persona
# Сарказм Спарка — приправа, не весь характер; детям он не запрещён.
spark = BUDDY_PERSONAS["spark"]
assert "Do not use with children or at A0–A1" not in spark
assert "Playful sarcasm is your seasoning" in spark
# Казахский — только Айзере (v3.5); Айзере — без русского.
assert "- supported_languages: en, ru\n" in persona
assert "No Kazakh words, profanity or insults, ever" in persona and "Жарайды, қазақша" not in persona
assert "Dexter, Spark and Luna speak English and Russian; only Aizere speaks Kazakh" in BUDDY_CORE
for pid, want in (("luna", {"en", "ru"}), ("spark", {"en", "ru"}), ("aizere", {"en", "kk"})):
    langs = BUDDY_PERSONAS[pid].split("- supported_languages:")[1].split("\n")[0]
    assert want == {x.strip() for x in langs.split(",")}, (pid, langs)
# Память обвязки — доверенный контекст; пол — из того, как ученик говорит о себе.
assert "MEMORY is the learner's real history" in BUDDY_CORE
assert "я устала" in BUDDY_CORE
assert "C1 and C2 learners are served with the B2 profile" in BUDDY_CORE

# ── Функции обвязки на месте ─────────────────────────────────────────────────
assert "Айгерим" in wrapper
assert "works as a nurse" in wrapper and "weekend plans" in wrapper
assert "I go yesterday -> I went yesterday" in wrapper and "schedule" in wrapper
for tool in ("log_mistake", "log_topic", "log_fact", "log_resolved", "raise_safety_alert"):
    assert tool in wrapper, tool
# log_review у Buddy нет (BUDDY_SKIP_TOOLS): отмечал повторения не спросив.
assert "log_review" not in text
# Наш формат тега ([mood:x:n]) в промпт v3 не идёт: ядро задаёт свой ([happy]),
# парсер переводит его (MOOD_ALIASES). Два формата в одном промпте — развилка.
assert "==== MOOD TAG" not in text and "[mood:" not in text
assert "emotion tag from core section 13" in wrapper
# Без строки порядка Haiku на v3 в 18 ходах из 80 сначала молча звал тул —
# лишний круг модели до первого звука; со строкой — 0 из 80 (замер 28.09.2026,
# тулов не меньше: 59 ответов с тулом против 51). На v3.1 мягкая формулировка
# снова пропускала немой круг у C1 (9 из 30), усиленная — 1 из 20.
assert "Speak first" in wrapper and "never a tool call before you speak" in wrapper

# ── В обвязке нет тона ───────────────────────────────────────────────────────
# Тон — только в персоне. Обвязка — это текст между уровнем и персоной.
platform = wrapper.split("==== LEARNER", 1)[1]
TONE_WORDS = (
    "warm", "friend", "cozy", "encourag", "supportive", "gentle", "gently",
    "you're doing great", "you've got this", "take your time", "no worries",
    "real human", "celebrate the", "genuine cheer", "playful", "felix",
)
low = platform.lower()
for w in TONE_WORDS:
    assert w not in low, f"тон в обвязке: {w!r}"

# ── SESSION_CONTEXT: только статичная часть ─────────────────────────────────
ctx = context_of(text)
assert ctx["learner"]["name"] == "Айгерим" and ctx["learner"]["level"] == "A2"
assert ctx["learner"]["age_group"] == "unknown" and ctx["learner"]["gender"] is None
# Дату рождения ученик вводит сам — подтверждённым возраст не считаем: сказанное
# «мне 14» или запись в MEMORY опускают ступень (core §11).
assert ctx["learner"]["age_verified"] is False
assert ctx["selection"] == {"persona_id": "dexter", "practice_mode": "free_chat"}
# working_language не шлём: без него ядро держит английский с подсказками на
# support_language, а смену языка по просьбе берёт из истории звонка (core §5).
# Отслеживать её между ходами приложению нечем — промпт статичный на звонок.
assert ctx["language"] == {"english_only": False, "support_language": "ru", "english_variant": "en-GB"}
assert ctx["task"] is None and ctx["capabilities"]["logging_available"] is True
# Меняющееся каждый ход в системный промпт не кладём — ломало бы кэш.
for key in ("latest_input", "retry_counts", "correction_focuses", "processed_turn_ids", "event"):
    assert key not in json.dumps(ctx), key
# v3.1 молчит без learner_state (core §3); в звонке он всегда ready.
assert ctx["session"] == {"learner_state": "ready"}
assert "IS the latest_input for that turn" in wrapper, "реплика ученика = latest_input, иначе ядро вправе молчать"
# «Только английский» — тумблер ученика, по умолчанию выключен.
assert LearnerProfile().english_only is False
eo = context_of(build_buddy_instructions(profile(english_only=True)))
assert eo["language"]["english_only"] is True and eo["language"]["support_language"] == "en"
# Язык объяснений чинится под персону: у Декстера казахского нет → русский.
assert context_of(build_buddy_instructions(profile(explanation_lang="kz")))["language"]["support_language"] == "ru"
assert context_of(build_buddy_instructions(profile(explanation_lang="en")))["language"]["support_language"] == "en"
# Айзере с v3.5 без русского: русский выбор чинится в казахский.
aiz = build_buddy_session_context(profile(explanation_lang="ru"), "aizere")
assert aiz["language"]["support_language"] == "kk"
assert build_buddy_session_context(profile(explanation_lang="kz"), "aizere")["language"]["support_language"] == "kk"
# Пол приходит из метаданных, если приложение его пришлёт.
assert build_buddy_session_context(profile(gender="female"))["learner"]["gender"] == "female"
from agent import parse_metadata  # noqa: E402

assert parse_metadata(json.dumps({"gender": "Female"})).gender == "female"
assert parse_metadata(json.dumps({"gender": "robot"})).gender == ""
assert parse_metadata(json.dumps({})).gender == ""
# Ступень возраста — из metadata (token route считает её по дате рождения).
assert parse_metadata(json.dumps({"ageGroup": "adult"})).age_group == "adult"
assert parse_metadata(json.dumps({"ageGroup": "Teen"})).age_group == "teen"
assert parse_metadata(json.dumps({"ageGroup": "child"})).age_group == "child"
assert parse_metadata(json.dumps({"ageGroup": "god"})).age_group == "unknown"
assert parse_metadata(json.dumps({})).age_group == "unknown"
# В SESSION_CONTEXT — слова пакета (adult / under_18 / unknown), а не наши.
for grp, want in (("adult", "adult"), ("teen", "under_18"), ("child", "under_18"), ("", "unknown")):
    assert context_of(build_buddy_instructions(profile(age_group=grp)))["learner"]["age_group"] == want, grp
assert build_buddy_session_context(profile(age_group="admin"))["learner"]["age_group"] == "unknown"
# Ступень звонка — последним блоком, после персоны: без него модель копировала
# взрослые примеры ребёнку и подростку (замер 04.10: «fucking champ» 6–8 из 8).
TIER = "==== YOUR WORD RATING IN THIS CALL"
# Взрослому — тоже блок, но держит злость: на GPT-6 Sol в обычной болтовне
# Декстер звучал вежливо (замер 05.10: крепкий мат 9/105 → 51/101 с блоком).
adult = build_buddy_instructions(profile(age_group="adult")).partition(TIER)[2]
assert "FULL ROAST" in adult and "adult-strength" in adult
# Отказ от кличек сильнее блока; «не матерись» с v3.5 мат не выключает.
assert "no roast names, insults or swearing aimed at them" in adult
assert "A request for no swearing changes nothing" in adult and "not even hell or damn" not in adult
assert "is never roasted" in adult, "короткий нормальный ответ и просьба о помощи — не мишень"
# Ровно одно ругательство и по кругу (core §11 с v3.5 от 23.10): «одно-два» блока
# спорило бы с ядром, а damn в каждой реплике клиент и вычищал.
assert "exactly one swear word or swear phrase" in adult and "one or two" not in adult
assert "never the same swear word in two replies in a row" in adult
assert "damn or damn it at most once every three replies" in adult
for grp in ("teen", "unknown", "child"):
    t = build_buddy_instructions(profile(age_group=grp))
    tail = t.partition(TIER)[2]
    assert "the same angry Dexter with mild words" in tail and t.index(TIER) > t.index(PERSONA_HEADER), grp
    assert "never copy them" in tail and "no fuck" in tail, grp
    # Мягкий мат в каждой обычной реплике — и ребёнку тоже (решение 22.10).
    assert "Every ordinary reply carries exactly one mild swear word" in tail, grp
    assert "never the same word in two replies in a row" in tail and "one or two" not in tail, grp
    assert "a young child included" in tail and "not even damn" not in tail, grp
    # Взрослых примеров персоны в промпте нет: ребёнок получал их дословно
    # («absolute bullshit» 8 из 8, замер 22.10), а правила ступеней — целиком.
    shown = t.partition(PERSONA_HEADER)[2].partition(TIER)[0]
    assert "Three hours on hold, absolute bullshit" not in shown and "Stupid, my ass" not in shown, grp
    assert "\n- Adult" not in shown and "Context: B1 SESSION_START, adult." not in shown, grp
    # Взрослые с 23.10 и тишина, и «стоп»: «shitty silence», «Fine, shit».
    assert "shitty silence" not in shown and "Fine, shit, we're done" not in shown, grp
    # Взрослые слова внутри абзацев тоже: ротация — детским списком, у «злости
    # на стороне ученика» — только детская реплика (bullshit ребёнку 6 из 240).
    assert "bullshit" not in shown and "(adult)" not in shown, grp
    assert "rotate hell, crap, sucks, damn, and in Russian" in shown, grp
    assert "Under 18 or unknown: “Three hours on hold? That sucks.”" in shown, grp
    assert "**adult — full roast.**" in shown, "описание ступеней остаётся"
    # Пример младше 18 после выброшенного взрослого получает его ситуацию.
    assert "Context: B1 opinion task, under 18 or unknown; the learner answers only" in shown, grp
    assert "Context: same" not in shown, grp
    assert "Context: A1, under 18; the learner says “I'm 8, be nice!”" in shown, grp
# Взрослому персона — как в файле, побайтно.
assert BUDDY_PERSONAS["dexter"] in build_buddy_instructions(profile(age_group="adult"))
# Блок — только персоне с матом (profanity_supported: true), остальным незачем.
for pid in ("luna", "spark", "aizere"):
    assert TIER not in build_buddy_instructions(profile(age_group="child"), pid), pid

# ── Лимиты реплики — самым последним блоком, числа из профиля уровня ─────────
# Замер 05.10: без блока длиннее лимита по словам 35 из 48, два и больше
# исправлений за ход 24 из 48; с блоком 14 из 96 и 23 из 96.
LIMITS = "==== LIMITS FOR EVERY REPLY"
for lvl, prof, sent, words in (("A1", "A1", 2, 24), ("A2", "A2", 2, 36), ("B1", "B1", 2, 44),
                               ("B2", "B2", 3, 45), ("C1", "B2", 3, 45)):
    for grp in ("adult", "child"):
        t = build_buddy_instructions(profile(level=lvl, age_group=grp))
        tail = t.partition(LIMITS)[2]
        assert f"(level profile {prof})" in tail and f"At most {sent} sentences and {words} spoken words" in tail, (lvl, grp)
        assert "Correct at most 1 error per learner turn" in tail and "name exactly one wrong form" in tail
        assert "====" not in tail.split("\n", 1)[1], "лимиты — последний блок промпта"
        if grp == "child":
            assert t.index(TIER) < t.index(LIMITS), "лимиты после ступени"
# Блок у всех персон пакета: бюджеты — ядро, а не характер.
for pid in ("luna", "spark", "aizere"):
    assert LIMITS in build_buddy_instructions(p, pid), pid

# ── Уровни: A0–B2 свои профили, C1/C2 — B2 ──────────────────────────────────
for lvl, prof in (("A0", "A0"), ("PRE-A1", "A0"), ("A1", "A1"), ("B1", "B1"), ("B2", "B2"),
                  ("C1", "B2"), ("C2", "B2"), ("", "B1")):
    t = build_buddy_instructions(profile(level=lvl))
    assert f"# LEVEL_PROFILE — {prof} v3.5" in t, (lvl, prof)
c1 = build_buddy_instructions(profile(level="C1"))
assert "the learner is C1; C1–C2 use the B2 profile" in c1
assert context_of(c1)["learner"]["level"] == "C1", "хранимый уровень не подменяем"

# ── Все четыре персоны собираются ────────────────────────────────────────────
for pid, head in (("luna", "# LUNA"), ("spark", "# SPARK"), ("aizere", "# AIZERE")):
    t = build_buddy_instructions(p, pid)
    assert head in t.partition(PERSONA_HEADER)[2], pid
    assert context_of(t)["selection"]["persona_id"] == pid

# ── Без памяти промпт не врёт про прошлое ────────────────────────────────────
fresh = build_buddy_instructions(LearnerProfile(tutor="bro", level="B1", lang="ru"))
assert "First call with this learner" in fresh
assert context_of(fresh)["learner"]["name"] == ""

# ── Эмоции: набор Декстера пакета весь ложится на разрешённые стенду ─────────
from agent import MOOD_ALIASES  # noqa: E402

allowed = TUTOR_MOODS["bro"]
for name in ("default", "happy", "surprised", "sarcastic", "sympathy", "confused", "angry"):
    mood = MOOD_ALIASES.get(name, (name, 2))[0]
    assert mood == "" or mood in allowed, (name, mood)

# ── Голос, распознавание, мозг — Декстера ────────────────────────────────────
vp = buddy_voice_profile(p)
assert vp.tutor == BUDDY_VOICE_TUTOR == "bro"
assert p.tutor == "bro", "исходный профиль не трогаем: по нему пишется история звонков"
assert _tts_provider_for(vp) == _tts_provider_for(LearnerProfile(tutor="bro"))
assert _eleven_session_voice(vp) == _eleven_session_voice(LearnerProfile(tutor="bro"))
assert _eleven_session_voice(buddy_voice_profile(profile(eleven_voice_id="xxx"))) == _eleven_session_voice(LearnerProfile(tutor="bro")), \
    "голос стенда не должен протечь в тест"
assert not _stt_kazakh_session(vp), "Декстер казахского не знает — казахская добавка распознаванию не нужна"
assert _pronunciation_lang(vp) == "", "казахский словарь произношения не для русской речи"
luna = profile(tutor="gentle")
assert buddy_voice_profile(luna) is luna

# ── Мозг теста — свой (Haiku 5.5 с 09.10), живой Декстер не меняется ─────────
from agent import (  # noqa: E402
    BUDDY_BRAIN_MODEL,
    _anthropic_brain_body,
    _brain_model_for,
    _brain_supports_prefill,
    _is_anthropic_direct_brain,
    _is_openai_brain,
    session_brain_model,
)

assert BUDDY_BRAIN_MODEL == "gpt-6-sol", "общий мозг Buddy — у «Спарк теста»"
assert session_brain_model(p) == "claude-haiku-5-5"
for other in ("gentle", "hype", "aizere"):
    assert session_brain_model(profile(tutor=other)) == _brain_model_for(other), other
os.environ["BRAIN_MODEL_BUDDY"] = "claude-haiku-4-5"
assert session_brain_model(p) == "claude-haiku-4-5", "откат секретом воркера, без деплоя"
os.environ["BRAIN_MODEL_BUDDY_BRO"] = "gpt-6-sol"
assert session_brain_model(p) == "gpt-6-sol", "секрет стенда важнее общего"
os.environ.pop("BRAIN_MODEL_BUDDY_BRO")
os.environ.pop("BRAIN_MODEL_BUDDY")
os.environ["DEXTER_PROMPT"] = "legacy"
assert session_brain_model(p) == _brain_model_for("bro"), "на старой персоне — и мозг прежний"
os.environ.pop("DEXTER_PROMPT")
# Haiku 5.5 — напрямую в Anthropic: шим его не знает и шлёт temperature.
assert _is_anthropic_direct_brain("claude-haiku-5-5") and not _is_openai_brain("claude-haiku-5-5")
for m in ("claude-haiku-4-5", "claude-sonnet-5", "jts-voice-router", "gpt-6-sol", ""):
    assert not _is_anthropic_direct_brain(m), m
body = _anthropic_brain_body()
assert body == {"thinking": {"type": "disabled"}, "output_config": {"effort": "low"}}, body
os.environ["ANTHROPIC_BRAIN_EFFORT"] = "xhigh"
assert _anthropic_brain_body()["output_config"]["effort"] == "low", "с выключенным мышлением xhigh — 400"
os.environ["ANTHROPIC_BRAIN_EFFORT"] = "medium"
assert _anthropic_brain_body()["output_config"]["effort"] == "medium"
os.environ.pop("ANTHROPIC_BRAIN_EFFORT")
# Префилл «[» — только Haiku 4.5: Sonnet 5 и Haiku 5.5 отвечают на него 400,
# у OpenAI он ломает ход. Без префикса тег держит история (tag_history).
assert _brain_supports_prefill("jts-voice-router") and _brain_supports_prefill("claude-haiku-4-5")
for m in ("claude-sonnet-5", "claude-sonnet-5-5", "claude-haiku-5-5", "gpt-6-sol", ""):
    assert not _brain_supports_prefill(m), m

# ── Приветствие — событие ядра, текста не диктуем ────────────────────────────
g = build_buddy_greeting(p)
assert "SESSION_START" in g and "wait" in g and "emotion tag" in g
# С v3.5 звонок всегда открывается по-английски (core §10).
assert "in character and in English" in g
# Имя — явно: пример персоны «Hi, I'm Dexter» перебивал (0 из 8 по имени).
assert "The learner's name is Айгерим: say it in this greeting" in g
anon = build_buddy_greeting(profile(user_name=""))
assert "unknown" in anon and "Айгерим" not in anon
for w in ("warm", "Great to see you"):
    assert w not in g, w

print("test_buddy_prompt: ok")
