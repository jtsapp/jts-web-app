# Just Listen It — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Модуль `listen` бэкенда: админ загружает HTML-прототип Just Listen It, сервер разбирает и проверяет его, кладёт наборы в MinIO и отдаёт ученику оглавление и наборы.

**Architecture:** Повтор модуля `vocabcatalog`: чистый парсер (`ListenHtmlParser`) → загрузка (`ListenUploadService`: релиз в БД + JSON в хранилище) → чтение с кэшем (`ListenCatalogService`) → два контроллера (`/admin/listen`, `/mobile/listen`). Разбор JS-литералов — общий `JsLiterals` (выносим из словаря).

**Tech Stack:** Java 24, Spring Boot 3.5, Lombok, Jackson, MinIO client, Flyway, JUnit 5 + Mockito + AssertJ.

**Спека:** `jts-web-app/docs/superpowers/specs/2026-10-21-just-listen-it-design.md` (часть 1).

## Global Constraints

- Рабочая копия: `C:\Users\nural\Desktop\backend-just-listen`, ветка `feat/just-listen-it` от `origin/develop` (уже создана). Все пути ниже — от её корня.
- Правила репо — `docs/DEVELOPMENT_GUIDE.md`: комментарии по-русски, коротко и про «почему»; класс до ~300 строк, метод до ~30; сущности наружу не отдаём — ответ API это record/DTO; `@RequiredArgsConstructor` + `private final`.
- Миграция — следующий номер после максимального в `origin/develop` (на 21.10.2026 максимальный V386 → берём **V387**). Перед пушем: `git fetch && bash scripts/check-migrations.sh --base origin/develop`; номер занят — переименовать файл.
- Тесты — на Mockito, без `@WebMvcTest`: WebMvc-срезы в репо красные из-за `IeltsAccessInterceptor`. Прогон: `./gradlew test --tests '<шаблон>'`, не две сборки Gradle сразу.
- Id набора — `^[A-Za-z0-9_-]{1,32}$`; уровни строго `A0, A1, A2, B1, B2`.
- Запись набора — массив строк `[en, ru, sentenceEn, sentenceRu, note]`, в хранилище всегда 5 элементов.
- Хранилище: `listen/current/index.json` и `listen/current/sets/<id>.json`; режим `listen.storage=local` + `listen.dir` (по умолчанию `.local/listen`) — только разработка.
- Premium пока не проверяется: в оглавлении у направлений `premium: true`, точка будущей проверки — `ListenCatalogService.readSet`.
- Коммиты: `тип(listen): суть` по-русски + строка `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Пуш и PR — только по команде владельца.

---

## File Structure

```
src/main/java/kz/education/server/
  shared/util/JsLiterals.java                         ← перенос VocabJsLiterals (общий разбор JS-литералов)
  modules/vocabcatalog/service/VocabHtmlParser.java   ← зовёт JsLiterals
  modules/listen/
    model/ListenRelease.java                          ← сущность listen_releases
    repository/ListenReleaseRepository.java
    service/ListenSet.java                            ← record: один набор после разбора
    service/ListenBundle.java                         ← record: все наборы + предупреждения
    service/ListenHtmlParser.java                     ← SYL/FIELDS/FIELD_META/NAMES → ListenBundle + проверка
    service/ListenStorageService.java                 ← listen/current/… в MinIO или на диске
    service/ListenUploadService.java                  ← разбор → файлы → релиз
    service/ListenCatalogService.java                 ← чтение оглавления/набора с кэшем, релизы
  presentation/admin/listen/
    controller/AdminListenController.java
    dto/ListenReleaseResponse.java
    dto/ListenUploadResponse.java
  presentation/mobile/listen/controller/MobileListenController.java
src/main/resources/db/migration/V387__Create_listen_releases.sql
src/test/java/kz/education/server/
  shared/util/JsLiteralsTest.java
  modules/listen/service/ListenHtmlParserTest.java
  modules/listen/service/ListenStorageLocalTest.java
  modules/listen/service/ListenUploadServiceTest.java
  modules/listen/service/ListenCatalogServiceTest.java
  presentation/listen/ListenControllersTest.java
```

---

### Task 1: Общий `JsLiterals` вместо `VocabJsLiterals`

Разбор `const X = {…}` из HTML уже написан для словаря, но закрыт в его пакете. Выносим как есть, словарь зовёт общий класс.

**Files:**
- Move: `src/main/java/kz/education/server/modules/vocabcatalog/service/VocabJsLiterals.java` → `src/main/java/kz/education/server/shared/util/JsLiterals.java`
- Modify: `src/main/java/kz/education/server/modules/vocabcatalog/service/VocabHtmlParser.java` (три вызова `VocabJsLiterals.` + импорт)
- Test: `src/test/java/kz/education/server/shared/util/JsLiteralsTest.java`

**Interfaces:**
- Produces: `public final class JsLiterals` с `public static String extract(String html, String name)`, `public static int objectStart(String html, String name)`, `public static String jsToJson(String js)`. `extract` бросает `BadRequestException` («В файле нет объявления NAME», незакрытая строка/литерал/комментарий).

- [ ] **Step 1: Написать падающий тест**

`src/test/java/kz/education/server/shared/util/JsLiteralsTest.java`:

```java
package kz.education.server.shared.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kz.education.server.shared.exception.types.BadRequestException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JsLiteralsTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void extractsLiteralWithUnquotedKeysCommentsAndBracesInsideStrings() throws Exception {
        String html = "<script>\nconst X={a:1,b:\"he said \\\"}\\\" ok\",c:['x','y',],// note }\n d:/* } */2};\nfoo();</script>";

        JsonNode node = mapper.readTree(JsLiterals.jsToJson(JsLiterals.extract(html, "X")));

        assertThat(node.path("a").asInt()).isEqualTo(1);
        assertThat(node.path("b").asText()).isEqualTo("he said \"}\" ok");
        assertThat(node.path("c")).hasSize(2);
        assertThat(node.path("d").asInt()).isEqualTo(2);
    }

    @Test
    void extractsArrayLiteral() throws Exception {
        JsonNode node = mapper.readTree(JsLiterals.jsToJson(JsLiterals.extract("let L=[{id:\"a\"},{id:\"b\"}];", "L")));

        assertThat(node).hasSize(2);
        assertThat(node.get(1).path("id").asText()).isEqualTo("b");
    }

    @Test
    void missingDeclarationNamesTheLiteral() {
        assertThatThrownBy(() -> JsLiterals.extract("<script>let Y=1</script>", "X"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("X");
    }
}
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `./gradlew test --tests '*JsLiteralsTest'`
Expected: FAIL — `cannot find symbol: class JsLiterals` (ошибка компиляции теста).

- [ ] **Step 3: Перенести класс**

```bash
mkdir -p src/main/java/kz/education/server/shared/util
git mv src/main/java/kz/education/server/modules/vocabcatalog/service/VocabJsLiterals.java src/main/java/kz/education/server/shared/util/JsLiterals.java
```

В `JsLiterals.java` поменять ровно эти места (остальной код не трогать):

```java
package kz.education.server.shared.util;
```
(вместо `package kz.education.server.modules.vocabcatalog.service;`)

Класс-комментарий и объявление:

```java
/**
 * Вырезает {@code var|let|const NAME = …} (объект или массив) из HTML-прототипа и превращает JS-литерал в JSON для
 * Jackson: ключи без кавычек, одинарные кавычки, висячие запятые, комментарии. Общий для словаря и Just Listen It.
 */
public final class JsLiterals {

    private JsLiterals() {
    }
```

Видимость методов: `static String extract(` → `public static String extract(`, `static int objectStart(` → `public static int objectStart(`, `static String jsToJson(` → `public static String jsToJson(`.

Текст ошибки: `"В файле словаря нет объявления " + name` → `"В файле нет объявления " + name`.

- [ ] **Step 4: Переключить словарь на общий класс**

В `VocabHtmlParser.java` добавить импорт и заменить три вызова:

```java
import kz.education.server.shared.util.JsLiterals;
```

```bash
sed -i 's/VocabJsLiterals\./JsLiterals./g' src/main/java/kz/education/server/modules/vocabcatalog/service/VocabHtmlParser.java
grep -rn "VocabJsLiterals" src && echo "ОСТАЛИСЬ ССЫЛКИ" || echo "чисто"
```
Expected: `чисто`.

- [ ] **Step 5: Прогнать тесты общего класса и словаря**

Run: `./gradlew test --tests '*JsLiteralsTest' --tests '*VocabHtmlParserTest' --tests '*VocabCatalogUploadServiceTest'`
Expected: PASS, все три класса зелёные.

- [ ] **Step 6: Commit**

```bash
git add -A src/main/java/kz/education/server/shared/util src/main/java/kz/education/server/modules/vocabcatalog src/test/java/kz/education/server/shared/util
git commit -m "refactor(vocab): разбор JS-литералов — общий JsLiterals

Тот же разбор нужен Just Listen It (SYL/FIELDS прототипа). Поведение словаря
не меняется: класс перенесён как есть, открыт и с общим текстом ошибки.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Парсер прототипа `ListenHtmlParser`

Чистый класс без Spring: HTML → проверенные наборы. Проверка отклоняет всю загрузку, предупреждения не мешают.

**Files:**
- Create: `src/main/java/kz/education/server/modules/listen/service/ListenSet.java`
- Create: `src/main/java/kz/education/server/modules/listen/service/ListenBundle.java`
- Create: `src/main/java/kz/education/server/modules/listen/service/ListenHtmlParser.java`
- Test: `src/test/java/kz/education/server/modules/listen/service/ListenHtmlParserTest.java`

**Interfaces:**
- Consumes: `JsLiterals.extract/jsToJson` (Task 1).
- Produces:
  - `public record ListenSet(String id, String kind, String name, String ru, String icon, String group, ArrayNode units, int lessons, int words)`; `kind` — `"level"` или `"field"`; у уровня `ru/icon/group` — `""`; `units` — очищенный массив `[{u, title, lessons:[{l, t, g, w:[[5 строк]]}]}]`.
  - `public record ListenBundle(List<ListenSet> levels, List<ListenSet> fields, List<String> warnings)` с методами `List<ListenSet> all()`, `int lessons()`, `int words()`.
  - `public static ListenBundle ListenHtmlParser.parse(String html)` — `BadRequestException` с местом ошибки («A0, юнит 1, урок 2, запись 3: …»).
  - `static final List<String> LEVEL_IDS = List.of("A0","A1","A2","B1","B2")`, `static final Pattern SET_ID`.

- [ ] **Step 1: Написать падающие тесты**

`src/test/java/kz/education/server/modules/listen/service/ListenHtmlParserTest.java`:

```java
package kz.education.server.modules.listen.service;

import kz.education.server.shared.exception.types.BadRequestException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ListenHtmlParserTest {

    static final String SYL = """
            {A1:[{u:1,title:"",lessons:[{l:1,t:"Bio",g:"Past",w:[["born","родился","I was born in Almaty.","Я родился в Алматы."]]}]}],
             A0:[{u:1,title:"You and me",lessons:[
               {l:1,t:"My family",g:"",w:[["mother","мама/мать","My mother is a teacher.","Моя мама — учитель.",""],
                                         ["get up|wake up","вставать","I get up at seven.||I wake up at seven.","Я встаю в семь.",""]]},
               {l:2,t:"Review",g:"",w:[]}]}]}""";

    static final String FIELDS = """
            [{id:"business",name:"Бизнес",cat:"Business",units:[{u:1,title:"B1 · Intermediate",lessons:[
               {l:1,t:"B1 · asset",g:"",w:[["asset","актив","The building is our main asset.","Здание — наш главный актив.",""]]}]}]},
             {id:"newfield",name:"Новое",cat:"Other",units:[{u:1,title:"B1",lessons:[
               {l:1,t:"x",g:"",w:[["term","термин","",""]]}]}]}]""";

    static String page(String syl, String fields) {
        return "<html><body><div id=\"app\"></div><script>\n"
                + "const DEMO=[{id:\"A0\",name:\"Beginner\",topics:[]}];\n"
                + "const SYL=" + syl + ";\n"
                + "const FIELDS=" + fields + ";\n"
                + "const NAMES={A0:\"Beginner\",A1:\"Elementary\",A2:\"Pre-Intermediate\",B1:\"Intermediate\",B2:\"Upper-Intermediate\"};\n"
                + "const FIELD_META={business:[\"💼\",\"Business\",\"Business\"]};\n"
                + "const app=document.getElementById(\"app\");\n"
                + "</script></body></html>";
    }

    static final String HTML = page(SYL, FIELDS);

    static String oneLevel(String entry) {
        return "{A0:[{u:1,title:\"\",lessons:[{l:1,t:\"x\",g:\"\",w:[" + entry + "]}]}]}";
    }

    @Test
    void levelsComeInCefrOrderWithCountsAndFiveStringEntries() {
        ListenBundle b = ListenHtmlParser.parse(HTML);

        assertThat(b.levels()).extracting(ListenSet::id).containsExactly("A0", "A1");
        ListenSet a0 = b.levels().get(0);
        assertThat(a0.kind()).isEqualTo("level");
        assertThat(a0.name()).isEqualTo("Beginner");
        assertThat(a0.lessons()).isEqualTo(2);
        assertThat(a0.words()).isEqualTo(2);
        assertThat(a0.units().get(0).path("lessons").get(1).path("w")).isEmpty();
        // четыре строки дополняются пустым note
        assertThat(b.levels().get(1).units().get(0).path("lessons").get(0).path("w").get(0)).hasSize(5);
        assertThat(b.levels().get(1).name()).isEqualTo("Elementary");
    }

    @Test
    void fieldTakesIconNameAndGroupFromMetaOrFallsBack() {
        ListenBundle b = ListenHtmlParser.parse(HTML);

        ListenSet business = b.fields().get(0);
        assertThat(business.kind()).isEqualTo("field");
        assertThat(business.icon()).isEqualTo("💼");
        assertThat(business.name()).isEqualTo("Business");
        assertThat(business.ru()).isEqualTo("Бизнес");
        assertThat(business.group()).isEqualTo("Business");
        ListenSet other = b.fields().get(1);
        assertThat(other.icon()).isEqualTo("📘");
        assertThat(other.name()).isEqualTo("Новое");
        assertThat(other.group()).isEqualTo("Other");
        assertThat(b.words()).isEqualTo(5);
        assertThat(b.lessons()).isEqualTo(5);
        assertThat(b.warnings()).isEmpty();
    }

    @Test
    void halfSentenceIsAWarningNotAnError() {
        ListenBundle b = ListenHtmlParser.parse(page(oneLevel("[\"word\",\"слово\",\"A sentence with a word.\",\"\",\"\"]"), "[]"));

        assertThat(b.warnings()).singleElement().asString().contains("A0").contains("предложени");
    }

    @Test
    void wordWithoutLatinLettersRejectsUpload() {
        assertThatThrownBy(() -> ListenHtmlParser.parse(page(oneLevel("[\"123\",\"число\",\"\",\"\",\"\"]"), "[]")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("A0")
                .hasMessageContaining("латинск");
    }

    @Test
    void entryOfWrongShapeRejectsUpload() {
        assertThatThrownBy(() -> ListenHtmlParser.parse(page(oneLevel("[\"only\",\"two\"]"), "[]")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("4–5");
    }

    @Test
    void unknownLevelRejectsUpload() {
        String syl = "{C2:[{u:1,title:\"\",lessons:[{l:1,t:\"x\",g:\"\",w:[]}]}]}";

        assertThatThrownBy(() -> ListenHtmlParser.parse(page(syl, "[]")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("C2");
    }

    @Test
    void badOrDuplicateFieldIdRejectsUpload() {
        String unit = "units:[{u:1,title:\"\",lessons:[{l:1,t:\"x\",g:\"\",w:[]}]}]";
        String bad = "[{id:\"bad id!\",name:\"x\",cat:\"x\"," + unit + "}]";
        String dup = "[{id:\"it\",name:\"x\",cat:\"x\"," + unit + "},{id:\"it\",name:\"y\",cat:\"y\"," + unit + "}]";

        assertThatThrownBy(() -> ListenHtmlParser.parse(page(SYL, bad)))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("bad id!");
        assertThatThrownBy(() -> ListenHtmlParser.parse(page(SYL, dup)))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("it");
    }

    @Test
    void lessonWithoutNumberRejectsUpload() {
        String syl = "{A0:[{u:1,title:\"\",lessons:[{t:\"x\",g:\"\",w:[]}]}]}";

        assertThatThrownBy(() -> ListenHtmlParser.parse(page(syl, "[]")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("A0");
    }

    @Test
    void missingSylNamesTheLiteral() {
        String html = "<script>const FIELDS=[];</script>";

        assertThatThrownBy(() -> ListenHtmlParser.parse(html))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("SYL");
    }

    /** Настоящий прототип (2,7 МБ) в репо не кладём: путь даёт переменная окружения. */
    @Test
    @EnabledIfEnvironmentVariable(named = "LISTEN_PROTOTYPE", matches = ".+")
    void realPrototypeParsesCompletely() throws Exception {
        String html = Files.readString(Path.of(System.getenv("LISTEN_PROTOTYPE")));

        ListenBundle b = ListenHtmlParser.parse(html);

        assertThat(b.levels()).extracting(ListenSet::id).containsExactly("A0", "A1", "A2", "B1", "B2");
        assertThat(b.fields()).hasSize(16);
        assertThat(b.levels().stream().mapToInt(ListenSet::words).sum()).isEqualTo(2873);
        assertThat(b.fields().stream().mapToInt(ListenSet::words).sum()).isEqualTo(8262);
        assertThat(b.lessons()).isEqualTo(658);
        assertThat(b.warnings()).isEmpty();
    }
}
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `./gradlew test --tests '*ListenHtmlParserTest'`
Expected: FAIL — компиляция: нет `ListenHtmlParser`, `ListenBundle`, `ListenSet`.

- [ ] **Step 3: Записи-результаты**

`src/main/java/kz/education/server/modules/listen/service/ListenSet.java`:

```java
package kz.education.server.modules.listen.service;

import com.fasterxml.jackson.databind.node.ArrayNode;

/**
 * Один набор Just Listen It после разбора: уровень A0–B2 ({@code kind = "level"}) или профессиональное направление
 * ({@code "field"}). {@code units} — уже проверенные юниты в форме прототипа, записи по 5 строк.
 */
public record ListenSet(String id, String kind, String name, String ru, String icon, String group,
                        ArrayNode units, int lessons, int words) {

    public static final String LEVEL = "level";
    public static final String FIELD = "field";
}
```

`src/main/java/kz/education/server/modules/listen/service/ListenBundle.java`:

```java
package kz.education.server.modules.listen.service;

import java.util.List;
import java.util.stream.Stream;

/** Всё, что достали из прототипа: уровни, направления и предупреждения для админа. */
public record ListenBundle(List<ListenSet> levels, List<ListenSet> fields, List<String> warnings) {

    public List<ListenSet> all() {
        return Stream.concat(levels.stream(), fields.stream()).toList();
    }

    public int lessons() {
        return all().stream().mapToInt(ListenSet::lessons).sum();
    }

    public int words() {
        return all().stream().mapToInt(ListenSet::words).sum();
    }
}
```

- [ ] **Step 4: Парсер**

`src/main/java/kz/education/server/modules/listen/service/ListenHtmlParser.java`:

```java
package kz.education.server.modules.listen.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import kz.education.server.shared.exception.types.BadRequestException;
import kz.education.server.shared.util.JsLiterals;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Разбор HTML-прототипа Just Listen It (data/jtslisten.html веба): литералы SYL (уровни), FIELDS (направления),
 * FIELD_META (иконка, английское имя, группа) и NAMES. Ошибка формы отклоняет всю загрузку — ученик не должен
 * получить набор, который плеер не сможет показать.
 */
public final class ListenHtmlParser {

    static final List<String> LEVEL_IDS = List.of("A0", "A1", "A2", "B1", "B2");
    static final Pattern SET_ID = Pattern.compile("^[A-Za-z0-9_-]{1,32}$");
    private static final Map<String, String> DEFAULT_NAMES = Map.of(
            "A0", "Beginner", "A1", "Elementary", "A2", "Pre-Intermediate",
            "B1", "Intermediate", "B2", "Upper-Intermediate");
    private static final Pattern LATIN = Pattern.compile("[A-Za-z]");
    private static final String DEFAULT_ICON = "📘";
    private static final int ENTRY_SIZE = 5;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private ListenHtmlParser() {
    }

    public static ListenBundle parse(String html) {
        JsonNode syl = literal(html, "SYL");
        JsonNode fields = literal(html, "FIELDS");
        JsonNode names = declares(html, "NAMES") ? literal(html, "NAMES") : MAPPER.createObjectNode();
        JsonNode meta = declares(html, "FIELD_META") ? literal(html, "FIELD_META") : MAPPER.createObjectNode();
        List<String> warnings = new ArrayList<>();
        List<ListenSet> levels = parseLevels(syl, names, warnings);
        List<ListenSet> fieldSets = parseFields(fields, meta, warnings);
        return new ListenBundle(levels, fieldSets, warnings);
    }

    private static List<ListenSet> parseLevels(JsonNode syl, JsonNode names, List<String> warnings) {
        if (!syl.isObject()) {
            throw new BadRequestException("SYL должен быть объектом {A0: [...], …}");
        }
        syl.fieldNames().forEachRemaining(id -> {
            if (!LEVEL_IDS.contains(id)) {
                throw new BadRequestException("Неизвестный уровень " + id + ": ждём A0, A1, A2, B1, B2");
            }
        });
        List<ListenSet> out = new ArrayList<>();
        for (String id : LEVEL_IDS) {
            JsonNode units = syl.get(id);
            if (units == null) {
                continue;
            }
            String name = names.path(id).asText(DEFAULT_NAMES.get(id));
            out.add(set(id, ListenSet.LEVEL, name, "", "", "", units, warnings));
        }
        return out;
    }

    private static List<ListenSet> parseFields(JsonNode fields, JsonNode meta, List<String> warnings) {
        if (!fields.isArray()) {
            throw new BadRequestException("FIELDS должен быть массивом направлений");
        }
        List<ListenSet> out = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (JsonNode f : fields) {
            String id = f.path("id").asText("");
            if (!SET_ID.matcher(id).matches() || LEVEL_IDS.contains(id)) {
                throw new BadRequestException("Недопустимый id направления «" + id + "»");
            }
            if (!seen.add(id)) {
                throw new BadRequestException("Направление " + id + " встречается дважды");
            }
            String ru = f.path("name").asText(id);
            JsonNode m = meta.path(id);
            String icon = m.isArray() && m.size() > 0 ? m.get(0).asText(DEFAULT_ICON) : DEFAULT_ICON;
            String name = m.isArray() && m.size() > 1 ? m.get(1).asText(ru) : ru;
            String group = m.isArray() && m.size() > 2 ? m.get(2).asText("") : f.path("cat").asText("");
            out.add(set(id, ListenSet.FIELD, name, ru, icon, group, f.get("units"), warnings));
        }
        return out;
    }

    private static ListenSet set(String id, String kind, String name, String ru, String icon, String group,
                                 JsonNode units, List<String> warnings) {
        if (units == null || !units.isArray() || units.isEmpty()) {
            throw new BadRequestException(id + ": нет юнитов");
        }
        ArrayNode clean = MAPPER.createArrayNode();
        int[] counts = new int[2]; // уроки, записи
        for (JsonNode unit : units) {
            clean.add(unit(id, unit, counts, warnings));
        }
        return new ListenSet(id, kind, name, ru, icon, group, clean, counts[0], counts[1]);
    }

    private static ObjectNode unit(String setId, JsonNode unit, int[] counts, List<String> warnings) {
        if (!unit.path("u").canConvertToInt() || !unit.path("lessons").isArray()) {
            throw new BadRequestException(setId + ": у юнита нет номера u или списка уроков");
        }
        ObjectNode out = MAPPER.createObjectNode();
        int u = unit.path("u").asInt();
        out.put("u", u);
        out.put("title", unit.path("title").asText(""));
        ArrayNode lessons = out.putArray("lessons");
        for (JsonNode lesson : unit.get("lessons")) {
            lessons.add(lesson(setId + ", юнит " + u, lesson, counts, warnings));
        }
        return out;
    }

    private static ObjectNode lesson(String where, JsonNode lesson, int[] counts, List<String> warnings) {
        if (!lesson.path("l").canConvertToInt() || !lesson.path("t").isTextual() || !lesson.path("w").isArray()) {
            throw new BadRequestException(where + ": у урока нет номера l, названия t или списка слов w");
        }
        ObjectNode out = MAPPER.createObjectNode();
        int l = lesson.path("l").asInt();
        out.put("l", l);
        out.put("t", lesson.path("t").asText());
        out.put("g", lesson.path("g").asText(""));
        ArrayNode words = out.putArray("w");
        int i = 0;
        for (JsonNode entry : lesson.get("w")) {
            words.add(entry(where + ", урок " + l + ", запись " + (++i), entry, warnings));
        }
        counts[0]++;
        counts[1] += i;
        return out;
    }

    private static ArrayNode entry(String where, JsonNode entry, List<String> warnings) {
        if (!entry.isArray() || entry.size() < ENTRY_SIZE - 1 || entry.size() > ENTRY_SIZE) {
            throw new BadRequestException(where + ": запись должна быть массивом из 4–5 строк");
        }
        ArrayNode out = MAPPER.createArrayNode();
        for (int k = 0; k < ENTRY_SIZE; k++) {
            JsonNode v = entry.get(k);
            if (v != null && !v.isTextual()) {
                throw new BadRequestException(where + ": в записи не строка");
            }
            out.add(v == null ? "" : v.asText());
        }
        if (!LATIN.matcher(out.get(0).asText()).find()) {
            throw new BadRequestException(where + ": в слове «" + out.get(0).asText()
                    + "» нет латинских букв — его не набрать в ячейки");
        }
        boolean hasEn = !out.get(2).asText().isBlank();
        boolean hasRu = !out.get(3).asText().isBlank();
        if (hasEn != hasRu) {
            warnings.add(where + ": есть только одно из предложений — шаг 2 станет «составь своё предложение»");
        }
        return out;
    }

    private static JsonNode literal(String html, String name) {
        String js = JsLiterals.extract(html, name);
        try {
            return MAPPER.readTree(JsLiterals.jsToJson(js));
        } catch (Exception e) {
            throw new BadRequestException("Не удалось разобрать " + name + ": " + e.getMessage());
        }
    }

    private static boolean declares(String html, String name) {
        return Pattern.compile("\\b(?:var|let|const)\\s+" + Pattern.quote(name) + "\\s*=").matcher(html).find();
    }
}
```

- [ ] **Step 5: Прогнать тесты**

Run: `./gradlew test --tests '*ListenHtmlParserTest'`
Expected: PASS (9 тестов; `realPrototypeParsesCompletely` — SKIPPED без переменной).

- [ ] **Step 6: Прогнать на настоящем прототипе**

Run (Git Bash): `LISTEN_PROTOTYPE=/c/Users/nural/Desktop/jts-web-app/data/jtslisten.html ./gradlew test --tests '*ListenHtmlParserTest.realPrototypeParsesCompletely'`
Expected: PASS — 5 уровней, 16 направлений, 2873 + 8262 записи, 658 уроков, без предупреждений.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/kz/education/server/modules/listen/service src/test/java/kz/education/server/modules/listen/service/ListenHtmlParserTest.java
git commit -m "feat(listen): разбор и проверка HTML-прототипа Just Listen It

SYL/FIELDS/FIELD_META → наборы по 5 строк в записи. Ошибка формы отклоняет
загрузку целиком: ученик не должен получить набор, который плеер не покажет.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Хранилище `ListenStorageService`

Те же операции, что у хранилища словаря, но под `listen/current/` и только JSON: картинок и публичных ссылок у раздела нет — тело отдаёт бэкенд.

**Files:**
- Create: `src/main/java/kz/education/server/modules/listen/service/ListenStorageService.java`
- Test: `src/test/java/kz/education/server/modules/listen/service/ListenStorageLocalTest.java`

**Interfaces:**
- Produces: `String objectKey(String relPath)` → `"listen/current/" + relPath`; `void putJson(String relPath, String json)`; `byte[] getBytes(String relPath)` (нет файла → `null`); `Set<String> listKeys()`; `void removeStale(Set<String> keepKeys)`. Настройки: `listen.storage` (`minio`|`local`), `listen.dir`.

- [ ] **Step 1: Написать падающий тест**

`src/test/java/kz/education/server/modules/listen/service/ListenStorageLocalTest.java`:

```java
package kz.education.server.modules.listen.service;

import kz.education.server.shared.exception.types.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Just Listen It на диске (listen.storage=local): те же ключи, что в бакете, без MinIO. */
class ListenStorageLocalTest {

    @TempDir
    Path dir;

    private ListenStorageService storage;

    @BeforeEach
    void setUp() {
        storage = new ListenStorageService(null);
        ReflectionTestUtils.setField(storage, "mode", "local");
        ReflectionTestUtils.setField(storage, "localDir", dir.toString());
    }

    @Test
    void writesReadsAndListsUnderBucketKeys() {
        storage.putJson("index.json", "{\"levels\":[]}");
        storage.putJson("sets/A1.json", "{}");

        assertThat(new String(storage.getBytes("index.json"), StandardCharsets.UTF_8)).isEqualTo("{\"levels\":[]}");
        assertThat(storage.listKeys()).containsExactlyInAnyOrder("listen/current/index.json", "listen/current/sets/A1.json");
        assertThat(storage.getBytes("sets/B2.json")).isNull();
    }

    @Test
    void removeStaleDropsSetsMissingFromTheNewRelease() {
        storage.putJson("sets/A1.json", "{}");
        storage.putJson("sets/old.json", "{}");

        storage.removeStale(Set.of(storage.objectKey("sets/A1.json")));

        assertThat(Files.exists(dir.resolve("sets/A1.json"))).isTrue();
        assertThat(Files.exists(dir.resolve("sets/old.json"))).isFalse();
    }

    @Test
    void pathEscapeIsRejected() {
        assertThatThrownBy(() -> storage.putJson("../evil.json", "{}")).isInstanceOf(BadRequestException.class);
    }
}
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `./gradlew test --tests '*ListenStorageLocalTest'`
Expected: FAIL — нет класса `ListenStorageService`.

- [ ] **Step 3: Реализация**

`src/main/java/kz/education/server/modules/listen/service/ListenStorageService.java`:

```java
package kz.education.server.modules.listen.service;

import io.minio.GetObjectArgs;
import io.minio.ListObjectsArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.Result;
import io.minio.messages.Item;
import kz.education.server.shared.exception.types.BadRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Stream;

/**
 * JSON-файлы Just Listen It под {@code listen/current/…} общего бакета. Ссылок наружу нет: у бакета нет CORS, тело
 * отдаёт бэкенд. {@code listen.storage=local} — те же пути в папке {@code listen.dir}, только для разработки.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ListenStorageService {

    static final String PREFIX = "listen/current/";
    private static final String JSON = "application/json; charset=utf-8";

    private final MinioClient minioClient;

    @Value("${s3.bucket:}")
    private String bucket;

    @Value("${listen.storage:minio}")
    private String mode = "minio";

    @Value("${listen.dir:.local/listen}")
    private String localDir = ".local/listen";

    public String objectKey(String relPath) {
        return PREFIX + safeRelPath(relPath);
    }

    public void putJson(String relPath, String json) {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        if (isLocal()) {
            writeLocal(relPath, bytes);
            return;
        }
        try {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectKey(relPath))
                    .contentType(JSON)
                    .stream(new ByteArrayInputStream(bytes), bytes.length, -1)
                    .build());
        } catch (Exception e) {
            log.error("Cannot store listen file {}", relPath, e);
            throw new BadRequestException("Не удалось сохранить файл Just Listen It: " + relPath);
        }
    }

    /** Нет файла (ещё не загружали или сбой хранилища) — null: решает вызывающий. */
    public byte[] getBytes(String relPath) {
        if (isLocal()) {
            try {
                Path file = localFile(relPath);
                return Files.isRegularFile(file) ? Files.readAllBytes(file) : null;
            } catch (IOException | BadRequestException e) {
                return null;
            }
        }
        try (InputStream in = minioClient.getObject(
                GetObjectArgs.builder().bucket(bucket).object(objectKey(relPath)).build())) {
            return in.readAllBytes();
        } catch (Exception e) {
            return null;
        }
    }

    public Set<String> listKeys() {
        return isLocal() ? listLocal() : listBucket();
    }

    public void removeStale(Set<String> keepKeys) {
        Set<String> stale = listKeys();
        stale.removeAll(keepKeys);
        for (String key : stale) {
            try {
                if (isLocal()) {
                    Files.deleteIfExists(localFile(key.substring(PREFIX.length())));
                } else {
                    minioClient.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(key).build());
                }
            } catch (Exception e) {
                log.warn("Cannot remove stale listen file {}", key, e);
            }
        }
    }

    private boolean isLocal() {
        return "local".equalsIgnoreCase(mode);
    }

    private void writeLocal(String relPath, byte[] bytes) {
        try {
            Path target = localFile(relPath);
            Files.createDirectories(target.getParent());
            // через временный файл: оборванная запись не оставляет полфайла под настоящим именем
            Path tmp = Files.createTempFile(target.getParent(), "upload-", ".tmp");
            try {
                Files.write(tmp, bytes);
                Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } finally {
                Files.deleteIfExists(tmp);
            }
        } catch (IOException e) {
            log.error("Cannot store local listen file {}", relPath, e);
            throw new BadRequestException("Не удалось сохранить файл Just Listen It: " + relPath);
        }
    }

    private Set<String> listLocal() {
        Set<String> keys = new LinkedHashSet<>();
        Path root = Path.of(localDir).toAbsolutePath().normalize();
        if (!Files.isDirectory(root)) {
            return keys;
        }
        try (Stream<Path> files = Files.walk(root)) {
            files.filter(Files::isRegularFile)
                    .filter(p -> !p.getFileName().toString().endsWith(".tmp"))
                    .map(p -> PREFIX + root.relativize(p).toString().replace('\\', '/'))
                    .forEach(keys::add);
        } catch (IOException e) {
            throw new BadRequestException("Не удалось прочитать файлы Just Listen It");
        }
        return keys;
    }

    private Set<String> listBucket() {
        Set<String> keys = new LinkedHashSet<>();
        try {
            Iterable<Result<Item>> results = minioClient.listObjects(ListObjectsArgs.builder()
                    .bucket(bucket).prefix(PREFIX).recursive(true).build());
            for (Result<Item> result : results) {
                keys.add(result.get().objectName());
            }
        } catch (Exception e) {
            log.error("Cannot list listen objects", e);
            throw new BadRequestException("Не удалось прочитать файлы Just Listen It");
        }
        return keys;
    }

    private Path localFile(String relPath) {
        Path root = Path.of(localDir).toAbsolutePath().normalize();
        Path file = root.resolve(safeRelPath(relPath)).normalize();
        if (!file.startsWith(root)) {
            throw new BadRequestException("Недопустимый путь: " + relPath);
        }
        return file;
    }

    private String safeRelPath(String relPath) {
        String cleaned = (relPath == null ? "" : relPath).replace('\\', '/').replaceFirst("^/+", "");
        if (cleaned.isBlank() || Stream.of(cleaned.split("/")).anyMatch(".."::equals)) {
            throw new BadRequestException("Недопустимый путь: " + relPath);
        }
        return cleaned;
    }
}
```

- [ ] **Step 4: Прогнать тест**

Run: `./gradlew test --tests '*ListenStorageLocalTest'`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add src/main/java/kz/education/server/modules/listen/service/ListenStorageService.java src/test/java/kz/education/server/modules/listen/service/ListenStorageLocalTest.java
git commit -m "feat(listen): хранилище наборов под listen/current/ (MinIO или диск)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Релизы, загрузка и чтение (`ListenUploadService`, `ListenCatalogService`)

**Files:**
- Create: `src/main/resources/db/migration/V387__Create_listen_releases.sql`
- Create: `src/main/java/kz/education/server/modules/listen/model/ListenRelease.java`
- Create: `src/main/java/kz/education/server/modules/listen/repository/ListenReleaseRepository.java`
- Create: `src/main/java/kz/education/server/presentation/admin/listen/dto/ListenReleaseResponse.java`
- Create: `src/main/java/kz/education/server/presentation/admin/listen/dto/ListenUploadResponse.java`
- Create: `src/main/java/kz/education/server/modules/listen/service/ListenUploadService.java`
- Create: `src/main/java/kz/education/server/modules/listen/service/ListenCatalogService.java`
- Test: `src/test/java/kz/education/server/modules/listen/service/ListenUploadServiceTest.java`
- Test: `src/test/java/kz/education/server/modules/listen/service/ListenCatalogServiceTest.java`

**Interfaces:**
- Consumes: `ListenHtmlParser.parse`, `ListenBundle`, `ListenSet` (Task 2); `ListenStorageService` (Task 3).
- Produces:
  - `public record ListenReleaseResponse(Long id, String fileName, int levelsCount, int fieldsCount, int lessonsCount, int wordsCount, LocalDateTime createdAt)` + `static ListenReleaseResponse of(ListenRelease r)`.
  - `public record ListenUploadResponse(ListenReleaseResponse release, List<SetCount> sets, List<String> warnings)`, вложенный `public record SetCount(String id, int words)`.
  - `ListenUploadResponse ListenUploadService.upload(byte[] html, String fileName, Long uploadedBy)`.
  - `JsonNode ListenCatalogService.readIndex()`, `JsonNode readSet(String id)` (404 — `ResourceNotFoundException`), `void clearCache()`, `Optional<ListenReleaseResponse> latest()`, `List<ListenReleaseResponse> history()`.
  - Формат файлов: `index.json` = `{release, uploadedAt, levels:[{id,name,units,lessons,words}], fields:[{id,name,ru,icon,group,premium:true,units,lessons,words}]}`; `sets/<id>.json` = `{id, kind, name, ru?, icon?, group?, units}`.

- [ ] **Step 1: Написать падающие тесты загрузки**

`src/test/java/kz/education/server/modules/listen/service/ListenUploadServiceTest.java`:

```java
package kz.education.server.modules.listen.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kz.education.server.modules.listen.model.ListenRelease;
import kz.education.server.modules.listen.repository.ListenReleaseRepository;
import kz.education.server.presentation.admin.listen.dto.ListenUploadResponse;
import kz.education.server.shared.exception.types.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

import java.nio.charset.StandardCharsets;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ListenUploadServiceTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private ListenStorageService storage;
    private ListenReleaseRepository releases;
    private ListenUploadService upload;

    @BeforeEach
    void setUp() {
        storage = mock(ListenStorageService.class);
        releases = mock(ListenReleaseRepository.class);
        upload = new ListenUploadService(storage, releases, mapper);
        when(storage.objectKey(anyString())).thenAnswer(c -> "listen/current/" + c.getArgument(0));
        when(releases.save(any())).thenAnswer(c -> {
            ListenRelease r = c.getArgument(0);
            r.setId(12L);
            return r;
        });
    }

    private byte[] html() {
        return ListenHtmlParserTest.HTML.getBytes(StandardCharsets.UTF_8);
    }

    @Test
    void writesEverySetThenIndexThenDropsStaleFiles() throws Exception {
        var response = upload.upload(html(), "jts_just_listen_it.html", 3L);

        InOrder order = inOrder(storage);
        order.verify(storage).putJson(eq("sets/A0.json"), anyString());
        order.verify(storage).putJson(eq("sets/A1.json"), anyString());
        order.verify(storage).putJson(eq("sets/business.json"), anyString());
        order.verify(storage).putJson(eq("sets/newfield.json"), anyString());
        order.verify(storage).putJson(eq("index.json"), anyString());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Set<String>> keep = ArgumentCaptor.forClass(Set.class);
        order.verify(storage).removeStale(keep.capture());
        assertThat(keep.getValue()).contains("listen/current/index.json", "listen/current/sets/A0.json");

        assertThat(response.release().id()).isEqualTo(12L);
        assertThat(response.release().levelsCount()).isEqualTo(2);
        assertThat(response.release().fieldsCount()).isEqualTo(2);
        assertThat(response.release().wordsCount()).isEqualTo(5);
        assertThat(response.sets()).extracting(ListenUploadResponse.SetCount::id)
                .containsExactly("A0", "A1", "business", "newfield");
    }

    @Test
    void indexListsLevelsAndPremiumFieldsWithoutWords() throws Exception {
        upload.upload(html(), "x.html", 3L);

        ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
        verify(storage).putJson(eq("index.json"), json.capture());
        JsonNode index = mapper.readTree(json.getValue());
        assertThat(index.path("release").asLong()).isEqualTo(12L);
        assertThat(index.path("levels").get(0).path("id").asText()).isEqualTo("A0");
        assertThat(index.path("levels").get(0).path("words").asInt()).isEqualTo(2);
        assertThat(index.path("levels").get(0).has("units")).isTrue();
        assertThat(index.path("levels").get(0).path("units").isInt()).isTrue();
        JsonNode business = index.path("fields").get(0);
        assertThat(business.path("icon").asText()).isEqualTo("💼");
        assertThat(business.path("premium").asBoolean()).isTrue();
    }

    @Test
    void setFileCarriesUnitsInPrototypeShape() throws Exception {
        upload.upload(html(), "x.html", 3L);

        ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
        verify(storage).putJson(eq("sets/A0.json"), json.capture());
        JsonNode set = mapper.readTree(json.getValue());
        assertThat(set.path("kind").asText()).isEqualTo("level");
        assertThat(set.path("units").get(0).path("lessons").get(0).path("w").get(0).get(0).asText()).isEqualTo("mother");
    }

    @Test
    void brokenFileWritesNothing() {
        byte[] broken = "<script>const SYL={C9:[]};const FIELDS=[];</script>".getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> upload.upload(broken, "x.html", 3L)).isInstanceOf(BadRequestException.class);
        verify(storage, never()).putJson(anyString(), anyString());
        verify(releases, never()).save(any());
    }

    @Test
    void emptyFileIsRejected() {
        assertThatThrownBy(() -> upload.upload(new byte[0], "x.html", 3L)).isInstanceOf(BadRequestException.class);
    }
}
```

- [ ] **Step 2: Написать падающие тесты чтения**

`src/test/java/kz/education/server/modules/listen/service/ListenCatalogServiceTest.java`:

```java
package kz.education.server.modules.listen.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import kz.education.server.modules.listen.repository.ListenReleaseRepository;
import kz.education.server.shared.exception.types.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ListenCatalogServiceTest {

    private ListenStorageService storage;
    private ListenCatalogService service;

    @BeforeEach
    void setUp() {
        storage = mock(ListenStorageService.class);
        service = new ListenCatalogService(storage, mock(ListenReleaseRepository.class), new ObjectMapper());
    }

    private static byte[] json(String s) {
        return s.getBytes(StandardCharsets.UTF_8);
    }

    @Test
    void readSetCachesUntilCleared() {
        when(storage.getBytes("sets/A1.json")).thenReturn(json("{\"id\":\"A1\",\"units\":[]}"));

        var first = service.readSet("A1");
        var second = service.readSet("A1");
        service.clearCache();
        service.readSet("A1");

        assertThat(first.path("id").asText()).isEqualTo("A1");
        assertThat(second).isSameAs(first);
        verify(storage, times(2)).getBytes("sets/A1.json");
    }

    @Test
    void notUploadedIndexIsNotFound() {
        assertThatThrownBy(() -> service.readIndex()).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void unsafeSetIdIsNotFoundWithoutTouchingStorage() {
        assertThatThrownBy(() -> service.readSet("../index")).isInstanceOf(ResourceNotFoundException.class);
        verify(storage, never()).getBytes(anyString());
    }
}
```

- [ ] **Step 3: Убедиться, что тесты падают**

Run: `./gradlew test --tests '*ListenUploadServiceTest' --tests '*ListenCatalogServiceTest'`
Expected: FAIL — компиляция: нет `ListenUploadService`, `ListenCatalogService`, `ListenRelease`, `ListenReleaseRepository`.

- [ ] **Step 4: Миграция, сущность, репозиторий**

`src/main/resources/db/migration/V387__Create_listen_releases.sql`:

```sql
-- Just Listen It (диктант слова и предложения в «Практике»): материал — HTML-прототип, который админ загружает
-- целиком. Наборы (уровни A0–B2 и профессиональные направления) лежат JSON-файлами в MinIO (listen/current/);
-- здесь только мета загрузок. Существующих данных нет.
CREATE TABLE listen_releases (
    id BIGSERIAL PRIMARY KEY,
    file_name VARCHAR(512) NOT NULL,
    levels_count INT NOT NULL DEFAULT 0,
    fields_count INT NOT NULL DEFAULT 0,
    lessons_count INT NOT NULL DEFAULT 0,
    words_count INT NOT NULL DEFAULT 0,
    uploaded_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_listen_releases_created ON listen_releases (created_at DESC);
```

`src/main/java/kz/education/server/modules/listen/model/ListenRelease.java`:

```java
package kz.education.server.modules.listen.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/** Одна загрузка HTML-прототипа Just Listen It. Сами наборы — в MinIO. */
@Entity
@Data
@Table(name = "listen_releases")
public class ListenRelease {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_name", nullable = false, length = 512)
    private String fileName;

    @Column(name = "levels_count", nullable = false)
    private int levelsCount;

    @Column(name = "fields_count", nullable = false)
    private int fieldsCount;

    @Column(name = "lessons_count", nullable = false)
    private int lessonsCount;

    @Column(name = "words_count", nullable = false)
    private int wordsCount;

    @Column(name = "uploaded_by")
    private Long uploadedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
```

`src/main/java/kz/education/server/modules/listen/repository/ListenReleaseRepository.java`:

```java
package kz.education.server.modules.listen.repository;

import kz.education.server.modules.listen.model.ListenRelease;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ListenReleaseRepository extends JpaRepository<ListenRelease, Long> {

    Optional<ListenRelease> findTopByOrderByCreatedAtDesc();

    List<ListenRelease> findTop20ByOrderByCreatedAtDesc();
}
```

- [ ] **Step 5: DTO ответа**

`src/main/java/kz/education/server/presentation/admin/listen/dto/ListenReleaseResponse.java`:

```java
package kz.education.server.presentation.admin.listen.dto;

import kz.education.server.modules.listen.model.ListenRelease;

import java.time.LocalDateTime;

public record ListenReleaseResponse(Long id, String fileName, int levelsCount, int fieldsCount,
                                    int lessonsCount, int wordsCount, LocalDateTime createdAt) {

    public static ListenReleaseResponse of(ListenRelease r) {
        return new ListenReleaseResponse(r.getId(), r.getFileName(), r.getLevelsCount(), r.getFieldsCount(),
                r.getLessonsCount(), r.getWordsCount(), r.getCreatedAt());
    }
}
```

`src/main/java/kz/education/server/presentation/admin/listen/dto/ListenUploadResponse.java`:

```java
package kz.education.server.presentation.admin.listen.dto;

import java.util.List;

/** Итог загрузки для админа: релиз, слов в каждом наборе и предупреждения разбора. */
public record ListenUploadResponse(ListenReleaseResponse release, List<SetCount> sets, List<String> warnings) {

    public record SetCount(String id, int words) {
    }
}
```

- [ ] **Step 6: Сервис загрузки**

`src/main/java/kz/education/server/modules/listen/service/ListenUploadService.java`:

```java
package kz.education.server.modules.listen.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import kz.education.server.modules.listen.model.ListenRelease;
import kz.education.server.modules.listen.repository.ListenReleaseRepository;
import kz.education.server.presentation.admin.listen.dto.ListenReleaseResponse;
import kz.education.server.presentation.admin.listen.dto.ListenUploadResponse;
import kz.education.server.shared.exception.types.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Загрузка прототипа: разбор → наборы → оглавление → уборка старых наборов. Оглавление пишется последним, чтобы
 * ученик не получил ссылку на недописанный набор; сбой хранилища откатывает запись релиза.
 */
@Service
@RequiredArgsConstructor
public class ListenUploadService {

    private static final String DEFAULT_FILE_NAME = "jts-just-listen-it.html";

    private final ListenStorageService storage;
    private final ListenReleaseRepository releases;
    private final ObjectMapper objectMapper;

    @Transactional
    public ListenUploadResponse upload(byte[] htmlBytes, String fileName, Long uploadedBy) {
        if (htmlBytes == null || htmlBytes.length == 0) {
            throw new BadRequestException("Пустой файл Just Listen It");
        }
        ListenBundle bundle = ListenHtmlParser.parse(new String(htmlBytes, StandardCharsets.UTF_8));
        ListenRelease release = releases.save(newRelease(bundle, fileName, uploadedBy));

        Set<String> keep = new LinkedHashSet<>();
        for (ListenSet set : bundle.all()) {
            String rel = "sets/" + set.id() + ".json";
            storage.putJson(rel, write(setJson(set)));
            keep.add(storage.objectKey(rel));
        }
        storage.putJson("index.json", write(indexJson(bundle, release)));
        keep.add(storage.objectKey("index.json"));
        storage.removeStale(keep);

        List<ListenUploadResponse.SetCount> sets = bundle.all().stream()
                .map(s -> new ListenUploadResponse.SetCount(s.id(), s.words()))
                .toList();
        return new ListenUploadResponse(ListenReleaseResponse.of(release), sets, bundle.warnings());
    }

    private ListenRelease newRelease(ListenBundle bundle, String fileName, Long uploadedBy) {
        ListenRelease r = new ListenRelease();
        r.setFileName(fileName == null || fileName.isBlank() ? DEFAULT_FILE_NAME : fileName);
        r.setLevelsCount(bundle.levels().size());
        r.setFieldsCount(bundle.fields().size());
        r.setLessonsCount(bundle.lessons());
        r.setWordsCount(bundle.words());
        r.setUploadedBy(uploadedBy);
        return r;
    }

    private ObjectNode setJson(ListenSet set) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("id", set.id());
        node.put("kind", set.kind());
        node.put("name", set.name());
        if (ListenSet.FIELD.equals(set.kind())) {
            node.put("ru", set.ru());
            node.put("icon", set.icon());
            node.put("group", set.group());
        }
        node.set("units", set.units());
        return node;
    }

    private ObjectNode indexJson(ListenBundle bundle, ListenRelease release) {
        ObjectNode index = objectMapper.createObjectNode();
        index.put("release", release.getId());
        LocalDateTime at = release.getCreatedAt() == null ? LocalDateTime.now() : release.getCreatedAt();
        index.put("uploadedAt", at.toString());
        ArrayNode levels = index.putArray("levels");
        bundle.levels().forEach(s -> levels.add(summary(s)));
        ArrayNode fields = index.putArray("fields");
        bundle.fields().forEach(s -> fields.add(summary(s)
                .put("ru", s.ru())
                .put("icon", s.icon())
                .put("group", s.group())
                // Premium пока не проверяется (решение 21.10.2026), флаг — чтобы клиенту не менять разметку потом.
                .put("premium", true)));
        return index;
    }

    private ObjectNode summary(ListenSet s) {
        ObjectNode n = objectMapper.createObjectNode();
        n.put("id", s.id());
        n.put("name", s.name());
        n.put("units", s.units().size());
        n.put("lessons", s.lessons());
        n.put("words", s.words());
        return n;
    }

    private String write(ObjectNode node) {
        try {
            return objectMapper.writeValueAsString(node);
        } catch (Exception e) {
            throw new BadRequestException("Не удалось сериализовать Just Listen It");
        }
    }
}
```

- [ ] **Step 7: Сервис чтения**

`src/main/java/kz/education/server/modules/listen/service/ListenCatalogService.java`:

```java
package kz.education.server.modules.listen.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kz.education.server.modules.listen.repository.ListenReleaseRepository;
import kz.education.server.presentation.admin.listen.dto.ListenReleaseResponse;
import kz.education.server.shared.exception.types.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Оглавление и наборы Just Listen It для ученика. Копия JSON из хранилища держится в памяти до следующей загрузки:
 * иначе каждый заход в раздел — поход в MinIO.
 */
@Service
@RequiredArgsConstructor
public class ListenCatalogService {

    private static final String NOT_UPLOADED = "Just Listen It ещё не загружен";

    private final ListenStorageService storage;
    private final ListenReleaseRepository releases;
    private final ObjectMapper objectMapper;

    private final ConcurrentHashMap<String, JsonNode> cache = new ConcurrentHashMap<>();

    public JsonNode readIndex() {
        return read("index.json", NOT_UPLOADED);
    }

    /** Точка будущей проверки Premium для направлений (kind = "field"). */
    public JsonNode readSet(String id) {
        if (id == null || !ListenHtmlParser.SET_ID.matcher(id).matches()) {
            throw new ResourceNotFoundException("Нет такого набора");
        }
        return read("sets/" + id + ".json", "Нет такого набора");
    }

    public void clearCache() {
        cache.clear();
    }

    @Transactional(readOnly = true)
    public Optional<ListenReleaseResponse> latest() {
        return releases.findTopByOrderByCreatedAtDesc().map(ListenReleaseResponse::of);
    }

    @Transactional(readOnly = true)
    public List<ListenReleaseResponse> history() {
        return releases.findTop20ByOrderByCreatedAtDesc().stream().map(ListenReleaseResponse::of).toList();
    }

    private JsonNode read(String relPath, String missing) {
        JsonNode cached = cache.get(relPath);
        if (cached != null) {
            return cached;
        }
        byte[] bytes = storage.getBytes(relPath);
        if (bytes == null || bytes.length == 0) {
            throw new ResourceNotFoundException(missing);
        }
        try {
            JsonNode node = objectMapper.readTree(new String(bytes, StandardCharsets.UTF_8));
            cache.put(relPath, node);
            return node;
        } catch (Exception e) {
            throw new ResourceNotFoundException("Не удалось прочитать " + relPath);
        }
    }
}
```

- [ ] **Step 8: Прогнать тесты**

Run: `./gradlew test --tests '*ListenUploadServiceTest' --tests '*ListenCatalogServiceTest'`
Expected: PASS (5 + 3).

- [ ] **Step 9: Проверить номер миграции**

```bash
git fetch origin
bash scripts/check-migrations.sh --base origin/develop
```
Expected: зелёный вывод. Если V387 уже занят в `origin/develop` — `git mv` на следующий свободный номер и повторить.

- [ ] **Step 10: Commit**

```bash
git add src/main/resources/db/migration/V387__Create_listen_releases.sql src/main/java/kz/education/server/modules/listen src/main/java/kz/education/server/presentation/admin/listen/dto src/test/java/kz/education/server/modules/listen/service
git commit -m "feat(listen): загрузка прототипа в хранилище и чтение наборов

listen_releases (V387) — мета загрузок; наборы и оглавление — JSON в
listen/current/. Оглавление пишется последним, сбой хранилища откатывает
релиз. Чтение кэшируется до следующей загрузки.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Контроллеры `/admin/listen` и `/mobile/listen`

**Files:**
- Create: `src/main/java/kz/education/server/presentation/admin/listen/controller/AdminListenController.java`
- Create: `src/main/java/kz/education/server/presentation/mobile/listen/controller/MobileListenController.java`
- Test: `src/test/java/kz/education/server/presentation/listen/ListenControllersTest.java`

**Interfaces:**
- Consumes: `ListenUploadService.upload`, `ListenCatalogService.{readIndex, readSet, clearCache, latest, history}` (Task 4), `SecurityUtils.userId()`.
- Produces (HTTP, для web-admin и веба):
  - `GET /admin/listen` → `{release: ListenReleaseResponse|null, history: ListenReleaseResponse[], index: {...}|{}}` (ADMIN).
  - `POST /admin/listen/upload` multipart `file` (`.html`/`.htm`) → `ListenUploadResponse` (ADMIN). Ошибка — 400 с `messages[0]`.
  - `GET /mobile/listen` → оглавление; до первой загрузки 404.
  - `GET /mobile/listen/sets/{id}` → набор; неизвестный id 404.

- [ ] **Step 1: Написать падающие тесты**

`src/test/java/kz/education/server/presentation/listen/ListenControllersTest.java`:

```java
package kz.education.server.presentation.listen;

import com.fasterxml.jackson.databind.ObjectMapper;
import kz.education.server.modules.listen.service.ListenCatalogService;
import kz.education.server.modules.listen.service.ListenUploadService;
import kz.education.server.presentation.admin.listen.controller.AdminListenController;
import kz.education.server.presentation.admin.listen.dto.ListenReleaseResponse;
import kz.education.server.presentation.admin.listen.dto.ListenUploadResponse;
import kz.education.server.presentation.mobile.listen.controller.MobileListenController;
import kz.education.server.shared.exception.types.BadRequestException;
import kz.education.server.shared.exception.types.ResourceNotFoundException;
import kz.education.server.shared.security.SecurityUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ListenControllersTest {

    private ListenUploadService uploadService;
    private ListenCatalogService catalog;
    private SecurityUtils security;
    private AdminListenController admin;

    @BeforeEach
    void setUp() {
        uploadService = mock(ListenUploadService.class);
        catalog = mock(ListenCatalogService.class);
        security = mock(SecurityUtils.class);
        admin = new AdminListenController(uploadService, catalog, security, new ObjectMapper());
    }

    @Test
    void adminEndpointsAreAdminOnly() {
        PreAuthorize rule = AdminListenController.class.getAnnotation(PreAuthorize.class);
        assertThat(rule).isNotNull();
        assertThat(rule.value()).isEqualTo("hasRole('ADMIN')");
    }

    @Test
    void uploadPassesUserAndClearsCacheAfterwards() throws Exception {
        when(security.userId()).thenReturn(7L);
        var release = new ListenReleaseResponse(1L, "a.html", 5, 16, 658, 11135, null);
        when(uploadService.upload(any(), eq("a.html"), eq(7L)))
                .thenReturn(new ListenUploadResponse(release, List.of(), List.of()));

        var body = admin.upload(new MockMultipartFile("file", "a.html", "text/html", new byte[]{1}));

        assertThat(body.release().wordsCount()).isEqualTo(11135);
        InOrder order = inOrder(uploadService, catalog);
        order.verify(uploadService).upload(any(), eq("a.html"), eq(7L));
        order.verify(catalog).clearCache();
    }

    @Test
    void nonHtmlFileIsRejectedBeforeParsing() {
        var file = new MockMultipartFile("file", "a.json", "application/json", new byte[]{1});

        assertThatThrownBy(() -> admin.upload(file)).isInstanceOf(BadRequestException.class);
        verify(uploadService, never()).upload(any(), any(), any());
    }

    @Test
    void latestWithoutUploadsHasEmptyIndex() {
        when(catalog.latest()).thenReturn(Optional.empty());
        when(catalog.history()).thenReturn(List.of());

        var body = admin.latest();

        assertThat(body.get("release")).isNull();
        assertThat(body.get("history")).isEqualTo(List.of());
        assertThat(body.get("index").toString()).isEqualTo("{}");
    }

    @Test
    void mobileReturnsIndexAndSetFromCatalog() {
        var mobile = new MobileListenController(catalog);
        var index = new ObjectMapper().createObjectNode().put("release", 1);
        when(catalog.readIndex()).thenReturn(index);
        when(catalog.readSet("A1")).thenThrow(new ResourceNotFoundException("Нет такого набора"));

        assertThat(mobile.index()).isSameAs(index);
        assertThatThrownBy(() -> mobile.set("A1")).isInstanceOf(ResourceNotFoundException.class);
    }
}
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `./gradlew test --tests '*ListenControllersTest'`
Expected: FAIL — нет классов контроллеров.

- [ ] **Step 3: Админ-контроллер**

`src/main/java/kz/education/server/presentation/admin/listen/controller/AdminListenController.java`:

```java
package kz.education.server.presentation.admin.listen.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import kz.education.server.modules.listen.service.ListenCatalogService;
import kz.education.server.modules.listen.service.ListenUploadService;
import kz.education.server.presentation.admin.listen.dto.ListenReleaseResponse;
import kz.education.server.presentation.admin.listen.dto.ListenUploadResponse;
import kz.education.server.shared.exception.types.BadRequestException;
import kz.education.server.shared.exception.types.ResourceNotFoundException;
import kz.education.server.shared.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/admin/listen")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin Just Listen It", description = "Upload the Just Listen It prototype HTML")
public class AdminListenController {

    private final ListenUploadService uploadService;
    private final ListenCatalogService catalogService;
    private final SecurityUtils securityUtils;
    private final ObjectMapper objectMapper;

    @GetMapping
    @Operation(summary = "Current release, last 20 uploads and the live index")
    public Map<String, Object> latest() {
        Map<String, Object> body = new LinkedHashMap<>();
        ListenReleaseResponse release = catalogService.latest().orElse(null);
        body.put("release", release);
        body.put("history", catalogService.history());
        body.put("index", release == null ? objectMapper.createObjectNode() : indexOrEmpty());
        return body;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Parse jts-just-listen-it.html, store sets in MinIO, replace the live catalog")
    public ListenUploadResponse upload(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Выберите HTML-файл Just Listen It");
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String lower = name.toLowerCase();
        if (!lower.endsWith(".html") && !lower.endsWith(".htm")) {
            throw new BadRequestException("Нужен HTML-файл прототипа (.html)");
        }
        try {
            ListenUploadResponse response = uploadService.upload(file.getBytes(), name, securityUtils.userId());
            // Новые файлы не должны прятаться за копией прошлой загрузки в памяти.
            catalogService.clearCache();
            return response;
        } catch (IOException e) {
            throw new BadRequestException("Не удалось прочитать загруженный файл: " + e.getMessage());
        }
    }

    private JsonNode indexOrEmpty() {
        try {
            return catalogService.readIndex();
        } catch (ResourceNotFoundException e) {
            return objectMapper.createObjectNode();
        }
    }
}
```

- [ ] **Step 4: Контроллер ученика**

`src/main/java/kz/education/server/presentation/mobile/listen/controller/MobileListenController.java`:

```java
package kz.education.server.presentation.mobile.listen.controller;

import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import kz.education.server.modules.listen.service.ListenCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/mobile/listen")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Just Listen It", description = "Dictation sets: levels A0–B2 and professional fields")
public class MobileListenController {

    private final ListenCatalogService catalogService;

    @GetMapping
    @Operation(summary = "Index: levels and fields with counts, no words")
    public JsonNode index() {
        return catalogService.readIndex();
    }

    @GetMapping("/sets/{id}")
    @Operation(summary = "One level (A1) or field (business): units, lessons, entries")
    public JsonNode set(@PathVariable String id) {
        return catalogService.readSet(id);
    }
}
```

- [ ] **Step 5: Прогнать тесты контроллеров и всего модуля**

Run: `./gradlew test --tests '*ListenControllersTest' --tests '*Listen*' --tests '*JsLiteralsTest' --tests '*Vocab*'`
Expected: PASS, новых падений нет.

- [ ] **Step 6: Полный прогон и сверка с базовым**

Run: `./gradlew test` (в фоне, ~10+ минут; Docker нужен для Testcontainers — без него ~21 известное падение)
Expected: падения только из известного набора окружения; ни одного в `listen`, `vocabcatalog`, `shared.util`.

- [ ] **Step 7: Живая проверка на локальном хранилище**

Поднять бэкенд с локальным хранилищем (Postgres из `compose-local.yaml` уже должен работать по README репо):

```bash
./gradlew bootRun --args='--listen.storage=local --listen.dir=.local/listen'
```

Получить токен админа так же, как для остальных админ-ручек на локалке, затем:

```bash
curl -s -H "Authorization: Bearer $ADMIN" -F "file=@/c/Users/nural/Desktop/jts-web-app/data/jtslisten.html" http://localhost:8080/admin/listen/upload | head -c 400
curl -s -H "Authorization: Bearer $ADMIN" http://localhost:8080/mobile/listen | head -c 400
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $ADMIN" http://localhost:8080/mobile/listen/sets/nope
```
Expected: первый ответ — `"wordsCount":11135`, 21 набор; второй — оглавление с `"levels":[{"id":"A0",…`; третий — `404`. Остановить `bootRun`, удалить `.local/listen`.

- [ ] **Step 8: Обновить HANDOFF.md**

Добавить в раздел текущей работы `HANDOFF.md` абзац:

```markdown
- **Just Listen It (модуль `listen`, ветка feat/just-listen-it, 21.10.2026).** Админ загружает HTML-прототип
  (`POST /admin/listen/upload`), сервер проверяет его (`ListenHtmlParser`) и кладёт наборы в MinIO
  `listen/current/{index.json,sets/<id>.json}`; ученик читает `GET /mobile/listen` и `/mobile/listen/sets/{id}`.
  Релизы — `listen_releases` (V387). Premium пока открыт всем; проверку добавлять в `ListenCatalogService.readSet`.
  Разбор JS-литералов вынесен в `shared/util/JsLiterals` (им же пользуется словарь).
```

- [ ] **Step 9: Commit**

```bash
git add src/main/java/kz/education/server/presentation/admin/listen/controller src/main/java/kz/education/server/presentation/mobile/listen src/test/java/kz/education/server/presentation/listen HANDOFF.md
git commit -m "feat(listen): ручки загрузки для админа и наборов для ученика

/admin/listen (ADMIN): текущий релиз, история, загрузка HTML.
/mobile/listen: оглавление и набор по id; Premium пока открыт всем.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 10: Подготовка к PR (по команде владельца)**

```bash
git fetch origin && git rebase origin/develop
bash scripts/check-migrations.sh --base origin/develop
./gradlew test --tests '*Listen*' --tests '*JsLiteralsTest' --tests '*Vocab*'
```
Expected: зелёное. Пуш и PR в `develop` — только после «да» владельца; бэкенд мержится раньше web-admin и веба.
