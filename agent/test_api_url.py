"""Ассерты для выбора адреса веб-приложения. pytest в проекте нет — файл
запускается напрямую:
    agent/venv/Scripts/python.exe agent/test_api_url.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.

Зачем это вообще: агент ОДИН на дев и прод, а JTS_API_URL у него один. Пока
адрес брался только из env, всё, что агент писал во время разговора на деве
(log_fact/log_topic/log_mistake) и в конце (call_log), уходило в прод-базу —
история звонков на деве была пуста всегда, а прод собирал тестовый мусор.
Теперь адрес едет в метаданных комнаты, и вот эти проверки решают, доверять ли
ему.
"""
from agent import _resolve_api_url, _same_site, parse_metadata
import json

PROD = "https://tutor.justtostudy.kz"

# --- свой стенд принимаем ---------------------------------------------------
assert _resolve_api_url("https://dev-tutor.justtostudy.kz", PROD) == "https://dev-tutor.justtostudy.kz"
# Хвостовой слэш не должен раздваивать URL при склейке с путём.
assert _resolve_api_url("https://dev-tutor.justtostudy.kz/", PROD) == "https://dev-tutor.justtostudy.kz"
# Тот же адрес, что в env — просто возвращаем его.
assert _resolve_api_url(PROD, PROD) == PROD

# --- нет значения → прежнее поведение ---------------------------------------
# Старый токен-роут поля не шлёт вовсе, и сессия обязана работать как раньше.
assert _resolve_api_url("", PROD) == PROD
assert _resolve_api_url(None, PROD) == PROD

# --- чужое и кривое отбрасываем ---------------------------------------------
# Транскрипт разговора — не тот груз, который можно отправить на чужой хост.
assert _resolve_api_url("https://evil.example.com", PROD) == PROD
# Подставной суффикс: justtostudy.kz здесь не домен, а начало чужого имени.
assert _resolve_api_url("https://justtostudy.kz.evil.com", PROD) == PROD
assert _resolve_api_url("not-a-url", PROD) == PROD
assert _resolve_api_url("file:///etc/passwd", PROD) == PROD
# Открытый http наружу — нет: там же уезжает служебный ключ.
assert _resolve_api_url("http://dev-tutor.justtostudy.kz", PROD) == PROD

# --- localhost: исключение для локальной разработки -------------------------
assert _resolve_api_url("http://localhost:3000", PROD) == "http://localhost:3000"
assert _resolve_api_url("http://127.0.0.1:3000", PROD) == "http://127.0.0.1:3000"

# --- _same_site -------------------------------------------------------------
assert _same_site("dev-tutor.justtostudy.kz", "tutor.justtostudy.kz")
assert _same_site("justtostudy.kz", "tutor.justtostudy.kz")
assert not _same_site("justtostudy.kz.evil.com", "tutor.justtostudy.kz")
assert not _same_site("localhost", "tutor.justtostudy.kz")

# --- поле доезжает из метаданных --------------------------------------------
meta = json.dumps({"deviceId": "user-1", "apiUrl": "https://dev-tutor.justtostudy.kz"})
assert parse_metadata(meta).api_url == "https://dev-tutor.justtostudy.kz"
# Старые метаданные без поля — пустая строка, а не падение.
assert parse_metadata(json.dumps({"deviceId": "user-1"})).api_url == ""
assert parse_metadata(None).api_url == ""

print("test_api_url: ok")
