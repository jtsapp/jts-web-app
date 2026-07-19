# CLAUDE.md — jts-web-app

Веб-версия Just to Study («раздел Практики»): Next.js-приложение с уроками,
IELTS-модулем и голосовым AI-тьютором. Это тот самый проект, куда идут
клиентские правки «Практики» (не mobile-app).

## Ветки

- **`develop`** — рабочая ветка: полная версия приложения (Обучение, Практика,
  IELTS, Словарь, Тьютор). Фичи и фиксы идут PR'ами сюда.
- **`main`** — прод: режим «только тьютор». В `src/config.js` флаг
  `TUTOR_ONLY = true` (в develop — false); это ЕДИНСТВЕННОЕ намеренное
  расхождение веток. При мерже develop → main конфликт на этой строке
  разрешать в пользу `true`.
- В тьютор-онли скрыты сайдбар-разделы и навигация на всё, кроме тьютора,
  входа и профиля; сами экраны и код остаются и открываются диплинком
  `?screen=…` для отладки.

## Команды

```bash
npm run dev     # локальная разработка (next dev)
npm run build   # прод-сборка — гоняй перед PR, ловит ошибки импортов/SSR
npm run lint    # eslint 9 + eslint-config-next
```

Тест-раннера в проекте нет. Проверка изменений = `npm run build` + `npm run
lint` + ручной прогон затронутого экрана (`npm run dev`, диплинк `?screen=…`).

## Архитектура

**SPA внутри Next.js.** App Router используется только как оболочка:
`src/app/page.jsx` рендерит `src/App.jsx`, а навигация — это state-машина
`screen` внутри App.jsx (никакого Next-роутинга между экранами). Диплинк
`?screen=<name>` открывает экран напрямую — применяется эффектом ПОСЛЕ
гидратации, чтобы не ловить hydration mismatch (см. комментарий в App.jsx).
Новый экран = файл в `src/screens/` + импорт и ветка в App.jsx.

**JavaScript, не TypeScript.** Весь код — .js/.jsx (`jsconfig.json`). Не
добавлять TS-файлы.

**Слои:**
- `src/screens/` — экраны (Welcome/Otp/Learning/Ielts*/Tutor*/Kingdom* и т.д.)
- `src/components/` — общие компоненты (Shell, Sidebar, LearningLayout…)
- `src/tutor/` — компоненты и данные раздела «Тьютор» (tutors.js, scenarios.js)
- `src/practice/` — движки практики (fairytale, situations)
- `src/lib/` — серверные и общие утилиты; `src/lib/db/` — модули Neon
- `src/app/api/` — серверные роуты (auth, profile, voice, livekit, ielts, hl…)
- `src/api.js` — клиентский REST-обёртка к JTS-бэкенду
- `agent/` — отдельный Python-воркер LiveKit (Gemini Live), деплоится отдельно
- `scripts/` — генераторы данных (extract-fairytale.js, extract-situations.js)

**Внешние сервисы:**
- JTS-бэкенд: `NEXT_PUBLIC_API_URL` / `BACKEND_URL`, дефолт
  `https://dev-server.justtostudy.kz`. Верификация токена делегируется бэкенду
  (`src/lib/auth-server.js`) — JWT-секрета в этом приложении нет и не должно быть.
- Neon Postgres: `src/lib/db/sql.js` → `getSql()` возвращает `null`, если
  `DATABASE_URL` не задан — вызывающий код обязан тихо деградировать
  (прогресс тогда живёт в localStorage). Никогда не бросать на импорте.
- Anthropic: `src/lib/anthropic.js` — голосовой «мозг» на Haiku 4.5 с prompt
  caching (три cache-breakpoint'а — не ломай их, иначе стоимость ×2.5),
  IELTS-грейдинг на Sonnet.
- LiveKit Cloud (голос) + Azure Speech (TTS). Ключи только серверные,
  в браузер не уходят. Схема деплоя — DEPLOY.md (Vercel + LiveKit + Neon).
- `src/app/api/hl/[...path]/route.js` — прокси Speakout-курса с
  files-api.iqra.space; ограничен `ALLOWED_PREFIX` и .html (SSRF-защита) —
  не расширять без причины.

## Конвенции

- **Комментарии на русском и объясняют «почему», не «что»** — включая
  контекст инцидентов и неочевидные ограничения (см. auth-server.js, App.jsx).
  Новый код комментируй в том же стиле.
- Многие модули помечены «Ported from felix …» — при доработке таких файлов
  сохраняй совместимость с исходной семантикой, а не переписывай с нуля.
- **i18n:** все строки UI раздела «Тьютор» — через `t(key, vars)` и
  `src/i18n/dict.js` (kz/ru/en, дефолт ru). Ключи одинаковые для всех языков;
  имена тьюторов и грамматические термины не переводятся.
- **Стили:** три глобальных CSS-файла — `styles.css`, `tutor.css`, `ielts.css`.
  Никаких CSS-модулей/styled-components; новые стили — в соответствующий файл,
  классами в существующем стиле. Шрифт — Manrope.
- Телефоны нормализуются в формат бэкенда `7XXXXXXXXXX` —
  `normalizePhone()` в `src/api.js`, не дублировать.
- Анонимный прогресс привязан к device-id и мержится в аккаунт после входа
  (`mergeAnonymousProgress`, `/api/profile/merge`). Ids `user-<id>`
  зарезервированы за авторизованными — аноним не должен до них дотянуться.

## Env

`.env.local` (не коммитить; образец — `.env.example`): `ANTHROPIC_API_KEY`,
`DATABASE_URL`, `LIVEKIT_URL/API_KEY/API_SECRET`, `AZURE_SPEECH_KEY/REGION`,
`NEXT_PUBLIC_API_URL`, `BACKEND_URL`. Env-значения могут прийти с BOM из
Windows-пайпа — серверный код уже вырезает его; при добавлении новых env
делай так же.

## Скиллы Claude Code

В `~/.claude/skills/` на этой машине установлены личные скиллы (источники —
официальные github.com/flutter/skills и github.com/anthropics/skills):

- **Flutter/Dart** (для mobile-app): flutter-add-widget-test,
  flutter-add-integration-test, flutter-fix-layout-issues,
  flutter-build-responsive-layout, flutter-apply-architecture-best-practices,
  flutter-implement-json-serialization, dart-add-unit-test,
  dart-generate-test-mocks, dart-fix-runtime-errors, dart-run-static-analysis
- **Веб**: webapp-testing (Playwright — клики, скриншоты, логи браузера),
  frontend-design (визуальный дизайн UI)
- **Мета**: skill-creator (создание новых скиллов)

Для этого репозитория в первую очередь: **webapp-testing** — тест-раннера тут
нет, поэтому изменения экранов проверяй прогоном через Playwright (диплинк
`?screen=…`); **frontend-design** — при работе над UI.
