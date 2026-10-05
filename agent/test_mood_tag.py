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

# Тег без силы — не битый: у пакета Speaking Buddy v3 сила не пишется вовсе,
# берётся 2 («заметно»).
assert parse_mood_tag("[mood:anger]нет силы") == ("anger", 2, "нет силы")

# Битый тег не должен ничего съесть.
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

# --- тег без префикса «mood:» ------------------------------------------------
# Модель на живых прогонах писала и так; раньше это уезжало в озвучку.
assert parse_mood_tag("[anger:2]Ты чё тупишь") == ("anger", 2, "Ты чё тупишь")
assert parse_mood_tag("[JOY:1]Хорооош") == ("joy", 1, "Хорооош")
assert parse_mood_tag("[mood:anger:2]Ты чё") == ("anger", 2, "Ты чё")

# Незнакомое имя без префикса — НЕ тег, речь не трогаем.
assert parse_mood_tag("[note:2] смотри") == ("", 0, "[note:2] смотри")
assert parse_mood_tag("[1:2] раз два") == ("", 0, "[1:2] раз два")

s = _MoodStripper(TUTOR_MOODS["bro"])
assert s.feed("[anger:3]Соберись") == "Соберись"
assert (s.mood, s.intensity) == ("anger", 3)

# Разрыв между чанками для формы без префикса тоже собирается.
s = _MoodStripper(TUTOR_MOODS["bro"])
assert s.feed("[ang") == ""
assert s.feed("er:1]давай") == "давай"
assert (s.mood, s.intensity) == ("anger", 1)

# Битая форма без префикса снимается молча.
s = _MoodStripper(TUTOR_MOODS["bro"])
out = s.feed("[anger:9]Ты чё тупишь совсем уже, соберись давай быстро")
assert not out.startswith("[anger"), out
assert s.mood == ""

# _could_be_tag знает обе формы.
assert _could_be_tag("[a") is True
assert _could_be_tag("[anger:") is True
assert _could_be_tag("[mood:") is True
assert _could_be_tag("[note") is False
assert _could_be_tag("Yo") is False

# --- расширенный словарь (реакции на ход урока) ------------------------------
from agent import MOOD_NAMES, MOOD_HINTS  # noqa: E402

assert parse_mood_tag("[mood:praise:2]Вот это точно") == ("praise", 2, "Вот это точно")
assert parse_mood_tag("[celebrate:3]Юнит закрыт") == ("celebrate", 3, "Юнит закрыт")
assert parse_mood_tag("[correcting:1]Почти") == ("correcting", 1, "Почти")

# Ни одно имя не должно быть префиксом другого: в регексе имена стоят
# альтернативами, и более короткое перехватило бы совпадение у длинного.
# Алиасы пакета v3 стоят в той же альтернативе — проверяем вместе с ними.
from agent import MOOD_ALIASES, _MOOD_TAG_NAMES  # noqa: E402

for a in _MOOD_TAG_NAMES:
    for b in _MOOD_TAG_NAMES:
        assert a == b or not b.startswith(a), (a, b)

# У каждого имени есть подсказка — иначе build_mood_block упадёт по KeyError.
assert set(MOOD_NAMES) == set(MOOD_HINTS), set(MOOD_NAMES) ^ set(MOOD_HINTS)

# Реакции на урок доступны всем, характерные — только Декстеру.
for name in ("praise", "encourage", "correcting", "surprised", "curious", "confused",
             "celebrate", "joy", "sadness"):
    assert name in TUTOR_MOODS["gentle"], name
    assert name in TUTOR_MOODS["hype"], name
    assert name in TUTOR_MOODS["bro"], name
for name in ("anger", "disgust", "gloat"):
    assert name not in TUTOR_MOODS["gentle"], name
    assert name in TUTOR_MOODS["bro"], name

s = _MoodStripper(TUTOR_MOODS["gentle"])
assert s.feed("[mood:praise:2]Хорошая фраза") == "Хорошая фраза"
assert (s.mood, s.intensity) == ("praise", 2)

# Луне злость не выдана: тег всё равно вырезан, эмоции нет.
s = _MoodStripper(TUTOR_MOODS["gentle"])
assert s.feed("[mood:anger:3]Соберись") == "Соберись"
assert s.mood == ""

gentle_block = build_mood_block("gentle")
assert "praise" in gentle_block and "correcting" in gentle_block
assert "anger" not in gentle_block and "disgust" not in gentle_block
bro_block = build_mood_block("bro")
for name in MOOD_NAMES:
    assert name in bro_block, name

# --- тег не по умолчанию ------------------------------------------------------
# Промпт открывался приказом «Начинай реплику с тега», и Декстер метил anger
# КАЖДУЮ реплику: мат и крик у него по персоне в каждой, модель читала свой же
# тон как эмоцию. Обе страховки должны быть в промпте у всех тьюторов.
for block in (bro_block, gentle_block):
    assert "ПО УМОЛЧАНИЮ ТЕГА НЕТ" in block
    assert not block.lstrip().startswith("Начинай реплику с тега")
    # Повтор запрещён по ОТСУТСТВИЮ повода, а не по совпадению имени: две
    # ошибки подряд — это два повода, и злость на второй законна.
    assert "ничего не изменилось — тега нет" in block
    assert "даже если тег тот же самый" in block

# Оговорка про тон — только тьюторам с резкой манерой: остальным это лишняя
# развилка в промпте.
from agent import HARSH_TUTORS  # noqa: E402

assert "bro" in HARSH_TUTORS and "gentle" not in HARSH_TUTORS
assert "Но повод должен БЫТЬ" in bro_block
assert "Но повод должен БЫТЬ" not in gentle_block

# Злость у Декстера остаётся: орать на ошибку и отказ — это его продукт.
# Чинили злость НА РОВНОМ МЕСТЕ, а не саму злость.
assert "anger" in TUTOR_MOODS["bro"]
assert "ошибся" in MOOD_HINTS["anger"]
# Но имя описывает ПОВОД, а не манеру речи персонажа.
assert "по характеру персонажа" not in MOOD_HINTS["anger"]

# --- теги пакета Speaking Buddy v3: [happy] текст ----------------------------
# Ядро v3 требует тег в начале КАЖДОЙ реплики, имена — из макета аватара и без
# силы. Незнакомое парсеру имя ушло бы в озвучку: TTS прочитал бы «happy».
assert parse_mood_tag("[happy] Me too.") == ("joy", 2, "Me too.")
assert parse_mood_tag("[angry]Stop.") == ("anger", 2, "Stop.")
assert parse_mood_tag("[sarcastic] Plot twist.") == ("gloat", 2, "Plot twist.")
assert parse_mood_tag("[sympathy] I'm sorry.") == ("sadness", 2, "I'm sorry.")
assert parse_mood_tag("[sympathetic] That's hard.") == ("sadness", 2, "That's hard.")
assert parse_mood_tag("[excited] Yes!") == ("celebrate", 2, "Yes!")
assert parse_mood_tag("[furious] No.") == ("anger", 3, "No.")
assert parse_mood_tag("[surprised] Really?") == ("surprised", 2, "Really?")
assert parse_mood_tag("[Confused] Sorry?") == ("confused", 2, "Sorry?")
# Сила, если модель её всё же поставила, сохраняется.
assert parse_mood_tag("[happy:3] Wow.") == ("joy", 3, "Wow.")
# Ровная реплика: тег снят, эмоции нет.
assert parse_mood_tag("[default] Say: I like tea.") == ("", 0, "Say: I like tea.")
assert parse_mood_tag("[bored] Ok.") == ("", 0, "Ok.")
# Алиас переводит только на наши имена — фронт других не знает.
for mood, _ in MOOD_ALIASES.values():
    assert mood == "" or mood in MOOD_NAMES, mood

# Стример: [default] снимается и не выставляет эмоцию.
s = _MoodStripper(TUTOR_MOODS["jarvis"])
assert s.feed("[default] That's a claim. Give me one example.") == "That's a claim. Give me one example."
assert s.mood == ""
# Разрыв тега v3 между чанками собирается.
s = _MoodStripper(TUTOR_MOODS["jarvis"])
assert s.feed("[sar") == ""
assert s.feed("castic] Great plan.") == "Great plan."
assert (s.mood, s.intensity) == ("gloat", 2)
s = _MoodStripper(TUTOR_MOODS["jarvis"])
assert s.feed("[defa") == ""
assert s.feed("ult] Hi.") == "Hi."
assert s.mood == ""
# Эмоция не выдана тьютору — тег всё равно снят.
s = _MoodStripper(TUTOR_MOODS["gentle"])
assert s.feed("[sarcastic] Sure.") == "Sure."
assert s.mood == ""
assert _could_be_tag("[hap") is True and _could_be_tag("[default]") is True
# Обычная речь в скобках по-прежнему не тег.
assert parse_mood_tag("[happiness] is") == ("", 0, "[happiness] is")

# --- Эмоция реплики без тега: фолбэк Speaking Buddy -------------------------
# Живой звонок 05.10.2026 на GPT-6 Sol: тег только в первых репликах, дальше
# аватар Декстера гас в нейтральный. tagged отличает «ровный тег» от «забыл».
from types import SimpleNamespace  # noqa: E402

from agent import TutorAgent, _SpeechCleaner, buddy_default_mood  # noqa: E402

assert buddy_default_mood("dexter") == ("anger", 2)
assert buddy_default_mood("luna") is None, "ровная эмоция по умолчанию — публиковать нечего"

ALLOWED = TUTOR_MOODS["jarvis"]


def reply(agent, text):
    """Прогнать реплику через чистильщик и вернуть решённую эмоцию."""
    c = _SpeechCleaner(ALLOWED)
    out = c.feed(text) + c.flush()
    agent._spoke = bool(out.strip())
    return TutorAgent._reply_mood(agent, c)


buddy = SimpleNamespace(_fallback_mood=("anger", 2), _last_mood=None, _spoke=False)
assert reply(buddy, "Fine. What did you eat?") == ("anger", 2), "до первого тега — эмоция персоны"
assert reply(buddy, "[sarcastic] Great plan.") == ("gloat", 2)
assert reply(buddy, "And then?") == ("gloat", 2), "без тега — последняя явная"
assert reply(buddy, "[sympathy] I'm so sorry about your dad.") == ("sadness", 2)
assert reply(buddy, "Okay, something easy. What food do you like?") == ("sadness", 2), \
    "после горя реплика без тега не становится злой"
assert reply(buddy, "[default] Okay.") == ("", 0) and buddy._last_mood == ("", 0)
assert reply(buddy, "Go on.") == ("", 0), "ровный тег — тоже явный выбор модели"

# Без фолбэка (все остальные тьюторы) — как раньше: без тега эмоции нет.
plain = SimpleNamespace(_fallback_mood=None, _last_mood=None, _spoke=False)
assert reply(plain, "Fine. What did you eat?") == ("", 0)
assert reply(plain, "[angry] No.") == ("anger", 2)
assert reply(plain, "And then?") == ("", 0)

# Пока голова не разобрана или текста не было — решения нет.
c = _SpeechCleaner(ALLOWED)
assert c.feed("[ang") == "" and not c.decided
assert TutorAgent._reply_mood(SimpleNamespace(_fallback_mood=("anger", 2), _last_mood=None, _spoke=False), c) is None
tool_only = SimpleNamespace(_fallback_mood=("anger", 2), _last_mood=None, _spoke=False)
c = _SpeechCleaner(ALLOWED)
c.flush()
assert TutorAgent._reply_mood(tool_only, c) is None, "ответ только тулом — лицо не трогаем"

print("mood-парсер: все ассерты прошли")
