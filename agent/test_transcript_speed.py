"""Ассерты для темпа субтитров. pytest в проекте нет — файл запускается напрямую:
    agent/venv/Scripts/python.exe agent/test_transcript_speed.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.
"""
import asyncio
import os

from livekit import rtc
from livekit.agents.voice import io
from livekit.agents.voice.room_io import room_io

from agent import (
    DEFAULT_TRANSCRIPT_RATE,
    STANDARD_SPEECH_RATE,
    SYLLABLE_COUNTER_INSTALLED,
    TRANSCRIPT_RATE,
    LearnerProfile,
    _aligned_transcript_for,
    _transcript_output_options,
    speech_units,
)

ENV = ("TRANSCRIPT_SPEED", "TRANSCRIPT_RATE_GEMINI", "TRANSCRIPT_ALIGNED")


def _env(**values):
    for k in ENV:
        os.environ.pop(k, None)
    for k, v in values.items():
        os.environ[k] = v


# ── Счётчик слогов ──────────────────────────────────────────────────────────
# Кириллица — по гласным. Раньше любое русское слово было ОДНИМ слогом, и
# подпись бежала в разы быстрее голоса.
assert speech_units("поговорим") == 4
assert speech_units(" выходных") == 3
assert speech_units("сөйлесеміз") == 4, "казахские ә/і/ө/ұ/ү — тоже гласные"
# Латиница — по группам гласных, немая «e» на конце не слог.
assert speech_units("weekend") == 2
assert speech_units("countable") == 3, "у переносов livekit тут два куска"
assert speech_units("make") == 1 and speech_units("free") == 1
# Знак препинания — пауза: точка длиннее запятой.
assert speech_units("Привет!") == speech_units("Привет") + 2
assert speech_units("Отлично,") == speech_units("Отлично") + 1
assert speech_units("слово».") == speech_units("слово") + 2, "кавычка после точки не прячет паузу"
# Смешанное слово и цифры.
assert speech_units("по-английски") == 4
assert speech_units("25") == 4
assert speech_units("") == 0 and speech_units("   ") == 0


# ── Подмена счётчика в синхронизаторе ───────────────────────────────────────
# RoomIO создаёт синхронизатор сам, поэтому проверяем именно тот класс, который
# он возьмёт, и именно на настоящем конструкторе: переименуй livekit параметр —
# и подмена молча перестала бы работать.
assert SYLLABLE_COUNTER_INSTALLED, "подмена TranscriptSynchronizer не встала"


class _NullAudio(io.AudioOutput):
    def __init__(self):
        super().__init__(label="null", capabilities=io.AudioOutputCapabilities(pause=False))

    async def capture_frame(self, frame: rtc.AudioFrame) -> None:
        pass

    def flush(self) -> None:
        pass

    def clear_buffer(self) -> None:
        pass


async def _check_synchronizer():
    sync = room_io.TranscriptSynchronizer(
        next_in_chain_audio=_NullAudio(), next_in_chain_text=None, speed=1.0
    )
    try:
        assert sync._opts.hyphenate_word("поговорим") == ["·"] * 4
    finally:
        await sync.aclose()


asyncio.run(_check_synchronizer())


# ── Темп по TTS сессии ──────────────────────────────────────────────────────
_env()
opts = _transcript_output_options("gemini")
assert abs(opts.transcription_speed_factor - TRANSCRIPT_RATE["gemini"] / STANDARD_SPEECH_RATE) < 1e-9
opts = _transcript_output_options("")
assert abs(opts.transcription_speed_factor - DEFAULT_TRANSCRIPT_RATE / STANDARD_SPEECH_RATE) < 1e-9

# Темп голоса подкручивается секретом, мусор — откат на таблицу.
_env(TRANSCRIPT_RATE_GEMINI="5")
assert abs(_transcript_output_options("gemini").transcription_speed_factor - 5 / STANDARD_SPEECH_RATE) < 1e-9
_env(TRANSCRIPT_RATE_GEMINI="быстро")
assert abs(
    _transcript_output_options("gemini").transcription_speed_factor
    - TRANSCRIPT_RATE["gemini"] / STANDARD_SPEECH_RATE
) < 1e-9

# Аварийная ручка — множитель как есть, перебивает таблицу.
_env(TRANSCRIPT_SPEED="2")
assert _transcript_output_options("gemini").transcription_speed_factor == 2.0
# Ноль и отрицательное — синхронизация выключена: реплика приезжает целиком.
_env(TRANSCRIPT_SPEED="0")
assert _transcript_output_options("gemini").sync_transcription is False
_env(TRANSCRIPT_SPEED="-3")
assert _transcript_output_options("soniox").sync_transcription is False
# Мусор в TRANSCRIPT_SPEED не роняет звонок — работает таблица.
_env(TRANSCRIPT_SPEED="быстро")
assert abs(
    _transcript_output_options("soniox").transcription_speed_factor
    - TRANSCRIPT_RATE["soniox"] / STANDARD_SPEECH_RATE
) < 1e-9


# ── Тайминги от TTS ─────────────────────────────────────────────────────────
_env()
assert _aligned_transcript_for(LearnerProfile(tutor="bro", lang="ru")) is True
assert _aligned_transcript_for(LearnerProfile(tutor="aizere", lang="kz")) is True
# У KZ-стенда словарь произношения правит текст до синтеза — тайминги движка
# вынесли бы на экран «исправленное» написание.
assert _aligned_transcript_for(LearnerProfile(tutor="jarvis", lang="kz")) is False
_env(TRANSCRIPT_ALIGNED="off")
assert _aligned_transcript_for(LearnerProfile(tutor="bro", lang="ru")) is False

_env()
print("transcript speed: ok")
