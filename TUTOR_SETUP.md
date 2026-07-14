# Голосовой тьютор — что встроено и как поднять

Голосовой тьютор перенесён в этот проект по плану удешевления (Azure TTS вместо
ElevenLabs, Haiku 4.5 + prompt caching, лимиты 10 мин/день · 300 мин/мес).

Проект — **Next.js** (App Router), как felix. Секреты живут на сервере (route-handlers), в клиент не попадают.

## Три части

| Часть | Где | Что делает |
|---|---|---|
| Клиент (Next, `'use client'`) | `src/screens/TutorVoiceChatPage.jsx` | подключение к LiveKit, орб, подпись, тумблер мика, экраны лимита |
| Route-handlers (Next `src/app/api`) | `src/app/api/**/route.js` | выдача токена + лимиты, brain-шим (Anthropic), webhook учёта минут |
| LiveKit-агент (Python) | `agent/` | голос: Soniox STT → Silero VAD → brain → **Azure TTS** |

Точки входа Next: `src/app/layout.jsx` (провайдеры i18n), `src/app/page.jsx` (рендерит `src/App.jsx` — экранная машина состояний).

## Что изменено против felix
- `agent/agent.py` — `_cascade_tts` теперь **Azure Neural** (голоса: dexter→Andrew, spark→Brian, luna→Emma; kz → Daulet/Aigul). Krisp BVC выключается на `tier=free`.
- `src/lib/anthropic.js` — Haiku 4.5 с `cache_control` на system+tools (кеш −90% со 2-го хода).
- `src/app/api/livekit/token/route.js` — проверка лимита минут, TTL = остаток дневного бюджета, маппинг ключей тьютора (dexter/luna/spark → bro/gentle/hype), проброс `tier`.
- `src/app/api/livekit/webhook/route.js` — на `room_finished` пишет минуты в Neon.

## Env
Смотри `.env.example`. Границы строго:
- **Vercel (сервер, секреты):** `ANTHROPIC_API_KEY`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`, `DATABASE_URL`.
- **LiveKit-агент (LiveKit Cloud):** `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `SONIOX_API_KEY`, `GEMINI_API_KEY`, `VOICE_STACK=cascade`, `JTS_API_URL=https://<vercel-deploy>`.
- **Клиент (`NEXT_PUBLIC_`):** только несекретный `NEXT_PUBLIC_API_URL`. Секреты сюда НЕЛЬЗЯ — Next вошьёт их в браузер.

## Поднять

1. **Зависимости**
   ```
   npm install
   ```

2. **БД (Neon)** — один раз применить схему:
   ```
   psql "$DATABASE_URL" -f src/lib/schema.sql
   ```

3. **Vercel env** — прописать серверные ключи (список выше), задеплоить (`vercel --prod`).

4. **LiveKit webhook** — в дашборде LiveKit Cloud → Settings → Webhooks добавить
   `https://<vercel-deploy>/api/livekit/webhook`.

5. **Агент** — задеплоить на LiveKit Cloud из `agent/`:
   ```
   cd agent && lk agent deploy   # или через дашборд LiveKit Cloud
   ```
   с env агента (Azure/Soniox/Gemini/VOICE_STACK/JTS_API_URL).

## Проверка
- В логах агента: `Cascade TTS: Azure (...)`.
- В логах Vercel-функции brain: `llm_cost` с `cacheReadTokens > 0` со 2-го хода.
- После 10 мин за день `/api/livekit/token` → 403 `daily_limit`, клиент показывает экран лимита.
- 3 тьютора звучат разными голосами; при `lang=kz` — kk-KZ голос.

## Открытые пункты (нужен доступ/ключи владельца)
- `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` (ресурс Standard S0, Neural TTS on).
- Подтвердить/сверить сигнатуру `azure.TTS(speech_key=, speech_region=, voice=)` с установленной версией `livekit-plugins-azure`.
- Задеплоить агента + добавить webhook в LiveKit Cloud.
- Стриминг SSE в `api/voice/brain/...` проверить на реальном Vercel-рантайме (Node functions поддерживают, но подтвердить, что не буферизует).
