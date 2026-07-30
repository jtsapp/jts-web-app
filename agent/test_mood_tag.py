"""Ассерты для mood-парсера. pytest в проекте нет — файл запускается напрямую:
    agent/venv/Scripts/python.exe agent/test_mood_tag.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.
"""
from agent import _MoodStripper, build_mood_block, parse_mood_tag, TUTOR_MOODS

# --- parse_mood_tag ---------------------------------------------------------
assert parse_mood_tag("[mood:anger:3]Ты чё тупишь") == ("anger", 3, "Ты чё тупишь")
assert parse_mood_tag("  [mood:joy:1] Хорооош") == ("joy", 1, "Хорооош")
assert parse_mood_tag("[MOOD:Gloat:2]ага") == ("gloat", 2, "ага")

# Тега нет — текст обязан вернуться нетронутым.
assert parse_mood_tag("Ты чё тупишь") == ("", 0, "Ты чё тупишь")

# Битый тег не должен ничего съесть.
assert parse_mood_tag("[mood:anger]нет силы") == ("", 0, "[mood:anger]нет силы")
assert parse_mood_tag("[mood:anger:9]сила вне шкалы") == ("", 0, "[mood:anger:9]сила вне шкалы")
assert parse_mood_tag("[mood::2]нет имени") == ("", 0, "[mood::2]нет имени")

# Тег НЕ в начале — не цепляем, иначе парсер сожрёт кусок реальной речи.
assert parse_mood_tag("Слушай [mood:joy:2] сюда") == ("", 0, "Слушай [mood:joy:2] сюда")

# --- _MoodStripper: тег приходит целиком ------------------------------------
s = _MoodStripper(TUTOR_MOODS["bro"])
assert s.feed("[mood:anger:3]Ты чё тупишь, братан") == "Ты чё тупишь, братан"
assert (s.mood, s.intensity) == ("anger", 3)
assert s.flush() == ""

# --- _MoodStripper: тег разорван между чанками стрима -----------------------
s = _MoodStripper(TUTOR_MOODS["bro"])
assert s.feed("[mo") == ""
assert s.feed("od:gl") == ""
assert s.feed("oat:2]ну и ну") == "ну и ну"
assert (s.mood, s.intensity) == ("gloat", 2)

# --- _MoodStripper: реплика обрывается на возможном начале тега -------------
# flush() обязателен: пока буфер ещё МОЖЕТ стать тегом (_could_be_tag), feed()
# ничего не отдаёт; если реплика на этом и кончилась, без flush() эти символы
# потерялись бы совсем. (Обычный короткий текст без «[» отдаётся из feed()
# сразу — см. блок «реплика без тега уходит вниз СРАЗУ» ниже.)
s = _MoodStripper(TUTOR_MOODS["bro"])
assert s.feed("[mo") == ""
assert s.flush() == "[mo"
assert s.mood == ""

# --- _MoodStripper: тега нет, реплика длиннее лимита ------------------------
s = _MoodStripper(TUTOR_MOODS["bro"])
long_text = "Слушай сюда внимательно и повтори за мной целым предложением прямо сейчас"
out = s.feed(long_text)
assert out == long_text, out
assert s.feed(" и ещё раз") == " и ещё раз"  # после лимита проходит насквозь
assert s.mood == ""

# --- _MoodStripper: эмоция не разрешена этому тьютору -----------------------
# Тег всё равно ВЫРЕЗАН (иначе его озвучат), но эмоция не выставлена.
s = _MoodStripper(TUTOR_MOODS["gentle"])
assert s.feed("[mood:gloat:3]Ты молодец") == "Ты молодец"
assert s.mood == ""

# --- build_mood_block -------------------------------------------------------
bro_block = build_mood_block("bro")
assert "anger" in bro_block and "gloat" in bro_block
gentle_block = build_mood_block("gentle")
assert "joy" in gentle_block and "sadness" in gentle_block
assert "gloat" not in gentle_block and "anger" not in gentle_block
assert build_mood_block("professor") == ""

# --- _could_be_tag: ранний отпуск буфера ------------------------------------
from agent import _could_be_tag  # noqa: E402

assert _could_be_tag("") is True
assert _could_be_tag("  ") is True
assert _could_be_tag("[") is True
assert _could_be_tag("[mo") is True
assert _could_be_tag("[mood:") is True
assert _could_be_tag("[mood:anger:3]") is True
assert _could_be_tag("  [mood:joy:1]") is True
assert _could_be_tag("Yo") is False
assert _could_be_tag("[x") is False
assert _could_be_tag("[moon") is False

# Реплика без тега уходит вниз СРАЗУ, не дожидаясь MOOD_SCAN_LIMIT.
s = _MoodStripper(TUTOR_MOODS["bro"])
assert s.feed("Yo") == "Yo"
assert s.feed(" bro") == " bro"
assert s.mood == ""

# Разрыв тега между чанками по-прежнему собирается.
s = _MoodStripper(TUTOR_MOODS["bro"])
assert s.feed("[mo") == ""
assert s.feed("od:anger:2]давай") == "давай"
assert (s.mood, s.intensity) == ("anger", 2)

# --- битый тег: снимается молча, эмоции нет ---------------------------------
# Сила вне шкалы.
s = _MoodStripper(TUTOR_MOODS["bro"])
out = s.feed("[mood:anger:9]Ты чё тупишь, братан, соберись давай")
assert not out.startswith("[mood"), out
assert out.startswith("Ты чё"), out
assert s.mood == ""

# Лишний пробел в имени.
s = _MoodStripper(TUTOR_MOODS["bro"])
out = s.feed("[mood: joy:2]Хорооош, вот это другое дело уже совсем")
assert not out.startswith("[mood"), out
assert s.mood == ""

# Текст, похожий на тег, но им не являющийся, речь не теряет.
s = _MoodStripper(TUTOR_MOODS["bro"])
assert s.feed("[note] смотри сюда") == "[note] смотри сюда"

print("mood-парсер: все ассерты прошли")
