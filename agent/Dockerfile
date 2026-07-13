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
COPY agent.py .

# Pre-fetch the Silero VAD weights so the cold-start of the first call is
# fast instead of stalling on a model download.
RUN python -c "from livekit.plugins import silero; silero.VAD.load()"

CMD ["python", "agent.py", "start"]
