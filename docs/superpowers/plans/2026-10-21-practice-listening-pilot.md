# Пилот «Аудирование → админка» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Задания «Практика → Аудирование» (800 заданий, 797 mp3) хранятся на бэкенде (таблица + MinIO), заливаются пакетом через web-admin и отдаются сайту по открытой ручке; сайт читает их с бэкенда, а пока на стенде пусто — со старой статики.

**Architecture:** Бэкенд: общий для будущих разделов слой медиа Практики (`modules/practice`: имя файла = sha256-24 содержимого, `Cache-Control: immutable`) и раздел `modules/practice/listening` (таблица, правила, импорт/diff/выгрузка пакета, открытая ручка `/practice-content/listening/**`). Админка: общий модуль пакета (`jts-practice-pack`, fflate) и вкладка «Библиотека → Аудирование». Сайт: загрузчик «бэкенд, иначе статика», сборщик пакета из `public/`, очистка разметки разбора.

**Tech Stack:** Spring Boot 3 + JPA + Flyway + MinIO 8 (backend, Java 21, JUnit 5/AssertJ/Mockito, H2 в тестах); Angular 17 standalone + Material + fflate (web-admin, Karma/Jasmine); Next.js SPA на JS + vitest + Playwright (jts-web-app).

Спека: `docs/superpowers/specs/2026-10-21-practice-content-to-admin-design.md` (ветка `docs/practice-content-to-admin`).

## Global Constraints

- id задания не меняется: `a1_001`; префикс id = уровень (`getListeningDone` отбирает по `<уровень>_`).
- Уровни Аудирования: `a1`, `a2`, `b1`, `b2`, `c1`.
- Разметка в текстах заданий — только `<b>`, `</b>`, `<i>`, `</i>` без атрибутов.
- Медиа: ключ MinIO `practice/<раздел>/<sha24>.mp3`, `Cache-Control: public, max-age=31536000, immutable`, предел 20 МБ.
- Публичные ручки без входа: `GET /practice-content/listening/levels`, `GET /practice-content/listening/{level}`, `Cache-Control: public, max-age=300`.
- Админ-ручки — только `ADMIN` (`/admin/**`).
- Формат пакета: zip с `manifest.json` (`format: "jts-practice-pack"`, `version: 1`, `section`), `items.json` (массив), `media/<sha24>.<ext>`.
- Сайт до чистки: бэкенд → при 404 / пустом списке / не-массиве / 5xx / ошибке сети / таймауте 8 с — статика `/practice/...`.
- Код IELTS не трогать (раздел заморожен владельцем) — подход пакетов копируется, файлы IELTS не правятся.
- jts-web-app — только JS (.js/.jsx), не TS. Комментарии — по-русски и объясняют «почему».
- Номер миграции Flyway выбирается в момент мержа: на 21.10.2026 последняя в `origin/develop` — V386; перед мержем проверить, не занят ли номер.
- Каждый репо — своя ветка от `origin/develop` и свой PR в `develop`. Порядок мержа: backend → web-admin → jts-web-app. В прод (develop → main) бэкенд едет первым.
- Рабочие деревья `backend` и `web-admin` на диске отстают на сотни коммитов — работать ТОЛЬКО в новых worktree от `origin/develop`. Worktree бэкенда — в `C:\Users\nural\Desktop\`, не внутри `jts-web-app/.claude/worktrees` (там хук режет Edit).
- vitest в jts-web-app запускать с явными путями файлов: без путей он подбирает тесты соседних worktree.
- Коммиты оканчиваются строкой `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, описания PR — строкой `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

### Отступления от спеки (решено при планировании)

- `body` — `TEXT` с JSON, а не `jsonb`: как у `shadowing_lessons`, тесты сервиса идут на H2.
- Вместо `audio_url` + `audio_sha` хранится одно `audio_name` (`<sha24>.mp3`), URL собирается при чтении: стенды и домен файлов разные, сохранённый URL устарел бы.
- Проверка медиа — пакетом: `POST /admin/practice/media/{section}/exists` со списком имён (797 файлов одним запросом), а не по одному.
- Колонки `task_type` и `order_index`, а не `type` и `position`: ключевые слова SQL в H2.
- Выгрузка пакета отдаёт только активные задания: выключенное на деве — брак, на прод его не везём.

---

## Подготовка

### Task 0: Рабочие деревья

**Files:** нет (только git и npm).

- [ ] **Step 1: Проверить место на диске** (на 09.10.2026 диск C забивался worktree)

Run: `df -h /c | tail -1`
Expected: свободно ≥ 6 ГБ. Меньше — остановиться и сказать владельцу.

- [ ] **Step 2: Backend worktree**

```bash
git -C /c/Users/nural/Desktop/backend fetch origin
git -C /c/Users/nural/Desktop/backend worktree add /c/Users/nural/Desktop/backend-practice-listening -b feat/practice-listening origin/develop
```

- [ ] **Step 3: web-admin worktree + зависимости**

```bash
git -C /c/Users/nural/Desktop/web-admin fetch origin
git -C /c/Users/nural/Desktop/web-admin worktree add /c/Users/nural/Desktop/web-admin-practice-listening -b feat/practice-listening origin/develop
cd /c/Users/nural/Desktop/web-admin-practice-listening && npm ci
```

- [ ] **Step 4: jts-web-app worktree + зависимости**

```bash
git -C /c/Users/nural/Desktop/jts-web-app fetch origin
git -C /c/Users/nural/Desktop/jts-web-app worktree add /c/Users/nural/Desktop/jts-practice-listening -b feat/practice-listening-remote origin/develop
cd /c/Users/nural/Desktop/jts-practice-listening && npm ci
```

- [ ] **Step 5: Базовый прогон тестов, которые план трогает** (чтобы отличать свои падения от чужих)

```bash
cd /c/Users/nural/Desktop/backend-practice-listening && ./gradlew test --tests 'kz.education.server.modules.shadowing.*'
cd /c/Users/nural/Desktop/jts-practice-listening && npx vitest run src/screens/ListeningPage.test.jsx src/app/api/practice/catalog/route.test.js
```

Expected: оба зелёные. Красное — записать в отчёт как исходное состояние, не чинить.

---

## Часть A — backend (`C:\Users\nural\Desktop\backend-practice-listening`)

Префикс путей: `J=src/main/java/kz/education/server`, `T=src/test/java/kz/education/server`.

### Task A1: Медиа Практики в MinIO

**Files:**
- Create: `$J/modules/practice/PracticeMediaNames.java`
- Create: `$J/modules/practice/PracticeMediaStorage.java`
- Create: `$J/modules/practice/PracticeMediaService.java`
- Test: `$T/modules/practice/PracticeMediaServiceTest.java`

**Interfaces:**
- Produces: `PracticeMediaNames.section(String) → String` (400 на неизвестный раздел), `valid(String) → boolean`, `safe(String) → String`, `sniff(byte[]) → String|null`, `hash(byte[]) → String` (24 hex), `contentTypeOf(String) → String`.
- Produces: `PracticeMediaStorage.put(String section, String name, byte[] bytes)`, `exists(section, name) → boolean`, `download(section, name) → Optional<byte[]>`, `publicUrl(section, name) → String`.
- Produces: `PracticeMediaService.upload(String section, MultipartFile file, String expectedName) → Uploaded(name, url, sizeBytes, existed)`, `existing(String section, Collection<String> names) → List<String>`, `download(section, name) → Optional<byte[]>`, `publicUrl(section, name) → String`.

- [ ] **Step 1: Написать падающий тест**

`$T/modules/practice/PracticeMediaServiceTest.java`:

```java
package kz.education.server.modules.practice;

import kz.education.server.shared.exception.types.BadRequestException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("Медиа Практики: имя — хэш содержимого, только mp3, тот же файл не дублируется")
class PracticeMediaServiceTest {

    /** Минимальный mp3: заголовок ID3 и немного байтов — распознаётся по сигнатуре. */
    private static final byte[] MP3 = {'I', 'D', '3', 3, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6};

    private final PracticeMediaStorage storage = mock(PracticeMediaStorage.class);
    private final PracticeMediaService service = new PracticeMediaService(storage);

    private static MockMultipartFile file(byte[] bytes) {
        return new MockMultipartFile("file", "clip.mp3", "audio/mpeg", bytes);
    }

    @Test
    @DisplayName("новый mp3 кладётся под именем-хэшем")
    void uploadsNew() {
        when(storage.exists(eq("listening"), anyString())).thenReturn(false);
        when(storage.publicUrl(eq("listening"), anyString())).thenAnswer(inv -> "https://files.test/b/practice/listening/" + inv.getArgument(1));

        PracticeMediaService.Uploaded up = service.upload("listening", file(MP3), null);

        assertThat(up.name()).isEqualTo(PracticeMediaNames.hash(MP3) + ".mp3").matches("^[a-f0-9]{24}\\.mp3$");
        assertThat(up.existed()).isFalse();
        assertThat(up.url()).endsWith("/practice/listening/" + up.name());
        verify(storage).put("listening", up.name(), MP3);
    }

    @Test
    @DisplayName("тот же файл второй раз не грузится")
    void skipsExisting() {
        when(storage.exists(eq("listening"), anyString())).thenReturn(true);

        assertThat(service.upload("listening", file(MP3), null).existed()).isTrue();
        verify(storage, never()).put(anyString(), anyString(), any());
    }

    @Test
    @DisplayName("не mp3 — отказ")
    void rejectsNotMp3() {
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 0, 0, 0, 0, 0, 0, 0, 0};
        assertThatThrownBy(() -> service.upload("listening", file(png), null))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("mp3");
    }

    @Test
    @DisplayName("содержимое не совпало с ожидаемым именем — файл испорчен, не кладём")
    void rejectsHashMismatch() {
        assertThatThrownBy(() -> service.upload("listening", file(MP3), "000000000000000000000000.mp3"))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("повреждён");
        verify(storage, never()).put(anyString(), anyString(), any());
    }

    @Test
    @DisplayName("неизвестный раздел — отказ: префикс ключа в бакете собирается из него")
    void rejectsUnknownSection() {
        assertThatThrownBy(() -> service.upload("../ielts", file(MP3), null)).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("existing: только валидные имена, без повторов")
    void existingFilters() {
        String ok = PracticeMediaNames.hash(MP3) + ".mp3";
        when(storage.exists("listening", ok)).thenReturn(true);

        assertThat(service.existing("listening", List.of(ok, ok, "../x.mp3", "abc.mp3"))).containsExactly(ok);
    }
}
```

- [ ] **Step 2: Запустить — должен упасть**

Run: `./gradlew test --tests 'kz.education.server.modules.practice.PracticeMediaServiceTest'`
Expected: FAIL компиляции — `PracticeMediaService` не найден.

- [ ] **Step 3: Реализация**

`$J/modules/practice/PracticeMediaNames.java`:

```java
package kz.education.server.modules.practice;

import kz.education.server.shared.exception.types.BadRequestException;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Имена и типы медиа разделов «Практики» (docs/practice/PACK_FORMAT.md). Имя — первые 24 hex sha256 содержимого и
 * расширение по сигнатуре: тот же файл всегда получает то же имя (повторная заливка пакета ничего не грузит), а под
 * этим именем никогда не окажется другой файл — поэтому объектам можно ставить кэш навсегда.
 */
public final class PracticeMediaNames {

    private PracticeMediaNames() {
    }

    /**
     * Разделы, которым открыта заливка. Белый список, а не любая строка: из раздела собирается префикс ключа в общем
     * бакете, и «../ielts» не должен дотянуться до чужих файлов. Новый раздел — новая строка здесь.
     */
    public static final Set<String> SECTIONS = Set.of("listening");

    private static final Pattern NAME = Pattern.compile("^[a-f0-9]{24}\\.mp3$");

    public static final Map<String, String> CONTENT_TYPE = Map.of("mp3", "audio/mpeg");

    public static String section(String section) {
        if (section == null || !SECTIONS.contains(section)) {
            throw new BadRequestException("Неизвестный раздел Практики: " + section);
        }
        return section;
    }

    public static boolean valid(String name) {
        return name != null && NAME.matcher(name).matches();
    }

    public static String safe(String name) {
        if (!valid(name)) throw new BadRequestException("Недопустимое имя медиа: " + name);
        return name;
    }

    /** Тип по первым байтам, а не по расширению и Content-Type браузера — их подделать проще всего. */
    public static String sniff(byte[] b) {
        if (b == null || b.length < 4) return null;
        if (b[0] == 'I' && b[1] == 'D' && b[2] == '3') return "mp3";
        if ((b[0] & 0xFF) == 0xFF && (b[1] & 0xE0) == 0xE0) return "mp3";
        return null;
    }

    public static String hash(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)).substring(0, 24);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    public static String contentTypeOf(String name) {
        return CONTENT_TYPE.get(name.substring(name.lastIndexOf('.') + 1));
    }
}
```

`$J/modules/practice/PracticeMediaStorage.java`:

```java
package kz.education.server.modules.practice;

import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.StatObjectArgs;
import io.minio.errors.ErrorResponseException;
import kz.education.server.shared.exception.types.BadRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.Map;
import java.util.Optional;

/**
 * Медиа «Практики» в MinIO под {@code practice/<раздел>/}. Бакет публичный на чтение (MediaConfiguration): сайт
 * ученика берёт запись тегом {@code <audio>} прямо из него, CORS для этого не нужен. Для выгрузки пакета админкой
 * (fetch) файл отдаёт бэкенд — {@link #download}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PracticeMediaStorage {

    static final String PREFIX = "practice/";
    /**
     * Правила кэша next.config.mjs на объекты MinIO не действуют, а без заголовка браузер перепроверял бы каждую запись.
     * Навсегда — безопасно: имя файла — хэш содержимого, другой файл под ним не ляжет.
     */
    static final String CACHE_IMMUTABLE = "public, max-age=31536000, immutable";

    private final MinioClient minioClient;

    @Value("${s3.bucket}")
    private String bucket;

    @Value("${s3.address}")
    private String endpoint;

    @Value("${s3.domain:}")
    private String publicBase;

    static String key(String section, String name) {
        return PREFIX + PracticeMediaNames.section(section) + "/" + PracticeMediaNames.safe(name);
    }

    public void put(String section, String name, byte[] bytes) {
        try {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(key(section, name))
                    .contentType(PracticeMediaNames.contentTypeOf(name))
                    .headers(Map.of("Cache-Control", CACHE_IMMUTABLE))
                    .stream(new ByteArrayInputStream(bytes), bytes.length, -1)
                    .build());
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Cannot store practice media {}/{}", section, name, e);
            throw new BadRequestException("Не удалось сохранить файл: " + name);
        }
    }

    public boolean exists(String section, String name) {
        try {
            minioClient.statObject(StatObjectArgs.builder().bucket(bucket).object(key(section, name)).build());
            return true;
        } catch (ErrorResponseException e) {
            // «нет объекта» — обычный ответ: файл загрузят. Остальное (нет доступа, нет бакета) — поломка, прятать её под
            // «нет файла» нельзя: заливка упала бы позже с безликим «не удалось сохранить».
            String code = e.errorResponse() == null ? null : e.errorResponse().code();
            if ("NoSuchKey".equals(code) || "NoSuchObject".equals(code)) return false;
            throw new IllegalStateException("Хранилище медиа ответило " + code + " на проверку " + name, e);
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Хранилище медиа недоступно: " + e.getMessage(), e);
        }
    }

    public Optional<byte[]> download(String section, String name) {
        try (InputStream in = minioClient.getObject(GetObjectArgs.builder().bucket(bucket).object(key(section, name)).build())) {
            return Optional.of(in.readAllBytes());
        } catch (ErrorResponseException e) {
            String code = e.errorResponse() == null ? null : e.errorResponse().code();
            if ("NoSuchKey".equals(code) || "NoSuchObject".equals(code)) return Optional.empty();
            throw new IllegalStateException("Хранилище медиа ответило " + code + " на чтение " + name, e);
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Хранилище медиа недоступно: " + e.getMessage(), e);
        }
    }

    public String publicUrl(String section, String name) {
        String base = publicBase == null || publicBase.isBlank() ? endpoint : publicBase;
        if (base.endsWith("/")) base = base.substring(0, base.length() - 1);
        return base + "/" + bucket + "/" + key(section, name);
    }
}
```

`$J/modules/practice/PracticeMediaService.java`:

```java
package kz.education.server.modules.practice;

import kz.education.server.shared.exception.types.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Заливка медиа разделов «Практики» из админки (пакетом — см. docs/practice/PACK_FORMAT.md). */
@Service
@RequiredArgsConstructor
public class PracticeMediaService {

    /** Самый длинный клип Аудирования — 1.4 МБ; двадцать — запас, а не приглашение заливать альбомы. */
    static final long MAX_BYTES = 20L * 1024 * 1024;
    /** Предел одной проверки: в пакете Аудирования ~800 файлов. */
    static final int MAX_EXISTS_CHECK = 5000;

    private final PracticeMediaStorage storage;

    public record Uploaded(String name, String url, long sizeBytes, boolean existed) {
    }

    /**
     * @param expectedName имя из пакета (хэш, посчитанный при сборке); не совпало с содержимым — файл испорчен при
     *                     копировании, и класть его под чужим именем нельзя
     */
    public Uploaded upload(String section, MultipartFile file, String expectedName) {
        PracticeMediaNames.section(section);
        if (file == null || file.isEmpty()) throw new BadRequestException("Файл не выбран");
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new BadRequestException("Не удалось прочитать файл");
        }
        if (bytes.length > MAX_BYTES) throw new BadRequestException("Файл больше " + MAX_BYTES / 1024 / 1024 + " МБ");
        String ext = PracticeMediaNames.sniff(bytes);
        if (ext == null) throw new BadRequestException("Поддерживается только mp3 — этот файл не mp3");
        String name = PracticeMediaNames.hash(bytes) + "." + ext;
        if (expectedName != null && !expectedName.isBlank() && !expectedName.equals(name)) {
            throw new BadRequestException("Файл повреждён: ожидали " + expectedName + ", а содержимое даёт " + name);
        }
        boolean existed = storage.exists(section, name);
        if (!existed) storage.put(section, name, bytes);
        return new Uploaded(name, storage.publicUrl(section, name), bytes.length, existed);
    }

    /** Какие из имён уже лежат в хранилище — заливка пакета грузит только остальные. */
    public List<String> existing(String section, Collection<String> names) {
        PracticeMediaNames.section(section);
        if (names == null) return List.of();
        if (names.size() > MAX_EXISTS_CHECK) throw new BadRequestException("Больше " + MAX_EXISTS_CHECK + " файлов за раз");
        return names.stream().distinct().filter(PracticeMediaNames::valid).filter(n -> storage.exists(section, n)).toList();
    }

    public Optional<byte[]> download(String section, String name) {
        PracticeMediaNames.section(section);
        return PracticeMediaNames.valid(name) ? storage.download(section, name) : Optional.empty();
    }

    public String publicUrl(String section, String name) {
        return storage.publicUrl(section, name);
    }
}
```

- [ ] **Step 4: Запустить — зелёный**

Run: `./gradlew test --tests 'kz.education.server.modules.practice.PracticeMediaServiceTest'`
Expected: PASS, 6 тестов.

- [ ] **Step 5: Коммит**

```bash
git add src/main/java/kz/education/server/modules/practice src/test/java/kz/education/server/modules/practice
git commit -m "$(printf 'feat(практика): медиа разделов Практики в MinIO по хэшу\n\nОбщий слой для переноса материалов Практики из public/ сайта:\nимя = sha256-24 содержимого, кэш immutable, белый список разделов.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

### Task A2: Таблица, сущность, правила пакета Аудирования

**Files:**
- Create: `src/main/resources/db/migration/V387__Practice_listening_tasks.sql` (номер перепроверить перед мержем)
- Create: `$J/modules/practice/listening/ListeningTask.java`
- Create: `$J/modules/practice/listening/ListeningTaskRepository.java`
- Create: `$J/modules/practice/listening/ListeningDtos.java`
- Create: `$J/modules/practice/listening/ListeningRules.java`
- Test: `$T/modules/practice/listening/ListeningRulesTest.java`

**Interfaces:**
- Produces: `ListeningDtos.LEVELS`, `PACK_FORMAT = "jts-practice-pack"`, `PACK_VERSION = 1`; records `PackItem(id, level, type, audio, explanation, prompt, options, answer, text, tokens, distractors)`, `PackBody(items)`, `Normalized(key, level, type, orderIndex, audioName, explanation, Map<String,Object> body)`, `PublicTask(id, type, audio, explanation, prompt, options, answer, text, tokens, distractors)`, `LevelCount(level, count)`, `AdminTask(id, level, type, orderIndex, audioUrl, explanation, body, active, updatedAt)`, `DiffResult(added, changed, unchanged, onlyInAdmin)`, `ImportResult(added, changed, unchanged)`, `ExportBundle(format, version, section, items, media)`.
- Produces: `ListeningRules.normalizeAll(List<PackItem>) → List<Normalized>` (400 со списком до 10 нарушений), `ListeningRules.markupAllowed(String) → boolean`.
- Produces: entity `ListeningTask` (поля `id, taskKey, level, taskType, orderIndex, audioName, explanation, body, isActive, createdAt, updatedAt`), repository-методы `findByIsActiveTrue()`, `findByLevelAndIsActiveTrueOrderByOrderIndexAscIdAsc(String)`, `findAllByOrderByLevelAscOrderIndexAscIdAsc()`, `findByLevelOrderByOrderIndexAscIdAsc(String)`, `findByTaskKey(String)`.

- [ ] **Step 1: Падающий тест правил**

`$T/modules/practice/listening/ListeningRulesTest.java`:

```java
package kz.education.server.modules.practice.listening;

import kz.education.server.modules.practice.listening.ListeningDtos.Normalized;
import kz.education.server.modules.practice.listening.ListeningDtos.PackItem;
import kz.education.server.shared.exception.types.BadRequestException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Аудирование: правила заданий пакета")
class ListeningRulesTest {

    static final String AUDIO = "media/0123456789abcdef01234567.mp3";

    static PackItem choice(String id, String level) {
        return new PackItem(id, level, "listen_choice", AUDIO, "Li is a <b>student</b>.", "Where is Li now?",
                List.of("In Shanghai", "In Beijing", "In Tokyo"), "In Shanghai", null, null, null);
    }

    static PackItem assemble(String id, String level) {
        // text — то, что звучит в записи; он длиннее плиток, и это норма (a1_007)
        return new PackItem(id, level, "listen_assemble", AUDIO, "", null, null, null,
                "No, he isn't Brazilian. He's Spanish.", List.of("No", "he", "isn't", "Brazilian"), List.of("Spanish"));
    }

    static PackItem typed(String id, String level) {
        return new PackItem(id, level, "listen_type", AUDIO, "<i>I'm from the</i> сливается.", null, null, "I'm from the UK",
                null, null, null);
    }

    @Test
    @DisplayName("три типа проходят; поля типа — в body; порядок считается внутри уровня")
    void validTypes() {
        List<Normalized> out = ListeningRules.normalizeAll(List.of(
                choice("a1_001", "a1"), assemble("a1_002", "a1"), typed("a2_001", "a2")));

        assertThat(out).extracting(Normalized::key).containsExactly("a1_001", "a1_002", "a2_001");
        assertThat(out).extracting(Normalized::orderIndex).containsExactly(0, 1, 0);
        assertThat(out.get(0).audioName()).isEqualTo("0123456789abcdef01234567.mp3");
        assertThat(out.get(0).body()).containsEntry("answer", "In Shanghai")
                .containsEntry("options", List.of("In Shanghai", "In Beijing", "In Tokyo"));
        assertThat(out.get(1).body()).containsOnlyKeys("text", "tokens", "distractors");
        assertThat(out.get(2).body()).isEqualTo(Map.of("answer", "I'm from the UK"));
    }

    @Test
    @DisplayName("префикс id обязан совпадать с уровнем: по нему считается «пройдено на уровне»")
    void keyPrefixMustMatchLevel() {
        assertThatThrownBy(() -> ListeningRules.normalizeAll(List.of(choice("a2_001", "a1"))))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("a2_001").hasMessageContaining("уровн");
    }

    @Test
    @DisplayName("ответ не из вариантов, неизвестный тип, чужие поля, кривая запись — всё перечислено разом")
    void collectsProblems() {
        PackItem badAnswer = new PackItem("a1_001", "a1", "listen_choice", AUDIO, "", "Q?", List.of("A", "B"), "C", null, null, null);
        PackItem unknown = new PackItem("a1_002", "a1", "listen_quiz", AUDIO, "", null, null, null, null, null, null);
        PackItem foreign = new PackItem("a1_003", "a1", "listen_type", AUDIO, "", "лишний вопрос", null, "Hi", null, null, null);
        PackItem badAudio = new PackItem("a1_004", "a1", "listen_type", "a1/clip.mp3", "", null, null, "Hi", null, null, null);

        assertThatThrownBy(() -> ListeningRules.normalizeAll(List.of(badAnswer, unknown, foreign, badAudio)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("a1_001").hasMessageContaining("a1_002")
                .hasMessageContaining("a1_003").hasMessageContaining("a1_004");
    }

    @Test
    @DisplayName("разметка: только <b> и <i> без атрибутов, одиночная < — тоже отказ")
    void markup() {
        assertThat(ListeningRules.markupAllowed("Li is a <b>student</b> in <i>Shanghai</i>.")).isTrue();
        assertThat(ListeningRules.markupAllowed("<script>alert(1)</script>")).isFalse();
        assertThat(ListeningRules.markupAllowed("<b class=\"x\">a</b>")).isFalse();
        assertThat(ListeningRules.markupAllowed("<img src=x onerror=alert(1)")).isFalse();
        assertThat(ListeningRules.markupAllowed(null)).isTrue();

        PackItem xss = new PackItem("a1_001", "a1", "listen_choice", AUDIO, "", "Q?",
                List.of("<img src=x>", "B"), "B", null, null, null);
        assertThatThrownBy(() -> ListeningRules.normalizeAll(List.of(xss))).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("лишняя плитка, совпавшая с нужной, — отказ")
    void distractorEqualsToken() {
        PackItem bad = new PackItem("a1_001", "a1", "listen_assemble", AUDIO, "", null, null, null,
                "I'm from Istanbul", List.of("I'm", "from", "Istanbul"), List.of("from"));
        assertThatThrownBy(() -> ListeningRules.normalizeAll(List.of(bad))).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("повтор id в пакете и пустой пакет — отказ")
    void duplicatesAndEmpty() {
        assertThatThrownBy(() -> ListeningRules.normalizeAll(List.of(choice("a1_001", "a1"), typed("a1_001", "a1"))))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("повтор");
        assertThatThrownBy(() -> ListeningRules.normalizeAll(List.of())).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("в сообщении не больше десяти нарушений")
    void capsProblems() {
        List<PackItem> bad = new ArrayList<>();
        for (int i = 1; i <= 30; i++) bad.add(choice(String.format("a2_%03d", i), "a1"));
        assertThatThrownBy(() -> ListeningRules.normalizeAll(bad))
                .isInstanceOf(BadRequestException.class)
                .satisfies(e -> assertThat(e.getMessage().split("\n")).hasSizeLessThanOrEqualTo(11));
    }
}
```

- [ ] **Step 2: Запустить — падает**

Run: `./gradlew test --tests 'kz.education.server.modules.practice.listening.ListeningRulesTest'`
Expected: FAIL компиляции — `ListeningDtos` не найден.

- [ ] **Step 3: Миграция**

Перед созданием файла: `git ls-tree --name-only origin/develop src/main/resources/db/migration/ | sed -E 's/.*\/V([0-9]+)__.*/\1/' | sort -n | tail -1` → если не 386, взять следующий номер вместо 387.

`src/main/resources/db/migration/V387__Practice_listening_tasks.sql`:

```sql
-- «Практика → Аудирование»: задания, которые до сих пор лежали файлами public/practice/listening/content/<уровень>.json
-- в репозитории сайта ученика (800 заданий, записи — 79 МБ mp3). Заливаются пакетом через админку
-- (docs/practice/PACK_FORMAT.md), записи — в MinIO под practice/listening/<sha24>.mp3.
CREATE TABLE practice_listening_tasks (
    id           BIGSERIAL PRIMARY KEY,
    -- id задания на сайте (a1_001). На нём прогресс, квота PRACTICE_LISTENING и счёт «пройдено на уровне» — по
    -- префиксу, поэтому префикс обязан совпадать с level. Не меняется никогда.
    task_key     VARCHAR(40)  NOT NULL UNIQUE,
    level        VARCHAR(2)   NOT NULL,
    task_type    VARCHAR(20)  NOT NULL,
    -- Порядок внутри уровня — порядок заданий в пакете.
    order_index  INTEGER      NOT NULL DEFAULT 0,
    -- Имя записи в хранилище (<sha24>.mp3). URL собирается при отдаче: у стендов разный хост файлов.
    audio_name   VARCHAR(40)  NOT NULL,
    -- Разбор ответа; сайт вставляет его как HTML, поэтому сервер пропускает только <b> и <i>.
    explanation  TEXT         NOT NULL DEFAULT '',
    -- Поля типа JSON-объектом: prompt/options/answer, text/tokens/distractors или answer. TEXT, а не jsonb, — как у
    -- shadowing_lessons: документ читают целиком, по полям не ищут.
    body         TEXT         NOT NULL DEFAULT '{}',
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP
);

CREATE INDEX idx_practice_listening_level ON practice_listening_tasks (level, is_active, order_index);
```

- [ ] **Step 4: Сущность и репозиторий**

`$J/modules/practice/listening/ListeningTask.java`:

```java
package kz.education.server.modules.practice.listening;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/** Задание «Практика → Аудирование»: запись и вопрос к ней. Колонки — см. миграцию practice_listening_tasks. */
@Entity
@Data
@Table(name = "practice_listening_tasks")
public class ListeningTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_key", nullable = false, unique = true, length = 40, updatable = false)
    private String taskKey;

    @Column(nullable = false, length = 2)
    private String level;

    @Column(name = "task_type", nullable = false, length = 20)
    private String taskType;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex = 0;

    @Column(name = "audio_name", nullable = false, length = 40)
    private String audioName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String explanation = "";

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body = "{}";

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
```

`$J/modules/practice/listening/ListeningTaskRepository.java`:

```java
package kz.education.server.modules.practice.listening;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ListeningTaskRepository extends JpaRepository<ListeningTask, Long> {

    List<ListeningTask> findByIsActiveTrue();

    List<ListeningTask> findByLevelAndIsActiveTrueOrderByOrderIndexAscIdAsc(String level);

    List<ListeningTask> findAllByOrderByLevelAscOrderIndexAscIdAsc();

    List<ListeningTask> findByLevelOrderByOrderIndexAscIdAsc(String level);

    Optional<ListeningTask> findByTaskKey(String taskKey);
}
```

- [ ] **Step 5: DTO**

`$J/modules/practice/listening/ListeningDtos.java`:

```java
package kz.education.server.modules.practice.listening;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public final class ListeningDtos {

    private ListeningDtos() {
    }

    public static final List<String> LEVELS = List.of("a1", "a2", "b1", "b2", "c1");
    public static final String PACK_FORMAT = "jts-practice-pack";
    public static final int PACK_VERSION = 1;

    /**
     * Задание пакета — та же форма, что у файла уровня на сайте ({@code public/practice/listening/content/<уровень>.json}),
     * плюс {@code level}. {@code audio} — {@code media/<sha24>.mp3}.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record PackItem(String id, String level, String type, String audio, String explanation,
                           String prompt, List<String> options, String answer,
                           String text, List<String> tokens, List<String> distractors) {
    }

    public record PackBody(List<PackItem> items) {
    }

    /** Задание после проверки: поля типа — в {@code body}, запись — имя в хранилище. */
    public record Normalized(String key, String level, String type, int orderIndex, String audioName,
                             String explanation, Map<String, Object> body) {
    }

    /** Ученику — ровно форма файла уровня, только {@code audio} — полный URL записи. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record PublicTask(String id, String type, String audio, String explanation,
                             String prompt, List<String> options, String answer,
                             String text, List<String> tokens, List<String> distractors) {
    }

    public record LevelCount(String level, long count) {
    }

    public record AdminTask(String id, String level, String type, int orderIndex, String audioUrl, String explanation,
                            Map<String, Object> body, boolean active, LocalDateTime updatedAt) {
    }

    public record DiffResult(List<String> added, List<String> changed, int unchanged, List<String> onlyInAdmin) {
    }

    public record ImportResult(int added, int changed, int unchanged) {
    }

    /** Выгрузка для переноса на другой стенд; сами файлы админка забирает по {@code media}. */
    public record ExportBundle(String format, int version, String section, List<PackItem> items, List<String> media) {
    }
}
```

- [ ] **Step 6: Правила**

`$J/modules/practice/listening/ListeningRules.java`:

```java
package kz.education.server.modules.practice.listening;

import kz.education.server.modules.practice.listening.ListeningDtos.Normalized;
import kz.education.server.modules.practice.listening.ListeningDtos.PackItem;
import kz.education.server.shared.exception.types.BadRequestException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static kz.education.server.modules.practice.listening.ListeningDtos.LEVELS;

/**
 * Правила задания «Аудирования» — то, на чём держится тренажёр сайта (src/practice/listening/engine.js): у выбора
 * ответ среди вариантов, у «собери фразу» есть плитки, id с префиксом уровня. Без Spring — проверяется обычными
 * тестами. Нарушения перечисляются разом, чтобы методист не чинил пакет по одной ошибке за заливку.
 */
public final class ListeningRules {

    static final Set<String> TYPES = Set.of("listen_choice", "listen_assemble", "listen_type");
    static final Pattern KEY = Pattern.compile("^(a1|a2|b1|b2|c1)_\\d{3,}$");
    static final Pattern AUDIO = Pattern.compile("^media/([a-f0-9]{24}\\.mp3)$");
    /** Единственные теги, которые встречаются в данных (1004 <b>, 38 <i> на 21.10.2026). */
    static final Pattern ALLOWED_TAG = Pattern.compile("</?(b|i)>");

    static final int MAX_ITEMS = 5000;
    static final int MAX_PROBLEMS = 10;
    static final int MAX_TEXT = 500;
    static final int MAX_EXPLANATION = 2000;
    static final int MAX_OPTION = 200;

    private ListeningRules() {
    }

    public static List<Normalized> normalizeAll(List<PackItem> items) {
        if (items == null || items.isEmpty()) throw new BadRequestException("В пакете нет заданий.");
        if (items.size() > MAX_ITEMS) throw new BadRequestException("В пакете больше " + MAX_ITEMS + " заданий.");
        List<String> problems = new ArrayList<>();
        List<Normalized> out = new ArrayList<>(items.size());
        Set<String> seen = new HashSet<>();
        Map<String, Integer> positions = new HashMap<>();
        for (int i = 0; i < items.size() && problems.size() < MAX_PROBLEMS; i++) {
            PackItem item = items.get(i);
            if (item == null) {
                problems.add("Задание №" + (i + 1) + ": пустая запись.");
                continue;
            }
            String key = clean(item.id());
            if (!key.isEmpty() && !seen.add(key)) {
                problems.add("Задание " + key + ": id повторяется в пакете.");
                continue;
            }
            Normalized n = normalize(item, i, positions, problems);
            if (n != null) out.add(n);
        }
        if (!problems.isEmpty()) {
            throw new BadRequestException(String.join("\n", problems.subList(0, Math.min(problems.size(), MAX_PROBLEMS))));
        }
        return out;
    }

    /** Разрешены только {@code <b> </b> <i> </i>}: сайт вставляет текст как HTML, а писать его будут преподаватели. */
    public static boolean markupAllowed(String s) {
        return s == null || !ALLOWED_TAG.matcher(s).replaceAll("").contains("<");
    }

    private static Normalized normalize(PackItem it, int index, Map<String, Integer> positions, List<String> problems) {
        String key = clean(it.id());
        String where = "Задание " + (key.isEmpty() ? "№" + (index + 1) : key) + ": ";
        int before = problems.size();

        String level = clean(it.level()).toLowerCase(Locale.ROOT);
        if (!LEVELS.contains(level)) problems.add(where + "уровень должен быть одним из " + LEVELS + ".");
        if (!KEY.matcher(key).matches()) {
            problems.add(where + "id вида a1_001 (уровень, подчёркивание, номер).");
        } else if (!key.startsWith(level + "_")) {
            problems.add(where + "id начинается не с уровня «" + level + "» — по префиксу считается «пройдено на уровне».");
        }

        Matcher audio = AUDIO.matcher(it.audio() == null ? "" : it.audio().trim());
        boolean audioOk = audio.matches();
        if (!audioOk) problems.add(where + "запись — media/<хэш>.mp3.");

        String explanation = it.explanation() == null ? "" : it.explanation().strip();
        if (explanation.length() > MAX_EXPLANATION) problems.add(where + "разбор длиннее " + MAX_EXPLANATION + " знаков.");

        String type = clean(it.type());
        Map<String, Object> body = new LinkedHashMap<>();
        switch (type) {
            case "listen_choice" -> {
                String prompt = text(it.prompt(), where + "вопрос", problems);
                List<String> options = list(it.options(), where + "варианты", 2, 6, problems);
                String answer = text(it.answer(), where + "ответ", problems);
                if (options != null && new HashSet<>(options).size() != options.size()) {
                    problems.add(where + "варианты повторяются.");
                }
                if (options != null && answer != null && !options.contains(answer)) {
                    problems.add(where + "ответа «" + answer + "» нет среди вариантов.");
                }
                forbid(where, "text", it.text(), problems);
                forbid(where, "tokens", it.tokens(), problems);
                forbid(where, "distractors", it.distractors(), problems);
                body.put("prompt", prompt);
                body.put("options", options);
                body.put("answer", answer);
            }
            case "listen_assemble" -> {
                // text — то, что звучит (движок показывает его как «услышано»), ответ сверяется по плиткам; совпадать
                // им не обязательно: у a1_007 и ещё трёх текст длиннее плиток
                String text = text(it.text(), where + "текст записи", problems);
                List<String> tokens = list(it.tokens(), where + "плитки", 1, 40, problems);
                List<String> distractors = it.distractors() == null ? List.of()
                        : list(it.distractors(), where + "лишние плитки", 0, 20, problems);
                if (tokens != null && distractors != null && distractors.stream().anyMatch(tokens::contains)) {
                    problems.add(where + "лишняя плитка совпадает с нужной.");
                }
                forbid(where, "prompt", it.prompt(), problems);
                forbid(where, "options", it.options(), problems);
                forbid(where, "answer", it.answer(), problems);
                body.put("text", text);
                body.put("tokens", tokens);
                body.put("distractors", distractors);
            }
            case "listen_type" -> {
                String answer = text(it.answer(), where + "ответ", problems);
                forbid(where, "prompt", it.prompt(), problems);
                forbid(where, "options", it.options(), problems);
                forbid(where, "text", it.text(), problems);
                forbid(where, "tokens", it.tokens(), problems);
                forbid(where, "distractors", it.distractors(), problems);
                body.put("answer", answer);
            }
            default -> problems.add(where + "неизвестный тип «" + type + "» (" + String.join(", ", TYPES) + ").");
        }

        boolean markupOk = markupAllowed(explanation);
        for (Object value : body.values()) {
            if (value instanceof String s) markupOk &= markupAllowed(s);
            if (value instanceof List<?> l) for (Object x : l) markupOk &= markupAllowed((String) x);
        }
        if (!markupOk) problems.add(where + "из разметки разрешены только <b> и <i> без атрибутов.");

        if (problems.size() > before) return null;
        int position = positions.merge(level, 1, Integer::sum) - 1;
        return new Normalized(key, level, type, position, audio.group(1), explanation, body);
    }

    private static String text(String raw, String what, List<String> problems) {
        String s = raw == null ? "" : raw.strip();
        if (s.isEmpty()) {
            problems.add(what + " — пусто.");
            return null;
        }
        if (s.length() > MAX_TEXT) {
            problems.add(what + " длиннее " + MAX_TEXT + " знаков.");
            return null;
        }
        return s;
    }

    private static List<String> list(List<String> raw, String what, int min, int max, List<String> problems) {
        if (raw == null) {
            problems.add(what + " — нет.");
            return null;
        }
        if (raw.size() < min || raw.size() > max) {
            problems.add(what + ": от " + min + " до " + max + ", а их " + raw.size() + ".");
            return null;
        }
        List<String> out = new ArrayList<>(raw.size());
        for (String x : raw) {
            String s = x == null ? "" : x.strip();
            if (s.isEmpty() || s.length() > MAX_OPTION) {
                problems.add(what + ": пустой или слишком длинный элемент.");
                return null;
            }
            out.add(s);
        }
        return out;
    }

    private static void forbid(String where, String field, Object value, List<String> problems) {
        if (value != null) problems.add(where + "поле «" + field + "» не относится к этому типу.");
    }

    private static String clean(String s) {
        return s == null ? "" : s.strip();
    }
}
```

- [ ] **Step 7: Зелёный**

Run: `./gradlew test --tests 'kz.education.server.modules.practice.listening.ListeningRulesTest'`
Expected: PASS, 7 тестов.

- [ ] **Step 8: Коммит**

```bash
git add src/main/resources/db/migration/V387__Practice_listening_tasks.sql src/main/java/kz/education/server/modules/practice/listening src/test/java/kz/education/server/modules/practice/listening
git commit -m "$(printf 'feat(практика): таблица и правила заданий Аудирования\n\nЗадания приезжают пакетом из public/ сайта; id не меняется,\nпрефикс id = уровень, разметка — только <b>/<i>.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

### Task A3: Сервис Аудирования (выдача, diff, импорт, выгрузка)

**Files:**
- Create: `$J/modules/practice/listening/ListeningService.java`
- Test: `$T/modules/practice/listening/ListeningServiceTest.java`

**Interfaces:**
- Consumes: `ListeningRules.normalizeAll`, `ListeningTaskRepository`, `PracticeMediaService.existing/publicUrl`.
- Produces: `ListeningService.publicLevels() → List<LevelCount>`, `publicLevel(String) → List<PublicTask>`, `adminList(String|null) → List<AdminTask>`, `setActive(String key, boolean) → AdminTask`, `diff(List<PackItem>) → DiffResult`, `importPack(List<PackItem>) → ImportResult`, `exportPack() → ExportBundle`. Константа `ListeningService.SECTION = "listening"`.

- [ ] **Step 1: Падающий тест на H2**

`$T/modules/practice/listening/ListeningServiceTest.java`:

```java
package kz.education.server.modules.practice.listening;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManagerFactory;
import kz.education.server.modules.practice.PracticeMediaService;
import kz.education.server.modules.practice.listening.ListeningDtos.PackItem;
import kz.education.server.modules.practice.listening.ListeningDtos.PublicTask;
import kz.education.server.shared.exception.types.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/** Аудирование на настоящей базе (H2): что залили пакетом, то ученик и получает; повторная заливка ничего не портит. */
@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = ListeningServiceTest.TestContext.class)
@Transactional
@DisplayName("ListeningService — пакет, выдача, скрытие")
class ListeningServiceTest {

    static final String A = "media/aaaaaaaaaaaaaaaaaaaaaaaa.mp3";
    static final String B = "media/bbbbbbbbbbbbbbbbbbbbbbbb.mp3";

    @Autowired
    private ListeningService service;
    @Autowired
    private PracticeMediaService media;

    @BeforeEach
    void mediaPresent() {
        Mockito.reset(media);
        when(media.existing(eq("listening"), any())).thenAnswer(inv -> new ArrayList<>((Collection<String>) inv.getArgument(1)));
        when(media.publicUrl(eq("listening"), anyString()))
                .thenAnswer(inv -> "https://files.test/development/practice/listening/" + inv.getArgument(1));
    }

    static PackItem choice(String id, String level, String audio, String explanation) {
        return new PackItem(id, level, "listen_choice", audio, explanation, "Where is Li now?",
                List.of("In Shanghai", "In Beijing"), "In Shanghai", null, null, null);
    }

    static PackItem typed(String id, String level, String audio) {
        return new PackItem(id, level, "listen_type", audio, "", null, null, "I'm from the UK", null, null, null);
    }

    static List<PackItem> pack() {
        return List.of(choice("a1_001", "a1", A, "Li is a <b>student</b>."), typed("a1_002", "a1", B), typed("a2_001", "a2", A));
    }

    @Test
    @DisplayName("залили — ученик получает форму файла уровня с полным URL записи, по порядку пакета")
    void importThenServe() {
        assertThat(service.importPack(pack())).isEqualTo(new ListeningDtos.ImportResult(3, 0, 0));

        List<PublicTask> a1 = service.publicLevel("a1");
        assertThat(a1).extracting(PublicTask::id).containsExactly("a1_001", "a1_002");
        assertThat(a1.get(0).audio()).isEqualTo("https://files.test/development/practice/listening/aaaaaaaaaaaaaaaaaaaaaaaa.mp3");
        assertThat(a1.get(0).options()).containsExactly("In Shanghai", "In Beijing");
        assertThat(a1.get(0).explanation()).isEqualTo("Li is a <b>student</b>.");
        assertThat(a1.get(1).prompt()).isNull();
        assertThat(service.publicLevels()).containsExactly(new ListeningDtos.LevelCount("a1", 2), new ListeningDtos.LevelCount("a2", 1));
    }

    @Test
    @DisplayName("та же заливка второй раз — всё «без изменений»; правка разбора — одно «изменённое»")
    void reimport() {
        service.importPack(pack());
        assertThat(service.importPack(pack())).isEqualTo(new ListeningDtos.ImportResult(0, 0, 3));

        List<PackItem> edited = new ArrayList<>(pack());
        edited.set(0, choice("a1_001", "a1", A, "Li is a <b>student</b> now."));
        assertThat(service.diff(edited).changed()).containsExactly("a1_001");
        assertThat(service.importPack(edited)).isEqualTo(new ListeningDtos.ImportResult(0, 1, 2));
        assertThat(service.publicLevel("a1").get(0).explanation()).isEqualTo("Li is a <b>student</b> now.");
    }

    @Test
    @DisplayName("diff: новые, без изменений и «есть только в админке»")
    void diffGroups() {
        service.importPack(pack());
        ListeningDtos.DiffResult d = service.diff(List.of(choice("a1_001", "a1", A, "Li is a <b>student</b>."), typed("b1_001", "b1", B)));

        assertThat(d.added()).containsExactly("b1_001");
        assertThat(d.changed()).isEmpty();
        assertThat(d.unchanged()).isEqualTo(1);
        assertThat(d.onlyInAdmin()).containsExactly("a1_002", "a2_001");
    }

    @Test
    @DisplayName("записи нет в хранилище — импорт отказывает и ничего не пишет")
    void missingMedia() {
        when(media.existing(eq("listening"), any())).thenReturn(List.of("aaaaaaaaaaaaaaaaaaaaaaaa.mp3"));

        assertThatThrownBy(() -> service.importPack(pack()))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("bbbbbbbbbbbbbbbbbbbbbbbb.mp3");
        assertThat(service.adminList(null)).isEmpty();
    }

    @Test
    @DisplayName("скрытое задание не отдаётся ученику, не считается, не выгружается и не оживает от повторной заливки")
    void hidden() {
        service.importPack(pack());
        assertThat(service.setActive("a1_002", false).active()).isFalse();

        assertThat(service.publicLevel("a1")).extracting(PublicTask::id).containsExactly("a1_001");
        assertThat(service.publicLevels()).contains(new ListeningDtos.LevelCount("a1", 1));
        assertThat(service.exportPack().items()).extracting(PackItem::id).doesNotContain("a1_002");

        service.importPack(pack());
        assertThat(service.publicLevel("a1")).extracting(PublicTask::id).containsExactly("a1_001");
    }

    @Test
    @DisplayName("выгрузка = пакет, который принимает импорт")
    void exportRoundTrip() {
        service.importPack(pack());
        ListeningDtos.ExportBundle bundle = service.exportPack();

        assertThat(bundle.format()).isEqualTo("jts-practice-pack");
        assertThat(bundle.section()).isEqualTo("listening");
        assertThat(bundle.media()).containsExactly("aaaaaaaaaaaaaaaaaaaaaaaa.mp3", "bbbbbbbbbbbbbbbbbbbbbbbb.mp3");
        assertThat(bundle.items().get(0).audio()).isEqualTo(A);
        assertThat(service.diff(bundle.items()).unchanged()).isEqualTo(3);
    }

    @Test
    @DisplayName("неизвестный уровень — 400")
    void unknownLevel() {
        assertThatThrownBy(() -> service.publicLevel("c2")).isInstanceOf(BadRequestException.class);
    }

    @Configuration
    @EnableTransactionManagement
    @EnableJpaRepositories(basePackageClasses = ListeningTaskRepository.class)
    static class TestContext {

        @Bean
        DataSource dataSource() {
            return new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2).generateUniqueName(true).build();
        }

        @Bean
        LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
            LocalContainerEntityManagerFactoryBean factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(dataSource);
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setPackagesToScan();
            factory.setPersistenceUnitPostProcessors(unit -> unit.addManagedClassName(ListeningTask.class.getName()));
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "create-drop"));
            return factory;
        }

        @Bean
        PlatformTransactionManager transactionManager(EntityManagerFactory entityManagerFactory) {
            return new JpaTransactionManager(entityManagerFactory);
        }

        @Bean
        PracticeMediaService practiceMediaService() {
            return Mockito.mock(PracticeMediaService.class);
        }

        @Bean
        ListeningService listeningService(ListeningTaskRepository repository, PracticeMediaService media) {
            return new ListeningService(repository, media, new ObjectMapper());
        }
    }
}
```

Контекст повторяет `ShadowingServiceTest.TestContext` (тот же репо): репозитории ищутся в пакете `modules.practice.listening`, где кроме `ListeningTaskRepository` их нет.

- [ ] **Step 2: Запустить — падает**

Run: `./gradlew test --tests 'kz.education.server.modules.practice.listening.ListeningServiceTest'`
Expected: FAIL компиляции — `ListeningService` не найден.

- [ ] **Step 3: Реализация**

`$J/modules/practice/listening/ListeningService.java`:

```java
package kz.education.server.modules.practice.listening;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import kz.education.server.modules.practice.PracticeMediaService;
import kz.education.server.modules.practice.listening.ListeningDtos.AdminTask;
import kz.education.server.modules.practice.listening.ListeningDtos.DiffResult;
import kz.education.server.modules.practice.listening.ListeningDtos.ExportBundle;
import kz.education.server.modules.practice.listening.ListeningDtos.ImportResult;
import kz.education.server.modules.practice.listening.ListeningDtos.LevelCount;
import kz.education.server.modules.practice.listening.ListeningDtos.Normalized;
import kz.education.server.modules.practice.listening.ListeningDtos.PackItem;
import kz.education.server.modules.practice.listening.ListeningDtos.PublicTask;
import kz.education.server.shared.exception.types.BadRequestException;
import kz.education.server.shared.exception.types.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;

import static kz.education.server.modules.practice.listening.ListeningDtos.LEVELS;
import static kz.education.server.modules.practice.listening.ListeningDtos.PACK_FORMAT;
import static kz.education.server.modules.practice.listening.ListeningDtos.PACK_VERSION;

/**
 * «Практика → Аудирование»: задания, залитые пакетом через админку, и их выдача сайту ученика
 * ({@code /practice-content/listening}). Пока на стенде пусто, сайт читает старую статику — см. спеку
 * jts-web-app docs/superpowers/specs/2026-10-21-practice-content-to-admin-design.md.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ListeningService {

    public static final String SECTION = "listening";
    private static final TypeReference<Map<String, Object>> BODY = new TypeReference<>() {
    };

    private final ListeningTaskRepository tasks;
    private final PracticeMediaService media;
    private final ObjectMapper mapper;

    // ───────────── ученику ─────────────

    @Transactional(readOnly = true)
    public List<LevelCount> publicLevels() {
        Map<String, Long> counts = tasks.findByIsActiveTrue().stream()
                .collect(Collectors.groupingBy(ListeningTask::getLevel, TreeMap::new, Collectors.counting()));
        return counts.entrySet().stream().map(e -> new LevelCount(e.getKey(), e.getValue())).toList();
    }

    @Transactional(readOnly = true)
    public List<PublicTask> publicLevel(String level) {
        return tasks.findByLevelAndIsActiveTrueOrderByOrderIndexAscIdAsc(level(level)).stream().map(this::publicView).toList();
    }

    // ───────────── админка ─────────────

    @Transactional(readOnly = true)
    public List<AdminTask> adminList(String level) {
        List<ListeningTask> rows = level == null || level.isBlank()
                ? tasks.findAllByOrderByLevelAscOrderIndexAscIdAsc()
                : tasks.findByLevelOrderByOrderIndexAscIdAsc(level(level));
        return rows.stream().map(this::adminView).toList();
    }

    @Transactional
    public AdminTask setActive(String key, boolean active) {
        ListeningTask row = tasks.findByTaskKey(key).orElseThrow(() -> new ResourceNotFoundException("Задание не найдено"));
        row.setIsActive(active);
        return adminView(tasks.save(row));
    }

    @Transactional(readOnly = true)
    public DiffResult diff(List<PackItem> items) {
        List<Normalized> pack = ListeningRules.normalizeAll(items);
        Map<String, ListeningTask> stored = byKey();
        List<String> added = new ArrayList<>();
        List<String> changed = new ArrayList<>();
        int unchanged = 0;
        Set<String> inPack = new HashSet<>();
        for (Normalized n : pack) {
            inPack.add(n.key());
            ListeningTask row = stored.get(n.key());
            if (row == null) added.add(n.key());
            else if (same(row, n)) unchanged++;
            else changed.add(n.key());
        }
        List<String> onlyInAdmin = stored.keySet().stream().filter(k -> !inPack.contains(k)).sorted().toList();
        return new DiffResult(added, changed, unchanged, onlyInAdmin);
    }

    /**
     * Пишет новые и изменённые задания. Видимость существующих не трогает: скрытое в админке не должно оживать от
     * повторной заливки того же пакета. Задания, которых нет в пакете, остаются как есть — их видно в diff.
     */
    @Transactional
    public ImportResult importPack(List<PackItem> items) {
        List<Normalized> pack = ListeningRules.normalizeAll(items);
        Set<String> names = pack.stream().map(Normalized::audioName).collect(Collectors.toCollection(TreeSet::new));
        Set<String> present = new HashSet<>(media.existing(SECTION, names));
        List<String> missing = names.stream().filter(n -> !present.contains(n)).limit(5).toList();
        if (!missing.isEmpty()) {
            throw new BadRequestException("Сначала залейте записи — их нет в хранилище: " + String.join(", ", missing));
        }
        Map<String, ListeningTask> stored = byKey();
        int added = 0, changed = 0, unchanged = 0;
        for (Normalized n : pack) {
            ListeningTask row = stored.get(n.key());
            if (row == null) {
                row = new ListeningTask();
                row.setTaskKey(n.key());
                fill(row, n);
                tasks.save(row);
                added++;
            } else if (same(row, n)) {
                unchanged++;
            } else {
                fill(row, n);
                tasks.save(row);
                changed++;
            }
        }
        log.info("Аудирование: заливка пакета — новых {}, изменённых {}, без изменений {}", added, changed, unchanged);
        return new ImportResult(added, changed, unchanged);
    }

    /** Только показываемые: скрытое на деве — брак, на прод его не везут. */
    @Transactional(readOnly = true)
    public ExportBundle exportPack() {
        List<ListeningTask> rows = tasks.findAllByOrderByLevelAscOrderIndexAscIdAsc().stream()
                .filter(ListeningTask::getIsActive).toList();
        List<PackItem> items = rows.stream().map(this::packItem).toList();
        List<String> names = rows.stream().map(ListeningTask::getAudioName).distinct().sorted().toList();
        return new ExportBundle(PACK_FORMAT, PACK_VERSION, SECTION, items, names);
    }

    // ───────────── внутреннее ─────────────

    private static String level(String raw) {
        String code = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
        if (!LEVELS.contains(code)) throw new BadRequestException("Неизвестный уровень Аудирования: " + raw);
        return code;
    }

    private Map<String, ListeningTask> byKey() {
        return tasks.findAll().stream().collect(Collectors.toMap(ListeningTask::getTaskKey, Function.identity()));
    }

    private boolean same(ListeningTask row, Normalized n) {
        return row.getLevel().equals(n.level())
                && row.getTaskType().equals(n.type())
                && row.getOrderIndex() == n.orderIndex()
                && row.getAudioName().equals(n.audioName())
                && row.getExplanation().equals(n.explanation())
                && Objects.equals(readBody(row), n.body());
    }

    private void fill(ListeningTask row, Normalized n) {
        row.setLevel(n.level());
        row.setTaskType(n.type());
        row.setOrderIndex(n.orderIndex());
        row.setAudioName(n.audioName());
        row.setExplanation(n.explanation());
        try {
            row.setBody(mapper.writeValueAsString(n.body()));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Не удалось сохранить задание " + n.key(), e);
        }
    }

    private Map<String, Object> readBody(ListeningTask row) {
        try {
            return mapper.readValue(row.getBody(), BODY);
        } catch (JsonProcessingException e) {
            log.error("Поля задания {} не читаются: {}", row.getTaskKey(), e.getMessage());
            return new LinkedHashMap<>();
        }
    }

    private PublicTask publicView(ListeningTask row) {
        Map<String, Object> b = readBody(row);
        return new PublicTask(row.getTaskKey(), row.getTaskType(), media.publicUrl(SECTION, row.getAudioName()),
                row.getExplanation(), str(b, "prompt"), strs(b, "options"), str(b, "answer"),
                str(b, "text"), strs(b, "tokens"), strs(b, "distractors"));
    }

    private AdminTask adminView(ListeningTask row) {
        return new AdminTask(row.getTaskKey(), row.getLevel(), row.getTaskType(), row.getOrderIndex(),
                media.publicUrl(SECTION, row.getAudioName()), row.getExplanation(), readBody(row),
                Boolean.TRUE.equals(row.getIsActive()), row.getUpdatedAt());
    }

    private PackItem packItem(ListeningTask row) {
        Map<String, Object> b = readBody(row);
        return new PackItem(row.getTaskKey(), row.getLevel(), row.getTaskType(), "media/" + row.getAudioName(),
                row.getExplanation(), str(b, "prompt"), strs(b, "options"), str(b, "answer"),
                str(b, "text"), strs(b, "tokens"), strs(b, "distractors"));
    }

    private static String str(Map<String, Object> b, String key) {
        return b.get(key) instanceof String s ? s : null;
    }

    @SuppressWarnings("unchecked")
    private static List<String> strs(Map<String, Object> b, String key) {
        return b.get(key) instanceof List<?> l ? (List<String>) l : null;
    }
}
```

- [ ] **Step 4: Зелёный**

Run: `./gradlew test --tests 'kz.education.server.modules.practice.listening.*'`
Expected: PASS — ListeningRulesTest 7, ListeningServiceTest 7.

- [ ] **Step 5: Коммит**

```bash
git add src/main/java/kz/education/server/modules/practice/listening/ListeningService.java src/test/java/kz/education/server/modules/practice/listening/ListeningServiceTest.java
git commit -m "$(printf 'feat(практика): выдача, diff, заливка и выгрузка пакета Аудирования\n\nПовторная заливка не оживляет скрытое; без записей в хранилище\nимпорт отказывает целиком.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

### Task A4: Ручки, доступ, контракт пакета

**Files:**
- Create: `$J/presentation/common/practice/controller/PracticeListeningPublicController.java`
- Create: `$J/presentation/admin/practice/controller/AdminPracticeListeningController.java`
- Create: `$J/presentation/admin/practice/controller/AdminPracticeMediaController.java`
- Modify: `$J/shared/security/SecurityConfig.java` — рядом со строкой `.requestMatchers(org.springframework.http.HttpMethod.GET, "/catalog/**").permitAll()`
- Create: `docs/practice/PACK_FORMAT.md`
- Test: `$T/modules/practice/PracticeContentSecurityTest.java`

**Interfaces:**
- Consumes: `ListeningService.*`, `PracticeMediaService.*`.
- Produces (HTTP, их зовут web-admin и сайт):
  - `GET /practice-content/listening/levels` → `[{level, count}]`, `GET /practice-content/listening/{level}` → `PublicTask[]`; оба без входа, `Cache-Control: max-age=300, public`.
  - `GET /admin/practice/listening/tasks?level=` → `AdminTask[]`; `PATCH /admin/practice/listening/tasks/{key}/activate|deactivate` → `AdminTask`; `POST /admin/practice/listening/pack/diff` `{items}` → `DiffResult`; `POST /admin/practice/listening/pack/import` `{items}` → `ImportResult`; `GET /admin/practice/listening/pack/export` → `ExportBundle`.
  - `POST /admin/practice/media/{section}/exists` `{names}` → `{existing}`; `POST /admin/practice/media/{section}` multipart `file` + `expected` → `Uploaded` (201); `GET /admin/practice/media/{section}/{name}` → байты.

- [ ] **Step 1: Падающий тест доступа**

`$T/modules/practice/PracticeContentSecurityTest.java`:

```java
package kz.education.server.modules.practice;

import kz.education.server.modules.auth.service.JwtService;
import kz.education.server.modules.ielts.service.IeltsAccessService;
import kz.education.server.modules.practice.listening.ListeningDtos;
import kz.education.server.modules.practice.listening.ListeningService;
import kz.education.server.presentation.admin.practice.controller.AdminPracticeListeningController;
import kz.education.server.presentation.admin.practice.controller.AdminPracticeMediaController;
import kz.education.server.presentation.common.practice.controller.PracticeListeningPublicController;
import kz.education.server.shared.config.CorsConfig;
import kz.education.server.shared.security.JwtAuthenticationEntryPoint;
import kz.education.server.shared.security.JwtAuthenticationFilter;
import kz.education.server.shared.security.SecurityConfig;
import kz.education.server.shared.security.SecurityUtils;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Кто видит и кто заливает «Аудирование». НАСТОЯЩИЙ {@link SecurityConfig}: задания ученику — без входа (гость
 * открывает раздел), заливка пакета и медиа — только админ.
 */
@WebMvcTest(controllers = {PracticeListeningPublicController.class, AdminPracticeListeningController.class,
        AdminPracticeMediaController.class})
@Import({SecurityConfig.class, CorsConfig.class, JwtAuthenticationFilter.class, JwtAuthenticationEntryPoint.class})
@DisplayName("Практика · Аудирование — доступ")
class PracticeContentSecurityTest {

    private static final String PACK = """
            {"items":[{"id":"a1_001","level":"a1","type":"listen_type","audio":"media/aaaaaaaaaaaaaaaaaaaaaaaa.mp3","answer":"Hi"}]}""";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ListeningService listeningService;
    @MockitoBean
    private PracticeMediaService practiceMediaService;
    @MockitoBean
    private JwtService jwtService;
    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private SecurityUtils securityUtils;
    /** Веб-срез подхватывает перехватчик замка IELTS (IeltsWebConfig), а ему нужен этот сервис. */
    @MockitoBean
    private IeltsAccessService ieltsAccessService;

    @Test
    @DisplayName("гость получает задания уровня и счётчики, с кэшем на 5 минут")
    void anonymousReadsPublic() throws Exception {
        when(listeningService.publicLevel("a1")).thenReturn(List.of(new ListeningDtos.PublicTask(
                "a1_001", "listen_type", "https://files.test/x.mp3", "", null, null, "Hi", null, null, null)));
        when(listeningService.publicLevels()).thenReturn(List.of(new ListeningDtos.LevelCount("a1", 1)));

        mockMvc.perform(get("/practice-content/listening/a1")).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("max-age=300")))
                .andExpect(jsonPath("$[0].id").value("a1_001"))
                .andExpect(jsonPath("$[0].prompt").doesNotExist());
        mockMvc.perform(get("/practice-content/listening/levels")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].count").value(1));
    }

    @Test
    @DisplayName("гость в админку Аудирования не попадает")
    void anonymousCannotAdmin() throws Exception {
        mockMvc.perform(get("/admin/practice/listening/tasks")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/admin/practice/listening/pack/import").contentType(MediaType.APPLICATION_JSON).content(PACK))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "TEACHER")
    @DisplayName("преподаватель пакет не заливает")
    void teacherCannotImport() throws Exception {
        mockMvc.perform(post("/admin/practice/listening/pack/import").contentType(MediaType.APPLICATION_JSON).content(PACK))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/admin/practice/media/listening/exists").contentType(MediaType.APPLICATION_JSON)
                .content("{\"names\":[]}")).andExpect(status().isForbidden());
        verify(listeningService, never()).importPack(any());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("админ сверяет и заливает пакет, проверяет медиа")
    void adminImports() throws Exception {
        when(listeningService.diff(any())).thenReturn(new ListeningDtos.DiffResult(List.of("a1_001"), List.of(), 0, List.of()));
        when(listeningService.importPack(any())).thenReturn(new ListeningDtos.ImportResult(1, 0, 0));
        when(practiceMediaService.existing(any(), any())).thenReturn(List.of());

        mockMvc.perform(post("/admin/practice/listening/pack/diff").contentType(MediaType.APPLICATION_JSON).content(PACK))
                .andExpect(status().isOk()).andExpect(jsonPath("$.added[0]").value("a1_001"));
        mockMvc.perform(post("/admin/practice/listening/pack/import").contentType(MediaType.APPLICATION_JSON).content(PACK))
                .andExpect(status().isOk()).andExpect(jsonPath("$.added").value(1));
        mockMvc.perform(post("/admin/practice/media/listening/exists").contentType(MediaType.APPLICATION_JSON)
                .content("{\"names\":[\"aaaaaaaaaaaaaaaaaaaaaaaa.mp3\"]}")).andExpect(status().isOk())
                .andExpect(jsonPath("$.existing").isArray());
    }
}
```

- [ ] **Step 2: Запустить — падает**

Run: `./gradlew test --tests 'kz.education.server.modules.practice.PracticeContentSecurityTest'`
Expected: FAIL компиляции — контроллеров нет.

- [ ] **Step 3: Контроллеры**

`$J/presentation/common/practice/controller/PracticeListeningPublicController.java`:

```java
package kz.education.server.presentation.common.practice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import kz.education.server.modules.practice.listening.ListeningDtos.LevelCount;
import kz.education.server.modules.practice.listening.ListeningDtos.PublicTask;
import kz.education.server.modules.practice.listening.ListeningService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

/**
 * Задания «Практика → Аудирование» для сайта ученика. Без входа: гость открывает раздел и сейчас (квоты гостей не
 * касаются), а в заданиях нет ничего личного — это тот же контент, что лежал публичным json на сайте.
 */
@RestController
@RequestMapping("/practice-content/listening")
@RequiredArgsConstructor
@Tag(name = "Practice content · Listening", description = "Задания Аудирования для сайта ученика")
public class PracticeListeningPublicController {

    /** Меняется заливкой пакета, а не поминутно; пять минут — как у оглавления «Практики» на сайте. */
    private static final CacheControl CACHE = CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic();

    private final ListeningService service;

    @GetMapping("/levels")
    @Operation(summary = "Сколько показываемых заданий на каждом уровне")
    public ResponseEntity<List<LevelCount>> levels() {
        return ResponseEntity.ok().cacheControl(CACHE).body(service.publicLevels());
    }

    @GetMapping("/{level}")
    @Operation(summary = "Задания уровня в форме файла уровня сайта; audio — полный URL записи")
    public ResponseEntity<List<PublicTask>> level(@PathVariable String level) {
        return ResponseEntity.ok().cacheControl(CACHE).body(service.publicLevel(level));
    }
}
```

`$J/presentation/admin/practice/controller/AdminPracticeListeningController.java`:

```java
package kz.education.server.presentation.admin.practice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import kz.education.server.modules.practice.listening.ListeningDtos.AdminTask;
import kz.education.server.modules.practice.listening.ListeningDtos.DiffResult;
import kz.education.server.modules.practice.listening.ListeningDtos.ExportBundle;
import kz.education.server.modules.practice.listening.ListeningDtos.ImportResult;
import kz.education.server.modules.practice.listening.ListeningDtos.PackBody;
import kz.education.server.modules.practice.listening.ListeningService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin/practice/listening")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin Practice · Listening", description = "«Практика → Аудирование»: задания и пакет (docs/practice/PACK_FORMAT.md)")
public class AdminPracticeListeningController {

    private final ListeningService service;

    @GetMapping("/tasks")
    @Operation(summary = "Задания (все или одного уровня), включая скрытые")
    public List<AdminTask> list(@RequestParam(required = false) String level) {
        return service.adminList(level);
    }

    @PatchMapping("/tasks/{key}/activate")
    @Operation(summary = "Показать задание ученикам")
    public AdminTask activate(@PathVariable String key) {
        return service.setActive(key, true);
    }

    @PatchMapping("/tasks/{key}/deactivate")
    @Operation(summary = "Скрыть задание (прогресс учеников по нему не теряется)")
    public AdminTask deactivate(@PathVariable String key) {
        return service.setActive(key, false);
    }

    @PostMapping("/pack/diff")
    @Operation(summary = "Сверить пакет со стендом: новые, изменённые, без изменений, есть только здесь (400 — что не так с заданиями)")
    public DiffResult diff(@RequestBody PackBody body) {
        return service.diff(body == null ? null : body.items());
    }

    @PostMapping("/pack/import")
    @Operation(summary = "Залить пакет: новые и изменённые задания; записи должны быть уже в хранилище")
    public ImportResult importPack(@RequestBody PackBody body) {
        return service.importPack(body == null ? null : body.items());
    }

    @GetMapping("/pack/export")
    @Operation(summary = "Выгрузить показываемые задания пакетом — для переноса на другой стенд")
    public ExportBundle exportPack() {
        return service.exportPack();
    }
}
```

`$J/presentation/admin/practice/controller/AdminPracticeMediaController.java`:

```java
package kz.education.server.presentation.admin.practice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import kz.education.server.modules.practice.PracticeMediaNames;
import kz.education.server.modules.practice.PracticeMediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/** Записи и картинки разделов «Практики» для заливки и выгрузки пакета админкой. */
@RestController
@RequestMapping("/admin/practice/media/{section}")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin Practice media", description = "Медиа разделов Практики в MinIO (имя — хэш содержимого)")
public class AdminPracticeMediaController {

    private final PracticeMediaService service;

    public record ExistsRequest(List<String> names) {
    }

    public record ExistsResponse(List<String> existing) {
    }

    @PostMapping("/exists")
    @Operation(summary = "Какие из файлов уже лежат на стенде — заливка пакета грузит только остальные")
    public ExistsResponse exists(@PathVariable String section, @RequestBody ExistsRequest req) {
        return new ExistsResponse(service.existing(section, req == null ? null : req.names()));
    }

    @PostMapping(consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Залить файл; expected — имя из пакета, не совпало с содержимым — 400")
    public PracticeMediaService.Uploaded upload(@PathVariable String section,
                                                @RequestParam(value = "file", required = false) MultipartFile file,
                                                @RequestParam(value = "expected", required = false) String expected) {
        return service.upload(section, file, expected);
    }

    /** Для выгрузки пакета: бакет без CORS, и fetch из админки забрать файл напрямую не может. */
    @GetMapping("/{name}")
    @Operation(summary = "Скачать файл (выгрузка пакета)")
    public ResponseEntity<byte[]> download(@PathVariable String section, @PathVariable String name) {
        return service.download(section, name)
                .map(bytes -> ResponseEntity.ok().contentType(MediaType.parseMediaType(PracticeMediaNames.contentTypeOf(name))).body(bytes))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
```

- [ ] **Step 4: Открыть публичные ручки в `SecurityConfig`**

В `$J/shared/security/SecurityConfig.java` найти:

```java
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/catalog/**").permitAll()
```

и сразу после неё вставить:

```java
                        // Задания «Практики» для сайта ученика: гость открывает разделы без входа, в заданиях нет
                        // ничего личного (раньше это был публичный json на сайте). Только чтение.
                        .requestMatchers(HttpMethod.GET, "/practice-content/**").permitAll()
```

- [ ] **Step 5: Зелёный**

Run: `./gradlew test --tests 'kz.education.server.modules.practice.*'`
Expected: PASS — 4 класса, все зелёные.

- [ ] **Step 6: Контракт пакета**

`docs/practice/PACK_FORMAT.md`:

````markdown
# Пакет материалов «Практики» (`jts-practice-pack`)

Один zip переносит материалы раздела Практики между стендами: сайт → дев-админка → прод-админка. Источник
правды формата — этот файл; на него ссылаются CLAUDE.md сайта ученика и web-admin.

## Состав

```
manifest.json     {format, version, section, createdAt, source, counts, media:[{name, size}]}
items.json        массив записей раздела (схема — ниже, по разделу)
media/<sha24>.<ext>
```

- `format` — `"jts-practice-pack"`, `version` — `1`. Админка отказывает пакету версии выше своей.
- `section` — раздел (`listening`). Пакет чужого раздела экран не принимает.
- `source` — откуда собран: `jts-web-app@<коммит>` (скрипт сайта) или адрес бэкенда (выгрузка админкой).
- `counts` — по уровням плюс `items` (всего); сверяется с `items.json`.
- Имя медиа — первые 24 hex sha256 содержимого и расширение по сигнатуре. Битый файл ловится до заливки (хэш не
  сойдётся), одинаковый узнаётся по имени и второй раз не грузится. Бэкенд пересчитывает хэш сам (`expected`).

## Заливка (админка)

1. Прочитать zip, проверить манифест и хэши.
2. `POST /admin/practice/<раздел>/pack/diff` `{items}` — новые / изменённые / без изменений / есть только на стенде.
   400 — список нарушений правил (до 10).
3. `POST /admin/practice/media/<раздел>/exists` `{names}` → `{existing}`; остальные — по одному
   `POST /admin/practice/media/<раздел>` (multipart `file`, `expected=<имя>`). Обрыв — повторить: залитые пропустятся.
4. `POST /admin/practice/<раздел>/pack/import` `{items}`. Без всех записей в хранилище — 400, ничего не пишется.
   Видимость существующих записей импорт не меняет; записи, которых нет в пакете, не удаляет.

Выгрузка: `GET /admin/practice/<раздел>/pack/export` (только показываемые) + файлы по
`GET /admin/practice/media/<раздел>/<имя>`.

## Хранение

MinIO, ключ `practice/<раздел>/<имя>`, `Cache-Control: public, max-age=31536000, immutable`. Сайт берёт файл прямо из
бакета тегом `<audio>`/`<img>`/`<video>` (бакет публичный, CORS не нужен); json — через бэкенд.

## Раздел `listening` («Аудирование»)

`items.json` — задания в форме `public/practice/listening/content/<уровень>.json` сайта плюс `level`;
`audio` — `media/<sha24>.mp3`.

| Поле | Тип | Правило |
|---|---|---|
| `id` | string | `^(a1\|a2\|b1\|b2\|c1)_\d{3,}$`, префикс = `level`; не меняется (прогресс, квота) |
| `level` | string | `a1`…`c1` |
| `type` | string | `listen_choice` / `listen_assemble` / `listen_type` |
| `audio` | string | `media/<sha24>.mp3` |
| `explanation` | string | разбор; разметка — только `<b>`, `<i>` без атрибутов |
| `prompt`, `options[2..6]`, `answer` | — | `listen_choice`; `answer` ∈ `options` |
| `text`, `tokens[1..40]`, `distractors[0..20]` | — | `listen_assemble`; лишняя плитка ≠ нужной; `text` (что звучит) может быть длиннее плиток |
| `answer` | string | `listen_type` |

Порядок внутри уровня — порядок в `items.json`. Ученику: `GET /practice-content/listening/levels`,
`GET /practice-content/listening/{level}` (без входа, кэш 5 мин).
````

- [ ] **Step 7: Прогон всего, что задели, и сборка**

Run: `./gradlew test --tests 'kz.education.server.modules.practice.*' --tests 'kz.education.server.modules.shadowing.*' && ./gradlew compileJava`
Expected: PASS. Полный `./gradlew test` без Docker даёт ~21 чужое падение Testcontainers — их не чинить, в отчёт записать, что прогнаны только эти пакеты.

- [ ] **Step 8: Коммит, пуш, PR**

```bash
git add src/main/java/kz/education/server/presentation/common/practice src/main/java/kz/education/server/presentation/admin/practice src/main/java/kz/education/server/shared/security/SecurityConfig.java src/test/java/kz/education/server/modules/practice/PracticeContentSecurityTest.java docs/practice/PACK_FORMAT.md
git commit -m "$(printf 'feat(практика): ручки Аудирования и контракт пакета\n\nGET /practice-content/listening/** открыт гостю (как статика на\nсайте), заливка пакета и медиа — только ADMIN.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
git push -u origin feat/practice-listening
gh pr create --base develop --title "Практика → Аудирование: задания в админке (пилот переноса материалов)" --body "$(printf 'Пилот переноса материалов Практики из public/ сайта в админку.\n\n- таблица practice_listening_tasks (V387 — номер перепроверить перед мержем)\n- медиа Практики в MinIO по хэшу, Cache-Control immutable\n- GET /practice-content/listening/** без входа; пакет и медиа — ADMIN\n- контракт: docs/practice/PACK_FORMAT.md\n\nСпека: jts-web-app docs/superpowers/specs/2026-10-21-practice-content-to-admin-design.md\n\nТесты: ./gradlew test --tests modules.practice.* (+ shadowing) — зелёные.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)')"
```

После создания PR проверить его состояние (`gh pr view --json state,mergedAt`): PR здесь мержат быстро, и коммит после мержа в него уже не войдёт.

---

## Часть B — web-admin (`C:\Users\nural\Desktop\web-admin-practice-listening`)

Префикс: `S=src/app`.

### Task B1: Общий модуль пакета Практики

**Files:**
- Create: `$S/feature/system/practice-content/practice-pack.ts`
- Test: `$S/feature/system/practice-content/practice-pack.spec.ts`

**Interfaces:**
- Produces: `PRACTICE_PACK_FORMAT`, `PRACTICE_PACK_VERSION`, `sha24(bytes): Promise<string>`, `mediaName(ref: string|undefined|null): string|null`, `readPracticePack<T>(zip: Uint8Array, section: string): Promise<ReadPracticePack<T>>`, `buildPracticePack(input: {section, items, media, source, counts, now?}): Uint8Array`, `planUpload(refs: string[], inZip: Map<string, Uint8Array>, existing: string[]): {toUpload: string[]; missing: string[]}`; типы `PracticePackManifest`, `ReadPracticePack<T>`.

- [ ] **Step 1: Падающий spec**

`$S/feature/system/practice-content/practice-pack.spec.ts`:

```ts
import { strToU8, unzipSync, zipSync } from 'fflate';
import { buildPracticePack, mediaName, planUpload, readPracticePack, sha24 } from './practice-pack';

const MP3 = new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0, 1, 2, 3]);

async function samplePack(overrides: { section?: string; corrupt?: boolean } = {}) {
  const name = `${await sha24(MP3)}.mp3`;
  const items = [{ id: 'a1_001', level: 'a1', type: 'listen_type', audio: `media/${name}`, answer: 'Hi' }];
  const zip = buildPracticePack({
    section: overrides.section ?? 'listening',
    items,
    media: new Map([[name, overrides.corrupt ? new Uint8Array([9, 9, 9]) : MP3]]),
    source: 'test',
    counts: { a1: 1, items: 1 },
  });
  return { zip, name };
}

describe('practice-pack', () => {
  it('собранный пакет читается обратно', async () => {
    const { zip, name } = await samplePack();
    const pack = await readPracticePack<{ audio: string }>(zip, 'listening');
    expect(pack.errors).toEqual([]);
    expect(pack.items.length).toBe(1);
    expect(pack.media.has(name)).toBeTrue();
    expect(pack.manifest.section).toBe('listening');
  });

  it('испорченный файл ловится по хэшу', async () => {
    const { zip } = await samplePack({ corrupt: true });
    const pack = await readPracticePack(zip, 'listening');
    expect(pack.errors.some((e) => e.includes('хэш'))).toBeTrue();
  });

  it('пакет чужого раздела не принимается', async () => {
    const { zip } = await samplePack({ section: 'reading' });
    await expectAsync(readPracticePack(zip, 'listening')).toBeRejectedWithError(/раздел/);
  });

  it('не пакет Практики — понятная ошибка', async () => {
    const zip = zipSync({ 'readme.txt': strToU8('hi') });
    await expectAsync(readPracticePack(zip, 'listening')).toBeRejectedWithError(/manifest/);
  });

  it('mediaName вынимает имя из ссылки задания', () => {
    expect(mediaName('media/0123456789abcdef01234567.mp3')).toBe('0123456789abcdef01234567.mp3');
    expect(mediaName('a1/clip.mp3')).toBeNull();
    expect(mediaName(undefined)).toBeNull();
  });

  it('planUpload: грузим только то, чего нет на стенде; чего нет нигде — missing', () => {
    const inZip = new Map([['a.mp3', MP3], ['b.mp3', MP3]]);
    expect(planUpload(['a.mp3', 'b.mp3', 'c.mp3', 'a.mp3'], inZip, ['b.mp3'])).toEqual({ toUpload: ['a.mp3'], missing: ['c.mp3'] });
  });

  it('медиа в архиве лежат без пережатия', async () => {
    const { zip, name } = await samplePack();
    expect(unzipSync(zip)[`media/${name}`]).toEqual(MP3);
  });
});
```

- [ ] **Step 2: Запустить — падает**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/feature/system/practice-content/**/*.spec.ts'`
Expected: FAIL — модуль `./practice-pack` не найден.

- [ ] **Step 3: Реализация**

`$S/feature/system/practice-content/practice-pack.ts`:

```ts
import { strFromU8, strToU8, unzipSync, zipSync, Zippable } from 'fflate';

/**
 * Пакет материалов «Практики» — один zip, которым раздел переезжает между стендами (сайт → дев → прод).
 * Контракт — backend docs/practice/PACK_FORMAT.md:
 *
 *   manifest.json   формат, раздел, откуда и когда собран, счётчики, список медиа
 *   items.json      записи раздела (массив) — то тело, что принимают diff и import
 *   media/<имя>     файлы; имя — первые 24 hex SHA-256 содержимого
 *
 * Имя = хэш, поэтому битый файл ловится до заливки, а уже залитый узнаётся по имени и второй раз не грузится.
 * Подход тот же, что у пакетов IELTS (ielts-pack/content-pack.ts), но формат свой: IELTS не трогаем.
 */

export const PRACTICE_PACK_FORMAT = 'jts-practice-pack';
export const PRACTICE_PACK_VERSION = 1;
const MEDIA_DIR = 'media/';
const NAME = /^[a-f0-9]{24}\.mp3$/;

export interface PracticePackManifest {
  format: string;
  version: number;
  section: string;
  createdAt: string;
  source: string;
  counts: Record<string, number>;
  media: { name: string; size: number }[];
}

export interface ReadPracticePack<T> {
  manifest: PracticePackManifest;
  items: T[];
  media: Map<string, Uint8Array>;
  /** ошибки архива (битый хэш, нет файла из манифеста, не сошлись счётчики) — с ними заливка не начинается */
  errors: string[];
}

export async function sha24(bytes: Uint8Array): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource));
  return Array.from(d.slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** «media/<имя>» из записи → «<имя>»; иное — null. */
export function mediaName(ref: string | undefined | null): string | null {
  if (!ref || !ref.startsWith(MEDIA_DIR)) return null;
  const name = ref.slice(MEDIA_DIR.length);
  return NAME.test(name) ? name : null;
}

export function buildPracticePack(input: {
  section: string;
  items: unknown[];
  media: Map<string, Uint8Array>;
  source: string;
  counts: Record<string, number>;
  now?: Date;
}): Uint8Array {
  const names = [...input.media.keys()].sort();
  const manifest: PracticePackManifest = {
    format: PRACTICE_PACK_FORMAT,
    version: PRACTICE_PACK_VERSION,
    section: input.section,
    createdAt: (input.now || new Date()).toISOString(),
    source: input.source,
    counts: { ...input.counts },
    media: names.map((name) => ({ name, size: input.media.get(name)!.length })),
  };
  const files: Zippable = {
    'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
    'items.json': strToU8(JSON.stringify(input.items)),
  };
  // mp3 уже сжат — жать его ещё раз значит тратить время впустую; level 0 = хранить как есть
  for (const name of names) files[MEDIA_DIR + name] = [input.media.get(name)!, { level: 0 }];
  return zipSync(files, { level: 6 });
}

export async function readPracticePack<T>(zipBytes: Uint8Array, section: string): Promise<ReadPracticePack<T>> {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(zipBytes);
  } catch {
    throw new Error('Это не zip-архив или он повреждён');
  }
  if (!files['manifest.json'] || !files['items.json']) {
    throw new Error('В архиве нет manifest.json и items.json — это не пакет материалов Практики');
  }
  const manifest = JSON.parse(strFromU8(files['manifest.json'])) as PracticePackManifest;
  if (manifest.format !== PRACTICE_PACK_FORMAT) throw new Error(`Неизвестный формат пакета: ${manifest.format}`);
  if (manifest.version > PRACTICE_PACK_VERSION) throw new Error(`Пакет версии ${manifest.version} — обновите админку`);
  if (manifest.section !== section) throw new Error(`Это пакет раздела «${manifest.section}», а не «${section}»`);
  const parsed = JSON.parse(strFromU8(files['items.json']));
  const items = (Array.isArray(parsed) ? parsed : []) as T[];

  const errors: string[] = [];
  const media = new Map<string, Uint8Array>();
  for (const [path, bytes] of Object.entries(files)) {
    if (!path.startsWith(MEDIA_DIR) || path === MEDIA_DIR) continue;
    const name = path.slice(MEDIA_DIR.length);
    if (!NAME.test(name)) {
      errors.push(`Лишний файл в архиве: ${path}`);
      continue;
    }
    // имя = хэш содержимого: не сошлось — файл испорчен при копировании, грузить его нельзя
    if ((await sha24(bytes)) !== name.slice(0, 24)) errors.push(`Файл повреждён (хэш не совпал): ${name}`);
    else media.set(name, bytes);
  }
  for (const m of manifest.media || []) if (!files[MEDIA_DIR + m.name]) errors.push(`В архиве нет файла из манифеста: ${m.name}`);
  const declared = manifest.counts?.['items'];
  if (typeof declared === 'number' && declared !== items.length) {
    errors.push(`Записей в архиве ${items.length}, а в манифесте ${declared}`);
  }
  return { manifest, items, media, errors };
}

/**
 * Что грузить: ссылки записей минус то, что уже есть на стенде. Чего нет ни на стенде, ни в архиве — missing:
 * с таким пакетом импорт откажет, поэтому заливку лучше не начинать.
 */
export function planUpload(refs: string[], inZip: Map<string, Uint8Array>, existing: string[]): { toUpload: string[]; missing: string[] } {
  const have = new Set(existing);
  const toUpload: string[] = [];
  const missing: string[] = [];
  for (const name of [...new Set(refs)].sort()) {
    if (have.has(name)) continue;
    if (inZip.has(name)) toUpload.push(name);
    else missing.push(name);
  }
  return { toUpload, missing };
}
```

- [ ] **Step 4: Зелёный**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/feature/system/practice-content/**/*.spec.ts'`
Expected: PASS, 7 specs.

- [ ] **Step 5: Коммит**

```bash
git add src/app/feature/system/practice-content
git commit -m "$(printf 'feat(практика): общий модуль пакета материалов Практики\n\nФормат jts-practice-pack (backend docs/practice/PACK_FORMAT.md):\nчтение с проверкой хэшей, сборка, план заливки медиа.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

### Task B2: Модели и сервисы API

**Files:**
- Create: `$S/core/models/practice-listening.models.ts`
- Create: `$S/core/services/practice-listening.service.ts`
- Create: `$S/core/services/practice-media.service.ts`

**Interfaces:**
- Produces: типы `ListeningPackItem`, `ListeningAdminTask`, `ListeningDiff`, `ListeningImportResult`, `ListeningExport`, константа `LISTENING_LEVELS`.
- Produces: `PracticeListeningService.list(level?)`, `activate(key)`, `deactivate(key)`, `diff(items)`, `importPack(items)`, `exportPack()`; `PracticeMediaService.existing(section, names)`, `upload(section, name, bytes)`, `download(section, name)`.

- [ ] **Step 1: Модели**

`$S/core/models/practice-listening.models.ts`:

```ts
/** «Практика → Аудирование» — формы ответов backend /admin/practice/listening (docs/practice/PACK_FORMAT.md). */

export const LISTENING_LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1'] as const;

export interface ListeningPackItem {
  id: string;
  level: string;
  type: 'listen_choice' | 'listen_assemble' | 'listen_type' | string;
  /** media/<sha24>.mp3 */
  audio: string;
  explanation?: string;
  prompt?: string;
  options?: string[];
  answer?: string;
  text?: string;
  tokens?: string[];
  distractors?: string[];
}

export interface ListeningAdminTask {
  id: string;
  level: string;
  type: string;
  orderIndex: number;
  audioUrl: string;
  explanation: string;
  body: { prompt?: string; options?: string[]; answer?: string; text?: string; tokens?: string[]; distractors?: string[] };
  active: boolean;
  updatedAt?: string;
}

export interface ListeningDiff {
  added: string[];
  changed: string[];
  unchanged: number;
  onlyInAdmin: string[];
}

export interface ListeningImportResult {
  added: number;
  changed: number;
  unchanged: number;
}

export interface ListeningExport {
  format: string;
  version: number;
  section: string;
  items: ListeningPackItem[];
  media: string[];
}
```

- [ ] **Step 2: Сервисы**

`$S/core/services/practice-listening.service.ts`:

```ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import {
  ListeningAdminTask, ListeningDiff, ListeningExport, ListeningImportResult, ListeningPackItem
} from '../models/practice-listening.models';

/** Админский API «Практика → Аудирование» (`/admin/practice/listening`). */
@Injectable({ providedIn: 'root' })
export class PracticeListeningService extends BaseService {
  constructor(private http: HttpClient) {
    super();
  }

  list(level?: string): Observable<ListeningAdminTask[]> {
    const params = level ? new HttpParams().set('level', level) : undefined;
    return this.http.get<ListeningAdminTask[]>(this.url('/admin/practice/listening/tasks'), { params });
  }

  activate(key: string): Observable<ListeningAdminTask> {
    return this.http.patch<ListeningAdminTask>(this.url(`/admin/practice/listening/tasks/${encodeURIComponent(key)}/activate`), {});
  }

  deactivate(key: string): Observable<ListeningAdminTask> {
    return this.http.patch<ListeningAdminTask>(this.url(`/admin/practice/listening/tasks/${encodeURIComponent(key)}/deactivate`), {});
  }

  /** 400 — список нарушений правил заданий (до десяти), его показываем как есть. */
  diff(items: ListeningPackItem[]): Observable<ListeningDiff> {
    return this.http.post<ListeningDiff>(this.url('/admin/practice/listening/pack/diff'), { items });
  }

  importPack(items: ListeningPackItem[]): Observable<ListeningImportResult> {
    return this.http.post<ListeningImportResult>(this.url('/admin/practice/listening/pack/import'), { items });
  }

  exportPack(): Observable<ListeningExport> {
    return this.http.get<ListeningExport>(this.url('/admin/practice/listening/pack/export'));
  }
}
```

`$S/core/services/practice-media.service.ts`:

```ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';

export interface PracticeMediaUploaded {
  name: string;
  url: string;
  sizeBytes: number;
  existed: boolean;
}

/** Медиа разделов «Практики» на бэкенде (`/admin/practice/media/<раздел>`). Имя файла — хэш содержимого. */
@Injectable({ providedIn: 'root' })
export class PracticeMediaService extends BaseService {
  constructor(private http: HttpClient) {
    super();
  }

  existing(section: string, names: string[]): Observable<{ existing: string[] }> {
    return this.http.post<{ existing: string[] }>(this.url(`/admin/practice/media/${section}/exists`), { names });
  }

  /** expected — имя из пакета: бэкенд пересчитает хэш и откажет, если файл испорчен. */
  upload(section: string, name: string, bytes: Uint8Array): Observable<PracticeMediaUploaded> {
    const form = new FormData();
    form.append('file', new File([bytes as BlobPart], name, { type: 'audio/mpeg' }));
    const params = new HttpParams().set('expected', name);
    return this.http.post<PracticeMediaUploaded>(this.url(`/admin/practice/media/${section}`), form, { params });
  }

  /** Через бэкенд, а не из бакета напрямую: у бакета нет CORS. */
  download(section: string, name: string): Observable<ArrayBuffer> {
    return this.http.get(this.url(`/admin/practice/media/${section}/${name}`), { responseType: 'arraybuffer' });
  }
}
```

- [ ] **Step 3: Компиляция**

Run: `npx ng build --configuration development`
Expected: сборка без ошибок (сервисы пока никто не импортирует — tree-shaking их выкинет, ошибок типов быть не должно).

- [ ] **Step 4: Коммит**

```bash
git add src/app/core/models/practice-listening.models.ts src/app/core/services/practice-listening.service.ts src/app/core/services/practice-media.service.ts
git commit -m "$(printf 'feat(практика): API Аудирования и медиа Практики в админке\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

### Task B3: Экран «Библиотека → Аудирование»

**Files:**
- Create: `$S/feature/system/practice-listening/listening-tasks/listening-tasks.component.ts`
- Create: `$S/feature/system/practice-listening/listening-tasks/listening-tasks.component.html`
- Create: `$S/feature/system/practice-listening/listening-tasks/listening-tasks.component.scss`
- Test: `$S/feature/system/practice-listening/listening-tasks/listening-tasks.component.spec.ts`

**Interfaces:**
- Consumes: `PracticeListeningService.list/activate/deactivate`, `ToastService.showError`, `apiErrorText(e, fallback)` из `core/utils/api-error-text.util`.
- Produces: `ListeningTasksComponent` (standalone), методы `selectLevel(level|null)`, `toggle(task)`, `openPack()`; геттеры `visible`, `counts`.

- [ ] **Step 1: Падающий spec**

`$S/feature/system/practice-listening/listening-tasks/listening-tasks.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ListeningTasksComponent } from './listening-tasks.component';
import { PracticeListeningService } from '../../../../core/services/practice-listening.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ListeningAdminTask } from '../../../../core/models/practice-listening.models';

const TASK = (id: string, level: string, active = true): ListeningAdminTask => ({
  id, level, type: 'listen_type', orderIndex: 0, audioUrl: `https://files.test/${id}.mp3`,
  explanation: '', body: { answer: 'Hi' }, active,
});

async function build(overrides: Record<string, unknown> = {}) {
  TestBed.resetTestingModule();
  const service = {
    list: () => of([TASK('a1_001', 'a1'), TASK('a1_002', 'a1', false), TASK('b1_001', 'b1')]),
    activate: jasmine.createSpy('activate').and.returnValue(of(TASK('a1_002', 'a1', true))),
    deactivate: jasmine.createSpy('deactivate').and.returnValue(of(TASK('a1_001', 'a1', false))),
    ...overrides,
  };
  const toast = { showSuccess: jasmine.createSpy('showSuccess'), showError: jasmine.createSpy('showError') };
  const router = { navigate: jasmine.createSpy('navigate') };
  await TestBed.configureTestingModule({
    imports: [ListeningTasksComponent, NoopAnimationsModule],
    providers: [
      { provide: PracticeListeningService, useValue: service },
      { provide: ToastService, useValue: toast },
      { provide: Router, useValue: router },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ListeningTasksComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service, toast, router };
}

describe('ListeningTasksComponent', () => {
  it('считает задания по уровням и фильтрует уровень', async () => {
    const { component } = await build();
    expect(component.counts['a1']).toBe(2);
    expect(component.counts['b1']).toBe(1);
    component.selectLevel('b1');
    expect(component.visible.map((t) => t.id)).toEqual(['b1_001']);
    component.selectLevel(null);
    expect(component.visible.length).toBe(3);
  });

  it('переключатель ходит в activate/deactivate и обновляет строку', async () => {
    const { component, service } = await build();
    const hidden = component.items.find((t) => t.id === 'a1_002')!;
    component.toggle(hidden);
    expect(service.activate).toHaveBeenCalledWith('a1_002');
    expect(hidden.active).toBeTrue();
  });

  it('ошибка загрузки — тост, не белый экран', async () => {
    const { component, toast } = await build({ list: () => throwError(() => new Error('x')) });
    expect(component.loading).toBeFalse();
    expect(toast.showError).toHaveBeenCalled();
  });

  it('«Пакет» ведёт на экран заливки', async () => {
    const { component, router } = await build();
    component.openPack();
    expect(router.navigate).toHaveBeenCalledWith(['/system', 'library', 'listening', 'pack']);
  });
});
```

- [ ] **Step 2: Запустить — падает**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/feature/system/practice-listening/**/*.spec.ts'`
Expected: FAIL — компонента нет.

- [ ] **Step 3: Компонент**

`listening-tasks.component.ts`:

```ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { PracticeListeningService } from '../../../../core/services/practice-listening.service';
import { ListeningAdminTask, LISTENING_LEVELS } from '../../../../core/models/practice-listening.models';
import { ToastService } from '../../../../core/services/toast.service';
import { apiErrorText } from '../../../../core/utils/api-error-text.util';

/**
 * «Библиотека → Аудирование»: задания, залитые пакетом (пилот переноса Практики из public/ сайта). Форм правки на
 * этом этапе нет — материал меняется новым пакетом; здесь только просмотр, прослушивание и «скрыть/показать».
 */
@Component({
  selector: 'app-listening-tasks',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './listening-tasks.component.html',
  styleUrl: './listening-tasks.component.scss',
})
export class ListeningTasksComponent implements OnInit {
  readonly levels = LISTENING_LEVELS;
  items: ListeningAdminTask[] = [];
  level: string | null = null;
  loading = true;
  busyId: string | null = null;

  constructor(private service: PracticeListeningService, private toast: ToastService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  get visible(): ListeningAdminTask[] {
    return this.level ? this.items.filter((t) => t.level === this.level) : this.items;
  }

  get counts(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const t of this.items) out[t.level] = (out[t.level] || 0) + 1;
    return out;
  }

  load(): void {
    this.loading = true;
    this.service.list().subscribe({
      next: (data) => { this.items = data ?? []; this.loading = false; },
      error: (e) => { this.toast.showError(apiErrorText(e, 'Не удалось загрузить задания')); this.loading = false; },
    });
  }

  selectLevel(level: string | null): void {
    this.level = level;
  }

  /** Короткая подпись задания в строке таблицы: вопрос, плитки или эталон — то, что увидит ученик. */
  summary(t: ListeningAdminTask): string {
    if (t.type === 'listen_choice') return `${t.body.prompt ?? ''} → ${t.body.answer ?? ''}`;
    if (t.type === 'listen_assemble') return (t.body.tokens ?? []).join(' ');
    return t.body.answer ?? '';
  }

  toggle(t: ListeningAdminTask): void {
    this.busyId = t.id;
    const request = t.active ? this.service.deactivate(t.id) : this.service.activate(t.id);
    request.subscribe({
      next: (updated) => { t.active = updated.active; this.busyId = null; },
      error: (e) => { this.toast.showError(apiErrorText(e, 'Не удалось изменить статус')); this.busyId = null; },
    });
  }

  openPack(): void {
    this.router.navigate(['/system', 'library', 'listening', 'pack']);
  }
}
```

`listening-tasks.component.html`:

```html
<div class="lt">
  <div class="lt__head">
    <div>
      <h2>Аудирование</h2>
      <p class="lt__subtitle">Задания «Практики»: ученик слушает запись и отвечает. Материал заливается пакетом.</p>
    </div>
    <button mat-flat-button color="primary" (click)="openPack()">
      <mat-icon>inventory_2</mat-icon> Пакет
    </button>
  </div>

  <div class="lt__loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

  <ng-container *ngIf="!loading">
    <div class="lt__levels" *ngIf="items.length">
      <button mat-stroked-button [class.is-on]="level === null" (click)="selectLevel(null)">Все · {{ items.length }}</button>
      <button mat-stroked-button *ngFor="let l of levels" [class.is-on]="level === l" (click)="selectLevel(l)">
        {{ l.toUpperCase() }} · {{ counts[l] || 0 }}
      </button>
    </div>

    <table class="lt__table" *ngIf="visible.length; else empty">
      <thead>
        <tr><th>id</th><th>Тип</th><th>Задание</th><th>Запись</th><th>Статус</th></tr>
      </thead>
      <tbody>
        <tr *ngFor="let t of visible" [class.is-hidden]="!t.active">
          <td class="lt__id">{{ t.id }}</td>
          <td>{{ t.type }}</td>
          <td class="lt__summary">{{ summary(t) }}</td>
          <td><audio controls preload="none" [src]="t.audioUrl"></audio></td>
          <td>
            <button mat-stroked-button [disabled]="busyId === t.id" (click)="toggle(t)">
              <mat-icon>{{ t.active ? 'visibility' : 'visibility_off' }}</mat-icon>
              {{ t.active ? 'Показано' : 'Скрыто' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <ng-template #empty>
      <div class="lt__empty">
        <mat-icon>headphones</mat-icon>
        <p>Заданий пока нет. Нажмите «Пакет» и залейте пакет Аудирования.</p>
      </div>
    </ng-template>
  </ng-container>
</div>
```

`listening-tasks.component.scss`:

```scss
.lt { display: flex; flex-direction: column; gap: 16px; }

.lt__head {
  display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  h2 { margin: 0; font-size: 22px; font-weight: 700; line-height: 30px; }
}

.lt__subtitle { margin: 4px 0 0; color: rgba(0, 0, 0, 0.6); }
.lt__loading, .lt__empty { display: flex; flex-direction: column; align-items: center; padding: 48px 0; gap: 8px; }
.lt__levels { display: flex; flex-wrap: wrap; gap: 8px; button.is-on { background: rgba(63, 81, 181, 0.12); } }

.lt__table {
  width: 100%; border-collapse: collapse;
  th, td { text-align: left; padding: 8px; border-bottom: 1px solid rgba(0, 0, 0, 0.08); vertical-align: middle; }
  tr.is-hidden td { opacity: 0.55; }
  audio { height: 32px; max-width: 220px; }
}

.lt__id { font-family: monospace; white-space: nowrap; }
.lt__summary { max-width: 420px; }
```

- [ ] **Step 4: Зелёный**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/feature/system/practice-listening/**/*.spec.ts'`
Expected: PASS, 4 specs.

- [ ] **Step 5: Коммит**

```bash
git add src/app/feature/system/practice-listening/listening-tasks
git commit -m "$(printf 'feat(практика): экран заданий Аудирования в «Библиотеке»\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

### Task B4: Экран пакета (заливка и выгрузка)

**Files:**
- Create: `$S/feature/system/practice-listening/listening-pack/listening-pack.component.ts`
- Create: `$S/feature/system/practice-listening/listening-pack/listening-pack.component.html`
- Test: `$S/feature/system/practice-listening/listening-pack/listening-pack.component.spec.ts`

**Interfaces:**
- Consumes: `readPracticePack`, `buildPracticePack`, `planUpload`, `mediaName` (B1); `PracticeListeningService.diff/importPack/exportPack`, `PracticeMediaService.existing/upload/download` (B2); `environment.apiUrl`.
- Produces: `ListeningPackComponent` с методами `loadBytes(bytes: Uint8Array)`, `apply()`, `exportPack()`; поля `pack`, `diff`, `plan`, `progress`, `result`, `error`.

- [ ] **Step 1: Падающий spec**

`listening-pack.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { ListeningPackComponent } from './listening-pack.component';
import { PracticeListeningService } from '../../../../core/services/practice-listening.service';
import { PracticeMediaService } from '../../../../core/services/practice-media.service';
import { ToastService } from '../../../../core/services/toast.service';
import { buildPracticePack, sha24 } from '../../practice-content/practice-pack';

const A = new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0, 1]);
const B = new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0, 2]);

async function zip() {
  const a = `${await sha24(A)}.mp3`;
  const b = `${await sha24(B)}.mp3`;
  const items = [
    { id: 'a1_001', level: 'a1', type: 'listen_type', audio: `media/${a}`, answer: 'Hi' },
    { id: 'a1_002', level: 'a1', type: 'listen_type', audio: `media/${b}`, answer: 'Bye' },
  ];
  return { a, b, bytes: buildPracticePack({ section: 'listening', items, media: new Map([[a, A], [b, B]]), source: 'test', counts: { a1: 2, items: 2 } }) };
}

async function build(existing: string[]) {
  TestBed.resetTestingModule();
  const api = {
    diff: jasmine.createSpy('diff').and.returnValue(of({ added: ['a1_001', 'a1_002'], changed: [], unchanged: 0, onlyInAdmin: [] })),
    importPack: jasmine.createSpy('importPack').and.returnValue(of({ added: 2, changed: 0, unchanged: 0 })),
    exportPack: jasmine.createSpy('exportPack'),
  };
  const media = {
    existing: jasmine.createSpy('existing').and.returnValue(of({ existing })),
    upload: jasmine.createSpy('upload').and.callFake((_s: string, name: string) => of({ name, url: '', sizeBytes: 1, existed: false })),
    download: jasmine.createSpy('download'),
  };
  const toast = { showSuccess: jasmine.createSpy('showSuccess'), showError: jasmine.createSpy('showError') };
  await TestBed.configureTestingModule({
    imports: [ListeningPackComponent, NoopAnimationsModule],
    providers: [
      { provide: PracticeListeningService, useValue: api },
      { provide: PracticeMediaService, useValue: media },
      { provide: ToastService, useValue: toast },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ListeningPackComponent);
  fixture.detectChanges();
  return { component: fixture.componentInstance, api, media };
}

describe('ListeningPackComponent', () => {
  it('сверяет пакет и грузит только записи, которых нет на стенде, затем импортирует', async () => {
    const { a, b, bytes } = await zip();
    const { component, api, media } = await build([a]);

    await component.loadBytes(bytes);
    expect(api.diff).toHaveBeenCalled();
    expect(component.plan?.toUpload).toEqual([b]);

    await component.apply();
    expect(media.upload).toHaveBeenCalledTimes(1);
    expect(media.upload.calls.argsFor(0)[1]).toBe(b);
    expect(api.importPack).toHaveBeenCalled();
    expect(component.result?.added).toBe(2);
  });

  it('все записи уже на стенде — ничего не грузит, только импорт', async () => {
    const { a, b, bytes } = await zip();
    const { component, api, media } = await build([a, b]);
    await component.loadBytes(bytes);
    await component.apply();
    expect(media.upload).not.toHaveBeenCalled();
    expect(api.importPack).toHaveBeenCalled();
  });

  it('не пакет — ошибка на экране, сверки нет', async () => {
    const { component, api } = await build([]);
    await component.loadBytes(new Uint8Array([1, 2, 3]));
    expect(component.error).toContain('zip');
    expect(api.diff).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Запустить — падает**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/feature/system/practice-listening/**/*.spec.ts'`
Expected: FAIL — `ListeningPackComponent` нет.

- [ ] **Step 3: Компонент**

`listening-pack.component.ts`:

```ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { PracticeListeningService } from '../../../../core/services/practice-listening.service';
import { PracticeMediaService } from '../../../../core/services/practice-media.service';
import { ToastService } from '../../../../core/services/toast.service';
import { apiErrorText } from '../../../../core/utils/api-error-text.util';
import { ListeningDiff, ListeningImportResult, ListeningPackItem } from '../../../../core/models/practice-listening.models';
import { buildPracticePack, mediaName, planUpload, readPracticePack, ReadPracticePack } from '../../practice-content/practice-pack';

const SECTION = 'listening';

/**
 * Пакет «Аудирования»: zip из скрипта сайта (scripts/practice-pack/build-listening.js) или выгрузка другого стенда.
 * Браузер распаковывает архив сам и шлёт файлы по одному: так 80 МБ записей не упираются в лимит размера запроса,
 * а оборванная заливка продолжается с места — перед каждой заливкой стенд заново говорит, что у него уже есть.
 */
@Component({
  selector: 'app-listening-pack',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './listening-pack.component.html',
  // Классы .lt* — общие с экраном заданий: один раздел, один файл стилей.
  styleUrl: '../listening-tasks/listening-tasks.component.scss',
})
export class ListeningPackComponent {
  pack: ReadPracticePack<ListeningPackItem> | null = null;
  diff: ListeningDiff | null = null;
  plan: { toUpload: string[]; missing: string[] } | null = null;
  progress: { done: number; total: number } | null = null;
  result: ListeningImportResult | null = null;
  error = '';
  busy = false;
  exporting: { done: number; total: number } | null = null;

  constructor(
    private api: PracticeListeningService,
    private media: PracticeMediaService,
    private toast: ToastService,
  ) {}

  async onFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) await this.loadBytes(new Uint8Array(await file.arrayBuffer()));
  }

  async loadBytes(bytes: Uint8Array): Promise<void> {
    this.reset();
    try {
      this.pack = await readPracticePack<ListeningPackItem>(bytes, SECTION);
    } catch (e) {
      this.error = (e as Error).message;
      return;
    }
    if (this.pack.errors.length) {
      this.error = this.pack.errors.slice(0, 10).join('\n');
      return;
    }
    await this.check();
  }

  private refs(): string[] {
    return (this.pack?.items ?? []).map((i) => mediaName(i.audio)).filter((n): n is string => !!n);
  }

  private async check(): Promise<void> {
    if (!this.pack) return;
    this.busy = true;
    try {
      this.diff = await firstValueFrom(this.api.diff(this.pack.items));
      const existing = (await firstValueFrom(this.media.existing(SECTION, [...new Set(this.refs())]))).existing;
      this.plan = planUpload(this.refs(), this.pack.media, existing);
    } catch (e) {
      this.error = apiErrorText(e, 'Стенд не принял пакет');
    } finally {
      this.busy = false;
    }
  }

  async apply(): Promise<void> {
    if (!this.pack) return;
    this.busy = true;
    this.error = '';
    try {
      // План пересчитывается: между сверкой и нажатием (или после обрыва) часть файлов могла уже доехать
      const existing = (await firstValueFrom(this.media.existing(SECTION, [...new Set(this.refs())]))).existing;
      this.plan = planUpload(this.refs(), this.pack.media, existing);
      if (this.plan.missing.length) {
        this.error = `Записей нет ни на стенде, ни в архиве: ${this.plan.missing.slice(0, 5).join(', ')}`;
        return;
      }
      this.progress = { done: 0, total: this.plan.toUpload.length };
      for (const name of this.plan.toUpload) {
        await firstValueFrom(this.media.upload(SECTION, name, this.pack.media.get(name)!));
        this.progress = { done: this.progress.done + 1, total: this.progress.total };
      }
      this.result = await firstValueFrom(this.api.importPack(this.pack.items));
      this.toast.showSuccess(`Залито: новых ${this.result.added}, изменённых ${this.result.changed}`);
    } catch (e) {
      this.error = apiErrorText(e, 'Заливка оборвалась — нажмите «Залить» ещё раз, залитое пропустится');
    } finally {
      this.busy = false;
    }
  }

  async exportPack(): Promise<void> {
    this.error = '';
    try {
      const bundle = await firstValueFrom(this.api.exportPack());
      const files = new Map<string, Uint8Array>();
      this.exporting = { done: 0, total: bundle.media.length };
      for (const name of bundle.media) {
        files.set(name, new Uint8Array(await firstValueFrom(this.media.download(SECTION, name))));
        this.exporting = { done: this.exporting.done + 1, total: this.exporting.total };
      }
      const counts: Record<string, number> = { items: bundle.items.length };
      for (const i of bundle.items) counts[i.level] = (counts[i.level] || 0) + 1;
      const zip = buildPracticePack({ section: SECTION, items: bundle.items, media: files, source: environment.apiUrl, counts });
      const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `listening-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      this.error = apiErrorText(e, 'Не удалось выгрузить пакет');
    } finally {
      this.exporting = null;
    }
  }

  private reset(): void {
    this.pack = null;
    this.diff = null;
    this.plan = null;
    this.progress = null;
    this.result = null;
    this.error = '';
  }
}
```

`listening-pack.component.html`:

```html
<div class="lt">
  <div class="lt__head">
    <div>
      <h2>Аудирование · пакет</h2>
      <p class="lt__subtitle">Залить пакет (zip) или выгрузить задания стенда для переноса на другой стенд.</p>
    </div>
    <a mat-stroked-button routerLink="/system/library/listening"><mat-icon>arrow_back</mat-icon> К заданиям</a>
  </div>

  <section>
    <h3>Залить пакет</h3>
    <input type="file" accept=".zip,application/zip" (change)="onFile($event)" [disabled]="busy">
    <mat-progress-bar *ngIf="busy && !progress" mode="indeterminate"></mat-progress-bar>

    <div *ngIf="pack && diff">
      <p>Из пакета ({{ pack.manifest.source }}, {{ pack.manifest.createdAt | date:'short' }}):
        новых <b>{{ diff.added.length }}</b>, изменённых <b>{{ diff.changed.length }}</b>,
        без изменений <b>{{ diff.unchanged }}</b>, есть только на стенде <b>{{ diff.onlyInAdmin.length }}</b>.</p>
      <p *ngIf="diff.changed.length">Изменятся: {{ diff.changed.slice(0, 20).join(', ') }}<span *ngIf="diff.changed.length > 20">…</span></p>
      <p *ngIf="diff.onlyInAdmin.length">Останутся как есть (в пакете их нет): {{ diff.onlyInAdmin.slice(0, 20).join(', ') }}<span *ngIf="diff.onlyInAdmin.length > 20">…</span></p>
      <p *ngIf="plan">Записей залить: <b>{{ plan.toUpload.length }}</b><span *ngIf="plan.missing.length">, нет нигде: <b>{{ plan.missing.length }}</b></span>.</p>
      <button mat-flat-button color="primary" [disabled]="busy" (click)="apply()">
        <mat-icon>cloud_upload</mat-icon> Залить
      </button>
    </div>

    <div *ngIf="progress">
      <mat-progress-bar mode="determinate" [value]="progress.total ? progress.done / progress.total * 100 : 100"></mat-progress-bar>
      <p>Записи: {{ progress.done }} из {{ progress.total }}</p>
    </div>

    <p *ngIf="result">Готово: новых {{ result.added }}, изменённых {{ result.changed }}, без изменений {{ result.unchanged }}.</p>
    <pre *ngIf="error" class="lt__error">{{ error }}</pre>
  </section>

  <section>
    <h3>Выгрузить пакет</h3>
    <p>Только показываемые задания: скрытое здесь на другой стенд не поедет.</p>
    <button mat-stroked-button [disabled]="!!exporting" (click)="exportPack()"><mat-icon>download</mat-icon> Выгрузить</button>
    <div *ngIf="exporting">
      <mat-progress-bar mode="determinate" [value]="exporting.total ? exporting.done / exporting.total * 100 : 100"></mat-progress-bar>
      <p>Записи: {{ exporting.done }} из {{ exporting.total }}</p>
    </div>
  </section>
</div>
```

Стили — классы `.lt*` из `listening-tasks.component.scss` (подключён в `@Component` выше); дописать в этот scss:

```scss
.lt__error { white-space: pre-wrap; color: #b3261e; background: rgba(179, 38, 30, 0.06); padding: 12px; border-radius: 8px; }
.lt section { display: flex; flex-direction: column; gap: 8px; padding: 16px; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 12px; }
```

- [ ] **Step 4: Зелёный**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/feature/system/practice-listening/**/*.spec.ts'`
Expected: PASS, 7 specs (4 + 3).

- [ ] **Step 5: Коммит**

```bash
git add src/app/feature/system/practice-listening/listening-pack src/app/feature/system/practice-listening/listening-tasks/listening-tasks.component.scss
git commit -m "$(printf 'feat(практика): заливка и выгрузка пакета Аудирования\n\nМедиа по одному с проверкой «уже есть» — обрыв продолжается с места.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

### Task B5: Маршруты, вкладка, сборка, PR

**Files:**
- Create: `$S/feature/system/practice-listening/practice-listening.routes.ts`
- Modify: `$S/feature/system/system.routes.ts` (дети `library`, после `shadowing`)
- Modify: `$S/feature/system/library/library.component.ts` (вкладка и счётчик)

- [ ] **Step 1: Маршруты раздела**

`practice-listening.routes.ts`:

```ts
import { Routes } from '@angular/router';
import { ListeningTasksComponent } from './listening-tasks/listening-tasks.component';
import { ListeningPackComponent } from './listening-pack/listening-pack.component';

export const PRACTICE_LISTENING_ROUTES: Routes = [
  { path: '', component: ListeningTasksComponent },
  { path: 'pack', component: ListeningPackComponent },
];
```

В `system.routes.ts` найти блок:

```ts
          {
            path: 'shadowing',
            loadChildren: () => import('./shadowing/shadowing.routes').then(m => m.SHADOWING_ROUTES),
          },
```

и сразу после него вставить:

```ts
          {
            // Пилот переноса материалов «Практики» из public/ сайта ученика в админку (backend docs/practice/PACK_FORMAT.md).
            path: 'listening',
            loadChildren: () => import('./practice-listening/practice-listening.routes').then(m => m.PRACTICE_LISTENING_ROUTES),
          },
```

- [ ] **Step 2: Вкладка и счётчик**

В `library.component.ts`:
- импорт рядом с `ShadowingService`: `import { PracticeListeningService } from '../../../core/services/practice-listening.service';`
- в `tabs` после строки `shadowing`: `{ segment: 'listening', label: 'Аудирование', icon: 'headphones', count: null },`
- в конструктор последним параметром: `private practiceListeningService: PracticeListeningService`
- в `forkJoin({...})` добавить `listening: this.practiceListeningService.list().pipe(catchError(() => of([]))),`, в деструктуризацию `subscribe(({ ..., songs, listening })` — и строку `this.setCount('listening', listening.length);`
- в doc-комментарии класса «девятью» → «десятью», «девять отдельных запросов» → «десять».

- [ ] **Step 3: Все spec раздела, полный прогон и сборка**

Run: `npx ng test --watch=false --browsers=ChromeHeadless && npx ng build --configuration development`
Expected: всё зелёное, сборка без ошибок. Падения, которые были и до ветки (сверить с `git stash`-free прогоном на `origin/develop` при сомнении), — в отчёт, не чинить.

- [ ] **Step 4: Коммит, пуш, PR**

```bash
git add src/app/feature/system/practice-listening/practice-listening.routes.ts src/app/feature/system/system.routes.ts src/app/feature/system/library/library.component.ts
git commit -m "$(printf 'feat(практика): вкладка «Аудирование» в Библиотеке\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
git push -u origin feat/practice-listening
gh pr create --base develop --title "Библиотека → Аудирование: задания и пакет (пилот переноса Практики)" --body "$(printf 'Вкладка «Аудирование»: список заданий по уровням, ▶ запись, скрыть/показать; экран пакета — залить zip (diff, заливка медиа с продолжением после обрыва, импорт) и выгрузить.\n\nБэкенд: PR feat/practice-listening в backend (мержить первым). Контракт: backend docs/practice/PACK_FORMAT.md.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)')"
```

---

## Часть C — jts-web-app (`C:\Users\nural\Desktop\jts-practice-listening`)

### Task C1: Адрес бэкенда для браузера — одним модулем

**Files:**
- Create: `src/lib/apiBase.js`
- Modify: `src/api.js:11`

**Interfaces:**
- Produces: `API_BASE: string` (без завершающего `/`, без BOM).

Отдельный модуль, а не экспорт из `api.js`: тесты экранов мокают `api.js` целиком (`vi.mock('../api.js', …)`), и новый импорт из него в загрузчике сломал бы их «нет такого экспорта в моке».

- [ ] **Step 1: Модуль**

`src/lib/apiBase.js`:

```js
// Адрес JTS-бэкенда для браузера. Отдельным модулем, а не экспортом из api.js:
// экраны в тестах мокают api.js целиком, и загрузчик Практики, импортирующий
// адрес оттуда, падал бы на «нет такого экспорта». BOM и хвостовой слэш
// вырезаем — та же грабля, что у BACKEND_URL на сервере (auth-server.js).
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://dev-server.justtostudy.kz')
  .replace(/^\uFEFF/, '')
  .trim()
  .replace(/\/+$/, '')
```

- [ ] **Step 2: `api.js` берёт адрес оттуда**

В `src/api.js` заменить строку

```js
const BASE = process.env.NEXT_PUBLIC_API_URL || 'https://dev-server.justtostudy.kz'
```

на

```js
import { API_BASE } from './lib/apiBase.js'

const BASE = API_BASE
```

(импорт поднять к остальным импортам в начале файла, если линтер требует `import/first`).

- [ ] **Step 3: Проверка**

Run: `npm run lint -- src/api.js src/lib/apiBase.js && npx vitest run src/lib/`
Expected: без ошибок.

- [ ] **Step 4: Коммит**

```bash
git add src/lib/apiBase.js src/api.js
git commit -m "$(printf 'refactor: адрес бэкенда для браузера — отдельным модулем\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

### Task C2: Загрузчик «бэкенд, иначе статика»

**Files:**
- Create: `src/practice/remoteContent.js`
- Test: `src/practice/remoteContent.test.js`

**Interfaces:**
- Consumes: `API_BASE` (C1).
- Produces: `loadPracticeContent(section, path, staticUrl, { fetchImpl, base, timeoutMs }) → Promise<{ data, source: 'api'|'static' }>`; `staticUrl === null` — запасного пути нет, при неудаче бэкенда бросает `Error('practice content unavailable: <section>/<path>')`. `REMOTE_TIMEOUT_MS = 8000`.

- [ ] **Step 1: Падающий тест**

`src/practice/remoteContent.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { loadPracticeContent } from './remoteContent.js'

const ok = (body) => ({ ok: true, status: 200, json: async () => body })
const status = (code) => ({ ok: false, status: code, json: async () => ({}) })
const STATIC = [{ id: 'a1_001', from: 'static' }]
const REMOTE = [{ id: 'a1_001', from: 'api' }]

function fetchWith(remote) {
  return vi.fn(async (url) => {
    if (String(url).startsWith('https://api.test/')) {
      if (remote instanceof Error) throw remote
      return remote
    }
    if (url === '/practice/listening/content/a1.json') return ok(STATIC)
    return status(404)
  })
}

const load = (fetchImpl, staticUrl = '/practice/listening/content/a1.json') =>
  loadPracticeContent('listening', 'a1', staticUrl, { fetchImpl, base: 'https://api.test', timeoutMs: 50 })

describe('loadPracticeContent', () => {
  it('бэкенд ответил заданиями — берём их', async () => {
    const f = fetchWith(ok(REMOTE))
    expect(await load(f)).toEqual({ data: REMOTE, source: 'api' })
    expect(f).toHaveBeenCalledTimes(1)
    expect(f.mock.calls[0][0]).toBe('https://api.test/practice-content/listening/a1')
  })

  it.each([
    ['404', status(404)],
    ['5xx', status(502)],
    ['пустой список (на стенде ещё не залили)', ok([])],
    ['не массив', ok({ ok: true })],
    ['ошибка сети', new Error('offline')],
  ])('%s — статика', async (_name, remote) => {
    expect(await load(fetchWith(remote))).toEqual({ data: STATIC, source: 'static' })
  })

  it('бэкенд завис — по таймауту статика', async () => {
    const f = vi.fn((url, init) => {
      if (String(url).startsWith('https://api.test/')) {
        return new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))))
      }
      return Promise.resolve(ok(STATIC))
    })
    expect((await load(f)).source).toBe('static')
  })

  it('статика тоже не ответила — ошибка (экран покажет «не удалось загрузить»)', async () => {
    const f = vi.fn(async () => status(404))
    await expect(load(f)).rejects.toThrow()
  })

  it('без запасного пути (после чистки раздела) — неудача бэкенда это ошибка', async () => {
    await expect(load(fetchWith(status(404)), null)).rejects.toThrow(/practice content unavailable/)
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `npx vitest run src/practice/remoteContent.test.js`
Expected: FAIL — `Failed to resolve import "./remoteContent.js"`.

- [ ] **Step 3: Реализация**

`src/practice/remoteContent.js`:

```js
// Загрузчик материалов «Практики»: сначала бэкенд, потом статика.
//
// Материалы раздел за разделом переезжают из public/practice/** в админку
// (бэкенд + MinIO, docs/superpowers/specs/2026-10-21-practice-content-to-admin-design.md).
// Код сайта на деве и проде один, а пакет на прод заливают позже, чем
// выкатывают сайт, — поэтому, пока у раздела на стенде пусто (404, пустой
// список) или бэкенд молчит, раздел обязан работать как раньше, со статики.
// После проверки прода раздел чистят: статику удаляют и зовут загрузчик с
// staticUrl = null — тогда неудача бэкенда честно становится ошибкой экрана.
import { API_BASE } from '../lib/apiBase.js'

// Дольше ждать нельзя: ученик смотрит на «Загрузка…», а статика рядом.
export const REMOTE_TIMEOUT_MS = 8000

export async function loadPracticeContent(section, path, staticUrl, opts = {}) {
  const { fetchImpl = globalThis.fetch, base = API_BASE, timeoutMs = REMOTE_TIMEOUT_MS } = opts
  const remote = await tryRemote(`${base}/practice-content/${section}/${path}`, fetchImpl, timeoutMs)
  if (remote) {
    console.info(`[practice] ${section}/${path} ← api`)
    return { data: remote, source: 'api' }
  }
  if (staticUrl == null) throw new Error(`practice content unavailable: ${section}/${path}`)
  const res = await fetchImpl(staticUrl)
  if (!res.ok) throw new Error('bad status ' + res.status)
  const data = await res.json()
  console.info(`[practice] ${section}/${path} ← static`)
  return { data, source: 'static' }
}

// null — «у бэкенда нет»: любая неудача, пустой список, не массив. Пустой
// список — не «в разделе нет заданий», а «на этом стенде пакет ещё не залит».
async function tryRemote(url, fetchImpl, timeoutMs) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null
  try {
    const res = await fetchImpl(url, ctrl ? { signal: ctrl.signal } : undefined)
    if (!res || !res.ok) return null
    const data = await res.json()
    return Array.isArray(data) && data.length ? data : null
  } catch {
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}
```

- [ ] **Step 4: Зелёный**

Run: `npx vitest run src/practice/remoteContent.test.js`
Expected: PASS, 9 тестов.

- [ ] **Step 5: Коммит**

```bash
git add src/practice/remoteContent.js src/practice/remoteContent.test.js
git commit -m "$(printf 'feat(практика): загрузчик материалов — бэкенд, иначе статика\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

### Task C3: Аудирование читает через загрузчик

**Files:**
- Create: `src/practice/listening/listeningContent.js`
- Test: `src/practice/listening/listeningContent.test.js`
- Modify: `src/screens/ListeningPage.jsx` (строки 39–44 `audioUrl`/`Rich`, ~325 состояние, ~401–425 `loadContent`, корень `<div className="lt">`, ~601 `AudioBlock`)
- Modify: `src/screens/ListeningPage.test.jsx` (новый тест источника)

**Interfaces:**
- Consumes: `loadPracticeContent` (C2).
- Produces: `listeningStaticUrl(level)`, `loadListeningLevel(level, opts?) → Promise<{data, source}>`, `listeningAudioUrl(level, audio) → string`, `safeMarkup(html) → string`.

- [ ] **Step 1: Падающий тест модуля**

`src/practice/listening/listeningContent.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { listeningAudioUrl, listeningStaticUrl, loadListeningLevel, safeMarkup } from './listeningContent.js'

describe('listeningContent', () => {
  it('запись: полный URL с бэкенда — как есть, имя файла — из статики уровня', () => {
    expect(listeningAudioUrl('a1', 'https://files-dev.justtostudy.kz/development/practice/listening/ab.mp3'))
      .toBe('https://files-dev.justtostudy.kz/development/practice/listening/ab.mp3')
    expect(listeningAudioUrl('b2', '01-10__20p08-30p54.mp3')).toBe('/practice/listening/audio/b2/01-10__20p08-30p54.mp3')
  })

  it('уровень грузится с бэкенда раздела listening, запасной путь — файл уровня', async () => {
    const fetchImpl = vi.fn(async (url) => ({
      ok: true,
      json: async () => (String(url).includes('/practice-content/') ? [] : [{ id: 'a1_001' }]),
    }))
    const res = await loadListeningLevel('a1', { fetchImpl, base: 'https://api.test' })
    expect(fetchImpl.mock.calls.map((c) => c[0])).toEqual([
      'https://api.test/practice-content/listening/a1',
      listeningStaticUrl('a1'),
    ])
    expect(res.source).toBe('static')
  })

  it('разбор: <b> и <i> остаются, остальное — текстом', () => {
    expect(safeMarkup('Li is a <b>student</b> in <I>Shanghai</I>.')).toBe('Li is a <b>student</b> in <i>Shanghai</i>.')
    expect(safeMarkup('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;')
    expect(safeMarkup('<b class="x">a</b>')).toBe('&lt;b class="x"&gt;a</b>')
    expect(safeMarkup('Tom & Jerry')).toBe('Tom &amp; Jerry')
    expect(safeMarkup(null)).toBe('')
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `npx vitest run src/practice/listening/listeningContent.test.js`
Expected: FAIL — модуля нет.

- [ ] **Step 3: Модуль**

`src/practice/listening/listeningContent.js`:

```js
// Откуда «Аудирование» берёт задания и записи. Источник — бэкенд
// (/practice-content/listening/<уровень>, записи — полным URL MinIO); пока
// на стенде пакет не залит — файлы public/practice/listening/** (см.
// src/practice/remoteContent.js).
import { loadPracticeContent } from '../remoteContent.js'

export const listeningStaticUrl = (level) => `/practice/listening/content/${level}.json`

export function loadListeningLevel(level, opts) {
  return loadPracticeContent('listening', level, listeningStaticUrl(level), opts)
}

// С бэкенда приходит полный URL записи, в статике — имя файла в папке уровня.
export function listeningAudioUrl(level, audio) {
  const a = String(audio || '')
  return /^https?:\/\//i.test(a) ? a : `/practice/listening/audio/${level}/${a}`
}

// Разбор и подписи вставляются как HTML (в них <b>/<i>). Задания скоро будут
// писать преподаватели через админку — бэкенд пропускает только эти теги, а
// здесь вторая линия: всё, кроме <b>/<i> без атрибутов, уходит текстом.
const ALLOWED = /<\/?(b|i)>/gi

export function safeMarkup(html) {
  const s = String(html ?? '')
  let out = ''
  let last = 0
  for (const m of s.matchAll(ALLOWED)) {
    out += escapeHtml(s.slice(last, m.index)) + m[0].toLowerCase()
    last = m.index + m[0].length
  }
  return out + escapeHtml(s.slice(last))
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
```

- [ ] **Step 4: Зелёный**

Run: `npx vitest run src/practice/listening/listeningContent.test.js`
Expected: PASS, 3 теста.

- [ ] **Step 5: Экран**

В `src/screens/ListeningPage.jsx`:

1. Добавить импорт после импорта `listeningProgress.js`:

```js
import { loadListeningLevel, listeningAudioUrl, safeMarkup } from '../practice/listening/listeningContent.js'
```

2. Удалить строку `const audioUrl = (level, file) => \`/practice/listening/audio/${level}/${file}\``.

3. `Rich`:

```jsx
// Разбор с <b>…</b>; всё, кроме <b>/<i>, — текстом (safeMarkup).
function Rich({ html }) {
  return <span dangerouslySetInnerHTML={{ __html: safeMarkup(html) }} />
}
```

4. Рядом с `const [content, setContent] = useState(null)`:

```js
  // Откуда пришли задания: 'api' — бэкенд, 'static' — файлы сайта. Пишется в
  // data-source корня экрана: по нему тесты и проверка стенда видят, что
  // раздел уже читает админку, а не статику.
  const [source, setSource] = useState(null)
```

5. В эффекте сброса по `[level]` после `setContent(null)` добавить `setSource(null)`.

6. Тело `loadContent` внутри `try`:

```js
      const { data, source: from } = await loadListeningLevel(level)
      setContent(data)
      setSource(from)
      return data
```

(строки `const res = await fetch(...)`, `if (!res.ok) …`, `const data = await res.json()` удаляются; `catch` и `finally` — без изменений).

7. Корень: `<div className="lt">` → `<div className="lt" data-source={source || undefined}>`.

8. `<AudioBlock src={audioUrl(level, current.audio)} />` → `<AudioBlock src={listeningAudioUrl(level, current.audio)} />`.

- [ ] **Step 6: Тест экрана на источник**

В `src/screens/ListeningPage.test.jsx` в `mockServer` перед веткой `if (path.startsWith('/practice/listening/content/'))` добавить:

```js
    if (path.includes('/practice-content/listening/')) {
      // Бэкенд стенда: по умолчанию пакет не залит (пустой список) — экран идёт на статику.
      return { ok: true, json: async () => remote }
    }
```

сигнатуру — `function mockServer({ limit, completed = 0, entitlementFails = false, remote = [] })`, и в конец файла новый `describe`:

```js
describe('ListeningPage — источник заданий', () => {
  it('бэкенд отдал задания — экран берёт их и играет запись по полному URL', async () => {
    const remote = [{ ...CONTENT[0], audio: 'https://files.test/development/practice/listening/ab.mp3' }]
    const fetchMock = mockServer({ limit: null, remote })
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    fireEvent.click(await screen.findByText('Начать тренировку'))
    await screen.findByText('In Shanghai')
    expect(document.querySelector('.lt').getAttribute('data-source')).toBe('api')
    expect(document.querySelector('.lt-audio audio').getAttribute('src')).toBe(remote[0].audio)
    expect(fetchMock.calls.some((c) => c.includes('/practice/listening/content/'))).toBe(false)
  })

  it('пакет не залит — статика, как раньше', async () => {
    vi.stubGlobal('fetch', mockServer({ limit: null }))
    renderPage()
    fireEvent.click(await screen.findByText('Начать тренировку'))
    await screen.findByText('In Shanghai')
    expect(document.querySelector('.lt').getAttribute('data-source')).toBe('static')
  })
})
```

Общие `beforeEach`/`afterEach` файла (строки ~115–122, `vi.unstubAllGlobals()`) уже снимают подмену `fetch` — своих не нужно.

- [ ] **Step 7: Зелёный**

Run: `npx vitest run src/screens/ListeningPage.test.jsx src/screens/listeningAssistantSnapshot.test.jsx src/practice/listening/`
Expected: PASS — старые тесты без изменений поведения, новые 2 зелёные.

- [ ] **Step 8: Коммит**

```bash
git add src/practice/listening/listeningContent.js src/practice/listening/listeningContent.test.js src/screens/ListeningPage.jsx src/screens/ListeningPage.test.jsx
git commit -m "$(printf 'feat(аудирование): задания с бэкенда, статика — запасной путь\n\nЗапись — полным URL MinIO; разбор пропускает только <b>/<i>;\ndata-source на корне экрана показывает источник.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

### Task C4: Каталог преподавателя — счётчики Аудирования с бэкенда

**Files:**
- Modify: `src/app/api/practice/catalog/route.js` (`listeningArea`, импорт `BACKEND_URL`, шапка-комментарий)
- Modify: `src/app/api/practice/catalog/route.test.js`

**Interfaces:**
- Consumes: `BACKEND_URL` из `src/lib/auth-server.js`, ручка `GET /practice-content/listening/levels` → `[{level, count}]`.

- [ ] **Step 1: Падающий тест**

В `route.test.js`: импорт `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'`; в начале `describe` добавить

```js
  // Каталог спрашивает у бэкенда счётчики Аудирования. В тестах сети нет:
  // по умолчанию бэкенд «молчит», и раздел строится с диска, как раньше.
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })
```

и тест

```js
  it('Аудирование: счётчики уровней с бэкенда, когда пакет залит', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      expect(String(url)).toMatch(/\/practice-content\/listening\/levels$/)
      return { ok: true, json: async () => [{ level: 'a1', count: 3 }, { level: 'b2', count: 0 }] }
    }))
    const body = await (await GET()).json()
    const listening = body.areas.find((a) => a.key === 'listening')
    expect(listening.levels.map((l) => l.code)).toEqual(['a1'])
    expect(listening.levels[0].units[0]).toMatchObject({ key: 'a1', section: '3 заданий' })
  })
```

- [ ] **Step 2: Запустить — падает**

Run: `npx vitest run src/app/api/practice/catalog/route.test.js`
Expected: новый тест FAIL (уровни с диска, а не `['a1']`), остальные PASS.

- [ ] **Step 3: Реализация**

В `route.js`:
- импорт `import { BACKEND_URL } from '../../../../lib/auth-server.js'`;
- в шапке-комментарии после первого абзаца добавить: «Аудирование переезжает в админку: его счётчики берутся у бэкенда (`/practice-content/listening/levels`), а с диска — только пока пакет на стенде не залит (спека 2026-10-21-practice-content-to-admin-design.md).»;
- `listeningArea` заменить на:

```js
async function listeningArea() {
  return safe(async () => {
    const levels = (await remoteListeningLevels()) || (await diskListeningLevels())
    return {
      key: 'listening',
      title: 'Аудирование',
      levels: levels.map(({ code, count }) => ({
        code,
        label: code.toUpperCase(),
        units: [{
          key: code,
          title: `Аудирование ${code.toUpperCase()}`,
          section: `${count} заданий`,
          minutes: null,
          difficulty: null,
        }],
      })),
    }
  })
}

// null — «у бэкенда нет»: пакет не залит, бэкенд молчит или ответил не то.
async function remoteListeningLevels() {
  try {
    const res = await fetch(`${BACKEND_URL}/practice-content/listening/levels`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const rows = await res.json()
    const levels = Array.isArray(rows)
      ? rows.filter((r) => r && typeof r.level === 'string' && r.count > 0).map((r) => ({ code: r.level, count: r.count }))
      : []
    return levels.length ? levels : null
  } catch {
    return null
  }
}

async function diskListeningLevels() {
  const dir = path.join(PRACTICE_DIR(), 'listening', 'content')
  const out = []
  for (const code of await levelFiles(dir)) {
    const items = await readJson(path.join(dir, `${code}.json`))
    const count = Array.isArray(items) ? items.length : 0
    if (count) out.push({ code, count })
  }
  return out
}
```

- [ ] **Step 4: Зелёный**

Run: `npx vitest run src/app/api/practice/catalog/route.test.js`
Expected: PASS все.

- [ ] **Step 5: Коммит**

```bash
git add src/app/api/practice/catalog/route.js src/app/api/practice/catalog/route.test.js
git commit -m "$(printf 'feat(аудирование): счётчики для кабинета преподавателя с бэкенда\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

### Task C5: Скрипт пакета Аудирования

**Files:**
- Create: `scripts/practice-pack/build-listening.js`
- Test: `scripts/practice-pack/build-listening.test.js`

**Interfaces:**
- Consumes: `zipSync`, `unzipSync` из `scripts/lib/zip.js` (`entries: {name, data}[] → Buffer`).
- Produces: `buildListeningPack({ root, source, now }) → { manifest, items, media: Map<string, Buffer> }`, `packZip(pack) → Buffer`, `sha24(buf) → string`, `LEVELS`. CLI: `node scripts/practice-pack/build-listening.js [--out <путь>]`, по умолчанию `build/practice-packs/listening.zip`.

- [ ] **Step 1: Падающий тест**

`scripts/practice-pack/build-listening.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { buildListeningPack, packZip, sha24 } = require('./build-listening.js')
const { unzipSync } = require('../lib/zip.js')

// Мини-копия public/practice/listening: два задания одного уровня делят запись
// (так в данных у трёх пар), третье — своя запись; уровня b1 нет вовсе.
const MP3_A = Buffer.from([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0, 1])
const MP3_B = Buffer.from([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0, 2])
let root

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-'))
  const content = path.join(root, 'public/practice/listening/content')
  fs.mkdirSync(content, { recursive: true })
  fs.mkdirSync(path.join(root, 'public/practice/listening/audio/a1'), { recursive: true })
  fs.mkdirSync(path.join(root, 'public/practice/listening/audio/a2'), { recursive: true })
  fs.writeFileSync(path.join(root, 'public/practice/listening/audio/a1/x.mp3'), MP3_A)
  fs.writeFileSync(path.join(root, 'public/practice/listening/audio/a2/y.mp3'), MP3_B)
  fs.writeFileSync(path.join(content, 'a1.json'), JSON.stringify([
    { id: 'a1_001', type: 'listen_type', audio: 'x.mp3', explanation: '', answer: 'Hi' },
    { id: 'a1_002', type: 'listen_type', audio: 'x.mp3', explanation: '', answer: 'Hello' },
  ]))
  fs.writeFileSync(path.join(content, 'a2.json'), JSON.stringify([
    { id: 'a2_001', type: 'listen_type', audio: 'y.mp3', explanation: '<b>b</b>', answer: 'Bye' },
  ]))
})

afterAll(() => fs.rmSync(root, { recursive: true, force: true }))

describe('build-listening', () => {
  it('задания всех уровней с level и ссылкой на запись по хэшу; общая запись — один файл', () => {
    const pack = buildListeningPack({ root, source: 'test', now: new Date('2026-10-21T00:00:00Z') })
    expect(pack.items.map((i) => [i.id, i.level])).toEqual([['a1_001', 'a1'], ['a1_002', 'a1'], ['a2_001', 'a2']])
    expect(pack.items[0].audio).toBe(`media/${sha24(MP3_A)}.mp3`)
    expect(pack.items[1].audio).toBe(pack.items[0].audio)
    expect(pack.media.size).toBe(2)
    expect(pack.manifest).toMatchObject({
      format: 'jts-practice-pack', version: 1, section: 'listening', source: 'test',
      counts: { a1: 2, a2: 1, items: 3 },
    })
  })

  it('zip: manifest, items и медиа под именами-хэшами', () => {
    const pack = buildListeningPack({ root, source: 'test' })
    const files = unzipSync(packZip(pack))
    expect(Object.keys(files).sort()).toEqual([
      'items.json', 'manifest.json', `media/${sha24(MP3_A)}.mp3`, `media/${sha24(MP3_B)}.mp3`,
    ].sort())
    expect(JSON.parse(files['items.json'].toString()).length).toBe(3)
    expect(Buffer.compare(files[`media/${sha24(MP3_B)}.mp3`], MP3_B)).toBe(0)
  })

  it('записи нет на диске — падает с путём, а не собирает дырявый пакет', () => {
    fs.writeFileSync(path.join(root, 'public/practice/listening/content/b1.json'),
      JSON.stringify([{ id: 'b1_001', type: 'listen_type', audio: 'nope.mp3', answer: 'x' }]))
    expect(() => buildListeningPack({ root, source: 'test' })).toThrow(/nope\.mp3/)
    fs.rmSync(path.join(root, 'public/practice/listening/content/b1.json'))
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `npx vitest run scripts/practice-pack/build-listening.test.js`
Expected: FAIL — `Cannot find module './build-listening.js'`.

- [ ] **Step 3: Скрипт**

`scripts/practice-pack/build-listening.js`:

```js
// Пакет «Аудирования» для админки: задания public/practice/listening/content/<уровень>.json
// и их записи — в zip формата jts-practice-pack (контракт — backend
// docs/practice/PACK_FORMAT.md). Его заливают в дев-админку («Библиотека →
// Аудирование → Пакет»), проверяют дев-сайт, потом тот же zip — в прод-админку.
//
//   node scripts/practice-pack/build-listening.js [--out build/practice-packs/listening.zip]
//
// Имя записи — первые 24 hex sha256 содержимого: так админка ловит битый файл
// до заливки и не грузит повторно то, что на стенде уже лежит. Сам раздел
// данных не меняется — id, порядок и тексты заданий уходят как есть.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execSync } = require('child_process')
const { zipSync } = require('../lib/zip.js')

const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1']
const ROOT = path.resolve(__dirname, '..', '..')

function sha24(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 24)
}

function buildListeningPack({ root = ROOT, source = 'jts-web-app', now = new Date() } = {}) {
  const items = []
  const media = new Map()
  const counts = {}
  for (const level of LEVELS) {
    const file = path.join(root, 'public/practice/listening/content', `${level}.json`)
    if (!fs.existsSync(file)) continue
    const tasks = JSON.parse(fs.readFileSync(file, 'utf8'))
    counts[level] = tasks.length
    for (const task of tasks) {
      // readFileSync сам бросит с путём, если записи нет: дырявый пакет хуже упавшей сборки
      const bytes = fs.readFileSync(path.join(root, 'public/practice/listening/audio', level, task.audio))
      const name = `${sha24(bytes)}.mp3`
      media.set(name, bytes)
      items.push({ ...task, level, audio: `media/${name}` })
    }
  }
  const names = [...media.keys()].sort()
  const manifest = {
    format: 'jts-practice-pack',
    version: 1,
    section: 'listening',
    createdAt: now.toISOString(),
    source,
    counts: { ...counts, items: items.length },
    media: names.map((name) => ({ name, size: media.get(name).length })),
  }
  return { manifest, items, media }
}

function packZip({ manifest, items, media }) {
  return zipSync([
    { name: 'manifest.json', data: JSON.stringify(manifest, null, 2) },
    { name: 'items.json', data: JSON.stringify(items) },
    ...[...media.keys()].sort().map((name) => ({ name: `media/${name}`, data: media.get(name) })),
  ])
}

function gitSource(root) {
  try {
    return 'jts-web-app@' + execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim()
  } catch {
    return 'jts-web-app'
  }
}

module.exports = { LEVELS, sha24, buildListeningPack, packZip }

if (require.main === module) {
  const i = process.argv.indexOf('--out')
  const out = path.resolve(ROOT, i > 0 ? process.argv[i + 1] : 'build/practice-packs/listening.zip')
  const pack = buildListeningPack({ source: gitSource(ROOT) })
  fs.mkdirSync(path.dirname(out), { recursive: true })
  const zip = packZip(pack)
  fs.writeFileSync(out, zip)
  console.log(`Аудирование: ${pack.items.length} заданий, ${pack.media.size} записей, ${(zip.length / 1048576).toFixed(1)} МБ → ${out}`)
  console.log(JSON.stringify(pack.manifest.counts))
}
```

- [ ] **Step 4: Зелёный и прогон на настоящих данных**

Run: `npx vitest run scripts/practice-pack/build-listening.test.js && node scripts/practice-pack/build-listening.js`
Expected: тест PASS (3); скрипт печатает `Аудирование: 800 заданий, ≤797 записей, ~79 МБ → …/build/practice-packs/listening.zip` и `{"a1":124,"a2":164,"b1":167,"b2":182,"c1":163,"items":800}`. Проверить `git status`: `build/` не появился в изменениях (он в `.gitignore`); если появился — добавить `/build/` в `.gitignore` в этом же коммите.

- [ ] **Step 5: Коммит**

```bash
git add scripts/practice-pack
git commit -m "$(printf 'feat(аудирование): скрипт пакета для админки\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

### Task C6: e2e, CLAUDE.md, проверка, PR

**Files:**
- Create: `tests/fixtures/listening-sample.mp3` (копия `public/practice/listening/audio/a2/01-15__20p25-21p64.mp3`)
- Modify: `tests/practice-listening-trainer.spec.js` (`SAMPLE_MP3`, `boot`, новый тест)
- Modify: `tests/practice-gate.spec.js` (маршрут бэкенда рядом с `**/practice/listening/content/*.json`)
- Modify: `CLAUDE.md` (новый абзац в «Архитектуре»)

- [ ] **Step 1: Образец записи — в фикстуры** (чистка удалит `public/…/audio`)

```bash
mkdir -p tests/fixtures && cp public/practice/listening/audio/a2/01-15__20p25-21p64.mp3 tests/fixtures/listening-sample.mp3
```

- [ ] **Step 2: Спека тренажёра**

В `tests/practice-listening-trainer.spec.js`:
- `const SAMPLE_MP3 = path.resolve(process.cwd(), 'tests/fixtures/listening-sample.mp3')`
- в `boot`, перед маршрутом `**/practice/listening/content/*.json`:

```js
  // Бэкенд стенда мог уже получить пакет «Аудирования» — тест от этого не зависит:
  // по умолчанию «пакет не залит», и экран идёт на подменённую ниже статику.
  await page.route('**/practice-content/listening/**', (r) =>
    remote ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(remote) }) : r.fulfill({ status: 404, body: '' }),
  )
```

  и сигнатуру `async function boot(page, { level = 'A1', content = [CHOICE], remote = null } = {})`;
- новый тест в `describe`:

```js
  test('задания с бэкенда: запись играет по полному URL хранилища', async ({ page }) => {
    const url = 'https://files.test/development/practice/listening/aaaaaaaaaaaaaaaaaaaaaaaa.mp3'
    await boot(page, { remote: [{ ...CHOICE, audio: url }] })
    await page.route(url, (r) => r.fulfill({ path: SAMPLE_MP3, contentType: 'audio/mpeg' }))
    await page.goto('/?screen=listening')
    await page.getByRole('button', { name: 'Начать тренировку' }).click()
    await expect(page.locator('.lt')).toHaveAttribute('data-source', 'api')
    await expect.poll(async () => page.locator('.lt-audio audio').evaluate((el) => el.currentSrc)).toBe(url)
  })
```

- [ ] **Step 3: Спека замка**

В `tests/practice-gate.spec.js` перед `await page.route('**/practice/listening/content/*.json', …)` (около строки 103):

```js
    // Пакет «Аудирования» на стенде не должен менять, какие задания видит тест.
    await page.route('**/practice-content/listening/**', (r) => r.fulfill({ status: 404, body: '' }))
```

- [ ] **Step 4: CLAUDE.md**

В разделе «Архитектура», после абзаца про «Слушай и выбирай», вставить:

```markdown
**Материалы «Практики» переезжают в админку (с 21.10.2026), раздел за разделом.**
Цель — чтобы материал заводили преподаватели через web-admin, а не разработчик
правкой `public/`. Пилот — **Аудирование**: задания в таблице бэкенда
`practice_listening_tasks`, записи в MinIO (`practice/listening/<sha24>.mp3`,
кэш immutable), ученику — `GET /practice-content/listening/{level}` без входа.
Заливают пакетом (`jts-practice-pack`, контракт — backend
`docs/practice/PACK_FORMAT.md`): `node scripts/practice-pack/build-listening.js`
собирает zip из `public/`, его заливают в «Библиотека → Аудирование → Пакет»;
на другой стенд — «Выгрузить» и залить там. Сайт читает через
`src/practice/remoteContent.js`: бэкенд, а пока пакет на стенде не залит —
статика (`data-source` на корне экрана показывает, откуда пришло). id заданий
(`a1_001`) не меняются — на них прогресс и квота. После проверки прода статику
раздела удаляют отдельным PR и зовут загрузчик с `staticUrl = null`.
Спека и план: `docs/superpowers/specs|plans/2026-10-21-practice-*`.
```

- [ ] **Step 5: Полная проверка**

```bash
npx vitest run src/practice src/screens/ListeningPage.test.jsx src/screens/listeningAssistantSnapshot.test.jsx src/app/api/practice scripts/practice-pack src/lib
npm run lint
npm run build
```

Expected: всё зелёное, сборка без ошибок. Затем e2e (порт 3100 должен быть свободен: соседний dev-сервер или другой worktree на нём — и Playwright молча прогонит чужой код):

```bash
npx playwright test tests/practice-listening-trainer.spec.js tests/practice-gate.spec.js --workers=1
```

Expected: PASS.

- [ ] **Step 6: Ручная проверка экрана**

Запустить dev-сервер ветки (`.claude/launch.json` → `preview_start`), открыть `/?screen=listening`, «Начать тренировку». Пока на dev-бэкенде пакета нет: `data-source="static"`, в сети — запрос `…/practice-content/listening/a1` (404 или `[]`) и следом `/practice/listening/content/a1.json`; запись играет. Скриншот — в отчёт PR.

- [ ] **Step 7: Коммит, пуш, PR**

```bash
git add tests/fixtures/listening-sample.mp3 tests/practice-listening-trainer.spec.js tests/practice-gate.spec.js CLAUDE.md
git commit -m "$(printf 'test(аудирование): e2e на оба источника заданий; CLAUDE.md о переносе\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
git push -u origin feat/practice-listening-remote
gh pr create --base develop --title "Аудирование: задания с бэкенда, статика — запасной путь (пилот переноса Практики)" --body "$(printf 'Сайт читает Аудирование с /practice-content/listening (бэкенд + MinIO), пока пакет на стенде не залит — со статики, как раньше.\n\n- src/practice/remoteContent.js — общий загрузчик для следующих разделов\n- разбор пропускает только <b>/<i>\n- кабинет преподавателя: счётчики с бэкенда\n- scripts/practice-pack/build-listening.js — zip для админки\n\nМержить после backend и web-admin. Спека и план — docs/superpowers/specs|plans/2026-10-21-practice-*.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)')"
```

---

## Часть D — выкатка и перенос (по порядку, после мержа A, B, C в develop)

### Task D1: Дев — заливка и проверка

- [ ] **Step 1: Стенд жив и ручка на месте**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://dev-server.justtostudy.kz/practice-content/listening/levels
curl -s https://dev-server.justtostudy.kz/practice-content/listening/levels
```

Expected: `200` и `[]`. 502/404 — дев ещё не выкатился (дев переезжал на новый сервер 14.10) — ждать деплоя, не заливать.

- [ ] **Step 2: Собрать пакет** — `node scripts/practice-pack/build-listening.js` в worktree сайта (после мержа — на свежем develop). Записать вывод (800 заданий, число записей).

- [ ] **Step 3: Заливка в дев-админке** — делает владелец (или агент в браузере, где владелец уже вошёл; пароль агент не вводит): dev-admin → «Библиотека → Аудирование → Пакет» → выбрать `build/practice-packs/listening.zip`. Ожидаемая сверка: новых 800, изменённых 0, без изменений 0, только на стенде 0; «Записей залить» = число записей из Step 2. «Залить» → «Готово: новых 800».

- [ ] **Step 4: Ручка отдаёт задания**

```bash
curl -s https://dev-server.justtostudy.kz/practice-content/listening/levels
curl -s https://dev-server.justtostudy.kz/practice-content/listening/a1 | head -c 400
curl -sI "$(curl -s https://dev-server.justtostudy.kz/practice-content/listening/a1 | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s)[0].audio))")" | grep -iE "^HTTP|content-type|cache-control"
```

Expected: `[{"level":"a1","count":124},…,{"level":"c1","count":163}]`; первое задание `a1_001`, `audio` — `https://files-dev.justtostudy.kz/…/practice/listening/<sha>.mp3`; запись — `200`, `audio/mpeg`, `Cache-Control: public, max-age=31536000, immutable`.

- [ ] **Step 5: Сайт** — `https://dev-tutor.justtostudy.kz/?screen=listening`:
  1. гостем: «Начать тренировку», `.lt[data-source="api"]`, запись с `files-dev…` играет, сессия проходится до результата;
  2. под входом — то же;
  3. аккаунт, у которого до переноса были пройденные задания: счётчик «пройдено» на интро тот же, что до заливки (id не менялись);
  4. `curl -s https://dev-tutor.justtostudy.kz/api/practice/catalog` → в `listening` уровни a1–c1 с теми же числами; в кабинете преподавателя домашка с Аудированием открывается у ученика;
  5. в дев-админке скрыть одно задание A1 → через ≤5 мин (кэш) `count` у a1 = 123, задания нет в сессиях.

  Результаты со скриншотами — в отчёт.

### Task D2: Релиз в прод

- [ ] **Step 1: Миграция** — перед мержем backend develop → main: в `origin/main` нет миграции с тем же номером, что у `V387__Practice_listening_tasks.sql` (иначе — переименовать в develop отдельным PR до релиза; номер, уже применённый на деве, менять нельзя — тогда согласовать с владельцем).
- [ ] **Step 2: Порядок** — backend → web-admin → jts-web-app, каждый обычным PR develop → main (в релиз только свои PR).
- [ ] **Step 3: Прод до заливки** — `curl -s https://prod-server.justtostudy.kz/practice-content/listening/levels` → `[]`; на проде `/?screen=listening` работает, `data-source="static"`.

### Task D3: Прод — заливка и проверка

- [ ] **Step 1:** в прод-админке «Библиотека → Аудирование → Пакет»: тот же zip из D1, либо «Выгрузить» в дев-админке (если на деве что-то скрывали или правили) и залить выгрузку. Сверка: новых = число заданий пакета.
- [ ] **Step 2:** пункты D1 Step 4–5 на прод-адресах (`prod-server.justtostudy.kz`, `ai-tutor.justtostudy.kz`; хост записей — прод-хост файлов, см. `audio` в ответе).

### Task D4: Чистка (отдельный PR в jts-web-app, только после D3)

**Files:**
- Delete: `public/practice/listening/content/`, `public/practice/listening/audio/`
- Delete: `scripts/practice-pack/build-listening.js`, `scripts/practice-pack/build-listening.test.js` (источник пакета теперь — «Выгрузить» в админке)
- Modify: `src/practice/listening/listeningContent.js`, `src/practice/listening/listeningContent.test.js`, `src/app/api/practice/catalog/route.js`, `src/app/api/practice/catalog/route.test.js`, `src/screens/ListeningPage.test.jsx`, `src/screens/listeningAssistantSnapshot.test.jsx`, `tests/practice-listening-trainer.spec.js`, `tests/practice-gate.spec.js`, `src/practice/listening/listeningProgress.js` (комментарий), `src/practice/listening/engine.test.js` (комментарий), `CLAUDE.md`

- [ ] **Step 1:** ветка `chore/listening-static-cleanup` от свежего `origin/develop`.
- [ ] **Step 2:** `listeningContent.js` — без запасного пути:

```js
export function loadListeningLevel(level, opts) {
  // Статика раздела удалена после переноса на прод (21.10.2026, PR чистки):
  // неудача бэкенда — ошибка экрана «не удалось загрузить», без тихой подмены.
  return loadPracticeContent('listening', level, null, opts)
}
```

  `listeningStaticUrl` удалить; ветку «имя файла → `/practice/listening/audio/…`» в `listeningAudioUrl` оставить как есть (запись с бэкенда всегда полным URL, ветка безвредна, но тест на неё убрать). В `listeningContent.test.js` тест «уровень грузится… запасной путь» заменить на:

```js
  it('уровень грузится только с бэкенда', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => [] }))
    await expect(loadListeningLevel('a1', { fetchImpl, base: 'https://api.test' })).rejects.toThrow(/practice content unavailable/)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
```

- [ ] **Step 3:** `route.js` — в `listeningArea` строку `const levels = (await remoteListeningLevels()) || (await diskListeningLevels())` заменить на `const levels = (await remoteListeningLevels()) || []` (раздел без уровней каталог отфильтрует сам), функцию `diskListeningLevels` удалить, в шапке — «счётчики Аудирования — только с бэкенда». В `route.test.js` бэкенд по умолчанию теперь «отвечает», иначе тесты «все разделы» (строка ~52) и «уровневые разделы» (~102) потеряют `listening`:

```js
  beforeEach(() => {
    // Статики Аудирования больше нет: счётчики — только с бэкенда.
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).endsWith('/practice-content/listening/levels')) {
        return { ok: true, json: async () => [{ level: 'a1', count: 124 }, { level: 'b1', count: 167 }] }
      }
      throw new Error('offline')
    }))
  })
```

  и тест

```js
  it('Аудирование: бэкенд молчит — раздела в каталоге нет, остальные на месте', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const body = await (await GET()).json()
    expect(body.areas.find((a) => a.key === 'listening')).toBeUndefined()
    expect(body.areas.find((a) => a.key === 'grammar')).toBeTruthy()
  })
```

- [ ] **Step 4:** тесты экрана. В `ListeningPage.test.jsx` в `mockServer` ветку `if (path.startsWith('/practice/listening/content/'))` удалить, а ветку бэкенда сделать источником по умолчанию:

```js
    if (path.includes('/practice-content/listening/')) {
      return remote === null ? { ok: false, status: 404, json: async () => ({}) } : { ok: true, json: async () => remote }
    }
```

  с `remote = CONTENT` по умолчанию в сигнатуре `mockServer`; тесты «уровень из домашней работы» (строки ~185–210) сверяют `/practice-content/listening/b1` и `/practice-content/listening/a1` вместо путей статики; тест «пакет не залит — статика» заменить на

```js
  it('бэкенд не ответил — экран говорит, что не загрузилось, а не молчит', async () => {
    vi.stubGlobal('fetch', mockServer({ limit: null, remote: null }))
    renderPage()
    fireEvent.click(await screen.findByText('Начать тренировку'))
    expect(await screen.findByText('Не удалось загрузить материалы аудирования.')).toBeTruthy()
  })
```

  В `listeningAssistantSnapshot.test.jsx` строку `if (path.startsWith('/practice/listening/content/')) return { ok: true, json: async () => [task] }` заменить на `if (path.includes('/practice-content/listening/')) return { ok: true, json: async () => [task] }`. e2e: в `practice-listening-trainer.spec.js` маршрут `**/practice/listening/content/*.json` удалить, а маршрут бэкенда отдаёт `remote ?? content`; в `practice-gate.spec.js` маршрут статики заменить маршрутом `**/practice-content/listening/**` с теми же заданиями, строку с 404 — удалить.
- [ ] **Step 5:** удалить файлы: `git rm -r public/practice/listening/content public/practice/listening/audio scripts/practice-pack/build-listening.js scripts/practice-pack/build-listening.test.js`. coin/win/lose.png не трогать.
- [ ] **Step 6:** комментарии `listeningProgress.js` и `engine.test.js` — «из public/practice/listening/content» → «из заданий Аудирования (бэкенд, practice_listening_tasks)». CLAUDE.md: в абзаце о переносе — «Аудирование перенесено (статика удалена <дата>)», ссылка на скрипт пакета убрана, источник пакета — «Выгрузить» в админке.
- [ ] **Step 7:** проверка — те же команды, что в C6 Step 5 (без `scripts/practice-pack`), плюс `npm run build`. Ожидаемо: `git ls-tree -r -l HEAD public/practice/listening | awk '{s+=$4} END {print s/1048576}'` ≈ 9 МБ (остались три png).
- [ ] **Step 8:** PR «Аудирование: удалить статику после переноса в админку (−79 МБ)», в описании — ссылки на проверку прода из D3.
