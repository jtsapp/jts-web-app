FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install deps first for layer caching.
COPY requirements.txt .
RUN pip install -r requirements.txt

# Methodology lives at repo-root/data/methodology.md in dev. For the image we
# bundle it alongside agent.py via a build-time copy (see livekit deploy
# script). The agent's loader checks both paths.
COPY methodology.md ./methodology.md
# Методичка 18+ персон (Декстер и злой Спарк): у общей раздел про тон требует
# быть encouraging/supportive, что противоположно характеру. Файл ОДИН на обе
# персоны — см. _PERSONA_METHODOLOGY_FILES.
COPY methodology-harsh.md ./methodology-harsh.md
# Джарвис (персона jarvis) методичку не получает вообще — весь его промпт это
# один файл. См. _PERSONA_STANDALONE_FILES / STANDALONE_PROMPT_PERSONAS.
COPY persona-jarvis.md ./persona-jarvis.md
# Жёсткий нрав Джарвиса (кнопка 18+) — ОТДЕЛЬНЫЙ файл персоны, а не строка в
# PERSONA_OVERRIDE. Без этой строки образ соберётся, воркер запустится и
# промолчит про ошибку только в логе, а злой Джарвис выйдет в звонок вообще
# без характера.
COPY persona-jarvis-harsh.md ./persona-jarvis-harsh.md
# Speaking Buddy на стенде KZ TEST: характер и справочник «что учить». Без этих
# строк образ соберётся, а стенд молча останется на старой персоне — buddy_test_on
# требует оба файла. См. build_buddy_instructions.
COPY persona-buddy-dexter.md ./persona-buddy-dexter.md
COPY methodology-reference.md ./methodology-reference.md
# Пакеты уровня A0–B2 (Part 20 методичек Speaking Buddy, режет
# scripts/extract-buddy-level-packs.js). Без них KZ TEST на любом уровне молча
# останется на справочнике — в логе будет «level pack … missing».
COPY level-packs/ ./level-packs/
# Словарь произношения казахской речи (Спарк, Джарвис) — правится человеком,
# читается на старте воркера. См. _PRONUNCIATION_FILES.
COPY pronunciation-kk.tsv ./pronunciation-kk.tsv
# Словарь распознавания (data/stt-terms.txt в дев-режиме) — подсказка Soniox по редким словам:
# имена тьюторов, грамматические термины, города.
COPY stt-terms.txt ./stt-terms.txt
# Казахская добавка к нему — только сессиям казахоязычных тьюторов: вежливые
# формы на «сіз», у которых Soniox срезал суффиксы. См. _stt_kazakh_session.
COPY stt-terms-kk.txt ./stt-terms-kk.txt
# Structured voice scenarios (data/scenarios/*.md in dev). Bundled next to
# agent.py; the loader's second candidate path (/app/scenarios) finds them.
COPY scenarios/ ./scenarios/
COPY agent.py .
COPY latency_logging.py .

# Pre-fetch the Silero VAD weights so the cold-start of the first call is
# fast instead of stalling on a model download.
RUN python -c "from livekit.plugins import silero; silero.VAD.load()"

# Локальная модель конца хода (TURN_DETECTOR=v1-mini, и она же — залипающий
# фолбэк облачной v1) едет внутри livekit-local-inference, отдельно её качать
# не нужно. Но импорт проверяем прямо на сборке: сломанное нативное колесо
# должно уронить билд, а не всплыть посреди звонка, когда облако отвалилось.
RUN python -c "from livekit.local_inference import EOT"

CMD ["python", "agent.py", "start"]
