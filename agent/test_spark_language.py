"""Ассерты для двуязычия Спарка. pytest в проекте нет — файл запускается напрямую:
    agent/venv/Scripts/python.exe agent/test_spark_language.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.

Клиенты жаловались, что Спарк отвечает по-русски. Русский приезжал к нему не из
характера, а из языковых веток промпта, которые смотрят на язык интерфейса
(lang == "ru") и на настройку explanationLang. Здесь закреплено, что ни одна из
них больше не выдаёт Спарку русскую инструкцию, а остальным тьюторам — выдаёт
ровно как раньше.
"""
from agent import (
    KZ_TUTOR_PERSONA,
    LearnerProfile,
    PERSONA_OVERRIDE,
    build_debate_greeting,
    build_greeting_hint,
    build_instructions,
    build_placement_greeting,
    explanation_language_block,
    language_mode_block,
    tutor_session_lang,
    _mirror_language_rules,
)

SPARK = KZ_TUTOR_PERSONA  # "hype"
LUNA = "gentle"


def _spark(**kw):
    return LearnerProfile(tutor=SPARK, **kw)


# --- tutor_session_lang -----------------------------------------------------
# Русский интерфейс не делает Спарка русскоязычным; на всех остальных персонах
# функция обязана быть тождественной, иначе она молча меняет чужие ветки.
assert tutor_session_lang(SPARK, "ru") == "kz"
assert tutor_session_lang(SPARK, "kz") == "kz"
assert tutor_session_lang(SPARK, "en") == "en"
assert tutor_session_lang(LUNA, "ru") == "ru"
assert tutor_session_lang(LUNA, "kz") == "kz"
assert tutor_session_lang("", "ru") == "ru"

# --- зеркалирование языка ---------------------------------------------------
spark_mirror = _mirror_language_rules(SPARK)
assert "RUSSIAN IS NOT YOUR LANGUAGE" in spark_mirror
# Общее зеркало разрешает русский прямым текстом — Спарку оно не достаётся.
assert "Russian, Kazakh or" not in spark_mirror
luna_mirror = _mirror_language_rules(LUNA)
assert "KAZAKH IS NOT YOUR LANGUAGE" in luna_mirror
assert "RUSSIAN IS NOT YOUR LANGUAGE" not in luna_mirror

# --- язык объяснений --------------------------------------------------------
# explanationLang=ru у Спарка уводится в казахскую ветку (у Луны остаётся русской).
assert "EXPLANATION LANGUAGE: KAZAKH" in explanation_language_block("ru", SPARK)
assert "EXPLANATION LANGUAGE: RUSSIAN" not in explanation_language_block("ru", SPARK)
assert "EXPLANATION LANGUAGE: RUSSIAN" in explanation_language_block("ru", LUNA)
# Обратное правило (kz у неказахскоязычных → ru) не сломано.
assert "EXPLANATION LANGUAGE: RUSSIAN" in explanation_language_block("kz", LUNA)
assert "EXPLANATION LANGUAGE: KAZAKH" in explanation_language_block("kz", SPARK)
# Тумблер «только английский» бьёт всё, включая казахскую ветку Спарка.
assert "ENGLISH ONLY" in explanation_language_block("ru", SPARK, english_only=True)

# --- смешанный режим A1/A2 --------------------------------------------------
mixed = language_mode_block("A1", "ru", interview=False, tutor=SPARK)
assert "Kazakh" in mixed and "Russian" not in mixed
mixed_luna = language_mode_block("A1", "ru", interview=False, tutor=LUNA)
assert "Russian" in mixed_luna
# Казахский интерфейс у Луны по-прежнему подпирается русским.
assert "Russian" in language_mode_block("A1", "kz", interview=False, tutor=LUNA)

# --- приветствия ------------------------------------------------------------
# Первая же реплика звонка: на русском интерфейсе Спарк здоровается по-казахски.
greet = build_greeting_hint(_spark(lang="ru"))
assert "БІРІНШІ" in greet and "СНАЧАЛА" not in greet
assert "СНАЧАЛА" in build_greeting_hint(LearnerProfile(tutor=LUNA, lang="ru"))
# english_only важнее персоны — обе ветки родного языка отключаются.
assert "FIRST, immediately say" in build_greeting_hint(_spark(lang="ru", english_only=True))

place = build_placement_greeting(_spark(lang="ru"))
assert "БІРІНШІ" in place and "СНАЧАЛА" not in place
assert "СНАЧАЛА" in build_placement_greeting(LearnerProfile(tutor=LUNA, lang="ru"))

debate = build_debate_greeting(_spark(lang="ru"))
assert "Алдымен" in debate and "Сначала" not in debate
assert "Сначала" in build_debate_greeting(LearnerProfile(tutor=LUNA, lang="ru"))

# --- полный промпт ----------------------------------------------------------
# Ветка lang_g: русскому интерфейсу Спарка достаётся казахская, английскому —
# своя, без «заговорил по-русски — отвечай по-русски».
prompt_ru = build_instructions(_spark(lang="ru"))
assert "SPEAK RUSSIAN TO THEM" not in prompt_ru
assert "answer in Kazakh" in prompt_ru
assert "RUSSIAN IS NOT YOUR LANGUAGE" in prompt_ru

prompt_en = build_instructions(_spark(lang="en"))
assert "speak Russian or Kazakh, ANSWER IN THAT LANGUAGE" not in prompt_en
assert "ANSWER IN KAZAKH" in prompt_en

prompt_kz = build_instructions(_spark(lang="kz"))
assert "NEVER switch to Russian on your own" in prompt_kz

# У остальных тьюторов ветки не поехали.
prompt_luna = build_instructions(LearnerProfile(tutor=LUNA, lang="ru"))
assert "SPEAK RUSSIAN TO THEM" in prompt_luna
prompt_dexter = build_instructions(LearnerProfile(tutor="bro", lang="en"))
assert "speak Russian or Kazakh, ANSWER IN THAT LANGUAGE" in prompt_dexter

# --- характер ---------------------------------------------------------------
assert "KAZAKH AND ENGLISH, NOTHING ELSE" in PERSONA_OVERRIDE[SPARK]

# --- нрав 18+ не открывает Спарку русский ----------------------------------
# Второй характер (temper="harsh") меняет тон, но не язык: он всё так же
# казахскоязычный. Подробные ассерты — в test_persona_temper.py, здесь только
# то, что относится к языку.
harsh = _spark(lang="ru", temper="harsh")
assert tutor_session_lang(harsh.tutor, harsh.lang) == "kz"
harsh_prompt = build_instructions(harsh)
assert "RUSSIAN IS NOT YOUR LANGUAGE" in harsh_prompt
assert "SPEAK RUSSIAN TO THEM" not in harsh_prompt
assert "KAZAKH AND ENGLISH, NOTHING ELSE" in harsh_prompt
# Инструкции злой персоны — по-английски. Русско-казахская смесь в первой версии
# заставила Спарка заговорить с учеником по-русски на первом же живом звонке.
harsh_persona = PERSONA_OVERRIDE["hype_harsh"]
for ru_word in ("ОБРАЩЕНИЕ", "ЗАПРЕЩЕНО", "НЕЛЬЗЯ", "ученик", "братан", "Грубость"):
    assert ru_word not in harsh_persona, ru_word

print("test_spark_language: ok")
