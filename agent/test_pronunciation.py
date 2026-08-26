"""Ассерты для произношения: словарь, числительные, потоковая нормализация.

pytest в проекте нет — файл запускается напрямую:
    agent/venv/Scripts/python.exe agent/test_pronunciation.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.

Главное, что тут закреплено:
  * подмена написания уходит ТОЛЬКО в синтез (tts_node), не в субтитры;
  * потоковая нормализация даёт ровно тот же текст, что и разовая — иначе
    словарь чинил бы слово в одном чанке и рвал в другом;
  * язык произношения у казахскоязычных тьюторов не зависит от интерфейса.
"""
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from agent import (  # noqa: E402
    KZ_SPEAKING_TUTORS,
    LearnerProfile,
    PRONUNCIATION_LEXICON,
    _PronunciationStream,
    _pronunciation_lang,
    _tts_speech_lang,
    normalize_for_speech,
    number_to_kazakh,
    tutor_session_lang,
)

# --- казахские числительные -------------------------------------------------
assert number_to_kazakh(0) == "нөл"
assert number_to_kazakh(7) == "жеті"
assert number_to_kazakh(10) == "он"
assert number_to_kazakh(21) == "жиырма бір"
# «жүз» и «мың» без единицы впереди — в казахском её не ставят.
assert number_to_kazakh(100) == "жүз"
assert number_to_kazakh(1000) == "мың"
assert number_to_kazakh(200) == "екі жүз"
assert number_to_kazakh(2026) == "екі мың жиырма алты"
assert number_to_kazakh(-5) == "минус бес"

# --- нормализация -----------------------------------------------------------
# Разметка снимается: синтез читает звёздочку вслух, в отличие от экрана.
assert normalize_for_speech("*Present perfect*", "kz") == "Present perfect"
# Цифры разворачиваются словами.
assert "екі мың жиырма алты" in normalize_for_speech("2026 жыл", "kz")
# Цифра, приклеенная к букве, отделяется пробелом — иначе «A1» становится одним
# словом «Aбір», которого не видит ни словарь, ни синтез.
assert normalize_for_speech("A1", "kz") == "A one"
assert normalize_for_speech("B2 деңгей", "kz") == "B two деңгей"
# ...а перед точкой пробел не появляется: там своя пауза.
assert normalize_for_speech("3 сабақ.", "kz").endswith("үш сабақ.")
# Словарь: аббревиатура по буквам, имя — казахской фонетикой.
assert normalize_for_speech("IELTS", "kz") == "I E L T S"
assert normalize_for_speech("Джарвис", "kz") == "Жарвис"
# Регистр ключа не важен, а подстрока внутри слова НЕ трогается.
assert normalize_for_speech("ielts", "kz") == "I E L T S"
assert normalize_for_speech("IELTSPRO", "kz") == "IELTSPRO"
# Язык без словаря проходит текст насквозь (кроме разметки).
assert normalize_for_speech("2026 год", "ru") == "2026 год"
assert normalize_for_speech("", "kz") == ""

# --- потоковая версия -------------------------------------------------------
# Модель шлёт текст кусками; подмена на границе куска не должна рвать слово.
SRC = "Джарвис сізге IELTS деңгейін A1 айтады, 2026 жылы."
for size in (1, 2, 3, 7, 40):
    stream = _PronunciationStream("kz")
    chunks = [SRC[i : i + size] for i in range(0, len(SRC), size)]
    got = "".join(stream.feed(c) for c in chunks) + stream.flush()
    assert got == normalize_for_speech(SRC, "kz"), (size, got)

# Реплика без единого пробела не должна зависнуть в буфере навсегда.
long_word = "қ" * 200
stream = _PronunciationStream("kz")
assert stream.feed(long_word) != "" or stream.flush() != ""

# --- язык произношения ------------------------------------------------------
# Казахскоязычные говорят по-казахски при ЛЮБОМ интерфейсе, включая английский:
# язык озвучки — свойство персоны, а не выбранного языка приложения.
assert KZ_SPEAKING_TUTORS == frozenset({"hype", "jarvis"})
for tutor in KZ_SPEAKING_TUTORS:
    for lang in ("en", "ru", "kz"):
        assert _tts_speech_lang(tutor, lang) == "kz", (tutor, lang)
# У остальных — язык сессии как есть.
assert _tts_speech_lang("bro", "ru") == "ru"
assert _tts_speech_lang("gentle", "en") == "en"
# И это НЕ то же самое, что tutor_session_lang: тот отвечает на другой вопрос и
# при английском интерфейсе казахский не включает.
assert tutor_session_lang("hype", "en") == "en"

# ГЕЙТ ПРОДА. Агент один на дев и прод, поэтому словарь включается по
# ПРОВАЙДЕРУ, а не по тьютору: подмены подобраны под голос OpenAI, и живой Спарк
# на Soniox их получать не должен, пока их на нём не прогнали.
assert _pronunciation_lang(LearnerProfile(tutor="jarvis", lang="ru")) == "kz"
assert _pronunciation_lang(LearnerProfile(tutor="jarvis", lang="ru", temper="harsh")) == "kz"
assert _pronunciation_lang(LearnerProfile(tutor="hype", lang="ru")) == ""
assert _pronunciation_lang(LearnerProfile(tutor="bro", lang="ru")) == ""
assert _pronunciation_lang(LearnerProfile(tutor="gentle", lang="en")) == ""

# Словарь заведён только там, где он есть; у остальных языков tts_node пропускает
# текст как есть (см. speech_lang в TutorAgent).
assert set(PRONUNCIATION_LEXICON) == {"kz"}
assert PRONUNCIATION_LEXICON["kz"], "словарь пуст — файл не доехал до воркера"

print("test_pronunciation: ok")
