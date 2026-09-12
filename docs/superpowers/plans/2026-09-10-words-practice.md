# «Слова в картинках» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** перенести прототип `data/jtswords.html` в нативный раздел Практики `words` — визуальный словарь «Listen and find» на 564 слова и 52 сцены.

**Architecture:** офлайн-экстрактор режет прототип в JSON и оракул-фикстуры; отдельный скрипт забирает ассеты с чужого CDN и пережимает их в `public/practice/words/`; движок (сессия + солвер раскладки) — чистые модули без DOM, сверенные с оракулом; экраны — React внутри state-машины `App.jsx`.

**Tech Stack:** Next.js 15 (App Router как оболочка), React 19, JavaScript (не TypeScript), vitest, playwright, sharp, `node:vm`.

## Global Constraints

- Только `.js`/`.jsx`. TS-файлов не добавлять (`jsconfig.json`).
- Комментарии — на русском, объясняют «почему», не «что».
- Ключ раздела везде `words`. `vocab` занят карточками слов из уроков.
- Стили — в новый глобальный `src/words.css`. Никаких CSS-модулей и styled-components. Шрифт Manrope.
- Строки UI — через `useI18n` (`src/i18n.jsx`), три языка: ru, en, kz. Ключи одинаковые.
- Солвер раскладки не читает `document`: пропорции сцены и ориентация приходят аргументами.
- Речевого синтеза в разделе нет. Слово звучит только своим mp3.
- Юнит-тесты гонять как `npx vitest run <путь> --exclude '.claude/**'` — иначе vitest подхватит тесты соседних worktree.
- E2E гонять с явным портом: `E2E_PORT=3120 npm run test:e2e -- tests/words.spec.js`.

---

### Task 1: Экстрактор и данные

**Files:**
- Create: `scripts/extract-words.js`
- Create: `scripts/extract-words.test.js`
- Produces (не в git до прогона): `public/practice/words/meta.json`, `public/practice/words/<section>.json`, `src/practice/words/__fixtures__/oracle-<section>.json`

**Interfaces:**
- Consumes: `data/jtswords.html`
- Produces:
  - `meta.json` → `{ sections: [{ id, name, blurb, scenes: [{ id, name, place, tint, tint2, water, count }] }] }`
  - `<section>.json` → `{ scenes: [{ id, name, place, tint, tint2, water, slots: [[x, y, type, depth]] }], words: [{ id, word, ru, kk, env, also, pl, anim, pri }] }`
  - `oracle-<section>.json` → `{ scenes: { <sceneId>: { pool: [id], rounds: [[id]], placed: [{ id, x, y, w }] } } }` при сиде `1` и пропорциях сцены `0.62`, ландшафт

- [ ] **Step 1: Тест на состав данных**

`scripts/extract-words.test.js`: прогнать `extractWords(html)` и проверить — 5 секций, 52 сцены, 564 слова, у слова есть `ru`/`kk`, у сцены непустые `slots`, счётчики по секциям `{animals: 161, food: 175, clothes: 71, house: 95, body: 60}`.

- [ ] **Step 2: Прогнать тест — должен упасть**

`npx vitest run scripts/extract-words.test.js --exclude '.claude/**'` → FAIL «Cannot find module».

- [ ] **Step 3: Написать экстрактор**

Резать по именам констант (`ENVS`, `ANIMALS`, `SECTIONS`, `HOSTED`, `CONFUSABLE`, `SIZE_S/L/XL`, `COMPAT`, `ROUND_SIZE`, `BASE`, `MIN_W`, `SAFE`), исполнять через `node:vm`. Регулярками по строкам не резать — в прототипе есть строки с `{}` внутри.

- [ ] **Step 4: Тест зелёный**

- [ ] **Step 5: Оракул**

В том же `node:vm`-контексте выполнить прототипные `poolFor`, `buildSession`, `separateConfusables`, `placeRound`, подменив `Math.random` на сид-генератор, а `stageAR()`/портретность — на константы. Записать фикстуры.

- [ ] **Step 6: Прогнать экстрактор, проверить размеры**

`node scripts/extract-words.js` → `du -sh public/practice/words`.

- [ ] **Step 7: Коммит**

---

### Task 2: Ассеты

**Files:**
- Create: `scripts/fetch-words-assets.js`
- Produces: `public/practice/words/{sprites,scenes,audio}/`, `public/practice/words/assets-manifest.json`

**Interfaces:**
- Consumes: карта `HOSTED` из Task 1 (`meta.json` её не содержит — скрипт читает прототип сам)
- Produces: `sprites/<wordId>.webp`, `scenes/<sceneId>/bg.webp`, `scenes/<sceneId>/cover.webp`, `audio/<wordId>.mp3`

- [ ] **Step 1: Скрипт**

Спрайты: `sharp(buf).resize(640, 640, { fit: 'inside' }).webp({ quality: 82, alphaQuality: 90 })` — **альфа обязательна**, иначе белые квадраты поверх фона.
Фоны: `.resize(1600).webp({ quality: 80 })`. Обложки: `.resize(800).webp({ quality: 80 })`.
Аудио: копия mp3 как есть (25 КБ).
Манифест `{ <ключ>: { src, bytes } }`, уже скачанное пропускать. Параллельность 6, ретрай 3.

- [ ] **Step 2: Пробный прогон на одной сцене**

`node scripts/fetch-words-assets.js --scene farm` — проверить глазами, что у спрайта прозрачный фон (`sharp(f).metadata()` → `hasAlpha: true`).

- [ ] **Step 3: Полный прогон**

`node scripts/fetch-words-assets.js` (долго: ~5.5 ГБ качается, ~75 МБ остаётся). Ожидаемо: 562 спрайта, 104 картинки сцен, 563 mp3.

- [ ] **Step 4: Проверить итог**

`du -sh public/practice/words/*` — суммарно не больше ~90 МБ.

- [ ] **Step 5: Коммит** (ассеты отдельным коммитом, иначе диффы нечитаемы)

---

### Task 3: Движок — сессия

**Files:**
- Create: `src/practice/words/session.js`, `src/practice/words/session.test.js`
- Create: `src/practice/words/data.js`

**Interfaces:**
- Consumes: `oracle-<section>.json` из Task 1
- Produces:
  - `makeRng(seed) → () => number`
  - `poolFor(scene, words) → Word[]`
  - `buildSession(scene, words, { seed, portrait }) → { pool, rounds }`
  - `separateConfusables(rounds) → rounds`
  - `loadSection(id) → Promise<{ scenes, words }>`, `loadMeta() → Promise<meta>` (кэш промиса на уровне модуля, как `fetchLevel` в `ReadingPage.jsx:20`)

- [ ] **Step 1: Тест против оракула** — для каждой сцены `pool` и `rounds` совпадают с фикстурой при сиде 1.
- [ ] **Step 2: Прогон — FAIL.**
- [ ] **Step 3: Порт `poolFor`/`shuffle`/`buildSession`/`separateConfusables`.** Размер раунда 8, в портрете 6 — аргументом, не из `matchMedia`.
- [ ] **Step 4: Тест зелёный.**
- [ ] **Step 5: Тест «путаемые пары не в одном раунде»** для всех 52 сцен при 20 разных сидах.
- [ ] **Step 6: Коммит.**

---

### Task 4: Движок — солвер раскладки

**Files:**
- Create: `src/practice/words/layout.js`, `src/practice/words/layout.test.js`

**Interfaces:**
- Consumes: `session.js` (раунды), оракул
- Produces: `placeRound(round, scene, { ar, portrait, rng }) → [{ id, x, y, w }]`, `sizeOf(word) → 'XL'|'L'|'M'|'S'`, `boxOf(placed, ar) → { L, R, T, B }`, `overlap(a, b, ar) → number`

- [ ] **Step 1: Тест против оракула** — координаты совпадают с фикстурой при сиде 1 и `ar = 0.62`.
- [ ] **Step 2: Прогон — FAIL.**
- [ ] **Step 3: Порт `BASE`/`MIN_W`/`SAFE`, `box`, `clampInto`, `overlap`, `placeRound`, `spriteScale`.** Совместимость слотов `f→b→g`, `w→g`, `b→g` — наземное слово не должно попасть на ветку или в небо.
- [ ] **Step 4: Тест зелёный.**
- [ ] **Step 5: Инвариантные тесты** на всех 52 сценах × 20 сидов: спрайты внутри `SAFE`, попарное перекрытие ниже порога, тип слота совместим с `pl` слова.
- [ ] **Step 6: Коммит.**

---

### Task 5: Прогресс и синк

**Files:**
- Create: `src/practice/words/wordsProgress.js`, `src/practice/words/wordsProgress.test.js`
- Modify: `src/practice/practiceKeys.js`, `src/practice/practiceSyncCore.js:29`, `src/lib/practiceContract.js:20`

**Interfaces:**
- Produces: `readState()`, `markWordFound(sceneId, wordId)`, `markSceneDone(sceneId, total)`, `sceneProgress(sceneId, total)`, `sectionDoneCount(scenes)`
- Форма стейта: `{ scenes: { <sceneId>: { found: [wordId], done: boolean } } }`, семантика **replace** (как `writing`/`reading`)

- [ ] **Step 1: Тест** — отметка слова копится, повтор идемпотентен, `markSceneDone` зовёт `countUnitTowardsHomework('words', section, sceneId)`.
- [ ] **Step 2: Прогон — FAIL.**
- [ ] **Step 3: Реализация по образцу `readingProgress.js`**; `WORDS_KEY = 'jts_words_done'` и `WORDS_PROGRESS_EVENT = 'words-progress'` в `practiceKeys.js`; `'words'` в `PRACTICE_MODULES`, в `OBJECT_MODULES` и в ветке гидратации `applyHydratedState`.
- [ ] **Step 4: Тесты зелёные** — свой плюс `src/practice/practiceSyncCore.test.js`.
- [ ] **Step 5: Коммит.**

---

### Task 6: Экраны и стили

**Files:**
- Create: `src/screens/WordsPage.jsx`, `src/screens/words/WordsLibrary.jsx`, `WordsPreview.jsx`, `WordsScene.jsx`, `WordsResult.jsx`, `useWordsVoice.js`
- Create: `src/practice/words/assets.js`, `src/practice/words/loc.js`
- Create: `src/words.css`
- Modify: `src/app/layout.jsx` (подключить `words.css` рядом с `reading.css`)

**Interfaces:**
- Consumes: `session.js`, `layout.js`, `wordsProgress.js`, `data.js`
- Produces: `<WordsPage token onNav initialTarget />`, где `initialTarget = { section?, sceneId? }`

- [ ] **Step 1: `assets.js` и `loc.js`.** `spriteUrl(id)`, `sceneBg(id)`, `sceneCover(id)`, `audioUrl(id)`; `translate(word, lang)` — `ru`/`kk` из данных, при `en` пустая строка.
- [ ] **Step 2: `useWordsVoice.js`.** Прелоад слов раунда, ретрай 3, при провале — мигание кнопки. Синтеза нет.
- [ ] **Step 3: Каталог и превью.** Чипы секций, карточки сцен с обложкой и кольцом прогресса; превью — список слов с озвучкой и кнопкой старта.
- [ ] **Step 4: Сцена.** Фон, спрайты по координатам солвера, задание, кнопка повтора, пробел = повтор, обратная связь на промах, `relayout` при повороте — без сброса раунда.
- [ ] **Step 5: Результат.** «Нашёл все N», список слов с озвучкой, «ещё раз» и «другие сцены».
- [ ] **Step 6: `words.css`** в стилистике `reading.css`: та же типографика, пилюли, карточки; перекраска сцены через `--tint`/`--tint2` из данных.
- [ ] **Step 7: Проверка в браузере** — `npm run dev`, диплинк `?screen=words`, пройти одну сцену целиком.
- [ ] **Step 8: Коммит.**

---

### Task 7: Интеграция в Практику

**Files:**
- Modify: `src/App.jsx:109` (список диплинков), `:198` (разбор `?screen=words&scene=`), `:431` (стейт таргета), `:1089`/`:1116` (навигация), `:1491` (ветка `case 'words'`)
- Modify: `src/screens/PracticePage.jsx` (баннер `#sec-words`, чип, шаг тура)
- Modify: `src/i18n.jsx` (ключи `practice.words.*` и `tour.practice.words.*` в ru/en/kz)

- [ ] **Step 1: `case 'words'` и диплинк.** Диплинк применяется эффектом ПОСЛЕ гидратации — иначе hydration mismatch (см. комментарий в `App.jsx`).
- [ ] **Step 2: Баннер в Практике** по образцу `ReadingBanner` (`PracticePage.jsx:194`): каркас `.pp-listen`, перекраска модификатором `.pp-words` в `words.css`.
- [ ] **Step 3: Ключи i18n** во всех трёх языках.
- [ ] **Step 4: Проверка** — раздел открывается и с карточки Практики, и диплинком; переключение языка не роняет экран.
- [ ] **Step 5: Коммит.**

---

### Task 8: E2E и приёмка

**Files:**
- Create: `tests/words.spec.js`

- [ ] **Step 1: Спека** — диплинк `?screen=words`, открытие сцены, тап по верному спрайту, экран результата.
- [ ] **Step 2:** `E2E_PORT=3120 npm run test:e2e -- tests/words.spec.js`.
- [ ] **Step 3:** `npm run build`.
- [ ] **Step 4:** `npm run lint`.
- [ ] **Step 5:** `npx vitest run src/practice/words scripts/extract-words.test.js --exclude '.claude/**'`.
- [ ] **Step 6: Коммит и PR в `develop`.**

## Красная база

На `develop` часть тестов красная и до этой ветки: `tests/practice-contract.spec.js` (20 падений), флак `vocab:242`, 6 ошибок линта в `practice`/`vocab`. Это не регрессия порта — сверять с прогоном на чистом `origin/develop`, а не чинить попутно.
