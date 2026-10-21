# Prepositions World — backend: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** модуль `prepositions` бэкенда: админ загружает html-прототип «Prepositions World», бэкенд
проверяет его, кладёт 266 картинок и 502 записи в MinIO по хэшу и отдаёт ученику `bundle.json`
по `GET /mobile/prepositions`.

**Architecture:** как Just Listen It (`modules/listen`): парсер без JS-движка → JSON в MinIO
(`prepositions/current/bundle.json`) → кэш в памяти → `/mobile/**` под Bearer. Медиа — общий
`modules/practice` (`practice/prepositions/<sha24>.webp|mp3`, immutable), доученный webp и
удалению. Таблица `prepositions_releases` — только мета.

**Tech Stack:** Java 21, Gradle (`./gradlew`), Spring Boot, Jackson, MinIO client, Flyway, JUnit 5 + Mockito + AssertJ.

**Спека:** `jts-web-app/docs/superpowers/specs/2026-10-22-prepositions-world-design.md`.

## Global Constraints

- Рабочее дерево: `C:/Users/nural/Desktop/backend-prepositions`, ветка `feat/prepositions-world` от `origin/develop`.
- Миграция — `V393__Create_prepositions_releases.sql`; перед мержем сверить: `git fetch && git ls-tree --name-only origin/develop src/main/resources/db/migration/ | sort -V | tail -3`. Занят — взять следующий.
- Тесты — только Mockito/юниты, без `@WebMvcTest` (срезы красные из-за `IeltsAccessInterceptor`) и без Testcontainers.
- Комментарии — по-русски, объясняют «почему».
- Поведение Аудирования (`practice/listening`, mp3) не меняется: его тесты зелёные без правок.
- Предел одного медиа — 20 МБ (как `PracticeMediaService.MAX_BYTES`), html — 64 МБ.
- Тексты ошибок — по-русски, с местом: «Вопрос place/place-in-on-at/0: …».

## Файлы

| Файл | Что |
|---|---|
| `modules/practice/PracticeMediaNames.java` (изм.) | типы по разделам, WebP |
| `modules/practice/PracticeMediaService.java` (изм.) | «только mp3» → «тип раздела» |
| `modules/practice/PracticeMediaStorage.java` (изм.) | `delete` |
| `modules/prepositions/service/PrepositionsAudioKeys.java` | `fnv`, `sentenceOf` — как в движке |
| `modules/prepositions/service/PrepositionsBundle.java` | итог разбора |
| `modules/prepositions/service/PrepositionsHtmlParser.java` | разбор и проверка |
| `modules/prepositions/model/PrepositionsRelease.java`, `repository/PrepositionsReleaseRepository.java` | мета загрузок |
| `modules/prepositions/service/PrepositionsStorageService.java` | `bundle.json` в MinIO / локально |
| `modules/prepositions/service/PrepositionsUploadService.java` | загрузка |
| `modules/prepositions/service/PrepositionsCatalogService.java` | чтение + кэш |
| `presentation/admin/prepositions/**`, `presentation/mobile/prepositions/**` | ручки и DTO |
| `db/migration/V393__Create_prepositions_releases.sql` | таблица |
| `application.yml` (изм.) | `prepositions.engine-sha` |
| `docs/practice/PREPOSITIONS.md` | формат и поток |

Пакеты: `kz.education.server.modules.prepositions.*`, `kz.education.server.presentation.{admin,mobile}.prepositions.*`.
Пути ниже — от `src/main/java/kz/education/server/` и `src/test/java/kz/education/server/`.

---

### Task 1: Общие медиа «Практики» — WebP, типы по разделам, удаление

**Files:**
- Modify: `modules/practice/PracticeMediaNames.java`
- Modify: `modules/practice/PracticeMediaService.java` (проверка типа в `upload`)
- Modify: `modules/practice/PracticeMediaStorage.java` (добавить `delete`)
- Test (new): `modules/practice/PracticeMediaNamesTest.java`

**Interfaces:**
- Produces: `PracticeMediaNames.SECTION_TYPES: Map<String, Set<String>>`, `SECTIONS: Set<String>` (= ключи),
  `allows(String section, String ext): boolean`, `sniff(byte[]) → "mp3" | "webp" | null`,
  `valid(name)` принимает `<24hex>.mp3|webp`, `contentTypeOf("x.webp") = "image/webp"`;
  `PracticeMediaStorage.delete(String section, String name): void` (сбой — `IllegalStateException`).

- [ ] **Step 1: Написать падающий тест**

```java
package kz.education.server.modules.practice;

import kz.education.server.shared.exception.types.BadRequestException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PracticeMediaNamesTest {

    static final byte[] WEBP = {'R', 'I', 'F', 'F', 0x10, 0, 0, 0, 'W', 'E', 'B', 'P', 'V', 'P', '8', 'L'};
    static final byte[] MP3 = {(byte) 0xFF, (byte) 0xFB, (byte) 0x90, (byte) 0xC0, 0, 0, 0, 0};

    @Test
    void sniffsWebpAndMp3ByBytes() {
        assertThat(PracticeMediaNames.sniff(WEBP)).isEqualTo("webp");
        assertThat(PracticeMediaNames.sniff(MP3)).isEqualTo("mp3");
        assertThat(PracticeMediaNames.sniff(new byte[]{'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'A', 'V', 'E'})).isNull();
    }

    @Test
    void listeningStaysMp3OnlyPrepositionsTakesWebpToo() {
        assertThat(PracticeMediaNames.allows("listening", "mp3")).isTrue();
        assertThat(PracticeMediaNames.allows("listening", "webp")).isFalse();
        assertThat(PracticeMediaNames.allows("prepositions", "webp")).isTrue();
        assertThat(PracticeMediaNames.allows("prepositions", "mp3")).isTrue();
        assertThat(PracticeMediaNames.allows("../ielts", "mp3")).isFalse();
        assertThat(PracticeMediaNames.section("prepositions")).isEqualTo("prepositions");
    }

    @Test
    void namesAreHashPlusKnownExtension() {
        String webp = PracticeMediaNames.hash(WEBP) + ".webp";
        assertThat(PracticeMediaNames.valid(webp)).isTrue();
        assertThat(PracticeMediaNames.valid(PracticeMediaNames.hash(MP3) + ".mp3")).isTrue();
        assertThat(PracticeMediaNames.valid("abc.webp")).isFalse();
        assertThat(PracticeMediaNames.contentTypeOf(webp)).isEqualTo("image/webp");
        assertThatThrownBy(() -> PracticeMediaNames.safe("../x.webp")).isInstanceOf(BadRequestException.class);
    }
}
```

- [ ] **Step 2: Запустить — падает**

Run: `./gradlew test --tests '*PracticeMediaNamesTest'`
Expected: FAIL — нет `allows`, `sniff(WEBP)` = null.

- [ ] **Step 3: Реализация `PracticeMediaNames`**

Заменить `SECTIONS`, `NAME`, `CONTENT_TYPE` и `sniff`, добавить `SECTION_TYPES` и `allows`:

```java
    /**
     * Разделы, которым открыта заливка, и типы их файлов. Белый список, а не любая строка: из раздела собирается
     * префикс ключа в общем бакете, и «../ielts» не должен дотянуться до чужих файлов. Типы — по разделу: Аудированию
     * картинки не нужны, и пакет с webp там — ошибка сборки, а не новый контент. Новый раздел — новая строка здесь.
     */
    public static final Map<String, Set<String>> SECTION_TYPES = Map.of(
            "listening", Set.of("mp3"),
            "prepositions", Set.of("mp3", "webp"));

    public static final Set<String> SECTIONS = SECTION_TYPES.keySet();

    private static final Pattern NAME = Pattern.compile("^[a-f0-9]{24}\\.(mp3|webp)$");

    public static final Map<String, String> CONTENT_TYPE = Map.of("mp3", "audio/mpeg", "webp", "image/webp");

    public static boolean allows(String section, String ext) {
        Set<String> types = section == null ? null : SECTION_TYPES.get(section);
        return types != null && types.contains(ext);
    }
```

```java
    /** Тип по первым байтам, а не по расширению и Content-Type браузера — их подделать проще всего. */
    public static String sniff(byte[] b) {
        if (b == null || b.length < 4) return null;
        if (b[0] == 'I' && b[1] == 'D' && b[2] == '3') return "mp3";
        if ((b[0] & 0xFF) == 0xFF && (b[1] & 0xE0) == 0xE0) return "mp3";
        // RIFF-контейнер с форматом WEBP: «RIFF», 4 байта длины, «WEBP» (WAV — тот же RIFF, но «WAVE»)
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "webp";
        return null;
    }
```

`section(...)` оставить как есть — он сверяется с `SECTIONS`. Импорт `java.util.Set` уже есть.

- [ ] **Step 4: `PracticeMediaService.upload` — тип раздела**

Заменить строки

```java
        String ext = PracticeMediaNames.sniff(bytes);
        if (ext == null) throw new BadRequestException("Поддерживается только mp3 — этот файл не mp3");
```

на

```java
        String ext = PracticeMediaNames.sniff(bytes);
        // Сообщение Аудирования прежнее: у раздела один тип, и «только mp3» понятнее перечня.
        if (ext == null || !PracticeMediaNames.allows(section, ext)) {
            throw new BadRequestException("Поддерживается только " + String.join(", ",
                    new java.util.TreeSet<>(PracticeMediaNames.SECTION_TYPES.get(section))) + " — этот файл не подходит");
        }
```

Существующий тест `PracticeMediaServiceTest.rejectsNotMp3` ждёт `hasMessageContaining("mp3")` — сообщение «Поддерживается только mp3 — …» его выполняет.

- [ ] **Step 5: `PracticeMediaStorage.delete`**

Добавить после `download` (импорт `io.minio.RemoveObjectArgs`):

```java
    /**
     * Удалить файл раздела. Нужен заливке целиком (Prepositions World): файлы, на которые новый бандл больше не
     * ссылается, иначе копились бы с каждой заливкой. Нет файла — не ошибка (MinIO на удаление отсутствующего молчит).
     */
    public void delete(String section, String name) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(key(section, name)).build());
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Хранилище медиа не удалило " + name + ": " + e.getMessage(), e);
        }
    }
```

- [ ] **Step 6: Тесты зелёные**

Run: `./gradlew test --tests '*PracticeMedia*Test' --tests '*Listening*Test'`
Expected: PASS (новый тест и прежние тесты медиа и Аудирования).

- [ ] **Step 7: Commit**

```bash
git add src/main/java/kz/education/server/modules/practice src/test/java/kz/education/server/modules/practice/PracticeMediaNamesTest.java
git commit -m "feat(practice-media): webp и типы файлов по разделам, удаление файла

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Ключи записей — `fnv` и `sentenceOf` как в движке

**Files:**
- Create: `modules/prepositions/service/PrepositionsAudioKeys.java`
- Test: `modules/prepositions/service/PrepositionsAudioKeysTest.java`

**Interfaces:**
- Produces: `PrepositionsAudioKeys.fnv(String): String` (8 hex), `sentenceOf(JsonNode q): String | null`
  (null для `scene` и неизвестного типа), `covered(JsonNode aud, String text): boolean`.

- [ ] **Step 1: Падающий тест**

Значения FNV сняты функцией `fnv` самого прототипа (node).

```java
package kz.education.server.modules.prepositions.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PrepositionsAudioKeysTest {

    private final ObjectMapper mapper = new ObjectMapper();

    private JsonNode q(String json) throws Exception {
        return mapper.readTree(json);
    }

    @Test
    void fnvMatchesPrototype() {
        assertThat(PrepositionsAudioKeys.fnv("The cat is in the box.")).isEqualTo("a12fe6b1");
        assertThat(PrepositionsAudioKeys.fnv("I live in Almaty.")).isEqualTo("e0721387");
        assertThat(PrepositionsAudioKeys.fnv("Мия – ok")).isEqualTo("e183ab27");
    }

    @Test
    void sentenceOfEveryType() throws Exception {
        assertThat(PrepositionsAudioKeys.sentenceOf(q("{\"type\":\"gap\",\"stem\":\"The cat is ___ the box.\",\"ans\":\"in\"}")))
                .isEqualTo("The cat is in the box.");
        // «–» — «без предлога»: пропуск схлопывается вместе с пробелом
        assertThat(PrepositionsAudioKeys.sentenceOf(q("{\"type\":\"gap\",\"stem\":\"Go ___ home.\",\"ans\":\"–\"}")))
                .isEqualTo("Go home.");
        assertThat(PrepositionsAudioKeys.sentenceOf(q("{\"type\":\"gap\",\"stem\":\"I am ___.\",\"ans\":\"–\"}")))
                .isEqualTo("I am.");
        assertThat(PrepositionsAudioKeys.sentenceOf(q("{\"type\":\"fix\",\"stem\":\"I live [at] Almaty.\",\"ans\":\"in\"}")))
                .isEqualTo("I live in Almaty.");
        assertThat(PrepositionsAudioKeys.sentenceOf(q("{\"type\":\"dialogue\",\"lines\":[\"Where is it?\",\"It is ___ the box.\"],\"ans\":\"in\"}")))
                .isEqualTo("Where is it? It is in the box.");
        assertThat(PrepositionsAudioKeys.sentenceOf(q("{\"type\":\"compare\",\"opts\":[\"A.\",\"B.\"],\"ans\":1}")))
                .isEqualTo("B.");
        assertThat(PrepositionsAudioKeys.sentenceOf(q("{\"type\":\"passage\",\"text\":\"We met ___(1) Monday ___(2) the park.\","
                + "\"gaps\":[{\"ans\":\"on\"},{\"ans\":\"in\"}]}")))
                .isEqualTo("We met on Monday in the park.");
        assertThat(PrepositionsAudioKeys.sentenceOf(q("{\"type\":\"scene\",\"sc\":\"f_in\"}"))).isNull();
    }

    @Test
    void coveredByWholeKeyOrFirstPart() throws Exception {
        JsonNode aud = q("{\"a12fe6b1\":\"x\",\"e0721387_0\":\"x\",\"e0721387_1\":\"x\"}");
        assertThat(PrepositionsAudioKeys.covered(aud, "The cat is in the box.")).isTrue();
        assertThat(PrepositionsAudioKeys.covered(aud, "I live in Almaty.")).isTrue();
        assertThat(PrepositionsAudioKeys.covered(aud, "We met on Monday in the park.")).isFalse();
    }
}
```

- [ ] **Step 2: Запустить — падает**

Run: `./gradlew test --tests '*PrepositionsAudioKeysTest'`
Expected: FAIL — класса нет.

- [ ] **Step 3: Реализация**

```java
package kz.education.server.modules.prepositions.service;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Как движок Prepositions World находит запись предложения: полное верное предложение (sentenceOf) → FNV-1a-32 →
 * 8 hex; длинное — кусками «ключ_0, ключ_1…». Перенесено строка в строку (функции fill/sentenceOf/fnv/audKeys
 * прототипа): ключ, посчитанный иначе, молча отрезал бы вопросу звук, а загрузка о нём не предупредила бы.
 */
public final class PrepositionsAudioKeys {

    /** «–» в вариантах — «без предлога» (en dash, как в данных методиста). */
    static final String NO_WORD = "\u2013";
    private static final Pattern WRONG = Pattern.compile("\\[[^\\]]+\\]");

    private PrepositionsAudioKeys() {
    }

    /** FNV-1a-32 по кодовым единицам UTF-16 — как charCodeAt в JS. */
    public static String fnv(String s) {
        int x = 0x811c9dc5;
        for (int i = 0; i < s.length(); i++) {
            x ^= s.charAt(i);
            x *= 0x01000193;
        }
        String hex = Integer.toHexString(x);
        return "00000000".substring(hex.length()) + hex;
    }

    /** Полное верное предложение вопроса; null — его строит геометрия сцены (scene) или тип неизвестен. */
    public static String sentenceOf(JsonNode q) {
        String type = q.path("type").asText("");
        String ans = q.path("ans").asText("");
        switch (type) {
            case "gap":
                return fill(q.path("stem").asText(""), ans);
            case "dialogue": {
                List<String> lines = new ArrayList<>();
                q.path("lines").forEach(l -> lines.add(fill(l.asText(""), ans)));
                return String.join(" ", lines);
            }
            case "fix": {
                Matcher m = WRONG.matcher(q.path("stem").asText(""));
                return m.replaceFirst(Matcher.quoteReplacement(ans));
            }
            case "compare":
                return q.path("opts").path(q.path("ans").asInt(-1)).asText("");
            case "passage": {
                String t = q.path("text").asText("");
                JsonNode gaps = q.path("gaps");
                for (int i = 0; i < gaps.size(); i++) {
                    t = replaceFirst(t, "___(" + (i + 1) + ")", gaps.get(i).path("ans").asText(""));
                }
                return t;
            }
            default:
                return null;
        }
    }

    public static boolean covered(JsonNode aud, String text) {
        String k = fnv(text);
        return aud.has(k) || aud.has(k + "_0");
    }

    /** fill прототипа: «–» убирает пропуск с пробелом, иначе первый «___» — ответ. */
    static String fill(String s, String a) {
        if (NO_WORD.equals(a)) {
            return s.replaceFirst(" ?___ ?", " ").replaceAll(" +", " ").replaceAll(" ([.,?!])", "$1");
        }
        return replaceFirst(s, "___", a);
    }

    /** String.replace JS со строкой-образцом: только первое вхождение и без спецсимволов замены. */
    private static String replaceFirst(String s, String what, String with) {
        int i = s.indexOf(what);
        return i < 0 ? s : s.substring(0, i) + with + s.substring(i + what.length());
    }
}
```

- [ ] **Step 4: Тест зелёный**

Run: `./gradlew test --tests '*PrepositionsAudioKeysTest'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/kz/education/server/modules/prepositions src/test/java/kz/education/server/modules/prepositions
git commit -m "feat(prepositions): ключ записи предложения как в движке прототипа

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Разбор и проверка html

**Files:**
- Create: `modules/prepositions/service/PrepositionsBundle.java`
- Create: `modules/prepositions/service/PrepositionsHtmlParser.java`
- Test: `modules/prepositions/service/PrepositionsTestHtml.java` (сборщик html для тестов)
- Test: `modules/prepositions/service/PrepositionsHtmlParserTest.java`

**Interfaces:**
- Consumes: `PracticeMediaNames.sniff/hash` (Task 1), `PrepositionsAudioKeys` (Task 2), `JsLiterals.extract/jsToJson/objectStart`.
- Produces:
  ```java
  public record PrepositionsBundle(JsonNode course, JsonNode pics, JsonNode pcat, JsonNode pdef,
          JsonNode assetSize, JsonNode assetSlots, Map<String, Media> images, Map<String, Media> audio,
          int lessons, int questions, String engineSha, List<String> warnings) {
      public record Media(byte[] bytes, String ext) { public String name(); }
  }
  PrepositionsHtmlParser.parse(String html): PrepositionsBundle   // BadRequestException на ошибке
  PrepositionsHtmlParser.engineSha(String html): String           // 64 hex
  ```
  `PrepositionsTestHtml.page(Map<String,String> override)` — html с блоками по умолчанию; `override`
  подменяет блок (`course`, `pics`, `pcat`, `assets`, `aud`, `pdef`, `engine`) строкой.

- [ ] **Step 1: Сборщик html для тестов**

```java
package kz.education.server.modules.prepositions.service;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * Маленький прототип того же формата, что «Prepositions World»: пять JSON-блоков, PDEF в скрипте движка, крошечные
 * webp/mp3. Ключи записей — fnv предложений (сняты функцией прототипа): gap и passage озвучены, compare — нет.
 */
final class PrepositionsTestHtml {

    static final byte[] WEBP = {'R', 'I', 'F', 'F', 0x10, 0, 0, 0, 'W', 'E', 'B', 'P', 'V', 'P', '8', 'L', 1, 2};
    static final byte[] WEBP2 = {'R', 'I', 'F', 'F', 0x10, 0, 0, 0, 'W', 'E', 'B', 'P', 'V', 'P', '8', 'L', 3, 4};
    static final byte[] MP3 = {(byte) 0xFF, (byte) 0xFB, (byte) 0x90, (byte) 0xC0, 0, 0, 0, 1};

    static String uri(String mime, byte[] b) {
        return "data:" + mime + ";base64," + Base64.getEncoder().encodeToString(b);
    }

    static final String T3 = "{\"en\":\"x\",\"kk\":\"x\",\"ru\":\"x\"}";

    static final String COURSE = """
            {"cats":[{"id":"place","title":%1$s,"blurb":%1$s,
              "lessons":[{"id":"place-in-on-at","title":%1$s,"preps":"in · on","lead":%1$s,
                "screens":[{"h":%1$s,"blocks":[]}],"mistakes":[],"memory":%1$s,"src":[],
                "practice":[
                  {"type":"gap","lv":1,"stem":"The cat is ___ the box.","opts":["in","on","at"],"ans":"in","why":%1$s,"tr":{"kk":"к","ru":"р"}},
                  {"type":"scene","lv":1,"sc":"f_in","a":"d","p":"in","b":"t"},
                  {"type":"compare","lv":2,"ask":%1$s,"opts":["I live in Almaty.","I live at Almaty."],"ans":0,"why":%1$s,"tr":{"kk":["a","b"],"ru":["a","b"]}}
                ]}],
              "integrated":[
                {"type":"passage","lv":4,"text":"We met ___(1) Monday ___(2) the park.",
                 "gaps":[{"opts":["on","in","at"],"ans":"on","why":%1$s},{"opts":["in","on","at"],"ans":"in","why":%1$s}],"tr":{"kk":"к","ru":"р"}}
              ],"sources":{},"inventory":[]}]}""".formatted(T3);

    static final String PIC = "{\"bg\":\"street\",\"items\":[{\"id\":\"d\",\"m\":\"dexter\",\"x\":0.3},{\"id\":\"b\",\"p\":\"box\",\"x\":0.6}],\"widgets\":[],\"alt\":\"x\"}";
    static final String PICS = "{\"place/place-in-on-at/0\":" + PIC + ",\"place/place-in-on-at/2\":" + PIC + ",\"place/int/0\":" + PIC + "}";
    static final String PCAT = "{\"box\":{\"n\":\"box\",\"c\":\"s\"}}";

    static String assets() {
        return "{\"img\":{\"bg_street\":\"" + uri("image/webp", WEBP) + "\",\"p_box\":\"" + uri("image/webp", WEBP2)
                + "\",\"dexter\":\"" + uri("image/webp", WEBP) + "\"},\"size\":{\"bg_street\":[1280,720],\"p_box\":[100,80],\"dexter\":[300,500]},"
                + "\"slots\":{\"tent\":{\"poly\":[[0,0],[1,1]]}}}";
    }

    static String aud() {
        // gap — целиком, passage — двумя кусками; у compare записи нет (→ предупреждение)
        return "{\"a12fe6b1\":\"" + uri("audio/mpeg", MP3) + "\",\"ff497ce2_0\":\"" + uri("audio/mpeg", MP3)
                + "\",\"ff497ce2_1\":\"" + uri("audio/mpeg", MP3) + "\"}";
    }

    static final String PDEF = "{\"in\":{\"def\":" + T3 + ",\"word\":{\"kk\":\"ішінде\",\"ru\":\"в\"},\"note\":" + T3 + "}}";

    static String engine(String pdef) {
        return "\nconst PH={\"in\":\"in\"};\nconst PDEF=" + pdef + ";\nfunction route(){ return 1; }\n";
    }

    static String page(Map<String, String> override) {
        Map<String, String> b = new HashMap<>();
        b.put("course", COURSE);
        b.put("pics", PICS);
        b.put("pcat", PCAT);
        b.put("assets", assets());
        b.put("aud", aud());
        b.putAll(override);
        String engine = b.containsKey("engine") ? b.get("engine") : engine(b.getOrDefault("pdef", PDEF));
        StringBuilder html = new StringBuilder("<!doctype html><html><head><style>body{}</style></head><body><div id=\"app\"></div>\n");
        for (String id : new String[]{"assets", "course", "aud", "pics", "pcat"}) {
            if (b.get(id) != null) {
                html.append("<script type=\"application/json\" id=\"").append(id).append("\">").append(b.get(id)).append("</script>\n");
            }
        }
        return html.append("<script>").append(engine).append("</script></body></html>").toString();
    }

    static String page() {
        return page(Map.of());
    }
}
```

- [ ] **Step 2: Падающие тесты парсера**

```java
package kz.education.server.modules.prepositions.service;

import kz.education.server.shared.exception.types.BadRequestException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PrepositionsHtmlParserTest {

    private static PrepositionsBundle parse(Map<String, String> override) {
        return PrepositionsHtmlParser.parse(PrepositionsTestHtml.page(override));
    }

    private static Map<String, String> with(String key, String value) {
        Map<String, String> m = new HashMap<>();
        m.put(key, value);
        return m;
    }

    @Test
    void readsBlocksMediaAndCounts() {
        PrepositionsBundle b = parse(Map.of());

        assertThat(b.lessons()).isEqualTo(1);
        assertThat(b.questions()).isEqualTo(4);
        assertThat(b.course().path("cats").get(0).path("id").asText()).isEqualTo("place");
        assertThat(b.pics().has("place/int/0")).isTrue();
        assertThat(b.pcat().path("box").path("n").asText()).isEqualTo("box");
        assertThat(b.pdef().path("in").path("word").path("ru").asText()).isEqualTo("в");
        assertThat(b.assetSize().path("p_box").get(0).asInt()).isEqualTo(100);
        assertThat(b.assetSlots().has("tent")).isTrue();
        assertThat(b.images()).containsOnlyKeys("bg_street", "p_box", "dexter");
        assertThat(b.images().get("p_box").ext()).isEqualTo("webp");
        assertThat(b.images().get("p_box").bytes()).isEqualTo(PrepositionsTestHtml.WEBP2);
        assertThat(b.images().get("p_box").name()).matches("^[a-f0-9]{24}\\.webp$");
        assertThat(b.audio()).containsOnlyKeys("a12fe6b1", "ff497ce2_0", "ff497ce2_1");
        assertThat(b.audio().get("a12fe6b1").ext()).isEqualTo("mp3");
        assertThat(b.engineSha()).matches("^[a-f0-9]{64}$");
    }

    @Test
    void warnsAboutQuestionWithoutRecording() {
        assertThat(parse(Map.of()).warnings())
                .anySatisfy(w -> assertThat(w).contains("Нет записи у 1").contains("place/place-in-on-at/2"));
    }

    @Test
    void warnsAboutMissingBackground() {
        String pics = PrepositionsTestHtml.PICS.replace("\"street\"", "\"moon\"");
        assertThat(parse(with("pics", pics)).warnings()).anySatisfy(w -> assertThat(w).contains("bg_moon"));
    }

    @Test
    void engineShaIgnoresPdefAndLineEndings() {
        String base = PrepositionsHtmlParser.engineSha(PrepositionsTestHtml.page());
        String otherPdef = PrepositionsTestHtml.PDEF.replace("ішінде", "іші");
        assertThat(PrepositionsHtmlParser.engineSha(PrepositionsTestHtml.page(with("pdef", otherPdef)))).isEqualTo(base);
        String crlf = PrepositionsTestHtml.engine(PrepositionsTestHtml.PDEF).replace("\n", "\r\n");
        assertThat(PrepositionsHtmlParser.engineSha(PrepositionsTestHtml.page(with("engine", crlf)))).isEqualTo(base);
        String changed = PrepositionsTestHtml.engine(PrepositionsTestHtml.PDEF).replace("return 1", "return 2");
        assertThat(PrepositionsHtmlParser.engineSha(PrepositionsTestHtml.page(with("engine", changed)))).isNotEqualTo(base);
    }

    @Test
    void missingBlockIsRejected() {
        assertThatThrownBy(() -> parse(with("pcat", null)))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("pcat");
        String noPdef = "\nconst PH={};\n";
        assertThatThrownBy(() -> parse(with("engine", noPdef)))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("PDEF");
    }

    @Test
    void brokenJsonIsRejected() {
        assertThatThrownBy(() -> parse(with("pics", "{oops")))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("pics");
    }

    @Test
    void answerMustBeAmongOptions() {
        String course = PrepositionsTestHtml.COURSE.replace("\"ans\":\"in\",\"why\"", "\"ans\":\"into\",\"why\"");
        assertThatThrownBy(() -> parse(with("course", course)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("place/place-in-on-at/0").hasMessageContaining("into");
    }

    @Test
    void compareAnswerMustBeOptionIndex() {
        String course = PrepositionsTestHtml.COURSE.replace("\"ans\":0", "\"ans\":5");
        assertThatThrownBy(() -> parse(with("course", course)))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("place/place-in-on-at/2");
    }

    @Test
    void passageGapAnswerMustBeAmongItsOptions() {
        String course = PrepositionsTestHtml.COURSE.replace("\"ans\":\"on\",\"why\"", "\"ans\":\"by\",\"why\"");
        assertThatThrownBy(() -> parse(with("course", course)))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("place/int/0").hasMessageContaining("пропуск 1");
    }

    @Test
    void unknownQuestionTypeIsRejected() {
        String course = PrepositionsTestHtml.COURSE.replace("\"type\":\"gap\"", "\"type\":\"quiz\"");
        assertThatThrownBy(() -> parse(with("course", course)))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("quiz");
    }

    @Test
    void duplicateLessonIdIsRejected() {
        String course = PrepositionsTestHtml.COURSE.replace("\"lessons\":[{\"id\":\"place-in-on-at\"",
                "\"lessons\":[{\"id\":\"place-in-on-at\",\"title\":{},\"screens\":[],\"practice\":[]},{\"id\":\"place-in-on-at\"");
        assertThatThrownBy(() -> parse(with("course", course)))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("повторяется");
    }

    @Test
    void nonSceneQuestionNeedsPicture() {
        String pics = "{\"place/place-in-on-at/0\":" + PrepositionsTestHtml.PIC + ",\"place/int/0\":" + PrepositionsTestHtml.PIC + "}";
        assertThatThrownBy(() -> parse(with("pics", pics)))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("place/place-in-on-at/2").hasMessageContaining("pics");
    }

    @Test
    void propNeedsItsImage() {
        String pics = PrepositionsTestHtml.PICS.replace("\"p\":\"box\"", "\"p\":\"lamp\"");
        assertThatThrownBy(() -> parse(with("pics", pics)))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("p_lamp");
    }

    @Test
    void imageMustBeWebpAndAudioMp3() {
        String assets = PrepositionsTestHtml.assets().replaceFirst("data:image/webp;base64,[^\"]+",
                PrepositionsTestHtml.uri("image/png", new byte[]{(byte) 0x89, 'P', 'N', 'G', 0, 0, 0, 0, 0, 0, 0, 0}));
        assertThatThrownBy(() -> parse(with("assets", assets)))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("bg_street").hasMessageContaining("webp");
        String aud = PrepositionsTestHtml.aud().replaceFirst("data:audio/mpeg;base64,[^\"]+", "https://x/y.mp3");
        assertThatThrownBy(() -> parse(with("aud", aud)))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("a12fe6b1");
    }

    /** Настоящий прототип: PREPOSITIONS_HTML=C:/…/Prepositions World.html ./gradlew test --tests '*PrepositionsHtmlParserTest.realPrototype' */
    @Test
    @EnabledIfEnvironmentVariable(named = "PREPOSITIONS_HTML", matches = ".+")
    void realPrototype() throws Exception {
        String html = Files.readString(Path.of(System.getenv("PREPOSITIONS_HTML")), StandardCharsets.UTF_8);
        PrepositionsBundle b = PrepositionsHtmlParser.parse(html);
        System.out.println("prepositions.engine-sha=" + b.engineSha() + " warnings=" + b.warnings());
        assertThat(b.lessons()).isEqualTo(31);
        assertThat(b.questions()).isEqualTo(472);
        assertThat(b.images()).hasSize(266);
        assertThat(b.audio()).hasSize(502);
    }
}
```

- [ ] **Step 3: Запустить — падает**

Run: `./gradlew test --tests '*PrepositionsHtmlParserTest'`
Expected: FAIL — классов нет.

- [ ] **Step 4: `PrepositionsBundle`**

```java
package kz.education.server.modules.prepositions.service;

import com.fasterxml.jackson.databind.JsonNode;
import kz.education.server.modules.practice.PracticeMediaNames;

import java.util.List;
import java.util.Map;

/**
 * Разобранный прототип Prepositions World: данные курса как есть, картинки и записи — байтами (в бандл ученику они
 * уйдут ссылками на MinIO), счётчики для релиза, хэш движка и предупреждения.
 */
public record PrepositionsBundle(JsonNode course, JsonNode pics, JsonNode pcat, JsonNode pdef,
                                 JsonNode assetSize, JsonNode assetSlots,
                                 Map<String, Media> images, Map<String, Media> audio,
                                 int lessons, int questions, String engineSha, List<String> warnings) {

    public record Media(byte[] bytes, String ext) {

        /** Имя в хранилище: хэш содержимого — тот же файл в новой загрузке не перезаливается. */
        public String name() {
            return PracticeMediaNames.hash(bytes) + "." + ext;
        }
    }
}
```

- [ ] **Step 5: `PrepositionsHtmlParser`**

```java
package kz.education.server.modules.prepositions.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kz.education.server.modules.practice.PracticeMediaNames;
import kz.education.server.shared.exception.types.BadRequestException;
import kz.education.server.shared.util.JsLiterals;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Разбор прототипа Prepositions World (html методиста, ~23 МБ): пять блоков {@code <script type="application/json"
 * id="course|pics|pcat|assets|aud">} и литерал {@code PDEF} из скрипта движка. JS не исполняется. Ошибка формы
 * отклоняет всю загрузку: движок прототипа падает на вопросе без картинки или с ответом вне вариантов, и ученик
 * получил бы сломанный набор.
 */
public final class PrepositionsHtmlParser {

    static final List<String> BLOCKS = List.of("course", "pics", "pcat", "assets", "aud");
    static final Set<String> TYPES = Set.of("gap", "fix", "compare", "dialogue", "scene", "passage");
    /** Как {@code PracticeMediaService.MAX_BYTES}: самая тяжёлая картинка прототипа — сотни КБ. */
    static final long MAX_MEDIA_BYTES = 20L * 1024 * 1024;
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final int LIST_IN_WARNING = 5;

    private PrepositionsHtmlParser() {
    }

    public static PrepositionsBundle parse(String html) {
        Map<String, JsonNode> blocks = new LinkedHashMap<>();
        for (String id : BLOCKS) {
            blocks.put(id, jsonBlock(html, id));
        }
        JsonNode pdef = readJs(html, "PDEF");
        JsonNode assets = blocks.get("assets");
        if (!assets.path("img").isObject()) {
            throw bad("assets.img должен быть объектом {ключ: картинка}");
        }
        JsonNode aud = blocks.get("aud");
        if (!aud.isObject()) {
            throw bad("aud должен быть объектом {ключ: запись}");
        }
        Map<String, PrepositionsBundle.Media> images = media(assets.get("img"), "webp", "Картинка");
        Map<String, PrepositionsBundle.Media> audio = media(aud, "mp3", "Запись");

        Checks checks = new Checks(blocks.get("pics"), images, aud);
        checks.course(blocks.get("course"));
        return new PrepositionsBundle(blocks.get("course"), blocks.get("pics"), blocks.get("pcat"), pdef,
                assets.path("size"), assets.path("slots"), images, audio,
                checks.lessons, checks.questions, engineSha(html), checks.warnings());
    }

    /**
     * Хэш движка: текст всех скриптов, кроме JSON-блоков, без литерала PDEF (это данные — его правка законна) и с
     * переводами строк \n (Windows-редактор не должен «менять движок»). Совпал с {@code prepositions.engine-sha} —
     * движок на сайте тот же, что в файле.
     */
    public static String engineSha(String html) {
        StringBuilder engine = new StringBuilder();
        int from = 0;
        while (true) {
            int open = html.indexOf("<script", from);
            if (open < 0) {
                break;
            }
            int tagEnd = html.indexOf('>', open);
            int close = tagEnd < 0 ? -1 : html.indexOf("</script>", tagEnd);
            if (close < 0) {
                break;
            }
            if (!html.substring(open, tagEnd).contains("application/json")) {
                engine.append(html, tagEnd + 1, close).append('\n');
            }
            from = close + "</script>".length();
        }
        String text = engine.toString().replace("\r\n", "\n");
        int start = JsLiterals.objectStart(text, "PDEF");
        if (start >= 0) {
            text = text.substring(0, start) + text.substring(literalEnd(text, start));
        }
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    static JsonNode jsonBlock(String html, String id) {
        Matcher m = Pattern.compile("<script\\b[^>]*\\bid=\"" + Pattern.quote(id) + "\"[^>]*>").matcher(html);
        if (!m.find() || !m.group().contains("application/json")) {
            throw bad("В файле нет блока <script type=\"application/json\" id=\"" + id + "\">");
        }
        int end = html.indexOf("</script>", m.end());
        if (end < 0) {
            throw bad("Блок " + id + " не закрыт");
        }
        try {
            return MAPPER.readTree(html.substring(m.end(), end));
        } catch (Exception e) {
            throw bad("Блок " + id + " — не JSON: " + e.getOriginalMessage());
        }
    }

    private static JsonNode readJs(String html, String name) {
        String literal = JsLiterals.extract(html, name);
        try {
            return MAPPER.readTree(JsLiterals.jsToJson(literal));
        } catch (Exception e) {
            throw bad(name + " — не разобрать: " + e.getMessage());
        }
    }

    /** data-URI → байты; тип — по сигнатуре байтов, а не по тексту data-URI. */
    private static Map<String, PrepositionsBundle.Media> media(JsonNode map, String ext, String what) {
        Map<String, PrepositionsBundle.Media> out = new LinkedHashMap<>();
        Iterator<Map.Entry<String, JsonNode>> it = map.fields();
        while (it.hasNext()) {
            Map.Entry<String, JsonNode> e = it.next();
            String uri = e.getValue().asText("");
            int comma = uri.indexOf(',');
            if (!uri.startsWith("data:") || comma < 0 || !uri.substring(0, comma).endsWith(";base64")) {
                throw bad(what + " " + e.getKey() + ": ждём data-URI base64");
            }
            byte[] bytes;
            try {
                bytes = Base64.getDecoder().decode(uri.substring(comma + 1));
            } catch (IllegalArgumentException ex) {
                throw bad(what + " " + e.getKey() + ": битый base64");
            }
            if (bytes.length > MAX_MEDIA_BYTES) {
                throw bad(what + " " + e.getKey() + ": больше " + MAX_MEDIA_BYTES / 1024 / 1024 + " МБ");
            }
            if (!ext.equals(PracticeMediaNames.sniff(bytes))) {
                throw bad(what + " " + e.getKey() + ": не " + ext);
            }
            out.put(e.getKey(), new PrepositionsBundle.Media(bytes, ext));
        }
        return out;
    }

    /** Конец литерала, начатого скобкой на start: глубина скобок без учёта строк. */
    static int literalEnd(String s, int start) {
        int depth = 0;
        int i = start;
        while (i < s.length()) {
            char c = s.charAt(i);
            if (c == '"' || c == '\'' || c == '`') {
                i++;
                while (i < s.length() && s.charAt(i) != c) {
                    i += s.charAt(i) == '\\' ? 2 : 1;
                }
            } else if (c == '{' || c == '[') {
                depth++;
            } else if (c == '}' || c == ']') {
                depth--;
                if (depth == 0) {
                    return i + 1;
                }
            }
            i++;
        }
        return s.length();
    }

    static BadRequestException bad(String msg) {
        return new BadRequestException(msg);
    }

    /** Проверка курса против сцен и картинок; копит счётчики и предупреждения. */
    private static final class Checks {

        private final JsonNode pics;
        private final Map<String, PrepositionsBundle.Media> images;
        private final JsonNode aud;
        private final List<String> noAudio = new ArrayList<>();
        private final List<String> noBg = new ArrayList<>();
        int lessons;
        int questions;

        Checks(JsonNode pics, Map<String, PrepositionsBundle.Media> images, JsonNode aud) {
            this.pics = pics;
            this.images = images;
            this.aud = aud;
        }

        void course(JsonNode course) {
            JsonNode cats = course.path("cats");
            if (!cats.isArray() || cats.isEmpty()) {
                throw bad("course.cats должен быть непустым массивом категорий");
            }
            Set<String> lessonIds = new HashSet<>();
            for (JsonNode cat : cats) {
                String catId = cat.path("id").asText("");
                if (catId.isEmpty()) {
                    throw bad("Категория без id");
                }
                if (!cat.path("lessons").isArray()) {
                    throw bad("Категория " + catId + ": нет массива lessons");
                }
                for (JsonNode lesson : cat.get("lessons")) {
                    String id = lesson.path("id").asText("");
                    if (id.isEmpty()) {
                        throw bad("Категория " + catId + ": урок без id");
                    }
                    if (!lessonIds.add(id)) {
                        throw bad("Урок " + id + ": id повторяется");
                    }
                    if (!lesson.path("screens").isArray()) {
                        throw bad("Урок " + id + ": нет массива screens");
                    }
                    if (!lesson.path("practice").isArray()) {
                        throw bad("Урок " + id + ": нет массива practice");
                    }
                    lessons++;
                    JsonNode practice = lesson.get("practice");
                    for (int i = 0; i < practice.size(); i++) {
                        question(practice.get(i), catId + "/" + id + "/" + i);
                    }
                }
                JsonNode integrated = cat.path("integrated");
                if (!integrated.isMissingNode() && !integrated.isArray()) {
                    throw bad("Категория " + catId + ": integrated должен быть массивом");
                }
                for (int i = 0; i < integrated.size(); i++) {
                    question(integrated.get(i), catId + "/int/" + i);
                }
            }
        }

        // _id вопроса — как в движке: «<кат>/<урок>/<номер в practice>» или «<кат>/int/<номер>»; по нему движок
        // ищет картинку в pics, поэтому номер считается по всем вопросам урока, включая scene.
        private void question(JsonNode q, String qid) {
            questions++;
            String type = q.path("type").asText("");
            if (!TYPES.contains(type)) {
                throw bad("Вопрос " + qid + ": неизвестный тип «" + type + "»");
            }
            switch (type) {
                case "gap", "fix", "dialogue" -> {
                    JsonNode opts = options(q, qid);
                    String ans = q.path("ans").asText("");
                    if (!contains(opts, ans)) {
                        throw bad("Вопрос " + qid + ": ответа «" + ans + "» нет среди вариантов");
                    }
                }
                case "compare" -> {
                    JsonNode opts = options(q, qid);
                    JsonNode ans = q.path("ans");
                    if (!ans.isInt() || ans.asInt() < 0 || ans.asInt() >= opts.size()) {
                        throw bad("Вопрос " + qid + ": ans должен быть номером варианта (0…" + (opts.size() - 1) + ")");
                    }
                }
                case "passage" -> {
                    JsonNode gaps = q.path("gaps");
                    if (!gaps.isArray() || gaps.isEmpty()) {
                        throw bad("Вопрос " + qid + ": у текста нет пропусков gaps");
                    }
                    for (int g = 0; g < gaps.size(); g++) {
                        String ans = gaps.get(g).path("ans").asText("");
                        if (!contains(gaps.get(g).path("opts"), ans)) {
                            throw bad("Вопрос " + qid + ", пропуск " + (g + 1) + ": ответа «" + ans + "» нет среди вариантов");
                        }
                    }
                }
                default -> {
                    // scene: предложение и варианты строит геометрия сцены в движке — проверять здесь нечего
                    return;
                }
            }
            picture(qid);
            String sentence = PrepositionsAudioKeys.sentenceOf(q);
            if (sentence != null && !PrepositionsAudioKeys.covered(aud, sentence)) {
                noAudio.add(qid);
            }
        }

        private void picture(String qid) {
            JsonNode pic = pics.get(qid);
            if (pic == null || !pic.isObject()) {
                throw bad("Вопрос " + qid + ": нет картинки в pics (движок на таком вопросе падает)");
            }
            for (JsonNode item : pic.path("items")) {
                String p = item.path("p").asText("");
                if (!p.isEmpty() && !images.containsKey("p_" + p)) {
                    throw bad("Картинка вопроса " + qid + ": нет рисунка p_" + p + " в assets");
                }
            }
            String bg = pic.path("bg").asText("");
            if (!bg.isEmpty() && !images.containsKey("bg_" + bg)) {
                noBg.add(qid + " (bg_" + bg + ")");
            }
        }

        private static JsonNode options(JsonNode q, String qid) {
            JsonNode opts = q.path("opts");
            if (!opts.isArray() || opts.size() < 2) {
                throw bad("Вопрос " + qid + ": нужно хотя бы два варианта opts");
            }
            return opts;
        }

        private static boolean contains(JsonNode arr, String value) {
            for (JsonNode o : arr) {
                if (value.equals(o.asText())) {
                    return true;
                }
            }
            return false;
        }

        List<String> warnings() {
            List<String> out = new ArrayList<>();
            if (!noAudio.isEmpty()) {
                out.add("Нет записи у " + noAudio.size() + " вопросов — кнопки «Listen again» у них не будет: " + head(noAudio));
            }
            if (!noBg.isEmpty()) {
                out.add("Нет фона у " + noBg.size() + " картинок — движок подставит лес: " + head(noBg));
            }
            return out;
        }

        private static String head(List<String> list) {
            return String.join(", ", list.subList(0, Math.min(LIST_IN_WARNING, list.size())))
                    + (list.size() > LIST_IN_WARNING ? "…" : "");
        }
    }
}
```

- [ ] **Step 6: Тесты зелёные**

Run: `./gradlew test --tests '*PrepositionsHtmlParserTest'`
Expected: PASS (`realPrototype` пропущен).

- [ ] **Step 7: Прогон на настоящем прототипе и хэш движка**

Run (Git Bash): `PREPOSITIONS_HTML="C:/Users/nural/Downloads/Prepositions World (11).html" ./gradlew test --tests '*PrepositionsHtmlParserTest.realPrototype'`
Expected: PASS, в выводе строка `prepositions.engine-sha=<64 hex> warnings=[…]`. Хэш записать — он нужен в Task 5.
Если упало на проверке — это ошибка в данных прототипа или в правиле: правило сверить с движком
(`prep.txt`), а не ослаблять под данные.

- [ ] **Step 8: Commit**

```bash
git add src/main/java/kz/education/server/modules/prepositions src/test/java/kz/education/server/modules/prepositions
git commit -m "feat(prepositions): разбор и проверка html-прототипа

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Таблица релизов, хранилище бандла, загрузка и чтение

**Files:**
- Create: `src/main/resources/db/migration/V393__Create_prepositions_releases.sql`
- Create: `modules/prepositions/model/PrepositionsRelease.java`
- Create: `modules/prepositions/repository/PrepositionsReleaseRepository.java`
- Create: `modules/prepositions/service/PrepositionsStorageService.java`
- Create: `modules/prepositions/service/PrepositionsUploadService.java`
- Create: `modules/prepositions/service/PrepositionsCatalogService.java`
- Create: `presentation/admin/prepositions/dto/PrepositionsReleaseResponse.java`, `PrepositionsUploadResponse.java`
- Test: `modules/prepositions/service/PrepositionsUploadServiceTest.java`, `PrepositionsCatalogServiceTest.java`

**Interfaces:**
- Consumes: `PrepositionsHtmlParser.parse`, `PracticeMediaStorage.list/put/delete/publicUrl` (Task 1, 3).
- Produces:
  ```java
  PrepositionsUploadService.upload(byte[] html, String fileName, Long uploadedBy): PrepositionsUploadResponse
  PrepositionsCatalogService.readBundle(): JsonNode            // 404 ResourceNotFoundException до первой загрузки
  PrepositionsCatalogService.clearCache(), latest(): Optional<PrepositionsReleaseResponse>, history(): List<…>
  record PrepositionsReleaseResponse(Long id, String fileName, int lessonsCount, int questionsCount,
          int imagesCount, int audioCount, String engineSha, LocalDateTime createdAt)
  record PrepositionsUploadResponse(PrepositionsReleaseResponse release, int uploadedMedia, int reusedMedia,
          int removedMedia, boolean engineMatches, List<String> warnings)
  ```
  Бандл — `prepositions/current/bundle.json`: `{release, uploadedAt, course, pics, pcat, pdef, assets: {img, size, slots}, aud}`.

- [ ] **Step 1: Миграция**

```sql
-- Prepositions World (предлоги в «Практике»): материал — html-прототип, который админ загружает целиком. Курс лежит
-- JSON-файлом в MinIO (prepositions/current/bundle.json), картинки и записи — practice/prepositions/<sha24>.*;
-- здесь только мета загрузок. Существующих данных нет.
CREATE TABLE prepositions_releases (
    id BIGSERIAL PRIMARY KEY,
    file_name VARCHAR(512) NOT NULL,
    lessons_count INT NOT NULL DEFAULT 0,
    questions_count INT NOT NULL DEFAULT 0,
    images_count INT NOT NULL DEFAULT 0,
    audio_count INT NOT NULL DEFAULT 0,
    engine_sha VARCHAR(64) NOT NULL DEFAULT '',
    uploaded_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prepositions_releases_created ON prepositions_releases (created_at DESC);
```

- [ ] **Step 2: Модель, репозиторий, DTO**

```java
package kz.education.server.modules.prepositions.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/** Одна загрузка html-прототипа Prepositions World. Сам курс и медиа — в MinIO. */
@Entity
@Data
@Table(name = "prepositions_releases")
public class PrepositionsRelease {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_name", nullable = false, length = 512)
    private String fileName;

    @Column(name = "lessons_count", nullable = false)
    private int lessonsCount;

    @Column(name = "questions_count", nullable = false)
    private int questionsCount;

    @Column(name = "images_count", nullable = false)
    private int imagesCount;

    @Column(name = "audio_count", nullable = false)
    private int audioCount;

    @Column(name = "engine_sha", nullable = false, length = 64)
    private String engineSha = "";

    @Column(name = "uploaded_by")
    private Long uploadedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
```

```java
package kz.education.server.modules.prepositions.repository;

import kz.education.server.modules.prepositions.model.PrepositionsRelease;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PrepositionsReleaseRepository extends JpaRepository<PrepositionsRelease, Long> {

    Optional<PrepositionsRelease> findTopByOrderByCreatedAtDesc();

    List<PrepositionsRelease> findTop20ByOrderByCreatedAtDesc();
}
```

```java
package kz.education.server.presentation.admin.prepositions.dto;

import kz.education.server.modules.prepositions.model.PrepositionsRelease;

import java.time.LocalDateTime;

public record PrepositionsReleaseResponse(Long id, String fileName, int lessonsCount, int questionsCount,
                                          int imagesCount, int audioCount, String engineSha, LocalDateTime createdAt) {

    public static PrepositionsReleaseResponse of(PrepositionsRelease r) {
        return new PrepositionsReleaseResponse(r.getId(), r.getFileName(), r.getLessonsCount(), r.getQuestionsCount(),
                r.getImagesCount(), r.getAudioCount(), r.getEngineSha(), r.getCreatedAt());
    }
}
```

```java
package kz.education.server.presentation.admin.prepositions.dto;

import java.util.List;

/**
 * Итог загрузки для админа: релиз, сколько файлов залито, переиспользовано (тот же хэш) и удалено, совпал ли движок
 * с перенесённым на сайт, и предупреждения разбора.
 */
public record PrepositionsUploadResponse(PrepositionsReleaseResponse release, int uploadedMedia, int reusedMedia,
                                         int removedMedia, boolean engineMatches, List<String> warnings) {
}
```

- [ ] **Step 3: `PrepositionsStorageService`** — копия `ListenStorageService` только с `putJson`/`getBytes`

```java
package kz.education.server.modules.prepositions.service;

import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import kz.education.server.shared.exception.types.BadRequestException;
import kz.education.server.shared.util.FileTooLargeException;
import kz.education.server.shared.util.RemoteFileReader;
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

/**
 * bundle.json Prepositions World под {@code prepositions/current/} общего бакета. Ссылки наружу нет: у бакета нет
 * CORS, тело отдаёт бэкенд. {@code prepositions.storage=local} — тот же путь в папке {@code prepositions.dir},
 * только для разработки. Медиа сюда не входят — они в {@code PracticeMediaStorage}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PrepositionsStorageService {

    static final String PREFIX = "prepositions/current/";
    static final String BUNDLE = "bundle.json";
    private static final String JSON = "application/json; charset=utf-8";

    private final MinioClient minioClient;

    @Value("${s3.bucket:}")
    private String bucket;

    @Value("${prepositions.storage:minio}")
    private String mode = "minio";

    @Value("${prepositions.dir:.local/prepositions}")
    private String localDir = ".local/prepositions";

    // Бандл ~1 МБ; предел с запасом — чтобы чужой или битый объект не лёг в память целиком.
    @Value("${prepositions.max-file-bytes:16777216}")
    private long maxFileBytes = 16L * 1024 * 1024;

    public void putBundle(String json) {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        if (isLocal()) {
            writeLocal(bytes);
            return;
        }
        try {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(PREFIX + BUNDLE)
                    .contentType(JSON)
                    .stream(new ByteArrayInputStream(bytes), bytes.length, -1)
                    .build());
        } catch (Exception e) {
            log.error("Cannot store prepositions bundle", e);
            throw new BadRequestException("Не удалось сохранить курс Prepositions World");
        }
    }

    /** Нет файла, он больше предела или сбой хранилища — null: решает вызывающий. */
    public byte[] getBundle() {
        if (isLocal()) {
            try {
                Path file = localFile();
                return Files.isRegularFile(file) && Files.size(file) <= maxFileBytes ? Files.readAllBytes(file) : null;
            } catch (IOException e) {
                return null;
            }
        }
        try (InputStream in = minioClient.getObject(GetObjectArgs.builder().bucket(bucket).object(PREFIX + BUNDLE).build())) {
            return RemoteFileReader.readCapped(in, -1, maxFileBytes, PREFIX + BUNDLE);
        } catch (FileTooLargeException e) {
            log.error("Prepositions bundle over the limit, not served: {}", e.getMessage());
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isLocal() {
        return "local".equalsIgnoreCase(mode);
    }

    private Path localFile() {
        return Path.of(localDir).toAbsolutePath().normalize().resolve(BUNDLE);
    }

    private void writeLocal(byte[] bytes) {
        try {
            Path target = localFile();
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
            log.error("Cannot store local prepositions bundle", e);
            throw new BadRequestException("Не удалось сохранить курс Prepositions World");
        }
    }
}
```

Перед написанием сверить импорты `FileTooLargeException`/`RemoteFileReader` с `ListenStorageService` (`grep -n "^import" src/main/java/kz/education/server/modules/listen/service/ListenStorageService.java`) и взять те же пакеты.

- [ ] **Step 4: Падающий тест загрузки**

```java
package kz.education.server.modules.prepositions.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kz.education.server.modules.practice.PracticeMediaStorage;
import kz.education.server.modules.prepositions.model.PrepositionsRelease;
import kz.education.server.modules.prepositions.repository.PrepositionsReleaseRepository;
import kz.education.server.shared.exception.types.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PrepositionsUploadServiceTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private PrepositionsStorageService storage;
    private PracticeMediaStorage media;
    private PrepositionsReleaseRepository releases;
    private PrepositionsUploadService upload;
    private String sha;

    @BeforeEach
    void setUp() {
        storage = mock(PrepositionsStorageService.class);
        media = mock(PracticeMediaStorage.class);
        releases = mock(PrepositionsReleaseRepository.class);
        sha = PrepositionsHtmlParser.engineSha(PrepositionsTestHtml.page());
        upload = new PrepositionsUploadService(storage, media, releases, mapper, sha);
        when(media.publicUrl(eq("prepositions"), anyString()))
                .thenAnswer(c -> "https://files/development/practice/prepositions/" + c.getArgument(1));
        when(media.list("prepositions")).thenReturn(new HashSet<>());
        when(releases.save(any())).thenAnswer(c -> {
            PrepositionsRelease r = c.getArgument(0);
            r.setId(7L);
            return r;
        });
    }

    private byte[] html(Map<String, String> override) {
        return PrepositionsTestHtml.page(override).getBytes(StandardCharsets.UTF_8);
    }

    @Test
    void uploadsMediaByHashThenBundleWithUrls() throws Exception {
        var response = upload.upload(html(Map.of()), "Prepositions World.html", 3L);

        // WEBP встречается дважды (bg_street и dexter), MP3 — трижды: файлов уникальных — 3
        verify(media, times(3)).put(eq("prepositions"), anyString(), any());
        ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
        InOrder order = inOrder(releases, media, storage);
        order.verify(releases).save(any());
        order.verify(media, times(3)).put(eq("prepositions"), anyString(), any());
        order.verify(storage).putBundle(json.capture());

        JsonNode b = mapper.readTree(json.getValue());
        assertThat(b.path("release").asLong()).isEqualTo(7L);
        assertThat(b.path("course").path("cats").get(0).path("id").asText()).isEqualTo("place");
        assertThat(b.path("pdef").path("in").path("word").path("ru").asText()).isEqualTo("в");
        String bg = b.path("assets").path("img").path("bg_street").asText();
        assertThat(bg).startsWith("https://files/development/practice/prepositions/").endsWith(".webp");
        assertThat(b.path("assets").path("img").path("dexter").asText()).isEqualTo(bg);
        assertThat(b.path("assets").path("size").path("p_box").get(1).asInt()).isEqualTo(80);
        assertThat(b.path("aud").path("a12fe6b1").asText()).endsWith(".mp3");
        assertThat(json.getValue()).doesNotContain("base64");

        assertThat(response.release().id()).isEqualTo(7L);
        assertThat(response.release().questionsCount()).isEqualTo(4);
        assertThat(response.release().imagesCount()).isEqualTo(3);
        assertThat(response.release().audioCount()).isEqualTo(3);
        assertThat(response.uploadedMedia()).isEqualTo(3);
        assertThat(response.reusedMedia()).isZero();
        assertThat(response.engineMatches()).isTrue();
        assertThat(response.warnings()).anySatisfy(w -> assertThat(w).contains("Нет записи"));
    }

    @Test
    void sameFilesAreNotUploadedAgainAndStaleOnesGoLast() {
        Set<String> stored = new HashSet<>();
        stored.add(new PrepositionsBundle.Media(PrepositionsTestHtml.WEBP, "webp").name());
        stored.add("aaaaaaaaaaaaaaaaaaaaaaaa.webp");
        when(media.list("prepositions")).thenReturn(stored);

        var response = upload.upload(html(Map.of()), "a.html", 3L);

        verify(media, times(2)).put(eq("prepositions"), anyString(), any());
        InOrder order = inOrder(storage, media);
        order.verify(storage).putBundle(anyString());
        order.verify(media).delete("prepositions", "aaaaaaaaaaaaaaaaaaaaaaaa.webp");
        assertThat(response.reusedMedia()).isEqualTo(1);
        assertThat(response.removedMedia()).isEqualTo(1);
    }

    @Test
    void otherEngineIsAWarningNotAnError() {
        upload = new PrepositionsUploadService(storage, media, releases, mapper, "0".repeat(64));

        var response = upload.upload(html(Map.of()), "a.html", 3L);

        assertThat(response.engineMatches()).isFalse();
        assertThat(response.warnings()).anySatisfy(w -> assertThat(w).contains("Движок"));
        verify(storage).putBundle(anyString());
    }

    @Test
    void storageFailureDropsTheReleaseRow() {
        doThrow(new IllegalStateException("MinIO down")).when(media).put(eq("prepositions"), anyString(), any());

        assertThatThrownBy(() -> upload.upload(html(Map.of()), "a.html", 3L)).isInstanceOf(IllegalStateException.class);
        verify(releases).delete(any(PrepositionsRelease.class));
        verify(storage, never()).putBundle(anyString());
        verify(media, never()).delete(anyString(), anyString());
    }

    @Test
    void brokenFileWritesNothing() {
        assertThatThrownBy(() -> upload.upload(html(Map.of("course", "{\"cats\":[]}")), "a.html", 3L))
                .isInstanceOf(BadRequestException.class);
        verify(releases, never()).save(any());
        verify(media, never()).put(anyString(), anyString(), any());
    }

    @Test
    void emptyFileIsRejected() {
        assertThatThrownBy(() -> upload.upload(new byte[0], "a.html", 3L)).isInstanceOf(BadRequestException.class);
    }
}
```

- [ ] **Step 5: Запустить — падает**

Run: `./gradlew test --tests '*PrepositionsUploadServiceTest'`
Expected: FAIL — `PrepositionsUploadService` нет.

- [ ] **Step 6: `PrepositionsUploadService`**

```java
package kz.education.server.modules.prepositions.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import kz.education.server.modules.practice.PracticeMediaStorage;
import kz.education.server.modules.prepositions.model.PrepositionsRelease;
import kz.education.server.modules.prepositions.repository.PrepositionsReleaseRepository;
import kz.education.server.presentation.admin.prepositions.dto.PrepositionsReleaseResponse;
import kz.education.server.presentation.admin.prepositions.dto.PrepositionsUploadResponse;
import kz.education.server.shared.exception.types.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Загрузка прототипа: разбор → строка релиза (её номер едет в бандл) → медиа, которых ещё нет → bundle.json →
 * уборка медиа, на которые новый бандл не ссылается. Без общей транзакции: сотни файлов в MinIO держали бы
 * соединение с базой минутами (так было у пилота Аудирования). Сбой медиа или бандла удаляет строку релиза —
 * в истории не остаётся загрузки, которой ученик не получил.
 */
@Slf4j
@Service
public class PrepositionsUploadService {

    static final String SECTION = "prepositions";
    private static final String DEFAULT_FILE_NAME = "Prepositions World.html";

    private final PrepositionsStorageService storage;
    private final PracticeMediaStorage media;
    private final PrepositionsReleaseRepository releases;
    private final ObjectMapper objectMapper;
    /** Хэш движка, перенесённого на сайт (jts-web-app src/practice/prepositions/engine.js). Пусто — не сверяем. */
    private final String siteEngineSha;

    public PrepositionsUploadService(PrepositionsStorageService storage, PracticeMediaStorage media,
                                     PrepositionsReleaseRepository releases, ObjectMapper objectMapper,
                                     @Value("${prepositions.engine-sha:}") String siteEngineSha) {
        this.storage = storage;
        this.media = media;
        this.releases = releases;
        this.objectMapper = objectMapper;
        this.siteEngineSha = siteEngineSha == null ? "" : siteEngineSha.trim();
    }

    public PrepositionsUploadResponse upload(byte[] htmlBytes, String fileName, Long uploadedBy) {
        if (htmlBytes == null || htmlBytes.length == 0) {
            throw new BadRequestException("Пустой файл Prepositions World");
        }
        PrepositionsBundle bundle = PrepositionsHtmlParser.parse(new String(htmlBytes, StandardCharsets.UTF_8));
        boolean engineMatches = siteEngineSha.isEmpty() || siteEngineSha.equals(bundle.engineSha());
        List<String> warnings = new ArrayList<>(bundle.warnings());
        if (!engineMatches) {
            warnings.add(0, "Движок в файле отличается от перенесённого на сайт: правки данных применятся, правки "
                    + "движка (схемы, сцены, логика) — нет, для них нужен PR сайта.");
        }

        PrepositionsRelease release = releases.save(newRelease(bundle, fileName, uploadedBy));
        Set<String> stored;
        Set<String> referenced = new HashSet<>();
        int uploaded = 0;
        int reused = 0;
        try {
            stored = media.list(SECTION);
            for (PrepositionsBundle.Media m : allMedia(bundle)) {
                String name = m.name();
                if (!referenced.add(name)) {
                    continue;
                }
                if (stored.contains(name)) {
                    reused++;
                } else {
                    media.put(SECTION, name, m.bytes());
                    uploaded++;
                }
            }
            storage.putBundle(write(bundleJson(bundle, release)));
        } catch (RuntimeException e) {
            releases.delete(release);
            throw e;
        }

        int removed = 0;
        for (String name : stored) {
            if (referenced.contains(name)) {
                continue;
            }
            try {
                media.delete(SECTION, name);
                removed++;
            } catch (RuntimeException e) {
                // Мусор в бакете ученику не мешает — загрузку из-за него не роняем.
                log.warn("Cannot remove stale prepositions media {}", name, e);
            }
        }
        return new PrepositionsUploadResponse(PrepositionsReleaseResponse.of(release), uploaded, reused, removed,
                engineMatches, warnings);
    }

    private static List<PrepositionsBundle.Media> allMedia(PrepositionsBundle b) {
        List<PrepositionsBundle.Media> all = new ArrayList<>(b.images().values());
        all.addAll(b.audio().values());
        return all;
    }

    private PrepositionsRelease newRelease(PrepositionsBundle b, String fileName, Long uploadedBy) {
        PrepositionsRelease r = new PrepositionsRelease();
        r.setFileName(fileName == null || fileName.isBlank() ? DEFAULT_FILE_NAME : fileName);
        r.setLessonsCount(b.lessons());
        r.setQuestionsCount(b.questions());
        r.setImagesCount(b.images().size());
        r.setAudioCount(b.audio().size());
        r.setEngineSha(b.engineSha());
        r.setUploadedBy(uploadedBy);
        return r;
    }

    /** Форма — как у данных прототипа, только data-URI заменены ссылками: движок сайта читает её как есть. */
    private ObjectNode bundleJson(PrepositionsBundle b, PrepositionsRelease release) {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("release", release.getId());
        LocalDateTime at = release.getCreatedAt() == null ? LocalDateTime.now() : release.getCreatedAt();
        root.put("uploadedAt", at.toString());
        root.set("course", b.course());
        root.set("pics", b.pics());
        root.set("pcat", b.pcat());
        root.set("pdef", b.pdef());
        ObjectNode assets = root.putObject("assets");
        ObjectNode img = assets.putObject("img");
        b.images().forEach((key, m) -> img.put(key, media.publicUrl(SECTION, m.name())));
        assets.set("size", b.assetSize());
        assets.set("slots", b.assetSlots());
        ObjectNode aud = root.putObject("aud");
        b.audio().forEach((key, m) -> aud.put(key, media.publicUrl(SECTION, m.name())));
        return root;
    }

    private String write(ObjectNode node) {
        try {
            return objectMapper.writeValueAsString(node);
        } catch (Exception e) {
            throw new BadRequestException("Не удалось сериализовать Prepositions World");
        }
    }
}
```

- [ ] **Step 7: Тест загрузки зелёный**

Run: `./gradlew test --tests '*PrepositionsUploadServiceTest'`
Expected: PASS.

- [ ] **Step 8: Падающий тест чтения**

```java
package kz.education.server.modules.prepositions.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import kz.education.server.modules.prepositions.repository.PrepositionsReleaseRepository;
import kz.education.server.shared.exception.types.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PrepositionsCatalogServiceTest {

    private PrepositionsStorageService storage;
    private PrepositionsCatalogService catalog;

    @BeforeEach
    void setUp() {
        storage = mock(PrepositionsStorageService.class);
        catalog = new PrepositionsCatalogService(storage, mock(PrepositionsReleaseRepository.class), new ObjectMapper());
    }

    @Test
    void bundleIsReadOnceUntilCacheIsCleared() {
        when(storage.getBundle()).thenReturn("{\"release\":3}".getBytes(StandardCharsets.UTF_8));

        assertThat(catalog.readBundle().path("release").asInt()).isEqualTo(3);
        catalog.readBundle();
        verify(storage, times(1)).getBundle();

        catalog.clearCache();
        catalog.readBundle();
        verify(storage, times(2)).getBundle();
    }

    @Test
    void notUploadedIs404() {
        when(storage.getBundle()).thenReturn(null);
        assertThatThrownBy(() -> catalog.readBundle())
                .isInstanceOf(ResourceNotFoundException.class).hasMessageContaining("ещё не загружен");
    }
}
```

- [ ] **Step 9: `PrepositionsCatalogService`**

```java
package kz.education.server.modules.prepositions.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kz.education.server.modules.prepositions.repository.PrepositionsReleaseRepository;
import kz.education.server.presentation.admin.prepositions.dto.PrepositionsReleaseResponse;
import kz.education.server.shared.exception.types.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Курс Prepositions World для ученика. Копия бандла держится в памяти до следующей загрузки: иначе каждый заход в
 * раздел — мегабайт из MinIO.
 */
@Service
@RequiredArgsConstructor
public class PrepositionsCatalogService {

    private static final String NOT_UPLOADED = "Prepositions World ещё не загружен";

    private final PrepositionsStorageService storage;
    private final PrepositionsReleaseRepository releases;
    private final ObjectMapper objectMapper;

    private final AtomicReference<JsonNode> cache = new AtomicReference<>();

    public JsonNode readBundle() {
        JsonNode cached = cache.get();
        if (cached != null) {
            return cached;
        }
        byte[] bytes = storage.getBundle();
        if (bytes == null || bytes.length == 0) {
            throw new ResourceNotFoundException(NOT_UPLOADED);
        }
        try {
            JsonNode node = objectMapper.readTree(new String(bytes, StandardCharsets.UTF_8));
            cache.set(node);
            return node;
        } catch (Exception e) {
            throw new ResourceNotFoundException("Не удалось прочитать курс Prepositions World");
        }
    }

    public void clearCache() {
        cache.set(null);
    }

    @Transactional(readOnly = true)
    public Optional<PrepositionsReleaseResponse> latest() {
        return releases.findTopByOrderByCreatedAtDesc().map(PrepositionsReleaseResponse::of);
    }

    @Transactional(readOnly = true)
    public List<PrepositionsReleaseResponse> history() {
        return releases.findTop20ByOrderByCreatedAtDesc().stream().map(PrepositionsReleaseResponse::of).toList();
    }
}
```

- [ ] **Step 10: Все тесты модуля зелёные**

Run: `./gradlew test --tests '*Prepositions*Test'`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/main/resources/db/migration/V393__Create_prepositions_releases.sql src/main/java/kz/education/server/modules/prepositions src/main/java/kz/education/server/presentation/admin/prepositions src/test/java/kz/education/server/modules/prepositions
git commit -m "feat(prepositions): загрузка в MinIO и чтение бандла

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Ручки, настройка хэша движка, документ

**Files:**
- Create: `presentation/admin/prepositions/controller/AdminPrepositionsController.java`
- Create: `presentation/mobile/prepositions/controller/MobilePrepositionsController.java`
- Modify: `src/main/resources/application.yml` (блок `prepositions:`)
- Create: `docs/practice/PREPOSITIONS.md`
- Test: `presentation/prepositions/PrepositionsControllersTest.java`

**Interfaces:**
- Consumes: `PrepositionsUploadService.upload`, `PrepositionsCatalogService.*` (Task 4), `SecurityUtils.userId()`.
- Produces: `GET /admin/prepositions` → `{release, history}`; `POST /admin/prepositions/upload` (multipart `file`)
  → `PrepositionsUploadResponse`; `GET /mobile/prepositions` → бандл (Bearer; 404 до первой загрузки).

- [ ] **Step 1: Падающий тест ручек**

```java
package kz.education.server.presentation.prepositions;

import com.fasterxml.jackson.databind.ObjectMapper;
import kz.education.server.modules.prepositions.service.PrepositionsCatalogService;
import kz.education.server.modules.prepositions.service.PrepositionsUploadService;
import kz.education.server.presentation.admin.prepositions.controller.AdminPrepositionsController;
import kz.education.server.presentation.admin.prepositions.dto.PrepositionsReleaseResponse;
import kz.education.server.presentation.admin.prepositions.dto.PrepositionsUploadResponse;
import kz.education.server.presentation.mobile.prepositions.controller.MobilePrepositionsController;
import kz.education.server.shared.exception.types.BadRequestException;
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

class PrepositionsControllersTest {

    private PrepositionsUploadService uploadService;
    private PrepositionsCatalogService catalog;
    private SecurityUtils security;
    private AdminPrepositionsController admin;

    @BeforeEach
    void setUp() {
        uploadService = mock(PrepositionsUploadService.class);
        catalog = mock(PrepositionsCatalogService.class);
        security = mock(SecurityUtils.class);
        admin = new AdminPrepositionsController(uploadService, catalog, security);
    }

    @Test
    void adminEndpointsAreAdminOnly() {
        PreAuthorize rule = AdminPrepositionsController.class.getAnnotation(PreAuthorize.class);
        assertThat(rule).isNotNull();
        assertThat(rule.value()).isEqualTo("hasRole('ADMIN')");
    }

    @Test
    void uploadPassesUserAndClearsCacheAfterwards() {
        when(security.userId()).thenReturn(7L);
        var release = new PrepositionsReleaseResponse(1L, "p.html", 31, 472, 266, 502, "x", null);
        when(uploadService.upload(any(), eq("p.html"), eq(7L)))
                .thenReturn(new PrepositionsUploadResponse(release, 768, 0, 0, true, List.of()));

        var body = admin.upload(new MockMultipartFile("file", "p.html", "text/html", new byte[]{1}));

        assertThat(body.release().questionsCount()).isEqualTo(472);
        InOrder order = inOrder(uploadService, catalog);
        order.verify(uploadService).upload(any(), eq("p.html"), eq(7L));
        order.verify(catalog).clearCache();
    }

    @Test
    void nonHtmlFileIsRejectedBeforeParsing() {
        var file = new MockMultipartFile("file", "p.zip", "application/zip", new byte[]{1});
        assertThatThrownBy(() -> admin.upload(file)).isInstanceOf(BadRequestException.class);
        verify(uploadService, never()).upload(any(), any(), any());
    }

    @Test
    void latestWithoutUploads() {
        when(catalog.latest()).thenReturn(Optional.empty());
        when(catalog.history()).thenReturn(List.of());
        var body = admin.latest();
        assertThat(body.get("release")).isNull();
        assertThat((List<?>) body.get("history")).isEmpty();
    }

    @Test
    void mobileReturnsTheBundle() {
        when(catalog.readBundle()).thenReturn(new ObjectMapper().createObjectNode().put("release", 4));
        assertThat(new MobilePrepositionsController(catalog).bundle().path("release").asInt()).isEqualTo(4);
    }
}
```

- [ ] **Step 2: Запустить — падает**

Run: `./gradlew test --tests '*PrepositionsControllersTest'`
Expected: FAIL — контроллеров нет.

- [ ] **Step 3: Контроллеры**

```java
package kz.education.server.presentation.admin.prepositions.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import kz.education.server.modules.prepositions.service.PrepositionsCatalogService;
import kz.education.server.modules.prepositions.service.PrepositionsUploadService;
import kz.education.server.presentation.admin.prepositions.dto.PrepositionsUploadResponse;
import kz.education.server.shared.exception.types.BadRequestException;
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
@RequestMapping("/admin/prepositions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin Prepositions World", description = "Upload the Prepositions World prototype HTML")
public class AdminPrepositionsController {

    /** Прототип весит ~23 МБ; предел — чтобы чужой гигабайт не читался в память ради отказа. */
    static final long MAX_HTML_BYTES = 64L * 1024 * 1024;

    private final PrepositionsUploadService uploadService;
    private final PrepositionsCatalogService catalogService;
    private final SecurityUtils securityUtils;

    @GetMapping
    @Operation(summary = "Current release and the last 20 uploads")
    public Map<String, Object> latest() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("release", catalogService.latest().orElse(null));
        body.put("history", catalogService.history());
        return body;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Parse the Prepositions World HTML, store media in MinIO, replace the live course")
    public PrepositionsUploadResponse upload(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Выберите html-файл Prepositions World");
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String lower = name.toLowerCase();
        if (!lower.endsWith(".html") && !lower.endsWith(".htm")) {
            throw new BadRequestException("Нужен html-файл прототипа (.html)");
        }
        if (file.getSize() > MAX_HTML_BYTES) {
            throw new BadRequestException("Файл больше " + MAX_HTML_BYTES / 1024 / 1024 + " МБ");
        }
        try {
            PrepositionsUploadResponse response = uploadService.upload(file.getBytes(), name, securityUtils.userId());
            // Новый курс не должен прятаться за копией прошлой загрузки в памяти.
            catalogService.clearCache();
            return response;
        } catch (IOException e) {
            throw new BadRequestException("Не удалось прочитать загруженный файл: " + e.getMessage());
        }
    }
}
```

```java
package kz.education.server.presentation.mobile.prepositions.controller;

import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import kz.education.server.modules.prepositions.service.PrepositionsCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/mobile/prepositions")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Prepositions World", description = "Prepositions course: lessons, practice, scenes, media links")
public class MobilePrepositionsController {

    private final PrepositionsCatalogService catalogService;

    @GetMapping
    @Operation(summary = "Whole course in the prototype's data shape, media as MinIO links")
    public JsonNode bundle() {
        return catalogService.readBundle();
    }
}
```

- [ ] **Step 4: Тесты ручек зелёные**

Run: `./gradlew test --tests '*PrepositionsControllersTest'`
Expected: PASS.

- [ ] **Step 5: `application.yml`**

Добавить блок рядом с прочими настройками разделов (верхний уровень файла), подставив хэш из Task 3 Step 7:

```yaml
# Prepositions World (modules/prepositions): хэш движка, перенесённого на сайт (jts-web-app
# src/practice/prepositions/engine.js). Загрузка с другим движком проходит с предупреждением: данные применятся,
# правки движка — только PR сайта. Перенесли движок заново — обновить значение (печатает
# PrepositionsHtmlParserTest#realPrototype).
prepositions:
  engine-sha: ${PREPOSITIONS_ENGINE_SHA:<хэш из Task 3 Step 7>}
```

- [ ] **Step 6: `docs/practice/PREPOSITIONS.md`**

```markdown
# Prepositions World — формат и поток

Материал раздела «Предлоги» «Практики» — html-прототип методиста (~23 МБ). Админ загружает его целиком
в web-admin «Практика и тесты» → Prepositions World (`POST /admin/prepositions/upload`, только ADMIN).

## Что читается из файла

- `<script type="application/json" id="course|pics|pcat|assets|aud">` — JSON как есть;
- `const PDEF = {…}` в скрипте движка — толкования предлогов (`JsLiterals`);
- хэш движка — sha256 текста скриптов без JSON-блоков и без литерала `PDEF`, переводы строк `\n`.
  Не совпал с `prepositions.engine-sha` — предупреждение: правки движка на сайт попадают только PR сайта.

## Проверки (ошибка отклоняет всю загрузку)

Нет блока или `PDEF`, блок не JSON; категория/урок без `id`, повтор id урока, нет `screens`/`practice`;
неизвестный тип вопроса; ответ вне вариантов (gap/fix/dialogue), `ans` compare — не номер варианта,
ответ пропуска passage вне его вариантов; у не-scene вопроса нет `pics[<кат>/<урок>/<i>]` или
`pics[<кат>/int/<i>]`; проп `p` без картинки `p_<p>`; картинка не webp, запись не mp3, файл > 20 МБ.

Предупреждения: вопрос без записи (ключ — FNV-1a полного предложения, как `audKeys` движка), сцена без
фона `bg_<bg>`, другой движок.

## Что пишется

1. строка `prepositions_releases` (мета);
2. медиа `practice/prepositions/<sha24>.webp|mp3` (`PracticeMediaStorage`, `immutable`), только новых;
3. `prepositions/current/bundle.json` — `{release, uploadedAt, course, pics, pcat, pdef, assets: {img, size,
   slots}, aud}`, форма прототипа, data-URI заменены публичными ссылками бакета;
4. удаляются медиа раздела, на которые новый бандл не ссылается.

Сбой на 2–3 удаляет строку релиза.

## Ученику

`GET /mobile/prepositions` (Bearer) — бандл телом (у бакета нет CORS), кэш в памяти до следующей загрузки.
До первой загрузки — 404 «Prepositions World ещё не загружен».
```

- [ ] **Step 7: Полный прогон модуля и соседей**

Run: `./gradlew test --tests '*Prepositions*Test' --tests '*PracticeMedia*Test' --tests '*Listen*Test' --tests '*Listening*Test'`
Expected: PASS.

Run: `./gradlew bootJar -x test`
Expected: BUILD SUCCESS.

- [ ] **Step 8: Commit**

```bash
git add src/main/java/kz/education/server/presentation src/test/java/kz/education/server/presentation/prepositions src/main/resources/application.yml docs/practice/PREPOSITIONS.md
git commit -m "feat(prepositions): ручки /admin/prepositions и /mobile/prepositions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: PR

- [ ] **Step 1:** сверить номер миграции с `origin/develop` (Global Constraints), при занятом — переименовать файл и закоммитить.
- [ ] **Step 2:** `git push -u origin feat/prepositions-world`, PR в `develop` (`gh pr create --repo jtsapp/backend --base develop`):
  что сделано, формат (ссылка на `docs/practice/PREPOSITIONS.md`), миграция V393, как проверить
  (`realPrototype` с `PREPOSITIONS_HTML`), что заливку на дев делает владелец. Подпись PR — по правилам сессии.
