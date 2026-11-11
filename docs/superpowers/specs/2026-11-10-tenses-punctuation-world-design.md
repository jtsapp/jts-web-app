# Tenses World и Punctuation World — два раздела «Грамматики» в «Практике», материал из админки

Дата: 10.11.2026. Владелец прислал два прототипа методиста (standalone html) и попросил: «Практика → Грамматика, два
новых раздела, добавь так, как мы делали в последнее время. Через админку». Последний такой раздел — Pronunciation World
(спека `2026-10-28-pronunciation-world-design.md`, backend `modules/pronunciation` + `docs/practice/PRONUNCIATION.md`,
web-admin `feature/system/pronunciation/`, сайт `src/practice/pronunciation/`). **Где здесь не сказано иначе — делать как
там**, идиомы и имена копировать оттуда.

Прототипы (в git не кладутся, копии без пробелов в имени):

| Раздел | Файл | Размер | sha256 (начало) |
|---|---|---|---|
| Tenses World | `C:\Users\nural\Downloads\jtstenses-world.html` (оригинал «12 tenses (5).html») | 64.7 МБ | `18088005d5d1cc37` |
| Punctuation World | `C:\Users\nural\Downloads\jtspunctuation-world.html` (оригинал «punctuation-world.html») | 2.7 МБ | `e3c016509a84cfe3` |

Каждый раздел — **свои ветки и свои PR** в трёх репозиториях (правило владельца: раздел = свой PR и свой отчёт):
`feat/tenses-world` и `feat/punctuation-world` в backend, web-admin и jts-web-app. Общие файлы (`App.jsx`, `api.js`,
`practiceTabs.js`, словари, `SecurityConfig`, `PracticeMediaNames`, `system.routes.ts`…) обе ветки правят независимо
от develop; конфликт при втором мерже — механический (обе дописывают строки).

Порядок мержа каждого раздела: backend → web-admin → сайт. Сайт без залитого раздела показывает «Раздел готовится» —
его мерж ничего не ломает.

## Решения (по умолчанию, владелец может поменять)

- Д1. Методист правит html и **заливает его целиком** в web-admin; бэкенд режет данные и медиа, медиа — в MinIO по
  хэшу (`PracticeMediaStorage`, immutable), ученику — один бандл JSON. Как Pronunciation World.
- Д2. Движок прототипа переносится на сайт **почти дословно** в Shadow DOM (`mount…(root, cfg) → destroy`).
- Д3. Место — вкладка «Грамматика» (`grammarGames` в `src/screens/practice/practiceTabs.js`), группа
  `practice.group.trainers`: `['topics', 'tenses', 'punctuation']`.
- Д4. Заливают только ADMIN (как Pronunciation World).
- Д5. Монет, квот, домашки, XP нет — area бэкенду неизвестна. Ответ пишет `recordSkill('grammar', с первой попытки)`.
- Д6. Озвучка без записи (у обоих прототипов это `speechSynthesis`) — правило проекта: Soniox через `/api/tts`
  британским голосом, по `onFail` — голос устройства (как `src/practice/pronunciation/voice.js`).
- Д7. Шрифты прототипов (Onest: base64 у Punctuation, Google Fonts у Tenses) не переносятся — гарнитуры `inherit` от
  хоста (Manrope, на телефоне PT Root UI, в kk — Inter; `kkFont.test.js` ENGINES).
- Д8. **Tenses World: банк практики — не литерал** (вызовы конструкторов `C(…)`, `G(…)`, `N(…)`…, переменные `PS`,
  `TW.ORDER.slice()`), без исполнения его не прочесть. Бэкенд исполняет **только блоки данных** в песочнице Mozilla
  Rhino (`org.mozilla:rhino`, последняя стабильная): `initSafeStandardObjects()` (без LiveConnect/`Packages`),
  `ClassShutter`, отказывающий во всех Java-классах, интерпретируемый режим (`optimizationLevel -1`) с лимитом
  инструкций и времени, никаких глобалов, кроме `window = {}`. Результат — `JSON.stringify` внутри песочницы → Jackson.
  Почему не мини-разбор: правки методиста (новый помощник-конструктор, конкатенация) ломали бы его молча; почему не
  исполнять на сайте: тогда заливка исполняла бы чужой код у каждого ученика. Punctuation World исполнения не требует —
  у него чистые литералы, читаются `JsLiterals`, как у Pronunciation.

## Tenses World

### Что это

12 английских времён: карта времён (хаб), страница времени (видео-урок, правила `usage`, формы, сигналы, типичные
ошибки, сравнения, обзор, таймлайн-схема), «Formula Lab» (конструктор предложения), практика — пять этапов, 26 наборов,
241 задание (типы choice / gap / rewrite / order / error / meaning / timeline / name / text). Интерфейс английский, перевод
ru/kz — переключателем в шапке прототипа (`TW.LANGS`, ключ `jts-tenses-lang`).

### Прототип

Десять inline `<script>` без атрибута `type` + двенадцать `<script type="application/octet-stream" id="video-<id>">` —
mp4 в base64 (3.6–4.3 МБ каждый, ~48 МБ всего). Блоки без `type`, по порядку:

| # | Что | Данные или движок |
|---|---|---|
| 0 | `TW.VIDEOS` (у каждого `{src:"", embedded:true, poster:"data:image/jpeg;base64,…"}`), `TW.GROUPS`, `TW.ASPECTS`, `TW.LOCAL_NAMES`, `TW.ORDER`, функция `TW.meta` | данные (содержит `TW.VIDEOS =`) |
| 1 | языки, словарь интерфейса `TW.UI`, `TW.T/L/X/TA/md/esc`, смена языка | движок |
| 2 | Formula Lab: `TW.SUBJECTS`, глаголы, сборка предложения, нормализатор ответа | движок |
| 3 | таймлайн-схемы SVG (`TW.timelineSVG`) | движок |
| 4–6 | `window.TENSES_DATA["<id>"] = {…}` — настоящие / прошедшие / будущие, чистые литералы | данные (содержит `window.TENSES_DATA[`) |
| 7 | банк практики: `P.SOURCES`, конструкторы, `P.SETS`, `P.STAGES` | данные (содержит `P.SETS =`) |
| 8 | движок практики (`TW.PRACTICE.renderPath/renderRunner/leave`, проверка, `speechSynthesis`) | движок |
| 9 | оболочка: роутер на `location.hash`, хаб, страница времени, видео, хранение `jts-tenses-world` | движок |

Счётчики файла 10.11: 12 видео, 12 постеров jpeg, 12 времён (ключи темы: `id, name, tagline, intro, keyIdea, usage,
forms, extras, signals, mistakes, compare, review, timeline`), 26 наборов, 241 задание, 5 этапов.

### Контракт: бандл — `GET /mobile/tenses`

Данные — **ровно в форме прототипа** (имена ключей прототипа, чтобы порт не переводил их): `TW` без функции `meta`,
`TENSES_DATA` как есть; `src` и `poster` видео — публичные ссылки бакета.

```json
{
  "release": 1,
  "uploadedAt": "2026-11-10T12:00:00Z",
  "TW": {
    "VIDEOS": { "present-simple": { "src": "https://files…/practice/tenses/<sha24>.mp4", "embedded": false, "poster": "https://files…/practice/tenses/<sha24>.jpg" } },
    "GROUPS": [ … ], "ASPECTS": [ … ], "LOCAL_NAMES": { … }, "ORDER": [ … 12 id … ],
    "PRACTICE": { "SOURCES": { … }, "SETS": { … }, "STAGES": [ … ] }
  },
  "TENSES_DATA": { "present-simple": { … }, … }
}
```

- У времени без видео-скрипта: `src: null` (сайт рисует заглушку прототипа «видео нет» — `videoErr`).
- ~300 КБ JSON, gzip бэкенда включён. Нужен Bearer (как `/mobile/pronunciation`); гостю — 401. До первой заливки — 404.

### Хэш движка

sha256 (hex): inline `<script>` без атрибута `type`, по порядку → у каждого переводы строк к `\n` → выбросить блоки
данных (текст содержит `TW.VIDEOS =`, `window.TENSES_DATA[` или `P.SETS =`) → оставшиеся склеить через `"\n;\n"`.

Для файла 10.11.2026: **`1fb07b743713916486e4b4c922d851989499009b9fe6970ec09aa93c19c8edb0`** (5 блоков). Это
`tenses.engine-sha` бэкенда; сайт переносит движок из этого же файла. `TW.meta` живёт в блоке данных, но в бандл не
идёт: сайт переносит её в движок (6 строк), её правка хэшем не ловится — так и записать в документе.

### Backend — модуль `tenses`

Копия идиом `pronunciation` (parser / upload / storage / catalog service, release-сущность, `PracticeMediaStorage`).

- Разбор `TensesHtmlParser`: jsoup; видео — `script[type=application/octet-stream][id^=video-]`, id времени — хвост id,
  base64 (пробелы вырезать) → байты; блоки данных — по правилу хэша → `TensesScriptSandbox` (Rhino, Д8): один контекст,
  `var window = {};`, блоки по порядку, затем `JSON.stringify({TW: {VIDEOS, GROUPS, ASPECTS, LOCAL_NAMES, ORDER,
  PRACTICE}, TENSES_DATA})`. Лимиты: например 50 млн инструкций и 10 с; превышение — 400 «блок данных N не исполнился
  за отведённое время». Ошибка JS — 400 с номером блока и текстом Rhino. Постер — data-URI → байты.
- Ошибки (400, ничего не пишется): поля, которые движок вставляет в разметку без экранирования, — не из белого
  списка (id времён/групп/видов, имена групп и видов, ключи частей формулы, `n` этапа, `zone`, `compare.with`);
  нет ни одного блока данных; блок не исполнился; нет `TW.ORDER`/`TENSES_DATA`/`TW.PRACTICE`;
  id из `ORDER` без `TENSES_DATA`; набор из `STAGES[].sets` без `SETS`; набор без `items`; видео не mp4 (сигнатура
  `ftyp` на смещении 4); постер не jpeg/png/webp (сигнатура); файл > `PracticeMediaService.MAX_BYTES`.
- Предупреждения (заливка проходит): время без видео; запись `VIDEOS` без времени в `ORDER`; задание с `tn` не из
  `ORDER`; хэш движка не совпал с `tenses.engine-sha` («Движок в файле отличается от перенесённого на сайт: правки данных
  применятся, правки движка (экраны, проверка, Formula Lab) — нет, нужен PR сайта»).
- Запись: одна заливка за раз (409); медиа `practice/tenses/<sha24>.mp4|jpg|png|webp` (`PracticeMediaNames`: раздел
  `tenses`; у mp4 content-type `video/mp4` — проверить, что `<video>` в Chrome/Safari играет с Range); строка
  `tenses_releases` → `tenses/current/bundle.json` → сброс кэша → удаление медиа раздела, на которые не ссылаются ни
  новый, ни предыдущий бандл. Сбой медиа — строки нет, сбой бандла — строка удаляется.
- Таблица `tenses_releases`: `id, file_name, tenses_count, sets_count, items_count, videos_count, engine_sha,
  uploaded_by → users ON DELETE SET NULL, created_at` + индекс `created_at DESC`. Миграция **V576**: V574 занял
  открытый backend#466, V575 — Punctuation. Flyway не принимает миграции не по порядку, поэтому мерж: #466 →
  Punctuation → Tenses (или номер сверять в момент мержа).
- Ручки: `POST /admin/tenses/upload` (multipart `file`, ADMIN) → `{release, tenses, sets, items, videos, posters,
  uploadedMedia, reusedMedia, removedMedia, engineMatches, warnings: []}`; `GET /admin/tenses` → `{current: {release,
  fileName, tenses, sets, items, videos, engineSha, engineMatches, uploadedBy: {id, name}, createdAt} | null, history: [… 20 …]}`.
  Ошибка — 400 текстом (форма ошибки — как у pronunciation, `messages[]` общего GlobalExceptionHandler).
- Документ `docs/practice/TENSES.md`. Тесты на Mockito (без WebMvc-срезов). Html собирает тест: два блока данных
  (конфиг + банк с конструктором), один блок движка, одно видео-скрипт (байты с `ftyp`), постер. Проверить: песочница не
  видит Java (`java.lang.System`, `Packages` — ошибка, не исполнение), бесконечный цикл обрывается лимитом, ошибки и
  предупреждения, хэш не зависит от данных и `\r\n`, медиа по хэшу и повтор без перезаливки, порядок записи, удаление
  лишнего, кэш и 404. Необязательный тест на настоящем файле по переменной `TENSES_HTML`: счётчики выше,
  предупреждений нет, хэш = значению выше.
- Риск: **65 МБ одним запросом.** Перед заливкой на стенд — `client_max_body_size` и `proxy_read_timeout` nginx перед
  бэкендом (дев — 94.247.128.198; прод за Cloudflare: лимит тела 100 МБ, ответ — до 100 с). `spring.servlet.multipart`
  уже 512 МБ.

### web-admin — страница «Tenses World»

Копия `feature/system/pronunciation/`: маршрут `tenses` (`roleGuard(['ADMIN'])`), карточка во вкладке «Практика и
тесты» после Pronunciation World: «Tenses World — 12 времён: видео, правила и практика»; `core/services/tenses.service.ts`
(`getLatest()`, `uploadHtml(file)`); страница: загрузить html, текущий релиз (времена, наборы, задания, видео, дата, кто
залил), история 20, после заливки — счётчики, медиа залито/переиспользовано/удалено, предупреждения; несовпадение
движка — отдельной плашкой; 400 — текст ошибки. Подсказка у кнопки: файл ~65 МБ, заливка идёт минуту-две. Тесты —
`npx ng test` локально.

### Сайт

- `?screen=tenses` — `src/screens/TensesPage.jsx` (+ ветка в `App.jsx`), данные `src/screens/tenses/useTensesData.js`
  (`guest` / `missing` (404) / `error` + «Повторить» / `ready`; кэш бандла — в памяти вкладки), `getTenses(token)` в
  `src/api.js`. Корень экрана несёт `data-release`.
- Движок `src/practice/tenses/engine.js`: блоки 1, 2, 3, 8, 9 и `TW.meta` почти дословно, `mountTenses(root, cfg) →
  destroy`, Shadow DOM, CSS — `styles.js` из `<style>` прототипа. `cfg`: `{bundle, progress, onProgress, onAnswer,
  speak, lang, onLang, onExit}`.

Отступления от прототипа (остальное — как есть):

| Прототип | Порт | Почему |
|---|---|---|
| `window.TW`, `window.TENSES_DATA` из блоков | объект на каждый монтаж из `cfg.bundle` | материал с бэкенда, два монтажа не делят состояние |
| роутер на `location.hash` (`#/t/<id>/<секция>`, `#/practice/<set>`), `hashchange` | внутреннее состояние; клики по `a[href^="#/"]` в тени перехватываются; `scrollIntoView` секций — внутри экрана | адрес приложения не трогаем |
| видео: base64-скрипт → Blob URL | `<video src>` = `VIDEOS[id].src` (ссылка бакета), `poster` — ссылка; нет `src` — заглушка `videoErr` | у видео свой адрес в MinIO |
| `document.documentElement.lang`, `document.querySelectorAll("[data-tr]")` | атрибут `lang` и поиск — на хосте / в корне тени | глобальный `<html>` общий |
| `localStorage jts-tenses-lang` | `cfg.lang` / `cfg.onLang` (экран хранит на устройстве `jts_tenses_lang`, чистится при выходе вместе с практикой) | как язык «Чисел» |
| `localStorage jts-tenses-world` (`{practice, last, visited}`) | `cfg.progress` / `cfg.onProgress` | прогресс синкается с аккаунтом |
| `speechSynthesis` | `cfg.speak` (Д6), стоп — на смене экрана и в `destroy` | правило проекта |
| шапка-логотип прототипа | без логотипа; «назад» с хаба раздела → `cfg.onExit` | шапка приложения уже есть |

- Прогресс: модуль синка `tenses` (`src/lib/practiceContract.js`, replace со сведением `merge` в момент снимка сервера,
  как у «Чисел»/Pronunciation) — `src/practice/tenses/progress.js`: `visited` объединяется, по набору практики — лучшее
  (`best`/счётчики — максимум, «пройдено» — ИЛИ; точную форму взять из блока 8), `last` — локальное.
- Ответ в практике → `recordSkill('grammar', с первой попытки)`.
- Карточка — `tenses` в группе «Тренажёры» вкладки «Грамматика» (Д3), обложка — по системе карточек
  (`practiceCatalog.js`, `scripts/build-practice-card-covers.js`, постеры видео — материал обложки), тексты
  `practice.tenses.*` ru/kk/en. Луна знает раздел — строка в `src/lib/assistant/destinations.js`.
- Тесты: фикстура `scripts/tenses/make-fixture.js --html <прототип>` (все блоки данных и движка байт в байт, видео —
  одно крошечное mp4 на все времена, `.gitattributes` — LF): вход оракула, бандл e2e, ручная проверка админки (заливка
  фикстуры — «движок совпадает»). Оракул `scripts/tenses/extract-oracle.js`: прототип-фикстура в `node:vm` с заглушкой
  DOM, зафиксированным `Math.random` → `__fixtures__/oracle.json` (нормализатор ответа, Formula Lab, проверка заданий
  каждого типа, перемешивание вариантов). `engine.test.js` сверяет порт — красный: чинить порт. `progress.test.js` —
  два устройства. Сторож: движок не пишет в `location.hash` и не трогает `document.documentElement`. E2E
  `tests/tenses.spec.js`: бандл фикстуры, медиа — `page.route`: «Практика» → «Грамматика» → карточка → время → видео
  есть → практика → задание → перезагрузка, прогресс на месте; «гость» и «раздел готовится»; 360px без горизонтальной
  прокрутки. `npm run build`, `npm run lint`, `npm test`.
- CLAUDE.md: абзац о разделе — как у Pronunciation World.

## Punctuation World

### Что это

20 страниц пунктуации (A0–C2) на пяти островах (`ISLES`: A1…C1), у страницы — Learn (что это, работа знака, когда,
почему, как, примеры, «Hear the difference», реальный документ, «Don't confuse») и Play — приключение Декстера в семь
стадий (камни, ворота, плоты, мост, ремонт табличек, финал) по банку предложений. Интерфейс английский, перевод ru/kk —
кнопкой «Aizere translates» (`PR.tr`). Звук — синтез Web Audio (эффекты) и `speechSynthesis` (Луна читает фразу).

### Прототип

Один `<style>` (из него 4 `@font-face` Onest base64) и один inline `<script>`. Данные — top-level объявления
`const NAME=<литерал>;` (точные границы — узел `VariableDeclaration` от `const` до `;` включительно):

| Имя | Что | Формат |
|---|---|---|
| `ASSET` | маскоты: `dexter-guide…dexter-oops`, `luna-*`, `aizere-*`, `spark-*` (16) | JSON, `data:image/webp;base64` |
| `ART` | `world, worldM, marks` (спрайт знаков), `back, portal` (5) | JSON, webp |
| `ADV_ART` | фоны и позы приключения: `walk, wobble, hang, spool, cocoon, rest, moth, harbour, harbourLit, camp, opening` (11) | JSON, webp |
| `ADV_ART2` | дополнительные позы (сейчас `{}`) | JSON, необязателен |
| `LOGO_SVG` | логотип | строка, **в бандл не идёт** |
| `LESSONS` | `{SOURCES, TOPICS (20), LX}` | JSON |
| `CUE` | 58 правил игры `{t, cue, alt, word?, sp?}` | JS-литерал (ключи без кавычек) |
| `BANK` | 162 строки `[страница, сложность 1–3, контекст, текст ⟨ответ\|правило~вариант⟩, подпись?]` с комментариями `/* … */` | JS-литерал |
| `MEANING` | 21 строка `[страница, факт, верная версия, неверная версия]` | JS-литерал |

Остальное — движок (~87 КБ): иконки, `ISLES`, `CREW`, `GN`, `STG`, роутер, Learn, игра, SFX.

### Контракт: бандл — `GET /mobile/punctuation`

Форма прототипа, data-URI заменены ссылками бакета, ключи изображений — ровно как в прототипе:

```json
{
  "release": 1,
  "uploadedAt": "2026-11-10T12:00:00Z",
  "ASSET": { "dexter-guide": "https://files…/practice/punctuation/<sha24>.webp", … },
  "ART": { "world": "…", "worldM": "…", "marks": "…", "back": "…", "portal": "…" },
  "ADV_ART": { "walk": "…", … }, "ADV_ART2": {},
  "LESSONS": { "SOURCES": { … }, "TOPICS": [ … ], "LX": { … } },
  "CUE": { … }, "BANK": [ … ], "MEANING": [ … ]
}
```

~250 КБ JSON. Bearer, гостю 401, до первой заливки 404.

### Хэш движка

sha256 (hex): текст единственного inline `<script>` с переводами строк к `\n`, из которого вырезаны объявления
`ASSET, ART, ADV_ART, ADV_ART2, LOGO_SVG, LESSONS, CUE, BANK, MEANING` (каждое — от `const` до своего `;` включительно;
переводы строк вокруг остаются). Для файла 10.11.2026: **`98e068d4e18c2796d10596d017ae0cbc0ae1b4424fa948ff465f6358ef375820`**
(длина остатка 86 861 символ). Это `punctuation.engine-sha`.

### Backend — модуль `punctuation`

Копия `pronunciation` без отличий в устройстве. Разбор `PunctuationHtmlParser`: объявление ищется по началу строки
`const NAME=` на верхнем уровне, конец литерала — по скобкам с пропуском строк и комментариев (`JsLiterals`), значения
JSON-литералов — Jackson, JS-литералов (`CUE`, `BANK`, `MEANING`) — `JsLiterals.jsToJson` → Jackson. Код не исполняется.

- Ошибки: нет скрипта; нет одного из `ASSET, ART, ADV_ART, LESSONS, CUE, BANK, MEANING`; литерал не разобрался (имя и
  текст ошибки); `TOPICS` пуст, у страницы нет `id`, повтор `id`; строка `BANK` не `[int, int, string, string, string?]`;
  пробел в тексте строки `BANK`: `⟨…|правило…⟩` с правилом, которого нет в `CUE` (движок упал бы на `CUE[k].alt`);
  строка `MEANING` не `[int, string, string, string]`; картинка не webp (сигнатура), файл > `MAX_BYTES`.
- Предупреждения: страница без строк `BANK`; нет картинки, которая есть в файле 10.11 (имена выше: 16 + 5 + 11) — «движок
  её ждёт»; хэш движка не совпал с `punctuation.engine-sha`.
- Запись — как у `tenses`: `practice/punctuation/<sha24>.webp`, таблица `punctuation_releases` (`id, file_name,
  topics_count, bank_count, meaning_count, images_count, engine_sha, uploaded_by, created_at`), миграция **V575**,
  `punctuation/current/bundle.json`.
- Ручки: `POST /admin/punctuation/upload` → `{release, topics, bank, meaning, images, uploadedMedia, reusedMedia,
  removedMedia, engineMatches, warnings}`; `GET /admin/punctuation` → `{current: {release, fileName, topics, bank,
  meaning, images, engineSha, engineMatches, uploadedBy, createdAt} | null, history}`.
- Документ `docs/practice/PUNCTUATION.md`; тесты как у `pronunciation`; необязательный тест на настоящем файле по
  `PUNCTUATION_HTML`: 20 страниц, 162 строки банка, 21 MEANING, 32 картинки, предупреждений нет, хэш = значению выше.

### web-admin — страница «Punctuation World»

Как у Tenses World: маршрут `punctuation`, карточка «Punctuation World — пунктуация: уроки и игра-приключение» после
Tenses World (в ветке punctuation — после Pronunciation World; при втором мерже порядок поправить), сервис
`punctuation.service.ts`, счётчики: страницы, строки банка, MEANING, картинки.

### Сайт

- `?screen=punctuation` — `src/screens/PunctuationPage.jsx`, `src/screens/punctuation/usePunctuationData.js`,
  `getPunctuation(token)`, `data-release` на корне.
- Движок `src/practice/punctuation/engine.js` — остаток скрипта почти дословно, `mountPunctuation(root, cfg) → destroy`,
  Shadow DOM, `styles.js` без `@font-face`. `cfg`: `{bundle, progress, onProgress, onAnswer, speak, onExit}`.

| Прототип | Порт | Почему |
|---|---|---|
| `const ASSET/ART/…` в скрипте | из `cfg.bundle`, на каждый монтаж | материал с бэкенда |
| `ART.world.startsWith("data:")` ветка `srcset` | ссылки — значит `srcset` с `worldM`, как задумано автором для внешних картинок | — |
| роутер на `location.hash` (`#/lesson/N`, `#/play/N`, `#/islands/…`), `go()`, `hashchange` | внутреннее состояние, клики `data-go` / `a[href^="#/"]` в тени | адрес приложения не трогаем |
| `document.documentElement.dataset.tr`, `style.setProperty("--sprite"/"--world")`, `classList.add("sprite-ok")` | на хосте тени (`:host([data-tr=…])` в CSS) | глобальный `<html>` общий |
| `document`/`window` слушатели (`click`, `keydown`, `pointerdown` для `auInit`, `resize`, `hashchange`) | на корне тени / хосте, снимаются в `destroy` | два монтажа и уход с экрана |
| `#toast`, `#live`, `.burst`, `celebrate()` в `document.body` | в корень тени | изоляция |
| `localStorage pw-world-1` `{read, p, tr, mute, luna, fin}` | `read, p, fin` — `cfg.progress`/`onProgress`; `tr, mute, luna` — устройство (`jts_punctuation_prefs`) | прогресс синкается, настройки вида — нет |
| `speechSynthesis` (Луна читает) | `cfg.speak` (Д6), текст чистится так же, как в прототипе (кавычки, тире) | правило проекта |
| SFX на Web Audio | как есть; контекст будится в жесте, в `destroy` — `close()` | синтез, файлов нет |
| шапка с логотипом | без логотипа; «назад» с главной → `cfg.onExit` | шапка приложения |

- Прогресс: модуль синка `punctuation` (merge): `read` объединяется, `p[id]` (звёзды страницы) и `fin` — максимум.
- Ответ в игре → `recordSkill('grammar', с первой попытки)` (решённый с первого раза камень/плот/пробел).
- Карточка `punctuation` в «Тренажёрах» «Грамматики» после `tenses`, обложка из `ART.world`/маскотов, тексты
  `practice.punctuation.*`, строка Луны.
- Тесты: фикстура `scripts/punctuation/make-fixture.js` (картинки — пиксель webp, данные урезаны до двух страниц и их
  строк банка, движок байт в байт, LF), оракул `scripts/punctuation/extract-oracle.js` (`parseB`, `buildRun` с
  зафиксированным `Math.random`, `famOf`, проверка ответа пробела, `countMarks`), `engine.test.js`, `progress.test.js`,
  сторож `location.hash`/`documentElement`, e2e `tests/punctuation.spec.js` (Learn до конца → Play → стадия → звезда →
  перезагрузка; гость; готовится; 360px). `build`, `lint`, `test`.
- CLAUDE.md: абзац о разделе.

## Выкатка

1. По разделу: backend → web-admin → сайт, номер миграции сверить перед мержем.
2. Перед заливкой Tenses (65 МБ) — лимиты nginx перед дев-бэкендом.
3. Заливает владелец в дев-админке. Проверка на деве: `data-release`, видео с files-dev играет и перематывается,
   путь ученика, прогресс на втором браузере, повторная заливка — 0 новых медиа.
4. В прод — обычным develop → main.

## Не делаем

- Поштучное редактирование материала в админке.
- Перенос констант движка в данные (Tenses: `TW.UI`, глаголы Formula Lab; Punctuation: `ISLES`, `CREW`, `STG`, `GN`).
- Перекодирование видео и адаптивное качество (mp4 как есть, 3.6–4.3 МБ).
- Отдачу медиа через бэкенд, CORS у бакета, статический фолбэк в `public/`.
- Монеты, домашние задания, Premium.
