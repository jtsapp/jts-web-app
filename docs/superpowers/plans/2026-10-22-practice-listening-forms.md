# Формы Аудирования в админке (этап 2) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** В окне «Библиотека → Аудирование» админ добавляет, правит и удаляет задание по одному — без zip; сохранённое сразу у учеников.

**Architecture:** Бэкенд: к `ListeningService` добавляются `get/create/update/delete` (та же проверка `ListeningRules`, id выдаёт сервер, удаление — отметкой `deleted_at`), чтения и пакет учитывают удалённое. Админка: чистая модель формы (`listening-form.model.ts`, без Angular) + экран формы + кнопки в списке. Сайт не меняется.

**Tech Stack:** Spring Boot 3 / JPA / Flyway / JUnit 5 + AssertJ + Mockito (H2 в тестах сервиса); Angular 17 standalone + Material + FormsModule, Karma/Jasmine.

Спека: `docs/superpowers/specs/2026-10-22-practice-listening-forms-design.md`.

## Global Constraints

- Правят только ADMIN; модерации и черновиков нет; сохранённое сразу видно ученикам (кэш публичной ручки до 5 минут).
- id нового задания: `<уровень>_<NNN>`, NNN = наибольший номер уровня (включая удалённые) + 1, не меньше трёх знаков.
- Новое задание встаёт в конец уровня (`order_index` = наибольший на уровне + 1) и сразу показано.
- Уровень существующего задания не меняется (400); тип и поля меняются.
- Удаление — `deleted_at` + скрыть; удалённое не отдаётся ученикам, не считается, не видно в админке, номер не переиспользуется; повторное удаление — 404.
- Выгрузка пакета отдаёт удалённое как `active: false`; заливка пакета удалённое не воскрешает и кладёт в `DiffResult.deletedHere`.
- Запись — загрузкой mp3 через `POST /admin/practice/media/listening` (`file` + `expected`).
- Код IELTS не трогать. Комментарии по-русски, объясняют «почему».
- Номер миграции — следующий свободный в `origin/develop` на момент мержа (на 22.10.2026 последняя — V392); перед мержем сверять develop, все `origin/*`, локальные ветки и диски соседних worktree.
- Ветки от свежего `origin/develop`; PR в `develop`; мерж — бэкенд первым.
- Коммиты оканчиваются `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, описания PR — `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

### Отступление от спеки

- `AdminTask` получает поле `audio` (`media/<sha24>.mp3`): экрану правки нужно отправить текущую запись, если её не меняли, а из `audioUrl` имя пришлось бы выковыривать.

---

## Часть A — backend (`C:\Users\nural\Desktop\backend-practice-listening`)

Префиксы: `J=src/main/java/kz/education/server`, `T=src/test/java/kz/education/server`, `L=$J/modules/practice/listening`.

### Task A0: Ветка

- [ ] **Step 1:**

```bash
cd /c/Users/nural/Desktop/backend-practice-listening && git fetch -q origin && git status --short && git checkout -b feat/practice-listening-forms origin/develop
```

Expected: рабочее дерево чистое, ветка от свежего develop.

### Task A1: Удалённое — колонка, чтения, пакет

**Files:**
- Create: `src/main/resources/db/migration/V393__Practice_listening_deleted_at.sql` (номер сверить, см. Global Constraints)
- Modify: `$L/ListeningTask.java`, `$L/ListeningTaskRepository.java`, `$L/ListeningDtos.java` (`DiffResult`, `AdminTask`), `$L/ListeningService.java`
- Test: `$T/modules/practice/listening/ListeningServiceTest.java`, `$T/modules/practice/PracticeContentSecurityTest.java`

**Interfaces:**
- Produces: `ListeningTask.deletedAt: LocalDateTime` (getter/setter Lombok); репозиторий — `findByIsActiveTrueAndDeletedAtIsNull()`, `findByLevelAndIsActiveTrueAndDeletedAtIsNullOrderByOrderIndexAscIdAsc(String)`, `findByDeletedAtIsNullOrderByLevelAscOrderIndexAscIdAsc()`, `findByLevelAndDeletedAtIsNullOrderByOrderIndexAscIdAsc(String)`, `findByLevel(String)`, `findAllByOrderByLevelAscOrderIndexAscIdAsc()`, `findByTaskKey(String)`.
- Produces: `DiffResult(List<String> added, List<String> changed, int unchanged, List<String> onlyInAdmin, List<String> deletedHere)`; `AdminTask(String id, String level, String type, int orderIndex, String audio, String audioUrl, String explanation, Map<String,Object> body, boolean active, LocalDateTime updatedAt)`.
- Produces: приватный `ListeningService.live(String key) → ListeningTask` (не удалённое, иначе 404).

- [ ] **Step 1: Падающие тесты**

В `ListeningServiceTest.java` добавить (рядом с `transferKeepsHiddenAndOrder`):

```java
    /** Помечает задание удалённым напрямую — сама ручка удаления появится в A2. */
    private void markDeleted(String key) {
        ListeningTask row = repository.findByTaskKey(key).orElseThrow();
        row.setDeletedAt(java.time.LocalDateTime.now());
        row.setIsActive(false);
        repository.save(row);
    }

    @Test
    @DisplayName("удалённое не отдаётся ученику, не считается и не видно в админке")
    void deletedIsInvisible() {
        service.importPack(pack());
        markDeleted("a1_002");

        assertThat(service.publicLevel("a1")).extracting(PublicTask::id).containsExactly("a1_001");
        assertThat(service.publicLevels()).contains(new ListeningDtos.LevelCount("a1", 1));
        assertThat(service.adminList(null)).extracting(ListeningDtos.AdminTask::id).containsExactly("a1_001", "a2_001");
        assertThat(service.adminList("a1")).extracting(ListeningDtos.AdminTask::id).containsExactly("a1_001");
        assertThatThrownBy(() -> service.setActive("a1_002", true)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("пакет: удалённое уезжает скрытым, заливка его не воскрешает, сверка кладёт в deletedHere")
    void deletedAndPack() {
        service.importPack(pack());
        markDeleted("a1_002");

        assertThat(service.exportPack().items()).filteredOn(i -> i.id().equals("a1_002"))
                .extracting(PackItem::active).containsExactly(false);

        ListeningDtos.DiffResult d = service.diff(pack());
        assertThat(d.deletedHere()).containsExactly("a1_002");
        assertThat(d.unchanged()).isEqualTo(2);
        assertThat(d.onlyInAdmin()).isEmpty();

        service.importPack(pack());
        assertThat(service.publicLevel("a1")).extracting(PublicTask::id).containsExactly("a1_001");
        assertThat(service.adminList("a1")).extracting(ListeningDtos.AdminTask::id).containsExactly("a1_001");
    }

    @Test
    @DisplayName("админке задание отдаётся со ссылкой на запись пакета (для правки без замены записи)")
    void adminTaskCarriesAudioRef() {
        service.importPack(pack());
        assertThat(service.adminList("a1").get(0).audio()).isEqualTo(A);
    }
```

и импорт `kz.education.server.shared.exception.types.ResourceNotFoundException`. В `contractRoundTrip` заменить последнюю проверку на

```java
        assertThat(service.diff(bundle.items())).isEqualTo(new ListeningDtos.DiffResult(List.of(), List.of(), 4, List.of(), List.of()));
```

В `PracticeContentSecurityTest.adminImports` заменить конструктор `DiffResult` на

```java
        when(listeningService.diff(any())).thenReturn(new ListeningDtos.DiffResult(List.of("a1_001"), List.of(), 0, List.of(), List.of()));
```

- [ ] **Step 2: Запустить — падает**

Run: `./gradlew test --tests 'kz.education.server.modules.practice.*' -q`
Expected: FAIL компиляции — нет `setDeletedAt`, `deletedHere`, `audio()`.

- [ ] **Step 3: Миграция**

Сверить номер: `git ls-tree --name-only origin/develop src/main/resources/db/migration/ | sed -E 's/.*\/V([0-9]+)__.*/\1/' | sort -n | tail -1` → взять следующий (на 22.10 — V393).

`src/main/resources/db/migration/V393__Practice_listening_deleted_at.sql`:

```sql
-- «Практика → Аудирование», этап 2: админ удаляет задание формой. Строка остаётся с отметкой, а не стирается:
-- номер задания (a1_123) не должен достаться новому — на id висит прогресс учеников и счёт «пройдено на уровне».
ALTER TABLE practice_listening_tasks ADD COLUMN deleted_at TIMESTAMP;
```

- [ ] **Step 4: Сущность и репозиторий**

В `ListeningTask.java` после поля `isActive`:

```java
    /** Удалено в админке. Строка остаётся, чтобы номер не выдали новому заданию: на id висит прогресс учеников. */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
```

`ListeningTaskRepository.java` целиком:

```java
package kz.education.server.modules.practice.listening;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ListeningTaskRepository extends JpaRepository<ListeningTask, Long> {

    List<ListeningTask> findByIsActiveTrueAndDeletedAtIsNull();

    List<ListeningTask> findByLevelAndIsActiveTrueAndDeletedAtIsNullOrderByOrderIndexAscIdAsc(String level);

    /** Для выгрузки пакета: все, включая удалённые (они уезжают скрытыми). */
    List<ListeningTask> findAllByOrderByLevelAscOrderIndexAscIdAsc();

    List<ListeningTask> findByDeletedAtIsNullOrderByLevelAscOrderIndexAscIdAsc();

    List<ListeningTask> findByLevelAndDeletedAtIsNullOrderByOrderIndexAscIdAsc(String level);

    /** Все задания уровня, включая удалённые, — для следующего номера и конца уровня. */
    List<ListeningTask> findByLevel(String level);

    Optional<ListeningTask> findByTaskKey(String taskKey);
}
```

- [ ] **Step 5: DTO**

В `ListeningDtos.java`:

```java
    public record AdminTask(String id, String level, String type, int orderIndex, String audio, String audioUrl,
                            String explanation, Map<String, Object> body, boolean active, LocalDateTime updatedAt) {
    }

    /** {@code deletedHere} — задания пакета, удалённые на этом стенде: заливка их не вернёт. */
    public record DiffResult(List<String> added, List<String> changed, int unchanged, List<String> onlyInAdmin,
                             List<String> deletedHere) {
    }
```

- [ ] **Step 6: Сервис — чтения, сверка, заливка**

В `ListeningService.java`:

- `publicLevels()`: `tasks.findByIsActiveTrue()` → `tasks.findByIsActiveTrueAndDeletedAtIsNull()`.
- `publicLevel()`: `findByLevelAndIsActiveTrueOrderByOrderIndexAscIdAsc` → `findByLevelAndIsActiveTrueAndDeletedAtIsNullOrderByOrderIndexAscIdAsc`.
- `adminList()`:

```java
        List<ListeningTask> rows = level == null || level.isBlank()
                ? tasks.findByDeletedAtIsNullOrderByLevelAscOrderIndexAscIdAsc()
                : tasks.findByLevelAndDeletedAtIsNullOrderByOrderIndexAscIdAsc(level(level));
```

- `setActive()`: первая строка → `ListeningTask row = live(key);`
- `diff()`: тело цикла и конец метода:

```java
        List<String> deletedHere = new ArrayList<>();
        for (Normalized n : pack) {
            inPack.add(n.key());
            ListeningTask row = stored.get(n.key());
            if (row == null) added.add(n.key());
            else if (row.getDeletedAt() != null) deletedHere.add(n.key());
            else if (upToDate(row, n)) unchanged++;
            else changed.add(n.key());
        }
        List<String> onlyInAdmin = stored.values().stream().filter(r -> r.getDeletedAt() == null)
                .map(ListeningTask::getTaskKey).filter(k -> !inPack.contains(k)).sorted().toList();
        return new DiffResult(added, changed, unchanged, onlyInAdmin, deletedHere);
```

  (объявление `List<String> deletedHere` — рядом с `added`/`changed`, перед циклом).
- `writePack()`: в начале цикла, сразу после `ListeningTask row = stored.get(n.key());`:

```java
            if (row != null && row.getDeletedAt() != null) {
                // удалённое в админке пакет не воскрешает — как и скрытое; сверка показывает его в deletedHere
                skipped++;
                continue;
            }
```

  объявить `int skipped = 0;` рядом с `added/changed/unchanged`, а лог:

```java
        log.info("Аудирование: заливка пакета — новых {}, изменённых {}, без изменений {}, удалённых пропущено {}",
                added, changed, unchanged, skipped);
```

- `exportPack()`: без изменений (берёт все строки; `packItem` и так пишет `active: false` всему, что не показано — удаление скрывает).
- `adminView()`:

```java
    private AdminTask adminView(ListeningTask row) {
        return new AdminTask(row.getTaskKey(), row.getLevel(), row.getTaskType(), row.getOrderIndex(),
                "media/" + row.getAudioName(), media.publicUrl(SECTION, row.getAudioName()), row.getExplanation(),
                readBody(row), Boolean.TRUE.equals(row.getIsActive()), row.getUpdatedAt());
    }
```

- новый помощник рядом с `byKey()`:

```java
    /** Не удалённое задание по id; удалённого для админки и ученика нет — 404. */
    private ListeningTask live(String key) {
        return tasks.findByTaskKey(key).filter(r -> r.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Задание не найдено"));
    }
```

- [ ] **Step 7: Зелёный**

Run: `./gradlew test --tests 'kz.education.server.modules.practice.*' -q`
Expected: PASS (ListeningServiceTest 13, остальные без изменений).

- [ ] **Step 8: Коммит**

```bash
git add src/main/resources/db/migration src/main/java/kz/education/server/modules/practice src/test/java/kz/education/server/modules/practice
git commit -m "$(printf 'feat(практика): удалённые задания Аудирования — колонка, чтения, пакет\n\nУдалённое не отдаётся и не считается, номер не переиспользуется;\nв пакете уезжает скрытым, заливка не воскрешает (deletedHere).\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

### Task A2: Создать, изменить, удалить — сервис

**Files:**
- Modify: `$L/ListeningService.java`
- Test: `$T/modules/practice/listening/ListeningServiceTest.java`

**Interfaces:**
- Consumes: `live(key)`, `ListeningRules.normalizeAll`, `PracticeMediaService.existing`, `tx`.
- Produces: `AdminTask get(String key)`, `AdminTask create(PackItem item)`, `AdminTask update(String key, PackItem item)`, `void delete(String key)`; package-private `String nextKey(String level)`.

- [ ] **Step 1: Падающие тесты**

В `ListeningServiceTest.java`:

```java
    /** Тело формы админки: задание пакета без id. */
    static PackItem form(String level, String type, String audio) {
        return switch (type) {
            case "listen_choice" -> new PackItem(null, level, type, audio, "", "Where?", List.of("Here", "There"), "Here", null, null, null, null);
            case "listen_assemble" -> new PackItem(null, level, type, audio, "", null, null, null, "I'm here.", List.of("I'm", "here"), List.of(), null);
            default -> new PackItem(null, level, type, audio, "", null, null, "I'm here", null, null, null, null);
        };
    }

    @Test
    @DisplayName("создать: id — следующий номер уровня после удалённых, конец уровня, сразу показано")
    void createAssignsKeyAndOrder() {
        service.importPack(pack());               // a1_001, a1_002, a2_001
        ListeningDtos.AdminTask t = service.create(form("a1", "listen_type", B));
        assertThat(t.id()).isEqualTo("a1_003");
        assertThat(t.orderIndex()).isEqualTo(2);
        assertThat(t.active()).isTrue();
        assertThat(service.publicLevel("a1")).extracting(PublicTask::id).containsExactly("a1_001", "a1_002", "a1_003");

        service.delete("a1_003");
        assertThat(service.create(form("a1", "listen_choice", A)).id()).isEqualTo("a1_004");
        assertThat(service.create(form("b2", "listen_assemble", A)).id()).isEqualTo("b2_001");
    }

    @Test
    @DisplayName("создать: id в теле, кривое задание или запись не залита — 400, ничего не пишется")
    void createRejects() {
        PackItem withId = new PackItem("a1_777", "a1", "listen_type", A, "", null, null, "Hi", null, null, null, null);
        assertThatThrownBy(() -> service.create(withId)).isInstanceOf(BadRequestException.class).hasMessageContaining("id");
        PackItem noAnswer = new PackItem(null, "a1", "listen_choice", A, "", "Q?", List.of("A", "B"), "C", null, null, null, null);
        assertThatThrownBy(() -> service.create(noAnswer)).isInstanceOf(BadRequestException.class);
        when(media.existing(eq("listening"), any())).thenReturn(List.of());
        assertThatThrownBy(() -> service.create(form("a1", "listen_type", A)))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("запись");
        assertThat(service.adminList(null)).isEmpty();
    }

    @Test
    @DisplayName("изменить: тип, поля и запись меняются, место и видимость — нет; уровень — 400")
    void updateKeepsPlaceAndLevel() {
        service.importPack(pack());
        service.setActive("a1_001", false);

        ListeningDtos.AdminTask t = service.update("a1_001", form("a1", "listen_assemble", B));
        assertThat(t.type()).isEqualTo("listen_assemble");
        assertThat(t.audio()).isEqualTo(B);
        assertThat(t.orderIndex()).isEqualTo(0);
        assertThat(t.active()).isFalse();
        assertThat(t.body()).containsEntry("tokens", List.of("I'm", "here"));

        assertThatThrownBy(() -> service.update("a1_001", form("a2", "listen_type", A)))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("Уровень");
        assertThatThrownBy(() -> service.update("a1_999", form("a1", "listen_type", A))).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("удалить: пропадает отовсюду, get и повторное удаление — 404")
    void deleteHides() {
        service.importPack(pack());
        assertThat(service.get("a1_002").id()).isEqualTo("a1_002");
        service.delete("a1_002");

        assertThat(service.publicLevel("a1")).extracting(PublicTask::id).containsExactly("a1_001");
        assertThatThrownBy(() -> service.get("a1_002")).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.delete("a1_002")).isInstanceOf(ResourceNotFoundException.class);
        assertThat(service.exportPack().items()).filteredOn(i -> i.id().equals("a1_002"))
                .extracting(PackItem::active).containsExactly(false);
    }
```

- [ ] **Step 2: Запустить — падает**

Run: `./gradlew test --tests 'kz.education.server.modules.practice.listening.ListeningServiceTest' -q`
Expected: FAIL компиляции — нет `create`, `update`, `delete`, `get`.

- [ ] **Step 3: Реализация**

В `ListeningService.java` — импорты `java.time.LocalDateTime`, `org.springframework.dao.DataIntegrityViolationException`; методы — после `setActive`:

```java
    @Transactional(readOnly = true)
    public AdminTask get(String key) {
        return adminView(live(key));
    }

    /**
     * Новое задание из формы админки. id выдаёт сервер — следующий номер уровня, считая удалённые (их номера заняты
     * прогрессом учеников); задание встаёт в конец уровня и сразу показано: «добавление значит добавление» (решение
     * владельца 22.10.2026, без модерации). Запись должна быть уже залита ({@code POST /admin/practice/media/listening}).
     */
    public AdminTask create(PackItem item) {
        if (item == null) throw new BadRequestException("Нет данных задания.");
        if (item.id() != null && !item.id().isBlank()) {
            throw new BadRequestException("id нового задания выдаёт сервер — уберите поле id.");
        }
        String level = level(item.level());
        Normalized draft = normalizeOne(item, nextKey(level));
        requireMedia(draft.audioName());
        try {
            return tx.execute(status -> insert(draft));
        } catch (DataIntegrityViolationException e) {
            // два админа одновременно получили один номер: UNIQUE(task_key) не пустил второго — берём следующий
            Normalized retry = withKey(draft, nextKey(level));
            return tx.execute(status -> insert(retry));
        }
    }

    /**
     * Правка из формы: тип, поля, разбор и запись меняются; уровень — нет: префикс id = уровень, по нему считается
     * «пройдено на уровне». Место в уровне и видимость остаются прежними.
     */
    public AdminTask update(String key, PackItem item) {
        if (item == null) throw new BadRequestException("Нет данных задания.");
        ListeningTask current = live(key);
        String level = item.level() == null ? "" : item.level().trim().toLowerCase(Locale.ROOT);
        if (!current.getLevel().equals(level)) {
            throw new BadRequestException("Уровень задания не меняется: от него зависит прогресс учеников. "
                    + "Чтобы перенести задание, удалите его и заведите заново на другом уровне.");
        }
        Normalized n = normalizeOne(item, key);
        requireMedia(n.audioName());
        return tx.execute(status -> {
            ListeningTask row = live(key);
            fillContent(row, n);
            return adminView(tasks.save(row));
        });
    }

    /** Удаление — отметка, а не стирание строки: номер не достанется новому заданию (на id висит прогресс). */
    @Transactional
    public void delete(String key) {
        ListeningTask row = live(key);
        row.setDeletedAt(LocalDateTime.now());
        // и скрыто: выгрузка отдаст его как active:false — на другом стенде оно тоже пропадёт у учеников
        row.setIsActive(false);
        tasks.save(row);
    }

    /** Следующий свободный номер уровня: наибольший среди всех его заданий, включая удалённые, плюс один. */
    String nextKey(String level) {
        int max = tasks.findByLevel(level).stream().map(ListeningTask::getTaskKey)
                .map(k -> k.substring(k.indexOf('_') + 1)).filter(s -> s.matches("\\d+"))
                .mapToInt(Integer::parseInt).max().orElse(0);
        return String.format("%s_%03d", level, max + 1);
    }

    private AdminTask insert(Normalized n) {
        ListeningTask row = new ListeningTask();
        row.setTaskKey(n.key());
        row.setLevel(n.level());
        row.setIsActive(true);
        row.setOrderIndex(tasks.findByLevel(n.level()).stream().mapToInt(ListeningTask::getOrderIndex).max().orElse(-1) + 1);
        fillContent(row, n);
        // saveAndFlush, а не save: конфликт номера должен всплыть здесь, а не на коммите, — его ловит create
        return adminView(tasks.saveAndFlush(row));
    }

    private static Normalized normalizeOne(PackItem item, String key) {
        PackItem withId = new PackItem(key, item.level(), item.type(), item.audio(), item.explanation(),
                item.prompt(), item.options(), item.answer(), item.text(), item.tokens(), item.distractors(), null);
        return ListeningRules.normalizeAll(List.of(withId)).get(0);
    }

    private static Normalized withKey(Normalized n, String key) {
        return new Normalized(key, n.level(), n.type(), n.orderIndex(), n.audioName(), n.explanation(), n.body(), n.hidden());
    }

    private void requireMedia(String audioName) {
        if (media.existing(SECTION, List.of(audioName)).isEmpty()) {
            throw new BadRequestException("Сначала загрузите запись — её нет в хранилище: " + audioName);
        }
    }
```

`fill()` разделить на две части (заменить существующий метод):

```java
    private void fill(ListeningTask row, Normalized n) {
        row.setLevel(n.level());
        row.setOrderIndex(n.orderIndex());
        fillContent(row, n);
    }

    /** То, что правит форма: тип, запись, разбор, поля типа. Уровень и место в уровне — не её. */
    private void fillContent(ListeningTask row, Normalized n) {
        row.setTaskType(n.type());
        row.setAudioName(n.audioName());
        row.setExplanation(n.explanation());
        try {
            row.setBody(mapper.writeValueAsString(n.body()));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Не удалось сохранить задание " + n.key(), e);
        }
    }
```

- [ ] **Step 4: Зелёный**

Run: `./gradlew test --tests 'kz.education.server.modules.practice.*' -q`
Expected: PASS (ListeningServiceTest 17).

- [ ] **Step 5: Коммит**

```bash
git add src/main/java/kz/education/server/modules/practice/listening/ListeningService.java src/test/java/kz/education/server/modules/practice/listening/ListeningServiceTest.java
git commit -m "$(printf 'feat(практика): создать, изменить, удалить задание Аудирования\n\nid выдаёт сервер (номер после удалённых), конец уровня, сразу показано;\nуровень не меняется; удаление — отметкой.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

### Task A3: Ручки и доступ

**Files:**
- Modify: `$J/presentation/admin/practice/controller/AdminPracticeListeningController.java`
- Modify: `docs/practice/PACK_FORMAT.md` (раздел «Раздел listening»: строка про `deletedHere` и ручки формы)
- Test: `$T/modules/practice/PracticeContentSecurityTest.java`

**Interfaces:**
- Consumes: `ListeningService.get/create/update/delete`.
- Produces (HTTP для админки): `GET /admin/practice/listening/tasks/{key}` → `AdminTask`; `POST /admin/practice/listening/tasks` (тело `PackItem` без `id`) → 201 `AdminTask`; `PUT /admin/practice/listening/tasks/{key}` → `AdminTask`; `DELETE /admin/practice/listening/tasks/{key}` → 204.

- [ ] **Step 1: Падающий тест**

В `PracticeContentSecurityTest.java` (импорты `put`, `delete` из `MockMvcRequestBuilders`, `ListeningDtos.AdminTask` через `ListeningDtos`):

```java
    private static final String FORM = """
            {"level":"a1","type":"listen_type","audio":"media/aaaaaaaaaaaaaaaaaaaaaaaa.mp3","explanation":"","answer":"Hi"}""";

    private static ListeningDtos.AdminTask task(String id) {
        return new ListeningDtos.AdminTask(id, "a1", "listen_type", 0, "media/aaaaaaaaaaaaaaaaaaaaaaaa.mp3",
                "https://files.test/a.mp3", "", java.util.Map.of("answer", "Hi"), true, null);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("админ открывает, создаёт, правит и удаляет задание")
    void adminEditsTasks() throws Exception {
        when(listeningService.get("a1_001")).thenReturn(task("a1_001"));
        when(listeningService.create(any())).thenReturn(task("a1_125"));
        when(listeningService.update(eq("a1_001"), any())).thenReturn(task("a1_001"));

        mockMvc.perform(get("/admin/practice/listening/tasks/a1_001")).andExpect(status().isOk())
                .andExpect(jsonPath("$.audio").value("media/aaaaaaaaaaaaaaaaaaaaaaaa.mp3"));
        mockMvc.perform(post("/admin/practice/listening/tasks").contentType(MediaType.APPLICATION_JSON).content(FORM))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value("a1_125"));
        mockMvc.perform(put("/admin/practice/listening/tasks/a1_001").contentType(MediaType.APPLICATION_JSON).content(FORM))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/admin/practice/listening/tasks/a1_001")).andExpect(status().isNoContent());
        verify(listeningService).delete("a1_001");
    }

    @Test
    @WithMockUser(roles = "TEACHER")
    @DisplayName("преподаватель задания не создаёт и не удаляет")
    void teacherCannotEditTasks() throws Exception {
        mockMvc.perform(post("/admin/practice/listening/tasks").contentType(MediaType.APPLICATION_JSON).content(FORM))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/admin/practice/listening/tasks/a1_001")).andExpect(status().isForbidden());
        verify(listeningService, never()).create(any());
        verify(listeningService, never()).delete(any());
    }
```

- [ ] **Step 2: Запустить — падает**

Run: `./gradlew test --tests 'kz.education.server.modules.practice.PracticeContentSecurityTest' -q`
Expected: FAIL — 404/405 на новых путях (ручек нет).

- [ ] **Step 3: Ручки**

В `AdminPracticeListeningController.java` (импорты `DeleteMapping`, `PutMapping`, `ResponseStatus`, `HttpStatus`, `ListeningDtos.PackItem`) после `list`:

```java
    @GetMapping("/tasks/{key}")
    @Operation(summary = "Одно задание (экран правки)")
    public AdminTask get(@PathVariable String key) {
        return service.get(key);
    }

    @PostMapping("/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Добавить задание из формы: id выдаёт сервер, в конец уровня, сразу показано")
    public AdminTask create(@RequestBody PackItem item) {
        return service.create(item);
    }

    @PutMapping("/tasks/{key}")
    @Operation(summary = "Изменить задание (уровень не меняется — 400)")
    public AdminTask update(@PathVariable String key, @RequestBody PackItem item) {
        return service.update(key, item);
    }

    @DeleteMapping("/tasks/{key}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Удалить задание (отметкой: номер не переиспользуется, прогресс учеников не теряется)")
    public void delete(@PathVariable String key) {
        service.delete(key);
    }
```

- [ ] **Step 4: Контракт**

В `docs/practice/PACK_FORMAT.md`, в шаге 2 «Заливка»: «новые / изменённые / без изменений / есть только на стенде / удалены на стенде (`deletedHere`, заливка их не вернёт)». В разделе `listening` после абзаца «Порядок внутри уровня…»:

```markdown
Формы админки (этап 2): `GET|PUT|DELETE /admin/practice/listening/tasks/{id}`, `POST /admin/practice/listening/tasks`
(тело — задание без `id`; id `<уровень>_<NNN>` выдаёт сервер, задание встаёт в конец уровня). Уровень у задания не
меняется. Удалённое остаётся строкой с `deleted_at` (номер не переиспользуется) и выгружается как `active: false`.
```

- [ ] **Step 5: Зелёный, сборка**

Run: `./gradlew compileJava test --tests 'kz.education.server.modules.practice.*' -q`
Expected: PASS (PracticeContentSecurityTest 7).

- [ ] **Step 6: Коммит**

```bash
git add src/main/java/kz/education/server/presentation/admin/practice src/test/java/kz/education/server/modules/practice/PracticeContentSecurityTest.java docs/practice/PACK_FORMAT.md
git commit -m "$(printf 'feat(практика): ручки формы Аудирования (get/create/update/delete)\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

---

## Часть B — web-admin (`C:\Users\nural\Desktop\web-admin-practice-listening`)

Префикс: `S=src/app`, `F=$S/feature/system/practice-listening`.

### Task B0: Ветка

- [ ] **Step 1:** `cd /c/Users/nural/Desktop/web-admin-practice-listening && git fetch -q origin && git status --short && git checkout -b feat/practice-listening-forms origin/develop`

### Task B1: Модель формы и API

**Files:**
- Modify: `$S/core/models/practice-listening.models.ts`, `$S/core/services/practice-listening.service.ts`
- Create: `$F/listening-form/listening-form.model.ts`
- Test: `$F/listening-form/listening-form.model.spec.ts`

**Interfaces:**
- Produces: `ListeningAdminTask.audio: string`; `ListeningDiff.deletedHere?: string[]`; `type ListeningTaskBody = Omit<ListeningPackItem, 'id' | 'active'>`.
- Produces: `PracticeListeningService.get(key)`, `create(body)`, `update(key, body)`, `remove(key)`.
- Produces (модель): `ListeningType`, `LISTENING_TYPES`, `ListeningDraft`, `emptyDraft(level)`, `draftFromTask(task)`, `bodyFromDraft(draft)`, `draftProblems(draft): string[]`.

- [ ] **Step 1: Падающий spec**

`$F/listening-form/listening-form.model.spec.ts`:

```ts
import { bodyFromDraft, draftFromTask, draftProblems, emptyDraft } from './listening-form.model';
import { ListeningAdminTask } from '../../../../core/models/practice-listening.models';

const AUDIO = 'media/aaaaaaaaaaaaaaaaaaaaaaaa.mp3';

describe('listening-form.model', () => {
  it('выбор ответа: в тело идут только поля типа, ответ — текст отмеченного варианта', () => {
    const d = { ...emptyDraft('a1'), audio: AUDIO, prompt: ' Where? ', options: ['Here', '', 'There'], answerIndex: 2 };
    expect(bodyFromDraft(d)).toEqual({ level: 'a1', type: 'listen_choice', audio: AUDIO, explanation: '', prompt: 'Where?', options: ['Here', 'There'], answer: 'There' });
  });

  it('собери фразу и впиши — свои поля', () => {
    const asm = { ...emptyDraft('b1'), type: 'listen_assemble' as const, audio: AUDIO, text: "I'm here.", tokens: ["I'm", ' here '], distractors: ['', 'there'] };
    expect(bodyFromDraft(asm)).toEqual({ level: 'b1', type: 'listen_assemble', audio: AUDIO, explanation: '', text: "I'm here.", tokens: ["I'm", 'here'], distractors: ['there'] });
    const typ = { ...emptyDraft('c1'), type: 'listen_type' as const, audio: AUDIO, answer: ' Hi ' };
    expect(bodyFromDraft(typ)).toEqual({ level: 'c1', type: 'listen_type', audio: AUDIO, explanation: '', answer: 'Hi' });
  });

  it('задание из админки превращается в черновик: ответ — индекс варианта, запись — ссылка пакета', () => {
    const t: ListeningAdminTask = {
      id: 'a1_001', level: 'a1', type: 'listen_choice', orderIndex: 0, audio: AUDIO, audioUrl: 'https://files.test/a.mp3',
      explanation: 'Li', body: { prompt: 'Where?', options: ['A', 'B'], answer: 'B' }, active: true,
    };
    const d = draftFromTask(t);
    expect(d.answerIndex).toBe(1);
    expect(d.audio).toBe(AUDIO);
    expect(bodyFromDraft(d).answer).toBe('B');
  });

  it('проблемы до отправки: нет записи, нет отметки ответа, мало вариантов', () => {
    const d = { ...emptyDraft('a1'), prompt: 'Q?', options: ['A', ''] };
    const p = draftProblems(d);
    expect(p).toContain('Загрузите запись (mp3).');
    expect(p).toContain('Нужно хотя бы два варианта.');
    expect(p).toContain('Отметьте правильный вариант.');
    expect(draftProblems({ ...emptyDraft('a1'), type: 'listen_type', audio: AUDIO, answer: 'Hi' })).toEqual([]);
  });
});
```

- [ ] **Step 2: Запустить — падает**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/feature/system/practice-listening/listening-form/*.spec.ts'`
Expected: FAIL — модуля нет.

- [ ] **Step 3: Модели и сервис**

`practice-listening.models.ts`: в `ListeningAdminTask` после `orderIndex` — `audio: string;` (комментарий `/** media/<sha24>.mp3 — для правки без замены записи */`); в `ListeningDiff` — `deletedHere?: string[];`; в конец файла:

```ts
/** Тело формы создания/правки: задание пакета без id (его выдаёт сервер) и без флага видимости. */
export type ListeningTaskBody = Omit<ListeningPackItem, 'id' | 'active'>;
```

`practice-listening.service.ts` (импорт `ListeningTaskBody`), методы:

```ts
  get(key: string): Observable<ListeningAdminTask> {
    return this.http.get<ListeningAdminTask>(this.url(`/admin/practice/listening/tasks/${encodeURIComponent(key)}`));
  }

  /** id выдаёт сервер; ответ — созданное задание. */
  create(body: ListeningTaskBody): Observable<ListeningAdminTask> {
    return this.http.post<ListeningAdminTask>(this.url('/admin/practice/listening/tasks'), body);
  }

  update(key: string, body: ListeningTaskBody): Observable<ListeningAdminTask> {
    return this.http.put<ListeningAdminTask>(this.url(`/admin/practice/listening/tasks/${encodeURIComponent(key)}`), body);
  }

  remove(key: string): Observable<void> {
    return this.http.delete<void>(this.url(`/admin/practice/listening/tasks/${encodeURIComponent(key)}`));
  }
```

- [ ] **Step 4: Модель формы**

`$F/listening-form/listening-form.model.ts`:

```ts
import { ListeningAdminTask, ListeningTaskBody } from '../../../../core/models/practice-listening.models';

/**
 * Черновик формы задания Аудирования — чистые функции без Angular, чтобы правила формы проверялись обычным spec.
 * Решает форма только удобство (поля под тип, ответ отметкой); что сохранять — решает бэкенд (ListeningRules).
 */

export type ListeningType = 'listen_choice' | 'listen_assemble' | 'listen_type';

export const LISTENING_TYPES: { value: ListeningType; label: string }[] = [
  { value: 'listen_choice', label: 'Выбор ответа' },
  { value: 'listen_assemble', label: 'Собери фразу' },
  { value: 'listen_type', label: 'Впиши услышанное' },
];

export interface ListeningDraft {
  level: string;
  type: ListeningType;
  /** media/<sha24>.mp3; '' — запись ещё не залита */
  audio: string;
  /** для ▶ в форме */
  audioUrl: string;
  explanation: string;
  prompt: string;
  options: string[];
  /** отмеченный правильный вариант; -1 — не отмечен */
  answerIndex: number;
  text: string;
  tokens: string[];
  distractors: string[];
  /** эталон «Впиши услышанное» */
  answer: string;
}

export function emptyDraft(level: string): ListeningDraft {
  return {
    level, type: 'listen_choice', audio: '', audioUrl: '', explanation: '',
    prompt: '', options: ['', ''], answerIndex: -1, text: '', tokens: [''], distractors: [], answer: '',
  };
}

export function draftFromTask(t: ListeningAdminTask): ListeningDraft {
  const b = t.body ?? {};
  const options = b.options?.length ? [...b.options] : ['', ''];
  return {
    level: t.level, type: t.type as ListeningType, audio: t.audio, audioUrl: t.audioUrl, explanation: t.explanation ?? '',
    prompt: b.prompt ?? '', options, answerIndex: b.answer != null ? options.indexOf(b.answer) : -1,
    text: b.text ?? '', tokens: b.tokens?.length ? [...b.tokens] : [''], distractors: [...(b.distractors ?? [])],
    answer: t.type === 'listen_type' ? (b.answer ?? '') : '',
  };
}

const clean = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean);

/** Тело для бэкенда — только поля выбранного типа: чужие он отвергает («поле не относится к этому типу»). */
export function bodyFromDraft(d: ListeningDraft): ListeningTaskBody {
  const base = { level: d.level, type: d.type, audio: d.audio, explanation: d.explanation.trim() };
  if (d.type === 'listen_choice') {
    const answer = d.answerIndex >= 0 ? (d.options[d.answerIndex] ?? '').trim() : '';
    return { ...base, prompt: d.prompt.trim(), options: clean(d.options), answer };
  }
  if (d.type === 'listen_assemble') {
    return { ...base, text: d.text.trim(), tokens: clean(d.tokens), distractors: clean(d.distractors) };
  }
  return { ...base, answer: d.answer.trim() };
}

/** Что видно и без бэкенда — чтобы не тратить попытку на очевидное. */
export function draftProblems(d: ListeningDraft): string[] {
  const p: string[] = [];
  if (!d.audio) p.push('Загрузите запись (mp3).');
  if (d.type === 'listen_choice') {
    if (!d.prompt.trim()) p.push('Введите вопрос.');
    if (clean(d.options).length < 2) p.push('Нужно хотя бы два варианта.');
    if (d.answerIndex < 0 || !d.options[d.answerIndex]?.trim()) p.push('Отметьте правильный вариант.');
  } else if (d.type === 'listen_assemble') {
    if (!d.text.trim()) p.push('Введите текст записи.');
    if (!clean(d.tokens).length) p.push('Добавьте плитки.');
  } else if (!d.answer.trim()) {
    p.push('Введите эталон ответа.');
  }
  return p;
}
```

- [ ] **Step 5: Зелёный**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/feature/system/practice-listening/listening-form/*.spec.ts'`
Expected: PASS, 4 specs.

- [ ] **Step 6: Коммит**

```bash
git add src/app/core/models/practice-listening.models.ts src/app/core/services/practice-listening.service.ts src/app/feature/system/practice-listening/listening-form
git commit -m "$(printf 'feat(практика): модель формы Аудирования и API правки\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

### Task B2: Экран формы

**Files:**
- Create: `$F/listening-form/listening-form.component.ts`, `$F/listening-form/listening-form.component.html`
- Modify: `$F/practice-listening.routes.ts`, `$F/listening-tasks/listening-tasks.component.scss` (классы формы)
- Test: `$F/listening-form/listening-form.component.spec.ts`

**Interfaces:**
- Consumes: модель B1; `PracticeListeningService.get/create/update`; `PracticeMediaService.upload(section, name, bytes)`; `sha24` из `practice-content/practice-pack`; `standErrorText` из `practice-content/stand-error`.
- Produces: маршруты `/system/library/listening/create?level=<код>` и `/system/library/listening/<id>/edit`.

- [ ] **Step 1: Падающий spec**

`listening-form.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { ListeningFormComponent } from './listening-form.component';
import { PracticeListeningService } from '../../../../core/services/practice-listening.service';
import { PracticeMediaService } from '../../../../core/services/practice-media.service';
import { ToastService } from '../../../../core/services/toast.service';

const AUDIO = 'media/aaaaaaaaaaaaaaaaaaaaaaaa.mp3';

async function build(params: { key?: string; level?: string }, overrides: Record<string, unknown> = {}) {
  TestBed.resetTestingModule();
  const api = {
    get: jasmine.createSpy('get').and.returnValue(of({
      id: 'a1_001', level: 'a1', type: 'listen_type', orderIndex: 0, audio: AUDIO, audioUrl: 'https://files.test/a.mp3',
      explanation: '', body: { answer: 'Hi' }, active: true,
    })),
    create: jasmine.createSpy('create').and.returnValue(of({ id: 'a1_125' })),
    update: jasmine.createSpy('update').and.returnValue(of({ id: 'a1_001' })),
    ...overrides,
  };
  const media = { upload: jasmine.createSpy('upload') };
  const toast = { showSuccess: jasmine.createSpy('showSuccess'), showError: jasmine.createSpy('showError') };
  const router = { navigate: jasmine.createSpy('navigate') };
  await TestBed.configureTestingModule({
    imports: [ListeningFormComponent, NoopAnimationsModule],
    providers: [
      { provide: PracticeListeningService, useValue: api },
      { provide: PracticeMediaService, useValue: media },
      { provide: ToastService, useValue: toast },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: { snapshot: {
        paramMap: convertToParamMap(params.key ? { key: params.key } : {}),
        queryParamMap: convertToParamMap(params.level ? { level: params.level } : {}),
      } } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ListeningFormComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, component: fixture.componentInstance, api, router, toast };
}

describe('ListeningFormComponent', () => {
  it('новое задание: уровень из адреса, сохранение шлёт create и возвращает к списку', async () => {
    const { component, api, router } = await build({ level: 'b1' });
    expect(component.draft.level).toBe('b1');
    component.draft = { ...component.draft, type: 'listen_type', audio: AUDIO, answer: 'Hi' };
    await component.save();
    expect(api.create).toHaveBeenCalledWith({ level: 'b1', type: 'listen_type', audio: AUDIO, explanation: '', answer: 'Hi' });
    expect(router.navigate).toHaveBeenCalledWith(['/system', 'library', 'listening']);
  });

  it('правка: задание грузится, уровень не редактируется, сохранение шлёт update', async () => {
    const { component, api } = await build({ key: 'a1_001' });
    expect(api.get).toHaveBeenCalledWith('a1_001');
    expect(component.isEdit).toBeTrue();
    component.draft.answer = 'Hello';
    await component.save();
    expect(api.update).toHaveBeenCalledWith('a1_001', jasmine.objectContaining({ level: 'a1', answer: 'Hello', audio: AUDIO }));
  });

  it('пустая форма не уходит на бэкенд — проблемы на экране', async () => {
    const { component, api } = await build({ level: 'a1' });
    await component.save();
    expect(api.create).not.toHaveBeenCalled();
    expect(component.problems).toContain('Загрузите запись (mp3).');
  });

  it('отказ бэкенда — его список нарушений на экране', async () => {
    const err = new HttpErrorResponse({ status: 400, error: { messages: ['Задание a1_125: ответа «C» нет среди вариантов.'] } });
    const { component } = await build({ level: 'a1' }, { create: jasmine.createSpy('create').and.returnValue(throwError(() => err)) });
    component.draft = { ...component.draft, type: 'listen_type', audio: AUDIO, answer: 'Hi' };
    await component.save();
    expect(component.problems).toEqual(['Задание a1_125: ответа «C» нет среди вариантов.']);
  });

  it('удаление отмеченного варианта снимает отметку, удаление варианта выше сдвигает её', async () => {
    const { component } = await build({ level: 'a1' });
    component.draft.options = ['A', 'B', 'C'];
    component.draft.answerIndex = 2;
    component.removeOption(0);
    expect(component.draft.answerIndex).toBe(1);
    component.removeOption(1);
    expect(component.draft.answerIndex).toBe(-1);
  });
});
```

- [ ] **Step 2: Запустить — падает**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/feature/system/practice-listening/listening-form/*.spec.ts'`
Expected: FAIL — компонента нет.

- [ ] **Step 3: Компонент**

`listening-form.component.ts`:

```ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';

import { PracticeListeningService } from '../../../../core/services/practice-listening.service';
import { PracticeMediaService } from '../../../../core/services/practice-media.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LISTENING_LEVELS } from '../../../../core/models/practice-listening.models';
import { sha24 } from '../../practice-content/practice-pack';
import { standErrorText } from '../../practice-content/stand-error';
import { LISTENING_TYPES, ListeningDraft, bodyFromDraft, draftFromTask, draftProblems, emptyDraft } from './listening-form.model';

/**
 * Задание Аудирования по одному — этап 2 переноса Практики (спека 2026-10-22-practice-listening-forms-design.md).
 * Правит только админ, без модерации: сохранил — задание у учеников. id нового задания выдаёт сервер; уровень у
 * существующего не меняется (на префиксе id прогресс), поэтому в правке он только показан.
 */
@Component({
  selector: 'app-listening-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './listening-form.component.html',
  styleUrl: '../listening-tasks/listening-tasks.component.scss',
})
export class ListeningFormComponent implements OnInit {
  readonly levels = LISTENING_LEVELS;
  readonly types = LISTENING_TYPES;
  draft: ListeningDraft = emptyDraft('a1');
  key: string | null = null;
  loading = false;
  saving = false;
  uploading = false;
  problems: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: PracticeListeningService,
    private media: PracticeMediaService,
    private toast: ToastService,
  ) {}

  get isEdit(): boolean {
    return this.key !== null;
  }

  ngOnInit(): void {
    this.key = this.route.snapshot.paramMap.get('key');
    if (!this.key) {
      const level = this.route.snapshot.queryParamMap.get('level') ?? '';
      this.draft = emptyDraft((LISTENING_LEVELS as readonly string[]).includes(level) ? level : 'a1');
      return;
    }
    this.loading = true;
    this.api.get(this.key).subscribe({
      next: (t) => { this.draft = draftFromTask(t); this.loading = false; },
      error: (e) => { this.toast.showError(standErrorText(e, 'Не удалось загрузить задание')); this.loading = false; },
    });
  }

  trackByIndex(i: number): number {
    return i;
  }

  addRow(list: string[]): void {
    list.push('');
  }

  removeRow(list: string[], i: number): void {
    list.splice(i, 1);
  }

  /** Отметка ответа — индекс: удаление варианта выше сдвигает её, удаление отмеченного — снимает. */
  removeOption(i: number): void {
    this.draft.options.splice(i, 1);
    if (this.draft.answerIndex === i) this.draft.answerIndex = -1;
    else if (this.draft.answerIndex > i) this.draft.answerIndex--;
  }

  async onAudio(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploading = true;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const up = await firstValueFrom(this.media.upload('listening', `${await sha24(bytes)}.mp3`, bytes));
      this.draft.audio = `media/${up.name}`;
      this.draft.audioUrl = up.url;
    } catch (e) {
      this.toast.showError(standErrorText(e, 'Запись не загрузилась'));
    } finally {
      this.uploading = false;
    }
  }

  async save(): Promise<void> {
    this.problems = draftProblems(this.draft);
    if (this.problems.length) return;
    this.saving = true;
    const body = bodyFromDraft(this.draft);
    try {
      const saved = await firstValueFrom(this.key ? this.api.update(this.key, body) : this.api.create(body));
      this.toast.showSuccess(this.key ? 'Задание сохранено' : `Задание ${saved.id} добавлено`);
      this.back();
    } catch (e) {
      this.problems = standErrorText(e, 'Задание не сохранено').split('\n');
    } finally {
      this.saving = false;
    }
  }

  back(): void {
    this.router.navigate(['/system', 'library', 'listening']);
  }
}
```

`listening-form.component.html`:

```html
<div class="lt">
  <div class="lt__head">
    <div>
      <h2>{{ isEdit ? 'Задание ' + key : 'Новое задание Аудирования' }}</h2>
      <p class="lt__subtitle">Сохранённое сразу видно ученикам (с задержкой до 5 минут).</p>
    </div>
    <button mat-stroked-button (click)="back()"><mat-icon>arrow_back</mat-icon> К заданиям</button>
  </div>

  <div class="lt__loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

  <form class="lf" *ngIf="!loading" (ngSubmit)="save()">
    <label class="lf__row">
      <span>Уровень</span>
      <select name="level" [(ngModel)]="draft.level" [disabled]="isEdit">
        <option *ngFor="let l of levels" [value]="l">{{ l.toUpperCase() }}</option>
      </select>
      <small *ngIf="isEdit">Уровень не меняется: от него зависит прогресс учеников.</small>
    </label>

    <label class="lf__row">
      <span>Тип</span>
      <select name="type" [(ngModel)]="draft.type">
        <option *ngFor="let t of types" [value]="t.value">{{ t.label }}</option>
      </select>
    </label>

    <div class="lf__row">
      <span>Запись (mp3)</span>
      <audio *ngIf="draft.audioUrl" controls preload="none" [src]="draft.audioUrl"></audio>
      <input type="file" accept="audio/mpeg,.mp3" (change)="onAudio($event)" [disabled]="uploading">
      <small *ngIf="uploading">Загружаем…</small>
    </div>

    <ng-container *ngIf="draft.type === 'listen_choice'">
      <label class="lf__row"><span>Вопрос</span><input name="prompt" [(ngModel)]="draft.prompt"></label>
      <div class="lf__row">
        <span>Варианты (отметьте правильный)</span>
        <div class="lf__list" *ngFor="let o of draft.options; let i = index; trackBy: trackByIndex">
          <input type="radio" name="answer" [checked]="draft.answerIndex === i" (change)="draft.answerIndex = i">
          <input [name]="'opt' + i" [(ngModel)]="draft.options[i]">
          <button type="button" mat-icon-button (click)="removeOption(i)" [disabled]="draft.options.length <= 2"><mat-icon>close</mat-icon></button>
        </div>
        <button type="button" mat-button (click)="addRow(draft.options)" [disabled]="draft.options.length >= 6">+ вариант</button>
      </div>
    </ng-container>

    <ng-container *ngIf="draft.type === 'listen_assemble'">
      <label class="lf__row"><span>Текст записи (что звучит)</span><input name="text" [(ngModel)]="draft.text"></label>
      <div class="lf__row">
        <span>Плитки — в верном порядке</span>
        <div class="lf__list" *ngFor="let t of draft.tokens; let i = index; trackBy: trackByIndex">
          <input [name]="'tok' + i" [(ngModel)]="draft.tokens[i]">
          <button type="button" mat-icon-button (click)="removeRow(draft.tokens, i)" [disabled]="draft.tokens.length <= 1"><mat-icon>close</mat-icon></button>
        </div>
        <button type="button" mat-button (click)="addRow(draft.tokens)">+ плитка</button>
      </div>
      <div class="lf__row">
        <span>Лишние плитки</span>
        <div class="lf__list" *ngFor="let t of draft.distractors; let i = index; trackBy: trackByIndex">
          <input [name]="'dis' + i" [(ngModel)]="draft.distractors[i]">
          <button type="button" mat-icon-button (click)="removeRow(draft.distractors, i)"><mat-icon>close</mat-icon></button>
        </div>
        <button type="button" mat-button (click)="addRow(draft.distractors)">+ лишняя плитка</button>
      </div>
    </ng-container>

    <label class="lf__row" *ngIf="draft.type === 'listen_type'">
      <span>Эталон — что ученик должен вписать</span><input name="answer" [(ngModel)]="draft.answer">
    </label>

    <label class="lf__row">
      <span>Разбор <small>(можно &lt;b&gt; и &lt;i&gt;)</small></span>
      <textarea name="explanation" rows="3" [(ngModel)]="draft.explanation"></textarea>
    </label>

    <ul class="lt__error" *ngIf="problems.length"><li *ngFor="let p of problems">{{ p }}</li></ul>

    <button mat-flat-button color="primary" type="submit" [disabled]="saving || uploading">
      <mat-icon>save</mat-icon> {{ isEdit ? 'Сохранить' : 'Добавить' }}
    </button>
  </form>
</div>
```

В `listening-tasks.component.scss` дописать:

```scss
.lf { display: flex; flex-direction: column; gap: 14px; max-width: 640px; }
.lf__row {
  display: flex; flex-direction: column; gap: 6px;
  > span { font-weight: 600; }
  input:not([type=radio]):not([type=file]), select, textarea { padding: 8px 10px; border: 1px solid rgba(0, 0, 0, 0.2); border-radius: 8px; font: inherit; }
  small { color: rgba(0, 0, 0, 0.6); font-weight: 400; }
}
.lf__list { display: flex; align-items: center; gap: 8px; input:not([type=radio]) { flex: 1; } }
```

`practice-listening.routes.ts` (импорт `ListeningFormComponent`):

```ts
export const PRACTICE_LISTENING_ROUTES: Routes = [
  { path: '', component: ListeningTasksComponent },
  { path: 'pack', component: ListeningPackComponent },
  { path: 'create', component: ListeningFormComponent },
  { path: ':key/edit', component: ListeningFormComponent },
];
```

- [ ] **Step 4: Зелёный**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/feature/system/practice-listening/listening-form/*.spec.ts'`
Expected: PASS, 9 specs (4 модели + 5 компонента).

- [ ] **Step 5: Коммит**

```bash
git add src/app/feature/system/practice-listening
git commit -m "$(printf 'feat(практика): экран формы задания Аудирования\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

### Task B3: Кнопки в списке, удаление, сверка пакета

**Files:**
- Modify: `$F/listening-tasks/listening-tasks.component.ts`, `.html`, `.spec.ts`; `$F/listening-pack/listening-pack.component.html`

**Interfaces:**
- Consumes: `PracticeListeningService.remove`, `DialogService.showDialog(message, onConfirm)`.
- Produces: `ListeningTasksComponent.add()`, `edit(t)`, `remove(t)`.

- [ ] **Step 1: Падающий spec**

В `listening-tasks.component.spec.ts`: в `service` мока добавить `remove: jasmine.createSpy('remove').and.returnValue(of(undefined))`; в `providers` — `{ provide: DialogService, useValue: { showDialog: (_: string, ok: () => void) => ok() } }` (импорт `DialogService` из `../../../../core/services/dialog.service`); тесты:

```ts
  it('«Добавить задание» ведёт на форму с выбранным уровнем', async () => {
    const { component, router } = await build();
    component.selectLevel('b1');
    component.add();
    expect(router.navigate).toHaveBeenCalledWith(['/system', 'library', 'listening', 'create'], { queryParams: { level: 'b1' } });
  });

  it('«Изменить» ведёт на форму задания', async () => {
    const { component, router } = await build();
    component.edit(component.items[0]);
    expect(router.navigate).toHaveBeenCalledWith(['/system', 'library', 'listening', 'a1_001', 'edit']);
  });

  it('«Удалить» после подтверждения убирает задание из списка', async () => {
    const { component, service } = await build();
    component.remove(component.items[0]);
    expect(service.remove).toHaveBeenCalledWith('a1_001');
    expect(component.items.map((t) => t.id)).not.toContain('a1_001');
  });
```

(в `TASK` фабрике spec добавить поле `audio: 'media/aaaaaaaaaaaaaaaaaaaaaaaa.mp3'` — теперь оно обязательное в `ListeningAdminTask`).

- [ ] **Step 2: Запустить — падает**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/feature/system/practice-listening/listening-tasks/*.spec.ts'`
Expected: FAIL — нет `add/edit/remove`.

- [ ] **Step 3: Реализация**

`listening-tasks.component.ts`: импорт `DialogService`; конструктор `constructor(private service: PracticeListeningService, private toast: ToastService, private router: Router, private dialog: DialogService) {}`; doc-комментарий класса заменить на «… задания: просмотр, прослушивание, «скрыть/показать», добавить / изменить / удалить по одному (этап 2); пакет — «Перенос между стендами».»; методы:

```ts
  add(): void {
    this.router.navigate(['/system', 'library', 'listening', 'create'], { queryParams: { level: this.level ?? 'a1' } });
  }

  edit(t: ListeningAdminTask): void {
    this.router.navigate(['/system', 'library', 'listening', t.id, 'edit']);
  }

  /** Удаление — отметкой на бэкенде: номер не переиспользуется, прогресс учеников по заданию не теряется. */
  remove(t: ListeningAdminTask): void {
    this.dialog.showDialog(`Удалить задание ${t.id}? Ученики его больше не увидят.`, () => {
      this.service.remove(t.id).subscribe({
        next: () => { this.items = this.items.filter((x) => x.id !== t.id); this.toast.showSuccess('Удалено'); },
        error: (e) => this.toast.showError(standErrorText(e, 'Не удалось удалить')),
      });
    });
  }
```

`listening-tasks.component.html`: в шапке перед «Перенос между стендами»:

```html
    <div class="lt__actions">
      <button mat-flat-button color="primary" (click)="add()"><mat-icon>add</mat-icon> Добавить задание</button>
      <button mat-stroked-button (click)="openPack()"><mat-icon>sync_alt</mat-icon> Перенос между стендами</button>
    </div>
```

(прежнюю одиночную кнопку «Перенос между стендами» удалить — она теперь внутри `.lt__actions`); в таблице заголовок `<th></th>` последним и в строке последней ячейкой:

```html
          <td class="lt__row-actions">
            <button mat-icon-button (click)="edit(t)" aria-label="Изменить"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button (click)="remove(t)" aria-label="Удалить"><mat-icon>delete</mat-icon></button>
          </td>
```

текст пустого списка: «Заданий пока нет. Нажмите «Добавить задание» или залейте пакет через «Перенос между стендами».»; в `.scss` — `.lt__actions { display: flex; gap: 8px; flex-wrap: wrap; } .lt__row-actions { white-space: nowrap; }`.

`listening-pack.component.html`: после абзаца «Останутся как есть…»:

```html
      <p *ngIf="diff.deletedHere?.length">Удалены на этом стенде (заливка их не вернёт): {{ diff.deletedHere!.length }}.</p>
```

- [ ] **Step 4: Все spec раздела и сборка**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/feature/system/practice-content/**/*.spec.ts' --include='src/app/feature/system/practice-listening/**/*.spec.ts' --include='src/app/feature/system/library/**/*.spec.ts' && npx ng build --configuration development`
Expected: всё зелёное, сборка проходит.

- [ ] **Step 5: Коммит**

```bash
git add src/app/feature/system/practice-listening
git commit -m "$(printf 'feat(практика): «Добавить / Изменить / Удалить» в окне Аудирования\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

---

## Часть C — PR, мерж, проверка на деве

### Task C1: PR и мерж (бэкенд первым)

- [ ] **Step 1: Номер миграции** — заново сверить: `origin/develop`, все `origin/*` (`git for-each-ref refs/remotes/origin`), локальные ветки и диски `git worktree list` (соседние сессии держат незапушенные номера). Занят — `git mv` на свободный, поправить комментарий и описание PR.
- [ ] **Step 2: Бэкенд** — `git push -u origin feat/practice-listening-forms`, `gh pr create --repo jtsapp/backend --base develop` (описание: что, почему, проверки, номер миграции), мерж `gh pr merge --merge --match-head-commit <полный sha>`, проверить по содержимому, что всё в develop.
- [ ] **Step 3: Админка** — то же для `jtsapp/web-admin`; перед мержем — нет ли пересечений с новыми коммитами develop (`comm -12` по спискам файлов).
- [ ] **Step 4: Спека и план** — PR в jts-web-app с ветки `docs/listening-forms` (только docs).

### Task C2: Проверка на деве (когда выкатится)

- [ ] **Step 1:** дождаться: `actuator/info` бэкенда показывает новый коммит, сборка дев-админки свежее мержа.
- [ ] **Step 2:** в дев-админке (вход — владелец) «Добавить задание» A1, тип «Впиши услышанное», своя короткая mp3 → сохранить; задание появилось в конце A1 с id `a1_125`; `GET /practice-content/listening/a1` (через ≤5 мин) — 125 заданий, последнее `a1_125`.
- [ ] **Step 3:** «Изменить» `a1_125`: тип «Выбор ответа», варианты, отметка → сохранить; на ручке поля новые, место то же.
- [ ] **Step 4:** «Удалить» `a1_125` → пропало из списка и с ручки (124); «Перенос между стендами» → сверка того же пакета 800: «без изменений 800», а `a1_125` в пакете нет — строки «удалены на стенде» нет.
- [ ] **Step 5:** отчёт со скриншотами формы.
