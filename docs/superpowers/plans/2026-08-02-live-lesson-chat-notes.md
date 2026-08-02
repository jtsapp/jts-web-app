# Под-проект #6 — Чат, заметки, посещаемость, видео-ссылка

Замыкает клиентскую часть роадмапа живого урока. Все каналы — REST (чат STOMP-топика
не имеет), видео = внешняя ссылка (как в web-admin, без реального WebRTC).

## Контракт (паритет с web-admin)

- **Чат** (обе роли): `GET/POST /admin/lessons/{id}/messages` ({body} → полный список).
- **Заметки** (учитель, по ученику): `GET/PUT /admin/lessons/{id}/notes/{studentId}` ({body}).
- **Посещаемость** (учитель): `PUT /admin/lessons/{id}/participants/{studentId}/no-show|cancel`.
- **Видео**: `PUT /admin/lessons/{id}/meeting-url` ({meetingUrl, wholeSeries}); ссылка живёт
  в `lesson.meetingUrl`. Реального getUserMedia/WebRTC нет — бейдж «Демо» + внешняя ссылка.

## Состав

- `src/api.js` — `getLessonMessages`, `sendLessonMessage`, `getLessonNote`, `saveLessonNote`,
  `markNoShow`, `markParticipantCancelled`, `setLessonMeetingUrl`.
- `src/screens/live/LessonChat.jsx` — чат обеих ролей: список + ввод, лёгкий поллинг (8с,
  STOMP-топика нет), автоскролл, self-сообщения справа.
- `src/screens/live/VideoCall.jsx` — ссылка «Подключиться» + бейдж «Демо»; учитель задаёт/
  меняет ссылку (+ на всю серию).
- `src/screens/live/TeacherTools.jsx` — учитель: селектор ученика, заметка (load/save),
  посещаемость (no-show/cancel). Активный ученик выведен вычислением, без setState-в-эффекте.
- Встроено в `LiveLessonPage` (`.live-panels`). i18n `chat.*`/`video.*`/`ttools.*` (ru/en/kk),
  стили.

## Тесты / проверка

- `liveApi.test.js` (+7): messages GET/POST, notes GET/PUT, no-show/cancel PUT,
  meeting-url PUT с тримом/null.
- UI-компоненты юнитами не покрыты (как чат/панели в web-admin) — build-проверка; вся REST-
  логика (тестируемая часть) покрыта.
- Всего **53/53** зелёных. `npm run build` ✓. lint новых файлов чист.
