# Дизайн: Live-каркас урока (под-проект №2)

Дата: 2026-08-02
Репозиторий: `jts-web-app` (ветка `feat/live-lesson-shell`, стек на `feat/lessons-schedule` / PR #154)
Статус: утверждён к реализации (пользователь дал полную автономию)

## Контекст
Продолжение переноса живого урока из web-admin (Angular) в jts-web-app (React) — см.
`docs/superpowers/specs/2026-08-01-lessons-schedule-design.md` (под-проект №1). №1 добавил
график в «Уроки» и экран-заглушку `live-lesson`. №2 заменяет заглушку **живым каркасом**
для обеих ролей. Доска/материалы/зеркало — последующие №3–5.

Оба приложения ходят в один бэкенд и одни STOMP-топики; вход по OTP даёт тот же JWT.
web-admin подключается нативным WebSocket через `@stomp/stompjs` (без SockJS),
`brokerURL = wss://dev-server.justtostudy.kz/ws`, авторизация — в STOMP CONNECT-фрейме
(`connectHeaders: { Authorization: 'Bearer <token>' }`), не в HTTP-хендшейке.

## Цель №2
Открыв живой урок из графика, пользователь видит рабочий каркас: тема/преподаватель,
**статус** урока (Идёт/Пауза/Запланирован/Завершён), **presence-ростер** (кто реально
подключён), и роль-зависимые действия: **учитель** управляет уроком
(Начать/Пауза/Продолжить/Завершить), **ученик** видит статус и до старта — «Преподаватель
ещё не начал урок».

## Scope
**В scope:**
- Замена тела `LiveLessonPage` живым каркасом.
- Зависимость `@stomp/stompjs` (нативный WS).
- STOMP presence: подписка `/topic/lesson/{id}/presence`, publish `/app/lesson/{id}/presence/join`, авто-reconnect, мягкая деградация (нет коннекта → пустой ростер, экран цел).
- Загрузка урока `GET /admin/lessons/{id}` (скоуп сервера = свои уроки).
- Статус-бейдж + presence-ростер.
- Управление учителя: `PUT /admin/lessons/{id}/start|pause|resume|complete`.
- Ученик: read-only статус + поллинг статуса (~5с), чтобы «учитель начал» появлялось само (отдельного STOMP-топика статуса нет).
- Роль из JWT (`roleFromToken`).
- i18n (ru/en/kk).

**Вне scope (следующие под-проекты):**
- Доска/курсоры (№3), разделы/материалы/презентация (№4), зеркало экрана (№5), чат/заметки/посещаемость (№6), реальное видео (LiveKit).
- Изменения бэкенда — не требуются.

## Данные / API (в `src/api.js`)
- `getLessonById(token, id)` → `GET /admin/lessons/{id}` (через `authGet`).
- `startLiveLesson(token, id)` → `PUT /admin/lessons/{id}/start`.
- `pauseLiveLesson(token, id, minutes)` → `PUT /admin/lessons/{id}/pause?minutes=`.
- `resumeLiveLesson(token, id)` → `PUT /admin/lessons/{id}/resume`.
- `completeLiveLesson(token, id)` → `PUT /admin/lessons/{id}/complete`.
Имена с префиксом `...LiveLesson`, чтобы не конфликтовать с существующим
`completeLesson` (mobile lesson-modules). Мутации — через существующий `post`/новый
`authPut` по образцу api.js (метод PUT + Bearer). Бэкенд не меняем.

## Юниты (изоляция)
- `src/lib/jwt.js` — `roleFromToken(token): string|null` (декод base64url payload, без зависимостей; безопасно к мусору → null).
- `src/lib/wsUrl.js` — `wsBase(): string` из `NEXT_PUBLIC_API_URL` (https→wss, http→ws) + `/ws`; дефолт `wss://dev-server.justtostudy.kz/ws`.
- `src/screens/live/liveStatus.js` — чистые: `statusKey(lessonStatus)` → 'inProgress'|'paused'|'scheduled'|'completed'|'cancelled'; `canControl(role)` = role ∈ {TEACHER, ADMIN, MANAGER}; `canJoinLive(status)` = IN_PROGRESS|PAUSED.
- `src/screens/live/useLessonPresence.js` — React-хук: создаёт `@stomp/stompjs` Client (`brokerURL = wsBase()`, `connectHeaders Authorization`), подписка presence, publish join на onConnect, cleanup на unmount; отдаёт `{ roster: PresenceEntry[], connected: boolean }`. PresenceEntry = `{ userId, name?, role? }` (форма из бэкенда, парсим защищённо).
- `src/screens/live/LiveStatusBadge.jsx`, `src/screens/live/PresenceRoster.jsx`, `src/screens/live/TeacherControls.jsx` — презентационные.
- `src/screens/LiveLessonPage.jsx` — оркестрация: `getLessonById` (+ поллинг для ученика), `useLessonPresence`, роль из `roleFromToken(token)`, рендер шапки/бейджа/ростера/контролов; сохраняет текущий проп-контракт (`lessonId, token, userName, userLevel, onNav, onProfile, onBack`).

## Состояния / поведение
- Загрузка урока: loading / error / ready.
- Presence: `connected` индикатор; ростер может быть пуст (никто не в комнате или WS недоступен) — экран остаётся рабочим.
- Учитель: кнопки по статусу — SCHEDULED→«Начать»; IN_PROGRESS→«Пауза»/«Завершить»; PAUSED→«Продолжить»/«Завершить»; после действия — рефетч урока.
- Ученик: бейдж статуса; SCHEDULED→«Преподаватель ещё не начал урок»; поллинг статуса ~5с (очищается на unmount).

## Тесты
- **Юнит** (vitest): `roleFromToken` (валид/мусор/отсутствие claim), `wsBase` (https→wss, http→ws, дефолт), `statusKey`, `canControl`, `canJoinLive`.
- **E2e** (Playwright, мок REST; WS не мокаем — хук деградирует мягко): учитель (роль в токене/`/api/auth/me`) на IN_PROGRESS → видит «Пауза»/«Завершить»; ученик на SCHEDULED → «Преподаватель ещё не начал урок», контролов нет; клик учителя «Начать» на SCHEDULED → мок `/start` → бейдж обновляется на «Идёт».
- **Ручная проверка**: dev-сервер, ученик Сабина (OTP 0000) заходит в идущий урок 14 → presence-ростер показывает подключение; параллельно учитель в web-admin — оба видят друг друга (проверка STOMP из jts-web-app вживую).

## Риск-снятие
STOMP из jts-web-app использует тот же механизм, что доказанно работает в web-admin
(нативный WS + Authorization в CONNECT-фрейме, тот же бэкенд/токен). Первым шагом
реализации — хук presence + ручная проверка коннекта на dev до наращивания UI.

## Затрагиваемые файлы
Новые: `src/lib/jwt.js`, `src/lib/wsUrl.js`, `src/screens/live/liveStatus.js`,
`src/screens/live/useLessonPresence.js`, `src/screens/live/LiveStatusBadge.jsx`,
`src/screens/live/PresenceRoster.jsx`, `src/screens/live/TeacherControls.jsx`, тесты.
Изменяемые: `src/api.js` (+5 функций, `authPut`), `src/screens/LiveLessonPage.jsx`
(тело каркаса), `src/i18n.jsx` (`live.*` ключи ru/en/kk), `src/styles.css` (`.live*`),
`package.json` (+`@stomp/stompjs`).

## Примечания
- Проп-контракт `LiveLessonPage` не меняем — №3+ добавят доску/разделы внутрь.
- Отдельного STOMP-топика статуса нет → ученик поллит; при появлении такого топика поллинг заменить подпиской.
- `LessonRow` из №1 уже гейтит вход по IN_PROGRESS/PAUSED — согласовано с `canJoinLive`.
