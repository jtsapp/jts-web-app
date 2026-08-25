"""Ассерты для скорости субтитров. pytest в проекте нет — файл запускается напрямую:
    agent/venv/Scripts/python.exe agent/test_transcript_speed.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.
"""
import os

from agent import TRANSCRIPT_SPEED_DEFAULT, _transcript_output_options


def _with(value):
    if value is None:
        os.environ.pop("TRANSCRIPT_SPEED", None)
    else:
        os.environ["TRANSCRIPT_SPEED"] = value
    return _transcript_output_options()


# Без env — ускоряем: дефолт livekit (3.83 слога/сек) медленнее реальной речи
# TTS, и подпись отстаёт всё сильнее к концу реплики.
opts = _with(None)
assert opts is not None
assert opts.transcription_speed_factor == TRANSCRIPT_SPEED_DEFAULT

# Явный множитель.
assert _with("2").transcription_speed_factor == 2.0
assert _with("  1.8  ").transcription_speed_factor == 1.8

# Ровно 1.0 — вернуть дефолты livekit-agents, ничего не передавая.
assert _with("1") is None

# Ноль и отрицательное — синхронизация со звуком выключена совсем: реплика
# приезжает целиком, как только её выдал LLM.
assert _with("0").sync_transcription is False
assert _with("-3").sync_transcription is False

# Мусор в env не должен ронять звонок — откат на дефолт.
assert _with("быстро").transcription_speed_factor == TRANSCRIPT_SPEED_DEFAULT

_with(None)
print("transcript speed: ok")
