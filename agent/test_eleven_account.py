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
    _eleven_http_only,
    _eleven_key_for,
    _eleven_model_for,
    _eleven_voice_settings_for,
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

# --- модель -----------------------------------------------------------------

_clear("ELEVENLABS_MODEL", "ELEVENLABS_MODEL_JARVIS", "ELEVENLABS_MODEL_BRO")

assert _eleven_model_for("bro") == "eleven_flash_v2_5", "дефолт — Flash: он выбран за скорость"
assert _eleven_model_for("") == "eleven_flash_v2_5"

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

# Стабильность у v3 — три ступени, а не ползунок. Остальные поля она не
# принимает вовсе: отдать ей набор от Flash значит получить отказ.
flash_settings = {"stability": 0.32, "similarity_boost": 0.75, "style": 0.6, "speed": 1.04}
assert _eleven_voice_settings_for("eleven_flash_v2_5", flash_settings) == flash_settings, (
    "у сокетных моделей настройки не трогаем"
)
assert _eleven_voice_settings_for("eleven_v3", flash_settings) == {"stability": 0.5}
assert _eleven_voice_settings_for("eleven_v3", {"stability": 0.9}) == {"stability": 1.0}
assert _eleven_voice_settings_for("eleven_v3", {"stability": 0.1}) == {"stability": 0.0}
assert _eleven_voice_settings_for("eleven_v3", {}) == {"stability": 0.5}, "без значения — середина"
assert _eleven_voice_settings_for("eleven_v3", {"stability": "нет"}) == {"stability": 0.5}, (
    "мусор вместо числа не должен ронять сессию"
)

print("ElevenLabs: аккаунт, модель, транспорт и настройки — ок")
