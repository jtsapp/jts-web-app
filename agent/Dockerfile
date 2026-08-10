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
# Своя методичка Декстера (персона bro): у общей раздел про тон требует быть
# encouraging/supportive, что противоположно характеру. См. _PERSONA_METHODOLOGY_FILES.
COPY methodology-dexter.md ./methodology-dexter.md
# Structured voice scenarios (data/scenarios/*.md in dev). Bundled next to
# agent.py; the loader's second candidate path (/app/scenarios) finds them.
COPY scenarios/ ./scenarios/
COPY agent.py .

# Pre-fetch the Silero VAD weights so the cold-start of the first call is
# fast instead of stalling on a model download.
RUN python -c "from livekit.plugins import silero; silero.VAD.load()"

# Локальная модель конца хода (TURN_DETECTOR=v1-mini, и она же — залипающий
# фолбэк облачной v1) едет внутри livekit-local-inference, отдельно её качать
# не нужно. Но импорт проверяем прямо на сборке: сломанное нативное колесо
# должно уронить билд, а не всплыть посреди звонка, когда облако отвалилось.
RUN python -c "from livekit.local_inference import EOT"

CMD ["python", "agent.py", "start"]
