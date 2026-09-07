"""Ассерты для выбора турн-детекции. pytest в проекте нет — файл запускается
напрямую:
    agent/venv/Scripts/python.exe agent/test_turn_handling.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.

Проверяется ТОЛЬКО резолвер режима и фолбэк конструктора: и то и другое —
чистые функции над env, сети не требуют. Сам детектор поднимается на живом
звонке, его тут не трогаем.
"""
import os

import agent as A
from agent import (
    LearnerProfile,
    _build_turn_detector,
    _push_to_talk_for,
    _turn_detector_mode_for,
    _turn_handling,
    parse_metadata,
)


def _env(**vals):
    """Выставить/снять переменные окружения на время одной проверки."""
    for k, v in vals.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v


def _profile(tutor=""):
    return LearnerProfile(tutor=tutor)


# --- флаг выключен по умолчанию ---------------------------------------------
# Главное свойство всей затеи: выкатка образа не меняет поведение звонков,
# пока секрет воркера не переключён вручную.
_env(TURN_DETECTOR=None, TURN_DETECTOR_TUTORS=None)
assert _turn_detector_mode_for(_profile()) == "off"
assert _turn_detector_mode_for(_profile("bro")) == "off"

_env(TURN_DETECTOR="off")
assert _turn_detector_mode_for(_profile("bro")) == "off"

# --- включение ---------------------------------------------------------------
for mode in ("auto", "v1", "v1-mini"):
    _env(TURN_DETECTOR=mode)
    assert _turn_detector_mode_for(_profile("bro")) == mode, mode

# Регистр и пробелы приходят из секретов воркера, где их легко занести.
_env(TURN_DETECTOR="  AUTO ")
assert _turn_detector_mode_for(_profile("bro")) == "auto"

# Опечатка в секрете не должна включать непонятно что: остаёмся на VAD.
_env(TURN_DETECTOR="multilingual")
assert _turn_detector_mode_for(_profile("bro")) == "off"
_env(TURN_DETECTOR="on")
assert _turn_detector_mode_for(_profile("bro")) == "off"

# --- канарейка по персонам ---------------------------------------------------
_env(TURN_DETECTOR="auto", TURN_DETECTOR_TUTORS="bro")
assert _turn_detector_mode_for(_profile("bro")) == "auto"
assert _turn_detector_mode_for(_profile("professor")) == "off"
# Персона не выбрана (сессия без тьютора) — под сужение не попадает.
assert _turn_detector_mode_for(_profile()) == "off"

_env(TURN_DETECTOR_TUTORS=" BRO , professor ")
assert _turn_detector_mode_for(_profile("bro")) == "auto"
assert _turn_detector_mode_for(_profile("professor")) == "auto"
assert _turn_detector_mode_for(_profile("smart")) == "off"

# Пустой список не сужает никого.
_env(TURN_DETECTOR_TUTORS="")
assert _turn_detector_mode_for(_profile("smart")) == "auto"

# Выключенный флаг сильнее списка персон.
_env(TURN_DETECTOR="off", TURN_DETECTOR_TUTORS="bro")
assert _turn_detector_mode_for(_profile("bro")) == "off"

# --- конструктор детектора ---------------------------------------------------
assert _build_turn_detector("off") is None


class _Boom:
    """Детектор, который не поднялся: нет ключей, нет сети, старая версия."""

    def __init__(self, *a, **kw):
        raise RuntimeError("no inference for you")


_real = A.inference.TurnDetector
try:
    A.inference.TurnDetector = _Boom
    # Упавший конструктор обязан вернуть None, а не унести звонок: сессия
    # тогда собирается на старом VAD-эндпойнтинге.
    assert _build_turn_detector("auto") is None
    assert _build_turn_detector("v1") is None
finally:
    A.inference.TurnDetector = _real


class _Spy:
    """Запоминает, с чем его позвали."""

    calls: list[dict] = []

    def __init__(self, **kw):
        _Spy.calls.append(kw)


try:
    A.inference.TurnDetector = _Spy
    _Spy.calls = []
    # auto — без version: пусть фреймворк сам выберет облачную v1 на LiveKit
    # Cloud и локальную v1-mini где угодно ещё.
    assert isinstance(_build_turn_detector("auto"), _Spy)
    assert _Spy.calls == [{}], _Spy.calls

    _Spy.calls = []
    assert isinstance(_build_turn_detector("v1-mini"), _Spy)
    assert _Spy.calls == [{"version": "v1-mini"}], _Spy.calls
finally:
    A.inference.TurnDetector = _real

# --- рация -------------------------------------------------------------------
# Флаг приходит от ученика (metadata), а не из env: настройка стенда его не
# включает, поэтому по умолчанию рации нет ни у кого.
_env(PUSH_TO_TALK=None)
assert _push_to_talk_for(LearnerProfile()) is False
assert _push_to_talk_for(LearnerProfile(push_to_talk=True)) is True

# Рубильник воркера сильнее просьбы клиента: если ручной ход поведёт себя плохо
# в проде, всех возвращаем на VAD секретом, не трогая приложение.
for off in ("off", "OFF", " off ", "0", "false"):
    _env(PUSH_TO_TALK=off)
    assert _push_to_talk_for(LearnerProfile(push_to_talk=True)) is False, off

# Мусор в секрете рацию не выключает — выключает только явное значение.
_env(PUSH_TO_TALK="yes")
assert _push_to_talk_for(LearnerProfile(push_to_talk=True)) is True
_env(PUSH_TO_TALK=None)

# Ручная ветка turn_handling: детектора конца речи нет вовсе, и порогов
# перебивания тоже — ход перебивает само нажатие рации.
ptt = _turn_handling(None, push_to_talk=True)
assert ptt["turn_detection"] == "manual"
assert "endpointing" not in ptt
assert "interruption" not in ptt
assert ptt["preemptive_generation"] == {"enabled": True}

# Детектор в ручном режиме игнорируется: даже если его передали, ход всё равно
# закрывает клиент.
assert _turn_handling(object(), push_to_talk=True)["turn_detection"] == "manual"

# Без флага всё как было — обе прежние ветки на месте.
assert _turn_handling(None)["turn_detection"] == "vad"
assert _turn_handling(object())["turn_detection"] != "manual"

# metadata → профиль.
assert parse_metadata('{"pushToTalk": true}').push_to_talk is True
assert parse_metadata('{}').push_to_talk is False

_env(TURN_DETECTOR=None, TURN_DETECTOR_TUTORS=None, PUSH_TO_TALK=None)
print("turn handling: ok")
