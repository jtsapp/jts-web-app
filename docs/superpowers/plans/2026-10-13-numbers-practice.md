# «Числа» в Практике — план реализации

> Исполнение: инлайн в этой сессии (пользователь попросил делать сразу). Спека —
> `docs/superpowers/specs/2026-10-13-numbers-practice-design.md`.

**Цель:** раздел «Практики» `?screen=numbers` — игра Dexter's Number World, перенесённая из прототипа в Shadow DOM.

**Архитектура:** прототип `data/jtsnumbers.html` → экстрактор → `public/practice/numbers/` (data.json, img, fonts);
движок прототипа почти дословно в `src/practice/numbers/engine.js` (`mountNumbers(root, cfg) → destroy`), чистая
логика — в `logic.js`; прогресс — `createProgressStore` с `merge`; звук — `playTts` (Soniox Freya, `speed: 1`,
темп через новую опцию `rate`).

**Стек:** Next.js SPA (JS), vitest, playwright.

## Ограничения
- Только JS, без TS. Комментарии — по-русски, объясняют «почему».
- Игра — на английском; ключи i18n приложения — только для оболочки (ru/en/kk).
- Звук — только `/api/tts` голосом `VOICE.gb` (Freya); синтеза устройства нет. Провал звука → слово на экране.
- Без квоты и без домашки.

### Task 1: прототип, экстрактор, данные и ассеты
Files: `data/jtsnumbers.html` (исправленная игра, без записей), `scripts/extract-numbers.js`,
`scripts/extract-numbers.test.js`, `public/practice/numbers/{data.json,img/*.webp,fonts/*.woff2}`.
- Экстрактор: вырезает `<script>` прототипа до `/* end of game data */` плюс блок `SOURCES … UI` и исполняет в
  `node:vm`; пишет `data.json` = `{sections, tours, lessons, sources}`. Base64-картинки из `ASSET`/`POSE` и
  `--bg1..3` — в `img/<имя>.webp`; `@font-face` Literata/Golos — в `fonts/<семейство>-<диапазон>.woff2` и
  `fonts.json` (семейство, вес, unicode-range, файл).
- Тест: повторный прогон в tmp даёт тот же `data.json`; все файлы из json на диске.

### Task 2: чистая логика `src/practice/numbers/logic.js` + `logic.test.js`
Produces: `positionPlan(n, rnd)`, `buildRound(section, group, seen, rnd)`, `modeOf(item)` (не меняет),
`spokenOf(item)`, `sayText(w)`, `exSay([f,t])`, `roundScore(results)`. Источник кода — прототип.
Тест: баланс слотов ±1 и не три подряд; босс — 16 без повторов ответа, сначала `own`; `spokenOf` для
заполнения пропуска, `21st → twenty-first`, явный `say`; `sayText('thirTEEN') === 'thirteen'`, `May` не трогает.
Плюс `data.test.js`: инварианты данных (ответ ≠ ложным, у каждого раздела урок, источники, боссы `listen`).

### Task 3: `rate` в `src/lib/speech.js`
`playTts(text, { rate })`: `defaultPlaybackRate = playbackRate = rate || 1`, `preservesPitch = true`; адрес не
меняется. Тест в `src/lib/speech.test.js`.

### Task 4: прогресс и регистрация модуля
Files: `src/practice/numbers/numbersProgress.js` (+ тест), `practiceKeys.js` (`NUMBERS_KEY`,
`NUMBERS_PROGRESS_EVENT`, `NUMBERS_LANG_KEY`), `lib/practiceContract.js`, `practiceSyncCore.js`,
`practiceSync.js` (`clearLocalPractice`), `lib/db/studentActivity.js`; обновить тесты контракта, синка, квоты,
`studentActivity`.
API: `readNumbers()`, `updateNumbers(fn)` (клон свежего состояния → fn → write), `mergeNumbers(server, local)`.
`seen` пишется только для боссов и Lab (только там выбор заданий его читает).

### Task 5: движок `engine.js`, `styles.js`, `markup.js`, `voice.js`
`mountNumbers(root, { data, progress, voice, onSkill, lang, langKey, fast })`. Отличия от прототипа: `$`/`$$` от
корня; модалка, тосты, конфетти — в корне; слушатели через `AbortController`; прогресс через
`progress.read()/update()` (запись один раз, в итогах раунда); звук через `voice.say(text, rate, onFail)`;
картинки — `/practice/numbers/img/…`; у сцены `data-answer`; `destroy()`.
`voice.js`: `say` → `playTts(text, { voice: VOICE.gb, lang: 'en', speed: 1, rate, onFail })`, `prefetch`, счётчик
провалов (2 подряд → «Sound is unavailable», слова на экране).

### Task 6: экран и подключение
`src/screens/NumbersPage.jsx`, `src/numbers.css` (+ `@font-face` из `fonts.json`), `layout.jsx`, `App.jsx`,
`practiceTabs.js` (`{ id: 'numbers' }` после `words`), `PracticePage.jsx` (Banner `sec-numbers`), `styles.css`
(`.pk-banner--numbers`), `theme-dark.generated.css` (регенерация), `i18n.jsx` (ru/en/kk), тесты вкладок и счётчиков.

### Task 7: E2E `tests/numbers.spec.js`
Подмена `/api/tts` тихим mp3; карта 17 карточек; урок → раунд → итоги → после F5 раунд засчитан; 375 px —
варианты в табличках.

### Task 8: документация, проверка, PR
Раздел «Числа» в `CLAUDE.md`; `npm run build`, `npm run lint`, свои vitest (`--exclude '.claude/**'`), e2e
`--workers=1` с `E2E_PORT`; осмотр 1024 и 375 px; PR в `develop`.
