# Запуск голосового тьютора jts-web-app — пошагово

Инструкция «где и что нажать», зеркалит setup felix (LiveKit Cloud agent +
Vercel + Neon), но с новым отдельным LiveKit-проектом и своим TTS-провайдером
у каждого тьютора.

Три инфраструктуры: **Vercel** (сайт + API), **LiveKit Cloud** (голосовой агент),
**Neon** (учёт минут). Ключи — только серверные, в браузер не уходят.

---

## 0. Что уже готово
- ✅ Neon-схема (`voice_usage`, `voice_session`) применена.
- ✅ Код в `main`, Vercel собирается (Next.js).

---

## 1. LiveKit Cloud — новый проект
1. Открой https://cloud.livekit.io → войди.
2. Вверху слева переключатель проектов → **Create Project** (или «New Project»).
3. Имя: например `jts-tutor`. Регион: **US East** (как felix — держим агента рядом).
4. Открой проект → **Settings → Keys** → **Create Key** (если нет).
5. Скопируй три значения — понадобятся в шагах 3 и 5:
   - **WebSocket URL**: `wss://<subdomain>.livekit.cloud`
   - **API Key**: `API...`
   - **API Secret**: длинная строка

---

## 2. TTS — ключи по тьюторам
У каждого тьютора свой провайдер озвучки (`TUTOR_TTS_PROVIDER` в `agent/agent.py`,
подробнее — `TUTOR_SETUP.md`). Нужны все три ключа: если чей-то не задан, этот
тьютор молча уедет на общий фолбэк Soniox и заговорит чужим голосом.

| Тьютор | Провайдер | Что взять | Куда |
|---|---|---|---|
| Декстер | ElevenLabs | API key + voice id | `ELEVENLABS_API_KEY`, `ELEVEN_VOICE_ID_BRO` |
| Луна | Google Cloud TTS | JSON сервис-аккаунта | `GOOGLE_CREDENTIALS_JSON` |
| Спарк | Soniox | тот же ключ, что у STT | `SONIOX_API_KEY` |

**ElevenLabs:** https://elevenlabs.io/app/settings/api-keys → Create API key.
Voice id — https://elevenlabs.io/app/voice-library (или Voices → выбранный голос
→ **ID**). Голос Декстера: `rHWSYoq8UlV0YIBKMryp`.
Ключ должен уметь Text-to-Speech: у ElevenLabs права выдаются по скоупам, и
TTS-неспособный ключ отвечает 401 без внятного текста.

**Google:** https://console.cloud.google.com → включить **Cloud Text-to-Speech
API** → IAM → Service Accounts → создать ключ JSON. Весь JSON целиком, одной
строкой, идёт в `GOOGLE_CREDENTIALS_JSON`.

Azure тут больше не участвует: аккаунта Speech у проекта нет, код azure-пути
оставлен, но включается только явно (`TTS_PROVIDER_<ПЕРСОНА>=azure`).

---

## 3. Vercel — переменные окружения (сайт + API)
1. https://vercel.com → проект **jts-web-app** → **Settings → Environment Variables**.
2. Добавь для окружения **Production** (секреты, НЕ трогай префикс NEXT_PUBLIC):
   | Имя | Значение | Откуда |
   |---|---|---|
   | `ANTHROPIC_API_KEY` | `sk-ant-...` | из `felix/.env.local` |
   | `LIVEKIT_API_KEY` | API-ключ **нового** проекта | шаг 1 |
   | `LIVEKIT_API_SECRET` | секрет нового проекта | шаг 1 |
   | `LIVEKIT_URL` | `wss://<new>.livekit.cloud` | шаг 1 |
   | `DATABASE_URL` | Neon URL | из `felix/.env.local` |
   | `NEXT_PUBLIC_API_URL` | `https://dev-server.justtostudy.kz` | бэкенд авторизации |
   | `ELEVENLABS_API_KEY` | ключ ElevenLabs | шаг 2 |
   | `ELEVEN_VOICE_ID_DEXTER` | `rHWSYoq8UlV0YIBKMryp` | шаг 2 |
   | `GOOGLE_CREDENTIALS_JSON` | JSON сервис-аккаунта | шаг 2 |
   | `SONIOX_API_KEY` | ключ Soniox | шаг 2 |

   Последние четыре — для кнопок «послушать голос» на экране выбора тьютора
   (`/api/tutor-tts`). Имя `ELEVEN_VOICE_ID_DEXTER` отличается от агентского
   `ELEVEN_VOICE_ID_BRO`, а **значение то же**: фронт знает тьютора как `dexter`,
   агент — как персону `bro`. Разойдутся — превью и живой разговор зазвучат
   разными людьми.
3. **Save** → вкладка **Deployments** → у последнего деплоя **⋯ → Redeploy**.
4. Запиши прод-URL сайта (напр. `https://jts-web-app.vercel.app`) — нужен в шаге 5 и 6.

---

## 4. Neon — готово
Схема уже применена. Ничего делать не нужно. (Если однажды сбросишь БД — ничего
руками катить не надо: миграции из `src/lib/migrations/` применяются сами при
следующем старте приложения, см. `src/instrumentation.js`.)

---

## 5. LiveKit-агент → деплой на новый проект
Ставится LiveKit CLI (`lk`). Из папки `agent/` собирается Docker и деплоится в облако.

**5.1. Подключить новый проект к CLI** (один раз):
```bash
lk project add \
  --url wss://<new>.livekit.cloud \
  --api-key <API_KEY нового проекта> \
  --api-secret <API_SECRET нового проекта> \
  jts-tutor
```

**5.2. Задеплоить агента** (из папки `agent/`):
```bash
cd agent
lk agent create --project jts-tutor \
  --secrets VOICE_STACK=cascade \
  --secrets JTS_API_URL=https://<прод-URL-jts из шага 3.4> \
  --secrets INTERNAL_API_KEY=<тот же, что на Vercel> \
  --secrets SONIOX_API_KEY=<из felix/.env.local> \
  --secrets GEMINI_API_KEY=<из felix/.env.local> \
  --secrets ELEVENLABS_API_KEY=<из шага 2> \
  --secrets ELEVEN_VOICE_ID_BRO=rHWSYoq8UlV0YIBKMryp \
  --secrets GOOGLE_CREDENTIALS_JSON=<JSON сервис-аккаунта одной строкой>
```
Соберёт образ из `agent/Dockerfile`, задеплоит воркер. Проверка:
```bash
lk agent list                 # появится новый агент на проекте jts-tutor
lk agent logs                 # логи; ищи "Cascade TTS: ElevenLabs (...)" у Декстера
```

**5.3. Добавить/поменять секреты у уже живого агента.** Агент здесь уже создан
(`agent/livekit.toml`, id `CA_CqiV3FajSzKS`), так что для голоса Декстера нужен
не `create`, а:
```bash
cd agent
lk agent update-secrets \
  --secrets ELEVENLABS_API_KEY=<ключ> \
  --secrets ELEVEN_VOICE_ID_BRO=rHWSYoq8UlV0YIBKMryp
```
Две вещи, о которых легко споткнуться:
- **`--overwrite` обязателен, если ключ уже существует.** Без флага команда не
  перезапишет старое значение.
- **Команда перезапускает агента.** Активные разговоры оборвутся — катить в тихое
  время.

Id агента берётся из `livekit.toml` в рабочей папке; иначе `--id CA_CqiV3FajSzKS`.

То же самое мышкой: https://cloud.livekit.io → проект **jts-web-app-rh27xn26** →
**Agents** → агент `CA_CqiV3FajSzKS` → **Settings / Secrets** → Add secret.

Проверить, что записалось:
```bash
lk agent secrets              # список ИМЁН секретов, значения не показываются
```

> ВАЖНО: деплой идёт на **новый** проект (`--project jts-tutor`), felix-агент
> (`CA_iep7EvPdfsML` на `felix-qwztz8z4`) не трогается.

---

## 6. LiveKit webhook — учёт минут
1. Dashboard нового проекта → **Settings → Webhooks** → **Add Webhook**.
2. URL: `https://<прод-URL-jts>/api/livekit/webhook`
3. События: `room_finished` (или все). Save.

---

## 7. Проверка (после всех шагов)
- Открой прод-сайт → пройди к голосовому экрану тьютора → начни разговор.
- Тьютор здоровается своим голосом (3 разных: Декстер/Спарк/Луна).
- `lk agent logs` → `Cascade TTS: ElevenLabs (...)` у Декстера, `Gemini (...)` у
  Луны, `Soniox (...)` у Спарка. Увидел `Soniox` там, где ждал другого, — значит
  ключ провайдера не задан и агент ушёл в фолбэк (строка `falling back to` выше).
- Кнопка «послушать голос Декстера» на экране выбора звучит тем же голосом, что и
  живой разговор. Разошлось — на Vercel нет `ELEVEN_VOICE_ID_DEXTER`.
- Vercel → Functions logs → `llm_cost` с `cacheReadTokens > 0` со 2-го хода.
- Наговори >10 мин за день → следующий звонок покажет экран дневного лимита.

---

## Что нужно от тебя, чтобы я добил сам
Если хочешь, чтобы деплой агента (шаг 5) сделал я — дай:
1. Ключи нового LiveKit-проекта (API key, secret, wss URL) — шаг 1.
2. `ELEVENLABS_API_KEY` и `GOOGLE_CREDENTIALS_JSON` — шаг 2.
3. Прод-URL jts на Vercel — шаг 3.4.

SONIOX/GEMINI/ANTHROPIC/DATABASE_URL я возьму из `felix/.env.local` сам (в чат не выведу).
