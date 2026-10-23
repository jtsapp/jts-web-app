# Prepositions World — сайт: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** экран `?screen=prepositions` — курс предлогов «Prepositions World»: движок прототипа почти дословно
в Shadow DOM, данные и медиа с бэкенда (`GET /mobile/prepositions`), прогресс с аккаунтом, баннер во вкладке
«Письмо» «Практики».

**Architecture:** как «Числа» (`src/practice/numbers/engine.js` + `NumbersPage.jsx`): скрипт прототипа — функция
`mountPrepositions(root, cfg)`, связь с приложением только через `cfg`. Данные — как Just Listen It
(`cachedAuthGet`, статусы guest/missing/error/ready). Порт сверяется с оракулом, который снимает сам прототип
(jsdom) на урезанной копии.

**Tech Stack:** Next.js (App Router — оболочка), React 18, JS (без TS), vitest + jsdom, Playwright, sharp.

**Спека:** `docs/superpowers/specs/2026-10-22-prepositions-world-design.md`. Бэкенд: план `…-backend.md` (ручка `/mobile/prepositions`).

## Global Constraints

- Рабочее дерево: `C:/Users/nural/Desktop/jts-prepositions`, ветка `feat/prepositions-world` от `origin/develop`.
  `node_modules` — junction на основной чекаут (`cmd /c mklink /J node_modules ..\jts-web-app\node_modules`),
  если в worktree его нет; перед тестами проверить, что версии совпадают (`npm ls vitest jsdom sharp`).
- JS, не TS. Комментарии по-русски, «почему», в стиле `src/practice/numbers/*`.
- Прототип-источник (23 МБ) в git НЕ кладётся: `C:/Users/nural/Downloads/Prepositions World (11).html`
  (дальше — `$PROTO`). В git — урезанная копия `src/practice/prepositions/__fixtures__/prototype-mini.html`.
- Игра на английском (язык упражнения): строки движка не переводятся; i18n приложения — только у оболочки
  (баннер, «назад», статусы загрузки) — ru/kk/en в `src/i18n.jsx`.
- Озвучка уроков — `/api/tts` (Soniox, `playTts`), по `onFail` — голос устройства; записи практики — `playUrl`.
- Прогресс-модуль синка — `prepositions` (replace + клиентский merge).
- `vitest` из корня видит чужие worktree (память): гонять тесты путями, `npx vitest run src/practice/prepositions`.
- E2E — один воркер, порт 3100 (`E2E_PORT`), системный Chrome — как остальные спеки.
- `$SCRATCH` — scratchpad сессии (`C:/Users/nural/AppData/Local/Temp/claude/…/scratchpad`): разовые скрипты переноса
  (Task 4, 5) лежат там, в репозиторий не идут.

## Файлы

| Файл | Что |
|---|---|
| `scripts/prepositions/make-fixture.js` | урезанная копия прототипа + бандл для тестов |
| `scripts/prepositions/extract-oracle.js` | оракул: сессии вопросов, собранные самим прототипом |
| `src/practice/prepositions/__fixtures__/{prototype-mini.html,bundle.json,oracle.json}` | фикстуры |
| `src/practice/prepositions/progress.js` (+test) | прогресс: normalize, merge, store |
| `src/practice/prepositions/styles.js` (+test) | CSS прототипа для тени |
| `src/practice/prepositions/engine.js` (+test) | движок |
| `src/practice/prepositions/voice.js` (+test) | озвучка урока с запасным голосом |
| `src/practice/practiceKeys.js`, `practiceSync.js`, `src/lib/practiceContract.js` (изм.) | ключи и модуль синка |
| `src/api.js` (изм.) | `getPrepositions` |
| `src/screens/prepositions/usePrepositionsData.js` | статусы загрузки |
| `src/screens/PrepositionsPage.jsx` | экран |
| `src/App.jsx`, `src/lib/navStack.js`, `src/screens/practice/practiceTabs.js`, `src/screens/PracticePage.jsx`, `src/i18n.jsx`, `src/styles.css`, `src/theme-dark.generated.css` (изм.) | маршрут, «назад», баннер |
| `tests/prepositions.spec.js` | e2e |
| `CLAUDE.md` (изм.) | абзац раздела |

---

### Task 1: Урезанная копия прототипа и бандл для тестов

**Files:**
- Create: `scripts/prepositions/make-fixture.js`
- Create (генерируется): `src/practice/prepositions/__fixtures__/prototype-mini.html`, `bundle.json`

**Interfaces:**
- Produces: `prototype-mini.html` — валидный прототип: стили без `@font-face`, блоки `assets/course/aud/pics/pcat`,
  скрипт движка байт в байт. Категория `place`: первые два урока + все `integrated`. Картинки — все ключи,
  каждая webp 8×8 (размеры `assets.size` — прежние); записи — все ключи, один 8-байтный mp3.
  `bundle.json` — та же форма, что отдаёт бэкенд: `{release:1, uploadedAt, course, pics, pcat, pdef, assets:{img,size,slots}, aud}`,
  медиа — `/__prep-media/<ключ>.webp|mp3`.

- [ ] **Step 1: Скрипт**

```js
// Урезанная копия прототипа «Prepositions World» для тестов: вход оракула
// (scripts/prepositions/extract-oracle.js), бандл для vitest и e2e, файл для
// ручной проверки заливки в админке (движок тот же байт в байт — админка
// покажет «движок совпадает»).
//
// Сам прототип (23 МБ, почти всё — base64 картинок и записей) в git не кладём.
// Копия: категория place — два первых урока и все её общие вопросы; картинки
// — все ключи, но каждая 8×8 (движку нужны ключи и размеры из assets.size, а не
// пиксели); записи — все ключи одним 8-байтным mp3 (сигнатуру проверяет бэкенд,
// звук в тестах не играет).
//
// Запуск: node scripts/prepositions/make-fixture.js --html "<путь к прототипу>"

const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')

const OUT = path.join(__dirname, '..', '..', 'src', 'practice', 'prepositions', '__fixtures__')
const KEEP_CAT = 'place'
const KEEP_LESSONS = 2
const MP3 = Buffer.from([0xff, 0xfb, 0x90, 0xc0, 0, 0, 0, 0])

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : null
}

function block(html, id) {
  const open = html.indexOf(`<script type="application/json" id="${id}">`)
  if (open < 0) throw new Error(`нет блока ${id}`)
  const start = html.indexOf('>', open) + 1
  const end = html.indexOf('</script>', start)
  return JSON.parse(html.slice(start, end))
}

function engineScript(html) {
  // последний <script> без type — движок
  const open = html.lastIndexOf('<script>')
  const end = html.indexOf('</script>', open)
  return html.slice(open + '<script>'.length, end)
}

function styleBlock(html) {
  const open = html.indexOf('<style>')
  const end = html.indexOf('</style>', open)
  return html
    .slice(open + '<style>'.length, end)
    .split('\n')
    .filter((l) => !l.startsWith('@font-face'))
    .join('\n')
}

async function main() {
  const src = arg('--html')
  if (!src) throw new Error('--html <путь к прототипу Prepositions World>')
  const html = fs.readFileSync(src, 'utf8')
  const course = block(html, 'course')
  const pics = block(html, 'pics')
  const pcat = block(html, 'pcat')
  const assets = block(html, 'assets')
  const aud = block(html, 'aud')

  const cat = course.cats.find((c) => c.id === KEEP_CAT)
  if (!cat) throw new Error(`нет категории ${KEEP_CAT}`)
  cat.lessons = cat.lessons.slice(0, KEEP_LESSONS)
  const mini = { cats: [cat] }
  const keepPic = (k) => k.startsWith(`${KEEP_CAT}/int/`) || cat.lessons.some((l) => k.startsWith(`${KEEP_CAT}/${l.id}/`))
  const miniPics = Object.fromEntries(Object.entries(pics).filter(([k]) => keepPic(k)))

  const tiny = await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 140, g: 110, b: 230, alpha: 1 } } })
    .webp({ quality: 50 })
    .toBuffer()
  const tinyUri = 'data:image/webp;base64,' + tiny.toString('base64')
  const mp3Uri = 'data:audio/mpeg;base64,' + MP3.toString('base64')
  const img = Object.fromEntries(Object.keys(assets.img).map((k) => [k, tinyUri]))
  const miniAssets = { img, size: assets.size, slots: assets.slots }
  const miniAud = Object.fromEntries(Object.keys(aud).map((k) => [k, mp3Uri]))

  const json = (id, data) => `<script type="application/json" id="${id}">${JSON.stringify(data)}</script>`
  const out = [
    '<!doctype html>',
    '<html lang="en"><head><meta charset="utf-8"><title>Prepositions World (fixture)</title>',
    `<style>${styleBlock(html)}</style></head><body><div id="app"></div>`,
    json('assets', miniAssets),
    json('course', mini),
    json('aud', miniAud),
    json('pics', miniPics),
    json('pcat', pcat),
    `<script>${engineScript(html)}</script></body></html>`,
    '',
  ].join('\n')
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'prototype-mini.html'), out)

  // PDEF — литерал движка; в бандл бэкенд кладёт его объектом. Здесь — тем же
  // путём, что и прототип его видит: исполнить объявление.
  const pdefSrc = engineScript(html).match(/const PDEF=(\{.*?\});\n/s)
  if (!pdefSrc) throw new Error('нет const PDEF')
  const pdef = JSON.parse(pdefSrc[1])
  const media = (map, ext) => Object.fromEntries(Object.keys(map).map((k) => [k, `/__prep-media/${k}.${ext}`]))
  const bundle = {
    release: 1,
    uploadedAt: '2026-10-22T00:00:00',
    course: mini,
    pics: miniPics,
    pcat,
    pdef,
    assets: { img: media(assets.img, 'webp'), size: assets.size, slots: assets.slots },
    aud: media(aud, 'mp3'),
  }
  fs.writeFileSync(path.join(OUT, 'bundle.json'), JSON.stringify(bundle))
  const kb = (f) => Math.round(fs.statSync(path.join(OUT, f)).size / 1024)
  console.log(`prototype-mini.html ${kb('prototype-mini.html')} КБ, bundle.json ${kb('bundle.json')} КБ; уроков ${cat.lessons.length}, общих ${cat.integrated.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

`PDEF` в прототипе — JSON в одну строку (`const PDEF={…};` на строке 259); регэксп ленивый до `};\n` — если
`JSON.parse` упадёт, значит, формат строки поменялся: вырезать литерал, считая скобки (как `literalEnd` бэкенда).

- [ ] **Step 2: Прогнать**

Run: `node scripts/prepositions/make-fixture.js --html "C:/Users/nural/Downloads/Prepositions World (11).html"`
Expected: `prototype-mini.html ~250 КБ, bundle.json ~60 КБ; уроков 2, общих 7`.

- [ ] **Step 3: Глазами** — открыть фикстуру через `python -m http.server` в папке `__fixtures__` (file:// встроенный
  браузер не открывает) — главная курса рисуется, урок открывается, картинки — фиолетовые квадраты на своих местах.

- [ ] **Step 4: Commit**

```bash
git add scripts/prepositions/make-fixture.js src/practice/prepositions/__fixtures__/prototype-mini.html src/practice/prepositions/__fixtures__/bundle.json
git commit -m "test(prepositions): урезанная копия прототипа и бандл для тестов

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Оракул прототипа

**Files:**
- Create: `scripts/prepositions/extract-oracle.js`
- Create (генерируется): `src/practice/prepositions/__fixtures__/oracle.json`

**Interfaces:**
- Consumes: `prototype-mini.html` (Task 1).
- Produces: `oracle.json` = `{ seed: 42, sessions: { "<hash>": Shape[] } }`, где hash — `#/practice/lesson/<id>`
  для каждого урока, `#/practice/cat/place`, `#/practice/final`;
  `Shape = {id, type, stem, text, lines, opts, ans, gaps: [{opts, ans}] | null, lesson, cat}` (нет поля — `null`).
  Генератор: `mulberry32(seed)`; сид сбрасывается перед КАЖДОЙ сессией.

- [ ] **Step 1: Скрипт**

```js
// Оракул «Prepositions World»: какие наборы вопросов собирает САМ прототип —
// порядок, варианты, ответы, scene-вопросы из геометрии сцен. Порт
// (src/practice/prepositions/engine.js) сверяется с этим файлом
// (engine.test.js): красный тест значит, что порт разъехался с исходником.
//
// Прототип исполняется в jsdom как есть (урезанная копия, Task 1), случайность
// — mulberry32 с одним сидом, сбрасываемым перед каждой сессией: shuffle
// прототипа и подбор неверных вариантов зависят от Math.random. Сессию
// открываем его же роутером (history.replaceState без hashchange — иначе
// route() сработал бы дважды и съел лишние случайные числа).
//
// Запуск: node scripts/prepositions/extract-oracle.js

const fs = require('node:fs')
const path = require('node:path')
const { JSDOM, VirtualConsole } = require('jsdom')

const DIR = path.join(__dirname, '..', '..', 'src', 'practice', 'prepositions', '__fixtures__')
const SEED = 42

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const or = (v) => (v === undefined ? null : v)
function shape(q) {
  return {
    id: or(q._id),
    type: q.type,
    stem: or(q.stem),
    text: or(q.text),
    lines: or(q.lines),
    opts: or(q.opts),
    ans: or(q.ans),
    gaps: q.gaps ? q.gaps.map((g) => ({ opts: g.opts, ans: g.ans })) : null,
    lesson: or(q.lesson),
    cat: or(q.cat),
  }
}

const html = fs.readFileSync(path.join(DIR, 'prototype-mini.html'), 'utf8')
const vc = new VirtualConsole() // jsdom ругается на scrollTo — молчим
const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(window) {
    let rng = mulberry32(SEED)
    window.Math.random = () => rng()
    window.__seed = (s) => {
      rng = mulberry32(s)
    }
  },
})
const w = dom.window
const P = w.__PREP
if (!P) throw new Error('прототип не поднялся: нет window.__PREP')
for (const l of P.LES) P.MEM.done[l.id] = 1

const hashes = [
  ...P.LES.map((l) => `#/practice/lesson/${l.id}`),
  ...P.CATS.map((c) => `#/practice/cat/${c.id}`),
  '#/practice/final',
]
const sessions = {}
for (const h of hashes) {
  w.__seed(SEED)
  w.history.replaceState(null, '', h)
  P.route()
  if (!P.S) throw new Error(`сессия не собралась: ${h}`)
  sessions[h] = P.S.qs.map(shape)
}
fs.writeFileSync(path.join(DIR, 'oracle.json'), JSON.stringify({ seed: SEED, sessions }, null, 1))
console.log(Object.entries(sessions).map(([h, qs]) => `${h}: ${qs.length}`).join('\n'))
```

- [ ] **Step 2: Прогнать**

Run: `node scripts/prepositions/extract-oracle.js`
Expected: список сессий с числом вопросов (уроки по 12–14, категория ~11, финал ~11); файл `oracle.json`.

- [ ] **Step 3: Проверка детерминизма** — прогнать второй раз, `git diff --stat src/practice/prepositions/__fixtures__/oracle.json`
  после первого коммита пуст.

- [ ] **Step 4: Commit**

```bash
git add scripts/prepositions/extract-oracle.js src/practice/prepositions/__fixtures__/oracle.json
git commit -m "test(prepositions): оракул наборов вопросов из самого прототипа

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Прогресс и модуль синка

**Files:**
- Create: `src/practice/prepositions/progress.js`, `progress.test.js`
- Modify: `src/practice/practiceKeys.js` (ключи), `src/practice/practiceSync.js` (`clearLocalPractice`),
  `src/lib/practiceContract.js` (`PRACTICE_MODULES` + комментарий)

**Interfaces:**
- Produces:
  ```js
  // practiceKeys.js
  export const PREPOSITIONS_KEY = 'jts_prepositions_v4'
  export const PREPOSITIONS_LANG_KEY = 'jts_prepositions_lang'
  export const PREPOSITIONS_PROGRESS_EVENT = 'prepositions-progress'
  // progress.js
  export function normalize(raw): {done: {[lessonId]: 1}, score: {[key]: {best: 0..1, stars: 0..3}}}
  export function mergePrepositions(a, b)
  export function readPrepositions()   // глубокая копия — движок её меняет
  export function writePrepositions(state)
  ```
  Ключ `jts_prepositions_v4` — тот же, что у прототипа: открывавшим прототип с этого же сайта ничего не теряется.

- [ ] **Step 1: Падающий тест**

```js
import { describe, expect, it } from 'vitest'
import { mergePrepositions, normalize } from './progress.js'

describe('прогресс Prepositions World', () => {
  it('normalize берёт только известную форму', () => {
    expect(normalize(null)).toEqual({ done: {}, score: {} })
    expect(normalize({ done: { 'place-in-on-at': 1, '': 1, x: 0 }, score: { 'L:a': { best: 2, stars: 9 }, 'Q:z': { best: 1, stars: 3 }, F: 'x' } }))
      .toEqual({ done: { 'place-in-on-at': 1 }, score: { 'L:a': { best: 1, stars: 3 } } })
  })

  it('merge: прочитанное объединяется, результат — лучший', () => {
    const a = { done: { l1: 1 }, score: { 'L:l1': { best: 0.5, stars: 1 }, F: { best: 0.95, stars: 3 } } }
    const b = { done: { l2: 1 }, score: { 'L:l1': { best: 0.8, stars: 2 }, 'C:place': { best: 0.7, stars: 2 } } }
    expect(mergePrepositions(a, b)).toEqual({
      done: { l1: 1, l2: 1 },
      score: { 'L:l1': { best: 0.8, stars: 2 }, F: { best: 0.95, stars: 3 }, 'C:place': { best: 0.7, stars: 2 } },
    })
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `npx vitest run src/practice/prepositions/progress.test.js`
Expected: FAIL — модуля нет.

- [ ] **Step 3: Ключи** — в `practiceKeys.js` после ключей Just Listen It:

```js
// Прогресс Prepositions World: { done: { <id урока>: 1 }, score: { "L:<урок>" | "C:<категория>" | "F":
// { best: доля 0..1, stars: 0..3 } } } — форма и ключ прототипа (jts_prepositions_v4). Replace со сведением
// merge (prepositions/progress.js): прочитанный урок не «распрочитывается».
export const PREPOSITIONS_KEY = 'jts_prepositions_v4'
// Язык перевода курса (en | kk | ru) — настройка устройства, не синкается, но чистится вместе с прогрессом.
export const PREPOSITIONS_LANG_KEY = 'jts_prepositions_lang'
```

и рядом с остальными событиями: `export const PREPOSITIONS_PROGRESS_EVENT = 'prepositions-progress'`.

- [ ] **Step 4: `progress.js`**

```js
'use client'

// Прогресс Prepositions World: какие уроки прочитаны (открывают их практику) и
// лучший результат каждого набора (урок, категория, финал). Форма и ключ — как
// у прототипа, только без его localStorage.
//
// Хранение — общее хранилище «Практики» (память + черновик + сервер, replace,
// см. progressStore.js) со сведением merge: урок, прочитанный на телефоне, не
// «распрочитывается» черновиком ноутбука, лучший результат берётся с любого
// устройства. Движок читает перед каждым экраном (readPrepositions — копия:
// движок её меняет) и пишет целиком.
//
// Домашней работой раздел не отчитывается: area 'prepositions' бэкенду неизвестна.

import { PREPOSITIONS_KEY as KEY, PREPOSITIONS_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore } from '../progressStore.js'

const SCORE_KEY = /^(L:.+|C:.+|F)$/
const emptyState = () => ({ done: {}, score: {} })
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
const num = (x, lo, hi) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo)

export function normalize(raw) {
  const out = emptyState()
  if (!isObj(raw)) return out
  if (isObj(raw.done)) for (const [id, v] of Object.entries(raw.done)) if (id && id.length <= 120 && v) out.done[id] = 1
  if (isObj(raw.score)) {
    for (const [k, s] of Object.entries(raw.score)) {
      if (SCORE_KEY.test(k) && k.length <= 130 && isObj(s)) out.score[k] = { best: num(s.best, 0, 1), stars: Math.round(num(s.stars, 0, 3)) }
    }
  }
  return out
}

/** Сведение двух копий: прочитанное где угодно — прочитано; доля и звёзды — максимум. */
export function mergePrepositions(a, b) {
  a = normalize(a)
  b = normalize(b)
  const out = { done: { ...a.done, ...b.done }, score: { ...a.score } }
  for (const [k, s] of Object.entries(b.score)) {
    const x = out.score[k]
    out.score[k] = x ? { best: Math.max(x.best, s.best), stars: Math.max(x.stars, s.stars) } : s
  }
  return out
}

const store = createProgressStore({
  module: 'prepositions',
  key: KEY,
  event: EVENT,
  empty: emptyState,
  normalize,
  merge: (server, local) => mergePrepositions(server, local),
})

export function readPrepositions() {
  return normalize(JSON.parse(JSON.stringify(store.read())))
}

export function writePrepositions(state) {
  store.write(normalize(state))
}
```

- [ ] **Step 5: Модуль синка и очистка**

`src/lib/practiceContract.js` — в комментарий над `PRACTICE_MODULES` (после абзаца про `listen`):

```js
// 'prepositions' — стейт-объект Prepositions World {done, score} (прочитанные уроки и лучшие результаты
// наборов). Replace; клиент сводит с серверным (prepositions/progress.js merge). Area 'prepositions' бэкенду
// неизвестна — в домашнюю работу раздел не отчитывается.
```

и `'prepositions',` в массив после `'listen',`.

`src/practice/practiceSync.js` — в импорт ключей добавить `PREPOSITIONS_KEY, PREPOSITIONS_LANG_KEY`, в массив
`clearLocalPractice` после `LISTEN_OWN_KEY`: `PREPOSITIONS_KEY, PREPOSITIONS_LANG_KEY,`.

Проверить, нет ли теста-перечня модулей, который надо дополнить: `grep -rn "'listen'" src/lib/*.test.js src/practice/*.test.js`
— где перечислены все модули, добавить `'prepositions'` тем же образом.

- [ ] **Step 6: Тесты зелёные**

Run: `npx vitest run src/practice/prepositions/progress.test.js src/lib/practiceContract.test.js src/practice/practiceSync.test.js`
Expected: PASS (несуществующий файл vitest просто пропустит).

- [ ] **Step 7: Commit**

```bash
git add src/practice/prepositions/progress.js src/practice/prepositions/progress.test.js src/practice/practiceKeys.js src/practice/practiceSync.js src/lib/practiceContract.js
git commit -m "feat(prepositions): прогресс курса с аккаунтом (модуль синка prepositions)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Стили прототипа для Shadow DOM

**Files:**
- Create: `src/practice/prepositions/styles.js`, `styles.test.js`

**Interfaces:**
- Produces: `export const PREPOSITIONS_CSS` — CSS прототипа, где `:root` → `:host`, `body{` → `.pw{`, шрифт —
  `--sans: var(--pw-font, inherit)` (`--pw-font` ставит экран из вычисленного шрифта страницы), `--serif: var(--sans)`.

- [ ] **Step 1: Сгенерировать файл один раз** — разовый скрипт в scratchpad (в репозиторий не идёт: дальше
  `styles.js` правится руками вместе с прототипом). `$SCRATCH/port-styles.js`:

```js
const fs = require('node:fs')
const [, , fixture, out] = process.argv
const h = fs.readFileSync(fixture, 'utf8')
let css = h.slice(h.indexOf('<style>') + 7, h.indexOf('</style>'))
css = css.replace(/:root\{/g, ':host{').replace(/(^|[}\s])body\{/g, '$1.pw{')
css = css.replace(/--sans:[^;]*;/g, '--sans:var(--pw-font,inherit);')
// в шаблонную строку JS: обратный слэш, обратная кавычка и ${ — экранировать
css = css.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
const head = [
  '// CSS Prepositions World для Shadow DOM — перенесён из прототипа. Отличия:',
  '// :root → :host (переменные видны внутри тени), body → .pw (корень раздела),',
  '// шрифт — сайта: --sans берёт --pw-font, который экран ставит из вычисленного',
  '// шрифта страницы (Manrope, на телефоне PT Root UI, в казахском — Inter).',
  '// Golos Text прототипа не переносится: свой шрифт выбил бы раздел из',
  '// приложения. Правки оформления — здесь и в прототипе одновременно.',
  '',
  '',
].join('\n')
fs.writeFileSync(out, head + 'export const PREPOSITIONS_CSS = `' + css + '`\n')
```

Run: `node "$SCRATCH/port-styles.js" src/practice/prepositions/__fixtures__/prototype-mini.html src/practice/prepositions/styles.js`

Открыть `styles.js`, убедиться: начинается с `:host{--bg:…`, в `.pw{margin:0;background:var(--bg);…` нет
`'Golos Text'`/`'PT Root UI'` в `--sans` (замена идёт по всем объявлениям `--sans`, включая второй `:host{`).

- [ ] **Step 2: Тест**

```js
import { describe, expect, it } from 'vitest'
import { PREPOSITIONS_CSS } from './styles.js'

// Раздел на шрифте сайта: --sans приходит от экрана (--pw-font). Своя гарнитура
// прототипа (Golos Text, PT Root UI в стеке) вернула бы раздел на чужой шрифт.
describe('PREPOSITIONS_CSS', () => {
  it('без :root и body — тень их не видит', () => {
    expect(PREPOSITIONS_CSS).not.toMatch(/:root\s*\{/)
    expect(PREPOSITIONS_CSS).not.toMatch(/(^|[}\s])body\s*\{/)
    expect(PREPOSITIONS_CSS).toMatch(/:host\{/)
    expect(PREPOSITIONS_CSS).toMatch(/\.pw\{margin:0;/)
  })

  it('шрифт — сайта', () => {
    expect(PREPOSITIONS_CSS).toContain('--sans:var(--pw-font,inherit)')
    expect(PREPOSITIONS_CSS).not.toMatch(/Golos Text|PT Root UI|@font-face/)
  })
})
```

- [ ] **Step 3: Запустить**

Run: `npx vitest run src/practice/prepositions/styles.test.js`
Expected: PASS. Упало на `PT Root UI` или `Golos` вне `--sans` (например, `font-family:'Golos Text'` у отдельного
правила) — заменить на `var(--sans)` вручную.

- [ ] **Step 4: Commit**

```bash
git add src/practice/prepositions/styles.js src/practice/prepositions/styles.test.js
git commit -m "feat(prepositions): стили прототипа для Shadow DOM на шрифте сайта

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Движок

**Files:**
- Create: `src/practice/prepositions/engine.js`
- Test: `src/practice/prepositions/engine.test.js`

**Interfaces:**
- Consumes: `bundle.json`, `oracle.json` (Task 1–2).
- Produces:
  ```js
  /**
   * @param {HTMLElement} root  корень раздела внутри Shadow DOM (в нём ДОЛЖЕН быть <div id="app">)
   * @param {{ bundle, lang?: 'en'|'kk'|'ru', langKey?: string|null,
   *   progress: { read: () => object, write: (state) => void },
   *   speak: (text) => void, playUrl: (url, {onEnd, onFail}) => void, stopAudio: () => void,
   *   onAnswer?: (ok: boolean) => void }} cfg
   * @returns {{ go(hash: string): void, snapshot(): {hash: string, session: object|null}, destroy(): void }}
   */
  export function mountPrepositions(root, cfg)
  ```

- [ ] **Step 1: Падающий тест (оракул + сторожа)**

```js
// @vitest-environment jsdom
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountPrepositions } from './engine.js'

const DIR = path.join(__dirname, '__fixtures__')
const bundle = JSON.parse(fs.readFileSync(path.join(DIR, 'bundle.json'), 'utf8'))
const oracle = JSON.parse(fs.readFileSync(path.join(DIR, 'oracle.json'), 'utf8'))
const source = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8')

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const or = (v) => (v === undefined ? null : v)
const shape = (q) => ({
  id: or(q._id), type: q.type, stem: or(q.stem), text: or(q.text), lines: or(q.lines), opts: or(q.opts),
  ans: or(q.ans), gaps: q.gaps ? q.gaps.map((g) => ({ opts: g.opts, ans: g.ans })) : null,
  lesson: or(q.lesson), cat: or(q.cat),
})

const allDone = () => ({ done: Object.fromEntries(bundle.course.cats.flatMap((c) => c.lessons.map((l) => [l.id, 1]))), score: {} })

let rng
let api
let host
beforeEach(() => {
  rng = mulberry32(oracle.seed)
  vi.spyOn(Math, 'random').mockImplementation(() => rng())
  window.scrollTo = () => {}
  host = document.createElement('div')
  document.body.append(host)
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = '<div class="pw"><div id="app"></div></div>'
  let state = allDone()
  api = mountPrepositions(shadow.querySelector('.pw'), {
    bundle,
    lang: 'ru',
    progress: { read: () => JSON.parse(JSON.stringify(state)), write: (s) => { state = s } },
    speak: () => {},
    playUrl: () => {},
    stopAudio: () => {},
  })
})
afterEach(() => {
  api?.destroy()
  host?.remove()
  vi.restoreAllMocks()
})

describe('Prepositions World: порт = прототип', () => {
  for (const [hash, expected] of Object.entries(oracle.sessions)) {
    it(`набор ${hash}`, () => {
      rng = mulberry32(oracle.seed)
      api.go(hash)
      const got = api.snapshot().session.qs.map(shape)
      // Отступление порта (спека, баг 4): у общих вопросов категории урока нет —
      // прототип приписывал их последнему уроку и советовал повторить не тот урок.
      const want = expected.map((q) => (q.id && q.id.includes('/int/') ? { ...q, lesson: null } : q))
      expect(got).toEqual(want)
    })
  }
})

describe('Prepositions World: связь с приложением', () => {
  it('главная курса рисуется в корне, картинки — ссылками бандла', () => {
    const root = host.shadowRoot.querySelector('.pw')
    expect(root.querySelector('.hero')).not.toBeNull()
    expect(root.innerHTML).toContain('/__prep-media/')
    expect(root.innerHTML).not.toContain('href="#a-')
  })

  it('ссылки #/… ведут роутер движка, адрес страницы не меняется', () => {
    const before = window.location.href
    const link = host.shadowRoot.querySelector('a[href^="#/learn/"]')
    link.click()
    expect(api.snapshot().hash).toBe(link.getAttribute('href'))
    expect(window.location.href).toBe(before)
    expect(host.shadowRoot.querySelector('.lesson')).not.toBeNull()
  })

  it('исходник не трогает document, location и чужие ключи хранилища', () => {
    expect(source).not.toMatch(/\bdocument\./)
    expect(source).not.toMatch(/\blocation\./)
    expect(source).not.toMatch(/href="#a-/)
    expect(source).not.toMatch(/speechSynthesis/)
    for (const m of source.matchAll(/localStorage\.(?:get|set)Item\(([^,)]+)/g)) expect(m[1].trim()).toBe('LKEY')
  })

  it('destroy снимает разметку и не роняет отложенные шаги', () => {
    api.destroy()
    expect(host.shadowRoot.querySelector('.pw').innerHTML).toBe('')
    api = null
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `npx vitest run src/practice/prepositions/engine.test.js`
Expected: FAIL — `engine.js` нет.

- [ ] **Step 3: Скелет — скрипт прототипа внутрь функции** — разовый скрипт `$SCRATCH/port-engine.js`
  (в репозиторий не идёт: дальше `engine.js` правится руками):

```js
const fs = require('node:fs')
const [, , fixture, headFile, out] = process.argv
const h = fs.readFileSync(fixture, 'utf8')
const o = h.lastIndexOf('<script>')
const body = h.slice(o + '<script>'.length, h.indexOf('</script>', o))
fs.writeFileSync(out, fs.readFileSync(headFile, 'utf8') + body + '\n}\n')
```

`$SCRATCH/engine-head.js` (шапка; слова `document.`, `location.`, `href="#a-` в комментариях не писать — их ловит
сторож в `engine.test.js`):

```js
'use client'

// Prepositions World — движок курса предлогов, перенесённый из прототипа
// методиста почти дословно (как «Числа» и SpeakSpin): главная с категориями,
// уроки экранами (правила, схемы, сцены), практика с картинками-сценами,
// итоги со звёздами. Экран PrepositionsPage монтирует его в Shadow DOM: классы
// прототипа (.hero, .btn, .top, .card) совпадают с глобальными классами сайта.
//
// От прототипа отличается связь с приложением и пять починок (спека, «Баги
// прототипа»):
// - данные — cfg.bundle с бэкенда (/mobile/prepositions), картинки и записи —
//   ссылками MinIO: каждая картинка — <image href=URL> на месте, а не ссылка на
//   символ из общего списка (13 МБ base64 в DOM прототипа браузер больше не
//   держит и грузит только видимое);
// - роутер — своя переменная HASH вместо адреса страницы, клики по <a href="#/…">
//   перехватываются в корне: адрес приложения не трогаем;
// - прогресс — cfg.progress (общее хранилище «Практики», progress.js):
//   читается перед каждым экраном и перед записью итога;
// - озвучка уроков — cfg.speak (Soniox через /api/tts, запасной — голос
//   устройства), записи практики — cfg.playUrl (один <audio> приложения: iOS);
// - шапка без логотипа и подвала — у экрана своя шапка приложения;
// - слушатели — через AbortController, таймеры — через later(): destroy()
//   снимает всё.
// Правило переноса: правка поведения — здесь и в прототипе одновременно, иначе
// следующая заливка прототипа предупредит «движок отличается» уже ложно.

/**
 * @param {HTMLElement} root  корень раздела в Shadow DOM, внутри — <div id="app">
 * @param {object} cfg  см. docs/superpowers/plans/2026-10-22-prepositions-world-web.md, Task 5
 */
export function mountPrepositions(root, cfg) {
const { bundle, lang = 'en', langKey = null, progress, speak: sayLesson, playUrl, stopAudio, onAnswer = () => {} } = cfg
const ac = new AbortController()
const on = (target, type, fn) => target.addEventListener(type, fn, { signal: ac.signal })
let dead = false
const timers = new Set()
const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn() }, ms); timers.add(id); return id }
let HASH = '#/'
function go(h) { HASH = h; route(); return h }
```

Run: `node "$SCRATCH/port-engine.js" src/practice/prepositions/__fixtures__/prototype-mini.html "$SCRATCH/engine-head.js" src/practice/prepositions/engine.js`

- [ ] **Step 4: Правки связи с приложением** — каждая — точная замена в `engine.js` (Edit; строки прототипа
  указаны по `prep.txt` для ориентира):

1. LOGO (стр. 255): удалить строку `const LOGO='<svg …</svg>';` целиком — логотип больше нигде не нужен после п. 13.
2. PDEF (стр. 259): `const PDEF={…};` (одна строка) → `const PDEF = bundle.pdef;`
3. Assets (стр. 262):
   `const ASSET = JSON.parse(document.getElementById('assets').textContent); // {img,size,slots}`
   → `const ASSET = JSON.parse(JSON.stringify(bundle.assets)); // {img,size,slots}; копия: ниже движок дописывает SLOTS`
4. globalDefs (стр. 362–366): убрать цикл символов — оставить только градиент и маркер схем:
   ```js
   function globalDefs(){
     // Символов картинок больше нет: каждая рисуется <image href=URL> на месте (см. шапку файла).
     return '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><linearGradient id="dgBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f1ff"/><stop offset="1" stop-color="#e3f1ff"/></linearGradient><marker id="dgAh" viewBox="0 0 12 12" refX="8" refY="6" markerWidth="4" markerHeight="4" orient="auto"><path d="M1 1 L11 6 L1 11Z" fill="#5a2fc8"/></marker></defs></svg>';
   }
   ```
5. Восемь `<use href="#a-…">` → `<image preserveAspectRatio="none" href="${ASSET.img[…]}">` (остальные атрибуты
   те же; символ прототипа был `preserveAspectRatio="none"` с viewBox по размеру картинки — то же растяжение):
   - `<use href="#a-${it.key}"` (стр. 371 и 549, оба) → `<image preserveAspectRatio="none" href="${ASSET.img[it.key]}"`
   - `<use href="#a-${bg}"` (395) → `<image preserveAspectRatio="none" href="${ASSET.img[bg]}"`
   - `<use href="#a-p_${sp}"` (520) → `<image preserveAspectRatio="none" href="${ASSET.img['p_'+sp]}"`
   - `<use href="#a-p_${p}"` (525) → `<image preserveAspectRatio="none" href="${ASSET.img['p_'+p]}"`
   - `<use href="#a-${bgk}"` (544) → `<image preserveAspectRatio="none" href="${ASSET.img[bgk]}"`
   - `<use href="#a-${k}"` (669 и 741, оба) → `<image preserveAspectRatio="none" href="${ASSET.img[k]}"`
   Проверка: `grep -c 'href="#a-' src/practice/prepositions/engine.js` → `0`.
6. Pics (стр. 405): `const PICS=JSON.parse(document.getElementById('pics').textContent), PCAT=JSON.parse(document.getElementById('pcat').textContent);`
   → `const PICS=bundle.pics, PCAT=bundle.pcat;`
7. `$`/`$$` (стр. 713): `(r||document)` → `(r||root)` в обоих.
8. Course (стр. 714): `const COURSE=JSON.parse(document.getElementById('course').textContent);`
   → `const COURSE=JSON.parse(JSON.stringify(bundle.course)); // копия: движок вешает на уроки ссылки l.cat`
9. Хранилище (стр. 718–721):
   ```js
   const KEY='jts_prepositions_v4', LKEY='jtsPrepLang';
   let MEM={done:{},score:{}}; try{ … }catch(e){}
   const save=()=>{ try{localStorage.setItem(KEY,JSON.stringify(MEM));}catch(e){} };
   let LANG=(()=>{ try{ const v=localStorage.getItem(LKEY); return v==='kk'||v==='ru'?v:'en'; }catch(e){ return 'en'; } })();
   ```
   →
   ```js
   const LKEY=langKey;
   // Прогресс — общий с аккаунтом (progress.js); читается перед каждым экраном (route) и перед записью итога.
   let MEM=progress.read();
   const save=()=>progress.write(MEM);
   // Явный выбор на устройстве сильнее языка интерфейса: перевод — подсказка, ученик мог её выключить.
   let LANG=(()=>{ try{ const v=LKEY&&localStorage.getItem(LKEY); if(v==='kk'||v==='ru'||v==='en') return v; }catch(e){} return lang==='kk'||lang==='ru'?lang:'en'; })();
   ```
10. Озвучка урока (стр. 733–734):
    `function speak(t){ try{ const ss=window.speechSynthesis; … }catch(e){} }` → `function speak(t){ sayLesson(t); }`
    `const canSpeak=()=>{ try{ return !!(window.speechSynthesis&&window.SpeechSynthesisUtterance); }catch(e){ return false; } };`
    → `const canSpeak=()=>true; // Soniox есть всегда, запасной голос — внутри cfg.speak`
11. injectArt (стр. 740): `css+=\`.art-${k}{background-image:url(${ASSET.img[key]})}\`; } document.head.insertAdjacentHTML('beforeend',\`<style>${css}</style>\`);`
    → `css+=\`.art-${k}{background-image:url("${ASSET.img[key]}")}\`; } root.insertAdjacentHTML('afterbegin',\`<style>${css}</style>\`);`
12. Язык (стр. 759 и 901): `try{localStorage.setItem(LKEY,LANG);}catch(e){}` → `try{ if(LKEY) localStorage.setItem(LKEY,LANG); }catch(e){}` (оба места).
13. shell (стр. 747–752) →
    ```js
    function shell(tab,inner,cls){
      // Без логотипа и подвала: шапка и бренд — у приложения.
      $('#app').innerHTML=`<header class="top"><nav class="stages" aria-label="Sections"><a href="#/" class="${tab==='learn'?'on':''}" ${tab==='learn'?'aria-current="page"':''}><span class="num">1</span>Learn</a><a href="#/practice" class="${tab==='practice'?'on':''}" ${tab==='practice'?'aria-current="page"':''}><span class="num">2</span>Practice</a></nav></header>
       <main id="main" tabindex="-1" class="${cls||''}">${inner}</main>`;
    }
    ```
14. Урок «Далее» (стр. 812): `location.hash=\`#/learn/${id}/${si+1}\`;` → `go(\`#/learn/${id}/${si+1}\`);`
15. Записи практики (стр. 877–890):
    `let AUD={}; try{ AUD=JSON.parse(document.getElementById('aud').textContent)||{}; }catch(e){ AUD={}; }` → `const AUD=bundle.aud||{};`
    `stopAud` и `playAud` →
    ```js
    function stopAud(){ PQ++; if(CUR){ stopAudio(); CUR=null; } audBtnState(false); }
    function playAud(text){
      const ks=audKeys(text); if(!ks.length) return false; stopAud(); const my=PQ; let i=0; audBtnState(true);
      const done=()=>{ if(my===PQ){ CUR=null; audBtnState(false); } };
      // Записи — через общий <audio> приложения (cfg.playUrl): отдельный new Audio() на iPhone молчит без жеста.
      const next=()=>{ if(my!==PQ) return; if(i>=ks.length) return done();
        CUR=true; playUrl(AUD[ks[i++]],{ onEnd:(why)=>{ if(my!==PQ) return; if(why==='ended'&&i<ks.length) later(next,380); else done(); }, onFail:done }); };
      next(); return true;
    }
    ```
16. Таймеры: `cap._t=setTimeout(` (907) → `cap._t=later(`; в `finishQ` (926) `setTimeout(()=>{` → `later(()=>{`.
17. Сессии (957, 963, 970): `return location.hash='#/practice';` → `return go('#/practice');` (три места).
18. route (979–980):
    `const h=(location.hash||'#/').slice(1).split('/').filter(Boolean);` → `const h=(HASH||'#/').slice(1).split('/').filter(Boolean);`
    `try{ window.speechSynthesis&&speechSynthesis.cancel(); }catch(e){} stopAud();` → `stopAudio(); stopAud(); MEM=progress.read();`
19. Запуск (989–991) →
    ```js
    root.insertAdjacentHTML('afterbegin',globalDefs()); injectArt();
    on(root,'click',e=>{ const a=e.target&&e.target.closest?e.target.closest('a[href^="#/"]'):null; if(!a||!root.contains(a)) return; e.preventDefault(); go(a.getAttribute('href')); });
    route();
    return {
      go,
      /** Для тестов: текущий адрес движка и собранная сессия вопросов. */
      snapshot: () => ({ hash: HASH, session: S }),
      destroy(){ dead=true; ac.abort(); for(const id of timers) clearTimeout(id); timers.clear(); stopAud(); root.innerHTML=''; },
    };
    ```
20. Ответ — в статистику навыков: в `finishQ` первой инструкцией `onAnswer(ok);`.

- [ ] **Step 5: Починки (спека, «Баги прототипа»)**

1. «Previous» с первого экрана (стр. 803):
   `const prevHref = si>0?\`#/learn/${id}/${si-1}\`:(l.n>0?\`#/learn/${LES[l.n-1].id}/${LES[l.n-1].screens.length}\`:'#/');`
   → `const prevHref = si>0?\`#/learn/${id}/${si-1}\`:'#/'; // прототип вёл на итог ЧУЖОГО урока`
2. Переключатель языка на главной и в практике:
   - `viewHome`: после закрывающего `</section>` героя (перед `${CATS.map(`) вставить `<div class="ls-sheet pw-lang">${langBar()}</div>`;
   - `viewPractice`: после `</section>` героя вставить тот же блок; в заголовке категории после `<h2>…</h2>` —
     `${LANG!=='en'?\`<span class="ls-trs" lang="${LANG}">${esc(c.title[LANG])}</span>\`:''}`; в строке урока после
     `${esc(l.title.en)}` — `${LANG!=='en'?\` <span class="ls-trs" lang="${LANG}">${esc(l.title[LANG])}</span>\`:''}` (обе ветки — открытая и замок);
     в конце `viewPractice` — `bindLang(viewPractice);`.
   В `styles.js` в конец: `.pw-lang{margin-top:16px}`.
3. Битый вопрос не роняет сессию:
   - `normQ` →
     ```js
     function normQ(q,lesson){
       // Прототип бросал исключение (нет сцены, ложный факт сцены) — и вся сессия не открывалась. Пропускаем вопрос.
       try{ let r=q.type==='scene'?sceneQ(q):JSON.parse(JSON.stringify(q)); r._id=q._id; r.lesson=lesson.id; r.cat=lesson.cat.id; return shufOpts(r); }
       catch(e){ try{ console.warn('prepositions: вопрос пропущен', q._id, e&&e.message); }catch(_){} return null; }
     }
     ```
   - в сборщиках: `l.practice.map(q=>normQ(q,l))` → `l.practice.map(q=>normQ(q,l)).filter(Boolean)` (lessonSession),
     `pickN(pool,2).map(q=>normQ(q,l))` → `….filter(Boolean)` (catSession, finalSession);
   - `picBox`: `if(!sp) throw new Error('no picture for '+q._id);` → `if(!sp) return '';`
   - `startSession` первой строкой: `if(!qs.length) return go('#/practice');`
4. Общие вопросы категории без урока:
   - catSession: `const lastL=c.lessons[c.lessons.length-1]; qs=qs.concat(c.integrated.map(q=>normQ(q,lastL)).map(q=>Object.assign(q,{lesson:q.lesson})));`
     → `qs=qs.concat(c.integrated.map(q=>normQ(q,{id:null,cat:c})).filter(Boolean));`
   - finalSession: `const lastL=c.lessons[c.lessons.length-1]; qs=qs.concat(pickN(c.integrated,2).map(q=>normQ(q,lastL)));`
     → `qs=qs.concat(pickN(c.integrated,2).map(q=>normQ(q,{id:null,cat:c})).filter(Boolean));`
   - renderQ: `const lessonTitle=LBY[q.lesson]?LBY[q.lesson].title.en:'';`
     → `const lessonTitle=LBY[q.lesson]?LBY[q.lesson].title.en:(CBY[q.cat]?CBY[q.cat].title.en+': review':'');`
   - endSession: `S.res.filter(r=>!r.ok).forEach(` → `S.res.filter(r=>!r.ok&&r.lesson).forEach(` и первой
     строкой функции после `stopAud();` — `MEM=progress.read();` (итог пишется по свежему прогрессу).
5. Язык в уже отвеченном вопросе:
   - в `qBody` у `compare`: `${tr(q.ask)?\`<p class="ls-trs" lang="${LANG}">${esc(q.ask[LANG])}</p>\`:''}` → `${askTr(q)}`, и рядом с `qBody` объявить
     `const askTr=q=>tr(q.ask)?\`<p class="ls-trs ask-tr" lang="${LANG}">${esc(q.ask[LANG])}</p>\`:'<p class="ls-trs ask-tr" hidden></p>';`
   - в `renderQ` обработчик языка → `…; if(S.locked){ showFb(q,S.lastOk); const at=$('.ask-tr'); if(at) at.outerHTML=askTr(q); } else renderQ(); $$('[data-tr]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.tr===LANG)); });`
     (мёртвые `const fbh=…` и `if(S.locked) {}` убрать).

- [ ] **Step 6: Тест движка**

Run: `npx vitest run src/practice/prepositions/engine.test.js`
Expected: PASS. Если упал оракул — смотреть, какая правка поменяла расход `Math.random` или состав набора
(починки 3–4 на фикстуре не должны срабатывать, кроме `lesson: null` у общих вопросов); чинить порт, не оракул.

- [ ] **Step 7: Commit**

```bash
git add src/practice/prepositions/engine.js src/practice/prepositions/engine.test.js src/practice/prepositions/styles.js
git commit -m "feat(prepositions): движок прототипа в Shadow DOM, сверка с оракулом

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Озвучка урока

**Files:**
- Create: `src/practice/prepositions/voice.js`, `voice.test.js`

**Interfaces:**
- Produces: `speakLesson(text): void` — `playTts(text, {voice: VOICE.us, lang: 'en', speed: 0.85, onFail})`, по `onFail`
  (кроме `'empty'`) — `speechSynthesis` en-US 0.85 (как прототип).

- [ ] **Step 1: Тест**

```js
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/speech.js', () => ({ playTts: vi.fn() }))
const { playTts } = await import('../../lib/speech.js')
const { speakLesson } = await import('./voice.js')

afterEach(() => vi.clearAllMocks())

describe('озвучка урока', () => {
  it('Soniox голосом уроков на скорости прототипа', () => {
    speakLesson('The cat is in the box.')
    expect(playTts).toHaveBeenCalledWith('The cat is in the box.', expect.objectContaining({ voice: 'Grace', lang: 'en', speed: 0.85 }))
  })

  it('сервер не ответил — голос устройства', () => {
    const speak = vi.fn()
    globalThis.SpeechSynthesisUtterance = function (t) { this.text = t }
    globalThis.window = globalThis.window || globalThis
    window.speechSynthesis = { speak, cancel: vi.fn() }
    speakLesson('on the table')
    playTts.mock.calls[0][1].onFail('error')
    expect(speak).toHaveBeenCalled()
    expect(speak.mock.calls[0][0].lang).toBe('en-US')
  })
})
```

- [ ] **Step 2: Реализация**

```js
'use client'

// Озвучка примеров урока Prepositions World. Прототип читал их синтезом
// браузера (en-US, 0.85) — на Windows и Android это робот или русский голос;
// у нас — Soniox через /api/tts тем же «голосом уроков», а голос устройства —
// только если сервер не ответил: тишина на «послушай пример» хуже робота.
// Записи вопросов практики сюда не относятся — они играют файлами (playUrl).

import { playTts } from '../../lib/speech.js'
import { VOICE } from '../../lib/ttsShared.js'

const RATE = 0.85

function speakDevice(text) {
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = RATE
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch {
    /* нет синтеза — молча */
  }
}

export function speakLesson(text) {
  playTts(text, { voice: VOICE.us, lang: 'en', speed: RATE, onFail: (why) => why !== 'empty' && speakDevice(text) })
}
```

- [ ] **Step 3: Тест зелёный**

Run: `npx vitest run src/practice/prepositions/voice.test.js`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/practice/prepositions/voice.js src/practice/prepositions/voice.test.js
git commit -m "feat(prepositions): озвучка примеров урока через Soniox с запасным голосом

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Экран, данные, маршрут, баннер

**Files:**
- Modify: `src/api.js` (после `getListenSet`)
- Create: `src/screens/prepositions/usePrepositionsData.js`
- Create: `src/screens/PrepositionsPage.jsx`
- Modify: `src/App.jsx` (импорт, `PERSISTABLE_SCREENS`, `handleNav`, `case 'prepositions'`)
- Modify: `src/lib/navStack.js` (`PRACTICE_SECTIONS`)
- Modify: `src/screens/practice/practiceTabs.js` (вкладка `writing`)
- Modify: `src/screens/PracticePage.jsx` (`case 'prepositions'`)
- Modify: `src/i18n.jsx` (ru/en/kk), `src/styles.css`, `src/theme-dark.generated.css`

**Interfaces:**
- Consumes: `mountPrepositions` (Task 5), `PREPOSITIONS_CSS` (Task 4), `readPrepositions/writePrepositions` (Task 3),
  `speakLesson` (Task 6), `playUrl/stopTts` (`src/lib/speech.js`), `recordSkill` (`src/practice/skillStats.js`).
- Produces: `getPrepositions(token, onFresh)`; `usePrepositionsData(token) → {status: 'guest'|'loading'|'missing'|'error'|'ready', bundle, retry}`;
  экран `?screen=prepositions`; секция Практики `prepositions`; ключи i18n `practice.prepositions.{heading,desc,cta}`,
  `prepositions.{toPractice,loading,loadFailed,retry,notUploaded,guest}`, `nav.back.prepositions`.

- [ ] **Step 1: API**

```js
// Prepositions World: весь курс одним бандлом (~1 МБ, форма прототипа, медиа — ссылки MinIO). Большой ответ
// cachedAuthGet держит только в памяти вкладки — в localStorage он вытеснял бы прогресс.
export function getPrepositions(token, onFresh) {
  return cachedAuthGet('/mobile/prepositions', token, onFresh)
}
```

- [ ] **Step 2: Хук данных**

```js
'use client'

// Бандл Prepositions World с бэкенда (/mobile/prepositions). Перезапрос — по
// ВЛАДЕЛЬЦУ токена, а не по строке: тихое обновление access меняет строку каждые
// несколько минут, и движок пересоздавался бы посреди урока.

import { useCallback, useEffect, useRef, useState } from 'react'
import { getPrepositions } from '../../api.js'
import { ownerOf } from '../../practice/progressStore.js'

export function usePrepositionsData(token) {
  const owner = ownerOf(token)
  const tokenRef = useRef(token)
  useEffect(() => {
    tokenRef.current = token
  }, [token])
  const [state, setState] = useState({ status: token ? 'loading' : 'guest', bundle: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const tk = tokenRef.current
    if (!tk) {
      setState({ status: 'guest', bundle: null })
      return undefined
    }
    let alive = true
    setState((s) => (s.bundle ? s : { status: 'loading', bundle: null }))
    // Свежая копия с другим release (методист перезалил курс) — новый бандл; тот же — не трогаем движок.
    const fresh = (b) => alive && setState((s) => (s.bundle && s.bundle.release === b?.release ? s : { status: 'ready', bundle: b }))
    getPrepositions(tk, fresh)
      .then((b) => alive && setState({ status: 'ready', bundle: b }))
      .catch((e) => alive && setState({ status: e?.status === 404 ? 'missing' : 'error', bundle: null }))
    return () => {
      alive = false
    }
  }, [owner, attempt])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, retry }
}
```

- [ ] **Step 3: Экран**

```jsx
'use client'

// Prepositions World — курс английских предлогов: 8 категорий, уроки экранами
// (правила, схемы, сцены), практика с картинками-сценами и записями голоса.
//
// Экран — оболочка: разметку и поведение рисует перенесённый движок прототипа
// (src/practice/prepositions/engine.js), React его монтирует и снимает. Движок
// живёт в Shadow DOM: классы прототипа совпадают с глобальными классами сайта.
// Материал транслируется с бэкенда (/mobile/prepositions): методист заливает
// прототип в web-admin, в бандле сайта курса нет. Курс на английском (язык
// упражнения), перевод kk/ru — в самом курсе; i18n приложения — только у оболочки.

import { useEffect, useRef } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { mountPrepositions } from '../practice/prepositions/engine.js'
import { PREPOSITIONS_CSS } from '../practice/prepositions/styles.js'
import { readPrepositions, writePrepositions } from '../practice/prepositions/progress.js'
import { speakLesson } from '../practice/prepositions/voice.js'
import { PREPOSITIONS_LANG_KEY } from '../practice/practiceKeys.js'
import { ownerOf } from '../practice/progressStore.js'
import { recordSkill } from '../practice/skillStats.js'
import { playUrl, stopTts } from '../lib/speech.js'
import { usePrepositionsData } from './prepositions/usePrepositionsData.js'

export default function PrepositionsPage({ userName, userLevel, token, onNav, onProfile, onBack, backLabel }) {
  const { t, lang } = useI18n()
  const hostRef = useRef(null)
  const { status, bundle, retry } = usePrepositionsData(token)
  const owner = ownerOf(token)
  // Язык интерфейса — только язык перевода ПО УМОЛЧАНИЮ при монтировании: смена языка
  // посреди урока не должна пересоздавать движок и выкидывать ученика на главную.
  const langRef = useRef(lang)
  langRef.current = lang
  const goBack = () => (onBack ? onBack() : onNav?.('practice', { skill: 'writing' }))

  useEffect(() => {
    const host = hostRef.current
    if (!host || !bundle) return undefined
    // attachShadow — один раз на элемент: при пересоздании (вход, новый релиз, StrictMode) — тот же корень.
    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' })
    // Шрифт сайта внутрь тени: --sans прототипа берёт его отсюда (Manrope, на телефоне PT Root UI, в kk — Inter).
    host.style.setProperty('--pw-font', getComputedStyle(host).fontFamily)
    shadow.innerHTML = `<style>${PREPOSITIONS_CSS}</style><div class="pw"><div id="app"></div></div>`
    const api = mountPrepositions(shadow.querySelector('.pw'), {
      bundle,
      lang: langRef.current === 'kz' ? 'kk' : langRef.current,
      langKey: PREPOSITIONS_LANG_KEY,
      progress: { read: readPrepositions, write: writePrepositions },
      speak: speakLesson,
      playUrl,
      stopAudio: stopTts,
      onAnswer: (ok) => recordSkill('grammar', ok),
    })
    return () => {
      api.destroy()
      shadow.innerHTML = ''
    }
    // owner: вошёл или вышел — прогресс уже другого ученика; bundle — методист перезалил курс
  }, [bundle, owner])

  const notice =
    status === 'guest' ? t('prepositions.guest')
      : status === 'missing' ? t('prepositions.notUploaded')
        : status === 'error' ? t('prepositions.loadFailed')
          : status === 'loading' ? t('prepositions.loading')
            : null

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="prp-top">
        <button type="button" className="nmb-back" onClick={goBack}>
          ← {backLabel || t('prepositions.toPractice')}
        </button>
      </div>
      {notice && (
        <div className="nmb-state prp-state" role={status === 'error' ? 'alert' : 'status'} aria-busy={status === 'loading'} data-status={status}>
          <p>{notice}</p>
          {status === 'error' && (
            <button type="button" className="nmb-retry" onClick={retry}>
              {t('prepositions.retry')}
            </button>
          )}
        </div>
      )}
      <div className="prp-host" ref={hostRef} hidden={!bundle} data-release={bundle?.release ?? ''} />
    </LearningLayout>
  )
}
```

Перед этим: `grep -n "kz\|'kk'" src/i18n.jsx | head` — узнать код казахского в `lang` (`kk` или `kz`) и оставить
нужную ветку маппинга. Классы `nmb-back`, `nmb-state`, `nmb-retry` — уже есть у «Чисел» (`grep -n "\.nmb-" src/styles.css`);
добавить в `styles.css` рядом:

```css
/* Prepositions World: оболочка та же, что у «Чисел» (кнопка «назад», статусы загрузки). */
.prp-top { display: flex; align-items: center; margin: 0 0 12px; }
.prp-host { display: block; }
```

- [ ] **Step 4: App и «назад»**

`src/App.jsx`:
- импорт рядом с `NumbersPage`: `import PrepositionsPage from './screens/PrepositionsPage.jsx'`
- в `PERSISTABLE_SCREENS` после `'listen',` — `'prepositions',`
- в `handleNav` после строки `else if (key === 'numbers') setScreen('numbers')` — `else if (key === 'prepositions') setScreen('prepositions')`
- в `switch` после `case 'numbers'`:
  ```jsx
      case 'prepositions':
        return (
          <PrepositionsPage
            {...sectionBack('writing')}
            userLevel={userLevel}
            userName={name}
            token={token}
            onNav={handleNav}
            onProfile={() => setScreen('profile')}
          />
        )
  ```

`src/lib/navStack.js` — в `PRACTICE_SECTIONS` после `numbers`: `prepositions: 'nav.back.prepositions',`.

- [ ] **Step 5: Баннер в Практике**

`practiceTabs.js`, вкладка `writing`:

```js
    sections: [
      { id: 'grammar', all: 'pill' },
      // Prepositions World (22.10.2026) — курс предлогов; в макете его нет. Широкий баннер сразу после
      // «Грамматики»: предлоги — грамматика.
      { id: 'prepositions' },
      { id: 'writePair', modules: ['writing', 'verbs'] },
      { id: 'workbooks', all: 'pill' },
    ],
```

`PracticePage.jsx` — после `case 'numbers': …` (по образцу):

```jsx
      case 'prepositions':
        return (
          <Banner
            key={sec.id}
            id="sec-prepositions"
            variant="prepositions"
            wide
            title={t('practice.prepositions.heading')}
            desc={t('practice.prepositions.desc')}
            cta={t('practice.prepositions.cta')}
            onStart={() => onNav?.('prepositions')}
          />
        )
```

`styles.css` после `.pk-banner--listen`:

```css
/* Prepositions World в макете тоже нет — фиолетовый прототипа (#5a2fc8) в тёмный индиго его героя. */
.pk-banner--prepositions { background: linear-gradient(99.4deg, #6d3df0 17%, #3a1f94 95.5%); }
```

`theme-dark.generated.css` после блока `.pk-banner--numbers` (ТОЛЬКО этот блок, файл не регенерировать — память
«регенерация тянет чужое»):

```css
html[data-theme="dark"] .pk-banner--prepositions {
    background: linear-gradient(99.4deg, var(--dk-acc) 17%, var(--dk-acc-strong) 95.5%)
}
```

Если на `PracticePage` есть тест-перечень секций/модулей (`grep -rn "justListen\|'numbers'" src/screens/practice/*.test.js src/screens/*.test.jsx`)
— дописать `prepositions` тем же образом.

- [ ] **Step 6: Тексты** — в `src/i18n.jsx` три словаря (ru ~стр. 5836, en ~12795, kk ~19749 — рядом с `practice.numbers.*`;
  `nav.back.*` — рядом с `nav.back.numbers`; `prepositions.*` — рядом с `numbers.*`):

ru:
```js
    'nav.back.prepositions': 'К предлогам',
    'practice.prepositions.heading': 'Prepositions World',
    'practice.prepositions.desc': 'Все английские предлоги: in, on, at и ещё полсотни — короткие уроки с картинками и переводом, потом практика на сценах',
    'practice.prepositions.cta': 'Начать',
    'prepositions.toPractice': 'В Практику',
    'prepositions.loading': 'Загружаем курс…',
    'prepositions.loadFailed': 'Не удалось загрузить курс. Проверьте интернет и попробуйте ещё раз.',
    'prepositions.retry': 'Ещё раз',
    'prepositions.notUploaded': 'Раздел готовится: материалы ещё не загружены.',
    'prepositions.guest': 'Войди в аккаунт, чтобы заниматься в Prepositions World.',
```

en:
```js
    'nav.back.prepositions': 'To prepositions',
    'practice.prepositions.heading': 'Prepositions World',
    'practice.prepositions.desc': 'Every English preposition: in, on, at and fifty more — short lessons with pictures and translations, then practice in scenes',
    'practice.prepositions.cta': 'Start',
    'prepositions.toPractice': 'To Practice',
    'prepositions.loading': 'Loading the course…',
    'prepositions.loadFailed': "Couldn't load the course. Check your connection and try again.",
    'prepositions.retry': 'Try again',
    'prepositions.notUploaded': "The section is being prepared: materials haven't been uploaded yet.",
    'prepositions.guest': 'Sign in to practise in Prepositions World.',
```

kk:
```js
    'nav.back.prepositions': 'Предлогтарға',
    'practice.prepositions.heading': 'Prepositions World',
    'practice.prepositions.desc': 'Ағылшынның барлық предлогтары: in, on, at және тағы елуге жуығы — суретті, аудармалы қысқа сабақтар, кейін көріністермен жаттығу',
    'practice.prepositions.cta': 'Бастау',
    'prepositions.toPractice': 'Практикаға',
    'prepositions.loading': 'Курс жүктелуде…',
    'prepositions.loadFailed': 'Курсты жүктеу мүмкін болмады. Интернетті тексеріп, қайта көріңіз.',
    'prepositions.retry': 'Қайталау',
    'prepositions.notUploaded': 'Бөлім дайындалып жатыр: материалдар әлі жүктелмеген.',
    'prepositions.guest': 'Prepositions World-те оқу үшін аккаунтқа кір.',
```

Есть тест на совпадение ключей словарей (`grep -rln "dict\b.*keys\|Object.keys(dict" src/*.test.js`) — прогнать его.

- [ ] **Step 7: Проверка**

Run: `npx vitest run src/practice/prepositions src/lib src/practice/practiceSync.test.js src/screens`
Expected: PASS (кроме известных красных из памяти «develop-red-tests-baseline» — сверить, что они красные и без этих правок).

Run: `npm run lint` → без новых ошибок; `npm run build` (во временной копии рядом с dev-сервером — память
«build-alongside-dev-server») → успех.

Ручной прогон: `.claude/launch.json` дев-сервера этого worktree, `?screen=prepositions` с подменой
`/mobile/prepositions` бандлом фикстуры (в браузере — `window.fetch` не подменить; проверка «вживую» — Task 8 e2e);
`?screen=practice` → вкладка «Письмо» → баннер есть и ведёт на экран («Раздел готовится» без бэкенда).

- [ ] **Step 8: Commit**

```bash
git add src/api.js src/screens/prepositions src/screens/PrepositionsPage.jsx src/App.jsx src/lib/navStack.js src/screens/practice/practiceTabs.js src/screens/PracticePage.jsx src/i18n.jsx src/styles.css src/theme-dark.generated.css
git commit -m "feat(prepositions): экран Prepositions World и баннер во вкладке «Письмо»

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: E2E

**Files:**
- Create: `tests/prepositions.spec.js`

- [ ] **Step 1: Спека**

```js
import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// Prepositions World (?screen=prepositions) без бэкенда: /mobile/prepositions
// отдаёт бандл урезанной копии прототипа (src/practice/prepositions/__fixtures__),
// медиа /__prep-media/* — пиксель webp и тихий mp3, /api/tts — тихий mp3.
// Верный ответ тест узнаёт из сессии движка нельзя (тень закрыта для теста не
// больше, чем для ученика) — поэтому отвечает первым вариантом и проверяет
// только ход сессии и итог, а правильность наборов — оракул (engine.test.js).

const BUNDLE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'practice', 'prepositions', '__fixtures__', 'bundle.json'), 'utf8'))
const LESSON = BUNDLE.course.cats[0].lessons[0]
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
function silentMp3(frames = 20) {
  const frame = Buffer.alloc(417)
  frame.set([0xff, 0xfb, 0x90, 0xc0])
  return Buffer.concat(Array.from({ length: frames }, () => frame))
}
// 1×1 webp
const PIXEL = Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=', 'base64')

async function mockBackend(page, { bundleStatus = 200, token = 'test-token' } = {}) {
  // Чистим хранилище один раз на вкладку: init-скрипт идёт и на перезагрузке,
  // а тест как раз проверяет, что прогресс её переживает.
  await page.addInitScript((tk) => {
    if (sessionStorage.getItem('e2e_prep_init')) return
    sessionStorage.setItem('e2e_prep_init', '1')
    const toursOff = localStorage.getItem('jts_tours_off')
    localStorage.clear()
    if (toursOff) localStorage.setItem('jts_tours_off', toursOff)
    if (tk) localStorage.setItem('jts_access_token', tk)
  }, token)
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 1, name: 'Асель', phone: '77010001122', role: 'STUDENT', languageLevel: 'A2' } })))
  await page.route('**/mobile/prepositions', (r) => r.fulfill(bundleStatus === 200 ? json(BUNDLE) : json({ messages: ['нет'] }, bundleStatus)))
  await page.route('**/__prep-media/**', (r) =>
    r.fulfill(r.request().url().endsWith('.mp3') ? { status: 200, contentType: 'audio/mpeg', body: silentMp3() } : { status: 200, contentType: 'image/webp', body: PIXEL }))
  await page.route(/\/api\/tts\?/, (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: silentMp3() }))
}

const shadow = (page) => page.locator('.prp-host')

test('урок → практика урока → итог; прогресс переживает перезагрузку', async ({ page }) => {
  await mockBackend(page)
  await page.goto('/?screen=prepositions')
  const host = shadow(page)
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30000 })
  await expect(host.locator('.hero h1')).toContainText('prepositions')

  await host.locator(`a[href="#/learn/${LESSON.id}"]`).click()
  for (let i = 0; i < LESSON.screens.length; i++) await host.locator('#nextBtn').click()
  await expect(host.locator('.ls-mis')).toBeVisible()
  await host.locator(`a[href="#/practice/lesson/${LESSON.id}"]`).click()

  for (let i = 0; i < LESSON.practice.length; i++) {
    await expect(host.locator('.gt small')).toContainText(`Question ${i + 1} of`)
    const passage = host.locator('.opt.small')
    if (await passage.count()) {
      const gaps = await host.locator('.pg').count()
      for (let g = 0; g < gaps; g++) await host.locator(`.opt.small[data-g="${g}"]`).first().click()
    } else {
      await host.locator('.opt').first().click()
    }
    await host.locator('#nxt').click()
  }
  await expect(host.locator('.end .score')).toContainText(`of ${LESSON.practice.length} correct`)

  await page.reload()
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30000 })
  await expect(host.locator(`a.lcard.done[href="#/learn/${LESSON.id}"]`)).toBeVisible()
})

test('гость видит просьбу войти, без заливки — «Раздел готовится»', async ({ page }) => {
  await mockBackend(page, { token: null })
  await page.goto('/?screen=prepositions')
  await expect(page.locator('.prp-state[data-status="guest"]')).toBeVisible({ timeout: 30000 })

  const page2 = await page.context().newPage()
  await mockBackend(page2, { bundleStatus: 404 })
  await page2.goto('/?screen=prepositions')
  await expect(page2.locator('.prp-state[data-status="missing"]')).toBeVisible({ timeout: 30000 })
})

test('360px: без горизонтальной прокрутки', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await mockBackend(page)
  await page.goto('/?screen=prepositions')
  await expect(shadow(page)).toHaveAttribute('data-release', '1', { timeout: 30000 })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
```

- [ ] **Step 2: Прогон**

Run: `npx playwright test tests/prepositions.spec.js --workers=1`
Expected: 3 passed. Падает на локаторе внутри тени — Playwright проходит открытый Shadow DOM CSS-локаторами;
падает на `.hero h1` — свериться с текстом героя в `viewHome` (`English prepositions: the complete course`).

- [ ] **Step 3: Commit**

```bash
git add tests/prepositions.spec.js
git commit -m "test(prepositions): e2e — урок, практика, итог, гость, 360px

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: CLAUDE.md, проверки, PR

- [ ] **Step 1: CLAUDE.md** — абзац после раздела Just Listen It:

```markdown
**Prepositions World в «Практике» — курс предлогов, материал из админки (22.10.2026).** Источник правды —
html-прототип методиста (~23 МБ, в репозитории его НЕТ): правки контента — в прототип и повторная заливка в
web-admin «Практика и тесты» → Prepositions World; бэкенд (`/admin/prepositions/upload`, `docs/practice/PREPOSITIONS.md`)
проверяет курс, кладёт 266 картинок и 502 записи в MinIO по хэшу (`practice/prepositions/<sha24>.*`, immutable) и
отдаёт `GET /mobile/prepositions` — один бандл в форме данных прототипа (Bearer; 404 — «Раздел готовится»). Экран
`?screen=prepositions` (`src/screens/PrepositionsPage.jsx`), баннер — вкладка «Письмо» после «Грамматики». Движок —
`src/practice/prepositions/engine.js`, скрипт прототипа почти дословно в Shadow DOM, как у «Чисел»; отличия (роутер
без `location.hash`, `<image href=URL>` вместо `<use href=#a-…>`, звук, прогресс, пять починок) — в шапке файла.
Правки движка — PR сайта: заливка прототипа с другим движком проходит с предупреждением (хэш движка сверяется с
`prepositions.engine-sha` бэкенда; перенесли движок заново — обновить значение). Порт сверяется с оракулом самого
прототипа (`scripts/prepositions/extract-oracle.js` на урезанной копии `__fixtures__/prototype-mini.html`, её режет
`scripts/prepositions/make-fixture.js`): красный `engine.test.js` — чинить порт. Озвучка примеров урока — Soniox
(`voice.js`), записи вопросов — файлы через `playUrl`. Прогресс — модуль синка `prepositions` (ключ прототипа
`jts_prepositions_v4`, merge: прочитанное объединяется, результат — лучший); ответ пишет `recordSkill('grammar')`.
Квоты и домашки нет — area бэкенду неизвестна.
```

- [ ] **Step 2: Полная проверка**

Run: `npx vitest run src/practice/prepositions src/lib src/practice src/screens` — PASS (известные красные — те же, что на develop).
Run: `npm run lint` — без новых ошибок.
Run: `npm run build` — успех (во временной копии, если рядом крутится dev-сервер).
Run: `npx playwright test tests/prepositions.spec.js --workers=1` — PASS.

- [ ] **Step 3: PR**

```bash
git add CLAUDE.md
git commit -m "docs(prepositions): раздел Prepositions World в CLAUDE.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git fetch origin && git rebase origin/develop
git push -u origin feat/prepositions-world
gh pr create --repo jtsapp/jts-web-app --base develop --title "feat(prepositions): раздел Prepositions World в Практике" --body-file <файл с описанием>
```

Описание PR: что сделано, ссылки на PR бэкенда и админки, что без заливки экран честно пишет «Раздел готовится»,
список ошибок контента для методиста (спека, «Ошибки контента»), как проверить. Подпись — по правилам сессии.
