# «Грамматика · игры» — сайт (этап 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Решение владельца для этого этапа: план выполняется **инлайн одной сессией**, без субагента на задачу;
> в конце — одно ревью ветки субагентом, найденное правится сам.

**Goal:** экран `?screen=grammar-games[&topic=<id>]`: движок прототипа методиста почти дословно в Shadow DOM,
данные и звёзды — с бэкенда (`/mobile/grammar-games/**`), плитка «Грамматика · игры» во вкладке «Письмо».

**Architecture:** экран-оболочка `GrammarGamesPage.jsx` (как `PrepositionsPage.jsx`) берёт список тем и звёзды
хуком `useGrammarGamesData`, монтирует `mountGrammarGames(root, cfg)` в открытую тень и снимает его. Движок —
скрипт `data/jtsgrammar-games.html` с заменой глобалов на `cfg` (таблица в Task 4). Чистые правила (набор игр,
пороги звёзд, поиск перевода, разбор слов, уровень по профилю, очередь сдач) — отдельными модулями под vitest и
оракулом, который считает сам прототип в jsdom. Статика (7 маскотов, 563 эмодзи) — файлами в `public/`.

**Tech Stack:** Next.js 16 SPA на JavaScript, vitest 2 + jsdom 25, Playwright (системный Chrome), sharp (только
скрипты), Soniox `/api/tts` для озвучки.

## Global Constraints

- Спека — `docs/superpowers/specs/2026-10-25-grammar-games-speed-reading-design.md`, часть A3, допущения Д1–Д17.
- Только `.js`/`.jsx`, без новых зависимостей npm; комментарии по-русски и про «почему».
- Строки оболочки — ru/kk/en в `src/i18n.jsx`; строки внутри движка — его таблица `U` (ru/kk/en), как в прототипе.
- В тени гарнитура только `var(--gg-font,inherit)`; ENGINES-проверка в `src/kkFont.test.js`.
- Старую «Грамматику» (`src/practice/grammar/`, `public/practice/grammar/`) и IELTS не трогаем.
- Ошибки игр не сохраняются и никуда не уходят: `HOOK.mist` не подключается (решение 25.10).
- Монеты считает только бэкенд, клиент шлёт `{topicId, game, stars}` — ровно эти поля (лишнее = 400).
- Без входа — «Войдите…» (Д12); 404 списка — «Раздел готовится»; кэш данных — только в памяти вкладки.
- Уровень по умолчанию — по профилю: A0→L1, A1→L2, A2→L3, B1→L4, B2+→L5, нет → L1 (Д11).
- Эмодзи — картинками из статики, выключаются флагом `EMOJI_IMAGES` в `emoji.js` (Д8). Тёмной темы нет (Д13).
- «✓ В словаре» — только для слов, добавленных в этом заходе (Д14).
- Моки POST в e2e — глоб со `**` на конце; e2e одним воркером через обёртку системного Chrome на своём порту.
- Не пушить и не открывать PR без слова владельца.

---

## Карта файлов

```
scripts/grammar-games/extract-assets.js      — маскоты и эмодзи из прототипа в public/ (идемпотентно)
scripts/grammar-games/make-fixture.js        — урезанный прототип (6 тем, движок байт в байт) + bundle.json
scripts/grammar-games/extract-oracle.js      — оракул: что считает сам прототип (jsdom, сид mulberry32)
public/practice/grammar-games/img/*.webp     — 7 маскотов
public/practice/grammar-games/emoji/*.webp   — 563 эмодзи, имя — кодпоинты через «-»
public/practice/grammar-games/emoji/index.json — список символов (порядок прототипа)
src/practice/grammar-games/emoji.js          — EMOJI_IMAGES, emojiFile(char), EMOJI_LIST
src/practice/grammar-games/levelOf.js        — уровень профиля → L1…L5 (Д11)
src/practice/grammar-games/stages.js         — stagesOf, acc (пороги звёзд), GAME_KEYS
src/practice/grammar-games/text.js           — esc, wrapEN, lookUp, norm, trail, sentOf (порт как есть)
src/practice/grammar-games/results.js        — очередь сдач: повтор при сбое сети и 409, max звёзд
src/practice/grammar-games/voice.js          — озвучка /api/tts голосом gb, запасной — голос устройства
src/practice/grammar-games/styles.js         — CSS прототипа для тени
src/practice/grammar-games/engine.js         — mountGrammarGames(root, cfg) → api
src/practice/grammar-games/__fixtures__/{prototype-mini.html,bundle.json,oracle.json}
src/practice/grammar-games/*.test.js
src/screens/grammar-games/useGrammarGamesData.js — список, звёзды, тема, словарь; статусы
src/screens/GrammarGamesPage.jsx
правки: src/api.js, src/App.jsx, src/lib/navStack.js, src/screens/practice/practiceTabs.js (+test),
        src/screens/PracticePage.jsx, src/styles.css, src/theme-dark.generated.css (свой блок), src/i18n.jsx,
        src/lib/assistant/{destinations,prompt,knowledge}.js (+destinations.test.js), src/kkFont.test.js,
        src/practice/practiceKeys.js, CLAUDE.md
tests/grammar-games.spec.js
```

---

### Task 1: Статика — маскоты и эмодзи

**Files:**
- Create: `scripts/grammar-games/extract-assets.js`, `src/practice/grammar-games/emoji.js`, `src/practice/grammar-games/emoji.test.js`
- Create (выход скрипта): `public/practice/grammar-games/img/*.webp`, `public/practice/grammar-games/emoji/*.webp`, `emoji/index.json`

**Interfaces:**
- Produces: `EMOJI_IMAGES: boolean`, `emojiFile(char) → '1f44b.webp'`, `EMOJI_LIST: string[]` (из `index.json`,
  пустой при выключенном флаге), `emojiUrl(char) → '/practice/grammar-games/emoji/<file>'`,
  `MASCOT_URL(name) → '/practice/grammar-games/img/<name>.webp'`.

- [ ] **Step 1: тест** — `emoji.test.js`:

```js
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { EMOJI_IMAGES, EMOJI_LIST, emojiFile, emojiUrl, mascotUrl, MASCOTS } from './emoji.js'

const PUB = path.join(__dirname, '..', '..', '..', 'public', 'practice', 'grammar-games')
const index = JSON.parse(fs.readFileSync(path.join(PUB, 'emoji', 'index.json'), 'utf8'))

describe('эмодзи «Грамматики · игр»', () => {
  it('имя файла — кодпоинты символа, ZWJ и FE0F сохраняются', () => {
    expect(emojiFile('👋')).toBe('1f44b.webp')
    expect(emojiFile('🙋‍♀️')).toBe('1f64b-200d-2640-fe0f.webp')
  })
  it('у каждого символа из index.json есть файл, сирот нет', () => {
    const files = fs.readdirSync(path.join(PUB, 'emoji')).filter((f) => f.endsWith('.webp')).sort()
    expect(index.map(emojiFile).sort()).toEqual(files)
    expect(index.length).toBe(563)
  })
  it('маскоты на месте', () => {
    for (const m of MASCOTS) expect(fs.existsSync(path.join(PUB, 'img', `${m}.webp`)), m).toBe(true)
    expect(mascotUrl('dexter')).toBe('/practice/grammar-games/img/dexter.webp')
  })
  it('флаг включает список (Д8)', () => {
    expect(EMOJI_IMAGES).toBe(true)
    expect(EMOJI_LIST).toEqual(index)
    expect(emojiUrl('👋')).toBe('/practice/grammar-games/emoji/1f44b.webp')
  })
})
```

- [ ] **Step 2:** `npx vitest run src/practice/grammar-games/emoji.test.js` → FAIL (нет модуля).
- [ ] **Step 3: скрипт** `extract-assets.js` — читает строки `const IMG={…}` и `const EMO={…}` прототипа (IMG —
  JS-литерал с одинарными кавычками, вычисляется `vm.runInNewContext('('+literal+')')`; EMO — JSON), пишет webp
  как есть (они уже webp), `index.json` — `Object.keys(EMO)` в порядке прототипа. Перед записью удаляет из
  `emoji/` webp, которых нет в наборе (сироты), существующие одинаковые файлы не перезаписывает.
- [ ] **Step 4: модуль** `emoji.js`:

```js
import INDEX from '../../../public/practice/grammar-games/emoji/index.json'
// Д8: картинки эмодзи Apple — собственность Apple; флаг выключает их одной строкой, и тогда
// движок показывает системные эмодзи (список пуст — emojify ничего не подменяет).
export const EMOJI_IMAGES = true
export const MASCOTS = ['dexter', 'spark', 'cheer', 'read', 'run', 'sleep', 'fly']
const BASE = '/practice/grammar-games'
export const emojiFile = (ch) => [...ch].map((c) => c.codePointAt(0).toString(16)).join('-') + '.webp'
export const EMOJI_LIST = EMOJI_IMAGES ? INDEX : []
export const emojiUrl = (ch) => `${BASE}/emoji/${emojiFile(ch)}`
export const mascotUrl = (name) => `${BASE}/img/${name}.webp`
```

- [ ] **Step 5:** `node scripts/grammar-games/extract-assets.js --html data/jtsgrammar-games.html`; тест → PASS.
- [ ] **Step 6: commit** `feat(grammar-games): статика — маскоты и эмодзи прототипа`.

---

### Task 2: Фикстура и оракул

**Files:**
- Create: `scripts/grammar-games/make-fixture.js`, `scripts/grammar-games/extract-oracle.js`
- Create (выход): `src/practice/grammar-games/__fixtures__/prototype-mini.html`, `bundle.json`, `oracle.json`

**Interfaces:**
- Produces: `bundle.json` = `{ index: {levels, program, topics:[{id,lv,n,icon,color,title,sub,games}]}, topics:
  {<id>: тело}, gloss: {…}, progress: {stars: {}} }` — ответы ручек для vitest и e2e;
  `oracle.json` = `{ seed, stages: {<id>: [...]}, acc: [[ok,n,stars]], look: {<k>: [ru,kk]|null}, wrap: {<s>: html},
  norm: {<s>: s}, sets: {<id>: {<game>: shape}}, raceSpeed: {<id>: число} }`.

Темы фикстуры — по одной на уровень плюс особые: `L1-01`, `L1-10` (есть `place`), `L2-22` (нет `sort`), `L3-01`,
`L4-01`, `L5-01`. Движок копируется байт в байт; IMG — те же ключи с одной картинкой 8×8 (sharp), EMO — все ключи
с одной картинкой 8×8. После движка — отдельный `<script>` с доступом для оракула (классические скрипты делят
глобальную лексическую область, поэтому `R`, `G`, `P` видны):

```html
<script>window.__GG={get R(){return R},get G(){return G},get P(){return P},stagesOf,acc,look,wrapEN,norm,trail,go,TMAP};</script>
```

`games` у шапки темы в `bundle.json` считает сам прототип (`__GG.stagesOf`) — так же, как бэкенд.

Оракул (jsdom, `runScripts: 'dangerously'`, `Math.random` = mulberry32 с сидом 42, сброс перед каждым набором):
`stages` — `stagesOf` каждой темы; `acc` — сетка `ok ∈ 0..n`, `n ∈ {8,10,12,16}`; `look` — список ключей
(`snakes, worked, better, 1st, 22nd, i'm, cats', studies, stopped, making, bigger, quickly, xyz`); `wrap` —
строки с апострофами, порядковыми, слэшем и пунктуацией; `norm` — кавычки ’, пробелы, точка в конце;
`sets` — после `go('game', g)` для игр `pick, match, sort, build, trans, fix, place, type, listen, race, boss`
форма `R` (функция `shape` ниже, одна и та же в оракуле и тесте); `raceSpeed` — `R.speed` у `race`.

```js
const shape = (g, R) => ({
  pick: () => R.items.map((x) => ({ s: x.s, opts: x.opts.map((o) => [o.x, !!o.ok]) })),
  trans: () => R.items.map((x) => ({ from: x.from, opts: x.opts.map((o) => [o.x, !!o.ok]) })),
  match: () => R.cards.map((c) => [c.t, c.side, c.p]),
  sort: () => R.items.map((x) => [x.w, x.c]),
  build: () => ({ items: R.items.map((x) => x.s), pool: R.pool.map((p) => [p.w, !!p.extra]) }),
  fix: () => R.items.map((x) => x.s),
  place: () => R.items.map((x) => x.s),
  type: () => R.items.map((x) => x.s),
  listen: () => R.items.map((x) => ({ right: x.right, opts: x.opts.map((o) => [o.x, !!o.ok]) })),
  race: () => R.items.map((x) => [x.s, x.truth]),
  boss: () => R.items.map((x) => ({ kind: x.kind, say: x.say, opts: x.opts.map((o) => [o.x, !!o.ok]) })),
})[g]()
```

- [ ] **Step 1:** написать `make-fixture.js` (строки `const LEVELS/PROGRAM/TOPICS/GLOSS/IMG/EMO` прототипа
  — по номерам строк, найденным `startsWith`; движок — строки между `GLOSS`/`IMG` и `EMO` как есть).
- [ ] **Step 2:** `node scripts/grammar-games/make-fixture.js --html data/jtsgrammar-games.html` → печатает размеры.
- [ ] **Step 3:** написать `extract-oracle.js`; `node scripts/grammar-games/extract-oracle.js` → печатает число
  наборов (6 тем × до 11 игр).
- [ ] **Step 4: commit** `test(grammar-games): фикстура прототипа и оракул`.

---

### Task 3: Чистые правила — набор игр, звёзды, слова, уровень, очередь сдач

**Files:**
- Create: `src/practice/grammar-games/{stages,text,levelOf,results}.js` и тесты `*.test.js`

**Interfaces:**
- Produces:
  - `stages.js`: `GAME_KEYS` (13 ключей в порядке прототипа), `stagesOf(tp) → string[]`, `acc(ok, n) → 0..3`.
  - `text.js`: `esc(s)`, `wrapEN(s) → html` (спаны `.w[data-k]`), `lookUp(gloss, k) → [ru, kk] | null`,
    `norm(s)`, `trail(w)`, `sentOf(s, a)` — код прототипа, `look` получает словарь аргументом.
  - `levelOf.js`: `levelOf(userLevel) → 'L1'…'L5'`.
  - `results.js`: `createResultQueue(send, {wait}) → { submit(body) → Promise<{coins, best}|null>, flush() →
    Promise<number>, pendingStars() → {<topicId>: {<game>: stars}} }`.

- [ ] **Step 1: тесты** `stages.test.js` / `text.test.js` (против `oracle.json`):

```js
import oracle from './__fixtures__/oracle.json'
import bundle from './__fixtures__/bundle.json'
it('набор игр каждой темы = прототип и бэкенд', () => {
  for (const [id, want] of Object.entries(oracle.stages)) {
    expect(stagesOf(bundle.topics[id])).toEqual(want)
    expect(bundle.index.topics.find((t) => t.id === id).games).toEqual(want)
  }
})
it('пороги звёзд = прототип', () => { for (const [ok, n, s] of oracle.acc) expect(acc(ok, n)).toBe(s) })
it('поиск перевода = прототип', () => { for (const [k, v] of Object.entries(oracle.look)) expect(lookUp(bundle.gloss, k)).toEqual(v) })
it('разбор слов = прототип', () => { for (const [s, html] of Object.entries(oracle.wrap)) expect(wrapEN(s)).toBe(html) })
it('нормализация ответа = прототип', () => { for (const [s, v] of Object.entries(oracle.norm)) expect(norm(s)).toBe(v) })
```

  `levelOf.test.js`:

```js
it.each([['A0', 'L1'], ['a1', 'L2'], ['A2', 'L3'], ['B1', 'L4'], ['B1+', 'L4'], ['B2', 'L5'], ['C1', 'L5'], ['C2', 'L5'], [null, 'L1'], ['', 'L1'], ['xx', 'L1']])('%s → %s', (lv, want) => expect(levelOf(lv)).toBe(want))
```

  `results.test.js` — подменный `send`:

```js
it('сдача уходит ровно полями {topicId, game, stars}, ответ — монеты', async () => {
  const send = vi.fn(async () => ({ best: 2, coins: 3, balance: {} }))
  const q = createResultQueue(send, { wait: async () => {} })
  await expect(q.submit({ topicId: 'L1-01', game: 'pick', stars: 2, extra: 1 })).resolves.toEqual({ coins: 3, best: 2 })
  expect(send).toHaveBeenCalledWith({ topicId: 'L1-01', game: 'pick', stars: 2 })
})
it('сбой сети: звёзды ждут, уходят со следующей сдачей, монеты суммируются', async () => {
  const send = vi.fn().mockRejectedValueOnce(new Error('Нет связи с сервером.')).mockResolvedValue({ best: 3, coins: 2 })
  const q = createResultQueue(send, { wait: async () => {} })
  expect(await q.submit({ topicId: 'L1-01', game: 'pick', stars: 3 })).toBeNull()
  expect(q.pendingStars()).toEqual({ 'L1-01': { pick: 3 } })
  expect(await q.submit({ topicId: 'L1-01', game: 'match', stars: 1 })).toEqual({ coins: 4, best: 3 })
  expect(q.pendingStars()).toEqual({})
})
it('409 повторяется, а не теряется', async () => {
  const conflict = Object.assign(new Error('409'), { status: 409 })
  const send = vi.fn().mockRejectedValueOnce(conflict).mockResolvedValue({ best: 1, coins: 0 })
  const q = createResultQueue(send, { wait: async () => {} })
  expect(await q.submit({ topicId: 'L1-01', game: 'fix', stars: 1 })).toEqual({ coins: 0, best: 1 })
  expect(send).toHaveBeenCalledTimes(2)
})
it('отказ 4xx (тема скрыта) не копится', async () => {
  const send = vi.fn().mockRejectedValue(Object.assign(new Error('404'), { status: 404 }))
  const q = createResultQueue(send, { wait: async () => {} })
  expect(await q.submit({ topicId: 'L1-01', game: 'fix', stars: 1 })).toBeNull()
  expect(q.pendingStars()).toEqual({})
})
it('ждущая сдача той же игры держит лучшие звёзды', async () => {
  const send = vi.fn().mockRejectedValue(new Error('net'))
  const q = createResultQueue(send, { wait: async () => {} })
  await q.submit({ topicId: 'L1-01', game: 'pick', stars: 3 })
  await q.submit({ topicId: 'L1-01', game: 'pick', stars: 1 })
  expect(q.pendingStars()).toEqual({ 'L1-01': { pick: 3 } })
})
```

- [ ] **Step 2:** прогнать → FAIL.
- [ ] **Step 3: код.** `stages.js`, `text.js` — строки прототипа (`stagesOf`, `acc`, `esc`, `wrapEN`, `look` →
  `lookUp(GLOSS, k)`, `norm`, `trail`, `sentOf`) без изменений логики. `levelOf.js`:

```js
const TABLE = { A0: 'L1', A1: 'L2', A2: 'L3', B1: 'L4', B2: 'L5', C1: 'L5', C2: 'L5' }
export function levelOf(userLevel) {
  const k = String(userLevel || '').trim().toUpperCase().slice(0, 2)
  return TABLE[k] || 'L1'
}
```

  `results.js`:

```js
const key = (b) => `${b.topicId}|${b.game}`
export function createResultQueue(send, { wait = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const pending = new Map()
  let chain = Promise.resolve()
  async function postOne(body) {
    for (let i = 0; ; i++) {
      try { return await send(body) } catch (e) {
        if (e?.status === 409 && i < 3) { await wait(500 * (i + 1)); continue }
        throw e
      }
    }
  }
  async function flushNow() {
    let coins = 0
    const done = new Map()
    for (const [k, body] of [...pending]) {
      try {
        const r = await postOne(body)
        coins += Math.max(0, Number(r?.coins) || 0)
        done.set(k, Number(r?.best) || body.stars)
        if (pending.get(k) === body) pending.delete(k)
      } catch (e) {
        if (e?.status >= 400 && e?.status < 500 && e.status !== 409) pending.delete(k)
      }
    }
    return { coins, done }
  }
  return {
    submit({ topicId, game, stars }) {
      const body = { topicId, game, stars }
      const prev = pending.get(key(body))
      if (!prev || prev.stars < stars) pending.set(key(body), body)
      const run = chain.then(flushNow)
      chain = run.catch(() => {})
      return run.then(({ coins, done }) => (done.has(key(body)) ? { coins, best: done.get(key(body)) } : null))
    },
    flush() { const run = chain.then(flushNow); chain = run.catch(() => {}); return run.then((r) => r.coins) },
    pendingStars() {
      const out = {}
      for (const b of pending.values()) (out[b.topicId] ||= {})[b.game] = b.stars
      return out
    },
  }
}
```

- [ ] **Step 4:** тесты → PASS.
- [ ] **Step 5: commit** `feat(grammar-games): правила — игры, звёзды, слова, уровень, очередь сдач`.

---

### Task 4: Движок в тени — оболочка, правило, окно слова, игры

**Files:**
- Create: `src/practice/grammar-games/engine.js`, `styles.js`, `voice.js`, `engine.test.js`, `styles.test.js`
- Modify: `src/kkFont.test.js` (ENGINES), `src/practice/practiceKeys.js` (`GRAMMAR_GAMES_SOUND_KEY`)

**Interfaces:**
- Consumes: Task 1–3 (`EMOJI_LIST`, `stagesOf`, `acc`, `wrapEN`, `lookUp`, `norm`, `trail`, `sentOf`, `esc`).
- Produces: `mountGrammarGames(root, cfg) → { destroy(), setLang(l), setSound(v), go(view, a, b) → Promise,
  snapshot() → {view, lv, topic, stage, tab, R, P} }`;
  `cfg = { index:{levels,program,topics}, progress:{<id>:{<game>:n}}, loadTopic(id)→Promise<тело>,
  loadGloss()→Promise<gloss>, onResult(topicId, game, stars)→Promise<{coins}|null>, onAnswer(ok), lang, level,
  sound, speak(text), stopVoice(), addWord({en,ru,kk})→Promise<'dict'|'bank'|false>,
  asset:{img(name), emoji(ch), emojiList}, initialTopic, scrollTop() }`;
  `GRAMMAR_GAMES_CSS` (корень `.gg`, гарнитура `var(--gg-font,inherit)`); `speakGrammar(text)`, `stopGrammar()`.

Правила переноса — всё остальное в движке дословно:

| Прототип | Порт |
|---|---|
| `TOPICS`/`TMAP` | хаб — по `cfg.index.topics` (`IDX`), тело — `TMAP[id]` после `cfg.loadTopic(id)`; пока грузится — «Загружаем тему…», сбой — текст и «Ещё раз» |
| `GLOSS` | `cfg.loadGloss()` на первом клике по слову, окно сначала с «…» |
| `IMG.x`, `EMO` | `cfg.asset.img('x')`; `emojify` по `cfg.asset.emojiList`, `MutationObserver` на корне |
| `localStorage`, `saveP`, `G.unlock`, `topbar`, `toggle`, `setLang` | нет; `G.lang = cfg.lang`, `G.lv = cfg.level`, `G.sound = cfg.sound`; `api.setLang/setSound` |
| `say(text, force)` | без `force` — молчит (как в прототипе: автоозвучка выключена); с `force` — `cfg.speak(text)` |
| `HOOK.finish` | `cfg.onResult(...)`; монеты > 0 — `toast` «+N монет» |
| `HOOK.mist` | `mist()` пустая (решение 25.10) |
| `HOOK.popBtn` | своя кнопка «＋ В словарь» → `cfg.addWord`, «✓ В словаре» — слова этого захода (Д14) |
| `onclick="f(a,b)"` в разметке | `data-act="f" data-args='[a,b]'` и один делегированный обработчик на корне (inline-обработчики в тени ищут глобальные функции, которых у модуля нет) |
| `onkeydown` у поля «Впиши сам» | делегированный `keydown` на корне |
| `document.addEventListener(click/mousemove/keydown)`, `window resize` | на корне / `window` через `AbortController`, снимается в `destroy` |
| `window.setTimeout` = обёртка поколений | локальная `setTimeout` в замыкании: поколение `GEN` + `dead` |
| `document.body.appendChild` (тосты, конфетти, окно) | в корень |
| `.pop` по координатам страницы | по координатам корня (`position:relative`) |
| `window.scrollTo(0,0)` | `cfg.scrollTop()` |
| `document.createElement` | `doc.createElement` (`doc = root.ownerDocument`) |
| Web Audio | тот же синтез; контекст создаётся в клике, `resume()` если спит, `close()` в `destroy` |
| ответы | `answered(ok)` → `cfg.onAnswer(ok)` в каждой игре |

- [ ] **Step 1: тесты** `engine.test.js` (jsdom, `bundle.json`, `oracle.json`):
  - наборы всех игр 6 тем = `oracle.sets`, `race` — ещё и `R.speed` = `oracle.raceSpeed`;
  - хаб рисует уровень по `cfg.level`, карточки тем — по `index.topics`, тема без шапки — «скоро»;
  - правило: клик по `.c3d` открывает `.ov .modal`; клик по `.w` — окно с RU/KZ после `loadGloss`, «В словарь»
    зовёт `addWord({en, ru, kk})` и становится «✓ В словаре»;
  - доигранная «Выбери форму» зовёт `onResult('L1-01','pick',3)` и `onAnswer(true)` на каждый ответ, плитка
    игры получает звёзды;
  - сторож исходника: нет `document.`, `location.`, `localStorage`, `speechSynthesis`, `HOOK`, `onclick="`;
  - `destroy` чистит разметку, глушит голос, закрывает `AudioContext`, снимает таймеры (ни один не срабатывает).
  `styles.test.js`: нет `:root{`/`body{`/`html,body`, есть `.gg{`, гарнитура только `var(--gg-font,inherit)`,
  нет `@import`/`fonts.googleapis`.
- [ ] **Step 2:** прогнать → FAIL.
- [ ] **Step 3:** `styles.js` — CSS прототипа (строки 10–322) с правками: `:root{…}` и `html,body{…}` → `.gg{…;
  position:relative;font-family:var(--gg-font,inherit)}`; удалены `.top`, `.logo`, `.seg`, `.mascot-top`, неиспользуемый
  блок `QUEST (unused)` и их строки в `@media`.
- [ ] **Step 4:** `voice.js`:

```js
import { playTts, stopTts } from '../../lib/speech.js'
import { VOICE } from '../../lib/ttsShared.js'
const RATE = 0.9
function speakDevice(text) { try { const u = new SpeechSynthesisUtterance(text); u.lang = 'en-GB'; u.rate = RATE; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u) } catch { /* нет синтеза */ } }
export function speakGrammar(text) { playTts(text, { voice: VOICE.gb, lang: 'en', speed: RATE, onFail: (why) => why !== 'empty' && speakDevice(text) }) }
export function stopGrammar() { stopTts(); try { window.speechSynthesis.cancel() } catch { /* нет синтеза */ } }
```

- [ ] **Step 5:** `engine.js` по таблице выше; ENGINES в `kkFont.test.js`:
  `'grammar-games': (css) => expect(css).toContain('font-family:var(--gg-font,inherit)')`.
- [ ] **Step 6:** тесты → PASS.
- [ ] **Step 7: commit** `feat(grammar-games): движок прототипа в Shadow DOM`.

---

### Task 5: Проход всех 125 тем

**Files:**
- Create: `src/practice/grammar-games/allTopics.test.js`

**Interfaces:**
- Consumes: `mountGrammarGames`, `api.snapshot().R` — решатель читает верный ответ из состояния игры.

- [ ] **Step 1:** тест: читает `const TOPICS=`, `LEVELS`, `PROGRAM` из `data/jtsgrammar-games.html`; на каждую тему
  — свой `it` (таймаут 60 с); фальшивые таймеры (`setTimeout`, `setInterval`, `requestAnimationFrame`,
  `performance`, `Date`); для каждой игры `stagesOf(тема)` — `await api.go('game', g)`, решатель кликает верные
  ответы (pick/trans/listen/boss — вариант с `ok`; match — пары по `p`; sort — фишка и корзина `c`; build —
  пузыри по порядку слов `s`; fix — слово `w`, затем `c`; place — зона `z`; type — ввод `a` + Enter; dialog —
  ждёт реплики и выбирает `a`; race — «Старт» и кнопка по `truth`; catch — «Старт» и облака `ok` до конца
  времени) и крутит таймеры, пока `snapshot().view !== 'result'` (не больше 400 шагов). Ожидание: экран
  результата, `onResult` с этой игрой, звёзды ≥ 1 у всех игр, кроме `catch` (там ≥ 1 при живых сердцах), и ни
  одного исключения (`window.onerror`/`console.error` перехвачены).
- [ ] **Step 2:** `npx vitest run src/practice/grammar-games/allTopics.test.js` → PASS (иначе чинить порт).
- [ ] **Step 3: commit** `test(grammar-games): каждая игра каждой из 125 тем доходит до результата`.

---

### Task 6: Экран, данные, место в «Практике», Луна

**Files:**
- Create: `src/screens/grammar-games/useGrammarGamesData.js`, `src/screens/GrammarGamesPage.jsx`
- Modify: `src/api.js`, `src/App.jsx`, `src/lib/navStack.js`, `src/screens/practice/practiceTabs.js` (+ test),
  `src/screens/PracticePage.jsx`, `src/styles.css`, `src/theme-dark.generated.css`, `src/i18n.jsx`,
  `src/lib/assistant/{destinations,prompt,knowledge}.js`, `src/lib/assistant/destinations.test.js`

**Interfaces:**
- Produces: `getGrammarGames(token)`, `getGrammarGamesTopic(token, id)`, `getGrammarGamesGloss(token)`,
  `getGrammarGamesProgress(token)`, `postGrammarGamesResult(token, {topicId, game, stars})` (все — `authGet`/
  `authPost`, без `localStorage`-кэша); `useGrammarGamesData(token) → {status:'guest'|'loading'|'missing'|'error'|
  'ready', index, progress, retry, loadTopic(id), loadGloss(), submit(topicId, game, stars)}`.

- [ ] **Step 1: тесты** — `practiceTabs.test.js`: `skillModules('writing')` =
  `['grammar','grammarGames','prepositions','writing','verbs','workbooks']`, «Грамматика · игры» сразу после
  «Грамматики», Prepositions — сразу после неё; `destinations.test.js`: `validAction('open','grammar-games')`,
  `destinationIdForScreen('grammar-games')`; `navStack.test.js`: `backLabelKey('grammar-games')`.
- [ ] **Step 2:** прогнать → FAIL.
- [ ] **Step 3:** api.js — 5 функций; хук — память вкладки по владельцу токена (`ownerOf`): список, тела тем,
  словарь; звёзды — свежим запросом на каждый заход, поверх — `pendingStars()` очереди; очередь — одна на
  владельца, `flush()` на заходе; 404 списка → `missing`.
- [ ] **Step 4:** `GrammarGamesPage.jsx` — как `PrepositionsPage`: `LearningLayout`, верхняя строка «← назад» и
  тумблер звука (ключ устройства `jts_grammar_games_sound`), статусы `.ggp-state[data-status]`, хост
  `.ggp-host[data-source="api"][data-topics=N]`, `--gg-font` от вычисленного шрифта хоста, `setLang` по смене
  языка без пересоздания, `scrollTop` — `.learn__main` и окно.
- [ ] **Step 5:** App.jsx — импорт, `PERSISTABLE_SCREENS`, диплинк `&topic=`, `handleNav('grammar-games')`, ветка
  экрана с `sectionBack('writing')`; navStack — `nav.back.grammarGames`; practiceTabs — `{ id: 'grammarGames' }`
  после `grammar`; PracticePage — широкий баннер `grammar-games`; styles.css — градиент L1; тёмный слой — свой
  блок; i18n — `practice.grammarGames.*`, `grammarGames.*`, `nav.back.grammarGames` (ru/kk/en); Луна — строка в
  `destinations.js`, имя экрана в `prompt.js`, раздел в `knowledge.js`.
- [ ] **Step 6:** тесты → PASS; `npm run lint`.
- [ ] **Step 7: commit** `feat(grammar-games): экран, данные и плитка в «Практике»`.

---

### Task 7: E2E, сборка, отчёт, CLAUDE.md

**Files:**
- Create: `tests/grammar-games.spec.js`
- Modify: `CLAUDE.md`

- [ ] **Step 1:** спека: ручки подменены `page.route` (`**/mobile/grammar-games`, `**/topics/**`, `**/gloss`,
  `**/progress`, POST `**/mobile/grammar-games/result**`, `/api/tts` — тихий mp3); сценарии:
  1. «Практика» → «Письмо» → баннер → тема `L1-01` → правило: карточка раскрывается, слово кликается, «В словарь»
     (POST `**/mobile/saved-words**` подменён) → «К играм» → «Выбери форму» верными ответами (ответ — из фикстуры
     по тексту вопроса) до результата → POST `result` ушёл ровно `{topicId:'L1-01', game:'pick', stars:3}` →
     плитка игры с тремя звёздами → перезагрузка (звёзды отдаёт подменённый `progress`) → звёзды на месте; ноль
     `pageerror` и `console.error`;
  2. гость → `.ggp-state[data-status="guest"]`; 404 списка → `missing`;
  3. 360 px — без горизонтальной прокрутки на хабе, правиле и в игре.
- [ ] **Step 2:** `npm run build` (во временном worktree с junction, `--webpack`), `npm run lint`, `npm test`
  (без `.claude/**`), e2e одним воркером через обёртку системного Chrome на своём порту.
- [ ] **Step 3:** снимки (`.mjs` в scratchpad, `page.route` на фикстуру): хаб, правило, окно карточки, окно слова,
  сетка игр, «Гонка», «Бой», результат, телефон 360 px → отчёт-артефакт.
- [ ] **Step 4:** абзац в CLAUDE.md о разделе.
- [ ] **Step 5: commit** `test(grammar-games): e2e и абзац в CLAUDE.md`; ревью ветки субагентом, правки — отдельным
  коммитом.
