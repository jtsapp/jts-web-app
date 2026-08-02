# Под-проект #5 — Зеркалирование экрана материала

Портирует screen mirroring из web-admin (`MaterialSessionSocketService` +
`material-session-monitor`): ученик транслирует свои взаимодействия с интерактивным
материалом учителю (и обратно — «презентация» учителя ученику), плюс живой фид ответов.

## Контракт (паритет с web-admin, единый бэкенд)

- **STOMP** (`useMaterialSession`), один сокет на инстанс:
  - student→teacher: `/topic/material-assignment/{aid}/mirror` + catch-up
    `/app/material-assignment/{aid}/mirror-history`
  - teacher→student: `/topic/.../teacher-mirror` + `/app/.../teacher-mirror-history`
  - живой счёт (только при sessionId): `/topic/material-session/{sid}/answers`
  - publish: `/app/material-assignment/{aid}/{mirror|teacher-mirror}`
- **postMessage-мост** (`MaterialMirrorMonitor`):
  - iframe→host: `{source:'jts-bridge', type:'mirror', selector, eventType, value}`
  - host→iframe: `{source:'jts-bridge-host', type:'mirror', ...}` (bridge реплеит)
  - URL плеера: `/student/materials/{materialId}/render?assignmentId=&mode=&access_token=[&sessionId=]`

## ✅ Исправление бага H1 (singleton-сокет)

В web-admin `MaterialSessionSocketService` — `providedIn:'root'` с единственным полем
`client`: при монтировании второго монитора (учитель смотрит двух учеников; либо student+
teacher каналы) второй `connect()` перезатирал `this.client` первого → соединения
конфликтовали. Здесь **каждый инстанс хука владеет своим `Client`** в `useEffect` —
изоляция из коробки. Покрыто тестом «isolates the socket per hook instance».

## Состав

- `src/api.js` — `materialMirrorUrl` (отдельный роут `/student/materials/{id}/render`).
- `src/screens/live/useMaterialSession.js` — изолированный per-instance STOMP: оба
  направления mirror + их catch-up, answers (при sessionId), `sendMirror`/`sendTeacherMirror`.
- `src/screens/live/MaterialMirrorMonitor.jsx` — iframe материала + postMessage-мост
  (протокол web-admin) + фид ответов (дедуп по questionId).
- i18n `mirror.*` (ru/en/kk), стили `.mirror*`.

## Граница интеграции (честно)

Монитору нужен `assignmentId` материала-задания. В `LessonSectionMaterialDto` (#4) его нет,
поэтому автоматически встроить зеркало в плеер разделов нельзя без бэкенд-поля `assignmentId`
на материалах секции (или отдельного экрана мониторинга teaching-materials). Компонент и хук
готовы к переиспользованию, как только assignmentId будет доступен. ⚠️ Токен в query —
тот же осознанный техдолг, что в #4.

## Тесты / проверка

- `useMaterialSession.test.js` (5): подписки обоих направлений + answers, catch-up-реплей,
  роутинг live/teacher/answer, publish, **изоляция per-instance (H1)**.
- Монитор (iframe/postMessage) юнитами не покрывается — как доска/материалы; build-проверка.
- Всего **49/49** зелёных. `npm run build` ✓. lint новых файлов чист.
