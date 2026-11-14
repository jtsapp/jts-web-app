# Parts of Speech World — раздел «Грамматики» в «Практике», материал из админки

Дата: 14.11.2026. Владелец прислал прототип методиста и попросил: «Практика → Грамматика, ещё один новый раздел, как
обычно: бэк, сайт и админка». Образец — Tenses World и Punctuation World
(`2026-11-10-tenses-punctuation-world-design.md`): **где здесь не сказано иначе — делать как там**, идиомы и имена
копировать оттуда. От Tenses берётся песочница Rhino (данные — не литералы), от Punctuation — картинки webp по хэшу.

Прототип (в git не кладётся): `C:\Users\nural\Downloads\jtspartsofspeech-world.html` (оригинал
«Parts_of_Speech_World (7).html»), 2.45 МБ, sha256 начинается с `7a55c72e212d9460`.

Ветка во всех трёх репозиториях — `feat/parts-of-speech-world`, по PR на репозиторий. Мерж: backend → web-admin → сайт.
Сайт без залитого раздела показывает «Раздел готовится».

## Что это

Мир частей речи: карта из девяти регионов (ворота, базар существительных, квартал фонарей, кузница глаголов, сады
прилагательных, часовой механизм наречий, острова предлогов, мосты союзов, обсерватория) с четырьмя маскотами. 16
юнитов (объяснения + 55 упражнений, 269 заданий; типы `classify, tag, gap, fix, order, write`) и игра «The Meridian
Bureau» — 14 дел, 62 стадии, 328 заданий (движки `hunt, sort, forge, fault, deduce, dialogue, rebuild, map, link,
slots`). Интерфейс en / kk / ru переключателем прототипа. Звук — только эффекты Web Audio; `speechSynthesis` нет.

## Прототип

Один `<style>` (шрифты Golos Text и Literata — Google Fonts) и шесть inline `<script>` без `type`:

| # | Что | Данные или движок | Маркер блока данных |
|---|---|---|---|
| 0 | `window.IMG={…}` — 18 картинок `data:image/webp;base64` одной строкой JSON | данные | `window.IMG=` |
| 1 | слой мира: `MASCOTS`, `REGIONS`, `SPOTS`, `STORY` + функции `regionOf, regionOfCase, img, mascot, setGuide` → `window.WORLD` | данные (+5 функций) | `window.WORLD=` |
| 2 | `const UNITS=[]; window.CASES=[]`, конструкторы `pick, X, TB, NB, L3`, `window.REFS`, `GAME_INTRO`, `GAME_DOSSIER`, `HOWTO`, `SCENES` (у сцены `svg` — функция без аргументов), `SCENE_CHIP`, `UNITS.push(…)`, `CASES.push(…)`, правки задним числом (`splice`, `delete`) | данные, **не литералы** | `window.CASES=[]` |
| 3 | `window.WHY_TL` — переводы объяснений kk/ru и их пришивка к `UNITS[].acts[].items[].why` | данные | `Object.assign(window.WHY_TL` |
| 4 | игра (`window.GAME`): стадии, проверка, SFX, хранение `pos:g:*` | движок | — |
| 5 | оболочка: языки, роутер на `location.hash`, карта, юниты, упражнения, хранение `pos:*` | движок | — |

Имена картинок: `hero, r_gate, r_nouns, r_lanterns, r_foundry, r_gardens, r_clockworks, r_isles, r_bridges,
r_observatory, m_dexter, f_dexter, m_luna, f_luna, m_spark, f_spark, m_aizere, f_aizere`.

Счётчики файла 14.11: 18 картинок, 9 регионов, 16 юнитов, 55 упражнений (269 заданий), 14 дел, 62 стадии (328
заданий), 14 сцен.

## Контракт: бандл — `GET /mobile/parts-of-speech`

Форма прототипа, имена ключей прототипа. Bearer; гостю 401; до первой заливки 404. ~550 КБ JSON (gzip включён).

```json
{
  "release": 1,
  "uploadedAt": "2026-11-14T12:00:00Z",
  "IMG": { "hero": "https://files…/practice/partsofspeech/<sha24>.webp", "r_gate": "…" },
  "WORLD": { "MASCOTS": { … }, "REGIONS": [ … ], "STORY": { … }, "SPOTS": { … } },
  "UNITS": [ … 16 … ],
  "CASES": [ … 14 … ],
  "REFS": { "title": { … }, "lede": { … }, "list": [ … ] },
  "HOWTO": { … },
  "SCENES": { "c01": { "clues": [[12,30], …], "svg": "<rect …>…" } },
  "GAME_INTRO": "…",
  "GAME_DOSSIER": "<div class=\"dossier\">…"
}
```

- `SCENES[id].svg` — **строка**: песочница вызывает функцию при заливке (у сцены без `svg` поля нет).
- `UNITS` — после блока 3 (`why` уже `{en,kk,ru}`); `WHY_TL`, `SCENE_CHIP`, конструкторы и функции `WORLD` в бандл не идут.
- Функции `WORLD` (`regionOf, regionOfCase, img, mascot, setGuide`) сайт переносит в движок; их правка хэшем не ловится.

## Хэш движка

sha256 (hex): inline `<script>` без `type`, по порядку → текст блока как есть, переводы строк к `\n` → выбросить блоки
данных (текст содержит один из маркеров таблицы) → оставшиеся склеить через `"\n;\n"`.

Для файла 14.11.2026: **`2a4083f8b03a6b5376fb6844a4554fc08c806429c55044b9f21728471477c9aa`** (2 блока, 109 569
символов). Это `parts-of-speech.engine-sha`.

## Backend — модуль `partsofspeech`

Копия идиом `tenses` (parser / sandbox / checks / upload / storage / catalog, release-сущность, `PracticeMediaStorage`).

- Разбор: jsoup. Блок 0 — Jackson по тексту после `window.IMG=` (в Rhino 1.5 МБ не исполнять); data-URI → байты.
  Блоки 1–3 — песочница Rhino (как `TensesScriptSandbox`: `initSafeStandardObjects`, `ClassShutter`, лимиты инструкций
  и времени): `var window = {IMG: {}};` (или эквивалент), блоки по порядку, затем `JSON.stringify` формы бандла; `svg`
  сцен вызывается внутри песочницы. Ошибка JS — 400 с номером блока и текстом Rhino. Тест на настоящем файле обязан
  пройти (Rhino и `const` верхнего уровня между блоками, стрелки, `findIndex`, `Object.assign`); не проходит — чинить
  способ исполнения, а не просить править прототип.
- Ошибки (400, ничего не пишется): нет блока данных; нет `IMG`/`WORLD`/`UNITS`/`CASES`; `UNITS` или `CASES` пуст; юнит /
  упражнение / дело без `id` или с повтором; тип упражнения не из шести, тип стадии не из десяти (движок такой не
  нарисует); `CASES[].unit` без юнита; поля, которые движок ставит в атрибуты и классы без экранирования, — не из белого
  списка (id, `cls`, `color`/`hue` как `#hex`, ключи картинок и маскотов); в строках данных `<script`, `javascript:`,
  обработчики `on…=` (строки идут в `innerHTML`); картинка не webp/png/jpeg по сигнатуре; файл > `MAX_BYTES`.
- Предупреждения: нет картинки из списка выше («движок её ждёт»); `REGIONS[].units` / `img` / `guide` ссылается на
  отсутствующее; дело без сцены; хэш движка не совпал («правки данных применятся, правки движка — нет, нужен PR сайта»).
- Запись — как у `tenses`: медиа `practice/partsofspeech/<sha24>.webp|png|jpg` (`PracticeMediaNames`: раздел
  `partsofspeech`), строка `parts_of_speech_releases` → `partsofspeech/current/bundle.json` → сброс кэша → удаление
  медиа, на которые не ссылаются ни новый, ни предыдущий бандл. Одна заливка за раз (409).
- Таблица `parts_of_speech_releases`: `id, file_name, units_count, activities_count, cases_count, stages_count,
  items_count, images_count, engine_sha, uploaded_by → users ON DELETE SET NULL, created_at` + индекс `created_at DESC`.
  Миграция **V616** (develop на 14.11 кончается V615; номер сверить перед мержем).
- Ручки: `POST /admin/parts-of-speech/upload` (multipart `file`, ADMIN) → `{release, units, activities, cases, stages,
  items, images, uploadedMedia, reusedMedia, removedMedia, engineMatches, warnings: []}` (`items` — задания упражнений
  и стадий вместе: 597); `GET /admin/parts-of-speech` → `{current: {release, fileName, units, activities, cases, stages,
  items, images, engineSha, engineMatches, uploadedBy: {id, name}, createdAt} | null, history: [… 20 …]}`;
  `GET /mobile/parts-of-speech` (и `SecurityConfig`, как у `/mobile/tenses`).
- Документ `docs/practice/PARTS_OF_SPEECH.md`. Тесты как у `tenses`; тест на настоящем файле по переменной
  `PARTS_OF_SPEECH_HTML`: счётчики выше, предупреждений нет, хэш = значению выше.

## web-admin — страница «Parts of Speech World»

Копия `feature/system/tenses/`: маршрут `parts-of-speech` (`roleGuard(['ADMIN'])`), карточка во вкладке «Практика и
тесты» после Punctuation World: «Parts of Speech World — части речи: 16 юнитов и игра-расследование»;
`core/services/parts-of-speech.service.ts`; счётчики: юниты, упражнения, дела, стадии, задания, картинки; после заливки —
медиа залито / переиспользовано / удалено, предупреждения, плашка несовпадения движка, 400 — текст ошибки.

## Сайт

- `?screen=partsofspeech` — `src/screens/PartsOfSpeechPage.jsx`, `src/screens/partsofspeech/usePartsOfSpeechData.js`
  (`guest` / `missing` / `error` / `ready`), `getPartsOfSpeech(token)` в `src/api.js`, `data-release` на корне.
- Движок `src/practice/partsofspeech/engine.js`: блоки 4 и 5 и функции `WORLD` почти дословно,
  `mountPartsOfSpeech(root, cfg) → destroy`, Shadow DOM, `styles.js` из `<style>` прототипа (гарнитуры — `inherit`).
  `cfg`: `{bundle, progress, onProgress, onAnswer, lang, onLang, onExit}`.

| Прототип | Порт | Почему |
|---|---|---|
| `window.IMG/WORLD/CASES/REFS/HOWTO/SCENES/GAME_DOSSIER/GAME`, `UNITS` | объект на каждый монтаж из `cfg.bundle` | материал с бэкенда |
| `SCENES[id].svg()` | строка | функцию вызвал бэкенд |
| роутер на `location.hash`, `hashchange`, ссылки `href="#…"` | внутреннее состояние, клики по `a[href^="#"]` в тени перехватываются | адрес приложения не трогаем |
| `document.documentElement.lang`, `style.setProperty("--guide-face"/"--guide-c")` | на хосте тени | глобальный `<html>` общий |
| `document`/`window` слушатели, тосты и оверлеи в `body` | на корне тени / хосте, снимаются в `destroy` | изоляция |
| `localStorage pos:*`, `pos:g:*` (прогресс) | `cfg.progress` / `cfg.onProgress` | синк с аккаунтом |
| язык и звук в `localStorage` | язык — `cfg.lang`/`onLang` (`jts_partsofspeech_lang`), звук — устройство; чистятся при выходе | как Tenses |
| SFX Web Audio | как есть; контекст будится в жесте, в `destroy` — `close()` | синтез, файлов нет |
| шапка с логотипом | без логотипа; «назад» с карты → `cfg.onExit` | шапка приложения |

- Прогресс: модуль синка `partsofspeech` (`src/lib/practiceContract.js`, merge как у Tenses/Punctuation): прочитанное
  объединяется, решённые стадии и упражнения — объединение, счёт — лучший (точную форму взять из блоков 4 и 5).
- Ответ → `recordSkill('grammar', с первой попытки)`. Монет, квот, домашки нет.
- Карточка `partsofspeech` в «Тренажёрах» «Грамматики» после `punctuation`, обложка — по системе карточек из `IMG.hero`,
  тексты `practice.partsofspeech.*` ru/kk/en, строка Луны (`src/lib/assistant/destinations.js`).
- Тёмная тема: строка в `SECTIONS` `scripts/practice/shadow-dark.js`, `watchAppTheme` (сторож `shadowTheme.test.js`);
  kk — Inter (`kkFont.test.js`, ENGINES).
- Тесты: фикстура `scripts/partsofspeech/make-fixture.js` (движок байт в байт, картинки — пиксель webp, данные урезаны,
  LF), оракул `scripts/partsofspeech/extract-oracle.js` (проверка ответа каждого типа, нормализация ввода, перемешивание
  с зафиксированным `Math.random`), `engine.test.js`, `progress.test.js`, сторож `location.hash`/`documentElement`,
  e2e `tests/partsofspeech.spec.js` (Практика → Грамматика → карточка → юнит → упражнение → дело → стадия →
  перезагрузка, прогресс на месте; гость; «готовится»; 360px). `npm run build`, `npm run lint`, `npm test`.
- CLAUDE.md: абзац о разделе.

## Не делаем

Поштучное редактирование материала в админке; перенос констант движка в данные; монеты, домашние задания, Premium.
