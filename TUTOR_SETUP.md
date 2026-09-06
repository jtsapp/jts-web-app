# Голосовой тьютор — что встроено и как поднять

> ⚠️ **Упоминания Vercel ниже — УСТАРЕЛИ.** Сайт сейчас self-host на VPS
> (GitLab CI, `compose.yaml`+`compose-app.yaml`), секреты — в GitLab CI/CD
> Variables, а не в Vercel Environment Variables. Остальное (LiveKit-агент,
> TTS-провайдеры по тьюторам) актуально независимо от хостинга сайта.

Голосовой тьютор перенесён в этот проект по плану удешевления (Haiku 4.5 +
prompt caching, лимиты 20 мин/день · 300 мин/мес). TTS — свой провайдер у
каждого тьютора, см. раздел ниже.

Проект — **Next.js** (App Router), как felix. Секреты живут на сервере (route-handlers), в клиент не попадают.

## Три части

| Часть | Где | Что делает |
|---|---|---|
| Клиент (Next, `'use client'`) | `src/screens/TutorVoiceChatPage.jsx` | подключение к LiveKit, орб, подпись, тумблер мика, экраны лимита |
| Route-handlers (Next `src/app/api`) | `src/app/api/**/route.js` | выдача токена + лимиты, brain-шим (Anthropic), webhook учёта минут |
| LiveKit-агент (Python) | `agent/` | голос: Soniox STT → Silero VAD → brain → **TTS по тьютору** |

Точки входа Next: `src/app/layout.jsx` (провайдеры i18n), `src/app/page.jsx` (рендерит `src/App.jsx` — экранная машина состояний).

## Что изменено против felix
- `agent/agent.py` — `_cascade_tts` выбирает провайдера **по тьютору** (`TUTOR_TTS_PROVIDER`): Декстер→ElevenLabs, Луна→Gemini, Спарк→Soniox. Krisp BVC выключается на `tier=free`.
- `src/lib/anthropic.js` — Haiku 4.5 с `cache_control` на system+tools (кеш −90% со 2-го хода).
- `src/app/api/livekit/token/route.js` — проверка лимита минут, TTL = остаток дневного бюджета, маппинг ключей тьютора (dexter/luna/spark → bro/gentle/hype), проброс `tier`.
- `src/app/api/livekit/webhook/route.js` — на `room_finished` пишет минуты в Neon.

## Env
Смотри `.env.example`. Границы строго:
- **Vercel (сервер, секреты):** `ANTHROPIC_API_KEY`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`, `DATABASE_URL`.
- **LiveKit-агент (LiveKit Cloud):** `SONIOX_API_KEY`, `GOOGLE_CREDENTIALS_JSON`, `ELEVENLABS_API_KEY` + `ELEVEN_VOICE_ID_BRO`, `VOICE_STACK=cascade`, `JTS_API_URL=https://<vercel-deploy>`, `INTERNAL_API_KEY`.
  - (опц.) `VOICE_BRAIN_URL` — адрес ближней копии `/api/voice/brain`, если её
    подняли рядом с воркером. Смысл в географии: воркер стоит в `us-east`, а
    стенд — в Казахстане, и без этой переменной каждый ход тащит промпт через
    океан и обратно (замер 06.09.2026: ~0.18 с к каждой реплике). Мозг
    stateless, поэтому копия общая для всех стендов; память и звонки всё равно
    пишутся на `JTS_API_URL` / адрес из метаданных токена. Не задана —
    поведение ровно как раньше.
- **Vercel, превью голоса на экране выбора:** `ELEVENLABS_API_KEY` + `ELEVEN_VOICE_ID_DEXTER` (тот же voice id, что в `ELEVEN_VOICE_ID_BRO` — имя другое, потому что фронт знает тьютора как `dexter`, а агент как персону `bro`), плюс `GOOGLE_CREDENTIALS_JSON` и `SONIOX_API_KEY`.

## TTS: у каждого тьютора свой провайдер

Стек один на всех — `VOICE_STACK=cascade`. Провайдер озвучки выбирается по
тьютору (`TUTOR_TTS_PROVIDER` в `agent.py`), а не одним глобальным ключом:

| Тьютор | Персона | Провайдер | Голос |
|---|---|---|---|
| Декстер | `bro` | ElevenLabs | `ELEVEN_VOICE_ID_BRO` |
| Луна | `gentle` | Gemini Cloud TTS | Aoede |
| Спарк | `hype` | Soniox | Owen |

Приоритет выбора: **env персоны → таблица → дефолт**.

- **Язык сессии на провайдера не влияет.** По-казахски говорит только Спарк, и
  он уже на Soniox — единственном, кто произносит `kk`. У Луны и Декстера `kz` —
  это язык интерфейса: сами они русскоязычные, казахского текста не озвучивают.
- **Сменить провайдера одному тьютору без редеплоя:** `TTS_PROVIDER_BRO=gemini`.
- **`CASCADE_TTS`** больше не рубильник на всех — это дефолт для персон вне
  таблицы (professor/sage/snark/…, в UI их нет). Дефолт дефолта — `gemini`.
- **Провайдер не настроен** → предупреждение в лог и откат на Soniox: его ключ
  всё равно обязателен для STT, так что фолбэк не может «тоже отвалиться».

**Azure в схеме нет** — аккаунта Azure Speech у проекта нет, `AZURE_SPEECH_*` не
заданы ни на одном деплое. Раньше `azure` стоял дефолтом `CASCADE_TTS`, то есть
при незаданной переменной агент шёл в несуществующего провайдера. Код azure-пути
рабочий и оставлен, но попасть туда можно только явно (`TTS_PROVIDER_*=azure`).
- **Клиент (`NEXT_PUBLIC_`):** только несекретный `NEXT_PUBLIC_API_URL`. Секреты сюда НЕЛЬЗЯ — Next вошьёт их в браузер.

## Поднять

1. **Зависимости**
   ```
   npm install
   ```

2. **БД** — ничего катить руками не нужно: миграции из `src/lib/migrations/`
   применяются сами при первом старте приложения (`src/instrumentation.js`).

3. **Vercel env** — прописать серверные ключи (список выше), задеплоить (`vercel --prod`).

4. **LiveKit webhook** — в дашборде LiveKit Cloud → Settings → Webhooks добавить
   `https://<vercel-deploy>/api/livekit/webhook`.

5. **Агент** — задеплоить на LiveKit Cloud из `agent/`:
   ```
   cd agent && lk agent deploy   # или через дашборд LiveKit Cloud
   ```
   с env агента (Soniox/Gemini/ElevenLabs/VOICE_STACK/JTS_API_URL).

## Проверка
- В логах агента: `Cascade TTS: ElevenLabs (...)` у Декстера, `Gemini (...)` у Луны,
  `Soniox (...)` у Спарка — независимо от языка интерфейса.
- В логах Vercel-функции brain: `llm_cost` с `cacheReadTokens > 0` со 2-го хода.
- После 10 мин за день `/api/livekit/token` → 403 `daily_limit`, клиент показывает экран лимита.
- 3 тьютора звучат разными голосами; Спарк на `lang=kz` говорит по-казахски тем
  же тембром, что и на английском.
- Кнопка «послушать» на экране выбора звучит тем же голосом, что и живой разговор
  (если нет — не проставлен `ELEVEN_VOICE_ID_DEXTER` на Vercel).

## Открытые пункты (нужен доступ/ключи владельца)
- Задеплоить агента + добавить webhook в LiveKit Cloud.
- Стриминг SSE в `api/voice/brain/...` проверить на реальном Vercel-рантайме (Node functions поддерживают, но подтвердить, что не буферизует).
