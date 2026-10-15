# Онбординг и роадмап «Главной» (General English), часть 1 — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** анкета General English → тест уровня → экран «Как дойти до цели» → блок цели на «Главной», по образцу IELTS; профиль хранится на JTS-бэкенде.

**Architecture:** бэкенд получает модуль `ge` (таблица `ge_profiles`, ручки `/mobile/ge/profile*`, чистые правила `GeProfileRules`). Веб — чистые модули `src/ge/*` (срок по `roadmap.js`, анкета, состояния «Главной»), экраны `GeOnboardingPage` / `GeRoutePage`, блок `GeGoalBanner`; кирпичи онбординга IELTS выносятся в общий `OnboardingParts.jsx`. Без ручки (404, старый бэкенд) «Главная» прежняя.

**Tech Stack:** Java 21 / Spring Boot / Flyway / JUnit 5 + Mockito + AssertJ (backend); Next.js SPA, React, vitest + Testing Library, Playwright (web).

**Спека:** `docs/superpowers/specs/2026-10-12-ge-onboarding-roadmap-design.md`.

## Global Constraints

- Наборы значений одинаковы в CHECK миграции, `GeProfileRules` и `src/ge/onboarding.js`: purpose `work|travel|study|self`; targetLevel `A1|A2|B1|B2|C1`; deadlineWindow `date|1-3m|3-6m|6-12m|none`; dailyMinutes `15|30|60|90`; startMode `zero|some|known`; route `self_study|group|individual`.
- Плитки цели — A0…C1; A0 и всё не выше текущего уровня неактивны.
- Срок — `estimateWeeks` из `src/lib/roadmap.js`; группа и индивидуально — 2 занятия в неделю; индивидуально = `individual_60`; самостоятельно — 5 дней × минуты ÷ 90.
- Срок ≤ 18 мес — месяцами с шагом 0.5, дальше — годами с шагом 0.5. «С запасом» — ≥ 21 день.
- JavaScript, не TypeScript. Комментарии — по-русски и про «почему».
- Строки UI — `t()` из `src/i18n.jsx` (ru/en/kk), ключи `geOb.*`, `geRoute.*`, `geHome.*`, `geGoal.*`, `geTerm.*`, `tour.home.ge.*`.
- Ответ профиля без булевого `onboarded` = профиля нет (старый бэкенд / заглушка e2e) → прежняя «Главная».
- Бэкенд строгий к лишним полям JSON: веб катится после бэкенда.
- vitest гонять с `--exclude '.claude/**'` (иначе подхватит чужие worktree).
- Коммиты — с строкой `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

# Часть A — бэкенд (`C:\Users\nural\Desktop\backend`)

Рабочее дерево: `git -C C:/Users/nural/Desktop/backend fetch origin && git -C C:/Users/nural/Desktop/backend worktree add C:/Users/nural/Desktop/jts-web-app/.claude/worktrees/backend-ge -b feat/ge-profile origin/develop`. Дальше `B = C:/Users/nural/Desktop/jts-web-app/.claude/worktrees/backend-ge`, `J = $B/src/main/java/kz/education/server`.

### Task A1: таблица и сущность профиля

**Files:**
- Create: `$B/src/main/resources/db/migration/V327__Ge_profiles.sql`
- Create: `$J/modules/ge/model/GeProfile.java`
- Create: `$J/modules/ge/repository/GeProfileRepository.java`

**Interfaces:**
- Produces: `GeProfile` (поля как в миграции, lombok `@Data`), `GeProfileRepository extends JpaRepository<GeProfile, Long>`.

- [ ] **Step 1: проверить, что номер V327 свободен**

Run: `ls $B/src/main/resources/db/migration | sort -V | tail -3`
Expected: последний — `V326__Shadowing_lessons.sql`. Если занят — взять следующий свободный и поправить имя файла.

- [ ] **Step 2: миграция**

```sql
-- Профиль General English: анкета «Главной» (зачем, цель-уровень, срок, минут в день, как начинает) и выбранный
-- формат занятий. Одна строка на ученика. Образец — ielts_profiles (V314); дизайн — jts-web-app
-- docs/superpowers/specs/2026-10-12-ge-onboarding-roadmap-design.md.
-- Срок окном («3–6 месяцев») хранится и датой, посчитанной в день сохранения, и самим окном: дата нужна, чтобы считать
-- дни, окно — чтобы честно писать «примерно».
CREATE TABLE ge_profiles (
    user_id         BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    purpose         VARCHAR(10) CHECK (purpose IS NULL OR purpose IN ('work', 'travel', 'study', 'self')),
    target_level    VARCHAR(2) CHECK (target_level IS NULL OR target_level IN ('A1', 'A2', 'B1', 'B2', 'C1')),
    from_level      VARCHAR(2),
    deadline_date   DATE,
    deadline_window VARCHAR(10) CHECK (deadline_window IS NULL OR deadline_window IN ('date', '1-3m', '3-6m', '6-12m', 'none')),
    daily_minutes   SMALLINT,
    start_mode      VARCHAR(10) CHECK (start_mode IS NULL OR start_mode IN ('zero', 'some', 'known')),
    route           VARCHAR(12) CHECK (route IS NULL OR route IN ('self_study', 'group', 'individual')),
    onboarded_at    TIMESTAMP,
    route_at        TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 3: сущность**

```java
package kz.education.server.modules.ge.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Профиль General English: анкета «Главной» и выбранный формат (V327). Образец — IeltsProfile. */
@Entity
@Data
@Table(name = "ge_profiles")
public class GeProfile {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(length = 10)
    private String purpose;

    @Column(name = "target_level", length = 2)
    private String targetLevel;

    @Column(name = "from_level", length = 2)
    private String fromLevel;

    @Column(name = "deadline_date")
    private LocalDate deadlineDate;

    @Column(name = "deadline_window", length = 10)
    private String deadlineWindow;

    @Column(name = "daily_minutes")
    private Integer dailyMinutes;

    @Column(name = "start_mode", length = 10)
    private String startMode;

    @Column(length = 12)
    private String route;

    @Column(name = "onboarded_at")
    private LocalDateTime onboardedAt;

    @Column(name = "route_at")
    private LocalDateTime routeAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
}
```

- [ ] **Step 4: репозиторий**

```java
package kz.education.server.modules.ge.repository;

import kz.education.server.modules.ge.model.GeProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GeProfileRepository extends JpaRepository<GeProfile, Long> {
}
```

- [ ] **Step 5: компиляция и сверка миграций**

Run: `cd $B && ./gradlew compileJava -q && bash scripts/check-migrations.sh`
Expected: без ошибок.

- [ ] **Step 6: Commit**

```bash
git -C $B add src/main/resources/db/migration/V327__Ge_profiles.sql src/main/java/kz/education/server/modules/ge
git -C $B commit -m "feat(ge): таблица профиля General English (анкета «Главной»)"
```

### Task A2: правила профиля (чистые)

**Files:**
- Create: `$J/modules/ge/service/GeProfileRules.java`
- Test: `$B/src/test/java/kz/education/server/modules/ge/service/GeProfileRulesTest.java`

**Interfaces:**
- Produces: `GeProfileRules.validate(purpose, targetLevel, deadlineWindow, deadlineDate, dailyMinutes, startMode, currentLevel, today) → String|null`; `windowDate(window, today) → LocalDate|null`; `deadline(window, date, today) → Deadline(state, date, daysRemaining, approximate)`; `journey(from, level, percent, target) → Journey(start, Current(level, percent), target, reached)`; `legacyTarget(target, from) → String|null`; `rank(level)`; наборы `ROUTES` и др.; `Deadline.NONE`.

- [ ] **Step 1: тест**

```java
package kz.education.server.modules.ge.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class GeProfileRulesTest {

    static final LocalDate TODAY = LocalDate.of(2026, 10, 12);

    @Test
    void acceptsAValidForm() {
        assertThat(GeProfileRules.validate("work", "B2", "3-6m", null, 30, null, "A2", TODAY)).isNull();
        assertThat(GeProfileRules.validate(null, "A1", "date", TODAY.plusDays(10), 15, "zero", null, TODAY)).isNull();
    }

    @Test
    void rejectsValuesOutsideTheSets() {
        assertThat(GeProfileRules.validate("fun", "B2", "none", null, 30, null, null, TODAY)).contains("purpose");
        assertThat(GeProfileRules.validate("work", "C2", "none", null, 30, null, null, TODAY)).contains("targetLevel");
        assertThat(GeProfileRules.validate("work", "A0", "none", null, 30, null, null, TODAY)).contains("targetLevel");
        assertThat(GeProfileRules.validate("work", "B2", "2y", null, 30, null, null, TODAY)).contains("deadlineWindow");
        assertThat(GeProfileRules.validate("work", "B2", "none", null, 45, null, null, TODAY)).contains("dailyMinutes");
        assertThat(GeProfileRules.validate("work", "B2", "none", null, 30, "maybe", null, TODAY)).contains("startMode");
    }

    @Test
    void targetMustBeAboveTheCurrentLevel() {
        assertThat(GeProfileRules.validate("work", "B1", "none", null, 30, null, "B1", TODAY)).isNotNull();
        assertThat(GeProfileRules.validate("work", "B1", "none", null, 30, null, "B2", TODAY)).isNotNull();
        assertThat(GeProfileRules.validate("work", "B2", "none", null, 30, null, "B1", TODAY)).isNull();
    }

    @Test
    void dateMustBeWithinThreeYears() {
        assertThat(GeProfileRules.validate("work", "B2", "date", null, 30, null, null, TODAY)).isNotNull();
        assertThat(GeProfileRules.validate("work", "B2", "date", TODAY.minusDays(1), 30, null, null, TODAY)).isNotNull();
        assertThat(GeProfileRules.validate("work", "B2", "date", TODAY.plusYears(3).plusDays(1), 30, null, null, TODAY)).isNotNull();
        assertThat(GeProfileRules.validate("work", "B2", "date", TODAY.plusYears(3), 30, null, null, TODAY)).isNull();
    }

    @Test
    void windowTurnsIntoItsUpperBound() {
        assertThat(GeProfileRules.windowDate("1-3m", TODAY)).isEqualTo(LocalDate.of(2027, 1, 12));
        assertThat(GeProfileRules.windowDate("6-12m", TODAY)).isEqualTo(LocalDate.of(2027, 10, 12));
        assertThat(GeProfileRules.windowDate("none", TODAY)).isNull();
        assertThat(GeProfileRules.windowDate("date", TODAY)).isNull();
    }

    @Test
    void deadlineStates() {
        assertThat(GeProfileRules.deadline("none", null, TODAY).state()).isEqualTo("none");
        assertThat(GeProfileRules.deadline("date", TODAY, TODAY).state()).isEqualTo("today");
        assertThat(GeProfileRules.deadline("date", TODAY.plusDays(1), TODAY).state()).isEqualTo("tomorrow");
        assertThat(GeProfileRules.deadline("date", TODAY.minusDays(1), TODAY).state()).isEqualTo("passed");
        GeProfileRules.Deadline d = GeProfileRules.deadline("3-6m", TODAY.plusDays(40), TODAY);
        assertThat(d.state()).isEqualTo("days");
        assertThat(d.daysRemaining()).isEqualTo(40L);
        assertThat(d.approximate()).isTrue();
        assertThat(GeProfileRules.deadline("date", TODAY.plusDays(40), TODAY).approximate()).isFalse();
    }

    @Test
    void journeyIsReachedWhenTheLevelCatchesUp() {
        assertThat(GeProfileRules.journey("A2", "B1", 40, "B2").reached()).isFalse();
        assertThat(GeProfileRules.journey("A2", "B2", 0, "B2").reached()).isTrue();
        assertThat(GeProfileRules.journey("A2", "C2", 0, "C1").reached()).isTrue();
        assertThat(GeProfileRules.journey(null, null, null, "B2").reached()).isFalse();
        assertThat(GeProfileRules.journey("A2", "B1", 40, "B2").current().percent()).isEqualTo(40);
    }

    @Test
    void legacyGoalBecomesAProfileTarget() {
        assertThat(GeProfileRules.legacyTarget("B2", "A2")).isEqualTo("B2");
        assertThat(GeProfileRules.legacyTarget("C2", "B1")).isEqualTo("C1");
        assertThat(GeProfileRules.legacyTarget("C2", "C1")).isNull();
        assertThat(GeProfileRules.legacyTarget("Z9", "A1")).isNull();
        assertThat(GeProfileRules.legacyTarget(null, "A1")).isNull();
    }
}
```

- [ ] **Step 2: убедиться, что тест падает**

Run: `cd $B && ./gradlew test --tests 'kz.education.server.modules.ge.service.GeProfileRulesTest' -q`
Expected: FAIL — `GeProfileRules` не найден.

- [ ] **Step 3: реализация**

```java
package kz.education.server.modules.ge.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Правила профиля General English — без базы и часов, чтобы покрыть их тестом целиком. Наборы значений те же, что в
 * CHECK миграции V327 и в анкете веба (jts-web-app src/ge/onboarding.js): разъедутся — веб получит 400 на своё же
 * значение.
 */
public final class GeProfileRules {

    private GeProfileRules() {
    }

    /** Лестница уровней: C2 бывает в профиле (тест, менеджер), но целью быть не может — курса после C1 нет. */
    public static final List<String> LEVELS = List.of("A0", "A1", "A2", "B1", "B2", "C1", "C2");
    public static final Set<String> TARGETS = Set.of("A1", "A2", "B1", "B2", "C1");
    public static final Set<String> PURPOSES = Set.of("work", "travel", "study", "self");
    public static final Set<String> WINDOWS = Set.of("date", "1-3m", "3-6m", "6-12m", "none");
    /** Окно → верхняя граница в месяцах: «успеваете ли» честнее считать по ней, чем по середине окна. */
    public static final Map<String, Integer> WINDOW_MONTHS = Map.of("1-3m", 3, "3-6m", 6, "6-12m", 12);
    public static final Set<Integer> DAILY = Set.of(15, 30, 60, 90);
    public static final Set<String> START_MODES = Set.of("zero", "some", "known");
    public static final Set<String> ROUTES = Set.of("self_study", "group", "individual");

    public record Deadline(String state, LocalDate date, Long daysRemaining, boolean approximate) {
        public static final Deadline NONE = new Deadline("none", null, null, false);
    }

    public record Current(String level, Integer percent) {
    }

    public record Journey(String start, Current current, String target, boolean reached) {
    }

    public static int rank(String level) {
        return level == null ? -1 : LEVELS.indexOf(level.toUpperCase());
    }

    /** Текст отказа или null, если анкета годится. currentLevel — уровень ученика (null — теста ещё не было). */
    public static String validate(String purpose, String targetLevel, String deadlineWindow, LocalDate deadlineDate,
                                  Integer dailyMinutes, String startMode, String currentLevel, LocalDate today) {
        if (purpose != null && !PURPOSES.contains(purpose)) return "purpose: work | travel | study | self";
        if (targetLevel == null || !TARGETS.contains(targetLevel)) return "targetLevel: A1 | A2 | B1 | B2 | C1";
        if (currentLevel != null && rank(targetLevel) <= rank(currentLevel)) return "Цель должна быть выше текущего уровня";
        if (deadlineWindow != null && !WINDOWS.contains(deadlineWindow)) return "deadlineWindow: date | 1-3m | 3-6m | 6-12m | none";
        if ("date".equals(deadlineWindow) && deadlineDate == null) return "Для deadlineWindow = date нужна deadlineDate";
        if (deadlineDate != null && (deadlineDate.isBefore(today) || deadlineDate.isAfter(today.plusYears(3))))
            return "Срок — от сегодня до трёх лет вперёд";
        if (dailyMinutes == null || !DAILY.contains(dailyMinutes)) return "dailyMinutes: 15 | 30 | 60 | 90";
        if (startMode != null && !START_MODES.contains(startMode)) return "startMode: zero | some | known";
        return null;
    }

    /** Окно в дату: сегодня + верхняя граница. У «date» и «none» даты из окна нет. */
    public static LocalDate windowDate(String window, LocalDate today) {
        Integer months = window == null ? null : WINDOW_MONTHS.get(window);
        return months == null ? null : today.plusMonths(months);
    }

    /** Состояние срока для блока цели «Главной»; дата из окна помечается approximate («≈ март 2027»). */
    public static Deadline deadline(String window, LocalDate date, LocalDate today) {
        if (date == null) return Deadline.NONE;
        long days = ChronoUnit.DAYS.between(today, date);
        String state = days < 0 ? "passed" : days == 0 ? "today" : days == 1 ? "tomorrow" : "days";
        return new Deadline(state, date, days, !"date".equals(window));
    }

    public static Journey journey(String from, String level, Integer percent, String target) {
        boolean reached = target != null && level != null && rank(level) >= rank(target);
        return new Journey(from, new Current(level, percent), target, reached);
    }

    /** Цель из level_goal веба → цель профиля: C2 становится C1 (курса выше нет); null — переносить нечего. */
    public static String legacyTarget(String target, String from) {
        if (target == null) return null;
        String t = "C2".equalsIgnoreCase(target) ? "C1" : target.toUpperCase();
        if (!TARGETS.contains(t)) return null;
        if (from != null && rank(from) >= rank(t)) return null;
        return t;
    }
}
```

- [ ] **Step 4: тест проходит**

Run: `cd $B && ./gradlew test --tests 'kz.education.server.modules.ge.service.GeProfileRulesTest' -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C $B add src/main/java/kz/education/server/modules/ge/service/GeProfileRules.java src/test/java/kz/education/server/modules/ge
git -C $B commit -m "feat(ge): правила анкеты, срока и дорожки General English"
```

### Task A3: сервис и ручки `/mobile/ge`

**Files:**
- Create: `$J/modules/ge/service/GeProfileService.java`
- Create: `$J/presentation/mobile/ge/controller/GeProfileController.java`
- Test: `$B/src/test/java/kz/education/server/modules/ge/service/GeProfileServiceTest.java`

**Interfaces:**
- Consumes: `GeProfileRules`, `GeProfileRepository`, `UserRepository.findById`, `LevelProgressService.summaryFor(User).percent()`.
- Produces (JSON): `GET /mobile/ge/profile`, `PUT /mobile/ge/profile` (`OnboardingRequest`), `PUT /mobile/ge/profile/route` (`{route}`), `POST /mobile/ge/profile/legacy-goal` (`{targetLevel, fromLevel}`) → все отдают `ProfileView {onboarded, purpose, targetLevel, fromLevel, deadlineDate, deadlineWindow, dailyMinutes, startMode, route, onboardedAt, deadline{state,date,daysRemaining,approximate}, journey{start,current{level,percent},target,reached}}`.

- [ ] **Step 1: проверить конструкторы User и LevelProgress**

Run: `grep -n "class User\|@NoArgsConstructor\|@Data\|private Long id" $J/modules/user/model/User.java | head; grep -n "SELF_STUDY\|LESSONS" $J/modules/levelprogress/model/StudyTrack.java`
Expected: у `User` есть пустой конструктор и `setId`; у `StudyTrack` есть `SELF_STUDY`. Если `setId` нет — в тесте не задавать id.

- [ ] **Step 2: тест**

```java
package kz.education.server.modules.ge.service;

import kz.education.server.modules.ge.model.GeProfile;
import kz.education.server.modules.ge.repository.GeProfileRepository;
import kz.education.server.modules.levelprogress.model.StudyTrack;
import kz.education.server.modules.levelprogress.service.LevelProgressService;
import kz.education.server.modules.survey.model.LanguageLevel;
import kz.education.server.modules.user.model.User;
import kz.education.server.modules.user.repository.UserRepository;
import kz.education.server.shared.exception.types.BadRequestException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GeProfileServiceTest {

    @Mock
    GeProfileRepository profiles;
    @Mock
    UserRepository users;
    @Mock
    LevelProgressService levelProgress;
    @InjectMocks
    GeProfileService service;

    static User user(LanguageLevel level) {
        User u = new User();
        u.setId(7L);
        u.setLanguageLevel(level);
        return u;
    }

    static LevelProgressService.LevelProgress progress(int percent) {
        return new LevelProgressService.LevelProgress(LanguageLevel.A2, LanguageLevel.B1, StudyTrack.SELF_STUDY, percent, 10, 36, 26, 0, 0);
    }

    @Test
    void zeroStartSetsA0AndStartsTheJourneyThere() {
        User u = user(null);
        when(users.findById(7L)).thenReturn(Optional.of(u));
        when(profiles.findById(7L)).thenReturn(Optional.empty());
        when(profiles.save(any())).thenAnswer(i -> i.getArgument(0));
        when(levelProgress.summaryFor(u)).thenReturn(progress(0));

        var v = service.save(7L, new GeProfileService.OnboardingRequest("travel", "B1", null, "3-6m", 30, "zero"));

        assertThat(u.getLanguageLevel()).isEqualTo(LanguageLevel.A0);
        verify(users).save(u);
        assertThat(v.onboarded()).isTrue();
        assertThat(v.fromLevel()).isEqualTo("A0");
        assertThat(v.deadlineWindow()).isEqualTo("3-6m");
        assertThat(v.deadlineDate()).isEqualTo(LocalDate.now().plusMonths(6));
        assertThat(v.deadline().approximate()).isTrue();
        assertThat(v.journey().start()).isEqualTo("A0");
    }

    @Test
    void targetNotAboveTheLevelIsRejected() {
        when(users.findById(7L)).thenReturn(Optional.of(user(LanguageLevel.B1)));
        assertThatThrownBy(() -> service.save(7L, new GeProfileService.OnboardingRequest("work", "B1", null, "none", 30, null)))
                .isInstanceOf(BadRequestException.class);
        verify(profiles, never()).save(any());
    }

    @Test
    void theFirstLevelAfterTheTestBecomesTheStart() {
        User u = user(LanguageLevel.A2);
        GeProfile p = new GeProfile();
        p.setUserId(7L);
        p.setTargetLevel("B2");
        p.setOnboardedAt(LocalDateTime.now());
        when(users.findById(7L)).thenReturn(Optional.of(u));
        when(profiles.findById(7L)).thenReturn(Optional.of(p));
        when(profiles.save(any())).thenAnswer(i -> i.getArgument(0));
        when(levelProgress.summaryFor(u)).thenReturn(progress(40));

        var v = service.profile(7L);

        assertThat(v.fromLevel()).isEqualTo("A2");
        assertThat(v.journey().start()).isEqualTo("A2");
        assertThat(v.journey().current().percent()).isEqualTo(40);
        assertThat(v.deadline().state()).isEqualTo("none");
    }

    @Test
    void legacyGoalNeverOverwritesAProfileTarget() {
        User u = user(LanguageLevel.A2);
        GeProfile p = new GeProfile();
        p.setUserId(7L);
        p.setTargetLevel("B1");
        when(users.findById(7L)).thenReturn(Optional.of(u));
        when(profiles.findById(7L)).thenReturn(Optional.of(p));
        when(levelProgress.summaryFor(u)).thenReturn(progress(0));

        var v = service.importLegacyGoal(7L, new GeProfileService.LegacyGoalRequest("B2", "A2"));

        assertThat(v.targetLevel()).isEqualTo("B1");
        verify(profiles, never()).save(any());
    }

    @Test
    void legacyC2GoalBecomesC1AndDoesNotCountAsOnboarding() {
        User u = user(LanguageLevel.B1);
        when(users.findById(7L)).thenReturn(Optional.of(u));
        when(profiles.findById(7L)).thenReturn(Optional.empty());
        when(profiles.save(any())).thenAnswer(i -> i.getArgument(0));
        when(levelProgress.summaryFor(u)).thenReturn(progress(0));

        var v = service.importLegacyGoal(7L, new GeProfileService.LegacyGoalRequest("C2", "B1"));

        assertThat(v.targetLevel()).isEqualTo("C1");
        assertThat(v.fromLevel()).isEqualTo("B1");
        assertThat(v.onboarded()).isFalse();
    }

    @Test
    void routeNeedsTheQuestionnaireFirst() {
        when(profiles.findById(7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.setRoute(7L, "group")).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.setRoute(7L, "teacher")).isInstanceOf(BadRequestException.class);
    }
}
```

- [ ] **Step 3: тест падает**

Run: `cd $B && ./gradlew test --tests 'kz.education.server.modules.ge.service.GeProfileServiceTest' -q`
Expected: FAIL — `GeProfileService` не найден.

- [ ] **Step 4: сервис**

```java
package kz.education.server.modules.ge.service;

import kz.education.server.modules.ge.model.GeProfile;
import kz.education.server.modules.ge.repository.GeProfileRepository;
import kz.education.server.modules.levelprogress.service.LevelProgressService;
import kz.education.server.modules.survey.model.LanguageLevel;
import kz.education.server.modules.user.model.User;
import kz.education.server.modules.user.repository.UserRepository;
import kz.education.server.shared.exception.types.BadRequestException;
import kz.education.server.shared.exception.types.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Профиль General English: анкета «Главной» (цель, срок, минут в день), выбранный формат и то, что из них видно на
 * блоке цели — состояние срока и дорожка «старт → сейчас → цель». Срок до цели (недели по формату) здесь не считается:
 * его считает веб по roadmap.js, как IELTS считает свой на клиенте; в Java формулу перенесёт планировщик (часть 2).
 */
@Service
@RequiredArgsConstructor
public class GeProfileService {

    private final GeProfileRepository profiles;
    private final UserRepository users;
    private final LevelProgressService levelProgress;

    public record ProfileView(boolean onboarded, String purpose, String targetLevel, String fromLevel, LocalDate deadlineDate,
                              String deadlineWindow, Integer dailyMinutes, String startMode, String route, LocalDateTime onboardedAt,
                              GeProfileRules.Deadline deadline, GeProfileRules.Journey journey) {
    }

    public record OnboardingRequest(String purpose, String targetLevel, LocalDate deadlineDate, String deadlineWindow,
                                    Integer dailyMinutes, String startMode) {
    }

    public record LegacyGoalRequest(String targetLevel, String fromLevel) {
    }

    @Transactional
    public ProfileView profile(Long userId) {
        User user = user(userId);
        GeProfile p = profiles.findById(userId).orElse(null);
        String level = levelOf(user);
        // Анкету прошли до теста — точки отсчёта не было. Первый уровень после теста и есть старт дорожки.
        if (p != null && p.getTargetLevel() != null && p.getFromLevel() == null && level != null) {
            p.setFromLevel(level);
            p.setUpdatedAt(LocalDateTime.now());
            p = profiles.save(p);
        }
        return view(p, user);
    }

    @Transactional
    public ProfileView save(Long userId, OnboardingRequest r) {
        User user = user(userId);
        String level = levelOf(user);
        LocalDate today = LocalDate.now();
        String window = r.deadlineDate() != null ? "date" : r.deadlineWindow() == null ? "none" : r.deadlineWindow();
        String error = GeProfileRules.validate(r.purpose(), r.targetLevel(), window, r.deadlineDate(), r.dailyMinutes(),
                r.startMode(), level, today);
        if (error != null) throw new BadRequestException(error);
        // «Начинаю с нуля»: теста не будет, уровень — A0 сразу, иначе маршрут не от чего считать.
        if (level == null && "zero".equals(r.startMode())) {
            user.setLanguageLevel(LanguageLevel.A0);
            users.save(user);
            level = "A0";
        }
        GeProfile p = profiles.findById(userId).orElseGet(() -> {
            GeProfile n = new GeProfile();
            n.setUserId(userId);
            return n;
        });
        p.setPurpose(r.purpose());
        p.setTargetLevel(r.targetLevel());
        // Новая цель — новая дорожка: старт — уровень на момент анкеты (до теста null, его заполнит profile()).
        p.setFromLevel(level);
        p.setDeadlineWindow(window);
        p.setDeadlineDate("date".equals(window) ? r.deadlineDate() : GeProfileRules.windowDate(window, today));
        p.setDailyMinutes(r.dailyMinutes());
        p.setStartMode(r.startMode());
        if (p.getOnboardedAt() == null) p.setOnboardedAt(LocalDateTime.now());
        p.setUpdatedAt(LocalDateTime.now());
        return view(profiles.save(p), user);
    }

    @Transactional
    public ProfileView setRoute(Long userId, String route) {
        if (route == null || !GeProfileRules.ROUTES.contains(route)) throw new BadRequestException("route: self_study | group | individual");
        GeProfile p = profiles.findById(userId).filter(x -> x.getOnboardedAt() != null)
                .orElseThrow(() -> new BadRequestException("Сначала анкета"));
        p.setRoute(route);
        p.setRouteAt(LocalDateTime.now());
        p.setUpdatedAt(LocalDateTime.now());
        return view(profiles.save(p), user(userId));
    }

    /**
     * Разовый перенос цели из level_goal веба (до 12.10.2026 цель жила там). Цель в профиле уже есть — ничего не
     * трогаем: профиль новее. Анкету пройденной перенос не делает — ученик увидит приглашение с подставленной целью.
     */
    @Transactional
    public ProfileView importLegacyGoal(Long userId, LegacyGoalRequest r) {
        User user = user(userId);
        String target = GeProfileRules.legacyTarget(r.targetLevel(), r.fromLevel());
        GeProfile p = profiles.findById(userId).orElse(null);
        if (target == null || (p != null && p.getTargetLevel() != null)) return view(p, user);
        if (p == null) {
            p = new GeProfile();
            p.setUserId(userId);
        }
        p.setTargetLevel(target);
        p.setFromLevel(GeProfileRules.rank(r.fromLevel()) >= 0 ? r.fromLevel().toUpperCase() : null);
        p.setUpdatedAt(LocalDateTime.now());
        return view(profiles.save(p), user);
    }

    private ProfileView view(GeProfile p, User user) {
        String level = levelOf(user);
        Integer percent = level == null ? null : levelProgress.summaryFor(user).percent();
        if (p == null) {
            return new ProfileView(false, null, null, null, null, null, null, null, null, null,
                    GeProfileRules.Deadline.NONE, GeProfileRules.journey(null, level, percent, null));
        }
        return new ProfileView(p.getOnboardedAt() != null, p.getPurpose(), p.getTargetLevel(), p.getFromLevel(), p.getDeadlineDate(),
                p.getDeadlineWindow(), p.getDailyMinutes(), p.getStartMode(), p.getRoute(), p.getOnboardedAt(),
                GeProfileRules.deadline(p.getDeadlineWindow(), p.getDeadlineDate(), LocalDate.now()),
                GeProfileRules.journey(p.getFromLevel(), level, percent, p.getTargetLevel()));
    }

    private User user(Long userId) {
        return users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("Пользователь не найден"));
    }

    private static String levelOf(User user) {
        return user.getLanguageLevel() == null ? null : user.getLanguageLevel().name();
    }
}
```

- [ ] **Step 5: контроллер**

```java
package kz.education.server.presentation.mobile.ge.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import kz.education.server.modules.ge.service.GeProfileService;
import kz.education.server.shared.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/** Профиль General English ученика: анкета «Главной», формат занятий и блок цели (дизайн jts-web-app 2026-10-12). */
@RestController
@RequestMapping("/mobile/ge")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "General English profile", description = "Home onboarding: goal level, deadline, daily minutes and study route")
public class GeProfileController {

    private final GeProfileService service;
    private final SecurityUtils securityUtils;

    public record RouteRequest(String route) {
    }

    @GetMapping("/profile")
    @Operation(summary = "My General English goal, deadline and route (onboarded=false before the questionnaire)")
    public GeProfileService.ProfileView profile() {
        return service.profile(securityUtils.userId());
    }

    @PutMapping("/profile")
    @Operation(summary = "Save the questionnaire (also used to edit the goal, deadline and daily minutes)")
    public GeProfileService.ProfileView save(@RequestBody GeProfileService.OnboardingRequest req) {
        return service.save(securityUtils.userId(), req);
    }

    @PutMapping("/profile/route")
    @Operation(summary = "Choose the study format: self_study | group | individual")
    public GeProfileService.ProfileView route(@RequestBody RouteRequest req) {
        return service.setRoute(securityUtils.userId(), req.route());
    }

    @PostMapping("/profile/legacy-goal")
    @Operation(summary = "One-time import of the goal the web app kept before (level_goal); never overwrites")
    public GeProfileService.ProfileView legacyGoal(@RequestBody GeProfileService.LegacyGoalRequest req) {
        return service.importLegacyGoal(securityUtils.userId(), req);
    }
}
```

- [ ] **Step 6: тесты модуля проходят**

Run: `cd $B && ./gradlew test --tests 'kz.education.server.modules.ge.*' -q`
Expected: PASS (оба класса).

- [ ] **Step 7: полная компиляция и тесты, не требующие Docker**

Run: `cd $B && ./gradlew compileJava compileTestJava -q && ./gradlew test --tests 'kz.education.server.modules.ielts.*' -q`
Expected: PASS (контроль, что соседний модуль не задет).

- [ ] **Step 8: Commit**

```bash
git -C $B add src/main/java/kz/education/server/modules/ge/service/GeProfileService.java src/main/java/kz/education/server/presentation/mobile/ge src/test/java/kz/education/server/modules/ge/service/GeProfileServiceTest.java
git -C $B commit -m "feat(ge): ручки /mobile/ge/profile — анкета, формат, перенос цели"
```

---

# Часть B — веб (`C:\Users\nural\Desktop\jts-web-app\.claude\worktrees\ge-onboarding`, ветка `feat/ge-onboarding`)

Дальше `W = C:/Users/nural/Desktop/jts-web-app/.claude/worktrees/ge-onboarding`. Перед первым `npm test` в worktree: `cmd /c mklink /J node_modules ..\..\..\node_modules` (junction на node_modules основного дерева; снимать перед удалением worktree).

### Task B1: расчёт маршрута `src/ge/route.js`

**Files:**
- Create: `$W/src/ge/route.js`
- Test: `$W/src/ge/route.test.js`

**Interfaces:**
- Consumes: `SYLLABUS_LESSONS`, `estimateWeeks` из `src/lib/roadmap.js`; `pluralForm` из `src/lib/plural.js`.
- Produces: `LEVELS`, `TILE_LEVELS`, `TOP_TARGET`, `ROUTES`, `rankOf(level)`, `canSetGoal(level)`, `isoDay(date)`, `daysUntil(iso, today)`, `windowDate(window, today)`, `remainingLessons(level, target, percent)`, `termFor(route, lessons, dailyMinutes) → {weeks, months}`, `termUnits(term) → {unit:'months'|'years', n}`, `fitsDeadline(term, iso, today) → 'spare'|'fits'|'late'|null`, `routeOptions({targetLevel, dailyMinutes, deadlineIso}, {level, percent}, today) → [{id, lessons, term, units, fit}]`, `recommendRoute(options, {purpose, level, targetLevel}) → {route, late}`, `currentFormat(occurrences) → 'group'|'individual'|null`, `formatTerm(units, t, lang) → string`.

- [ ] **Step 1: тест**

```js
import { describe, it, expect } from 'vitest'
import {
  canSetGoal, currentFormat, fitsDeadline, formatTerm, recommendRoute, remainingLessons, routeOptions, termFor, termUnits, windowDate,
} from './route.js'

const TODAY = new Date(2026, 9, 12)

describe('remainingLessons', () => {
  it('курсы силлабуса до цели минус пройденная доля текущего', () => {
    expect(remainingLessons('B1', 'B2', 0)).toBe(36)
    expect(remainingLessons('B1', 'B2', 50)).toBe(18)
    expect(remainingLessons('A0', 'C1', 0)).toBe(176)
    expect(remainingLessons('A2', 'B2', 100)).toBe(36)
  })
  it('цель не выше уровня или уровень вне лестницы — ноль', () => {
    expect(remainingLessons('B2', 'B1', 0)).toBe(0)
    expect(remainingLessons('C2', 'C1', 0)).toBe(0)
    expect(remainingLessons(null, 'B1', 0)).toBe(0)
  })
})

describe('termFor', () => {
  it('B1→B2, 30 минут в день: 30 / 20 / 16 недель ≈ 7 / 4,5 / 3,5 месяца', () => {
    expect(termFor('self_study', 36, 30)).toEqual({ weeks: 30, months: 7 })
    expect(termFor('group', 36, 30)).toEqual({ weeks: 20, months: 4.5 })
    expect(termFor('individual', 36, 30)).toEqual({ weeks: 16, months: 3.5 })
  })
  it('уроков нет — срока нет', () => {
    expect(termFor('group', 0, 30)).toEqual({ weeks: 0, months: 0 })
  })
})

describe('termUnits / formatTerm', () => {
  const t = (key, vars) => `${key}|${vars.n}`
  it('до полутора лет месяцами, дальше годами с шагом полгода', () => {
    expect(termUnits({ weeks: 30, months: 7 })).toEqual({ unit: 'months', n: 7 })
    expect(termUnits({ weeks: 146, months: 33.5 })).toEqual({ unit: 'years', n: 3 })
  })
  it('дробное число берёт форму few и запятую', () => {
    expect(formatTerm({ unit: 'months', n: 4.5 }, t, 'ru')).toBe('geTerm.months.few|4,5')
    expect(formatTerm({ unit: 'months', n: 7 }, t, 'ru')).toBe('geTerm.months.many|7')
    expect(formatTerm({ unit: 'years', n: 2.5 }, t, 'en')).toBe('geTerm.years.few|2.5')
  })
})

describe('fitsDeadline', () => {
  const term = { weeks: 30, months: 7 } // 210 дней
  it('ровно к сроку — успевает, с запасом от трёх недель', () => {
    expect(fitsDeadline(term, '2027-05-10', TODAY)).toBe('fits')
    expect(fitsDeadline(term, '2027-05-09', TODAY)).toBe('late')
    expect(fitsDeadline(term, '2027-06-01', TODAY)).toBe('spare')
    expect(fitsDeadline(term, null, TODAY)).toBe(null)
  })
  it('окно переводится в верхнюю границу', () => {
    expect(windowDate('3-6m', TODAY)).toBe('2027-04-12')
    expect(windowDate('none', TODAY)).toBe(null)
  })
})

describe('recommendRoute', () => {
  const opts = (deadlineIso, level = 'B1', target = 'B2') =>
    routeOptions({ targetLevel: target, dailyMinutes: 30, deadlineIso }, { level, percent: 0 }, TODAY)
  it('сам не успевает, группа успевает → группа', () => {
    expect(recommendRoute(opts('2027-03-12'), { purpose: 'self', level: 'B1', targetLevel: 'B2' })).toEqual({ route: 'group', late: false })
  })
  it('группа не успевает, индивидуально успевает → индивидуально', () => {
    expect(recommendRoute(opts('2027-02-12'), { purpose: 'self', level: 'B1', targetLevel: 'B2' })).toEqual({ route: 'individual', late: false })
  })
  it('никто не успевает → индивидуально с пометкой', () => {
    expect(recommendRoute(opts('2026-12-01'), { purpose: 'self', level: 'B1', targetLevel: 'B2' })).toEqual({ route: 'individual', late: true })
  })
  it('без срока: работа и разрыв от двух уровней — группа, иначе сам', () => {
    expect(recommendRoute(opts(null, 'A2', 'B2'), { purpose: 'work', level: 'A2', targetLevel: 'B2' }).route).toBe('group')
    expect(recommendRoute(opts(null, 'A2', 'B2'), { purpose: 'travel', level: 'A2', targetLevel: 'B2' }).route).toBe('self_study')
    expect(recommendRoute(opts(null), { purpose: 'work', level: 'B1', targetLevel: 'B2' }).route).toBe('self_study')
  })
})

describe('canSetGoal / currentFormat', () => {
  it('цель ставится ниже C1 и без уровня', () => {
    expect(canSetGoal(null)).toBe(true)
    expect(canSetGoal('B2')).toBe(true)
    expect(canSetGoal('C1')).toBe(false)
    expect(canSetGoal('C2')).toBe(false)
  })
  it('формат — по последнему занятию, кроме пробного', () => {
    expect(currentFormat([])).toBe(null)
    expect(currentFormat([{ lessonType: 'TRIAL', scheduledAt: '2026-10-01' }])).toBe(null)
    expect(currentFormat([
      { lessonType: 'GROUP', scheduledAt: '2026-09-01T10:00' },
      { lessonType: 'INDIVIDUAL_PREMIUM', scheduledAt: '2026-10-01T10:00' },
    ])).toBe('individual')
    expect(currentFormat([{ lessonType: 'PAIR', scheduledAt: '2026-10-01' }])).toBe('group')
  })
})
```

Проверка чисел рекомендаций: B1→B2 = 36 уроков; сам 210 дней, группа 140, индивидуально 112. 2027-03-12 — 151 день (сам не успевает, группа успевает); 2027-02-12 — 123 дня (группа нет, индивидуально да); 2026-12-01 — 50 дней (никто).

- [ ] **Step 2: тест падает**

Run: `cd $W && npx vitest run src/ge/route.test.js`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: реализация**

```js
// Маршрут General English до цели: сколько уроков осталось, за сколько недель их закроет каждый формат и успевает ли
// он к сроку. Формула — ТЗ «Roadmap» (src/lib/roadmap.js: силлабус, K_eff формата, ускорение за домашку, буфер
// повторения); дизайн — docs/superpowers/specs/2026-10-12-ge-onboarding-roadmap-design.md, секция 2.
//
// Модуль чистый: «сегодня» приходит аргументом, иначе «успеваете / нет» нечем накрыть тестом.

import { SYLLABUS_LESSONS, estimateWeeks } from '../lib/roadmap.js'
import { pluralForm } from '../lib/plural.js'

// Вся лестница ученика: C2 бывает в профиле (тест, менеджер), но целью не бывает — курса после C1 нет.
export const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']
// Плитки цели — A0…C1 (решение владельца 12.10.2026).
export const TILE_LEVELS = LEVELS.slice(0, 6)
export const TOP_TARGET = 'C1'

export const ROUTES = ['self_study', 'group', 'individual']
// Формат карточки → формат калькулятора. Индивидуально — по 60 минут: так обещает карточка.
const FORMAT = { self_study: 'self_study', group: 'group', individual: 'individual_60' }
// Допущение спеки: и группа, и индивидуальные — 2 занятия в неделю.
export const SESSIONS_PER_WEEK = { group: 2, individual: 2 }

export const WEEKS_PER_MONTH = 4.345
// До полутора лет срок пишем месяцами, дальше — годами: «≈ 34 месяца» не читается.
export const LONG_MONTHS = 18
// «С запасом» — срок закрывается хотя бы за три недели до даты (как у IELTS).
export const SPARE_DAYS = 21
const WINDOW_MONTHS = { '1-3m': 3, '3-6m': 6, '6-12m': 12 }

export const rankOf = (level) => LEVELS.indexOf(String(level || '').toUpperCase())

/** Можно ли выбрать цель: уровень неизвестен или ниже C1. */
export const canSetGoal = (level) => level == null || (rankOf(level) >= 0 && rankOf(level) < rankOf(TOP_TARGET))

const pad = (n) => String(n).padStart(2, '0')
export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** Дни от сегодня до даты 'YYYY-MM-DD' (отрицательные — дата прошла). */
export function daysUntil(isoDate, today = new Date()) {
  if (!isoDate) return null
  return Math.round((new Date(`${isoDate}T00:00:00`) - dayStart(today)) / 86400000)
}

/** Окно срока в дату: сегодня + верхняя граница окна. У 'date' и 'none' — null. Бэкенд считает так же. */
export function windowDate(window, today = new Date()) {
  const months = WINDOW_MONTHS[window]
  if (!months) return null
  return isoDay(new Date(today.getFullYear(), today.getMonth() + months, today.getDate()))
}

/**
 * Сколько уроков осталось до цели: курсы силлабуса от текущего уровня до цели минус пройденная доля курса текущего.
 * percent — процент сервера (/mobile/level-progress) по текущему уровню; не пришёл — считаем от нуля.
 */
export function remainingLessons(level, target, percent = 0) {
  const from = rankOf(level)
  const to = rankOf(target)
  if (from < 0 || to <= from) return 0
  let sum = 0
  for (let i = from; i < to; i += 1) sum += SYLLABUS_LESSONS[LEVELS[i]] || 0
  const share = Math.min(100, Math.max(0, Number(percent) || 0)) / 100
  return Math.max(0, sum - Math.round(share * (SYLLABUS_LESSONS[LEVELS[from]] || 0)))
}

/** Срок формата: недели калькулятора и месяцы с шагом в полмесяца. */
export function termFor(route, lessons, dailyMinutes) {
  if (!lessons || lessons <= 0) return { weeks: 0, months: 0 }
  const { weeks } = estimateWeeks({
    totalLessons: lessons,
    learningFormat: FORMAT[route],
    sessionsPerWeek: SESSIONS_PER_WEEK[route] || 0,
    homeworkMinutesPerDay: dailyMinutes || 30,
  })
  return { weeks, months: Math.max(0.5, Math.round((weeks / WEEKS_PER_MONTH) * 2) / 2) }
}

/** Как писать срок: до полутора лет — месяцами, дальше — годами с шагом в полгода. */
export function termUnits(term) {
  if (term.months <= LONG_MONTHS) return { unit: 'months', n: term.months }
  return { unit: 'years', n: Math.round((term.months / 12) * 2) / 2 }
}

/** «≈ 7 месяцев» / «≈ 4,5 месяца» / «≈ 3 года»: у дробного числа форма «нескольких», как у IELTS. */
export function formatTerm(units, t, lang = 'ru') {
  const form = units.n % 1 !== 0 ? 'few' : pluralForm(units.n, lang)
  return t(`geTerm.${units.unit}.${form}`, { n: String(units.n).replace('.', lang === 'en' ? '.' : ',') })
}

/** Успевает ли срок к дате: 'spare' | 'fits' | 'late' | null (даты нет). */
export function fitsDeadline(term, deadlineIso, today = new Date()) {
  const days = daysUntil(deadlineIso, today)
  if (days == null) return null
  const need = term.weeks * 7
  if (need > days) return 'late'
  return days - need >= SPARE_DAYS ? 'spare' : 'fits'
}

/** Три карточки экрана маршрута. deadlineIso — profile.deadline.date (окно бэкенд уже перевёл в дату). */
export function routeOptions({ targetLevel, dailyMinutes, deadlineIso }, { level, percent }, today = new Date()) {
  const lessons = remainingLessons(level, targetLevel, percent)
  return ROUTES.map((id) => {
    const term = termFor(id, lessons, dailyMinutes)
    return { id, lessons, term, units: termUnits(term), fit: fitsDeadline(term, deadlineIso, today) }
  })
}

const OK = new Set(['fits', 'spare'])

/** Рекомендация (спека, секция 2): по сроку — самый дешёвый успевающий формат; без срока — по цели и разрыву. */
export function recommendRoute(options, { purpose, level, targetLevel }) {
  const by = Object.fromEntries(options.map((o) => [o.id, o]))
  const hasDeadline = options.some((o) => o.fit != null)
  if (hasDeadline && !OK.has(by.self_study?.fit)) {
    if (OK.has(by.group?.fit)) return { route: 'group', late: false }
    if (OK.has(by.individual?.fit)) return { route: 'individual', late: false }
    return { route: 'individual', late: true }
  }
  const gap = rankOf(targetLevel) - rankOf(level)
  if ((purpose === 'work' || purpose === 'study') && gap >= 2) return { route: 'group', late: false }
  return { route: 'self_study', late: false }
}

/** Формат, в котором ученик уже занимается: по последнему занятию расписания, кроме пробного. Пара — не один на один. */
export function currentFormat(occurrences) {
  const list = (Array.isArray(occurrences) ? occurrences : []).filter((o) => o?.lessonType && o.lessonType !== 'TRIAL')
  if (!list.length) return null
  const last = [...list].sort((a, b) => String(b.scheduledAt).localeCompare(String(a.scheduledAt)))[0]
  return String(last.lessonType).startsWith('INDIVIDUAL') ? 'individual' : 'group'
}
```

- [ ] **Step 4: тест проходит**

Run: `cd $W && npx vitest run src/ge/route.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C $W add src/ge/route.js src/ge/route.test.js
git -C $W commit -m "feat(ge): срок до цели по формату и рекомендация маршрута"
```

### Task B2: анкета и состояния «Главной» — чистые модули

**Files:**
- Create: `$W/src/ge/onboarding.js`, `$W/src/ge/homeState.js`, `$W/src/ge/legacyGoal.js`
- Test: `$W/src/ge/onboarding.test.js`, `$W/src/ge/homeState.test.js`, `$W/src/ge/legacyGoal.test.js`

**Interfaces:**
- Consumes: `TILE_LEVELS`, `canSetGoal`, `rankOf` (B1); `loadLevelGoal`, `readCachedGoal`, `saveLevelGoal` (`src/lib/levelGoal.js`); `sanitizeGoal` (`src/lib/levelProgress.js`); `importLegacyGoal` (B3).
- Produces: `PURPOSES`, `WINDOWS`, `DAILY`, `DAILY_DEFAULT`, `START_MODES`, `stepsFor({levelKnown, edit})`, `targetTiles(level)`, `recommendedTarget(purpose, level)`, `stepReady(key, f)`, `formFromProfile(p, level)`, `onboardingBody(f)`, `nextAfterSave({edit, levelKnown, start})`; `homeTopState({geProfile, levelUnknown, level})`, `sayKey(key, seed)`, `goalBannerState({deadline, journey, fit})`; `syncLegacyGoal(token, profile, deps?)`.

- [ ] **Step 1: тесты**

`src/ge/onboarding.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { formFromProfile, nextAfterSave, onboardingBody, recommendedTarget, stepReady, stepsFor, targetTiles } from './onboarding.js'

describe('stepsFor', () => {
  it('без уровня пять шагов, с уровнем четыре, правка — три', () => {
    expect(stepsFor({ levelKnown: false, edit: false })).toEqual(['purpose', 'target', 'deadline', 'daily', 'start'])
    expect(stepsFor({ levelKnown: true, edit: false })).toEqual(['purpose', 'target', 'deadline', 'daily'])
    expect(stepsFor({ levelKnown: true, edit: true })).toEqual(['target', 'deadline', 'daily'])
  })
})

describe('targetTiles', () => {
  it('A0–C1; A0 и всё не выше уровня неактивны', () => {
    const tiles = targetTiles('A2')
    expect(tiles.map((x) => x.code)).toEqual(['A0', 'A1', 'A2', 'B1', 'B2', 'C1'])
    expect(tiles.filter((x) => x.enabled).map((x) => x.code)).toEqual(['B1', 'B2', 'C1'])
    expect(tiles.find((x) => x.code === 'A2').mark).toBe('current')
    expect(tiles.find((x) => x.code === 'A1').mark).toBe('passed')
  })
  it('без уровня закрыт только A0', () => {
    expect(targetTiles(null).filter((x) => !x.enabled).map((x) => x.code)).toEqual(['A0'])
  })
})

describe('recommendedTarget', () => {
  it('по цели, но выше текущего уровня', () => {
    expect(recommendedTarget('work', 'A2')).toBe('B2')
    expect(recommendedTarget('travel', null)).toBe('B1')
    expect(recommendedTarget('travel', 'B1')).toBe('B2')
    expect(recommendedTarget('work', 'B2')).toBe('C1')
    expect(recommendedTarget('work', 'C1')).toBe(null)
  })
})

describe('stepReady / onboardingBody / nextAfterSave', () => {
  it('срок с датой требует саму дату', () => {
    expect(stepReady('deadline', { window: 'date' })).toBe(false)
    expect(stepReady('deadline', { window: 'date', date: '2027-01-01' })).toBe(true)
    expect(stepReady('deadline', { window: '3-6m' })).toBe(true)
    expect(stepReady('daily', { daily: 45 })).toBe(false)
  })
  it('тело PUT', () => {
    expect(onboardingBody({ purpose: 'work', target: 'B2', window: '3-6m', daily: 30, start: 'some' })).toEqual({
      purpose: 'work', targetLevel: 'B2', deadlineDate: null, deadlineWindow: '3-6m', dailyMinutes: 30, startMode: 'some',
    })
    expect(onboardingBody({ purpose: 'self', target: 'A2', window: 'date', date: '2027-02-01', daily: 15 }).deadlineDate).toBe('2027-02-01')
  })
  it('после сохранения: тест только тем, у кого уровня нет и кто не с нуля', () => {
    expect(nextAfterSave({ edit: false, levelKnown: false, start: 'some' })).toBe('test')
    expect(nextAfterSave({ edit: false, levelKnown: false, start: 'zero' })).toBe('route')
    expect(nextAfterSave({ edit: false, levelKnown: true, start: null })).toBe('route')
    expect(nextAfterSave({ edit: true, levelKnown: true, start: null })).toBe('route')
  })
  it('прошлые ответы: недостижимую уже цель не подставляем', () => {
    const p = { purpose: 'work', targetLevel: 'B1', deadlineWindow: 'none', deadlineDate: null, dailyMinutes: 60, startMode: 'some' }
    expect(formFromProfile(p, 'A2').target).toBe('B1')
    expect(formFromProfile(p, 'B1').target).toBe(null)
    expect(formFromProfile(p, 'A2').daily).toBe(60)
  })
})
```

`src/ge/homeState.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { goalBannerState, homeTopState, sayKey } from './homeState.js'

describe('homeTopState', () => {
  const p = (x) => ({ onboarded: false, route: null, ...x })
  it('нет профиля — прежняя «Главная»', () => {
    expect(homeTopState({ geProfile: null, levelUnknown: false, level: 'A2' })).toBe('legacy')
  })
  it('до анкеты: без уровня — start, с уровнем — invite, C1+ — прежняя', () => {
    expect(homeTopState({ geProfile: p(), levelUnknown: true, level: 'A1' })).toBe('start')
    expect(homeTopState({ geProfile: p(), levelUnknown: false, level: 'A2' })).toBe('invite')
    expect(homeTopState({ geProfile: p(), levelUnknown: false, level: 'C1' })).toBe('legacy')
  })
  it('после анкеты: тест, формат, блок цели', () => {
    expect(homeTopState({ geProfile: p({ onboarded: true }), levelUnknown: true, level: 'A1' })).toBe('needTest')
    expect(homeTopState({ geProfile: p({ onboarded: true }), levelUnknown: false, level: 'A2' })).toBe('needRoute')
    expect(homeTopState({ geProfile: p({ onboarded: true, route: 'group' }), levelUnknown: false, level: 'A2' })).toBe('goal')
  })
})

describe('goalBannerState', () => {
  it('цель достигнута важнее срока', () => {
    expect(goalBannerState({ deadline: { state: 'passed' }, journey: { reached: true }, fit: 'late' })).toEqual({ reached: true, say: 'reached', title: 'reached' })
  })
  it('реплика по сроку и темпу', () => {
    expect(goalBannerState({ deadline: { state: 'none' }, journey: {}, fit: null }).say).toBe('noDate')
    expect(goalBannerState({ deadline: { state: 'tomorrow' }, journey: {}, fit: 'fits' }).say).toBe('tomorrow')
    expect(goalBannerState({ deadline: { state: 'days' }, journey: {}, fit: 'late' }).say).toBe('late')
    expect(goalBannerState({ deadline: { state: 'days' }, journey: {}, fit: 'spare' }).say).toBe('onTrack')
  })
  it('срок окном — заголовок «≈ месяц год»', () => {
    expect(goalBannerState({ deadline: { state: 'days', approximate: true }, journey: {}, fit: null }).title).toBe('approx')
    expect(goalBannerState({ deadline: { state: 'days', approximate: false }, journey: {}, fit: null }).title).toBe('days')
  })
  it('варианты реплики', () => {
    expect(sayKey('onTrack', 0)).toBe('geGoal.say.onTrack')
    expect(sayKey('onTrack', 0.99)).toBe('geGoal.say.onTrack.3')
    expect(sayKey('today', 0.99)).toBe('geGoal.say.today')
  })
})
```

`src/ge/legacyGoal.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { syncLegacyGoal } from './legacyGoal.js'

const deps = (over = {}) => ({
  loadLevelGoal: vi.fn(async () => undefined),
  readCachedGoal: vi.fn(() => null),
  saveLevelGoal: vi.fn(async () => {}),
  importLegacyGoal: vi.fn(async (_t, g) => ({ onboarded: false, targetLevel: g.targetLevel, fromLevel: g.fromLevel })),
  ...over,
})

describe('syncLegacyGoal', () => {
  it('без профиля ничего не делает', async () => {
    const d = deps()
    expect(await syncLegacyGoal('tok', null, d)).toBe(null)
    expect(d.loadLevelGoal).not.toHaveBeenCalled()
  })
  it('цели в профиле нет — переносит из level_goal, C2 → C1', async () => {
    const d = deps({ loadLevelGoal: vi.fn(async () => ({ target: 'C2', from: 'B1' })) })
    const p = await syncLegacyGoal('tok', { onboarded: false, targetLevel: null }, d)
    expect(d.importLegacyGoal).toHaveBeenCalledWith('tok', { targetLevel: 'C1', fromLevel: 'B1' })
    expect(p.targetLevel).toBe('C1')
  })
  it('цель в профиле есть — зеркалит её в level_goal для карточки преподавателя', async () => {
    const d = deps({ readCachedGoal: vi.fn(() => ({ target: 'B1', from: 'A2' })) })
    await syncLegacyGoal('tok', { onboarded: true, targetLevel: 'B2', fromLevel: 'A2' }, d)
    expect(d.saveLevelGoal).toHaveBeenCalledWith('tok', { target: 'B2', from: 'A2' })
  })
  it('зеркало уже совпадает — не пишет', async () => {
    const d = deps({ readCachedGoal: vi.fn(() => ({ target: 'B2', from: 'A2' })) })
    await syncLegacyGoal('tok', { onboarded: true, targetLevel: 'B2', fromLevel: 'A2' }, d)
    expect(d.saveLevelGoal).not.toHaveBeenCalled()
  })
  it('перенос упал — профиль остаётся прежним', async () => {
    const d = deps({ loadLevelGoal: vi.fn(async () => ({ target: 'B2', from: 'A2' })), importLegacyGoal: vi.fn(async () => { throw new Error('x') }) })
    const p = { onboarded: false, targetLevel: null }
    expect(await syncLegacyGoal('tok', p, d)).toBe(p)
  })
})
```

- [ ] **Step 2: тесты падают**

Run: `cd $W && npx vitest run src/ge`
Expected: FAIL — модули не найдены.

- [ ] **Step 3: `src/ge/onboarding.js`**

```js
// Анкета General English на «Главной» (спека 2026-10-12, секция 1): шаги, наборы ответов, рекомендованная цель и тело
// PUT /mobile/ge/profile. Наборы обязаны совпадать с GeProfileRules бэкенда — иначе 400 на собственное значение.

import { TILE_LEVELS, canSetGoal, rankOf } from './route.js'

// Картинки — из онбординга IELTS (public/ielts/onboarding/): своего макета у General English нет (решение 12.10.2026).
export const PURPOSES = [
  { id: 'work', img: 'work', recommend: 'B2' },
  { id: 'travel', img: 'abroad', recommend: 'B1' },
  { id: 'study', img: 'study', recommend: 'B2' },
  { id: 'self', img: 'school', recommend: 'B1' },
]
export const WINDOWS = ['1-3m', '3-6m', '6-12m', 'none']
export const DAILY = [15, 30, 60, 90]
export const DAILY_DEFAULT = 30
export const START_MODES = ['zero', 'some', 'known']

/** Шаги: правка — только цель, срок и время; с известным уровнем вопроса «знаете свой уровень?» нет. */
export function stepsFor({ levelKnown, edit }) {
  if (edit) return ['target', 'deadline', 'daily']
  return levelKnown ? ['purpose', 'target', 'deadline', 'daily'] : ['purpose', 'target', 'deadline', 'daily', 'start']
}

/** Плитки цели A0…C1: A0 и всё не выше текущего уровня неактивны, с пометкой «ваш уровень» / «пройдено». */
export function targetTiles(level) {
  const cur = level == null ? -1 : rankOf(level)
  return TILE_LEVELS.map((code, i) => ({
    code,
    enabled: i > 0 && i > cur,
    mark: i === cur ? 'current' : i < cur ? 'passed' : null,
  }))
}

/** Рекомендованная цель по «зачем»; если она не выше уровня — следующий за ним (не выше C1). */
export function recommendedTarget(purpose, level) {
  if (!canSetGoal(level)) return null
  const base = PURPOSES.find((p) => p.id === purpose)?.recommend || 'B1'
  const cur = level == null ? -1 : rankOf(level)
  if (rankOf(base) > cur) return base
  return TILE_LEVELS[cur + 1] || null
}

export function stepReady(key, f) {
  switch (key) {
    case 'purpose':
      return !!f.purpose
    case 'target':
      return !!f.target
    case 'deadline':
      return f.window === 'date' ? !!f.date : WINDOWS.includes(f.window)
    case 'daily':
      return DAILY.includes(f.daily)
    case 'start':
      return START_MODES.includes(f.start)
    default:
      return false
  }
}

/** Ответы прошлого раза → форма. Цель, которая уже не выше уровня, не подставляем: её плитка неактивна. */
export function formFromProfile(p, level) {
  if (!p) return { daily: DAILY_DEFAULT }
  const tile = targetTiles(level).find((x) => x.code === p.targetLevel)
  return {
    purpose: p.purpose || null,
    target: tile?.enabled ? p.targetLevel : null,
    window: p.deadlineWindow || null,
    date: p.deadlineWindow === 'date' ? p.deadlineDate : null,
    daily: DAILY.includes(p.dailyMinutes) ? p.dailyMinutes : DAILY_DEFAULT,
    start: p.startMode || null,
  }
}

/** Форма → тело PUT /mobile/ge/profile. */
export function onboardingBody(f) {
  return {
    purpose: f.purpose || null,
    targetLevel: f.target,
    deadlineDate: f.window === 'date' ? f.date : null,
    deadlineWindow: f.window || 'none',
    dailyMinutes: f.daily || DAILY_DEFAULT,
    startMode: f.start || null,
  }
}

/** Куда после сохранения: правка и известный уровень — маршрут; «с нуля» — тоже (A0 ставит бэкенд); иначе тест. */
export function nextAfterSave({ edit, levelKnown, start }) {
  if (edit || levelKnown || start === 'zero') return 'route'
  return 'test'
}
```

- [ ] **Step 4: `src/ge/homeState.js`**

```js
// Что рисовать сверху «Главной» General English и что говорит маскот блока цели (спека 2026-10-12, секция 3).
// Чистые функции — состояния проверяются тестом, а не глазами.

import { canSetGoal } from './route.js'

/**
 * Верхний блок: 'legacy' — прежняя карточка уровня (ручки профиля нет или цель ставить некуда), 'start' — ни уровня,
 * ни анкеты, 'invite' — уровень есть, анкеты нет, 'needTest' / 'needRoute' — анкета есть, шаг не сделан, 'goal' — блок
 * цели.
 */
export function homeTopState({ geProfile, levelUnknown, level }) {
  if (!geProfile) return 'legacy'
  if (!geProfile.onboarded) {
    if (levelUnknown) return 'start'
    return canSetGoal(level) ? 'invite' : 'legacy'
  }
  if (levelUnknown) return 'needTest'
  if (!geProfile.route) return 'needRoute'
  return 'goal'
}

// Сколько формулировок у реплики (geGoal.say.<key>, .2, .3): маскот говорит разное от захода к заходу, как в IELTS.
const SAY_VARIANTS = { reached: 2, noDate: 2, late: 2, onTrack: 3 }

/** Ключ реплики с вариантом: seed в [0, 1) — случайное число, взятое один раз на показ блока. */
export function sayKey(key, seed) {
  const n = SAY_VARIANTS[key] || 1
  const i = Math.min(n - 1, Math.floor(seed * n))
  return i === 0 ? `geGoal.say.${key}` : `geGoal.say.${key}.${i + 1}`
}

/** Реплика маскота и вид заголовка. fit — 'late' | 'fits' | 'spare' | null у выбранного формата. */
export function goalBannerState({ deadline, journey, fit }) {
  const reached = !!journey?.reached
  const state = deadline?.state || 'none'
  let say
  if (reached) say = 'reached'
  else if (state === 'today' || state === 'tomorrow' || state === 'passed') say = state
  else if (state === 'none') say = 'noDate'
  else if (fit === 'late') say = 'late'
  else say = 'onTrack'
  const title = reached ? 'reached' : state === 'days' && deadline?.approximate ? 'approx' : state
  return { reached, say, title }
}
```

- [ ] **Step 5: `src/ge/legacyGoal.js`**

```js
// Цель уровня до 12.10.2026 жила в базе веба (level_goal). Теперь источник — профиль бэкенда (/mobile/ge), и здесь
// две вещи: разовый перенос старой цели в профиль и зеркало цели профиля обратно в level_goal — карточка ученика у
// преподавателя в web-admin до части 3 читает цель оттуда (/api/admin/student-activity) и держит копию levelTrack.

import { loadLevelGoal, readCachedGoal, saveLevelGoal } from '../lib/levelGoal.js'
import { sanitizeGoal } from '../lib/levelProgress.js'
import { importLegacyGoal } from '../api.js'

const DEPS = { loadLevelGoal, readCachedGoal, saveLevelGoal, importLegacyGoal }

/** Возвращает профиль — тот же или с перенесённой целью. Ошибки сети глотает: это не повод ронять «Главную». */
export async function syncLegacyGoal(token, profile, deps = DEPS) {
  if (!token || !profile) return profile
  if (profile.targetLevel) {
    const goal = sanitizeGoal({ target: profile.targetLevel, from: profile.fromLevel })
    const cached = deps.readCachedGoal(token)
    if (goal && (cached?.target !== goal.target || cached?.from !== goal.from)) await deps.saveLevelGoal(token, goal)
    return profile
  }
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

- [ ] **Step 6: тесты проходят** (после Task B3 — `legacyGoal.js` импортирует `importLegacyGoal` из `api.js`; если B3 ещё не сделан — сделать его шаг 1 первым)

Run: `cd $W && npx vitest run src/ge`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git -C $W add src/ge
git -C $W commit -m "feat(ge): анкета, состояния «Главной» и перенос цели из level_goal"
```

### Task B3: API профиля

**Files:**
- Modify: `$W/src/api.js` (после `getLevelProgress`, строка ~597)
- Test: `$W/src/ge/api.test.js`

**Interfaces:**
- Produces: `geProfileShape(raw) → profile|null`, `getGeProfile(token) → Promise<profile|null>`, `saveGeProfile(token, body)`, `setGeRoute(token, route)`, `importLegacyGoal(token, {targetLevel, fromLevel})`.

- [ ] **Step 1: код** — вставить после функции `getLevelProgress`:

```js
// Профиль General English — анкета «Главной», цель, срок и формат (бэкенд /mobile/ge, спека 2026-10-12). Ответ без
// булевого onboarded — не профиль (старый бэкенд без ручки, заглушка e2e, отдающая {} на всё): тогда «Главная» прежняя.
export function geProfileShape(raw) {
  return raw && typeof raw === 'object' && typeof raw.onboarded === 'boolean' ? raw : null
}

/** null — ручки нет или она не ответила: экран остаётся прежним, а не рушится. */
export async function getGeProfile(token) {
  if (!token) return null
  try {
    return geProfileShape(await authGet('/mobile/ge/profile', token))
  } catch {
    return null
  }
}

export async function saveGeProfile(token, body) {
  return geProfileShape(await authPut('/mobile/ge/profile', token, body))
}

export async function setGeRoute(token, route) {
  return geProfileShape(await authPut('/mobile/ge/profile/route', token, { route }))
}

export async function importLegacyGoal(token, goal) {
  return geProfileShape(await authPost('/mobile/ge/profile/legacy-goal', token, goal))
}
```

- [ ] **Step 2: тест**

```js
import { describe, it, expect, vi, afterEach } from 'vitest'
import { geProfileShape, getGeProfile } from '../api.js'

afterEach(() => vi.unstubAllGlobals())

describe('geProfileShape', () => {
  it('профиль — только с булевым onboarded', () => {
    expect(geProfileShape({})).toBe(null)
    expect(geProfileShape(null)).toBe(null)
    expect(geProfileShape({ onboarded: false })).toEqual({ onboarded: false })
  })
})

describe('getGeProfile', () => {
  it('404 — null, а не исключение', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })))
    expect(await getGeProfile('tok')).toBe(null)
  })
  it('без токена в сеть не ходит', async () => {
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    expect(await getGeProfile(null)).toBe(null)
    expect(f).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: тесты**

Run: `cd $W && npx vitest run src/ge`
Expected: PASS (вместе с B2).

- [ ] **Step 4: Commit**

```bash
git -C $W add src/api.js src/ge/api.test.js
git -C $W commit -m "feat(ge): клиент ручек /mobile/ge/profile"
```

### Task B4: общие кирпичи онбординга

**Files:**
- Create: `$W/src/components/onboarding/OnboardingParts.jsx`
- Modify: `$W/src/screens/IeltsOnboardingPage.jsx:1-88`
- Test: `$W/src/components/onboarding/OnboardingParts.test.jsx`

**Interfaces:**
- Produces: `Radio({on})`, `Calendar({value, onChange, lang})`, `Option({on, title, hint, chip, icon, onClick, children})`, `ImageCard({on, img, title, hint, chip, note, big, onClick})` — разметка и классы `ih-ob*` без изменений.

- [ ] **Step 1: перенести** функции `pad`, `iso`, `Calendar`, `Option`, `ImageCard` и константу `Radio` из `IeltsOnboardingPage.jsx` (строки 14–88, кроме `PURPOSE_IMG` и `FAMILIARITY_ICON`) в новый файл дословно, добавить экспорт и шапку:

```jsx
import { useState } from 'react'
import { CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, InfoIcon, RadioOffIcon } from '../../ielts/icons.jsx'

// Кирпичи онбординга (дизайн «IELTS new», Figma 1.1–1.6): карточка-ответ с радио, большая карточка с иллюстрацией и
// календарь месяца. Общие для анкеты IELTS и анкеты General English на «Главной» (спека 2026-10-12): макета у второй
// нет, она нарочно выглядит так же.

export const Radio = ({ on }) => <span className="ih-obopt__radio">{on ? <CheckCircleIcon size={22} /> : <RadioOffIcon size={22} />}</span>

const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Месяц календаря с понедельника (Figma 1.4). Прошедшие дни недоступны: дата — только будущая.
export function Calendar({ value, onChange, lang }) {
  /* тело — без изменений из IeltsOnboardingPage.jsx */
}

export function Option({ on, title, hint, chip, icon, onClick, children }) {
  /* тело — без изменений */
}

// Большая карточка с иллюстрацией (Figma 1.1 — картинка слева сверху, 1.2 — по центру, с чипом и плашкой «что внутри»)
export function ImageCard({ on, img, title, hint, chip, note, big, onClick }) {
  /* тело — без изменений */
}
```

(Тела функций копируются из текущего файла строка в строку — это перенос, а не переписывание.)

- [ ] **Step 2: в `IeltsOnboardingPage.jsx`** удалить перенесённое и заменить импорты:

```jsx
import { useEffect, useMemo, useState } from 'react'
import { getIeltsProfile, saveIeltsProfile } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import {
  DAILY, DAILY_DEFAULT, FAMILIARITY, GAP_UNMEASURED, PURPOSES, QUIZ, QUIZ_PASS, STEPS, TARGETS, TARGET_DEFAULT, TRACKS, WINDOWS,
  estimateTerm, fitsExam, onboardingBody,
} from '../ielts/onboarding/onboarding.js'
import {
  ChevronLeftIcon, CheckCircleIcon, CloseIcon, EventIcon, HelpIcon, InfoIcon, MenuBookIcon, QuizIcon, ScheduleIcon, TaskAltIcon,
} from '../ielts/icons.jsx'
import { Calendar, ImageCard, Option, Radio } from '../components/onboarding/OnboardingParts.jsx'
import { plural } from '../lib/plural.js'
```

- [ ] **Step 3: тест кирпичей**

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Calendar, Option } from './OnboardingParts.jsx'

describe('OnboardingParts', () => {
  it('Option — радио с подписью', () => {
    const onClick = vi.fn()
    render(<Option on title="Пока не знаю" hint="подсказка" onClick={onClick} />)
    const r = screen.getByRole('radio', { name: /Пока не знаю/ })
    expect(r.getAttribute('aria-checked')).toBe('true')
    fireEvent.click(r)
    expect(onClick).toHaveBeenCalled()
  })
  it('Calendar — прошедшие дни недоступны, выбор отдаёт ISO', () => {
    const onChange = vi.fn()
    const today = new Date()
    render(<Calendar value={null} onChange={onChange} lang="ru" />)
    const day = screen.getByRole('button', { name: String(today.getDate()) })
    expect(day.disabled).toBe(false)
    fireEvent.click(day)
    expect(onChange.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
```

- [ ] **Step 4: тесты и линт**

Run: `cd $W && npx vitest run src/components/onboarding && npx eslint src/components/onboarding src/screens/IeltsOnboardingPage.jsx`
Expected: PASS, без ошибок eslint (неиспользуемых импортов нет).

- [ ] **Step 5: Commit**

```bash
git -C $W add src/components/onboarding src/screens/IeltsOnboardingPage.jsx
git -C $W commit -m "refactor(ielts): кирпичи онбординга — в общий компонент"
```

### Task B5: тексты (ru / en / kk)

**Files:**
- Modify: `$W/src/i18n.jsx` — три блока: перед строкой `"ieltsOb.title.purpose": "Зачем вам IELTS?"` (ru), `"ieltsOb.title.purpose": "Why do you need IELTS?"` (en), `"ieltsOb.title.purpose": "IELTS сізге не үшін керек?"` (kk).

- [ ] **Step 1: ru**

```js
    // ── «Главная» General English: анкета, маршрут, блок цели (спека 2026-10-12) ──
    'geOb.step': 'Шаг {n} из {total}',
    'geOb.back': 'Назад',
    'geOb.exit': 'Выйти',
    'geOb.continue': 'Продолжить',
    'geOb.finish': 'Готово — к маршруту',
    'geOb.recommended': 'Рекомендуем',
    'geOb.saveError': 'Не удалось сохранить ответы. Проверьте связь и попробуйте ещё раз.',
    'geOb.title.purpose': 'Зачем вам английский?',
    'geOb.sub.purpose': 'От цели зависит, какой уровень нужен и что важнее в плане.',
    'geOb.purpose.work': 'Работа и карьера',
    'geOb.purposeHint.work': 'Переписка, созвоны, собеседования',
    'geOb.purpose.travel': 'Путешествия и переезд',
    'geOb.purposeHint.travel': 'Свободно в поездках и в новой стране',
    'geOb.purpose.study': 'Учёба',
    'geOb.purposeHint.study': 'Школа, университет, экзамены',
    'geOb.purpose.self': 'Для себя',
    'geOb.purposeHint.self': 'Фильмы, книги, общение',
    'geOb.title.target': 'Какой уровень вам нужен?',
    'geOb.sub.target': 'Выберите уровень, которого хотите достичь.',
    'geOb.levelHint.A0': 'Самое начало: алфавит и первые слова',
    'geOb.levelHint.A1': 'Простые фразы о себе и повседневном',
    'geOb.levelHint.A2': 'Короткие разговоры на знакомые темы',
    'geOb.levelHint.B1': 'Свободно в поездках, переписка по работе',
    'geOb.levelHint.B2': 'Работа и учёба на английском',
    'geOb.levelHint.C1': 'Свободно и точно в любой ситуации',
    'geOb.tile.current': 'Ваш уровень',
    'geOb.tile.passed': 'Пройдено',
    'geOb.targetUnknownTitle': 'Пока не знаю',
    'geOb.targetUnknownHint': 'Возьмём {level} — его советуем под вашу цель. Поменять можно в любой момент.',
    'geOb.title.deadline': 'К какому сроку?',
    'geOb.sub.deadline': 'Срок поможет понять, успеваете ли вы, и подобрать формат.',
    'geOb.dateKnown': 'Есть дата',
    'geOb.dateKnownHint': 'Собеседование, переезд, экзамен — выберите день',
    'geOb.window.1-3m': 'Через 1–3 месяца',
    'geOb.windowHint.1-3m': 'Нужно быстро',
    'geOb.window.3-6m': 'Через 3–6 месяцев',
    'geOb.windowHint.3-6m': 'Есть немного времени',
    'geOb.window.6-12m': 'Через полгода–год',
    'geOb.windowHint.6-12m': 'Спокойный темп',
    'geOb.window.none': 'Без срока',
    'geOb.windowHint.none': 'Учусь для себя, не к дате',
    'geOb.title.daily': 'Сколько времени в день?',
    'geOb.sub.daily': 'Занятия на платформе. Срок посчитаем по курсу JTS.',
    'geOb.daily.15': '15 минут',
    'geOb.daily.30': '30 минут',
    'geOb.daily.60': '1 час',
    'geOb.daily.90': '1,5 часа',
    'geOb.pace.15': 'Лёгкий темп',
    'geOb.pace.30': 'Ровный темп',
    'geOb.pace.60': 'Интенсивно',
    'geOb.pace.90': 'Очень интенсивно',
    'geOb.termToGoal': '{term} до цели',
    'geOb.termAfterTest': 'Срок посчитаем после теста',
    'geOb.fits': 'Успеваете к {date}',
    'geOb.notFits': 'Самостоятельно к {date} не успеть — на следующем шаге подберём формат',
    'geOb.estimateNote': 'Срок — оценка: уроки курса до цели при выбранном времени плюс повторение.',
    'geOb.title.start': 'Знаете свой уровень?',
    'geOb.sub.start': 'Если нет — короткий тест определит его за 10–15 минут.',
    'geOb.start.zero': 'Начинаю с нуля',
    'geOb.startHint.zero': 'Тест не нужен — начнём с уровня A0',
    'geOb.start.some': 'Немного знаю',
    'geOb.startHint.some': 'Тест покажет, с чего начать',
    'geOb.start.known': 'Знаю, хочу подтвердить',
    'geOb.startHint.known': 'Тест подтвердит уровень',
    'geOb.yourAnswers': 'Ваши ответы',
    'geOb.goalChip': 'Цель — {level}',
    'geOb.cta.zero': 'Посмотреть маршрут',
    'geOb.cta.some': 'Пройти тест',
    'geOb.cta.known': 'Пройти тест',
    'geTerm.months.one': '≈ {n} месяц',
    'geTerm.months.few': '≈ {n} месяца',
    'geTerm.months.many': '≈ {n} месяцев',
    'geTerm.years.one': '≈ {n} год',
    'geTerm.years.few': '≈ {n} года',
    'geTerm.years.many': '≈ {n} лет',
    'geRoute.loading': 'Загружаем…',
    'geRoute.errorTitle': 'Не удалось загрузить план',
    'geRoute.errorText': 'Проверьте связь и обновите страницу.',
    'geRoute.noLevelTitle': 'Сначала определим уровень',
    'geRoute.noLevelText': 'Без уровня срок не посчитать. Короткий тест займёт 10–15 минут.',
    'geRoute.toTest': 'Пройти тест',
    'geRoute.reachedTitle': 'Цель {level} уже достигнута',
    'geRoute.reachedText': 'Выберите новую цель — посчитаем следующий путь.',
    'geRoute.newGoal': 'Выбрать новую цель',
    'geRoute.title': 'Как дойти до {level}',
    'geRoute.sub': 'Сейчас {level} · пройдено {percent}% · срок {date} · {daily} в день',
    'geRoute.subNoDate': 'Сейчас {level} · пройдено {percent}% · без срока · {daily} в день',
    'geRoute.kicker.self_study': 'Платформа',
    'geRoute.kicker.group': 'С преподавателем',
    'geRoute.kicker.individual': 'Один на один',
    'geRoute.own': 'Ваш формат',
    'geRoute.route.self_study': 'Самостоятельно',
    'geRoute.route.group': 'В группе',
    'geRoute.route.individual': 'Индивидуально',
    'geRoute.toGoal': 'до цели',
    'geRoute.fits': 'Успеваете к сроку',
    'geRoute.spare': 'Успеваете с запасом',
    'geRoute.late': 'Не успеваете к {date}',
    'geRoute.allLate': 'К сроку не успеть ни в одном формате — сдвиньте срок или добавьте время в день.',
    'geRoute.feature.self_study.1': 'Уроки курса в своём темпе',
    'geRoute.feature.self_study.2': 'Speaking Buddy, воркбук, словарь и практика',
    'geRoute.feature.self_study.3': 'Нужна самодисциплина — план подскажет, что делать',
    'geRoute.feature.group.1': '2 занятия в неделю с преподавателем',
    'geRoute.feature.group.2': 'Разговорная практика в группе',
    'geRoute.feature.group.3': 'Домашка между занятиями ускоряет путь',
    'geRoute.feature.individual.1': '2 занятия по 60 минут в неделю',
    'geRoute.feature.individual.2': 'Программа под вашу цель',
    'geRoute.feature.individual.3': 'Самый быстрый путь',
    'geRoute.cta.self_study': 'Учиться самостоятельно',
    'geRoute.cta.group': 'Выбрать группу',
    'geRoute.cta.individual': 'Выбрать индивидуально',
    'geRoute.continue': 'Продолжить',
    'geRoute.why': 'Срок — оценка по курсу JTS: до {level} осталось уроков курса — {lessons}, с учётом повторения. Домашка в группе и индивидуально ускоряет путь.',
    'geRoute.editGoal': 'Изменить цель или срок',
    'geHome.start.title': 'Составим ваш план',
    'geHome.start.sub': 'Расскажите о цели и пройдите короткий тест — посчитаем, когда вы её достигнете.',
    'geHome.start.cta': 'Начать',
    'geHome.invite.title': 'Составим ваш план',
    'geHome.invite.subLevel': 'Сейчас {level}, пройдено {percent}%. Укажите цель и срок — посчитаем путь.',
    'geHome.invite.subLevelNoPct': 'Сейчас {level}. Укажите цель и срок — посчитаем путь.',
    'geHome.invite.cta': 'Начать',
    'geHome.needTest.title': 'Пройдите тест — посчитаем срок',
    'geHome.needTest.sub': 'Цель записана. Осталось узнать, с какого уровня вы начинаете.',
    'geHome.needTest.cta': 'Пройти тест',
    'geHome.needRoute.title': 'Выберите, как будете заниматься',
    'geHome.needRoute.sub': 'Самостоятельно, в группе или один на один — покажем срок для каждого формата.',
    'geHome.needRoute.cta': 'Выбрать формат',
    'geGoal.aria': 'Ваша цель',
    'geGoal.title.reached': 'Цель {level} достигнута!',
    'geGoal.title.none': 'Срок не указан',
    'geGoal.title.passed': 'Срок прошёл',
    'geGoal.title.today': 'Срок — сегодня',
    'geGoal.title.tomorrow': 'Срок — завтра',
    'geGoal.title.approx': 'Срок ≈ {date}',
    'geGoal.title.days.one': '{n} день до срока',
    'geGoal.title.days.few': '{n} дня до срока',
    'geGoal.title.days.many': '{n} дней до срока',
    'geGoal.setDate': 'Указать срок',
    'geGoal.updateGoal': 'Обновить цель',
    'geGoal.edit': 'Изменить цель',
    'geGoal.start': 'Старт',
    'geGoal.now': 'Сейчас',
    'geGoal.nowPct': 'Сейчас · {percent}%',
    'geGoal.goal': 'Цель',
    'geGoal.toRoute': 'Как дойти до цели',
    'geGoal.say.reached': 'Есть! Цель взята — можно ставить следующую.',
    'geGoal.say.reached.2': 'Вы дошли до цели. Горжусь! Что дальше?',
    'geGoal.say.today': 'Сегодня тот самый день. Удачи!',
    'geGoal.say.tomorrow': 'Завтра срок. Повторите главное и выспитесь.',
    'geGoal.say.passed': 'Срок прошёл. Обновим цель и посчитаем новый путь?',
    'geGoal.say.noDate': 'Укажите срок — подскажу, успеваете ли.',
    'geGoal.say.noDate.2': 'С датой легче держать темп. Добавим срок?',
    'geGoal.say.late': 'К сроку пока не успеваем — добавьте минут в день или смените формат.',
    'geGoal.say.late.2': 'Темп не догоняет срок. Загляните в маршрут — подберём вариант.',
    'geGoal.say.onTrack': 'Идём по плану: до {level} {term}.',
    'geGoal.say.onTrack.2': 'Хороший темп! До {level} — {term}.',
    'geGoal.say.onTrack.3': 'Каждый день приближает к {level}. Осталось {term}.',
    'tour.home.ge.title': 'Ваша цель и срок',
    'tour.home.ge.text': 'Здесь видно, сколько осталось до цели и успеваете ли вы. Нажмите на блок — откроется маршрут.',
```

- [ ] **Step 2: en** — те же ключи:

```js
    // ── General English home: questionnaire, route, goal block (spec 2026-10-12) ──
    'geOb.step': 'Step {n} of {total}',
    'geOb.back': 'Back',
    'geOb.exit': 'Exit',
    'geOb.continue': 'Continue',
    'geOb.finish': 'Done — see the route',
    'geOb.recommended': 'Recommended',
    'geOb.saveError': 'Could not save your answers. Check your connection and try again.',
    'geOb.title.purpose': 'Why do you need English?',
    'geOb.sub.purpose': 'Your goal decides which level you need and what matters most in the plan.',
    'geOb.purpose.work': 'Work and career',
    'geOb.purposeHint.work': 'Emails, calls, job interviews',
    'geOb.purpose.travel': 'Travel and moving abroad',
    'geOb.purposeHint.travel': 'At ease on trips and in a new country',
    'geOb.purpose.study': 'Study',
    'geOb.purposeHint.study': 'School, university, exams',
    'geOb.purpose.self': 'For myself',
    'geOb.purposeHint.self': 'Films, books, talking to people',
    'geOb.title.target': 'Which level do you need?',
    'geOb.sub.target': 'Choose the level you want to reach.',
    'geOb.levelHint.A0': 'The very start: alphabet and first words',
    'geOb.levelHint.A1': 'Simple phrases about yourself and daily life',
    'geOb.levelHint.A2': 'Short conversations on familiar topics',
    'geOb.levelHint.B1': 'At ease when travelling, work emails',
    'geOb.levelHint.B2': 'Work and study in English',
    'geOb.levelHint.C1': 'Fluent and precise in any situation',
    'geOb.tile.current': 'Your level',
    'geOb.tile.passed': 'Done',
    'geOb.targetUnknownTitle': "I don't know yet",
    'geOb.targetUnknownHint': "We'll take {level} — it suits your goal. You can change it any time.",
    'geOb.title.deadline': 'By when?',
    'geOb.sub.deadline': "A deadline shows whether you'll make it and helps pick a format.",
    'geOb.dateKnown': 'I have a date',
    'geOb.dateKnownHint': 'Interview, move, exam — pick the day',
    'geOb.window.1-3m': 'In 1–3 months',
    'geOb.windowHint.1-3m': 'I need it fast',
    'geOb.window.3-6m': 'In 3–6 months',
    'geOb.windowHint.3-6m': 'I have some time',
    'geOb.window.6-12m': 'In 6–12 months',
    'geOb.windowHint.6-12m': 'A calm pace',
    'geOb.window.none': 'No deadline',
    'geOb.windowHint.none': "I'm learning for myself",
    'geOb.title.daily': 'How much time a day?',
    'geOb.sub.daily': 'Study on the platform. We estimate the term with the JTS course.',
    'geOb.daily.15': '15 minutes',
    'geOb.daily.30': '30 minutes',
    'geOb.daily.60': '1 hour',
    'geOb.daily.90': '1.5 hours',
    'geOb.pace.15': 'Light pace',
    'geOb.pace.30': 'Steady pace',
    'geOb.pace.60': 'Intensive',
    'geOb.pace.90': 'Very intensive',
    'geOb.termToGoal': '{term} to your goal',
    'geOb.termAfterTest': "We'll estimate the term after the test",
    'geOb.fits': "You'll make it by {date}",
    'geOb.notFits': "On your own you won't make it by {date} — we'll pick a format next",
    'geOb.estimateNote': 'The term is an estimate: course lessons to your goal at the chosen time plus revision.',
    'geOb.title.start': 'Do you know your level?',
    'geOb.sub.start': 'If not, a short test finds it in 10–15 minutes.',
    'geOb.start.zero': "I'm starting from zero",
    'geOb.startHint.zero': 'No test needed — we start at A0',
    'geOb.start.some': 'I know a little',
    'geOb.startHint.some': 'The test shows where to start',
    'geOb.start.known': 'I know it, want to confirm',
    'geOb.startHint.known': 'The test confirms your level',
    'geOb.yourAnswers': 'Your answers',
    'geOb.goalChip': 'Goal — {level}',
    'geOb.cta.zero': 'See the route',
    'geOb.cta.some': 'Take the test',
    'geOb.cta.known': 'Take the test',
    'geTerm.months.one': '≈ {n} month',
    'geTerm.months.few': '≈ {n} months',
    'geTerm.months.many': '≈ {n} months',
    'geTerm.years.one': '≈ {n} year',
    'geTerm.years.few': '≈ {n} years',
    'geTerm.years.many': '≈ {n} years',
    'geRoute.loading': 'Loading…',
    'geRoute.errorTitle': 'Could not load the plan',
    'geRoute.errorText': 'Check your connection and reload the page.',
    'geRoute.noLevelTitle': "Let's find your level first",
    'geRoute.noLevelText': 'Without a level there is no term. A short test takes 10–15 minutes.',
    'geRoute.toTest': 'Take the test',
    'geRoute.reachedTitle': 'Goal {level} is already reached',
    'geRoute.reachedText': "Choose a new goal — we'll work out the next route.",
    'geRoute.newGoal': 'Choose a new goal',
    'geRoute.title': 'How to reach {level}',
    'geRoute.sub': 'Now {level} · {percent}% done · deadline {date} · {daily} a day',
    'geRoute.subNoDate': 'Now {level} · {percent}% done · no deadline · {daily} a day',
    'geRoute.kicker.self_study': 'Platform',
    'geRoute.kicker.group': 'With a teacher',
    'geRoute.kicker.individual': 'One to one',
    'geRoute.own': 'Your format',
    'geRoute.route.self_study': 'On my own',
    'geRoute.route.group': 'In a group',
    'geRoute.route.individual': 'Individually',
    'geRoute.toGoal': 'to the goal',
    'geRoute.fits': "You'll make it",
    'geRoute.spare': "You'll make it with time to spare",
    'geRoute.late': "You won't make it by {date}",
    'geRoute.allLate': 'No format makes the deadline — move it or add more time a day.',
    'geRoute.feature.self_study.1': 'Course lessons at your own pace',
    'geRoute.feature.self_study.2': 'Speaking Buddy, workbook, vocabulary and practice',
    'geRoute.feature.self_study.3': 'Takes self-discipline — the plan shows what to do',
    'geRoute.feature.group.1': '2 lessons a week with a teacher',
    'geRoute.feature.group.2': 'Speaking practice in a group',
    'geRoute.feature.group.3': 'Homework between lessons speeds you up',
    'geRoute.feature.individual.1': '2 lessons of 60 minutes a week',
    'geRoute.feature.individual.2': 'A programme built around your goal',
    'geRoute.feature.individual.3': 'The fastest route',
    'geRoute.cta.self_study': 'Study on my own',
    'geRoute.cta.group': 'Choose a group',
    'geRoute.cta.individual': 'Choose one to one',
    'geRoute.continue': 'Continue',
    'geRoute.why': 'The term is estimated with the JTS course: course lessons left to {level} — {lessons}, plus revision. Homework in group and one-to-one formats speeds you up.',
    'geRoute.editGoal': 'Change the goal or deadline',
    'geHome.start.title': "Let's make your plan",
    'geHome.start.sub': "Tell us about your goal and take a short test — we'll work out when you'll reach it.",
    'geHome.start.cta': 'Start',
    'geHome.invite.title': "Let's make your plan",
    'geHome.invite.subLevel': "Now {level}, {percent}% done. Set a goal and a deadline — we'll work out the route.",
    'geHome.invite.subLevelNoPct': "Now {level}. Set a goal and a deadline — we'll work out the route.",
    'geHome.invite.cta': 'Start',
    'geHome.needTest.title': "Take the test — we'll estimate the term",
    'geHome.needTest.sub': 'Your goal is saved. Now we need the level you start from.',
    'geHome.needTest.cta': 'Take the test',
    'geHome.needRoute.title': "Choose how you'll study",
    'geHome.needRoute.sub': "On your own, in a group or one to one — we'll show the term for each.",
    'geHome.needRoute.cta': 'Choose a format',
    'geGoal.aria': 'Your goal',
    'geGoal.title.reached': 'Goal {level} reached!',
    'geGoal.title.none': 'No deadline',
    'geGoal.title.passed': 'The deadline has passed',
    'geGoal.title.today': 'Deadline — today',
    'geGoal.title.tomorrow': 'Deadline — tomorrow',
    'geGoal.title.approx': 'Deadline ≈ {date}',
    'geGoal.title.days.one': '{n} day to the deadline',
    'geGoal.title.days.few': '{n} days to the deadline',
    'geGoal.title.days.many': '{n} days to the deadline',
    'geGoal.setDate': 'Set a deadline',
    'geGoal.updateGoal': 'Update the goal',
    'geGoal.edit': 'Change the goal',
    'geGoal.start': 'Start',
    'geGoal.now': 'Now',
    'geGoal.nowPct': 'Now · {percent}%',
    'geGoal.goal': 'Goal',
    'geGoal.toRoute': 'How to reach the goal',
    'geGoal.say.reached': 'Done! Goal reached — time to set the next one.',
    'geGoal.say.reached.2': "You've reached your goal. Proud of you! What's next?",
    'geGoal.say.today': 'Today is the day. Good luck!',
    'geGoal.say.tomorrow': 'Deadline tomorrow. Review the key things and get some sleep.',
    'geGoal.say.passed': 'The deadline has passed. Shall we update the goal and plan a new route?',
    'geGoal.say.noDate': "Set a deadline — I'll tell you if you're on time.",
    'geGoal.say.noDate.2': 'A date makes it easier to keep the pace. Add one?',
    'geGoal.say.late': "We're behind the deadline — add minutes a day or change the format.",
    'geGoal.say.late.2': "The pace doesn't match the deadline. Check the route — we'll find an option.",
    'geGoal.say.onTrack': 'On track: {term} to {level}.',
    'geGoal.say.onTrack.2': 'Good pace! {level} in {term}.',
    'geGoal.say.onTrack.3': 'Every day brings {level} closer. {term} left.',
    'tour.home.ge.title': 'Your goal and deadline',
    'tour.home.ge.text': "See how far the goal is and whether you're on time. Tap the block to open the route.",
```

- [ ] **Step 3: kk** — те же ключи:

```js
    // ── «Басты бет» General English: сауалнама, маршрут, мақсат блогы (спека 2026-10-12) ──
    'geOb.step': '{total} қадамның {n}-сі',
    'geOb.back': 'Артқа',
    'geOb.exit': 'Шығу',
    'geOb.continue': 'Жалғастыру',
    'geOb.finish': 'Дайын — маршрутқа',
    'geOb.recommended': 'Ұсынамыз',
    'geOb.saveError': 'Жауаптар сақталмады. Байланысты тексеріп, қайта көріңіз.',
    'geOb.title.purpose': 'Ағылшын тілі сізге не үшін керек?',
    'geOb.sub.purpose': 'Қандай деңгей керек және жоспарда не маңызды екені мақсатқа байланысты.',
    'geOb.purpose.work': 'Жұмыс және мансап',
    'geOb.purposeHint.work': 'Хат алмасу, қоңыраулар, сұхбаттар',
    'geOb.purpose.travel': 'Саяхат және көшу',
    'geOb.purposeHint.travel': 'Сапарда және жаңа елде еркін',
    'geOb.purpose.study': 'Оқу',
    'geOb.purposeHint.study': 'Мектеп, университет, емтихандар',
    'geOb.purpose.self': 'Өзім үшін',
    'geOb.purposeHint.self': 'Фильмдер, кітаптар, қарым-қатынас',
    'geOb.title.target': 'Сізге қандай деңгей керек?',
    'geOb.sub.target': 'Жеткіңіз келетін деңгейді таңдаңыз.',
    'geOb.levelHint.A0': 'Ең басы: әліпби және алғашқы сөздер',
    'geOb.levelHint.A1': 'Өзіңіз және күнделікті өмір туралы қарапайым сөйлемдер',
    'geOb.levelHint.A2': 'Таныс тақырыптарда қысқа әңгіме',
    'geOb.levelHint.B1': 'Сапарда еркін, жұмыс хаттары',
    'geOb.levelHint.B2': 'Ағылшынша жұмыс және оқу',
    'geOb.levelHint.C1': 'Кез келген жағдайда еркін әрі дәл',
    'geOb.tile.current': 'Сіздің деңгейіңіз',
    'geOb.tile.passed': 'Өтілді',
    'geOb.targetUnknownTitle': 'Әзірге білмеймін',
    'geOb.targetUnknownHint': '{level} аламыз — мақсатыңызға осыны ұсынамыз. Кез келген уақытта өзгертуге болады.',
    'geOb.title.deadline': 'Қай мерзімге дейін?',
    'geOb.sub.deadline': 'Мерзім үлгеретініңізді түсінуге және форматты таңдауға көмектеседі.',
    'geOb.dateKnown': 'Күні бар',
    'geOb.dateKnownHint': 'Сұхбат, көшу, емтихан — күнді таңдаңыз',
    'geOb.window.1-3m': '1–3 айдан кейін',
    'geOb.windowHint.1-3m': 'Тез керек',
    'geOb.window.3-6m': '3–6 айдан кейін',
    'geOb.windowHint.3-6m': 'Аздап уақыт бар',
    'geOb.window.6-12m': 'Жарты жыл – бір жыл',
    'geOb.windowHint.6-12m': 'Асықпай',
    'geOb.window.none': 'Мерзімсіз',
    'geOb.windowHint.none': 'Өзім үшін оқимын',
    'geOb.title.daily': 'Күніне қанша уақыт?',
    'geOb.sub.daily': 'Платформадағы сабақтар. Мерзімді JTS курсы бойынша есептейміз.',
    'geOb.daily.15': '15 минут',
    'geOb.daily.30': '30 минут',
    'geOb.daily.60': '1 сағат',
    'geOb.daily.90': '1,5 сағат',
    'geOb.pace.15': 'Жеңіл қарқын',
    'geOb.pace.30': 'Бірқалыпты қарқын',
    'geOb.pace.60': 'Қарқынды',
    'geOb.pace.90': 'Өте қарқынды',
    'geOb.termToGoal': 'мақсатқа дейін {term}',
    'geOb.termAfterTest': 'Мерзімді тесттен кейін есептейміз',
    'geOb.fits': '{date} дейін үлгересіз',
    'geOb.notFits': 'Өз бетіңізше {date} дейін үлгермейсіз — келесі қадамда формат таңдаймыз',
    'geOb.estimateNote': 'Мерзім — болжам: таңдалған уақытпен мақсатқа дейінгі курс сабақтары және қайталау.',
    'geOb.title.start': 'Деңгейіңізді білесіз бе?',
    'geOb.sub.start': 'Білмесеңіз — қысқа тест оны 10–15 минутта анықтайды.',
    'geOb.start.zero': 'Нөлден бастаймын',
    'geOb.startHint.zero': 'Тест керек емес — A0 деңгейінен бастаймыз',
    'geOb.start.some': 'Аздап білемін',
    'geOb.startHint.some': 'Тест неден бастау керегін көрсетеді',
    'geOb.start.known': 'Білемін, растағым келеді',
    'geOb.startHint.known': 'Тест деңгейді растайды',
    'geOb.yourAnswers': 'Сіздің жауаптарыңыз',
    'geOb.goalChip': 'Мақсат — {level}',
    'geOb.cta.zero': 'Маршрутты көру',
    'geOb.cta.some': 'Тест тапсыру',
    'geOb.cta.known': 'Тест тапсыру',
    'geTerm.months.one': '≈ {n} ай',
    'geTerm.months.few': '≈ {n} ай',
    'geTerm.months.many': '≈ {n} ай',
    'geTerm.years.one': '≈ {n} жыл',
    'geTerm.years.few': '≈ {n} жыл',
    'geTerm.years.many': '≈ {n} жыл',
    'geRoute.loading': 'Жүктелуде…',
    'geRoute.errorTitle': 'Жоспар жүктелмеді',
    'geRoute.errorText': 'Байланысты тексеріп, бетті жаңартыңыз.',
    'geRoute.noLevelTitle': 'Алдымен деңгейді анықтайық',
    'geRoute.noLevelText': 'Деңгейсіз мерзімді есептеу мүмкін емес. Қысқа тест 10–15 минут алады.',
    'geRoute.toTest': 'Тест тапсыру',
    'geRoute.reachedTitle': '{level} мақсатына жеттіңіз',
    'geRoute.reachedText': 'Жаңа мақсат таңдаңыз — келесі жолды есептейміз.',
    'geRoute.newGoal': 'Жаңа мақсат таңдау',
    'geRoute.title': '{level} деңгейіне қалай жетуге болады',
    'geRoute.sub': 'Қазір {level} · {percent}% өтілді · мерзім {date} · күніне {daily}',
    'geRoute.subNoDate': 'Қазір {level} · {percent}% өтілді · мерзімсіз · күніне {daily}',
    'geRoute.kicker.self_study': 'Платформа',
    'geRoute.kicker.group': 'Оқытушымен',
    'geRoute.kicker.individual': 'Жеке',
    'geRoute.own': 'Сіздің форматыңыз',
    'geRoute.route.self_study': 'Өз бетімен',
    'geRoute.route.group': 'Топта',
    'geRoute.route.individual': 'Жеке',
    'geRoute.toGoal': 'мақсатқа дейін',
    'geRoute.fits': 'Мерзімге үлгересіз',
    'geRoute.spare': 'Уақыт қорымен үлгересіз',
    'geRoute.late': '{date} дейін үлгермейсіз',
    'geRoute.allLate': 'Ешбір форматта мерзімге үлгеру мүмкін емес — мерзімді жылжытыңыз немесе күнделікті уақытты көбейтіңіз.',
    'geRoute.feature.self_study.1': 'Курс сабақтары өз қарқыныңызбен',
    'geRoute.feature.self_study.2': 'Speaking Buddy, жұмыс дәптері, сөздік және практика',
    'geRoute.feature.self_study.3': 'Өзін-өзі тәртіптеу керек — жоспар не істеу керегін айтады',
    'geRoute.feature.group.1': 'Оқытушымен аптасына 2 сабақ',
    'geRoute.feature.group.2': 'Топта сөйлеу практикасы',
    'geRoute.feature.group.3': 'Сабақ арасындағы үй жұмысы жолды тездетеді',
    'geRoute.feature.individual.1': 'Аптасына 60 минуттан 2 сабақ',
    'geRoute.feature.individual.2': 'Мақсатыңызға арналған бағдарлама',
    'geRoute.feature.individual.3': 'Ең жылдам жол',
    'geRoute.cta.self_study': 'Өз бетімен оқу',
    'geRoute.cta.group': 'Топты таңдау',
    'geRoute.cta.individual': 'Жеке сабақты таңдау',
    'geRoute.continue': 'Жалғастыру',
    'geRoute.why': 'Мерзім JTS курсы бойынша есептелген: {level} деңгейіне дейін курс сабақтары — {lessons}, қайталауды қоса. Топта және жеке сабақта үй жұмысы жолды тездетеді.',
    'geRoute.editGoal': 'Мақсатты немесе мерзімді өзгерту',
    'geHome.start.title': 'Жоспарыңызды құрайық',
    'geHome.start.sub': 'Мақсатыңызды айтып, қысқа тест тапсырыңыз — қашан жететініңізді есептейміз.',
    'geHome.start.cta': 'Бастау',
    'geHome.invite.title': 'Жоспарыңызды құрайық',
    'geHome.invite.subLevel': 'Қазір {level}, {percent}% өтілді. Мақсат пен мерзімді көрсетіңіз — жолды есептейміз.',
    'geHome.invite.subLevelNoPct': 'Қазір {level}. Мақсат пен мерзімді көрсетіңіз — жолды есептейміз.',
    'geHome.invite.cta': 'Бастау',
    'geHome.needTest.title': 'Тест тапсырыңыз — мерзімді есептейміз',
    'geHome.needTest.sub': 'Мақсат жазылды. Қай деңгейден бастайтыныңызды білу қалды.',
    'geHome.needTest.cta': 'Тест тапсыру',
    'geHome.needRoute.title': 'Қалай оқитыныңызды таңдаңыз',
    'geHome.needRoute.sub': 'Өз бетімен, топта немесе жеке — әр формат үшін мерзімді көрсетеміз.',
    'geHome.needRoute.cta': 'Форматты таңдау',
    'geGoal.aria': 'Сіздің мақсатыңыз',
    'geGoal.title.reached': '{level} мақсатына жеттіңіз!',
    'geGoal.title.none': 'Мерзім көрсетілмеген',
    'geGoal.title.passed': 'Мерзім өтіп кетті',
    'geGoal.title.today': 'Мерзім — бүгін',
    'geGoal.title.tomorrow': 'Мерзім — ертең',
    'geGoal.title.approx': 'Мерзім ≈ {date}',
    'geGoal.title.days.one': 'Мерзімге {n} күн қалды',
    'geGoal.title.days.few': 'Мерзімге {n} күн қалды',
    'geGoal.title.days.many': 'Мерзімге {n} күн қалды',
    'geGoal.setDate': 'Мерзімді көрсету',
    'geGoal.updateGoal': 'Мақсатты жаңарту',
    'geGoal.edit': 'Мақсатты өзгерту',
    'geGoal.start': 'Бастау',
    'geGoal.now': 'Қазір',
    'geGoal.nowPct': 'Қазір · {percent}%',
    'geGoal.goal': 'Мақсат',
    'geGoal.toRoute': 'Мақсатқа қалай жетуге болады',
    'geGoal.say.reached': 'Міне! Мақсатқа жеттік — келесісін қоюға болады.',
    'geGoal.say.reached.2': 'Мақсатқа жеттіңіз. Мақтанамын! Ары қарай не?',
    'geGoal.say.today': 'Бүгін — сол күн. Сәттілік!',
    'geGoal.say.tomorrow': 'Ертең мерзім. Негізгісін қайталап, жақсылап демалыңыз.',
    'geGoal.say.passed': 'Мерзім өтті. Мақсатты жаңартып, жаңа жолды есептейік пе?',
    'geGoal.say.noDate': 'Мерзімді көрсетіңіз — үлгеретініңізді айтамын.',
    'geGoal.say.noDate.2': 'Күні болса, қарқынды ұстау оңай. Мерзім қосамыз ба?',
    'geGoal.say.late': 'Мерзімге әзірге үлгермейміз — күніне минут қосыңыз немесе форматты ауыстырыңыз.',
    'geGoal.say.late.2': 'Қарқын мерзімге жетпей тұр. Маршрутқа қараңыз — нұсқа табамыз.',
    'geGoal.say.onTrack': 'Жоспар бойынша келеміз: {level} деңгейіне дейін {term}.',
    'geGoal.say.onTrack.2': 'Жақсы қарқын! {level} деңгейіне дейін — {term}.',
    'geGoal.say.onTrack.3': 'Әр күн {level} деңгейіне жақындатады. {term} қалды.',
    'tour.home.ge.title': 'Мақсатыңыз бен мерзіміңіз',
    'tour.home.ge.text': 'Мұнда мақсатқа дейін қанша қалғаны және үлгеретініңіз көрінеді. Блокты басыңыз — маршрут ашылады.',
```

- [ ] **Step 4: проверка, что ключи совпадают во всех трёх словарях**

Run (bash): `cd $W && node -e "const s=require('fs').readFileSync('src/i18n.jsx','utf8');const blocks=s.split(/\n  (?:en|kk): \{/);const keys=b=>new Set([...b.matchAll(/'((?:geOb|geRoute|geHome|geGoal|geTerm|tour\.home\.ge)\.[^']+)'/g)].map(m=>m[1]));const [ru,en,kk]=blocks.map(keys);for(const [n,k] of [['en',en],['kk',kk]]){const miss=[...ru].filter(x=>!k.has(x));console.log(n,ru.size,k.size,miss)}"`
Expected: `en N N []` и `kk N N []` — одинаковое число ключей, пропусков нет.

- [ ] **Step 5: Commit**

```bash
git -C $W add src/i18n.jsx
git -C $W commit -m "feat(ge): тексты анкеты, маршрута и блока цели (ru/en/kk)"
```

### Task B6: экран анкеты `GeOnboardingPage`

**Files:**
- Create: `$W/src/screens/GeOnboardingPage.jsx`
- Modify: `$W/src/demo.css` (в конец)
- Test: `$W/src/screens/GeOnboardingPage.test.jsx`

**Interfaces:**
- Consumes: B1–B5.
- Produces: `<GeOnboardingPage token level edit onExit onSaved />`; `onSaved(profile, next)` где `next` ∈ `'route' | 'test'`.

- [ ] **Step 1: тест**

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import GeOnboardingPage from './GeOnboardingPage.jsx'

const saved = { onboarded: true, targetLevel: 'B2' }
vi.mock('../api.js', () => ({
  getGeProfile: vi.fn(async () => ({ onboarded: false })),
  getLevelProgress: vi.fn(async () => ({ percent: 0 })),
  saveGeProfile: vi.fn(async () => saved),
}))
import { saveGeProfile } from '../api.js'

const renderPage = (props) => render(<I18nProvider><GeOnboardingPage token="tok" {...props} /></I18nProvider>)
const cta = () => document.querySelector('.ih-ob__cta')

beforeEach(() => vi.clearAllMocks())

describe('GeOnboardingPage', () => {
  it('уровень известен: четыре шага, неактивные плитки, срок в днях — к маршруту', async () => {
    const onSaved = vi.fn()
    renderPage({ level: 'A2', onSaved })
    expect(screen.getByText('Шаг 1 из 4')).toBeTruthy()
    expect(cta().disabled).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: /Работа и карьера/ }))
    fireEvent.click(cta())

    expect(screen.getByRole('radio', { name: /A2/ }).disabled).toBe(true)
    expect(screen.getByRole('radio', { name: /A0/ }).disabled).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: /^B2/ }))
    fireEvent.click(cta())

    fireEvent.click(screen.getByRole('radio', { name: /Без срока/ }))
    fireEvent.click(cta())

    await waitFor(() => expect(screen.getAllByText(/до цели/).length).toBe(4))
    expect(screen.queryByText('Срок посчитаем после теста')).toBe(null)
    fireEvent.click(cta())

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved, 'route'))
    expect(saveGeProfile).toHaveBeenCalledWith('tok', { purpose: 'work', targetLevel: 'B2', deadlineDate: null, deadlineWindow: 'none', dailyMinutes: 30, startMode: null })
  })

  it('без уровня: пятый шаг, срок — после теста, «немного знаю» ведёт на тест', async () => {
    const onSaved = vi.fn()
    renderPage({ level: null, onSaved })
    fireEvent.click(screen.getByRole('radio', { name: /Для себя/ }))
    fireEvent.click(cta())
    fireEvent.click(screen.getByRole('radio', { name: /Пока не знаю/ }))
    fireEvent.click(cta())
    fireEvent.click(screen.getByRole('radio', { name: /Через 3–6 месяцев/ }))
    fireEvent.click(cta())
    expect(screen.getAllByText('Срок посчитаем после теста').length).toBe(4)
    fireEvent.click(cta())
    expect(screen.getByText('Шаг 5 из 5')).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: /Немного знаю/ }))
    fireEvent.click(cta())
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved, 'test'))
    expect(saveGeProfile.mock.calls[0][1]).toMatchObject({ targetLevel: 'B1', deadlineWindow: '3-6m', startMode: 'some' })
  })

  it('правка — три шага', () => {
    renderPage({ level: 'A2', edit: true })
    expect(screen.getByText('Шаг 1 из 3')).toBeTruthy()
    expect(screen.getByText('Какой уровень вам нужен?')).toBeTruthy()
  })
})
```

- [ ] **Step 2: тест падает**

Run: `cd $W && npx vitest run src/screens/GeOnboardingPage.test.jsx`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: экран**

```jsx
import { useEffect, useMemo, useState } from 'react'
import { getGeProfile, getLevelProgress, saveGeProfile } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import { Calendar, ImageCard, Option, Radio } from '../components/onboarding/OnboardingParts.jsx'
import {
  ChevronLeftIcon, CheckCircleIcon, CloseIcon, EventIcon, HelpIcon, InfoIcon, MenuBookIcon, QuizIcon, ScheduleIcon, TaskAltIcon,
} from '../ielts/icons.jsx'
import {
  DAILY, DAILY_DEFAULT, PURPOSES, START_MODES, WINDOWS, formFromProfile, nextAfterSave, onboardingBody, recommendedTarget, stepReady, stepsFor,
  targetTiles,
} from '../ge/onboarding.js'
import { fitsDeadline, formatTerm, remainingLessons, termFor, termUnits, windowDate } from '../ge/route.js'

const START_ICON = { zero: MenuBookIcon, some: QuizIcon, known: TaskAltIcon }

/**
 * Анкета General English (спека 2026-10-12, секция 1): зачем, цель-уровень, срок, минут в день и — без уровня —
 * «знаете свой уровень?». Вид — онбординг IELTS (общие кирпичи OnboardingParts). Ответы ложатся в профиль бэкенда;
 * куда дальше (маршрут или тест) решает App по `next` из onSaved. Правка (`edit`) — только цель, срок и время.
 */
export default function GeOnboardingPage({ token, level = null, edit = false, onExit, onSaved }) {
  const { t, lang } = useI18n()
  const authToken = token || loadToken()
  const levelKnown = !!level
  const steps = useMemo(() => stepsFor({ levelKnown, edit }), [levelKnown, edit])
  const [step, setStep] = useState(0)
  const [f, setF] = useState({ daily: DAILY_DEFAULT })
  // «Пока не знаю» — цель та же рекомендованная, но отмечена должна быть карточка, а не плитка
  const [targetUnknown, setTargetUnknown] = useState(false)
  const [percent, setPercent] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Повторный заход и правка — ответы прошлого раза подставлены
  useEffect(() => {
    let alive = true
    getGeProfile(authToken).then((p) => {
      if (alive && p?.onboarded) setF(formFromProfile(p, level))
    })
    return () => {
      alive = false
    }
  }, [authToken, level])

  // Срок на шаге «сколько времени» считается от пройденной доли текущего уровня — её знает только сервер
  useEffect(() => {
    if (!levelKnown || !authToken) return undefined
    let alive = true
    getLevelProgress(authToken)
      .then((p) => {
        if (alive && typeof p?.percent === 'number') setPercent(p.percent)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [authToken, levelKnown])

  const set = (patch) => setF((x) => ({ ...x, ...patch }))
  const key = steps[step]
  const ready = stepReady(key, f)
  const recommend = recommendedTarget(f.purpose, level)
  const dateLabel = (v) =>
    new Intl.DateTimeFormat(lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
      .format(new Date(`${v}T00:00:00`))
      .replace(/\s?г\.$/, '')

  const finish = async () => {
    setBusy(true)
    setError(null)
    try {
      const saved = await saveGeProfile(authToken, onboardingBody(f))
      onSaved?.(saved, nextAfterSave({ edit, levelKnown, start: f.start }))
    } catch (e) {
      setError(e?.serverMessage || t('geOb.saveError'))
      setBusy(false)
    }
  }
  const next = () => (step + 1 < steps.length ? setStep(step + 1) : finish())
  const back = () => (step > 0 ? setStep(step - 1) : onExit?.())

  let options = null
  if (key === 'purpose') {
    options = (
      <div className="ih-obcards">
        {PURPOSES.map((p) => (
          <ImageCard key={p.id} on={f.purpose === p.id} img={p.img} title={t(`geOb.purpose.${p.id}`)} hint={t(`geOb.purposeHint.${p.id}`)} onClick={() => set({ purpose: p.id })} />
        ))}
      </div>
    )
  } else if (key === 'target') {
    options = (
      <>
        <div className="ih-obgrid">
          {targetTiles(level).map((x) => {
            const on = f.target === x.code && !targetUnknown
            return (
              <button
                key={x.code}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={!x.enabled}
                className={`ih-obband ge-obtile ${on ? 'is-on' : ''}`}
                onClick={() => {
                  set({ target: x.code })
                  setTargetUnknown(false)
                }}
              >
                <span className="ih-obband__top">
                  <b>{x.code}</b>
                  <Radio on={on} />
                </span>
                <span>{x.mark ? t(`geOb.tile.${x.mark}`) : t(`geOb.levelHint.${x.code}`)}</span>
                {recommend === x.code && x.enabled && <span className="ih-obcard__chip">{t('geOb.recommended')}</span>}
              </button>
            )
          })}
        </div>
        {recommend && (
          <Option
            on={targetUnknown}
            icon={<HelpIcon size={22} />}
            title={t('geOb.targetUnknownTitle')}
            hint={t('geOb.targetUnknownHint', { level: recommend })}
            onClick={() => {
              set({ target: recommend })
              setTargetUnknown(true)
            }}
          />
        )}
      </>
    )
  } else if (key === 'deadline') {
    options = (
      <>
        {/* Календарь внутри карточки, как у IELTS: кнопки дней внутри кнопки — невалидный HTML, поэтому карточка —
            блок, а выбирает её шапка */}
        <div className={`ih-obopt ih-obopt--date ${f.window === 'date' ? 'is-on' : ''}`}>
          <button type="button" role="radio" aria-checked={f.window === 'date'} className="ih-obopt__head" onClick={() => set({ window: 'date' })}>
            <span className="ih-obopt__cal-icon">
              <EventIcon size={22} />
            </span>
            <span className="ih-obopt__body">
              <b>{t('geOb.dateKnown')}</b>
              <span>{f.window === 'date' && f.date ? dateLabel(f.date) : t('geOb.dateKnownHint')}</span>
            </span>
            <Radio on={f.window === 'date'} />
          </button>
          {f.window === 'date' && <Calendar value={f.date} onChange={(v) => set({ date: v, window: 'date' })} lang={lang} />}
        </div>
        {WINDOWS.map((w) => (
          <Option key={w} on={f.window === w} title={t(`geOb.window.${w}`)} hint={t(`geOb.windowHint.${w}`)} onClick={() => set({ window: w, date: null })} />
        ))}
      </>
    )
  } else if (key === 'daily') {
    // Без уровня срок не выдумываем: у IELTS подстановка разрыва давала три разных срока на трёх экранах
    const lessons = levelKnown ? remainingLessons(level, f.target, percent) : 0
    const deadlineIso = f.window === 'date' ? f.date : windowDate(f.window)
    const fit = levelKnown && deadlineIso ? fitsDeadline(termFor('self_study', lessons, f.daily), deadlineIso) : null
    options = (
      <>
        <div className="ih-obdaily">
          {DAILY.map((m) => {
            const on = f.daily === m
            return (
              <button key={m} type="button" role="radio" aria-checked={on} className={`ih-obday ${on ? 'is-on' : ''}`} onClick={() => set({ daily: m })}>
                <span className="ih-obday__top">
                  <span className="ih-obday__icon">
                    <ScheduleIcon size={22} />
                  </span>
                  <b>{t(`geOb.daily.${m}`)}</b>
                  <Radio on={on} />
                </span>
                <span className="ih-obday__pace">
                  {t(`geOb.pace.${m}`)}
                  {m === DAILY_DEFAULT && <span className="ih-obcard__chip">{t('geOb.recommended')}</span>}
                </span>
                <span className="ih-obday__term">
                  {levelKnown ? t('geOb.termToGoal', { term: formatTerm(termUnits(termFor('self_study', lessons, m)), t, lang) }) : t('geOb.termAfterTest')}
                </span>
              </button>
            )
          })}
        </div>
        {fit && (
          <p className={`ih-ob__note ${fit === 'late' ? 'is-warn' : 'is-ok'}`}>
            {fit === 'late' ? <InfoIcon size={20} /> : <CheckCircleIcon size={20} />}
            <span>{t(fit === 'late' ? 'geOb.notFits' : 'geOb.fits', { date: dateLabel(deadlineIso) })}</span>
          </p>
        )}
        <p className="ih-muted">{t('geOb.estimateNote')}</p>
      </>
    )
  } else if (key === 'start') {
    options = (
      <>
        {START_MODES.map((m) => {
          const Ico = START_ICON[m]
          return <Option key={m} on={f.start === m} icon={<Ico size={24} />} title={t(`geOb.start.${m}`)} hint={t(`geOb.startHint.${m}`)} onClick={() => set({ start: m })} />
        })}
        <section className="ih-ob__summary">
          <b>{t('geOb.yourAnswers')}</b>
          <div>
            {f.purpose && <span className="ih-ob__chip">{t(`geOb.purpose.${f.purpose}`)}</span>}
            {f.target && <span className="ih-ob__chip">{t('geOb.goalChip', { level: f.target })}</span>}
            {f.window && <span className="ih-ob__chip">{f.window === 'date' && f.date ? dateLabel(f.date) : t(`geOb.window.${f.window}`)}</span>}
            <span className="ih-ob__chip">{t(`geOb.daily.${f.daily}`)}</span>
          </div>
        </section>
      </>
    )
  }

  const last = step + 1 === steps.length
  const cta = key === 'start' && f.start ? t(`geOb.cta.${f.start}`) : last ? t('geOb.finish') : t('geOb.continue')

  return (
    <div className="ih-ob ge-ob">
      <header className="ih-ob__top">
        <button type="button" className="ih-round" onClick={back} aria-label={t('geOb.back')}>
          <ChevronLeftIcon size={20} />
        </button>
        <b className="ih-ob__logo">just to study</b>
        <span className="ih-run__spacer" />
        <button type="button" className="ih-ob__exit" onClick={() => onExit?.()}>
          {t('geOb.exit')}
          <CloseIcon size={16} />
        </button>
      </header>
      {/* шаг появляется заново — та же анимация, что у IELTS */}
      <main key={step} className={`ih-ob__main ${step > 0 ? 'ih-enter' : ''}`}>
        <div className="ih-ob__progress" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
          {steps.map((s, i) => (
            <span key={s} className={i <= step ? 'is-on' : ''} />
          ))}
        </div>
        <p className="ih-ob__step">{t('geOb.step', { n: String(step + 1), total: String(steps.length) })}</p>
        <h1>{t(`geOb.title.${key}`)}</h1>
        <p className="ih-ob__sub">{t(`geOb.sub.${key}`)}</p>
        <div className="ih-ob__options" role="radiogroup">
          {options}
        </div>
        {error && (
          <p className="ih-run__error" role="alert">
            {error}
          </p>
        )}
        <div className="ih-ob__actions">
          <button type="button" className="ih-cta ih-ob__cta" disabled={!ready || busy} onClick={next}>
            {cta}
          </button>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 4: стили** — в конец `src/demo.css`:

```css
/* ── «Главная» General English по образцу IELTS (спека 2026-10-12) ──
   Анкета и маршрут рисуются классами раздела IELTS (ih-ob*, ih-route*), блок цели — ih-gb. Токены раздела объявлены на
   .ih / .ih-ob; блок цели живёт на «Главной» вне них, поэтому обёртка .ge-skin повторяет токены. */
.ge-skin {
  --ih-violet: #9047ff;
  --ih-ink: #23202b;
  --ih-ink-2: #656172;
  --ih-muted: #656172;
  --ih-line: #e9e6f2;
  --ih-soft: #f4f4f4;
  --ih-green: #1f9d55;
  --ih-orange: #e57a12;
  --ih-red: #e0364f;
  color: var(--ih-ink);
}
/* плитка цели не выше текущего уровня видна, но выбрать её нельзя */
.ge-obtile:disabled {
  opacity: 0.5;
  cursor: default;
}
.ge-obtile .ih-obcard__chip {
  align-self: flex-start;
  margin-top: 6px;
}
.ge-goal__plan {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  color: var(--ih-ink-2);
}
.ge-route__edit {
  align-self: center;
}
```

- [ ] **Step 5: тест проходит**

Run: `cd $W && npx vitest run src/screens/GeOnboardingPage.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git -C $W add src/screens/GeOnboardingPage.jsx src/screens/GeOnboardingPage.test.jsx src/demo.css
git -C $W commit -m "feat(ge): анкета General English в стиле онбординга IELTS"
```

### Task B7: экран маршрута `GeRoutePage`

**Files:**
- Create: `$W/src/screens/GeRoutePage.jsx`
- Test: `$W/src/screens/GeRoutePage.test.jsx`

**Interfaces:**
- Consumes: `getGeProfile`, `getLevelProgress`, `getMyLessonOccurrences`, `setGeRoute` (api.js); `routeOptions`, `recommendRoute`, `currentFormat`, `formatTerm` (B1); `formatDate` (`src/ielts/format.js`).
- Produces: `<GeRoutePage token userName userLevel onNav onProfile onLoaded onChosen onPricing onEdit onTest />`; `onChosen(profile)` / `onPricing(profile)` после `setGeRoute`.

- [ ] **Step 1: тест**

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import GeRoutePage from './GeRoutePage.jsx'

const state = { profile: null, progress: null, occ: [] }
vi.mock('../components/LearningLayout.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../api.js', () => ({
  getGeProfile: vi.fn(async () => state.profile),
  getLevelProgress: vi.fn(async () => state.progress),
  getMyLessonOccurrences: vi.fn(async () => state.occ),
  setGeRoute: vi.fn(async (_t, route) => ({ ...state.profile, route })),
}))

const base = {
  onboarded: true, purpose: 'work', targetLevel: 'B2', fromLevel: 'A2', dailyMinutes: 30, deadlineWindow: 'none', route: null,
  deadline: { state: 'none', date: null, daysRemaining: null, approximate: false },
  journey: { start: 'A2', current: { level: 'A2', percent: 0 }, target: 'B2', reached: false },
}
const renderPage = (props = {}) => render(<I18nProvider><GeRoutePage token="tok" {...props} /></I18nProvider>)

beforeEach(() => {
  state.profile = { ...base }
  state.progress = { track: 'SELF_STUDY', percent: 0 }
  state.occ = []
})

describe('GeRoutePage', () => {
  it('три формата, рекомендация по цели и разрыву, «самостоятельно» ведёт на «Главную»', async () => {
    const onChosen = vi.fn()
    const onPricing = vi.fn()
    renderPage({ onChosen, onPricing })
    await waitFor(() => expect(screen.getByText('Как дойти до B2')).toBeTruthy())
    expect(document.querySelectorAll('.ih-route__opt').length).toBe(3)
    expect(document.querySelector('.ih-route__opt.is-rec h2').textContent).toBe('В группе')
    fireEvent.click(screen.getByRole('button', { name: 'Учиться самостоятельно' }))
    await waitFor(() => expect(onChosen).toHaveBeenCalled())
    expect(onPricing).not.toHaveBeenCalled()
  })

  it('группа ведёт в тарифы, а свой формат — сразу дальше', async () => {
    const onChosen = vi.fn()
    const onPricing = vi.fn()
    state.progress = { track: 'LESSONS', percent: 0 }
    state.occ = [{ lessonType: 'GROUP', scheduledAt: '2026-10-01T10:00' }]
    renderPage({ onChosen, onPricing })
    await waitFor(() => expect(screen.getByText('Ваш формат')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    await waitFor(() => expect(onChosen).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать индивидуально' }))
    await waitFor(() => expect(onPricing).toHaveBeenCalled())
  })

  it('без уровня — тест, цель достигнута — новая цель', async () => {
    const onTest = vi.fn()
    state.profile = { ...base, journey: { ...base.journey, current: { level: null, percent: null } } }
    const { unmount } = renderPage({ onTest })
    await waitFor(() => expect(screen.getByText('Сначала определим уровень')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Пройти тест' }))
    expect(onTest).toHaveBeenCalled()
    unmount()

    const onEdit = vi.fn()
    state.profile = { ...base, journey: { ...base.journey, current: { level: 'B2', percent: 0 }, reached: true } }
    renderPage({ onEdit })
    await waitFor(() => expect(screen.getByText('Цель B2 уже достигнута')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать новую цель' }))
    expect(onEdit).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: тест падает**

Run: `cd $W && npx vitest run src/screens/GeRoutePage.test.jsx`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: экран**

```jsx
import { useEffect, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import EmptyState from '../ielts/ui/EmptyState.jsx'
import { getGeProfile, getLevelProgress, getMyLessonOccurrences, setGeRoute } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import { formatDate } from '../ielts/format.js'
import { CheckCircleIcon, CheckIcon, InfoIcon, StarIcon, TrendingUpIcon } from '../ielts/icons.jsx'
import { currentFormat, formatTerm, recommendRoute, routeOptions } from '../ge/route.js'

const FEATURES = 3

/**
 * «Как дойти до {цель}» (спека 2026-10-12, секция 2; вид — экран маршрута IELTS, Figma 3): три формата со сроком до
 * цели при выбранном времени в день и пометкой, успевают ли они к сроку. Рекомендуемый — по правилам route.js.
 * Выбор ложится в профиль; группа и индивидуально ведут в тарифы, кроме формата, в котором ученик уже занимается.
 */
export default function GeRoutePage({ token, userName, userLevel, onNav, onProfile, onLoaded, onChosen, onPricing, onEdit, onTest }) {
  const { t, lang } = useI18n()
  const authToken = token || loadToken()
  const [state, setState] = useState({ status: 'loading' })
  const [busy, setBusy] = useState(null)
  // Колбэк App не должен перезапускать загрузку на каждом рендере родителя
  const loadedRef = useRef(onLoaded)
  loadedRef.current = onLoaded

  useEffect(() => {
    let alive = true
    Promise.all([getGeProfile(authToken), getLevelProgress(authToken).catch(() => null), getMyLessonOccurrences(authToken).catch(() => [])]).then(
      ([p, progress, occ]) => {
        if (!alive) return
        if (!p) {
          setState({ status: 'error' })
          return
        }
        loadedRef.current?.(p)
        setState({ status: 'ready', p, format: progress?.track === 'LESSONS' ? currentFormat(occ) : null })
      },
    )
    return () => {
      alive = false
    }
  }, [authToken])

  const choose = async (id, own) => {
    setBusy(id)
    try {
      const p = await setGeRoute(authToken, id)
      if (id === 'self_study' || own) onChosen?.(p)
      else onPricing?.(p)
    } catch {
      setBusy(null)
    }
  }

  let body
  if (state.status === 'loading') {
    body = <p className="ih-muted">{t('geRoute.loading')}</p>
  } else if (state.status === 'error') {
    body = <EmptyState icon={<TrendingUpIcon size={28} />} title={t('geRoute.errorTitle')} text={t('geRoute.errorText')} />
  } else {
    const { p, format } = state
    const level = p.journey?.current?.level || null
    const percent = p.journey?.current?.percent ?? 0
    if (!level) {
      body = (
        <EmptyState
          icon={<TrendingUpIcon size={28} />}
          title={t('geRoute.noLevelTitle')}
          text={t('geRoute.noLevelText')}
          action={<button type="button" className="ih-cta" onClick={() => onTest?.()}>{t('geRoute.toTest')}</button>}
        />
      )
    } else if (p.journey?.reached) {
      body = (
        <EmptyState
          icon={<CheckCircleIcon size={28} />}
          title={t('geRoute.reachedTitle', { level: p.targetLevel })}
          text={t('geRoute.reachedText')}
          action={<button type="button" className="ih-cta" onClick={() => onEdit?.()}>{t('geRoute.newGoal')}</button>}
        />
      )
    } else {
      const opts = routeOptions({ targetLevel: p.targetLevel, dailyMinutes: p.dailyMinutes, deadlineIso: p.deadline?.date }, { level, percent })
      const rec = recommendRoute(opts, { purpose: p.purpose, level, targetLevel: p.targetLevel })
      const dateLabel = p.deadline?.date ? `${p.deadline.approximate ? '≈ ' : ''}${formatDate(`${p.deadline.date}T00:00:00`, lang)}` : null
      const sub = t(dateLabel ? 'geRoute.sub' : 'geRoute.subNoDate', { level, percent: String(percent), date: dateLabel, daily: t(`geOb.daily.${p.dailyMinutes}`) })
      const fitChip = (o) => {
        if (o.fit == null) return null
        if (o.fit === 'late')
          return (
            <span className="ih-route__fit is-bad">
              <InfoIcon size={14} />
              {t('geRoute.late', { date: dateLabel })}
            </span>
          )
        return (
          <span className="ih-route__fit is-ok">
            <CheckCircleIcon size={14} />
            {t(o.fit === 'spare' ? 'geRoute.spare' : 'geRoute.fits')}
          </span>
        )
      }
      body = (
        <div className="ih-route">
          <header>
            <h1>{t('geRoute.title', { level: p.targetLevel })}</h1>
            <p>{sub}</p>
          </header>
          {rec.late && (
            <p className="ih-ob__note is-warn">
              <InfoIcon size={20} />
              <span>{t('geRoute.allLate')}</span>
            </p>
          )}
          <div className="ih-route__grid">
            {opts.map((o) => {
              const recommended = rec.route === o.id
              const own = format === o.id
              return (
                <section key={o.id} className={`ih-card ih-route__opt ${recommended ? 'is-rec' : ''} ${p.route === o.id ? 'is-chosen' : ''}`}>
                  <div className="ih-route__head">
                    <span className="ih-route__kicker">{own ? t('geRoute.own') : t(`geRoute.kicker.${o.id}`)}</span>
                    {recommended && (
                      <span className="ih-route__rec">
                        <StarIcon size={14} />
                        {t('geOb.recommended')}
                      </span>
                    )}
                  </div>
                  <h2>{t(`geRoute.route.${o.id}`)}</h2>
                  <p className="ih-route__termline">
                    <b className="ih-route__term">{formatTerm(o.units, t, lang)}</b>
                    <span>{t('geRoute.toGoal')}</span>
                  </p>
                  {fitChip(o)}
                  <ul>
                    {Array.from({ length: FEATURES }, (_, i) => (
                      <li key={i}>
                        <CheckIcon size={16} />
                        {t(`geRoute.feature.${o.id}.${i + 1}`)}
                      </li>
                    ))}
                  </ul>
                  <button type="button" className={recommended ? 'ih-cta' : 'ih-btn ih-btn--outline'} onClick={() => choose(o.id, own)} disabled={!!busy}>
                    {own ? t('geRoute.continue') : t(`geRoute.cta.${o.id}`)}
                  </button>
                </section>
              )
            })}
          </div>
          <p className="ih-route__why">
            <InfoIcon size={16} />
            <span>{t('geRoute.why', { lessons: String(opts[0].lessons), level: p.targetLevel })}</span>
          </p>
          <button type="button" className="ih-link ge-route__edit" onClick={() => onEdit?.()}>
            {t('geRoute.editGoal')}
          </button>
        </div>
      )
    }
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} token={token} onNav={onNav} onProfile={onProfile} active="home">
      <div className="ih">{body}</div>
    </LearningLayout>
  )
}
```

- [ ] **Step 4: тест проходит**

Run: `cd $W && npx vitest run src/screens/GeRoutePage.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C $W add src/screens/GeRoutePage.jsx src/screens/GeRoutePage.test.jsx
git -C $W commit -m "feat(ge): экран «Как дойти до цели» — три формата со сроком"
```

### Task B8: «Главная» — приглашение и блок цели

**Files:**
- Create: `$W/src/screens/home/GePlanInvite.jsx`, `$W/src/screens/home/GeGoalBanner.jsx`
- Modify: `$W/src/screens/HomePage.jsx` (импорты, пропсы, тур, верхний блок)
- Test: `$W/src/screens/HomePage.ge.test.jsx`

**Interfaces:**
- Consumes: `homeTopState`, `goalBannerState`, `sayKey` (B2); `routeOptions`, `formatTerm` (B1).
- Produces: пропсы `HomePage`: `geProfile`, `onGeStart`, `onGeEdit`, `onGeRoute`, `onGeTest`.

- [ ] **Step 1: тест**

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import { LanguageProvider } from '../i18n/LanguageContext.jsx'
import HomePage from './HomePage.jsx'

vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getTrialRequestState: vi.fn(async () => ({ requested: false })),
  getMyLessonOccurrences: vi.fn(async () => []),
  getMyHomework: vi.fn(async () => []),
  requestTrialLesson: vi.fn(async () => ({ requested: true })),
  getLevelProgress: vi.fn(async () => ({ level: 'A2', next: 'B1', percent: 40, done: 14, total: 36, remaining: 22 })),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false })),
  getIeltsPlan: vi.fn(async () => null),
}))
vi.mock('../practice/skillStats.js', () => ({ readLocalSkillStats: () => ({}), loadSkillStatsRemote: vi.fn(async () => null) }))
globalThis.ResizeObserver ??= class {
  observe() {}
  disconnect() {}
}
Element.prototype.scrollIntoView ??= function () {}

const TOKEN = `h.${btoa(JSON.stringify({ userId: 7 }))}.s`
const goal = {
  onboarded: true, purpose: 'work', targetLevel: 'B2', fromLevel: 'A2', dailyMinutes: 30, deadlineWindow: 'none', route: 'self_study',
  deadline: { state: 'none', date: null, daysRemaining: null, approximate: false },
  journey: { start: 'A2', current: { level: 'A2', percent: 40 }, target: 'B2', reached: false },
}
function renderHome(props) {
  render(
    <I18nProvider>
      <LanguageProvider>
        <HomePage userLevel="A2" userName="Сакен" token={TOKEN} {...props} />
      </LanguageProvider>
    </I18nProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('jts_tours_off', '1')
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ configured: false }) })))
})

describe('HomePage — General English', () => {
  it('без профиля — прежняя карточка уровня', async () => {
    renderHome({ geProfile: null })
    await waitFor(() => expect(document.querySelector('.hm-level')).toBeTruthy())
    expect(document.querySelector('.ge-invite')).toBe(null)
  })
  it('уровень есть, анкеты нет — приглашение', async () => {
    const onGeStart = vi.fn()
    renderHome({ geProfile: { onboarded: false }, onGeStart })
    await waitFor(() => expect(screen.getByText('Составим ваш план')).toBeTruthy())
    expect(document.querySelector('.hm-level')).toBe(null)
    fireEvent.click(screen.getByRole('button', { name: 'Начать' }))
    expect(onGeStart).toHaveBeenCalled()
  })
  it('анкета есть, формата нет — шаг «выберите формат»', async () => {
    const onGeRoute = vi.fn()
    renderHome({ geProfile: { ...goal, route: null }, onGeRoute })
    await waitFor(() => expect(screen.getByText('Выберите, как будете заниматься')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать формат' }))
    expect(onGeRoute).toHaveBeenCalled()
  })
  it('всё есть — блок цели: дорожка, срок не указан, правка', async () => {
    const onGeEdit = vi.fn()
    renderHome({ geProfile: goal, onGeEdit })
    await waitFor(() => expect(document.querySelector('.ge-goal')).toBeTruthy())
    expect(screen.getByText('Срок не указан')).toBeTruthy()
    expect([...document.querySelectorAll('.ge-goal .ih-gb__track li span')].map((n) => n.textContent)).toEqual(['A2', 'A2', 'Сейчас · 40%', 'B2'])
    fireEvent.click(screen.getByRole('button', { name: /Указать срок/ }))
    expect(onGeEdit).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: тест падает**

Run: `cd $W && npx vitest run src/screens/HomePage.ge.test.jsx`
Expected: FAIL (нет `.ge-invite` / `.ge-goal`).

- [ ] **Step 3: `src/screens/home/GePlanInvite.jsx`**

```jsx
import { useI18n } from '../../i18n.jsx'

/**
 * Приглашение и следующий шаг плана General English на «Главной» (спека 2026-10-12, секция 3): «Составим ваш план»,
 * «Пройдите тест — посчитаем срок», «Выберите, как будете заниматься». Вид — прежней карточки «Пройдите тестирование».
 */
export default function GePlanInvite({ state, level, percent, onStart, onTest, onRoute }) {
  const { t } = useI18n()
  const action = state === 'needTest' ? onTest : state === 'needRoute' ? onRoute : onStart
  const sub =
    state === 'invite' && level
      ? t(typeof percent === 'number' ? 'geHome.invite.subLevel' : 'geHome.invite.subLevelNoPct', { level, percent: String(percent) })
      : t(`geHome.${state}.sub`)
  return (
    <section className="hm-card hm-placement ge-invite">
      <h1 className="hm-placement__title">{t(`geHome.${state}.title`)}</h1>
      <p className="hm-placement__sub">{sub}</p>
      <button type="button" className="hm-placement__cta" onClick={() => action?.()}>
        {t(`geHome.${state}.cta`)}
      </button>
    </section>
  )
}
```

- [ ] **Step 4: `src/screens/home/GeGoalBanner.jsx`**

```jsx
import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { formatDate } from '../../ielts/format.js'
import { ArrowForwardIcon, EditIcon, EventIcon } from '../../ielts/icons.jsx'
import { goalBannerState, sayKey } from '../../ge/homeState.js'
import { formatTerm } from '../../ge/route.js'

/**
 * Блок цели «Главной» General English — по образцу GoalBanner раздела IELTS («IELTS new», GoalJourney): маскот с
 * репликой, срок и дорожка «старт → сейчас → цель» тремя узлами без оси. Под дорожкой — прежние строки карточки
 * уровня («ещё N материалов», «+N% за неделю»): их считает сервер, и терять их при смене вида незачем.
 */
export default function GeGoalBanner({ profile, option, planLine, week, onEdit, onOpenRoute, onBuy }) {
  const { t, lang } = useI18n()
  const [seed] = useState(() => Math.random())
  const s = goalBannerState({ deadline: profile.deadline, journey: profile.journey, fit: option?.fit ?? null })
  const d = profile.deadline || {}
  const j = profile.journey || {}
  const cur = j.current || {}
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const fmt = (iso) => (iso ? formatDate(`${iso}T00:00:00`, lang) : '')
  const monthYear = (iso) => new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric' }).format(new Date(`${iso}T00:00:00`)).replace(/\s?г\.$/, '')
  const sayVars = { level: profile.targetLevel, term: option ? formatTerm(option.units, t, lang) : '' }

  let title
  let sub = null
  if (s.title === 'reached') {
    title = t('geGoal.title.reached', { level: profile.targetLevel })
  } else if (s.title === 'none') {
    title = t('geGoal.title.none')
    sub = (
      <button type="button" className="ih-gb__pill" onClick={onEdit}>
        <EventIcon size={16} /> {t('geGoal.setDate')}
      </button>
    )
  } else if (s.title === 'passed') {
    title = t('geGoal.title.passed')
    sub = (
      <span className="ih-gb__daterow">
        <span className="ih-gb__date">{fmt(d.date)}</span>
        <button type="button" className="ih-gb__pill" onClick={onEdit}>
          {t('geGoal.updateGoal')}
        </button>
      </span>
    )
  } else {
    title =
      s.title === 'today'
        ? t('geGoal.title.today')
        : s.title === 'tomorrow'
          ? t('geGoal.title.tomorrow')
          : s.title === 'approx'
            ? t('geGoal.title.approx', { date: monthYear(d.date) })
            : plural(t, lang, 'geGoal.title.days', d.daysRemaining)
    sub = (
      <span className="ih-gb__daterow">
        <span className="ih-gb__date">{s.title === 'approx' ? t(`geOb.window.${profile.deadlineWindow}`) : fmt(d.date)}</span>
        <button type="button" className="ih-gb__edit" onClick={onEdit} aria-label={t('geGoal.edit')}>
          <EditIcon size={14} />
        </button>
      </span>
    )
  }

  // Блок кликабелен целиком, как у IELTS: ведёт на маршрут. Свои кнопки внутри клик наружу не отдают.
  const onBlockClick = (e) => {
    if (e.target.closest('button, a') || s.reached) return
    onOpenRoute?.()
  }

  return (
    <div className="ge-skin">
      <section className="ih-gb is-clickable ge-goal" aria-label={t('geGoal.aria')} onClick={onBlockClick}>
        <img className="ih-gb__bg" src="/ielts/mascot/goal-bg.webp" alt="" aria-hidden="true" />
        <div className="ih-gb__mascot">
          <p className="ih-gb__bubble">{t(sayKey(s.say, seed), sayVars)}</p>
          <img src="/ielts/mascot/cheer.webp" alt="" aria-hidden="true" width="300" height="237" />
        </div>
        <div className="ih-gb__journey">
          <div className="ih-gb__exam">
            <h2>{title}</h2>
            {sub}
          </div>
          <ol className={`ih-gb__track${s.reached ? ' is-reached' : ''}`}>
            <li className="ih-gb__node ih-gb__node--a" aria-label={t('geGoal.start')}>
              <span>{j.start || '—'}</span>
            </li>
            <li className="ih-gb__line ih-gb__line--done" aria-hidden="true" />
            <li className="ih-gb__now" aria-label={t('geGoal.now')}>
              <span className="ih-gb__node ih-gb__node--now">{cur.level || '—'}</span>
              <span className="ih-gb__nowtag">{typeof cur.percent === 'number' ? t('geGoal.nowPct', { percent: String(cur.percent) }) : t('geGoal.now')}</span>
            </li>
            <li className="ih-gb__line ih-gb__line--todo" aria-hidden="true" />
            <li className="ih-gb__star" aria-label={t('geGoal.goal')}>
              <span>{profile.targetLevel}</span>
            </li>
          </ol>
          <div className="ih-gb__foot">
            {(planLine || week > 0) && (
              <p className="ge-goal__plan">
                {planLine}
                {week > 0 && <span className="hm-level__week">{t('home.level.week', { n: String(week) })}</span>}
              </p>
            )}
            {s.reached ? (
              <button type="button" className="ih-link" onClick={onBuy}>
                {t('home.level.buy')} <ArrowForwardIcon size={17} />
              </button>
            ) : (
              <button type="button" className="ih-link" onClick={onOpenRoute}>
                {t('geGoal.toRoute')} <ArrowForwardIcon size={17} />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 5: правки `src/screens/HomePage.jsx`**

Импорты (после строки `import IeltsHomeCard ...`):

```jsx
import GeGoalBanner from './home/GeGoalBanner.jsx'
import GePlanInvite from './home/GePlanInvite.jsx'
import { homeTopState } from '../ge/homeState.js'
import { routeOptions } from '../ge/route.js'
```

Пропсы (после `ieltsAccount = false,`):

```jsx
  // Профиль General English (App: getGeProfile; null — ручки нет, IELTS-аккаунт или гость): анкета, цель и формат.
  // Есть профиль — сверху приглашение или блок цели вместо прежней карточки уровня (спека 2026-10-12, секция 3).
  geProfile = null,
  onGeStart,
  onGeEdit,
  onGeRoute,
  onGeTest,
```

После `const goalValue = ...`:

```jsx
  // Верхний блок General English. У IELTS-аккаунта свой (IeltsHomeCard) — профиль General English ему не показываем.
  const geTop = ieltsAccount ? 'legacy' : homeTopState({ geProfile, levelUnknown, level: userLevel })
  const geMode = geTop !== 'legacy'
  // Срок выбранного формата — для реплики маскота («идём по плану» / «не успеваем»). Та же формула, что на маршруте.
  const geOption = useMemo(() => {
    if (geTop !== 'goal') return null
    const cur = geProfile.journey?.current || {}
    return (
      routeOptions(
        { targetLevel: geProfile.targetLevel, dailyMinutes: geProfile.dailyMinutes, deadlineIso: geProfile.deadline?.date },
        { level: cur.level || summary.level, percent: cur.percent ?? summary.percent ?? 0 },
      ).find((o) => o.id === geProfile.route) || null
    )
  }, [geTop, geProfile, summary.level, summary.percent])
```

Первый шаг тура заменить на:

```jsx
    geMode
      ? {
          // Цель теперь задаёт анкета — тур только показывает блок
          selector: '.ge-goal, .ge-invite',
          title: t('tour.home.ge.title'),
          text: t('tour.home.ge.text'),
        }
      : {
          selector: '.hm-level',
          title: t('tour.home.goal.title'),
          text: t('tour.home.goal.text'),
          content: options.length ? <GoalPicker options={options} value={goalValue} onPick={pickGoal} /> : null,
          // «Далее» — после выбора: ради него шаг и стоит первым. Пропустить тур
          // целиком можно всегда, тогда дорожка остаётся прежней.
          canNext: !options.length || !!goalValue,
        },
```

Верхний блок: в тернарнике `{ieltsAccount ? (<IeltsHomeCard …/>) : levelUnknown ? (…) : (…)}` после ветки IELTS вставить две ветки:

```jsx
        ) : geTop === 'goal' ? (
          <GeGoalBanner
            profile={geProfile}
            option={geOption}
            planLine={planLine}
            week={week}
            onEdit={() => onGeEdit?.()}
            onOpenRoute={() => onGeRoute?.()}
            onBuy={() => onOpenPricing?.()}
          />
        ) : geMode ? (
          <GePlanInvite state={geTop} level={summary.level} percent={summary.percent} onStart={onGeStart} onTest={onGeTest} onRoute={onGeRoute} />
```

(`planLine` и `week` объявлены выше по телу компонента — до `return`, блок использует их как есть.)

- [ ] **Step 6: тесты «Главной» — новые и прежние**

Run: `cd $W && npx vitest run src/screens/HomePage`
Expected: PASS — `HomePage.ge.test.jsx`, `HomePage.test.jsx`, `HomePage.goal.test.jsx` (прежние ничего не знают о `geProfile` → ветка `legacy`).

- [ ] **Step 7: Commit**

```bash
git -C $W add src/screens/home/GePlanInvite.jsx src/screens/home/GeGoalBanner.jsx src/screens/HomePage.jsx src/screens/HomePage.ge.test.jsx
git -C $W commit -m "feat(ge): «Главная» — приглашение составить план и блок цели"
```

### Task B9: проводка в App.jsx

**Files:**
- Modify: `$W/src/App.jsx`

**Interfaces:**
- Consumes: `getGeProfile` (api.js), `syncLegacyGoal` (B2), `GeOnboardingPage` (B6), `GeRoutePage` (B7), новые пропсы `HomePage` (B8).

- [ ] **Step 1: импорты** — рядом с `import IeltsRoutePage ...`:

```jsx
import GeOnboardingPage from './screens/GeOnboardingPage.jsx'
import GeRoutePage from './screens/GeRoutePage.jsx'
import { syncLegacyGoal } from './ge/legacyGoal.js'
```

и `getGeProfile` — в существующий импорт из `'./api.js'`.

- [ ] **Step 2: адресуемые экраны** — в `PERSISTABLE_SCREENS` после строки с `'ielts-onboarding', …`:

```js
  // Анкета и маршрут General English (спека 2026-10-12): данные берут у бэкенда сами, параметров в адресе не нужно
  'ge-onboarding', 'ge-route',
```

- [ ] **Step 3: состояние и эффекты** — сразу после `const [testRetake, setTestRetake] = useState(false)`:

```jsx
  // Профиль General English (анкета «Главной», цель, формат — бэкенд /mobile/ge). null — ручки нет (старый бэкенд),
  // аккаунт IELTS (у него своя анкета) или гость: тогда «Главная» прежняя.
  const [geProfile, setGeProfile] = useState(null)
  // Тест уровня запущен из анкеты или со следующего шага «Главной»: конец теста — маршрут, «позже» — «Главная».
  const [geTestFlow, setGeTestFlow] = useState(false)
  const [geEdit, setGeEdit] = useState(false)
  // Куда «назад» из тарифов, если пришли не из сайдбара (маршрут General English)
  const [pricingBack, setPricingBack] = useState(null)
  useEffect(() => {
    if (!token) {
      setGeProfile(null)
      return undefined
    }
    let alive = true
    getIeltsMe(token)
      .then((m) => (m.ieltsAccount ? null : getGeProfile(token)))
      .then((p) => syncLegacyGoal(token, p))
      .then((p) => {
        if (alive) setGeProfile(p)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [token])
  // Новый ученик после входа попадает на тест уровня ('test-intro', homeScreenFor). С ручкой профиля сначала анкета —
  // цель и срок, потом тест. Тест из профиля (testReturn 'profile') и тест, запущенный самой анкетой, не перехватываем.
  useEffect(() => {
    if (screen === 'test-intro' && geProfile && !geProfile.onboarded && !geTestFlow && testReturn !== 'profile') setScreen('ge-onboarding')
  }, [screen, geProfile, geTestFlow, testReturn])
```

- [ ] **Step 4: переходы** — рядом с `function openLevelTestFrom`:

```jsx
  // Тест уровня из анкеты General English и со следующего шага «Главной»: в конце — маршрут, «позже» — «Главная».
  function openGeTest() {
    setGeTestFlow(true)
    setTestReturn('ge-route')
    setTestRetake(false)
    setScreen('test-intro')
  }

  // Ответы анкеты сохранены. «С нуля» бэкенд сам поставил A0 — App узнаёт уровень из ответа, без перечитывания профиля.
  function handleGeSaved(p, next) {
    if (p) {
      setGeProfile(p)
      syncLegacyGoal(token, p)
      const lv = p.journey?.current?.level
      if (lv && needsLevelTest) {
        setUserLevel(lv)
        setNeedsLevelTest(false)
      }
    }
    setGeEdit(false)
    if (next === 'test') openGeTest()
    else setScreen('ge-route')
  }

  function leaveTestIntro() {
    if (geTestFlow) {
      setGeTestFlow(false)
      setTestReturn(null)
      setScreen('home')
    } else setScreen(testExit())
  }
```

В `handleTestDone` первой строкой: `setGeTestFlow(false)`.

- [ ] **Step 5: экраны** — в `case 'test-intro'` заменить `onBack` и `onLater` на `leaveTestIntro`:

```jsx
          onBack={leaveTestIntro}
          onStart={() => { setTestRetake(false); setScreen('test') }}
          onLater={leaveTestIntro}
```

В `case 'home'` добавить пропсы `HomePage`:

```jsx
          geProfile={ieltsAccount ? null : geProfile}
          onGeStart={() => { setGeEdit(false); setScreen('ge-onboarding') }}
          onGeEdit={() => { setGeEdit(true); setScreen('ge-onboarding') }}
          onGeRoute={() => setScreen('ge-route')}
          onGeTest={openGeTest}
```

`case 'pricing'`:

```jsx
      return (
        <PricingPage
          token={token}
          onBack={() => {
            const back = pricingBack
            setPricingBack(null)
            setScreen(back || (isDemoAccount ? 'home' : 'kingdom'))
          }}
        />
      )
```

Новые ветки — перед `case 'ielts-onboarding':`:

```jsx
    case 'ge-onboarding':
      return (
        <GeOnboardingPage
          token={token}
          level={needsLevelTest ? null : userLevel}
          edit={geEdit}
          onExit={() => { setGeEdit(false); setScreen('home') }}
          onSaved={handleGeSaved}
        />
      )
    case 'ge-route':
      return (
        <GeRoutePage
          token={token}
          userName={name}
          userLevel={userLevel}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
          onLoaded={setGeProfile}
          onChosen={(p) => { if (p) setGeProfile(p); setScreen('home') }}
          onPricing={(p) => { if (p) setGeProfile(p); setPricingBack('ge-route'); setScreen('pricing') }}
          onEdit={() => { setGeEdit(true); setScreen('ge-onboarding') }}
          onTest={openGeTest}
        />
      )
```

- [ ] **Step 6: сборка и линт**

Run: `cd $W && npx eslint src/App.jsx src/screens src/ge src/components/onboarding && npx vitest run --exclude '.claude/**'`
Expected: eslint без ошибок; vitest — без новых падений против базы (`develop-red-tests-baseline`: practice-contract, vocab, practice-gate, баннер Аудирования — известные).

- [ ] **Step 7: Commit**

```bash
git -C $W add src/App.jsx
git -C $W commit -m "feat(ge): анкета после входа, маршрут и «Главная» — проводка в App"
```

### Task B10: e2e и прогон экрана

**Files:**
- Create: `$W/tests/ge-onboarding.spec.js`

- [ ] **Step 1: спека**

```js
import { test, expect } from '@playwright/test'

// Анкета General English на «Главной» (спека 2026-10-12): учащийся без анкеты видит приглашение, проходит анкету,
// выбирает формат и попадает на блок цели; правка цели — три шага. Бэкенд подменён — проверяем экраны и запросы.

const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'USER', sub: '7', userId: 7 })).toString('base64url'), 'sig'].join('.')
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

function profileFrom(body, route = null) {
  return {
    onboarded: true, purpose: body.purpose, targetLevel: body.targetLevel, fromLevel: 'A2', deadlineDate: body.deadlineDate,
    deadlineWindow: body.deadlineDate ? 'date' : body.deadlineWindow, dailyMinutes: body.dailyMinutes, startMode: body.startMode, route,
    onboardedAt: '2026-10-12T10:00:00',
    deadline: { state: 'none', date: null, daysRemaining: null, approximate: false },
    journey: { start: 'A2', current: { level: 'A2', percent: 50 }, target: body.targetLevel, reached: false },
  }
}

async function setup(page, initial) {
  const state = { profile: initial, puts: [] }
  await page.addInitScript((token) => {
    localStorage.setItem('jts_access_token', token)
    localStorage.setItem('jts_tours_off', '1')
  }, jwt)
  const me = { userId: 7, name: 'Сакен', role: 'USER', languageLevel: 'A2', isDemoAccount: false }
  await page.route(/justtostudy\.kz/, (route) => {
    const req = route.request()
    const url = req.url()
    if (url.includes('/mobile/ge/profile/route')) {
      state.profile = { ...state.profile, route: JSON.parse(req.postData()).route }
      return route.fulfill(json(state.profile))
    }
    if (url.includes('/mobile/ge/profile')) {
      if (req.method() === 'PUT') {
        const body = JSON.parse(req.postData())
        state.puts.push(body)
        state.profile = profileFrom(body, state.profile?.route ?? null)
      }
      return route.fulfill(json(state.profile))
    }
    if (url.includes('/user/language-level')) return route.fulfill(json({ languageLevel: 'A2' }))
    if (url.includes('/user/me')) return route.fulfill(json(me))
    if (url.includes('/mobile/level-progress')) return route.fulfill(json({ level: 'A2', next: 'B1', track: 'SELF_STUDY', percent: 50, done: 18, total: 36, remaining: 18 }))
    if (url.includes('/admin/lessons/occurrences') || url.includes('/admin/homework/my')) return route.fulfill(json([]))
    return route.fulfill(json({}))
  })
  await page.route('**/api/auth/me', (route) => route.fulfill(json({ user: me })))
  await page.route('**/api/profile/level-goal', (route) => route.fulfill(json({ configured: true, goal: null })))
  return state
}

test('учащийся без анкеты: приглашение → анкета → маршрут → блок цели', async ({ page }) => {
  const state = await setup(page, { onboarded: false })
  await page.goto('/?screen=home')
  await expect(page.locator('.ge-invite')).toContainText('Составим ваш план', { timeout: 20000 })
  await page.getByRole('button', { name: 'Начать' }).click()

  await expect(page.getByText('Шаг 1 из 4')).toBeVisible()
  await page.getByRole('radio', { name: /Работа и карьера/ }).click()
  await page.locator('.ih-ob__cta').click()
  await expect(page.getByRole('radio', { name: /^A2/ })).toBeDisabled()
  await page.getByRole('radio', { name: /^B2/ }).click()
  await page.locator('.ih-ob__cta').click()
  await page.getByRole('radio', { name: /Без срока/ }).click()
  await page.locator('.ih-ob__cta').click()
  await expect(page.locator('.ih-obday__term').first()).toContainText('до цели')
  await page.locator('.ih-ob__cta').click()

  await expect(page.getByRole('heading', { name: 'Как дойти до B2' })).toBeVisible()
  await expect(page.locator('.ih-route__opt')).toHaveCount(3)
  await expect(page.locator('.ih-route__opt.is-rec h2')).toHaveText('В группе')
  await page.getByRole('button', { name: 'Учиться самостоятельно' }).click()

  await expect(page.locator('.ge-goal')).toBeVisible()
  await expect(page.locator('.ge-goal')).toContainText('Срок не указан')
  expect(state.puts).toEqual([{ purpose: 'work', targetLevel: 'B2', deadlineDate: null, deadlineWindow: 'none', dailyMinutes: 30, startMode: null }])
  expect(state.profile.route).toBe('self_study')
})

test('правка цели с «Главной» — три шага и снова маршрут', async ({ page }) => {
  await setup(page, profileFrom({ purpose: 'work', targetLevel: 'B2', deadlineDate: null, deadlineWindow: 'none', dailyMinutes: 30, startMode: null }, 'self_study'))
  await page.goto('/?screen=home')
  await expect(page.locator('.ge-goal')).toBeVisible({ timeout: 20000 })
  await page.getByRole('button', { name: /Указать срок/ }).click()
  await expect(page.getByText('Шаг 1 из 3')).toBeVisible()
  await page.locator('.ih-ob__cta').click()
  await page.getByRole('radio', { name: /Через 3–6 месяцев/ }).click()
  await page.locator('.ih-ob__cta').click()
  await page.locator('.ih-ob__cta').click()
  await expect(page.getByRole('heading', { name: 'Как дойти до B2' })).toBeVisible()
})
```

- [ ] **Step 2: прогон** (порт свой — у соседних worktree свои dev-серверы, см. память `e2e-port-reuse-trap`)

Run: `cd $W && E2E_PORT=3470 npx playwright test tests/ge-onboarding.spec.js tests/home-goal.spec.js --workers=1`
Expected: PASS — новые и прежняя спека цели («Главная» без ручки профиля не изменилась).

- [ ] **Step 3: прогон затронутых чужих спек**

Run: `cd $W && E2E_PORT=3470 npx playwright test tests/deeplink-survives-login.spec.js tests/tutor-onboarding.spec.js --workers=1`
Expected: PASS (заглушки отдают `{}` → профиля нет → путь прежний).

- [ ] **Step 4: Commit**

```bash
git -C $W add tests/ge-onboarding.spec.js
git -C $W commit -m "test(ge): e2e анкеты, маршрута и правки цели"
```

### Task B11: сборка, вид вживую, документация

**Files:**
- Modify: `$W/CLAUDE.md` (раздел «Архитектура», после абзаца про «Главную»/Roadmap — новый абзац)

- [ ] **Step 1: сборка** (во временном worktree уже — по памяти `build-alongside-dev-server`)

Run: `cd $W && npx next build --webpack`
Expected: сборка без ошибок.

- [ ] **Step 2: вид** — `npm run dev -- --port 3470` в фоне, в браузере пройти `?screen=home` с подменённым профилем (те же route-моки, что в e2e, через Playwright-скрипт) на 1280 и 375 px; сделать скриншоты анкеты, маршрута и блока цели. Если блок цели на 375 px ломается — правило в `src/mobile/home.css` внутри `@media (max-width: 560px)`, например `.ge-skin .ih-gb { grid-template-columns: 1fr; }` (у `.ih-gb` в `ielts.css` своя адаптация до 720 px — сначала проверить её).

- [ ] **Step 3: CLAUDE.md** — абзац:

```markdown
**Анкета и роадмап «Главной» (General English) — по образцу IELTS, профиль на бэкенде.** Спека —
`docs/superpowers/specs/2026-10-12-ge-onboarding-roadmap-design.md` (часть 1 из трёх; план по дням и админка — следующие).
Профиль `/mobile/ge/profile` (backend `ge_profiles`, V327): анкета (зачем, цель A1–C1, срок датой или окном, минут в
день, как начинает), формат (`self_study|group|individual`), `deadline` и `journey` для блока цели. Без ручки (404) или
с ответом без булевого `onboarded` «Главная» прежняя. Экраны: `?screen=ge-onboarding` (вид — онбординг IELTS, кирпичи
`src/components/onboarding/OnboardingParts.jsx`), `?screen=ge-route` (три формата), блок `src/screens/home/GeGoalBanner.jsx`.
Срок считает веб — `src/ge/route.js` поверх `roadmap.js` (силлабус минус пройденная доля, 2 занятия в неделю у группы и
индивидуальных, 5 дней × минуты ÷ 90 у самостоятельного). Цель уровня до 12.10.2026 жила в `level_goal` базы веба:
`src/ge/legacyGoal.js` разово переносит её в профиль и зеркалит цель профиля обратно — карточка преподавателя в
web-admin (`/api/admin/student-activity`) читает её оттуда до части 3; форму `{target, from}` не менять.
```

- [ ] **Step 4: финальный прогон**

Run: `cd $W && npm run lint && npx vitest run --exclude '.claude/**'`
Expected: lint чистый; vitest — только известные падения базы.

- [ ] **Step 5: Commit**

```bash
git -C $W add CLAUDE.md src/mobile/home.css
git -C $W commit -m "docs(ge): анкета и роадмап «Главной» в CLAUDE.md"
```

### Выкатка (по согласованию с владельцем)

1. Пуш `feat/ge-profile` (backend) → PR в `develop` → после мержа dev-server поднимается с V327.
2. Пуш `feat/ge-onboarding` (web) → PR в `develop` (мержить после бэкенда).
3. Проверка на dev-tutor вживую: учащийся, новый ученик (регистрация → анкета → тест → маршрут), правка цели.
4. В прод — бэкенд в `main` первым.
