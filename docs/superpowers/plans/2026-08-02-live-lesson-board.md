# Под-проект #3 — Живая доска урока (Fabric + realtime)

Портирует интерактивную доску живого урока из web-admin
(`lesson-workspace` + `LessonBoardSocketService`) в jts-web-app. Доска встроена в
каркас #2 (`LiveLessonPage`) и показывается при статусах `IN_PROGRESS`/`PAUSED`.

## Совместимость с web-admin (единый бэкенд)

Оба приложения делят один бэкенд и STOMP-брокер, поэтому формат — байт-в-байт как в
web-admin, иначе учитель в админке и ученик в вебе рисовали бы на «разных» досках:

- **Объект** несёт кастомный `id` (= `objectId`); сериализация — `obj.toObject(['id'])`,
  т.е. `id` лежит внутри `json`.
- **Гидрация / remote-add**: `fabric.util.enlivenObjects([JSON.parse(json)])` → `obj.id = objectId`.
- **STOMP** (см. `useLessonBoard`):
  - subscribe `/topic/lesson/{id}/board` → `{eventType:ADD|UPDATE|REMOVE|CLEAR, objectId, type, json, senderUserId}`
  - subscribe `/topic/lesson/{id}/cursor` → `{userId, name, x, y, tool}`
  - subscribe `/topic/lesson/{id}/board-settings` → `{drawingDisabled, cursorsHidden}`
  - publish `/app/lesson/{id}/board/{add,update,remove,clear}`, `/app/lesson/{id}/cursor`
  - **эхо-фильтр**: брокер возвращает событие и отправителю → дропаем по `senderUserId/userId === selfUserId`
- **REST** (только гидрация, бэкенд скоупит `/admin/lessons*` под личность токена):
  `GET /admin/lessons/{id}/board/objects`, `GET|PUT /admin/lessons/{id}/board/settings`.

## Состав

- `src/screens/live/useLessonBoard.js` — STOMP-транспорт доски (по образцу `useLessonPresence`).
- `src/api.js` — `getBoardObjects`, `getBoardSettings`, `updateBoardSettings`.
- `src/screens/live/LiveBoard.jsx` — Fabric-канва: гидрация, инструменты (курсор/перо/
  прямоугольник/овал/текст), удаление, undo/redo, очистка, живые курсоры, «настройки
  учеников» (учитель запрещает рисование / скрывает курсоры → REST PUT → STOMP всем).
- Ученик под `drawingDisabled` — read-only (нельзя рисовать/двигать), видит доску и курсоры.
- i18n `board.*` в ru/en/kk, стили `.board*` в `styles.css`.

## Тесты

- `useLessonBoard.test.js` (6): коннект wss+Bearer, подписка на 3 топика, паблиш add/
  update/remove/clear/cursor в правильные destination с web-admin-shape, эхо-фильтр, доставка
  remote-событий в handlers, no-op до коннекта.
- `liveApi.test.js` (+3): пути board/objects, board/settings, PUT частичного патча.
- Fabric-канва (визуальная часть) юнитами не покрывается — как и в web-admin; проверка
  сборкой + ручным прогоном. Транспорт и REST (высокорисковая логика) покрыты полностью.

## Техдолг (попутно)

- `src/lib/jwt.js` — дедуплицирован base64-декод (общий `payloadOf`).

## Проверка

`npm run test` (35/35 зелёные) · `npm run build` (ок, fabric не ломает SSR) ·
lint новых файлов чист (базовые ошибки репозитория — предсуществующие).
