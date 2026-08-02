# Под-проект #4 — Разделы и материалы живого урока

Портирует «Разделы» (Edvibe-style) из web-admin `lesson-workspace` в каркас #2.
Показывается вместе с доской (#3) при статусах `IN_PROGRESS`/`PAUSED`.

## Контракт (единый бэкенд, паритет с web-admin)

- **REST** (мутирующие вызовы возвращают полный список разделов):
  `GET/POST/PATCH/DELETE /admin/lessons/{id}/sections[...]`,
  `POST|DELETE .../sections/{sid}/materials[/{smid}]`, `PATCH .../visibility?hidden=`,
  `GET /admin/lessons/{id}/materials`. Бэкенд скоупит под личность токена.
- **STOMP follow-me** (`useLessonLive`): subscribe `/topic/lesson/{id}/focus`
  (`{sectionId, materialId, senderUserId}`) и `/topic/lesson/{id}/sections-changed`
  (сигнал → reload); publish `/app/lesson/{id}/focus`. Эхо своего focus дропается.
- **Плеер материала** — `<iframe>` на `/student/lessons/{id}/materials/{mid}/render`.

## ⚠️ Токен материала в query — осознанный техдолг

Бэкенд-страница `/render` аутентифицируется `?access_token=<JWT>`. Роадмап просил
«не в query», но бэкенд не меняем → по решению пользователя взят **паритет с web-admin**
(токен в query). `api.materialRenderUrl` помечен комментарием: JWT в URL может утечь
в логи/Referer; заменить на короткоживущий тикет, когда бэкенд его даст. Отдельная
security-задача, не блокирует остальной роадмап.

## Состав

- `src/api.js` — `authPost/authPatch/authDelete` (новые хелперы) + sections/materials REST
  (`getLessonSections`, `createSection`, `renameSection`, `setSectionCompleted`,
  `deleteSection`, `getLessonMaterials`, `attach/detachSectionMaterial`,
  `setSectionMaterialHidden`) + `materialRenderUrl`.
- `src/screens/live/useLessonLive.js` — STOMP follow-me (focus + sections-changed).
- `src/screens/live/SectionsPanel.jsx` — список разделов (учитель: CRUD, завершить,
  прикрепить/открепить/скрыть материал, «Внимание» = focus классу; ученик: read-only,
  видит только не-скрытые материалы, следует за учителем) + iframe-плеер материала.
- i18n `sections.*` (ru/en/kk), стили `.sections*`.

## Не входит (по разбивке роадмапа)

- Present/`material-mirror` DOM-реплей и `material-session` зеркалирование экрана — #5.

## Тесты / проверка

- `useLessonLive.test.js` (4): подписки focus+sections-changed, publish focus, эхо-фильтр,
  доставка remote-focus и sections-changed.
- `liveApi.test.js` (+сессии): sections CRUD пути/методы/тело, visibility-квери,
  `materialRenderUrl` live/review.
- Всего **44/44** зелёных. `npm run build` ✓. lint новых файлов чист.
