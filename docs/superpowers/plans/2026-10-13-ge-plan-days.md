# План по дням общего курса — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Исполняется в той же сессии, что писала план (решение «план с готовым кодом — делать самому»), поэтому код шагов
> здесь не дублируется целиком. Для каждой задачи зафиксированы файлы, интерфейсы, тест-кейсы и команды; код —
> в коммитах ветки `feat/ge-plan` (бэкенд и веб).

**Goal:** план по дням для ученика общего курса: бэкенд раскладывает уроки курса и практику по датам, подмешивает
живые занятия и ДЗ, засчитывает выполнение по фактам. Веб показывает «Сегодня» на «Главной» и экран «План» с тремя
видами.

**Architecture:** модуль `ge` бэкенда получает чистые классы (`GePlanRules`, `GePlanBuilder`, `GePlanProgress`,
`GePlanViews`) и сервис с ручками `/mobile/ge/plan`. Минуты практики веб присылает служебной ручкой
`/integrations/web/ge-activity` в `ge_activity_days`. Веб: `src/lib/geActivity.js` на сервере, `src/ge/plan/*` на
клиенте, экраны собраны из классов IELTS под обёрткой `.ge-skin`, как в части 1.

**Tech Stack:** Spring Boot + JPA + Flyway (Java 21, JUnit 5, Mockito, AssertJ); Next.js SPA (React, vitest,
Playwright).

## Global Constraints

- Учебные дни — пн–пт. Бюджет дня — `daily_minutes` профиля (15/30/60/90, без значения — 30).
- Доли практики: тьютор 30 %, воркбук 25 %, шэдоуинг 15 %, медиа 15 %, словарь 15 %; остаток — `REMAINDER_PRIORITY` веба
  (вектор 210 → 63/53/31/31/32).
- Урок курса в плане — 30 минут; темп уроков — `D / 90` на учебный день, дробь копится от старта плана.
- Группа / индивидуально — без уроков курса; в день живого занятия практики вдвое меньше.
- Горизонт — текущая неделя + 5; прошлое не пересобирается; выполненное, начатое и перенесённое переживает пересборку.
- Выполнение: урок или минуты закрывают самую раннюю открытую задачу не дальше 7 дней вперёд.
- Пояс школы — `Asia/Almaty`. Дни у веба — UTC (как сейчас).
- IELTS не трогаем: ни файлов `src/ielts/**`, ни `ielts.css`, ни бэкенд-модуля `ielts` (только чтение и переиспользование
  классов/иконок).
- Миграция — `V328__Ge_plan.sql`.
- Ключ ручки фактов — `ge.activity.key` = `${GE_ACTIVITY_KEY:${IELTS_GRADER_KEY:}}`; пусто или не совпал — 404.
- Комментарии — по-русски, объясняют «почему». JS, не TS. Строки UI — `useI18n`, ключи `gePlan.*` (ru/en/kk).

## Файлы

Бэкенд (`.claude/worktrees/backend-ge`, ветка `feat/ge-plan`):

| Файл | Ответственность |
|---|---|
| `src/main/resources/db/migration/V328__Ge_plan.sql` | таблицы `ge_plan_tasks`, `ge_activity_days`, колонки плана в `ge_profiles` |
| `modules/ge/model/GePlanTask.java`, `GeActivityDay.java` | сущности |
| `modules/ge/model/GeProfile.java` | + `planStart`, `planKey`, `planUntil` |
| `modules/ge/repository/GePlanTaskRepository.java`, `GeActivityDayRepository.java` | репозитории |
| `modules/lessonmodule/repository/LessonModuleProgressRepository.java` | + `findCompletedAtByLevelSince` |
| `modules/ge/service/GePlanRules.java` | константы, доли, темп уроков, куски, недели |
| `modules/ge/service/GePlanBuilder.java` | раскладка недель по дням |
| `modules/ge/service/GePlanProgress.java` | `got/done` и статус по фактам |
| `modules/ge/service/GePlanViews.java` | вид задачи: своя, занятие, ДЗ |
| `modules/ge/service/GePlanService.java` | контекст, сборка/пересборка, чтение, перенос |
| `modules/ge/service/GeActivityService.java` | приём итогов дня |
| `presentation/mobile/ge/controller/GePlanController.java` | `GET /mobile/ge/plan`, `PUT …/tasks/{id}/date` |
| `presentation/common/ge/controller/GeActivityController.java` | `PUT /integrations/web/ge-activity` |
| `shared/security/SecurityConfig.java` | permitAll ручки фактов |
| `src/main/resources/application.yml` | `ge.activity.key` |
| `docs/ge/PLAN.md` | как устроен план |

Веб (`.claude/worktrees/ge-onboarding`, ветка `feat/ge-plan`):

| Файл | Ответственность |
|---|---|
| `src/lib/geActivity.js` | минуты дня из базы веба → бэкенд |
| `src/lib/db/activityTime.js`, `src/lib/db/ecosystem.js` | медиа в учёте |
| `src/app/api/profile/activity/route.js`, `src/lib/usage.js`, `src/app/api/shadowing/assess/route.js` | вызов `pushGeActivity` |
| `src/screens/{BookDetail,ListeningPage,ReadingPage,ComicReader,KaraokeTrack}.jsx` | `useTimeOnTask('media_practice')` |
| `src/api.js` | `gePlanShape`, `getGePlan`, `moveGeTask` |
| `src/ge/plan/planModel.js` | подписи, маршруты, даты, виды |
| `src/ge/plan/courseFrontier.js` | непройденные шаги тропы |
| `src/ge/plan/useGePlan.js` | загрузка плана и тропы |
| `src/ge/plan/GeTaskRow.jsx` | строка задачи |
| `src/ge/plan/GePlanViews.jsx` | роадмап, неделя, месяц, панель дня |
| `src/screens/home/GeTodayCard.jsx` | «Сегодня» на «Главной» |
| `src/screens/GePlanPage.jsx` | экран «План» |
| `src/screens/HomePage.jsx`, `src/App.jsx` | подключение |
| `src/i18n.jsx` | ключи `gePlan.*` |
| `src/demo.css`, `src/mobile/home.css` | стили |
| `tests/ge-plan.spec.js` | e2e |
| `CLAUDE.md` | раздел про план |

---

### Task 1: Бэкенд — миграция, сущности, репозитории

**Files:** V328, `GePlanTask`, `GeActivityDay` (+ `GeActivityDay.Key`), `GeProfile` (+3 поля),
`GePlanTaskRepository`, `GeActivityDayRepository`, `LessonModuleProgressRepository`.

**Interfaces — Produces:**
- `GePlanTaskRepository`: `findByUserIdOrderByScheduledDateAscIdAsc(Long)`,
  `findByUserIdAndWeekStartGreaterThanEqual(Long, LocalDate)`, `findByIdAndUserId(Long, Long)`.
- `GeActivityDayRepository extends JpaRepository<GeActivityDay, GeActivityDay.Key>`:
  `findByUserIdAndDayGreaterThanEqual(Long, LocalDate)`.
- `LessonModuleProgressRepository.findCompletedAtByLevelSince(Long userId, LanguageLevel level, LocalDateTime since)`
  → `List<LocalDateTime>` (JPQL по `p.module.level`).

- [ ] Написать миграцию по спеке (секция 2), сущности, репозитории.
- [ ] `./gradlew compileJava` — без ошибок.
- [ ] Коммит `feat(ge): таблицы плана по дням и минут практики (V328)`.

### Task 2: Бэкенд — правила и раскладка (`GePlanRules`, `GePlanBuilder`)

**Interfaces — Produces:**
- `GePlanRules`: `MODULES`, `split(int) → Map<String,Integer>`, `lessonsInWeek(int daily, int daysBefore, int daysInWeek)`,
  `chunks(int) → List<Integer>`, `monday(LocalDate)`, `studyDays(LocalDate monday, LocalDate planStart)`,
  `studyDaysBefore(LocalDate planStart, LocalDate monday)`, константы `COURSE_LESSON_MINUTES=30`,
  `SELF_STUDY_LESSON_MINUTES=90`, `HORIZON_WEEKS=5`, `LOOK_AHEAD_DAYS=7`, `DEFAULT_DAILY=30`.
- `GePlanBuilder.build(Input(planStart, fromWeek, toWeek, route, dailyMinutes, liveDays)) → List<Task(key, weekStart,
  date, kind, module, minutes)>`; ключи `c:<понедельник>:<i>`, `p:<понедельник>:<раздел>:<i>`.

Тесты `GePlanRulesTest`:
- `split(210)` = 63/53/31/31/32; `split(0)` — нули; сумма = вход для 0…500.
- `lessonsInWeek`: D=30 — недели 1, 2, 2 (накопление 5/3); D=90 — 5; D=15 — 0, затем 1; D=60 — 3, 3, 4.
- `studyDaysBefore`: старт в среду 14.10.2026 → неделя 19.10 = 3, неделя 26.10 = 8.
- `chunks`: 4 → [], 7 → [10], 15 → [15], 30 → [15, 15], 45 → [15, 15, 15].

Тесты `GePlanBuilderTest`:
- самостоятельный, D=30, старт пн 12.10: неделя 12.10 — один урок в понедельник, все задачи пн–пт, ключи уникальны.
- старт в среду — до среды задач нет.
- группа — уроков курса нет; минуты практики дня занятия меньше, чем у соседнего дня без занятия.
- раздел не повторяется в один день, пока есть день без него.
- устойчивость: неделя 19.10 из `build(12.10…26.10)` совпадает с `build(19.10…19.10)`.

- [ ] Тесты (красные) → код → `./gradlew test --tests 'kz.education.server.modules.ge.service.GePlan*'` зелёные.
- [ ] Коммит `feat(ge): раскладка плана по дням — уроки курса и практика по долям`.

### Task 3: Бэкенд — выполнение и вид задач (`GePlanProgress`, `GePlanViews`)

**Interfaces — Produces:**
- `GePlanProgress.Item(Long id, String kind, String module, LocalDate date, int minutes)`,
  `State(int got, boolean done)`, `evaluate(List<Item>, List<LocalDate> courseDays, Map<LocalDate, Map<String,Integer>>
  activity, LocalDate planStart) → Map<Long, State>`, `status(LocalDate date, State, LocalDate today)`.
- `GePlanViews.own(GePlanTask, State, LocalDate today)`, `live(LessonOccurrenceResponse, LocalDate today)` (null —
  отменено/пробное), `homework(HomeworkAssignment, LocalDate today)` (null — отозвано) → `Map<String,Object>` с ключами
  `id, key, date, originalDate, kind, module, minutes, got, status, overdue, movable, title, extra`.

Тесты `GePlanProgressTest`: урок во вторник закрывает просроченную задачу понедельника; урок за 8+ дней до задачи её
не закрывает; 6 минут → `got 6`, `in_progress`; 20 минут на две задачи по 15 → первая done, вторая got 5; минуты до
старта плана не считаются; статусы planned / available / in_progress / completed.

Тесты `GePlanViewsTest`: занятие отменено / пробное → null; ATTENDED → completed; прошедшее без посещения → overdue;
NO_SHOW при COMPLETED уроке — не выполнено; ДЗ SUBMITTED → completed, NEEDS_REVISION → open, без срока — день выдачи.

- [ ] Тесты → код → зелёные. Коммит `feat(ge): выполнение плана по фактам и вид занятий и ДЗ`.

### Task 4: Бэкенд — сервис и ручки плана

**Interfaces — Produces:** `GePlanService.plan(Long userId, LocalDate from, LocalDate to) → Map` (поля спеки),
`GePlanService.move(Long userId, Long taskId, LocalDate date) → Map`; `GET /mobile/ge/plan?from&to`,
`PUT /mobile/ge/plan/tasks/{id}/date {date}`. Поле `Clock clock` (не final) — для тестов.

Тесты `GePlanServiceTest` (Mockito):
- без анкеты → `state = no_onboarding`, задачи не пишутся; цель достигнута → `reached`.
- первое чтение: `plan_start = сегодня`, `saveAll` получает задачи с датой ≥ сегодня, `plan_until` = воскресенье
  через 5 недель, `plan_key = self_study|30|A2`.
- смена минут: нетронутая будущая задача, которой нет в новом плане, удаляется; перенесённая — остаётся.
- `move`: в прошлое → 400; за `plan_until` → 400; иначе `movedBy` и дата записаны.
- `liveMissing`: группа без занятий → true.

- [ ] Тесты → код → зелёные. Коммит `feat(ge): план по дням — сборка, чтение и перенос задач`.

### Task 5: Бэкенд — ручка фактов

**Interfaces — Produces:** `PUT /integrations/web/ge-activity`, заголовок `X-Ge-Activity-Key`, тело `{ userId, day,
minutes: {раздел: минуты} }` → 204; `GeActivityService.save(DayRequest)`.

Тесты: `GeActivityServiceTest` — неизвестный раздел, отрицательное, день за окном (−60 / +1) → BadRequest; нормальный
запрос пишет строку на раздел (upsert). `GeActivityControllerTest` — ключ пуст → 404; неверный → 404; верный → 204 и
вызов сервиса.

- [ ] Тесты → код, `SecurityConfig` (permitAll PUT), `application.yml`. Зелёные.
- [ ] `docs/ge/PLAN.md`. Полный прогон модуля `./gradlew test --tests 'kz.education.server.modules.ge.*' --tests
  'kz.education.server.presentation.common.ge.*'`, затем `./gradlew compileJava compileTestJava`.
- [ ] Коммит `feat(ge): приём минут практики от jts-web-app`.

### Task 6: Веб — факты практики на бэкенд

**Interfaces — Produces:** `src/lib/geActivity.js`: `GE_MODULES`, `geActivityKey(env)`, `backendUserId(profileId)`,
`dayMinutes(raw)`, `loadDay(profileId, day, sql)`, `pushGeActivity(profileId, day, opts)` → `{ sent, reason? }`.

Тесты `src/lib/geActivity.test.js`: `backendUserId('user-42') = 42`, device-id → null; без ключа и для анонима —
`fetch` не зовётся; `dayMinutes` (секунды тьютора с пулом, кредиты шэдоуинга × 30 с, медиа); тело и заголовок запроса;
ошибка сети → `{ sent: false }` без исключения.

Правки: `CLIENT_TRACKED_MODULES` += `media_practice`; `TRACKED.media_practice = 'measured'`, сводка берёт его из
`activity_time` (поправить `ecosystem.test.js`, `activityTime`-тесты); `after(() => pushGeActivity(...))` в роуте
активности и оценке шэдоуинга; `recordSession` берёт `to_char(day)` и шлёт итог дня; `useTimeOnTask('media_practice',
{ token })` в пяти экранах медиа.

- [ ] Тесты → код → `npx vitest run src/lib --exclude '.claude/**'` зелёные.
- [ ] Коммит `feat(ge): минуты практики уходят в план на бэкенд; медиа считается по времени`.

### Task 7: Веб — модель плана и загрузка

**Interfaces — Produces:**
- `api.js`: `gePlanShape(raw)`, `getGePlan(token, {from, to})` (null при ошибке/не-плане), `moveGeTask(token, id, date)`.
- `planModel.js`: `taskRoute(task, level) → {to, payload?}`, `taskTitle(t, task, courseTitle)`, `taskShort(t, task)`,
  `plateOf(task)`, `courseTitles(tasks, frontier) → {id: title}`, `todayView(plan) → {tasks, ahead}`, `addDays`, `mondayOf`,
  `weekDates(monday)`, `monthGrid`, `shiftMonth`, `byDate`, `dayStatus`, `dayMinutes`, `roadWeek(tasks, monday, today)`,
  `weekNumber(monday, planStart)`.
- `courseFrontier.js`: `openNodes(trail, doneCodes)`, `loadCourseFrontier(level, token)`.
- `useGePlan(token, {enabled, level}) → {status: 'loading'|'ready'|'none', plan, frontier, reload}`.

Тесты `planModel.test.js`, `courseFrontier.test.js`, `api.gePlan.test.js`: маршруты всех видов; подписи; k-я открытая
задача курса ↔ k-й непройденный шаг; «Сегодня» с просроченными этой недели и «дальше по плану»; сетка месяца;
`gePlanShape({})` → null.

- [ ] Тесты → код → зелёные. Коммит `feat(ge): модель плана на клиенте — подписи, маршруты, тропа курса`.

### Task 8: Веб — «Сегодня» на «Главной»

**Files:** `GeTaskRow.jsx`, `GeTodayCard.jsx`, `HomePage.jsx`, `i18n.jsx`, `demo.css`, `mobile/home.css`; моки
`getGePlan`/`getLessonModules` в тестах «Главной».

Тесты `GeTodayCard.test.jsx` / `HomePage.ge.test.jsx`: с планом `ready` вместо «Что сделать сегодня» — карточка
«Сегодня» с задачами, «Начать» зовёт `onNav` с маршрутом задачи, «Весь план» → `onNav('ge-plan')`; плашка
`liveMissing`; без плана (null) — прежняя карточка.

- [ ] Тесты → код → зелёные. Коммит `feat(ge): «Сегодня» на «Главной» по плану`.

### Task 9: Веб — экран «План»

**Files:** `GePlanViews.jsx`, `GePlanPage.jsx`, `App.jsx` (`'ge-plan'` в списке экранов, ветка, `handleNav('ge-plan')`,
`handleNav('course', {level})` → королевство уровня), i18n, стили.

Тесты `GePlanPage.test.jsx`: переключатель видов; неделя показывает задачи по дням; перенос зовёт `moveGeTask` и
перечитывает план; состояния `no_route` и т. п. — пустой экран с кнопкой.

- [ ] Тесты → код → зелёные. Коммит `feat(ge): экран «План» — две недели, неделя, месяц`.

### Task 10: Проверка, e2e, документация

- [ ] `tests/ge-plan.spec.js` (моки `/mobile/ge/*`): «Сегодня» → «Весь план» → неделя → перенос (PUT пойман).
- [ ] `npm run lint`, `npx vitest run --exclude '.claude/**'`, `npm run build` (во временном worktree, см. память
  build-alongside-dev-server), e2e по одному воркеру с `E2E_PORT`.
- [ ] Ручной прогон `?screen=home` и `?screen=ge-plan` в браузере (моки или dev-бэкенд), скриншоты 1440/390.
- [ ] `CLAUDE.md`: абзац «План по дням общего курса». Коммит `docs(ge): план по дням в CLAUDE.md`.
- [ ] PR бэкенда → develop, затем PR веба → develop (веб после бэкенда).
