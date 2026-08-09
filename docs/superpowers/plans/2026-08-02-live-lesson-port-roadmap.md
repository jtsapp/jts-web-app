# Перенос живого урока web-admin → jts-web-app — полный implementation-план

Дата: 2026-08-02
Репозиторий фронта: `jts-web-app` (React/Next). Бэкенд общий — `dev-server.justtostudy.kz`, **не меняем**.
Статус: #1 и #2 сделаны (PR-ы открыты), #3–#6 + backport в main — впереди.

## 0. Цель и принцип
Перенести живой урок «учитель ↔ ученик» из **web-admin** (Angular: Fabric-доска, STOMP,
presence, презентация, зеркало экрана, разделы/материалы, чат) **нативно в React
(jts-web-app)** для **обеих ролей**, сохранив весь функционал. Оба приложения ходят в
один бэкенд и одни STOMP-топики; вход по OTP даёт тот же JWT (та же личность). Видео в
web-admin — заглушка (нет WebRTC); реальный A/V — через существующий LiveKit (опционально, поздний этап).

Метод: каждый под-проект = отдельный цикл **brainstorm → спека → план → субагенты (TDD) → ревью → PR**.
Каждый PR самостоятельно ценен и не ломает существующее.

## 1. Общая архитектура (в jts-web-app)
- Один `<App/>` — стейт-машина по строке `screen` (`src/App.jsx`); живой урок = экран `live-lesson` c `liveLessonId`.
- Токен в `localStorage['jts_access_token']`; роль/`userId` из JWT (`src/lib/jwt.js`).
- Данные — `src/api.js` (fetch + `Authorization: Bearer`), сервер скоупит `/admin/lessons/*` под токен (чужой урок → 400, IDOR нет).
- Realtime — `@stomp/stompjs` (нативный WebSocket, БЕЗ SockJS), `brokerURL = wsBase()` (из `NEXT_PUBLIC_API_URL`, https→wss, +`/ws`), авторизация в STOMP CONNECT-фрейме. Паттерн — хук на урок (образец: `useLessonPresence`).
- i18n — `src/i18n.jsx`, три блока `ru`/`en`/`kk`.
- Тесты — Vitest (юнит, добавлен в #1), Playwright (`tests/*.spec.js`, бэкенд мокается `page.route`).

## 2. Контракт бэкенда (референс для всех этапов)
REST (`/admin/lessons/...`, скоуп под токен):
- Урок: `GET /admin/lessons/{id}`; журнал `GET /admin/lessons/occurrences`; сводка `GET /admin/lessons/summary`.
- Жизненный цикл: `PUT .../start | .../pause?minutes= | .../resume | .../complete?rating=`.
- Разделы: `GET/POST/PATCH/DELETE .../sections`, `.../sections/{sid}/materials` (+visibility/move), `.../sections/extra`.
- Материалы урока: `GET/POST/DELETE .../materials`.
- Чат: `GET/POST .../messages`. Заметки: `GET/PUT .../notes/{studentId}`.
- Доска: `GET .../board/objects`; настройки `GET/PUT .../board/settings`.
- Посещаемость: `PUT .../participants/{sid}/no-show | .../cancel`.
- Прогресс материала (ученик): `GET/DELETE /student/lessons/{id}/materials/{mid}/progress`.

STOMP (`wss://<api>/ws`):
- Доска: `/topic/lesson/{id}/board`, `/topic/lesson/{id}/cursor` (+ publish `/app/lesson/{id}/...`).
- Координация: `/topic/lesson/{id}/{focus, present, material-mirror, sections-changed, presence, board-settings}`; publish presence — `/app/lesson/{id}/presence/join`.
- Зеркало интерактивного материала: `/topic/material-assignment/{id}/mirror`, `/topic/material-session/{sid}/answers` (+ publish `/app/material-assignment/...`).
- presence-пейлоад: `{ onlineUserIds: number[] }` (имена резолвим из данных урока).

---

## 3. СДЕЛАНО

### ✅ Под-проект #1 — «График в Уроках»  (PR #154 → develop, MERGED)
Блок «Мой график» во вкладке «Уроки → Онлайн»: журнал занятий (прошедшие+будущие) из
`occurrences`+`summary`, по датам, со статусами; клик по идущему уроку (гейт
IN_PROGRESS/PAUSED) → экран `live-lesson`. По просьбе убраны карточки внешних модулей.
Файлы: `src/screens/schedule/{lessonFormat.js, LessonSchedule.jsx, ScheduleSummary.jsx, LessonRow.jsx}`,
`src/screens/LiveLessonPage.jsx` (заглушка), правки `src/api.js`, `src/App.jsx`, `src/i18n.jsx`, `src/styles.css`.
Тесты: vitest (helpers+api) + e2e `tests/lessons-schedule.spec.js`.

### ✅ Под-проект #2 — «Live-каркас»  (PR #158 → develop, ОТКРЫТ — мёржить его)
> ⚠️ Маршрут: #157 по ошибке смёржен в стек-базу `feat/lessons-schedule`, не в develop.
> Правильный PR — **#158** (`feat/live-lesson-shell` → develop), содержит весь #2 + фикс ростера.
Заглушка `live-lesson` заменена рабочим каркасом:
- Presence по STOMP (`useLessonPresence`), статус-бейдж, presence-ростер с именами (self=«Вы»).
- Управление учителя (роль из JWT, TEACHER/ADMIN/MANAGER): Начать/Пауза/Продолжить/Завершить.
- Ученик: read-only + «Преподаватель ещё не начал урок» + поллинг статуса ~5с.
Файлы: `src/lib/{jwt.js, wsUrl.js}`, `src/screens/live/{liveStatus.js, useLessonPresence.js, LiveStatusBadge.jsx, PresenceRoster.jsx, TeacherControls.jsx}`,
правки `src/api.js` (getLessonById + lifecycle + authPut), `src/screens/LiveLessonPage.jsx`, `src/i18n.jsx`, `src/styles.css`, `package.json` (+@stomp/stompjs).
Тесты: vitest 27/27 + e2e `tests/live-lesson.spec.js` (3). Фикс: presence `{onlineUserIds}` + резолв имён.

### Технический долг (бэклог, вносить попутно в #3+)
- `authPut` текст ошибки на английском (в `authGet` — русский) — унифицировать.
- Дубль decode-блока в `src/lib/jwt.js` (`roleFromToken`/`userIdFromToken`) — вынести `decodePayload`.
- Порядок ключей в `package.json` dependencies (@stomp/stompjs не по алфавиту).
- Тонкое покрытие негативных путей сокета (close/unmount) и `authPut` error-path.
- Статус урока обновляется поллингом (нет STOMP-топика статуса) — при появлении топика заменить подпиской.

---

## 4. ОСТАЛОСЬ

Порядок = порядок сборки. Всё встраивается ВНУТРЬ каркаса #2 (`LiveLessonPage`), под presence-ростером.

### ⏳ Под-проект #3 — «Доска (Fabric + realtime)»  [L]
Цель: живой whiteboard — учитель рисует, ученик видит в реальном времени; курсоры; настройки доски.
Задачи:
1. Зависимость `fabric` (v7, как в web-admin) + `useLessonBoard(lessonId, token, {role})` — второй STOMP-хук (топики `/topic/lesson/{id}/board`, `/cursor`; publish изменений). Паттерн — как `useLessonPresence`.
2. `BoardCanvas.jsx` — рендер Fabric-канваса; учитель edit, ученик view (рисование только если `board-settings.drawingDisabled=false`).
3. Гидрация доски из `GET /admin/lessons/{id}/board/objects`; применение remote-событий с подавлением собственного эха (senderUserId === self).
4. Курсоры участников; undo/redo (у учителя).
5. Board-settings: `GET/PUT /admin/lessons/{id}/board/settings` + подписка `/topic/lesson/{id}/board-settings` (запрет рисования/скрытие курсоров).
Тесты: юнит на хук (мок Client: подписки/публикации/эхо-фильтр); e2e — доска рендерится, ученик read-only.
Риск: сериализация Fabric-объектов и совместимость формата с тем, что шлёт web-admin (проверить на живом уроке с обеих сторон).

### ⏳ Под-проект #4 — «Разделы и материалы»  [M]
Цель: список разделов урока; следование ученика за презентуемым разделом/материалом; встраивание интерактивного материала.
Задачи:
1. `GET .../sections` (+ CRUD у учителя: POST/PATCH/DELETE, `sections/extra`, `sections/{sid}/materials` +visibility/move).
2. Подписки `/topic/lesson/{id}/{present, focus, sections-changed}` — ученик автоматически открывает раздел/материал, что «презентует» учитель.
3. `MaterialFrame.jsx` — iframe интерактивного материала: ученик `mode=live` (сохраняет ответы/позицию), учитель `mode=review` (смотрит сохранённое ученика). URL с токеном — **не в query** (учесть находку безопасности из web-admin: JWT в URL iframe — уязвимость), передавать через postMessage/заголовок или короткоживущий тикет.
4. Прогресс материала: `GET/DELETE /student/lessons/{id}/materials/{mid}/progress`.
Тесты: юнит на резолв present→section; e2e — учитель презентует раздел, ученик следует.

### ⏳ Под-проект #5 — «Зеркало экрана»  [M]
Цель: «Смотреть вживую» / «Экран преподавателя» — зеркалирование интерактивного материала между учителем и учеником.
Задачи:
1. `useMaterialSession(assignmentId, sessionId, token)` — STOMP: `/topic/material-assignment/{id}/mirror`, `/topic/material-session/{sid}/answers`; publish действий.
2. Компонент монитора (iframe + применение mirror-событий); режимы «показать свой экран» (ученик релеит) и «смотреть» (учитель реплеит).
3. ⚠️ Учесть баг web-admin (H1): singleton-сокет гибнет при переключении мониторов — в React изолировать сокет на инстанс/ключ, cleanup на unmount, без общего клиента.
Тесты: юнит на релей/реплей события; e2e — открытие монитора не рвёт соединение при переключении.

### ⏳ Под-проект #6 — «Чат, заметки, посещаемость, видео»  [M]
Задачи:
1. Чат урока: `GET/POST .../messages` (+ по возможности realtime-топик, иначе поллинг/refetch).
2. Заметки: `GET/PUT .../notes/{studentId}` (учитель по ученику).
3. Посещаемость (учитель): `PUT .../participants/{sid}/no-show | .../cancel`; оценка при `complete?rating=`.
4. Видеозвонок: сначала как в web-admin — UI + внешняя `meetingUrl` (`PUT .../meeting-url`). Реальный A/V (LiveKit) — отдельный поздний этап (см. #7).
Тесты: юнит на маппинг статусов участника; e2e на чат/заметки (мок REST).

### ❌ Под-проект #7 — «Реальное видео (LiveKit)» — НЕ ДЕЛАЕМ
Решение 2026-08-02: видеозвонок = **внешняя Meet-ссылка** (`meetingUrl`, как в web-admin),
реальный WebRTC/LiveKit не внедряем. Соответственно в #6 видео — просто поле ссылки на Meet.

### ⏸ Backport в main — ОТЛОЖЕН
Решение 2026-08-02: пока делаем **только develop**. main (трек `TUTOR_ONLY`) не трогаем;
к вопросу backport-а (#1..#6 + гейтинг «Уроков» при `TUTOR_ONLY`) вернёмся позже.

---

## 5. Сводная таблица
| # | Под-проект | Статус | PR | Размер |
|---|---|---|---|---|
| 1 | График в «Уроках» | ✅ merged | #154 (develop) | S |
| 2 | Live-каркас (presence/статус/управление) | ✅ готов, ждёт мёржа | **#158** (develop) | M |
| 3 | Доска (Fabric + realtime) | ⏳ | — | L |
| 4 | Разделы и материалы | ⏳ | — | M |
| 5 | Зеркало экрана | ⏳ | — | M |
| 6 | Чат/заметки/посещаемость/видео (Meet-ссылка) | ⏳ | — | M |
| 7 | Реальное видео (LiveKit) | ❌ не делаем (решено: Meet) | — | — |
| — | Backport #1..#6 в main (TUTOR_ONLY) | ⏸ отложен | — | S–M |

## 6. Открытые решения
- ✅ **Видео**: внешняя Meet-ссылка (LiveKit не делаем). — решено 2026-08-02.
- ✅ **main**: backport отложен, пока только develop. — решено 2026-08-02.
- **JWT в iframe** (#4): выбрать безопасный способ передачи токена в iframe материала (не query).
- **Realtime статуса** (#2 долг): просить бэкенд добавить STOMP-топик статуса, чтобы убрать поллинг.

## 7. Немедленные шаги
1. Смёржить **PR #158** в develop (иначе #2 не в develop).
2. Стартовать **#3 (Доска)** — самый крупный и центральный кусок; ветка стек на #158/develop.
