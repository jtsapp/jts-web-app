# Word Rush Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Вторая игра «Аркады» — 3D-бегун по трём дорожкам сквозь ворота с переводом слова; «Аркада» становится залом из двух игр.

**Architecture:** Правила — два чистых модуля (`deck.js` собирает ряды ворот из Словаря, `engine.js` двигает забег по кадрам), оба под vitest. Мир рисует `runnerScene.js` на three.js, загружаемый динамическим импортом только с экрана игры; он получает снимок состояния каждый кадр и правил не знает. `RunnerGame.jsx` держит жизненный цикл, ввод и HTML-шапку поверх canvas.

**Tech Stack:** Next.js 16 (App Router как оболочка SPA), React 19, JavaScript (без TS), three 0.186 (`GLTFLoader`, `AnimationMixer`), vitest 2 + jsdom, Playwright, Higgsfield MCP (картинки, Meshy image→3D с ригом и клипом бега), sharp, `@gltf-transform/cli` через npx.

Спека: `docs/superpowers/specs/2026-09-30-arcade-word-rush-design.md`.

## Global Constraints

- Только `.js`/`.jsx`, никаких TS-файлов.
- Комментарии на русском и объясняют «почему».
- Строки UI — `useI18n()` из `src/i18n.jsx`, ключи одинаковы в `ru`/`en`/`kk` (тест `src/i18n.arcade.test.js` ловит пропуски по префиксам `arcade.`, `practice.arcade.`, `practice.chip.arcade`).
- Стили — только глобальные файлы: `src/arcade.css` (игра, зал), `src/styles.css` (карточка Практики `.pk-arcade`). Шрифт — Manrope.
- three.js импортируется только из `src/screens/arcade/runner/runnerScene.js`, а он — только динамическим `import()`.
- Сложности — те же ключи и ориентиры IELTS, что у Speak or Die (`DIFFICULTIES` в `src/practice/arcade/engine.js`).
- Сложность → слова + время на решение: `easy` A1+A2 6.0 с, `medium` B1 4.5 с, `hard` B2 3.5 с, `veryHard` C1 2.5 с. По умолчанию `medium`.
- 3 жизни; после верного ряда скорость ×1.04, потолок ×1.6; слово с ошибкой возвращается через 5 рядов.
- Всё 3D ≤ 3 МБ, текстуры ≤ 1024 px, `pixelRatio ≤ 1.5` на сенсорных экранах.
- Работа — в worktree `.claude/worktrees/word-rush`, ветка `feat/arcade-word-rush` от `origin/develop`. Основное дерево не трогать.
- Тесты: `npx vitest run --exclude '.claude/**' <файлы>`; e2e — с `E2E_PORT` (порт 3100 может держать чужой воркtree).

---

### Task 1: Ассеты Higgsfield и зависимость three

**Files:**
- Create: `public/arcade/runner/runner.glb`, `public/arcade/runner/skyline.webp`, `public/arcade/runner/card.webp`
- Modify: `package.json`, `package-lock.json` (уже: `three@^0.186.1`)
- Modify: `docs/superpowers/specs/2026-09-30-arcade-word-rush-design.md` (ворота — кодом)

**Interfaces:**
- Produces: GLB бегуна с одним клипом бега (`gltf.animations[0]`), стоящий по оси Y; `skyline.webp` ~2048×880; `card.webp` ~960×540. Пути — `/arcade/runner/*`.

- [ ] **Step 1: Картинка бегуна** — `generate_image`, модель `gpt_image_2_5`, `aspect_ratio: "2:3"`, промпт:

```
Full-body stylized 3D game character for a mobile endless-runner, a friendly teenage student
with a small backpack, purple hoodie (#874BF8) with orange accents (#FF631E), dark joggers,
white sneakers, short dark hair. Standing in a neutral A-pose, arms slightly away from body,
front view, whole body visible head to toe, centered. Plain light grey studio background,
soft even lighting, clean silhouette, no props in hands, no text. Smooth stylized Pixar-like
proportions, simple shapes suitable for low-poly 3D reconstruction.
```

Проверить глазами: весь рост в кадре, руки не касаются тела, фон ровный. Иначе — ещё вариант.

- [ ] **Step 2: 3D-бегун с ригом и бегом** — `generate_3d`, модель `image_to_3d`, медиа = job_id картинки (роль `image`), параметры: `should_texture: true`, `enable_rigging: true`, `enable_animation: true`, `animation_action_id: 16` (RunFast), `pose_mode: "a-pose"`, `target_polycount: 10000`, `topology: "triangle"`. Дождаться `jobs_wait`, скачать GLB в scratchpad:

```bash
curl -sSL -o "$SCRATCH/runner-raw.glb" "<url из результата>"
```

- [ ] **Step 3: Проверить и ужать GLB**

```bash
npx -y @gltf-transform/cli inspect "$SCRATCH/runner-raw.glb"
npx -y @gltf-transform/cli resize "$SCRATCH/runner-raw.glb" "$SCRATCH/runner-1k.glb" --width 1024 --height 1024
npx -y @gltf-transform/cli webp "$SCRATCH/runner-1k.glb" public/arcade/runner/runner.glb
ls -la public/arcade/runner/runner.glb
```

Expected: в `inspect` есть анимация (1 клип) и skin; итоговый файл ≤ 2.5 МБ. Если клипов несколько — оставить бег (`npx -y @gltf-transform/cli inspect` покажет имена; лишние удаляются на шаге 3 задачи 4 выбором клипа по имени — записать имя).

- [ ] **Step 4: Панорама** — `generate_image`, `gpt_image_2_5`, `aspect_ratio: "21:9"`:

```
Wide panoramic skyline of a futuristic city at twilight seen from street level far away,
silhouettes of skyscrapers with glowing windows, purple and violet sky (#3a1a86 to #1c0d45)
with a warm orange-peach sunset glow near the horizon, soft neon haze, stylized game background
art, smooth gradients, no text, no logos, no people, horizon in the lower third.
```

Скачать, сконвертировать:

```bash
node -e "require('sharp')(process.argv[1]).resize({width:2048}).webp({quality:78}).toFile('public/arcade/runner/skyline.webp').then(i=>console.log(i))" "$SCRATCH/skyline.png"
```

- [ ] **Step 5: Картинка карточки** — `generate_image`, `gpt_image_2_5`, `aspect_ratio: "16:9"`, в медиа — job_id картинки бегуна (роль-референс, см. `models_explore get gpt_image_2_5`):

```
Key art for a mobile endless-runner game: the same teenage student with a purple hoodie and
backpack seen from behind, running down a glowing three-lane street at twilight toward three
neon archway gates (violet neon tubes), futuristic city with lit windows on both sides,
purple night sky with orange sunset glow, dynamic motion, stylized 3D game art, no text,
no letters, no logos.
```

```bash
node -e "require('sharp')(process.argv[1]).resize({width:960}).webp({quality:80}).toFile('public/arcade/runner/card.webp').then(i=>console.log(i))" "$SCRATCH/card.png"
```

- [ ] **Step 6: Поправить спеку** — в таблице ассетов строку `gate.glb` заменить на:

```
| ворота | строятся кодом: неоновая трубка-арка (`TubeGeometry`) + табличка-текстура. Светятся без постобработки и красятся на проходе в один `color.setHex`; модель ворот дала бы то же тяжелее |
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json public/arcade/runner docs/superpowers/specs/2026-09-30-arcade-word-rush-design.md
git commit -m "feat(arcade): ассеты Word Rush — бегун (Higgsfield/Meshy, риг+бег), панорама, карточка; three"
```

---

### Task 2: Колода рядов (`deck.js`)

**Files:**
- Create: `src/practice/arcade/runner/deck.js`
- Test: `src/practice/arcade/runner/deck.test.js`

**Interfaces:**
- Consumes: слова Словаря `{ id, en, ru, kk, pos, topic }`.
- Produces:
  - `createDeck(words, { lang = 'ru', rng = Math.random } = {})` → `{ next(): Row, miss(row: { id, answer }): void, size: number }`; бросает `Error`, если после чистки меньше 3 слов.
  - `Row = { id: number, prompt: string, answer: string, options: [string, string, string], correct: 0|1|2 }`.
  - `normPos(pos: string): string`, `promptOf(word, lang): string`, `RETRY_AFTER = 5`.

- [ ] **Step 1: Failing tests** — `src/practice/arcade/runner/deck.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { RETRY_AFTER, createDeck, normPos, promptOf } from './deck.js'

// Зерно фиксировано (mulberry32): ряды случайные, но тест — нет.
function seeded(seed = 1) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const w = (id, en, ru, pos, topic, kk = `${ru}-kk`) => ({ id, en, ru, kk, pos, topic })

// Мини-словарь с теми же неровностями, что у настоящего: `adj` и `adjective`
// вперемешку, перевод из двух смыслов через запятую, общий смысл у big/large.
const WORDS = [
  w(1, 'big', 'большой', 'adj', 'size'),
  w(2, 'large', 'большой, крупный', 'adjective', 'size'),
  w(3, 'small', 'маленький', 'adj', 'size'),
  w(4, 'tiny', 'крошечный', 'adjective', 'size'),
  w(5, 'red', 'красный', 'adj', 'color'),
  w(6, 'dog', 'собака', 'noun', 'animals'),
  w(7, 'cat', 'кошка', 'noun', 'animals'),
  w(8, 'run', 'бежать', 'verb', 'move'),
  w(9, 'walk', 'идти', 'verb', 'move'),
  w(10, 'quickly', 'быстро', 'adverb', 'manner'),
]
const POS = Object.fromEntries(WORDS.map((x) => [x.en, normPos(x.pos)]))

const rows = (n, opts = {}) => {
  const deck = createDeck(WORDS, { rng: seeded(7), ...opts })
  return Array.from({ length: n }, () => deck.next())
}

describe('normPos и promptOf', () => {
  it('сводит длинные имена частей речи к коротким', () => {
    expect(normPos('adjective')).toBe('adj')
    expect(normPos('Adverb ')).toBe('adv')
    expect(normPos('phrasal verb')).toBe('verb')
    expect(normPos('noun')).toBe('noun')
  })

  it('вопрос по-казахски только в казахском интерфейсе', () => {
    expect(promptOf(WORDS[0], 'kk')).toBe('большой-kk')
    expect(promptOf(WORDS[0], 'ru')).toBe('большой')
    expect(promptOf(WORDS[0], 'en')).toBe('большой')
    expect(promptOf({ ru: 'да', kk: '' }, 'kk')).toBe('да')
  })
})

describe('createDeck', () => {
  it('ряд: вопрос-перевод и ровно одни верные ворота из трёх разных', () => {
    for (const row of rows(60)) {
      expect(row.options).toHaveLength(3)
      expect(new Set(row.options).size).toBe(3)
      expect(row.options[row.correct]).toBe(row.answer)
      expect(WORDS.find((x) => x.en === row.answer).ru).toBe(row.prompt)
    }
  })

  it('ложные ворота — той же части речи, когда её хватает', () => {
    for (const row of rows(200)) {
      if (POS[row.answer] !== 'adj') continue
      for (const option of row.options) expect(POS[option]).toBe('adj')
    }
  })

  it('сначала — та же тема: у small ложные только из size', () => {
    const smallRows = rows(400).filter((r) => r.answer === 'small')
    expect(smallRows.length).toBeGreaterThan(0)
    for (const row of smallRows) expect(row.options).not.toContain('red')
  })

  it('не ставит ложными слово с тем же смыслом: big и large не встречаются вместе', () => {
    for (const row of rows(300)) {
      if (row.answer === 'big') expect(row.options).not.toContain('large')
      if (row.answer === 'large') expect(row.options).not.toContain('big')
    }
  })

  it('смысл сравнивается на языке вопроса', () => {
    const words = [
      w(1, 'lake', 'озеро', 'noun', 'x', 'көл'),
      w(2, 'pond', 'пруд', 'noun', 'x', 'көл'),
      w(3, 'river', 'река', 'noun', 'x', 'өзен'),
      w(4, 'sea', 'море', 'noun', 'x', 'теңіз'),
    ]
    const deck = createDeck(words, { lang: 'kk', rng: seeded(3) })
    for (let i = 0; i < 100; i++) {
      const row = deck.next()
      if (row.answer === 'lake') expect(row.options).not.toContain('pond')
      if (row.answer === 'lake') expect(row.prompt).toBe('көл')
    }
  })

  it('верная дорожка случайна: каждая выпадает заметно часто', () => {
    const counts = [0, 0, 0]
    for (const row of rows(300)) counts[row.correct]++
    for (const c of counts) expect(c).toBeGreaterThan(60)
  })

  it('слова не повторяются, пока не кончится пул', () => {
    const ids = rows(10).map((r) => r.id)
    expect(new Set(ids).size).toBe(10)
  })

  it('слово с ошибкой возвращается через RETRY_AFTER рядов', () => {
    const deck = createDeck(WORDS, { rng: seeded(11) })
    const first = deck.next()
    deck.miss(first)
    const after = Array.from({ length: RETRY_AFTER + 1 }, () => deck.next())
    expect(after.slice(0, RETRY_AFTER).map((r) => r.id)).not.toContain(first.id)
    expect(after[RETRY_AFTER].id).toBe(first.id)
  })

  it('чистит пул: дубли en, слова без перевода; меньше трёх — ошибка', () => {
    const deck = createDeck([...WORDS, w(99, 'Big', 'крупный', 'adj', 'size'), { id: 100, en: 'x', ru: '', kk: '' }])
    expect(deck.size).toBe(WORDS.length)
    expect(() => createDeck(WORDS.slice(0, 2))).toThrow()
  })
})
```

- [ ] **Step 2: Run — FAIL**

Run: `npx vitest run --exclude '.claude/**' src/practice/arcade/runner/deck.test.js`
Expected: FAIL, `Failed to resolve import "./deck.js"`.

- [ ] **Step 3: Implementation** — `src/practice/arcade/runner/deck.js`:

```js
// «Word Rush» — колода рядов ворот для второй игры «Аркады». Чистый модуль:
// ни React, ни three.js, случайность приходит снаружи (`rng`), поэтому
// правила ряда проверяются тестом с фиксированным зерном.
//
// Ряд — слово-вопрос на языке интерфейса и три английских слова на воротах,
// одно из них — перевод. Слова — из Словаря (public/practice/vocab/
// essential-*.json): там уже есть ru, kk, часть речи и тема.

// Слово с ошибкой возвращается через столько рядов: достаточно далеко, чтобы
// ответ шёл не из памяти о только что мелькнувшей подсказке.
export const RETRY_AFTER = 5

// Словарь пишет части речи вразнобой: в A2, B1 и C1 рядом живут `adj` и
// `adjective`, `adv` и `adverb`. Без приведения ложные ворота для
// `adjective` искались бы в половине прилагательных, а при нехватке — среди
// существительных, и слово угадывалось бы по части речи, а не по смыслу.
const POS_ALIASES = {
  adjective: 'adj',
  adverb: 'adv',
  conjunction: 'conj',
  preposition: 'prep',
  pronoun: 'pron',
  determiner: 'det',
  exclamation: 'excl',
  interj: 'excl',
  'phrasal verb': 'verb',
}

export function normPos(pos) {
  const p = String(pos || '').trim().toLowerCase()
  return POS_ALIASES[p] || p
}

const norm = (s) => String(s || '').trim().toLowerCase().replace(/ё/g, 'е')

// «наркоман, зависимый человек» — два ответа, а не один: совпадение с любым
// из них делает ложные ворота вторыми верными.
const sensesOf = (s) => String(s || '').split(/[,;/]/).map(norm).filter(Boolean)

// Вопрос по-казахски — только в казахском интерфейсе. Английский интерфейс
// тоже получает русский: переводить английское слово на английский нечего.
export function promptOf(word, lang) {
  return lang === 'kk' && word.kk ? word.kk : word.ru
}

export function createDeck(words, { lang = 'ru', rng = Math.random } = {}) {
  const seen = new Set()
  const pool = []
  for (const w of words || []) {
    const key = norm(w?.en)
    const prompt = w ? promptOf(w, lang) : ''
    if (!key || !prompt || seen.has(key)) continue
    seen.add(key)
    pool.push({ id: w.id, en: w.en, prompt, key, pos: normPos(w.pos), topic: w.topic || '', senses: sensesOf(prompt) })
  }
  if (pool.length < 3) throw new Error('word rush: в колоде меньше трёх слов')

  const shuffled = (list) => {
    const a = list.slice()
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  // Ложные ворота с тем же смыслом на языке вопроса дали бы два верных ответа.
  const clash = (a, b) => a.key === b.key || a.senses.some((s) => b.senses.includes(s))

  let queue = []
  let previous = null
  let drawn = 0
  const retry = []

  function pickTarget() {
    const due = retry.findIndex((r) => r.due <= drawn)
    if (due >= 0) return retry.splice(due, 1)[0].word
    if (!queue.length) {
      queue = shuffled(pool)
      // Новый круг не начинается со слова, которое только что было.
      if (queue.length > 1 && queue[queue.length - 1] === previous) queue.unshift(queue.pop())
    }
    return queue.pop()
  }

  function pickDistractors(target) {
    const fits = (w) => w !== target && !clash(w, target)
    const tiers = [
      pool.filter((w) => w.pos === target.pos && w.topic === target.topic && fits(w)),
      pool.filter((w) => w.pos === target.pos && w.topic !== target.topic && fits(w)),
      pool.filter((w) => w.pos !== target.pos && fits(w)),
      // Крайний случай крошечного пула: лучше повтор смысла, чем ряд без ворот.
      pool.filter((w) => w !== target && !fits(w)),
    ]
    const out = []
    for (const tier of tiers) {
      const left = tier.slice()
      while (out.length < 2 && left.length) out.push(left.splice(Math.floor(rng() * left.length), 1)[0])
      if (out.length === 2) break
    }
    return out
  }

  function next() {
    const target = pickTarget()
    previous = target
    drawn++
    const others = pickDistractors(target)
    const correct = Math.floor(rng() * 3)
    const options = [0, 1, 2].map((lane) => (lane === correct ? target.en : others.shift().en))
    return { id: target.id, prompt: target.prompt, answer: target.en, options, correct }
  }

  // Ошибка: слово вернётся через RETRY_AFTER рядов, уже с другими ложными
  // воротами. Сверка и по id, и по en: у Easy пул собран из двух уровней.
  function miss(row) {
    const word = pool.find((w) => w.id === row.id && w.en === row.answer)
    if (word) retry.push({ word, due: drawn + RETRY_AFTER })
  }

  return { next, miss, size: pool.length }
}
```

- [ ] **Step 4: Run — PASS**

Run: `npx vitest run --exclude '.claude/**' src/practice/arcade/runner/deck.test.js`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/practice/arcade/runner/deck.js src/practice/arcade/runner/deck.test.js
git commit -m "feat(arcade): колода Word Rush — ложные ворота той же части речи, повтор ошибок"
```

---

### Task 3: Движок забега (`engine.js`)

**Files:**
- Create: `src/practice/arcade/runner/engine.js`
- Test: `src/practice/arcade/runner/engine.test.js`

**Interfaces:**
- Consumes: `DIFFICULTIES` из `src/practice/arcade/engine.js`; `Row` из Task 2.
- Produces:
  - константы `LANES=3`, `LIVES=3`, `SPAWN=60`, `SPEED_STEP=1.04`, `SPEED_CAP=1.6`, `ROW_GAP=0.7`, `MAX_DT=0.25`;
  - `RUN_DIFFICULTIES: { key, band, lead, levels: string[] }[]` (порядок как у `DIFFICULTIES`);
  - `createRun(lead: number): RunState`;
  - `RunState = { lane, lives, score, streak, bestStreak, baseSpeed, speedMul, row: (Row & { z, n }) | null, gap, seq, last: Last | null, mistakes: { prompt, answer, picked }[], elapsed }`;
  - `Last = { hit, lane, correct, id, prompt, answer, picked, seq, at }`;
  - `spawnRow(s, row)`, `move(s, dir: -1|1)`, `advance(s, seconds)`, `needsRow(s)`, `isOver(s)`, `speedOf(s)` — все чистые, возвращают новый объект (или тот же, если ничего не изменилось).

- [ ] **Step 1: Failing tests** — `src/practice/arcade/runner/engine.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { DIFFICULTIES } from '../engine.js'
import {
  LIVES, MAX_DT, ROW_GAP, RUN_DIFFICULTIES, SPAWN, SPEED_CAP, SPEED_STEP,
  advance, createRun, isOver, move, needsRow, spawnRow, speedOf,
} from './engine.js'

const ROW = { id: 7, prompt: 'кошка', answer: 'cat', options: ['dog', 'cat', 'run'], correct: 1 }

// Гоняет кадры по 0.1 с, пока текущий ряд не пройден.
function toPass(s) {
  let guard = 0
  while (s.row && guard++ < 10000) s = advance(s, 0.1)
  return s
}
const hit = (s) => toPass(spawnRow({ ...s, lane: ROW.correct }, ROW))
const miss = (s) => toPass(spawnRow({ ...s, lane: 0 }, ROW))

describe('RUN_DIFFICULTIES', () => {
  it('те же ступени, что у Speak or Die, слова и время по спеке', () => {
    expect(RUN_DIFFICULTIES.map((d) => d.key)).toEqual(DIFFICULTIES.map((d) => d.key))
    expect(RUN_DIFFICULTIES.map((d) => d.band)).toEqual(DIFFICULTIES.map((d) => d.band))
    expect(RUN_DIFFICULTIES.map((d) => d.levels)).toEqual([['A1', 'A2'], ['B1'], ['B2'], ['C1']])
    expect(RUN_DIFFICULTIES.map((d) => d.lead)).toEqual([6, 4.5, 3.5, 2.5])
  })
})

describe('забег', () => {
  it('старт: средняя дорожка, три жизни, ждёт ряд', () => {
    const s = createRun(6)
    expect(s.lane).toBe(1)
    expect(s.lives).toBe(LIVES)
    expect(needsRow(s)).toBe(true)
    expect(speedOf(s)).toBeCloseTo(SPAWN / 6)
  })

  it('ряд доезжает до бегуна ровно за время сложности', () => {
    let s = spawnRow(createRun(6), ROW)
    for (let i = 0; i < 59; i++) s = advance(s, 0.1)
    expect(s.row).not.toBeNull()
    s = advance(s, 0.1)
    expect(s.row).toBeNull()
  })

  it('верные ворота: очко, серия, скорость растёт, жизни на месте', () => {
    const s = hit(createRun(6))
    expect(s.score).toBe(1)
    expect(s.streak).toBe(1)
    expect(s.lives).toBe(LIVES)
    expect(s.speedMul).toBeCloseTo(SPEED_STEP)
    expect(s.last).toMatchObject({ hit: true, picked: 'cat', correct: 1, lane: 1, seq: 1 })
    expect(s.gap).toBe(ROW_GAP)
    expect(needsRow(s)).toBe(false)
    // Кадрами: один длинный кадр режется до MAX_DT и паузу не промотает.
    let later = s
    for (let i = 0; i < 8; i++) later = advance(later, 0.1)
    expect(needsRow(later)).toBe(true)
  })

  it('неверные ворота: минус жизнь, серия с нуля, ошибка записана', () => {
    const s = miss(hit(createRun(6)))
    expect(s.lives).toBe(LIVES - 1)
    expect(s.streak).toBe(0)
    expect(s.speedMul).toBeCloseTo(SPEED_STEP)
    expect(s.mistakes).toEqual([{ prompt: 'кошка', answer: 'cat', picked: 'dog' }])
    expect(s.last).toMatchObject({ hit: false, picked: 'dog', correct: 1, lane: 0 })
  })

  it('считается дорожка в момент прохода, а не при появлении ряда', () => {
    let s = spawnRow(createRun(6), ROW)
    for (let i = 0; i < 59; i++) s = advance(s, 0.1)
    s = advance(move(s, 1), 0.1)
    expect(s.last).toMatchObject({ hit: false, picked: 'run' })
  })

  it('дорожки упираются в края', () => {
    let s = createRun(6)
    s = move(move(s, -1), -1)
    expect(s.lane).toBe(0)
    s = move(move(move(s, 1), 1), 1)
    expect(s.lane).toBe(2)
  })

  it('третья ошибка заканчивает забег, дальше ничего не меняется', () => {
    const s = miss(miss(miss(createRun(6))))
    expect(isOver(s)).toBe(true)
    expect(needsRow(s)).toBe(false)
    expect(advance(s, 1)).toBe(s)
    expect(move(s, 1)).toBe(s)
  })

  it('скорость упирается в потолок', () => {
    let s = createRun(6)
    for (let i = 0; i < 20; i++) s = hit(advance(s, ROW_GAP))
    expect(s.speedMul).toBe(SPEED_CAP)
  })

  it('длинный кадр режется до MAX_DT: ряд не проскакивает бегуна', () => {
    const s = advance(spawnRow(createRun(6), ROW), 10)
    expect(s.row.z).toBeCloseTo(SPAWN - speedOf(s) * MAX_DT)
  })

  it('лучшая серия переживает ошибку', () => {
    const s = hit(miss(hit(hit(createRun(6)))))
    expect(s.streak).toBe(1)
    expect(s.bestStreak).toBe(2)
  })

  it('номер ряда и момент прохода — для сцены и подсказки', () => {
    let s = hit(createRun(6))
    expect(s.last.at).toBeCloseTo(6, 5)
    s = spawnRow(advance(s, ROW_GAP), ROW)
    expect(s.row.n).toBe(1)
  })
})
```

- [ ] **Step 2: Run — FAIL**

Run: `npx vitest run --exclude '.claude/**' src/practice/arcade/runner/engine.test.js`
Expected: FAIL, `Failed to resolve import "./engine.js"`.

- [ ] **Step 3: Implementation** — `src/practice/arcade/runner/engine.js`:

```js
// «Word Rush» — правила забега второй игры «Аркады». Чистый модуль, как
// engine.js у Speak or Die: ни React, ни three.js, время приходит снаружи,
// поэтому забег проверяется тестом кадр за кадром.
//
// Мир одномерный: бегун стоит на месте (z = 0), ряд ворот появляется на
// расстоянии SPAWN и едет к нему. Проход считается в кадре, где ряд дошёл до
// нуля, — по дорожке, на которой бегун стоит в этот момент. На сцене всегда
// один ряд: иначе неясно, к какому ряду относится слово сверху.

import { DIFFICULTIES } from '../engine.js'

export const LANES = 3
export const LIVES = 3
// Единицы мира; сцена ставит туман так, чтобы ряд выезжал из него.
export const SPAWN = 60
export const SPEED_STEP = 1.04
export const SPEED_CAP = 1.6
// Пауза между рядами: исход виден, слово сверху успевает смениться.
export const ROW_GAP = 0.7
// Длиннее не считаем: вкладка очнулась после фона — это пауза, а не бег.
export const MAX_DT = 0.25

// Время от появления ряда до ворот на старте и уровни слов Словаря.
const LEADS = { easy: 6, medium: 4.5, hard: 3.5, veryHard: 2.5 }
const LEVELS = { easy: ['A1', 'A2'], medium: ['B1'], hard: ['B2'], veryHard: ['C1'] }

export const RUN_DIFFICULTIES = DIFFICULTIES.map((d) => ({
  key: d.key,
  band: d.band,
  lead: LEADS[d.key],
  levels: LEVELS[d.key],
}))

export function createRun(lead) {
  return {
    lane: 1,
    lives: LIVES,
    score: 0,
    streak: 0,
    bestStreak: 0,
    baseSpeed: SPAWN / lead,
    speedMul: 1,
    row: null,
    gap: 0,
    seq: 0,
    last: null,
    mistakes: [],
    elapsed: 0,
  }
}

export const isOver = (s) => s.lives <= 0
export const speedOf = (s) => s.baseSpeed * s.speedMul
export const needsRow = (s) => !isOver(s) && !s.row && s.gap <= 0

// `n` — номер ряда в забеге: по нему сцена понимает, что ворота новые.
export function spawnRow(s, row) {
  return { ...s, row: { ...row, z: SPAWN, n: s.seq } }
}

export function move(s, dir) {
  if (isOver(s)) return s
  const lane = Math.max(0, Math.min(LANES - 1, s.lane + dir))
  return lane === s.lane ? s : { ...s, lane }
}

export function advance(s, seconds) {
  if (isOver(s)) return s
  const dt = Math.max(0, Math.min(seconds, MAX_DT))
  const elapsed = s.elapsed + dt
  if (!s.row) return { ...s, elapsed, gap: Math.max(0, s.gap - dt) }
  const z = s.row.z - speedOf(s) * dt
  if (z > 0) return { ...s, elapsed, row: { ...s.row, z } }
  return pass({ ...s, elapsed })
}

function pass(s) {
  const { row, lane } = s
  const hit = lane === row.correct
  const picked = row.options[lane]
  const seq = s.seq + 1
  const last = { hit, lane, correct: row.correct, id: row.id, prompt: row.prompt, answer: row.answer, picked, seq, at: s.elapsed }
  const base = { ...s, row: null, gap: ROW_GAP, seq, last }
  if (hit) {
    const streak = s.streak + 1
    return {
      ...base,
      score: s.score + 1,
      streak,
      bestStreak: Math.max(s.bestStreak, streak),
      speedMul: Math.min(SPEED_CAP, s.speedMul * SPEED_STEP),
    }
  }
  return {
    ...base,
    lives: s.lives - 1,
    streak: 0,
    mistakes: [...s.mistakes, { prompt: row.prompt, answer: row.answer, picked }],
  }
}
```

- [ ] **Step 4: Run — PASS**

Run: `npx vitest run --exclude '.claude/**' src/practice/arcade/runner/`
Expected: PASS (deck 10 + engine 12).

- [ ] **Step 5: Commit**

```bash
git add src/practice/arcade/runner/engine.js src/practice/arcade/runner/engine.test.js
git commit -m "feat(arcade): движок Word Rush — ряд, проход, жизни, скорость"
```

---

### Task 4: Мир на three.js (`runnerScene.js`)

**Files:**
- Create: `src/screens/arcade/runner/runnerScene.js`

**Interfaces:**
- Consumes: `LANES`, `SPAWN` из Task 3; ассеты Task 1.
- Produces:
  - `loadRunnerAssets(): Promise<{ runner: GLTF, skyline: Texture | null }>`;
  - `createRunnerScene(canvas, assets)` → `{ render(snapshot, dt), resize(), reset(), dispose() }`; бросает, если WebGL недоступен.
  - `snapshot = { lane: 0|1|2, row: { n, z, options } | null, last: Last | null, speed: number, speedMul: number, moving: boolean }`.

Юнит-теста нет (WebGL в jsdom нет); проверяется живым прогоном в Task 5 и e2e в Task 7.

- [ ] **Step 1: Implementation** — `src/screens/arcade/runner/runnerScene.js`:

```js
// Мир «Word Rush» на three.js: дорога в три полосы, сумеречный город, ворота
// с английскими словами и бегун. Модуль грузится динамическим импортом только
// с экрана игры: three.js не должен попадать в общий бандл приложения.
//
// Сцена правил не знает. Каждый кадр RunnerGame отдаёт снимок — дорожку,
// ряд, исход прохода, скорость — и сцена его только рисует. Правила живут в
// src/practice/arcade/runner/engine.js и проверяются тестами без WebGL.
//
// Бегун — модель Higgsfield (Meshy image→3D с авто-ригом и клипом бега),
// ворота и город строятся кодом: неоновая трубка светится без постобработки
// и перекрашивается одним color.setHex, а дома — одинаковые боксы с окнами,
// которые переезжают вперёд, когда уходят за камеру.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { LANES, SPAWN } from '../../../practice/arcade/runner/engine.js'

const BASE = '/arcade/runner'
const LANE_W = 2.4
const laneX = (lane) => (lane - (LANES - 1) / 2) * LANE_W
const ROAD_W = LANE_W * LANES + 1.2
const ROAD_LEN = 220
const ROAD_TILE = 8
const BLOCK = 10
const BLOCKS = 16
const RECYCLE_Z = 16
const RUNNER_HEIGHT = 1.8
const STUMBLE = 0.6
const SKY = 0x1c0d45
const FOG = 0x2d1570
const TONE = { idle: 0xb78bff, hit: 0x33e08a, miss: 0xff4d6d }
const hex = (n) => `#${n.toString(16).padStart(6, '0')}`

export async function loadRunnerAssets() {
  const [runner, skyline] = await Promise.all([
    new GLTFLoader().loadAsync(`${BASE}/runner.glb`),
    // Панорама — украшение: без неё остаётся небо цветом, игра не ломается.
    new THREE.TextureLoader().loadAsync(`${BASE}/skyline.webp`).catch(() => null),
    // Надписи рисуются шрифтом страницы на canvas — без ожидания первые
    // таблички выходили бы системным шрифтом.
    document.fonts?.load('800 64px Manrope').catch(() => null),
  ])
  return { runner, skyline }
}

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d'), width, height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function roadTexture() {
  const texture = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#261d45'
    ctx.fillRect(0, 0, w, h)
    const px = (x) => ((x + ROAD_W / 2) / ROAD_W) * w
    // Края дороги — сплошной оранжевый, между полосами — пунктир.
    ctx.fillStyle = '#ff8a5c'
    ctx.fillRect(px(-ROAD_W / 2 + 0.25) - 3, 0, 6, h)
    ctx.fillRect(px(ROAD_W / 2 - 0.25) - 3, 0, 6, h)
    ctx.fillStyle = 'rgba(214, 196, 255, 0.75)'
    for (let i = 1; i < LANES; i++) ctx.fillRect(px(laneX(i) - LANE_W / 2) - 2, h * 0.1, 4, h * 0.45)
  })
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, ROAD_LEN / ROAD_TILE)
  return texture
}

function windowsTexture(seed) {
  let a = seed
  const rnd = () => ((a = (a * 16807) % 2147483647) / 2147483647)
  const lit = ['#ffd79a', '#ffb0e6', '#8fe9ff', '#ffd79a']
  return canvasTexture(64, 128, (ctx, w, h) => {
    ctx.fillStyle = '#140a33'
    ctx.fillRect(0, 0, w, h)
    for (let y = 6; y < h - 6; y += 10) {
      for (let x = 6; x < w - 6; x += 12) {
        if (rnd() < 0.45) continue
        ctx.fillStyle = lit[Math.floor(rnd() * lit.length)]
        ctx.fillRect(x, y, 6, 5)
      }
    }
  })
}

// Табличка над воротами: тёмная плашка с неоновой рамкой, слово ужимается
// по ширине — у C1 бывают `environmentally friendly`.
function drawSign(canvas, text, tone) {
  const ctx = canvas.getContext('2d')
  const { width: w, height: h } = canvas
  ctx.clearRect(0, 0, w, h)
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(8, 8, w - 16, h - 16, 30)
  else ctx.rect(8, 8, w - 16, h - 16)
  ctx.fillStyle = 'rgba(20, 8, 52, 0.92)'
  ctx.fill()
  ctx.lineWidth = 8
  ctx.strokeStyle = tone
  ctx.stroke()
  let size = 84
  const font = (px) => `800 ${px}px Manrope, system-ui, sans-serif`
  ctx.font = font(size)
  while (ctx.measureText(text).width > w - 60 && size > 26) {
    size -= 4
    ctx.font = font(size)
  }
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, w / 2, h / 2 + 4)
}

// Арка из одной трубки: левая стойка → полукруг → правая стойка.
function archCurve(width, height) {
  const r = width / 2
  const pillar = height - r
  const points = []
  for (let i = 0; i <= 6; i++) points.push(new THREE.Vector3(-r, (pillar * i) / 6, 0))
  for (let i = 1; i < 16; i++) {
    const a = Math.PI - (Math.PI * i) / 16
    points.push(new THREE.Vector3(Math.cos(a) * r, pillar + Math.sin(a) * r, 0))
  }
  for (let i = 6; i >= 0; i--) points.push(new THREE.Vector3(r, (pillar * i) / 6, 0))
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.1)
}

function makeGate(anisotropy) {
  const group = new THREE.Group()
  const curve = archCurve(LANE_W - 0.35, 3.5)
  const core = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 96, 0.08, 8, false),
    new THREE.MeshBasicMaterial({ color: TONE.idle }),
  )
  // Мягкое свечение вокруг трубки — вторая, толще и полупрозрачная.
  const glow = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 96, 0.22, 8, false),
    new THREE.MeshBasicMaterial({ color: TONE.idle, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }),
  )
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 150
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy
  // Надпись без тумана: слово читается, пока сами ворота ещё в дымке, —
  // на Very Hard иначе не хватало бы времени прочесть.
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(LANE_W - 0.2, (LANE_W - 0.2) * (150 / 512)),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, fog: false }),
  )
  sign.position.y = 4.05
  group.add(core, glow, sign)
  return { group, core, glow, canvas, texture, text: '' }
}

function paint(gate, text, tone) {
  gate.text = text
  gate.core.material.color.setHex(tone)
  gate.glow.material.color.setHex(tone)
  drawSign(gate.canvas, text, hex(tone))
  gate.texture.needsUpdate = true
}

// Клип бега у рига Meshy может нести корневое движение: бёдра уезжают
// вперёд. Бег у нас на месте (едет мир), поэтому горизонталь корня
// замораживаем, вертикаль — подпрыгивание — оставляем.
function lockRootMotion(clip) {
  const track = clip.tracks.find((t) => t.name.endsWith('.position'))
  if (!track) return clip
  const v = track.values
  for (let i = 0; i < v.length; i += 3) {
    v[i] = v[0]
    v[i + 2] = v[2]
  }
  return clip
}

function makeRunner(gltf) {
  const model = gltf.scene
  // Скиннинг двигает вершины уже после проверки видимости: без этого бегун
  // пропадал бы, когда его покоящаяся рамка уходит за край кадра.
  model.traverse((o) => {
    if (o.isMesh) o.frustumCulled = false
  })
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  model.scale.setScalar(RUNNER_HEIGHT / (size.y || 1))
  box.setFromObject(model)
  model.position.x -= (box.min.x + box.max.x) / 2
  model.position.z -= (box.min.z + box.max.z) / 2
  model.position.y -= box.min.y
  const hero = new THREE.Group()
  hero.add(model)
  // Модель смотрит в камеру (+Z) — разворачиваем спиной, лицом к дороге.
  hero.rotation.y = Math.PI
  let mixer = null
  const clip = gltf.animations[0]
  if (clip) {
    mixer = new THREE.AnimationMixer(model)
    mixer.clipAction(lockRootMotion(clip)).play()
  }
  return { hero, mixer }
}

export function createRunnerScene(canvas, assets) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(SKY)
  scene.fog = new THREE.Fog(FOG, 26, SPAWN + 30)
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400)

  scene.add(new THREE.HemisphereLight(0xc7b2ff, 0x2a1466, 1.5))
  const sun = new THREE.DirectionalLight(0xffc49a, 1.6)
  sun.position.set(4, 10, 6)
  scene.add(sun)

  if (assets.skyline) {
    assets.skyline.colorSpace = THREE.SRGBColorSpace
    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(460, 200),
      new THREE.MeshBasicMaterial({ map: assets.skyline, fog: false, depthWrite: false }),
    )
    sky.position.set(0, 55, -230)
    scene.add(sky)
  }

  const roadTex = roadTexture()
  const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, ROAD_LEN), new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.85 }))
  road.rotation.x = -Math.PI / 2
  road.position.z = -ROAD_LEN / 2 + 12
  scene.add(road)
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x3b2a66, roughness: 0.9 })
  for (const side of [-1, 1]) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(3, ROAD_LEN), walkMat)
    walk.rotation.x = -Math.PI / 2
    walk.position.set(side * (ROAD_W / 2 + 1.5), 0.02, -ROAD_LEN / 2 + 12)
    scene.add(walk)
  }

  // Город: боксы с окнами по обе стороны, переезжают вперёд за камерой.
  const boxGeo = new THREE.BoxGeometry(1, 1, 1)
  const houseMats = [11, 23, 37].map(
    (seed) =>
      new THREE.MeshStandardMaterial({
        color: 0x2a1858,
        emissive: 0xffffff,
        emissiveMap: windowsTexture(seed),
        emissiveIntensity: 0.85,
        roughness: 0.8,
      }),
  )
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6)
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b2150 })
  const lampGeo = new THREE.SphereGeometry(0.2, 12, 8)
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd79a })
  const props = []
  const reroll = (house) => {
    const width = 4 + Math.random() * 3
    const height = 6 + Math.random() * 14
    house.scale.set(width, height, 7)
    house.position.y = height / 2
    house.position.x = Math.sign(house.position.x) * (ROAD_W / 2 + 3.2 + width / 2)
    house.material = houseMats[Math.floor(Math.random() * houseMats.length)]
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < BLOCKS; i++) {
      const house = new THREE.Mesh(boxGeo, houseMats[0])
      house.position.set(side, 0, -i * BLOCK)
      house.userData.reroll = () => reroll(house)
      reroll(house)
      scene.add(house)
      props.push(house)
      if (i % 2 === 0) {
        const lamp = new THREE.Group()
        const pole = new THREE.Mesh(poleGeo, poleMat)
        pole.position.y = 1.7
        const bulb = new THREE.Mesh(lampGeo, lampMat)
        bulb.position.y = 3.45
        lamp.add(pole, bulb)
        lamp.position.set(side * (ROAD_W / 2 + 0.6), 0, -i * BLOCK - BLOCK / 2)
        scene.add(lamp)
        props.push(lamp)
      }
    }
  }

  const anisotropy = renderer.capabilities.getMaxAnisotropy()
  const rowGroup = new THREE.Group()
  const gates = [0, 1, 2].map((lane) => {
    const gate = makeGate(anisotropy)
    gate.group.position.x = laneX(lane)
    rowGroup.add(gate.group)
    return gate
  })
  rowGroup.visible = false
  scene.add(rowGroup)

  const { hero, mixer } = makeRunner(assets.runner)
  scene.add(hero)
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.03
  scene.add(shadow)

  let rowKey = null
  let lastSeq = 0
  let runnerX = laneX(1)
  let stumble = 0

  function reset() {
    rowKey = null
    lastSeq = 0
    runnerX = laneX(1)
    stumble = 0
    rowGroup.visible = false
  }

  function resize() {
    const w = canvas.clientWidth || 1
    const h = canvas.clientHeight || 1
    renderer.setSize(w, h, false)
    const aspect = w / h
    // На узком экране (телефон стоя) крайние ворота не влезают в обычный
    // угол обзора: камера отъезжает и расширяет угол ровно настолько, чтобы
    // три дорожки были видны у ног бегуна.
    const dist = aspect < 1 ? 8.5 : 6.5
    const halfW = LANE_W + 1.2
    const vHalf = Math.max(Math.tan(THREE.MathUtils.degToRad(29)), halfW / (dist * aspect))
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(vHalf))
    camera.aspect = aspect
    camera.position.set(0, aspect < 1 ? 4.4 : 3.6, dist)
    camera.lookAt(0, 1.3, -14)
    camera.updateProjectionMatrix()
  }

  function render(snap, dt) {
    const v = snap.moving ? snap.speed : 0
    roadTex.offset.y = (roadTex.offset.y + (v * dt) / ROAD_TILE) % 1
    for (const p of props) {
      p.position.z += v * dt
      if (p.position.z > RECYCLE_Z) {
        p.position.z -= BLOCKS * BLOCK
        p.userData.reroll?.()
      }
    }

    if (snap.row) {
      if (snap.row.n !== rowKey) {
        rowKey = snap.row.n
        snap.row.options.forEach((word, i) => paint(gates[i], word, TONE.idle))
      }
      rowGroup.visible = true
      rowGroup.position.z = -snap.row.z
    } else if (rowGroup.visible) {
      // Пройденный ряд уезжает за камеру уже без движка.
      rowGroup.position.z += v * dt
      if (rowGroup.position.z > 8) rowGroup.visible = false
    }

    const last = snap.last
    if (last && last.seq !== lastSeq) {
      lastSeq = last.seq
      paint(gates[last.correct], gates[last.correct].text, TONE.hit)
      if (!last.hit) {
        paint(gates[last.lane], gates[last.lane].text, TONE.miss)
        stumble = STUMBLE
      }
    }

    const dx = laneX(snap.lane) - runnerX
    runnerX += dx * (1 - Math.exp(-dt * 14))
    hero.position.x = runnerX
    hero.rotation.z = THREE.MathUtils.clamp(dx * 0.12, -0.3, 0.3)
    if (stumble > 0) {
      stumble = Math.max(0, stumble - dt)
      const k = Math.sin((1 - stumble / STUMBLE) * Math.PI)
      hero.position.y = k * 0.35
      hero.rotation.x = k * 0.25
    } else {
      hero.position.y = 0
      hero.rotation.x = 0
    }
    shadow.position.x = runnerX
    mixer?.update(snap.moving ? dt * (0.75 + 0.35 * (snap.speedMul || 1)) : 0)
    camera.position.x = runnerX * 0.35
    renderer.render(scene, camera)
  }

  // Без явного освобождения каждый заход на экран оставлял бы в памяти
  // видеокарты текстуры и буферы прошлого — телефон начинал тормозить.
  function dispose() {
    mixer?.stopAllAction()
    scene.traverse((o) => {
      o.geometry?.dispose()
      const materials = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
      for (const m of materials) {
        for (const value of Object.values(m)) if (value?.isTexture) value.dispose()
        m.dispose()
      }
    })
    houseMats.forEach((m) => {
      m.emissiveMap?.dispose()
      m.dispose()
    })
    renderer.dispose()
    renderer.forceContextLoss()
  }

  return { render, resize, reset, dispose }
}
```

- [ ] **Step 2: Lint the file**

Run: `npx eslint src/screens/arcade/runner/runnerScene.js`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/arcade/runner/runnerScene.js
git commit -m "feat(arcade): мир Word Rush на three.js — дорога, город, неоновые ворота, бегун"
```

---

### Task 5: Экран игры (`RunnerGame.jsx`, `RunnerResults.jsx`), строки, стили

**Files:**
- Create: `src/screens/arcade/runner/RunnerGame.jsx`, `src/screens/arcade/runner/RunnerResults.jsx`
- Modify: `src/practice/vocab/vocabData.js` (неудачная загрузка не кэшируется)
- Modify: `src/i18n.jsx` (ключи `arcade.run.*`, `arcade.toHub` в ru/en/kk)
- Modify: `src/i18n.arcade.test.js` (ключи итогов забега)
- Modify: `src/arcade.css` (классы `ar-run-*`)

**Interfaces:**
- Consumes: Tasks 2–4; `loadLevelWords(level)` из `src/practice/vocab/vocabData.js`; `useArcadeFullscreen(ref)` → `{ active, toggle }`; `formatNumber(n, lang)` из `src/screens/arcade/format.js`.
- Produces: `export default function RunnerGame({ onExit })`; сцена держит на `.ar-run-stage` атрибуты `data-options` (`a|b|c` или пусто), `data-correct`, `data-lane`, `data-lives`, `data-score` — для e2e.

- [ ] **Step 1: Словарь не кэширует неудачу** — в `src/practice/vocab/vocabData.js` заменить тело `loadJson`:

```js
const cache = {}
function loadJson(file) {
  if (!cache[file]) {
    cache[file] = fetch(`/practice/vocab/${file}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data) => {
        // Неудачу не кэшируем: иначе «Повторить» после обрыва сети получал бы
        // тот же null до перезагрузки страницы.
        if (!data) delete cache[file]
        return data
      })
  }
  return cache[file]
}
```

- [ ] **Step 2: Строки** — в `src/i18n.jsx`, в каждом языке сразу после строки `'arcade.toPractice': …,` вставить блок. RU:

```js
    'arcade.toHub': 'К играм',
    // «Word Rush» — вторая игра «Аркады» (?screen=arcade&game=runner).
    'arcade.run.eyebrow': 'Слова · реакция',
    'arcade.run.title': 'Word Rush',
    'arcade.run.subtitle':
      'Сверху — слово по-русски, впереди — трое ворот с английскими словами. Вбегите в ворота с его переводом.',
    'arcade.run.section': 'Игра на слова',
    'arcade.run.chooseHint': 'Чем выше уровень, тем сложнее слова и быстрее бег.',
    'arcade.run.words': 'Слова {levels}',
    'arcade.run.lead': '{seconds} с на ответ',
    'arcade.run.loading': 'Строим город…',
    'arcade.run.loadingWords': 'Загружаем слова…',
    'arcade.run.ready': 'На старт!',
    'arcade.run.readyHint': 'Первое слово появится после отсчёта.',
    'arcade.run.rule.lives': 'Три жизни',
    'arcade.run.rule.speed': 'С каждым верным словом быстрее',
    'arcade.run.rule.controls': '← → — сменить дорожку',
    'arcade.run.start': 'Старт',
    'arcade.run.again': 'Ещё забег',
    'arcade.run.pause': 'Пауза',
    'arcade.run.resume': 'Продолжить',
    'arcade.run.paused': 'Пауза',
    'arcade.run.pausedHint': 'Город подождёт. Esc или «Продолжить» — и дальше.',
    'arcade.run.over': 'Забег окончен',
    'arcade.run.overHint': 'Верных ворот: {score}',
    'arcade.run.translate': 'Переведите',
    'arcade.run.lives': 'Жизней: {n} из 3',
    'arcade.run.score': 'Счёт',
    'arcade.run.streak': 'Серия ×{n}',
    'arcade.run.miss': '{prompt} = {answer}',
    'arcade.run.controls': 'Клавиши ← → или A / D · на телефоне — свайп или тап по краю поля',
    'arcade.run.retry': 'Повторить',
    'arcade.run.error.webgl': 'Браузер не показывает 3D-графику (WebGL). Откройте игру в свежем Chrome, Edge или Safari.',
    'arcade.run.error.words': 'Не удалось загрузить слова. Проверьте интернет и попробуйте снова.',
    'arcade.run.results.title': 'Ваш забег',
    'arcade.run.results.score': 'Верных ворот',
    'arcade.run.results.best': 'Рекорд',
    'arcade.run.results.streak': 'Лучшая серия',
    'arcade.run.results.newBest': 'Новый рекорд!',
    'arcade.run.results.mistakes': 'Ошибки',
    'arcade.run.results.noMistakes': 'Ни одной ошибки — попробуйте уровень посложнее.',
    'arcade.run.results.picked': 'вы выбрали: {word}',
```

EN:

```js
    'arcade.toHub': 'To games',
    // «Word Rush» — вторая игра «Аркады» (?screen=arcade&game=runner).
    'arcade.run.eyebrow': 'Words · reflexes',
    'arcade.run.title': 'Word Rush',
    'arcade.run.subtitle':
      'At the top is a word in Russian, ahead are three gates with English words. Run through the gate with its translation.',
    'arcade.run.section': 'Word game',
    'arcade.run.chooseHint': 'Higher levels bring harder words and a faster run.',
    'arcade.run.words': 'Words {levels}',
    'arcade.run.lead': '{seconds} s to answer',
    'arcade.run.loading': 'Building the city…',
    'arcade.run.loadingWords': 'Loading words…',
    'arcade.run.ready': 'Ready?',
    'arcade.run.readyHint': 'The first word appears after the countdown.',
    'arcade.run.rule.lives': 'Three lives',
    'arcade.run.rule.speed': 'Faster with every right word',
    'arcade.run.rule.controls': '← → to switch lanes',
    'arcade.run.start': 'Start',
    'arcade.run.again': 'Run again',
    'arcade.run.pause': 'Pause',
    'arcade.run.resume': 'Resume',
    'arcade.run.paused': 'Paused',
    'arcade.run.pausedHint': 'The city will wait. Press Esc or “Resume” to go on.',
    'arcade.run.over': 'Run over',
    'arcade.run.overHint': 'Right gates: {score}',
    'arcade.run.translate': 'Translate',
    'arcade.run.lives': '{n} of 3 lives left',
    'arcade.run.score': 'Score',
    'arcade.run.streak': 'Streak ×{n}',
    'arcade.run.miss': '{prompt} = {answer}',
    'arcade.run.controls': 'Keys ← → or A / D · on a phone, swipe or tap the edge of the field',
    'arcade.run.retry': 'Try again',
    'arcade.run.error.webgl': 'Your browser can’t show 3D graphics (WebGL). Open the game in an up-to-date Chrome, Edge or Safari.',
    'arcade.run.error.words': 'Couldn’t load the words. Check your connection and try again.',
    'arcade.run.results.title': 'Your run',
    'arcade.run.results.score': 'Right gates',
    'arcade.run.results.best': 'Best',
    'arcade.run.results.streak': 'Best streak',
    'arcade.run.results.newBest': 'New record!',
    'arcade.run.results.mistakes': 'Mistakes',
    'arcade.run.results.noMistakes': 'Not a single mistake — try a harder level.',
    'arcade.run.results.picked': 'you picked: {word}',
```

KK:

```js
    'arcade.toHub': 'Ойындарға',
    // «Word Rush» — вторая игра «Аркады» (?screen=arcade&game=runner).
    'arcade.run.eyebrow': 'Сөздер · шапшаңдық',
    'arcade.run.title': 'Word Rush',
    'arcade.run.subtitle':
      'Жоғарыда — қазақша сөз, алда — ағылшын сөздері жазылған үш қақпа. Оның аудармасы жазылған қақпадан өтіңіз.',
    'arcade.run.section': 'Сөз ойыны',
    'arcade.run.chooseHint': 'Деңгей жоғарылаған сайын сөздер қиындап, жүгіру жылдамдайды.',
    'arcade.run.words': 'Сөздер {levels}',
    'arcade.run.lead': 'Жауапқа {seconds} с',
    'arcade.run.loading': 'Қала салынып жатыр…',
    'arcade.run.loadingWords': 'Сөздер жүктелуде…',
    'arcade.run.ready': 'Дайынсыз ба?',
    'arcade.run.readyHint': 'Алғашқы сөз кері санақтан кейін шығады.',
    'arcade.run.rule.lives': 'Үш өмір',
    'arcade.run.rule.speed': 'Әр дұрыс сөзден кейін жылдамырақ',
    'arcade.run.rule.controls': '← → — жолды ауыстыру',
    'arcade.run.start': 'Бастау',
    'arcade.run.again': 'Тағы жүгіру',
    'arcade.run.pause': 'Үзіліс',
    'arcade.run.resume': 'Жалғастыру',
    'arcade.run.paused': 'Үзіліс',
    'arcade.run.pausedHint': 'Қала күтіп тұр. Esc немесе «Жалғастыру» — әрі қарай.',
    'arcade.run.over': 'Жарыс аяқталды',
    'arcade.run.overHint': 'Дұрыс қақпалар: {score}',
    'arcade.run.translate': 'Аударыңыз',
    'arcade.run.lives': 'Өмір: 3-тен {n}',
    'arcade.run.score': 'Ұпай',
    'arcade.run.streak': 'Қатарынан ×{n}',
    'arcade.run.miss': '{prompt} = {answer}',
    'arcade.run.controls': '← → немесе A / D пернелері · телефонда — сырғытыңыз не алаң шетін түртіңіз',
    'arcade.run.retry': 'Қайталау',
    'arcade.run.error.webgl': 'Браузер 3D-графиканы (WebGL) көрсетпейді. Ойынды жаңа Chrome, Edge не Safari-да ашыңыз.',
    'arcade.run.error.words': 'Сөздер жүктелмеді. Интернетті тексеріп, қайта көріңіз.',
    'arcade.run.results.title': 'Сіздің жарысыңыз',
    'arcade.run.results.score': 'Дұрыс қақпалар',
    'arcade.run.results.best': 'Рекорд',
    'arcade.run.results.streak': 'Ең ұзын серия',
    'arcade.run.results.newBest': 'Жаңа рекорд!',
    'arcade.run.results.mistakes': 'Қателер',
    'arcade.run.results.noMistakes': 'Бірде-бір қате жоқ — қиынырақ деңгейді байқап көріңіз.',
    'arcade.run.results.picked': 'сіз таңдадыңыз: {word}',
```

- [ ] **Step 3: Тест словаря** — в `src/i18n.arcade.test.js`, внутри второго `it`, после цикла по `stat`:

```js
    for (const stat of ['score', 'best', 'streak']) expect(ru.has(`arcade.run.results.${stat}`)).toBe(true)
```

Run: `npx vitest run --exclude '.claude/**' src/i18n.arcade.test.js`
Expected: PASS.

- [ ] **Step 4: `RunnerResults.jsx`**

```jsx
import { useI18n } from '../../../i18n.jsx'
import { RUN_DIFFICULTIES } from '../../../practice/arcade/runner/engine.js'
import { PkChevron } from '../../practice/PracticeIcons.jsx'

// Итоги забега: счёт, рекорд этой сложности (localStorage этого браузера),
// лучшая серия и список ошибок — ради него игра и учебная: слово, его
// перевод и что выбрал ученик.
export default function RunnerResults({ result, onAgain, onExit }) {
  const { t } = useI18n()
  const key = RUN_DIFFICULTIES[result.level].key
  const tiles = [
    { key: 'score', value: result.score },
    { key: 'best', value: result.best },
    { key: 'streak', value: result.bestStreak },
  ]
  return (
    <section className="ar-results ar-run-results" aria-labelledby="ar-run-results-title">
      <div className="ar-results__head">
        <h2 id="ar-run-results-title">{t('arcade.run.results.title')}</h2>
        <span className={`ar-results__level ar-level--${key}`}>{t(`arcade.difficulty.${key}`)}</span>
      </div>
      {result.record && <p className="ar-run-record">{t('arcade.run.results.newBest')}</p>}
      <div className="ar-results__grid ar-run-results__grid">
        {tiles.map(({ key: stat, value }) => (
          <article key={stat} className={`ar-stat ar-stat--${stat}`}>
            <span className="ar-stat__label">{t(`arcade.run.results.${stat}`)}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <h3 className="ar-run-results__sub">{t('arcade.run.results.mistakes')}</h3>
      {result.mistakes.length ? (
        <ul className="ar-run-mistakes">
          {result.mistakes.map((m, i) => (
            <li key={i}>
              <b>{m.prompt}</b>
              <span aria-hidden="true">→</span>
              <span lang="en" className="ar-run-mistakes__answer">
                {m.answer}
              </span>
              <small>{t('arcade.run.results.picked', { word: m.picked })}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ar-results__tip">{t('arcade.run.results.noMistakes')}</p>
      )}
      <div className="ar-run-results__actions">
        <button type="button" className="ar-run-btn" onClick={onAgain}>
          {t('arcade.run.again')}
          <PkChevron size={18} />
        </button>
        {onExit && (
          <button type="button" className="ar-run-btn ar-run-btn--ghost" onClick={onExit}>
            {t('arcade.toHub')}
          </button>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 5: `RunnerGame.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { loadLevelWords } from '../../../practice/vocab/vocabData.js'
import { createDeck } from '../../../practice/arcade/runner/deck.js'
import {
  LIVES, RUN_DIFFICULTIES, advance, createRun, isOver, move, needsRow, spawnRow, speedOf,
} from '../../../practice/arcade/runner/engine.js'
import { useArcadeFullscreen } from '../useArcadeFullscreen.js'
import { formatNumber } from '../format.js'
import RunnerResults from './RunnerResults.jsx'
import { CollapseIcon, ExpandIcon, PlayIcon } from '../../../components/icons.jsx'
import { PkChevron } from '../../practice/PracticeIcons.jsx'

// «Word Rush» — вторая игра «Аркады». Разделение как у Speak or Die: правила
// — src/practice/arcade/runner/ (колода и движок, под тестами), мир three.js
// — runnerScene.js (грузится динамическим импортом, в общий бандл не
// попадает), а здесь жизненный цикл: выбор сложности, загрузка слов, отсчёт,
// кадры, ввод, пауза, итоги. Шапка над сценой — обычный HTML: слово-вопрос,
// жизни и счёт должны быть чёткими и доступными, а не пикселями на canvas.
//
// Состояние забега живёт в ref и двигается каждый кадр; в React уходит
// только то, что видно в шапке, и только когда оно меняется.

const COUNTDOWN = 3
// Скорость «витрины» до старта: город едет, бегун бежит, ворот нет.
const IDLE_SPEED = 5
const TOAST_SECONDS = 1.5
const BEST_KEY = 'jts_arcade_runner_best'
const ACTIVE = ['countdown', 'playing']

function readBest() {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY)) || {}
  } catch {
    return {}
  }
}

// Рекорд — удобство этого браузера, не прогресс: хранилище может быть
// недоступно (приватное окно), тогда рекорд просто не запоминается.
function saveBest(key, score) {
  const all = readBest()
  if (score <= (all[key] || 0)) return false
  all[key] = score
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(all))
  } catch {
    /* не запомнили — не страшно */
  }
  return true
}

function hudOf(s, status, countdown) {
  return {
    status,
    count: status === 'countdown' ? Math.max(1, Math.ceil(countdown)) : 0,
    prompt: s?.row?.prompt ?? null,
    options: s?.row?.options ?? null,
    correct: s?.row?.correct ?? null,
    lane: s?.lane ?? 1,
    lives: s?.lives ?? LIVES,
    score: s?.score ?? 0,
    streak: s?.streak ?? 0,
    toast: s?.last && !s.last.hit && s.elapsed - s.last.at < TOAST_SECONDS ? { prompt: s.last.prompt, answer: s.last.answer } : null,
  }
}

function PauseGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
      <rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
    </svg>
  )
}

export default function RunnerGame({ onExit }) {
  const { t, lang } = useI18n()
  // Средняя сложность по умолчанию — как у Speak or Die.
  const [level, setLevel] = useState(1)
  const [status, setStatus] = useState('loading') // loading | ready | starting | countdown | playing | paused | finished
  const [error, setError] = useState(null) // null | webgl | words
  const [hud, setHud] = useState(() => hudOf(null, 'loading', 0))
  const [result, setResult] = useState(null)
  const canvas = useRef(null)
  const panel = useRef(null)
  const scene = useRef(null)
  const game = useRef({ state: null, deck: null, countdown: 0, level: 1 })
  const statusRef = useRef('loading')
  const hudSig = useRef('')
  const touch = useRef(null)
  const fullscreen = useArcadeFullscreen(panel)
  const difficulty = RUN_DIFFICULTIES[level]

  // Статус читают и кадры, и обработчики клавиш — им нужен ref, а шапке —
  // состояние React. Меняем оба сразу.
  function go(next) {
    statusRef.current = next
    setStatus(next)
  }

  useEffect(() => {
    let alive = true
    let frame = 0
    let prev = performance.now()
    let current = null

    function syncHud(s, st, countdown) {
      const view = hudOf(s, st, countdown)
      const sig = JSON.stringify(view)
      if (sig === hudSig.current) return
      hudSig.current = sig
      setHud(view)
    }

    function finish(s) {
      const g = game.current
      const key = RUN_DIFFICULTIES[g.level].key
      const record = s.score > 0 && saveBest(key, s.score)
      setResult({ ...s, level: g.level, best: readBest()[key] || s.score, record })
      go('finished')
    }

    function step(dt) {
      const g = game.current
      const st = statusRef.current
      let s = g.state
      if (st === 'countdown') {
        g.countdown -= dt
        if (g.countdown <= 0) go('playing')
      } else if (st === 'playing' && s) {
        if (needsRow(s)) s = spawnRow(s, g.deck.next())
        const before = s.seq
        s = advance(s, dt)
        if (s.seq !== before && !s.last.hit) g.deck.miss(s.last)
        g.state = s
        if (isOver(s)) finish(s)
      }
      const running = !!s && st !== 'ready'
      current.render(
        {
          lane: s?.lane ?? 1,
          row: running ? s.row : null,
          last: running ? s.last : null,
          speed: running ? speedOf(s) : IDLE_SPEED,
          speedMul: s?.speedMul ?? 1,
          moving: st === 'ready' || st === 'starting' || ACTIVE.includes(st),
        },
        dt,
      )
      syncHud(running ? s : null, statusRef.current, g.countdown)
    }

    function tick(now) {
      // Кадр рисования не длиннее 0.1 с: после фона сцена не «прыгает».
      const dt = Math.min(0.1, (now - prev) / 1000)
      prev = now
      step(dt)
      frame = requestAnimationFrame(tick)
    }

    const observer = new ResizeObserver(() => current?.resize())
    if (canvas.current) observer.observe(canvas.current)

    ;(async () => {
      try {
        const mod = await import('./runnerScene.js')
        const assets = await mod.loadRunnerAssets()
        if (!alive) return
        current = mod.createRunnerScene(canvas.current, assets)
        scene.current = current
        current.resize()
        go('ready')
        prev = performance.now()
        frame = requestAnimationFrame(tick)
      } catch (e) {
        if (!alive) return
        console.warn('[word-rush] сцена не поднялась', e)
        setError('webgl')
      }
    })()

    return () => {
      alive = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      current?.dispose()
      scene.current = null
    }
  }, [])

  function steer(dir) {
    const g = game.current
    if (g.state && ACTIVE.includes(statusRef.current)) g.state = move(g.state, dir)
  }

  function togglePause() {
    const st = statusRef.current
    if (st === 'playing') go('paused')
    else if (st === 'paused') go('playing')
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      const st = statusRef.current
      const dir = e.code === 'ArrowLeft' || e.code === 'KeyA' ? -1 : e.code === 'ArrowRight' || e.code === 'KeyD' ? 1 : 0
      if (dir && ACTIVE.includes(st)) {
        e.preventDefault()
        steer(dir)
      } else if ((e.code === 'Escape' || e.code === 'KeyP') && (st === 'playing' || st === 'paused')) {
        e.preventDefault()
        togglePause()
      }
    }
    // Скрытая вкладка — пауза, а не конец: в отличие от Speak or Die здесь
    // нечего «переплачивать», забег просто ждёт.
    const onHide = () => {
      if (document.hidden && statusRef.current === 'playing') go('paused')
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [])

  async function start() {
    if (statusRef.current === 'starting' || !scene.current) return
    const d = RUN_DIFFICULTIES[level]
    setResult(null)
    setError(null)
    go('starting')
    try {
      const lists = await Promise.all(d.levels.map((l) => loadLevelWords(l)))
      if (lists.some((list) => !list || !list.length)) throw new Error('words')
      game.current = { state: createRun(d.lead), deck: createDeck(lists.flat(), { lang }), countdown: COUNTDOWN, level }
      scene.current?.reset()
      go('countdown')
    } catch {
      setError('words')
      go('ready')
    }
  }

  function pickLevel(i) {
    if (!['ready', 'finished'].includes(statusRef.current)) return
    setLevel(i)
    setResult(null)
    game.current = { state: null, deck: null, countdown: 0, level: i }
    go('ready')
  }

  function onPointerDown(e) {
    touch.current = { x: e.clientX, y: e.clientY }
  }

  // Свайп — сдвиг на дорожку в его сторону; тап — к той половине поля, где
  // коснулись. Кнопки оверлеев тоже внутри поля, но их нажатия приходят не
  // во время забега и сюда не доходят.
  function onPointerUp(e) {
    const from = touch.current
    touch.current = null
    if (!from || !ACTIVE.includes(statusRef.current)) return
    const dx = e.clientX - from.x
    const dy = e.clientY - from.y
    if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) steer(Math.sign(dx))
    else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      const r = e.currentTarget.getBoundingClientRect()
      steer(e.clientX < r.left + r.width / 2 ? -1 : 1)
    }
  }

  const busy = !['ready', 'finished'].includes(status)

  let overlay = null
  if (error === 'webgl') {
    overlay = (
      <div className="ar-run-over" role="alert">
        <p>{t('arcade.run.error.webgl')}</p>
        {onExit && (
          <button type="button" className="ar-run-btn" onClick={onExit}>
            {t('arcade.toHub')}
          </button>
        )}
      </div>
    )
  } else if (status === 'loading' || status === 'starting') {
    overlay = (
      <div className="ar-run-over">
        <span className="ar-spinner" aria-hidden="true" />
        <p role="status">{t(status === 'loading' ? 'arcade.run.loading' : 'arcade.run.loadingWords')}</p>
      </div>
    )
  } else if (status === 'ready') {
    overlay = (
      <div className="ar-run-over">
        <h3>{t('arcade.run.ready')}</h3>
        <p>{t('arcade.run.readyHint')}</p>
        <ul className="ar-rules">
          <li>{t('arcade.run.rule.lives')}</li>
          <li>{t('arcade.run.rule.speed')}</li>
          <li>{t('arcade.run.rule.controls')}</li>
        </ul>
        {error === 'words' && (
          <p className="ar-run-error" role="alert">
            {t('arcade.run.error.words')}
          </p>
        )}
        <button type="button" className="ar-run-btn" onClick={() => void start()}>
          {t(error === 'words' ? 'arcade.run.retry' : 'arcade.run.start')}
          <PkChevron size={18} />
        </button>
      </div>
    )
  } else if (status === 'paused') {
    overlay = (
      <div className="ar-run-over">
        <h3>{t('arcade.run.paused')}</h3>
        <p>{t('arcade.run.pausedHint')}</p>
        <button type="button" className="ar-run-btn" onClick={togglePause}>
          <PlayIcon size={16} />
          {t('arcade.run.resume')}
        </button>
      </div>
    )
  } else if (status === 'finished' && result) {
    overlay = (
      <div className="ar-run-over">
        <h3>{t('arcade.run.over')}</h3>
        <p>{t('arcade.run.overHint', { score: result.score })}</p>
        <button type="button" className="ar-run-btn" onClick={() => void start()}>
          {t('arcade.run.again')}
          <PkChevron size={18} />
        </button>
      </div>
    )
  }

  return (
    <section className="ar-game ar-run" aria-label={t('arcade.run.section')}>
      <div className="ar-choose">
        <h2>{t('arcade.chooseChallenge')}</h2>
        <span>{t('arcade.run.chooseHint')}</span>
      </div>
      <div className="ar-levels">
        {RUN_DIFFICULTIES.map((d, i) => (
          <button
            key={d.key}
            type="button"
            disabled={busy}
            aria-pressed={i === level}
            className={`ar-level ar-level--${d.key}${i === level ? ' is-on' : ''}`}
            onClick={() => pickLevel(i)}
          >
            <span className="ar-level__top">
              <span className="ar-level__bars" aria-hidden="true">
                {[0, 1, 2, 3].map((n) => (
                  <i key={n} style={{ height: 7 + n * 3, opacity: n <= i ? 1 : 0.25 }} />
                ))}
              </span>
              <b>{t(`arcade.difficulty.${d.key}`)}</b>
              <span className="ar-level__dot" aria-hidden="true" />
            </span>
            <span className="ar-level__meta">
              {t('arcade.run.words', { levels: d.levels.join('–') })}
              <span>{t('arcade.run.lead', { seconds: formatNumber(d.lead, lang) })}</span>
            </span>
          </button>
        ))}
      </div>

      <div ref={panel} className={`ar-panel ar-run-panel${fullscreen.active ? ' is-full' : ''}`}>
        <div className="ar-panel__top">
          <span className="ar-brand">
            <i aria-hidden="true" /> WORD RUSH
            <b>{t(`arcade.difficulty.${difficulty.key}`)}</b>
          </span>
          <span className="ar-run-tools">
            {(status === 'playing' || status === 'paused') && (
              <button type="button" className="ar-tool" onClick={togglePause}>
                {status === 'paused' ? <PlayIcon size={16} /> : <PauseGlyph />}
                <span>{t(status === 'paused' ? 'arcade.run.resume' : 'arcade.run.pause')}</span>
              </button>
            )}
            <button type="button" className="ar-tool" aria-pressed={fullscreen.active} onClick={() => void fullscreen.toggle()}>
              {fullscreen.active ? <CollapseIcon size={16} /> : <ExpandIcon size={16} />}
              <span>{t(fullscreen.active ? 'arcade.exitFullscreen' : 'arcade.fullscreen')}</span>
            </button>
          </span>
        </div>

        <div
          className="ar-run-stage"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          data-options={hud.options ? hud.options.join('|') : ''}
          data-correct={hud.correct ?? ''}
          data-lane={hud.lane}
          data-lives={hud.lives}
          data-score={hud.score}
        >
          <canvas ref={canvas} className="ar-run-canvas" aria-hidden="true" />
          {status !== 'loading' && !error && (
            <div className="ar-run-hud">
              <div className="ar-run-lives" role="img" aria-label={t('arcade.run.lives', { n: hud.lives })}>
                {Array.from({ length: LIVES }, (_, i) => (
                  <span key={i} className={i < hud.lives ? 'is-on' : ''} aria-hidden="true">
                    ♥
                  </span>
                ))}
              </div>
              <div className="ar-run-score">
                <small>{t('arcade.run.score')}</small>
                <b>{hud.score}</b>
                {hud.streak >= 3 && <em>{t('arcade.run.streak', { n: hud.streak })}</em>}
              </div>
            </div>
          )}
          {hud.prompt && (
            <div className="ar-run-prompt" aria-live="polite">
              <small>{t('arcade.run.translate')}</small>
              <b lang={lang === 'kk' ? 'kk' : 'ru'}>{hud.prompt}</b>
            </div>
          )}
          {hud.toast && (
            <p className="ar-run-toast" role="status">
              {t('arcade.run.miss', { prompt: hud.toast.prompt, answer: hud.toast.answer })}
            </p>
          )}
          {status === 'countdown' && (
            <div key={hud.count} className="ar-run-count" aria-live="assertive">
              {hud.count}
            </div>
          )}
          {overlay}
        </div>
        <p className="ar-run-keys">{t('arcade.run.controls')}</p>
      </div>

      {result && status === 'finished' && <RunnerResults result={result} onAgain={() => void start()} onExit={onExit} />}
    </section>
  )
}
```

- [ ] **Step 6: Стили** — в конец `src/arcade.css`:

```css
/* ============================================================
   «Word Rush» — вторая игра «Аркады» (arcade/runner/). Поле — та же
   .ar-panel, внутри canvas three.js и HTML-шапка поверх него. Классы .ar-run-.
   ============================================================ */
.ar-run-tools { display: flex; flex-wrap: wrap; gap: 8px; }
.ar-run-stage {
  position: relative;
  height: clamp(420px, 62vh, 600px);
  overflow: hidden;
  /* Горизонтальный свайп — сдвиг на дорожку, вертикальный — прокрутка. */
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
}
.ar-run-panel.is-full { display: flex; flex-direction: column; }
.ar-run-panel.is-full .ar-run-stage { flex: 1; height: auto; min-height: 0; }
.ar-run-canvas { position: absolute; inset: 0; display: block; width: 100%; height: 100%; }

.ar-run-hud {
  position: absolute; top: 14px; right: 18px; left: 18px;
  display: flex; align-items: flex-start; justify-content: space-between;
  pointer-events: none;
  text-shadow: 0 1px 2px rgba(20, 8, 50, 0.6);
}
.ar-run-lives { display: flex; gap: 2px; font-size: 24px; line-height: 1; }
.ar-run-lives span { color: rgba(255, 255, 255, 0.22); transition: color 0.2s, transform 0.2s; }
.ar-run-lives span.is-on { color: #ff5c7a; }
.ar-run-score { text-align: right; line-height: 1.05; }
.ar-run-score small { display: block; font-size: 11px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; color: #cdbdff; }
.ar-run-score b { font-size: 34px; font-weight: 800; }
.ar-run-score em { display: block; margin-top: 2px; font-size: 12px; font-style: normal; font-weight: 800; color: #ffd79a; }

.ar-run-prompt {
  position: absolute; top: 14px; left: 50%;
  max-width: calc(100% - 200px);
  padding: 8px 22px 12px;
  border: 1px solid rgba(183, 139, 255, 0.45);
  border-radius: 18px;
  background: rgba(22, 9, 58, 0.78);
  text-align: center;
  transform: translateX(-50%);
  pointer-events: none;
}
.ar-run-prompt small { display: block; font-size: 11px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase; color: #cdbdff; }
.ar-run-prompt b { display: block; font-size: clamp(22px, 3.4vw, 34px); font-weight: 800; line-height: 1.15; overflow-wrap: anywhere; }

.ar-run-toast {
  position: absolute; top: 40%; left: 50%;
  max-width: 92%; padding: 10px 20px; overflow: hidden;
  border-radius: 999px; background: #e8324f; color: #fff;
  font-size: 18px; font-weight: 800; white-space: nowrap; text-overflow: ellipsis;
  box-shadow: 0 10px 24px -8px rgba(232, 50, 79, 0.6);
  transform: translate(-50%, -50%);
  animation: ar-run-toast 0.25s ease-out;
  pointer-events: none;
}
.ar-run-count {
  position: absolute; inset: 0; display: grid; place-items: center;
  font-size: clamp(88px, 14vw, 150px); font-weight: 800; color: #fff;
  text-shadow: 0 6px 30px rgba(144, 71, 255, 0.8);
  animation: ar-run-count 0.9s ease-out both;
  pointer-events: none;
}
.ar-run-over {
  position: absolute; inset: 0; z-index: 2;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
  padding: 24px; text-align: center;
  background: linear-gradient(180deg, rgba(28, 13, 69, 0.45), rgba(28, 13, 69, 0.82));
}
.ar-run-over h3 { font-size: clamp(36px, 5.5vw, 56px); font-weight: 800; line-height: 1.05; letter-spacing: -1px; }
.ar-run-over p { max-width: 42ch; font-size: 16px; font-weight: 500; color: #ddd2ff; }
.ar-run-over .ar-rules { margin-top: 4px; }
.ar-run-error { color: #ffb3c0 !important; font-weight: 700 !important; }
.ar-run-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 48px; padding: 0 26px; border: 0; border-radius: 999px;
  background: #fff; color: #3a1a86; font-size: 16px; font-weight: 800;
  box-shadow: 0 10px 24px -10px rgba(10, 5, 30, 0.6);
}
.ar-run-btn:hover { filter: brightness(0.97); }
.ar-run-keys { position: relative; z-index: 1; padding: 10px 24px 14px; font-size: 12px; font-weight: 600; text-align: center; color: #cdbdff; }

/* Итоги — на светлом фоне страницы, поэтому кнопки фиолетовые. */
.ar-run-results .ar-run-btn { background: var(--ar-violet); color: #fff; }
.ar-run-results .ar-run-btn--ghost { background: var(--ar-soft); color: var(--ar-violet); box-shadow: none; }
.ar-run-results__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.ar-run-record {
  display: inline-block; margin-top: 12px; padding: 6px 14px; border-radius: 999px;
  background: #fff8dc; color: #7a5c00; font-size: 14px; font-weight: 800;
}
.ar-run-results__sub { margin-top: 22px !important; font-size: 16px; font-weight: 800; }
.ar-run-mistakes { display: grid; gap: 8px; margin: 10px 0 0 !important; padding: 0; list-style: none; }
.ar-run-mistakes li {
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px;
  padding: 10px 14px; border-radius: 14px; background: #f7f4fd; font-size: 15px;
}
.ar-run-mistakes li > span[aria-hidden] { color: var(--ar-muted); }
.ar-run-mistakes__answer { font-weight: 800; color: #168049; }
.ar-run-mistakes small { margin-left: auto; font-size: 13px; color: var(--ar-muted); }
.ar-run-results__actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }

@keyframes ar-run-toast {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
@keyframes ar-run-count {
  0% { opacity: 0; transform: scale(1.6); }
  25% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.9); }
}
@media (prefers-reduced-motion: reduce) {
  .ar-run-toast, .ar-run-count { animation: none; }
}

/* Телефон: жизни и счёт сверху по краям, слово — строкой под ними. */
@media (max-width: 560px) {
  .ar-run-stage { height: min(72vh, 600px); }
  .ar-run-prompt { top: 58px; max-width: calc(100% - 32px); padding: 6px 16px 10px; }
  .ar-run-score b { font-size: 28px; }
  .ar-run-results__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .ar-run-mistakes small { margin-left: 0; flex-basis: 100%; }
}
```

- [ ] **Step 7: Временно подключить экран и проверить вживую** — в `src/screens/ArcadePage.jsx` на время проверки заменить `<ArcadeGame token={token || null} />` на `<RunnerGame />` (+ импорт `import RunnerGame from './arcade/runner/RunnerGame.jsx'`). Запустить dev (`preview_start`, конфиг с портом из `.claude/launch.json` этого воркtree), открыть `/?screen=arcade`, проверить:
  - город едет, бегун бежит **спиной к камере**, дорожки видны; если бегун лицом — убрать `hero.rotation.y = Math.PI`;
  - Medium → Старт → отсчёт → ворота выезжают из тумана, надписи читаются, слово сверху;
  - стрелки двигают бегуна, наклон в сторону шага (если наоборот — сменить знак в `hero.rotation.z`);
  - верные ворота — зелёные и +1, неверные — красные, подсказка, спотыкание, −1 жизнь;
  - 3 ошибки → оверлей «Забег окончен» и итоги под полем со списком ошибок;
  - пауза Esc и кнопкой; скрытие вкладки → пауза;
  - консоль без ошибок; мобильная ширина (`resize_window` mobile): три ворот видны целиком, слово под счётом.
  Найденное — править в `runnerScene.js`/`arcade.css` сразу. Временную замену в `ArcadePage.jsx` откатить: `git checkout src/screens/ArcadePage.jsx`.

- [ ] **Step 8: Lint + unit**

Run: `npx eslint src/screens/arcade/runner src/practice/arcade/runner src/practice/vocab/vocabData.js && npx vitest run --exclude '.claude/**' src/practice/arcade src/i18n.arcade.test.js`
Expected: без ошибок, все тесты PASS.

- [ ] **Step 9: Commit**

```bash
git add src/screens/arcade/runner src/practice/vocab/vocabData.js src/i18n.jsx src/i18n.arcade.test.js src/arcade.css
git commit -m "feat(arcade): экран Word Rush — забег, шапка, пауза, итоги с ошибками"
```

---

### Task 6: Зал «Аркады», диплинк и карточка в Практике

**Files:**
- Create: `src/screens/arcade/ArcadeHub.jsx`
- Modify: `src/screens/ArcadePage.jsx` (переключатель зал/игра)
- Modify: `src/App.jsx` (состояние `arcadeTarget`, диплинк `game`, `handleNav`/`handleTutorNav`, проп `initialTarget`)
- Modify: `src/screens/practice/practiceTabs.js` (секция `arcade` во вкладке `reading`)
- Modify: `src/screens/practice/PracticeCards.jsx` (`ArcadeCard` → «Аркада: 2 игры»)
- Modify: `src/screens/PracticePage.jsx` (передать игру и вкладку)
- Modify: `src/screens/arcade/ArcadeScene.jsx:6` (комментарий: персонажей рисует зал)
- Modify: `src/i18n.jsx` (`arcade.hub.*`, новые `practice.arcade.*`, удалить `practice.arcade.step1..3` и `practice.arcade.mic`)
- Modify: `src/arcade.css` (`.ar-hub*`), `src/styles.css` (`.pk-arcade__games`, убрать мёртвые `.pk-arcade__steps`/`__mic`)

**Interfaces:**
- Consumes: `RunnerGame({ onExit })` (Task 5), `ArcadeGame({ token })`, `SawArt`, `TreeArt`, `SKILL_KEYS`.
- Produces: `ARCADE_GAMES = ['speak', 'runner']`; `ArcadePage({ …, initialTarget: { game?, skill? } | null })`; навигация `onNav('arcade', { game: 'speak'|'runner'|null, skill })`.

- [ ] **Step 1: `ArcadeHub.jsx`**

```jsx
import { useI18n } from '../../i18n.jsx'
import { MicIcon } from '../../components/icons.jsx'
import { PkChevron } from '../practice/PracticeIcons.jsx'
import { SawArt, TreeArt } from './ArcadeScene.jsx'

// Зал «Аркады»: карточки игр. Ключи — те же, что в диплинке
// ?screen=arcade&game=… и в навигации из карточки Практики.
export const ARCADE_GAMES = ['speak', 'runner']

export default function ArcadeHub({ onPick }) {
  const { t } = useI18n()
  return (
    <div className="ar-hub">
      <button type="button" className="ar-hub__card" onClick={() => onPick('speak')}>
        <span className="ar-hub__art ar-hub__art--speak" aria-hidden="true">
          <span className="ar-hub__saw">
            <SawArt />
          </span>
          <span className="ar-hub__tree">
            <TreeArt />
          </span>
        </span>
        <span className="ar-hub__body">
          <span className="ar-hub__title">{t('arcade.title')}</span>
          <span className="ar-hub__desc">{t('arcade.hub.speak.desc')}</span>
          <span className="ar-hub__meta">
            <MicIcon size={14} />
            {t('arcade.hub.speak.meta')}
          </span>
          <span className="ar-hub__cta">
            {t('arcade.hub.play')}
            <PkChevron size={16} />
          </span>
        </span>
      </button>
      <button type="button" className="ar-hub__card" onClick={() => onPick('runner')}>
        <span className="ar-hub__art" aria-hidden="true">
          <img src="/arcade/runner/card.webp" alt="" loading="lazy" />
        </span>
        <span className="ar-hub__body">
          <span className="ar-hub__title">{t('arcade.run.title')}</span>
          <span className="ar-hub__desc">{t('arcade.hub.runner.desc')}</span>
          <span className="ar-hub__meta">{t('arcade.hub.runner.meta')}</span>
          <span className="ar-hub__cta">
            {t('arcade.hub.play')}
            <PkChevron size={16} />
          </span>
        </span>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: `ArcadePage.jsx` — заменить файл целиком**

```jsx
'use client'

// «Аркада» — раздел Практики (?screen=arcade): зал мини-игр. Карточка
// раздела стоит во вкладках «Говорение» и «Чтение».
//   • Speak or Die — говоришь по-английски на тему, молчание подпускает
//     бензопилу к дереву (arcade/ArcadeGame.jsx; микрофон, стенограмма и
//     ИИ-разбор — src/practice/arcade/ и /api/practice/arcade/review).
//   • Word Rush — бег по трём дорожкам сквозь ворота с переводом слова
//     (arcade/runner/, правила — src/practice/arcade/runner/).
// Диплинк прямо в игру: ?screen=arcade&game=speak|runner.
//
// Экран — оболочка: шапка, «Назад» (из игры — в зал, из зала — в ту вкладку
// Практики, откуда пришли) и выбор игры. Прогресс не синкается: раунд
// живёт, пока открыт экран.

import { useEffect, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import ArcadeGame from './arcade/ArcadeGame.jsx'
import ArcadeHub, { ARCADE_GAMES } from './arcade/ArcadeHub.jsx'
import RunnerGame from './arcade/runner/RunnerGame.jsx'
import { SKILL_KEYS } from './practice/practiceTabs.js'

const HEADS = {
  hub: { eyebrow: 'arcade.hub.eyebrow', title: 'arcade.hub.title', subtitle: 'arcade.hub.subtitle' },
  // Игры новые, ИИ-разбор ещё обкатывается — честно помечаем бетой.
  speak: { eyebrow: 'arcade.eyebrow', title: 'arcade.title', subtitle: 'arcade.subtitle', beta: true },
  runner: { eyebrow: 'arcade.run.eyebrow', title: 'arcade.run.title', subtitle: 'arcade.run.subtitle', beta: true },
}

export default function ArcadePage({ userName, userLevel, token, onNav, onProfile, initialTarget = null }) {
  const { t } = useI18n()
  const [game, setGame] = useState(() => (ARCADE_GAMES.includes(initialTarget?.game) ? initialTarget.game : null))
  const fromSkill = SKILL_KEYS.includes(initialTarget?.skill) ? initialTarget.skill : 'speaking'
  // Карточка «Аркады» стоит внизу длинной Практики, а прокрутка окна между
  // экранами не сбрасывается сама — без этого игра открывалась бы с середины.
  // То же при переходе зал ↔ игра: поле игры ниже шапки зала.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [game])
  const head = HEADS[game || 'hub']
  const back = () => (game ? setGame(null) : onNav?.('practice', { skill: fromSkill }))
  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="ar">
        <div className="ar-top">
          <button type="button" className="ar-back" onClick={back}>
            ← {t(game ? 'arcade.toHub' : 'arcade.toPractice')}
          </button>
          <div className="ar-crumb">
            <b>{t('practice.chip.arcade')}</b>
          </div>
        </div>

        <header className="ar-head">
          <div className="ar-eyebrow">
            <span />
            {t(head.eyebrow)}
          </div>
          <h1>
            {t(head.title)}
            <span className="ar-dot">.</span>
            {head.beta && <span className="ar-beta">{t('arcade.beta')}</span>}
          </h1>
          <p className="ar-sub">{t(head.subtitle)}</p>
        </header>

        {/* Токен — только для ИИ-разбора Speak or Die: у гостя его нет, и разбор просит войти. */}
        {game === 'speak' && <ArcadeGame token={token || null} />}
        {game === 'runner' && <RunnerGame onExit={() => setGame(null)} />}
        {!game && <ArcadeHub onPick={setGame} />}
      </div>
    </LearningLayout>
  )
}
```

- [ ] **Step 3: `App.jsx`**
  1. Рядом с `const [listenChooseTarget, setListenChooseTarget] = useState(null)` добавить:

```jsx
  // Игра «Аркады» из диплинка или карточки Практики (+ вкладка, куда
  // вернуться): { game: 'speak'|'runner'|null, skill }.
  const [arcadeTarget, setArcadeTarget] = useState(null)
```

  2. В эффекте диплинка, после блока `if (deepLink === 'listenchoose') {…}`:

```jsx
    // ?screen=arcade&game=runner — сразу в игру «Аркады», минуя зал: без
    // этого проверить Word Rush по ссылке можно было бы только кликом.
    if (deepLink === 'arcade') {
      const game = searchParams.get('game')
      if (game) setArcadeTarget({ game })
    }
```

  3. В `handleNav`: `else if (key === 'arcade') setScreen('arcade')` → `else if (key === 'arcade') { setArcadeTarget(payload || null); setScreen('arcade') }`.
  4. В `handleTutorNav`: `else if (key === 'arcade') setScreen('arcade')` → `else if (key === 'arcade') { setArcadeTarget(null); setScreen('arcade') }`.
  5. В `case 'arcade':` добавить проп `initialTarget={arcadeTarget}` в `<ArcadePage …>`.

- [ ] **Step 4: `practiceTabs.js`** — во вкладке `reading` перед `{ id: 'tales', all: 'pill' },`:

```js
      // «Аркада» и здесь: вторая её игра (Word Rush) — на слова, а не на
      // говорение. Перед сказками — по правилу «сказки последние».
      { id: 'arcade' },
```

И в `speaking` поправить комментарий над `{ id: 'arcade' }`:

```js
      // «Аркада» — зал мини-игр (Speak or Die, Word Rush). В макете её нет;
      // стоит последней перед сказками, чтобы правило «сказки — последняя
      // секция» (см. выше) не нарушать.
```

- [ ] **Step 5: `ArcadeCard`** — в `src/screens/practice/PracticeCards.jsx` заменить функцию и её комментарий:

```jsx
// Карточка «Аркады» (вкладки «Говорение» и «Чтение»): зал мини-игр. Каждая
// игра открывается своей кнопкой прямо из Практики, «Все игры» ведёт в зал.
// Геометрия и кнопка — от широкого промо-баннера, картинка — Word Rush.
export function ArcadeCard({ onOpen }) {
  const { t } = useI18n()
  const games = [
    { key: 'speak', title: 'practice.arcade.speak.title', text: 'practice.arcade.speak.text', mic: true },
    { key: 'runner', title: 'practice.arcade.runner.title', text: 'practice.arcade.runner.text' },
  ]
  return (
    <div className="pk-arcade">
      <div className="pk-arcade__text">
        <h3 className="pk-arcade__title">
          {t('practice.arcade.title')}
          <span className="ar-beta ar-beta--light">{t('arcade.beta')}</span>
        </h3>
        <p className="pk-arcade__tagline">{t('practice.arcade.tagline')}</p>
        <p className="pk-arcade__desc">{t('practice.arcade.desc')}</p>
        <div className="pk-arcade__games">
          {games.map((g) => (
            <button key={g.key} type="button" className="pk-arcade__game" onClick={() => onOpen(g.key)}>
              <b>{t(g.title)}</b>
              <span>
                {g.mic && <MicIcon size={13} />}
                {t(g.text)}
              </span>
              <PkChevron size={16} />
            </button>
          ))}
        </div>
        <div className="pk-arcade__foot">
          <button type="button" className="pk-banner__cta" onClick={() => onOpen(null)}>
            {t('practice.arcade.cta')}
            <PkChevron size={18} />
          </button>
        </div>
      </div>
      <div className="pk-arcade__art" aria-hidden="true">
        <img className="pk-arcade__cover" src="/arcade/runner/card.webp" alt="" loading="lazy" />
      </div>
    </div>
  )
}
```

Импорт `SawArt, TreeArt` из `../arcade/ArcadeScene.jsx` в этом файле удалить, если больше нигде в файле не используется (`grep -n "SawArt\|TreeArt" src/screens/practice/PracticeCards.jsx`).

- [ ] **Step 6: `PracticePage.jsx`** — в `case 'arcade':` заменить комментарий и карточку:

```jsx
      case 'arcade':
        // Игр две и без уровней, поэтому ни «Посмотреть все», ни фильтра по
        // уровню у секции нет. Вкладка едет с переходом: «Назад» из зала
        // возвращает туда, откуда пришли (секция есть в двух вкладках).
        return (
          <section key={sec.id} id="sec-arcade" className="pk-sec">
            {head(sec, t('practice.chip.arcade'))}
            <ArcadeCard onOpen={(game) => onNav?.('arcade', { game, skill: tab })} />
          </section>
        )
```

- [ ] **Step 7: `ArcadeScene.jsx:6`** — комментарий `// Персонажи отдельно от сцены: их же рисует карточка «Аркады» в Практике.` → `// Персонажи отдельно от сцены: их же рисует карточка Speak or Die в зале «Аркады».`

- [ ] **Step 8: Строки зала и карточки** — в `src/i18n.jsx` в каждом языке: удалить ключи `practice.arcade.step1`, `practice.arcade.step2`, `practice.arcade.step3`, `practice.arcade.mic`; значения `practice.arcade.title/tagline/desc/cta` заменить; добавить новые. RU (блок от `'practice.chip.arcade'` до `'practice.arcade.cta'` целиком):

```js
    'practice.chip.arcade': 'Аркада',
    'practice.arcade.title': 'Аркада',
    'practice.arcade.tagline': 'Мини-игры на скорость',
    'practice.arcade.desc': 'Говорите без пауз, чтобы спасти дерево, или бегите сквозь ворота с переводом слова.',
    'practice.arcade.speak.title': 'Speak or Die',
    'practice.arcade.speak.text': 'Говорение · нужен микрофон',
    'practice.arcade.runner.title': 'Word Rush',
    'practice.arcade.runner.text': 'Слова · реакция',
    'practice.arcade.cta': 'Все игры',
    'arcade.hub.eyebrow': 'Практика · мини-игры',
    'arcade.hub.title': 'Аркада',
    'arcade.hub.subtitle': 'Короткие игры на английском: раунд — пара минут, результат сразу.',
    'arcade.hub.play': 'Играть',
    'arcade.hub.speak.desc': 'Говорите по-английски на тему 60 секунд. Замолчали — бензопила подбирается к дереву.',
    'arcade.hub.speak.meta': 'Говорение · нужен микрофон',
    'arcade.hub.runner.desc': 'Бегите сквозь ворота с переводом слова. Три ошибки — и забег окончен.',
    'arcade.hub.runner.meta': 'Слова · A1–C1',
```

EN:

```js
    'practice.chip.arcade': 'Arcade',
    'practice.arcade.title': 'Arcade',
    'practice.arcade.tagline': 'Quick-fire mini games',
    'practice.arcade.desc': 'Keep talking to save the tree, or run through the gate with the right translation.',
    'practice.arcade.speak.title': 'Speak or Die',
    'practice.arcade.speak.text': 'Speaking · microphone needed',
    'practice.arcade.runner.title': 'Word Rush',
    'practice.arcade.runner.text': 'Words · reflexes',
    'practice.arcade.cta': 'All games',
    'arcade.hub.eyebrow': 'Practice · mini games',
    'arcade.hub.title': 'Arcade',
    'arcade.hub.subtitle': 'Short English games: a round takes a couple of minutes, results come instantly.',
    'arcade.hub.play': 'Play',
    'arcade.hub.speak.desc': 'Talk in English on a topic for 60 seconds. Go quiet and the chainsaw creeps up on the tree.',
    'arcade.hub.speak.meta': 'Speaking · microphone needed',
    'arcade.hub.runner.desc': 'Run through the gate with the word’s translation. Three mistakes and the run is over.',
    'arcade.hub.runner.meta': 'Words · A1–C1',
```

KK:

```js
    'practice.chip.arcade': 'Аркада',
    'practice.arcade.title': 'Аркада',
    'practice.arcade.tagline': 'Шапшаңдыққа арналған шағын ойындар',
    'practice.arcade.desc': 'Ағашты құтқару үшін кідіріссіз сөйлеңіз немесе сөздің аудармасы жазылған қақпадан жүгіріп өтіңіз.',
    'practice.arcade.speak.title': 'Speak or Die',
    'practice.arcade.speak.text': 'Сөйлеу · микрофон керек',
    'practice.arcade.runner.title': 'Word Rush',
    'practice.arcade.runner.text': 'Сөздер · шапшаңдық',
    'practice.arcade.cta': 'Барлық ойындар',
    'arcade.hub.eyebrow': 'Практика · шағын ойындар',
    'arcade.hub.title': 'Аркада',
    'arcade.hub.subtitle': 'Ағылшын тіліндегі қысқа ойындар: бір раунд — екі-үш минут, нәтиже бірден.',
    'arcade.hub.play': 'Ойнау',
    'arcade.hub.speak.desc': 'Тақырып бойынша 60 секунд ағылшынша сөйлеңіз. Үндемей қалсаңыз — ара ағашқа жақындайды.',
    'arcade.hub.speak.meta': 'Сөйлеу · микрофон керек',
    'arcade.hub.runner.desc': 'Сөздің аудармасы жазылған қақпадан жүгіріп өтіңіз. Үш қате — жарыс бітті.',
    'arcade.hub.runner.meta': 'Сөздер · A1–C1',
```

Проверка: `grep -rn "practice.arcade.step\|practice.arcade.mic" src` — пусто.

- [ ] **Step 9: Стили зала** — в `src/arcade.css` перед блоком Word Rush:

```css
/* ── зал «Аркады»: карточки игр ── */
.ar-hub { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.ar-hub__card {
  display: flex; flex-direction: column; padding: 0; overflow: hidden;
  border: 0; border-radius: 24px; background: #fff; color: var(--ar-ink); text-align: left;
  box-shadow: 0 0 0 1px var(--ar-line), 0 18px 36px -20px rgba(43, 20, 102, 0.35);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.ar-hub__card:hover { transform: translateY(-2px); box-shadow: 0 0 0 1px var(--ar-focus), 0 22px 40px -20px rgba(43, 20, 102, 0.45); }
.ar-hub__art {
  position: relative; display: block; height: 210px; overflow: hidden;
  background: radial-gradient(ellipse at 80% 20%, rgba(168, 110, 255, 0.45) 0, transparent 55%), linear-gradient(180deg, #3a1a86 0%, #1c0d45 100%);
}
.ar-hub__art img { display: block; width: 100%; height: 100%; object-fit: cover; }
.ar-hub__saw { position: absolute; bottom: 22px; left: 10%; width: 150px; }
.ar-hub__tree { position: absolute; right: 12%; bottom: 8px; width: 118px; }
.ar-hub__saw svg, .ar-hub__tree svg { display: block; width: 100%; height: auto; }
.ar-hub__body { display: flex; flex: 1; flex-direction: column; gap: 8px; padding: 18px 20px 20px; }
.ar-hub__title { font-size: 22px; font-weight: 800; line-height: 1.2; }
.ar-hub__desc { font-size: 15px; font-weight: 500; line-height: 1.5; color: var(--ar-muted); }
.ar-hub__meta { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: var(--ar-violet); }
.ar-hub__cta {
  display: inline-flex; align-items: center; gap: 4px; align-self: flex-start; margin-top: auto;
  padding: 10px 18px; border-radius: 999px; background: var(--ar-violet); color: #fff; font-size: 14px; font-weight: 800;
}
@media (max-width: 760px) {
  .ar-hub { grid-template-columns: 1fr; }
  .ar-hub__art { height: 180px; }
}
```

В `src/styles.css`: найти `.pk-arcade__steps`, `.pk-arcade__mic` и связанные правила (включая медиазапросы) и удалить; `.pk-arcade__saw`, `.pk-arcade__tree`, `.pk-arcade__hill` — удалить, если больше не используются (`grep -rn "pk-arcade__" src --include=*.jsx`). Добавить после `.pk-arcade__desc`:

```css
.pk-arcade__games { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 16px; }
.pk-arcade__game {
  display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 2px 8px;
  padding: 12px 14px; border: 0; border-radius: 16px;
  background: rgba(255, 255, 255, 0.14); color: #fff; text-align: left; font-family: inherit; cursor: pointer;
}
.pk-arcade__game:hover { background: rgba(255, 255, 255, 0.22); }
.pk-arcade__game b { font-size: 15px; font-weight: 800; }
.pk-arcade__game span { grid-column: 1; display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; opacity: 0.85; }
.pk-arcade__game svg:last-child { grid-column: 2; grid-row: 1 / span 2; }
.pk-arcade__cover { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: inherit; }
@media (max-width: 560px) { .pk-arcade__games { grid-template-columns: 1fr; } }
```

(Цвета `.pk-arcade__game` сверить со скриншотом: если фон карточки светлый — заменить на `var(--pk-…)`-тон карточки; решается на шаге 10.)

- [ ] **Step 10: Проверить вживую** — dev-сервер воркtree:
  - `/?screen=practice` → вкладка «Говорение» → секция «Аркада»: две кнопки игр + «Все игры»; то же во вкладке «Чтение»;
  - кнопка Word Rush → сразу игра; «← К играм» → зал; «← В Практику» → вкладка «Чтение» (если пришли из неё);
  - `/?screen=arcade` → зал; `/?screen=arcade&game=speak` → Speak or Die работает как раньше;
  - телефонная ширина: карточки зала в колонку, карточка Практики не ломается;
  - скриншоты зала и карточки.

- [ ] **Step 11: Lint + unit**

Run: `npx eslint src/screens/ArcadePage.jsx src/screens/arcade src/screens/practice src/screens/PracticePage.jsx src/App.jsx && npx vitest run --exclude '.claude/**' src/i18n.arcade.test.js src/screens/arcade`
Expected: новых ошибок нет (pre-existing в practice/vocab — см. память «Красные тесты на develop»), тесты PASS.

- [ ] **Step 12: Commit**

```bash
git add src/screens/arcade/ArcadeHub.jsx src/screens/ArcadePage.jsx src/App.jsx src/screens/practice/practiceTabs.js src/screens/practice/PracticeCards.jsx src/screens/PracticePage.jsx src/screens/arcade/ArcadeScene.jsx src/i18n.jsx src/arcade.css src/styles.css
git commit -m "feat(arcade): зал из двух игр, диплинк ?game=, карточка в «Говорении» и «Чтении»"
```

---

### Task 7: E2E

**Files:**
- Create: `tests/arcade-runner.spec.js`

**Interfaces:**
- Consumes: атрибуты `.ar-run-stage` (Task 5), кнопки зала (Task 6).

- [ ] **Step 1: Spec** — `tests/arcade-runner.spec.js`:

```js
import { test, expect } from '@playwright/test'

// «Word Rush» — вторая игра «Аркады» (?screen=arcade&game=runner). Тесты
// гостевые: игре не нужен сервер, слова — статика Словаря.
//
// Сцена — WebGL. Headless Chromium без видеокарты даёт WebGL только через
// SwiftShader, а с Chrome 137 его надо разрешать флагом явно — иначе игра
// честно показывает «браузер не тянет 3D» и тест проверял бы не то.
test.use({ launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] } })

const stage = (page) => page.locator('.ar-run-stage')

async function openRunner(page) {
  await page.goto('/?screen=arcade&game=runner')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Word Rush', { timeout: 30000 })
  await expect(page.getByRole('button', { name: /Старт/ })).toBeVisible({ timeout: 30000 })
}

async function startAt(page, levelName) {
  await page.getByRole('button', { name: new RegExp(levelName) }).click()
  await page.getByRole('button', { name: /Старт/ }).click()
}

// Ждёт ряд ворот и возвращает номер верной дорожки.
async function nextRow(page) {
  await expect(stage(page)).not.toHaveAttribute('data-options', '', { timeout: 15000 })
  return Number(await stage(page).getAttribute('data-correct'))
}

async function goToLane(page, lane) {
  const now = Number(await stage(page).getAttribute('data-lane'))
  const key = lane < now ? 'ArrowLeft' : 'ArrowRight'
  for (let i = 0; i < Math.abs(lane - now); i++) await page.keyboard.press(key)
  await expect(stage(page)).toHaveAttribute('data-lane', String(lane))
}

test('верные ворота дают очко, неверные — отнимают жизнь и показывают перевод', async ({ page }) => {
  test.setTimeout(90_000)
  await openRunner(page)
  await startAt(page, 'Лёгкий')
  await goToLane(page, await nextRow(page))
  await expect(stage(page)).toHaveAttribute('data-score', '1', { timeout: 15000 })
  await expect(stage(page)).toHaveAttribute('data-lives', '3')

  const correct = await nextRow(page)
  await goToLane(page, (correct + 1) % 3)
  await expect(stage(page)).toHaveAttribute('data-lives', '2', { timeout: 15000 })
  await expect(page.locator('.ar-run-toast')).toContainText('=')
})

test('три ошибки — конец забега и список ошибок в итогах', async ({ page }) => {
  test.setTimeout(90_000)
  await openRunner(page)
  await startAt(page, 'Очень сложный')
  for (let i = 0; i < 3; i++) {
    const correct = await nextRow(page)
    await goToLane(page, (correct + 1) % 3)
    await expect(stage(page)).toHaveAttribute('data-lives', String(2 - i), { timeout: 15000 })
  }
  await expect(page.getByRole('heading', { name: 'Забег окончен' })).toBeVisible()
  await expect(page.locator('.ar-run-mistakes li')).toHaveCount(3)
})

test('зал открывает обе игры и возвращает назад', async ({ page }) => {
  await page.goto('/?screen=arcade')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Аркада', { timeout: 30000 })
  await page.getByRole('button', { name: /Word Rush/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Word Rush')
  await page.getByRole('button', { name: /К играм/ }).first().click()
  await page.getByRole('button', { name: /Speak or Die/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Speak or Die')
})
```

- [ ] **Step 2: Run** (свободный порт, чтобы не гонять чужой воркtree; см. память про системный Chrome, если Playwright-Chromium не стоит):

```bash
E2E_PORT=3197 npx playwright test tests/arcade-runner.spec.js --project=desktop
E2E_PORT=3197 npx playwright test tests/arcade-runner.spec.js --project=mobile
```

Expected: 3 passed в каждом проекте. Падение из-за WebGL (оверлей «браузер не показывает 3D») — проверить флаги запуска, а не ослаблять тест.

- [ ] **Step 3: Commit**

```bash
git add tests/arcade-runner.spec.js
git commit -m "test(arcade): e2e Word Rush — очко, жизнь, конец забега, зал"
```

---

### Task 8: Финальная проверка и PR

- [ ] **Step 1: Полный прогон**

```bash
npm run build
npm run lint
npx vitest run --exclude '.claude/**'
E2E_PORT=3197 npx playwright test tests/arcade-runner.spec.js tests/practice-i18n.spec.js tests/practice-mobile.spec.js
```

Expected: build ок; lint — только pre-existing ошибки practice/vocab (6 шт.); vitest — только pre-existing падения (см. память «Красные тесты на develop»); e2e — зелёные. Проверить, что three не попал в общий бандл: в выводе `next build` размер First Load JS у `/` не вырос на ~150 КБ относительно develop.

- [ ] **Step 2: Финальное ревью** — субагент `code-review` / `caveman:cavecrew-reviewer` по диффу `origin/develop...HEAD`; исправить найденное.

- [ ] **Step 3: Скриншоты** для PR: зал, забег (ворота с надписями), подсказка ошибки, итоги, мобильная ширина.

- [ ] **Step 4: Push и PR в develop** (только после слова владельца):

```bash
git push -u origin feat/arcade-word-rush
gh pr create --base develop --title "feat(arcade): Word Rush — 3D-бегун по словам + зал Аркады" --body "<описание, скриншоты, как проверить: ?screen=arcade&game=runner>"
```
