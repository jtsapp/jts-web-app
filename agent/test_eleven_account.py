"""Ассерты для ElevenLabs: свой аккаунт и своя модель у персоны.

pytest в проекте нет — файл запускается напрямую:
    agent/venv/Scripts/python.exe agent/test_eleven_account.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.

Зачем это вообще нужно.

Клон голоса живёт В ТОМ КАБИНЕТЕ, где его сделали: voice_id из чужого аккаунта
не резолвится вовсе. Пока голос был один (Декстер), общего ключа хватало. Как
только казахский клон завели в отдельной учётке, общий ключ перестал быть общим —
и подменять его на двоих нельзя: это уронило бы живого тьютора ради пробы.

С моделью то же самое, но по другой причине: модели знают РАЗНЫЕ языки. Flash
v2.5 казахского не держит, v3 держит. Глобальное переключение утащило бы за собой
Декстера, которому v3 не нужна и стоит задержки.
"""
import io
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from agent import (  # noqa: E402
    LearnerProfile,
    _eleven_engine_kwargs,
    _eleven_http_only,
    _eleven_key_for,
    _eleven_model_for,
    _eleven_session_voice,
    _eleven_voice_for,
)


def _clear(*names: str) -> None:
    for n in names:
        os.environ.pop(n, None)


# --- ключ аккаунта ----------------------------------------------------------

_clear("ELEVENLABS_API_KEY", "ELEVENLABS_API_KEY_JARVIS", "ELEVENLABS_API_KEY_BRO")

os.environ["ELEVENLABS_API_KEY"] = "shared"
assert _eleven_key_for("bro") == "shared", "без своего ключа персона берёт общий"
assert _eleven_key_for("") == "shared", "пустая персона тоже берёт общий"

os.environ["ELEVENLABS_API_KEY_JARVIS"] = "kz-stand"
assert _eleven_key_for("jarvis") == "kz-stand", "свой ключ персоны важнее общего"
assert _eleven_key_for("bro") == "shared", "чужой ключ Декстера не касается"
assert _eleven_key_for("JARVIS") == "kz-stand", "регистр имени персоны не важен"

os.environ["ELEVENLABS_API_KEY_BRO"] = "   "
assert _eleven_key_for("bro") == "shared", "пробелы — это не ключ, берём общий"

_clear("ELEVENLABS_API_KEY")
assert _eleven_key_for("bro") == "", "ключа нет вовсе — пусто, и вызывающий скажет об этом вслух"
assert _eleven_key_for("jarvis") == "kz-stand", "а у стенда свой остаётся"

# --- голос ------------------------------------------------------------------

_clear("ELEVEN_VOICE_ID_JARVIS", "ELEVEN_VOICE_ID_BRO")
assert _eleven_voice_for("jarvis") == "2ZqnRUaCU5IaXJ45uakV", "KZ-стенд — зашитый клон"
os.environ["ELEVEN_VOICE_ID_JARVIS"] = "override-kz"
assert _eleven_voice_for("jarvis") == "override-kz", "env важнее таблицы"
assert _eleven_voice_for("bro") != "override-kz", "чужой голос Декстера не касается"
_clear("ELEVEN_VOICE_ID_JARVIS", "ELEVEN_VOICE_ID_BRO")

os.environ["ELEVENLABS_VOICE_ID"] = "ExpLt85FtBvm8QN4m6rB"
assert _eleven_session_voice(LearnerProfile(tutor="jarvis")) == "2ZqnRUaCU5IaXJ45uakV", (
    "глобальный ELEVENLABS_VOICE_ID не должен перебивать клон стенда"
)
assert _eleven_session_voice(LearnerProfile(tutor="bro")) == "rHWSYoq8UlV0YIBKMryp"
_clear("ELEVENLABS_VOICE_ID")

# --- модель -----------------------------------------------------------------

_clear("ELEVENLABS_MODEL", "ELEVENLABS_MODEL_JARVIS", "ELEVENLABS_MODEL_BRO")

assert _eleven_model_for("bro") == "eleven_flash_v2_5", "дефолт — Flash: он выбран за скорость"
assert _eleven_model_for("") == "eleven_flash_v2_5"
assert _eleven_model_for("jarvis") == "eleven_v3", "казахский стенд по умолчанию на v3"

os.environ["ELEVENLABS_MODEL_JARVIS"] = "eleven_v3"
assert _eleven_model_for("jarvis") == "eleven_v3", "казахскому стенду нужна v3"
assert _eleven_model_for("bro") == "eleven_flash_v2_5", (
    "Декстер остаётся на Flash: v3 тяжелее, а русский Flash и так тянет"
)

os.environ["ELEVENLABS_MODEL"] = "eleven_multilingual_v2"
assert _eleven_model_for("bro") == "eleven_multilingual_v2", "общая переменная работает как прежде"
assert _eleven_model_for("jarvis") == "eleven_v3", "но своя у персоны важнее общей"

_clear(
    "ELEVENLABS_API_KEY", "ELEVENLABS_API_KEY_JARVIS", "ELEVENLABS_API_KEY_BRO",
    "ELEVENLABS_MODEL", "ELEVENLABS_MODEL_JARVIS", "ELEVENLABS_MODEL_BRO",
)

# --- транспорт и настройки под модель ---------------------------------------
#
# v3 не обслуживает потоковый WebSocket плагина: рукопожатие отвечает 400 ещё до
# синтеза, и тьютор молчит. Проверено на живом стенде — ключ был верный, голос
# найден, падал именно сокет. HTTP её обслуживает, им и говорит кабинет.

_clear("ELEVENLABS_HTTP_ONLY_MODELS")

assert _eleven_http_only("eleven_v3"), "v3 умеет только HTTP"
assert not _eleven_http_only("eleven_flash_v2_5"), "Flash ходит сокетом, как и ходил"
assert not _eleven_http_only("eleven_multilingual_v2")

os.environ["ELEVENLABS_HTTP_ONLY_MODELS"] = "eleven_v4,eleven_v3"
assert _eleven_http_only("eleven_v4"), "список правится переменной, без деплоя"
assert _eleven_http_only("eleven_v3")
os.environ["ELEVENLABS_HTTP_ONLY_MODELS"] = ""
_clear("ELEVENLABS_HTTP_ONLY_MODELS")

v3 = _eleven_engine_kwargs("eleven_v3", "k", "2ZqnRUaCU5IaXJ45uakV", "jarvis", True)
assert "voice_settings" not in v3, "v3: speaker boost/style в теле дают 400"
assert v3["encoding"] == "mp3_44100_128", "v3: тот же формат, что в кабинете"
assert v3["model"] == "eleven_v3"
flash = _eleven_engine_kwargs("eleven_flash_v2_5", "k", "rHWSYoq8UlV0YIBKMryp", "bro", False)
assert "voice_settings" in flash
assert flash.get("auto_mode") is True
assert "encoding" not in flash

print("ElevenLabs: аккаунт, модель и транспорт — ок")
