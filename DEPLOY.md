# Запуск голосового тьютора jts-web-app — пошагово

Инструкция «где и что нажать», зеркалит setup felix (LiveKit Cloud agent +
Vercel + Neon), но с новым отдельным LiveKit-проектом и Azure TTS.

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

## 2. Azure Speech — ключ + регион (для TTS)
1. https://portal.azure.com → **Create a resource** → найди **Speech** → Create.
   (Или открой уже существующий Speech-ресурс, что использует произношение в IELTS.)
2. Тариф (Pricing tier): **Standard S0** — НЕ Free F0 (у Free потолок 500k симв/мес).
3. После создания: ресурс → **Keys and Endpoint**.
4. Скопируй:
   - **KEY 1** → это `AZURE_SPEECH_KEY`
   - **Location/Region** (напр. `eastus`) → это `AZURE_SPEECH_REGION`

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
3. **Save** → вкладка **Deployments** → у последнего деплоя **⋯ → Redeploy**.
4. Запиши прод-URL сайта (напр. `https://jts-web-app.vercel.app`) — нужен в шаге 5 и 6.

---

## 4. Neon — готово
Схема уже применена. Ничего делать не нужно. (Если однажды сбросишь БД — повторно:
`node`-скрипт или `psql "$DATABASE_URL" -f src/lib/schema.sql`.)

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
  --secrets AZURE_SPEECH_KEY=<KEY 1 из шага 2> \
  --secrets AZURE_SPEECH_REGION=<region из шага 2> \
  --secrets SONIOX_API_KEY=<из felix/.env.local> \
  --secrets GEMINI_API_KEY=<из felix/.env.local>
```
Соберёт образ из `agent/Dockerfile`, задеплоит воркер. Проверка:
```bash
lk agent list                 # появится новый агент на проекте jts-tutor
lk agent logs                 # логи; ищи строку "Cascade TTS: Azure (...)"
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
- `lk agent logs` → `Cascade TTS: Azure (...)`.
- Vercel → Functions logs → `llm_cost` с `cacheReadTokens > 0` со 2-го хода.
- Наговори >10 мин за день → следующий звонок покажет экран дневного лимита.

---

## Что нужно от тебя, чтобы я добил сам
Если хочешь, чтобы деплой агента (шаг 5) сделал я — дай:
1. Ключи нового LiveKit-проекта (API key, secret, wss URL) — шаг 1.
2. `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` — шаг 2.
3. Прод-URL jts на Vercel — шаг 3.4.

SONIOX/GEMINI/ANTHROPIC/DATABASE_URL я возьму из `felix/.env.local` сам (в чат не выведу).
