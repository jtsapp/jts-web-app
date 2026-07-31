# Практика: прогресс по аккаунту, а не по браузеру

**Дата:** 2026-07-28
**Ветки:** `feat/practice-progress-sync` → PR в `develop`; черри-пик → backport-ветка от `main` → PR в `main`.
**Репозиторий:** `jts-web-app` (Next.js + собственный Neon Postgres).

## Проблема

Прогресс разделов практики в `jts-web-app` хранится **в localStorage браузера**, поэтому на разных устройствах он разный:

- **Аудирование** (`ListeningPage.jsx`, `practice/listening/engine.js`) — не сохраняется вообще (только in-memory, теряется при перезагрузке); понятия «пройдено» нет.
- **Словарь** (`practice/vocab/state.js`) — ключ `jts_vocab2` в localStorage: настройки + SRS-прогресс. На сервер не уходит.
- **Грамматика** (`practice/grammar/grammarProgress.js`) — ключ `jts_grammar_done` в localStorage: множество пройденных юнитов `"<level>:<unitId>"`. На сервер уходит только награда-монеты (`completeLessonModule` → Spring `/mobile/lesson-modules/complete`), но **не факт прохождения**.

Для сравнения: Kingdom/Обучение (`?screen=kingdom`) серверный (Spring `learning_path_progresses`, `activity.completed`) и потому синхронизируется. Практика — нет.

## Цель

Пройденные уроки практики (аудирование / словарь / грамматика) сохраняются **по аккаунту** и одинаковы на всех устройствах залогиненного пользователя.

## Не в объёме (осознанно)

- **Тьютор не трогаем.** Его память (ошибки/темы/факты/словарь/повторения) уже per-account в Neon (`user-<id>`); транскрипты диалогов не хранятся (экран истории — mock). Отдельная задача.
- **Spring-бэкенд не трогаем.** Всё делается внутри `jts-web-app`.
- **Гостевой прогресс не переносится в аккаунт.** Набранное до входа при логине не подхватывается (см. «Жизненный цикл сессии»).

## Архитектура

Всё внутри `jts-web-app`, переиспользуя существующие механизмы тьютора:

- Идентичность — `resolveProfileId(request, deviceId)` (`src/lib/auth-server.js`): Bearer-токен → `user-<id>` через backend `/user/me`.
- Слой БД — `src/lib/db/*`, клиент Neon `getSql()` (`src/lib/db/sql.js`) с мягкой деградацией (Neon не поднят → `null` → работаем только на localStorage).
- Роуты — `src/app/api/*` в стиле `src/app/api/profile/*`.
- Клиентский токен — `loadToken()` (`src/lib/session.js`, ключ `jts_access_token`).

### Модель данных: одна таблица, блоб на модуль

Клиент уже хранит прогресс компактными payload'ами; сервер зеркалит их один-к-одному, поэтому клиентская правка минимальна. Добавляется в `src/lib/schema.sql` (применяется вручную: `psql "$DATABASE_URL" -f src/lib/schema.sql`; Flyway тут нет).

```sql
create table if not exists practice_state (
  profile_id text        not null,   -- 'user-<id>' из resolveProfileId
  module     text        not null,   -- 'vocab' | 'grammar' | 'listening'
  state      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (profile_id, module)
);
```

Без FK на `learner` — практика независима от тьютора; строка профиля может не существовать.

**Содержимое `state` и семантика записи по модулям:**

| module | state | семантика POST |
|---|---|---|
| `vocab` | объект `jts_vocab2` целиком (`{ level, mode, field, goalMin, accent, sound, srs, seenCount }`) | **replace** (last-write-wins: SRS и настройки по своей природе перезаписываются) |
| `grammar` | `{ done: ["a1:3", ...] }` | **union** множеств `done` с существующим (пройденное не «отменяется» при рассинхроне устройств) |
| `listening` | `{ done: ["a1_001", ...] }` | **union** |

Union для `done`-модулей делает прохождение монотонным: одновременная работа с двух устройств не теряет пройденные уроки. Для vocab допускаем last-write-wins (редкий кейс двух активных устройств; SRS всё равно перезаписывается целиком).

### Слой БД: `src/lib/db/practice.js`

По образцу `src/lib/db/profile.js`:

- `loadPracticeState(profileId) → { vocab, grammar, listening }` — один `SELECT module, state FROM practice_state WHERE profile_id = $1`, разложить по ключам; отсутствующий модуль → `null`/дефолт.
- `savePracticeState(profileId, module, state)` — валидировать `module` (белый список), выполнить upsert:
  - vocab: `INSERT ... ON CONFLICT (profile_id, module) DO UPDATE SET state = $3, updated_at = now()`.
  - grammar/listening: union — прочитать текущий `done`, объединить с входящим, записать (или сделать через SQL `jsonb` слияние массивов с дедупликацией). Для простоты и тестируемости — читать-объединять-писать в одной транзакции.

### API: `src/app/api/practice/state/route.js`

`runtime = 'nodejs'`. Проверка `isDbConfigured()` → 503 при отсутствии `DATABASE_URL`.

- `GET /api/practice/state` → `{ configured: true, state: { vocab, grammar, listening } }`.
- `POST /api/practice/state` c телом `{ module, state }` → upsert одного модуля, `{ configured: true, ok: true }`.
- **Только для залогиненных:** если `bearerFromRequest(request)` пуст → **401**. Аноним на сервер не пишет и не читает. Это реализует «гостевой прогресс не переносится» на уровне контракта, а не только клиента.
- Идентичность — `resolveProfileId`; при валидном токене вернётся `user-<id>`.
- Валидация: `module` из белого списка (`vocab`/`grammar`/`listening`), иначе 400; `state` — объект (иначе 400); `done` внутри — массив строк (фильтруем).

### Клиент: `src/practice/practiceSync.js`

Тонкий модуль:

- `isSyncEnabled()` = `!!loadToken()`.
- `pushModule(module, state)` — debounce (≈500–800мс) POST `/api/practice/state` с `Authorization: Bearer`. Best-effort: осечка сети/сервера логируется, но не ломает UX (localStorage уже записан).
- `hydrate()` — при установленной сессии GET `/api/practice/state`; записать блобы в те же localStorage-ключи (`jts_vocab2`, `jts_grammar_done` как массив, новый `jts_listening_done`), затем дёрнуть события перерисовки (`grammar-progress` и аналог для listening), чтобы открытые экраны обновились.
- `clearLocalPractice()` — удалить practice-ключи из localStorage.

Точки внедрения write-through (сразу после существующей записи в localStorage, под `if (isSyncEnabled())`):

- `src/practice/vocab/state.js` → в `persist(s)` добавить `pushModule('vocab', s)`.
- `src/practice/grammar/grammarProgress.js` → в `write(set)` / `markUnitDone` добавить `pushModule('grammar', { done: [...set] })`.
- Аудирование → новый `src/practice/listening/listeningProgress.js` по образцу `grammarProgress.js` (ключ `jts_listening_done`, множество id заданий), `markTaskDone(taskId)` пишет localStorage + `pushModule('listening', ...)`.

### Аудирование: новое понятие «пройдено»

Сейчас у аудирования нет ни хранения, ни отметки прохождения. Добавляем:

- `listeningProgress.js` (ключ `jts_listening_done`) — множество id **выполненных заданий** (id стабильны: `a1_001`, `a1_002`, … в `public/practice/listening/content/<level>.json`).
- В `ListeningPage.jsx` при верном ответе на задание вызывать `markTaskDone(task.id)`.
- Видимый эффект: множество пройденных заданий следует за аккаунтом (и может использоваться для счётчика/«уже пройдено»). Изменение локальное в `ListeningPage.jsx` + новый модуль; движок (`engine.js`) не трогаем.

### Жизненный цикл сессии (auth-флоу)

Сервер — источник истины для залогиненного:

- **При входе** (после успешной установки сессии — там же, где сейчас `saveToken` / `mergeAnonymousProgress`, вероятно `App.jsx`): `clearLocalPractice()` → `hydrate()`. То есть localStorage-кэш очищается и заполняется серверным состоянием. **Следствие (по вашему выбору «не переносить»):** гостевой прогресс, набранный до входа, при логине пропадает из вида — сервер перезаписывает локальный кэш. Отмечено явно.
- **При выходе:** `clearLocalPractice()` — назад к чистому гостевому состоянию; следующий вход снова тянет с сервера. Это же гарантирует изоляцию аккаунтов на общем браузере.
- **Гость** (нет токена): поведение без изменений — только localStorage, сервер не задействован.

## Изоляция и границы

- `practice_state` не зависит от таблиц тьютора (нет FK, отдельный роут). Тьютор не затрагивается.
- Роут практики самодостаточен; единственная зависимость — общие `resolveProfileId` и `getSql` (уже стабильны, покрыты использованием тьютора).
- Клиентский `practiceSync.js` — единственная новая точка сопряжения; экраны практики продолжают читать из тех же localStorage-ключей, поэтому их логика рендера не меняется.

## Обработка ошибок и деградация

- Neon не поднят (`getSql() === null` / `!isDbConfigured()`): GET/POST практики → 503; клиент это игнорирует и работает на localStorage (как и тьютор сейчас).
- Сеть/сервер упал при `pushModule`: localStorage уже записан, ошибка логируется, прогресс не теряется локально; при следующем `hydrate` расхождения сойдутся (для `done`-модулей — за счёт union).
- Приватный режим / localStorage недоступен: существующие `try/catch` в `state.js`/`grammarProgress.js` уже это покрывают; sync просто не активируется.

## Тесты

- **Юнит `src/lib/db/practice.js`** (мок `getSql`): union для grammar/listening (дедуп, монотонность), replace для vocab, валидация неизвестного module, поведение при `getSql() === null`.
- **Роут `/api/practice/state`**: 401 для анонима (нет Bearer) на GET и POST; 200 + upsert для валидного токена (мок `verifyToken`/backend `/user/me`); 400 на неизвестный module / нечисловой state; 503 без `DATABASE_URL`.
- **Клиент**: `hydrate()` записывает серверный `done` в `jts_grammar_done` и вызывает событие `grammar-progress` → каталог грамматики перерисовывает бейджи «Пройдено» (widget/DOM-тест по существующему паттерну).
- **e2e (Playwright, если укладывается)**: залогиниться → пройти юнит грамматики → проверить POST ушёл; во втором контексте (чистый localStorage, тот же токен) → hydrate показывает юнит пройденным.
- Прогон `flutter`-скиллов не применим; для веба — юнит/роут-тесты + существующий Playwright-набор. Гонять перед PR.

## План выкатки

1. Реализация на `feat/practice-progress-sync` (от `origin/develop`), тесты зелёные, PR в `develop`.
2. Применить схему на dev-Neon (`psql "$DATABASE_URL" -f src/lib/schema.sql`).
3. После мёрджа в develop — черри-пик коммитов в `backport/practice-progress-sync` (от `origin/main`), PR в `main`. Обе ветки содержат идентичный раздел практики (проверено: 22 файла совпадают). На `main` действует `TUTOR_ONLY = true`, но практика/словарь/аудирование пропущены через `TUTOR_ONLY_SECTIONS = ['tutor','practice','vocab','listening']` (`src/config.js`) — раздел доступен, фича применима. `config.js` не трогаем, поэтому конфликта по нему не будет; возможен конфликт разве что в контексте `schema.sql` (у main нет блока `review_item`) — решается при бэкпорте.
4. Применить схему на prod-Neon перед мёрджем в main.

## Открытые точки для ревью спека

- Семантика vocab: last-write-wins приемлема? (Альтернатива — хранить SRS отдельными строками на слово; тяжелее, отложено.)
- Гранулярность аудирования: «пройдено» = верный ответ на задание. Достаточно, или нужен уровень «урок/сессия»? (Контент сгруппирован только по уровням; естественная единица — задание.)
