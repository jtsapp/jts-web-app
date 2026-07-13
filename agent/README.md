# FELIX — LiveKit Voice Agent (Gemini Live)

Отдельный Python-воркер: подключается к LiveKit-комнате как агент и
разговаривает с пользователем голосом через **Gemini Live API**.

```
Браузер <-WebRTC-> LiveKit room <-WebRTC-> Python-агент
                                                |
                                                +-- Gemini Live API
                                                    (STT + LLM + TTS + VAD)
```

Никаких OpenAI, Whisper или ElevenLabs тут не нужно — Gemini Live делает
всё сам в одном двунаправленном стриме.

## Установка (один раз)

Нужен **Python 3.10+**.

```bash
cd agent
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Настройка

В **корневой `.env.local`** должны быть три LiveKit-ключа и
Gemini-ключ (агент сам прочитает файл через `python-dotenv`):

```
LIVEKIT_URL=wss://YOUR_PROJECT.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

GEMINI_API_KEY=AIza...

# Опционально
GEMINI_LIVE_MODEL=gemini-2.0-flash-exp
GEMINI_LIVE_VOICE=Aoede           # женский, мягкий
```

### Доступные голоса Gemini Live

| Voice ID | Тип | Характер |
|---|---|---|
| `Aoede` | женский | мягкий, мелодичный (дефолт) |
| `Kore` | женский | ровный, нейтральный |
| `Leda` | женский | спокойный |
| `Puck` | мужской | живой, тёплый |
| `Charon` | мужской | глубокий |
| `Fenrir` | мужской | строгий |

Где взять ключи (всё бесплатно для теста):

- LiveKit Cloud — https://cloud.livekit.io (free-tier: 50 ГБ трафика)
- Gemini API — https://aistudio.google.com/apikey (1500 req/day)

## Запуск

Из корня проекта:

```bash
python agent/agent.py dev
```

Воркер логинится в LiveKit и ждёт, пока кто-нибудь зайдёт в комнату
`jts-tutor`. Как только браузер с тем же `LIVEKIT_URL` нажмёт
**«Open Realtime Voice»** в чате Next.js-приложения — агент
автоматически подключится и поздоровается.

## Как это работает

1. **Next.js приложение** (`/api/livekit/token`) мьинтит JWT с
   метаданными ученика (`level`, `lang`, `style`, `goal`).
2. **Браузер** через `@livekit/components-react` (`<LiveKitRoom>`)
   подключается к комнате.
3. **Этот Python-воркер** видит входящего участника, читает его
   метаданные, строит per-learner system-prompt и запускает
   `AgentSession` с `google.beta.realtime.RealtimeModel` (Gemini Live).
4. Gemini Live API сам слышит микрофон, отвечает голосом и поддерживает
   прерывания — пользователь может перебить агента на полуслове.

Промпт каждый раз строится под конкретного ученика: уровень CEFR,
стиль (friendly/strict/socratic), цель, язык интерфейса.

## Траблшутинг

- **Агент не отвечает голосом** → проверь логи воркера, обычно это
  отсутствие `GEMINI_API_KEY` или превышение бесплатного лимита.
- **Браузер не подключается** → убедись что `LIVEKIT_URL` начинается
  с `wss://` (не `https://`).
- **Кнопка «Open Realtime Voice» не появилась в UI** → значит
  Next.js не видит LiveKit-ключи; перезапусти `npm run dev`.
- **«unsupported voice»** → попробуй другой `GEMINI_LIVE_VOICE` из
  списка выше.
- **Тестовый вызов Gemini Live** напрямую:
  ```bash
  curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent" \
    -H "X-goog-api-key: $GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{"contents":[{"parts":[{"text":"Hi!"}]}]}'
  ```
