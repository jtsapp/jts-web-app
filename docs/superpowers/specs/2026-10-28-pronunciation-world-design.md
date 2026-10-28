# Pronunciation World — раздел «Практики»: произношение, материал из админки

Дата: 28.10.2026. Источник — прототип методиста «Pronunciation World» (standalone html, 24.9 МБ,
`C:\Users\nural\Downloads\Pronunciation world.html`, прислан в чате 28.10.2026; в git не кладётся).
Образец всех трёх частей — Prepositions World (спека `2026-10-22-prepositions-world-design.md`,
backend `docs/practice/PREPOSITIONS.md`, web-admin `feature/system/prepositions/`, сайт
`src/practice/prepositions/`). Где здесь не сказано иначе — делать как там.

Три части делаются **параллельно, тремя сессиями**: backend, web-admin, сайт. Общее у них — только
этот документ: бандл (§«Контракт»), ручки и хэш движка. Менять контракт — правкой этого файла и
сообщением двум другим сессиям.

## Что это

Курс английского произношения: 6 уровней (A0–C1), 44 темы. У темы две стадии:

- **Learn** — объяснение по экранам: текст (английский всегда, перевод ru/kk — кнопкой «Қазақша /
  Русский» внутри объяснения), анимированные схемы (рот, язык, гласные), примеры со звуком, «Ваша
  очередь» — запись себя и сравнение с образцом (запись живёт только в памяти вкладки).
- **Play** — игра «Echo Gates»: слышишь «эхо», отправляешь его в ворота с тем же звуком. Три раунда
  на тему, звезда раунда — `best ≥ 0.85`.

Звук — записи (1694 клипа: обычные, `slow-<id>` для кнопки «Медленно», `ga-<id>` — американский
вариант). Чего нет в записях, прототип читает голосом устройства.

## Решения владельца (28.10.2026)

- Материал **транслируется с бэкенда**, в бандле сайта его нет; методист правит html и **заливает
  его целиком** в web-admin (как Prepositions World, Cartoon World, Just Listen It).
- Движок на сайт переносится **почти дословно** в Shadow DOM (как «Числа», Prepositions World).
- Три части — параллельно, отдельными сессиями.

## Прототип: что в нём

Один `<style>` (399 КБ, из них почти всё — шрифт Onest base64) и один `<script>`. Скрипт — склейка
57 файлов сборки через `"\n;\n"` (разбивать ровно по этой строке после приведения переводов строк к
`\n`):

| Чанк | Что |
|---|---|
| 0 — «голова», начинается с `window.PRON=` | реестр `window.PRON={levels:[],v2:{},addLevel…,addTopics…,audioFiles:window.PRON_AUDIO\|\|{}}`; затем `PRON.gameAudio={…}` (**JSON**: id → `data:audio/mpeg;base64,…`, 1694 шт., 19.7 МБ), `PRON.ASSETS={…}` (**JSON**: имя → `data:image/webp;base64,…`, 23 шт., 1.3 МБ: маскоты `m-<aizere\|dexter\|luna\|spark>-<поза>`, регионы `w-a0…w-c1`, `w-hero`), `PRON.LOGO_SVG="…"` |
| 1–50 — данные | `PRON.addLevel({…})` (6 уровней: `id, title, title_t, summary, modules[]`; модуль: `id` вида `A0.1`, `strand, title, title_t, outcome, prereq, sounds, lex, steps, mastery`) и `PRON.addTopics("<уровень>", [{…}])` (44 темы: `id, lex, learn, game`). **JS-литералы, не JSON**: ключи без кавычек, комментарии `//`, висячие запятые. Два чанка обёрнуты в `(function () { … })();` и держат локальные `const LISTEN = {…}; const TAP = {…};` — на них ссылаются литералы (`prompt: LISTEN`). Других идентификаторов-значений, конкатенаций, функций и шаблонных строк в данных нет (проверено на файле 28.10). |
| 51 — данные Sound Lab | `PRON.sounds = […]` (44), `PRON.soundLex = {…}`, `PRON.featureText = {…}`, `PRON.soundTips = {…}` — тоже JS-литералы |
| 52–56 — движок | пять IIFE: core (строки, хранение, звук, запись), world (маскоты, регионы), visuals (схемы Learn), Echo Gates, home/learn/router. ~140 КБ |

Движок берёт тему как `topicsList()`: модуль уровня + `PRON.v2[M.id]` (без темы модуль пропускается).
Звук: `P.play(text)` → `P.audioId(text, accent)` (нижний регистр, не-`[a-z0-9']` → `-`, ≤ 80
символов, `ga-` для американского) → клип из `gameAudio`, иначе `speechSynthesis`.

## Контракт

### Бандл — `GET /mobile/pronunciation`

Форма данных прототипа, data-URI заменены публичными ссылками бакета. Ключи `gameAudio` и `assets` —
**ровно как в прототипе** (движок строит их сам из текста).

```json
{
  "release": 1,
  "uploadedAt": "2026-10-28T12:00:00Z",
  "levels": [ { "id": "A0", "title": "…", "title_t": {…}, "summary": {…}, "modules": [ … как в прототипе … ] } ],
  "topics": { "A0.1": { "id": "A0.1", "lex": {…}, "learn": {…}, "game": {…} } },
  "sounds": [ … ], "soundLex": { … }, "featureText": { … }, "soundTips": { … },
  "assets": { "m-luna-front": "https://files…/practice/pronunciation/<sha24>.webp", "w-a0": "…", … },
  "gameAudio": { "a-black-board": "https://files…/practice/pronunciation/<sha24>.mp3", … }
}
```

- `levels` — в порядке `addLevel` в файле; `topics` — `PRON.v2` (ключ — `id` темы; первый аргумент
  `addTopics` не используется, как и в прототипе).
- Литералы с `LISTEN`/`TAP` приходят уже раскрытыми (объект подставлен на место ссылки).
- `LOGO_SVG` в бандл не входит: у сайта своя шапка, логотип раздела не рисуется.
- ~2.2 МБ JSON; gzip бэкенда включён для JSON.
- Нужен Bearer (как `/mobile/prepositions`); гостю — 401. До первой заливки — `404`.

### Ручки админки

- `POST /admin/pronunciation/upload` — multipart `file`, только ADMIN. Ответ:
  `{release, levels, topics, audio, images, uploadedMedia, reusedMedia, removedMedia, engineMatches,
  warnings: []}`. Ошибка проверки — 400 с понятным текстом (`message`), ничего не пишется. Вторая
  заливка, пока идёт первая, — 409.
- `GET /admin/pronunciation` → `{current: {release, fileName, levels, topics, audio, images,
  engineSha, engineMatches, uploadedBy: {id, name}, createdAt} | null, history: [… последние 20 …]}`.

### Хэш движка

sha256 (hex) текста: единственный inline `<script>` → переводы строк к `\n` → split по `"\n;\n"` →
выбросить чанки данных (начинается с `window.PRON`; содержит `PRON.addLevel(` или `PRON.addTopics(`;
есть строка, начинающаяся с `PRON.sounds =`/`PRON.soundLex =`/`PRON.featureText =`/`PRON.soundTips =`)
→ оставшиеся склеить через `"\n;\n"`.

Для файла 28.10.2026: **`1fd5be2a3042a8c773e226d276336d0c0013f2959ba1d0e44cbab0db86fcf501`**
(5 чанков). Это значение `pronunciation.engine-sha` бэкенда; сайт переносит движок из этого же файла.

## Часть 1. Backend — модуль `pronunciation`

Копия идиом модуля `prepositions` (parser / upload / storage / catalog service, release-сущность,
`PracticeMediaStorage`, `JsLiterals`).

### Разбор `PronunciationHtmlParser`

- Скрипт → чанки (§«Хэш движка»). Голова: `PRON.gameAudio=` и `PRON.ASSETS=` — JSON-объекты
  (Jackson по границам скобок с учётом строк). `LOGO_SVG` не читается.
- Чанки данных: локальные `const NAME = <литерал>;` чанка собираются в словарь; каждый вызов
  `PRON.addLevel(<литерал>)`, `PRON.addTopics(<строка>, <литерал>)`, присваивание
  `PRON.<sounds|soundLex|featureText|soundTips> = <литерал>` вырезается по скобкам (строки и
  комментарии пропускаются), голые идентификаторы-значения подставляются из словаря чанка, затем
  `JsLiterals.jsToJson` → Jackson. Неизвестный идентификатор — ошибка «в чанке N неизвестное имя X».
  Код не исполняется.

### Проверки — ошибка отклоняет всю загрузку

- нет головы, `gameAudio`/`ASSETS` — не JSON-объект; нет ни одного уровня; не разобрался литерал
  (номер чанка и текст ошибки);
- у уровня нет `id`/`modules`, у модуля — `id`/`title`; повтор id модуля или темы;
- нет `PRON.sounds`;
- картинка не webp, запись не mp3 (по сигнатуре байтов), файл > 20 МБ (`PracticeMediaService.MAX_BYTES`).

### Предупреждения — загрузка проходит

- модуль без темы (движок его молча пропустит) и тема без модуля;
- у уровня нет картинки `w-<id в нижнем регистре>`; нет `w-hero`;
- хэш движка не совпал с `pronunciation.engine-sha`: «Движок в файле отличается от перенесённого на
  сайт: правки данных применятся, правки движка (схемы, игра, логика) — нет, нужен PR сайта».

«Неиспользуемые» записи и «у слова нет записи» не ищем: какой текст прозвучит, решает код движка.

### Запись

Как у `prepositions`: одна заливка за раз (409); медиа `practice/pronunciation/<sha24>.mp3|webp`
через `PracticeMediaStorage` (`immutable`, только новые, в несколько потоков; `PracticeMediaNames`:
раздел `pronunciation` с `mp3`, `webp`) → строка `pronunciation_releases` → `pronunciation/current/
bundle.json` (`PronunciationStorageService`, режим `pronunciation.storage=local` для разработки) →
сброс кэша `/mobile/pronunciation` → удаление медиа раздела, на которые не ссылаются ни новый, ни
предыдущий бандл. Сбой медиа — строки нет, сбой бандла — строка удаляется.

Таблица `pronunciation_releases`: `id, file_name, levels_count, topics_count, audio_count,
images_count, engine_sha, uploaded_by → users ON DELETE SET NULL, created_at` + индекс
`created_at DESC`. Миграция — следующий свободный номер (на 28.10 develop — V473, значит **V474**;
сверить с develop и открытыми PR перед мержем).

### Документ и тесты

- `docs/practice/PRONUNCIATION.md` — формат и поток, как `PREPOSITIONS.md`.
- Тесты на Mockito, без WebMvc-срезов (они красные из-за `IeltsAccessInterceptor`). Html собирает
  сам тест: голова с 2 клипами и 2 картинками, уровень с `const LISTEN` в IIFE, тема, Sound Lab,
  движок-заглушка. Проверить: подстановку констант, неизвестное имя, каждую ошибку и предупреждение,
  хэш не зависит от данных и `\r\n`, медиа по хэшу и повтор без перезаливки, ссылки вместо base64,
  порядок записи, удаление лишнего медиа, кэш и 404 до первой заливки.
- Необязательный тест на настоящем файле по переменной `PRONUNCIATION_HTML`: 6 уровней, 44 темы,
  1694 записи, 23 картинки, предупреждений нет, хэш = значению выше (тест его печатает).

### Риск

25 МБ и ~1717 файлов одним запросом. Перед заливкой на стенд — `client_max_body_size` и
`proxy_read_timeout` nginx перед бэкендом (дев — новый сервер 94.247.128.198; прод за Cloudflare —
100 с).

## Часть 2. web-admin — страница «Pronunciation World»

Копия `feature/system/prepositions/`:

- маршрут `pronunciation` в `system.routes.ts` (`roleGuard(['ADMIN'])`), карточка во вкладке
  «Практика и тесты»: «Pronunciation World — произношение: объяснения и игра на слух», после Cartoon
  World;
- `core/services/pronunciation.service.ts`: `getLatest()`, `uploadHtml(file)`;
- страница: «Загрузить html» (`.html`), текущий релиз (уровни, темы, записи, картинки, дата, кто
  залил), история 20 загрузок, после заливки — счётчики, медиа залито/переиспользовано/удалено,
  предупреждения списком; несовпадение движка — отдельной заметной плашкой; 400 — текст ошибки;
- тесты — `npx ng test` локально (Karma в CI не гоняется).

## Часть 3. Сайт

### Экран и движок

- `?screen=pronunciation` — `src/screens/PronunciationPage.jsx` (+ ветка в `App.jsx`), данные —
  `src/screens/pronunciation/usePronunciationData.js` (статусы `guest` / `missing` (404) / `error` +
  «Повторить» / `ready`, как у Prepositions World; кэш бандла — только в памяти вкладки),
  `getPronunciation(token)` в `src/api.js`. Корень экрана несёт `data-release`.
- Движок — `src/practice/pronunciation/engine.js`: пять чанков движка почти дословно,
  `mountPronunciation(root, cfg) → destroy`, Shadow DOM. CSS — `styles.js` без `@font-face` Onest:
  гарнитуры `inherit` от хоста (Manrope, на телефоне PT Root UI, в kk — Inter; `kkFont.test.js`).
- `cfg`: `{bundle, progress, onProgress, onAnswer, playUrl, speak, onExit}`.

Отступления от прототипа (остальное — как есть):

| Прототип | Порт | Почему |
|---|---|---|
| глобальный `window.PRON`, данные из чанков | объект `P` на каждый монтаж, данные из `cfg.bundle` | материал с бэкенда, два монтажа не делят состояние |
| роутер на `location.hash`, ссылки `#/…` | внутреннее состояние, клики по `a[href^="#/"]` в тени перехватываются | адрес приложения не трогаем |
| `document.documentElement.dataset.tr/audio`, `document`-слушатели клавиш | атрибуты и слушатели на хосте/корне тени, снимаются в `destroy` | глобальный `<html>` — общий с приложением |
| клипы: `fetch(url)` → `decodeAudioData` → Web Audio | `cfg.playUrl` (`src/lib/speech.js`), прогрев — `prefetchUrl` | у бакета нет CORS; один `<audio>` на приложение — иначе молчит iPhone |
| `speechSynthesis` для текста без клипа | `cfg.speak` → `/api/tts` (Soniox; британский голос, для `ga-` — американский; «Медленно» — темп), по `onFail` — голос устройства | правило проекта: озвучка без записи — Soniox |
| `localStorage jts-pron-v2` | `cfg.progress` / `cfg.onProgress` | прогресс синкается с аккаунтом |
| шапка с логотипом, `P.logo` | без логотипа; «назад» с главной раздела → `cfg.onExit` | шапка приложения уже есть |

Сохраняется как в прототипе: интерфейс раздела английский, перевод объяснений — кнопкой, выбранный
перевод живёт только во вкладке (`sessionStorage jts-pron-tr`); запись голоса — только в памяти,
микрофон отпускается после каждой записи и в `destroy`; тоны ответа — Web Audio (это синтез, не
файлы, CORS не нужен).

### Прогресс

- Модуль синка `pronunciation` (`src/lib/practiceContract.js`, replace), состояние прототипа
  `{learned: {<id>: true}, rounds: {<id>: [{done, best, plays}×3]}, tutorial, level, last}` (без `tr`).
- `src/practice/pronunciation/progress.js` — `merge(a, b)`: `learned` объединяется, по раунду —
  `done` ИЛИ, `best` и `plays` — максимум, `tutorial` ИЛИ, `level`/`last` — локальные; сводится со
  снимком сервера, как у «Чисел».
- Ответ в игре и на проверке Learn → `recordSkill('listening', с первой попытки)`. Самопроверка
  после записи («похоже?») навык не пишет — это самооценка.
- Квоты и домашки нет: area `pronunciation` бэкенду неизвестна.

### Место в «Практике»

Вкладка «Говорение» (`practiceTabs.js`), широкий баннер сразу после «Шэдоуинга». Тексты баннера
`practice.pronunciation.*` — ru/kk/en, без картинки (градиент, как у Prepositions World). Луна
знает раздел: строка в `src/lib/assistant/destinations.js`.

### Тесты

- Фикстура: `scripts/pronunciation/make-fixture.js --html <прототип>` режет настоящий файл в мини-html
  того же формата (уровень A0 с двумя темами + Sound Lab, их клипы — один тихий mp3, картинки 8×8),
  движок байт в байт (`.gitattributes` — LF): вход оракула, бандл e2e, ручная проверка админки
  (заливка фикстуры показывает «движок совпадает»).
- Оракул: `scripts/pronunciation/extract-oracle.js` исполняет прототип-фикстуру в `node:vm` с
  заглушкой DOM и зафиксированным `Math.random` и пишет `__fixtures__/oracle.json` (сборка тем
  `topicsList`, `audioId`, раунды Echo Gates, звёзды). `engine.test.js` сверяет порт: красный — чинить
  порт.
- `progress.test.js` — сведение двух устройств; сторож — движок не пишет в `location.hash` и не
  трогает `document.documentElement`.
- E2E `tests/pronunciation.spec.js`: `/mobile/pronunciation` — бандл фикстуры, медиа — тихий mp3 и
  пиксель webp через `page.route`: «Практика» → «Говорение» → баннер → тема → Learn до конца → игра →
  раунд → звезда → перезагрузка, прогресс на месте; «гость» и «раздел готовится»; 360px без
  горизонтальной прокрутки.
- `npm run build`, `npm run lint`, `npm test`.

### CLAUDE.md

Абзац о разделе — как у Prepositions World.

## Выкатка

1. Три PR в develop: backend → web-admin → сайт (сайт без залитого раздела показывает «Раздел
   готовится» — его мерж ничего не ломает). Номер миграции сверить перед мержем.
2. Перед заливкой — лимиты nginx перед дев-бэкендом.
3. Заливает владелец в дев-админке. Проверка на деве: `data-release`, медиа с files-dev с
   `immutable`, путь ученика, прогресс на втором браузере, повторная заливка — 0 новых медиа.
4. В прод — обычным develop → main.

## Не делаем

- Поштучное редактирование тем и слов в админке.
- Перенос констант движка (`P.T`, схемы, `TONGUE`, `ANOTE`…) в данные.
- Оценку произношения сервером (Azure) — в прототипе её нет, запись только для себя.
- Отдачу медиа через бэкенд, CORS у бакета, статический фолбэк в `public/`.
- Premium/замки, домашние задания, XP.
