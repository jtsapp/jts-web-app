# «Слушай и выбирай» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.
>
> Исполнение здесь — инлайн одним потоком (решение владельца, см. память `subagents-vs-inline`): полный код пишется сразу в файлы, план держит порядок, интерфейсы и проверки. Субагент — один раз, на финальное ревью ветки. Коммитов по ходу нет: коммит и PR — только по просьбе владельца.

**Goal:** нативный раздел Практики `listenchoose` — порт `data/jtslistenchoose.html` (слышишь описание → выбираешь из 4 фото), озвучка только записями.

**Architecture:** тот же приём, что у `verbs`/`reading`: офлайн-экстрактор режет прототип в `public/practice/listenchoose/` и оракул-фикстуры; чистый движок (`engine.js`, `player.js`) сверяется с оракулом, который считает САМ прототип; состояние экрана — класс-контроллер вне React (`session.js`) под `useSyncExternalStore`; экран — React внутри state-машины `App.jsx`.

**Tech Stack:** Next.js (JS, не TS), React, vitest (юниты рядом с кодом), Playwright (`tests/*.spec.js`), node:vm для оракула, Soniox TTS для записей.

Спека: `docs/superpowers/specs/2026-09-20-listenchoose-practice-design.md` — при расхождении с планом права спека.

## Global Constraints

- JavaScript, не TypeScript. Комментарии на русском и объясняют «почему», не «что».
- Стили — только `src/listenchoose.css`, префикс `.lc-`, никаких CSS-модулей. Запрещён `overflow-wrap: anywhere`; у каждой выключаемой кнопки есть правило `.класс:disabled` (сторожа `textCollapse.test.js` и `disabled-controls.test.js`).
- i18n: `useI18n()` + `src/i18n.jsx`, три словаря ru / en / kk (в прототипе kk = `kz`). Формулировка задания («Listen and choose the correct picture»), названия сложностей (Easy/Medium/Hard) и подписи плеера (Play, Pause, Stop, Replay, ±5s, Try again) остаются английскими — язык упражнения.
- Ключ раздела `listenchoose`; ключи хранилища `jts_listenchoose_done` (синк, replace) и `jts_listenchoose_run` (устройство); событие `listenchoose-progress`.
- Синкается ТОЛЬКО `{ seen: { easy: [id…], medium: […], hard: […] } }`. В домашнюю работу раздел не отчитывается; навык — `recordSkill('listening', ответил с первой попытки)`.
- Записи: Soniox, `language: 'en'`, `audio_format: 'mp3'`, голос `Owen`, темп `0.95`; имя файла — `sayAudioFile(text)` (sha1 текста, 12 hex); голоса устройства (`speechSynthesis`) нет вовсе.
- Состав данных: 13 сцен × 4 подписи фото, 150 заданий (50 на сложность; у сцены `art` по 2 фото на сложность), 104 картинки (`<сцена>-<0..3>-<320|512>.webp`).
- «Прослушал до конца»: `ended` и покрыто не меньше `duration − 0.32 с` РЕАЛЬНО проигранного (перемотка, mute/громкость 0 и «быстрее реального времени» диапазон не наращивают).
- Раунд: две попытки; выбирать нельзя, пока не дослушано и не загрузились все 4 картинки; после первой ошибки прослушанное сбрасывается.
- Не перезаписывать чужие файлы: перед записью по существующему пути — проверить (`ls`). Генерируемые артефакты экстрактора — исключение, они его.
- Работа только в worktree `.claude/worktrees/listenchoose`; основное дерево (гибрид release-ветки) не трогать. Vitest — из worktree, только свои файлы. E2E — `E2E_PORT` + `channel: 'chrome'` (обёртка в scratchpad).
- Текст в `.env`-значениях может быть с BOM (`loadEnv` его режет).

## Карта файлов

| Файл | Ответственность |
|---|---|
| `data/jtslistenchoose.html` | прототип, источник правды (копия из Downloads) |
| `scripts/extract-listenchoose.js` (+`.test.js`) | режет прототип → questions.json, img/, i18n-source, оракул |
| `scripts/make-listenchoose-audio.js` (+`.test.js`) | Soniox → `audio/<хэш>.mp3`, `--dry/--limit/--voice/--speed/--force` |
| `scripts/make-lesson-audio.js` | только экспорт `synthesizeSoniox`, `sleep`, `loadEnv` |
| `src/practice/listenchoose/data.js` | загрузка questions.json, `imagePath`, `optionsOf` |
| `src/practice/listenchoose/engine.js` | выборка, набор, раунд, счёт (чистые функции) |
| `src/practice/listenchoose/player.js` | плеер записи: состояния, «прослушано» |
| `src/practice/listenchoose/session.js` | контроллер экрана: сложности, наборы, раунд, сохранение |
| `src/practice/listenchoose/listenchooseProgress.js` | синкаемый `seen` |
| `src/practice/listenchoose/listenchooseSettings.js` | настройки и недоигранные наборы устройства |
| `src/screens/ListenChoosePage.jsx` | оболочка, шапка, сложность, набор, итог |
| `src/screens/listenchoose/*.jsx` | `LcPlayer`, `LcPictures`, `LcFeedback`, `LcResult`, `LcDialogs`, `LcIcons` |
| `src/listenchoose.css` | стили `.lc-` (+ перекраска баннера `.pp-lc`) |
| интеграция | `App.jsx`, `app/layout.jsx`, `PracticePage.jsx`, `practiceKeys.js`, `practiceContract.js`, `practiceSyncCore.js`, `practiceSync.js`, `i18n.jsx`, `CLAUDE.md` |
| тесты | юниты рядом с кодом; `tests/listenchoose.spec.js`, правки `practice-contract` / `practice-sync-core` / `practice-learning-tour` |

---

### Task 1: Источник, экстрактор, данные и оракул

**Files:**
- Create: `data/jtslistenchoose.html` (`cp -n "C:/Users/nural/Downloads/jts-listen-and-choose (1).html" data/jtslistenchoose.html`)
- Create: `scripts/extract-listenchoose.js`, `scripts/extract-listenchoose.test.js`
- Generated: `public/practice/listenchoose/questions.json`, `public/practice/listenchoose/img/*.webp`, `scripts/listenchoose-i18n-source.json`, `src/practice/listenchoose/__fixtures__/oracle.json`

**Interfaces:**
- Produces `questions.json`: `{ levels: ['easy','medium','hard'], scenes: [{ id, options: [4 строки] }], questions: [{ id, scene, level, answer, text, key, audio }] }`, где `audio` = `/practice/listenchoose/audio/<sha1(text)[:12]>.mp3`.
- Produces `oracle.json`: `{ sampling: [{ level, count, seenMode, previousScene, seed, seen, result: { queue, seen } | { throws: 'RangeError' } }], player: [{ name, duration, steps, expect: { ranges, coverage, heard } }] }`.
- Экспортирует из экстрактора: `extract({ src, write })`, `scriptBodies(html)`.

- [x] **Step 1: тест экстрактора (красный).** `extract-listenchoose.test.js` (vitest, `@vitest-environment node`): `scriptBodies` находит ровно 5 скриптов и падает на HTML без движка; `extract` на реальном прототипе даёт 13 сцен по 4 подписи, 150 заданий, по 50 на сложность, уникальные id, `answer` в 0–3, непустые `text`/`key`, `art` — по 2 на сложность; все 104 ключа картинок `<сцена>-<n>-<размер>`; каждая распознаётся как `RIFF….WEBP`; словарь UI содержит `ru`, `en`, `kk` (не `kz`) с одним набором из 65 ключей; на обрезанном источнике (без `class ListeningPlayer`) — исключение с понятным сообщением.
- [x] **Step 2: запустить — падает** (`npx vitest run scripts/extract-listenchoose.test.js`, «Cannot find module»).
- [x] **Step 3: скопировать прототип** (`cp -n`, проверить размер 3148995).
- [x] **Step 4: экстрактор.** Пять `<script>`: данные (`const SCENES`, `NEW_SCENES`, `SCENES.push`, `QUESTIONS`), медиа (`window.JTS_MEDIA=…};`), плеер (`class ListeningPlayer`), выборка (`function sampleQuestions`), IIFE (`const I={…}` + три `Object.assign(I.<язык>, …)`). Данные исполняются в `node:vm` ПРОТОТИПНЫМ кодом (`SCENES`, `QUESTIONS`, `LEVELS`); `key` берётся из QUESTIONS, а не пересчитывается. Медиа режется по маркерам `window.JTS_MEDIA=` … `};</script>` (строка на 3 МБ), парсится JSON, картинки пишутся без перезаписи одинаковых. Оракул: сетка 3 сложности × размер набора {1, 5, 10, 20, 50} × «уже было» {none, half, all} × предыдущая сцена {null, bus, art} с `mulberry32(seed)` и два случая `count` 0 и 51 (throws); трассы плеера (ниже) гоняются классом `ListeningPlayer` из прототипа в `vm` с подставным `performance.now` и фейковым audio.
- [x] **Step 5: трассы плеера** (`name` → ожидание считает прототип): `full-listen`, `seek-skip`, `seek-back-replay`, `pause-resume`, `mute-midway`, `rate-125`, `stutter-jump`, `tail-ok` (5.7 из 6), `tail-short` (5.6 из 6), `reset-after-wrong` (два `heard`).
- [x] **Step 6: запустить экстрактор** `node scripts/extract-listenchoose.js`; проверить `git status --short`: 104 webp, questions.json, i18n-source, oracle.json.
- [x] **Step 7: тест зелёный**; повторный запуск экстрактора не меняет файлы (идемпотентность: `git status` тот же).

### Task 2: Озвучка — скрипт и генерация записей

**Files:**
- Modify: `scripts/make-lesson-audio.js` (только `module.exports` — добавить `synthesizeSoniox`, `sleep`, `loadEnv`, `SONIOX_GAP_MS`)
- Create: `scripts/make-listenchoose-audio.js`, `scripts/make-listenchoose-audio.test.js`
- Generated: `public/practice/listenchoose/audio/*.mp3` (150)

**Interfaces:**
- Consumes: `questions.json` из Task 1; `sayAudioFile(text)` из `scripts/jts-self/say-audio.js`.
- Produces: `planAudio(questions, { exists(file), force, limit }) → [{ id, text, file, out }]`; CLI `node scripts/make-listenchoose-audio.js [--dry] [--limit N] [--voice V] [--speed S] [--force]`.

- [x] **Step 1: тест `planAudio`** (красный): без файлов — план на все 150 в порядке банка; файл есть — пропускается; `force` — берёт всё; `limit` режет; имена уникальны и совпадают с `question.audio` из questions.json.
- [x] **Step 2: реализация.** `--dry` печатает план без запросов; пауза `SONIOX_GAP_MS` между запросами; прогресс каждые 25; ошибка на одном тексте не должна тихо оставить дыру — скрипт падает и называет id. Ключ — `SONIOX_API_KEY` из `.env.local` (`loadEnv`).
- [x] **Step 3: `--dry`**, сверить 150 записей в плане.
- [x] **Step 4: пробный клип** `--limit 1`, проверить размер и заголовок mp3 (`ID3`/`FF FB`); после этого весь набор в фоне (~6–8 минут).
- [x] **Step 5: все 150 на диске**, суммарный размер, самый длинный клип; 3 клипа (easy/medium/hard) отдать владельцу послушать.

### Task 3: Данные и движок

**Files:** `src/practice/listenchoose/data.js`, `engine.js`; тесты `data.test.js`, `engine.test.js`.

**Interfaces (Produces):**
```js
// data.js
export const LC_BASE = '/practice/listenchoose'
export function imagePath(sceneId, index, size = 512) // `${LC_BASE}/img/${sceneId}-${index}-${size}.webp`
export function loadListenChoose(fetchImpl = fetch)    // Promise<Data>, кэш на вкладку, при сбое кэш сбрасывается
export function buildData(json)                        // { levels, scenes, questions, byId, sceneById }
export function optionsOf(data, question)               // 4 подписи фото сцены задания
// engine.js
export const LEVELS, COUNT_PRESETS = [5,10,20,30,50], MAX_COUNT = 50, DEFAULT_COUNT = 10, ATTEMPTS = 2
export function shuffled(items, random = Math.random)
export function sampleQuestions(bank, { level, count, seen = [], previousScene = null }, random = Math.random) // порт, RangeError на плохом count
export function createRun(queue)                        // { queue, index: 0, rounds: {}, complete: false }
export function runFromIds(data, ids, level, random)    // «повторить ошибки»
export function isValidRun(run, data, level)
export function roundOf(run, id, random)                // { order:[0..3 в случайном порядке], wrong:[], resolved:false, correct:false, attempts:0 }, чинит битый order
export function canAnswer(round, { heard, imagesReady }, optionIndex)
export function answerRound(round, question, optionIndex) // новый round: attempts+1, верно → resolved+correct, вторая ошибка → resolved
export function scoreOf(run)                            // { first, second, missed }
export function retryIds(run)                           // id с промахом или второй попыткой
```

- [x] **Step 1: `engine.test.js` (красный)** — оракул: все 135 случаев сетки дают тот же `queue` и `seen`, что прототип; `count` 0 и 51 бросают `RangeError`; инварианты (без повторов, длина = count, все в сложности, соседние сцены различаются пока есть выбор, при полном `seen` цикл начинается заново); правила раунда (верно с первой; ошибка+верно = attempts 2; две ошибки = resolved, не correct, `wrong` из двух; повторный клик по ошибочной и клик после resolved запрещены; нельзя, пока не `heard` или не `imagesReady`); `scoreOf`, `retryIds`, `runFromIds`, `isValidRun`, `roundOf`.
- [x] **Step 2: `data.test.js` (красный)** — `buildData`: индексы; `optionsOf` даёт 4 подписи; `imagePath`; для КАЖДОГО из 150 заданий файл записи есть на диске (`public/…/audio/`), а для КАЖДОЙ сцены все 8 картинок (4 × 2 размера) — красный тест значит «забыли прогнать озвучку/экстрактор».
- [x] **Step 3: реализация `engine.js` и `data.js`** (порт `sampleQuestions`/`shuffle`/`valid`/`round`/`score` из прототипа без «улучшений»).
- [x] **Step 4: тесты зелёные** (`npx vitest run src/practice/listenchoose`).

### Task 4: Плеер записи

**Files:** `src/practice/listenchoose/player.js`, `player.test.js`, `__fixtures__/fakeAudio.js`.

**Interfaces (Produces):**
```js
export const RATES = [0.75, 1, 1.25]
export const HEARD_TAIL = 0.32
export function addRange(ranges, a, b)     // чистая: склейка внутри 35 мс, порядок по началу
export function coverageOf(ranges)
export class ListenPlayer {
  constructor({ audio, now = () => performance.now(), onHeard = () => {}, rate = 1, volume = 0.8 })
  subscribe(fn)                            // → unsubscribe
  getSnapshot()                            // { state: 'idle'|'loading'|'ready'|'playing'|'paused'|'ended'|'error', position, duration, rate, volume } — объект меняется только на emit
  load(url); play(); pause(); stop(); replay(); seek(seconds)
  setRate(rate); setVolume(volume); resetListening()
  get ranges(); coverage(); destroy()
}
export function createListenPlayer(opts)   // new ListenPlayer({ audio: new Audio(), ...opts })
```

- [x] **Step 1: `player.test.js` (красный).** Оракул: те же 10 трасс из `oracle.json` через `fakeAudio` и подставные часы — `ranges` (до 3 знаков), `coverage`, число `onHeard` совпадают с прототипом. Юниты: `load → loadedmetadata → ready`; `error` на событие и на отклонённый `play()`; `canplay` из `loading`; повторный `load` сбрасывает диапазоны; `seek` зажимает в [0, duration]; `setRate` принимает только 0.75/1/1.25; `setVolume` зажимает 0..1 и добирает диапазон ДО смены громкости; `stop` не превращается в `paused` от запоздавшего события `pause`; `getSnapshot` возвращает тот же объект, пока ничего не изменилось; `destroy` снимает слушателей.
- [x] **Step 2: реализация** (порт media-ветки `ListeningPlayer`: `anchor/sample/addRange/coverage`, обработчики событий; ветка синтеза не переносится).
- [x] **Step 3: тесты зелёные.**

### Task 5: Прогресс, настройки и ключи синка

**Files:**
- Create: `src/practice/listenchoose/listenchooseProgress.js`, `listenchooseSettings.js` и `.test.js` к обоим
- Modify: `src/practice/practiceKeys.js`, `src/lib/practiceContract.js`, `src/practice/practiceSyncCore.js`, `src/practice/practiceSync.js`, `src/practice/practiceSync.test.js`, `tests/practice-contract.spec.js`, `tests/practice-sync-core.spec.js`

**Interfaces (Produces):**
```js
// practiceKeys.js
export const LISTENCHOOSE_KEY = 'jts_listenchoose_done'
export const LISTENCHOOSE_RUN_KEY = 'jts_listenchoose_run'
export const LISTENCHOOSE_PROGRESS_EVENT = 'listenchoose-progress'
// listenchooseProgress.js
export function readState()            // { seen: { easy: string[], medium: string[], hard: string[] } } — битый/чужой стейт → пустой
export function readSeen(level)        // string[]
export function writeSeen(level, ids) // replace одного уровня + pushModule('listenchoose', state) + событие; зеркало в памяти при ошибке хранилища
// listenchooseSettings.js
export const DEFAULT_DEVICE            // { version: 1, level: 'easy', counts: {easy:10,medium:10,hard:10}, rate: 1, volume: 0.8, runs: {} }
export function normalizeDevice(raw)   // границы прототипа: level ∈ LEVELS, count целое 1..50, rate ∈ RATES, volume 0..1
export function readDevice(); export function writeDevice(patch)
```

- [x] **Step 1: тесты** (красные): прогресс — пустой/битый/массив вместо объекта → чистый старт; `writeSeen` заменяет только свой уровень, шлёт `pushModule('listenchoose', state)` и будит событие; зеркало при `setItem` с исключением. Настройки — мусор приводится к умолчаниям; запись сливает патч. Синк: `isValidModule('listenchoose')`, `emptyState` = `{}`, `serializeForPush` отдаёт объект как есть, `applyHydratedState` кладёт `jts_listenchoose_done` и шлёт `listenchoose-progress`, `clearLocalPractice` чистит и `jts_listenchoose_done`, и `jts_listenchoose_run`.
- [x] **Step 2: реализация и правки в четырёх местах** (`practiceKeys`, `PRACTICE_MODULES`, `OBJECT_MODULES` + `applyHydratedState`, `clearLocalPractice`).
- [x] **Step 3: зелёные** — `npx vitest run src/practice`, `npx playwright test tests/practice-contract.spec.js tests/practice-sync-core.spec.js` (через обёртку).

### Task 6: Контроллер экрана

**Files:** `src/practice/listenchoose/session.js`, `session.test.js`.

**Interfaces (Produces):**
```js
export class ListenChooseSession {
  constructor({ data, player, device, progress, random = Math.random, onResolved = () => {} })
  // device: { read(): Device, write(patch) }; progress: { readSeen(level), writeSeen(level, ids) }
  subscribe(fn); getSnapshot()
  // snapshot: { level, counts, count, run, question, options, round, heard, imagesReady, transcriptOpen,
  //             complete, score, position: {index, total}, resolved, canNext, isLast, seenCount }
  setLevel(level); setCount(n); startNewSet(); retryMistakes()
  setImagesReady(ok); markHeard(); toggleTranscript()
  answer(optionIndex)              // порядок показа → индекс фото решает вид; здесь уже индекс фото
  next()                           // последнее → complete=true
  destroy()
}
// onResolved({ questionId, level, correct, attempts }) — вызывает страница: recordSkill('listening', correct && attempts === 1)
```

- [x] **Step 1: `session.test.js` (красный)** на фейковом плеере и in-memory хранилищах: старт восстанавливает валидный сохранённый набор, битый — выкидывает и рисует новый; `startNewSet` тянет `readSeen`, пишет `writeSeen` и учитывает `previousScene` прошлого набора; `answer` до `heard` игнорируется; ошибка → `heard=false` и `player.resetListening()` вызван; вторая ошибка → resolved, `onResolved` с `correct:false, attempts:2`; верный ответ → `onResolved` один раз; `next` на последнем → `complete`; `retryMistakes` собирает набор из промахов и вторых попыток; смена сложности сохраняет наборы каждой; `setCount` границы 1..50 и не трогает текущий набор; каждый шаг пишет устройство; `resolved` вопрос при возврате считается `heard`.
- [x] **Step 2: реализация.** Подписка на `player` (`onHeard` → `markHeard`); загрузка записи вопроса при смене вопроса; предзагрузка следующей записи (`new Audio()` с `preload='auto'`) и картинок (`preloadNext` прототипа).
- [x] **Step 3: зелёные.**

### Task 7: i18n

**Files:** Modify `src/i18n.jsx` (три словаря), Create `scripts/listenchoose-i18n-source.json` уже есть из Task 1.

- [x] **Step 1:** ключи `listenchoose.*` из прототипа (65) + новые: `title`, `toPractice`, `loading`, `loadError`, `chapter`, `storageDevice` («Прогресс сохраняется на этом устройстве»), `seenOf`; `practice.listenchoose.{title,heading,desc,cta,hint}`, `practice.chip.listenchoose`, `tour.practice.listenchoose.{title,text}`.
- [x] **Step 2:** английские хвосты `ru`/`kk` прототипа (`wrong`, `show`, `hide`, `next`) переведены; названия сложностей и подписи плеера остаются английскими.
- [x] **Step 3:** тест-сторож — одинаковый набор ключей `listenchoose.*` во всех трёх языках (`src/i18n.listenchoose.test.jsx`, читает `dict` из модуля).
- [x] **Step 4:** ключи вставляются генератором из scratchpad по якорям `'practice.verbs.hint'` / `'tour.practice.verbs.text'` / `'verbs.loadError'` каждого словаря (не руками), результат проверяется `node --check`-импортом и тестом-сторожем.

### Task 8: Экран и стили

**Files:** `src/screens/ListenChoosePage.jsx`, `src/screens/listenchoose/{LcPlayer,LcPictures,LcFeedback,LcResult,LcDialogs,LcIcons}.jsx`, `src/listenchoose.css`, Modify `src/app/layout.jsx`.

- [x] **Step 1: `LcIcons`** (иконки из `ICONS` прототипа) и `LcPlayer` (Play/Pause, волна, время, ползунок с предпросмотром при перетаскивании, Stop/Replay/−5s/+5s, темп, громкость/mute, строка статуса, блок ошибки «Try again»).
- [x] **Step 2: `LcPictures`** (4 кнопки в порядке `round.order`, номер-бейдж, отметка ✓/×, `aria-disabled`, кнопка увеличения, повтор загрузки картинки с `?retry=`, `srcset` 320w/512w и `sizes` прототипа; сообщает `imagesReady`), `LcFeedback` (панель разбора + текст), `LcResult` (круг, три счётчика, «Новый подход», «Повторить ошибки», разбор), `LcDialogs` (справка и увеличение на `<dialog>` + `showModal`).
- [x] **Step 3: `ListenChoosePage`** — `LearningLayout`, шапка («← В Практику», крошка, заголовок), сложность, панель набора (селект 5/10/20/30/50/своё + «Новый случайный набор»), `useSyncExternalStore` на контроллер и плеер, клавиатура (`Space`/`R`/`S`/`1–4`/`Enter`), `recordSkill` в `onResolved`, диплинк `initialTarget.difficulty`, уход с экрана — `player.destroy()` + `session.destroy()`.
- [x] **Step 4: `listenchoose.css`** — перенос стилей прототипа на `.lc-` (палитра `#874BF8`, `#6F31E8`, `#F6F4FB`, `#F3EFFA`, `#211934`, `#716A81`, `#E5DEEF`, `#EDE4FF`, `#17764E`/`#E7F5EC`, `#B43743`/`#FFF0EF`), запас 170 px под `.learn__bell` на ≥ 761 px, 2×2 картинки на телефоне, `:disabled` для всех выключаемых кнопок; импорт в `layout.jsx`.

### Task 9: Интеграция в приложение и хаб

**Files:** Modify `src/App.jsx`, `src/screens/PracticePage.jsx`.

- [x] **Step 1: `App.jsx`** — импорт, `PERSISTABLE_SCREENS`, состояние `listenChooseTarget`, диплинк `?screen=listenchoose&difficulty=…`, обе ветки `handleNav`, `case 'listenchoose'`.
- [x] **Step 2: `PracticePage.jsx`** — `ListenChooseBanner` (`#sec-listenchoose`, `.pp-listen` + `.pp-lc`, печать «150», подсказка про три сложности), чип и шаг тура сразу после «Неправильных глаголов»; короткий текст тура.
- [x] **Step 3: ручной прогон** в браузере (`preview_start web-listenchoose`): хаб → баннер → раздел; консоль без ошибок.

### Task 10: E2E, документация, проверка

**Files:** Create `tests/listenchoose.spec.js`; Modify `tests/practice-learning-tour.spec.js` (если тур считает шаги), `CLAUDE.md`.

- [x] **Step 1: `tests/listenchoose.spec.js`** (mobile + desktop, гость): запись подменяется коротким тихим mp3 через `page.route('**/practice/listenchoose/audio/*.mp3', …)` (валидный CBR-поток из нулевых кадров, собирается в тесте); сценарии из спеки («Проверка»): выбор закрыт до дослушивания; верный ответ; ошибка → «Replay» → вторая попытка; две ошибки → зелёная обводка и текст; итог и «Повторить ошибки»; смена сложности сохраняет набор; диплинк; баннер и чип в хабе; клавиатура; ошибка записи (`route.abort`) и «Try again»; раскладка телефона.
- [x] **Step 2: `CLAUDE.md`** — абзац раздела после «Неправильных глаголов».
- [x] **Step 3: полная проверка:** `npx vitest run` (свои файлы), `npx playwright test tests/listenchoose.spec.js tests/practice-*.spec.js` (обёртка `channel: 'chrome'`, `E2E_PORT=3290`), `npm run build`, `npm run lint`, сторожа CSS вручную, ручной прогон на 1280 и 390 px со сверкой со снимками прототипа.
- [x] **Step 4: финальное ревью ветки** субагентом (`caveman:cavecrew-reviewer` или `superpowers:requesting-code-review`); замечания разбирать по существу.
- [ ] **Step 5: память** — обновить `listenchoose-practice-port.md` (что готово, ловушки), отчёт владельцу; коммит и PR — только по его просьбе.

## Self-Review

- **Покрытие спеки:** материал и экстрактор — Task 1; озвучка (скрипт, флаги, генерация, ~150 запросов) — Task 2; движок, выборка, раунд — Task 3; «прослушал до конца» и оракул трасс — Task 4; прогресс/настройки/синк/`clearLocalPractice` — Task 5; контроллер, `recordSkill`, недоигранный набор — Task 6; i18n и перевод хвостов — Task 7; вид, клавиатура, доступность, отступ под колокольчик — Task 8; интеграция и хаб — Task 9; проверка, CLAUDE.md, ревью — Task 10. «Не переносим» из спеки исполнением не затрагивается.
- **Заглушек нет:** каждая задача называет файлы, интерфейсы и проверки; код пишется в файлы напрямую.
- **Согласованность имён:** `ListenPlayer`, `ListenChooseSession`, `LISTENCHOOSE_KEY`/`_RUN_KEY`/`_PROGRESS_EVENT`, `readSeen`/`writeSeen`, `answerRound`/`roundOf`/`canAnswer`, `imagePath`/`optionsOf` — одни и те же во всех задачах.
