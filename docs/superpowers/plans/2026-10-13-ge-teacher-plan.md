# Часть 3: анкета и план GE у преподавателя — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** преподаватель в web-admin видит анкету и план по дням ученика общего курса и ставит в план свои задачи
(урок курса, практика по минутам, материал Практики, своё задание). Ученик видит их синей меткой. Цель в карточке
преподавателя берётся из профиля бэкенда.

**Architecture:** задачи преподавателя — те же строки `ge_plan_tasks` с `origin = 'teacher'` (V329), как у IELTS.
Новые ручки `/admin/teacher-ge` (GeTeacherService), отметка Практики через ту же ручку, что у домашек. web-admin
получает вкладки «План» и «Анкета» в карточке ученика. Веб показывает метку и комментарий, кнопку «Отметить
выполненным» и снимает зеркало цели в `level_goal`.

**Tech Stack:** Spring Boot 3 / JPA / Flyway / JUnit 5 + Mockito (backend); Angular 17 standalone + Material +
ngx-translate + Karma/Jasmine (web-admin); Next.js + React + vitest + Playwright (jts-web-app).

**Спека:** `docs/superpowers/specs/2026-10-13-ge-teacher-plan-design.md`.

## Global Constraints

- Ветки и worktree: backend — `.claude/worktrees/backend-ge-teacher` (`feat/ge-teacher` от `origin/feat/ge-plan`);
  web-admin — `.claude/worktrees/admin-ge-teacher` (`feat/ge-teacher` от `origin/develop`); веб —
  `.claude/worktrees/ge-teacher` (`feat/ge-teacher` от `origin/feat/ge-plan`). Все пути ниже — от корня своего worktree.
- IELTS не трогать (ни бэкенд-модуль `ielts`, ни `src/ielts/**` веба, ни `ielts-*` web-admin): только читать и
  копировать идиомы.
- Комментарии на русском и объясняют «почему». JavaScript в вебе, не TypeScript.
- Миграция — `V329__Ge_teacher_tasks.sql`. Перед PR сверить номер: `git ls-tree -r --name-only origin/develop` и все
  `origin/*` по `db/migration`.
- Бэкенд строгий к лишним полям JSON — выкатка: бэкенд → web-admin → веб.
- Виды задачи преподавателя: `course | practice | unit | custom`. Разделы практики: `ai_tutor, workbooks, shadowing,
  media_practice, vocabulary_sr`. Разделы материала: `grammar, reading, writing, listening, shadowing, workbooks,
  situations`. Минуты 1…600. Название до 200, комментарий до 2000. Дата — сегодня (Алматы) … +26 недель.
- Docker на машине нет: Testcontainers-тесты бэкенда не гоняются. Гонять только юнит-тесты модулей (`-Dtest=...`).

---

## Часть A — бэкенд

### Task A1: миграция V329 и поля задачи

**Files:**
- Create: `src/main/resources/db/migration/V329__Ge_teacher_tasks.sql`
- Modify: `src/main/java/kz/education/server/modules/ge/model/GePlanTask.java`
- Modify: `src/main/java/kz/education/server/modules/ge/repository/GePlanTaskRepository.java`
- Modify: `src/main/java/kz/education/server/modules/lessonmodule/repository/LessonModuleProgressRepository.java`

**Interfaces:**
- Produces: `GePlanTask.origin/extra/createdBy/doneAt/doneBy`, `GePlanTask.isTeacher()`;
  `GePlanTaskRepository.findByUserIdAndOriginAndKindAndDoneAtIsNull(Long, String, String)`;
  `LessonModuleProgressRepository.findLevelCodes(Long userId) : List<Object[]>` (`[LanguageLevel, String code]`).

- [ ] **Step 1: миграция**

```sql
-- Задачи преподавателя в плане общего курса (дизайн jts-web-app docs/superpowers/specs/2026-10-13-ge-teacher-plan-design.md).
--
-- Лежат в тех же ge_plan_tasks, что и задачи программы (origin = teacher), как у IELTS (ielts_plan_tasks, V317):
-- «Сегодня», неделя и месяц ученика читают одни строки, а пересборка плана трогает только origin = programme.
-- kind: course и practice — как у программы; unit — материал Практики (адрес юнита в extra), custom — своё задание
-- текстом. done_at — отметка тех, что по фактам не считаются: unit (отметка Практики или преподаватель) и custom
-- (ученик или преподаватель).
--
-- Имя ограничения — автоматическое имя Postgres для inline-CHECK из V328. Другое имя уронит миграцию, а не оставит
-- старый CHECK молча.
ALTER TABLE ge_plan_tasks DROP CONSTRAINT ge_plan_tasks_kind_check;
ALTER TABLE ge_plan_tasks ADD CONSTRAINT ge_plan_tasks_kind_check CHECK (kind IN ('course', 'practice', 'unit', 'custom'));
ALTER TABLE ge_plan_tasks
    ADD COLUMN origin     VARCHAR(10) NOT NULL DEFAULT 'programme',
    ADD COLUMN extra      JSONB       NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN created_by BIGINT,
    ADD COLUMN done_at    TIMESTAMP,
    ADD COLUMN done_by    BIGINT;
ALTER TABLE ge_plan_tasks ADD CONSTRAINT ge_plan_tasks_origin_check CHECK (origin IN ('programme', 'teacher'));
```

- [ ] **Step 2: поля сущности** — в `GePlanTask` после `movedBy` (импорты `org.hibernate.annotations.JdbcTypeCode`,
  `org.hibernate.type.SqlTypes`, `java.util.HashMap`, `java.util.Map`), javadoc класса дополнить строкой про V329:

```java
    /** Кто поставил задачу (V329): programme — сборка плана, teacher — преподаватель из web-admin. */
    @Column(nullable = false, length = 10)
    private String origin = "programme";

    /** Подписи и адрес задачи преподавателя: название, комментарий, автор, урок курса или юнит Практики. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> extra = new HashMap<>();

    @Column(name = "created_by")
    private Long createdBy;

    /** Отметка выполнения тех задач, что не считаются по фактам: unit и custom. */
    @Column(name = "done_at")
    private LocalDateTime doneAt;

    @Column(name = "done_by")
    private Long doneBy;

    public boolean isTeacher() {
        return "teacher".equals(origin);
    }
```

- [ ] **Step 3: репозитории**

`GePlanTaskRepository`:
```java
    /** Открытые задачи преподавателя одного вида — для отметки «юнит Практики пройден». */
    List<GePlanTask> findByUserIdAndOriginAndKindAndDoneAtIsNull(Long userId, String origin, String kind);
```
`LessonModuleProgressRepository`:
```java
    /**
     * Пройденные уроки ученика с уровнем модуля — для уроков, заданных преподавателем в плане общего курса: такую задачу
     * закрывает отметка именно её урока ({@code [LanguageLevel, lesson_code]}).
     */
    @Query("SELECT p.module.level, p.lessonCode FROM LessonModuleProgress p WHERE p.user.id = :userId")
    List<Object[]> findLevelCodes(@Param("userId") Long userId);
```

- [ ] **Step 4: компиляция** — `./mvnw -q -DskipTests compile` (или `mvnw.cmd`). Ожидается: BUILD SUCCESS.
- [ ] **Step 5: коммит** — `feat(ge): V329 — задачи преподавателя в ge_plan_tasks`.

### Task A2: подсчёт выполнения задач преподавателя

**Files:**
- Modify: `src/main/java/kz/education/server/modules/ge/service/GePlanProgress.java`
- Test: `src/test/java/kz/education/server/modules/ge/service/GePlanProgressTest.java`

**Interfaces:**
- Produces: `GePlanProgress.Item(Long id, String kind, String module, LocalDate date, int minutes, boolean teacher,
  String level, String lessonCode, LocalDate from, boolean marked)` + прежний 5-аргументный конструктор;
  `evaluate(items, courseDays, Map<String, Set<String>> courseCodes, activity, planStart)` + прежняя 4-аргументная.

- [ ] **Step 1: тесты** (в `GePlanProgressTest`, импорт `java.util.Set`):

```java
    static GePlanProgress.Item teacher(long id, String kind, String module, LocalDate d, int minutes, String level, String code,
                                       LocalDate from, boolean marked) {
        return new GePlanProgress.Item(id, kind, module, d, minutes, true, level, code, from, marked);
    }

    @Test
    void aTeacherLessonClosesOnlyByItsOwnCode() {
        var mine = teacher(1, "course", null, MON, 30, "A1", "L7", MON, false);
        var programme = course(2, MON);
        var st = GePlanProgress.evaluate(List.of(mine, programme), List.of(MON), Map.of("A1", Set.of("L3")), Map.of(), MON);
        // отметка урока L3 закрыла задачу программы, а урок преподавателя ждёт свой L7
        assertThat(st.get(1L).done()).isFalse();
        assertThat(st.get(2L).done()).isTrue();
        var own = GePlanProgress.evaluate(List.of(mine), List.of(), Map.of("A1", Set.of("L7")), Map.of(), MON);
        assertThat(own.get(1L)).isEqualTo(new GePlanProgress.State(1, true));
    }

    @Test
    void teacherPracticeTakesMinutesOnlyFromItsCreationDay() {
        var mine = teacher(1, "practice", "ai_tutor", MON.plusDays(2), 20, null, null, MON.plusDays(1), false);
        var st = GePlanProgress.evaluate(List.of(mine), List.of(), Map.of(),
                Map.of(MON, Map.of("ai_tutor", 30), MON.plusDays(1), Map.of("ai_tutor", 5)), MON);
        // понедельник был до задачи — его минуты не в счёт
        assertThat(st.get(1L)).isEqualTo(new GePlanProgress.State(5, false));
    }

    @Test
    void onTheSameDayTheTeacherTaskFillsFirst() {
        var programme = practice(1, "ai_tutor", MON, 15);
        var mine = teacher(2, "practice", "ai_tutor", MON, 15, null, null, MON, false);
        var st = GePlanProgress.evaluate(List.of(programme, mine), List.of(), Map.of(), Map.of(MON, Map.of("ai_tutor", 20)), MON);
        assertThat(st.get(2L)).isEqualTo(new GePlanProgress.State(15, true));
        assertThat(st.get(1L)).isEqualTo(new GePlanProgress.State(5, false));
    }

    @Test
    void unitAndCustomCloseByTheMark() {
        var st = GePlanProgress.evaluate(List.of(teacher(1, "unit", null, MON, 20, null, null, MON, true),
                teacher(2, "custom", null, MON, 20, null, null, MON, false)), List.of(), Map.of(), Map.of(), MON);
        assertThat(st.get(1L)).isEqualTo(new GePlanProgress.State(1, true));
        assertThat(st.get(2L)).isEqualTo(new GePlanProgress.State(0, false));
    }
```

- [ ] **Step 2: прогон** — `./mvnw -q test -Dtest=GePlanProgressTest`. Ожидается: компиляция падает (нет 10-аргументного
  `Item` и 5-аргументной `evaluate`).
- [ ] **Step 3: реализация** — заменить `Item` и `evaluate`:

```java
    /**
     * Задача для подсчёта. teacher, level/lessonCode, from и marked — у задач преподавателя (V329): урок курса закрывается
     * только своим кодом, практика берёт минуты с дня создания, unit и custom закрываются отметкой.
     */
    public record Item(Long id, String kind, String module, LocalDate date, int minutes,
                       boolean teacher, String level, String lessonCode, LocalDate from, boolean marked) {
        /** Задача программы — как в части 2. */
        public Item(Long id, String kind, String module, LocalDate date, int minutes) {
            this(id, kind, module, date, minutes, false, null, null, null, false);
        }
    }

    public static Map<Long, State> evaluate(List<Item> items, List<LocalDate> courseDays, Map<LocalDate, Map<String, Integer>> activity,
                                            LocalDate planStart) {
        return evaluate(items, courseDays, Map.of(), activity, planStart);
    }

    /** courseCodes — пройденные уроки по уровням ("A1" → {"L3", "T1"}): ими закрываются уроки, заданные преподавателем. */
    public static Map<Long, State> evaluate(List<Item> items, List<LocalDate> courseDays, Map<String, Set<String>> courseCodes,
                                            Map<LocalDate, Map<String, Integer>> activity, LocalDate planStart) {
        Map<Long, Integer> got = new HashMap<>();
        // в один день задача преподавателя раньше задачи программы: это просьба сверх программы, как у IELTS
        List<Item> sorted = items.stream()
                .sorted(Comparator.comparing(Item::date).thenComparing(i -> i.teacher() ? 0 : 1)
                        .thenComparing(Item::id, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        for (LocalDate d : courseDays.stream().filter(x -> planStart == null || !x.isBefore(planStart)).sorted().toList()) {
            for (Item t : sorted) {
                if (t.date().isAfter(d.plusDays(GePlanRules.LOOK_AHEAD_DAYS))) break;
                // урок преподавателя — конкретный урок тропы, его закрывает только свой код (ниже), а не любой урок
                if (!"course".equals(t.kind()) || t.teacher() || got.getOrDefault(t.id(), 0) >= 1) continue;
                got.put(t.id(), 1);
                break;
            }
        }
        for (Item t : items) {
            if (t.teacher() && "course".equals(t.kind()) && t.level() != null
                    && courseCodes.getOrDefault(t.level().toUpperCase(), Set.of()).contains(t.lessonCode())) got.put(t.id(), 1);
        }

        for (LocalDate d : activity.keySet().stream().filter(x -> planStart == null || !x.isBefore(planStart)).sorted().toList()) {
            for (Map.Entry<String, Integer> e : activity.get(d).entrySet()) {
                int avail = e.getValue() == null ? 0 : Math.max(0, e.getValue());
                for (Item t : sorted) {
                    if (avail <= 0 || t.date().isAfter(d.plusDays(GePlanRules.LOOK_AHEAD_DAYS))) break;
                    if (!"practice".equals(t.kind()) || !e.getKey().equals(t.module())) continue;
                    // задача преподавателя не берёт минуты дней до своего появления: о тех тренировках он не просил
                    if (t.from() != null && d.isBefore(t.from())) continue;
                    int have = got.getOrDefault(t.id(), 0);
                    if (have >= t.minutes()) continue;
                    int take = Math.min(avail, t.minutes() - have);
                    got.put(t.id(), have + take);
                    avail -= take;
                }
            }
        }

        Map<Long, State> out = new HashMap<>();
        for (Item t : items) {
            if ("unit".equals(t.kind()) || "custom".equals(t.kind())) {
                out.put(t.id(), new State(t.marked() ? 1 : 0, t.marked()));
                continue;
            }
            int g = got.getOrDefault(t.id(), 0);
            out.put(t.id(), new State(g, "course".equals(t.kind()) ? g >= 1 : g >= t.minutes()));
        }
        return out;
    }
```
  Импорт `java.util.Set`. Javadoc класса — добавить пункт про задачи преподавателя.
- [ ] **Step 4: прогон** — `./mvnw -q test -Dtest=GePlanProgressTest` → все PASS (старые тоже).
- [ ] **Step 5: коммит** — `feat(ge): выполнение задач преподавателя — урок по коду, минуты с дня создания, отметка`.

### Task A3: план читает задачи преподавателя, ученик отмечает своё задание

**Files:**
- Modify: `src/main/java/kz/education/server/modules/ge/service/GePlanService.java`
- Modify: `src/main/java/kz/education/server/modules/ge/service/GePlanViews.java`
- Modify: `src/main/java/kz/education/server/presentation/mobile/ge/controller/GePlanController.java`
- Test: `src/test/java/kz/education/server/modules/ge/service/GePlanServiceTest.java`

**Interfaces:**
- Consumes: A1, A2.
- Produces (GePlanService): `public String state(Long userId)`; `public Map<String, List<String>> courseDone(Long userId)`;
  `public Map<String, Object> moveAs(Long userId, Long taskId, LocalDate date, Long actorId)`;
  `public Map<String, Object> markDone(Long userId, Long taskId, boolean done)`;
  `Map<String, Object> mark(GePlanTask t, boolean done, Long actorId)` (package-private);
  `static Map<String, Set<String>> codes(List<Object[]> rows)`; `LocalDate today()` (уже есть, package-private).
- Produces (GePlanViews): `ORDER = [live, homework, teacher, course, practice]`, `static String orderKey(Map)`,
  у каждой строки поле `origin` (`programme | teacher | null`).
- Produces (HTTP): `PUT /mobile/ge/plan/tasks/{id}/done` `{done}`.

- [ ] **Step 1: тесты** — в `GePlanServiceTest.setUp()` добавить
  `when(moduleProgress.findLevelCodes(7L)).thenReturn(List.of());`, затем:

```java
    static GePlanTask teacherRow(long id, LocalDate date, String kind) {
        GePlanTask t = row(id, "tc:" + id, date, "practice".equals(kind) ? "ai_tutor" : null);
        t.setKind(kind);
        t.setOrigin("teacher");
        t.setMinutes(20);
        t.setCreatedAt(WED.atTime(9, 0));
        t.getExtra().put("title", "Посмотри серию");
        return t;
    }

    @Test
    void theRebuildNeverTouchesTeacherTasks() {
        GeProfile p = profile("self_study", 60);
        p.setPlanStart(LocalDate.of(2026, 10, 12));
        p.setPlanKey("self_study|30");
        p.setPlanUntil(LocalDate.of(2026, 11, 22));
        GePlanTask mine = teacherRow(1, WED.plusDays(1), "custom");
        stored.add(mine);

        Map<String, Object> out = service.plan(7L, null, null);

        assertThat(stored).contains(mine);
        assertThat(mine.getScheduledDate()).isEqualTo(WED.plusDays(1));
        Map<String, Object> v = ((List<Map<String, Object>>) out.get("tasks")).stream()
                .filter(m -> Long.valueOf(1).equals(m.get("id"))).findFirst().orElseThrow();
        assertThat(v.get("origin")).isEqualTo("teacher");
        assertThat(v.get("movable")).isEqualTo(false);
        assertThat(v.get("title")).isEqualTo("Посмотри серию");
    }

    @Test
    void aStudentCannotMoveATeacherTask() {
        profile("self_study", 30);
        GePlanTask mine = teacherRow(1, WED.plusDays(1), "practice");
        when(tasks.findByIdAndUserId(1L, 7L)).thenReturn(Optional.of(mine));
        assertThatThrownBy(() -> service.move(7L, 1L, WED.plusDays(2))).isInstanceOf(BadRequestException.class);
    }

    @Test
    void aStudentMarksOnlyTheTeachersOwnTask() {
        profile("self_study", 30);
        GePlanTask custom = teacherRow(1, WED, "custom");
        GePlanTask lesson = teacherRow(2, WED, "course");
        when(tasks.findByIdAndUserId(1L, 7L)).thenReturn(Optional.of(custom));
        when(tasks.findByIdAndUserId(2L, 7L)).thenReturn(Optional.of(lesson));
        when(tasks.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> v = service.markDone(7L, 1L, true);
        assertThat(custom.getDoneAt()).isNotNull();
        assertThat(custom.getDoneBy()).isEqualTo(7L);
        assertThat(v.get("status")).isEqualTo("completed");
        assertThatThrownBy(() -> service.markDone(7L, 2L, true)).isInstanceOf(BadRequestException.class);

        service.markDone(7L, 1L, false);
        assertThat(custom.getDoneAt()).isNull();
    }

    @Test
    void courseDoneGroupsPassedLessonsByLevel() {
        when(moduleProgress.findLevelCodes(7L)).thenReturn(List.of(
                new Object[]{LanguageLevel.A1, "L2"}, new Object[]{LanguageLevel.A1, "L1"}, new Object[]{LanguageLevel.A2, "T1"}));
        assertThat(service.courseDone(7L)).isEqualTo(Map.of("A1", List.of("L1", "L2"), "A2", List.of("T1")));
    }
```

- [ ] **Step 2: прогон** — `./mvnw -q test -Dtest=GePlanServiceTest` → компиляция падает (`markDone`, `courseDone`).
- [ ] **Step 3: реализация `GePlanViews`** — `ORDER`, `orderKey`, новый `own`, `origin` в `row`:

```java
    /** Порядок внутри дня: занятие, ДЗ, задача преподавателя, урок курса, практика. */
    public static final List<String> ORDER = List.of("live", "homework", "teacher", "course", "practice");

    /** Ключ порядка: у задачи преподавателя kind любой (урок, практика, материал, своё), а место у неё одно. */
    public static String orderKey(Map<String, Object> m) {
        return "teacher".equals(m.get("origin")) ? "teacher" : String.valueOf(m.get("kind"));
    }

    public static Map<String, Object> own(GePlanTask t, GePlanProgress.State s, LocalDate today) {
        boolean overdue = !s.done() && t.getScheduledDate().isBefore(today);
        boolean teacher = t.isTeacher();
        Map<String, Object> extra = teacher && t.getExtra() != null ? new LinkedHashMap<>(t.getExtra()) : new LinkedHashMap<>();
        Object title = extra.get("title");
        // задачу преподавателя ученик не переносит: день выбрал преподаватель
        Map<String, Object> m = row(t.getId(), t.getTaskKey(), t.getScheduledDate(), t.getOriginalDate(), t.getKind(), t.getModule(),
                t.getMinutes(), s.got(), GePlanProgress.status(t.getScheduledDate(), s, today), overdue, !s.done() && !teacher,
                title == null ? null : String.valueOf(title), extra);
        m.put("origin", teacher ? "teacher" : "programme");
        return m;
    }
```
  В `row(...)` последней строкой перед `return m;` — `m.put("origin", null);` (у занятий и ДЗ источника нет).
- [ ] **Step 4: реализация `GePlanService`**:
  - `Ctx` получает поле `Map<String, Set<String>> courseCodes` после `courseDays`; оба `new Ctx(...)` в `context()`
    обновить: неготовый план — `Map.of()`, готовый — `codes(moduleProgress.findLevelCodes(userId))`.
  - Методы:

```java
    /** Пройденные уроки по уровням: "A1" → {"L3", "T1"}. Строки запроса — [LanguageLevel, код урока]. */
    static Map<String, Set<String>> codes(List<Object[]> rows) {
        Map<String, Set<String>> out = new HashMap<>();
        for (Object[] r : rows == null ? List.<Object[]>of() : rows) {
            if (r == null || r.length < 2 || r[0] == null || r[1] == null) continue;
            out.computeIfAbsent(String.valueOf(r[0]).toUpperCase(), k -> new HashSet<>()).add(String.valueOf(r[1]));
        }
        return out;
    }

    static GePlanProgress.Item item(GePlanTask t) {
        if (!t.isTeacher()) return new GePlanProgress.Item(t.getId(), t.getKind(), t.getModule(), t.getScheduledDate(), t.getMinutes());
        Map<String, Object> x = t.getExtra() == null ? Map.of() : t.getExtra();
        // день создания — в часах сервера, как и дни минут практики, которые присылает веб (UTC): сравниваются одни сутки
        LocalDate from = t.getCreatedAt() == null ? null : t.getCreatedAt().toLocalDate();
        return new GePlanProgress.Item(t.getId(), t.getKind(), t.getModule(), t.getScheduledDate(), t.getMinutes(), true,
                x.get("level") == null ? null : String.valueOf(x.get("level")),
                x.get("lessonCode") == null ? null : String.valueOf(x.get("lessonCode")), from, t.getDoneAt() != null);
    }

    static List<GePlanProgress.Item> items(List<GePlanTask> list) {
        return list.stream().map(GePlanService::item).toList();
    }

    Map<Long, GePlanProgress.State> evaluate(List<GePlanTask> list, Ctx c) {
        return GePlanProgress.evaluate(items(list), c.courseDays(), c.courseCodes(), c.activity(), c.profile().getPlanStart());
    }

    /** Состояние плана без сборки — для проверок кабинета преподавателя. */
    @Transactional(readOnly = true)
    public String state(Long userId) {
        User user = users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("Пользователь не найден"));
        String level = user.getLanguageLevel() == null ? null : user.getLanguageLevel().name();
        return stateOf(profiles.findById(userId).orElse(null), level);
    }

    /** Пройденные уроки по уровням — диалог преподавателя выключает их в выборе урока. */
    @Transactional(readOnly = true)
    public Map<String, List<String>> courseDone(Long userId) {
        Map<String, List<String>> out = new TreeMap<>();
        codes(moduleProgress.findLevelCodes(userId)).forEach((k, v) -> out.put(k, v.stream().sorted().toList()));
        return out;
    }
```
  - `sync()`: первые строки заменить на

```java
        List<GePlanTask> all = tasks.findByUserIdAndWeekStartGreaterThanEqual(userId, fromWeek);
        // минуты делятся между задачами программы и преподавателя, поэтому состояние считается по всем строкам, а
        // трогается только программа: задачи преподавателя пересборка не создаёт, не двигает и не удаляет (как у IELTS)
        Map<Long, GePlanProgress.State> st = evaluate(all, c);
        List<GePlanTask> existing = all.stream().filter(t -> !t.isTeacher()).toList();
```
    (дальше без изменений: `byKey`, `keep`, `save`, `drop` строятся по `existing`).
  - Сортировка в `plan()`: `.thenComparing(m -> GePlanViews.ORDER.indexOf(GePlanViews.orderKey(m)))`.
  - `move` → делегат, новый `moveAs`, отметки:

```java
    /** Перенос своей задачи учеником. */
    @Transactional
    public Map<String, Object> move(Long userId, Long taskId, LocalDate date) {
        return moveAs(userId, taskId, date, userId);
    }

    /**
     * Перенос задачи программы — учеником или преподавателем из web-admin (в moved_by ложится, кто перенёс). Задача
     * преподавателя сюда не идёт: её день меняет он сам правкой задачи.
     */
    @Transactional
    public Map<String, Object> moveAs(Long userId, Long taskId, LocalDate date, Long actorId) {
        if (date == null) throw new BadRequestException("Нужна дата");
        GePlanTask t = tasks.findByIdAndUserId(taskId, userId).orElseThrow(() -> new ResourceNotFoundException("Нет такой задачи"));
        if (t.isTeacher()) throw new BadRequestException("Задачу преподавателя переносит преподаватель");
        Ctx c = context(userId);
        if (!"ready".equals(c.state())) throw new BadRequestException("Плана нет");
        if (date.isBefore(c.today())) throw new BadRequestException("Перенести можно на сегодня или позже");
        if (c.profile().getPlanUntil() != null && date.isAfter(c.profile().getPlanUntil()))
            throw new BadRequestException("Дата за пределами плана");
        if (evaluate(tasks.findByUserIdOrderByScheduledDateAscIdAsc(userId), c).getOrDefault(t.getId(), GePlanProgress.State.NONE).done())
            throw new BadRequestException("Задача уже выполнена");
        t.setScheduledDate(date);
        t.setMovedBy(actorId);
        tasks.save(t);
        GePlanProgress.State s = evaluate(tasks.findByUserIdOrderByScheduledDateAscIdAsc(userId), c).getOrDefault(t.getId(), GePlanProgress.State.NONE);
        return GePlanViews.own(t, s, c.today());
    }

    /** Ученик отмечает своё задание преподавателя (custom). Материал Практики закрывает сама Практика. */
    @Transactional
    public Map<String, Object> markDone(Long userId, Long taskId, boolean done) {
        GePlanTask t = tasks.findByIdAndUserId(taskId, userId).orElseThrow(() -> new ResourceNotFoundException("Нет такой задачи"));
        if (!t.isTeacher() || !"custom".equals(t.getKind()))
            throw new BadRequestException("Отметить вручную можно только своё задание преподавателя");
        return mark(t, done, userId);
    }

    /** Отметка unit/custom. Их состояние зависит только от done_at, поэтому весь план не пересчитывается. */
    Map<String, Object> mark(GePlanTask t, boolean done, Long actorId) {
        t.setDoneAt(done ? LocalDateTime.now() : null);
        t.setDoneBy(done ? actorId : null);
        tasks.save(t);
        GePlanProgress.State s = GePlanProgress.evaluate(items(List.of(t)), List.of(), Map.of(), Map.of(), null)
                .getOrDefault(t.getId(), GePlanProgress.State.NONE);
        return GePlanViews.own(t, s, today());
    }
```
  Импорт `java.util.TreeMap`. Javadoc класса — строка: «задачи преподавателя (origin = teacher, V329) читаются
  вместе со своими, пересборка их не трогает».
- [ ] **Step 5: ручка ученика** — в `GePlanController`:

```java
    public record DoneRequest(boolean done) {
    }

    @PutMapping("/tasks/{id}/done")
    @Operation(summary = "Mark my teacher's own task (kind custom) done or undone")
    public Map<String, Object> done(@PathVariable Long id, @RequestBody DoneRequest r) {
        return service.markDone(securityUtils.userId(), id, r.done());
    }
```
- [ ] **Step 6: прогон** — `./mvnw -q test -Dtest='GePlan*Test'` → PASS.
- [ ] **Step 7: коммит** — `feat(ge): план читает задачи преподавателя; ученик отмечает своё задание`.

### Task A4: кабинет преподавателя `/admin/teacher-ge`

**Files:**
- Create: `src/main/java/kz/education/server/modules/ge/service/GeTeacherService.java`
- Create: `src/main/java/kz/education/server/presentation/admin/ge/controller/TeacherGeController.java`
- Modify: `src/main/java/kz/education/server/shared/security/SecurityConfig.java` (после строки `/admin/teacher-ielts/**`)
- Test: `src/test/java/kz/education/server/modules/ge/service/GeTeacherServiceTest.java`

**Interfaces:**
- Consumes: `GePlanService.state/courseDone/plan/moveAs/mark/today`, `GeProfileService.profile`,
  `TeacherStudentService.myStudentIds`, `SecurityUtils.isAdmin/isManager/userId/getCurrentUser`.
- Produces: `GeTeacherService.TaskRequest(String type, LocalDate date, Integer minutes, String title, String note, String level,
  String lessonCode, String lessonTitle, String module, String area, Integer unitId, String unitKey, String unitTitle)`;
  методы `profile`, `student`, `addTask`, `updateTask`, `deleteTask`, `markDone`; HTTP из спеки (секция 1).

- [ ] **Step 1: тесты** (`GeTeacherServiceTest`):

```java
package kz.education.server.modules.ge.service;

import kz.education.server.modules.ge.model.GePlanTask;
import kz.education.server.modules.ge.repository.GePlanTaskRepository;
import kz.education.server.modules.user.model.User;
import kz.education.server.modules.user.repository.UserRepository;
import kz.education.server.presentation.admin.teacherstudent.service.TeacherStudentService;
import kz.education.server.shared.exception.types.BadRequestException;
import kz.education.server.shared.security.SecurityUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class GeTeacherServiceTest {

    @Mock GePlanService plans;
    @Mock GeProfileService profiles;
    @Mock GePlanTaskRepository tasks;
    @Mock UserRepository users;
    @Mock TeacherStudentService teacherStudents;
    @Mock SecurityUtils security;
    @InjectMocks GeTeacherService service;

    static final LocalDate WED = LocalDate.of(2026, 10, 14);
    final List<GePlanTask> saved = new ArrayList<>();

    @BeforeEach
    void setUp() {
        User me = new User();
        me.setId(50L);
        me.setName("Айгерим");
        when(security.userId()).thenReturn(50L);
        when(security.getCurrentUser()).thenReturn(me);
        when(teacherStudents.myStudentIds(50L)).thenReturn(Set.of(7L));
        when(plans.today()).thenReturn(WED);
        when(plans.state(7L)).thenReturn("ready");
        when(plans.courseDone(7L)).thenReturn(Map.of("A1", List.of("L3")));
        when(plans.plan(eq(7L), any(), any())).thenAnswer(i -> {
            List<Map<String, Object>> rows = new ArrayList<>();
            for (GePlanTask t : saved) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", t.getId());
                m.put("origin", t.getOrigin());
                m.put("status", "available");
                rows.add(m);
            }
            return Map.of("tasks", rows);
        });
        when(tasks.save(any())).thenAnswer(i -> {
            GePlanTask t = i.getArgument(0);
            if (t.getId() == null) {
                t.setId(100L + saved.size());
                saved.add(t);
            }
            return t;
        });
    }

    static GeTeacherService.TaskRequest req(String type) {
        return new GeTeacherService.TaskRequest(type, WED.plusDays(1), null, null, null, null, null, null, null, null, null, null, null);
    }

    @Test
    void aTeacherSeesOnlyOwnStudents() {
        assertThatThrownBy(() -> service.addTask(8L, req("custom"))).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.profile(8L)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void aManagerSeesAnyStudent() {
        when(security.isManager()).thenReturn(true);
        service.profile(8L);
        verify(profiles).profile(8L);
    }

    @Test
    void noPlanNoTeacherTasks() {
        when(plans.state(7L)).thenReturn("no_route");
        var r = new GeTeacherService.TaskRequest("custom", WED, null, "Сериал", null, null, null, null, null, null, null, null, null);
        assertThatThrownBy(() -> service.addTask(7L, r)).isInstanceOf(BadRequestException.class);
        verify(tasks, never()).save(any());
    }

    @Test
    void aCourseTaskSnapshotsTheLessonAndRefusesAPassedOne() {
        var passed = new GeTeacherService.TaskRequest("course", WED, null, null, null, "a1", "L3", "Famous people", null, null, null, null, null);
        assertThatThrownBy(() -> service.addTask(7L, passed)).isInstanceOf(BadRequestException.class);

        var r = new GeTeacherService.TaskRequest("course", WED, null, null, "Повтори Past Simple", "a1", "L7", "Famous people", null, null, null, null, null);
        Map<String, Object> v = service.addTask(7L, r);
        GePlanTask t = saved.get(0);
        assertThat(t.getOrigin()).isEqualTo("teacher");
        assertThat(t.getTaskKey()).startsWith("tc:");
        assertThat(t.getKind()).isEqualTo("course");
        assertThat(t.getMinutes()).isEqualTo(GePlanRules.COURSE_LESSON_MINUTES);
        assertThat(t.getWeekStart()).isEqualTo(GePlanRules.monday(WED));
        assertThat(t.getCreatedBy()).isEqualTo(50L);
        assertThat(t.getExtra()).containsEntry("level", "A1").containsEntry("lessonCode", "L7")
                .containsEntry("lessonTitle", "Famous people").containsEntry("note", "Повтори Past Simple")
                .containsEntry("createdByName", "Айгерим");
        assertThat(v.get("editable")).isEqualTo("full");
    }

    @Test
    void aUnitNeedsAnAddress() {
        var none = new GeTeacherService.TaskRequest("unit", WED, null, null, null, "a1", null, null, null, "grammar", null, null, "Present Simple");
        assertThatThrownBy(() -> service.addTask(7L, none)).isInstanceOf(BadRequestException.class);
        var numberWithoutLevel = new GeTeacherService.TaskRequest("unit", WED, null, null, null, null, null, null, null, "grammar", 3, null, "Present Simple");
        assertThatThrownBy(() -> service.addTask(7L, numberWithoutLevel)).isInstanceOf(BadRequestException.class);
        // у шэдоуинга уровня нет — урок адресуется сам собой
        var shadowing = new GeTeacherService.TaskRequest("unit", WED, null, null, null, null, null, null, null, "shadowing", null, "sg", "Selena Gomez");
        service.addTask(7L, shadowing);
        assertThat(saved.get(0).getExtra()).containsEntry("area", "shadowing").containsEntry("unitKey", "sg");
        assertThat(saved.get(0).getMinutes()).isEqualTo(20);
    }

    @Test
    void validationOfTheRest() {
        assertThatThrownBy(() -> service.addTask(7L, req("custom"))).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.addTask(7L, req("practice"))).isInstanceOf(BadRequestException.class);
        var past = new GeTeacherService.TaskRequest("custom", WED.minusDays(1), null, "Сериал", null, null, null, null, null, null, null, null, null);
        assertThatThrownBy(() -> service.addTask(7L, past)).isInstanceOf(BadRequestException.class);
        var far = new GeTeacherService.TaskRequest("custom", WED.plusWeeks(27), null, "Сериал", null, null, null, null, null, null, null, null, null);
        assertThatThrownBy(() -> service.addTask(7L, far)).isInstanceOf(BadRequestException.class);
        var tooLong = new GeTeacherService.TaskRequest("practice", WED, 601, null, null, null, null, null, "ai_tutor", null, null, null, null);
        assertThatThrownBy(() -> service.addTask(7L, tooLong)).isInstanceOf(BadRequestException.class);
        var ok = new GeTeacherService.TaskRequest("practice", WED, 25, null, null, null, null, null, "ai_tutor", null, null, null, null);
        service.addTask(7L, ok);
        assertThat(saved.get(0).getModule()).isEqualTo("ai_tutor");
        assertThat(saved.get(0).getMinutes()).isEqualTo(25);
    }

    static GePlanTask programme(long id) {
        GePlanTask t = new GePlanTask();
        t.setId(id);
        t.setUserId(7L);
        t.setTaskKey("p:2026-10-12:ai_tutor:0");
        t.setKind("practice");
        t.setModule("ai_tutor");
        t.setMinutes(15);
        t.setScheduledDate(WED);
        t.setOriginalDate(WED);
        t.setWeekStart(GePlanRules.monday(WED));
        return t;
    }

    @Test
    void aProgrammeTaskOnlyMovesAndIsNeverDeleted() {
        GePlanTask p = programme(1);
        when(tasks.findByIdAndUserId(1L, 7L)).thenReturn(Optional.of(p));
        when(plans.moveAs(7L, 1L, WED.plusDays(2), 50L)).thenReturn(new LinkedHashMap<>(Map.of("id", 1L, "origin", "programme", "status", "planned")));

        var noDate = new GeTeacherService.TaskRequest(null, null, 30, null, null, null, null, null, null, null, null, null, null);
        assertThatThrownBy(() -> service.updateTask(7L, 1L, noDate)).isInstanceOf(BadRequestException.class);
        var move = new GeTeacherService.TaskRequest(null, WED.plusDays(2), null, null, null, null, null, null, null, null, null, null, null);
        assertThat(service.updateTask(7L, 1L, move).get("editable")).isEqualTo("date");
        assertThatThrownBy(() -> service.deleteTask(7L, 1L)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.markDone(7L, 1L, true)).isInstanceOf(BadRequestException.class);
    }

    @Test
    void aTeacherTaskIsDeletedAndMarked() {
        service.addTask(7L, new GeTeacherService.TaskRequest("custom", WED, null, "Сериал", null, null, null, null, null, null, null, null, null));
        GePlanTask t = saved.get(0);
        when(tasks.findByIdAndUserId(t.getId(), 7L)).thenReturn(Optional.of(t));
        when(plans.mark(t, true, 50L)).thenReturn(new LinkedHashMap<>(Map.of("id", t.getId(), "origin", "teacher", "status", "completed")));

        assertThat(service.markDone(7L, t.getId(), true).get("status")).isEqualTo("completed");
        service.deleteTask(7L, t.getId());
        verify(tasks).delete(t);
    }

    @Test
    void editableFollowsTheOrigin() {
        assertThat(GeTeacherService.editable(Map.of("origin", "teacher", "status", "completed"))).isEqualTo("full");
        assertThat(GeTeacherService.editable(Map.of("origin", "programme", "status", "planned"))).isEqualTo("date");
        assertThat(GeTeacherService.editable(Map.of("origin", "programme", "status", "completed"))).isEqualTo("none");
        assertThat(GeTeacherService.editable(Map.of("kind", "live"))).isEqualTo("none");
    }
}
```

- [ ] **Step 2: прогон** — `./mvnw -q test -Dtest=GeTeacherServiceTest` → компиляция падает (нет класса).
- [ ] **Step 3: `GeTeacherService`**:

```java
package kz.education.server.modules.ge.service;

import kz.education.server.modules.ge.model.GePlanTask;
import kz.education.server.modules.ge.repository.GePlanTaskRepository;
import kz.education.server.modules.user.model.User;
import kz.education.server.modules.user.repository.UserRepository;
import kz.education.server.presentation.admin.teacherstudent.service.TeacherStudentService;
import kz.education.server.shared.exception.types.BadRequestException;
import kz.education.server.shared.exception.types.ResourceNotFoundException;
import kz.education.server.shared.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Кабинет преподавателя общего курса в web-admin (дизайн jts-web-app 2026-10-13-ge-teacher-plan): анкета и план по
 * дням ученика и задачи, которые преподаватель ставит сам. Задачи лежат в том же плане (ge_plan_tasks, origin =
 * teacher), поэтому ученик видит их в «Сегодня», неделе и месяце, а выполнение считает тот же GePlanProgress.
 * Домашние задания сюда не идут: они остаются обычными /admin/homework, и план подмешивает их сам.
 *
 * Доступ — как у IELTS (IeltsTeacherService): преподаватель видит только своих учеников (TeacherStudentService.myStudentIds
 * — уроки, группа, назначения), админ и менеджер — любого.
 */
@Service
@RequiredArgsConstructor
public class GeTeacherService {

    static final Set<String> TYPES = Set.of("course", "practice", "unit", "custom");
    /** Разделы «Практики», чей юнит кабинет отмечает пройденным (POST /admin/homework/practice/done). */
    static final Set<String> UNIT_AREAS = Set.of("grammar", "reading", "writing", "listening", "shadowing", "workbooks", "situations");
    static final Set<String> LEVELS = Set.of("A0", "A1", "A2", "B1", "B2", "C1");
    /** Коды шагов тропы «Обучения» — те же, что у отметок урока (L<n>, T<юнит>, X<id>). */
    static final Pattern LESSON_CODE = Pattern.compile("^(L\\d+|T\\d+|X[\\w-]+)$");
    static final int MAX_TITLE = 200;
    static final int MAX_NOTE = 2000;
    static final int MAX_WEEKS_AHEAD = 26;
    static final int DEFAULT_MINUTES = 20;

    private final GePlanService plans;
    private final GeProfileService profiles;
    private final GePlanTaskRepository tasks;
    private final UserRepository users;
    private final TeacherStudentService teacherStudents;
    private final SecurityUtils security;

    public record TaskRequest(String type, LocalDate date, Integer minutes, String title, String note, String level, String lessonCode,
                              String lessonTitle, String module, String area, Integer unitId, String unitKey, String unitTitle) {
    }

    // ------------------------------------------------------------------ доступ

    void assertMayView(Long studentId) {
        if (security.isAdmin() || security.isManager()) return;
        if (!teacherStudents.myStudentIds(security.userId()).contains(studentId)) throw new AccessDeniedException("Это не ваш ученик");
    }

    // ------------------------------------------------------------------ чтение

    /** Анкета без сборки плана — для блока цели в «Обзоре» карточки ученика. */
    @Transactional
    public Map<String, Object> profile(Long studentId) {
        assertMayView(studentId);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("profile", profiles.profile(studentId));
        return out;
    }

    /**
     * Карточка: ученик, анкета, план окна дат и пройденные уроки. План читается тем же GePlanService.plan, что у ученика,
     * — если ученик его ещё не открывал, старт плана — этот день (правило части 2: старт — первое чтение).
     */
    @Transactional
    public Map<String, Object> student(Long studentId, LocalDate from, LocalDate to) {
        assertMayView(studentId);
        User u = users.findById(studentId).orElseThrow(() -> new ResourceNotFoundException("Ученик не найден"));
        Map<String, Object> plan = plans.plan(studentId, from, to);
        for (Map<String, Object> t : rows(plan)) t.put("editable", editable(t));
        Map<String, Object> user = new LinkedHashMap<>();
        user.put("id", u.getId());
        user.put("name", u.getName());
        user.put("languageLevel", u.getLanguageLevel() == null ? null : u.getLanguageLevel().name());
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("user", user);
        out.put("profile", profiles.profile(studentId));
        out.put("plan", plan);
        out.put("courseDone", plans.courseDone(studentId));
        return out;
    }

    /** Что преподавателю можно с задачей: своя — всё, задача программы — перенести (пока не выполнена), подмешанные — ничего. */
    static String editable(Map<String, Object> t) {
        if ("teacher".equals(t.get("origin"))) return "full";
        if ("programme".equals(t.get("origin")) && !"completed".equals(t.get("status"))) return "date";
        return "none";
    }

    @SuppressWarnings("unchecked")
    static List<Map<String, Object>> rows(Map<String, Object> plan) {
        Object v = plan == null ? null : plan.get("tasks");
        return v instanceof List<?> l ? (List<Map<String, Object>>) l : List.of();
    }

    // ------------------------------------------------------------------ задачи преподавателя

    @Transactional
    public Map<String, Object> addTask(Long studentId, TaskRequest r) {
        assertMayView(studentId);
        String state = plans.state(studentId);
        if (!"ready".equals(state)) throw new BadRequestException("У ученика нет плана (" + state + "): задачу в план поставить нельзя");
        GePlanTask t = new GePlanTask();
        t.setUserId(studentId);
        t.setTaskKey("tc:" + UUID.randomUUID());
        t.setOrigin("teacher");
        User me = security.getCurrentUser();
        t.setCreatedBy(me.getId());
        Map<String, Object> extra = new LinkedHashMap<>();
        extra.put("createdBy", me.getId());
        extra.put("createdByName", me.getName());
        extra.put("createdAt", LocalDateTime.now().toString());
        t.setExtra(extra);
        apply(t, r, studentId, true, plans.today());
        tasks.save(t);
        return view(studentId, t);
    }

    /**
     * Правка. Свою (origin = teacher) — целиком; задачу программы — только дату: её содержание — методика программы, его
     * меняет пересборка, а не правка одной строки (как у IELTS).
     */
    @Transactional
    public Map<String, Object> updateTask(Long studentId, Long taskId, TaskRequest r) {
        assertMayView(studentId);
        GePlanTask t = tasks.findByIdAndUserId(taskId, studentId).orElseThrow(() -> new ResourceNotFoundException("Нет такой задачи"));
        if (!t.isTeacher()) {
            if (r.date() == null) throw new BadRequestException("У задачи программы меняется только дата");
            Map<String, Object> v = plans.moveAs(studentId, taskId, r.date(), security.userId());
            v.put("editable", editable(v));
            return v;
        }
        apply(t, r, studentId, false, plans.today());
        t.getExtra().put("updatedBy", security.userId());
        t.getExtra().put("updatedAt", LocalDateTime.now().toString());
        tasks.save(t);
        return view(studentId, t);
    }

    @Transactional
    public void deleteTask(Long studentId, Long taskId) {
        assertMayView(studentId);
        GePlanTask t = tasks.findByIdAndUserId(taskId, studentId).orElseThrow(() -> new ResourceNotFoundException("Нет такой задачи"));
        if (!t.isTeacher()) throw new BadRequestException("Задачу программы удалить нельзя — её можно перенести");
        tasks.delete(t);
    }

    /** Отметка задачи, которую не закрыть по фактам: материал Практики (прошли до задачи — отметки не сохранилось) и своё. */
    @Transactional
    public Map<String, Object> markDone(Long studentId, Long taskId, boolean done) {
        assertMayView(studentId);
        GePlanTask t = tasks.findByIdAndUserId(taskId, studentId).orElseThrow(() -> new ResourceNotFoundException("Нет такой задачи"));
        if (!t.isTeacher() || !Set.of("unit", "custom").contains(t.getKind()))
            throw new BadRequestException("Эта задача закрывается сама, по урокам и минутам ученика");
        Map<String, Object> v = plans.mark(t, done, security.userId());
        v.put("editable", editable(v));
        return v;
    }

    // ------------------------------------------------------------------ внутреннее

    void apply(GePlanTask t, TaskRequest r, Long studentId, boolean create, LocalDate today) {
        String type = r.type() != null ? r.type().trim().toLowerCase() : t.getKind();
        if (type == null || !TYPES.contains(type)) throw new BadRequestException("Вид задачи: course | practice | unit | custom");
        if (!create && !type.equals(t.getKind())) throw new BadRequestException("Вид задачи не меняется — удалите её и поставьте новую");
        LocalDate date = r.date() != null ? r.date() : t.getScheduledDate();
        if (date == null) throw new BadRequestException("Нужна дата");
        boolean dateChanged = create || !date.equals(t.getScheduledDate());
        if (dateChanged && date.isBefore(today)) throw new BadRequestException("Дата задачи — сегодня или позже");
        if (date.isAfter(today.plusWeeks(MAX_WEEKS_AHEAD))) throw new BadRequestException("Дата задачи — не дальше чем через полгода");

        Map<String, Object> extra = new LinkedHashMap<>(t.getExtra() == null ? Map.of() : t.getExtra());
        String title = r.title() != null ? trim(r.title()) : str(extra.get("title"));
        if (title != null && title.length() > MAX_TITLE) throw new BadRequestException("Название длиннее " + MAX_TITLE + " знаков");
        String note = r.note() != null ? trim(r.note()) : str(extra.get("note"));
        if (note != null && note.length() > MAX_NOTE) throw new BadRequestException("Комментарий длиннее " + MAX_NOTE + " знаков");

        String module = null;
        int defaultMinutes = DEFAULT_MINUTES;
        switch (type) {
            case "course" -> {
                // адрес урока меняется целиком: новый код приходит вместе с уровнем и названием
                boolean readdress = create || r.lessonCode() != null;
                String level = readdress ? upper(r.level()) : str(extra.get("level"));
                String code = readdress ? trim(r.lessonCode()) : str(extra.get("lessonCode"));
                String lessonTitle = readdress ? trim(r.lessonTitle()) : str(extra.get("lessonTitle"));
                if (level == null || !LEVELS.contains(level)) throw new BadRequestException("Уровень урока: A0–C1");
                if (code == null || !LESSON_CODE.matcher(code).matches()) throw new BadRequestException("Код урока: L<номер>, T<юнит> или X<id>");
                if (lessonTitle != null && lessonTitle.length() > MAX_TITLE) throw new BadRequestException("Название урока длиннее " + MAX_TITLE + " знаков");
                // повторное прохождение урока нового факта не даёт (отметка идемпотентна) — такая задача не закрылась бы никогда
                if (readdress && plans.courseDone(studentId).getOrDefault(level, List.of()).contains(code))
                    throw new BadRequestException("Этот урок ученик уже прошёл");
                extra.put("level", level);
                extra.put("lessonCode", code);
                put(extra, "lessonTitle", lessonTitle);
                defaultMinutes = GePlanRules.COURSE_LESSON_MINUTES;
            }
            case "practice" -> {
                module = r.module() != null ? r.module().trim() : t.getModule();
                if (module == null || !GePlanRules.MODULES.contains(module))
                    throw new BadRequestException("Раздел практики: ai_tutor | workbooks | shadowing | media_practice | vocabulary_sr");
                if (r.minutes() == null && t.getMinutes() == null) throw new BadRequestException("Сколько минут практики");
            }
            case "unit" -> {
                boolean readdress = create || r.area() != null;
                String area = readdress ? lower(r.area()) : str(extra.get("area"));
                String level = readdress ? lower(r.level()) : str(extra.get("level"));
                Integer unitId = readdress ? r.unitId() : intOf(extra.get("unitId"));
                String unitKey = readdress ? trim(r.unitKey()) : str(extra.get("unitKey"));
                String unitTitle = readdress ? trim(r.unitTitle()) : str(extra.get("unitTitle"));
                if (area == null || !UNIT_AREAS.contains(area))
                    throw new BadRequestException("Раздел Практики: grammar | reading | writing | listening | shadowing | workbooks | situations");
                if (unitId == null && unitKey == null) throw new BadRequestException("Нужен адрес юнита: номер или ключ");
                // тот же закон, что у PracticeUnitDoneRequest: юнит 3 есть в каждом уровне, номер без уровня — маска
                if (unitId != null && level == null) throw new BadRequestException("Номер юнита без уровня — не адрес");
                if (!"shadowing".equals(area) && level == null) throw new BadRequestException("Нужен уровень юнита");
                if (unitTitle == null) throw new BadRequestException("Нужно название юнита");
                if (unitTitle.length() > MAX_TITLE) throw new BadRequestException("Название юнита длиннее " + MAX_TITLE + " знаков");
                extra.put("area", area);
                put(extra, "level", level);
                put(extra, "unitId", unitId);
                put(extra, "unitKey", unitKey);
                extra.put("unitTitle", unitTitle);
            }
            default -> {
                if (title == null) throw new BadRequestException("Нужно название задания");
            }
        }
        int minutes = r.minutes() != null ? r.minutes() : t.getMinutes() != null ? t.getMinutes() : defaultMinutes;
        if (minutes < 1 || minutes > 600) throw new BadRequestException("Минуты — от 1 до 600");

        put(extra, "title", title);
        put(extra, "note", note);
        t.setKind(type);
        t.setModule(module);
        t.setMinutes(minutes);
        if (dateChanged) {
            t.setScheduledDate(date);
            t.setOriginalDate(date);
            t.setWeekStart(GePlanRules.monday(date));
        }
        t.setExtra(extra);
    }

    /** Строка плана с этой задачей — с её статусом, как её увидит ученик. */
    Map<String, Object> view(Long studentId, GePlanTask t) {
        for (Map<String, Object> m : rows(plans.plan(studentId, t.getScheduledDate(), t.getScheduledDate()))) {
            if (t.getId().equals(m.get("id"))) {
                m.put("editable", editable(m));
                return m;
            }
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("date", t.getScheduledDate());
        m.put("editable", "full");
        return m;
    }

    static void put(Map<String, Object> m, String k, Object v) {
        if (v == null) m.remove(k);
        else m.put(k, v);
    }

    static String trim(String s) {
        if (s == null) return null;
        String x = s.trim();
        return x.isEmpty() ? null : x;
    }

    static String upper(String s) {
        String x = trim(s);
        return x == null ? null : x.toUpperCase();
    }

    static String lower(String s) {
        String x = trim(s);
        return x == null ? null : x.toLowerCase();
    }

    static String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    static Integer intOf(Object o) {
        return o instanceof Number n ? n.intValue() : null;
    }
}
```

- [ ] **Step 4: контроллер** `TeacherGeController`:

```java
package kz.education.server.presentation.admin.ge.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import kz.education.server.modules.ge.service.GeTeacherService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

/**
 * Кабинет преподавателя общего курса (web-admin «Мои студенты» → ученик → «План», «Анкета»): анкета, план по дням и
 * задачи преподавателя. Преподаватель видит только своих учеников — проверка в {@link GeTeacherService}; админ и менеджер —
 * всех.
 */
@RestController
@RequestMapping("/admin/teacher-ge")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'MANAGER')")
@Tag(name = "Teacher GE", description = "Teacher workspace: General English questionnaire, dated plan and teacher-set tasks")
public class TeacherGeController {

    private final GeTeacherService service;

    public record DoneRequest(boolean done) {
    }

    @GetMapping("/students/{studentId}/profile")
    @Operation(summary = "Student's General English questionnaire (goal, minutes, route) without building the plan")
    public Map<String, Object> profile(@PathVariable Long studentId) {
        return service.profile(studentId);
    }

    @GetMapping("/students/{studentId}")
    @Operation(summary = "Student card: questionnaire, dated plan of a window (with `editable` per task) and passed course lessons")
    public Map<String, Object> student(@PathVariable Long studentId,
                                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.student(studentId, from, to);
    }

    @PostMapping("/students/{studentId}/tasks")
    @Operation(summary = "Add a teacher task to the student's plan: course lesson, practice minutes, Practice unit or own task")
    public Map<String, Object> add(@PathVariable Long studentId, @RequestBody GeTeacherService.TaskRequest r) {
        return service.addTask(studentId, r);
    }

    @PutMapping("/students/{studentId}/tasks/{taskId}")
    @Operation(summary = "Edit a teacher task (all fields) or move a programme task (date only)")
    public Map<String, Object> update(@PathVariable Long studentId, @PathVariable Long taskId, @RequestBody GeTeacherService.TaskRequest r) {
        return service.updateTask(studentId, taskId, r);
    }

    @DeleteMapping("/students/{studentId}/tasks/{taskId}")
    @Operation(summary = "Delete a teacher task")
    public void delete(@PathVariable Long studentId, @PathVariable Long taskId) {
        service.deleteTask(studentId, taskId);
    }

    @PutMapping("/students/{studentId}/tasks/{taskId}/done")
    @Operation(summary = "Mark a teacher task of kind unit or custom done (or undone)")
    public Map<String, Object> done(@PathVariable Long studentId, @PathVariable Long taskId, @RequestBody DoneRequest r) {
        return service.markDone(studentId, taskId, r.done());
    }
}
```

- [ ] **Step 5: SecurityConfig** — после строки `/admin/teacher-ielts/**`:

```java
                        // Кабинет преподавателя общего курса: анкета, план, задачи. Права — @PreAuthorize контроллера и
                        // проверка «это мой ученик» в GeTeacherService; без строки путь падает в hasRole(ADMIN).
                        .requestMatchers("/admin/teacher-ge/**").authenticated()
```
- [ ] **Step 6: прогон** — `./mvnw -q test -Dtest='GeTeacherServiceTest,GePlan*Test'` → PASS; `./mvnw -q -DskipTests compile`.
- [ ] **Step 7: коммит** — `feat(ge): кабинет преподавателя /admin/teacher-ge — анкета, план и свои задачи`.

### Task A5: отметка Практики закрывает задачу «материал»

**Files:**
- Create: `src/main/java/kz/education/server/modules/ge/service/GeUnitDoneService.java`
- Modify: `src/main/java/kz/education/server/modules/homework/service/HomeworkAssignmentService.java` (поле +
  вызов в `markPracticeUnitDone`)
- Test: `src/test/java/kz/education/server/modules/ge/service/GeUnitDoneServiceTest.java`
- Test: `src/test/java/kz/education/server/modules/homework/service/HomeworkAssignmentServiceTest.java` (`@Mock` + тест)

**Interfaces:**
- Produces: `GeUnitDoneService.markUnitDone(Long studentId, String area, String level, Integer unitId, String unitKey,
  boolean passed) : int`; `static boolean matches(Map<String,Object> extra, String area, String level, Integer unitId, String unitKey)`.

- [ ] **Step 1: тесты `GeUnitDoneServiceTest`**:

```java
package kz.education.server.modules.ge.service;

import kz.education.server.modules.ge.model.GePlanTask;
import kz.education.server.modules.ge.repository.GePlanTaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GeUnitDoneServiceTest {

    @Mock GePlanTaskRepository tasks;
    @InjectMocks GeUnitDoneService service;

    @Test
    void theAddressRuleIsTheHomeworkOne() {
        Map<String, Object> grammar = Map.of("area", "grammar", "level", "a1", "unitId", 3);
        assertThat(GeUnitDoneService.matches(grammar, "grammar", "a1", 3, null)).isTrue();
        assertThat(GeUnitDoneService.matches(grammar, "grammar", "a2", 3, null)).isFalse();
        // номер без уровня — маска на все уровни, не адрес
        assertThat(GeUnitDoneService.matches(grammar, "grammar", null, 3, null)).isFalse();
        Map<String, Object> reading = Map.of("area", "reading", "level", "a1", "unitKey", "a1-sci-honey");
        assertThat(GeUnitDoneService.matches(reading, "reading", "a1", null, "A1-SCI-HONEY")).isTrue();
        // у шэдоуинга уровень не сверяется: кабинет его не шлёт, а в задаче лежит служебный all
        Map<String, Object> shadowing = Map.of("area", "shadowing", "level", "all", "unitKey", "sg");
        assertThat(GeUnitDoneService.matches(shadowing, "shadowing", null, null, "sg")).isTrue();
        assertThat(GeUnitDoneService.matches(shadowing, "reading", null, null, "sg")).isFalse();
    }

    @Test
    void aPassedUnitClosesTheOpenTask() {
        GePlanTask t = new GePlanTask();
        t.setId(1L);
        t.setExtra(new java.util.HashMap<>(Map.of("area", "grammar", "level", "a1", "unitId", 3)));
        when(tasks.findByUserIdAndOriginAndKindAndDoneAtIsNull(7L, "teacher", "unit")).thenReturn(List.of(t));

        assertThat(service.markUnitDone(7L, "grammar", "a1", 3, null, true)).isEqualTo(1);
        assertThat(t.getDoneAt()).isNotNull();
        assertThat(t.getDoneBy()).isEqualTo(7L);
        verify(tasks).saveAll(List.of(t));
    }

    @Test
    void aProgressReportBelowTheThresholdClosesNothing() {
        assertThat(service.markUnitDone(7L, "listening", "a1", null, "a1", false)).isZero();
        verify(tasks, never()).saveAll(any());
    }
}
```

- [ ] **Step 2: прогон** — `./mvnw -q test -Dtest=GeUnitDoneServiceTest` → компиляция падает.
- [ ] **Step 3: `GeUnitDoneService`**:

```java
package kz.education.server.modules.ge.service;

import kz.education.server.modules.ge.model.GePlanTask;
import kz.education.server.modules.ge.repository.GePlanTaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Отметка «юнит Практики пройден» (POST /admin/homework/practice/done) для плана общего курса: закрывает задачи
 * преподавателя «материал Практики» с тем же адресом.
 *
 * Отдельный бин с одним репозиторием, а не метод GeTeacherService: его зовёт сервис домашек, и тянуть за ним кабинет
 * преподавателя (план, расписание, профили, права) значило бы завязать два модуля в узел.
 */
@Service
@RequiredArgsConstructor
public class GeUnitDoneService {

    private final GePlanTaskRepository tasks;

    /** passed — порог юнита взят (PracticeProgress.isDone): отчёт о ходе работы задачу не закрывает. */
    @Transactional
    public int markUnitDone(Long studentId, String area, String level, Integer unitId, String unitKey, boolean passed) {
        if (studentId == null || !passed) return 0;
        List<GePlanTask> hit = tasks.findByUserIdAndOriginAndKindAndDoneAtIsNull(studentId, "teacher", "unit").stream()
                .filter(t -> matches(t.getExtra(), area, level, unitId, unitKey)).toList();
        if (hit.isEmpty()) return 0;
        LocalDateTime now = LocalDateTime.now();
        hit.forEach(t -> {
            t.setDoneAt(now);
            t.setDoneBy(studentId);
        });
        tasks.saveAll(hit);
        return hit.size();
    }

    /**
     * Тот же адрес, что у домашек (HomeworkAssignmentService.matchesPracticeUnit): номер — только вместе с уровнем, ключ —
     * без регистра, а уровень сверяется, только если кабинет его прислал (у шэдоуинга его нет).
     */
    static boolean matches(Map<String, Object> x, String area, String level, Integer unitId, String unitKey) {
        if (x == null || area == null || !area.equalsIgnoreCase(String.valueOf(x.get("area")))) return false;
        String lv = x.get("level") == null ? null : String.valueOf(x.get("level"));
        if (unitId != null) {
            return level != null && level.equalsIgnoreCase(lv) && x.get("unitId") instanceof Number n && n.intValue() == unitId;
        }
        if (level != null && !level.equalsIgnoreCase(lv)) return false;
        return unitKey != null && x.get("unitKey") != null && unitKey.trim().equalsIgnoreCase(String.valueOf(x.get("unitKey")));
    }
}
```

- [ ] **Step 4: вызов из домашек** — в `HomeworkAssignmentService`: поле `private final GeUnitDoneService geUnitDone;`
  (импорт `kz.education.server.modules.ge.service.GeUnitDoneService`) рядом с прочими сервисами; в
  `markPracticeUnitDone` сразу после вычисления `level` и до списка `open`:

```java
        // План общего курса: та же отметка закрывает задачи преподавателя «материал Практики» (дизайн jts-web-app
        // 2026-10-13-ge-teacher-plan). Стоит до развилки «открытых работ нет»: у задачи плана домашки может не быть вовсе,
        // и без этого отметка терялась бы.
        geUnitDone.markUnitDone(studentId, area, level, request.getUnitId(), request.getUnitKey(),
                PracticeProgress.isDone(request.getDone(), request.getTotal()));
```
  В `HomeworkAssignmentServiceTest` — `@Mock private kz.education.server.modules.ge.service.GeUnitDoneService geUnitDone;`
  рядом с прочими моками и тест рядом с `пройденныйЮнитОтмечаетсяВыполненным`:

```java
    // У задачи плана общего курса домашки может не быть вовсе: отметка всё равно доходит до плана.
    @Test
    void пройденныйЮнитДоходитДоПланаИБезДомашки() {
        signedInAsStudent(1L);
        when(homeworkAssignmentRepository.findByStudentIdOrderByCreatedAtDesc(1L)).thenReturn(List.of());

        assertThat(service.markPracticeUnitDone(прошёл("grammar", "A1", 3)).counted()).isZero();
        verify(geUnitDone).markUnitDone(1L, "grammar", "a1", 3, null, true);
    }
```
- [ ] **Step 5: прогон** — `./mvnw -q test -Dtest='GeUnitDoneServiceTest,HomeworkAssignmentServiceTest'` → PASS.
- [ ] **Step 6: коммит** — `feat(ge): отметка Практики закрывает задачу преподавателя «материал»`.

### Task A6: проверка модуля и PR бэкенда

- [ ] `./mvnw -q test -Dtest='Ge*Test,HomeworkAssignmentServiceTest'` → PASS; `./mvnw -q -DskipTests package` → BUILD SUCCESS.
- [ ] Сверить номер миграции (Global Constraints). Push `feat/ge-teacher`. PR в develop открывать после мержа
  backend#242 (до этого — только push; диф PR иначе включит часть 2). В описании: V329 и ручная проверка на dev-server
  (`\d ge_plan_tasks`, задача преподавателя видна ученику, отметка Практики).

---

## Часть B — web-admin

Перед работой: `node_modules` — junction на `C:\Users\nural\Desktop\web-admin\node_modules`, если `package.json`
worktree совпадает с основным чекаутом (`git diff --no-index`); иначе `npm ci` в worktree. Тесты:
`npx ng test --watch=false --browsers=ChromeHeadless --include=<путь>`.

### Task B1: сервис, каталог уроков, утилиты плана

**Files:**
- Create: `src/app/core/services/teacher-ge.service.ts`
- Create: `src/app/core/services/teacher-ge.service.spec.ts`
- Modify: `src/app/core/services/practice-catalog.service.ts` (метод `courseLessons()` и типы)
- Create: `src/app/feature/system/ge-plan/ge-plan.util.ts`
- Create: `src/app/feature/system/ge-plan/ge-plan.util.spec.ts`

**Interfaces:**
- Produces: типы `GeProfileView, GePlanTask, GePlanView, GeStudentView, GeTaskRequest, GeTaskType`; `TeacherGeService`
  (`profile, student, addTask, updateTask, deleteTask, done`); `CourseLessonDto {code, kind, unit, title}`,
  `CourseLevelDto {level, lessons}`, `PracticeCatalogService.courseLessons(): Observable<CourseLevelDto[]>`; утилиты
  `originOf, addDays, mondayOf, weekDays, monthDays, shiftCursor, windowOf, byDate, taskTitle, taskMeta, statusTone,
  taskActions, almatyToday, GE_STATE_KEY, GE_MODULES`.

- [ ] **Step 1: `teacher-ge.service.ts`**:

```ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { BaseService } from './base.service';

/** Анкета ученика общего курса (backend GeProfileService.ProfileView); без анкеты — onboarded = false. */
export interface GeProfileView {
  onboarded: boolean;
  purpose: string | null;
  targetLevel: string | null;
  fromLevel: string | null;
  deadlineDate: string | null;
  deadlineWindow: string | null;
  dailyMinutes: number | null;
  startMode: string | null;
  route: string | null;
  onboardedAt: string | null;
}

export type GeTaskType = 'course' | 'practice' | 'unit' | 'custom';

/** Строка плана: своя (программа или преподаватель) либо подмешанная — занятие и ДЗ (id строкой, editable none). */
export interface GePlanTask {
  id: number | string;
  key: string;
  date: string;
  originalDate: string;
  kind: GeTaskType | 'live' | 'homework';
  module: string | null;
  minutes: number;
  got: number;
  status: 'planned' | 'available' | 'in_progress' | 'completed';
  overdue: boolean;
  movable: boolean;
  title: string | null;
  origin: 'programme' | 'teacher' | null;
  editable: 'full' | 'date' | 'none';
  extra: {
    title?: string;
    note?: string;
    createdBy?: number;
    createdByName?: string;
    level?: string;
    lessonCode?: string;
    lessonTitle?: string;
    area?: string;
    unitId?: number;
    unitKey?: string;
    unitTitle?: string;
    teacherName?: string;
    scheduledAt?: string;
    dueDate?: string;
  } | null;
}

export interface GePlanView {
  today: string;
  state: 'no_onboarding' | 'no_route' | 'no_level' | 'reached' | 'ready';
  route: string | null;
  dailyMinutes: number | null;
  planStart: string | null;
  planUntil: string | null;
  tasks: GePlanTask[];
  liveMissing: boolean;
  week: { start: string; done: number; total: number; percent: number } | null;
}

export interface GeStudentView {
  user: { id: number; name: string | null; languageLevel: string | null };
  profile: GeProfileView | null;
  plan: GePlanView;
  /** Пройденные уроки по уровням: { "A1": ["L1", "T1"] }. */
  courseDone: Record<string, string[]>;
}

export interface GeTaskRequest {
  type?: GeTaskType;
  date?: string;
  minutes?: number | null;
  title?: string;
  note?: string;
  level?: string | null;
  lessonCode?: string;
  lessonTitle?: string;
  module?: string;
  area?: string;
  unitId?: number | null;
  unitKey?: string | null;
  unitTitle?: string;
}

/**
 * Кабинет преподавателя общего курса (backend /admin/teacher-ge): анкета и план по дням ученика, задачи от
 * преподавателя. Преподаватель получает только своих учеников — граница на сервере.
 */
@Injectable({ providedIn: 'root' })
export class TeacherGeService extends BaseService {
  constructor(private http: HttpClient) {
    super();
  }

  profile(studentId: number): Observable<{ profile: GeProfileView | null }> {
    return this.http.get<{ profile: GeProfileView | null }>(this.url(`/admin/teacher-ge/students/${studentId}/profile`));
  }

  student(studentId: number, from?: string, to?: string): Observable<GeStudentView> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<GeStudentView>(this.url(`/admin/teacher-ge/students/${studentId}`), { params });
  }

  addTask(studentId: number, r: GeTaskRequest): Observable<GePlanTask> {
    return this.http.post<GePlanTask>(this.url(`/admin/teacher-ge/students/${studentId}/tasks`), r);
  }

  updateTask(studentId: number, taskId: number, r: GeTaskRequest): Observable<GePlanTask> {
    return this.http.put<GePlanTask>(this.url(`/admin/teacher-ge/students/${studentId}/tasks/${taskId}`), r);
  }

  deleteTask(studentId: number, taskId: number): Observable<void> {
    return this.http.delete<void>(this.url(`/admin/teacher-ge/students/${studentId}/tasks/${taskId}`));
  }

  done(studentId: number, taskId: number, done: boolean): Observable<GePlanTask> {
    return this.http.put<GePlanTask>(this.url(`/admin/teacher-ge/students/${studentId}/tasks/${taskId}/done`), { done });
  }
}
```

- [ ] **Step 2: спека сервиса** — `teacher-ge.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { TeacherGeService } from './teacher-ge.service';
import { environment } from '../../../environments/environment';

describe('TeacherGeService', () => {
  let service: TeacherGeService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/admin/teacher-ge/students`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(TeacherGeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('карточка ученика — с окном дат', () => {
    service.student(7, '2026-09-28', '2026-11-08').subscribe();
    const req = http.expectOne((r) => r.url === `${base}/7`);
    expect(req.request.params.get('from')).toBe('2026-09-28');
    expect(req.request.params.get('to')).toBe('2026-11-08');
    req.flush({});
  });

  it('задачи: добавить, изменить, удалить, отметить', () => {
    service.addTask(7, { type: 'custom', date: '2026-10-14', title: 'Сериал' }).subscribe();
    expect(http.expectOne({ method: 'POST', url: `${base}/7/tasks` }).request.body).toEqual({ type: 'custom', date: '2026-10-14', title: 'Сериал' });
    service.updateTask(7, 5, { date: '2026-10-15' }).subscribe();
    http.expectOne({ method: 'PUT', url: `${base}/7/tasks/5` }).flush({});
    service.deleteTask(7, 5).subscribe();
    http.expectOne({ method: 'DELETE', url: `${base}/7/tasks/5` }).flush(null);
    service.done(7, 5, true).subscribe();
    expect(http.expectOne({ method: 'PUT', url: `${base}/7/tasks/5/done` }).request.body).toEqual({ done: true });
  });

  it('анкета — отдельной лёгкой ручкой', () => {
    service.profile(7).subscribe();
    http.expectOne({ method: 'GET', url: `${base}/7/profile` }).flush({ profile: null });
  });
});
```
  В первом тесте `addTask` не флашится — добавить `.flush({})` после `expectOne(... POST ...)`: записать как
  `const add = http.expectOne(...); expect(add.request.body)...; add.flush({});` (так же для `done`).

- [ ] **Step 3: каталог уроков** — в `practice-catalog.service.ts` после `AddedShadowingLesson`:

```ts
/** Шаг тропы «Обучения» для задачи «урок курса»: код — тот же, что у отметки урока на бэкенде (L<n>, T<u>, X<id>). */
export interface CourseLessonDto {
  code: string;
  kind: 'lesson' | 'test';
  unit: number | null;
  title: string;
}

export interface CourseLevelDto {
  level: string;
  lessons: CourseLessonDto[];
}
```
  и в класс — поле `private courseCache?: Observable<CourseLevelDto[]>;` и метод:

```ts
  /**
   * Оглавление тропы уровней A0–B2 — из кабинета ученика (GET /api/course/catalog), как и оглавление «Практики»:
   * курс лежит статикой там. Отказ кэш не запоминает — недоступность кабинета обычно длится секунды (передеплой).
   */
  courseLessons(): Observable<CourseLevelDto[]> {
    if (!this.courseCache) {
      const base = (environment as { studentAppUrl?: string }).studentAppUrl ?? '';
      this.courseCache = this.http.get<{ levels: CourseLevelDto[] }>(`${base}/api/course/catalog`).pipe(
        map((res) => res?.levels ?? []),
        catchError(() => {
          this.courseCache = undefined;
          return of<CourseLevelDto[]>([]);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.courseCache;
  }
```

- [ ] **Step 4: утилиты** — `ge-plan.util.ts`:

```ts
import { GePlanTask } from '../../../core/services/teacher-ge.service';

/** Перевод подписи: компонент отдаёт сюда translate.instant, спека — свой словарь. */
export type Tr = (key: string, params?: Record<string, unknown>) => string;
export type GeOrigin = 'programme' | 'teacher' | 'homework' | 'live';
export type GeView = 'day' | 'week' | 'month';

export const GE_MODULES = ['ai_tutor', 'workbooks', 'shadowing', 'media_practice', 'vocabulary_sr'];

/** Ключ текста на месте плана, когда плана нет (state бэкенда ≠ ready). */
export const GE_STATE_KEY: Record<string, string> = {
  no_onboarding: 'gePlan.state.noOnboarding',
  no_route: 'gePlan.state.noRoute',
  no_level: 'gePlan.state.noLevel',
  reached: 'gePlan.state.reached',
};

/** Цвет строки — кто поставил задачу. Занятия и ДЗ приходят подмешанными, своего origin у них нет. */
export function originOf(t: GePlanTask): GeOrigin {
  if (t.kind === 'live') return 'live';
  if (t.kind === 'homework') return 'homework';
  return t.origin === 'teacher' ? 'teacher' : 'programme';
}

// даты — календарные 'YYYY-MM-DD', считаем в UTC: переход на летнее время не сдвигает день
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function mondayOf(iso: string): string {
  return addDays(iso, -((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7));
}

export function weekDays(cursor: string): string[] {
  const m = mondayOf(cursor);
  return Array.from({ length: 7 }, (_, i) => addDays(m, i));
}

/** Сетка месяца: шесть недель с понедельника — это же и окно загрузки плана. */
export function monthDays(cursor: string): string[] {
  const start = mondayOf(`${cursor.slice(0, 7)}-01`);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function shiftCursor(cursor: string, view: GeView, dir: number): string {
  if (view === 'day') return addDays(cursor, dir);
  if (view === 'week') return addDays(cursor, 7 * dir);
  const [y, m] = cursor.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + dir, 1)).toISOString().slice(0, 10);
}

/** Окно загрузки: сетка месяца курсора покрывает и его день, и его неделю (неделя на стыке месяцев — тоже). */
export function windowOf(cursor: string): { from: string; to: string } {
  const days = monthDays(cursor);
  const week = weekDays(cursor);
  return { from: days[0] < week[0] ? days[0] : week[0], to: days[41] > week[6] ? days[41] : week[6] };
}

/** «Сегодня» школы — Алматы, UTC+5, как у бэкенда (GePlanService.ZONE); до ответа сервера курсор ставится по нему. */
export function almatyToday(now: number = Date.now()): string {
  return new Date(now + 5 * 3600_000).toISOString().slice(0, 10);
}

export function byDate(tasks: GePlanTask[]): Record<string, GePlanTask[]> {
  const out: Record<string, GePlanTask[]> = {};
  for (const t of tasks || []) (out[t.date] = out[t.date] || []).push(t);
  return out;
}

export function taskTitle(t: GePlanTask, tr: Tr): string {
  const x = t.extra || {};
  if (t.origin === 'teacher' && x.title) return x.title;
  switch (t.kind) {
    case 'course':
      return x.lessonTitle ? tr('gePlan.task.courseNamed', { title: x.lessonTitle }) : tr('gePlan.task.course');
    case 'unit':
      return x.unitTitle || tr('gePlan.task.unit');
    case 'custom':
      return tr('gePlan.task.custom');
    case 'live':
      return tr('gePlan.task.live');
    case 'homework':
      return t.title || tr('gePlan.task.homework');
    default:
      return tr(`gePlan.module.${GE_MODULES.includes(t.module || '') ? t.module : 'media_practice'}`);
  }
}

/** Вторая строка: минуты (у начатой практики — сколько набрано), срок ДЗ, время занятия с преподавателем. */
export function taskMeta(t: GePlanTask, tr: Tr): string {
  const x = t.extra || {};
  if (t.kind === 'live') return [x.scheduledAt?.slice(11, 16), x.teacherName].filter(Boolean).join(' · ');
  if (t.kind === 'homework') return x.dueDate ? tr('gePlan.due', { date: shortDate(x.dueDate) }) : '';
  if (t.kind === 'practice' && t.got > 0 && t.status !== 'completed') return tr('gePlan.minOf', { got: t.got, n: t.minutes });
  return t.minutes ? tr('gePlan.min', { n: t.minutes }) : '';
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}`;
}

export function statusTone(t: GePlanTask): 'done' | 'late' | 'progress' | 'plan' {
  if (t.status === 'completed') return 'done';
  if (t.overdue) return 'late';
  if (t.status === 'in_progress') return 'progress';
  return 'plan';
}

/** Пункты меню строки: правка своей, перенос задачи программы, отметка материала и своего задания, удаление своей. */
export function taskActions(t: GePlanTask): { edit: boolean; move: boolean; mark: boolean; remove: boolean } {
  const own = t.editable === 'full';
  return {
    edit: own,
    move: t.editable === 'date',
    mark: own && (t.kind === 'unit' || t.kind === 'custom'),
    remove: own,
  };
}

/** Подписи дня и месяца — языком интерфейса; Intl, а не свой словарь: дни недели и месяцы в нём уже есть. */
const LOCALE: Record<string, string> = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-GB' };

export function dayTitle(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(LOCALE[lang] || 'ru-RU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(`${iso}T00:00:00Z`));
}

export function dowShort(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(LOCALE[lang] || 'ru-RU', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
}

export function monthTitle(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(LOCALE[lang] || 'ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${iso.slice(0, 7)}-01T00:00:00Z`));
}
```

- [ ] **Step 5: спека утилит** — `ge-plan.util.spec.ts`:

```ts
import { GePlanTask } from '../../../core/services/teacher-ge.service';
import { almatyToday, byDate, monthDays, originOf, shiftCursor, statusTone, taskActions, taskMeta, taskTitle, weekDays, windowOf } from './ge-plan.util';

const tr = (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k);

function task(over: Partial<GePlanTask>): GePlanTask {
  return {
    id: 1, key: 'k', date: '2026-10-14', originalDate: '2026-10-14', kind: 'practice', module: 'ai_tutor', minutes: 15, got: 0,
    status: 'available', overdue: false, movable: true, title: null, origin: 'programme', editable: 'date', extra: {}, ...over,
  };
}

describe('ge-plan.util', () => {
  it('источник строки', () => {
    expect(originOf(task({}))).toBe('programme');
    expect(originOf(task({ origin: 'teacher' }))).toBe('teacher');
    expect(originOf(task({ kind: 'homework', origin: null }))).toBe('homework');
    expect(originOf(task({ kind: 'live', origin: null }))).toBe('live');
  });

  it('даты: неделя с понедельника, месяц — 42 дня, окно покрывает неделю на стыке месяцев', () => {
    expect(weekDays('2026-10-14')[0]).toBe('2026-10-12');
    expect(monthDays('2026-10-14')[0]).toBe('2026-09-28');
    expect(monthDays('2026-10-14').length).toBe(42);
    expect(shiftCursor('2026-01-31', 'month', 1)).toBe('2026-02-01');
    expect(windowOf('2026-10-14')).toEqual({ from: '2026-09-28', to: '2026-11-08' });
    expect(almatyToday(Date.parse('2026-10-13T20:00:00Z'))).toBe('2026-10-14');
    expect(Object.keys(byDate([task({}), task({ id: 2, date: '2026-10-15' })]))).toEqual(['2026-10-14', '2026-10-15']);
  });

  it('подписи задач', () => {
    expect(taskTitle(task({ origin: 'teacher', kind: 'custom', extra: { title: 'Сериал' } }), tr)).toBe('Сериал');
    expect(taskTitle(task({ origin: 'teacher', kind: 'course', extra: { lessonTitle: 'Famous people' } }), tr))
      .toBe('gePlan.task.courseNamed:{"title":"Famous people"}');
    expect(taskTitle(task({ kind: 'course', module: null }), tr)).toBe('gePlan.task.course');
    expect(taskTitle(task({ origin: 'teacher', kind: 'unit', extra: { unitTitle: 'Present Simple' } }), tr)).toBe('Present Simple');
    expect(taskTitle(task({}), tr)).toBe('gePlan.module.ai_tutor');
    expect(taskMeta(task({ got: 6, status: 'in_progress' }), tr)).toBe('gePlan.minOf:{"got":6,"n":15}');
    expect(taskMeta(task({ kind: 'homework', extra: { dueDate: '2026-10-20' } }), tr)).toBe('gePlan.due:{"date":"20.10"}');
  });

  it('статус и меню', () => {
    expect(statusTone(task({ status: 'completed', overdue: true }))).toBe('done');
    expect(statusTone(task({ overdue: true }))).toBe('late');
    expect(taskActions(task({ origin: 'teacher', kind: 'custom', editable: 'full' }))).toEqual({ edit: true, move: false, mark: true, remove: true });
    expect(taskActions(task({ origin: 'teacher', kind: 'course', editable: 'full' })).mark).toBeFalse();
    expect(taskActions(task({}))).toEqual({ edit: false, move: true, mark: false, remove: false });
    expect(taskActions(task({ kind: 'live', editable: 'none' }))).toEqual({ edit: false, move: false, mark: false, remove: false });
  });
});
```
- [ ] **Step 6: прогон** — `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/core/services/teacher-ge.service.spec.ts --include=src/app/feature/system/ge-plan/ge-plan.util.spec.ts` → PASS.
- [ ] **Step 7: коммит** — `feat(ge-plan): сервис кабинета преподавателя GE, каталог уроков курса, утилиты плана`.

### Task B2: анкета и диалог задачи

**Files:**
- Create: `src/app/feature/system/ge-plan/ge-profile-card.component.{ts,html,scss}` + `.spec.ts`
- Create: `src/app/feature/system/ge-plan/ge-task-dialog.component.{ts,html,scss}` + `ge-task-form.ts` + `ge-task-form.spec.ts`
- Modify: `src/assets/i18n/{ru,kk,en}.json` — ключи `geProfile.*`, `gePlan.*` (полный список — Task B4, Step 1; добавить
  здесь все сразу, иначе спеки с настоящим словарём упадут на сыром ключе)

**Interfaces:**
- Consumes: B1.
- Produces: `<app-ge-profile-card [profile] [studentId]>`; `GeTaskDialogComponent` с `GeTaskDialogData {studentId, today,
  studentLevel, courseDone, task, date?}`, закрывается строкой `GePlanTask` или `undefined`; `buildTaskRequest(form)`.

- [ ] **Step 1: `ge-task-form.ts` (чистая сборка тела запроса) и его спека**:

```ts
import { PracticeUnitDto } from '../../../core/services/practice-catalog.service';
import { GeTaskRequest, GeTaskType } from '../../../core/services/teacher-ge.service';

/** Состояние формы диалога «Дать задание». */
export interface GeTaskForm {
  type: GeTaskType;
  date: string;
  minutes: number | null;
  title: string;
  note: string;
  level: string;
  lessonCode: string;
  lessonTitle: string;
  module: string;
  area: string;
  unitLevel: string;
  unit: PracticeUnitDto | null;
}

/**
 * Тело запроса или ключ ошибки. Строки уходят как есть (пустая — «стереть»): бэкенд читает отсутствующее поле как «не
 * менять», поэтому очистить комментарий при правке можно только пустой строкой.
 */
export function buildTaskRequest(f: GeTaskForm): GeTaskRequest | { error: string } {
  if (!f.date) return { error: 'gePlan.dialog.err.date' };
  const base: GeTaskRequest = { type: f.type, date: f.date, minutes: f.minutes ?? null, title: f.title.trim(), note: f.note.trim() };
  switch (f.type) {
    case 'course':
      if (!f.lessonCode) return { error: 'gePlan.dialog.err.lesson' };
      return { ...base, level: f.level, lessonCode: f.lessonCode, lessonTitle: f.lessonTitle };
    case 'practice':
      if (!f.minutes) return { error: 'gePlan.dialog.err.minutes' };
      return { ...base, module: f.module };
    case 'unit':
      if (!f.unit) return { error: 'gePlan.dialog.err.unit' };
      return { ...base, area: f.area, level: f.unitLevel || null, unitId: f.unit.id ?? null, unitKey: f.unit.key ?? null, unitTitle: f.unit.title };
    default:
      if (!f.title.trim()) return { error: 'gePlan.dialog.err.title' };
      return base;
  }
}
```

```ts
import { buildTaskRequest, GeTaskForm } from './ge-task-form';

const form = (over: Partial<GeTaskForm>): GeTaskForm => ({
  type: 'custom', date: '2026-10-14', minutes: null, title: '', note: '', level: 'A1', lessonCode: '', lessonTitle: '',
  module: 'ai_tutor', area: '', unitLevel: '', unit: null, ...over,
});

describe('buildTaskRequest', () => {
  it('у каждого вида — свои обязательные поля', () => {
    expect(buildTaskRequest(form({ date: '' }))).toEqual({ error: 'gePlan.dialog.err.date' });
    expect(buildTaskRequest(form({}))).toEqual({ error: 'gePlan.dialog.err.title' });
    expect(buildTaskRequest(form({ type: 'course' }))).toEqual({ error: 'gePlan.dialog.err.lesson' });
    expect(buildTaskRequest(form({ type: 'practice' }))).toEqual({ error: 'gePlan.dialog.err.minutes' });
    expect(buildTaskRequest(form({ type: 'unit' }))).toEqual({ error: 'gePlan.dialog.err.unit' });
  });

  it('урок курса, материал и своё задание', () => {
    expect(buildTaskRequest(form({ type: 'course', lessonCode: 'L7', lessonTitle: 'Famous people', note: ' повтори ' }))).toEqual({
      type: 'course', date: '2026-10-14', minutes: null, title: '', note: 'повтори', level: 'A1', lessonCode: 'L7', lessonTitle: 'Famous people',
    });
    const unit = { id: 3, title: 'Present Simple', section: '', minutes: 7, difficulty: 1 };
    expect(buildTaskRequest(form({ type: 'unit', area: 'grammar', unitLevel: 'a1', unit }))).toEqual(jasmine.objectContaining({
      area: 'grammar', level: 'a1', unitId: 3, unitKey: null, unitTitle: 'Present Simple',
    }));
    expect(buildTaskRequest(form({ title: 'Сериал', minutes: 40 }))).toEqual(jasmine.objectContaining({ type: 'custom', title: 'Сериал', minutes: 40 }));
  });
});
```

- [ ] **Step 2: `GeProfileCardComponent`**:

```ts
import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { GeProfileView, TeacherGeService } from '../../../core/services/teacher-ge.service';

/**
 * Анкета ученика общего курса — по образцу ielts-diagnostic-card: цель, зачем, срок, минуты в день, старт, формат.
 * Данные — входом (карточка уже их загрузила) или сама по studentId (вкладка «Анкета» отдельно от плана).
 */
@Component({
  selector: 'app-ge-profile-card',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './ge-profile-card.component.html',
  styleUrl: './ge-profile-card.component.scss',
})
export class GeProfileCardComponent implements OnChanges {
  @Input() profile: GeProfileView | null | undefined;
  @Input() studentId: number | null = null;

  failed = false;

  constructor(private service: TeacherGeService) {}

  ngOnChanges(): void {
    if (this.profile !== undefined || !this.studentId) return;
    this.service.profile(this.studentId).subscribe({
      next: (r) => (this.profile = r?.profile ?? null),
      error: () => (this.failed = true),
    });
  }

  get onboarded(): boolean {
    return !!this.profile?.onboarded;
  }

  get goal(): string {
    const p = this.profile;
    if (!p?.targetLevel) return '—';
    return p.fromLevel ? `${p.fromLevel} → ${p.targetLevel}` : p.targetLevel;
  }
}
```

```html
<section class="gpc">
  <h3 class="gpc__title">{{ 'geProfile.title' | translate }}</h3>
  <p class="gpc__empty" *ngIf="failed">{{ 'gePlan.err.load' | translate }}</p>
  <p class="gpc__empty" *ngIf="!failed && profile !== undefined && !onboarded">{{ 'geProfile.empty' | translate }}</p>
  <dl class="gpc__grid" *ngIf="onboarded && profile as p">
    <dt>{{ 'geProfile.goal' | translate }}</dt>
    <dd class="gpc__goal">{{ goal }}</dd>
    <dt>{{ 'geProfile.purposeLabel' | translate }}</dt>
    <dd>{{ p.purpose ? ('geProfile.purpose.' + p.purpose | translate) : '—' }}</dd>
    <dt>{{ 'geProfile.deadline' | translate }}</dt>
    <dd>{{ p.deadlineDate ? (p.deadlineDate | date: 'dd.MM.yyyy') : p.deadlineWindow ? ('geProfile.window.' + p.deadlineWindow | translate) : '—' }}</dd>
    <dt>{{ 'geProfile.daily' | translate }}</dt>
    <dd>{{ p.dailyMinutes ? ('geProfile.minutes' | translate: { n: p.dailyMinutes }) : '—' }}</dd>
    <dt>{{ 'geProfile.startLabel' | translate }}</dt>
    <dd>{{ p.startMode ? ('geProfile.start.' + p.startMode | translate) : '—' }}</dd>
    <dt>{{ 'geProfile.routeLabel' | translate }}</dt>
    <dd>{{ p.route ? ('geProfile.route.' + p.route | translate) : ('geProfile.routeNone' | translate) }}</dd>
    <dt>{{ 'geProfile.filled' | translate }}</dt>
    <dd>{{ p.onboardedAt | date: 'dd.MM.yyyy' }}</dd>
  </dl>
</section>
```

```scss
.gpc {
  padding: 16px 20px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 12px;
  background: var(--color-surface, #fff);
}
.gpc__title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 700;
}
.gpc__empty {
  margin: 0;
  color: var(--color-text-secondary, #6b7280);
}
.gpc__grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 8px 16px;
  margin: 0;
  dt {
    color: var(--color-text-secondary, #6b7280);
  }
  dd {
    margin: 0;
  }
}
.gpc__goal {
  font-weight: 700;
}
```

  Спека `ge-profile-card.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { GeProfileCardComponent } from './ge-profile-card.component';
import { TeacherGeService } from '../../../core/services/teacher-ge.service';
import { translateTesting } from '../../../../testing/translate-testing';

describe('GeProfileCardComponent', () => {
  const profile = {
    onboarded: true, purpose: 'work', targetLevel: 'B1', fromLevel: 'A1', deadlineDate: null, deadlineWindow: '3-6m',
    dailyMinutes: 30, startMode: 'some', route: 'group', onboardedAt: '2026-10-12T09:00:00',
  };

  async function render(inputs: Record<string, unknown>, service: Partial<TeacherGeService> = {}) {
    await TestBed.configureTestingModule({
      imports: [GeProfileCardComponent, translateTesting()],
      providers: [{ provide: TeacherGeService, useValue: service }],
    }).compileComponents();
    const fixture = TestBed.createComponent(GeProfileCardComponent);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('анкета: цель дорожкой и подписи кодов', async () => {
    const el = await render({ profile });
    expect(el.textContent).toContain('A1 → B1');
    expect(el.textContent).toContain('Работа и карьера');
    expect(el.textContent).toContain('В группе');
    expect(el.textContent).toContain('30 мин');
  });

  it('анкеты нет — так и пишет', async () => {
    const el = await render({ profile: { ...profile, onboarded: false } });
    expect(el.textContent).toContain('Ученик ещё не заполнил анкету');
  });

  it('без входа profile грузит сама по studentId', async () => {
    const load = jasmine.createSpy('profile').and.returnValue(of({ profile }));
    const el = await render({ studentId: 7 }, { profile: load });
    expect(load).toHaveBeenCalledWith(7);
    expect(el.textContent).toContain('A1 → B1');
  });
});
```

- [ ] **Step 3: `GeTaskDialogComponent`**:

```ts
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { GePlanTask, GeTaskType, TeacherGeService } from '../../../core/services/teacher-ge.service';
import { CourseLevelDto, PracticeAreaDto, PracticeCatalogService, PracticeUnitDto } from '../../../core/services/practice-catalog.service';
import { GE_MODULES, addDays } from './ge-plan.util';
import { buildTaskRequest, GeTaskForm } from './ge-task-form';

export interface GeTaskDialogData {
  studentId: number;
  today: string;
  studentLevel: string | null;
  courseDone: Record<string, string[]>;
  /** Правка: своя задача — все поля, задача программы — только дата. */
  task: GePlanTask | null;
  date?: string;
}

const COURSE_LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2'];
const DEFAULT_MINUTES: Record<GeTaskType, number | null> = { course: 30, practice: 20, unit: 20, custom: 20 };

/**
 * «Задание в план» ученика общего курса: урок курса, практика по минутам, материал Практики или своё задание. Одна форма
 * в три блока (вид → содержимое → когда): у IELTS это шаги, но здесь полей меньше, и шаги только прятали бы их.
 */
@Component({
  selector: 'app-ge-task-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule, MatSelectModule, TranslateModule],
  templateUrl: './ge-task-dialog.component.html',
  styleUrl: './ge-task-dialog.component.scss',
})
export class GeTaskDialogComponent implements OnInit {
  readonly types: GeTaskType[] = ['course', 'practice', 'unit', 'custom'];
  readonly modules = GE_MODULES;
  readonly courseLevelCodes = COURSE_LEVELS;

  form: GeTaskForm;
  unitAddr = '';
  courseLevels: CourseLevelDto[] = [];
  areas: PracticeAreaDto[] = [];
  catalogFailed = false;
  busy = false;
  error: string | null = null;
  serverError: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: GeTaskDialogData,
    private ref: MatDialogRef<GeTaskDialogComponent, GePlanTask>,
    private service: TeacherGeService,
    private catalog: PracticeCatalogService,
  ) {
    const t = data.task;
    const x = t?.extra || {};
    const level = COURSE_LEVELS.includes(String(x.level || data.studentLevel || '').toUpperCase())
      ? String(x.level || data.studentLevel).toUpperCase() : 'A1';
    this.form = {
      type: (t && t.kind !== 'live' && t.kind !== 'homework' ? t.kind : 'practice') as GeTaskType,
      date: t?.date || data.date || data.today,
      minutes: t?.minutes ?? DEFAULT_MINUTES.practice,
      title: x.title || '',
      note: x.note || '',
      level,
      lessonCode: x.lessonCode || '',
      lessonTitle: x.lessonTitle || '',
      module: t?.module || 'ai_tutor',
      area: x.area || '',
      unitLevel: t?.kind === 'unit' ? x.level || '' : '',
      unit: null,
    };
    if (t?.kind === 'unit') this.unitAddr = x.unitId != null ? `id:${x.unitId}` : `key:${x.unitKey}`;
  }

  get dateOnly(): boolean {
    return this.data.task?.editable === 'date';
  }

  get editing(): boolean {
    return !!this.data.task;
  }

  ngOnInit(): void {
    if (this.dateOnly) return;
    this.catalog.courseLessons().subscribe((levels) => (this.courseLevels = levels));
    this.catalog.areas().subscribe((areas) => {
      this.areas = areas;
      this.catalogFailed = !areas.length;
      this.form.unit = this.findUnit();
    });
  }

  setType(type: GeTaskType): void {
    if (this.editing) return;
    this.form.type = type;
    this.form.minutes = DEFAULT_MINUTES[type];
    this.error = null;
  }

  quick(days: number): void {
    this.form.date = addDays(this.data.today, days);
  }

  get lessons() {
    return this.courseLevels.find((l) => l.level === this.form.level)?.lessons ?? [];
  }

  passed(code: string): boolean {
    return (this.data.courseDone[this.form.level] || []).includes(code);
  }

  pickLesson(code: string): void {
    this.form.lessonCode = code;
    this.form.lessonTitle = this.lessons.find((l) => l.code === code)?.title || code;
  }

  get area(): PracticeAreaDto | undefined {
    return this.areas.find((a) => a.key === this.form.area);
  }

  get units(): PracticeUnitDto[] {
    return this.area?.levels.find((l) => l.code === this.form.unitLevel)?.units ?? [];
  }

  unitValue(u: PracticeUnitDto): string {
    return u.id != null ? `id:${u.id}` : `key:${u.key}`;
  }

  pickUnit(value: string): void {
    this.unitAddr = value;
    this.form.unit = this.findUnit();
  }

  private findUnit(): PracticeUnitDto | null {
    return this.units.find((u) => this.unitValue(u) === this.unitAddr) ?? null;
  }

  save(): void {
    this.error = null;
    this.serverError = null;
    const req = this.dateOnly ? (this.form.date ? { date: this.form.date } : { error: 'gePlan.dialog.err.date' }) : buildTaskRequest(this.form);
    if ('error' in req) {
      this.error = req.error;
      return;
    }
    this.busy = true;
    const call = this.data.task
      ? this.service.updateTask(this.data.studentId, Number(this.data.task.id), req)
      : this.service.addTask(this.data.studentId, req);
    call.subscribe({
      next: (t) => this.ref.close(t),
      error: (e) => {
        this.busy = false;
        // бэкенд объясняет отказ сам («Этот урок ученик уже прошёл») — показываем его текст
        this.serverError = e?.error?.messages?.[0] || e?.error?.message || null;
        if (!this.serverError) this.error = 'gePlan.dialog.err.server';
      },
    });
  }

  cancel(): void {
    this.ref.close();
  }
}
```

```html
<h2 mat-dialog-title>{{ (dateOnly ? 'gePlan.dialog.titleMove' : editing ? 'gePlan.dialog.titleEdit' : 'gePlan.dialog.titleNew') | translate }}</h2>
<mat-dialog-content class="gtd">
  <p class="gtd__hint" *ngIf="dateOnly">{{ 'gePlan.dialog.programmeNote' | translate }}</p>

  <ng-container *ngIf="!dateOnly">
    <section class="gtd__block">
      <h3>{{ 'gePlan.dialog.type' | translate }}</h3>
      <mat-button-toggle-group [value]="form.type" [disabled]="editing" (change)="setType($event.value)">
        <mat-button-toggle *ngFor="let t of types" [value]="t">{{ 'gePlan.dialog.typeOf.' + t | translate }}</mat-button-toggle>
      </mat-button-toggle-group>
    </section>

    <section class="gtd__block" [ngSwitch]="form.type">
      <ng-container *ngSwitchCase="'course'">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'gePlan.dialog.level' | translate }}</mat-label>
          <mat-select [(ngModel)]="form.level" (selectionChange)="form.lessonCode = ''">
            <mat-option *ngFor="let l of courseLevelCodes" [value]="l">{{ l }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="gtd__wide">
          <mat-label>{{ 'gePlan.dialog.lesson' | translate }}</mat-label>
          <mat-select [value]="form.lessonCode" (selectionChange)="pickLesson($event.value)">
            <mat-option *ngFor="let l of lessons" [value]="l.code" [disabled]="passed(l.code)">
              {{ l.code }} · {{ l.title }}<span *ngIf="passed(l.code)"> — {{ 'gePlan.dialog.passed' | translate }}</span>
            </mat-option>
          </mat-select>
        </mat-form-field>
      </ng-container>

      <mat-form-field *ngSwitchCase="'practice'" appearance="outline" class="gtd__wide">
        <mat-label>{{ 'gePlan.dialog.module' | translate }}</mat-label>
        <mat-select [(ngModel)]="form.module">
          <mat-option *ngFor="let m of modules" [value]="m">{{ 'gePlan.module.' + m | translate }}</mat-option>
        </mat-select>
      </mat-form-field>

      <ng-container *ngSwitchCase="'unit'">
        <p class="gtd__hint" *ngIf="catalogFailed">{{ 'gePlan.dialog.catalogFail' | translate }}</p>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'gePlan.dialog.area' | translate }}</mat-label>
          <mat-select [(ngModel)]="form.area" (selectionChange)="form.unitLevel = ''; pickUnit('')">
            <mat-option *ngFor="let a of areas" [value]="a.key">{{ a.title }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" *ngIf="area">
          <mat-label>{{ 'gePlan.dialog.level' | translate }}</mat-label>
          <mat-select [(ngModel)]="form.unitLevel" (selectionChange)="pickUnit('')">
            <mat-option *ngFor="let l of area.levels" [value]="l.code">{{ l.label }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="gtd__wide" *ngIf="form.unitLevel">
          <mat-label>{{ 'gePlan.dialog.unit' | translate }}</mat-label>
          <mat-select [value]="unitAddr" (selectionChange)="pickUnit($event.value)">
            <mat-option *ngFor="let u of units" [value]="unitValue(u)">{{ u.title }}</mat-option>
          </mat-select>
        </mat-form-field>
      </ng-container>
    </section>

    <mat-form-field appearance="outline" class="gtd__wide">
      <mat-label>{{ (form.type === 'custom' ? 'gePlan.dialog.nameRequired' : 'gePlan.dialog.name') | translate }}</mat-label>
      <input matInput maxlength="200" [(ngModel)]="form.title" />
    </mat-form-field>
    <mat-form-field appearance="outline" class="gtd__wide">
      <mat-label>{{ 'gePlan.dialog.note' | translate }}</mat-label>
      <textarea matInput rows="2" maxlength="2000" [(ngModel)]="form.note"></textarea>
    </mat-form-field>
  </ng-container>

  <section class="gtd__block">
    <h3>{{ 'gePlan.dialog.when' | translate }}</h3>
    <div class="gtd__quick">
      <button mat-stroked-button type="button" (click)="quick(0)">{{ 'gePlan.dialog.quick.today' | translate }}</button>
      <button mat-stroked-button type="button" (click)="quick(1)">{{ 'gePlan.dialog.quick.plus1' | translate }}</button>
      <button mat-stroked-button type="button" (click)="quick(3)">{{ 'gePlan.dialog.quick.plus3' | translate }}</button>
      <button mat-stroked-button type="button" (click)="quick(7)">{{ 'gePlan.dialog.quick.plus7' | translate }}</button>
    </div>
    <div class="gtd__row">
      <mat-form-field appearance="outline">
        <mat-label>{{ 'gePlan.dialog.date' | translate }}</mat-label>
        <input matInput type="date" [min]="data.today" [(ngModel)]="form.date" />
      </mat-form-field>
      <mat-form-field appearance="outline" *ngIf="!dateOnly">
        <mat-label>{{ 'gePlan.dialog.minutes' | translate }}</mat-label>
        <input matInput type="number" min="1" max="600" [(ngModel)]="form.minutes" />
      </mat-form-field>
    </div>
  </section>

  <p class="gtd__error" role="alert" *ngIf="error || serverError">{{ serverError || (error! | translate) }}</p>
</mat-dialog-content>
<mat-dialog-actions align="end">
  <button mat-button type="button" (click)="cancel()">{{ 'gePlan.dialog.cancel' | translate }}</button>
  <button mat-flat-button color="primary" type="button" [disabled]="busy" (click)="save()">{{ 'gePlan.dialog.save' | translate }}</button>
</mat-dialog-actions>
```

```scss
.gtd {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: min(520px, 90vw);
}
.gtd__block {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-bottom: 8px;
  h3 {
    flex-basis: 100%;
    margin: 0;
    font-size: 14px;
    font-weight: 700;
  }
}
.gtd__wide {
  width: 100%;
}
.gtd__quick,
.gtd__row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex-basis: 100%;
}
.gtd__hint {
  margin: 0 0 8px;
  color: var(--color-text-secondary, #6b7280);
}
.gtd__error {
  margin: 0;
  color: #c2410c;
}
```
- [ ] **Step 4: прогон** — `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/feature/system/ge-plan/**/*.spec.ts` → PASS.
- [ ] **Step 5: коммит** — `feat(ge-plan): анкета ученика и диалог «Задание в план»`.

### Task B3: план ученика у преподавателя и вкладки карточки

**Files:**
- Create: `src/app/feature/system/ge-plan/ge-student-plan.component.{ts,html,scss}` + `.spec.ts`
- Modify: `src/app/feature/system/my-students/student-overview/student-overview.component.{ts,html}`
- Modify: `src/app/feature/system/users/user-detail/user-detail.component.{ts,html}`

**Interfaces:**
- Consumes: B1, B2; `CreateHomeworkDialogComponent` (`{ groups: [], studentId }`), `ToastService.showSuccess/showError`.
- Produces: `<app-ge-student-plan [studentId]>`.

- [ ] **Step 1: `GeStudentPlanComponent`**:

```ts
import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { GePlanTask, GeStudentView, TeacherGeService } from '../../../core/services/teacher-ge.service';
import { ToastService } from '../../../core/services/toast.service';
import { CreateHomeworkDialogComponent } from '../homework/create-homework-dialog/create-homework-dialog.component';
import { GeTaskDialogComponent, GeTaskDialogData } from './ge-task-dialog.component';
import {
  GE_STATE_KEY, GeView, almatyToday, byDate, dayTitle, dowShort, monthDays, monthTitle, originOf, shiftCursor, shortDate,
  statusTone, taskActions, taskMeta, taskTitle, weekDays, windowOf,
} from './ge-plan.util';

/**
 * План по дням ученика общего курса в кабинете преподавателя: день / неделя / месяц, как вкладка «План» у IELTS, но
 * кодом своего раздела (IELTS не трогаем). Строки — те же, что у ученика: программа, задачи преподавателя (синие), ДЗ
 * (оранжевые) и занятия. «Дать задание» ставит строку плана, «Домашнее задание» — обычную домашку /admin/homework.
 */
@Component({
  selector: 'app-ge-student-plan',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule, MatMenuModule, MatProgressSpinnerModule, MatTooltipModule, TranslateModule],
  templateUrl: './ge-student-plan.component.html',
  styleUrl: './ge-student-plan.component.scss',
})
export class GeStudentPlanComponent implements OnChanges {
  @Input({ required: true }) studentId!: number;

  s: GeStudentView | null = null;
  loading = false;
  error: string | null = null;
  view: GeView = 'week';
  cursor = almatyToday();
  byDate: Record<string, GePlanTask[]> = {};
  private loaded: string | null = null;

  readonly originOf = originOf;
  readonly statusTone = statusTone;
  readonly actions = taskActions;
  readonly stateKey = GE_STATE_KEY;

  constructor(
    private service: TeacherGeService,
    private dialog: MatDialog,
    private toast: ToastService,
    private translate: TranslateService,
  ) {}

  ngOnChanges(): void {
    this.s = null;
    this.loaded = null;
    this.load();
  }

  private tr = (key: string, params?: Record<string, unknown>) => this.translate.instant(key, params);
  private get lang(): string {
    return this.translate.currentLang || this.translate.defaultLang || 'ru';
  }

  load(): void {
    const w = windowOf(this.cursor);
    this.loading = true;
    this.error = null;
    this.service.student(this.studentId, w.from, w.to).subscribe({
      next: (s) => {
        this.s = s;
        this.loaded = `${w.from}|${w.to}`;
        this.byDate = byDate(s.plan.tasks);
        this.loading = false;
      },
      error: (e) => {
        this.loading = false;
        this.error = e?.status === 403 ? 'gePlan.err.notMine' : 'gePlan.err.load';
      },
    });
  }

  get today(): string {
    return this.s?.plan.today || almatyToday();
  }

  get canPlan(): boolean {
    return this.s?.plan.state === 'ready';
  }

  get weekDays(): string[] {
    return weekDays(this.cursor);
  }

  get monthDays(): string[] {
    return monthDays(this.cursor);
  }

  get periodLabel(): string {
    if (this.view === 'day') return dayTitle(this.cursor, this.lang);
    if (this.view === 'week') return `${shortDate(this.weekDays[0])} – ${shortDate(this.weekDays[6])}`;
    return monthTitle(this.cursor, this.lang);
  }

  setView(v: GeView): void {
    this.view = v;
  }

  shift(dir: number): void {
    this.go(shiftCursor(this.cursor, this.view, dir));
  }

  go(date: string): void {
    this.cursor = date;
    const w = windowOf(date);
    if (this.loaded !== `${w.from}|${w.to}`) this.load();
  }

  openDay(d: string): void {
    this.view = 'day';
    this.go(d);
  }

  day(d: string): string {
    return dayTitle(d, this.lang);
  }

  dow(d: string): string {
    return dowShort(d, this.lang);
  }

  title(t: GePlanTask): string {
    return taskTitle(t, this.tr);
  }

  meta(t: GePlanTask): string {
    return taskMeta(t, this.tr);
  }

  status(t: GePlanTask): string {
    return this.tr(`gePlan.status.${statusTone(t)}`);
  }

  minutesOf(list: GePlanTask[]): number {
    return list.filter((t) => t.kind !== 'homework' && t.status !== 'completed').reduce((a, t) => a + (t.minutes || 0), 0);
  }

  // ------------------------------------------------------------------ действия

  openTask(task: GePlanTask | null, date?: string): void {
    if (!this.s) return;
    const data: GeTaskDialogData = {
      studentId: this.studentId,
      today: this.today,
      studentLevel: this.s.user.languageLevel,
      courseDone: this.s.courseDone || {},
      task,
      date: date || (this.view === 'day' ? this.cursor : undefined),
    };
    this.dialog.open(GeTaskDialogComponent, { data, autoFocus: false, maxWidth: '96vw' }).afterClosed().subscribe((t) => {
      if (!t) return;
      this.toast.showSuccess(this.tr(task ? 'gePlan.toast.updated' : 'gePlan.toast.added'));
      this.load();
    });
  }

  openHomework(): void {
    this.dialog
      .open(CreateHomeworkDialogComponent, { width: '640px', data: { groups: [], studentId: this.studentId } })
      .afterClosed()
      .subscribe((created) => {
        if (created) this.load();
      });
  }

  mark(t: GePlanTask, done: boolean): void {
    this.act(this.service.done(this.studentId, Number(t.id), done), done ? 'gePlan.toast.marked' : 'gePlan.toast.unmarked');
  }

  remove(t: GePlanTask): void {
    if (!confirm(this.tr('gePlan.confirmDelete', { title: this.title(t) }))) return;
    this.act(this.service.deleteTask(this.studentId, Number(t.id)), 'gePlan.toast.removed');
  }

  private act(call: Observable<unknown>, ok: string): void {
    call.subscribe({
      next: () => {
        this.toast.showSuccess(this.tr(ok));
        this.load();
      },
      error: (e) => this.toast.showError(e?.error?.messages?.[0] || this.tr('gePlan.toast.fail')),
    });
  }
}
```

```html
<div class="gsp">
  <div class="gsp__loading" *ngIf="loading && !s"><mat-spinner diameter="28"></mat-spinner></div>
  <div class="gsp__error" *ngIf="error">
    {{ error | translate }}
    <button mat-button *ngIf="error !== 'gePlan.err.notMine'" (click)="load()">{{ 'gePlan.retry' | translate }}</button>
  </div>

  <ng-container *ngIf="s && !error">
    <header class="gsp__head">
      <b *ngIf="s.plan.week as w">{{ 'gePlan.week' | translate: { done: w.done, total: w.total } }}</b>
      <span class="gsp__sp"></span>
      <button mat-flat-button color="primary" [disabled]="!canPlan" (click)="openTask(null)"><mat-icon>add</mat-icon> {{ 'gePlan.addTask' | translate }}</button>
      <button mat-stroked-button (click)="openHomework()"><mat-icon>assignment</mat-icon> {{ 'gePlan.addHomework' | translate }}</button>
    </header>

    <p class="gsp__state" *ngIf="!canPlan">{{ stateKey[s.plan.state] | translate }}</p>

    <div class="gsp__bar">
      <div class="gsp__seg" role="tablist">
        <button type="button" role="tab" [class.on]="view === 'day'" (click)="setView('day')">{{ 'gePlan.view.day' | translate }}</button>
        <button type="button" role="tab" [class.on]="view === 'week'" (click)="setView('week')">{{ 'gePlan.view.week' | translate }}</button>
        <button type="button" role="tab" [class.on]="view === 'month'" (click)="setView('month')">{{ 'gePlan.view.month' | translate }}</button>
      </div>
      <button mat-icon-button (click)="shift(-1)" [attr.aria-label]="'gePlan.prev' | translate"><mat-icon>chevron_left</mat-icon></button>
      <b class="gsp__period">{{ periodLabel }}</b>
      <button mat-icon-button (click)="shift(1)" [attr.aria-label]="'gePlan.next' | translate"><mat-icon>chevron_right</mat-icon></button>
      <button mat-stroked-button (click)="go(today)">{{ 'gePlan.today' | translate }}</button>
      <span class="gsp__sp"></span>
      <span class="gsp__legend">
        <i class="o-programme"></i>{{ 'gePlan.legend.programme' | translate }}
        <i class="o-teacher"></i>{{ 'gePlan.legend.teacher' | translate }}
        <i class="o-homework"></i>{{ 'gePlan.legend.homework' | translate }}
        <i class="o-live"></i>{{ 'gePlan.legend.live' | translate }}
      </span>
    </div>

    <section class="gsp__card" *ngIf="view === 'day'">
      <div class="gsp__dayhd">
        <h3>{{ day(cursor) }}<span *ngIf="cursor === today"> · {{ 'gePlan.today' | translate }}</span></h3>
        <span class="gsp__muted">{{ 'gePlan.min' | translate: { n: minutesOf(byDate[cursor] || []) } }}</span>
        <span class="gsp__sp"></span>
        <button mat-stroked-button [disabled]="!canPlan" (click)="openTask(null, cursor)"><mat-icon>add</mat-icon> {{ 'gePlan.addForDay' | translate }}</button>
      </div>
      <p class="gsp__muted" *ngIf="!(byDate[cursor] || []).length">{{ 'gePlan.dayEmpty' | translate }}</p>
      <ul class="gsp__list">
        <li *ngFor="let t of byDate[cursor] || []" class="gsp__task" [ngClass]="['o-' + originOf(t), 'st-' + statusTone(t)]">
          <div class="gsp__body">
            <b>{{ title(t) }}</b>
            <small>{{ meta(t) }} · {{ status(t) }}</small>
            <small class="gsp__olab" *ngIf="originOf(t) === 'teacher'">{{ 'gePlan.legend.teacher' | translate }}<ng-container *ngIf="t.extra?.createdByName"> · {{ t.extra?.createdByName }}</ng-container></small>
            <em class="gsp__note" *ngIf="t.extra?.note">{{ t.extra?.note }}</em>
          </div>
          <ng-container *ngIf="actions(t) as a">
            <button mat-icon-button *ngIf="a.edit || a.move || a.mark || a.remove" [matMenuTriggerFor]="menu" [attr.aria-label]="'gePlan.menu.label' | translate"><mat-icon>more_vert</mat-icon></button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item *ngIf="a.edit" (click)="openTask(t)">{{ 'gePlan.menu.edit' | translate }}</button>
              <button mat-menu-item *ngIf="a.move" (click)="openTask(t)">{{ 'gePlan.menu.move' | translate }}</button>
              <button mat-menu-item *ngIf="a.mark && t.status !== 'completed'" (click)="mark(t, true)">{{ 'gePlan.menu.mark' | translate }}</button>
              <button mat-menu-item *ngIf="a.mark && t.status === 'completed'" (click)="mark(t, false)">{{ 'gePlan.menu.unmark' | translate }}</button>
              <button mat-menu-item *ngIf="a.remove" (click)="remove(t)">{{ 'gePlan.menu.remove' | translate }}</button>
            </mat-menu>
          </ng-container>
        </li>
      </ul>
    </section>

    <div class="gsp__week" *ngIf="view === 'week'">
      <section class="gsp__wcol" *ngFor="let d of weekDays" [class.today]="d === today">
        <header>
          <span>{{ dow(d) }}</span><b>{{ +d.slice(8) }}</b>
          <button mat-icon-button class="gsp__add" [disabled]="!canPlan" (click)="openTask(null, d)" [matTooltip]="'gePlan.addForDay' | translate"><mat-icon>add</mat-icon></button>
        </header>
        <button type="button" *ngFor="let t of byDate[d] || []" class="gsp__wtask" [ngClass]="['o-' + originOf(t), 'st-' + statusTone(t)]" (click)="openDay(d)">
          <b>{{ title(t) }}</b>
          <small>{{ meta(t) }}</small>
        </button>
        <p class="gsp__rest" *ngIf="!(byDate[d] || []).length">—</p>
      </section>
    </div>

    <div class="gsp__month" *ngIf="view === 'month'">
      <button type="button" *ngFor="let d of monthDays" class="gsp__mday" [class.out]="d.slice(0, 7) !== cursor.slice(0, 7)" [class.today]="d === today" (click)="openDay(d)">
        <span class="n">{{ +d.slice(8) }}</span>
        <span *ngFor="let t of (byDate[d] || []).slice(0, 3)" class="gsp__mchip" [ngClass]="['o-' + originOf(t), t.status === 'completed' ? 'done' : '']" [matTooltip]="title(t)">{{ title(t) }}</span>
        <span class="more" *ngIf="(byDate[d] || []).length > 3">{{ 'gePlan.more' | translate: { n: (byDate[d] || []).length - 3 } }}</span>
      </button>
    </div>
  </ng-container>
</div>
```

```scss
$programme: #9ca3af;
$teacher: #3b82f6;
$homework: #f08a24;
$live: #22a55b;

.gsp {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.gsp__loading,
.gsp__error {
  padding: 16px;
}
.gsp__head,
.gsp__bar,
.gsp__dayhd {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.gsp__sp {
  flex: 1;
}
.gsp__state,
.gsp__muted,
.gsp__rest {
  margin: 0;
  color: var(--color-text-secondary, #6b7280);
}
.gsp__seg {
  display: inline-flex;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 999px;
  overflow: hidden;
  button {
    padding: 6px 14px;
    border: 0;
    background: none;
    cursor: pointer;
    &.on {
      background: #ede9fe;
      font-weight: 700;
    }
  }
}
.gsp__legend {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  font-size: 12px;
  i {
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 4px;
    border-radius: 3px;
  }
}
.o-programme { --o: #{$programme}; }
.o-teacher { --o: #{$teacher}; }
.o-homework { --o: #{$homework}; }
.o-live { --o: #{$live}; }
.gsp__legend i {
  background: var(--o);
}
.gsp__card {
  padding: 16px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 12px;
  h3 {
    margin: 0;
    font-size: 16px;
  }
}
.gsp__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.gsp__task {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 10px;
  box-shadow: inset 3px 0 0 var(--o);
  &.st-done {
    opacity: 0.65;
  }
}
.gsp__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  small {
    color: var(--color-text-secondary, #6b7280);
  }
}
.gsp__olab {
  color: #{$teacher} !important;
  font-weight: 600;
}
.gsp__note {
  font-size: 13px;
  color: var(--color-text-secondary, #4b5563);
}
.st-late small:first-of-type {
  color: #c2410c;
}
.gsp__week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}
.gsp__wcol {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 10px;
  min-height: 140px;
  &.today {
    border-color: #a78bfa;
  }
  header {
    display: flex;
    align-items: center;
    gap: 4px;
    b {
      font-size: 16px;
    }
  }
}
.gsp__add {
  margin-left: auto;
}
.gsp__wtask {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  border: 0;
  border-radius: 8px;
  background: var(--color-surface-2, #f9fafb);
  box-shadow: inset 3px 0 0 var(--o);
  text-align: left;
  cursor: pointer;
  b {
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  small {
    font-size: 12px;
    color: var(--color-text-secondary, #6b7280);
  }
  &.st-done {
    opacity: 0.6;
  }
}
.gsp__month {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}
.gsp__mday {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 84px;
  padding: 4px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  background: none;
  text-align: left;
  cursor: pointer;
  &.out {
    opacity: 0.45;
  }
  &.today {
    border-color: #a78bfa;
  }
  .n {
    font-weight: 700;
  }
  .more {
    font-size: 11px;
    color: var(--color-text-secondary, #6b7280);
  }
}
.gsp__mchip {
  overflow: hidden;
  padding: 1px 4px;
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
  text-overflow: ellipsis;
  box-shadow: inset 3px 0 0 var(--o);
  &.done {
    text-decoration: line-through;
    opacity: 0.6;
  }
}
@media (max-width: 760px) {
  .gsp__week {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: спека** `ge-student-plan.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { GeStudentPlanComponent } from './ge-student-plan.component';
import { GeStudentView, TeacherGeService } from '../../../core/services/teacher-ge.service';
import { ToastService } from '../../../core/services/toast.service';
import { translateTesting } from '../../../../testing/translate-testing';
import { almatyToday } from './ge-plan.util';

describe('GeStudentPlanComponent', () => {
  const today = almatyToday();
  const view = (over: Partial<GeStudentView['plan']> = {}): GeStudentView => ({
    user: { id: 7, name: 'Сакен', languageLevel: 'A2' },
    profile: null,
    courseDone: {},
    plan: {
      today, state: 'ready', route: 'self_study', dailyMinutes: 30, planStart: today, planUntil: today, liveMissing: false,
      week: { start: today, done: 1, total: 3, percent: 33 },
      tasks: [
        { id: 1, key: 'p', date: today, originalDate: today, kind: 'practice', module: 'ai_tutor', minutes: 15, got: 0, status: 'available',
          overdue: false, movable: true, title: null, origin: 'programme', editable: 'date', extra: {} },
        { id: 2, key: 'tc', date: today, originalDate: today, kind: 'custom', module: null, minutes: 20, got: 0, status: 'available',
          overdue: false, movable: false, title: 'Сериал', origin: 'teacher', editable: 'full', extra: { title: 'Сериал', note: 'Без субтитров', createdByName: 'Айгерим' } },
      ],
      ...over,
    },
  });

  async function render(student: ReturnType<TeacherGeService['student']>) {
    const service = { student: jasmine.createSpy('student').and.returnValue(student) };
    await TestBed.configureTestingModule({
      imports: [GeStudentPlanComponent, translateTesting()],
      providers: [
        provideNoopAnimations(),
        { provide: TeacherGeService, useValue: service },
        { provide: ToastService, useValue: { showSuccess: () => {}, showError: () => {} } },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(undefined) }) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(GeStudentPlanComponent);
    fixture.componentRef.setInput('studentId', 7);
    fixture.detectChanges();
    return { el: fixture.nativeElement as HTMLElement, fixture, service };
  }

  it('неделя: строки программы и преподавателя, счёт недели, окно загрузки', async () => {
    const { el, service } = await render(of(view()));
    expect(service.student).toHaveBeenCalledWith(7, jasmine.any(String), jasmine.any(String));
    expect(el.textContent).toContain('Неделя: 1 из 3');
    expect(el.querySelector('.gsp__wtask.o-teacher')?.textContent).toContain('Сериал');
    expect(el.querySelector('.gsp__wtask.o-programme')?.textContent).toContain('Разговор со Speaking Buddy');
  });

  it('день: метка и комментарий преподавателя', async () => {
    const { el, fixture } = await render(of(view()));
    fixture.componentInstance.setView('day');
    fixture.detectChanges();
    expect(el.textContent).toContain('Айгерим');
    expect(el.textContent).toContain('Без субтитров');
  });

  it('плана нет — объясняет и не даёт ставить задачи', async () => {
    const { el } = await render(of(view({ state: 'no_onboarding', tasks: [], week: null })));
    expect(el.textContent).toContain('не прошёл анкету');
    const add = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Дать задание')) as HTMLButtonElement;
    expect(add.disabled).toBeTrue();
  });

  it('чужой ученик — 403 так и называется', async () => {
    const { el } = await render(throwError(() => ({ status: 403 })));
    expect(el.textContent).toContain('Это не ваш ученик');
  });
});
```

- [ ] **Step 3: вкладки в «Моих студентах»** — `student-overview.component.ts`: импорты `MatTabsModule`,
  `GeStudentPlanComponent`, `GeProfileCardComponent` в `imports`. `student-overview.component.html`: сразу после
  `</mat-card>` шапки открыть

```html
    <!-- Вкладки (часть 3 плана «Главной»): «Обзор» — всё, что было на карточке, «План» и «Анкета» — общий курс ученика.
         Содержимое «Плана» и «Анкеты» рисуется лениво (matTabContent): ученику без анкеты лишний запрос ни к чему. -->
    <mat-tab-group animationDuration="0ms" class="overview-tabs">
      <mat-tab [label]="'gePlan.tabOverview' | translate">
```
  и перед закрывающим `</ng-container>` (строка после блока `standalone-assignments`) закрыть

```html
      </mat-tab>
      <mat-tab [label]="'gePlan.tabPlan' | translate">
        <ng-template matTabContent>
          <div class="tab-pad"><app-ge-student-plan [studentId]="studentId"></app-ge-student-plan></div>
        </ng-template>
      </mat-tab>
      <mat-tab [label]="'gePlan.tabProfile' | translate">
        <ng-template matTabContent>
          <div class="tab-pad"><app-ge-profile-card [studentId]="studentId"></app-ge-profile-card></div>
        </ng-template>
      </mat-tab>
    </mat-tab-group>
```
  В `student-overview.component.scss`: `.tab-pad { padding-top: 16px; }`.
- [ ] **Step 4: вкладка в карточке пользователя** — `user-detail.component.ts`: в `imports` добавить
  `GeStudentPlanComponent`, `GeProfileCardComponent`; `user-detail.component.html` после вкладки «Домашние задания»:

```html
      <!-- План общего курса: анкета и план по дням ученика — у менеджера и админа тот же блок, что у преподавателя
           в «Моих студентах». -->
      <mat-tab label="План GE" *ngIf="!isReadOnly && isStudent">
        <ng-template matTabContent>
          <div class="tab-body">
            <app-ge-profile-card [studentId]="userId"></app-ge-profile-card>
            <app-ge-student-plan [studentId]="userId"></app-ge-student-plan>
          </div>
        </ng-template>
      </mat-tab>
```
  (Если `userId` строкой — `[studentId]="+userId"`; сверить тип поля в `user-detail.component.ts`.)
- [ ] **Step 5: прогон** — `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/feature/system/ge-plan/**/*.spec.ts --include=src/app/feature/system/my-students/**/*.spec.ts --include=src/app/feature/system/users/user-detail/**/*.spec.ts`
  → PASS. Падения спек `student-overview` из-за вкладок (например, ожидание блока в корне) чинить в спеке, сохраняя
  проверку: блок «Прогресс и активность» есть на вкладке «Обзор» по умолчанию.
- [ ] **Step 6: коммит** — `feat(ge-plan): вкладки «План» и «Анкета» в карточке ученика и «План GE» у менеджера`.

### Task B4: словари и цель в «Обзоре»

**Files:**
- Modify: `src/assets/i18n/ru.json`, `kk.json`, `en.json`
- Modify: `src/app/core/models/dtos/student-activity.dto.ts` (`StudentActivityBundle.ge?`)
- Modify: `src/app/core/services/student-activity.service.ts` (+ спека)
- Modify: `src/app/feature/system/my-students/student-activity/student-activity.component.{ts,html}` (+ спека)
- Modify: `src/app/feature/system/my-students/student-activity/student-activity.util.ts` (`goalOf`) (+ спека)

- [ ] **Step 1: ключи словаря** (ru · kk · en; интерполяция ngx-translate — `{{x}}`):

| ключ | ru | kk | en |
|---|---|---|---|
| gePlan.tabOverview | Обзор | Шолу | Overview |
| gePlan.tabPlan | План | Жоспар | Plan |
| gePlan.tabProfile | Анкета | Сауалнама | Questionnaire |
| gePlan.week | Неделя: {{done}} из {{total}} | Апта: {{total}} ішінен {{done}} | Week: {{done}} of {{total}} |
| gePlan.addTask | Дать задание | Тапсырма беру | Add a task |
| gePlan.addHomework | Домашнее задание | Үй тапсырмасы | Homework |
| gePlan.addForDay | Дать задание на этот день | Осы күнге тапсырма беру | Add a task for this day |
| gePlan.view.day / .week / .month | День / Неделя / Месяц | Күн / Апта / Ай | Day / Week / Month |
| gePlan.today | Сегодня | Бүгін | Today |
| gePlan.prev / gePlan.next | Назад / Вперёд | Артқа / Алға | Back / Forward |
| gePlan.legend.programme | Программа | Бағдарлама | Programme |
| gePlan.legend.teacher | Добавлено преподавателем | Мұғалім қосқан | Added by the teacher |
| gePlan.legend.homework | Домашнее задание | Үй тапсырмасы | Homework |
| gePlan.legend.live | Занятие | Сабақ | Lesson |
| gePlan.dayEmpty | В этот день задач нет. | Бұл күні тапсырма жоқ. | No tasks on this day. |
| gePlan.more | ещё {{n}} | тағы {{n}} | {{n}} more |
| gePlan.state.noOnboarding | Ученик ещё не прошёл анкету — плана нет. Домашнее задание дать можно. | Оқушы сауалнаманы әлі толтырмаған — жоспар жоқ. Үй тапсырмасын беруге болады. | The student hasn't filled in the questionnaire yet, so there is no plan. You can still give homework. |
| gePlan.state.noRoute | Ученик не выбрал формат обучения — плана нет. | Оқушы оқу форматын таңдамаған — жоспар жоқ. | The student hasn't chosen a study format, so there is no plan. |
| gePlan.state.noLevel | У ученика нет уровня — плана нет. | Оқушының деңгейі жоқ — жоспар жоқ. | The student has no level, so there is no plan. |
| gePlan.state.reached | Цель ученика достигнута — плана нет. | Оқушының мақсатына жетті — жоспар жоқ. | The student has reached the goal, so there is no plan. |
| gePlan.err.notMine | Это не ваш ученик. | Бұл сіздің оқушыңыз емес. | This is not your student. |
| gePlan.err.load | Не удалось загрузить план. | Жоспар жүктелмеді. | Couldn't load the plan. |
| gePlan.retry | Повторить | Қайталау | Retry |
| gePlan.task.course | Урок курса — следующий по тропе | Курс сабағы — жолдағы келесісі | Course lesson — the next on the path |
| gePlan.task.courseNamed | Урок: {{title}} | Сабақ: {{title}} | Lesson: {{title}} |
| gePlan.task.unit | Материал Практики | Практика материалы | Practice material |
| gePlan.task.custom | Своё задание | Өз тапсырмасы | Own task |
| gePlan.task.live | Занятие с преподавателем | Мұғаліммен сабақ | Lesson with a teacher |
| gePlan.task.homework | Домашнее задание | Үй тапсырмасы | Homework |
| gePlan.module.ai_tutor | Разговор со Speaking Buddy | Speaking Buddy-мен сөйлесу | Talk to Speaking Buddy |
| gePlan.module.workbooks | Воркбук | Воркбук | Workbook |
| gePlan.module.shadowing | Шэдоуинг | Шэдоуинг | Shadowing |
| gePlan.module.media_practice | Книги, тексты и аудио | Кітаптар, мәтіндер және аудио | Books, texts and audio |
| gePlan.module.vocabulary_sr | Слова в «Словаре» | «Сөздіктегі» сөздер | Words in the Dictionary |
| gePlan.min | {{n}} мин | {{n}} мин | {{n}} min |
| gePlan.minOf | {{got}} / {{n}} мин | {{got}} / {{n}} мин | {{got}} / {{n}} min |
| gePlan.due | срок {{date}} | мерзімі {{date}} | due {{date}} |
| gePlan.status.done / late / progress / plan | Выполнено / Просрочено / Начато / Запланировано | Орындалды / Мерзімі өтті / Басталды / Жоспарланған | Done / Overdue / Started / Planned |
| gePlan.menu.label | Действия с задачей | Тапсырма әрекеттері | Task actions |
| gePlan.menu.edit / move / mark / unmark / remove | Изменить / Перенести / Отметить выполненной / Снять отметку / Удалить | Өзгерту / Ауыстыру / Орындалды деп белгілеу / Белгіні алу / Жою | Edit / Move / Mark as done / Unmark / Delete |
| gePlan.confirmDelete | Удалить «{{title}}» из плана ученика? | «{{title}}» оқушы жоспарынан жойылсын ба? | Delete “{{title}}” from the student's plan? |
| gePlan.toast.added / updated / marked / unmarked / removed / fail | Задача добавлена в план ученика / Задача обновлена / Отмечено выполненным / Отметка снята / Задача удалена / Не получилось — попробуйте ещё раз | Тапсырма оқушы жоспарына қосылды / Тапсырма жаңартылды / Орындалды деп белгіленді / Белгі алынды / Тапсырма жойылды / Болмады — қайта көріңіз | Task added to the student's plan / Task updated / Marked as done / Mark removed / Task deleted / Something went wrong — try again |
| gePlan.dialog.titleNew / titleEdit / titleMove | Задание в план / Изменить задание / Перенести задачу | Жоспарға тапсырма / Тапсырманы өзгерту / Тапсырманы ауыстыру | Task for the plan / Edit the task / Move the task |
| gePlan.dialog.type | Что задать | Не беру | What to set |
| gePlan.dialog.typeOf.course / practice / unit / custom | Урок курса / Практика по минутам / Материал Практики / Своё задание | Курс сабағы / Минутпен практика / Практика материалы / Өз тапсырмасы | Course lesson / Practice in minutes / Practice material / Own task |
| gePlan.dialog.level / lesson / passed / module / area / unit | Уровень / Урок / пройден / Раздел / Раздел Практики / Юнит | Деңгей / Сабақ / өтілді / Бөлім / Практика бөлімі / Юнит | Level / Lesson / done / Section / Practice section / Unit |
| gePlan.dialog.catalogFail | Каталог не загрузился — откройте окно ещё раз. | Каталог жүктелмеді — терезені қайта ашыңыз. | The catalogue didn't load — open the dialog again. |
| gePlan.dialog.name / nameRequired | Название (необязательно) / Название | Атауы (міндетті емес) / Атауы | Title (optional) / Title |
| gePlan.dialog.note | Комментарий для ученика | Оқушыға түсініктеме | Comment for the student |
| gePlan.dialog.when / date / minutes | Когда / День / Минут | Қашан / Күн / Минут | When / Day / Minutes |
| gePlan.dialog.quick.today / plus1 / plus3 / plus7 | Сегодня / Завтра / +3 дня / +7 дней | Бүгін / Ертең / +3 күн / +7 күн | Today / Tomorrow / +3 days / +7 days |
| gePlan.dialog.programmeNote | Задачу программы можно только перенести на другой день. | Бағдарлама тапсырмасын тек басқа күнге ауыстыруға болады. | A programme task can only be moved to another day. |
| gePlan.dialog.cancel / save | Отмена / Сохранить | Болдырмау / Сақтау | Cancel / Save |
| gePlan.dialog.err.date / lesson / minutes / unit / title / server | Выберите день / Выберите урок / Сколько минут / Выберите юнит / Нужно название / Не удалось сохранить | Күнді таңдаңыз / Сабақты таңдаңыз / Қанша минут / Юнитті таңдаңыз / Атауы керек / Сақталмады | Pick a day / Pick a lesson / How many minutes / Pick a unit / A title is needed / Couldn't save |
| geProfile.title | Анкета ученика | Оқушы сауалнамасы | Student questionnaire |
| geProfile.empty | Ученик ещё не заполнил анкету. | Оқушы сауалнаманы әлі толтырмаған. | The student hasn't filled in the questionnaire yet. |
| geProfile.goal / purposeLabel / deadline / daily / startLabel / routeLabel / filled | Цель / Зачем / Срок / Минут в день / Старт / Формат обучения / Заполнена | Мақсат / Не үшін / Мерзім / Күніне минут / Бастау / Оқу форматы / Толтырылды | Goal / Why / Deadline / Minutes a day / Start / Study format / Filled in |
| geProfile.minutes | {{n}} мин | {{n}} мин | {{n}} min |
| geProfile.routeNone | не выбран | таңдалмаған | not chosen |
| geProfile.purpose.work / travel / study / self | Работа и карьера / Путешествия и переезд / Учёба / Для себя | Жұмыс және мансап / Саяхат және көшу / Оқу / Өзім үшін | Work and career / Travel and moving abroad / Study / For myself |
| geProfile.window.1-3m / 3-6m / 6-12m / none | Через 1–3 месяца / Через 3–6 месяцев / Через полгода–год / Без срока | 1–3 айдан кейін / 3–6 айдан кейін / Жарты жылдан бір жылға дейін / Мерзімсіз | In 1–3 months / In 3–6 months / In six months to a year / No deadline |
| geProfile.start.zero / some / known | С нуля / Немного знаю / Знаю, подтверждаю уровень | Нөлден / Аздап білемін / Білемін, деңгейді растаймын | From scratch / Know a little / Know it, confirming the level |
| geProfile.route.self_study / group / individual | Самостоятельно / В группе / Индивидуально | Өз бетімен / Топта / Жеке | Self-study / In a group / One-to-one |

  Коды анкеты сверить с `GeProfileRules` бэкенда (purpose, deadlineWindow, startMode, route) и kk/en подписей веба
  (`geOb.*`, `geRoute.*` в `src/i18n.jsx` jts-web-app) — подписи берутся оттуда, если отличаются.

- [ ] **Step 2: цель из профиля** — `student-activity.util.ts`:

```ts
/**
 * Цель ученика: из анкеты общего курса на бэкенде (часть 3, источник правды), а если там её нет (ученик не заходил
 * после части 1, или он вне анкеты — C1, IELTS) — прежняя цель из кабинета (level_goal веба).
 */
export function goalOf(ge: { targetLevel: string | null; fromLevel: string | null } | null | undefined,
                       app: { goal?: unknown } | null | undefined): { target: string; from: string } | null {
  if (ge?.targetLevel) return sanitizeGoal({ target: ge.targetLevel, from: ge.fromLevel });
  return sanitizeGoal(app?.goal);
}
```
  (сигнатуру `sanitizeGoal` сверить в файле; если она принимает `unknown` — передавать как есть.) Спека в
  `student-activity.util.spec.ts`:

```ts
  describe('goalOf', () => {
    it('анкета бэкенда раньше кабинета', () => {
      expect(goalOf({ targetLevel: 'B2', fromLevel: 'A2' }, { goal: { target: 'B1', from: 'A1' } })).toEqual({ target: 'B2', from: 'A2' });
    });
    it('без цели в анкете — прежняя цель кабинета', () => {
      expect(goalOf({ targetLevel: null, fromLevel: null }, { goal: { target: 'B1', from: 'A1' } })).toEqual({ target: 'B1', from: 'A1' });
      expect(goalOf(null, null)).toBeNull();
    });
  });
```
- [ ] **Step 3: сервис и компонент** — `StudentActivityBundle` получает `ge?: GeProfileView | null;` (импорт типа из
  `teacher-ge.service`). В `forkJoin` сервиса третьей половиной:

```ts
      // Анкета общего курса — на бэкенде (часть 3): оттуда цель ученика. Необязательная половина, как кабинет: без неё
      // цель берётся из кабинета, а неудача не роняет и не задерживает пакет.
      ge: this.http
        .get<{ profile: GeProfileView | null }>(this.url(`/admin/teacher-ge/students/${studentId}/profile`))
        .pipe(timeout(StudentActivityService.APP_TIMEOUT_MS), map((r) => r?.profile ?? null), catchError(() => of(null))),
```
  (импорт `map` из `rxjs/operators`). В спеке сервиса каждый тест, который флашит два запроса, флашит и третий:
  `http.expectOne((r) => r.url.endsWith('/admin/teacher-ge/students/141/profile')).flush({ profile: null })` (id — тот,
  что в тесте). Компонент: поле `goalKnown = false`; в `apply({ backend, app, ge })` —
  `this.goal = goalOf(ge, app); this.goalKnown = !!app || !!ge?.targetLevel;`; в шаблоне
  `[goalKnown]="goalKnown"` вместо `[goalKnown]="!!app"`. Спека компонента — новый тест:

```ts
    it('цель — из анкеты бэкенда, даже если кабинет не ответил', async () => {
      const el = await render(of({ backend: BACKEND, app: null, ge: { onboarded: true, targetLevel: 'B2', fromLevel: 'A2' } as any }));
      expect(text(el.querySelector('app-student-level-card .lv__goal'))).toContain('B2');
    });
```
- [ ] **Step 4: прогон** — `npx ng test --watch=false --browsers=ChromeHeadless` (весь набор) → PASS; `npx ng build` → OK.
- [ ] **Step 5: коммит** — `feat(student-activity): цель ученика — из анкеты общего курса на бэкенде`.

### Task B5: PR web-admin

- [ ] Push `feat/ge-teacher`, PR в develop после мержа бэкенда части 3 (ручки `/admin/teacher-ge` должны быть на
  dev-server). В описании — скриншоты вкладок (локально без бэкенда — `local-preview-mock-proxy`).

---

## Часть C — веб ученика (jts-web-app)

Перед работой: junction `node_modules` → основной чекаут (`cmd /c mklink /J node_modules ..\..\..\node_modules`), если
`package.json` не отличается. Тесты: `npx vitest run <путь>` (не `npm test` целиком — он видит чужие worktree).

### Task C1: каталог уроков курса для web-admin

**Files:**
- Create: `src/app/api/course/catalog/route.js`
- Test: `src/app/api/course/catalog/route.test.js`

**Interfaces:**
- Produces: `GET /api/course/catalog` → `{ levels: [{ level: 'A1', lessons: [{ code, kind, unit, title }] }] }`.

- [ ] **Step 1: тест**:

```js
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { GET, OPTIONS } from './route.js'
import { courseTrail } from '../../../../learning/courseData.js'

const index = (level) => JSON.parse(readFileSync(path.join(process.cwd(), 'public', 'course', level, 'index.json'), 'utf8'))

describe('GET /api/course/catalog', () => {
  it('коды и порядок — как у тропы: задачу преподавателя закрывает отметка именно этого кода', async () => {
    const res = await GET()
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    const { levels } = await res.json()
    expect(levels.map((l) => l.level)).toEqual(['A0', 'A1', 'A2', 'B1', 'B2'])
    const a1 = levels.find((l) => l.level === 'A1')
    expect(a1.lessons.map((x) => x.code)).toEqual(courseTrail(index('a1')).map((n) => n.code))
    expect(a1.lessons[0]).toEqual(expect.objectContaining({ code: 'L1', kind: 'lesson', title: expect.any(String) }))
    expect(a1.lessons.some((x) => x.kind === 'test')).toBe(true)
  })

  it('OPTIONS — для браузера админки с другого домена', () => {
    expect(OPTIONS().status).toBe(204)
  })
})
```
  (Если первый урок тропы A1 не `L1` — поправить ожидание по фактическому `courseTrail(index('a1'))[0]`.)
- [ ] **Step 2: прогон** — `npx vitest run src/app/api/course/catalog` → FAIL (нет модуля).
- [ ] **Step 3: ручка**:

```js
// Оглавление тропы «Обучения» для кабинета преподавателя (web-admin, «Дать задание» → «Урок курса»; спека
// docs/superpowers/specs/2026-10-13-ge-teacher-plan-design.md, секция 2).
//
// Отдельно от /api/practice/catalog: курс не раздел Практики, и уроки в том каталоге попали бы в диалог домашек, а
// бэкенд домашек уроки курса не принимает. Коды — те же, что у тропы и у отметки урока на бэкенде (L<n>, T<юнит>,
// X<id>): задачу преподавателя закрывает отметка именно с этим кодом.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { courseTrail } from '../../../../learning/courseData.js'

export const runtime = 'nodejs'

const CORS = {
  // Оглавление учебника, а не данные ученика: токен не нужен, и список доменов админки (dev, prod, локальный) вести незачем.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'public, max-age=300',
}

// Уровни курса нового поколения (public/course/<level>/); C1 на старом плеере, своей тропы с кодами L/T/X у него нет.
const LEVELS = ['a0', 'a1', 'a2', 'b1', 'b2']

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET() {
  const levels = []
  for (const level of LEVELS) {
    try {
      const index = JSON.parse(await readFile(path.join(process.cwd(), 'public', 'course', level, 'index.json'), 'utf8'))
      const lessons = courseTrail(index).map((n) => ({ code: n.code, kind: n.kind, unit: n.unit ?? null, title: n.title || n.code }))
      if (lessons.length) levels.push({ level: level.toUpperCase(), lessons })
    } catch {
      // уровень не выгружен или файл битый — остальные уровни каталог не теряют
    }
  }
  return Response.json({ levels }, { headers: CORS })
}
```
- [ ] **Step 4: прогон** — PASS. **Step 5: коммит** — `feat(course): каталог тропы для кабинета преподавателя`.

### Task C2: модель плана — задачи преподавателя

**Files:**
- Modify: `src/ge/plan/planModel.js`
- Test: `src/ge/plan/planModel.test.js`

**Interfaces:**
- Produces: `isTeacherTask(task)`, `taskAction(task, level) → {type:'nav', to, payload} | {type:'done'} | null`;
  `taskRoute` для `unit` → `{to, payload} | null`, для `custom` → `null`; `taskTitle` — подписи задач преподавателя;
  `courseTitles` пропускает уроки преподавателя.

- [ ] **Step 1: тесты** (дописать в `planModel.test.js`; `t` — та же функция-заглушка перевода, что в файле):

```js
describe('задачи преподавателя', () => {
  const tr = (k, v) => (v ? `${k}:${JSON.stringify(v)}` : k)
  const teacher = (over) => ({ id: 9, date: '2026-10-14', status: 'available', origin: 'teacher', extra: {}, ...over })

  it('урок преподавателя ведёт в тропу своего уровня, а не текущего', () => {
    expect(taskRoute(teacher({ kind: 'course', extra: { level: 'A1' } }), 'A2')).toEqual({ to: 'course', payload: { level: 'A1' } })
  })

  it('материал Практики — тем же адресом, что юнит в домашке', () => {
    expect(taskRoute(teacher({ kind: 'unit', extra: { area: 'grammar', level: 'a1', unitId: 3 } }))).toEqual({ to: 'practice', payload: { level: 'a1', unitId: 3 } })
    expect(taskAction(teacher({ kind: 'unit', extra: { area: 'nope' } }))).toBeNull()
  })

  it('своё задание — отметка, выполненное — без кнопки', () => {
    expect(taskAction(teacher({ kind: 'custom' }))).toEqual({ type: 'done' })
    expect(taskAction(teacher({ kind: 'custom', status: 'completed' }))).toBeNull()
    expect(taskAction({ kind: 'practice', module: 'ai_tutor', status: 'available' }, 'A2')).toEqual({ type: 'nav', to: 'tutor' })
  })

  it('подписи', () => {
    expect(isTeacherTask(teacher({}))).toBe(true)
    expect(taskTitle(tr, teacher({ kind: 'custom', extra: { title: 'Сериал' } }))).toBe('Сериал')
    expect(taskTitle(tr, teacher({ kind: 'course', extra: { lessonTitle: 'Famous people' } }))).toBe('gePlan.course.named:{"title":"Famous people"}')
    expect(taskTitle(tr, teacher({ kind: 'unit', extra: { unitTitle: 'Present Simple' } }))).toBe('Present Simple')
  })

  it('подписи тропы — только урокам программы', () => {
    const tasks = [
      { id: 1, kind: 'course', date: '2026-10-13', status: 'available' },
      teacher({ id: 2, kind: 'course', date: '2026-10-12', extra: { lessonTitle: 'X' } }),
      { id: 3, kind: 'course', date: '2026-10-14', status: 'available' },
    ]
    expect(courseTitles(tasks, [{ title: 'A' }, { title: 'B' }])).toEqual({ 1: 'A', 3: 'B' })
  })
})
```
  Импорты теста дополнить `isTeacherTask, taskAction`.
- [ ] **Step 2: прогон** — `npx vitest run src/ge/plan/planModel.test.js` → FAIL.
- [ ] **Step 3: реализация** — в `planModel.js`: импорт `import { practiceNavTarget } from '../../lib/practiceTarget.js'`,
  шапку файла дополнить строкой про задачи преподавателя (origin = teacher, часть 3), и:

```js
/** Задача преподавателя (бэкенд V329, origin = teacher): синяя метка и комментарий; день выбрал он, ученик её не переносит. */
export function isTeacherTask(task) {
  return task?.origin === 'teacher'
}

/** Куда ведёт «Начать»: ключ handleNav App и его payload; null — переходить некуда. */
export function taskRoute(task, level) {
  switch (task?.kind) {
    case 'course':
      // урок, заданный преподавателем, — в тропу его уровня: ученик мог уже перейти на следующий
      return { to: 'course', payload: { level: (isTeacherTask(task) && task.extra?.level) || level || null } }
    case 'live':
      return { to: 'lessons' }
    case 'homework':
      return { to: 'homework' }
    case 'unit': {
      // адрес юнита — тот же, каким его выдают в домашке, и разбирает его тот же practiceNavTarget: неизвестный адрес не
      // превращается в переход (экран раздела молча открыл бы чужой юнит)
      const x = task.extra || {}
      const target = practiceNavTarget({ practiceArea: x.area, practiceLevel: x.level, practiceUnitId: x.unitId ?? null, practiceUnitKey: x.unitKey ?? null })
      return target ? { to: target.key, payload: target.payload } : null
    }
    case 'custom':
      return null
    default:
      if (task?.module === 'workbooks') return { to: 'workbook', payload: level ? { level: String(level).toLowerCase() } : null }
      return MODULE_ROUTE[task?.module] || { to: 'practice' }
  }
}

/**
 * Что делает кнопка задачи: переход ({ type: 'nav', to, payload }), отметка своего задания преподавателя ({ type: 'done' })
 * или ничего (null — кнопки нет). У выполненной задачи кнопки нет.
 */
export function taskAction(task, level) {
  if (!task || task.status === 'completed') return null
  if (task.kind === 'custom') return isTeacherTask(task) ? { type: 'done' } : null
  const r = taskRoute(task, level)
  return r ? { type: 'nav', ...r } : null
}
```
  `taskTitle` — в начало функции:

```js
  if (isTeacherTask(task)) {
    const x = task.extra || {}
    if (x.title) return x.title
    if (task.kind === 'course') return x.lessonTitle ? t('gePlan.course.named', { title: x.lessonTitle }) : t('gePlan.course')
    if (task.kind === 'unit') return x.unitTitle || t('gePlan.unit')
  }
```
  `courseTitles` — фильтр `(x) => x.kind === 'course' && !isTeacherTask(x)`.
- [ ] **Step 4: прогон** — PASS (старые тесты `planModel` тоже: у `taskRoute` для прежних видов поведение то же).
- [ ] **Step 5: коммит** — `feat(ge): модель плана — задачи преподавателя, переход к юниту и отметка своего задания`.

### Task C3: экраны ученика — метка, комментарий, «Отметить выполненным»

**Files:**
- Create: `src/ge/plan/useGeTaskStart.js`
- Modify: `src/api.js` (`markGeTaskDone`)
- Modify: `src/ge/plan/GeTaskRow.jsx`, `src/ge/plan/GePlanViews.jsx`, `src/screens/GePlanPage.jsx`,
  `src/screens/home/GeTodayCard.jsx`, `src/screens/HomePage.jsx` (проп токена и перечитывания)
- Modify: `src/i18n.jsx` (ru/en/kk), `src/demo.css`
- Test: `tests/ge-plan.spec.js`

- [ ] **Step 1: `api.js`** — после `moveGeTask`:

```js
/** Ученик отмечает своё задание преподавателя («Своё задание», kind custom) выполненным или снимает отметку. */
export function markGeTaskDone(token, id, done) {
  return authPut(`/mobile/ge/plan/tasks/${encodeURIComponent(id)}/done`, token, { done: !!done })
}
```
- [ ] **Step 2: хук**:

```js
import { useCallback } from 'react'
import { markGeTaskDone } from '../../api.js'
import { taskAction } from './planModel.js'

/**
 * Кнопка задачи плана — общая для «Сегодня» и экрана «План»: переход по taskAction или отметка своего задания
 * преподавателя с перечитыванием плана. Сбой отметки тихий: задача останется открытой, и ученик нажмёт ещё раз.
 */
export function useGeTaskStart({ token, level, onNav, reload }) {
  return useCallback(
    (task) => {
      const a = taskAction(task, level)
      if (!a) return
      if (a.type === 'done') {
        markGeTaskDone(token, task.id, true)
          .then(() => reload?.())
          .catch((e) => console.warn('[ge.plan] не удалось отметить задание', e))
        return
      }
      if (a.payload) onNav?.(a.to, a.payload)
      else onNav?.(a.to)
    },
    [token, level, onNav, reload],
  )
}
```
- [ ] **Step 3: `GeTaskRow.jsx`** — импорты `FlagIcon, QuizIcon`, `isTeacherTask, taskAction`; в `ICON`
  `unit: QuizIcon, custom: FlagIcon`; экспорт подписи кнопки и новая разметка:

```jsx
/** Подпись кнопки: отметка своего задания, «Продолжить» начатого, «Открыть» занятия и ДЗ, иначе «Начать». */
export function startLabel(t, task, action) {
  if (action?.type === 'done') return t('gePlan.markDone')
  if (task.status === 'in_progress') return t('gePlan.continue')
  return task.kind === 'live' || task.kind === 'homework' ? t('gePlan.open') : t('gePlan.start')
}

export default function GeTaskRow({ task, title, primary = false, showDate = false, onStart }) {
  const { t, lang } = useI18n()
  const done = task.status === 'completed'
  const teacher = isTeacherTask(task)
  // уровень для кнопки не нужен: от него зависит только адрес перехода, а не то, есть ли переход
  const action = taskAction(task, null)
  return (
    <li className={`ge-task is-${task.kind}${teacher ? ' is-teacher' : ''}${primary ? ' is-primary' : ''}${done ? ' is-done' : ''}`}>
      <GePlate task={task} />
      <div className="ge-task__body">
        <b>{taskTitle(t, task, title)}</b>
        <span className="ge-task__meta">
          {taskMeta(t, lang, task, { showDate })}
          {teacher && <span className="ge-task__chip is-teacher" title={task.extra?.createdByName || undefined}>{t('gePlan.origin.teacher')}</span>}
          {task.overdue && !done && <span className="ge-task__chip is-late">{t('gePlan.overdue')}</span>}
        </span>
        {teacher && task.extra?.note && <span className="ge-task__note">{task.extra.note}</span>}
      </div>
      {done ? (
        <span className="ge-task__done">
          <CheckCircleIcon size={18} /> {t('gePlan.done')}
        </span>
      ) : action ? (
        <button type="button" className={`ih-btn2 ${primary ? 'ih-btn2--primary' : 'ih-btn2--outline'}`} onClick={() => onStart?.(task)}>
          {startLabel(t, task, action)}
        </button>
      ) : null}
    </li>
  )
}
```
- [ ] **Step 4: `GePlanViews.jsx`**:
  - импорт `isTeacherTask, taskAction` из `planModel.js`, `startLabel` из `GeTaskRow.jsx`;
  - `cardSub`: первая строка — `if (task.kind === 'course') return isTeacherTask(task) ? task.extra?.lessonTitle || '' : courseTitle || ''`;
  - карточка недели: к классу карточки добавить `${isTeacherTask(task) ? ' ge-wcard--teacher' : ''}`;
  - панель выбранной задачи недели: `const selAction = sel ? taskAction(sel, null) : null` и вместо кнопки «Начать»
    `{selAction && (<button … onClick={() => onStart?.(sel)}>{startLabel(t, sel, selAction)}</button>)}`;
  - месяц: `const rank = (x) => (x.kind === 'live' ? 0 : x.kind === 'homework' ? 1 : isTeacherTask(x) ? 2 : x.kind === 'course' ? 3 : 4)`
    и у чипа — `${isTeacherTask(x) ? ' ge-mchip--teacher' : ''}`.
- [ ] **Step 5: экраны** — `GePlanPage.jsx`: `const start = useGeTaskStart({ token: authToken, level, onNav, reload })`
  вместо прежней `start` (импорт `taskRoute` убрать, если больше не нужен). `GeTodayCard.jsx`: пропсы
  `{ plan, frontier, level, token, onReload, onNav }`, `const start = useGeTaskStart({ token, level, onNav, reload: onReload })`.
  `HomePage.jsx`: `<GeTodayCard … token={token} onReload={gePlan.reload} … />`.
- [ ] **Step 6: i18n** — в трёх блоках `src/i18n.jsx` рядом с `gePlan.overdue`:

| ключ | ru | en | kk |
|---|---|---|---|
| gePlan.origin.teacher | Добавлено преподавателем | Added by your teacher | Мұғалім қосқан |
| gePlan.markDone | Отметить выполненным | Mark as done | Орындалды деп белгілеу |
| gePlan.unit | Материал Практики | Practice material | Практика материалы |
| gePlan.short.unit | Практика | Practice | Практика |
| gePlan.short.custom | Задание | Task | Тапсырма |

  `gePlan.moveNote` во всех трёх — дописать «и задачи преподавателя» (ru: «Переносить можно урок курса и практику.
  Занятия, домашние задания и задачи преподавателя — по его расписанию.»; en и kk — тем же смыслом к их нынешнему
  тексту).
- [ ] **Step 7: стили** — в `src/demo.css` после `.ge-task__chip.is-late` и после `.ge-mchip--course`:

```css
/* задача преподавателя (часть 3): синяя метка «Добавлено преподавателем» и полоса слева — цвета IELTS (.ih-origin.is-teacher) */
.ge-task.is-teacher {
  box-shadow: inset 3px 0 0 #3b82f6;
}
.ge-task__chip.is-teacher {
  background: #e6f0ff;
  color: #2563eb;
}
.ge-task__note {
  font-size: 13px;
  font-style: italic;
  color: var(--ih-ink-2);
  overflow-wrap: break-word;
}
.ge-plate--unit {
  background: #eef0ff;
  color: #4f5bd5;
}
.ge-plate--custom {
  background: #e6f0ff;
  color: #2563eb;
}
```
```css
.ge-wcard--teacher,
.ge-mchip--teacher {
  box-shadow: inset 3px 0 0 #3b82f6;
}
```
- [ ] **Step 8: e2e** — в `tests/ge-plan.spec.js`: в `state.tasks` добавить
  `{ id: 5, date: today, kind: 'custom', origin: 'teacher', module: null, minutes: 20, got: 0, status: 'available', overdue: false, movable: false, title: 'Посмотри серию', extra: { title: 'Посмотри серию', note: 'Без субтитров', createdByName: 'Айгерим' } }`,
  в `state` — `dones: []`, в обработчик маршрутов перед `/mobile/ge/plan`:

```js
    const marked = /\/mobile\/ge\/plan\/tasks\/([^/]+)\/done/.exec(url)
    if (marked && req.method() === 'PUT') {
      const { done } = JSON.parse(req.postData())
      state.dones.push({ id: marked[1], done })
      state.tasks = state.tasks.map((x) => (String(x.id) === marked[1] ? { ...x, status: done ? 'completed' : 'available', got: done ? 1 : 0 } : x))
      return route.fulfill(json({ id: Number(marked[1]), status: done ? 'completed' : 'available' }))
    }
```
  и тест:

```js
test('задача преподавателя: метка, комментарий и «Отметить выполненным»', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/?screen=home')
  const row = page.locator('.ge-task.is-teacher')
  await expect(row).toContainText('Посмотри серию')
  await expect(row).toContainText('Добавлено преподавателем')
  await expect(row).toContainText('Без субтитров')
  await row.getByRole('button', { name: 'Отметить выполненным' }).click()
  await expect.poll(() => state.dones).toEqual([{ id: '5', done: true }])
  await expect(row).toContainText('Выполнено')
})
```
  (Как прочие тесты файла открывают «Главную» и что возвращает `setup` — сверить в файле и повторить.)
- [ ] **Step 9: прогон** — `npx vitest run src/ge`, `npx playwright test tests/ge-plan.spec.js --workers=1`,
  `npm run lint`, `npm run build` (сборку — во временном worktree рядом с dev-сервером, если он запущен) → всё зелёное.
- [ ] **Step 10: коммит** — `feat(ge): задачи преподавателя на «Сегодня» и в «Плане» ученика`.

### Task C4: снять зеркало цели в `level_goal`

**Files:**
- Modify: `src/ge/legacyGoal.js`, `src/App.jsx` (`handleGeSaved`)
- Test: `src/ge/legacyGoal.test.js`

- [ ] **Step 1: тест** — заменить тесты зеркала на:

```js
  it('цель в профиле есть — level_goal больше не трогается: web-admin читает цель с бэкенда (часть 3)', async () => {
    const deps = { loadLevelGoal: vi.fn(), readCachedGoal: vi.fn(() => null), saveLevelGoal: vi.fn(), importLegacyGoal: vi.fn() }
    const profile = { targetLevel: 'B2', fromLevel: 'A2' }
    expect(await syncLegacyGoal('t', profile, deps)).toBe(profile)
    expect(deps.saveLevelGoal).not.toHaveBeenCalled()
    expect(deps.loadLevelGoal).not.toHaveBeenCalled()
  })
```
  (тесты переноса старой цели оставить как есть.)
- [ ] **Step 2: прогон** — `npx vitest run src/ge/legacyGoal.test.js` → FAIL (зеркало ещё пишет).
- [ ] **Step 3: реализация**:

```js
// Цель уровня до 12.10.2026 жила в базе веба (level_goal). Теперь источник — профиль бэкенда (/mobile/ge), и здесь
// только разовый перенос старой цели в профиль. Зеркало цели обратно в level_goal снято в части 3 (13.10.2026):
// карточка преподавателя в web-admin читает цель из профиля бэкенда (/admin/teacher-ge/students/{id}/profile), а
// level_goal остаётся запасным источником для тех, кто анкету не проходил.

import { loadLevelGoal, readCachedGoal } from '../lib/levelGoal.js'
import { importLegacyGoal } from '../api.js'

const DEPS = { loadLevelGoal, readCachedGoal, importLegacyGoal }

/** Возвращает профиль — тот же или с перенесённой целью. Ошибки сети глотает: это не повод ронять «Главную». */
export async function syncLegacyGoal(token, profile, deps = DEPS) {
  if (!token || !profile || profile.targetLevel) return profile
  const legacy = (await deps.loadLevelGoal(token)) ?? deps.readCachedGoal(token)
  if (!legacy) return profile
  const target = legacy.target === 'C2' ? 'C1' : legacy.target
  if (target === legacy.from) return profile
  try {
    return (await deps.importLegacyGoal(token, { targetLevel: target, fromLevel: legacy.from })) || profile
  } catch {
    return profile
  }
}
```
  В `App.jsx` `handleGeSaved` — убрать строку `syncLegacyGoal(token, p)` (после сохранения анкеты цель уже в профиле,
  переносить нечего).
- [ ] **Step 4: прогон** — `npx vitest run src/ge` → PASS; `npm run lint`.
- [ ] **Step 5: коммит** — `refactor(ge): снять зеркало цели в level_goal — web-admin читает цель с бэкенда`.

### Task C5: PR веба и выкатка

- [ ] Push `feat/ge-teacher`. PR в develop — после мержа web#682 и после того, как web-admin части 3 на dev
  (иначе карточка преподавателя на dev покажет устаревшую цель для анкет, сохранённых после выкатки веба).
- [ ] Вживую на dev-tutor/dev-admin: преподаватель ставит «своё задание» и «20 минут тьютора» своему ученику → ученик
  видит синие строки на «Главной» → отмечает своё → в web-admin задача «Выполнено»; материал Практики (юнит
  грамматики) закрывается прохождением юнита.
- [ ] Обновить память `ge-onboarding-roadmap.md`: статус части 3 и PR.
