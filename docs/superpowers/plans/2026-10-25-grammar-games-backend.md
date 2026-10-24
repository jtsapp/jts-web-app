# «Грамматика · игры» — бэкенд (этап 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Ревью — одно, в конце этапа (решение владельца, память `sdd-review-at-end`).

**Goal:** модуль бэкенда `grammargames`: 125 тем грамматики заливаются прототипом (html) или zip-ом JSON, правятся по одной в админке, ученик читает их через `/mobile/grammar-games`, а результат игры сохраняет лучший итог и начисляет монеты только за прирост.

**Architecture:** темы — строки `grammar_game_topics` с телом JSON, как `practice_reading_texts`; уровни, программа и словарь — одна строка `grammar_game_meta`; прогресс — `grammar_game_progress`; размер награды — общая таблица `practice_coin_rules`. Разбор и проверка — чистые классы без Spring (`GrammarGamesHtmlParser`, `GrammarGamesZip`, `GrammarTopicValidator`, `GrammarGameStages`), запись и чтение — сервисы поверх JPA, HTTP — тонкие контроллеры в `presentation`.

**Tech Stack:** Java 21, Spring Boot, Spring Data JPA, Flyway, Lombok, Jackson, JUnit 5 + AssertJ + Mockito, H2 для тестов сервисов.

**Спека:** jts-web-app `docs/superpowers/specs/2026-10-25-grammar-games-speed-reading-design.md`, часть A1 и допущения Д1–Д3, Д10, Д17.

## Global Constraints

- Репозиторий `jtsapp/backend`, worktree `C:\Users\nural\Desktop\backend-grammar-games`, ветка `feat/grammar-games` от `origin/develop` (4e28e27e). Все команды — из этой папки.
- Модуль — `kz.education.server.modules.grammargames`; HTTP — `kz.education.server.presentation.{admin,mobile}.grammargames`; правила монет — `kz.education.server.modules.practice.coins` (общие для разделов «Практики»).
- Миграция — `V411__Grammar_games.sql`; номер сверить перед пушем: `git fetch && bash scripts/check-migrations.sh --base origin/develop`. Если V411 занят — следующий свободный, тот же файл с новым номером.
- Права админки — `@PreAuthorize("hasAnyRole('ADMIN','CONTENT_MANAGER')")`; ученику — Bearer (любой вошедший, как `/mobile/prepositions`).
- Ошибки — `BadRequestException` (400), `ResourceNotFoundException` (404), `ConflictException` (409), текст по-русски, понятный методисту.
- Монеты: потолок одного правила — 10 (Д1); только за прирост лучшего результата (Д2); формула `min(лимит, звёзды + 1)`, бой — весь лимит (Д3); вместе с монетами — столько же XP, как `completeLessonModule`.
- Ошибки ответов игр не хранятся (решение заказчика 25.10.2026).
- Jackson приложения строгий: неизвестное поле в JSON-теле запроса → 400 (`JacksonConfig` не отключает `FAIL_ON_UNKNOWN_PROPERTIES`). DTO запросов — ровно те поля, что шлёт сайт.
- Тесты — на H2 (`SpringExtension` + свой `@Configuration`, как `ReadingServiceTest`) и на Mockito; `@WebMvcTest`-срезы не писать: им нужны бины трёх перехватчиков (IELTS, SAT, квоты). Права проверяются по аннотациям.
- Запуск тестов: `./gradlew test --tests '<шаблон>'`; две сборки Gradle одновременно в одной папке не запускать.
- Классы — до ~300 строк, методы — до ~30, зависимостей в конструкторе — до 5–6 (`docs/DEVELOPMENT_GUIDE.md` §2.7).
- Комментарии — по-русски, объясняют «почему».
- Коммиты — `тип(grammar-games): суть` по-русски, в конце строка `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

Сокращения путей ниже: `M` = `src/main/java/kz/education/server`, `T` = `src/test/java/kz/education/server`.

## Карта файлов

```
src/main/resources/db/migration/V411__Grammar_games.sql            — 4 таблицы + сид правил монет
M/modules/grammargames/model/GrammarGameTopic.java                 — тема (тело JSON)
M/modules/grammargames/model/GrammarGameMeta.java                  — уровни, программа, словарь (одна строка)
M/modules/grammargames/model/GrammarGameProgress.java              — лучший результат ученика в игре темы
M/modules/grammargames/repository/GrammarGameTopicRepository.java
M/modules/grammargames/repository/GrammarGameMetaRepository.java
M/modules/grammargames/repository/GrammarGameProgressRepository.java
M/modules/grammargames/service/GrammarGameStages.java              — набор игр темы, монеты (чистый)
M/modules/grammargames/service/GrammarTopicValidator.java          — правила проверки (чистый)
M/modules/grammargames/service/GrammarGamesBundle.java             — разобранный файл: уровни, программа, словарь, темы
M/modules/grammargames/service/GrammarGamesHtmlParser.java         — html прототипа → bundle (чистый)
M/modules/grammargames/service/GrammarGamesZip.java                — zip формата ТЗ ↔ bundle (чистый)
M/modules/grammargames/service/GrammarGamesDtos.java               — record'ы ответов и запросов
M/modules/grammargames/service/GrammarTopicRows.java               — строка ↔ тема: заполнение и строка админки
M/modules/grammargames/service/GrammarGamesCatalogService.java     — чтение ученику с кэшем
M/modules/grammargames/service/GrammarGamesUploadService.java      — заливка
M/modules/grammargames/service/GrammarGamesAdminService.java       — список, правка, видимость, выгрузка
M/modules/grammargames/service/GrammarGamesRewards.java            — монеты, XP, стрик
M/modules/grammargames/service/GrammarGamesProgressService.java    — результат игры, прогресс
M/modules/practice/coins/PracticeCoinRule.java
M/modules/practice/coins/PracticeCoinRuleRepository.java
M/modules/practice/coins/PracticeCoinRulesService.java
M/presentation/admin/grammargames/controller/AdminGrammarGamesController.java
M/presentation/admin/practice/controller/AdminPracticeCoinRulesController.java
M/presentation/mobile/grammargames/controller/MobileGrammarGamesController.java
M/presentation/mobile/grammargames/dto/GrammarGamesResultResponse.java
T/modules/grammargames/GrammarGamesJpaConfig.java                  — H2 для всех тестов модуля
T/modules/grammargames/GrammarGamesRepositoriesTest.java
T/modules/grammargames/service/GrammarGamesFixtures.java           — валидная тема, набор, html
T/modules/grammargames/service/*Test.java                          — по тесту на класс
T/modules/practice/coins/PracticeCoinRulesServiceTest.java
T/presentation/grammargames/GrammarGamesControllersTest.java
docs/practice/GRAMMAR_GAMES.md
```

---

### Task 1: Миграция, сущности, репозитории

**Files:**
- Create: `src/main/resources/db/migration/V411__Grammar_games.sql`
- Create: `M/modules/grammargames/model/GrammarGameTopic.java`, `GrammarGameMeta.java`, `GrammarGameProgress.java`
- Create: `M/modules/grammargames/repository/GrammarGameTopicRepository.java`, `GrammarGameMetaRepository.java`, `GrammarGameProgressRepository.java`
- Create: `M/modules/practice/coins/PracticeCoinRule.java`, `PracticeCoinRuleRepository.java`
- Test: `T/modules/grammargames/GrammarGamesJpaConfig.java`, `T/modules/grammargames/GrammarGamesRepositoriesTest.java`

**Interfaces:**
- Produces: сущности `GrammarGameTopic {id, level, number, titleRu, hidden, body, createdAt, updatedAt, updatedBy}`, `GrammarGameMeta {id, levels, program, gloss, updatedAt, updatedBy}` + `SINGLETON_ID = 1`, `GrammarGameProgress {id, userId, topicId, game, bestStars, attempts, lastPlayedAt}`, `PracticeCoinRule {ruleKey, coins, updatedAt, updatedBy}`; репозитории ниже; тестовый `GrammarGamesJpaConfig` (H2 + репозитории + `ObjectMapper`).

- [ ] **Step 1: Тестовая конфигурация H2**

`T/modules/grammargames/GrammarGamesJpaConfig.java`:

```java
package kz.education.server.modules.grammargames;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManagerFactory;
import kz.education.server.modules.grammargames.model.GrammarGameMeta;
import kz.education.server.modules.grammargames.model.GrammarGameProgress;
import kz.education.server.modules.grammargames.model.GrammarGameTopic;
import kz.education.server.modules.grammargames.repository.GrammarGameTopicRepository;
import kz.education.server.modules.practice.coins.PracticeCoinRule;
import kz.education.server.modules.practice.coins.PracticeCoinRuleRepository;
import kz.education.server.shared.config.JacksonConfig;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import javax.sql.DataSource;
import java.util.Map;

/**
 * H2 для тестов модуля: таблицы — по сущностям (миграцию накатывает дев-стенд), как в ReadingServiceTest.
 * {@code @TestConfiguration}, а не {@code @Configuration}: класс лежит вне тестового класса, и обычную конфигурацию
 * подхватило бы сканирование полного контекста в интеграционных тестах — второй DataSource уронил бы их.
 */
@TestConfiguration
@EnableTransactionManagement
@EnableJpaRepositories(basePackageClasses = {GrammarGameTopicRepository.class, PracticeCoinRuleRepository.class})
public class GrammarGamesJpaConfig {

    @Bean
    public DataSource dataSource() {
        return new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2).generateUniqueName(true).build();
    }

    @Bean
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
        LocalContainerEntityManagerFactoryBean factory = new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(dataSource);
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        factory.setPackagesToScan();
        factory.setPersistenceUnitPostProcessors(unit -> {
            unit.addManagedClassName(GrammarGameTopic.class.getName());
            unit.addManagedClassName(GrammarGameMeta.class.getName());
            unit.addManagedClassName(GrammarGameProgress.class.getName());
            unit.addManagedClassName(PracticeCoinRule.class.getName());
        });
        factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "create-drop"));
        return factory;
    }

    @Bean
    public PlatformTransactionManager transactionManager(EntityManagerFactory entityManagerFactory) {
        return new JpaTransactionManager(entityManagerFactory);
    }

    @Bean
    public ObjectMapper objectMapper() {
        return new JacksonConfig().objectMapper();
    }
}
```

- [ ] **Step 2: Падающий тест репозиториев**

`T/modules/grammargames/GrammarGamesRepositoriesTest.java`:

```java
package kz.education.server.modules.grammargames;

import kz.education.server.modules.grammargames.model.GrammarGameProgress;
import kz.education.server.modules.grammargames.model.GrammarGameTopic;
import kz.education.server.modules.grammargames.repository.GrammarGameProgressRepository;
import kz.education.server.modules.grammargames.repository.GrammarGameTopicRepository;
import kz.education.server.modules.practice.coins.PracticeCoinRule;
import kz.education.server.modules.practice.coins.PracticeCoinRuleRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = GrammarGamesJpaConfig.class)
@Transactional
@DisplayName("Грамматика · игры — таблицы")
class GrammarGamesRepositoriesTest {

    @Autowired
    private GrammarGameTopicRepository topics;
    @Autowired
    private GrammarGameProgressRepository progress;
    @Autowired
    private PracticeCoinRuleRepository rules;

    static GrammarGameTopic topic(String id, boolean hidden) {
        GrammarGameTopic row = new GrammarGameTopic();
        row.setId(id);
        row.setLevel(id.substring(0, 2));
        row.setNumber(Integer.parseInt(id.substring(3)));
        row.setTitleRu("Тема " + id);
        row.setHidden(hidden);
        row.setBody("{\"id\":\"" + id + "\"}");
        return row;
    }

    static GrammarGameProgress row(long userId, String topicId, String game) {
        GrammarGameProgress p = new GrammarGameProgress();
        p.setUserId(userId);
        p.setTopicId(topicId);
        p.setGame(game);
        p.setBestStars(1);
        p.setAttempts(1);
        p.setLastPlayedAt(Instant.now());
        return p;
    }

    @Test
    @DisplayName("видимые темы идут по уровню и номеру, скрытых нет")
    void visibleTopicsInOrder() {
        topics.saveAll(List.of(topic("L2-01", false), topic("L1-02", false), topic("L1-01", false), topic("L1-03", true)));

        assertThat(topics.findByHiddenFalseOrderByLevelAscNumberAsc())
                .extracting(GrammarGameTopic::getId).containsExactly("L1-01", "L1-02", "L2-01");
        assertThat(topics.findByIdAndHiddenFalse("L1-03")).isEmpty();
        assertThat(topics.findByLevelOrderByNumberAsc("L1"))
                .extracting(GrammarGameTopic::getId).containsExactly("L1-01", "L1-02", "L1-03");
        assertThat(topics.findAllByOrderByLevelAscNumberAsc()).hasSize(4);
    }

    @Test
    @DisplayName("одна строка прогресса на ученика, тему и игру")
    void progressUniquePerGame() {
        progress.saveAndFlush(row(7L, "L1-01", "pick"));
        progress.saveAndFlush(row(7L, "L1-01", "match"));

        assertThat(progress.findByUserIdAndTopicIdAndGame(7L, "L1-01", "pick")).isPresent();
        assertThat(progress.findByUserId(7L)).hasSize(2);
        assertThatThrownBy(() -> progress.saveAndFlush(row(7L, "L1-01", "pick")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("правила монет читаются по ключу и списком по порядку ключей")
    void coinRules() {
        PracticeCoinRule pick = new PracticeCoinRule();
        pick.setRuleKey("grammar-games.pick");
        pick.setCoins(2);
        PracticeCoinRule boss = new PracticeCoinRule();
        boss.setRuleKey("grammar-games.boss");
        boss.setCoins(5);
        rules.saveAll(List.of(pick, boss));

        assertThat(rules.findById("grammar-games.boss")).get().extracting(PracticeCoinRule::getCoins).isEqualTo(5);
        assertThat(rules.findAllByOrderByRuleKeyAsc())
                .extracting(PracticeCoinRule::getRuleKey).containsExactly("grammar-games.boss", "grammar-games.pick");
    }
}
```

- [ ] **Step 3: Запустить — падает (нет классов)**

Run: `./gradlew test --tests '*GrammarGamesRepositoriesTest'`
Expected: FAIL — `compileTestJava`: «cannot find symbol GrammarGameTopic».

- [ ] **Step 4: Миграция**

`src/main/resources/db/migration/V411__Grammar_games.sql`:

```sql
-- «Практика → Грамматика · игры» (ТЗ v1.1 от 24.10.2026; спека jts-web-app
-- docs/superpowers/specs/2026-10-25-grammar-games-speed-reading-design.md): 125 тем грамматики, у каждой правило и
-- 11–13 игр. Темы заливаются прототипом методиста (html) или zip-ом JSON и правятся по одной в админке. Старая
-- «Грамматика» сайта (507 юнитов A0–C1) — другой раздел, её данные здесь не участвуют. Существующих данных нет.
CREATE TABLE grammar_game_topics (
    -- id темы прототипа (L1-01): на нём прогресс учеников, поэтому не меняется никогда.
    id          VARCHAR(8)   PRIMARY KEY,
    level       VARCHAR(2)   NOT NULL,
    n           INTEGER      NOT NULL,
    -- Название по-русски отдельной колонкой — для списка админки, чтобы не разбирать body.
    title_ru    VARCHAR(200) NOT NULL DEFAULT '',
    -- Скрытая тема ученику не отдаётся. Заливка флаг существующей темы не меняет.
    hidden      BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Тема целиком JSON-ом в форме прототипа. TEXT, как body у practice_reading_texts: читают целиком, по полям не ищут.
    body        TEXT         NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP,
    updated_by  BIGINT REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_grammar_game_topics_level ON grammar_game_topics (level, n);

-- Уровни, программа и общий словарь кликабельных слов — одна строка на весь раздел.
CREATE TABLE grammar_game_meta (
    id          INTEGER PRIMARY KEY CHECK (id = 1),
    levels      TEXT    NOT NULL,
    program     TEXT    NOT NULL,
    gloss       TEXT    NOT NULL,
    updated_at  TIMESTAMP,
    updated_by  BIGINT REFERENCES users (id) ON DELETE SET NULL
);

-- Лучший результат ученика в игре темы. Ошибки ответов не храним (решение заказчика 25.10.2026).
-- topic_id без внешнего ключа: тему можно перезалить, а прогресс ученика терять нельзя.
CREATE TABLE grammar_game_progress (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    topic_id        VARCHAR(8) NOT NULL,
    game            VARCHAR(8) NOT NULL,
    best_stars      INTEGER    NOT NULL DEFAULT 0,
    attempts        INTEGER    NOT NULL DEFAULT 0,
    last_played_at  TIMESTAMP  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_grammar_game_progress UNIQUE (user_id, topic_id, game)
);

-- Сколько монет даёт раздел «Практики» за одно начисление. Потолок 10 — допущение Д1 спеки («до 10 токенов за
-- практику»). Общая таблица: сюда же запишет свою строку «Скорочтение».
CREATE TABLE practice_coin_rules (
    rule_key    VARCHAR(48) PRIMARY KEY,
    coins       INTEGER     NOT NULL CHECK (coins BETWEEN 0 AND 10),
    updated_at  TIMESTAMP,
    updated_by  BIGINT REFERENCES users (id) ON DELETE SET NULL
);

-- Значения по умолчанию — таблица GT_PTS прототипа кабинета (они же GrammarGameStages.DEFAULT_COINS).
INSERT INTO practice_coin_rules (rule_key, coins) VALUES
    ('grammar-games.pick', 2),
    ('grammar-games.match', 2),
    ('grammar-games.sort', 2),
    ('grammar-games.build', 2),
    ('grammar-games.trans', 2),
    ('grammar-games.fix', 2),
    ('grammar-games.place', 2),
    ('grammar-games.type', 3),
    ('grammar-games.dialog', 3),
    ('grammar-games.listen', 2),
    ('grammar-games.race', 2),
    ('grammar-games.catch', 2),
    ('grammar-games.boss', 5);
```

- [ ] **Step 5: Сущности**

`M/modules/grammargames/model/GrammarGameTopic.java`:

```java
package kz.education.server.modules.grammargames.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Тема «Грамматики · игр»: правило и материал игр документом в {@code body} в форме темы прототипа.
 *
 * <p>{@code @DynamicUpdate} — как у ReadingText: правка темы и переключатель видимости меняют каждый своё и не должны
 * затирать друг друга, когда при open-in-view в контексте осталась строка со старым состоянием.
 */
@Entity
@DynamicUpdate
@Data
@Table(name = "grammar_game_topics")
public class GrammarGameTopic {

    /** id темы прототипа (L1-01): на нём прогресс учеников. */
    @Id
    @Column(length = 8)
    private String id;

    @Column(nullable = false, length = 2)
    private String level;

    /** Номер темы в уровне; в базе — колонка {@code n}, как поле темы прототипа. */
    @Column(name = "n", nullable = false)
    private Integer number;

    @Column(name = "title_ru", nullable = false, length = 200)
    private String titleRu = "";

    @Column(nullable = false)
    private Boolean hidden = false;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by")
    private Long updatedBy;
}
```

`M/modules/grammargames/model/GrammarGameMeta.java`:

```java
package kz.education.server.modules.grammargames.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/** Уровни (LEVELS), программа (PROGRAM) и общий словарь (GLOSS) прототипа — одна строка на раздел, JSON-ом. */
@Entity
@DynamicUpdate
@Data
@Table(name = "grammar_game_meta")
public class GrammarGameMeta {

    public static final int SINGLETON_ID = 1;

    @Id
    private Integer id = SINGLETON_ID;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String levels;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String program;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String gloss;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by")
    private Long updatedBy;
}
```

`M/modules/grammargames/model/GrammarGameProgress.java`:

```java
package kz.education.server.modules.grammargames.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;

import java.time.Instant;

/** Лучший результат ученика в одной игре одной темы. Ошибки ответов не храним (решение заказчика 25.10.2026). */
@Entity
@Data
@Table(name = "grammar_game_progress",
        uniqueConstraints = @UniqueConstraint(name = "uq_grammar_game_progress",
                columnNames = {"user_id", "topic_id", "game"}))
public class GrammarGameProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "topic_id", nullable = false, length = 8)
    private String topicId;

    @Column(nullable = false, length = 8)
    private String game;

    @Column(name = "best_stars", nullable = false)
    private Integer bestStars = 0;

    @Column(nullable = false)
    private Integer attempts = 0;

    @Column(name = "last_played_at", nullable = false)
    private Instant lastPlayedAt;
}
```

`M/modules/practice/coins/PracticeCoinRule.java`:

```java
package kz.education.server.modules.practice.coins;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/** Сколько монет даёт одно начисление раздела «Практики» (ключ — «раздел.что», например grammar-games.pick). */
@Entity
@DynamicUpdate
@Data
@Table(name = "practice_coin_rules")
public class PracticeCoinRule {

    @Id
    @Column(name = "rule_key", length = 48)
    private String ruleKey;

    @Column(nullable = false)
    private Integer coins;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by")
    private Long updatedBy;
}
```

- [ ] **Step 6: Репозитории**

`M/modules/grammargames/repository/GrammarGameTopicRepository.java`:

```java
package kz.education.server.modules.grammargames.repository;

import kz.education.server.modules.grammargames.model.GrammarGameTopic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GrammarGameTopicRepository extends JpaRepository<GrammarGameTopic, String> {

    List<GrammarGameTopic> findByHiddenFalseOrderByLevelAscNumberAsc();

    /** Для выгрузки: все, включая скрытые. */
    List<GrammarGameTopic> findAllByOrderByLevelAscNumberAsc();

    List<GrammarGameTopic> findByLevelOrderByNumberAsc(String level);

    Optional<GrammarGameTopic> findByIdAndHiddenFalse(String id);
}
```

`M/modules/grammargames/repository/GrammarGameMetaRepository.java`:

```java
package kz.education.server.modules.grammargames.repository;

import kz.education.server.modules.grammargames.model.GrammarGameMeta;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GrammarGameMetaRepository extends JpaRepository<GrammarGameMeta, Integer> {
}
```

`M/modules/grammargames/repository/GrammarGameProgressRepository.java`:

```java
package kz.education.server.modules.grammargames.repository;

import jakarta.persistence.LockModeType;
import kz.education.server.modules.grammargames.model.GrammarGameProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.List;
import java.util.Optional;

public interface GrammarGameProgressRepository extends JpaRepository<GrammarGameProgress, Long> {

    List<GrammarGameProgress> findByUserId(Long userId);

    /**
     * С блокировкой строки: две одновременные сдачи одной игры (двойной клик, повтор после сбоя сети) иначе обе
     * прочитали бы старый лучший результат и обе начислили бы монеты за один и тот же прирост.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<GrammarGameProgress> findByUserIdAndTopicIdAndGame(Long userId, String topicId, String game);
}
```

`M/modules/practice/coins/PracticeCoinRuleRepository.java`:

```java
package kz.education.server.modules.practice.coins;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PracticeCoinRuleRepository extends JpaRepository<PracticeCoinRule, String> {

    List<PracticeCoinRule> findAllByOrderByRuleKeyAsc();
}
```

- [ ] **Step 7: Тест проходит**

Run: `./gradlew test --tests '*GrammarGamesRepositoriesTest'`
Expected: PASS, 3 теста.

- [ ] **Step 8: Проверка каталога миграций**

Run: `git fetch -q origin develop && bash scripts/check-migrations.sh --base origin/develop`
Expected: без ошибок. Если скрипт говорит, что V411 занят, — переименовать файл в следующий свободный номер и повторить.

- [ ] **Step 9: Commit**

```bash
git add src/main/resources/db/migration/V411__Grammar_games.sql src/main/java/kz/education/server/modules/grammargames src/main/java/kz/education/server/modules/practice/coins src/test/java/kz/education/server/modules/grammargames
git commit -m "feat(grammar-games): таблицы тем, прогресса и правил монет

Темы — строками с телом JSON, как practice_reading_texts; прогресс — лучший
результат в игре темы; practice_coin_rules — общая таблица наград «Практики»
с потолком 10 и сидом GT_PTS прототипа.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Набор игр темы и формула монет — `GrammarGameStages`

**Files:**
- Create: `M/modules/grammargames/service/GrammarGameStages.java`
- Test: `T/modules/grammargames/service/GrammarGameStagesTest.java`

**Interfaces:**
- Produces: `GrammarGameStages.ALL` (`List<String>`, 13 игр), `NAMES_RU` (`Map<String,String>`), `DEFAULT_COINS` (`Map<String,Integer>`), `RULE_PREFIX = "grammar-games."`, `BOSS = "boss"`, `MAX_STARS = 3`, `List<String> stagesOf(JsonNode topic)`, `boolean present(JsonNode topic, String field)`, `int coinsFor(String game, int stars, int limit)`, `int coinsDelta(String game, int oldBest, int newBest, int limit)`.

- [ ] **Step 1: Падающий тест**

`T/modules/grammargames/service/GrammarGameStagesTest.java`:

```java
package kz.education.server.modules.grammargames.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static kz.education.server.modules.grammargames.service.GrammarGameStages.coinsDelta;
import static kz.education.server.modules.grammargames.service.GrammarGameStages.coinsFor;
import static kz.education.server.modules.grammargames.service.GrammarGameStages.stagesOf;
import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("GrammarGameStages — игры темы и монеты")
class GrammarGameStagesTest {

    private static final ObjectMapper M = new ObjectMapper();

    private static ObjectNode topic(String... optional) {
        ObjectNode t = M.createObjectNode();
        for (String f : optional) t.set(f, M.createArrayNode().add("x"));
        return t;
    }

    @Test
    @DisplayName("порядок игр — как stagesOf прототипа, необязательные — по наличию блока")
    void stagesInPrototypeOrder() {
        assertThat(stagesOf(topic("sort", "place", "catch"))).containsExactly(
                "pick", "match", "sort", "build", "trans", "fix", "place", "type", "dialog", "listen", "race", "catch", "boss");
        assertThat(stagesOf(topic("catch"))).containsExactly(
                "pick", "match", "build", "trans", "fix", "type", "dialog", "listen", "race", "catch", "boss");
        assertThat(stagesOf(topic())).hasSize(10).endsWith("race", "boss");
    }

    @Test
    @DisplayName("null и false — блока нет, как if(tp.sort) в прототипе")
    void nullAndFalseAreAbsent() {
        ObjectNode t = topic("catch");
        t.putNull("sort");
        t.put("place", false);
        assertThat(stagesOf(t)).doesNotContain("sort", "place");
    }

    @Test
    @DisplayName("монеты: при звёздах > 0 — min(лимит, звёзды + 1)")
    void coinsForStars() {
        assertThat(coinsFor("pick", 0, 2)).isZero();
        assertThat(coinsFor("pick", 1, 2)).isEqualTo(2);
        assertThat(coinsFor("pick", 3, 2)).isEqualTo(2);
        assertThat(coinsFor("type", 1, 3)).isEqualTo(2);
        assertThat(coinsFor("type", 2, 3)).isEqualTo(3);
        assertThat(coinsFor("pick", 2, 0)).isZero();
    }

    @Test
    @DisplayName("финальный бой при победе даёт весь лимит, поражение — ничего")
    void bossPaysWholeLimit() {
        assertThat(coinsFor("boss", 1, 5)).isEqualTo(5);
        assertThat(coinsFor("boss", 3, 5)).isEqualTo(5);
        assertThat(coinsFor("boss", 0, 5)).isZero();
    }

    @Test
    @DisplayName("начисляется только прирост лучшего результата")
    void deltaOnlyForImprovement() {
        assertThat(coinsDelta("pick", 0, 2, 2)).isEqualTo(2);
        assertThat(coinsDelta("pick", 2, 2, 2)).isZero();
        assertThat(coinsDelta("pick", 2, 3, 2)).isZero();
        assertThat(coinsDelta("type", 1, 3, 3)).isEqualTo(1);
        assertThat(coinsDelta("boss", 1, 3, 5)).isZero();
        assertThat(coinsDelta("boss", 0, 1, 5)).isEqualTo(5);
    }

    @Test
    @DisplayName("у каждой игры есть название и монеты по умолчанию (GT_PTS прототипа)")
    void defaultsCoverEveryGame() {
        assertThat(GrammarGameStages.NAMES_RU.keySet()).isEqualTo(Set.copyOf(GrammarGameStages.ALL));
        assertThat(GrammarGameStages.DEFAULT_COINS.keySet()).isEqualTo(Set.copyOf(GrammarGameStages.ALL));
        assertThat(GrammarGameStages.DEFAULT_COINS).containsEntry("boss", 5).containsEntry("type", 3)
                .containsEntry("dialog", 3).containsEntry("pick", 2);
    }
}
```

- [ ] **Step 2: Запустить — падает**

Run: `./gradlew test --tests '*GrammarGameStagesTest'`
Expected: FAIL — «cannot find symbol GrammarGameStages».

- [ ] **Step 3: Реализация**

`M/modules/grammargames/service/GrammarGameStages.java`:

```java
package kz.education.server.modules.grammargames.service;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Какие игры есть у темы и сколько монет даёт результат. Повторяет {@code stagesOf} движка прототипа: сайт рисует
 * ту же сетку, а бэкенд по этому же правилу отказывает в результате игры, которой у темы нет.
 */
public final class GrammarGameStages {

    /** Все игры в порядке сетки прототипа. */
    public static final List<String> ALL = List.of(
            "pick", "match", "sort", "build", "trans", "fix", "place", "type", "dialog", "listen", "race", "catch", "boss");

    /** Названия — GAMES[*].n.ru прототипа; идут в строку истории монет. */
    public static final Map<String, String> NAMES_RU = Map.ofEntries(
            Map.entry("pick", "Выбери форму"),
            Map.entry("match", "Найди пары"),
            Map.entry("sort", "Разложи по корзинам"),
            Map.entry("build", "Собери предложение"),
            Map.entry("trans", "Трансформер"),
            Map.entry("fix", "Найди ошибку"),
            Map.entry("place", "Где это?"),
            Map.entry("type", "Впиши сам"),
            Map.entry("dialog", "Диалог"),
            Map.entry("listen", "Слушай и выбирай"),
            Map.entry("race", "Гонка: верно или нет"),
            Map.entry("catch", "Лови правильное"),
            Map.entry("boss", "Финальный бой"));

    /** GT_PTS прототипа кабинета; ими же засеяна practice_coin_rules — запасное значение, если строки нет. */
    public static final Map<String, Integer> DEFAULT_COINS = Map.ofEntries(
            Map.entry("pick", 2), Map.entry("match", 2), Map.entry("sort", 2), Map.entry("build", 2),
            Map.entry("trans", 2), Map.entry("fix", 2), Map.entry("place", 2), Map.entry("type", 3),
            Map.entry("dialog", 3), Map.entry("listen", 2), Map.entry("race", 2), Map.entry("catch", 2),
            Map.entry("boss", 5));

    public static final String RULE_PREFIX = "grammar-games.";
    public static final String BOSS = "boss";
    public static final int MAX_STARS = 3;

    private GrammarGameStages() {
    }

    public static List<String> stagesOf(JsonNode topic) {
        List<String> stages = new ArrayList<>(List.of("pick", "match"));
        if (present(topic, "sort")) stages.add("sort");
        stages.addAll(List.of("build", "trans", "fix"));
        if (present(topic, "place")) stages.add("place");
        stages.addAll(List.of("type", "dialog", "listen", "race"));
        if (present(topic, "catch")) stages.add("catch");
        stages.add(BOSS);
        return List.copyOf(stages);
    }

    /** Как {@code if (tp.sort)} в JS: поле есть, не null и не false. Пустые блоки отсекает проверка темы. */
    public static boolean present(JsonNode topic, String field) {
        JsonNode value = topic == null ? null : topic.get(field);
        return value != null && !value.isNull() && !(value.isBoolean() && !value.asBoolean());
    }

    /** Формула ТЗ §3.2: при звёздах > 0 — min(лимит, звёзды + 1); финальный бой при победе — весь лимит. */
    public static int coinsFor(String game, int stars, int limit) {
        if (stars <= 0 || limit <= 0) return 0;
        if (BOSS.equals(game)) return limit;
        return Math.min(limit, stars + 1);
    }

    /** Только прирост (допущение Д2): повтор без улучшения монет не даёт, иначе раздел — бесконечная ферма. */
    public static int coinsDelta(String game, int oldBest, int newBest, int limit) {
        return Math.max(0, coinsFor(game, newBest, limit) - coinsFor(game, oldBest, limit));
    }
}
```

- [ ] **Step 4: Тест проходит**

Run: `./gradlew test --tests '*GrammarGameStagesTest'`
Expected: PASS, 6 тестов.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/kz/education/server/modules/grammargames/service/GrammarGameStages.java src/test/java/kz/education/server/modules/grammargames/service/GrammarGameStagesTest.java
git commit -m "feat(grammar-games): набор игр темы и формула монет

stagesOf — как у движка прототипа; монеты — min(лимит, звёзды+1), бой —
весь лимит, начисляется только прирост лучшего результата.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Проверка темы — `GrammarTopicValidator`

**Files:**
- Create: `M/modules/grammargames/service/GrammarGamesBundle.java`
- Create: `M/modules/grammargames/service/GrammarTopicValidator.java`
- Test: `T/modules/grammargames/service/GrammarGamesFixtures.java`, `T/modules/grammargames/service/GrammarTopicValidatorTest.java`

**Interfaces:**
- Consumes: `GrammarGameStages.present(JsonNode, String)` (Task 2).
- Produces: `record GrammarGamesBundle(ArrayNode levels, ArrayNode program, ObjectNode gloss, List<ObjectNode> topics)`; `GrammarTopicValidator.problems(JsonNode topic) → List<String>`, `problems(GrammarGamesBundle) → List<String>` (не больше `MAX_PROBLEMS` строк + «…и ещё N»), `warnings(GrammarGamesBundle) → List<String>`, `MAX_PROBLEMS = 50`, `Pattern LEVEL` (`^L[1-5]$`); тестовые `GrammarGamesFixtures.topic(String id)`, `withPlace(ObjectNode)`, `bundle(ObjectNode...)`, `html(GrammarGamesBundle)`, `item(ObjectNode, String, int)`.

- [ ] **Step 1: Фикстуры**

`T/modules/grammargames/service/GrammarGamesFixtures.java`:

```java
package kz.education.server.modules.grammargames.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.ArrayList;
import java.util.List;

/** Минимальная тема, проходящая все правила проверки, и сборка файлов прототипа из неё. */
final class GrammarGamesFixtures {

    static final ObjectMapper M = new ObjectMapper();

    private GrammarGamesFixtures() {
    }

    static ObjectNode tri(String text) {
        ObjectNode o = M.createObjectNode();
        o.put("ru", text + " ru");
        o.put("kk", text + " kk");
        o.put("en", text + " en");
        return o;
    }

    static ArrayNode arr(String... values) {
        ArrayNode a = M.createArrayNode();
        for (String v : values) a.add(v);
        return a;
    }

    /** Элемент массива темы для правки в тесте: item(t, "gap", 0). */
    static ObjectNode item(ObjectNode topic, String field, int index) {
        return (ObjectNode) topic.get(field).get(index);
    }

    static ObjectNode topic(String id) {
        ObjectNode t = M.createObjectNode();
        t.put("id", id);
        t.put("lv", id.substring(0, 2));
        t.put("n", Integer.parseInt(id.substring(3)));
        t.put("icon", "👋");
        t.put("color", "#874BF6");
        t.set("title", tri("Тема " + id));
        t.set("sub", tri("sub"));
        t.set("intro", tri("intro"));

        ObjectNode card = M.createObjectNode();
        card.set("h", tri("h"));
        ArrayNode bricks = M.createArrayNode();
        bricks.add(arr("s", "I"));
        bricks.add(arr("v", "work"));
        card.set("f", bricks);
        card.set("more", tri("more"));
        card.set("ex", arr("I work.", "You work."));
        t.set("cards", M.createArrayNode().add(card));

        ObjectNode table = M.createObjectNode();
        table.set("cap", tri("cap"));
        table.set("head", arr("", "+"));
        ArrayNode rows = M.createArrayNode();
        rows.add(arr("I", "I work"));
        rows.add(arr("he", "he works"));
        table.set("rows", rows);
        t.set("tables", M.createArrayNode().add(table));

        ObjectNode mistake = M.createObjectNode();
        mistake.put("bad", "I works.");
        mistake.put("good", "I work.");
        mistake.set("why", tri("why"));
        t.set("mistakes", M.createArrayNode().add(mistake));

        ArrayNode gap = M.createArrayNode();
        for (int i = 0; i < 12; i++) {
            ObjectNode g = M.createObjectNode();
            g.put("s", "I ___ every day " + i + ".");
            g.put("a", "work");
            g.set("o", arr("works", "working"));
            g.put("pic", "🎒");
            gap.add(g);
        }
        t.set("gap", gap);

        ArrayNode order = M.createArrayNode();
        for (int i = 0; i < 10; i++) {
            ObjectNode o = M.createObjectNode();
            o.put("s", "I work every day " + i + ".");
            o.put("x", "works");
            o.put("pic", "🎂");
            order.add(o);
        }
        t.set("order", order);

        ArrayNode fix = M.createArrayNode();
        for (int i = 0; i < 8; i++) {
            ObjectNode f = M.createObjectNode();
            f.put("s", "She work every day.");
            f.put("w", 1);
            f.put("c", "works");
            f.set("o", arr("works", "working", "worked"));
            fix.add(f);
        }
        t.set("fix", fix);

        ObjectNode pairs = M.createObjectNode();
        pairs.set("task", tri("pairs"));
        ArrayNode list = M.createArrayNode();
        for (int i = 0; i < 6; i++) list.add(arr("I" + i, "work" + i));
        pairs.set("list", list);
        t.set("pairs", pairs);

        ArrayNode trans = M.createArrayNode();
        for (int i = 0; i < 8; i++) {
            ObjectNode r = M.createObjectNode();
            r.put("from", "I work.");
            r.set("task", tri("negative"));
            r.put("to", "I don't work.");
            r.set("o", arr("I not work.", "I doesn't work."));
            trans.add(r);
        }
        t.set("trans", trans);

        ObjectNode dialog = M.createObjectNode();
        dialog.set("title", tri("dialog"));
        ArrayNode lines = M.createArrayNode();
        for (int i = 0; i < 8; i++) {
            ObjectNode line = M.createObjectNode();
            line.put("who", i % 2 == 0 ? "A" : "B");
            if (i < 5) {
                line.put("t", "I ___ here " + i + ".");
                line.put("a", "work");
                line.set("o", arr("works", "working"));
            } else {
                line.put("t", "OK " + i + ".");
            }
            lines.add(line);
        }
        dialog.set("lines", lines);
        t.set("dialog", dialog);

        ObjectNode cat = M.createObjectNode();
        cat.set("task", tri("catch"));
        cat.set("right", arr("I work"));
        cat.set("wrong", arr("I works"));
        t.set("catch", cat);

        ObjectNode sort = M.createObjectNode();
        sort.set("task", tri("sort"));
        sort.set("cats", M.createArrayNode().add(tri("am")).add(tri("is")));
        ArrayNode items = M.createArrayNode();
        items.add(M.createArrayNode().add("I").add(0));
        items.add(M.createArrayNode().add("he").add(1));
        sort.set("items", items);
        t.set("sort", sort);
        return t;
    }

    static ObjectNode withPlace(ObjectNode topic) {
        ObjectNode p = M.createObjectNode();
        p.put("item", "🐱");
        p.put("s", "The cat is under the box.");
        p.put("z", "under");
        topic.set("place", M.createArrayNode().add(p));
        return topic;
    }

    static GrammarGamesBundle bundle(ObjectNode... topics) {
        ArrayNode levels = M.createArrayNode();
        for (int i = 1; i <= 5; i++) {
            ObjectNode l = M.createObjectNode();
            l.put("id", "L" + i);
            l.put("name", "Level " + i);
            levels.add(l);
        }
        ArrayNode program = M.createArrayNode();
        List<ObjectNode> list = new ArrayList<>();
        for (ObjectNode t : topics) {
            ObjectNode p = M.createObjectNode();
            p.put("id", t.path("id").asText());
            p.put("lv", t.path("lv").asText());
            p.put("n", t.path("n").asInt());
            p.put("t", t.path("title").path("ru").asText());
            program.add(p);
            list.add(t);
        }
        ObjectNode gloss = M.createObjectNode();
        gloss.set("work", arr("работать", "жұмыс істеу"));
        return new GrammarGamesBundle(levels, program, gloss, list);
    }

    /** Файл того же вида, что прототип: по строке `const X=…;` на блок внутри одного скрипта. */
    static String html(GrammarGamesBundle b) {
        ArrayNode topics = M.createArrayNode();
        b.topics().forEach(topics::add);
        return "<!doctype html><html><body><script>\n"
                + "const LEVELS=" + b.levels() + ";\n"
                + "const PROGRAM=" + b.program() + ";\n"
                + "const TOPICS=" + topics + ";\n"
                + "const GLOSS=" + b.gloss() + ";\n"
                + "function go(){}\n"
                + "</script></body></html>";
    }
}
```

- [ ] **Step 2: Падающий тест проверки**

`T/modules/grammargames/service/GrammarTopicValidatorTest.java`:

```java
package kz.education.server.modules.grammargames.service;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.function.Consumer;

import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.M;
import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.arr;
import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.bundle;
import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.item;
import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.topic;
import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.withPlace;
import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("GrammarTopicValidator — правила темы")
class GrammarTopicValidatorTest {

    private static List<String> after(Consumer<ObjectNode> change) {
        ObjectNode t = topic("L1-01");
        change.accept(t);
        return GrammarTopicValidator.problems(t);
    }

    private static void problem(Consumer<ObjectNode> change, String fragment) {
        assertThat(after(change)).anySatisfy(p -> assertThat(p).contains(fragment));
    }

    @Test
    @DisplayName("тема фикстуры и тема с «Где это?» проходят")
    void validTopics() {
        assertThat(GrammarTopicValidator.problems(topic("L1-01"))).isEmpty();
        assertThat(GrammarTopicValidator.problems(withPlace(topic("L1-10")))).isEmpty();
    }

    @Test
    @DisplayName("строка проблемы — «тема · поле · что не так», одна на нарушение")
    void problemFormat() {
        assertThat(after(t -> item(t, "gap", 3).put("s", "I work.")))
                .containsExactly("L1-01 · gap[3].s · нужен ровно один ___");
    }

    @Test
    @DisplayName("шапка: id, lv, n, цвет, тексты на трёх языках")
    void head() {
        problem(t -> t.put("id", "L6-01"), "id · нужен вид L1-01");
        problem(t -> t.put("lv", "L2"), "lv · должен совпадать с id (L1)");
        problem(t -> t.put("n", 2), "n · должен совпадать с номером в id (1)");
        problem(t -> t.put("color", "red"), "color · нужен цвет вида #9047FF");
        problem(t -> ((ObjectNode) t.get("title")).remove("kk"), "title.kk · нужен непустой текст");
        problem(t -> t.put("icon", " "), "icon · нужен непустой текст");
    }

    @Test
    @DisplayName("правило: кирпичики, таблицы, ошибки")
    void rule() {
        problem(t -> ((ArrayNode) item(t, "cards", 0).get("f")).set(0, arr("x", "I")), "cards[0].f[0] · нужна пара [код, текст]");
        problem(t -> ((ArrayNode) item(t, "tables", 0).get("rows")).set(1, arr("he")), "tables[0].rows[1] · ячеек должно быть столько же, сколько в head (2)");
        problem(t -> t.set("mistakes", M.createArrayNode()), "mistakes · нужно не меньше 1, сейчас 0");
        problem(t -> t.set("cards", M.createObjectNode()), "cards · нужен массив");
    }

    @Test
    @DisplayName("«Выбери форму»: не меньше 12, один пропуск, ответ не среди неверных, ровно два неверных")
    void gap() {
        problem(t -> ((ArrayNode) t.get("gap")).remove(0), "gap · нужно не меньше 12, сейчас 11");
        problem(t -> item(t, "gap", 3).put("s", "I work."), "gap[3].s · нужен ровно один ___");
        problem(t -> item(t, "gap", 0).set("o", arr("work", "working")), "gap[0].o · верный ответ не должен быть среди неверных");
        problem(t -> item(t, "gap", 0).set("o", arr("works", "working", "worked")), "gap[0].o · нужно ровно 2 непустых строки");
        problem(t -> item(t, "gap", 0).remove("pic"), "gap[0].pic · нужен непустой текст");
    }

    @Test
    @DisplayName("«Собери предложение», «Найди ошибку», «Трансформер»")
    void orderFixTrans() {
        problem(t -> item(t, "order", 0).put("x", "work"), "order[0].x · ловушка не должна быть словом предложения");
        problem(t -> item(t, "fix", 0).put("w", 4), "fix[0].w · номер неверного слова вне предложения");
        problem(t -> item(t, "fix", 0).put("c", "is"), "fix[0].o · среди вариантов нет исправления c");
        problem(t -> item(t, "trans", 0).set("o", arr("I don't work.", "I not work.")), "trans[0].o · верный ответ не должен быть среди неверных");
        problem(t -> ((ArrayNode) t.get("trans")).remove(0), "trans · нужно не меньше 8, сейчас 7");
    }

    @Test
    @DisplayName("пары: от 6 до 8")
    void pairs() {
        problem(t -> ((ArrayNode) t.get("pairs").get("list")).remove(0), "pairs.list · нужно не меньше 6, сейчас 5");
        problem(t -> {
            ArrayNode list = (ArrayNode) t.get("pairs").get("list");
            list.add(arr("a", "b")).add(arr("c", "d")).add(arr("e", "f"));
        }, "pairs.list · не больше 8 пар");
    }

    @Test
    @DisplayName("диалог: 8 реплик, из них 5 с пропуском, говорят A и B")
    void dialog() {
        problem(t -> ((ArrayNode) t.get("dialog").get("lines")).remove(7), "dialog.lines · нужно не меньше 8, сейчас 7");
        problem(t -> {
            ObjectNode line = (ObjectNode) t.get("dialog").get("lines").get(0);
            line.remove("a");
            line.remove("o");
        }, "dialog.lines · реплик с пропуском нужно не меньше 5, сейчас 4");
        problem(t -> ((ObjectNode) t.get("dialog").get("lines").get(1)).put("who", "C"), "dialog.lines[1].who · A или B");
        problem(t -> ((ObjectNode) t.get("dialog").get("lines").get(0)).put("t", "I work."), "dialog.lines[0].t · в реплике с ответом нужен ___");
    }

    @Test
    @DisplayName("необязательные блоки проверяются, только если есть")
    void optionalBlocks() {
        problem(t -> ((ArrayNode) t.get("catch").get("right")).removeAll(), "catch.right · нужно не меньше 1, сейчас 0");
        problem(t -> ((ArrayNode) t.get("sort").get("items")).set(0, M.createArrayNode().add("I").add(5)), "sort.items[0] · нужна пара [слово, номер корзины]");
        assertThat(after(t -> t.remove("sort"))).isEmpty();
        assertThat(GrammarTopicValidator.problems(topic("L1-01").set("place", M.createArrayNode())))
                .anySatisfy(p -> assertThat(p).contains("place · нужно не меньше 1, сейчас 0"));
        ObjectNode placed = withPlace(topic("L1-10"));
        item(placed, "place", 0).put("z", "over");
        assertThat(GrammarTopicValidator.problems(placed))
                .anySatisfy(p -> assertThat(p).contains("place[0].z · зона — on, in, under, next, between, front или behind"));
    }

    @Test
    @DisplayName("набор: уровни, программа, словарь, повтор id, уровень темы")
    void bundleRules() {
        assertThat(GrammarTopicValidator.problems(bundle(topic("L1-01"), topic("L1-02")))).isEmpty();
        assertThat(GrammarTopicValidator.problems(bundle(topic("L1-01"), topic("L1-01"))))
                .anySatisfy(p -> assertThat(p).contains("TOPICS · тема L1-01 повторяется"));
        GrammarGamesBundle noLevel = bundle(topic("L1-01"));
        noLevel.levels().remove(0);
        assertThat(GrammarTopicValidator.problems(noLevel)).anySatisfy(p -> assertThat(p).contains("уровня L1 нет в LEVELS"));
        GrammarGamesBundle badGloss = bundle(topic("L1-01"));
        badGloss.gloss().put("work", "работать");
        assertThat(GrammarTopicValidator.problems(badGloss)).anySatisfy(p -> assertThat(p).contains("GLOSS.work · нужна пара [ru, kk]"));
        assertThat(GrammarTopicValidator.problems(bundle())).anySatisfy(p -> assertThat(p).contains("TOPICS · нет тем"));
    }

    @Test
    @DisplayName("ошибок больше 50 — список обрезается строкой «…и ещё N»")
    void capped() {
        ObjectNode[] many = new ObjectNode[30];
        for (int i = 0; i < many.length; i++) {
            many[i] = topic(String.format("L1-%02d", i + 1));
            many[i].put("color", "red");
            many[i].put("icon", "");
        }
        List<String> problems = GrammarTopicValidator.problems(bundle(many));
        assertThat(problems).hasSize(GrammarTopicValidator.MAX_PROBLEMS + 1);
        assertThat(problems.get(problems.size() - 1)).isEqualTo("…и ещё 10");
    }

    @Test
    @DisplayName("предупреждение: тема из программы, которой нет в файле")
    void warnings() {
        GrammarGamesBundle b = bundle(topic("L1-01"));
        ObjectNode extra = M.createObjectNode();
        extra.put("id", "L1-02");
        b.program().add(extra);
        assertThat(GrammarTopicValidator.warnings(b)).containsExactly("В программе есть L1-02, а темы в файле нет");
    }
}
```

- [ ] **Step 3: Запустить — падает**

Run: `./gradlew test --tests '*GrammarTopicValidatorTest'`
Expected: FAIL — «cannot find symbol GrammarGamesBundle / GrammarTopicValidator».

- [ ] **Step 4: Набор файла**

`M/modules/grammargames/service/GrammarGamesBundle.java`:

```java
package kz.education.server.modules.grammargames.service;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.List;

/** Разобранный файл раздела: LEVELS, PROGRAM, GLOSS и темы в форме прототипа (html или zip — одинаково). */
public record GrammarGamesBundle(ArrayNode levels, ArrayNode program, ObjectNode gloss, List<ObjectNode> topics) {
}
```

- [ ] **Step 5: Реализация проверки**

`M/modules/grammargames/service/GrammarTopicValidator.java`:

```java
package kz.education.server.modules.grammargames.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Правила темы «Грамматики · игр» (спека A1, п. 2). Валидатора методиста (tools/validate.js из ТЗ) у нас нет —
 * правила выведены из 125 тем прототипа, все темы их проходят (допущение Д17). Каждое правило — то, без чего
 * движок прототипа ломает игру: «Гонка» берёт o[0..1] у «Выбери форму», «Найди ошибку» подсвечивает слово w и т.п.
 *
 * <p>Строка проблемы — «тема · поле · что не так»: её читает методист в админке.
 */
public final class GrammarTopicValidator {

    public static final int MAX_PROBLEMS = 50;
    public static final Pattern LEVEL = Pattern.compile("^L[1-5]$");
    static final Pattern ID = Pattern.compile("^L([1-5])-(\\d{2})$");
    static final Pattern COLOR = Pattern.compile("^#[0-9A-Fa-f]{6}$");
    static final List<String> LANGS = List.of("ru", "kk", "en");
    static final Set<String> BRICKS = Set.of("s", "v", "a", "n", "q", "o");
    static final Set<String> ZONES = Set.of("on", "in", "under", "next", "between", "front", "behind");
    static final Set<String> SPEAKERS = Set.of("A", "B");
    static final String BLANK = "___";
    static final int MIN_GAP = 12;
    static final int MIN_ORDER = 10;
    static final int MIN_FIX = 8;
    static final int MIN_TRANS = 8;
    static final int MIN_PAIRS = 6;
    static final int MAX_PAIRS = 8;
    static final int MIN_DIALOG_LINES = 8;
    static final int MIN_DIALOG_GAPS = 5;

    private GrammarTopicValidator() {
    }

    public static List<String> problems(JsonNode topic) {
        List<String> out = new ArrayList<>();
        String id = topic != null && topic.path("id").isTextual() ? topic.path("id").asText() : "?";
        Check c = new Check(id, out);
        if (topic == null || !topic.isObject()) {
            c.add("тема", "нужен JSON-объект");
            return out;
        }
        head(topic, c);
        rule(topic, c);
        choiceGames(topic, c);
        talkGames(topic, c);
        optionalGames(topic, c);
        return out;
    }

    public static List<String> problems(GrammarGamesBundle bundle) {
        List<String> out = new ArrayList<>();
        Check c = new Check("набор", out);
        Set<String> levels = levels(bundle.levels(), c);
        if (bundle.program() == null) c.add("PROGRAM", "нет программы");
        else for (int i = 0; i < bundle.program().size(); i++) {
            if (!ID.matcher(bundle.program().get(i).path("id").asText("")).matches()) {
                c.add("PROGRAM[" + i + "].id", "нужен вид L1-01");
            }
        }
        gloss(bundle.gloss(), c);
        if (bundle.topics() == null || bundle.topics().isEmpty()) {
            c.add("TOPICS", "нет тем");
            return capped(out);
        }
        Set<String> seen = new HashSet<>();
        for (JsonNode topic : bundle.topics()) {
            String id = topic.path("id").asText("?");
            if (!seen.add(id)) c.add("TOPICS", "тема " + id + " повторяется");
            out.addAll(problems(topic));
            String lv = topic.path("lv").asText("");
            if (!levels.isEmpty() && LEVEL.matcher(lv).matches() && !levels.contains(lv)) {
                c.add(id, "уровня " + lv + " нет в LEVELS");
            }
        }
        return capped(out);
    }

    public static List<String> warnings(GrammarGamesBundle bundle) {
        Set<String> ids = new HashSet<>();
        bundle.topics().forEach(t -> ids.add(t.path("id").asText()));
        List<String> out = new ArrayList<>();
        if (bundle.program() != null) bundle.program().forEach(p -> {
            String id = p.path("id").asText("");
            if (!ids.contains(id)) out.add("В программе есть " + id + ", а темы в файле нет");
        });
        return capped(out);
    }

    static List<String> capped(List<String> all) {
        if (all.size() <= MAX_PROBLEMS) return all;
        List<String> head = new ArrayList<>(all.subList(0, MAX_PROBLEMS));
        head.add("…и ещё " + (all.size() - MAX_PROBLEMS));
        return head;
    }

    // ───────────── тема ─────────────

    private static void head(JsonNode t, Check c) {
        Matcher m = ID.matcher(t.path("id").asText(""));
        if (!m.matches()) {
            c.add("id", "нужен вид L1-01 (уровни L1–L5)");
        } else {
            String lv = "L" + m.group(1);
            int n = Integer.parseInt(m.group(2));
            if (!lv.equals(t.path("lv").asText())) c.add("lv", "должен совпадать с id (" + lv + ")");
            if (!t.path("n").isInt() || t.path("n").asInt() != n) c.add("n", "должен совпадать с номером в id (" + n + ")");
        }
        c.text(t.get("icon"), "icon");
        if (!COLOR.matcher(t.path("color").asText("")).matches()) c.add("color", "нужен цвет вида #9047FF");
        for (String field : List.of("title", "sub", "intro")) c.tri(t.get(field), field);
    }

    private static void rule(JsonNode t, Check c) {
        ArrayNode cards = c.array(t.get("cards"), "cards", 1);
        if (cards != null) for (int i = 0; i < cards.size(); i++) {
            JsonNode card = cards.get(i);
            String p = "cards[" + i + "]";
            c.tri(card.get("h"), p + ".h");
            c.tri(card.get("more"), p + ".more");
            ArrayNode bricks = c.array(card.get("f"), p + ".f", 1);
            if (bricks != null) for (int j = 0; j < bricks.size(); j++) {
                JsonNode b = bricks.get(j);
                boolean ok = b.isArray() && b.size() == 2 && BRICKS.contains(b.path(0).asText())
                        && b.path(1).isTextual() && !b.path(1).asText().isBlank();
                if (!ok) c.add(p + ".f[" + j + "]", "нужна пара [код, текст], код — s, v, a, n, q или o");
            }
            ArrayNode ex = c.array(card.get("ex"), p + ".ex", 1);
            if (ex != null) for (int j = 0; j < ex.size(); j++) c.text(ex.get(j), p + ".ex[" + j + "]");
        }
        ArrayNode tables = c.array(t.get("tables"), "tables", 0);
        if (tables != null) for (int i = 0; i < tables.size(); i++) {
            JsonNode table = tables.get(i);
            String p = "tables[" + i + "]";
            c.tri(table.get("cap"), p + ".cap");
            ArrayNode head = c.array(table.get("head"), p + ".head", 1);
            ArrayNode rows = c.array(table.get("rows"), p + ".rows", 1);
            if (head != null && rows != null) for (int j = 0; j < rows.size(); j++) {
                JsonNode row = rows.get(j);
                if (!row.isArray() || row.size() != head.size()) {
                    c.add(p + ".rows[" + j + "]", "ячеек должно быть столько же, сколько в head (" + head.size() + ")");
                }
            }
        }
        ArrayNode mistakes = c.array(t.get("mistakes"), "mistakes", 1);
        if (mistakes != null) for (int i = 0; i < mistakes.size(); i++) {
            JsonNode m = mistakes.get(i);
            String p = "mistakes[" + i + "]";
            c.text(m.get("bad"), p + ".bad");
            c.text(m.get("good"), p + ".good");
            c.tri(m.get("why"), p + ".why");
        }
    }

    private static void choiceGames(JsonNode t, Check c) {
        ArrayNode gap = c.array(t.get("gap"), "gap", MIN_GAP);
        if (gap != null) for (int i = 0; i < gap.size(); i++) {
            JsonNode g = gap.get(i);
            String p = "gap[" + i + "]";
            if (c.text(g.get("s"), p + ".s") && blanks(g.get("s").asText()) != 1) c.add(p + ".s", "нужен ровно один ___");
            boolean answer = c.text(g.get("a"), p + ".a");
            List<String> wrong = c.texts(g.get("o"), p + ".o", 2);
            if (answer && wrong != null && wrong.contains(g.get("a").asText())) {
                c.add(p + ".o", "верный ответ не должен быть среди неверных");
            }
            c.text(g.get("pic"), p + ".pic");
        }
        ArrayNode order = c.array(t.get("order"), "order", MIN_ORDER);
        if (order != null) for (int i = 0; i < order.size(); i++) {
            JsonNode o = order.get(i);
            String p = "order[" + i + "]";
            boolean s = c.text(o.get("s"), p + ".s");
            if (c.text(o.get("x"), p + ".x") && s
                    && Arrays.asList(o.get("s").asText().replaceAll("[.,!?]", "").split("\\s+")).contains(o.get("x").asText())) {
                c.add(p + ".x", "ловушка не должна быть словом предложения");
            }
            c.text(o.get("pic"), p + ".pic");
        }
        ArrayNode fix = c.array(t.get("fix"), "fix", MIN_FIX);
        if (fix != null) for (int i = 0; i < fix.size(); i++) {
            JsonNode f = fix.get(i);
            String p = "fix[" + i + "]";
            if (c.text(f.get("s"), p + ".s")) {
                int words = f.get("s").asText().trim().split("\\s+").length;
                if (!f.path("w").isInt() || f.path("w").asInt() < 0 || f.path("w").asInt() >= words) {
                    c.add(p + ".w", "номер неверного слова вне предложения");
                }
            }
            boolean correct = c.text(f.get("c"), p + ".c");
            List<String> options = c.texts(f.get("o"), p + ".o", 3);
            if (correct && options != null && !options.contains(f.get("c").asText())) {
                c.add(p + ".o", "среди вариантов нет исправления c");
            }
        }
    }

    private static void talkGames(JsonNode t, Check c) {
        JsonNode pairs = t.get("pairs");
        if (pairs == null || !pairs.isObject()) {
            c.add("pairs", "нужен объект {task, list}");
        } else {
            c.tri(pairs.get("task"), "pairs.task");
            ArrayNode list = c.array(pairs.get("list"), "pairs.list", MIN_PAIRS);
            if (list != null) {
                if (list.size() > MAX_PAIRS) c.add("pairs.list", "не больше " + MAX_PAIRS + " пар");
                for (int i = 0; i < list.size(); i++) {
                    JsonNode pair = list.get(i);
                    boolean ok = pair.isArray() && pair.size() == 2 && nonBlank(pair.get(0)) && nonBlank(pair.get(1));
                    if (!ok) c.add("pairs.list[" + i + "]", "нужна пара двух непустых строк");
                }
            }
        }
        ArrayNode trans = c.array(t.get("trans"), "trans", MIN_TRANS);
        if (trans != null) for (int i = 0; i < trans.size(); i++) {
            JsonNode r = trans.get(i);
            String p = "trans[" + i + "]";
            c.text(r.get("from"), p + ".from");
            c.tri(r.get("task"), p + ".task");
            boolean to = c.text(r.get("to"), p + ".to");
            List<String> wrong = c.texts(r.get("o"), p + ".o", 2);
            if (to && wrong != null && wrong.contains(r.get("to").asText())) {
                c.add(p + ".o", "верный ответ не должен быть среди неверных");
            }
        }
        dialog(t.get("dialog"), c);
    }

    private static void dialog(JsonNode dialog, Check c) {
        if (dialog == null || !dialog.isObject()) {
            c.add("dialog", "нужен объект {title, lines}");
            return;
        }
        c.tri(dialog.get("title"), "dialog.title");
        ArrayNode lines = c.array(dialog.get("lines"), "dialog.lines", MIN_DIALOG_LINES);
        if (lines == null) return;
        int gaps = 0;
        for (int i = 0; i < lines.size(); i++) {
            JsonNode line = lines.get(i);
            String p = "dialog.lines[" + i + "]";
            if (!SPEAKERS.contains(line.path("who").asText())) c.add(p + ".who", "A или B");
            boolean text = c.text(line.get("t"), p + ".t");
            if (!line.has("a")) continue;
            gaps++;
            boolean answer = c.text(line.get("a"), p + ".a");
            if (text && !line.get("t").asText().contains(BLANK)) c.add(p + ".t", "в реплике с ответом нужен ___");
            List<String> wrong = c.texts(line.get("o"), p + ".o", 2);
            if (answer && wrong != null && wrong.contains(line.get("a").asText())) {
                c.add(p + ".o", "верный ответ не должен быть среди неверных");
            }
        }
        if (gaps < MIN_DIALOG_GAPS) {
            c.add("dialog.lines", "реплик с пропуском нужно не меньше " + MIN_DIALOG_GAPS + ", сейчас " + gaps);
        }
    }

    private static void optionalGames(JsonNode t, Check c) {
        JsonNode cat = t.get("catch");
        if (cat == null || !cat.isObject()) {
            c.add("catch", "нужен объект {task, right, wrong}");
        } else {
            c.tri(cat.get("task"), "catch.task");
            c.textsAtLeast(cat.get("right"), "catch.right", 1);
            c.textsAtLeast(cat.get("wrong"), "catch.wrong", 1);
        }
        if (GrammarGameStages.present(t, "sort")) sort(t.get("sort"), c);
        if (GrammarGameStages.present(t, "place")) {
            ArrayNode place = c.array(t.get("place"), "place", 1);
            if (place != null) for (int i = 0; i < place.size(); i++) {
                JsonNode p = place.get(i);
                c.text(p.get("item"), "place[" + i + "].item");
                c.text(p.get("s"), "place[" + i + "].s");
                if (!ZONES.contains(p.path("z").asText())) {
                    c.add("place[" + i + "].z", "зона — on, in, under, next, between, front или behind");
                }
            }
        }
    }

    private static void sort(JsonNode sort, Check c) {
        if (!sort.isObject()) {
            c.add("sort", "нужен объект {task, cats, items}");
            return;
        }
        c.tri(sort.get("task"), "sort.task");
        ArrayNode cats = c.array(sort.get("cats"), "sort.cats", 2);
        if (cats != null) for (int i = 0; i < cats.size(); i++) c.tri(cats.get(i), "sort.cats[" + i + "]");
        ArrayNode items = c.array(sort.get("items"), "sort.items", 1);
        if (items != null) for (int i = 0; i < items.size(); i++) {
            JsonNode it = items.get(i);
            boolean ok = it.isArray() && it.size() == 2 && nonBlank(it.get(0)) && it.get(1).isInt()
                    && it.get(1).asInt() >= 0 && (cats == null || it.get(1).asInt() < cats.size());
            if (!ok) c.add("sort.items[" + i + "]", "нужна пара [слово, номер корзины]");
        }
    }

    // ───────────── набор ─────────────

    private static Set<String> levels(ArrayNode levels, Check c) {
        Set<String> ids = new HashSet<>();
        if (levels == null || levels.isEmpty()) {
            c.add("LEVELS", "нет уровней");
            return ids;
        }
        for (int i = 0; i < levels.size(); i++) {
            String id = levels.get(i).path("id").asText("");
            if (!LEVEL.matcher(id).matches()) c.add("LEVELS[" + i + "].id", "нужен L1–L5");
            else if (!ids.add(id)) c.add("LEVELS[" + i + "].id", "уровень " + id + " повторяется");
        }
        return ids;
    }

    private static void gloss(JsonNode gloss, Check c) {
        if (gloss == null || !gloss.isObject()) {
            c.add("GLOSS", "нет словаря");
            return;
        }
        Iterator<Map.Entry<String, JsonNode>> it = gloss.fields();
        while (it.hasNext()) {
            Map.Entry<String, JsonNode> e = it.next();
            JsonNode v = e.getValue();
            if (!v.isArray() || v.size() != 2 || !v.get(0).isTextual() || !v.get(1).isTextual()) {
                c.add("GLOSS." + e.getKey(), "нужна пара [ru, kk]");
            }
        }
    }

    // ───────────── помощники ─────────────

    private static int blanks(String s) {
        int count = 0;
        for (int i = s.indexOf(BLANK); i >= 0; i = s.indexOf(BLANK, i + BLANK.length())) count++;
        return count;
    }

    private static boolean nonBlank(JsonNode node) {
        return node != null && node.isTextual() && !node.asText().isBlank();
    }

    private record Check(String id, List<String> out) {

        void add(String path, String text) {
            out.add(id + " · " + path + " · " + text);
        }

        boolean text(JsonNode node, String path) {
            if (nonBlank(node)) return true;
            add(path, "нужен непустой текст");
            return false;
        }

        void tri(JsonNode node, String path) {
            if (node == null || !node.isObject()) {
                add(path, "нужен объект {ru, kk, en}");
                return;
            }
            for (String lang : LANGS) text(node.get(lang), path + "." + lang);
        }

        ArrayNode array(JsonNode node, String path, int min) {
            if (node == null || !node.isArray()) {
                add(path, "нужен массив");
                return null;
            }
            if (node.size() < min) add(path, "нужно не меньше " + min + ", сейчас " + node.size());
            return (ArrayNode) node;
        }

        List<String> texts(JsonNode node, String path, int exactly) {
            if (node == null || !node.isArray() || node.size() != exactly || !allNonBlank(node)) {
                add(path, "нужно ровно " + exactly + " непустых строки");
                return null;
            }
            List<String> values = new ArrayList<>();
            node.forEach(n -> values.add(n.asText()));
            return values;
        }

        void textsAtLeast(JsonNode node, String path, int min) {
            if (array(node, path, min) != null && !allNonBlank(node)) add(path, "все строки должны быть непустыми");
        }

        private static boolean allNonBlank(JsonNode node) {
            for (JsonNode n : node) if (!nonBlank(n)) return false;
            return true;
        }
    }
}
```

> Класс ~330 строк — у верхней границы ориентира (§2.7) из-за перечня правил; делить его по блокам игр не стоит: правила читают методисты и разработчики сайта одним списком.

- [ ] **Step 6: Тест проходит**

Run: `./gradlew test --tests '*GrammarTopicValidatorTest'`
Expected: PASS, 12 тестов. В тесте `capped` у каждой из 30 тем две ошибки (цвет и эмодзи) — 60, в ответе 50 + «…и ещё 10».
Все правила заранее сверены с 125 темами прототипа скриптом (25.10.2026): нарушений нет.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/kz/education/server/modules/grammargames/service/GrammarGamesBundle.java src/main/java/kz/education/server/modules/grammargames/service/GrammarTopicValidator.java src/test/java/kz/education/server/modules/grammargames/service/GrammarGamesFixtures.java src/test/java/kz/education/server/modules/grammargames/service/GrammarTopicValidatorTest.java
git commit -m "feat(grammar-games): проверка темы и набора

Правила выведены из 125 тем прототипа (валидатора методиста нет): без них
движок ломает игру. Строка проблемы — «тема · поле · что не так».

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Разбор html и zip — `GrammarGamesHtmlParser`, `GrammarGamesZip`

**Files:**
- Create: `M/modules/grammargames/service/GrammarGamesHtmlParser.java`
- Create: `M/modules/grammargames/service/GrammarGamesZip.java`
- Test: `T/modules/grammargames/service/GrammarGamesHtmlParserTest.java`, `T/modules/grammargames/service/GrammarGamesZipTest.java`

**Interfaces:**
- Consumes: `GrammarGamesBundle` (Task 3), `kz.education.server.shared.util.JsLiterals.extract/jsToJson`.
- Produces: `GrammarGamesHtmlParser.parse(String html) → GrammarGamesBundle`; `GrammarGamesZip.read(byte[] zip) → GrammarGamesBundle`, `read(byte[] zip, int maxEntries, long maxBytes)` (пакетный доступ для тестов), `write(GrammarGamesBundle, Set<String> hiddenIds) → byte[]`, `entryName(String id) → "L1/01.json"`, `MAX_ENTRIES = 400`, `MAX_UNZIPPED_BYTES = 20 МБ`.

- [ ] **Step 1: Падающие тесты**

`T/modules/grammargames/service/GrammarGamesHtmlParserTest.java`:

```java
package kz.education.server.modules.grammargames.service;

import kz.education.server.shared.exception.types.BadRequestException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.bundle;
import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.html;
import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.topic;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("GrammarGamesHtmlParser — html прототипа")
class GrammarGamesHtmlParserTest {

    @Test
    @DisplayName("читает четыре блока как есть")
    void parsesBlocks() {
        GrammarGamesBundle source = bundle(topic("L1-01"), topic("L2-03"));
        GrammarGamesBundle parsed = GrammarGamesHtmlParser.parse(html(source));

        assertThat(parsed.levels()).isEqualTo(source.levels());
        assertThat(parsed.program()).isEqualTo(source.program());
        assertThat(parsed.gloss()).isEqualTo(source.gloss());
        assertThat(parsed.topics()).containsExactlyElementsOf(source.topics());
    }

    @Test
    @DisplayName("JS-литерал (кавычки, ключи без кавычек, висячая запятая) тоже читается")
    void parsesJsLiteral() {
        String file = html(bundle(topic("L1-01"))).replaceFirst("const LEVELS=\\[[^;]*;",
                "const LEVELS=[{id:'L1',name:'Absolute',},];");
        assertThat(GrammarGamesHtmlParser.parse(file).levels().get(0).path("id").asText()).isEqualTo("L1");
    }

    @Test
    @DisplayName("нет блока — понятная ошибка")
    void missingBlock() {
        String file = html(bundle(topic("L1-01"))).replace("const GLOSS=", "const OTHER=");
        assertThatThrownBy(() -> GrammarGamesHtmlParser.parse(file))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("GLOSS");
    }

    @Test
    @DisplayName("TOPICS не массив — отказ")
    void topicsNotArray() {
        String file = html(bundle(topic("L1-01"))).replaceFirst("const TOPICS=\\[", "const TOPICS={\"x\":[").replaceFirst("\\];\\nconst GLOSS", "]};\nconst GLOSS");
        assertThatThrownBy(() -> GrammarGamesHtmlParser.parse(file))
                .isInstanceOf(BadRequestException.class).hasMessage("TOPICS — не массив");
    }
}
```

`T/modules/grammargames/service/GrammarGamesZipTest.java`:

```java
package kz.education.server.modules.grammargames.service;

import com.fasterxml.jackson.databind.node.ObjectNode;
import kz.education.server.shared.exception.types.BadRequestException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.bundle;
import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.topic;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("GrammarGamesZip — архив формата ТЗ")
class GrammarGamesZipTest {

    /** Архив из пар «имя → текст» — чтобы проверять чужие и битые архивы. */
    private static byte[] zip(Map<String, String> files) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream out = new ZipOutputStream(bytes)) {
            for (Map.Entry<String, String> f : files.entrySet()) {
                out.putNextEntry(new ZipEntry(f.getKey()));
                out.write(f.getValue().getBytes(StandardCharsets.UTF_8));
                out.closeEntry();
            }
        }
        return bytes.toByteArray();
    }

    private static Map<String, String> meta() {
        GrammarGamesBundle b = bundle();
        return Map.of("levels.json", b.levels().toString(), "program.json", "[]", "gloss.json", b.gloss().toString());
    }

    @Test
    @DisplayName("выгрузка и обратная заливка ничего не теряют; скрытая тема помечена hidden")
    void roundTrip() {
        GrammarGamesBundle source = bundle(topic("L1-01"), topic("L5-25"));
        GrammarGamesBundle read = GrammarGamesZip.read(GrammarGamesZip.write(source, Set.of("L5-25")));

        assertThat(read.levels()).isEqualTo(source.levels());
        assertThat(read.program()).isEqualTo(source.program());
        assertThat(read.gloss()).isEqualTo(source.gloss());
        assertThat(read.topics()).hasSize(2);
        assertThat(read.topics().get(0)).isEqualTo(source.topics().get(0));
        assertThat(read.topics().get(1).path("hidden").asBoolean()).isTrue();
        assertThat(source.topics().get(1).has("hidden")).as("исходник не меняется").isFalse();
    }

    @Test
    @DisplayName("файлы могут лежать в папке (data/L1/01.json), лишние пропускаются")
    void acceptsFolderAndJunk() throws IOException {
        Map<String, String> files = new java.util.HashMap<>(meta());
        files.put("data/L1/01.json", topic("L1-01").toString());
        files.put("__MACOSX/L1/._01.json", "junk");
        files.put("README.txt", "hello");
        assertThat(GrammarGamesZip.read(zip(files)).topics()).hasSize(1);
    }

    @Test
    @DisplayName("id в файле не совпал с путём — отказ")
    void idMismatch() throws IOException {
        Map<String, String> files = new java.util.HashMap<>(meta());
        files.put("L1/02.json", topic("L1-01").toString());
        assertThatThrownBy(() -> GrammarGamesZip.read(zip(files)))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("id в файле — L1-01, а по пути — L1-02");
    }

    @Test
    @DisplayName("нет levels.json — отказ; не zip — отказ; «..» в имени — отказ")
    void broken() throws IOException {
        assertThatThrownBy(() -> GrammarGamesZip.read(zip(Map.of("program.json", "[]", "gloss.json", "{}"))))
                .isInstanceOf(BadRequestException.class).hasMessage("В архиве нет levels.json");
        assertThatThrownBy(() -> GrammarGamesZip.read("not a zip".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(BadRequestException.class).hasMessage("Архив пустой или это не zip");
        Map<String, String> evil = new java.util.HashMap<>(meta());
        evil.put("../L1/01.json", topic("L1-01").toString());
        assertThatThrownBy(() -> GrammarGamesZip.read(zip(evil)))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("Недопустимое имя в архиве");
    }

    @Test
    @DisplayName("потолки числа файлов и распакованного объёма")
    void limits() throws IOException {
        byte[] archive = zip(meta());
        assertThatThrownBy(() -> GrammarGamesZip.read(archive, 2, GrammarGamesZip.MAX_UNZIPPED_BYTES))
                .isInstanceOf(BadRequestException.class).hasMessage("В архиве больше 2 файлов");
        assertThatThrownBy(() -> GrammarGamesZip.read(archive, GrammarGamesZip.MAX_ENTRIES, 10))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("в распакованном виде больше");
    }

    @Test
    @DisplayName("имя файла темы — L<уровень>/<номер>.json")
    void entryName() {
        ObjectNode t = topic("L3-07");
        assertThat(GrammarGamesZip.entryName(t.path("id").asText())).isEqualTo("L3/07.json");
    }
}
```

- [ ] **Step 2: Запустить — падает**

Run: `./gradlew test --tests '*GrammarGamesHtmlParserTest' --tests '*GrammarGamesZipTest'`
Expected: FAIL — «cannot find symbol GrammarGamesHtmlParser / GrammarGamesZip».

- [ ] **Step 3: Разбор html**

`M/modules/grammargames/service/GrammarGamesHtmlParser.java`:

```java
package kz.education.server.modules.grammargames.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import kz.education.server.shared.exception.types.BadRequestException;
import kz.education.server.shared.util.JsLiterals;

import java.util.ArrayList;
import java.util.List;

/**
 * html прототипа методиста → набор раздела. Данные лежат строками {@code const LEVELS/PROGRAM/TOPICS/GLOSS = …}
 * в единственном скрипте; JS не исполняется — литералы читает {@link JsLiterals}, как у Just to Listen и предлогов.
 * Картинки ({@code IMG}, {@code EMO}) не читаются: это статика сайта, а не материал методиста.
 */
public final class GrammarGamesHtmlParser {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private GrammarGamesHtmlParser() {
    }

    public static GrammarGamesBundle parse(String html) {
        JsonNode levels = read(html, "LEVELS");
        JsonNode program = read(html, "PROGRAM");
        JsonNode topics = read(html, "TOPICS");
        JsonNode gloss = read(html, "GLOSS");
        if (!levels.isArray()) throw new BadRequestException("LEVELS — не массив");
        if (!program.isArray()) throw new BadRequestException("PROGRAM — не массив");
        if (!topics.isArray()) throw new BadRequestException("TOPICS — не массив");
        if (!gloss.isObject()) throw new BadRequestException("GLOSS — не объект");
        List<ObjectNode> list = new ArrayList<>();
        for (JsonNode t : topics) {
            if (!t.isObject()) throw new BadRequestException("TOPICS: тема — не объект");
            list.add((ObjectNode) t);
        }
        return new GrammarGamesBundle((ArrayNode) levels, (ArrayNode) program, (ObjectNode) gloss, list);
    }

    private static JsonNode read(String html, String name) {
        String literal = JsLiterals.extract(html, name);
        try {
            return MAPPER.readTree(JsLiterals.jsToJson(literal));
        } catch (JsonProcessingException e) {
            // getOriginalMessage без «Source: …» — иначе в ответ поехал бы кусок двухмегабайтного блока
            throw new BadRequestException(name + " — не разобрать: " + e.getOriginalMessage());
        }
    }
}
```

- [ ] **Step 4: zip**

`M/modules/grammargames/service/GrammarGamesZip.java`:

```java
package kz.education.server.modules.grammargames.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import kz.education.server.shared.exception.types.BadRequestException;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

/**
 * Архив формата ТЗ §5.1: {@code levels.json}, {@code program.json}, {@code gloss.json} и по файлу на тему
 * {@code L<n>/<NN>.json}. Файлы могут лежать в одной общей папке (так их пакует проводник: data/L1/01.json),
 * посторонние (__MACOSX, README) пропускаются. Потолки — от архива-бомбы: распаковка идёт в память.
 */
public final class GrammarGamesZip {

    public static final int MAX_ENTRIES = 400;
    public static final long MAX_UNZIPPED_BYTES = 20L * 1024 * 1024;
    static final Pattern TOPIC_ENTRY = Pattern.compile("^(?:.*/)?(L[1-5])/(\\d{2})\\.json$");
    static final Pattern META_ENTRY = Pattern.compile("^(?:.*/)?(levels|program|gloss)\\.json$");
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private GrammarGamesZip() {
    }

    public static GrammarGamesBundle read(byte[] zip) {
        return read(zip, MAX_ENTRIES, MAX_UNZIPPED_BYTES);
    }

    static GrammarGamesBundle read(byte[] zip, int maxEntries, long maxBytes) {
        Map<String, JsonNode> meta = new TreeMap<>();
        Map<String, ObjectNode> topics = new TreeMap<>();
        int entries = 0;
        long total = 0;
        try (ZipInputStream in = new ZipInputStream(new ByteArrayInputStream(zip), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = in.getNextEntry()) != null) {
                if (++entries > maxEntries) throw new BadRequestException("В архиве больше " + maxEntries + " файлов");
                if (entry.isDirectory()) continue;
                String name = entry.getName().replace('\\', '/');
                if (name.contains("..")) throw new BadRequestException("Недопустимое имя в архиве: " + name);
                byte[] bytes = readLimited(in, maxBytes - total, maxBytes);
                total += bytes.length;
                Matcher topic = TOPIC_ENTRY.matcher(name);
                Matcher block = META_ENTRY.matcher(name);
                if (topic.matches()) {
                    putTopic(topics, topic.group(1) + "-" + topic.group(2), name, json(bytes, name));
                } else if (block.matches()) {
                    meta.put(block.group(1), json(bytes, name));
                }
            }
        } catch (IOException e) {
            throw new BadRequestException("Архив не читается: " + e.getMessage());
        }
        if (entries == 0) throw new BadRequestException("Архив пустой или это не zip");
        JsonNode levels = required(meta, "levels");
        JsonNode program = required(meta, "program");
        JsonNode gloss = required(meta, "gloss");
        if (!levels.isArray() || !program.isArray()) throw new BadRequestException("levels.json и program.json — массивы");
        if (!gloss.isObject()) throw new BadRequestException("gloss.json — объект");
        return new GrammarGamesBundle((ArrayNode) levels, (ArrayNode) program, (ObjectNode) gloss,
                new ArrayList<>(topics.values()));
    }

    public static byte[] write(GrammarGamesBundle bundle, Set<String> hiddenIds) {
        ObjectWriter pretty = MAPPER.writerWithDefaultPrettyPrinter();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes, StandardCharsets.UTF_8)) {
            put(zip, "levels.json", pretty.writeValueAsBytes(bundle.levels()));
            put(zip, "program.json", pretty.writeValueAsBytes(bundle.program()));
            put(zip, "gloss.json", pretty.writeValueAsBytes(bundle.gloss()));
            for (ObjectNode topic : bundle.topics()) {
                String id = topic.path("id").asText();
                ObjectNode copy = topic.deepCopy();
                if (hiddenIds.contains(id)) copy.put("hidden", true);
                put(zip, entryName(id), pretty.writeValueAsBytes(copy));
            }
        } catch (IOException e) {
            throw new IllegalStateException("Не удалось собрать zip «Грамматики · игр»", e);
        }
        return bytes.toByteArray();
    }

    /** L1-01 → L1/01.json. */
    public static String entryName(String id) {
        return id.substring(0, 2) + "/" + id.substring(3) + ".json";
    }

    private static void putTopic(Map<String, ObjectNode> topics, String expected, String name, JsonNode node) {
        if (!node.isObject()) throw new BadRequestException(name + " — не объект темы");
        String actual = node.path("id").asText();
        if (!expected.equals(actual)) {
            throw new BadRequestException(name + ": id в файле — " + actual + ", а по пути — " + expected);
        }
        if (topics.put(expected, (ObjectNode) node) != null) {
            throw new BadRequestException("Тема " + expected + " в архиве дважды");
        }
    }

    private static JsonNode required(Map<String, JsonNode> meta, String name) {
        JsonNode node = meta.get(name);
        if (node == null) throw new BadRequestException("В архиве нет " + name + ".json");
        return node;
    }

    private static JsonNode json(byte[] bytes, String name) {
        try {
            return MAPPER.readTree(bytes);
        } catch (IOException e) {
            throw new BadRequestException(name + " — не JSON");
        }
    }

    private static byte[] readLimited(InputStream in, long left, long maxBytes) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        long read = 0;
        int n;
        while ((n = in.read(buffer)) > 0) {
            read += n;
            if (read > left) {
                throw new BadRequestException("Архив в распакованном виде больше " + maxBytes / 1024 / 1024 + " МБ");
            }
            out.write(buffer, 0, n);
        }
        return out.toByteArray();
    }

    private static void put(ZipOutputStream zip, String name, byte[] bytes) throws IOException {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(bytes);
        zip.closeEntry();
    }
}
```

> В тесте `limits` второй случай задаёт потолок 10 байт: `maxBytes / 1024 / 1024` даст «0 МБ», поэтому проверка там — по `hasMessageContaining("в распакованном виде больше")`.

- [ ] **Step 5: Тесты проходят**

Run: `./gradlew test --tests '*GrammarGamesHtmlParserTest' --tests '*GrammarGamesZipTest'`
Expected: PASS, 4 + 6 тестов.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/kz/education/server/modules/grammargames/service/GrammarGamesHtmlParser.java src/main/java/kz/education/server/modules/grammargames/service/GrammarGamesZip.java src/test/java/kz/education/server/modules/grammargames/service/GrammarGamesHtmlParserTest.java src/test/java/kz/education/server/modules/grammargames/service/GrammarGamesZipTest.java
git commit -m "feat(grammar-games): разбор html прототипа и zip формата ТЗ

html — литералы LEVELS/PROGRAM/TOPICS/GLOSS через JsLiterals, без
исполнения JS; zip — L<n>/<NN>.json + три файла, с потолками от архива-бомбы.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Правила монет — `PracticeCoinRulesService` и ручка админки

**Files:**
- Create: `M/modules/practice/coins/PracticeCoinRulesService.java`
- Create: `M/presentation/admin/practice/controller/AdminPracticeCoinRulesController.java`
- Test: `T/modules/practice/coins/PracticeCoinRulesServiceTest.java`

**Interfaces:**
- Consumes: `PracticeCoinRule`, `PracticeCoinRuleRepository` (Task 1); `GrammarGamesJpaConfig` (Task 1, тестовый).
- Produces: `PracticeCoinRulesService.coins(String key, int fallback) → int`, `all() → Map<String,Integer>` (по порядку ключей), `update(Map<String,Integer> changes, Long userId) → Map<String,Integer>`, `MAX_COINS = 10`; `GET/PUT /admin/practice/coin-rules`.

- [ ] **Step 1: Падающий тест**

`T/modules/practice/coins/PracticeCoinRulesServiceTest.java`:

```java
package kz.education.server.modules.practice.coins;

import kz.education.server.modules.grammargames.GrammarGamesJpaConfig;
import kz.education.server.shared.exception.types.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = PracticeCoinRulesServiceTest.Context.class)
@Transactional
@DisplayName("PracticeCoinRulesService — монеты разделов «Практики»")
class PracticeCoinRulesServiceTest {

    @Configuration
    @Import(GrammarGamesJpaConfig.class)
    static class Context {
        @Bean
        PracticeCoinRulesService practiceCoinRulesService(PracticeCoinRuleRepository rules) {
            return new PracticeCoinRulesService(rules);
        }
    }

    @Autowired
    private PracticeCoinRulesService service;
    @Autowired
    private PracticeCoinRuleRepository rules;

    @BeforeEach
    void seed() {
        PracticeCoinRule pick = new PracticeCoinRule();
        pick.setRuleKey("grammar-games.pick");
        pick.setCoins(2);
        PracticeCoinRule boss = new PracticeCoinRule();
        boss.setRuleKey("grammar-games.boss");
        boss.setCoins(5);
        rules.saveAll(java.util.List.of(pick, boss));
    }

    @Test
    @DisplayName("значение по ключу; строки нет — запасное значение раздела")
    void coinsByKey() {
        assertThat(service.coins("grammar-games.boss", 1)).isEqualTo(5);
        assertThat(service.coins("grammar-games.type", 3)).isEqualTo(3);
    }

    @Test
    @DisplayName("список — по порядку ключей")
    void all() {
        assertThat(service.all()).containsExactly(Map.entry("grammar-games.boss", 5), Map.entry("grammar-games.pick", 2));
    }

    @Test
    @DisplayName("правка меняет значение и пишет автора")
    void update() {
        assertThat(service.update(Map.of("grammar-games.pick", 4), 7L)).containsEntry("grammar-games.pick", 4);
        assertThat(rules.findById("grammar-games.pick")).get()
                .satisfies(r -> assertThat(r.getUpdatedBy()).isEqualTo(7L));
    }

    @Test
    @DisplayName("больше 10, меньше 0, неизвестный ключ, пусто — 400")
    void rejects() {
        assertThatThrownBy(() -> service.update(Map.of("grammar-games.pick", 11), 7L))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("от 0 до 10");
        assertThatThrownBy(() -> service.update(Map.of("grammar-games.pick", -1), 7L))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.update(Map.of("grammar-games.nope", 1), 7L))
                .isInstanceOf(BadRequestException.class).hasMessage("Неизвестное правило монет: grammar-games.nope");
        assertThatThrownBy(() -> service.update(Map.of(), 7L))
                .isInstanceOf(BadRequestException.class).hasMessage("Нет правил для сохранения");
    }
}
```

- [ ] **Step 2: Запустить — падает**

Run: `./gradlew test --tests '*PracticeCoinRulesServiceTest'`
Expected: FAIL — «cannot find symbol PracticeCoinRulesService».

- [ ] **Step 3: Сервис**

`M/modules/practice/coins/PracticeCoinRulesService.java`:

```java
package kz.education.server.modules.practice.coins;

import kz.education.server.shared.exception.types.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Сколько монет даёт раздел «Практики». Суммы задаёт контент-менеджер (решение заказчика 25.10.2026), потолок одного
 * правила — 10 (допущение Д1). Ключи заводит миграция раздела: новых админка не создаёт — опечатка в ключе дала бы
 * правило, которого никто не читает.
 */
@Service
@RequiredArgsConstructor
public class PracticeCoinRulesService {

    public static final int MAX_COINS = 10;

    private final PracticeCoinRuleRepository rules;

    @Transactional(readOnly = true)
    public int coins(String key, int fallback) {
        return rules.findById(key).map(PracticeCoinRule::getCoins).orElse(fallback);
    }

    @Transactional(readOnly = true)
    public Map<String, Integer> all() {
        Map<String, Integer> out = new LinkedHashMap<>();
        rules.findAllByOrderByRuleKeyAsc().forEach(r -> out.put(r.getRuleKey(), r.getCoins()));
        return out;
    }

    @Transactional
    public Map<String, Integer> update(Map<String, Integer> changes, Long userId) {
        if (changes == null || changes.isEmpty()) throw new BadRequestException("Нет правил для сохранения");
        changes.forEach((key, coins) -> {
            PracticeCoinRule rule = rules.findById(key)
                    .orElseThrow(() -> new BadRequestException("Неизвестное правило монет: " + key));
            if (coins == null || coins < 0 || coins > MAX_COINS) {
                throw new BadRequestException("Монеты за «" + key + "» — от 0 до " + MAX_COINS);
            }
            rule.setCoins(coins);
            rule.setUpdatedBy(userId);
            rules.save(rule);
        });
        return all();
    }
}
```

- [ ] **Step 4: Ручка админки**

`M/presentation/admin/practice/controller/AdminPracticeCoinRulesController.java`:

```java
package kz.education.server.presentation.admin.practice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import kz.education.server.modules.practice.coins.PracticeCoinRulesService;
import kz.education.server.shared.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/admin/practice/coin-rules")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','CONTENT_MANAGER')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin Practice · Coins", description = "Сколько монет дают разделы «Практики»")
public class AdminPracticeCoinRulesController {

    private final PracticeCoinRulesService service;
    private final SecurityUtils securityUtils;

    @GetMapping
    @Operation(summary = "Все правила: ключ → монеты")
    public Map<String, Integer> all() {
        return service.all();
    }

    @PutMapping
    @Operation(summary = "Изменить правила (ключ → 0–10); неизвестный ключ — 400")
    public Map<String, Integer> update(@RequestBody Map<String, Integer> changes) {
        return service.update(changes, securityUtils.userId());
    }
}
```

- [ ] **Step 5: Тест проходит**

Run: `./gradlew test --tests '*PracticeCoinRulesServiceTest'`
Expected: PASS, 4 теста.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/kz/education/server/modules/practice/coins/PracticeCoinRulesService.java src/main/java/kz/education/server/presentation/admin/practice/controller/AdminPracticeCoinRulesController.java src/test/java/kz/education/server/modules/practice/coins/PracticeCoinRulesServiceTest.java
git commit -m "feat(practice): правила монет разделов и ручка админки

Суммы задаёт контент-менеджер, 0–10; ключи заводит миграция раздела.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Чтение ученику — `GrammarGamesCatalogService`

**Files:**
- Create: `M/modules/grammargames/service/GrammarGamesDtos.java`
- Create: `M/modules/grammargames/service/GrammarGamesCatalogService.java`
- Test: `T/modules/grammargames/service/GrammarGamesCatalogServiceTest.java`

**Interfaces:**
- Consumes: репозитории (Task 1), `GrammarGameStages.stagesOf` (Task 2), фикстуры (Task 3).
- Produces: record'ы `GrammarGamesDtos.Index(JsonNode levels, JsonNode program, List<IndexTopic> topics)`, `IndexTopic(String id, String lv, int n, String icon, String color, JsonNode title, JsonNode sub, List<String> games)`, `UploadResult(int topics, int created, int updated, int unchanged, List<String> warnings)`, `AdminRow(String id, String level, int n, String icon, String titleRu, boolean hidden, int games, LocalDateTime updatedAt)`, `HiddenBody(Boolean hidden)`, `ResultRequest(String topicId, String game, Integer stars)`, `ResultOutcome(int best, int coins)`, `Progress(Map<String, Map<String, Integer>> stars)`; `GrammarGamesCatalogService.index()`, `topic(String id) → JsonNode` (только видимая, иначе 404), `gloss() → JsonNode`, `clearCache()`, `clearCacheNowAndAfterCommit()`, константы `NOT_UPLOADED`, `NO_TOPIC`.

- [ ] **Step 1: Падающий тест**

`T/modules/grammargames/service/GrammarGamesCatalogServiceTest.java`:

```java
package kz.education.server.modules.grammargames.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import kz.education.server.modules.grammargames.GrammarGamesJpaConfig;
import kz.education.server.modules.grammargames.model.GrammarGameMeta;
import kz.education.server.modules.grammargames.model.GrammarGameTopic;
import kz.education.server.modules.grammargames.repository.GrammarGameMetaRepository;
import kz.education.server.modules.grammargames.repository.GrammarGameTopicRepository;
import kz.education.server.shared.exception.types.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.Transactional;

import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.bundle;
import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.topic;
import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.withPlace;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = GrammarGamesCatalogServiceTest.Context.class)
@Transactional
@DisplayName("GrammarGamesCatalogService — выдача ученику")
class GrammarGamesCatalogServiceTest {

    @Configuration
    @Import(GrammarGamesJpaConfig.class)
    static class Context {
        @Bean
        GrammarGamesCatalogService grammarGamesCatalogService(GrammarGameTopicRepository topics,
                                                              GrammarGameMetaRepository meta, ObjectMapper mapper) {
            return new GrammarGamesCatalogService(topics, meta, mapper);
        }
    }

    @Autowired
    private GrammarGamesCatalogService catalog;
    @Autowired
    private GrammarGameTopicRepository topics;
    @Autowired
    private GrammarGameMetaRepository meta;

    @BeforeEach
    void clean() {
        catalog.clearCache();
    }

    private void seed() {
        GrammarGamesBundle b = bundle(topic("L1-01"), withPlace(topic("L1-10")), topic("L2-01"));
        GrammarGameMeta m = new GrammarGameMeta();
        m.setLevels(b.levels().toString());
        m.setProgram(b.program().toString());
        m.setGloss(b.gloss().toString());
        meta.save(m);
        b.topics().forEach(t -> {
            GrammarGameTopic row = new GrammarGameTopic();
            row.setId(t.path("id").asText());
            row.setLevel(t.path("lv").asText());
            row.setNumber(t.path("n").asInt());
            row.setTitleRu(t.path("title").path("ru").asText());
            row.setHidden("L2-01".equals(row.getId()));
            row.setBody(t.toString());
            topics.save(row);
        });
    }

    @Test
    @DisplayName("до первой заливки — 404 «ещё не загружена»")
    void notUploaded() {
        assertThatThrownBy(() -> catalog.index())
                .isInstanceOf(ResourceNotFoundException.class).hasMessage(GrammarGamesCatalogService.NOT_UPLOADED);
        assertThatThrownBy(() -> catalog.gloss()).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("список: только видимые темы, с набором игр")
    void index() {
        seed();
        GrammarGamesDtos.Index index = catalog.index();

        assertThat(index.levels()).hasSize(5);
        assertThat(index.topics()).extracting(GrammarGamesDtos.IndexTopic::id).containsExactly("L1-01", "L1-10");
        assertThat(index.topics().get(0).games()).hasSize(12).doesNotContain("place");
        assertThat(index.topics().get(1).games()).hasSize(13).contains("place");
        assertThat(index.topics().get(0).title().path("ru").asText()).isEqualTo("Тема L1-01 ru");
        assertThat(index.topics().get(0).icon()).isEqualTo("👋");
    }

    @Test
    @DisplayName("тема: видимая — телом, скрытая и несуществующая — 404")
    void topicById() {
        seed();
        assertThat(catalog.topic("L1-01").path("gap")).hasSize(12);
        assertThatThrownBy(() -> catalog.topic("L2-01"))
                .isInstanceOf(ResourceNotFoundException.class).hasMessage(GrammarGamesCatalogService.NO_TOPIC);
        assertThatThrownBy(() -> catalog.topic("L5-25")).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("словарь и кэш: правка в базе видна только после сброса кэша")
    void cache() {
        seed();
        assertThat(catalog.gloss().path("work").get(0).asText()).isEqualTo("работать");
        assertThat(catalog.index().topics()).hasSize(2);

        GrammarGameTopic row = topics.findById("L1-10").orElseThrow();
        row.setHidden(true);
        topics.save(row);
        assertThat(catalog.index().topics()).as("из кэша").hasSize(2);

        catalog.clearCacheNowAndAfterCommit();
        assertThat(catalog.index().topics()).hasSize(1);
        assertThatThrownBy(() -> catalog.topic("L1-10")).isInstanceOf(ResourceNotFoundException.class);
    }
}
```

- [ ] **Step 2: Запустить — падает**

Run: `./gradlew test --tests '*GrammarGamesCatalogServiceTest'`
Expected: FAIL — «cannot find symbol GrammarGamesCatalogService».

- [ ] **Step 3: DTO**

`M/modules/grammargames/service/GrammarGamesDtos.java`:

```java
package kz.education.server.modules.grammargames.service;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Форма данных «Грамматики · игр» на границе API. Поля запросов — ровно те, что шлют сайт и админка. */
public final class GrammarGamesDtos {

    private GrammarGamesDtos() {
    }

    /** Список раздела для сайта: уровни, программа и шапки видимых тем (без правила и игр — их тянет экран темы). */
    public record Index(JsonNode levels, JsonNode program, List<IndexTopic> topics) {
    }

    public record IndexTopic(String id, String lv, int n, String icon, String color, JsonNode title, JsonNode sub,
                             List<String> games) {
    }

    public record UploadResult(int topics, int created, int updated, int unchanged, List<String> warnings) {
    }

    public record AdminRow(String id, String level, int n, String icon, String titleRu, boolean hidden, int games,
                           LocalDateTime updatedAt) {
    }

    public record HiddenBody(Boolean hidden) {
    }

    public record ResultRequest(String topicId, String game, Integer stars) {
    }

    public record ResultOutcome(int best, int coins) {
    }

    /** Лучшие звёзды ученика: тема → игра → 0–3. */
    public record Progress(Map<String, Map<String, Integer>> stars) {
    }
}
```

- [ ] **Step 4: Сервис чтения**

`M/modules/grammargames/service/GrammarGamesCatalogService.java`:

```java
package kz.education.server.modules.grammargames.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kz.education.server.modules.grammargames.model.GrammarGameMeta;
import kz.education.server.modules.grammargames.model.GrammarGameTopic;
import kz.education.server.modules.grammargames.repository.GrammarGameMetaRepository;
import kz.education.server.modules.grammargames.repository.GrammarGameTopicRepository;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.Index;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.IndexTopic;
import kz.education.server.shared.exception.types.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Выдача «Грамматики · игр» ученику. Список, словарь и тела тем держатся в памяти до следующей записи из админки:
 * экран темы открывается сотни раз в день, а меняются темы редко (как кэш бандла у предлогов).
 */
@Service
@RequiredArgsConstructor
public class GrammarGamesCatalogService {

    public static final String NOT_UPLOADED = "«Грамматика · игры» ещё не загружена";
    public static final String NO_TOPIC = "Тема не найдена";

    private final GrammarGameTopicRepository topics;
    private final GrammarGameMetaRepository meta;
    private final ObjectMapper mapper;

    private final AtomicReference<Index> index = new AtomicReference<>();
    private final AtomicReference<JsonNode> gloss = new AtomicReference<>();
    private final Map<String, JsonNode> bodies = new ConcurrentHashMap<>();

    @Transactional(readOnly = true)
    public Index index() {
        Index cached = index.get();
        if (cached != null) return cached;
        GrammarGameMeta m = meta();
        List<IndexTopic> list = topics.findByHiddenFalseOrderByLevelAscNumberAsc().stream().map(this::indexTopic).toList();
        Index built = new Index(read(m.getLevels()), read(m.getProgram()), list);
        index.set(built);
        return built;
    }

    /** Видимая тема целиком; скрытая и несуществующая — 404 (по нему же отказывает зачёт результата). */
    @Transactional(readOnly = true)
    public JsonNode topic(String id) {
        JsonNode cached = bodies.get(id);
        if (cached != null) return cached;
        GrammarGameTopic row = topics.findByIdAndHiddenFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException(NO_TOPIC));
        JsonNode body = read(row.getBody());
        bodies.put(id, body);
        return body;
    }

    @Transactional(readOnly = true)
    public JsonNode gloss() {
        JsonNode cached = gloss.get();
        if (cached != null) return cached;
        JsonNode built = read(meta().getGloss());
        gloss.set(built);
        return built;
    }

    public void clearCache() {
        index.set(null);
        gloss.set(null);
        bodies.clear();
    }

    /**
     * Сброс и сразу, и после коммита: читатель между ними мог положить в кэш ещё старые строки — второй сброс
     * их выбрасывает. Сразу — чтобы запись была видна и внутри той же транзакции.
     */
    public void clearCacheNowAndAfterCommit() {
        clearCache();
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    clearCache();
                }
            });
        }
    }

    private GrammarGameMeta meta() {
        return meta.findById(GrammarGameMeta.SINGLETON_ID).orElseThrow(() -> new ResourceNotFoundException(NOT_UPLOADED));
    }

    private IndexTopic indexTopic(GrammarGameTopic row) {
        JsonNode body = read(row.getBody());
        bodies.putIfAbsent(row.getId(), body);
        return new IndexTopic(row.getId(), row.getLevel(), row.getNumber(), body.path("icon").asText(""),
                body.path("color").asText(""), body.path("title"), body.path("sub"), GrammarGameStages.stagesOf(body));
    }

    private JsonNode read(String json) {
        try {
            return mapper.readTree(json);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Грамматика · игры: в базе не JSON", e);
        }
    }
}
```

- [ ] **Step 5: Тест проходит**

Run: `./gradlew test --tests '*GrammarGamesCatalogServiceTest'`
Expected: PASS, 4 теста.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/kz/education/server/modules/grammargames/service/GrammarGamesDtos.java src/main/java/kz/education/server/modules/grammargames/service/GrammarGamesCatalogService.java src/test/java/kz/education/server/modules/grammargames/service/GrammarGamesCatalogServiceTest.java
git commit -m "feat(grammar-games): выдача списка, темы и словаря ученику

Только видимые темы; список, тела тем и словарь — в памяти до следующей
записи админки.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Заливка — `GrammarGamesUploadService`

**Files:**
- Create: `M/modules/grammargames/service/GrammarTopicRows.java`
- Create: `M/modules/grammargames/service/GrammarGamesUploadService.java`
- Test: `T/modules/grammargames/service/GrammarGamesUploadServiceTest.java`

**Interfaces:**
- Consumes: `GrammarGamesHtmlParser.parse`, `GrammarGamesZip.read` (Task 4), `GrammarTopicValidator.problems/warnings` (Task 3), `GrammarGamesCatalogService.clearCacheNowAndAfterCommit` (Task 6), репозитории.
- Produces: `GrammarGamesUploadService.upload(byte[] file, String fileName, Long userId) → UploadResult`; `GrammarTopicRows.fill(GrammarGameTopic row, ObjectNode topic, String json, Long userId)`, `GrammarTopicRows.adminRow(GrammarGameTopic row, JsonNode body) → AdminRow`, `GrammarTopicRows.problemsMessage(String head, List<String> problems) → String`.

- [ ] **Step 1: Падающий тест**

`T/modules/grammargames/service/GrammarGamesUploadServiceTest.java`:

```java
package kz.education.server.modules.grammargames.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import kz.education.server.modules.grammargames.GrammarGamesJpaConfig;
import kz.education.server.modules.grammargames.model.GrammarGameTopic;
import kz.education.server.modules.grammargames.repository.GrammarGameMetaRepository;
import kz.education.server.modules.grammargames.repository.GrammarGameTopicRepository;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.UploadResult;
import kz.education.server.shared.exception.types.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Set;

import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.bundle;
import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.html;
import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.topic;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = GrammarGamesUploadServiceTest.Context.class)
@Transactional
@DisplayName("GrammarGamesUploadService — заливка html и zip")
class GrammarGamesUploadServiceTest {

    @Configuration
    @Import(GrammarGamesJpaConfig.class)
    static class Context {
        @Bean
        GrammarGamesCatalogService grammarGamesCatalogService(GrammarGameTopicRepository topics,
                                                              GrammarGameMetaRepository meta, ObjectMapper mapper) {
            return new GrammarGamesCatalogService(topics, meta, mapper);
        }

        @Bean
        GrammarGamesUploadService grammarGamesUploadService(GrammarGameTopicRepository topics,
                                                            GrammarGameMetaRepository meta,
                                                            GrammarGamesCatalogService catalog, ObjectMapper mapper) {
            return new GrammarGamesUploadService(topics, meta, catalog, mapper);
        }
    }

    @Autowired
    private GrammarGamesUploadService upload;
    @Autowired
    private GrammarGamesCatalogService catalog;
    @Autowired
    private GrammarGameTopicRepository topics;
    @Autowired
    private GrammarGameMetaRepository meta;

    @BeforeEach
    void clean() {
        catalog.clearCache();
    }

    private static byte[] bytes(String s) {
        return s.getBytes(StandardCharsets.UTF_8);
    }

    private UploadResult uploadHtml(GrammarGamesBundle b) {
        return upload.upload(bytes(html(b)), "jts-grammar-games.html", 7L);
    }

    @Test
    @DisplayName("первая заливка html создаёт темы и мету, автор записан")
    void firstUpload() {
        UploadResult r = uploadHtml(bundle(topic("L1-01"), topic("L1-02")));

        assertThat(r).isEqualTo(new UploadResult(2, 2, 0, 0, java.util.List.of()));
        GrammarGameTopic row = topics.findById("L1-02").orElseThrow();
        assertThat(row.getLevel()).isEqualTo("L1");
        assertThat(row.getNumber()).isEqualTo(2);
        assertThat(row.getTitleRu()).isEqualTo("Тема L1-02 ru");
        assertThat(row.getHidden()).isFalse();
        assertThat(row.getUpdatedBy()).isEqualTo(7L);
        assertThat(meta.findAll()).hasSize(1);
        assertThat(catalog.index().topics()).hasSize(2);
    }

    @Test
    @DisplayName("повтор того же файла ничего не меняет; правка темы — updated; скрытие не сбрасывается")
    void reupload() {
        uploadHtml(bundle(topic("L1-01"), topic("L1-02")));
        GrammarGameTopic hidden = topics.findById("L1-02").orElseThrow();
        hidden.setHidden(true);
        topics.save(hidden);

        assertThat(uploadHtml(bundle(topic("L1-01"), topic("L1-02")))).isEqualTo(new UploadResult(2, 0, 0, 2, java.util.List.of()));

        ObjectNode changed = topic("L1-02");
        ((ObjectNode) changed.get("title")).put("ru", "Новое название");
        assertThat(uploadHtml(bundle(topic("L1-01"), changed)).updated()).isEqualTo(1);
        GrammarGameTopic row = topics.findById("L1-02").orElseThrow();
        assertThat(row.getTitleRu()).isEqualTo("Новое название");
        assertThat(row.getHidden()).as("заливка не трогает видимость").isTrue();
    }

    @Test
    @DisplayName("тем, которых нет в файле, заливка не удаляет")
    void keepsAbsentTopics() {
        uploadHtml(bundle(topic("L1-01"), topic("L1-02")));
        uploadHtml(bundle(topic("L1-01")));
        assertThat(topics.findAll()).hasSize(2);
    }

    @Test
    @DisplayName("zip: новая тема берёт hidden из файла, само поле в тело не попадает")
    void zipHiddenForNewTopics() {
        byte[] zip = GrammarGamesZip.write(bundle(topic("L1-01"), topic("L2-01")), Set.of("L2-01"));
        UploadResult r = upload.upload(zip, "grammar-games.zip", 7L);

        assertThat(r.created()).isEqualTo(2);
        GrammarGameTopic row = topics.findById("L2-01").orElseThrow();
        assertThat(row.getHidden()).isTrue();
        assertThat(row.getBody()).doesNotContain("\"hidden\"");
    }

    @Test
    @DisplayName("ошибка проверки отклоняет всю заливку, в базе пусто")
    void rejectsInvalid() {
        ObjectNode bad = topic("L1-02");
        bad.put("color", "red");

        assertThatThrownBy(() -> uploadHtml(bundle(topic("L1-01"), bad)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageStartingWith("Файл не прошёл проверку:")
                .hasMessageContaining("L1-02 · color");
        assertThat(topics.findAll()).isEmpty();
        assertThat(meta.findAll()).isEmpty();
    }

    @Test
    @DisplayName("неизвестное расширение — 400; предупреждения программы — в ответе")
    void extensionAndWarnings() {
        assertThatThrownBy(() -> upload.upload(bytes("x"), "topics.txt", 7L))
                .isInstanceOf(BadRequestException.class).hasMessage("Нужен html прототипа или zip с темами");

        GrammarGamesBundle b = bundle(topic("L1-01"));
        ObjectNode extra = GrammarGamesFixtures.M.createObjectNode();
        extra.put("id", "L1-02");
        b.program().add(extra);
        assertThat(uploadHtml(b).warnings()).containsExactly("В программе есть L1-02, а темы в файле нет");
    }
}
```

- [ ] **Step 2: Запустить — падает**

Run: `./gradlew test --tests '*GrammarGamesUploadServiceTest'`
Expected: FAIL — «cannot find symbol GrammarGamesUploadService».

- [ ] **Step 3: Строки тем**

`M/modules/grammargames/service/GrammarTopicRows.java`:

```java
package kz.education.server.modules.grammargames.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import kz.education.server.modules.grammargames.model.GrammarGameTopic;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.AdminRow;

import java.util.List;

/** Тема ↔ строка таблицы: общая часть заливки и правки из админки, чтобы колонки заполнялись одинаково. */
final class GrammarTopicRows {

    private static final int TITLE_MAX = 200;

    private GrammarTopicRows() {
    }

    /** Колонки из темы; видимость здесь не трогается — её решают заливка и переключатель админки. */
    static void fill(GrammarGameTopic row, ObjectNode topic, String json, Long userId) {
        row.setLevel(topic.path("lv").asText());
        row.setNumber(topic.path("n").asInt());
        String title = topic.path("title").path("ru").asText("");
        row.setTitleRu(title.length() > TITLE_MAX ? title.substring(0, TITLE_MAX) : title);
        row.setBody(json);
        row.setUpdatedBy(userId);
    }

    static AdminRow adminRow(GrammarGameTopic row, JsonNode body) {
        return new AdminRow(row.getId(), row.getLevel(), row.getNumber(), body.path("icon").asText(""),
                row.getTitleRu(), Boolean.TRUE.equals(row.getHidden()), GrammarGameStages.stagesOf(body).size(),
                row.getUpdatedAt());
    }

    static String problemsMessage(String head, List<String> problems) {
        return head + "\n" + String.join("\n", problems);
    }
}
```

- [ ] **Step 4: Сервис заливки**

`M/modules/grammargames/service/GrammarGamesUploadService.java`:

```java
package kz.education.server.modules.grammargames.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import kz.education.server.modules.grammargames.model.GrammarGameMeta;
import kz.education.server.modules.grammargames.model.GrammarGameTopic;
import kz.education.server.modules.grammargames.repository.GrammarGameMetaRepository;
import kz.education.server.modules.grammargames.repository.GrammarGameTopicRepository;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.UploadResult;
import kz.education.server.shared.exception.types.BadRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Заливка раздела: html прототипа или zip формата ТЗ. Всё или ничего: одна ошибка проверки — и в базе ничего не
 * меняется. Медиа у раздела нет (картинки — статика сайта), поэтому хватает одной транзакции на сотню строк.
 * Темы, которых нет в файле, остаются: заливка частичного архива не должна стирать остальной курс.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GrammarGamesUploadService {

    private final GrammarGameTopicRepository topics;
    private final GrammarGameMetaRepository meta;
    private final GrammarGamesCatalogService catalog;
    private final ObjectMapper mapper;

    @Transactional
    public UploadResult upload(byte[] file, String fileName, Long userId) {
        GrammarGamesBundle bundle = parse(file, fileName);
        Map<String, Boolean> hiddenInFile = takeHiddenFlags(bundle);
        List<String> problems = GrammarTopicValidator.problems(bundle);
        if (!problems.isEmpty()) {
            throw new BadRequestException(GrammarTopicRows.problemsMessage("Файл не прошёл проверку:", problems));
        }
        Map<String, GrammarGameTopic> existing = new HashMap<>();
        topics.findAllById(bundle.topics().stream().map(t -> t.path("id").asText()).toList())
                .forEach(row -> existing.put(row.getId(), row));
        int created = 0;
        int updated = 0;
        int unchanged = 0;
        List<GrammarGameTopic> changed = new ArrayList<>();
        for (ObjectNode topic : bundle.topics()) {
            String id = topic.path("id").asText();
            String json = write(topic);
            GrammarGameTopic row = existing.get(id);
            if (row == null) {
                row = new GrammarGameTopic();
                row.setId(id);
                row.setHidden(hiddenInFile.getOrDefault(id, false));
                created++;
            } else if (json.equals(row.getBody())) {
                unchanged++;
                continue;
            } else {
                updated++;
            }
            GrammarTopicRows.fill(row, topic, json, userId);
            changed.add(row);
        }
        topics.saveAll(changed);
        saveMeta(bundle, userId);
        catalog.clearCacheNowAndAfterCommit();
        log.info("Грамматика · игры: залит {} ({} тем: новых {}, изменено {}, без изменений {})",
                fileName, bundle.topics().size(), created, updated, unchanged);
        return new UploadResult(bundle.topics().size(), created, updated, unchanged, GrammarTopicValidator.warnings(bundle));
    }

    private GrammarGamesBundle parse(byte[] file, String fileName) {
        String name = fileName == null ? "" : fileName.toLowerCase(Locale.ROOT);
        if (name.endsWith(".html") || name.endsWith(".htm")) {
            return GrammarGamesHtmlParser.parse(new String(file, StandardCharsets.UTF_8));
        }
        if (name.endsWith(".zip")) return GrammarGamesZip.read(file);
        throw new BadRequestException("Нужен html прототипа или zip с темами");
    }

    /**
     * Поле hidden приходит только из выгрузки админки. В тело темы оно не попадает — видимость живёт колонкой —
     * и решает только для НОВОЙ темы: перенос на другой стенд сохраняет скрытое скрытым.
     */
    private static Map<String, Boolean> takeHiddenFlags(GrammarGamesBundle bundle) {
        Map<String, Boolean> flags = new HashMap<>();
        for (ObjectNode topic : bundle.topics()) {
            JsonNode hidden = topic.remove("hidden");
            if (hidden != null) flags.put(topic.path("id").asText(), hidden.asBoolean(false));
        }
        return flags;
    }

    private void saveMeta(GrammarGamesBundle bundle, Long userId) {
        GrammarGameMeta m = meta.findById(GrammarGameMeta.SINGLETON_ID).orElseGet(GrammarGameMeta::new);
        m.setLevels(write(bundle.levels()));
        m.setProgram(write(bundle.program()));
        m.setGloss(write(bundle.gloss()));
        m.setUpdatedBy(userId);
        meta.save(m);
    }

    private String write(JsonNode node) {
        try {
            return mapper.writeValueAsString(node);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Грамматика · игры: не удалось записать JSON", e);
        }
    }
}
```

- [ ] **Step 5: Тест проходит**

Run: `./gradlew test --tests '*GrammarGamesUploadServiceTest'`
Expected: PASS, 6 тестов.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/kz/education/server/modules/grammargames/service/GrammarTopicRows.java src/main/java/kz/education/server/modules/grammargames/service/GrammarGamesUploadService.java src/test/java/kz/education/server/modules/grammargames/service/GrammarGamesUploadServiceTest.java
git commit -m "feat(grammar-games): заливка html прототипа и zip

Всё или ничего; темы — upsert без удаления отсутствующих; видимость
существующей темы не меняется, новая берёт hidden из выгрузки.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Админка — `GrammarGamesAdminService`

**Files:**
- Create: `M/modules/grammargames/service/GrammarGamesAdminService.java`
- Test: `T/modules/grammargames/service/GrammarGamesAdminServiceTest.java`

**Interfaces:**
- Consumes: `GrammarTopicRows` (Task 7), `GrammarTopicValidator` (Task 3), `GrammarGamesZip.write` (Task 4), `GrammarGamesCatalogService` (Task 6), `GrammarGamesUploadService` (в тесте).
- Produces: `GrammarGamesAdminService.list(String level) → List<AdminRow>`, `topic(String id) → JsonNode` (и скрытая), `update(String id, JsonNode body, Long userId) → AdminRow`, `setHidden(String id, Boolean hidden, Long userId) → AdminRow`, `export() → byte[]`.

- [ ] **Step 1: Падающий тест**

`T/modules/grammargames/service/GrammarGamesAdminServiceTest.java`:

```java
package kz.education.server.modules.grammargames.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import kz.education.server.modules.grammargames.GrammarGamesJpaConfig;
import kz.education.server.modules.grammargames.repository.GrammarGameMetaRepository;
import kz.education.server.modules.grammargames.repository.GrammarGameTopicRepository;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.AdminRow;
import kz.education.server.shared.exception.types.BadRequestException;
import kz.education.server.shared.exception.types.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;

import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.bundle;
import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.html;
import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.topic;
import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.withPlace;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = GrammarGamesAdminServiceTest.Context.class)
@Transactional
@DisplayName("GrammarGamesAdminService — правка тем в админке")
class GrammarGamesAdminServiceTest {

    @Configuration
    @Import(GrammarGamesJpaConfig.class)
    static class Context {
        @Bean
        GrammarGamesCatalogService grammarGamesCatalogService(GrammarGameTopicRepository topics,
                                                              GrammarGameMetaRepository meta, ObjectMapper mapper) {
            return new GrammarGamesCatalogService(topics, meta, mapper);
        }

        @Bean
        GrammarGamesUploadService grammarGamesUploadService(GrammarGameTopicRepository topics,
                                                            GrammarGameMetaRepository meta,
                                                            GrammarGamesCatalogService catalog, ObjectMapper mapper) {
            return new GrammarGamesUploadService(topics, meta, catalog, mapper);
        }

        @Bean
        GrammarGamesAdminService grammarGamesAdminService(GrammarGameTopicRepository topics,
                                                          GrammarGameMetaRepository meta,
                                                          GrammarGamesCatalogService catalog, ObjectMapper mapper) {
            return new GrammarGamesAdminService(topics, meta, catalog, mapper);
        }
    }

    @Autowired
    private GrammarGamesAdminService admin;
    @Autowired
    private GrammarGamesUploadService upload;
    @Autowired
    private GrammarGamesCatalogService catalog;

    @BeforeEach
    void seed() {
        catalog.clearCache();
        upload.upload(html(bundle(topic("L1-01"), withPlace(topic("L1-10")), topic("L2-01")))
                .getBytes(StandardCharsets.UTF_8), "p.html", 7L);
    }

    @Test
    @DisplayName("список уровня — со скрытыми и числом игр; неверный уровень — 400")
    void list() {
        admin.setHidden("L1-10", true, 7L);

        assertThat(admin.list("L1")).extracting(AdminRow::id, AdminRow::hidden, AdminRow::games)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("L1-01", false, 12),
                        org.assertj.core.groups.Tuple.tuple("L1-10", true, 13));
        assertThat(admin.list(null)).hasSize(3);
        assertThatThrownBy(() -> admin.list("A1")).isInstanceOf(BadRequestException.class).hasMessage("Уровень — L1…L5");
    }

    @Test
    @DisplayName("тема видна админке и скрытой; несуществующая — 404")
    void topicForAdmin() {
        admin.setHidden("L2-01", true, 7L);
        assertThat(admin.topic("L2-01").path("id").asText()).isEqualTo("L2-01");
        assertThatThrownBy(() -> admin.topic("L5-01")).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("правка: проверка, тот же id, без поля hidden; ученик видит сразу")
    void update() {
        ObjectNode body = topic("L1-01");
        ((ObjectNode) body.get("title")).put("ru", "Глагол to be");
        body.put("hidden", true);

        AdminRow row = admin.update("L1-01", body, 9L);

        assertThat(row.titleRu()).isEqualTo("Глагол to be");
        assertThat(row.hidden()).as("hidden из тела не применяется").isFalse();
        assertThat(admin.topic("L1-01").has("hidden")).isFalse();
        assertThat(catalog.topic("L1-01").path("title").path("ru").asText()).isEqualTo("Глагол to be");
    }

    @Test
    @DisplayName("правка с ошибкой или чужим id — 400, тема прежняя")
    void updateRejects() {
        ObjectNode bad = topic("L1-01");
        bad.put("color", "red");
        assertThatThrownBy(() -> admin.update("L1-01", bad, 9L))
                .isInstanceOf(BadRequestException.class).hasMessageStartingWith("Тема не прошла проверку:");
        assertThatThrownBy(() -> admin.update("L1-01", topic("L1-02"), 9L))
                .isInstanceOf(BadRequestException.class).hasMessage("id в теме (L1-02) не совпадает с адресом (L1-01)");
        assertThatThrownBy(() -> admin.update("L5-01", topic("L5-01"), 9L)).isInstanceOf(ResourceNotFoundException.class);
        assertThat(admin.topic("L1-01").path("color").asText()).isEqualTo("#874BF6");
    }

    @Test
    @DisplayName("скрытие убирает тему у ученика; hidden null — 400")
    void hide() {
        admin.setHidden("L1-01", true, 7L);
        assertThatThrownBy(() -> catalog.topic("L1-01")).isInstanceOf(ResourceNotFoundException.class);
        admin.setHidden("L1-01", false, 7L);
        assertThat(catalog.topic("L1-01")).isNotNull();
        assertThatThrownBy(() -> admin.setHidden("L1-01", null, 7L)).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("выгрузка → заливка того же архива ничего не меняет")
    void exportRoundTrip() {
        admin.setHidden("L2-01", true, 7L);
        byte[] zip = admin.export();

        GrammarGamesBundle read = GrammarGamesZip.read(zip);
        assertThat(read.topics()).hasSize(3);
        assertThat(read.topics().get(2).path("hidden").asBoolean()).isTrue();
        assertThat(upload.upload(zip, "grammar-games.zip", 7L).unchanged()).isEqualTo(3);
    }
}
```

- [ ] **Step 2: Запустить — падает**

Run: `./gradlew test --tests '*GrammarGamesAdminServiceTest'`
Expected: FAIL — «cannot find symbol GrammarGamesAdminService».

- [ ] **Step 3: Реализация**

`M/modules/grammargames/service/GrammarGamesAdminService.java`:

```java
package kz.education.server.modules.grammargames.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import kz.education.server.modules.grammargames.model.GrammarGameMeta;
import kz.education.server.modules.grammargames.model.GrammarGameTopic;
import kz.education.server.modules.grammargames.repository.GrammarGameMetaRepository;
import kz.education.server.modules.grammargames.repository.GrammarGameTopicRepository;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.AdminRow;
import kz.education.server.shared.exception.types.BadRequestException;
import kz.education.server.shared.exception.types.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Темы глазами контент-менеджера: список со скрытыми, правка одной темы той же проверкой, что у заливки,
 * видимость и выгрузка в zip (её же принимает заливка — перенос между стендами). Новых тем форма не создаёт:
 * они приходят заливкой — у темы фиксированный id, на нём прогресс.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GrammarGamesAdminService {

    private final GrammarGameTopicRepository topics;
    private final GrammarGameMetaRepository meta;
    private final GrammarGamesCatalogService catalog;
    private final ObjectMapper mapper;

    @Transactional(readOnly = true)
    public List<AdminRow> list(String level) {
        List<GrammarGameTopic> rows;
        if (level == null || level.isBlank()) {
            rows = topics.findAllByOrderByLevelAscNumberAsc();
        } else {
            if (!GrammarTopicValidator.LEVEL.matcher(level).matches()) throw new BadRequestException("Уровень — L1…L5");
            rows = topics.findByLevelOrderByNumberAsc(level);
        }
        return rows.stream().map(r -> GrammarTopicRows.adminRow(r, read(r.getBody()))).toList();
    }

    @Transactional(readOnly = true)
    public JsonNode topic(String id) {
        return read(row(id).getBody());
    }

    @Transactional
    public AdminRow update(String id, JsonNode body, Long userId) {
        GrammarGameTopic row = row(id);
        if (body == null || !body.isObject()) throw new BadRequestException("Нужна тема JSON-объектом");
        ObjectNode topic = ((ObjectNode) body).deepCopy();
        // видимость живёт колонкой и меняется только переключателем — иначе её поле тянулось бы из старой выгрузки
        topic.remove("hidden");
        String bodyId = topic.path("id").asText();
        if (!id.equals(bodyId)) {
            throw new BadRequestException("id в теме (" + bodyId + ") не совпадает с адресом (" + id + ")");
        }
        List<String> problems = GrammarTopicValidator.capped(GrammarTopicValidator.problems(topic));
        if (!problems.isEmpty()) {
            throw new BadRequestException(GrammarTopicRows.problemsMessage("Тема не прошла проверку:", problems));
        }
        GrammarTopicRows.fill(row, topic, write(topic), userId);
        topics.save(row);
        catalog.clearCacheNowAndAfterCommit();
        log.info("Грамматика · игры: тема {} изменена в админке", id);
        return GrammarTopicRows.adminRow(row, topic);
    }

    @Transactional
    public AdminRow setHidden(String id, Boolean hidden, Long userId) {
        if (hidden == null) throw new BadRequestException("Нужно поле hidden: true или false");
        GrammarGameTopic row = row(id);
        row.setHidden(hidden);
        row.setUpdatedBy(userId);
        topics.save(row);
        catalog.clearCacheNowAndAfterCommit();
        return GrammarTopicRows.adminRow(row, read(row.getBody()));
    }

    @Transactional(readOnly = true)
    public byte[] export() {
        GrammarGameMeta m = meta.findById(GrammarGameMeta.SINGLETON_ID)
                .orElseThrow(() -> new ResourceNotFoundException(GrammarGamesCatalogService.NOT_UPLOADED));
        List<GrammarGameTopic> rows = topics.findAllByOrderByLevelAscNumberAsc();
        List<ObjectNode> list = rows.stream().map(r -> (ObjectNode) read(r.getBody())).toList();
        Set<String> hidden = rows.stream().filter(r -> Boolean.TRUE.equals(r.getHidden()))
                .map(GrammarGameTopic::getId).collect(Collectors.toSet());
        GrammarGamesBundle bundle = new GrammarGamesBundle((ArrayNode) read(m.getLevels()), (ArrayNode) read(m.getProgram()),
                (ObjectNode) read(m.getGloss()), list);
        return GrammarGamesZip.write(bundle, hidden);
    }

    private GrammarGameTopic row(String id) {
        return topics.findById(id).orElseThrow(() -> new ResourceNotFoundException(GrammarGamesCatalogService.NO_TOPIC));
    }

    private JsonNode read(String json) {
        try {
            return mapper.readTree(json);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Грамматика · игры: в базе не JSON", e);
        }
    }

    private String write(JsonNode node) {
        try {
            return mapper.writeValueAsString(node);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Грамматика · игры: не удалось записать JSON", e);
        }
    }
}
```

- [ ] **Step 4: Тест проходит**

Run: `./gradlew test --tests '*GrammarGamesAdminServiceTest'`
Expected: PASS, 6 тестов.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/kz/education/server/modules/grammargames/service/GrammarGamesAdminService.java src/test/java/kz/education/server/modules/grammargames/service/GrammarGamesAdminServiceTest.java
git commit -m "feat(grammar-games): список, правка, видимость и выгрузка тем

Правка — той же проверкой, что заливка; выгрузку принимает заливка как есть.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Результат игры и монеты — `GrammarGamesProgressService`, `GrammarGamesRewards`

**Files:**
- Create: `M/modules/grammargames/service/GrammarGamesRewards.java`
- Create: `M/modules/grammargames/service/GrammarGamesProgressService.java`
- Test: `T/modules/grammargames/service/GrammarGamesProgressServiceTest.java`

**Interfaces:**
- Consumes: `GrammarGamesCatalogService.topic` (Task 6), `PracticeCoinRulesService.coins` (Task 5), `GrammarGameStages` (Task 2), `GrammarGameProgressRepository` (Task 1); `CoinsService.credit(User, int, CoinTransactionType, String)`, `XpService.awardXp(User, int)`, `MobileStreakService.registerActivity(User)`.
- Produces: `GrammarGamesRewards.award(User user, int coins, String description)`, `markActivity(User user)`; `GrammarGamesProgressService.stars(Long userId) → Map<String, Map<String,Integer>>`, `record(User user, ResultRequest request) → ResultOutcome`, `static String description(JsonNode topic, String game)`.

- [ ] **Step 1: Падающий тест**

`T/modules/grammargames/service/GrammarGamesProgressServiceTest.java`:

```java
package kz.education.server.modules.grammargames.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import kz.education.server.modules.grammargames.GrammarGamesJpaConfig;
import kz.education.server.modules.grammargames.repository.GrammarGameMetaRepository;
import kz.education.server.modules.grammargames.repository.GrammarGameProgressRepository;
import kz.education.server.modules.grammargames.repository.GrammarGameTopicRepository;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.ResultOutcome;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.ResultRequest;
import kz.education.server.modules.practice.coins.PracticeCoinRule;
import kz.education.server.modules.practice.coins.PracticeCoinRuleRepository;
import kz.education.server.modules.practice.coins.PracticeCoinRulesService;
import kz.education.server.modules.user.model.User;
import kz.education.server.shared.exception.types.BadRequestException;
import kz.education.server.shared.exception.types.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;

import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.bundle;
import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.html;
import static kz.education.server.modules.grammargames.service.GrammarGamesFixtures.topic;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = GrammarGamesProgressServiceTest.Context.class)
@Transactional
@DisplayName("GrammarGamesProgressService — результат игры и монеты")
class GrammarGamesProgressServiceTest {

    @Configuration
    @Import(GrammarGamesJpaConfig.class)
    static class Context {
        @Bean
        GrammarGamesCatalogService grammarGamesCatalogService(GrammarGameTopicRepository topics,
                                                              GrammarGameMetaRepository meta, ObjectMapper mapper) {
            return new GrammarGamesCatalogService(topics, meta, mapper);
        }

        @Bean
        GrammarGamesUploadService grammarGamesUploadService(GrammarGameTopicRepository topics,
                                                            GrammarGameMetaRepository meta,
                                                            GrammarGamesCatalogService catalog, ObjectMapper mapper) {
            return new GrammarGamesUploadService(topics, meta, catalog, mapper);
        }

        @Bean
        PracticeCoinRulesService practiceCoinRulesService(PracticeCoinRuleRepository rules) {
            return new PracticeCoinRulesService(rules);
        }

        @Bean
        GrammarGamesRewards grammarGamesRewards() {
            return Mockito.mock(GrammarGamesRewards.class);
        }

        @Bean
        GrammarGamesProgressService grammarGamesProgressService(GrammarGameProgressRepository progress,
                                                                GrammarGamesCatalogService catalog,
                                                                PracticeCoinRulesService coinRules,
                                                                GrammarGamesRewards rewards) {
            return new GrammarGamesProgressService(progress, catalog, coinRules, rewards);
        }
    }

    @Autowired
    private GrammarGamesProgressService service;
    @Autowired
    private GrammarGamesUploadService upload;
    @Autowired
    private GrammarGamesCatalogService catalog;
    @Autowired
    private GrammarGamesRewards rewards;
    @Autowired
    private PracticeCoinRuleRepository rules;

    private final User user = new User();

    @BeforeEach
    void seed() {
        Mockito.reset(rewards);
        catalog.clearCache();
        user.setId(7L);
        upload.upload(html(bundle(topic("L1-01"))).getBytes(StandardCharsets.UTF_8), "p.html", 1L);
    }

    private ResultOutcome play(String game, int stars) {
        return service.record(user, new ResultRequest("L1-01", game, stars));
    }

    @Test
    @DisplayName("первая игра на 2★ даёт min(лимит 2, 3) = 2 монеты и стрик")
    void firstGame() {
        assertThat(play("pick", 2)).isEqualTo(new ResultOutcome(2, 2));
        verify(rewards).award(user, 2, "Грамматика · игры: Тема L1-01 ru · Выбери форму");
        verify(rewards).markActivity(user);
    }

    @Test
    @DisplayName("повтор без улучшения — ноль монет, но стрик и попытка засчитаны")
    void replayWithoutImprovement() {
        play("pick", 2);
        Mockito.reset(rewards);

        assertThat(play("pick", 1)).isEqualTo(new ResultOutcome(2, 0));
        verify(rewards, never()).award(any(), anyInt(), anyString());
        verify(rewards).markActivity(user);
        assertThat(service.stars(7L)).containsEntry("L1-01", java.util.Map.of("pick", 2));
    }

    @Test
    @DisplayName("улучшение «Впиши сам» 1★ → 3★ даёт разницу 3 − 2 = 1")
    void improvement() {
        play("type", 1);
        Mockito.reset(rewards);
        assertThat(play("type", 3)).isEqualTo(new ResultOutcome(3, 1));
        verify(rewards).award(user, 1, "Грамматика · игры: Тема L1-01 ru · Впиши сам");
    }

    @Test
    @DisplayName("0★ — ни монет, ни стрика; бой платит лимит один раз")
    void zeroAndBoss() {
        assertThat(play("boss", 0)).isEqualTo(new ResultOutcome(0, 0));
        verify(rewards, never()).markActivity(any());
        assertThat(play("boss", 1).coins()).isEqualTo(5);
        assertThat(play("boss", 3).coins()).isZero();
    }

    @Test
    @DisplayName("лимит берётся из правил монет")
    void limitFromRules() {
        PracticeCoinRule rule = new PracticeCoinRule();
        rule.setRuleKey("grammar-games.pick");
        rule.setCoins(1);
        rules.save(rule);
        assertThat(play("pick", 3).coins()).isEqualTo(1);
    }

    @Test
    @DisplayName("чужая игра, неверные звёзды, нет темы — отказ")
    void rejects() {
        assertThatThrownBy(() -> play("place", 2))
                .isInstanceOf(BadRequestException.class).hasMessage("В теме L1-01 нет игры place");
        assertThatThrownBy(() -> play("pick", 4))
                .isInstanceOf(BadRequestException.class).hasMessage("Звёзды — от 0 до 3");
        assertThatThrownBy(() -> service.record(user, new ResultRequest("L5-01", "pick", 1)))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.record(user, null)).isInstanceOf(BadRequestException.class);
    }
}
```

- [ ] **Step 2: Запустить — падает**

Run: `./gradlew test --tests '*GrammarGamesProgressServiceTest'`
Expected: FAIL — «cannot find symbol GrammarGamesProgressService / GrammarGamesRewards».

- [ ] **Step 3: Награды**

`M/modules/grammargames/service/GrammarGamesRewards.java`:

```java
package kz.education.server.modules.grammargames.service;

import kz.education.server.modules.user.model.CoinTransactionType;
import kz.education.server.modules.user.model.User;
import kz.education.server.modules.xp.service.XpService;
import kz.education.server.presentation.mobile.streak.service.CoinsService;
import kz.education.server.presentation.mobile.streak.service.MobileStreakService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Монеты, XP и стрик за игру. Монеты и XP — поровну, как completeLessonModule, через который начисляет вся остальная
 * «Практика»: в шапке у ученика обе цифры растут одинаково, какой бы раздел он ни проходил.
 */
@Component
@RequiredArgsConstructor
public class GrammarGamesRewards {

    private final CoinsService coinsService;
    private final XpService xpService;
    private final MobileStreakService streakService;

    public void award(User user, int coins, String description) {
        xpService.awardXp(user, coins);
        coinsService.credit(user, coins, CoinTransactionType.EARN_ACTIVITY, description);
    }

    public void markActivity(User user) {
        streakService.registerActivity(user);
    }
}
```

- [ ] **Step 4: Результат игры**

`M/modules/grammargames/service/GrammarGamesProgressService.java`:

```java
package kz.education.server.modules.grammargames.service;

import com.fasterxml.jackson.databind.JsonNode;
import kz.education.server.modules.grammargames.model.GrammarGameProgress;
import kz.education.server.modules.grammargames.repository.GrammarGameProgressRepository;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.ResultOutcome;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.ResultRequest;
import kz.education.server.modules.practice.coins.PracticeCoinRulesService;
import kz.education.server.modules.user.model.User;
import kz.education.server.shared.exception.types.BadRequestException;
import kz.education.server.shared.exception.types.ConflictException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.TreeMap;

/**
 * Итог игры от сайта: лучший результат по звёздам и монеты за прирост. Звёзды считает браузер (ответов игры сервер
 * не видит), поэтому награда ограничена сверху правилом монет игры — накрутить больше лимита игры нельзя.
 */
@Service
@RequiredArgsConstructor
public class GrammarGamesProgressService {

    private final GrammarGameProgressRepository progress;
    private final GrammarGamesCatalogService catalog;
    private final PracticeCoinRulesService coinRules;
    private final GrammarGamesRewards rewards;

    @Transactional(readOnly = true)
    public Map<String, Map<String, Integer>> stars(Long userId) {
        Map<String, Map<String, Integer>> out = new TreeMap<>();
        progress.findByUserId(userId).forEach(p ->
                out.computeIfAbsent(p.getTopicId(), k -> new TreeMap<>()).put(p.getGame(), p.getBestStars()));
        return out;
    }

    @Transactional
    public ResultOutcome record(User user, ResultRequest request) {
        if (request == null) throw new BadRequestException("Нет результата игры");
        int stars = checkedStars(request.stars());
        String topicId = request.topicId();
        String game = request.game();
        if (topicId == null || topicId.isBlank() || game == null || game.isBlank()) {
            throw new BadRequestException("Нужны тема и игра");
        }
        JsonNode topic = catalog.topic(topicId);
        if (!GrammarGameStages.stagesOf(topic).contains(game)) {
            throw new BadRequestException("В теме " + topicId + " нет игры " + game);
        }
        GrammarGameProgress row = progress.findByUserIdAndTopicIdAndGame(user.getId(), topicId, game)
                .orElseGet(() -> fresh(user.getId(), topicId, game));
        int oldBest = row.getBestStars();
        int best = Math.max(oldBest, stars);
        row.setBestStars(best);
        row.setAttempts(row.getAttempts() + 1);
        row.setLastPlayedAt(Instant.now());
        save(row);
        int limit = coinRules.coins(GrammarGameStages.RULE_PREFIX + game, GrammarGameStages.DEFAULT_COINS.get(game));
        int coins = GrammarGameStages.coinsDelta(game, oldBest, best, limit);
        if (coins > 0) rewards.award(user, coins, description(topic, game));
        // стрик держит любая доигранная игра, а не только улучшение: иначе повторение пройденного его не продлевало бы
        if (stars > 0) rewards.markActivity(user);
        return new ResultOutcome(best, coins);
    }

    static String description(JsonNode topic, String game) {
        String title = topic.path("title").path("ru").asText(topic.path("id").asText());
        return "Грамматика · игры: " + title + " · " + GrammarGameStages.NAMES_RU.get(game);
    }

    private static int checkedStars(Integer stars) {
        if (stars == null || stars < 0 || stars > GrammarGameStages.MAX_STARS) {
            throw new BadRequestException("Звёзды — от 0 до " + GrammarGameStages.MAX_STARS);
        }
        return stars;
    }

    /**
     * Первую строку двух одновременных сдач ловит уникальный ключ: вторая получает 409 и повторяется сайтом, а
     * повтор уже видит записанный результат — монеты за один прирост дважды не приходят.
     */
    private void save(GrammarGameProgress row) {
        try {
            progress.saveAndFlush(row);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException("Результат этой игры уже записывается — повторите");
        }
    }

    private static GrammarGameProgress fresh(Long userId, String topicId, String game) {
        GrammarGameProgress p = new GrammarGameProgress();
        p.setUserId(userId);
        p.setTopicId(topicId);
        p.setGame(game);
        return p;
    }
}
```

- [ ] **Step 5: Тест проходит**

Run: `./gradlew test --tests '*GrammarGamesProgressServiceTest'`
Expected: PASS, 6 тестов.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/kz/education/server/modules/grammargames/service/GrammarGamesRewards.java src/main/java/kz/education/server/modules/grammargames/service/GrammarGamesProgressService.java src/test/java/kz/education/server/modules/grammargames/service/GrammarGamesProgressServiceTest.java
git commit -m "feat(grammar-games): результат игры, лучший итог и монеты за прирост

Лимит — из правил монет; XP поровну с монетами, как completeLessonModule;
стрик — за любую доигранную игру; двойная первая сдача — 409.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: HTTP — контроллеры админки и ученика

**Files:**
- Create: `M/presentation/admin/grammargames/controller/AdminGrammarGamesController.java`
- Create: `M/presentation/mobile/grammargames/controller/MobileGrammarGamesController.java`
- Create: `M/presentation/mobile/grammargames/dto/GrammarGamesResultResponse.java`
- Test: `T/presentation/grammargames/GrammarGamesControllersTest.java`

**Interfaces:**
- Consumes: сервисы Task 5–9; `SecurityUtils.userId()`, `SecurityUtils.getCurrentUser()`; `BalanceService.getBalanceInfo(User) → BalanceInfo`.
- Produces: `POST /admin/grammar-games/upload` (multipart `file`), `GET /admin/grammar-games/topics?level=`, `GET|PUT|PATCH /admin/grammar-games/topics/{id}`, `GET /admin/grammar-games/export`; `GET /mobile/grammar-games`, `GET /mobile/grammar-games/topics/{id}`, `GET /mobile/grammar-games/gloss`, `GET /mobile/grammar-games/progress`, `POST /mobile/grammar-games/result` → `GrammarGamesResultResponse(int best, int coins, BalanceInfo balance)`.

- [ ] **Step 1: Падающий тест**

`T/presentation/grammargames/GrammarGamesControllersTest.java`:

```java
package kz.education.server.presentation.grammargames;

import kz.education.server.modules.grammargames.service.GrammarGamesAdminService;
import kz.education.server.modules.grammargames.service.GrammarGamesCatalogService;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.Progress;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.ResultOutcome;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.ResultRequest;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.UploadResult;
import kz.education.server.modules.grammargames.service.GrammarGamesProgressService;
import kz.education.server.modules.grammargames.service.GrammarGamesUploadService;
import kz.education.server.modules.user.model.User;
import kz.education.server.presentation.admin.grammargames.controller.AdminGrammarGamesController;
import kz.education.server.presentation.admin.practice.controller.AdminPracticeCoinRulesController;
import kz.education.server.presentation.mobile.balance.dto.BalanceInfo;
import kz.education.server.presentation.mobile.balance.service.BalanceService;
import kz.education.server.presentation.mobile.grammargames.controller.MobileGrammarGamesController;
import kz.education.server.presentation.mobile.grammargames.dto.GrammarGamesResultResponse;
import kz.education.server.shared.exception.types.BadRequestException;
import kz.education.server.shared.security.SecurityUtils;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Контроллеры без веб-среза (ему нужны бины перехватчиков IELTS/SAT/квот): права — по аннотациям, ответы — вызовом. */
@DisplayName("Грамматика · игры — HTTP")
class GrammarGamesControllersTest {

    private static final String STAFF = "hasAnyRole('ADMIN','CONTENT_MANAGER')";

    private final GrammarGamesUploadService upload = mock(GrammarGamesUploadService.class);
    private final GrammarGamesAdminService admin = mock(GrammarGamesAdminService.class);
    private final GrammarGamesCatalogService catalog = mock(GrammarGamesCatalogService.class);
    private final GrammarGamesProgressService progress = mock(GrammarGamesProgressService.class);
    private final BalanceService balance = mock(BalanceService.class);
    private final SecurityUtils security = mock(SecurityUtils.class);

    private final AdminGrammarGamesController adminController = new AdminGrammarGamesController(upload, admin, security);
    private final MobileGrammarGamesController mobileController =
            new MobileGrammarGamesController(catalog, progress, balance, security);

    @Test
    @DisplayName("админские ручки — только админ и контент-менеджер")
    void staffOnly() {
        assertThat(AdminGrammarGamesController.class.getAnnotation(PreAuthorize.class).value()).isEqualTo(STAFF);
        assertThat(AdminPracticeCoinRulesController.class.getAnnotation(PreAuthorize.class).value()).isEqualTo(STAFF);
        assertThat(MobileGrammarGamesController.class.getAnnotation(PreAuthorize.class))
                .as("ученику — любой вошедший, как /mobile/prepositions").isNull();
    }

    @Test
    @DisplayName("заливка: пустой файл, чужое расширение, слишком большой — 400 до сервиса")
    void uploadChecks() {
        assertThatThrownBy(() -> adminController.upload(new MockMultipartFile("file", "p.html", "text/html", new byte[0])))
                .isInstanceOf(BadRequestException.class).hasMessage("Выберите html прототипа или zip с темами");
        assertThatThrownBy(() -> adminController.upload(new MockMultipartFile("file", "p.pdf", "application/pdf", new byte[]{1})))
                .isInstanceOf(BadRequestException.class).hasMessage("Нужен html прототипа (.html) или zip (.zip)");
        byte[] big = new byte[(int) AdminGrammarGamesController.MAX_FILE_BYTES + 1];
        assertThatThrownBy(() -> adminController.upload(new MockMultipartFile("file", "p.zip", "application/zip", big)))
                .isInstanceOf(BadRequestException.class).hasMessage("Файл больше 16 МБ");
        verify(upload, never()).upload(any(), any(), any());
    }

    @Test
    @DisplayName("заливка передаёт байты, имя и автора")
    void uploadPasses() throws Exception {
        when(security.userId()).thenReturn(7L);
        UploadResult result = new UploadResult(1, 1, 0, 0, List.of());
        when(upload.upload(any(), eq("p.html"), eq(7L))).thenReturn(result);

        assertThat(adminController.upload(new MockMultipartFile("file", "p.html", "text/html", new byte[]{1}))).isEqualTo(result);
    }

    @Test
    @DisplayName("выгрузка — zip вложением")
    void export() {
        when(admin.export()).thenReturn(new byte[]{1, 2});
        ResponseEntity<byte[]> response = adminController.export();
        assertThat(response.getHeaders().getFirst("Content-Disposition")).isEqualTo("attachment; filename=\"grammar-games.zip\"");
        assertThat(response.getHeaders().getContentType()).hasToString("application/zip");
        assertThat(response.getBody()).containsExactly(1, 2);
    }

    @Test
    @DisplayName("результат: текущий ученик, ответ с балансом")
    void result() {
        User user = new User();
        user.setId(7L);
        when(security.getCurrentUser()).thenReturn(user);
        ResultRequest request = new ResultRequest("L1-01", "pick", 2);
        when(progress.record(user, request)).thenReturn(new ResultOutcome(2, 2));
        BalanceInfo info = new BalanceInfo();
        info.setCoins(12);
        when(balance.getBalanceInfo(user)).thenReturn(info);

        GrammarGamesResultResponse response = mobileController.result(request);

        assertThat(response.best()).isEqualTo(2);
        assertThat(response.coins()).isEqualTo(2);
        assertThat(response.balance().getCoins()).isEqualTo(12);
    }

    @Test
    @DisplayName("прогресс — свои звёзды")
    void progress() {
        when(security.userId()).thenReturn(7L);
        when(progress.stars(7L)).thenReturn(Map.of("L1-01", Map.of("pick", 3)));
        assertThat(mobileController.progress()).isEqualTo(new Progress(Map.of("L1-01", Map.of("pick", 3))));
    }
}
```

- [ ] **Step 2: Запустить — падает**

Run: `./gradlew test --tests '*GrammarGamesControllersTest'`
Expected: FAIL — «cannot find symbol AdminGrammarGamesController».

- [ ] **Step 3: Ответ результата**

`M/presentation/mobile/grammargames/dto/GrammarGamesResultResponse.java`:

```java
package kz.education.server.presentation.mobile.grammargames.dto;

import kz.education.server.presentation.mobile.balance.dto.BalanceInfo;

/** Итог сдачи игры: лучший результат, монеты за эту сдачу и свежий баланс для шапки. */
public record GrammarGamesResultResponse(int best, int coins, BalanceInfo balance) {
}
```

- [ ] **Step 4: Контроллер админки**

`M/presentation/admin/grammargames/controller/AdminGrammarGamesController.java`:

```java
package kz.education.server.presentation.admin.grammargames.controller;

import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import kz.education.server.modules.grammargames.service.GrammarGamesAdminService;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.AdminRow;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.HiddenBody;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.UploadResult;
import kz.education.server.modules.grammargames.service.GrammarGamesUploadService;
import kz.education.server.shared.exception.types.BadRequestException;
import kz.education.server.shared.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/admin/grammar-games")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','CONTENT_MANAGER')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin Grammar Games", description = "«Практика → Грамматика · игры»: заливка, темы, выгрузка (docs/practice/GRAMMAR_GAMES.md)")
public class AdminGrammarGamesController {

    /** Прототип весит ~4 МБ (из них 1,5 МБ картинок, которые не читаются); предел — от чужого гигабайта в памяти. */
    public static final long MAX_FILE_BYTES = 16L * 1024 * 1024;

    private final GrammarGamesUploadService uploadService;
    private final GrammarGamesAdminService adminService;
    private final SecurityUtils securityUtils;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Залить html прототипа или zip с темами (всё или ничего; темы не удаляются)")
    public UploadResult upload(@RequestParam("file") MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) throw new BadRequestException("Выберите html прототипа или zip с темами");
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String lower = name.toLowerCase(Locale.ROOT);
        if (!lower.endsWith(".html") && !lower.endsWith(".htm") && !lower.endsWith(".zip")) {
            throw new BadRequestException("Нужен html прототипа (.html) или zip (.zip)");
        }
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new BadRequestException("Файл больше " + MAX_FILE_BYTES / 1024 / 1024 + " МБ");
        }
        return uploadService.upload(file.getBytes(), name, securityUtils.userId());
    }

    @GetMapping("/topics")
    @Operation(summary = "Темы (все или одного уровня L1–L5), включая скрытые")
    public List<AdminRow> list(@RequestParam(required = false) String level) {
        return adminService.list(level);
    }

    @GetMapping("/topics/{id}")
    @Operation(summary = "Тема целиком (JSON в форме прототипа)")
    public JsonNode topic(@PathVariable String id) {
        return adminService.topic(id);
    }

    @PutMapping("/topics/{id}")
    @Operation(summary = "Заменить тему: та же проверка, что при заливке; id в теле = id в адресе")
    public AdminRow update(@PathVariable String id, @RequestBody JsonNode body) {
        return adminService.update(id, body, securityUtils.userId());
    }

    @PatchMapping("/topics/{id}")
    @Operation(summary = "Скрыть или показать тему ученикам")
    public AdminRow setHidden(@PathVariable String id, @RequestBody HiddenBody body) {
        return adminService.setHidden(id, body == null ? null : body.hidden(), securityUtils.userId());
    }

    @GetMapping("/export")
    @Operation(summary = "Выгрузить раздел zip-ом формата заливки (скрытые — с hidden: true)")
    public ResponseEntity<byte[]> export() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"grammar-games.zip\"")
                .contentType(MediaType.parseMediaType("application/zip"))
                .body(adminService.export());
    }
}
```

- [ ] **Step 5: Контроллер ученика**

`M/presentation/mobile/grammargames/controller/MobileGrammarGamesController.java`:

```java
package kz.education.server.presentation.mobile.grammargames.controller;

import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import kz.education.server.modules.grammargames.service.GrammarGamesCatalogService;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.Index;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.Progress;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.ResultOutcome;
import kz.education.server.modules.grammargames.service.GrammarGamesDtos.ResultRequest;
import kz.education.server.modules.grammargames.service.GrammarGamesProgressService;
import kz.education.server.modules.user.model.User;
import kz.education.server.presentation.mobile.balance.service.BalanceService;
import kz.education.server.presentation.mobile.grammargames.dto.GrammarGamesResultResponse;
import kz.education.server.shared.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/mobile/grammar-games")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Grammar Games", description = "«Грамматика · игры»: темы, словарь, прогресс, результат игры")
public class MobileGrammarGamesController {

    private final GrammarGamesCatalogService catalogService;
    private final GrammarGamesProgressService progressService;
    private final BalanceService balanceService;
    private final SecurityUtils securityUtils;

    @GetMapping
    @Operation(summary = "Уровни, программа и шапки видимых тем с набором игр; 404 — раздел ещё не загружен")
    public Index index() {
        return catalogService.index();
    }

    @GetMapping("/topics/{id}")
    @Operation(summary = "Тема целиком: правило и материал игр")
    public JsonNode topic(@PathVariable String id) {
        return catalogService.topic(id);
    }

    @GetMapping("/gloss")
    @Operation(summary = "Общий словарь кликабельных слов: слово → [ru, kk]")
    public JsonNode gloss() {
        return catalogService.gloss();
    }

    @GetMapping("/progress")
    @Operation(summary = "Лучшие звёзды ученика: тема → игра → 0–3")
    public Progress progress() {
        return new Progress(progressService.stars(securityUtils.userId()));
    }

    @PostMapping("/result")
    @Operation(summary = "Итог игры: лучший результат и монеты за прирост (409 — та же сдача уже записывается)")
    public GrammarGamesResultResponse result(@RequestBody ResultRequest body) {
        User user = securityUtils.getCurrentUser();
        ResultOutcome outcome = progressService.record(user, body);
        return new GrammarGamesResultResponse(outcome.best(), outcome.coins(), balanceService.getBalanceInfo(user));
    }
}
```

- [ ] **Step 6: Тест проходит**

Run: `./gradlew test --tests '*GrammarGamesControllersTest'`
Expected: PASS, 6 тестов.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/kz/education/server/presentation/admin/grammargames src/main/java/kz/education/server/presentation/mobile/grammargames src/test/java/kz/education/server/presentation/grammargames
git commit -m "feat(grammar-games): ручки админки и ученика

/admin/grammar-games — заливка, темы, видимость, выгрузка (ADMIN и
CONTENT_MANAGER); /mobile/grammar-games — список, тема, словарь, прогресс,
результат с балансом.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Настоящий прототип, документ, полный прогон, PR

**Files:**
- Create: `T/modules/grammargames/service/GrammarGamesRealPrototypeTest.java`
- Create: `docs/practice/GRAMMAR_GAMES.md`

**Interfaces:**
- Consumes: всё выше; прототип `C:\Users\nural\Desktop\jts-web-app\.claude\worktrees\grammar-games\data\jtsgrammar-games.html` (sha256 `7405974dc3265f3940e067a4c05be17a33e60a4c516f08aa2fb8bd38842cf4ae`).

- [ ] **Step 1: Тест на настоящем прототипе**

`T/modules/grammargames/service/GrammarGamesRealPrototypeTest.java`:

```java
package kz.education.server.modules.grammargames.service;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Прототип методиста целиком (~4 МБ) в репозиторий бэкенда не кладётся: он лежит в jts-web-app/data. Тест — по
 * переменной GRAMMAR_GAMES_HTML с путём к файлу, как PREPOSITIONS_HTML у предлогов.
 */
@EnabledIfEnvironmentVariable(named = "GRAMMAR_GAMES_HTML", matches = ".+")
@DisplayName("Грамматика · игры — настоящий прототип")
class GrammarGamesRealPrototypeTest {

    @Test
    @DisplayName("125 тем проходят проверку, игры по темам — 122×12, 2×13, 1×11, zip без потерь")
    void realPrototype() throws Exception {
        String html = Files.readString(Path.of(System.getenv("GRAMMAR_GAMES_HTML")));
        GrammarGamesBundle bundle = GrammarGamesHtmlParser.parse(html);

        assertThat(bundle.topics()).hasSize(125);
        assertThat(bundle.levels()).hasSize(5);
        assertThat(bundle.gloss().size()).isEqualTo(2163);
        assertThat(GrammarTopicValidator.problems(bundle)).isEmpty();
        assertThat(GrammarTopicValidator.warnings(bundle)).isEmpty();

        Map<Integer, Long> bySize = bundle.topics().stream()
                .collect(Collectors.groupingBy(t -> GrammarGameStages.stagesOf(t).size(), Collectors.counting()));
        assertThat(bySize).containsOnly(Map.entry(12, 122L), Map.entry(13, 2L), Map.entry(11, 1L));

        GrammarGamesBundle again = GrammarGamesZip.read(GrammarGamesZip.write(bundle, Set.of()));
        assertThat(again.topics()).extracting(t -> t.path("id").asText())
                .containsExactlyElementsOf(bundle.topics().stream().map(t -> t.path("id").asText()).sorted().toList());
        ObjectNode first = bundle.topics().get(0);
        assertThat(again.topics().get(0)).isEqualTo(first);
    }
}
```

- [ ] **Step 2: Прогнать на настоящем прототипе**

Run (Git Bash):

```bash
GRAMMAR_GAMES_HTML=/c/Users/nural/Desktop/jts-web-app/.claude/worktrees/grammar-games/data/jtsgrammar-games.html ./gradlew test --tests '*GrammarGamesRealPrototypeTest'
```

Expected: PASS. Если тест пропущен (SKIPPED), значит переменная не дошла до тестового JVM: остановить демон `./gradlew --stop` и повторить. Если проверка нашла проблемы — это расхождение правил с данными: вывести список, сверить с прототипом и поправить ПРАВИЛО (данные методиста прошли его движок), записав причину в комментарий правила.

- [ ] **Step 3: Документ раздела**

`docs/practice/GRAMMAR_GAMES.md`:

```markdown
# «Грамматика · игры» — формат и поток

Раздел «Практики» по ТЗ v1.1 от 24.10.2026: 125 тем на 5 уровнях (L1 «0 → A1» … L5 «B2 → C1»), у темы правило
и 11–13 игр. Спека — jts-web-app `docs/superpowers/specs/2026-10-25-grammar-games-speed-reading-design.md`.
Старая «Грамматика» сайта (507 юнитов) — другой раздел, этот модуль её не трогает.

## Заливка

`POST /admin/grammar-games/upload` (multipart `file`, ADMIN или CONTENT_MANAGER, до 16 МБ):

- `.html` — прототип методиста целиком: строки `const LEVELS/PROGRAM/TOPICS/GLOSS = …` (`JsLiterals`, JS не
  исполняется); картинки `IMG`/`EMO` не читаются — это статика сайта;
- `.zip` — `levels.json`, `program.json`, `gloss.json`, `L<n>/<NN>.json` (можно внутри одной папки); не больше 400
  файлов и 20 МБ в распакованном виде.

Всё или ничего: одна ошибка проверки — и ничего не пишется, ответ 400 со списком «тема · поле · что не так»
(до 50 строк). Темы — upsert; у существующей темы видимость не меняется, новая берёт `hidden` из файла (он есть в
выгрузке); темы, которых нет в файле, остаются. Ответ: `{topics, created, updated, unchanged, warnings}`.

## Проверка темы

`GrammarTopicValidator`: id `L1-01` и согласованные `lv`/`n`; `title/sub/intro` на ru/kk/en; карточки с
кирпичиками `s v a n q o`; строки таблиц длиной `head`; `gap` ≥ 12 (один `___`, два неверных, ответ не среди них);
`order` ≥ 10 (ловушка — не слово предложения); `fix` ≥ 8 (`w` в предложении, `c` среди трёх вариантов); пары 6–8;
`trans` ≥ 8; диалог ≥ 8 реплик, из них ≥ 5 с пропуском, говорят A и B; `catch` непустой; `sort`/`place` — если есть.
Правила выведены из 125 тем прототипа — валидатора методиста у нас нет.

## Админка

`GET /admin/grammar-games/topics?level=L1`, `GET|PUT /topics/{id}` (та же проверка), `PATCH /topics/{id}`
`{hidden}`, `GET /export` — zip формата заливки. `GET|PUT /admin/practice/coin-rules` — монеты разделов,
ключ → 0–10.

## Ученику (Bearer)

- `GET /mobile/grammar-games` → `{levels, program, topics: [{id, lv, n, icon, color, title, sub, games}]}`; до
  первой заливки — 404;
- `GET /mobile/grammar-games/topics/{id}`, `/gloss`, `/progress` (`{stars: {тема: {игра: 0–3}}}`);
- `POST /mobile/grammar-games/result` `{topicId, game, stars}` → `{best, coins, balance}`.

## Монеты

`coinsFor(game, stars, limit)`: при звёздах > 0 — `min(лимит, звёзды + 1)`, «Финальный бой» — весь лимит.
Начисляется только прирост лучшего результата; вместе с монетами — столько же XP (как `completeLessonModule`);
стрик — за любую игру со звёздами. Лимиты — `practice_coin_rules`, ключи `grammar-games.<игра>`, по умолчанию
GT_PTS прототипа (2, «Впиши сам» и «Диалог» — 3, бой — 5).
```

- [ ] **Step 4: Полный прогон модуля и каталога миграций**

Run:

```bash
./gradlew test --tests 'kz.education.server.modules.grammargames*' --tests 'kz.education.server.modules.practice.coins*' --tests 'kz.education.server.presentation.grammargames*'
git fetch -q origin develop && bash scripts/check-migrations.sh --base origin/develop
```

Expected: все тесты модуля PASS; скрипт миграций без ошибок (если номер занят — переименовать миграцию и
повторить). Затем `./gradlew test` целиком и сверить падения с базовым прогоном develop: новых быть не должно
(известные падения окружения — Testcontainers без Docker).

- [ ] **Step 5: Commit**

```bash
git add src/test/java/kz/education/server/modules/grammargames/service/GrammarGamesRealPrototypeTest.java docs/practice/GRAMMAR_GAMES.md
git commit -m "test(grammar-games): настоящий прототип и документ раздела

125 тем проходят проверку; формат заливки, правила, ручки и монеты — в
docs/practice/GRAMMAR_GAMES.md.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Финальное ревью ветки**

Одно ревью ветки на репозиторий (opus): `git diff origin/develop...HEAD`. Найденное — поправить сразу, отдельным
коммитом `fix(grammar-games): …`, и прогнать Step 4 ещё раз.

- [ ] **Step 7: PR** — только по слову владельца

```bash
git push -u origin feat/grammar-games
gh pr create --repo jtsapp/backend --base develop --head feat/grammar-games \
  --title "feat(grammar-games): «Грамматика · игры» — темы, заливка, прогресс и монеты" \
  --body-file <файл с описанием>
```

Описание PR: что делает модуль, номер миграции, ручки, правила монет (Д1–Д3), что проверено (тесты, настоящий
прототип), что не проверено (миграция на Postgres 15 — накатится на дев-стенде), и последняя строка
`🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Номер миграции сверить ещё раз прямо перед мержем.

---

## Self-review (выполнено при написании плана)

- **Покрытие спеки A1:** таблицы (Task 1), заливка html/zip и правила проверки (Tasks 3, 4, 7), правка, видимость,
  выгрузка, правила монет (Tasks 5, 8), ручки ученика и результат с монетами (Tasks 6, 9, 10), тесты на Mockito/H2
  без веб-срезов, настоящий прототип по переменной (Task 11). Права «ADMIN, CONTENT_MANAGER» — аннотацией.
- **Уточнения спеки, внесённые вместе с планом:** XP вместе с монетами; стрик за любую игру со звёздами; 409 на
  двойную первую сдачу; `hidden` из выгрузки — только для новой темы; колонки `integer` вместо `smallint`.
- **Имена между задачами:** `GrammarGamesBundle`, `GrammarTopicValidator.problems/warnings/capped/LEVEL`,
  `GrammarGameStages.stagesOf/present/coinsFor/coinsDelta/DEFAULT_COINS/NAMES_RU/RULE_PREFIX`,
  `GrammarGamesCatalogService.topic/clearCacheNowAndAfterCommit/NOT_UPLOADED/NO_TOPIC`, `GrammarTopicRows.fill/
  adminRow/problemsMessage`, `PracticeCoinRulesService.coins/all/update` — совпадают во всех задачах.
```
