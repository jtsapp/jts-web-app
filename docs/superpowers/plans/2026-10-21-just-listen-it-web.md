# Just Listen It — Web (jts-web-app) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Раздел «Практики» `?screen=listen`: ученик слышит слово и пишет его по буквам, затем записывает на слух предложение; монеты (только прирост к лучшему) уходят в баланс, лучшие результаты — в синк Практики, ошибки — в «Словарь».

**Architecture:** Чистый движок `src/practice/listen/` (порт прототипа `data/jtslisten.html`, сверка с оракулом самого прототипа) + машина теста `ListenSession` вне React + экраны `src/screens/ListenPage.jsx` и `src/screens/listen/`. Данные — `/mobile/listen` бэкенда через `cachedAuthGet`. Звук — `/api/tts` (Soniox) с откатом на голос устройства.

**Tech Stack:** Next.js (App Router как оболочка SPA), React, JavaScript (без TS), vitest + jsdom, Playwright.

**Спека:** `docs/superpowers/specs/2026-10-21-just-listen-it-design.md` (часть 3). **Зависит от** плана backend (ручки `/mobile/listen`, `/mobile/listen/sets/{id}`) — для экрана; движок и тесты от бэкенда не зависят.

## Global Constraints

- Рабочая копия: `C:\Users\nural\Desktop\jts-web-app\.claude\worktrees\just-listen-it`, ветка `feat/just-listen-it` от `origin/develop`. Прототип уже в `data/jtslisten.html`.
- Только JS/JSX, никаких TS-файлов. Комментарии по-русски, объясняют «почему». Строки UI — через `t(key, vars)` из `src/i18n.jsx` (ru/en/kk, ключи одинаковые). Стили — глобальный файл раздела `src/listen.css`, классы `.jl-*`.
- Семантика сверки — как в прототипе (оракул). Два сознательных отступления, оба записаны в комментариях кода:
  1. `SYN`/`IRR` читаются только по собственным ключам. Прототип на термине «constructor» доставал из них функцию `Object` и падал.
  2. Монеты слова считаются по НАЖАТИЯМ подсказки (ТЗ: «одна подсказка — 5, несколько — 2»). Прототип считал открытые буквы вместе с верно набранным началом.
- Монеты в баланс — `max(0, заработано − лучший результат прогона)`. Прогон без ключа («Повторить ошибки», «Свой список») даёт 0.
- Озвучка: голос `VOICE.gb` (Freya), `lang: 'en'`, `speed: 0.9`. «Медленнее» — тот же адрес с `rate: 0.75`. При `onFail` — `speechSynthesis` en-GB на темпах прототипа: 0.9; медленно — 0.55 для слова, 0.6 для предложения. Автоплей: слово через 0,35 с, предложение через 1,5 с после слова.
- Лимиты на тест: 3 подсказки и 3 показа ответа; показ после двух ошибок лимит не тратит.
- Проверки: `npx vitest run <пути>`, `npm run lint`, `npm run build`, `npm run test:e2e -- tests/listen.spec.js` (Playwright, порт 3100: перед прогоном убедиться, что порт не занят соседним воркtree). Полный `npm test` — сверять с известными красными (`practice-contract:20`, `vocab:242`).
- Коммиты: `тип(listen): суть` по-русски + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Пуш и PR — только по команде владельца, после мержа бэкенда.

---

## File Structure

```
scripts/extract-listen-oracle.js                 ← оракул: функции прототипа считают фикстуру
src/practice/listen/
  __fixtures__/oracle.json                       ← генерируется скриптом, коммитится
  compare.js     compare.test.js                 ← letters/lev/toks/forms/containsTarget/compareSentence/missingWords
  runs.js        runs.test.js                    ← части урока, тесты, повторения, колода, свой список
  rules.js       rules.test.js                   ← проверка слова/предложения, монеты, лучший, прирост
  session.js     session.test.js                 ← ListenSession: машина теста вне React
  listenProgress.js  listenProgress.test.js      ← { best } через createProgressStore + merge
  voice.js       voice.test.js                   ← playTts + откат на голос устройства
src/practice/practiceKeys.js                     ← LISTEN_KEY, LISTEN_OWN_KEY, LISTEN_PROGRESS_EVENT
src/practice/practiceSyncCore.js                 ← 'listen' в OBJECT_MODULES + applyHydratedState
src/practice/practiceSync.js                     ← clearLocalPractice чистит ключи раздела
src/lib/practiceContract.js                      ← 'listen' в PRACTICE_MODULES
src/lib/db/studentActivity.js                    ← listen → раздел для кабинета преподавателя
src/lib/assistant/tracker.js, prompt.js          ← имя раздела для помощника
src/api.js                                       ← getListenIndex, getListenSet
src/i18n.jsx          src/i18n.listen.test.jsx   ← ключи listen.* / practice.listen.* / nav.back.listen
src/screens/ListenPage.jsx                       ← навигация раздела и итог теста
src/screens/listen/
  useListenData.js                               ← загрузка оглавления и набора
  ListenIcons.jsx                                ← иконки прототипа
  ListenMenu.jsx  OwnListCard.jsx                ← меню: уровни, направления, свой список
  ListenSetView.jsx                              ← набор: тест, юниты, уроки, части
  ListenRun.jsx                                  ← сессия + звук + задание/итог
  ListenTask.jsx  WordCells.jsx  SentenceStep.jsx  ListenFeedback.jsx
  ListenResult.jsx
src/listen.css  src/styles.css (.pk-banner--listen)  src/app/layout.jsx
src/App.jsx  src/screens/PracticePage.jsx  src/screens/practice/practiceTabs.js  src/lib/navStack.js
tests/listen.spec.js                             ← e2e: путь ученика, монеты, 360px
```

---

### Task 1: Сверка ответа `compare.js` + оракул прототипа

**Files:**
- Create: `scripts/extract-listen-oracle.js`
- Create (генерируется): `src/practice/listen/__fixtures__/oracle.json`
- Create: `src/practice/listen/compare.js`
- Test: `src/practice/listen/compare.test.js`

**Interfaces:**
- Consumes: `scripts/lib/js-slice.js` (`sliceFunction`, `sliceConst`).
- Produces: `letters(s)`, `enMain(s)`, `first(s)`, `lev(a, b)`, `toks(s) → string[]`, `forms(w) → Set<string>`, `containsTarget(raw, en) → boolean`, `compareSentence(raw, refs) → { ref, rt, d, rel }`, `missingWords(raw, ref) → string[]`.
- Фикстура: `{ source, toks: [[s, tokens]], contains: [[raw, en, bool]], compare: [[raw, refs, d]], missing: [[raw, ref, words]], lev: [[a, b, d]], parts: [[n, sizes]] }`.

- [ ] **Step 1: Скрипт оракула**

`scripts/extract-listen-oracle.js`:

```js
#!/usr/bin/env node
// Оракул Just Listen It: функции сверки ответа считает САМ прототип
// (data/jtslisten.html), порт src/practice/listen/ сверяется с ними, а не сам
// с собой (тот же приём, что у «Чтения», «Воркбука», «Глаголов»).
//
// Одно сознательное расхождение: SYN и IRR прототипа — обычные объекты, и
// слово, совпавшее с унаследованным ключом (constructor, toString…), читало
// из них функцию. На термине «constructor» (Software Development) проверка
// предложения падала TypeError. Порт смотрит только собственные ключи, и
// оракул считается с тем же исправлением.
//
// Запуск: node scripts/extract-listen-oracle.js [путь к html]
// Пишет src/practice/listen/__fixtures__/oracle.json.

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { sliceFunction, sliceConst } = require('./lib/js-slice.js')

const ROOT = path.join(__dirname, '..')
const DEFAULT_SRC = path.join(ROOT, 'data', 'jtslisten.html')
const OUT = path.join(ROOT, 'src', 'practice', 'listen', '__fixtures__', 'oracle.json')

const CONSTS = ['letters', 'enMain', 'CONTR', 'SYN', 'IRR', 'PART', 'SYL', 'FIELDS']
const FUNCS = ['lev', 'toks', 'forms', 'containsTarget', 'compareSentence', 'missingWords', 'parts']
// Таблицы-словари, которые прототип читает по слову ученика: SYN[t], IRR[w].
const LOOKUPS = ['SYN', 'IRR']
// Каждая N-я запись направлений: все 8 тыс. раздули бы фикстуру до мегабайтов,
// а формы и сокращения там те же, что у уровней.
const FIELD_STEP = 10
// Разбор на слова — у каждой 4-й записи, искажения ответа — у каждой 6-й,
// опечатки слова — у каждой 3-й: по той же причине (фикстура ~1 МБ, а не 4).
const TOKS_STEP = 4
const PERTURB_STEP = 6
const TYPO_STEP = 3

function readPrototype(html) {
  const src = html.slice(html.indexOf('<script>'), html.lastIndexOf('</script>'))
  const ctx = vm.createContext({})
  const consts = CONSTS.map((n) => {
    const decl = sliceConst(src, n)
    if (!LOOKUPS.includes(n)) return decl
    // Исправление унаследованных ключей (см. шапку): таблицы без прототипа.
    return decl.replace(new RegExp(`^const ${n}\\s*=`), `const ${n} = Object.assign(Object.create(null),`) + ')'
  })
  vm.runInContext([...consts, ...FUNCS.map((n) => sliceFunction(src, n))].join('\n'), ctx, { timeout: 20000 })
  return vm.runInContext(
    '({SYL, FIELDS, letters, enMain, lev, toks, containsTarget, compareSentence, missingWords, parts})',
    ctx,
  )
}

// Детерминированные искажения ответа: то, что ученик реально пишет на слух.
const CONTRACT = [
  [/\bdo not\b/g, "don't"], [/\bdoes not\b/g, "doesn't"], [/\bis not\b/g, "isn't"], [/\bI am\b/g, "I'm"],
  [/\bwill not\b/g, "won't"], [/\bcannot\b/g, "can't"], [/\bit is\b/gi, "it's"], [/\bwe are\b/gi, "we're"],
]
const SPELLING = [[/colour/g, 'color'], [/neighbour/g, 'neighbor'], [/\bmum\b/g, 'mom'], [/ise\b/g, 'ize'], [/\bfilm\b/g, 'movie']]

function perturbations(ref, word) {
  const words = ref.split(' ')
  const out = [
    ref,
    ref.toLowerCase().replace(/[.,!?;:]/g, ''),
    words.slice(0, -1).join(' '),
    words.length > 1 ? [words[1], words[0], ...words.slice(2)].join(' ') : ref + ' too',
    CONTRACT.reduce((s, [r, v]) => s.replace(r, v), ref),
    SPELLING.reduce((s, [r, v]) => s.replace(r, v), ref),
    ref.replace(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), 'something'),
    ref + ' really',
  ]
  return [...new Set(out)].filter(Boolean)
}

function wordTypos(w) {
  const t = w.replace(/[^a-z]/gi, '').toLowerCase()
  if (t.length < 2) return []
  const mid = Math.floor(t.length / 2)
  return [...new Set([t.slice(0, -1), t.slice(0, mid - 1) + t[mid] + t[mid - 1] + t.slice(mid + 1), t + 'e', 'x' + t.slice(1)])]
}

function entries(P) {
  const levels = Object.values(P.SYL).flatMap((units) => units.flatMap((u) => u.lessons.flatMap((l) => l.w)))
  const fields = P.FIELDS.flatMap((f) => f.units.flatMap((u) => u.lessons.flatMap((l) => l.w)))
  return [...levels, ...fields.filter((_, i) => i % FIELD_STEP === 0)]
}

function build(P) {
  const rows = { toks: [], contains: [], compare: [], missing: [], lev: [], parts: [] }
  entries(P).forEach(([en, , exEn], i) => {
    const ref = exEn.split('||')[0]
    if (i % TOKS_STEP === 0) rows.toks.push([ref, P.toks(ref)])
    rows.contains.push([ref, en, P.containsTarget(ref, en)])
    const target = P.letters(P.enMain(en))
    if (i % TYPO_STEP === 0) for (const typo of wordTypos(en).slice(0, 2)) rows.lev.push([typo, target, P.lev(typo, target)])
    if (i % PERTURB_STEP) return
    perturbations(ref, P.enMain(en)).forEach((raw, k) => {
      rows.compare.push([raw, exEn, P.compareSentence(raw, exEn).d])
      rows.contains.push([raw, en, P.containsTarget(raw, en)])
      // «Не хватает: …» прототип показывает, когда пропущено слово-два.
      if (k === 2 || k === 6) rows.missing.push([raw, ref, P.missingWords(raw, ref)])
    })
  })
  for (let n = 1; n <= 40; n++) {
    rows.parts.push([n, P.parts(Array.from({ length: n }, (_, k) => k)).map((p) => p.length)])
  }
  // Ручные случаи: диакритика, типографский апостроф, синонимы, неправильные формы.
  for (const s of ['Café — it’s great!', "I've got two kids", 'My mom loves movies.', 'Mother can`t come']) {
    rows.toks.push([s, P.toks(s)])
  }
  for (const [raw, en] of [['We went home', 'go'], ['She studies hard', 'study'], ['The children play', 'child'], ['I bought bread', 'buy'], ['He got up late', 'get up'], ['The constructor runs first', 'constructor']]) {
    rows.contains.push([raw, en, P.containsTarget(raw, en)])
  }
  return rows
}

function main() {
  const src = process.argv[2] || DEFAULT_SRC
  const P = readPrototype(fs.readFileSync(src, 'utf8'))
  const rows = build(P)
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify({ source: path.relative(ROOT, src).replace(/\\/g, '/'), ...rows }) + '\n')
  const size = fs.statSync(OUT).size
  console.log(`oracle.json: ${Object.entries(rows).map(([k, v]) => `${k} ${v.length}`).join(', ')}; ${(size / 1024).toFixed(0)} КБ`)
}

module.exports = { readPrototype, build }

if (require.main === module) main()
```

- [ ] **Step 2: Сгенерировать фикстуру**

Run: `node scripts/extract-listen-oracle.js`
Expected: `oracle.json: toks 929, contains 7445, compare 3739, missing 653, lev 2468, parts 40; ~1215 КБ`.

- [ ] **Step 3: Написать падающий тест**

`src/practice/listen/compare.test.js`:

```js
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { compareSentence, containsTarget, enMain, first, forms, letters, lev, missingWords, toks } from './compare.js'

// Оракул — прогон ПРОТОТИПНЫХ функций (scripts/extract-listen-oracle.js).
// Красный тест значит, что порт разъехался с исходником: чинить порт.
const O = JSON.parse(readFileSync(new URL('./__fixtures__/oracle.json', import.meta.url), 'utf8'))

describe('сверка с оракулом прототипа', () => {
  it('toks: разбор ответа на слова', () => {
    for (const [s, want] of O.toks) expect(toks(s), s).toEqual(want)
  })

  it('containsTarget: целевое слово в ответе с формами', () => {
    for (const [raw, en, want] of O.contains) expect(containsTarget(raw, en), `${en} ← ${raw}`).toBe(want)
  })

  it('compareSentence: ошибок в словах до ближайшего варианта', () => {
    for (const [raw, refs, want] of O.compare) expect(compareSentence(raw, refs).d, raw).toBe(want)
  })

  it('missingWords: чего не хватает до образца', () => {
    for (const [raw, ref, want] of O.missing) expect(missingWords(raw, ref), raw).toEqual(want)
  })

  it('lev: опечатки слова', () => {
    for (const [a, b, want] of O.lev) expect(lev(a, b), `${a}/${b}`).toBe(want)
  })
})

describe('мелочи разбора', () => {
  it('буквы, главный вариант, первый перевод', () => {
    expect(letters("O'Clock-Tower 2")).toBe('oclocktower')
    expect(enMain('get up|wake up')).toBe('get up')
    expect(first('мама/мать')).toBe('мама')
  })

  it('неправильные формы и удвоение согласной', () => {
    expect(forms('buy').has('bought')).toBe(true)
    expect(forms('stop').has('stopped')).toBe(true)
    expect(forms('study').has('studies')).toBe(true)
  })

  it('унаследованные ключи не ломают сверку (прототип падал на «constructor»)', () => {
    expect(toks('the constructor')).toEqual(['the', 'constructor'])
    expect(containsTarget('The constructor sets the values.', 'constructor')).toBe(true)
    expect(forms('toString').has('toStrings')).toBe(true)
  })
})
```

- [ ] **Step 4: Убедиться, что тест падает**

Run: `npx vitest run src/practice/listen/compare.test.js`
Expected: FAIL — `Failed to resolve import "./compare.js"`.

- [ ] **Step 5: Реализация**

`src/practice/listen/compare.js`:

```js
// Сверка ответа с прозвучавшим — порт data/jtslisten.html (letters, lev, toks,
// forms, containsTarget, compareSentence, missingWords). Семантику сверяет
// оракул (__fixtures__/oracle.json, scripts/extract-listen-oracle.js): красный
// compare.test.js значит, что разъехался порт, а не прототип.
//
// Одно расхождение — исправление: SYN и IRR прототипа читались по любому
// ключу, и слово «constructor» доставало из них функцию Object (проверка
// предложения падала). Здесь — только собственные ключи таблиц.

export const letters = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '')
export const enMain = (s) => String(s).split('|')[0]
export const first = (s) => String(s).split('/')[0]

const own = (table, key) => (Object.hasOwn(table, key) ? table[key] : undefined)

/** Расстояние Левенштейна — по буквам (строки) и по словам (массивы). */
export function lev(a, b) {
  const m = a.length
  const n = b.length
  const d = []
  for (let i = 0; i <= m; i++) d[i] = [i]
  for (let j = 1; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
  }
  return d[m][n]
}

// Сокращения раскрываются до сравнения: «I've» и «I have» — один ответ.
const CONTR = [
  [/\bwon't\b/g, 'will not'], [/\bcan't\b/g, 'can not'], [/\bcannot\b/g, 'can not'], [/\bshan't\b/g, 'shall not'],
  [/n't\b/g, ' not'], [/'re\b/g, ' are'], [/'ve\b/g, ' have'], [/'ll\b/g, ' will'], [/'d\b/g, ' would'],
  [/\bi'm\b/g, 'i am'], [/\b(it|he|she|there|what|that|where|who|here)'s\b/g, '$1 is'], [/\blet's\b/g, 'let us'],
  [/s'\s/g, 's '],
]

// Синонимы и варианты написания, которые на слух не различить.
const SYN = {
  mum: 'mum', mom: 'mum', mother: 'mum', mommy: 'mum', dad: 'dad', father: 'dad', daddy: 'dad', movie: 'film',
  movies: 'films', soccer: 'football', neighbor: 'neighbour', neighbors: 'neighbours', apologized: 'apologised',
  apologize: 'apologise', apologizes: 'apologises', grandpa: 'grandfather', grandad: 'grandfather',
  granddad: 'grandfather', large: 'big', really: 'very', proven: 'proved', color: 'colour',
  ads: 'advertisements', adverts: 'advertisements', cafe: 'cafe', kids: 'children', shoes: 'shoes',
}

// Неправильные формы: «went» засчитывается за «go».
const IRR = {
  be: ['am', 'is', 'are', 'was', 'were', 'been'], have: ['has', 'had', 'having'], go: ['went', 'gone', 'goes'],
  do: ['did', 'done', 'does'], get: ['got', 'gotten'], see: ['saw', 'seen'], make: ['made'], say: ['said'],
  take: ['took', 'taken'], come: ['came'], give: ['gave', 'given'], meet: ['met'], buy: ['bought'],
  eat: ['ate', 'eaten'], find: ['found'], know: ['knew', 'known'], leave: ['left'], sleep: ['slept'],
  swim: ['swam', 'swum'], try: ['tried'], write: ['wrote', 'written'], speak: ['spoke', 'spoken'],
  drive: ['drove', 'driven'], ride: ['rode', 'ridden'], run: ['ran'], sing: ['sang', 'sung'], draw: ['drew', 'drawn'],
  feel: ['felt'], think: ['thought'], bring: ['brought'], teach: ['taught'], cut: ['cut'], put: ['put'], sit: ['sat'],
  stand: ['stood'], lose: ['lost'], spend: ['spent'], send: ['sent'], lend: ['lent'], pay: ['paid'], tell: ['told'],
  hear: ['heard'], wear: ['wore', 'worn'], grow: ['grew', 'grown'], sell: ['sold'], win: ['won'],
  learn: ['learnt', 'learned'], fly: ['flew', 'flown'], begin: ['began', 'begun'], choose: ['chose', 'chosen'],
  forget: ['forgot', 'forgotten'], build: ['built'], catch: ['caught'], keep: ['kept'], understand: ['understood'],
  child: ['children'],
}

/** Ответ → слова: без диакритики, регистра, пунктуации, с раскрытыми сокращениями и синонимами. */
export function toks(s) {
  let t = String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\u2019`]/g, "'")
  for (const [r, v] of CONTR) t = t.replace(r, v)
  return t
    .replace(/[^a-z0-9' ]/g, ' ')
    .replace(/'/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((x) => own(SYN, x) || x)
}

/** Формы слова, которые засчитываются за него: studies, studied, bigger, children… */
export function forms(w) {
  const f = new Set([w, w + 's', w + 'es', w + 'ed', w + 'd', w + 'ing', w + 'er', w + 'est', w + 'ly'])
  if (w.endsWith('e')) {
    f.add(w.slice(0, -1) + 'ing')
    f.add(w + 'r')
    f.add(w + 'st')
  }
  if (/[^aeiou]y$/.test(w)) {
    const s = w.slice(0, -1)
    for (const x of ['ies', 'ied', 'ier', 'iest', 'ily']) f.add(s + x)
  }
  if (/^[^aeiou]*[aeiou][bdgmnprt]$/.test(w)) {
    const d = w + w.slice(-1)
    for (const x of ['ed', 'ing', 'er', 'est']) f.add(d + x)
  }
  if (w.endsWith('ise')) {
    const z = w.slice(0, -3) + 'ize'
    for (const x of [z, z + 's', z + 'd', z.slice(0, -1) + 'ing']) f.add(x)
  }
  for (const x of own(IRR, w) || []) f.add(x)
  return f
}

/** Есть ли в ответе целевое слово или фраза (с формами; во фразе допускаются вставки). */
export function containsTarget(raw, en) {
  const t = toks(raw)
  return String(en).split('|').some((v) => {
    const parts = toks(v)
    if (parts.length === 1) return t.some((x) => forms(parts[0]).has(x) || forms(own(SYN, parts[0]) || parts[0]).has(x))
    for (let s = 0; s < t.length; s++) {
      if (!forms(parts[0]).has(t[s])) continue
      let p = 1
      let k = s + 1
      while (k < t.length && p < parts.length && k - s <= parts.length + 3) {
        if (forms(parts[p]).has(t[k])) p++
        k++
      }
      if (p === parts.length) return true
    }
    return false
  })
}

/** Ближайший из вариантов (через «||»): {ref, rt, d — ошибок в словах, rel — доля}. */
export function compareSentence(raw, refs) {
  const u = toks(raw)
  let best = null
  for (const r of String(refs).split('||')) {
    const rt = toks(r)
    const d = lev(u, rt)
    const rel = d / Math.max(rt.length, 1)
    if (!best || rel < best.rel) best = { ref: r, rt, d, rel }
  }
  return best
}

/** Слова образца, которых нет в ответе — для подсказки «не хватает: …». */
export function missingWords(raw, ref) {
  const u = new Set(toks(raw))
  return toks(ref).filter((t) => !u.has(t))
}
```

- [ ] **Step 6: Прогнать тест**

Run: `npx vitest run src/practice/listen/compare.test.js`
Expected: PASS (8 тестов; 15 234 строки оракула без расхождений — проверено при составлении плана).

- [ ] **Step 7: Commit**

```bash
git add scripts/extract-listen-oracle.js src/practice/listen/compare.js src/practice/listen/compare.test.js src/practice/listen/__fixtures__/oracle.json
git commit -m "feat(listen): сверка ответа — порт прототипа с оракулом

toks/forms/containsTarget/compareSentence считает сам прототип
(scripts/extract-listen-oracle.js), порт сверяется с ним. Исправлено одно:
SYN/IRR по унаследованному ключу «constructor» роняли проверку.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Прогоны и правила (`runs.js`, `rules.js`)

**Files:**
- Create: `src/practice/listen/runs.js`, `src/practice/listen/rules.js`
- Test: `src/practice/listen/runs.test.js`, `src/practice/listen/rules.test.js`

**Interfaces:**
- Consumes: `compare.js` (Task 1).
- Produces (`runs.js`): `PART=12`, `TEST_SIZE=20`, `UNIT_REVIEW_SIZE=15`, `REVIEW_LESSON_SIZE=20`; `parts(w)`, `shuffle(a, rnd)`, `sample(a, n, rnd)`, `setWords(set)`; `buildRuns(set) → { test: Run, units: [{ u, title, review: Run|null, lessons: [{ l, t, g, words, review, fromL?, toL?, runs: Run[] }] }] }`; `Run = { key, kind: 'test'|'unit'|'lesson'|'review', u?, l?, part?, parts?, title, words, size? }`; `makeDeck(entries, rnd) → Card[]`; `runDeck(run, rnd) → Card[]`; `Card = { en, ru, exEn, exRu, note }`; `parseOwnList(text) → string[][]`.
- Produces (`rules.js`): `HINTS_PER_TEST=3`, `SHOWS_PER_TEST=3`, `TRIES=2`; `wordTarget(en)`; `judgeWord(typed, en) → 'ok'|'near'|'bad'`; `wordCoins(tries, hintsUsed)`; `sentenceCoins(tries, hinted)`; `hasSentence(card)`; `sentenceRef(card)`; `judgeSentence(raw, card) → { ok, near, distance, ref, missing, reason }`; `isBetter(next, best)`; `coinsToCredit(earned, best, keyed)`.

- [ ] **Step 1: Написать падающие тесты прогонов**

`src/practice/listen/runs.test.js`:

```js
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildRuns, makeDeck, parseOwnList, parts, runDeck, sample } from './runs.js'

const O = JSON.parse(readFileSync(new URL('./__fixtures__/oracle.json', import.meta.url), 'utf8'))
const W = (en, s = `I like ${en}.`) => [en, 'перевод', s, 'Перевод предложения.', '']
// Детерминированная «случайность» для воспроизводимых колод.
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length] }

const SET = {
  id: 'A0',
  name: 'Beginner',
  units: [
    { u: 1, title: 'You and me', lessons: [
      { l: 1, t: 'Family', g: '', w: Array.from({ length: 14 }, (_, k) => W(`w${k}`)) },
      { l: 2, t: 'Things', g: 'Plurals', w: [W('book'), W('pen')] },
      { l: 3, t: 'Review', g: '', w: [] },
    ] },
    { u: 2, title: '', lessons: [{ l: 4, t: 'Food', g: '', w: [W('apple')] }] },
  ],
}

describe('части урока', () => {
  it('совпадают с прототипом для 1…40 слов', () => {
    for (const [n, sizes] of O.parts) expect(parts(Array.from({ length: n }, (_, k) => k)).map((p) => p.length), String(n)).toEqual(sizes)
  })
})

describe('buildRuns', () => {
  const runs = buildRuns(SET)

  it('тест уровня — 20 случайных из всего набора', () => {
    expect(runs.test).toMatchObject({ key: 'A0-T', kind: 'test', size: 20 })
    expect(runs.test.words).toHaveLength(17)
  })

  it('«Повторить юнит» — 15 из слов юнита', () => {
    expect(runs.units[0].review).toMatchObject({ key: 'A0-U1', kind: 'unit', size: 15 })
    expect(runs.units[0].review.words).toHaveLength(16)
  })

  it('урок длиннее 12 слов делится на части с ключами L<n>-<часть>', () => {
    const l1 = runs.units[0].lessons[0]
    expect(l1.runs.map((r) => [r.key, r.words.length, r.parts])).toEqual([['A0-L1-0', 7, 2], ['A0-L1-1', 7, 2]])
    expect(runs.units[0].lessons[1].runs.map((r) => r.key)).toEqual(['A0-L2-0'])
  })

  it('пустой урок — повторение уроков после прошлого повторения', () => {
    const rev = runs.units[0].lessons[2]
    expect(rev).toMatchObject({ review: true, fromL: 1, toL: 2 })
    expect(rev.runs[0]).toMatchObject({ key: 'A0-L3-R', kind: 'review', size: 20 })
    expect(rev.runs[0].words).toHaveLength(16)
  })
})

describe('колода', () => {
  it('карточки с обрезанными полями и отброшенными вариантами без целевого слова', () => {
    const deck = makeDeck([[' book ', ' книга ', 'This is my book.||Nice day.||A book here.', 'Это моя книга.', undefined]], () => 0)
    expect(deck).toEqual([{ en: 'book', ru: 'книга', exEn: 'This is my book.||A book here.', exRu: 'Это моя книга.', note: '' }])
  })

  it('прогон с size берёт случайную выборку, без size — все слова', () => {
    const r = { words: [W('a1'), W('b1'), W('c1')], size: 2 }
    expect(runDeck(r, seq(0.1, 0.9))).toHaveLength(2)
    expect(runDeck({ words: r.words }, seq(0.5))).toHaveLength(3)
    expect(sample([1, 2, 3, 4], 2, () => 0)).toHaveLength(2)
  })
})

describe('свой список', () => {
  it('строки «english - русский - sentence - предложение», пустые и без перевода отброшены', () => {
    expect(parseOwnList('apple - яблоко - I eat an apple. - Я ем яблоко.\nbig – большой\n\nbad\nfast\tбыстро')).toEqual([
      ['apple', 'яблоко', 'I eat an apple.', 'Я ем яблоко.'],
      ['big', 'большой'],
      ['fast', 'быстро'],
    ])
  })
})
```

- [ ] **Step 2: Написать падающие тесты правил**

`src/practice/listen/rules.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { coinsToCredit, isBetter, judgeSentence, judgeWord, sentenceCoins, wordCoins } from './rules.js'

const card = (en, exEn = '', exRu = exEn ? 'перевод' : '') => ({ en, ru: 'x', exEn, exRu, note: '' })

describe('слово', () => {
  it('верно — по любому варианту, «почти» — 1–2 буквы, иначе неверно', () => {
    expect(judgeWord('wakeup', 'get up|wake up')).toBe('ok')
    expect(judgeWord('mothr', 'mother')).toBe('near')
    expect(judgeWord('mther', 'mother')).toBe('near')
    expect(judgeWord('fatherr', 'mother')).toBe('bad')
  })

  it('монеты по таблице ТЗ: 10 / 5 / 2, подсказки считаются нажатиями', () => {
    expect(wordCoins(1, 0)).toBe(10)
    expect(wordCoins(2, 0)).toBe(5)
    expect(wordCoins(1, 1)).toBe(5)
    expect(wordCoins(1, 2)).toBe(2)
  })
})

describe('предложение', () => {
  it('до 6 слов — без ошибок, длиннее — одна', () => {
    const short = card('book', 'This is my book.')
    expect(judgeSentence('this is my book', short).ok).toBe(true)
    expect(judgeSentence('this is a book', short)).toMatchObject({ ok: false, near: true, distance: 1 })
    const long = card('bread', 'We bought bread and milk on the way home.')
    expect(judgeSentence('We bought bread and milk on way home', long).ok).toBe(true)
  })

  it('без целевого слова — «используй слово», даже если остальное совпало', () => {
    expect(judgeSentence('This is my pen', card('book', 'This is my book.'))).toMatchObject({ ok: false, reason: 'needWord' })
  })

  it('«не хватает» — только когда пропущено 1–2 слова', () => {
    expect(judgeSentence('My mother is teacher', card('mother', 'My mother is a teacher.')).missing).toEqual(['a'])
    expect(judgeSentence('mother', card('mother', 'My mother is a teacher.')).missing).toEqual([])
  })

  it('своё предложение: слово, от 4 слов, без кириллицы', () => {
    const own = card('apple')
    expect(judgeSentence('I eat an apple', own).ok).toBe(true)
    expect(judgeSentence('apple is red', own)).toMatchObject({ ok: false, reason: 'minWords' })
    expect(judgeSentence('I eat a pear', own)).toMatchObject({ ok: false, reason: 'needWord' })
    expect(judgeSentence('I eat an apple сегодня', own).ok).toBe(false)
  })

  it('монеты: с первой попытки без подсказки 15, иначе 8', () => {
    expect(sentenceCoins(1, false)).toBe(15)
    expect(sentenceCoins(2, false)).toBe(8)
    expect(sentenceCoins(1, true)).toBe(8)
  })
})

describe('лучший результат и баланс', () => {
  it('лучше — больше монет, при равенстве больше верных', () => {
    expect(isBetter({ coins: 30, ok: 2 }, null)).toBe(true)
    expect(isBetter({ coins: 30, ok: 2 }, { coins: 25, ok: 3 })).toBe(true)
    expect(isBetter({ coins: 30, ok: 3 }, { coins: 30, ok: 2 })).toBe(true)
    expect(isBetter({ coins: 30, ok: 2 }, { coins: 30, ok: 2 })).toBe(false)
  })

  it('в баланс — только прирост к лучшему, прогон без ключа — 0', () => {
    expect(coinsToCredit(50, null, true)).toBe(50)
    expect(coinsToCredit(50, { coins: 30 }, true)).toBe(20)
    expect(coinsToCredit(20, { coins: 30 }, true)).toBe(0)
    expect(coinsToCredit(50, null, false)).toBe(0)
  })
})
```

- [ ] **Step 3: Убедиться, что тесты падают**

Run: `npx vitest run src/practice/listen/runs.test.js src/practice/listen/rules.test.js`
Expected: FAIL — нет модулей `./runs.js`, `./rules.js`.

- [ ] **Step 4: `runs.js`**

`src/practice/listen/runs.js`:

```js
// Прогоны набора Just Listen It — как levelScreen() и start() прототипа: части
// урока, урок-повторение, «Повторить юнит», тест уровня. Случайность приходит
// аргументом (rnd), чтобы прогон воспроизводился в тестах.

import { containsTarget } from './compare.js'

export const PART = 12
export const TEST_SIZE = 20
export const UNIT_REVIEW_SIZE = 15
export const REVIEW_LESSON_SIZE = 20

/** Урок длиннее PART слов — на части поровну (как parts() прототипа). */
export function parts(w) {
  const n = Math.ceil(w.length / PART)
  if (n <= 1) return [w]
  const size = Math.ceil(w.length / n)
  const out = []
  for (let i = 0; i < w.length; i += size) out.push(w.slice(i, i + size))
  return out
}

export function shuffle(a, rnd = Math.random) {
  const b = a.slice()
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

export const sample = (a, n, rnd = Math.random) => shuffle(a, rnd).slice(0, n)

export const setWords = (set) => set.units.flatMap((u) => u.lessons.flatMap((l) => l.w))

/**
 * Прогоны набора. Run: { key, kind: 'test'|'unit'|'lesson'|'review', u?, l?, part?, parts?, title, words, size? }.
 * size — сколько слов взять случайно (тесты и повторения); без него — все слова части.
 */
export function buildRuns(set) {
  const all = set.units.flatMap((u) => u.lessons)
  const test = { key: `${set.id}-T`, kind: 'test', title: set.name, words: setWords(set), size: TEST_SIZE }
  const units = set.units.map((u) => {
    const words = u.lessons.flatMap((l) => l.w)
    const review = words.length
      ? { key: `${set.id}-U${u.u}`, kind: 'unit', u: u.u, title: u.title || '', words, size: UNIT_REVIEW_SIZE }
      : null
    return { u: u.u, title: u.title || '', review, lessons: u.lessons.map((l) => lessonRuns(set.id, all, l)) }
  })
  return { test, units }
}

function lessonRuns(setId, all, l) {
  const base = { l: l.l, t: l.t, g: l.g || '', words: l.w }
  if (!l.w.length) {
    // Пустой урок — повторение: пул уроков после прошлого повторения.
    const idx = all.indexOf(l)
    let from = idx - 1
    while (from >= 0 && all[from].w.length) from--
    const pool = all.slice(from + 1, idx).flatMap((x) => x.w)
    const run = { key: `${setId}-L${l.l}-R`, kind: 'review', l: l.l, title: l.t, words: pool, size: REVIEW_LESSON_SIZE }
    return { ...base, review: true, fromL: all[from + 1]?.l, toL: all[idx - 1]?.l, runs: [run] }
  }
  const ps = parts(l.w)
  const runs = ps.map((p, pi) => ({
    key: `${setId}-L${l.l}-${pi}`, kind: 'lesson', l: l.l, part: pi, parts: ps.length, title: l.t, words: p,
  }))
  return { ...base, review: false, runs }
}

/**
 * Карточки прогона, как start() прототипа: перемешаны, лишние варианты
 * предложения без целевого слова отброшены (первый — звучит — остаётся всегда).
 */
export function makeDeck(entries, rnd = Math.random) {
  return shuffle(entries, rnd).map(([en, ru, exEn, exRu, note]) => {
    const word = String(en).trim()
    const variants = String(exEn || '').split('||').map((s) => s.trim())
    return {
      en: word,
      ru: String(ru || '').trim(),
      exEn: variants.filter((s, i) => s && (i === 0 || containsTarget(s, word))).join('||'),
      exRu: String(exRu || '').trim(),
      note: String(note || '').trim(),
    }
  })
}

export function runDeck(run, rnd = Math.random) {
  return makeDeck(run.size ? sample(run.words, run.size, rnd) : run.words, rnd)
}

/** «Свой список» преподавателя: строка «english - русский - sentence - предложение». */
export function parseOwnList(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.split(/\s+[-–—]\s+|\t/).map((s) => s.trim()))
    .filter((r) => r[0] && r[1])
}
```

- [ ] **Step 5: `rules.js`**

`src/practice/listen/rules.js`:

```js
// Правила проверки и награды Just Listen It — из checkWord/checkSentence/
// finishSentence прототипа и таблицы ТЗ «Подсказки, монеты, прогресс».

import { compareSentence, containsTarget, enMain, letters, lev, missingWords } from './compare.js'

export const HINTS_PER_TEST = 3
export const SHOWS_PER_TEST = 3
export const TRIES = 2
const OWN_MIN_WORDS = 4

export const wordTarget = (en) => letters(enMain(en))

/** Слово целиком: 'ok' | 'near' (ошибка в 1–2 буквы — не засчитывается) | 'bad'. */
export function judgeWord(typed, en) {
  const variants = String(en).split('|').map(letters)
  if (variants.includes(typed)) return 'ok'
  return variants.some((t) => lev(typed, t) <= Math.max(1, Math.floor(t.length / 5))) ? 'near' : 'bad'
}

/**
 * Монеты слова по ТЗ: с первой попытки без подсказок — 10, со второй или с
 * одной подсказкой — 5, несколько подсказок — 2. Считаем НАЖАТИЯ подсказки:
 * прототип считал открытые буквы вместе с верно набранным началом, и одна
 * подсказка после трёх верных букв стоила как «несколько».
 */
export function wordCoins(tries, hintsUsed) {
  if (hintsUsed === 0 && tries === 1) return 10
  return hintsUsed < 2 ? 5 : 2
}

/** Предложение: с первой попытки без подсказки — 15, иначе — 8. */
export function sentenceCoins(tries, hinted) {
  return tries === 1 && !hinted ? 15 : 8
}

export const hasSentence = (card) => !!(card.exEn && card.exRu)
export const sentenceRef = (card) => (card.exEn ? card.exEn.split('||')[0] : '')

/**
 * Ответ на шаге 2. Диктант сверяется с ПЕРВЫМ вариантом — он и звучит: до 6
 * слов — без ошибок, длиннее — одна. Без образца (свой список) — своё
 * предложение: целевое слово, от 4 слов, без кириллицы.
 * → { ok, near, distance, ref, missing, reason: null | 'needWord' | 'minWords' }
 */
export function judgeSentence(raw, card) {
  const hasTarget = containsTarget(raw, card.en)
  if (!hasSentence(card)) {
    const ok = hasTarget && raw.split(/\s+/).length >= OWN_MIN_WORDS && !/[а-яё]/i.test(raw)
    return { ok, near: false, distance: null, ref: '', missing: [], reason: ok ? null : hasTarget ? 'minWords' : 'needWord' }
  }
  const b = compareSentence(raw, sentenceRef(card))
  const limit = b.rt.length <= 6 ? 0 : 1
  const miss = missingWords(raw, b.ref)
  return {
    ok: hasTarget && b.d <= limit,
    near: hasTarget && b.d <= limit + 2,
    distance: b.d,
    ref: b.ref,
    missing: miss.length && miss.length <= 2 ? miss : [],
    reason: hasTarget ? null : 'needWord',
  }
}

/** Лучше ли результат: больше монет, при равенстве — больше верных. */
export function isBetter(next, best) {
  if (!best) return true
  return next.coins > best.coins || (next.coins === best.coins && next.ok > best.ok)
}

/**
 * Монеты теста в баланс — только прирост к лучшему результату прогона
 * (решение владельца 21.10.2026): иначе «Пройти заново» — бесконечная ферма.
 * Прогон без ключа («Повторить ошибки», «Свой список») монет не даёт.
 */
export function coinsToCredit(earned, best, keyed) {
  if (!keyed) return 0
  return Math.max(0, earned - (best?.coins || 0))
}
```

- [ ] **Step 6: Прогнать тесты**

Run: `npx vitest run src/practice/listen/runs.test.js src/practice/listen/rules.test.js`
Expected: PASS (runs 9, rules 9).

- [ ] **Step 7: Commit**

```bash
git add src/practice/listen/runs.js src/practice/listen/runs.test.js src/practice/listen/rules.js src/practice/listen/rules.test.js
git commit -m "feat(listen): прогоны набора и правила монет

Части урока по 12, тест 20, повторение юнита 15, урок-повторение — как
в прототипе. Монеты по ТЗ; в баланс — только прирост к лучшему.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Машина теста `ListenSession`

**Files:**
- Create: `src/practice/listen/session.js`
- Test: `src/practice/listen/session.test.js`

**Interfaces:**
- Consumes: `compare.js`, `rules.js` (Tasks 1–2); `Card` из `runs.js`.
- Produces: `new ListenSession({ cards, onSay(text, kind: 'word'|'sentence'), onItem(result), onDone(summary) })`; `subscribe(fn)`, `getSnapshot()`; действия `typeWord(v)`, `submitWord()`, `hintLetter()`, `showWord()`, `typeSentence(v)`, `submitSentence()`, `hintSentence()`, `showSentence()`, `next()`, `summary()`.
- Снимок: `{ phase: 'task'|'result', index, total, hintsLeft, showsLeft, earned, item, summary }`; `item = { card, target, step: 'word'|'sent'|'done', typed, wordTries, revealed, hintsUsed, wordMark: null|'ok'|'near'|'bad'|'shown', wordFeedback, wordOk, wordAns, sentence, sentTries, sentHinted, sentMark: null|'bad'|'ok', sentFeedback, sentOk }`.
- `wordFeedback`: `{kind:'ok', coins}` | `{kind:'near'|'bad', retry:true}` | `{kind:'shown', typed}`.
- `sentFeedback`: `{kind:'hint', text}` | `{kind:'ownHint'}` | `{kind:'near'|'bad', reason, missing, own}` | `{kind:'ok', coins, exact, ref, ru}` | `{kind:'answer', ref, ru}`.
- `summary = { n, wordsOk, sentencesOk, ok, accuracy, earned, wrong: Card[], items: [{ card, wordOk, wordAns, sentOk, sentAns }] }`.

- [ ] **Step 1: Написать падающий тест**

`src/practice/listen/session.test.js`:

```js
import { describe, expect, it, vi } from 'vitest'
import { ListenSession } from './session.js'

const MOTHER = { en: 'mother', ru: 'мама', exEn: 'My mother is a teacher.', exRu: 'Моя мама — учитель.', note: '' }
const GETUP = { en: 'get up', ru: 'вставать', exEn: 'I get up at seven.', exRu: 'Я встаю в семь.', note: '' }
const APPLE = { en: 'apple', ru: 'яблоко', exEn: '', exRu: '', note: '' }

function make(cards = [MOTHER, GETUP]) {
  const said = []
  const onItem = vi.fn()
  const onDone = vi.fn()
  const s = new ListenSession({ cards, onSay: (t, k) => said.push(`${k}:${t}`), onItem, onDone })
  return { s, said, onItem, onDone, snap: () => s.getSnapshot() }
}

describe('слово', () => {
  it('набрал все буквы — проверка сразу; верно с первой без подсказок — 10 и шаг 2', () => {
    const { s, said, snap } = make()
    s.typeWord('Moth3er')
    expect(snap().item).toMatchObject({ step: 'sent', wordOk: true, wordMark: 'ok', wordFeedback: { kind: 'ok', coins: 10 } })
    expect(snap().earned).toBe(10)
    expect(said).toEqual(['word:mother'])
  })

  it('фраза с пробелом — ячейки только под буквы', () => {
    const { s, snap } = make([GETUP])
    expect(snap().item.target).toBe('getup')
    s.typeWord('getup')
    expect(snap().item.wordOk).toBe(true)
  })

  it('две ошибки — ответ показан без траты лимита, монет за слово нет', () => {
    const { s, snap } = make()
    s.typeWord('mothex')
    expect(snap().item).toMatchObject({ step: 'word', wordMark: 'near', wordFeedback: { kind: 'near', retry: true } })
    s.typeWord('fatherz')
    expect(snap().item).toMatchObject({ step: 'sent', wordOk: false, typed: 'mother', wordMark: 'shown' })
    expect(snap().item.wordFeedback).toEqual({ kind: 'shown', typed: 'father' })
    expect(snap().showsLeft).toBe(3)
    expect(snap().earned).toBe(0)
  })

  it('подсказка открывает следующую букву, сохраняя верное начало; монеты по нажатиям', () => {
    const { s, snap } = make()
    s.typeWord('mox')
    s.hintLetter()
    expect(snap().item).toMatchObject({ typed: 'mot', revealed: 3, hintsUsed: 1 })
    expect(snap().hintsLeft).toBe(2)
    s.typeWord('mother')
    expect(snap().item.wordFeedback).toEqual({ kind: 'ok', coins: 5 })
  })

  it('«Показать ответ» тратит лимит; на нуле — не срабатывает', () => {
    const { s, snap } = make([MOTHER, MOTHER, MOTHER, MOTHER])
    for (let i = 0; i < 3; i++) {
      s.showWord()
      s.typeSentence('My mother is a teacher')
      s.submitSentence()
      s.next()
    }
    expect(snap().showsLeft).toBe(0)
    s.showWord()
    expect(snap().item.step).toBe('word')
  })
})

describe('предложение', () => {
  it('верно с первой — 15, образец и перевод в отклике; звучит образец', () => {
    const { s, said, snap, onItem } = make()
    s.typeWord('mother')
    s.typeSentence('my mother is a teacher')
    s.submitSentence()
    expect(snap().item.sentFeedback).toEqual({ kind: 'ok', coins: 15, exact: true, ref: 'My mother is a teacher.', ru: 'Моя мама — учитель.' })
    expect(snap().earned).toBe(25)
    expect(said.at(-1)).toBe('sentence:My mother is a teacher.')
    expect(onItem).toHaveBeenCalledWith(expect.objectContaining({ wordOk: true, sentOk: true }))
  })

  it('ошибка — «почти» и «не хватает», вторая ошибка — правильный ответ', () => {
    const { s, snap } = make()
    s.typeWord('mother')
    s.typeSentence('My mother is teacher')
    s.submitSentence()
    expect(snap().item.sentFeedback).toEqual({ kind: 'near', reason: null, missing: ['a'], own: false })
    s.typeSentence('My father is a doctor')
    s.submitSentence()
    expect(snap().item).toMatchObject({ step: 'done', sentOk: false, sentFeedback: { kind: 'answer', ref: 'My mother is a teacher.' } })
  })

  it('подсказка — первая треть образца, одна на задание; после неё 8 монет', () => {
    const { s, snap } = make()
    s.typeWord('mother')
    s.hintSentence()
    s.hintSentence()
    expect(snap().item.sentFeedback).toEqual({ kind: 'hint', text: 'My mother' })
    expect(snap().hintsLeft).toBe(2)
    s.typeSentence('My mother is a teacher.')
    s.submitSentence()
    expect(snap().item.sentFeedback.coins).toBe(8)
  })

  it('без образца — своё предложение со словом', () => {
    const { s, snap } = make([APPLE])
    s.typeWord('apple')
    s.typeSentence('apple')
    s.submitSentence()
    expect(snap().item.sentFeedback).toMatchObject({ kind: 'bad', reason: 'minWords', own: true })
    s.typeSentence('I eat an apple every day')
    s.submitSentence()
    expect(snap().item).toMatchObject({ step: 'done', sentOk: true })
  })
})

describe('итог', () => {
  it('после последнего «Дальше» — итог с ошибками и onDone', () => {
    const { s, snap, onDone } = make()
    s.typeWord('mother')
    s.typeSentence('My mother is a teacher.')
    s.submitSentence()
    s.next()
    s.showWord()
    s.showSentence()
    s.next()
    expect(snap().phase).toBe('result')
    expect(snap().summary).toMatchObject({ n: 2, wordsOk: 1, sentencesOk: 1, ok: 1, accuracy: 50, earned: 25 })
    expect(snap().summary.wrong.map((c) => c.en)).toEqual(['get up'])
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ n: 2, earned: 25 }))
  })

  it('«Дальше» до ответа не листает', () => {
    const { s, snap } = make()
    s.next()
    expect(snap().index).toBe(0)
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/practice/listen/session.test.js`
Expected: FAIL — нет `./session.js`.

- [ ] **Step 3: Реализация**

`src/practice/listen/session.js`:

```js
// Машина теста Just Listen It вне React — порт item()/checkWord()/hintLetter()/
// revealWord()/toSentence()/checkSentence()/finishSentence()/result() прототипа
// без DOM и звука. Экран подписан через useSyncExternalStore (subscribe /
// getSnapshot); что сказать вслух, сессия сообщает колбэком onSay, а таймеры
// автоплея и сам звук — у экрана.

import { enMain, letters } from './compare.js'
import {
  HINTS_PER_TEST, SHOWS_PER_TEST, TRIES, hasSentence, judgeSentence, judgeWord, sentenceCoins, sentenceRef,
  wordCoins, wordTarget,
} from './rules.js'

function newItem(card) {
  return {
    card,
    target: wordTarget(card.en),
    step: 'word', // word → sent → done
    typed: '',
    wordTries: 0,
    revealed: 0, // открытые подсказкой буквы (подсветка ячеек)
    hintsUsed: 0, // нажатия «Подсказать букву» (монеты)
    wordMark: null, // ok | near | bad | shown — цвет ячеек
    wordFeedback: null,
    wordOk: false,
    wordAns: '',
    sentence: '',
    sentTries: 0,
    sentHinted: false,
    sentMark: null, // bad | ok
    sentFeedback: null,
    sentOk: false,
  }
}

export class ListenSession {
  constructor({ cards, onSay = () => {}, onItem = () => {}, onDone = () => {} }) {
    this.cards = cards
    this.onSay = onSay
    this.onItem = onItem
    this.onDone = onDone
    this.listeners = new Set()
    this.index = 0
    this.hintsLeft = HINTS_PER_TEST
    this.showsLeft = SHOWS_PER_TEST
    this.earned = 0
    this.results = []
    this.phase = cards.length ? 'task' : 'result'
    this.item = cards.length ? newItem(cards[0]) : null
    this.publish()
  }

  subscribe = (fn) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getSnapshot = () => this.snap

  // Новый объект на каждое изменение: useSyncExternalStore сравнивает снимки по ссылке.
  publish() {
    this.snap = {
      phase: this.phase,
      index: this.index,
      total: this.cards.length,
      hintsLeft: this.hintsLeft,
      showsLeft: this.showsLeft,
      earned: this.earned,
      item: this.item && { ...this.item },
      summary: this.phase === 'result' ? this.summary() : null,
    }
    for (const fn of this.listeners) fn()
  }

  /** Лимит на весь тест; на нуле кнопка неактивна. */
  useLimit(kind) {
    const key = kind === 'hint' ? 'hintsLeft' : 'showsLeft'
    if (this[key] <= 0) return false
    this[key]--
    return true
  }

  // ---------- шаг 1: слово ----------

  typeWord(value) {
    const it = this.item
    if (!it || it.step !== 'word') return
    it.typed = letters(value).slice(0, it.target.length)
    it.wordMark = null
    this.publish()
    if (it.typed.length === it.target.length) this.checkWord()
  }

  submitWord() {
    const it = this.item
    if (it && it.step === 'word' && it.typed.length) this.checkWord()
  }

  checkWord() {
    const it = this.item
    it.wordTries++
    const verdict = judgeWord(it.typed, it.card.en)
    if (verdict === 'ok') {
      const coins = wordCoins(it.wordTries, it.hintsUsed)
      this.earned += coins
      Object.assign(it, { wordOk: true, wordAns: it.typed, wordMark: 'ok', wordFeedback: { kind: 'ok', coins } })
      this.onSay(enMain(it.card.en), 'word')
      return this.toSentence()
    }
    it.wordMark = verdict
    if (it.wordTries < TRIES) {
      it.wordFeedback = { kind: verdict, retry: true }
      return this.publish()
    }
    return this.revealWord(it.typed)
  }

  /** Открывает следующую букву: верно набранное начало сохраняется. */
  hintLetter() {
    const it = this.item
    if (!it || it.step !== 'word' || !this.useLimit('hint')) return
    let p = 0
    while (p < it.typed.length && it.typed[p] === it.target[p]) p++
    it.hintsUsed++
    it.revealed = Math.min(Math.max(it.revealed, p) + 1, it.target.length)
    it.typed = it.target.slice(0, it.revealed)
    it.wordMark = null
    this.publish()
    if (it.revealed >= it.target.length) this.checkWord()
  }

  showWord() {
    const it = this.item
    if (it && it.step === 'word' && this.useLimit('show')) this.revealWord(null)
  }

  // Показ после двух ошибок лимит не тратит — зовётся из checkWord напрямую.
  revealWord(typed) {
    const it = this.item
    Object.assign(it, {
      wordOk: false,
      wordAns: typed || '—',
      typed: it.target,
      wordMark: 'shown',
      wordFeedback: { kind: 'shown', typed: typed || null },
    })
    this.onSay(enMain(it.card.en), 'word')
    this.toSentence()
  }

  toSentence() {
    this.item.step = 'sent'
    this.publish()
  }

  // ---------- шаг 2: предложение ----------

  typeSentence(value) {
    const it = this.item
    if (!it || it.step !== 'sent') return
    it.sentence = String(value)
    it.sentMark = null
    this.publish()
  }

  submitSentence() {
    const it = this.item
    const raw = it?.sentence.trim()
    if (!raw || it.step !== 'sent') return
    it.sentTries++
    const j = judgeSentence(raw, it.card)
    if (j.ok) return this.finishSentence(true, raw, j)
    if (it.sentTries < TRIES) {
      it.sentMark = 'bad'
      it.sentFeedback = { kind: j.near ? 'near' : 'bad', reason: j.reason, missing: j.missing, own: !hasSentence(it.card) }
      return this.publish()
    }
    return this.finishSentence(false, raw, j)
  }

  /** Подсказка шага 2 — одна на задание: первая треть образца или совет для своего предложения. */
  hintSentence() {
    const it = this.item
    if (!it || it.step !== 'sent' || it.sentHinted || !this.useLimit('hint')) return
    it.sentHinted = true
    if (hasSentence(it.card)) {
      const words = sentenceRef(it.card).split(' ')
      it.sentFeedback = { kind: 'hint', text: words.slice(0, Math.ceil(words.length / 3)).join(' ') }
    } else {
      it.sentFeedback = { kind: 'ownHint' }
    }
    this.publish()
  }

  showSentence() {
    const it = this.item
    if (it && it.step === 'sent' && this.useLimit('show')) this.finishSentence(false, it.sentence.trim() || '—', null)
  }

  finishSentence(ok, raw, judged) {
    const it = this.item
    const ref = sentenceRef(it.card)
    it.step = 'done'
    it.sentOk = ok
    it.sentMark = ok ? 'ok' : 'bad'
    if (ok) {
      const coins = sentenceCoins(it.sentTries, it.sentHinted)
      this.earned += coins
      it.sentFeedback = { kind: 'ok', coins, exact: judged?.distance === 0, ref, ru: it.card.exRu }
      this.onSay(ref || raw, 'sentence')
    } else {
      it.sentFeedback = { kind: 'answer', ref, ru: it.card.exRu }
      if (ref) this.onSay(ref, 'sentence')
    }
    const result = { card: it.card, wordOk: it.wordOk, wordAns: it.wordAns, sentOk: ok, sentAns: raw }
    this.results.push(result)
    this.onItem(result)
    this.publish()
  }

  next() {
    if (!this.item || this.item.step !== 'done') return
    this.index++
    if (this.index < this.cards.length) {
      this.item = newItem(this.cards[this.index])
      return this.publish()
    }
    this.phase = 'result'
    this.item = null
    this.publish()
    this.onDone(this.summary())
  }

  summary() {
    const n = this.results.length
    const wordsOk = this.results.filter((r) => r.wordOk).length
    const sentencesOk = this.results.filter((r) => r.sentOk).length
    return {
      n,
      wordsOk,
      sentencesOk,
      ok: this.results.filter((r) => r.wordOk && r.sentOk).length,
      accuracy: n ? Math.round(((wordsOk + sentencesOk) / (2 * n)) * 100) : 0,
      earned: this.earned,
      wrong: this.results.filter((r) => !(r.wordOk && r.sentOk)).map((r) => r.card),
      items: this.results,
    }
  }
}
```

- [ ] **Step 4: Прогнать тест**

Run: `npx vitest run src/practice/listen/session.test.js`
Expected: PASS (11 тестов).

- [ ] **Step 5: Commit**

```bash
git add src/practice/listen/session.js src/practice/listen/session.test.js
git commit -m "feat(listen): машина теста вне React (слово → предложение → итог)

Лимиты 3+3 на тест, показ после двух ошибок лимит не тратит, монеты по ТЗ.
Звук — колбэком onSay: таймеры автоплея у экрана.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Прогресс `listen` в синке Практики

**Files:**
- Create: `src/practice/listen/listenProgress.js`
- Test: `src/practice/listen/listenProgress.test.js`
- Modify: `src/practice/practiceKeys.js`, `src/practice/practiceSyncCore.js`, `src/practice/practiceSync.js`, `src/lib/practiceContract.js`, `src/lib/db/studentActivity.js`, `src/lib/assistant/tracker.js`, `src/lib/assistant/prompt.js`
- Modify tests: `tests/practice-contract.spec.js`, `tests/practice-sync-core.spec.js`, `src/practice/practiceSync.test.js`

**Interfaces:**
- Consumes: `createProgressStore` (`src/practice/progressStore.js`), `isBetter` (Task 2).
- Produces: `LISTEN_KEY = 'jts_listen_done'`, `LISTEN_OWN_KEY = 'jts_listen_own'`, `LISTEN_PROGRESS_EVENT = 'listen-progress'`; `readBest() → { [key]: { ok, n, coins } }`; `recordBest(key, { ok, n, coins }) → boolean`; `mergeListen(a, b)`; `doneLessons(best, setId) → number`; модуль синка `'listen'` (объект, replace на сервере, сведение merge на клиенте).

- [ ] **Step 1: Написать падающий тест прогресса**

`src/practice/listen/listenProgress.test.js`:

```js
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LISTEN_KEY, LISTEN_PROGRESS_EVENT } from '../practiceKeys.js'

// Синк — сеть, в юните его глушим: проверяем сам прогресс.
const pushModule = vi.fn()
vi.mock('../practiceSync.js', () => ({ pushModule: (...a) => pushModule(...a) }))

const { doneLessons, mergeListen, readBest, recordBest } = await import('./listenProgress.js')

beforeEach(() => {
  localStorage.clear()
  pushModule.mockClear()
})
afterEach(() => localStorage.clear())

describe('лучшие результаты', () => {
  it('битый и чужой формы стейт — пусто, неверные записи отброшены', () => {
    expect(readBest()).toEqual({})
    localStorage.setItem(LISTEN_KEY, JSON.stringify({ best: {
      'A1-L3-0': { ok: 5, n: 6, coins: 110 },
      'A1-T': { ok: 9, n: 6, coins: 10 },
      'bad key': { ok: 1, n: 1, coins: 1 },
      'A1-U2': { ok: 1, n: 2, coins: -5 },
    } }))
    expect(readBest()).toEqual({ 'A1-L3-0': { ok: 5, n: 6, coins: 110 } })
  })

  it('пишет только лучший результат, шлёт синк и будит экран', () => {
    const woke = vi.fn()
    window.addEventListener(LISTEN_PROGRESS_EVENT, woke)
    expect(recordBest('A0-L1-0', { ok: 3, n: 4, coins: 60 })).toBe(true)
    expect(recordBest('A0-L1-0', { ok: 2, n: 4, coins: 40 })).toBe(false)
    expect(recordBest('A0-L1-0', { ok: 4, n: 4, coins: 100 })).toBe(true)
    window.removeEventListener(LISTEN_PROGRESS_EVENT, woke)
    expect(readBest()['A0-L1-0']).toEqual({ ok: 4, n: 4, coins: 100 })
    expect(woke).toHaveBeenCalledTimes(2)
    expect(pushModule).toHaveBeenCalledWith('listen', { best: { 'A0-L1-0': { ok: 4, n: 4, coins: 100 } } })
  })

  it('сведение двух устройств — лучший по каждому ключу', () => {
    const a = { best: { 'A0-T': { ok: 10, n: 20, coins: 200 }, 'A0-U1': { ok: 1, n: 15, coins: 20 } } }
    const b = { best: { 'A0-T': { ok: 12, n: 20, coins: 180 }, 'B2-L1-1': { ok: 2, n: 2, coins: 50 } } }
    expect(mergeListen(a, b).best).toEqual({
      'A0-T': { ok: 10, n: 20, coins: 200 },
      'A0-U1': { ok: 1, n: 15, coins: 20 },
      'B2-L1-1': { ok: 2, n: 2, coins: 50 },
    })
  })

  it('урок пройден, если у любой его части есть результат; тесты и повторения не в счёт', () => {
    const best = { 'A1-L3-1': { ok: 1, n: 6, coins: 10 }, 'A1-L3-0': { ok: 1, n: 6, coins: 10 }, 'A1-L4-0': { ok: 1, n: 6, coins: 10 }, 'A1-L5-R': { ok: 1, n: 1, coins: 1 }, 'A1-T': { ok: 1, n: 1, coins: 1 }, 'A10-L1-0': { ok: 1, n: 1, coins: 1 } }
    expect(doneLessons(best, 'A1')).toBe(2)
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/practice/listen/listenProgress.test.js`
Expected: FAIL — нет `LISTEN_KEY` / `./listenProgress.js`.

- [ ] **Step 3: Ключи**

В `src/practice/practiceKeys.js` после блока `NUMBERS_LANG_KEY`:

```js
// Лучшие результаты Just Listen It: { best: { <ключ прогона>: { ok, n, coins } } },
// ключ — как в прототипе без префикса режима: A1-L3-0 (часть урока), A1-L4-R
// (урок-повторение), A1-U2 (повторить юнит), A1-T (тест), business-T. Replace со
// сведением merge (listenProgress.js): лучший результат с любого устройства не теряется.
export const LISTEN_KEY = 'jts_listen_done'
// «Свой список» преподавателя — текст поля этого устройства. Не синкается, но
// чистится вместе с прогрессом: на общей машине список достался бы следующему.
export const LISTEN_OWN_KEY = 'jts_listen_own'
```

и после `NUMBERS_PROGRESS_EVENT`:

```js
export const LISTEN_PROGRESS_EVENT = 'listen-progress'
```

- [ ] **Step 4: Модуль прогресса**

`src/practice/listen/listenProgress.js`:

```js
'use client'

// Прогресс Just Listen It — лучший результат каждого прогона (часть урока,
// повторение, тест). По нему считаются «пройдено уроков» в меню и монеты в
// баланс: начисляется только прирост к лучшему (rules.js, coinsToCredit).
//
// Хранение — общее хранилище «Практики» (память + черновик + сервер, replace,
// см. progressStore.js) со сведением merge: лучший результат, полученный на
// телефоне, не перезапишется худшим черновиком ноутбука. Если два устройства
// открыты одновременно, запись одного до следующей загрузки затирает другое —
// тот же компромисс, что у «Чисел». В домашнюю работу раздел не отчитывается:
// area 'listen' бэкенду неизвестна.

import { LISTEN_KEY as KEY, LISTEN_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore } from '../progressStore.js'
import { isBetter } from './rules.js'

const RUN_KEY = /^[A-Za-z0-9_-]{1,32}-(?:T|U\d{1,3}|L\d{1,3}-(?:R|\d{1,3}))$/
const MAX = 1e6

const emptyState = () => ({ best: {} })
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
const count = (x) => (Number.isInteger(x) && x >= 0 && x <= MAX ? x : null)

function normEntry(e) {
  if (!isObj(e)) return null
  const ok = count(e.ok)
  const n = count(e.n)
  const coins = count(e.coins)
  if (ok === null || n === null || coins === null || n === 0 || ok > n) return null
  return { ok, n, coins }
}

// Стейт мог приехать с сервера, от старой версии или быть побитым: берём только
// записи известной формы.
export function normalize(raw) {
  const out = emptyState()
  if (!isObj(raw) || !isObj(raw.best)) return out
  for (const [key, e] of Object.entries(raw.best)) {
    const entry = RUN_KEY.test(key) ? normEntry(e) : null
    if (entry) out.best[key] = entry
  }
  return out
}

/** Сведение двух копий: по каждому прогону — лучший результат. */
export function mergeListen(a, b) {
  const x = normalize(a)
  const y = normalize(b)
  const best = { ...x.best }
  for (const [key, e] of Object.entries(y.best)) if (isBetter(e, best[key])) best[key] = e
  return { best }
}

const store = createProgressStore({
  module: 'listen',
  key: KEY,
  event: EVENT,
  empty: emptyState,
  normalize,
  merge: (server, local) => mergeListen(server, local),
})

export function readBest() {
  return store.read().best
}

/** Записывает результат, если он лучше прежнего. true — записан. */
export function recordBest(key, result) {
  const entry = RUN_KEY.test(key) ? normEntry(result) : null
  if (!entry) return false
  const state = normalize(store.read())
  if (!isBetter(entry, state.best[key])) return false
  state.best[key] = entry
  store.write(state)
  return true
}

/** Сколько уроков набора пройдено: у урока есть результат хотя бы одной части. */
export function doneLessons(best, setId) {
  const prefix = `${setId}-`
  const lessons = new Set()
  for (const key of Object.keys(best)) {
    if (!key.startsWith(prefix)) continue
    const m = /^L(\d+)-\d+$/.exec(key.slice(prefix.length))
    if (m) lessons.add(m[1])
  }
  return lessons.size
}
```

- [ ] **Step 5: Прогнать тест прогресса**

Run: `npx vitest run src/practice/listen/listenProgress.test.js`
Expected: PASS (4 теста).

- [ ] **Step 6: Регистрация модуля в синке**

`src/lib/practiceContract.js` — в комментарий перед `PRACTICE_MODULES` добавить абзац и модуль в список после `'numbers'`:

```js
// 'listen' — стейт-объект Just Listen It {best: {<ключ прогона>: {ok, n, coins}}}.
// Replace; клиент сводит с серверным (listenProgress.js merge), чтобы лучший
// результат не терялся. Area 'listen' бэкенду неизвестна — в домашнюю работу
// раздел не отчитывается.
```

```js
  'numbers',
  'listen',
  'vocabLearned',
```

`src/practice/practiceSyncCore.js` — импорт двух констант (в список импорта из `./practiceKeys.js` после `NUMBERS_KEY,` и `NUMBERS_PROGRESS_EVENT,`):

```js
  LISTEN_KEY,
```
```js
  LISTEN_PROGRESS_EVENT,
```

`OBJECT_MODULES`:

```js
const OBJECT_MODULES = ['vocab', 'writing', 'workbook', 'reading', 'words', 'verbs', 'listenchoose', 'numbers', 'listen', 'vocabLearned', 'vocabMisses']
```

В `applyHydratedState` после блока `numbers`:

```js
  if (serverState.listen && typeof serverState.listen === 'object') {
    setItem(LISTEN_KEY, JSON.stringify(serverState.listen))
    dispatch(LISTEN_PROGRESS_EVENT)
  }
```

`src/practice/practiceSync.js` — в импорт ключей добавить `LISTEN_KEY, LISTEN_OWN_KEY` и в список `clearLocalPractice` после `NUMBERS_LANG_KEY,`:

```js
LISTEN_KEY, LISTEN_OWN_KEY,
```

`src/lib/db/studentActivity.js` — в `PRACTICE_AREA_BY_MODULE` после `numbers`:

```js
  listen: 'listen',
```

`src/lib/assistant/tracker.js` — в `AREA_NAMES` после `numbers`:

```js
  listen: 'Just Listen It',
```

`src/lib/assistant/prompt.js` — в карту экранов после `numbers`:

```js
  listen: 'Практика → Аудирование → Just Listen It (диктант слова и предложения)',
```

- [ ] **Step 7: Обновить тесты регистрации**

`tests/practice-contract.spec.js` — в ожидаемый список `PRACTICE_MODULES` после `'numbers',` добавить `'listen',`; рядом с проверкой `isValidModule('numbers')`:

```js
    expect(isValidModule('listen')).toBe(true)
```

`tests/practice-sync-core.spec.js` — после теста `numbers`:

```js
  test('listen: объект прогресса уходит и приходит целиком', () => {
    const s = { best: { 'A1-L3-0': { ok: 5, n: 6, coins: 110 } } }
    expect(serializeForPush('listen', s)).toBe(s)
    const writes = {}
    const events = []
    applyHydratedState({ listen: s }, { setItem: (k, v) => (writes[k] = v), dispatch: (e) => events.push(e) })
    expect(JSON.parse(writes.jts_listen_done)).toEqual(s)
    expect(events).toEqual(['listen-progress'])
  })
```

`src/practice/practiceSync.test.js` — импорт `LISTEN_KEY, LISTEN_OWN_KEY` из `./practiceKeys.js` и в тест `clearLocalPractice` дописать их в массив `keys`:

```js
    const keys = [READING_KEY, WORDS_KEY, VERBS_KEY, LISTENCHOOSE_KEY, LISTENCHOOSE_RUN_KEY, NUMBERS_KEY, NUMBERS_LANG_KEY, LISTEN_KEY, LISTEN_OWN_KEY]
```

- [ ] **Step 8: Прогнать тесты синка**

```bash
npx vitest run src/practice/listen src/practice/practiceSync.test.js src/lib/db/studentActivity.test.js src/practice/progressQuota.test.js
npx playwright test tests/practice-contract.spec.js tests/practice-sync-core.spec.js
```
Expected: всё зелёное, кроме известного красного `practice-contract:20` (если он ещё красный на develop — сверить, что падает тем же текстом, что до правки).

- [ ] **Step 9: Commit**

```bash
git add src/practice/listen/listenProgress.js src/practice/listen/listenProgress.test.js src/practice/practiceKeys.js src/practice/practiceSyncCore.js src/practice/practiceSync.js src/practice/practiceSync.test.js src/lib/practiceContract.js src/lib/db/studentActivity.js src/lib/assistant/tracker.js src/lib/assistant/prompt.js tests/practice-contract.spec.js tests/practice-sync-core.spec.js
git commit -m "feat(listen): лучшие результаты в синке Практики

Модуль listen: {best} по ключу прогона, replace на сервере, сведение
«лучший по ключу» на клиенте. Ключи чистятся при выходе, раздел виден
кабинету преподавателя и помощнику.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Данные и звук (`api.js`, `voice.js`)

**Files:**
- Modify: `src/api.js` (после `getVocabScope`)
- Create: `src/practice/listen/voice.js`
- Test: `src/practice/listen/voice.test.js`

**Interfaces:**
- Produces: `getListenIndex(token, onFresh)` → `GET /mobile/listen`; `getListenSet(token, id, onFresh)` → `GET /mobile/listen/sets/{id}`; ошибка — `Error` с `status` (404 — не загружено/нет набора).
- Produces (`voice.js`): `SPEED = 0.9`, `SLOW_RATE = 0.75`; `say(text, { kind: 'word'|'sentence', slow })`; `prefetch(text)`; `silence()`.

- [ ] **Step 1: Написать падающий тест звука**

`src/practice/listen/voice.test.js`:

```js
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const playTts = vi.fn()
const prefetchTts = vi.fn()
const stopTts = vi.fn()
vi.mock('../../lib/speech.js', () => ({
  playTts: (...a) => playTts(...a),
  prefetchTts: (...a) => prefetchTts(...a),
  stopTts: (...a) => stopTts(...a),
}))

const { prefetch, say, silence, SLOW_RATE } = await import('./voice.js')

beforeEach(() => {
  playTts.mockReset()
  prefetchTts.mockReset()
  stopTts.mockReset()
  window.speechSynthesis = { cancel: vi.fn(), speak: vi.fn() }
  window.SpeechSynthesisUtterance = function Utterance(text) {
    this.text = text
  }
})

describe('озвучка', () => {
  it('Soniox британским голосом; «Медленнее» — тот же адрес с темпом устройства', () => {
    say('mother')
    say('mother', { slow: true })
    expect(playTts.mock.calls[0]).toEqual(['mother', expect.objectContaining({ voice: 'Freya', lang: 'en', speed: 0.9, rate: 1 })])
    expect(playTts.mock.calls[1][1]).toMatchObject({ voice: 'Freya', speed: 0.9, rate: SLOW_RATE })
  })

  it('синтез не начался — голос устройства en-GB на темпах прототипа', () => {
    say('My mother is a teacher.', { kind: 'sentence', slow: true })
    playTts.mock.calls[0][1].onFail('error')
    const u = window.speechSynthesis.speak.mock.calls[0][0]
    expect(u).toMatchObject({ text: 'My mother is a teacher.', lang: 'en-GB', rate: 0.6 })

    say('book', { kind: 'word', slow: true })
    playTts.mock.calls[1][1].onFail('timeout')
    expect(window.speechSynthesis.speak.mock.calls[1][0].rate).toBe(0.55)
  })

  it('пустой текст молчит; prefetch — те же голос и темп', () => {
    say('')
    expect(playTts).not.toHaveBeenCalled()
    prefetch('book')
    expect(prefetchTts).toHaveBeenCalledWith('book', { voice: 'Freya', lang: 'en', speed: 0.9 })
  })

  it('silence гасит и Soniox, и голос устройства', () => {
    silence()
    expect(stopTts).toHaveBeenCalled()
    expect(window.speechSynthesis.cancel).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/practice/listen/voice.test.js`
Expected: FAIL — нет `./voice.js`.

- [ ] **Step 3: `voice.js`**

`src/practice/listen/voice.js`:

```js
'use client'

// Озвучка Just Listen It. Прототип читал голосом браузера (en-GB), а он разный
// на каждом устройстве, — здесь Soniox через /api/tts британским голосом.
// «Медленнее» — тот же адрес с темпом устройства: нового синтеза не нужно, и
// лимит Soniox (общий с тьютором) не тратится. Звук не начался (лимит, сеть) —
// голос устройства на темпах прототипа: тишина на диктанте хуже робота.

import { playTts, prefetchTts, stopTts } from '../../lib/speech.js'
import { VOICE } from '../../lib/ttsShared.js'

export const SPEED = 0.9
export const SLOW_RATE = 0.75
const TTS = { voice: VOICE.gb, lang: 'en', speed: SPEED }
// Темпы прототипа для голоса устройства: speak(t, .9), «Медленнее» — .55 / .6.
const DEVICE_RATE = 0.9
const DEVICE_SLOW = { word: 0.55, sentence: 0.6 }

function deviceSay(text, rate) {
  try {
    const u = new window.SpeechSynthesisUtterance(text)
    u.lang = 'en-GB'
    u.rate = rate
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch {
    /* синтеза нет — молчим */
  }
}

export function say(text, { kind = 'word', slow = false } = {}) {
  if (!text) return
  playTts(text, {
    ...TTS,
    rate: slow ? SLOW_RATE : 1,
    onFail: () => deviceSay(text, slow ? DEVICE_SLOW[kind] : DEVICE_RATE),
  })
}

/** Заранее попросить запись: следующее слово и предложение задания. */
export function prefetch(text) {
  if (text) prefetchTts(text, TTS)
}

export function silence() {
  stopTts()
  try {
    window.speechSynthesis?.cancel()
  } catch {
    /* синтеза нет */
  }
}
```

- [ ] **Step 4: Клиент API**

В `src/api.js` сразу после `getVocabScope`:

```js
// Just Listen It: оглавление (уровни и направления без слов) и набор целиком.
// Большой набор cachedAuthGet держит только в памяти вкладки (порог
// CATALOG_STORE_MAX_CHARS), в localStorage он вытеснял бы прогресс. 404 у
// оглавления — материалы ещё не загружены через админку.
export function getListenIndex(token, onFresh) {
  return cachedAuthGet('/mobile/listen', token, onFresh)
}

export function getListenSet(token, id, onFresh) {
  return cachedAuthGet(`/mobile/listen/sets/${encodeURIComponent(id)}`, token, onFresh)
}
```

- [ ] **Step 5: Прогнать тесты**

Run: `npx vitest run src/practice/listen/voice.test.js`
Expected: PASS (4 теста).

- [ ] **Step 6: Commit**

```bash
git add src/practice/listen/voice.js src/practice/listen/voice.test.js src/api.js
git commit -m "feat(listen): озвучка через Soniox и клиент /mobile/listen

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Тексты интерфейса (ru / en / kk)

**Files:**
- Modify: `src/i18n.jsx` (три блока — после строки `'practice.numbers.cta'` каждого языка)
- Test: `src/i18n.listen.test.jsx`

**Interfaces:**
- Produces: ключи `practice.listen.*`, `nav.back.listen`, `listen.*` (одинаковый набор в трёх языках). Подстановки — `{name}` через `t(key, vars)`.

- [ ] **Step 1: Написать падающий тест**

`src/i18n.listen.test.jsx`:

```jsx
// Словари Just Listen It — три языка, один набор ключей. `t()` молча
// откатывается на русский, если ключа в языке нет, поэтому пропуск в en/kk
// выглядел бы как «раздел наполовину по-русски», а не как ошибка.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const text = readFileSync(join(here, 'i18n.jsx'), 'utf8').replace(/\r\n/g, '\n')

function block(lang) {
  const start = new RegExp(`^  ${lang}: \\{$`, 'm').exec(text)
  const next = /^ {2}(?:ru|en|kk): \{$/gm
  next.lastIndex = start.index + 1
  const end = next.exec(text)
  return text.slice(start.index, end ? end.index : text.length)
}

const KEY = /^ {4}'((?:listen\.|practice\.listen\.)[^']*|nav\.back\.listen)': (.*),$/gm
const keysOf = (lang) => Object.fromEntries([...block(lang).matchAll(KEY)].map((m) => [m[1], m[2]]))
const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('словари Just Listen It', () => {
  const ru = keysOf('ru')
  const en = keysOf('en')
  const kk = keysOf('kk')

  it('ключи совпадают во всех языках', () => {
    const keys = Object.keys(ru).sort()
    expect(keys.length).toBeGreaterThan(100)
    expect(Object.keys(en).sort()).toEqual(keys)
    expect(Object.keys(kk).sort()).toEqual(keys)
  })

  it('подстановки одинаковы во всех языках', () => {
    for (const k of Object.keys(ru)) {
      expect(vars(en[k]), `en ${k}`).toEqual(vars(ru[k]))
      expect(vars(kk[k]), `kk ${k}`).toEqual(vars(ru[k]))
    }
  })

  it('en и kk переведены, а не скопированы с русского', () => {
    const cyr = /[а-яё]/i
    for (const k of Object.keys(en)) expect(cyr.test(en[k]), `en ${k}`).toBe(false)
    expect(kk['listen.hero.title']).not.toEqual(ru['listen.hero.title'])
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/i18n.listen.test.jsx`
Expected: FAIL — `expected 0 to be greater than 100`.

- [ ] **Step 3: Русский блок**

В `src/i18n.jsx` после строки `    'practice.numbers.cta': 'Играть',` (блок `ru`):

```js
    'practice.listen.heading': 'Just Listen It',
    'practice.listen.desc': 'Слушаешь слово — пишешь по буквам, потом записываешь на слух предложение с ним. Словарь A0–B2 и 16 профессий',
    'practice.listen.cta': 'Начать',
    'nav.back.listen': 'К Just Listen It',
    'listen.title': 'Just Listen It',
    'listen.eyebrow': 'Аудирование и письмо',
    'listen.toPractice': 'В Практику',
    'listen.loading': 'Загружаем…',
    'listen.loadError': 'Не удалось загрузить раздел. Проверь связь и попробуй ещё раз.',
    'listen.retry': 'Ещё раз',
    'listen.notUploaded': 'Раздел готовится: материалы ещё не загружены.',
    'listen.guest': 'Войди в аккаунт, чтобы заниматься в Just Listen It.',
    'listen.hero.title': 'Послушай и напиши',
    'listen.hero.desc': 'Слушаешь слово и пишешь его по буквам. Потом звучит предложение с этим словом — запиши его на слух.',
    'listen.hero.step1': '1. Слово',
    'listen.hero.step2': '2. Предложение',
    'listen.hero.step3': 'Монеты',
    'listen.hero.limits': 'На весь тест: 3 подсказки и 3 показа ответа. Включи звук.',
    'listen.levels.title': 'Выберите уровень',
    'listen.levels.meta': '{units} юнитов · {words} слов',
    'listen.levels.done': 'Пройдено уроков: {done} из {total}',
    'listen.levels.total': 'Весь словарь курсов JTS по урокам: {n} слов, к каждому слову предложение.',
    'listen.fields.title': 'Профессиональная лексика',
    'listen.fields.sub': '{n} направлений · уровни B1, B2, C1 · {words} терминов',
    'listen.fields.meta': '{words} терминов',
    'listen.own.title': 'Свой список слов (для преподавателя)',
    'listen.own.help': 'Одна строка — одно слово: english - русский - English sentence - Русское предложение. Предложения можно не писать: тогда ученик составит своё.',
    'listen.own.label': 'Список слов',
    'listen.own.start': 'Начать по моему списку',
    'listen.own.name': 'Свой список',
    'listen.back.levels': 'Все уровни',
    'listen.back.fields': 'Назад',
    'listen.set.levelMeta': '{units} юнитов · {lessons} уроков · {words} слов',
    'listen.set.fieldMeta': '{units} уровня · {lessons} уроков · {words} терминов',
    'listen.test.level': 'Тест уровня',
    'listen.test.field': 'Тест по направлению',
    'listen.test.levelDesc': '20 случайных слов со всего уровня',
    'listen.test.fieldDesc': '20 случайных терминов со всего направления',
    'listen.unit': 'Unit {u}',
    'listen.unitReview': 'Повторить юнит',
    'listen.lesson': 'Lesson {l}',
    'listen.lessonReview': 'Lesson {l} · Review',
    'listen.reviewDesc': '20 случайных слов из уроков {from}–{to}',
    'listen.words': '{n} слов: {list}',
    'listen.start': 'Начать',
    'listen.part': 'Часть {n}',
    'listen.best': '{coins} · {ok}/{n} верно',
    'listen.quit': 'Выйти',
    'listen.hintsLeft': 'Подсказок осталось',
    'listen.showsLeft': 'Показов ответа осталось',
    'listen.step1': 'Послушай и напиши слово',
    'listen.play.word': 'Послушать слово',
    'listen.play.sentence': 'Послушать предложение',
    'listen.slower': 'Медленнее',
    'listen.word.input': 'Слово на английском',
    'listen.word.hint': 'Подсказать букву',
    'listen.show': 'Показать ответ',
    'listen.word.ok': 'Верно! +{coins}',
    'listen.word.near': 'Почти! Проверь буквы',
    'listen.word.bad': 'Неверно, попробуй ещё раз',
    'listen.word.retry': 'Стирай Backspace и пиши заново',
    'listen.word.shown': 'Правильно: {word}',
    'listen.word.typed': 'Ты написал(а): {typed}',
    'listen.word.remember': 'Запомни это слово — оно вернётся в повторении',
    'listen.step2': 'Послушай и запиши предложение',
    'listen.step2.own': 'Составь своё предложение с этим словом',
    'listen.step2.locked': 'Предложение появится, когда напишешь слово',
    'listen.sent.input': 'Предложение на английском',
    'listen.sent.placeholder': 'Запиши, что слышишь…',
    'listen.sent.placeholderOwn': 'Напиши своё предложение…',
    'listen.sayWord': 'Слово',
    'listen.sent.hint': 'Подсказка',
    'listen.check': 'Проверить',
    'listen.next': 'Дальше',
    'listen.toResult': 'Результат',
    'listen.sent.hintTitle': 'Начало предложения',
    'listen.sent.ownHintTitle': 'Подсказка',
    'listen.sent.ownHint': 'Используй слово {word}, минимум 4 слова. Начни с «I», «My» или «We».',
    'listen.sent.near': 'Почти',
    'listen.sent.bad': 'Неверно',
    'listen.sent.fix': 'Исправь предложение',
    'listen.sent.nearHelp': 'Почти! Проверь порядок слов и мелкие слова (a, the, in, to)',
    'listen.sent.retry': 'Попробуй ещё раз',
    'listen.sent.missing': 'Не хватает:',
    'listen.sent.needWord': 'Используй слово {word}',
    'listen.sent.minWords': 'Минимум 4 английских слова',
    'listen.sent.ok': 'Верно! +{coins}',
    'listen.sent.perfect': 'Идеально! +{coins}',
    'listen.sent.sample': 'Образец: {ref}',
    'listen.sent.translation': 'Перевод: {ru}',
    'listen.sent.answer': 'Правильно',
    'listen.sent.example': 'Пример',
    'listen.result.coins': '+{n} монет',
    'listen.result.credited': 'В баланс: +{n}',
    'listen.result.practiceRun': 'Это тренировка ошибок — монеты в баланс не начисляются',
    'listen.result.noGain': 'Лучший результат не превышен — в баланс +0',
    'listen.result.perfect': 'Все слова и предложения — без ошибок',
    'listen.result.good': 'Хорошая работа',
    'listen.result.again': 'Повтори эти слова ещё раз',
    'listen.result.words': 'слова',
    'listen.result.sentences': 'предложения',
    'listen.result.accuracy': 'точность',
    'listen.result.yourAnswer': 'Твой ответ:',
    'listen.result.redo': 'Повторить ошибки ({n})',
    'listen.result.restart': 'Пройти заново',
    'listen.result.toLevel': 'К темам {id}',
    'listen.result.toField': 'К направлению',
    'listen.result.toMenu': 'В меню',
```

- [ ] **Step 4: Английский блок**

После строки `    'practice.numbers.cta': 'Play',` (блок `en`):

```js
    'practice.listen.heading': 'Just Listen It',
    'practice.listen.desc': 'Hear a word and spell it, then write down a sentence with it by ear. A0–B2 vocabulary and 16 professions',
    'practice.listen.cta': 'Start',
    'nav.back.listen': 'To Just Listen It',
    'listen.title': 'Just Listen It',
    'listen.eyebrow': 'Listening and spelling',
    'listen.toPractice': 'To Practice',
    'listen.loading': 'Loading…',
    'listen.loadError': "Couldn't load the section. Check your connection and try again.",
    'listen.retry': 'Try again',
    'listen.notUploaded': "The section is being prepared: materials haven't been uploaded yet.",
    'listen.guest': 'Sign in to practise in Just Listen It.',
    'listen.hero.title': 'Listen and write',
    'listen.hero.desc': 'Listen to a word and spell it letter by letter. Then a sentence with that word plays — write it down by ear.',
    'listen.hero.step1': '1. Word',
    'listen.hero.step2': '2. Sentence',
    'listen.hero.step3': 'Coins',
    'listen.hero.limits': 'For the whole test: 3 hints and 3 answer reveals. Turn the sound on.',
    'listen.levels.title': 'Choose a level',
    'listen.levels.meta': '{units} units · {words} words',
    'listen.levels.done': 'Lessons done: {done} of {total}',
    'listen.levels.total': 'The whole JTS course vocabulary by lesson: {n} words, each with a sentence.',
    'listen.fields.title': 'Professional vocabulary',
    'listen.fields.sub': '{n} fields · levels B1, B2, C1 · {words} terms',
    'listen.fields.meta': '{words} terms',
    'listen.own.title': 'Your own word list (for teachers)',
    'listen.own.help': 'One line — one word: english - Russian - English sentence - Russian sentence. Sentences are optional: then the student makes up their own.',
    'listen.own.label': 'Word list',
    'listen.own.start': 'Start with my list',
    'listen.own.name': 'Own list',
    'listen.back.levels': 'All levels',
    'listen.back.fields': 'Back',
    'listen.set.levelMeta': '{units} units · {lessons} lessons · {words} words',
    'listen.set.fieldMeta': '{units} levels · {lessons} lessons · {words} terms',
    'listen.test.level': 'Level test',
    'listen.test.field': 'Field test',
    'listen.test.levelDesc': '20 random words from the whole level',
    'listen.test.fieldDesc': '20 random terms from the whole field',
    'listen.unit': 'Unit {u}',
    'listen.unitReview': 'Review unit',
    'listen.lesson': 'Lesson {l}',
    'listen.lessonReview': 'Lesson {l} · Review',
    'listen.reviewDesc': '20 random words from lessons {from}–{to}',
    'listen.words': '{n} words: {list}',
    'listen.start': 'Start',
    'listen.part': 'Part {n}',
    'listen.best': '{coins} · {ok}/{n} correct',
    'listen.quit': 'Quit',
    'listen.hintsLeft': 'Hints left',
    'listen.showsLeft': 'Answer reveals left',
    'listen.step1': 'Listen and write the word',
    'listen.play.word': 'Play the word',
    'listen.play.sentence': 'Play the sentence',
    'listen.slower': 'Slower',
    'listen.word.input': 'Word in English',
    'listen.word.hint': 'Hint a letter',
    'listen.show': 'Show answer',
    'listen.word.ok': 'Correct! +{coins}',
    'listen.word.near': 'Almost! Check the letters',
    'listen.word.bad': 'Wrong, try again',
    'listen.word.retry': 'Delete with Backspace and type again',
    'listen.word.shown': 'Correct: {word}',
    'listen.word.typed': 'You wrote: {typed}',
    'listen.word.remember': "Remember this word — it'll come back in review",
    'listen.step2': 'Listen and write the sentence',
    'listen.step2.own': 'Make up your own sentence with this word',
    'listen.step2.locked': 'The sentence opens once you write the word',
    'listen.sent.input': 'Sentence in English',
    'listen.sent.placeholder': 'Write what you hear…',
    'listen.sent.placeholderOwn': 'Write your own sentence…',
    'listen.sayWord': 'Word',
    'listen.sent.hint': 'Hint',
    'listen.check': 'Check',
    'listen.next': 'Next',
    'listen.toResult': 'Results',
    'listen.sent.hintTitle': 'Start of the sentence',
    'listen.sent.ownHintTitle': 'Hint',
    'listen.sent.ownHint': 'Use the word {word}, at least 4 words. Start with “I”, “My” or “We”.',
    'listen.sent.near': 'Almost',
    'listen.sent.bad': 'Wrong',
    'listen.sent.fix': 'Fix the sentence',
    'listen.sent.nearHelp': 'Almost! Check the word order and small words (a, the, in, to)',
    'listen.sent.retry': 'Try again',
    'listen.sent.missing': 'Missing:',
    'listen.sent.needWord': 'Use the word {word}',
    'listen.sent.minWords': 'At least 4 English words',
    'listen.sent.ok': 'Correct! +{coins}',
    'listen.sent.perfect': 'Perfect! +{coins}',
    'listen.sent.sample': 'Model: {ref}',
    'listen.sent.translation': 'Translation: {ru}',
    'listen.sent.answer': 'Correct answer',
    'listen.sent.example': 'Example',
    'listen.result.coins': '+{n} coins',
    'listen.result.credited': 'To balance: +{n}',
    'listen.result.practiceRun': "This is mistake practice — coins don't go to your balance",
    'listen.result.noGain': 'Best result not beaten — +0 to balance',
    'listen.result.perfect': 'All words and sentences without mistakes',
    'listen.result.good': 'Good job',
    'listen.result.again': 'Practise these words again',
    'listen.result.words': 'words',
    'listen.result.sentences': 'sentences',
    'listen.result.accuracy': 'accuracy',
    'listen.result.yourAnswer': 'Your answer:',
    'listen.result.redo': 'Redo mistakes ({n})',
    'listen.result.restart': 'Start over',
    'listen.result.toLevel': 'To {id} topics',
    'listen.result.toField': 'To the field',
    'listen.result.toMenu': 'To menu',
```

- [ ] **Step 5: Казахский блок**

После строки `    'practice.numbers.cta': 'Ойнау',` (блок `kk`):

```js
    'practice.listen.heading': 'Just Listen It',
    'practice.listen.desc': 'Сөзді тыңдап, әріппен жаз, сосын онымен келген сөйлемді естігеніңше жаз. A0–B2 сөздігі және 16 мамандық',
    'practice.listen.cta': 'Бастау',
    'nav.back.listen': 'Just Listen It-ке',
    'listen.title': 'Just Listen It',
    'listen.eyebrow': 'Тыңдалым және жазу',
    'listen.toPractice': 'Практикаға',
    'listen.loading': 'Жүктелуде…',
    'listen.loadError': 'Бөлім жүктелмеді. Байланысты тексеріп, қайталап көр.',
    'listen.retry': 'Қайталау',
    'listen.notUploaded': 'Бөлім дайындалып жатыр: материалдар әлі жүктелмеген.',
    'listen.guest': 'Just Listen It-те оқу үшін аккаунтқа кір.',
    'listen.hero.title': 'Тыңда да жаз',
    'listen.hero.desc': 'Сөзді тыңдап, оны әріппен жазасың. Сосын осы сөзбен сөйлем естіледі — оны естігеніңше жаз.',
    'listen.hero.step1': '1. Сөз',
    'listen.hero.step2': '2. Сөйлем',
    'listen.hero.step3': 'Тиындар',
    'listen.hero.limits': 'Бүкіл тестке: 3 кеңес және жауапты 3 рет көру. Дыбысты қос.',
    'listen.levels.title': 'Деңгейді таңда',
    'listen.levels.meta': '{units} юнит · {words} сөз',
    'listen.levels.done': 'Өтілген сабақтар: {total} ішінен {done}',
    'listen.levels.total': 'JTS курстарының бүкіл сөздігі сабақтар бойынша: {n} сөз, әр сөзге сөйлем.',
    'listen.fields.title': 'Кәсіби лексика',
    'listen.fields.sub': '{n} бағыт · B1, B2, C1 деңгейлері · {words} термин',
    'listen.fields.meta': '{words} термин',
    'listen.own.title': 'Өз сөздер тізімі (оқытушыға)',
    'listen.own.help': 'Бір жол — бір сөз: english - орысша - English sentence - орысша сөйлем. Сөйлемдерді жазбауға болады: онда оқушы өз сөйлемін құрастырады.',
    'listen.own.label': 'Сөздер тізімі',
    'listen.own.start': 'Менің тізімім бойынша бастау',
    'listen.own.name': 'Өз тізімі',
    'listen.back.levels': 'Барлық деңгейлер',
    'listen.back.fields': 'Артқа',
    'listen.set.levelMeta': '{units} юнит · {lessons} сабақ · {words} сөз',
    'listen.set.fieldMeta': '{units} деңгей · {lessons} сабақ · {words} термин',
    'listen.test.level': 'Деңгей тесті',
    'listen.test.field': 'Бағыт бойынша тест',
    'listen.test.levelDesc': 'Бүкіл деңгейден кездейсоқ 20 сөз',
    'listen.test.fieldDesc': 'Бүкіл бағыттан кездейсоқ 20 термин',
    'listen.unit': 'Unit {u}',
    'listen.unitReview': 'Юнитті қайталау',
    'listen.lesson': 'Lesson {l}',
    'listen.lessonReview': 'Lesson {l} · Review',
    'listen.reviewDesc': '{from}–{to} сабақтардан кездейсоқ 20 сөз',
    'listen.words': '{n} сөз: {list}',
    'listen.start': 'Бастау',
    'listen.part': '{n}-бөлім',
    'listen.best': '{coins} · {n} ішінен {ok} дұрыс',
    'listen.quit': 'Шығу',
    'listen.hintsLeft': 'Қалған кеңестер',
    'listen.showsLeft': 'Жауапты көрудің қалғаны',
    'listen.step1': 'Тыңда да сөзді жаз',
    'listen.play.word': 'Сөзді тыңдау',
    'listen.play.sentence': 'Сөйлемді тыңдау',
    'listen.slower': 'Баяуырақ',
    'listen.word.input': 'Ағылшынша сөз',
    'listen.word.hint': 'Әріп көмегі',
    'listen.show': 'Жауапты көрсету',
    'listen.word.ok': 'Дұрыс! +{coins}',
    'listen.word.near': 'Сәл қалды! Әріптерді тексер',
    'listen.word.bad': 'Қате, тағы көр',
    'listen.word.retry': 'Backspace-пен өшіріп, қайта жаз',
    'listen.word.shown': 'Дұрысы: {word}',
    'listen.word.typed': 'Сен жаздың: {typed}',
    'listen.word.remember': 'Бұл сөзді есте сақта — ол қайталауда тағы келеді',
    'listen.step2': 'Тыңда да сөйлемді жаз',
    'listen.step2.own': 'Осы сөзбен өз сөйлеміңді құрастыр',
    'listen.step2.locked': 'Сөзді жазғанда сөйлем ашылады',
    'listen.sent.input': 'Ағылшынша сөйлем',
    'listen.sent.placeholder': 'Естігеніңді жаз…',
    'listen.sent.placeholderOwn': 'Өз сөйлеміңді жаз…',
    'listen.sayWord': 'Сөз',
    'listen.sent.hint': 'Кеңес',
    'listen.check': 'Тексеру',
    'listen.next': 'Әрі қарай',
    'listen.toResult': 'Нәтиже',
    'listen.sent.hintTitle': 'Сөйлемнің басы',
    'listen.sent.ownHintTitle': 'Кеңес',
    'listen.sent.ownHint': '{word} сөзін қолдан, кемінде 4 сөз. «I», «My» немесе «We» сөзінен баста.',
    'listen.sent.near': 'Сәл қалды',
    'listen.sent.bad': 'Қате',
    'listen.sent.fix': 'Сөйлемді түзет',
    'listen.sent.nearHelp': 'Сәл қалды! Сөз ретін және шағын сөздерді тексер (a, the, in, to)',
    'listen.sent.retry': 'Тағы көр',
    'listen.sent.missing': 'Жетпей тұр:',
    'listen.sent.needWord': '{word} сөзін қолдан',
    'listen.sent.minWords': 'Кемінде 4 ағылшын сөзі',
    'listen.sent.ok': 'Дұрыс! +{coins}',
    'listen.sent.perfect': 'Тамаша! +{coins}',
    'listen.sent.sample': 'Үлгі: {ref}',
    'listen.sent.translation': 'Аудармасы: {ru}',
    'listen.sent.answer': 'Дұрысы',
    'listen.sent.example': 'Мысал',
    'listen.result.coins': '+{n} тиын',
    'listen.result.credited': 'Балансқа: +{n}',
    'listen.result.practiceRun': 'Бұл — қателерді жаттықтыру, тиындар балансқа түспейді',
    'listen.result.noGain': 'Ең жақсы нәтиже асылмады — балансқа +0',
    'listen.result.perfect': 'Барлық сөздер мен сөйлемдер қатесіз',
    'listen.result.good': 'Жақсы жұмыс',
    'listen.result.again': 'Бұл сөздерді тағы қайтала',
    'listen.result.words': 'сөздер',
    'listen.result.sentences': 'сөйлемдер',
    'listen.result.accuracy': 'дәлдік',
    'listen.result.yourAnswer': 'Сенің жауабың:',
    'listen.result.redo': 'Қателерді қайталау ({n})',
    'listen.result.restart': 'Қайта өту',
    'listen.result.toLevel': '{id} тақырыптарына',
    'listen.result.toField': 'Бағытқа',
    'listen.result.toMenu': 'Мәзірге',
```

- [ ] **Step 6: Прогнать тест**

Run: `npx vitest run src/i18n.listen.test.jsx src/i18n.listenchoose.test.jsx`
Expected: PASS (новый — 3 теста; соседний словарный тест «Слушай и выбирай» не задет: его регэксп ищет `listenchoose.`).

- [ ] **Step 7: Commit**

```bash
git add src/i18n.jsx src/i18n.listen.test.jsx
git commit -m "feat(listen): тексты раздела на трёх языках

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Экран раздела — меню и набор, регистрация в Практике

**Files:**
- Create: `src/screens/ListenPage.jsx`, `src/screens/listen/useListenData.js`, `src/screens/listen/ListenIcons.jsx`, `src/screens/listen/ListenMenu.jsx`, `src/screens/listen/OwnListCard.jsx`, `src/screens/listen/ListenSetView.jsx`
- Create: `src/listen.css` (полностью, вместе со стилями задания и итога — Task 8 их использует)
- Create (заглушка до Task 8): `src/screens/listen/ListenRun.jsx`
- Modify: `src/app/layout.jsx`, `src/styles.css`, `src/App.jsx`, `src/screens/PracticePage.jsx`, `src/screens/practice/practiceTabs.js`, `src/screens/practice/practiceTabs.test.js`, `src/lib/navStack.js`

**Interfaces:**
- Consumes: `getListenIndex/getListenSet` (Task 5), `readBest/recordBest/doneLessons` (Task 4), `buildRuns/runDeck/makeDeck/shuffle/parseOwnList` (Task 2), `coinsToCredit` (Task 2), `silence` (Task 5), `isTeacher` (`src/lib/jwt.js`), `unlockSpeech` (`src/lib/speech.js`), `completeLessonModule` (`src/api.js`), `recordVocabMisses` (`src/screens/vocab/vocabMisses.js`), ключи i18n (Task 6).
- Produces: `ListenPage` (`?screen=listen[&set=<id>]`); `ListenRun` props — `{ cards, owner, run, t, onExit, onRestart, onRedo(cards), onFinish(summary) → { credit, keyed } }` (реализация — Task 8); `useListenIndex(token) → { status: 'loading'|'ready'|'missing'|'error'|'guest', index, retry }`; `useListenSet(token, id) → { status: 'idle'|'loading'|'ready'|'error', set, retry }`.

- [ ] **Step 1: Обновить тест вкладок (падающий)**

В `src/screens/practice/practiceTabs.test.js` добавить:

```js
  it('Just Listen It — во вкладке «Аудирование», до сказок', () => {
    const ids = SKILLS.find((s) => s.key === 'listening').sections.map((sec) => sec.id)
    expect(ids).toContain('justListen')
    expect(ids.indexOf('justListen')).toBeLessThan(ids.indexOf('tales'))
    expect(skillOfModule('listen')).toBe('listening')
  })
```

Run: `npx vitest run src/screens/practice/practiceTabs.test.js`
Expected: FAIL — нет секции `justListen`.

- [ ] **Step 2: Секция в раскладке и баннер**

`src/screens/practice/practiceTabs.js` — во вкладке `listening` после `{ id: 'numbers' },`:

```js
      // Just Listen It (21.10.2026) — диктант слова и предложения; в макете
      // его нет, широкий баннер после «Чисел»: тоже на слух.
      { id: 'justListen', modules: ['listen'] },
```

`src/screens/PracticePage.jsx` — в `renderSection` после `case 'numbers': …`:

```jsx
      case 'justListen':
        return (
          <Banner
            key={sec.id}
            id="sec-listen"
            variant="listen"
            wide
            title={t('practice.listen.heading')}
            desc={t('practice.listen.desc')}
            cta={t('practice.listen.cta')}
            onStart={() => onNav?.('listen')}
          />
        )
```

`src/styles.css` — после строки `.pk-banner--numbers { … }`:

```css
/* Just Listen It в макете тоже нет — акцент раздела (#9047ff) в тёмный фиолетовый. */
.pk-banner--listen { background: linear-gradient(99.4deg, #9047ff 17%, #4b2a9e 95.5%); }
```

Run: `npx vitest run src/screens/practice/practiceTabs.test.js`
Expected: PASS.

- [ ] **Step 3: Стили раздела**

`src/listen.css`:

```css
/* ============================================================
   Just Listen It — диктант слова и предложения в «Практике».
   Классы .jl-*. Палитра — из ТЗ раздела: акцент #9047FF, белые карточки
   с радиусом 24px, кнопки-«пилюли», монеты. Ячейки слова — жирные
   фиолетовые буквы; итог окрашивает их в зелёный / жёлтый / красный.
   Тёмная тема — те же переменные на токенах --dk-* (theme-dark.css).
   ============================================================ */
.jl {
  --jl-violet: #9047ff;
  --jl-violet-600: #7a35e8;
  --jl-soft: #f1e9ff;
  --jl-surface: #fff;
  --jl-surface-2: #f6f2fc;
  --jl-text: #211934;
  --jl-muted: #6f6880;
  --jl-line: #e7e0f1;
  --jl-ok: #17824f;
  --jl-ok-bg: #e6f6ed;
  --jl-near: #9a6200;
  --jl-near-bg: #fff4dc;
  --jl-bad: #c03a46;
  --jl-bad-bg: #ffeff0;
  --jl-gold: #f5b81f;
  --jl-shadow: 0 8px 28px rgba(53, 34, 85, 0.06);

  max-width: 960px;
  margin: 0 auto;
  padding: 10px 24px calc(48px + env(safe-area-inset-bottom));
  color: var(--jl-text);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
html[data-theme="dark"] .jl {
  --jl-violet: var(--dk-acc);
  --jl-violet-600: var(--dk-acc-strong);
  --jl-soft: var(--dk-chip);
  --jl-surface: var(--dk-card);
  --jl-surface-2: var(--dk-chip);
  --jl-text: var(--dk-text);
  --jl-muted: var(--dk-muted);
  --jl-line: var(--dk-line);
  --jl-ok: var(--dk-green);
  --jl-ok-bg: var(--dk-green-tint);
  --jl-near: var(--dk-yellow);
  --jl-near-bg: var(--dk-yellow-tint);
  --jl-bad: var(--dk-red);
  --jl-bad-bg: var(--dk-red-tint);
  --jl-shadow: none;
}
html[data-theme="dark"] .pk-banner--listen {
  background: linear-gradient(99.4deg, var(--dk-acc) 17%, var(--dk-acc-strong) 95.5%);
}

.jl-i { width: 20px; height: 20px; flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.jl-muted { color: var(--jl-muted); font-size: 14px; margin: 0; }
.jl-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }

/* ---------- шапка, карточки, кнопки ---------- */
.jl-top { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.jl-back {
  display: inline-flex; align-items: center; gap: 6px; align-self: flex-start;
  border: 0; background: none; color: var(--jl-violet); font: inherit; font-weight: 700; font-size: 15px;
  cursor: pointer; padding: 6px 0;
}
.jl-crumb b { color: var(--jl-text); font-size: 15px; font-weight: 800; }
.jl-card {
  background: var(--jl-surface);
  border: 1px solid var(--jl-line);
  border-radius: 24px;
  padding: 24px;
  box-shadow: var(--jl-shadow);
}
.jl-ctitle { margin: 0 0 14px; font-size: 20px; font-weight: 800; }
.jl-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 44px; padding: 10px 22px; border-radius: 999px; border: 0;
  background: var(--jl-violet); color: #fff; font: inherit; font-weight: 700; font-size: 15px; cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
}
.jl-btn:hover:not(:disabled) { background: var(--jl-violet-600); }
.jl-btn:active:not(:disabled) { transform: translateY(1px); }
.jl-btn:disabled { opacity: 0.45; cursor: default; }
.jl-btn--ghost { background: var(--jl-soft); color: var(--jl-violet); }
.jl-btn--ghost:hover:not(:disabled) { background: var(--jl-line); }
.jl-btn--sm { min-height: 36px; padding: 6px 16px; font-size: 14px; }
.jl-btn:focus-visible, .jl-tool:focus-visible, .jl-lv:focus-visible, .jl-fld:focus-visible, .jl-back:focus-visible {
  outline: 3px solid var(--jl-violet); outline-offset: 2px;
}
.jl-notice {
  display: flex; flex-wrap: wrap; align-items: center; gap: 12px;
  padding: 18px 20px; border-radius: 16px; background: var(--jl-surface-2); color: var(--jl-muted);
}
.jl-notice--err { background: var(--jl-bad-bg); color: var(--jl-bad); }
.jl-coin {
  display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%;
  background: var(--jl-gold); color: #5a3c00; font-weight: 900; font-size: 12px; flex: none;
}

/* ---------- меню ---------- */
.jl-hero { display: flex; justify-content: space-between; align-items: center; gap: 24px; }
.jl-hero h1 { margin: 6px 0 8px; font-size: 30px; font-weight: 800; }
.jl-hero p { margin: 0; color: var(--jl-muted); line-height: 1.5; }
.jl-eyebrow { color: var(--jl-violet); font-weight: 750; font-size: 12px; letter-spacing: 1.4px; text-transform: uppercase; }
.jl-steps { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 14px; }
.jl-steps span { padding: 6px 12px; border-radius: 999px; background: var(--jl-soft); color: var(--jl-violet); font-weight: 700; font-size: 14px; }
.jl-steps .jl-i { color: var(--jl-muted); width: 16px; height: 16px; }
.jl-demo { display: flex; gap: 6px; flex: none; }
.jl-demo b {
  display: grid; place-items: center; width: 48px; height: 56px; border-radius: 12px;
  border: 2px solid var(--jl-violet); color: var(--jl-violet); font-size: 26px; font-weight: 800; background: var(--jl-surface);
}
.jl-levels { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; margin-bottom: 14px; }
.jl-lv {
  display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left;
  padding: 16px; border-radius: 18px; border: 1px solid var(--jl-line); background: var(--jl-surface-2);
  color: var(--jl-text); font: inherit; cursor: pointer;
}
.jl-lv:hover { border-color: var(--jl-violet); }
.jl-lv small { color: var(--jl-muted); font-size: 13px; }
.jl-code {
  display: inline-grid; place-items: center; min-width: 44px; height: 32px; padding: 0 10px; border-radius: 10px;
  background: var(--jl-violet); color: #fff; font-weight: 800; font-size: 15px;
}
.jl-code--field { background: var(--jl-soft); font-size: 22px; }
.jl-bar { width: 100%; height: 6px; border-radius: 999px; background: var(--jl-line); overflow: hidden; margin-top: 8px; }
.jl-bar i { display: block; height: 100%; background: var(--jl-violet); border-radius: inherit; }
.jl-fcat { margin: 16px 0 10px; font-size: 15px; color: var(--jl-muted); font-weight: 700; }
.jl-fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
.jl-fld {
  display: flex; align-items: center; gap: 12px; text-align: left; padding: 12px 14px; border-radius: 16px;
  border: 1px solid var(--jl-line); background: var(--jl-surface-2); color: var(--jl-text); font: inherit; cursor: pointer;
}
.jl-fld:hover { border-color: var(--jl-violet); }
.jl-fab { font-size: 26px; line-height: 1; }
.jl-fname { display: flex; flex-direction: column; min-width: 0; }
.jl-fname small { color: var(--jl-muted); font-size: 13px; }
.jl-own summary { cursor: pointer; font-weight: 800; font-size: 17px; }
.jl-own p { color: var(--jl-muted); font-size: 14px; line-height: 1.5; }
.jl-own textarea {
  width: 100%; min-height: 140px; padding: 12px; border-radius: 14px; border: 1px solid var(--jl-line);
  background: var(--jl-surface-2); color: var(--jl-text); font: inherit; font-size: 14px; resize: vertical; margin-bottom: 12px;
}

/* ---------- набор ---------- */
.jl-setHead { display: flex; flex-direction: column; gap: 16px; }
.jl-lvhead { display: flex; align-items: center; gap: 14px; }
.jl-lvhead h1 { margin: 0; font-size: 26px; font-weight: 800; }
.jl-lvhead p { margin: 2px 0 0; color: var(--jl-muted); font-size: 14px; }
.jl-unit__h { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.jl-unit__h h2 { margin: 0; font-size: 19px; font-weight: 800; }
.jl-topics { display: flex; flex-direction: column; gap: 10px; }
.jl-topic {
  display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap;
  padding: 14px 16px; border-radius: 16px; background: var(--jl-surface-2);
}
.jl-topic > div:first-child { min-width: 0; flex: 1 1 260px; }
.jl-topic h3 { margin: 2px 0 4px; font-size: 16px; font-weight: 800; }
.jl-topic--rev { background: var(--jl-soft); }
.jl-lnum { color: var(--jl-violet); font-weight: 700; font-size: 13px; }
.jl-words { color: var(--jl-muted); font-size: 13px; overflow-wrap: anywhere; }
.jl-best { display: inline-flex; align-items: center; gap: 6px; margin: 6px 8px 0 0; font-size: 13px; font-weight: 700; color: var(--jl-ok); }
.jl-pbtns { justify-content: flex-end; }

/* ---------- задание ---------- */
.jl-run { display: flex; flex-direction: column; gap: 14px; }
.jl-run__top { display: flex; align-items: center; gap: 12px; }
.jl-x { display: grid; place-items: center; width: 40px; height: 40px; border: 0; border-radius: 50%; background: var(--jl-soft); color: var(--jl-violet); cursor: pointer; flex: none; }
.jl-pbar { flex: 1; height: 10px; border-radius: 999px; background: var(--jl-line); overflow: hidden; }
.jl-pbar i { display: block; height: 100%; background: var(--jl-violet); border-radius: inherit; transition: width 0.3s ease; }
.jl-lims { display: inline-flex; gap: 10px; color: var(--jl-violet); font-weight: 800; }
.jl-lims > span { display: inline-flex; align-items: center; gap: 3px; }
.jl-lims .is-zero { color: var(--jl-muted); opacity: 0.6; }
.jl-coins { display: inline-flex; align-items: center; gap: 6px; font-weight: 800; }
.jl-ex { display: flex; flex-direction: column; gap: 22px; }
.jl-stage { display: flex; flex-direction: column; gap: 14px; }
.jl-stage.is-locked { opacity: 0.55; }
.jl-stage__h { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 18px; }
.jl-n { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: var(--jl-soft); color: var(--jl-violet); font-weight: 800; flex: none; }
.jl-n.is-done { background: var(--jl-ok); color: #fff; }
.jl-n .jl-i { width: 16px; height: 16px; }
.jl-locked { color: var(--jl-muted); padding: 14px 16px; border-radius: 14px; background: var(--jl-surface-2); }
.jl-listen { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.jl-listen small { color: var(--jl-muted); font-size: 13px; }
.jl-play {
  display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; border: 0;
  background: var(--jl-violet); color: #fff; cursor: pointer; flex: none;
}
.jl-play .jl-i { width: 28px; height: 28px; }
.jl-play:hover { background: var(--jl-violet-600); }
.jl-tools { display: flex; flex-wrap: wrap; gap: 8px; }
.jl-tool {
  display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 6px 14px; border-radius: 999px;
  border: 1px solid var(--jl-line); background: var(--jl-surface); color: var(--jl-text); font: inherit; font-size: 14px; font-weight: 650; cursor: pointer;
}
.jl-tool:disabled { opacity: 0.45; cursor: default; }
.jl-tool .jl-i { width: 16px; height: 16px; color: var(--jl-violet); }
.jl-cnt { color: var(--jl-muted); font-weight: 800; }

/* Ячейки слова */
.jl-cells { position: relative; display: flex; flex-wrap: wrap; gap: 14px; padding: 4px 0; cursor: text; }
.jl-grp { display: inline-flex; gap: 6px; }
.jl-cell {
  display: grid; place-items: center; width: 44px; height: 54px; border-radius: 12px;
  border: 2px solid var(--jl-line); background: var(--jl-surface); color: var(--jl-violet);
  font-size: 26px; font-weight: 800; text-transform: lowercase;
}
.jl-cell.is-filled { border-color: var(--jl-violet); }
.jl-cell.is-cur { border-color: var(--jl-violet); box-shadow: 0 0 0 3px var(--jl-soft); }
.jl-cell.is-hint { background: var(--jl-soft); }
.jl-cells--sm .jl-cell { width: 34px; height: 44px; font-size: 21px; border-radius: 10px; }
.jl-cells--xs .jl-cell { width: 26px; height: 36px; font-size: 17px; border-radius: 8px; }
.jl-cells--xs .jl-grp, .jl-cells--sm .jl-grp { gap: 4px; }
.jl-cells.is-ok .jl-cell, .jl-cells.is-shown .jl-cell { border-color: var(--jl-ok); color: var(--jl-ok); background: var(--jl-ok-bg); }
.jl-cells.is-near .jl-cell { border-color: var(--jl-near); color: var(--jl-near); background: var(--jl-near-bg); }
.jl-cells.is-bad .jl-cell { border-color: var(--jl-bad); color: var(--jl-bad); background: var(--jl-bad-bg); }
.jl-cells.is-near, .jl-cells.is-bad { animation: jl-shake 0.4s ease; }
/* Поле набора лежит поверх ячеек прозрачным: на телефоне по нему открывается
   клавиатура, а 16px не дают iOS увеличить страницу при фокусе. */
.jl-cells__input {
  position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; border: 0;
  font-size: 16px; color: transparent; caret-color: transparent; background: transparent;
}
@keyframes jl-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}
@media (prefers-reduced-motion: reduce) {
  .jl-cells.is-near, .jl-cells.is-bad { animation: none; }
}

/* Отклик */
.jl-fb { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 14px; font-size: 14px; line-height: 1.45; }
.jl-fb b { display: block; font-size: 15px; }
.jl-fb__ic { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; color: #fff; flex: none; }
.jl-fb__ic .jl-i { width: 16px; height: 16px; }
.jl-fb--ok { background: var(--jl-ok-bg); color: var(--jl-ok); }
.jl-fb--ok .jl-fb__ic { background: var(--jl-ok); }
.jl-fb--near { background: var(--jl-near-bg); color: var(--jl-near); }
.jl-fb--near .jl-fb__ic { background: var(--jl-near); }
.jl-fb--bad { background: var(--jl-bad-bg); color: var(--jl-bad); }
.jl-fb--bad .jl-fb__ic { background: var(--jl-bad); }
.jl-diff { font-weight: 700; }
.jl-miss { display: inline-block; margin: 0 4px 0 0; padding: 0 6px; border-radius: 6px; background: var(--jl-surface); }

.jl-sent {
  width: 100%; min-height: 96px; padding: 14px; border-radius: 16px; border: 2px solid var(--jl-line);
  background: var(--jl-surface); color: var(--jl-text); font: inherit; font-size: 17px; line-height: 1.45; resize: vertical;
}
.jl-sent:focus { outline: none; border-color: var(--jl-violet); }
.jl-sent.is-bad { border-color: var(--jl-bad); }
.jl-sent.is-ok { border-color: var(--jl-ok); }
.jl-foot { display: flex; justify-content: flex-end; }

/* ---------- итог ---------- */
.jl-result { display: flex; flex-direction: column; align-items: center; gap: 18px; text-align: center; }
.jl-bigcoin { width: 64px; height: 64px; font-size: 30px; }
.jl-result h2 { margin: 0; font-size: 26px; font-weight: 800; }
.jl-result__note { color: var(--jl-violet); font-weight: 700; font-size: 14px; }
.jl-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; max-width: 480px; }
.jl-stat { display: flex; flex-direction: column; padding: 12px; border-radius: 16px; background: var(--jl-surface-2); }
.jl-stat b { font-size: 22px; }
.jl-stat span { color: var(--jl-muted); font-size: 13px; }
.jl-review { display: flex; flex-direction: column; gap: 8px; width: 100%; text-align: left; }
.jl-rv { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; padding: 10px 12px; border-radius: 14px; background: var(--jl-surface-2); }
.jl-rv__d { grid-row: span 2; display: flex; gap: 4px; align-items: flex-start; }
.jl-mark { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; color: #fff; }
.jl-mark .jl-i { width: 14px; height: 14px; }
.jl-mark--y { background: var(--jl-ok); }
.jl-mark--n { background: var(--jl-bad); }
.jl-rv__w { font-weight: 800; }
.jl-rv__w span { color: var(--jl-muted); font-weight: 500; }
.jl-rv__s { color: var(--jl-muted); font-size: 14px; overflow-wrap: anywhere; }
.jl-result .jl-row { justify-content: center; }

/* ---------- телефон ---------- */
@media (max-width: 560px) {
  .jl { padding: 8px 16px calc(32px + env(safe-area-inset-bottom)); gap: 12px; }
  .jl-card { padding: 18px 16px; border-radius: 20px; }
  .jl-hero { flex-direction: column; align-items: flex-start; }
  .jl-hero h1 { font-size: 24px; }
  .jl-demo b { width: 38px; height: 46px; font-size: 21px; }
  .jl-levels { grid-template-columns: repeat(2, 1fr); }
  .jl-fields { grid-template-columns: 1fr; }
  .jl-cell { width: 36px; height: 46px; font-size: 22px; }
  .jl-cells--sm .jl-cell { width: 28px; height: 38px; font-size: 18px; }
  .jl-cells--xs .jl-cell { width: 22px; height: 32px; font-size: 15px; }
  .jl-cells { gap: 10px; }
  .jl-play { width: 56px; height: 56px; }
  .jl-pbtns, .jl-foot .jl-btn { width: 100%; }
  .jl-pbtns .jl-btn { flex: 1; }
}
```

В `src/app/layout.jsx` после `import '../numbers.css'`:

```js
import '../listen.css'
```

- [ ] **Step 4: Иконки и загрузка данных**

`src/screens/listen/ListenIcons.jsx`:

```jsx
// Иконки прототипа Just Listen It (набор I): штрих 2px, цвет — currentColor.

const PATHS = {
  back: <path d="M15 18l-6-6 6-6" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M17 7L7 17M7 7l10 10" />,
  bang: <path d="M12 6v7M12 17.5v.5" />,
  sound: (
    <>
      <path d="M11 5L6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </>
  ),
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />,
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
}

export default function Icon({ name }) {
  return (
    <svg className="jl-i" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  )
}
```

`src/screens/listen/useListenData.js`:

```js
'use client'

// Данные раздела: оглавление и наборы с бэкенда (/mobile/listen…). Перезапрос
// — по ВЛАДЕЛЬЦУ токена, а не по строке: тихое обновление access меняет
// строку каждые несколько минут, и экран набора мигал бы «Загружаем…».

import { useCallback, useEffect, useRef, useState } from 'react'
import { getListenIndex, getListenSet } from '../../api.js'
import { ownerOf } from '../../practice/progressStore.js'

function useLatest(value) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref
}

export function useListenIndex(token) {
  const owner = ownerOf(token)
  const tokenRef = useLatest(token)
  const [state, setState] = useState({ status: token ? 'loading' : 'guest', index: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const tk = tokenRef.current
    if (!tk) {
      setState({ status: 'guest', index: null })
      return undefined
    }
    let alive = true
    setState((s) => (s.index ? s : { status: 'loading', index: null }))
    getListenIndex(tk, (fresh) => alive && setState({ status: 'ready', index: fresh }))
      .then((index) => alive && setState({ status: 'ready', index }))
      .catch((e) => alive && setState({ status: e?.status === 404 ? 'missing' : 'error', index: null }))
    return () => {
      alive = false
    }
  }, [owner, attempt, tokenRef])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, retry }
}

export function useListenSet(token, id) {
  const owner = ownerOf(token)
  const tokenRef = useLatest(token)
  const [state, setState] = useState({ status: 'idle', set: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const tk = tokenRef.current
    if (!tk || !id) {
      setState({ status: 'idle', set: null })
      return undefined
    }
    let alive = true
    setState({ status: 'loading', set: null })
    getListenSet(tk, id, (fresh) => alive && setState({ status: 'ready', set: fresh }))
      .then((set) => alive && setState({ status: 'ready', set }))
      .catch(() => alive && setState({ status: 'error', set: null }))
    return () => {
      alive = false
    }
  }, [owner, id, attempt, tokenRef])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, retry }
}
```

- [ ] **Step 5: Меню и свой список**

`src/screens/listen/OwnListCard.jsx`:

```jsx
'use client'

// «Свой список слов» преподавателя (в прототипе — для всех; по ТЗ ученикам не
// показываем). Список — текст поля этого устройства, на сервер не уходит;
// чистится при выходе вместе с прогрессом (practiceSync.js).

import { useRef, useState } from 'react'
import { LISTEN_OWN_KEY } from '../../practice/practiceKeys.js'
import { parseOwnList } from '../../practice/listen/runs.js'

const PLACEHOLDER = 'apple - яблоко - I eat an apple every day. - Я ем яблоко каждый день.\nbig - большой/огромный'

function readOwn() {
  try {
    return localStorage.getItem(LISTEN_OWN_KEY) || ''
  } catch {
    return ''
  }
}

export default function OwnListCard({ t, onStart }) {
  const [text, setText] = useState(readOwn)
  const ref = useRef(null)
  const start = () => {
    try {
      localStorage.setItem(LISTEN_OWN_KEY, text)
    } catch {
      /* квота — список останется только в поле */
    }
    const rows = parseOwnList(text)
    if (!rows.length) {
      ref.current?.focus()
      return
    }
    onStart(rows)
  }
  return (
    <section className="jl-card">
      <details className="jl-own">
        <summary>{t('listen.own.title')}</summary>
        <p>{t('listen.own.help')}</p>
        <textarea
          ref={ref}
          aria-label={t('listen.own.label')}
          spellCheck={false}
          value={text}
          placeholder={PLACEHOLDER}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="jl-row">
          <button type="button" className="jl-btn" onClick={start}>
            {t('listen.own.start')}
          </button>
        </div>
      </details>
    </section>
  )
}
```

`src/screens/listen/ListenMenu.jsx`:

```jsx
'use client'

// Меню раздела: шапка, уровни A0–B2 с полосой «пройдено уроков», группы
// профессиональных направлений (сейчас открыты всем — решение 21.10.2026) и
// «Свой список» для преподавателя.

import { doneLessons } from '../../practice/listen/listenProgress.js'
import Icon from './ListenIcons.jsx'
import OwnListCard from './OwnListCard.jsx'

export default function ListenMenu({ index, best, teacher, t, onOpen, onOwn }) {
  const levels = index.levels || []
  const fields = index.fields || []
  const total = levels.reduce((a, l) => a + l.words, 0)
  const groups = [...new Set(fields.map((f) => f.group))]
  return (
    <>
      <section className="jl-card jl-hero">
        <div>
          <span className="jl-eyebrow">{t('listen.eyebrow')}</span>
          <h1>{t('listen.hero.title')}</h1>
          <p>{t('listen.hero.desc')}</p>
          <div className="jl-steps">
            <span>{t('listen.hero.step1')}</span>
            <Icon name="arrow" />
            <span>{t('listen.hero.step2')}</span>
            <Icon name="arrow" />
            <span>{t('listen.hero.step3')}</span>
          </div>
          <p className="jl-muted" style={{ marginTop: 12 }}>{t('listen.hero.limits')}</p>
        </div>
        <div className="jl-demo" aria-hidden="true">
          <b>b</b>
          <b>o</b>
          <b>o</b>
          <b>k</b>
        </div>
      </section>

      <section className="jl-card">
        <h2 className="jl-ctitle">{t('listen.levels.title')}</h2>
        <div className="jl-levels">
          {levels.map((l) => {
            const done = doneLessons(best, l.id)
            return (
              <button type="button" key={l.id} className="jl-lv" onClick={() => onOpen(l.id)}>
                <span className="jl-code">{l.id}</span>
                <b>{l.name}</b>
                <small>{t('listen.levels.meta', { units: l.units, words: l.words })}</small>
                <span className="jl-bar" role="img" aria-label={t('listen.levels.done', { done, total: l.lessons })}>
                  <i style={{ width: `${l.lessons ? (done / l.lessons) * 100 : 0}%` }} />
                </span>
              </button>
            )
          })}
        </div>
        <p className="jl-muted">{t('listen.levels.total', { n: total })}</p>
      </section>

      {fields.length > 0 && (
        <section className="jl-card">
          <h2 className="jl-ctitle">{t('listen.fields.title')}</h2>
          <p className="jl-muted">
            {t('listen.fields.sub', { n: fields.length, words: fields.reduce((a, f) => a + f.words, 0) })}
          </p>
          {groups.map((g) => (
            <div key={g}>
              <h3 className="jl-fcat">{g}</h3>
              <div className="jl-fields">
                {fields
                  .filter((f) => f.group === g)
                  .map((f) => (
                    <button type="button" key={f.id} className="jl-fld" onClick={() => onOpen(f.id)}>
                      <span className="jl-fab" aria-hidden="true">{f.icon}</span>
                      <span className="jl-fname">
                        <b>{f.name}</b>
                        <small>{f.ru} · {t('listen.fields.meta', { words: f.words })}</small>
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {teacher && <OwnListCard t={t} onStart={onOwn} />}
    </>
  )
}
```

- [ ] **Step 6: Экран набора**

`src/screens/listen/ListenSetView.jsx`:

```jsx
'use client'

// Набор (уровень или направление): тест на 20, юниты с «Повторить юнит» (15) и
// уроками; урок длиннее 12 слов — кнопки «Часть 1», «Часть 2»… Прогоны строит
// buildRuns — те же ключи, что у лучших результатов.

import { useMemo } from 'react'
import { enMain } from '../../practice/listen/compare.js'
import { buildRuns } from '../../practice/listen/runs.js'
import Icon from './ListenIcons.jsx'

function Best({ b, t }) {
  if (!b) return null
  return (
    <span className="jl-best">
      <span className="jl-coin">J</span>
      {t('listen.best', { coins: b.coins, ok: b.ok, n: b.n })}
    </span>
  )
}

function LessonRow({ lesson: l, best, t, onStart }) {
  if (l.review) {
    const r = l.runs[0]
    return (
      <div className="jl-topic jl-topic--rev">
        <div>
          <span className="jl-lnum">{t('listen.lessonReview', { l: l.l })}</span>
          <h3>{l.t}</h3>
          <div className="jl-words">{t('listen.reviewDesc', { from: l.fromL, to: l.toL })}</div>
          <Best b={best[r.key]} t={t} />
        </div>
        <button type="button" className="jl-btn jl-btn--ghost" onClick={() => onStart(r)}>
          {t('listen.start')}
        </button>
      </div>
    )
  }
  const preview = l.words.slice(0, 8).map((w) => enMain(w[0])).join(', ') + (l.words.length > 8 ? ' …' : '')
  return (
    <div className="jl-topic">
      <div>
        <span className="jl-lnum">
          {t('listen.lesson', { l: l.l })}
          {l.g ? ` · ${l.g}` : ''}
        </span>
        <h3>{l.t}</h3>
        <div className="jl-words">{t('listen.words', { n: l.words.length, list: preview })}</div>
        {l.runs.map((r) => (
          <Best key={r.key} b={best[r.key]} t={t} />
        ))}
      </div>
      <div className="jl-row jl-pbtns">
        {l.runs.map((r, i) => (
          <button key={r.key} type="button" className={`jl-btn${i ? ' jl-btn--ghost' : ''}`} onClick={() => onStart(r)}>
            {l.runs.length > 1 ? t('listen.part', { n: i + 1 }) : t('listen.start')}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ListenSetView({ set, best, t, onBack, onStart }) {
  const field = set.kind === 'field'
  const { test, units } = useMemo(() => buildRuns(set), [set])
  const lessons = units.reduce((a, u) => a + u.lessons.length, 0)
  const unitTitle = (u) =>
    field ? u.title || t('listen.unit', { u: u.u }) : `${t('listen.unit', { u: u.u })}${u.title ? ` · ${u.title}` : ''}`
  return (
    <>
      <button type="button" className="jl-back" onClick={onBack}>
        <Icon name="back" /> {field ? t('listen.back.fields') : t('listen.back.levels')}
      </button>
      <section className="jl-card jl-setHead">
        <div className="jl-lvhead">
          <span className={`jl-code${field ? ' jl-code--field' : ''}`}>{field ? set.icon : set.id}</span>
          <div>
            <h1>{set.name}</h1>
            <p>
              {t(field ? 'listen.set.fieldMeta' : 'listen.set.levelMeta', {
                units: units.length,
                lessons,
                words: test.words.length,
              })}
            </p>
          </div>
        </div>
        <div className="jl-topic">
          <div>
            <h3>{t(field ? 'listen.test.field' : 'listen.test.level')}</h3>
            <div className="jl-words">{t(field ? 'listen.test.fieldDesc' : 'listen.test.levelDesc')}</div>
            <Best b={best[test.key]} t={t} />
          </div>
          <button type="button" className="jl-btn" onClick={() => onStart(test)}>
            {t('listen.start')}
          </button>
        </div>
      </section>
      {units.map((u) => (
        <section className="jl-card" key={u.u}>
          <div className="jl-unit__h">
            <h2>{unitTitle(u)}</h2>
            {u.review && (
              <button type="button" className="jl-btn jl-btn--ghost jl-btn--sm" onClick={() => onStart(u.review)}>
                {t('listen.unitReview')}
              </button>
            )}
          </div>
          <div className="jl-topics">
            {u.lessons.map((l) => (
              <LessonRow key={l.l} lesson={l} best={best} t={t} onStart={onStart} />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
```

- [ ] **Step 7: Страница раздела**

Временная заглушка `src/screens/listen/ListenRun.jsx` (настоящая — в Task 8):

```jsx
'use client'

// Заглушка до Task 8: тест раздела.
export default function ListenRun({ t, onExit }) {
  return (
    <div className="jl-notice">
      <button type="button" className="jl-btn" onClick={onExit}>
        {t('listen.quit')}
      </button>
    </div>
  )
}
```

`src/screens/ListenPage.jsx`:

```jsx
'use client'

// Just Listen It — раздел Практики: слышишь слово и пишешь его по буквам, потом
// записываешь на слух предложение с ним. Порт data/jtslisten.html. Наборы —
// с бэкенда (/mobile/listen; их загружает админка в MinIO), движок —
// src/practice/listen/, экраны — src/screens/listen/.
//
// Экран держит навигацию раздела (меню → набор → тест) и итог теста: монеты в
// баланс (только прирост к лучшему), лучший результат, ошибки в «Словарь».

import { useEffect, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { completeLessonModule } from '../api.js'
import { isTeacher } from '../lib/jwt.js'
import { unlockSpeech } from '../lib/speech.js'
import { readBest, recordBest } from '../practice/listen/listenProgress.js'
import { coinsToCredit } from '../practice/listen/rules.js'
import { enMain, first } from '../practice/listen/compare.js'
import { makeDeck, runDeck, shuffle } from '../practice/listen/runs.js'
import { silence } from '../practice/listen/voice.js'
import { LISTEN_PROGRESS_EVENT } from '../practice/practiceKeys.js'
import { recordVocabMisses } from './vocab/vocabMisses.js'
import { useListenIndex, useListenSet } from './listen/useListenData.js'
import Icon from './listen/ListenIcons.jsx'
import ListenMenu from './listen/ListenMenu.jsx'
import ListenSetView from './listen/ListenSetView.jsx'
import ListenRun from './listen/ListenRun.jsx'

function Notice({ status, t, onRetry }) {
  const text = {
    missing: t('listen.notUploaded'),
    guest: t('listen.guest'),
    error: t('listen.loadError'),
  }[status] || t('listen.loading')
  return (
    <div className={`jl-notice${status === 'error' ? ' jl-notice--err' : ''}`} role="status">
      {text}
      {status === 'error' && (
        <button type="button" className="jl-btn jl-btn--ghost jl-btn--sm" onClick={onRetry}>
          {t('listen.retry')}
        </button>
      )}
    </div>
  )
}

export default function ListenPage({ userName, userLevel, token, onNav, onProfile, onBack, backLabel, initialTarget }) {
  const { t } = useI18n()
  const index = useListenIndex(token)
  const [setId, setSetId] = useState(initialTarget?.set || null)
  const set = useListenSet(token, setId)
  // run: { owner (набор или null у своего списка), run, cards, nonce }
  const [run, setRun] = useState(null)
  const [best, setBest] = useState(readBest)

  useEffect(() => {
    const sync = () => setBest(readBest())
    window.addEventListener(LISTEN_PROGRESS_EVENT, sync)
    return () => {
      window.removeEventListener(LISTEN_PROGRESS_EVENT, sync)
      silence()
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [setId, run?.nonce])

  const start = (owner, r, cards) => {
    unlockSpeech() // в тике нажатия: иначе iPhone не пустит автоплей слова
    setRun({ owner, run: r, cards, nonce: Date.now() })
  }

  // Итог теста: зачисление считается от лучшего ДО записи нового.
  const finish = (summary) => {
    const key = run.run.key
    const prev = key ? readBest()[key] : null
    const credit = coinsToCredit(summary.earned, prev, !!key)
    if (key) recordBest(key, { ok: summary.ok, n: summary.n, coins: summary.earned })
    if (token && credit > 0) completeLessonModule(token, credit).catch(() => {})
    if (token && summary.wrong.length) {
      recordVocabMisses(token, summary.wrong.map((c) => ({ word: enMain(c.en), ru: first(c.ru), kk: '' })))
    }
    return { credit, keyed: !!key }
  }

  const goBack = () => (onBack ? onBack() : onNav?.('practice', { skill: 'listening' }))

  let body
  if (run) {
    body = (
      <ListenRun
        key={run.nonce}
        cards={run.cards}
        owner={run.owner}
        run={run.run}
        t={t}
        onExit={() => setRun(null)}
        onRestart={() => start(run.owner, run.run, run.run.key ? runDeck(run.run) : shuffle(run.cards))}
        onRedo={(cards) => start(run.owner, { key: null, kind: 'redo', title: run.run.title }, shuffle(cards))}
        onFinish={finish}
      />
    )
  } else if (!token) {
    body = <Notice status="guest" t={t} />
  } else if (setId) {
    body =
      set.status === 'ready' ? (
        <ListenSetView
          set={set.set}
          best={best}
          t={t}
          onBack={() => setSetId(null)}
          onStart={(r) => start(set.set, r, runDeck(r))}
        />
      ) : (
        <Notice status={set.status} t={t} onRetry={set.retry} />
      )
  } else if (index.status === 'ready') {
    body = (
      <ListenMenu
        index={index.index}
        best={best}
        teacher={isTeacher(token)}
        t={t}
        onOpen={setSetId}
        onOwn={(rows) => start(null, { key: null, kind: 'own', title: t('listen.own.name') }, makeDeck(rows))}
      />
    )
  } else {
    body = <Notice status={index.status} t={t} onRetry={index.retry} />
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="jl">
        {!run && !setId && (
          <div className="jl-top">
            <button type="button" className="jl-back" onClick={goBack}>
              <Icon name="back" /> {backLabel || t('listen.toPractice')}
            </button>
            <span className="jl-crumb">
              <b>{t('listen.title')}</b>
            </span>
          </div>
        )}
        {body}
      </div>
    </LearningLayout>
  )
}
```

- [ ] **Step 8: Подключить экран в App и навигацию**

`src/App.jsx`:

1. Импорт рядом с `NumbersPage`:

```js
import ListenPage from './screens/ListenPage.jsx'
```

2. В `PERSISTABLE_SCREENS` после `'numbers',`: `'listen',`.

3. Состояние рядом с `listenChooseTarget` (строка ~797):

```js
  const [listenTarget, setListenTarget] = useState(null) // { set? } — уровень или направление Just Listen It
```

4. Диплинк — после блока `if (deepLink === 'listenchoose') { … }`:

```js
    // ?screen=listen&set=A1 — сразу уровень (или направление) Just Listen It:
    // проверить набор по ссылке, не проходя меню.
    if (deepLink === 'listen') {
      const set = searchParams.get('set')
      if (set) setListenTarget({ set })
    }
```

5. `handleNav` — после строки `listenchoose`:

```js
    else if (key === 'listen') { setListenTarget(payload || null); setScreen('listen') }
```

6. Рендер — после `case 'numbers': …`:

```jsx
    case 'listen':
      return (
        <ListenPage
          {...sectionBack('listening')}
          userLevel={userLevel}
          userName={name}
          token={token}
          initialTarget={listenTarget}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
        />
      )
```

`src/lib/navStack.js` — в `PRACTICE_SECTIONS` после `numbers`:

```js
  listen: 'nav.back.listen',
```

- [ ] **Step 9: Проверить сборку и экран**

```bash
npx vitest run src/screens/practice src/practice/listen
npm run lint
```
Expected: зелёное, lint без ошибок.

Живой просмотр (бэкенд на dev ещё может не иметь ручек): запустить превью (`preview_start` с конфигом dev-сервера этого воркtree), открыть `/?screen=listen`. Без ручек на dev — плашка «Раздел готовится…» (404). После выката бэкенда и загрузки HTML на dev — меню с A0–B2 и 16 направлениями, клик по уровню открывает набор, «Назад» возвращает в меню, F5 на `?screen=listen` остаётся в разделе. Тест пока — заглушка с кнопкой «Выйти».

- [ ] **Step 10: Commit**

```bash
git add src/screens/ListenPage.jsx src/screens/listen src/listen.css src/app/layout.jsx src/styles.css src/App.jsx src/screens/PracticePage.jsx src/screens/practice/practiceTabs.js src/screens/practice/practiceTabs.test.js src/lib/navStack.js
git commit -m "feat(listen): экран раздела — меню, набор, баннер в Практике

?screen=listen[&set=A1]: уровни с полосой пройденных уроков, направления
по группам, тест/повторение/части уроков. Свой список — только учителю.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Экран теста — задание и итог

**Files:**
- Modify (заменить заглушку): `src/screens/listen/ListenRun.jsx`
- Create: `src/screens/listen/ListenTask.jsx`, `src/screens/listen/WordCells.jsx`, `src/screens/listen/SentenceStep.jsx`, `src/screens/listen/ListenFeedback.jsx`, `src/screens/listen/ListenResult.jsx`
- Test: `src/screens/listen/WordCells.test.jsx`

**Interfaces:**
- Consumes: `ListenSession` (Task 3), `say/prefetch/silence` (Task 5), `hasSentence/sentenceRef` (Task 2), `recordSkill` (`src/practice/skillStats.js`), props `ListenRun` из Task 7.
- Produces: `cellGroups(en) → number[][]` (индексы ячеек по группам слов).

- [ ] **Step 1: Написать падающий тест ячеек**

`src/screens/listen/WordCells.test.jsx`:

```jsx
// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import WordCells, { cellGroups } from './WordCells.jsx'

const item = (over = {}) => ({
  card: { en: 'get up' },
  target: 'getup',
  step: 'word',
  typed: 'ge',
  revealed: 1,
  wordMark: null,
  ...over,
})

describe('ячейки слова', () => {
  it('пробел фразы делит группы, апостроф и дефис ячеек не получают', () => {
    expect(cellGroups('get up')).toEqual([[0, 1, 2], [3, 4]])
    expect(cellGroups("o'clock")).toEqual([[0, 1, 2, 3, 4, 5]])
    expect(cellGroups('well-known|famous')).toEqual([[0, 1, 2, 3, 4, 5, 6, 7, 8]])
  })

  it('буквы по ячейкам, текущая и подсказанная подсвечены, длинное слово мельче', () => {
    const { container } = render(<WordCells item={item()} inputRef={createRef()} label="w" onType={() => {}} onSubmit={() => {}} />)
    const cells = container.querySelectorAll('.jl-cell')
    expect([...cells].map((c) => c.textContent)).toEqual(['g', 'e', '', '', ''])
    expect(cells[0].classList.contains('is-hint')).toBe(true)
    expect(cells[2].classList.contains('is-cur')).toBe(true)
    const long = render(<WordCells item={item({ card: { en: 'responsibility' }, target: 'responsibility', typed: '' })} inputRef={createRef()} label="w" onType={() => {}} onSubmit={() => {}} />)
    expect(long.container.querySelector('.jl-cells--sm')).not.toBeNull()
  })

  it('набор идёт в поле, Enter — проверка', () => {
    const onType = vi.fn()
    const onSubmit = vi.fn()
    const { container } = render(<WordCells item={item()} inputRef={createRef()} label="w" onType={onType} onSubmit={onSubmit} />)
    const input = container.querySelector('input')
    fireEvent.change(input, { target: { value: 'get' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onType).toHaveBeenCalledWith('get')
    expect(onSubmit).toHaveBeenCalled()
  })
})
```

Run: `npx vitest run src/screens/listen/WordCells.test.jsx`
Expected: FAIL — нет `./WordCells.jsx`.

- [ ] **Step 2: Ячейки**

`src/screens/listen/WordCells.jsx`:

```jsx
'use client'

// Ячейки слова: по букве в ячейке, пробел фразы делит группы. Набор идёт в
// прозрачное поле поверх ячеек — на телефоне по нему открывается клавиатура,
// автозамена и заглавные выключены. Буквы чистит и режет по длине сессия.

import { enMain } from '../../practice/listen/compare.js'

/** Индексы ячеек по группам слов фразы: только латинские буквы. */
export function cellGroups(en) {
  let k = 0
  return enMain(en)
    .split(' ')
    .filter(Boolean)
    .map((g) => [...g].filter((c) => /[a-z]/i.test(c)).map(() => k++))
}

export default function WordCells({ item, inputRef, label, onType, onSubmit }) {
  const groups = cellGroups(item.card.en)
  const n = item.target.length
  const size = n > 16 ? ' jl-cells--xs' : n > 9 ? ' jl-cells--sm' : ''
  const mark = item.wordMark ? ` is-${item.wordMark}` : ''
  const active = item.step === 'word'
  const cur = Math.min(item.typed.length, n - 1)
  return (
    <div className={`jl-cells${size}${mark}`} onClick={() => inputRef.current?.focus()}>
      {groups.map((g, gi) => (
        <span className="jl-grp" key={gi}>
          {g.map((k) => (
            <span
              key={k}
              className={`jl-cell${item.typed[k] ? ' is-filled' : ''}${active && k === cur ? ' is-cur' : ''}${k < item.revealed ? ' is-hint' : ''}`}
            >
              {item.typed[k] || ''}
            </span>
          ))}
        </span>
      ))}
      <input
        ref={inputRef}
        className="jl-cells__input"
        value={item.typed}
        disabled={!active}
        maxLength={n}
        aria-label={label}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        onChange={(e) => onType(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onSubmit()
          }
        }}
      />
    </div>
  )
}
```

Run: `npx vitest run src/screens/listen/WordCells.test.jsx`
Expected: PASS (3 теста).

- [ ] **Step 3: Отклики**

`src/screens/listen/ListenFeedback.jsx`:

```jsx
'use client'

// Отклики шагов задания — тексты прототипа (setFb), собранные из снимка сессии.

import Icon from './ListenIcons.jsx'

function Fb({ kind, title, children }) {
  const icon = kind === 'ok' ? 'check' : kind === 'near' ? 'bang' : 'x'
  return (
    <div className={`jl-fb jl-fb--${kind}`} role="status">
      <span className="jl-fb__ic">
        <Icon name={icon} />
      </span>
      <div>
        <b>{title}</b>
        {children ? <span>{children}</span> : null}
      </div>
    </div>
  )
}

export function WordFeedback({ item, word, ru, t }) {
  const f = item.wordFeedback
  if (!f) return null
  if (f.kind === 'ok') {
    return <Fb kind="ok" title={t('listen.word.ok', { coins: f.coins })}>{`${word} — ${ru}`}</Fb>
  }
  if (f.kind === 'shown') {
    return (
      <Fb kind="bad" title={t('listen.word.shown', { word })}>
        {f.typed ? t('listen.word.typed', { typed: f.typed }) : t('listen.word.remember')}
      </Fb>
    )
  }
  return (
    <Fb kind={f.kind} title={f.kind === 'near' ? t('listen.word.near') : t('listen.word.bad')}>
      {t('listen.word.retry')}
    </Fb>
  )
}

export function SentenceFeedback({ item, word, t }) {
  const f = item.sentFeedback
  if (!f) return null
  if (f.kind === 'hint') {
    return (
      <Fb kind="near" title={t('listen.sent.hintTitle')}>
        <span className="jl-diff">{f.text} …</span>
      </Fb>
    )
  }
  if (f.kind === 'ownHint') {
    return <Fb kind="near" title={t('listen.sent.ownHintTitle')}>{t('listen.sent.ownHint', { word })}</Fb>
  }
  if (f.kind === 'ok') {
    const showRef = f.ref && !f.exact
    return (
      <Fb kind="ok" title={t(f.exact ? 'listen.sent.perfect' : 'listen.sent.ok', { coins: f.coins })}>
        {showRef ? t('listen.sent.sample', { ref: f.ref }) : null}
        {showRef && f.ru ? <br /> : null}
        {f.ru ? t('listen.sent.translation', { ru: f.ru }) : null}
      </Fb>
    )
  }
  if (f.kind === 'answer') {
    return (
      <Fb kind="bad" title={f.ref ? t('listen.sent.answer') : t('listen.sent.example')}>
        {f.ref || t('listen.sent.ownHint', { word })}
        {f.ru ? (
          <>
            <br />
            {t('listen.sent.translation', { ru: f.ru })}
          </>
        ) : null}
      </Fb>
    )
  }
  if (f.own) {
    return (
      <Fb kind="bad" title={t('listen.sent.fix')}>
        {f.reason === 'needWord' ? t('listen.sent.needWord', { word }) : t('listen.sent.minWords')}
      </Fb>
    )
  }
  const msg =
    f.reason === 'needWord'
      ? t('listen.sent.needWord', { word })
      : f.kind === 'near'
        ? t('listen.sent.nearHelp')
        : t('listen.sent.retry')
  return (
    <Fb kind={f.kind} title={f.kind === 'near' ? t('listen.sent.near') : t('listen.sent.bad')}>
      {msg}
      {f.reason !== 'needWord' && f.missing?.length > 0 && (
        <>
          {' '}
          {t('listen.sent.missing')}{' '}
          <span className="jl-diff">
            {f.missing.map((m) => (
              <span className="jl-miss" key={m}>{m}</span>
            ))}
          </span>
        </>
      )}
    </Fb>
  )
}
```

- [ ] **Step 4: Шаг предложения и задание**

`src/screens/listen/SentenceStep.jsx`:

```jsx
'use client'

// Шаг 2: предложение на слух (или своё — у своего списка без образца). Enter —
// «Проверить», после ответа — «Дальше»; Shift+Enter — перенос строки.

import { enMain } from '../../practice/listen/compare.js'
import { hasSentence, sentenceRef } from '../../practice/listen/rules.js'
import { say } from '../../practice/listen/voice.js'
import Icon from './ListenIcons.jsx'
import { SentenceFeedback } from './ListenFeedback.jsx'

export default function SentenceStep({ item, session, hintsLeft, showsLeft, last, t, inputRef, nextRef, onNext }) {
  const card = item.card
  const withSentence = hasSentence(card)
  const ref = sentenceRef(card)
  const word = enMain(card.en)
  const done = item.step === 'done'
  return (
    <>
      {withSentence && (
        <div className="jl-listen">
          <button
            type="button"
            className="jl-play"
            aria-label={t('listen.play.sentence')}
            onClick={() => {
              say(ref, { kind: 'sentence' })
              inputRef.current?.focus()
            }}
          >
            <Icon name="sound" />
          </button>
          <button
            type="button"
            className="jl-tool"
            onClick={() => {
              say(ref, { kind: 'sentence', slow: true })
              inputRef.current?.focus()
            }}
          >
            {t('listen.slower')}
          </button>
        </div>
      )}
      <textarea
        ref={inputRef}
        className={`jl-sent${item.sentMark ? ` is-${item.sentMark}` : ''}`}
        value={item.sentence}
        readOnly={done}
        spellCheck={false}
        aria-label={t('listen.sent.input')}
        placeholder={withSentence ? t('listen.sent.placeholder') : t('listen.sent.placeholderOwn')}
        onChange={(e) => session.typeSentence(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.shiftKey) return
          e.preventDefault()
          if (done) onNext()
          else session.submitSentence()
        }}
      />
      <div className="jl-tools">
        <button type="button" className="jl-tool" onClick={() => say(word, { kind: 'word' })}>
          <Icon name="sound" /> {t('listen.sayWord')}
        </button>
        <button
          type="button"
          className="jl-tool"
          disabled={done || item.sentHinted || hintsLeft <= 0}
          onClick={() => session.hintSentence()}
        >
          <Icon name="bulb" /> {t('listen.sent.hint')} <span className="jl-cnt">{hintsLeft}</span>
        </button>
        <button type="button" className="jl-tool" disabled={done || showsLeft <= 0} onClick={() => session.showSentence()}>
          <Icon name="eye" /> {t('listen.show')} <span className="jl-cnt">{showsLeft}</span>
        </button>
      </div>
      <SentenceFeedback item={item} word={word} t={t} />
      <div className="jl-foot">
        {done ? (
          <button ref={nextRef} type="button" className="jl-btn" onClick={onNext}>
            {last ? t('listen.toResult') : t('listen.next')} <Icon name="arrow" />
          </button>
        ) : (
          <button type="button" className="jl-btn" disabled={!item.sentence.trim()} onClick={() => session.submitSentence()}>
            {t('listen.check')}
          </button>
        )}
      </div>
    </>
  )
}
```

`src/screens/listen/ListenTask.jsx`:

```jsx
'use client'

// Экран задания: шапка теста (выход, прогресс, лимиты, монеты), шаг 1 — слово
// по буквам, шаг 2 — предложение на слух. Фокус ведёт за шагом: ячейки → поле
// предложения → «Дальше»; после неверной попытки набранное выделено, чтобы
// следующий набор его заменил (как inp.select() прототипа).

import { useEffect, useRef } from 'react'
import { enMain, first } from '../../practice/listen/compare.js'
import { hasSentence } from '../../practice/listen/rules.js'
import { say } from '../../practice/listen/voice.js'
import Icon from './ListenIcons.jsx'
import { WordFeedback } from './ListenFeedback.jsx'
import SentenceStep from './SentenceStep.jsx'
import WordCells from './WordCells.jsx'

/** Подпись прогона над заданием: «A1 · L3 · Часть 1 · My biography». */
function runLabel(owner, run, t) {
  const where = owner ? (owner.kind === 'field' ? owner.name : owner.id) : ''
  let what = run.title
  if (run.kind === 'test') what = t(owner?.kind === 'field' ? 'listen.test.field' : 'listen.test.level')
  if (run.kind === 'unit') what = `${t('listen.unitReview')} · ${t('listen.unit', { u: run.u })}`
  if (run.kind === 'lesson') what = `L${run.l}${run.parts > 1 ? ` · ${t('listen.part', { n: run.part + 1 })}` : ''} · ${run.title}`
  if (run.kind === 'review') what = `${t('listen.lessonReview', { l: run.l })} · ${run.title}`
  return where ? `${where} · ${what}` : what
}

export default function ListenTask({ snap, session, owner, run, t, onQuit }) {
  const { item, index, total, hintsLeft, showsLeft, earned } = snap
  const card = item.card
  const word = enMain(card.en)
  const wordRef = useRef(null)
  const sentRef = useRef(null)
  const nextRef = useRef(null)
  const step = item.step

  useEffect(() => {
    if (step === 'word') {
      wordRef.current?.focus({ preventScroll: true })
      return undefined
    }
    if (step === 'done') {
      nextRef.current?.focus({ preventScroll: true })
      return undefined
    }
    const id = setTimeout(() => {
      sentRef.current?.focus({ preventScroll: true })
      sentRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    }, 350)
    return () => clearTimeout(id)
  }, [index, step])

  useEffect(() => {
    if (step === 'word' && item.wordTries > 0) wordRef.current?.select()
  }, [item.wordTries, step])

  const done = step === 'done'
  const passed = done ? index + 1 : index
  return (
    <div className="jl-run">
      <div className="jl-run__top">
        <button type="button" className="jl-x" onClick={onQuit} aria-label={t('listen.quit')}>
          <Icon name="close" />
        </button>
        <div className="jl-pbar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={passed}>
          <i style={{ width: `${(passed / total) * 100}%` }} />
        </div>
        <span className="jl-lims">
          <span className={hintsLeft ? '' : 'is-zero'} title={t('listen.hintsLeft')}>
            <Icon name="bulb" />
            <b>{hintsLeft}</b>
          </span>
          <span className={showsLeft ? '' : 'is-zero'} title={t('listen.showsLeft')}>
            <Icon name="eye" />
            <b>{showsLeft}</b>
          </span>
        </span>
        <span className="jl-coins">
          <span className="jl-coin">J</span>
          <span>{earned}</span>
        </span>
      </div>

      <section className="jl-card jl-ex">
        <div className="jl-stage">
          <div className="jl-stage__h">
            <span className={`jl-n${step !== 'word' ? ' is-done' : ''}`}>{step !== 'word' ? <Icon name="check" /> : 1}</span>
            {t('listen.step1')}
          </div>
          <div className="jl-listen">
            <button
              type="button"
              className="jl-play"
              aria-label={t('listen.play.word')}
              onClick={() => {
                say(word, { kind: 'word' })
                wordRef.current?.focus()
              }}
            >
              <Icon name="sound" />
            </button>
            <button
              type="button"
              className="jl-tool"
              onClick={() => {
                say(word, { kind: 'word', slow: true })
                wordRef.current?.focus()
              }}
            >
              {t('listen.slower')}
            </button>
            <small>{runLabel(owner, run, t)}</small>
          </div>
          <WordCells
            item={item}
            inputRef={wordRef}
            label={t('listen.word.input')}
            onType={(v) => session.typeWord(v)}
            onSubmit={() => session.submitWord()}
          />
          <div className="jl-tools">
            <button type="button" className="jl-tool" disabled={step !== 'word' || hintsLeft <= 0} onClick={() => session.hintLetter()}>
              <Icon name="bulb" /> {t('listen.word.hint')} <span className="jl-cnt">{hintsLeft}</span>
            </button>
            <button type="button" className="jl-tool" disabled={step !== 'word' || showsLeft <= 0} onClick={() => session.showWord()}>
              <Icon name="eye" /> {t('listen.show')} <span className="jl-cnt">{showsLeft}</span>
            </button>
          </div>
          <WordFeedback item={item} word={word} ru={first(card.ru)} t={t} />
        </div>

        <div className={`jl-stage${step === 'word' ? ' is-locked' : ''}`} aria-disabled={step === 'word' || undefined}>
          <div className="jl-stage__h">
            <span className={`jl-n${item.sentOk ? ' is-done' : ''}`}>{item.sentOk ? <Icon name="check" /> : 2}</span>
            {hasSentence(card) ? t('listen.step2') : t('listen.step2.own')}
          </div>
          {step === 'word' ? (
            <div className="jl-locked">{t('listen.step2.locked')}</div>
          ) : (
            <SentenceStep
              item={item}
              session={session}
              hintsLeft={hintsLeft}
              showsLeft={showsLeft}
              last={index + 1 >= total}
              t={t}
              inputRef={sentRef}
              nextRef={nextRef}
              onNext={() => session.next()}
            />
          )}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 5: Итог**

`src/screens/listen/ListenResult.jsx`:

```jsx
'use client'

// Итог теста: монеты (и сколько ушло в баланс — только прирост к лучшему),
// верно слов / предложений, точность, разбор каждого слова с ответом ученика.

import { enMain, first } from '../../practice/listen/compare.js'
import { sentenceRef } from '../../practice/listen/rules.js'
import Icon from './ListenIcons.jsx'

function Mark({ ok }) {
  return (
    <i className={`jl-mark jl-mark--${ok ? 'y' : 'n'}`}>
      <Icon name={ok ? 'check' : 'x'} />
    </i>
  )
}

function balanceNote(settled, earned, t) {
  if (!settled || earned === 0) return null
  if (!settled.keyed) return t('listen.result.practiceRun')
  return settled.credit > 0 ? t('listen.result.credited', { n: settled.credit }) : t('listen.result.noGain')
}

export default function ListenResult({ summary, settled, owner, t, onRedo, onRestart, onExit }) {
  const { n, wordsOk, sentencesOk, ok, accuracy, earned, wrong, items } = summary
  const msg = ok === n ? t('listen.result.perfect') : ok / n >= 0.7 ? t('listen.result.good') : t('listen.result.again')
  const note = balanceNote(settled, earned, t)
  const back = owner
    ? owner.kind === 'field'
      ? t('listen.result.toField')
      : t('listen.result.toLevel', { id: owner.id })
    : t('listen.result.toMenu')
  return (
    <section className="jl-card jl-result">
      <span className="jl-coin jl-bigcoin">J</span>
      <div>
        <h2>{t('listen.result.coins', { n: earned })}</h2>
        <p className="jl-muted">{msg}</p>
        {note && <p className="jl-result__note">{note}</p>}
      </div>
      <div className="jl-stats">
        <div className="jl-stat"><b>{wordsOk}/{n}</b><span>{t('listen.result.words')}</span></div>
        <div className="jl-stat"><b>{sentencesOk}/{n}</b><span>{t('listen.result.sentences')}</span></div>
        <div className="jl-stat"><b>{accuracy}%</b><span>{t('listen.result.accuracy')}</span></div>
      </div>
      <div className="jl-review">
        {items.map((r, i) => (
          <div className="jl-rv" key={i}>
            <span className="jl-rv__d">
              <Mark ok={r.wordOk} />
              <Mark ok={r.sentOk} />
            </span>
            <div className="jl-rv__w">
              {enMain(r.card.en)} <span>— {first(r.card.ru)}</span>
            </div>
            <div className="jl-rv__s">
              {sentenceRef(r.card)}
              {r.sentAns && r.sentAns !== '—' && (
                <>
                  <br />
                  {t('listen.result.yourAnswer')} <em>{r.sentAns}</em>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="jl-row">
        {wrong.length > 0 && (
          <button type="button" className="jl-btn" onClick={() => onRedo(wrong)}>
            {t('listen.result.redo', { n: wrong.length })}
          </button>
        )}
        <button type="button" className={`jl-btn${wrong.length ? ' jl-btn--ghost' : ''}`} onClick={onRestart}>
          {t('listen.result.restart')}
        </button>
        <button type="button" className="jl-btn jl-btn--ghost" onClick={onExit}>
          {back}
        </button>
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Прогон теста — сессия, звук, итог**

`src/screens/listen/ListenRun.jsx` (заменить заглушку целиком):

```jsx
'use client'

// Один тест: сессия (src/practice/listen/session.js) + звук + экран задания или
// итога. Сессия создаётся в эффекте с уборкой — строгий режим React иначе
// оставил бы две живые. Автоплей как в прототипе: слово через 0,35 с после
// открытия задания, предложение — через 1,5 с после того, как слово написано.

import { useEffect, useState, useSyncExternalStore } from 'react'
import { enMain } from '../../practice/listen/compare.js'
import { hasSentence, sentenceRef } from '../../practice/listen/rules.js'
import { ListenSession } from '../../practice/listen/session.js'
import { prefetch, say, silence } from '../../practice/listen/voice.js'
import { recordSkill } from '../../practice/skillStats.js'
import ListenResult from './ListenResult.jsx'
import ListenTask from './ListenTask.jsx'

const WORD_DELAY = 350
const SENTENCE_DELAY = 1500
const idle = () => () => {}
const none = () => null

export default function ListenRun({ cards, owner, run, t, onExit, onRestart, onRedo, onFinish }) {
  const [session, setSession] = useState(null)
  const [settled, setSettled] = useState(null)

  useEffect(() => {
    const s = new ListenSession({
      cards,
      onSay: (text, kind) => say(text, { kind }),
      // Навык «аудирование» растёт от задания, где верны и слово, и предложение.
      onItem: ({ wordOk, sentOk }) => recordSkill('listening', wordOk && sentOk),
      onDone: (summary) => setSettled(onFinish(summary)),
    })
    setSession(s)
    return () => {
      silence()
      setSession(null)
    }
    // onFinish намеренно вне зависимостей: новая функция на каждый рендер
    // страницы пересоздавала бы тест посреди прохождения.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards])

  const snap = useSyncExternalStore(session ? session.subscribe : idle, session ? session.getSnapshot : none, none)
  const index = snap?.index ?? -1
  const card = snap?.phase === 'task' ? cards[index] : null
  const step = snap?.item?.step

  // Слово звучит само; заодно греем предложение задания и следующее слово.
  useEffect(() => {
    if (!card) return undefined
    if (hasSentence(card)) prefetch(sentenceRef(card))
    if (cards[index + 1]) prefetch(enMain(cards[index + 1].en))
    const id = setTimeout(() => say(enMain(card.en), { kind: 'word' }), WORD_DELAY)
    return () => clearTimeout(id)
  }, [card, cards, index])

  useEffect(() => {
    if (!card || step !== 'sent' || !hasSentence(card)) return undefined
    const id = setTimeout(() => say(sentenceRef(card), { kind: 'sentence' }), SENTENCE_DELAY)
    return () => clearTimeout(id)
  }, [card, step])

  useEffect(() => {
    if (snap?.phase === 'result') window.scrollTo(0, 0)
  }, [snap?.phase])

  if (!snap) return null
  if (snap.phase === 'result') {
    return (
      <ListenResult
        summary={snap.summary}
        settled={settled}
        owner={owner}
        t={t}
        onRedo={onRedo}
        onRestart={onRestart}
        onExit={onExit}
      />
    )
  }
  return <ListenTask snap={snap} session={session} owner={owner} run={run} t={t} onQuit={onExit} />
}
```

- [ ] **Step 7: Тесты, lint, сборка**

```bash
npx vitest run src/screens/listen src/practice/listen
npm run lint
npm run build
```
Expected: тесты зелёные, lint без ошибок (если правило `react-hooks/exhaustive-deps` не сработало на строке с комментарием — убрать `eslint-disable-next-line`, lint не должен ругаться на лишнюю директиву), сборка проходит.

- [ ] **Step 8: Commit**

```bash
git add src/screens/listen
git commit -m "feat(listen): задание и итог — ячейки слова, предложение, монеты

Слово звучит само через 0,35 с, предложение — через 1,5 с после слова;
итог показывает, сколько монет ушло в баланс (только прирост к лучшему).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: E2E и живая проверка

**Files:**
- Test: `tests/listen.spec.js`

**Interfaces:**
- Consumes: весь раздел (Tasks 1–8). Бэкенд подменяется `page.route`: `/mobile/listen`, `/mobile/listen/sets/A0`, `/api/tts`, `/mobile/lesson-modules/complete`.

- [ ] **Step 1: Написать e2e**

`tests/listen.spec.js`:

```js
import { test, expect } from '@playwright/test'

// Just Listen It (?screen=listen) без бэкенда: оглавление и набор из двух слов
// подменены, /api/tts отвечает тихим mp3 — пройти задание можно набором, звук
// проверен юнитами (voice.test.js). Слово задания тест узнаёт по числу ячеек:
// у mother их 6, у book — 4 (колода перемешана).

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

// MPEG-1 Layer III: заголовок кадра и нули — декодер читает тишину.
function silentMp3(frames = 20) {
  const frame = Buffer.alloc(417)
  frame.set([0xff, 0xfb, 0x90, 0xc0])
  return Buffer.concat(Array.from({ length: frames }, () => frame))
}

const INDEX = {
  release: 1,
  uploadedAt: '2026-10-21T12:00:00',
  levels: [{ id: 'A0', name: 'Beginner', units: 1, lessons: 1, words: 2 }],
  fields: [{ id: 'business', name: 'Business', ru: 'Бизнес', icon: '💼', group: 'Business', premium: true, units: 1, lessons: 1, words: 1 }],
}
const A0 = {
  id: 'A0',
  kind: 'level',
  name: 'Beginner',
  units: [{ u: 1, title: 'You and me', lessons: [{ l: 1, t: 'My family', g: '', w: [
    ['mother', 'мама', 'My mother is a teacher.', 'Моя мама — учитель.', ''],
    ['book', 'книга', 'This is my book.', 'Это моя книга.', ''],
  ] }] }],
}
const ANSWERS = { 6: ['mother', 'My mother is a teacher.'], 4: ['book', 'This is my book.'] }

async function mockBackend(page, credits) {
  await page.addInitScript(() => {
    const toursOff = localStorage.getItem('jts_tours_off')
    localStorage.clear()
    if (toursOff) localStorage.setItem('jts_tours_off', toursOff)
    localStorage.setItem('jts_access_token', 'test-token')
  })
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 1, name: 'Асель', phone: '77010001122', role: 'STUDENT', languageLevel: 'A2' } })))
  await page.route('**/mobile/listen', (r) => r.fulfill(json(INDEX)))
  await page.route('**/mobile/listen/sets/A0', (r) => r.fulfill(json(A0)))
  // Регэкспы, а не глобы: «?» в глобе Playwright — не буквальный знак вопроса.
  await page.route(/\/api\/tts\?/, (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: silentMp3() }))
  await page.route(/\/mobile\/lesson-modules\/complete\?/, (r) => {
    credits.push(Number(new URL(r.request().url()).searchParams.get('xp')))
    return r.fulfill(json({}))
  })
}

// Одно задание без ошибок: слово по ячейкам, предложение, «Дальше».
async function answer(page) {
  const n = await page.locator('.jl-cell').count()
  const [word, sentence] = ANSWERS[n]
  await page.locator('.jl-cells__input').fill(word)
  await expect(page.locator('.jl-stage').first().locator('.jl-fb--ok')).toBeVisible()
  await page.locator('.jl-sent').fill(sentence)
  await page.getByRole('button', { name: 'Проверить' }).click()
  await expect(page.locator('.jl-stage').nth(1).locator('.jl-fb--ok')).toBeVisible()
  await page.locator('.jl-foot .jl-btn').click()
}

test('урок без ошибок — 50 монет в баланс; повтор не даёт ничего сверх лучшего', async ({ page }) => {
  const credits = []
  await mockBackend(page, credits)
  await page.goto('/?screen=listen')
  await expect(page.locator('.jl-lv').first()).toContainText('A0', { timeout: 30000 })
  await expect(page.locator('.jl-fld')).toContainText('Business')
  await page.locator('.jl-lv').first().click()
  await page.locator('.jl-topic', { hasText: 'My family' }).getByRole('button', { name: 'Начать' }).click()

  await answer(page)
  await answer(page)
  await expect(page.locator('.jl-result h2')).toContainText('+50')
  await expect(page.locator('.jl-result')).toContainText('В баланс: +50')
  await expect.poll(() => credits).toEqual([50])

  await page.getByRole('button', { name: 'Пройти заново' }).click()
  await answer(page)
  await answer(page)
  await expect(page.locator('.jl-result')).toContainText('Лучший результат не превышен')
  expect(credits).toEqual([50])

  await page.getByRole('button', { name: 'К темам A0' }).click()
  await expect(page.locator('.jl-topic', { hasText: 'My family' }).locator('.jl-best')).toContainText('50 · 2/2')
})

test('две ошибки в слове — показан ответ, за слово 0 монет', async ({ page }) => {
  await mockBackend(page, [])
  await page.goto('/?screen=listen&set=A0')
  await page.locator('.jl-topic', { hasText: 'My family' }).getByRole('button', { name: 'Начать' }).click()
  const n = await page.locator('.jl-cell').count()
  const input = page.locator('.jl-cells__input')
  await input.fill('z'.repeat(n))
  await expect(page.locator('.jl-fb--bad')).toContainText('Неверно, попробуй ещё раз')
  await input.fill('y'.repeat(n))
  await expect(page.locator('.jl-fb--bad')).toContainText(`Правильно: ${ANSWERS[n][0]}`)
  await expect(page.locator('.jl-coins')).toContainText('0')
  await expect(page.locator('.jl-sent')).toBeVisible()
})

test('раздел не загружен — сообщение, а не белый лист', async ({ page }) => {
  await mockBackend(page, [])
  await page.route('**/mobile/listen', (r) => r.fulfill(json({ messages: ['Just Listen It ещё не загружен'] }, 404)))
  await page.goto('/?screen=listen')
  await expect(page.locator('.jl-notice')).toContainText('Раздел готовится', { timeout: 30000 })
})

test('360px: меню и задание без горизонтальной прокрутки', async ({ page }) => {
  await mockBackend(page, [])
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/?screen=listen')
  await expect(page.locator('.jl-lv').first()).toBeVisible({ timeout: 30000 })
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(await overflow()).toBeLessThanOrEqual(0)
  await page.locator('.jl-lv').first().click()
  await page.locator('.jl-topic', { hasText: 'My family' }).getByRole('button', { name: 'Начать' }).click()
  await expect(page.locator('.jl-cell').first()).toBeVisible()
  expect(await overflow()).toBeLessThanOrEqual(0)
})
```

- [ ] **Step 2: Прогнать e2e**

Перед прогоном: порт 3100 свободен (`netstat -ano | findstr :3100` — пусто), иначе `reuseExistingServer` прогонит тесты по чужому коду.

Run: `npm run test:e2e -- tests/listen.spec.js --workers=1`
Expected: 4 passed. Падение `К темам A0`/`50 · 2/2` — проверить, что `recordBest` вызывается до возврата в набор и событие `listen-progress` будит `ListenPage`.

- [ ] **Step 3: Полный набор проверок**

```bash
npx vitest run
npm run lint
npm run build
```
Expected: новых красных нет (сверить с известными на develop); lint и build зелёные.

- [ ] **Step 4: Живая проверка на dev-стенде (после выката бэкенда и загрузки HTML через админку)**

Через превью (`preview_start`) или dev-стенд:
1. `?screen=practice` → вкладка «Аудирование» → баннер Just Listen It → меню: 5 уровней, 16 направлений в 4 группах, сумма слов 2873.
2. Урок A1 L1: слово звучит само (Soniox, британский голос), «Медленнее» — медленнее; после слова через ~1,5 с — предложение.
3. Две ошибки в слове, подсказка буквы, подсказка предложения, показ ответа — счётчики в шапке убывают, на нуле кнопки неактивны.
4. Итог: монеты, «В баланс: +N», после повтора — «+0»; баланс в сайдбаре вырос после перезахода на экран.
5. Слова с ошибками появились в «Словаре» среди «хуже запомненных».
6. Тёмная тема и мобильная ширина 360px; iOS/Android — звук после первого нажатия и набор в ячейки с экранной клавиатуры (пункт ТЗ).
7. Скриншоты меню, задания и итога — в PR.

- [ ] **Step 5: Commit**

```bash
git add tests/listen.spec.js
git commit -m "test(listen): e2e — путь ученика, правило монет, 360px

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Документация раздела**

В `CLAUDE.md` репо, после абзаца про «Слушай и выбирай», добавить:

```markdown
**Just Listen It в «Практике» — диктант слова и предложения, данные в MinIO.**
Источник правды — прототип `data/jtslisten.html` (правки контента — туда и
повторная загрузка в web-admin «Практика и тесты» → Just Listen It; бэкенд
`/admin/listen/upload` разбирает SYL/FIELDS и кладёт наборы в
`listen/current/`). Ученик читает `/mobile/listen` и `/mobile/listen/sets/{id}`
(`getListenIndex/getListenSet`); экран `?screen=listen[&set=A1]`
(`src/screens/ListenPage.jsx` + `src/screens/listen/`), движок —
`src/practice/listen/`, сверка ответа — с оракулом самого прототипа
(`scripts/extract-listen-oracle.js`, красный `compare.test.js` — чинить порт).
Два отступления от прототипа: SYN/IRR читаются только по своим ключам (на
«constructor» прототип падал) и монеты слова считают нажатия подсказки (ТЗ).
Монеты в баланс — только прирост к лучшему результату прогона
(`coinsToCredit`, решение владельца 21.10.2026), лучшие — модуль синка
`listen` (merge «лучший по ключу»), ошибки — в «хуже запомненные» «Словаря».
Premium пока открыт всем: проверку ставить на бэкенде в `readSet`.
```

```bash
git add CLAUDE.md
git commit -m "docs(listen): раздел Just Listen It в CLAUDE.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Пуш и PR в `develop` — по команде владельца, после мержа бэкенда.
