# «Чтение» в админке — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 80 текстов «Чтения» Практики переезжают из `public/practice/reading` сайта в таблицу бэкенда; админ заливает их пакетом и правит формой (добавить / изменить / удалить / скрыть); сайт читает бэкенд, а при пустом стенде — статику.

**Architecture:** Повторяем пилот Аудирования (`modules/practice/listening` бэкенда, `feature/system/practice-listening` админки, `src/practice/remoteContent.js` сайта), но раздел без медиа: текст — одна строка таблицы, документ целиком в `body`. Правила двух уровней: «форма данных» (всегда) и «готовность» (чтобы показать). Новый текст из формы создаётся скрытым.

**Tech Stack:** backend — Spring Boot, JPA, Flyway, JUnit 5 + H2 (`./gradlew test`); web-admin — Angular 17 standalone, Karma/Jasmine; сайт — Next.js, vitest, playwright.

**Спека:** `docs/superpowers/specs/2026-10-22-practice-reading-admin-design.md` (этот репозиторий). Читать целиком перед любой задачей.

## Global Constraints

- Комментарии в коде — на русском, объясняют «почему» (стиль соседних файлов Аудирования).
- id текста не меняется никогда; у 80 нынешних — как есть (`a1-sci-honey`). Новые: `^(a1|a2|b1|b2|c1)-[a-z0-9]+(-[a-z0-9]+)*$`, до 60 знаков, префикс = уровень.
- В документе (пакет, публичная ручка, админские тело и ответ) `level` — заглавными `A1`…`C1`, как в файле сайта; в путях и `?level=` — строчными `a1`; в колонке — строчными.
- Жанры: `adventure, culture, history, mystery, nature, people, science, technology`; коды id: `adv, cul, his, mys, nat, peo, sci, tec`.
- Типы упражнений: `before, mc, vocab, finish, tf, tfng, match, wwmatch, headings, order, summary, gap, reflection`.
- Доступ к админским ручкам — `hasRole('ADMIN')`, как у Аудирования.
- Номер миграции Flyway — следующий свободный в момент мержа: перед PR и перед мержем сверить `V*` на `origin/develop`, всех `origin/*` и локальных ветках соседних worktree (`git worktree list`). На 22.10 последняя в develop — смотри `ls src/main/resources/db/migration | sort -V | tail`.
- Бэкенд-тесты — без WebMvc-срезов (они красные на develop из-за `IeltsAccessInterceptor`): сервис на H2 по образцу `ListeningServiceTest`, правила — чистый JUnit.
- Код IELTS не трогать.

## Где работать

| Репо | Worktree | Ветка |
|---|---|---|
| backend | `C:\Users\nural\Desktop\backend-practice-reading` | `feat/practice-reading` |
| web-admin | `C:\Users\nural\Desktop\web-admin-practice-reading` | `feat/practice-reading` |
| сайт | `C:\Users\nural\Desktop\jts-practice-reading` | `feat/practice-reading-admin` |

Все три — от свежего `origin/develop` 22.10. `node_modules` в web-admin и сайте ставить `npm ci` в своём worktree.

## Структура файлов

**backend** (`src/main/java/kz/education/server/…`):
- `modules/practice/reading/ReadingText.java` — сущность (`@DynamicUpdate`).
- `modules/practice/reading/ReadingTextRepository.java`.
- `modules/practice/reading/ReadingDtos.java` — записи документа, пакета, ответов админки.
- `modules/practice/reading/ReadingRules.java` — форма данных + готовность; чистый, без Spring.
- `modules/practice/reading/ReadingKeys.java` — выдача id нового текста; чистый.
- `modules/practice/reading/ReadingService.java` — выдача, админка, пакет, формы.
- `presentation/common/practice/controller/PracticeReadingPublicController.java`.
- `presentation/admin/practice/controller/AdminPracticeReadingController.java`.
- `src/main/resources/db/migration/V<N>__Practice_reading_texts.sql`.
- `docs/practice/PACK_FORMAT.md` — раздел `reading`.
- Тесты: `src/test/java/…/modules/practice/reading/{ReadingRulesTest,ReadingKeysTest,ReadingServiceTest}.java`; фикстура `src/test/resources/practice/reading/{a1,a2,b1,b2,c1}.json` — копия `public/practice/reading/*.json` сайта (коммит `origin/develop` 22.10).

**web-admin** (`src/app/…`):
- `core/models/practice-reading.models.ts`, `core/services/practice-reading.service.ts`.
- `feature/system/practice-reading/practice-reading.routes.ts`.
- `feature/system/practice-reading/reading-texts/` — список.
- `feature/system/practice-reading/reading-pack/` — пакет.
- `feature/system/practice-reading/reading-form/` — форма: `reading-form.model.ts` (документ ↔ форма), `reading-rules.ts` (готовность), `reading-defaults.ts` (стандартные инструкции типов), `reading-form.component.*`, `editors/{choice,pairs,order,gap,reflection}-editor.component.*`, `reading-preview.component.*`, `__fixtures__/reading-texts.json`.
- Правки: `feature/system/system.routes.ts` (маршрут), `feature/system/library/library.component.*` (вкладка «Чтение»), `feature/system/practice-content/practice-pack.ts` (если пакет без медиа не проходит).

**сайт**:
- `src/screens/ReadingPage.jsx` — загрузка уровня через `loadPracticeContent`.
- `src/app/api/practice/catalog/route.js` — `readingArea` с бэкенда.
- `scripts/practice-pack/build-reading.js` (+ `.test.js`).
- `CLAUDE.md` — абзац «Чтение в Практике».

---

## Волна 1 — пакет

### Task B1: бэкенд — таблица, документ, правила, id

**Files:**
- Create: `…/modules/practice/reading/{ReadingText,ReadingTextRepository,ReadingDtos,ReadingRules,ReadingKeys}.java`
- Create: `src/main/resources/db/migration/V<N>__Practice_reading_texts.sql`
- Create: `src/test/java/…/modules/practice/reading/{ReadingRulesTest,ReadingKeysTest}.java`
- Create: `src/test/resources/practice/reading/{a1,a2,b1,b2,c1}.json` (скопировать из `C:\Users\nural\Desktop\jts-practice-reading\public\practice\reading\`)

**Образец:** `modules/practice/listening/{ListeningTask,ListeningTaskRepository,ListeningDtos,ListeningRules}.java`, `V390__Practice_listening_tasks.sql`, `V395__Practice_listening_deleted_at.sql`, `ListeningRulesTest.java`.

**Interfaces — Produces:**

```java
// ReadingDtos
public static final List<String> LEVELS = List.of("a1","a2","b1","b2","c1");
public static final List<String> GENRES = List.of("adventure","culture","history","mystery","nature","people","science","technology");
public static final Map<String,String> GENRE_CODES; // adventure→adv, culture→cul, history→his, mystery→mys, nature→nat, people→peo, science→sci, technology→tec
@JsonInclude(NON_NULL) public record Loc(String en, String ru, String kz) {}
@JsonInclude(NON_NULL) public record Cover(String emoji) {}
@JsonInclude(NON_NULL) public record Word(String en, String tr, String ru, String kz, String ex) {}
@JsonInclude(NON_NULL) public record Pair(JsonNode l, JsonNode r, Loc alt) {}          // l/r: строка или Loc
@JsonInclude(NON_NULL) public record Exercise(String type, Loc instruction, Loc explanation,
        List<JsonNode> items,            // выбор — объекты {q|s, o, a, e}; порядок — строки
        List<Pair> pairs, String text, List<String> extra,
        String q, List<List<String>> keys, Integer min, String model) {}
@JsonInclude(NON_NULL) public record ReadingDoc(String id, String level, String genre, String title, Cover cover,
        Loc task, List<Word> words, List<String> text, List<Exercise> exercises, Boolean active) {}
public record PackBody(List<ReadingDoc> items) {}
public record LevelCount(String level, long count) {}
public record AdminRow(String id, String level, String genre, String title, int orderIndex, boolean active,
        boolean ready, List<String> missing, int exercises, LocalDateTime updatedAt) {}
public record AdminText(ReadingDoc doc, int orderIndex, boolean active, boolean ready, List<String> problems,
        LocalDateTime updatedAt) {}
public record DiffResult(List<String> added, List<String> changed, int unchanged, List<String> onlyInAdmin, List<String> deletedHere) {}
public record ImportResult(int added, int changed, int unchanged) {}
public record ExportBundle(String format, int version, String section, List<ReadingDoc> items, List<String> media) {}

// ReadingRules — чистый класс
public static List<String> shape(ReadingDoc doc);      // нарушения формы данных, пусто = ок
public static List<String> readiness(ReadingDoc doc);  // что мешает показать, пусто = готов
public static List<String> missing(ReadingDoc doc);    // ["ru"], ["kz"], ["ru","kz"] или [] — каких переводов нет хоть в одном Loc / слове
public static ReadingDoc trimmed(ReadingDoc doc);      // строки обрезаны по краям

// ReadingKeys — чистый класс
public static final Pattern KEY = Pattern.compile("^(a1|a2|b1|b2|c1)-[a-z0-9]+(-[a-z0-9]+)*$");
public static boolean valid(String key, String level); // KEY, длина ≤ 60, префикс = level+"-"
public static String newKey(String level, String genre, String title, Random rnd, Predicate<String> taken);
```

`AdminText` сериализуется плоско: аннотировать `doc` `@JsonUnwrapped`, чтобы ответ был документом плюс `orderIndex, active, ready, problems, updatedAt` (поле `active` документа в ответе = видимость строки).

- [ ] **Step 1: Миграция.** `practice_reading_texts`: `id BIGSERIAL PK`, `text_key VARCHAR(60) NOT NULL UNIQUE`, `level VARCHAR(2) NOT NULL`, `genre VARCHAR(20) NOT NULL`, `title VARCHAR(200) NOT NULL`, `order_index INTEGER NOT NULL DEFAULT 0`, `body TEXT NOT NULL DEFAULT '{}'`, `is_active BOOLEAN NOT NULL DEFAULT TRUE`, `deleted_at TIMESTAMP`, `created_at TIMESTAMP NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMP`; индекс `idx_practice_reading_level (level, is_active, order_index)`. Комментарии в SQL — зачем таблица, что в `body` (`cover, task, words, text, exercises`), почему TEXT, почему `deleted_at` (id не переиспользуется: на нём прогресс и домашка). Номер — следующий свободный (см. Global Constraints).

- [ ] **Step 2: Сущность и репозиторий** по образцу `ListeningTask` (`@DynamicUpdate` с тем же комментарием; `text_key` `updatable = false`). Репозиторий: `findByLevelAndIsActiveTrueAndDeletedAtIsNullOrderByOrderIndexAscIdAsc(String)`, `findByDeletedAtIsNullOrderByLevelAscOrderIndexAscIdAsc()`, `findByLevelAndDeletedAtIsNullOrderByOrderIndexAscIdAsc(String)`, `findByTextKey(String)`, `existsByTextKey(String)`, `countByLevelAndIsActiveTrueAndDeletedAtIsNull…` или запрос `levelCounts()` как у Аудирования, `maxOrderIndex(level)` (`coalesce(max(orderIndex), -1)` по уровню, включая удалённые).

- [ ] **Step 3: Тесты правил (падающие)** — `ReadingRulesTest`:
  - все 80 текстов фикстуры: `shape` и `readiness` пусты (читать `practice/reading/<lv>.json` с classpath, `texts[]` → `ReadingDoc` строгим `ObjectMapper` с `FAIL_ON_UNKNOWN_PROPERTIES`);
  - форма данных — по одному тесту на нарушение: неизвестный уровень / жанр / тип; у `mc` есть `pairs`; элемент `items` у `mc` с лишним ключом `x`; `a` у `tf` — строка; `a` у `tfng` = `"Y"`; `items` у `order` — объект; Loc `{en, de}`; `l` пары — число; заголовок 201 знак; 21 упражнение; 31 вопрос; 9 вариантов; строка 1001 знак;
  - готовность — по тесту: пустой заголовок; нет эмодзи; нет `task.en`; нет абзацев; слово без `ru`; 0 и 13 упражнений; инструкция без `en`; пояснение `e` без `en` (`{ru:"…"}`); вариантов 1 и 7; повтор вариантов; `a` = длине `o`; пар 1; повтор левых; повтор правых Loc по `en` без учёта регистра; `match` с правыми разного вида (строка и Loc); порядок с повтором; `gap` без `{}`; `gap` с `{a{b}}`; `gap` с непарной `{`; лишнее слово = ответу (`Honey` vs `{honey}`); `reflection` с `min` 0 и `min` > числа групп; пустая группа ключей;
  - `missing`: у текста фикстуры `[]`; убрали `kz` у одного `e` → `["kz"]`; убрали `ru` у задания → `["ru"]`;
  - `trimmed`: `"  Honey  "` → `"Honey"` во вложенных строках (заголовок, абзац, вариант, ключ).
  Сообщения — по-русски, с местом: `«Упражнение 3 (mc), вопрос 2: верный ответ вне вариантов»`.

- [ ] **Step 4: Запуск** `./gradlew test --tests '*ReadingRulesTest*'` → FAIL (класса нет).

- [ ] **Step 5: `ReadingDtos` и `ReadingRules`** — пределы и правила ровно из спеки («Правила»). Ключи элемента выбора по типу: `before/mc/vocab` — `q,o,a,e`; `finish` — `s,o,a,e`; `tf/tfng` — `s,a,e`; `e` необязателен. Поля упражнения по типу (остальные обязаны быть null): выбор — `items`; пары — `pairs`; порядок — `items`; `gap` — `text, extra`; `reflection` — `q, keys, min, model`; у всех — `type, instruction, explanation`. Пределы держать константами наверху класса.

- [ ] **Step 6: Тест `ReadingKeysTest` (падающий)**: `newKey("b1","science","The Placebo Puzzle", new Random(1), k -> false)` матчит `^b1-sci-placebo-[a-z0-9]{5}$`; стоп-слова пропускаются (`the, a, an, of, in, on, at, to, and, or, how, why, what, who, when, where, is, are, was, my, your, our`); заголовок без латиницы (`"Наурыз"`) → `b1-cul-text-xxxxx`; слово режется до 16 знаков; апостроф и дефис выкидываются (`"Don't Stop"` → `dont`); `taken` вернул true на первый хвост → второй хвост; `valid("a1-sci-honey","a1")` true, `valid("a2-sci-honey","a1")` false, 61 знак false, `"a1--x"` false.

- [ ] **Step 7: `ReadingKeys`** — минимальная реализация под тест; хвост — 5 символов из `[a-z0-9]` генератором `rnd`; до 20 попыток, дальше `IllegalStateException`.

- [ ] **Step 8:** `./gradlew test --tests '*ReadingRulesTest*' --tests '*ReadingKeysTest*'` → PASS.

- [ ] **Step 9: Commit** `feat(practice): Чтение — таблица, документ текста, правила и id`.

### Task B2: бэкенд — сервис, ручки, пакет, формы

**Files:**
- Create: `…/modules/practice/reading/ReadingService.java`
- Create: `…/presentation/common/practice/controller/PracticeReadingPublicController.java`
- Create: `…/presentation/admin/practice/controller/AdminPracticeReadingController.java`
- Create: `src/test/java/…/modules/practice/reading/ReadingServiceTest.java`
- Modify: `docs/practice/PACK_FORMAT.md` — раздел `reading`

**Образец:** `ListeningService.java`, `PracticeListeningPublicController.java`, `AdminPracticeListeningController.java`, `ListeningServiceTest.java` (H2-контекст — скопировать `TestContext`, без `PracticeMediaService`).

**Interfaces:**
- Consumes: всё из B1.
- Produces (HTTP, его ест админка и сайт):
  - `GET /practice-content/reading/levels` → `[LevelCount]` (уровни строчными, только показанные и неудалённые; кэш `public, max-age=300`).
  - `GET /practice-content/reading/{level}` → `[ReadingDoc]` без `active`, по `order_index`; неизвестный уровень → 400 (как у Аудирования).
  - `GET /admin/practice/reading/texts?level=` → `[AdminRow]` (без удалённых).
  - `GET /admin/practice/reading/texts/{id}` → `AdminText`; удалённый или нет → 404.
  - `POST /admin/practice/reading/texts` (тело `ReadingDoc`) → 201 `AdminText`: `id` в теле → 400; `shape` → 400; `active` игнор; создаётся скрытым, `order_index = maxOrderIndex(level) + 1`; id — `ReadingKeys.newKey(…, existsByTextKey)`.
  - `PUT /admin/practice/reading/texts/{id}` → 200 `AdminText`: `id`/`active` тела игнор; другой `level` → 400; `shape` → 400; если строка показана — ещё `readiness` → 400.
  - `DELETE …/texts/{id}` → 204: `deleted_at = now`, `is_active = false`.
  - `PATCH …/texts/{id}/activate` → `readiness` → 400 списком, иначе показать; `…/deactivate` → скрыть. Оба → `AdminText`.
  - `POST …/pack/diff` `{items}` → `DiffResult`; `POST …/pack/import` → `ImportResult`; `GET …/pack/export` → `ExportBundle(format="jts-practice-pack", version=1, section="reading", items, media=[])`.
  - Ошибки — тем же способом, что у Аудирования (400 с сообщением: нарушения по одному на строку, до 10).

Правила пакета (как у Аудирования, `ListeningService.diff/importPack/writePack`): id обязателен и `ReadingKeys.valid`; повтор id в пакете → 400; `shape` для каждого; `readiness` для каждого без `active: false`; порядок внутри уровня = порядок в `items`; новые создаются (скрытыми, если `active: false`); изменённые — те, у которых отличается `genre`, `title`, `body` (сравнение JSON-деревом) или порядок; импорт не трогает отсутствующие, не воскрешает удалённые (`deletedHere`), не включает скрытые на стенде, `active: false` скрывает; всё в одной транзакции, при любой ошибке ничего не пишется. Выгрузка: все строки уровня по порядку, скрытые и удалённые — `active: false`.

- [ ] **Step 1: Тест `ReadingServiceTest` (падающий)** на H2:
  - импорт фикстуры `a1.json` (16 текстов) → `ImportResult(16,0,0)`; `publicLevel("a1")` как JSON-дерево равен `texts` фикстуры (тот же документ, без `active`); `publicLevels()` = `[a1:16]`;
  - повторный импорт → `(0,0,16)`; поменяли заголовок одного → `diff.changed = [id]`, импорт `(0,1,15)`;
  - `active:false` в пакете → текст пропал из `publicLevel`, есть в `adminList` со `active=false`; тот же пакет без `active` — не вернул видимость;
  - пакет с неготовым показанным текстом (нет `task.en`) → исключение со списком, в базе ничего;
  - `create`: id матчит `^a1-sci-…-[a-z0-9]{5}$`, `active=false`, `orderIndex = 16` после импорта a1; `id` в теле → исключение;
  - `create` неготового (без упражнений) → ок (скрыт), `problems` не пуст; `activate` → исключение; дописали через `update` → `activate` ок → виден в конце `publicLevel`;
  - `update` показанного с поломкой готовности → исключение; скрытого — ок; смена `level` → исключение;
  - `delete` → нет в `publicLevel`, `adminList`, `get` → 404; `exportPack` отдаёт его `active:false`; `diff` того же пакета — в `deletedHere`, импорт не воскрешает; `newKey` не выдаёт удалённый id (проверка через `existsByTextKey`, который видит удалённые);
  - `adminList` → `missing` у текста без kz в одном пояснении = `["kz"]`, `ready=true`.
- [ ] **Step 2:** `./gradlew test --tests '*ReadingServiceTest*'` → FAIL.
- [ ] **Step 3: `ReadingService`** под тест. Сборка `ReadingDoc` из строки: `id=text_key`, `level=level.toUpperCase()`, `genre`, `title`, остальное из `body`. Запись `body` — `ObjectMapper` с `NON_NULL` только полей `cover, task, words, text, exercises`. Перед правилами — `ReadingRules.trimmed`.
- [ ] **Step 4: Контроллеры** по образцу Аудирования (Swagger-теги «Practice content · Reading» / «Admin Practice · Reading», `@PreAuthorize("hasRole('ADMIN')")` на админском). `SecurityConfig` не трогать — `GET /practice-content/**` уже открыт.
- [ ] **Step 5:** `./gradlew test --tests '*Reading*'` → PASS; затем `./gradlew compileJava compileTestJava` чисто.
- [ ] **Step 6: `PACK_FORMAT.md`** — раздел `## Раздел reading («Чтение»)`: `items.json` = тексты в форме `public/practice/reading/<уровень>.json` сайта (по одному на элемент, `level` заглавными), медиа нет (`media: []`, папки `media/` нет); таблица полей и типов упражнений из спеки; правила формы и готовности; ручки; формы (POST создаёт скрытым, id — сервер, со случайным хвостом — поэтому id формы не совпадут между стендами); таблица `practice_reading_texts` (V<N>).
- [ ] **Step 7: Commit** `feat(practice): Чтение — выдача сайту, админка, пакет и формы`.

### Task A1: админка — модели, сервис, список, пакет, вкладка

**Files:**
- Create: `src/app/core/models/practice-reading.models.ts`, `src/app/core/services/practice-reading.service.ts`
- Create: `src/app/feature/system/practice-reading/practice-reading.routes.ts`
- Create: `src/app/feature/system/practice-reading/reading-texts/reading-texts.component.{ts,html,scss,spec.ts}`
- Create: `src/app/feature/system/practice-reading/reading-pack/reading-pack.component.{ts,html,spec.ts}`
- Modify: `src/app/feature/system/system.routes.ts` (рядом с `practice-listening`), `src/app/feature/system/library/library.component.{ts,html}` (вкладка «Чтение» рядом с «Аудированием», счётчик — сумма `count` по уровням публичной ручки или длина `adminList`, как сделано у Аудирования)
- Modify при необходимости: `src/app/feature/system/practice-content/practice-pack.ts` (+ `.spec.ts`) — пакет без медиа (`manifest.media: []`, нет `media/`) должен читаться и собираться.

**Образец:** `practice-listening.models.ts`, `practice-listening.service.ts`, `practice-listening/{listening-tasks,listening-pack}`, их spec-файлы.

**Interfaces — Produces:**

```ts
export type ReadingLevel = 'a1' | 'a2' | 'b1' | 'b2' | 'c1';
export interface Loc { en?: string; ru?: string; kz?: string }
export interface ReadingWord { en: string; tr?: string; ru?: string; kz?: string; ex?: string }
export interface ReadingPair { l: string | Loc; r: string | Loc; alt?: Loc }
export interface ReadingChoiceItem { q?: string; s?: string; o?: string[]; a: number | boolean | 'T' | 'F' | 'NG'; e?: Loc }
export interface ReadingExercise {
  type: string; instruction: Loc; explanation?: Loc;
  items?: (ReadingChoiceItem | string)[]; pairs?: ReadingPair[];
  text?: string; extra?: string[]; q?: string; keys?: string[][]; min?: number; model?: string;
}
export interface ReadingDoc {
  id?: string; level: string; genre: string; title: string; cover: { emoji: string };
  task: Loc; words: ReadingWord[]; text: string[]; exercises: ReadingExercise[]; active?: boolean;
}
export interface ReadingAdminRow { id: string; level: string; genre: string; title: string; orderIndex: number;
  active: boolean; ready: boolean; missing: ('ru' | 'kz')[]; exercises: number; updatedAt: string | null }
export interface ReadingAdminText extends ReadingDoc { orderIndex: number; active: boolean; ready: boolean; problems: string[]; updatedAt: string | null }
export interface ReadingDiff { added: string[]; changed: string[]; unchanged: number; onlyInAdmin: string[]; deletedHere: string[] }
export interface ReadingImportResult { added: number; changed: number; unchanged: number }
export interface ReadingExport { format: string; version: number; section: string; items: ReadingDoc[]; media: string[] }

// PracticeReadingService
list(level?: ReadingLevel): Observable<ReadingAdminRow[]>;
get(id: string): Observable<ReadingAdminText>;
create(doc: ReadingDoc): Observable<ReadingAdminText>;
update(id: string, doc: ReadingDoc): Observable<ReadingAdminText>;
remove(id: string): Observable<void>;
setActive(id: string, active: boolean): Observable<ReadingAdminText>;
diff(items: ReadingDoc[]): Observable<ReadingDiff>;
importPack(items: ReadingDoc[]): Observable<ReadingImportResult>;
exportPack(): Observable<ReadingExport>;
```

Тело `create`/`update` — только поля `ReadingDoc` без `id` и `active` (бэкенд строгий: `orderIndex`, `ready`, `problems`, `updatedAt` → 400). Ответ `AdminText` — документ плюс служебные поля.

- [ ] **Step 1: Spec сервиса** (`HttpTestingController`): `list('a1')` → `GET …/admin/practice/reading/texts?level=a1`; `update` отрезает `id, active, orderIndex, ready, problems, updatedAt` из тела; `setActive(id,true)` → `PATCH …/activate`.
- [ ] **Step 2: Spec списка**: рисует строки, пометки «нет ru», «нет kz», «не готов»; переключатель зовёт `setActive`; ошибка 400 на «Показать» показывает список проблем (сообщение — строки через `\n`); «Удалить» спрашивает `confirm` и зовёт `remove`; уровень берётся из `?level=` (как у Аудирования).
- [ ] **Step 3: Spec пакета**: zip с `manifest {section:'reading', media:[]}` и `items.json` (2 текста) → `diff` → «Залить» → `importPack`; шаг медиа не вызывается; пакет `section:'listening'` отвергается; «Выгрузить» собирает zip без папки `media/`.
- [ ] **Step 4:** `npx ng test --watch=false --browsers=ChromeHeadless` (если лаунчер другой — как гоняются спеки Аудирования; см. README/`karma.conf`) → FAIL.
- [ ] **Step 5: Реализация** по образцу Аудирования: модели, сервис, список, пакет, маршруты (`''`, `pack`, `create`, `:id/edit` — последние два ведут на форму из A2; до A2 — временно на список), вкладка в «Библиотеке».
- [ ] **Step 6:** тесты → PASS; `npx ng build --configuration development` чисто.
- [ ] **Step 7: Commit** `feat(practice): Библиотека → Чтение — список, видимость, пакет`.

### Task S1: сайт — загрузчик, каталог, сборщик пакета

**Files:**
- Modify: `src/screens/ReadingPage.jsx` (`fetchLevel`, корень экрана — `data-source`)
- Modify: `src/app/api/practice/catalog/route.js` (`readingArea`) + `route.test.js`
- Create: `scripts/practice-pack/build-reading.js`, `scripts/practice-pack/build-reading.test.js`
- Create/Modify: тест ReadingPage на два источника (рядом с существующими `src/screens/reading/*.test.jsx`, по образцу теста `ListeningPage`)
- Modify: `CLAUDE.md` — абзац «Чтение в Практике»
- Проверить: `tests/*reading*.spec.js` — e2e проходят на статике (бэкенд в e2e не поднят → `tryRemote` уходит на статику)

**Образец:** `src/screens/ListeningPage.jsx` (как вызван `loadPracticeContent`, как ставится `data-source`), `listeningArea` в `catalog/route.js`, `scripts/practice-pack/build-listening.js` (+ test).

**Interfaces:**
- Consumes: `loadPracticeContent(section, path, staticUrl, opts)` → `{data, source}` (`src/practice/remoteContent.js`); `GET /practice-content/reading/{levels|level}` (B2).
- Produces: `build/practice-packs/reading.zip` (`manifest.json` `{format:'jts-practice-pack', version:1, section:'reading', createdAt, source:'jts-web-app@<sha>', counts:{a1..c1, items}, media:[]}`, `items.json` — 80 текстов в порядке файлов уровней).

- [ ] **Step 1: Падающие тесты:**
  - ReadingPage: `fetch` на `…/practice-content/reading/a1` отдаёт массив из одного текста → библиотека рисует его, корень `data-source="api"`; бэкенд 404 → статика `/practice/reading/a1.json`, `data-source="static"`;
  - catalog: бэкенд `levels` = `[{level:'a1',count:1}]`, `a1` = `[{id:'a1-x-y', title:'T', genre:'science', …}]` → раздел `reading` с одним юнитом `a1-x-y`; один уровень с бэкенда упал → весь раздел с диска;
  - build-reading: 80 элементов, у каждого `id` и `level` заглавными, `counts` сходятся, `media` пуст, в zip нет `media/`.
- [ ] **Step 2:** `npx vitest run src/screens/reading src/app/api/practice/catalog scripts/practice-pack --exclude '.claude/**'` → FAIL.
- [ ] **Step 3: Реализация.** `fetchLevel(level)`: `loadPracticeContent('reading', level, \`/practice/reading/${level}.json\`)`; при `source === 'api'` → `{level: level.toUpperCase(), texts: data}`; источник положить рядом с данными и вывести `data-source` на корень экрана (как у Аудирования). Кэш промиса и выкидывание ошибки из кэша — сохранить. `readingArea`: сначала `${BACKEND_URL}/practice-content/reading/levels`, если не пусто — все уровни из ответа с бэкенда (`Promise.all`), любой сбой → прежнее чтение с диска; комментарий — почему не смешиваем источники. `build-reading.js` — по образцу `build-listening.js`, без медиа.
- [ ] **Step 4:** тесты → PASS; `npm run lint` по изменённым файлам; `npx playwright test tests/<спеки чтения> --workers=1` (порт и обёртка Chrome — как в памяти e2e; если окружение не поднимается — честно записать, что не прогнано).
- [ ] **Step 5: CLAUDE.md** — в абзац «Чтение в Практике»: после заливки пакета источник текстов — бэкенд (`/practice-content/reading/{level}`, админка «Библиотека → Чтение», `docs/practice/PACK_FORMAT.md` бэкенда); правки контента — в админку, а не в прототип (прототип и экстрактор остаются ради оракула движка и `dict.json`); `node scripts/practice-pack/build-reading.js` собирает пакет из `public/`; новые id со случайным хвостом.
- [ ] **Step 6: Commit** `feat(practice): Чтение читает тексты с бэкенда, пакет для админки`.

## Волна 2 — формы

### Task A2: админка — форма текста с пятью редакторами и предпросмотром

**Files:**
- Create: `src/app/feature/system/practice-reading/reading-form/reading-form.model.ts` (+ `.spec.ts`)
- Create: `…/reading-form/reading-rules.ts` (+ `.spec.ts`)
- Create: `…/reading-form/reading-defaults.ts`
- Create: `…/reading-form/reading-form.component.{ts,html,scss,spec.ts}`
- Create: `…/reading-form/editors/{choice,pairs,order,gap,reflection}-editor.component.{ts,html}`
- Create: `…/reading-form/reading-preview.component.{ts,html,scss}`
- Create: `…/reading-form/__fixtures__/reading-texts.json` — тексты `b1-sci-tickle`, `b1-adv-jungle`, `a1-sci-honey` из `public/practice/reading/*.json` сайта (вместе покрывают все 13 типов, оба вида `match` и упражнения с `explanation` и без)
- Modify: `practice-reading.routes.ts` — `create` и `:id/edit` на форму

**Образец:** `practice-listening/listening-form/{listening-form.model.ts,listening-form.component.*}` (реактивные формы, обработка 400 списком, возврат к уровню).

**Interfaces:**
- Consumes: `PracticeReadingService`, модели из A1.
- Produces:

```ts
// reading-form.model.ts
export type Mechanic = 'choice' | 'pairs' | 'order' | 'gap' | 'reflection';
export const MECHANIC: Record<string, Mechanic>; // before/mc/vocab/finish/tf/tfng→choice; match/wwmatch/headings→pairs; order/summary→order; gap; reflection
export interface FormLoc { en: string; ru: string; kz: string }               // пустые строки вместо отсутствия
export interface ReadingFormState { level: string; genre: string; title: string; emoji: string; task: FormLoc;
  paragraphs: string[]; words: { en: string; tr: string; ru: string; kz: string; ex: string }[];
  exercises: FormExercise[] }
export interface FormExercise { type: string; instruction: FormLoc; explanation: FormLoc;
  choice?: { prompt: string; options: string[]; answer: number | boolean | 'T' | 'F' | 'NG'; e: FormLoc }[];
  pairs?: { kind: 'text' | 'meaning' | 'emoji' | 'heading'; rows: { left: string; leftLoc: FormLoc; right: string; rightLoc: FormLoc; alt: FormLoc }[] };
  order?: string[]; gap?: { text: string; extra: string[] };
  reflection?: { q: string; keys: string[][]; min: number; model: string } }
export function toForm(doc: ReadingDoc): ReadingFormState;
export function toDoc(state: ReadingFormState): ReadingDoc;   // без id/active; пустые ru/kz/explanation/e/tr/ex/alt — не пишет вовсе
export function emptyExercise(type: string): FormExercise;     // инструкция из reading-defaults
// reading-rules.ts — зеркало ReadingRules.readiness бэкенда (те же пределы и формулировки)
export function readinessProblems(doc: ReadingDoc): string[];
export function missingTranslations(doc: ReadingDoc): ('ru' | 'kz')[];
// reading-defaults.ts
export const DEFAULT_INSTRUCTION: Record<string, Loc>; // самая частая инструкция каждого типа в 80 текстах (посчитать скриптом по public/practice/reading сайта и вписать литералами)
export const TYPE_LABELS: Record<string, string>;      // подписи типов по-русски: «Перед чтением: выбор», «Верно / неверно», «Верно / неверно / не сказано», «Выбор ответа», «Закончи предложение», «Значение слова», «Слово ↔ значение/картинка», «Вопрос ↔ ответ», «Заголовки абзацев», «Порядок предложений», «Порядок пересказа», «Пропуски», «Свободный ответ»
```

`kind` у пар: `match` с правой строкой → `emoji` (правое — эмодзи, `alt` — подпись), `match` с правым Loc → `meaning`, `wwmatch` → `text`, `headings` → `heading` (левое — Loc).

- [ ] **Step 1: Spec модели (падающий):** для каждого текста фикстуры `toDoc(toForm(doc))` глубоко равен `doc` без `id`/`active` (`jasmine` `toEqual`); `emptyExercise('tfng')` даёт `choice` с одним вопросом `answer:'T'` и стандартной инструкцией; `toDoc` не пишет `kz:''`, `explanation` из пустых строк, `e` из пустых.
- [ ] **Step 2: Spec правил:** `readinessProblems` пуст для фикстуры; ловит пустой заголовок, вариант-повтор, `gap` без скобок, `min` > групп (по одному `it`); `missingTranslations` как у бэкенда.
- [ ] **Step 3: Spec компонента:** создание — уровень выбирается, «Сохранить» зовёт `create` с `toDoc(...)`, после ответа — переход на `…/reading/{id}/edit` (текст скрыт, можно продолжать); правка — `get` → форма заполнена, уровень не меняется, «Сохранить» → `update`; 400 → список строк над кнопкой; блок «Готовность» показывает `readinessProblems`, «Показать» неактивна, пока он не пуст, и зовёт `setActive(id,true)`; «+ упражнение» → выбор типа → карточка нужного редактора; ↑↓ меняют порядок упражнений и абзацев; у `headings` кнопка «заполнить по числу абзацев» создаёт N строк «Paragraph N / Абзац N / N-абзац».
- [ ] **Step 4:** тесты → FAIL.
- [ ] **Step 5: Реализация** модели, правил, умолчаний (скрипт подсчёта частых инструкций прогнать один раз по `C:\Users\nural\Desktop\jts-practice-reading\public\practice\reading`, результат вписать литералами; скрипт не коммитить), формы, пяти редакторов (поля и поведение — спека, раздел «Форма»; редактор пропусков под полем показывает найденные `{ответы}` фишками), предпросмотра (абзацы, ключевые слова, упражнения с отмеченными верными ответами; на ширине < 1100px — вкладка «Предпросмотр»).
- [ ] **Step 6:** тесты → PASS; `npx ng build --configuration development` чисто.
- [ ] **Step 7: Commit** `feat(practice): форма текста Чтения — пять редакторов, готовность, предпросмотр`.

## Финал

- [ ] Ревью ветки каждого репо (одно на репо, в конце), правки — сам.
- [ ] Перед PR бэкенда: сверка номера миграции (Global Constraints).
- [ ] PR: backend, web-admin (волна 1 — A1; волна 2 — A2, можно одним PR, если A2 готова к моменту открытия), сайт; в описании — ссылка на спеку, что проверено, что нет; отчёт-артефакт по разделу ссылкой в PR.
- [ ] Память: `practice-content-to-admin.md` — раздел «Чтение».
