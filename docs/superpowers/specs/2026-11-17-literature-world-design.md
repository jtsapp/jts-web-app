# Literature World — раздел «Чтения» в «Практике», материал из админки

Дата: 17.11.2026. Владелец прислал прототип методиста: «нужно в ридинг новый раздел, сделай параллельно бэк, веб и
платформу». Образцы — Parts of Speech World (`2026-11-14-parts-of-speech-world-design.md`) и Tenses / Punctuation World
(`2026-11-10-tenses-punctuation-world-design.md`): **где здесь не сказано иначе — делать как там**, идиомы и имена
копировать оттуда. Отличие от них главное одно: данные прототипа — чистый JSON, поэтому **Rhino не нужен**.

Прототип (в git не кладётся): `C:\Users\nural\Downloads\jtsliterature-world.html` (оригинал
«Literature_World_single-file (1).html»), 10 000 873 байт, sha256 `745c8f34b25eadd26b5f2732ba8bf24c5a480888cd7f5aa0959698f4a5943130`.

Ветка во всех трёх репозиториях — `feat/literature-world`, по PR на репозиторий. Worktree:
`C:\Users\nural\Desktop\backend-literature`, `C:\Users\nural\Desktop\web-admin-literature`,
`C:\Users\nural\Desktop\jts-web-app\.claude\worktrees\literature-world`. Мерж: backend → web-admin → сайт. Сайт без
залитого раздела показывает «Раздел готовится».

Ключ раздела везде `literature`; ручки — `/…/literature`; экран — `?screen=literature`.

## Что это

«The Literature World»: открытая книга с четырьмя маскотами (Декстер, Луна, Спарк, Айзере). Вход и карта — семь глав
(`WORLDS`: Globe — Шекспир, Theatre — драма, Poets' Country — поэзия, Library — проза, Gothic Street, Writers' Room —
слова, Archive — эпохи) и четыре переулка (`LANES`: Nursery — стишки, Hall of Sayings — пословицы, Streets — регистры и
сленг, Printing House — практика) плюс Everyday English. 26 пьес целиком (20 Шекспира + 6 других, 481 сцена), 47
прозаических текстов, поэзия, стишки, скороговорки, лимерики, загадки, пословицы, сленг Гроуза, 360 слов «шесть шагов»,
практика (порядок строк, пропущенная рифма, собери пословицу, вопросы по словам). Интерфейс en / kz / ru (коды прототипа)
+ язык подсказок ru / kz. Озвучка — записи Wikimedia Commons (внешние ссылки), видео — YouTube (`youtube-nocookie`),
картинки — Wikimedia (внешние) плюс свои сцены и маскоты, видео-петля на входе. Слова читает `speechSynthesis` en-GB.
Запись себя — `MediaRecorder`, только на устройстве.

## Прототип

- Три `<style>` (основной, `#words-x`, `#lw-img`); Google Fonts — Cormorant Garamond, EB Garamond, Onest; `--lit` —
  `'Newsreader', Georgia, 'Times New Roman', serif`.
- Разметка `<body>`: шапка (`#nav`, `#lvlSel`, `#lang`), `main#app`, подвал с логотипом (png base64), `#pop`,
  `<svg>` с `clipPath#bubble`.
- **Восемь `<script type="application/json" id="d-…">` — данные** (все — валидный JSON, тегов HTML внутри нет):

| id | что | размер | ключ бандла |
|---|---|---|---|
| `d-sh` | 20 пьес Шекспира целиком: `{title, setting, personae, acts:[{n, sc:[{n, loc, b:[…]}]}]}` | 3.2 МБ | `sh` |
| `d-ot` | 6 других пьес той же формы (earnest, dollshouse, pygmalion, faustus, everyman, wayworld) | 0.75 МБ | `ot` |
| `d-prose` | 39 текстов прозы `{id, pg, verse, body, title, chapters?, extract?, moral?, glossSrc?}` | 0.6 МБ | `prose` |
| `d-world` | `life, theatre, plays, genreOrder, acts, rj, drama, godot, prose(34), shelves(15), poemsX, periods(10)` | 70 КБ | `world` |
| `d-x` | расширение: `poems 54, shakespeare 24, proverbs 51, twisters 10, limericks 15, riddles 11, grose 40, sayings 23, phrases 44, prose 8, proseBody 8, shelves 3, riders, authors, sources, words 360` | 0.55 МБ | `x` |
| `d-imgmeta` | 136 файлов Wikimedia: имя → `[thumbBase, w, h, fullUrl, thumbName]` | 47 КБ | `imgmeta` |
| `d-mascots` | 4 webp data-URI: `dexter, luna, spark, aizere` | 114 КБ | `mascots` (ссылки) |
| `d-scenes` | 16 webp (`archive, entrance, globe, gothic, hall, library, nursery, poets, press, streets, theatre, writers, c_aizere, c_dexter, c_luna, c_spark`) + `entrance_video` (mp4) | 3.8 МБ | `scenes` (ссылки) |

- **Один inline `<script>` без `type` — движок** (421 508 символов). В нём кроме интерфейса лежит и «часть 1» материала
  JS-литералами (`SOURCES, AUTHORS, RHYMES, TWISTERS, LIMERICKS, PROVERBS, POEMS, SHAKESPEARE, ERAS, DEVICES` с
  конструкторами `CA()`, `YT()` и шаблонными строками), словари интерфейса `UI`, путь `WORLDS/LANES`, таблицы
  `AIMG/PIMG/DIED/XAUD`, расширенный список слов. **Решение: весь `<script>` — движок.** Его правка (включая стихи
  части 1) идёт только PR сайта, заливка с другим скриптом предупреждает хэшем. Обновляемое из админки — то, что автор
  сам вынес в JSON-блоки (новый материал прототип уже кладёт туда: «EXPANSION (Nov 2026) — data merge» в `d-x`).
  Почему не Rhino: граница «данные / движок» внутри скрипта не отмечена блоками, резать по тексту — хрупко, а ради
  ~250 КБ литералов тащить песочницу при 5+ МБ чистого JSON не стоит.

Счётчики файла 17.11: пьес 26 (20 + 6), сцен 481, текстов прозы 47 (39 в `prose` + 8 в `x.proseBody`), стихов в `x`
54, слов 360, картинок Wikimedia 136, медиа 21 (17 сцен с видео + 4 маскота).

## Контракт: бандл — `GET /mobile/literature`

Блоки прототипа как есть, ключи — `id` блока без `d-`. Bearer; гостю 401; до первой заливки 404.

```json
{
  "release": 1,
  "uploadedAt": "2026-11-17T12:00:00Z",
  "sh": { "romeo": { "title": "…", "setting": "…", "personae": [ … ], "acts": [ … ] }, "…": "…" },
  "ot": { … },
  "prose": { … },
  "world": { … },
  "x": { … },
  "imgmeta": { "A Day with Keats, Neatby plate - Autumn.png": ["https://upload.wikimedia.org/…/", 1592, 2048, "https://upload.wikimedia.org/…", "…png"] },
  "mascots": { "dexter": "https://files…/practice/literature/<sha24>.webp", "luna": "…", "spark": "…", "aizere": "…" },
  "scenes": { "archive": "https://files…/practice/literature/<sha24>.webp", "…": "…", "entrance_video": "https://…/<sha24>.mp4" }
}
```

- Блоки `sh, ot, prose, world, x, imgmeta` бэкенд не переделывает (только проверяет). `mascots`/`scenes` — data-URI
  заменены ссылками MinIO.
- Бандл большой: ~5.3 МБ JSON. Ответ обязан уходить gzip (проверить настройку `server.compression` — типы и
  `min-response-size` — и закрепить тестом или проверкой заголовка); кэш-заголовки — как у `/mobile/tenses`.
- Сайт берёт бандл один раз на вкладку (память вкладки), не в localStorage.

## Хэш движка

sha256 (hex): inline `<script>` без атрибута `type`, по порядку (в файле 17.11 такой один) → текст блока как есть,
переводы строк к `\n` → склеить через `"\n;\n"`. JSON-блоки (`type="application/json"`) в хэш не входят.

Для файла 17.11.2026: **`3ca72307b6eeec30f34f97c9683846cbeceb931d05e5ea95351bc03dc9bcfd8b`** (1 блок, 421 508
символов). Это `literature.engine-sha`.

## Backend — модуль `literature`

Копия идиом `punctuation` / `partsofspeech` (parser / checks / upload / storage / catalog, release-сущность,
`PracticeMediaStorage`, `PracticeMediaNames`), **без песочницы Rhino**.

- Разбор: jsoup; каждый `script[type=application/json][id]` из таблицы выше → Jackson. Блоков восемь, все обязательны.
  Медиа `d-mascots` / `d-scenes` — data-URI → байты, тип по сигнатуре (webp / png / jpeg / mp4 — `ftyp`).
- Ошибки (400, ничего не пишется; текст называет блок и место):
  - нет блока или он не JSON (id блока + сообщение Jackson); файл больше `MAX_BYTES` (30 МБ);
  - `sh`/`ot` не объекты или пусты; у пьесы нет `acts` или у акта нет `sc`; `prose` пуст; в `world` нет `plays`,
    `prose`, `shelves`, `periods`; в `x` нет `poems`, `words`, `authors`, `sources`;
  - повтор `id` внутри массивов `x` (`poems, shakespeare, twisters, limericks, riddles, grose, sayings, phrases, prose,
    words`) и `world.prose`; пустой `id` там же;
  - **безопасность** (строки данных идут в `innerHTML`, местами без `esc()`): в любой строке — HTML-тег (`<` + буква,
    `/` или `!`) или `javascript:`; строка-ссылка (начинается с `http`) — не `^https://[A-Za-z0-9.-]+(/[^\s"'<>\x60]*)?$`;
    поля, которые движок вставляет **без `esc()`** в атрибуты, `onclick="go('…','${…}')"`, классы и `style` (id
    материалов, ключи, цвета и т. п.) — не из белого списка формы (`^[A-Za-z0-9_.:-]+$`, цвет — `#hex`). Точный список
    таких полей бэкенд выводит сам, читая движок (поиск `${…}` внутри атрибутов и `onclick` без `esc(`), и пишет его в
    документ раздела. Ключи `imgmeta` (имена файлов: пробелы, скобки, апостроф допустимы) — без `"`, `<`, `>`, `` ` ``;
  - `imgmeta`: значение — массив из 5; `thumbBase` и `fullUrl` начинаются с `https://upload.wikimedia.org/wikipedia/commons/`;
    `w`, `h` — положительные целые;
  - медиа не webp/png/jpeg/mp4 по сигнатуре.
- Предупреждения (заливка проходит): хэш движка не совпал («правки данных применятся, правки движка — нет, нужен PR
  сайта»); нет сцены или маскота из списка выше («движок их ждёт»); картинка, на которую ссылаются данные (`x.authors`,
  `x.poems[].image`, `world.*` — что найдёт разбор движка), не описана в `imgmeta` (движок пойдёт запасным путём
  `Special:FilePath`); `world.periods[].works` / `x.words[].anchor` ссылаются на отсутствующее. На файле 17.11 —
  **ноль предупреждений**; если правило даёт предупреждение на настоящем файле — правило неверно, чинить правило.
- Запись — как у `punctuation`: медиа `practice/literature/<sha24>.<ext>` (раздел `literature` в `PracticeMediaNames`),
  строка `literature_releases` → `literature/current/bundle.json` → сброс кэша → удаление медиа, на которые не ссылаются
  ни новый, ни предыдущий бандл. Одна заливка за раз (409).
- Таблица `literature_releases`: `id, file_name, plays_count, scenes_count, prose_count, poems_count, words_count,
  images_count, media_count, engine_sha, uploaded_by → users ON DELETE SET NULL, created_at` + индекс
  `created_at DESC`. Миграция **V630** (develop на 17.11 кончается V629; номер сверить перед мержем).
- Ручки: `POST /admin/literature/upload` (multipart `file`, ADMIN) → `{release, plays, scenes, prose, poems, words,
  images, media, uploadedMedia, reusedMedia, removedMedia, engineMatches, warnings: []}`; `GET /admin/literature` →
  `{current: {release, fileName, plays, scenes, prose, poems, words, images, media, engineSha, engineMatches,
  uploadedBy: {id, name}, createdAt} | null, history: [… 20 …]}`; `GET /mobile/literature` (и `SecurityConfig`, как у
  `/mobile/punctuation`). Счётчики: `plays` = |sh| + |ot|; `scenes` — сумма `sc` всех пьес; `prose` = |prose| +
  |x.proseBody|; `poems` = |x.poems|; `words` = |x.words|; `images` = |imgmeta|; `media` — файлов сцен и маскотов.
- Лимиты заливки (multipart Spring, nginx) — проверить, что 10 МБ файл проходит; если нет — поднять, как для Tenses.
- Документ `docs/practice/LITERATURE.md` (как `PUNCTUATION.md`), запись свойства `literature.engine-sha` в
  `application*.yml`. Тесты как у `punctuation`; тест на настоящем файле по переменной `LITERATURE_HTML`: счётчики
  выше, предупреждений нет, хэш = значению выше, бандл — ключи и ссылки вместо data-URI.

## web-admin — страница «Literature World»

Копия `feature/system/punctuation/` (или `parts-of-speech/`): маршрут `literature` (`roleGuard(['ADMIN'])`), карточка
во вкладке «Практика и тесты» после Parts of Speech World: «Literature World — литература на английском: пьесы, проза,
поэзия и слова»; `core/services/literature.service.ts`; счётчики: пьесы, сцены, проза, стихи, слова, картинки, медиа;
после заливки — медиа залито / переиспользовано / удалено, предупреждения, плашка несовпадения движка, 400 — текст
ошибки. Файл ~10 МБ: таймаут запроса и прогресс загрузки — как у Tenses (65 МБ).

## Сайт

- `?screen=literature` — `src/screens/LiteraturePage.jsx`, `src/screens/literature/useLiteratureData.js` (`guest` /
  `missing` / `error` / `ready`; бандл — в памяти вкладки), `getLiterature(token)` в `src/api.js`, `data-release` на
  корне. Экран ленивый (`lazyScreen`), движок — свой чанк.
- Карточка `literature` во вкладке «Чтение» перед «Сказками» (`['reading', 'speedReading', 'books', 'comics',
  'literature', 'tales']` — сказки последние всегда), бейдж «Новое», обложка — по системе карточек (только английский;
  из сцен/маскотов прототипа, как `scripts/partsofspeech/extract-card-images.js`), тексты `practice.literature.*`
  ru / kk / en, строка Луны (`src/lib/assistant/destinations.js`) и статья базы знаний (`knowledge.js`, иначе краснеет
  `knowledge.test.js`), экран — в `INNER_SCREENS` (своя «назад», без нижней панели телефона).
- Движок `src/practice/literature/engine.js` **собирается из прототипа скриптом** `scripts/literature/build-engine.js`
  считанными заменами (каждая замена обязана найтись ровно столько раз, сколько записано, иначе сборка падает), как у
  Punctuation. `mountLiterature(root, cfg) → destroy`, Shadow DOM, `styles.js` генерирует
  `scripts/literature/extract-styles.js` из трёх `<style>` (руками не править). `cfg`: `{bundle, progress, onProgress,
  drafts, onDrafts, lang, onLang, onAnswer, speak, scrollTo, onExit}`.

| Прототип | Порт | Почему |
|---|---|---|
| `JSON.parse(document.getElementById('d-…'))` | из `cfg.bundle`, копия на каждый монтаж (движок мутирует данные: `push`, `Object.assign`, `splice`) | материал с бэкенда |
| `lwBlob(dataURI)` сцен, маскотов, видео входа | ссылки бандла как есть | MinIO |
| роутер `location.hash` / `hashchange` / `go()`; `href="#…"` | переменная; клики по `a[href^="#"]` в тени перехватываются; внешние ссылки (`target=_blank`) — как есть | адрес приложения не трогаем |
| **inline `onclick=` (165), `oninput=`, `onchange=`, `onsubmit=`, `onerror=`** | атрибут `data-lw-on…` и один делегированный обработчик на корне, который исполняет код атрибута прямым `eval` в области движка (`this` — элемент, `event` — событие); `error` — ловушкой в фазе захвата | inline-обработчик в тени ищет глобальные функции, а `go`, `render`, `SUP` — переменные модуля; ручной перевод 165 мест разведёт движок с прототипом |
| `document.getElementById / querySelector`, `$ / $$` с `document` | корень тени | изоляция |
| `document.body.dataset.theme` (`themeFor()`: nursery, press, writers, archive, gothic…) и CSS `body[data-theme=…]` | атрибут `data-lw-theme` на внутреннем корне `.lw`, селекторы переписаны | `data-theme` на хосте — тема приложения (`watchAppTheme`) |
| `document.documentElement.lang` (`setLang`) | `lang` на внутреннем корне | общий `<html>` |
| `imgdebug`, `window.lwImageReport`, `window.LW_IMG_LOG` | убраны / локальны | без глобалов |
| слушатели `document` (`error`, `load`, `loadedmetadata`, `animationend`, `click`), `window` (`resize`, `hashchange`), `MutationObserver` на документе, `IntersectionObserver` | на корне тени / хосте, снимаются в `destroy` (AbortController) | изоляция |
| `document.body.append(m)` (окно «About»), `#pop` | внутри корня тени | изоляция |
| `window.scrollTo` | `cfg.scrollTo(y)` — экран прокручивает приложение к верху раздела + y | раздел — колонка рядом с сайдбаром |
| `position:fixed`, `100vh` / `100svh` | внутри корня; высота — окна приложения, не браузера (как игры POS) | шапка приложения |
| шапка с навигацией и логотипом, подвал с логотипом | шапка раздела без логотипа; «назад» на главной книги → `cfg.onExit`; подвал без логотипа | шапка приложения |
| Google Fonts | не грузим: интерфейс (`--ui`, `--text`, Onest) — шрифт сайта `--lit-font` (`inherit`), литература (`--lit`, Cormorant, EB Garamond, Newsreader) — системный serif `Georgia, 'Times New Roman', serif`; kk интерфейса — Inter (`kkFont.test.js`) | правила шрифтов сайта |
| `localStorage jtsLit.notebook` (`{wordId: ts}`) | `cfg.progress` / `cfg.onProgress` — модуль синка `literature` | синк с аккаунтом |
| `localStorage jtsLit.prod.<id>` (своё предложение «Produce») | `cfg.drafts` / `cfg.onDrafts` — устройство `jts_literature_drafts`, чистится при выходе | свой текст ученика, как черновики POS |
| `sessionStorage lwNoLocal`, `LW_LOCAL_DIR` (свои копии картинок) | как есть: у `imgmeta` нет `m[5]`, путь не включается | копий у нас нет |
| `say()` — `speechSynthesis` en-GB, 0.85 | `cfg.speak(text)` → Soniox британским голосом (`voice.js`, как у Pronunciation / Tenses), запасной — голос устройства; смена экрана и `destroy` глушат | «Озвучка без записи — Soniox» |
| записи Commons (`new Audio()`, `AUDIOS`) | как есть; пауза всех на смене экрана и в `destroy` | свой плеер с перемоткой |
| YouTube (`youtube-nocookie`), ветка `file://` | iframe как есть, ветку `file://` можно оставить | — |
| `getUserMedia` + `MediaRecorder` («Record yourself») | как есть; дорожки останавливаются после записи и в `destroy`; запись — только память вкладки | приватность; `micArbiter` сам |
| язык `LANG` (по умолчанию `en`) и подсказок `SUP` | `cfg.lang` / `cfg.onLang` — `{lang, sup}` в `jts_literature_lang` устройства; по умолчанию из языка приложения (kk → `kz`, ru → `ru`, en → `en`; `sup` — `kz` при казахском, иначе `ru`); чистится при выходе | как Tenses |

- Прогресс: модуль синка `literature` (`src/lib/practiceContract.js`) — `{notebook: {wordId: ts}}`; сведение `merge` в
  момент снимка сервера (объединение, `ts` — больший), после снимка запись уходит как есть — как у «Чисел» (удаление на
  одном устройстве держится после его записи).
- Ответы практики: первая проверка задания → `cfg.onAnswer(kind, ok)`; экран пишет `recordSkill('vocab', ok)` для
  заданий слов (шесть шагов, Words Lab) и `recordSkill('reading', ok)` для остального (порядок строк, рифма, пословица,
  вопросы к тексту). Монет, квот, домашки нет — area бэкенду неизвестна.
- Внешнее: картинки Wikimedia, записи Commons, YouTube, ссылки Gutenberg / Britannica / Folger / RSC — как в
  прототипе (CSP у сайта нет). Зеркало картинок Wikimedia в MinIO — не делаем (см. ниже).
- Тёмная тема: строка в `SECTIONS` `scripts/practice/shadow-dark.js` (сцены, книга и иллюстрации — светлые зоны),
  `watchAppTheme` (сторож `shadowTheme.test.js`).
- Тесты: фикстура `scripts/literature/make-fixture.js --html <прототип>` → `src/practice/literature/__fixtures__/prototype-mini.html`
  (движок байт в байт, данные урезаны до нескольких пьес / текстов / стихов / слов, сцены — пиксель webp, видео —
  крошечный mp4, `.gitattributes` держит LF); бандл для vitest и e2e — `scripts/literature/make-bundle.js` →
  `__fixtures__/bundle.json`; оракул `scripts/literature/extract-oracle.js` прогоняет мини-прототип в jsdom (экраны
  глав и переулков, пьеса, проза, стих, слово, практика с зафиксированным `Math.random`: верные и неверные ответы) →
  `oracle.json`; `engine.test.js` сверяет порт (красный — чинить порт); `progress.test.js`; сторож `location.hash` /
  `document.body` / `documentElement`; e2e `tests/literature.spec.js` (Практика → Чтение → карточка → вход → глава →
  произведение → слово в блокнот → перезагрузка, блокнот на месте; гость; «готовится»; 360 px). `npm run build`,
  `npm run lint`, `npm test`.
- CLAUDE.md: абзац о разделе.

## Не делаем

Поштучное редактирование материала в админке; перенос части 1 (литералы в `<script>`) в данные; зеркало картинок
Wikimedia и записей Commons в MinIO (если Wikimedia начнёт резать хотлинк — включить путь `LW_LOCAL_DIR` прототипа на
MinIO отдельной задачей); монеты, домашние задания, Premium; интеграцию блокнота со «Словарём».
