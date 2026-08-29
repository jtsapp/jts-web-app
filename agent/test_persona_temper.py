"""Ассерты для оси «нрав» (temper): второй характер у того же тьютора.

pytest в проекте нет — файл запускается напрямую:
    agent/venv/Scripts/python.exe agent/test_persona_temper.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.

Главное, что тут закреплено, — РАЗДЕЛЕНИЕ ОСЕЙ. Нрав меняет только текст и тон
промпта (persona_key), а голос, провайдер TTS и язык тьютора по-прежнему
считаются по базовому id (p.tutor). Смешать их легко и дорого: злой Спарк
потерял бы казахский, а спокойный Декстер — свой голос.
"""
import json

from agent import (
    DEFAULT_OPENER,
    ELEVEN_VOICE,
    OPENAI_TTS_VOICE,
    PERSONA_STANDALONE_BLOCKS,
    STANDALONE_PROMPT_PERSONAS,
    LearnerProfile,
    _openai_instructions_for,
    _openai_speed_for,
    build_standalone_instructions,
    PERSONA_OPENER,
    PERSONA_OVERRIDE,
    PERSONA_METHODOLOGY_BLOCKS,
    PERSONA_TEMPERATURE,
    SONIOX_TTS_VOICE,
    TONE_SELF_DEFINED_PERSONAS,
    TUTOR_TTS_PROVIDER,
    build_debate_greeting,
    build_greeting_hint,
    build_instructions,
    build_placement_greeting,
    language_mode_block,
    methodology_for,
    parse_metadata,
    persona_key,
    persona_opener,
    persona_owns_opening,
    slim_prompt_for_persona,
    tutor_session_lang,
)

SPARK, DEXTER, LUNA = "hype", "bro", "gentle"


# --- persona_key ------------------------------------------------------------
# Четыре живые комбинации.
assert persona_key(SPARK, "calm") == SPARK
assert persona_key(SPARK, "harsh") == "hype_harsh"
assert persona_key(DEXTER, "calm") == "bro_calm"
assert persona_key(DEXTER, "harsh") == DEXTER
# Пустой нрав — базовая персона. Это контракт со старыми клиентами: они поля не
# шлют вовсе, и звонок обязан идти ровно как до появления оси.
assert persona_key(SPARK, "") == SPARK
assert persona_key(DEXTER, "") == DEXTER
# У кого варианта нет — нрав ничего не меняет.
assert persona_key(LUNA, "harsh") == LUNA
# У Джарвиса нрав ВРЕМЕННО есть — 18+ и новую озвучку обкатывают на нём, а не на
# живых Спарке с Декстером. Спокойный вариант при этом остаётся базовым id.
assert persona_key("jarvis", "harsh") == "jarvis_harsh"
assert persona_key("jarvis", "calm") == "jarvis"
assert persona_key("jarvis", "") == "jarvis"
# Мусор и регистр.
assert persona_key(SPARK, "MUSOR") == SPARK
assert persona_key("HYPE", "HARSH") == "hype_harsh"
assert persona_key("", "harsh") == ""

# Значение из metadata валидируется, а не подставляется как есть.
assert parse_metadata(json.dumps({"tutor": "hype", "temper": "harsh"})).temper == "harsh"
assert parse_metadata(json.dumps({"tutor": "hype", "temper": "18+"})).temper == ""
assert parse_metadata(json.dumps({"tutor": "hype", "temper": 42})).temper == ""
assert parse_metadata(json.dumps({"tutor": "hype"})).temper == ""

# Обе новые персоны реально существуют — иначе PERSONA_OVERRIDE.get вернёт ""
# и тьютор поедет вообще без характера.
assert PERSONA_OVERRIDE["hype_harsh"]
assert PERSONA_OVERRIDE["bro_calm"]
assert PERSONA_TEMPERATURE["hype_harsh"] > PERSONA_TEMPERATURE[SPARK]


# --- ось голоса и языка не поехала -----------------------------------------
# Эти таблицы обязаны читаться по БАЗОВОМУ id: у вариантов записей нет, и если
# кто-то переведёт их на persona_key, оба варианта тихо уедут на дефолтный голос.
for variant in ("hype_harsh", "bro_calm", "jarvis_harsh"):
    assert variant not in TUTOR_TTS_PROVIDER
    assert variant not in SONIOX_TTS_VOICE
    assert variant not in ELEVEN_VOICE
    assert variant not in OPENAI_TTS_VOICE

# Джарвис 18+ — персона со СВОИМ файлом промпта, а не строкой в PERSONA_OVERRIDE
# (в отличие от hype_harsh/bro_calm). Пустой блок здесь = ассистент без
# характера, и заметно это будет только в живом звонке.
assert PERSONA_STANDALONE_BLOCKS["jarvis_harsh"]
assert PERSONA_STANDALONE_BLOCKS["jarvis_harsh"] != PERSONA_STANDALONE_BLOCKS["jarvis"]
# Ветку «свой промпт» выбирает persona_key: по базовому id злой Джарвис уехал бы
# в обычную сборку и получил бы методичку с CEFR, которой у ассистента нет.
assert "jarvis_harsh" in STANDALONE_PROMPT_PERSONAS
jarvis_harsh = LearnerProfile(tutor="jarvis", temper="harsh", lang="ru")
assert build_standalone_instructions(jarvis_harsh) != build_standalone_instructions(
    LearnerProfile(tutor="jarvis", lang="ru")
)

# ПОДАЧА — единственная ось, которая у OpenAI-TTS читает persona_key, а не
# базовый id, и это осознанно: 18+ обязан менять интонацию, а не только слова.
# Голос (пресет) при этом у обоих один — проверено выше через OPENAI_TTS_VOICE.
assert _openai_instructions_for("jarvis_harsh", "ru") != _openai_instructions_for("jarvis", "ru")
assert _openai_speed_for("jarvis_harsh") > _openai_speed_for("jarvis")
# Произношение цепляется по языку сессии, а не по персоне. Проверяем по строке
# ИЗ САМОГО блока, а не по слову «Kazakh»: спокойная персона теперь и сама
# описана как носитель казахского («native Kazakh speaker»), поэтому слово
# встречается в подаче при любом языке — и проверка на него бы врала.
assert "vowel harmony" in _openai_instructions_for("hype", "kz")
assert "vowel harmony" not in _openai_instructions_for("jarvis", "ru")
# Блок живости достаётся всем — он и лечит «дикторское» чтение.
for persona, lang in (("jarvis", "ru"), ("jarvis_harsh", "ru"), ("hype", "kz")):
    assert "not a narrator reading" in _openai_instructions_for(persona, lang)

# Казахский Спарка от злости не исчезает.
assert tutor_session_lang(SPARK, "ru") == "kz"
spark_harsh = LearnerProfile(tutor=SPARK, temper="harsh", lang="ru")
prompt_harsh = build_instructions(spark_harsh)
assert "RUSSIAN IS NOT YOUR LANGUAGE" in prompt_harsh
assert "SPEAK RUSSIAN TO THEM" not in prompt_harsh
# Смешанный режим A1 у злого Спарка тоже казахский, а не русский.
mixed = language_mode_block("A1", "ru", interview=False, tutor=SPARK, temper="harsh")
assert "Kazakh" in mixed and "Russian" not in mixed
# ...и при этом уже без «gently» — тон задаёт персона.
assert "gently" not in mixed
assert "gently" in language_mode_block("A1", "ru", interview=False, tutor=LUNA)


# --- тон: кто задаёт его сам ------------------------------------------------
assert TONE_SELF_DEFINED_PERSONAS == {"bro", "hype_harsh"}
assert persona_owns_opening(spark_harsh)
assert persona_owns_opening(LearnerProfile(tutor=DEXTER))
assert not persona_owns_opening(LearnerProfile(tutor=DEXTER, temper="calm"))
assert not persona_owns_opening(LearnerProfile(tutor=SPARK))

# STYLE_GUIDANCE («warm, supportive, encouraging») спорит с жёстким характером
# в упор — у злого Спарка его быть не должно, у спокойного Декстера должен.
assert "warm, supportive" not in prompt_harsh
assert "warm, supportive" in build_instructions(LearnerProfile(tutor=SPARK, lang="ru"))
assert "warm, supportive" in build_instructions(LearnerProfile(tutor=DEXTER, temper="calm"))
assert "warm, supportive" not in build_instructions(LearnerProfile(tutor=DEXTER))

# Уровневая подпорка: у жёстких персон без слов про мягкость (A1 иначе делает
# их добрыми — ровно этот баг чинили у Декстера).
a1_harsh = build_instructions(LearnerProfile(tutor=SPARK, temper="harsh", level="A1"))
assert "Highly encouraging and patient" not in a1_harsh
assert "Highly encouraging and patient" in build_instructions(
    LearnerProfile(tutor=SPARK, level="A1")
)

# Разговорно-тональные секции вырезаются у злого Спарка и не вырезаются у
# спокойного Декстера.
sample = (
    # Ведущий перевод строки обязателен: вырезалка ищет секцию по образцу
    # «перевод строки, ==== ИМЯ ====».
    chr(10) + "==== LIVING FRIEND ENERGY ====" + chr(10) + "warm stuff" + chr(10)
    + "==== KEEP ME ====" + chr(10) + "method" + chr(10) + "==== END ===="
)
assert "LIVING FRIEND ENERGY" not in slim_prompt_for_persona(sample, "hype_harsh")
assert "LIVING FRIEND ENERGY" in slim_prompt_for_persona(sample, "bro_calm")
assert "KEEP ME" in slim_prompt_for_persona(sample, "hype_harsh")


# --- методичка --------------------------------------------------------------
# Файл 18+ достаётся обеим жёстким персонам и НИ ОДНОЙ мягкой.
assert set(PERSONA_METHODOLOGY_BLOCKS) == {"bro", "hype_harsh"}
harsh_doc = methodology_for("hype_harsh", "B1")
assert harsh_doc == methodology_for("bro", "B1")
# Имени Декстера в общем файле больше нет — иначе Спарк по нему представляется
# Декстером (ровно из-за этого файл и переименован из methodology-dexter.md).
assert "You are Dexter" not in harsh_doc
# Мягкие варианты падают на общую методичку.
shared = methodology_for(SPARK, "B1")
assert methodology_for("bro_calm", "B1") == shared
assert shared != harsh_doc


# --- приветствия ------------------------------------------------------------
# Жалоба клиента: все тьюторы здоровались одной и той же строкой.
openers = {
    key: build_greeting_hint(LearnerProfile(tutor=key, lang="ru"))
    for key in (LUNA, SPARK, "coach", "professor")
}
assert len(set(openers.values())) == len(openers)
for key, hint in openers.items():
    assert PERSONA_OPENER[key] in hint, key

# У жёстких персон тёплого приветствия нет вовсе — ни в звонке, ни в
# placement, ни в дебатах.
for p in (spark_harsh, LearnerProfile(tutor=DEXTER, lang="ru")):
    for hint in (build_greeting_hint(p), build_placement_greeting(p), build_debate_greeting(p)):
        assert "Great to see you" not in hint
        assert "Great to meet you" not in hint
        assert "YOUR OWN voice" in hint
# ...а у мягких — есть, и пример свой.
assert DEFAULT_OPENER not in build_greeting_hint(LearnerProfile(tutor=LUNA, lang="ru"))
assert persona_opener(LearnerProfile(tutor=DEXTER, temper="calm")) == PERSONA_OPENER["bro_calm"]
# Персона без записи в таблице получает общий пример, а не пустую строку.
assert persona_opener(LearnerProfile(tutor="jarvis")) == DEFAULT_OPENER

# english_only по-прежнему сильнее родных веток у мягких персон.
assert "FIRST, immediately say" in build_greeting_hint(
    LearnerProfile(tutor=SPARK, lang="ru", english_only=True)
)

print("test_persona_temper: ok")
