"""Ассерты для порогов перебивания. pytest в проекте нет — файл запускается
напрямую:
    agent/venv/Scripts/python.exe agent/test_interruption.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.

Проверяется чтение env и то, что пороги доезжают в ОБЕ ветки turn_handling —
и с семантическим детектором, и на голом VAD. Живой звонок здесь не нужен:
_interruption_options и _turn_handling — чистые функции над env.
"""
import os

from agent import _interruption_options, _turn_handling


def _env(**vals):
    for k, v in vals.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v


# --- дефолты -----------------------------------------------------------------
# Ради них всё и затевалось: у livekit-agents 1.6.7 min_words=0 и
# min_duration=0.5, то есть полсекунды любого шума рвали речь тьютора.
_env(INTERRUPT_MIN_WORDS=None, INTERRUPT_MIN_SEC=None)
assert _interruption_options() == {"min_words": 1, "min_duration": 0.8}

# --- env перекрывает ---------------------------------------------------------
_env(INTERRUPT_MIN_WORDS="2", INTERRUPT_MIN_SEC="1.2")
assert _interruption_options() == {"min_words": 2, "min_duration": 1.2}

# Ноль разрешён намеренно: это откат к прежнему поведению без пересборки образа.
_env(INTERRUPT_MIN_WORDS="0", INTERRUPT_MIN_SEC="0")
assert _interruption_options() == {"min_words": 0, "min_duration": 0.0}

# Пробелы приходят из секретов воркера, где их легко занести.
_env(INTERRUPT_MIN_WORDS="  3 ", INTERRUPT_MIN_SEC=" 0.5 ")
assert _interruption_options() == {"min_words": 3, "min_duration": 0.5}

# --- мусор в секрете не должен ронять звонок ---------------------------------
_env(INTERRUPT_MIN_WORDS="two", INTERRUPT_MIN_SEC="fast")
assert _interruption_options() == {"min_words": 1, "min_duration": 0.8}

# Отрицательные значения фреймворк принял бы молча, а перебивание стало бы
# мгновенным — то есть ровно та поломка, которую чиним.
_env(INTERRUPT_MIN_WORDS="-1", INTERRUPT_MIN_SEC="-2")
assert _interruption_options() == {"min_words": 1, "min_duration": 0.8}

# Дробное число слов — не число слов.
_env(INTERRUPT_MIN_WORDS="1.5", INTERRUPT_MIN_SEC=None)
assert _interruption_options()["min_words"] == 1

_env(INTERRUPT_MIN_WORDS=None, INTERRUPT_MIN_SEC=None)

# --- пороги доезжают в обе ветки turn_handling -------------------------------
vad_branch = _turn_handling(None)
assert vad_branch["turn_detection"] == "vad"
assert vad_branch["interruption"] == {"min_words": 1, "min_duration": 0.8}
# Ветка без детектора — рабочая на сегодня: TURN_DETECTOR по умолчанию off.
assert "mode" not in vad_branch["interruption"]

detector_branch = _turn_handling(object())
assert detector_branch["interruption"]["mode"] == "adaptive"
assert detector_branch["interruption"]["min_words"] == 1
assert detector_branch["interruption"]["min_duration"] == 0.8
# Эндпойнтинг детектора не должен пострадать от правки перебивания.
assert detector_branch["endpointing"]["max_delay"] == 4.0

_env(INTERRUPT_MIN_WORDS="0")
assert _turn_handling(None)["interruption"]["min_words"] == 0
assert _turn_handling(object())["interruption"]["min_words"] == 0
_env(INTERRUPT_MIN_WORDS=None)

print("interruption thresholds: ok")
