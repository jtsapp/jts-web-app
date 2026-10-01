# Word Rush: прыжок, подкат и препятствия — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** В Word Rush появляются прыжок и подкат (клипы Meshy), препятствия на подходе к воротам (барьер, шлагбаум, автобус) и очки от скорости и серии; удар стоит скорости и серии, не жизни.

**Architecture:** Правила — чистые модули под vitest: `obstacles.js` (новый) раскладывает препятствия с гарантиями честности, `engine.js` получает позы, столкновения, удар и очки. Сцена three.js только рисует снимок: пул моделей препятствий, четыре клипа бегуна из одного склеенного GLB. Склейку клипов делает свой GLB-модуль без зависимостей (`scripts/lib/glb.js`).

**Tech Stack:** Next.js 16 (SPA-оболочка), React 19, JavaScript (без TS), three 0.186 (`GLTFLoader`, `AnimationMixer`), vitest 2, Playwright, Higgsfield MCP (`3d_rigging`, `generate_image`, `image_to_3d`), `@gltf-transform/cli` через npx.

**Спека:** `docs/superpowers/specs/2026-10-01-word-rush-moves-design.md`.

## Global Constraints

- Рабочее дерево — `.claude/worktrees/word-rush-moves`, ветка `feat/word-rush-moves` от `origin/develop`. Основное дерево не трогать (там гибрид release-ветки).
- JavaScript, не TypeScript. Комментарии — по-русски и объясняют «почему».
- Стили — только `src/arcade.css`, классы `ar-run-*`. Строки UI — `src/i18n.jsx` (`useI18n`), ru/en/kk одинаковыми ключами.
- three.js импортируется только динамически из `RunnerGame.jsx` (через `runnerScene.js`).
- Удар о препятствие НЕ отнимает жизнь. Жизнь — только за неверные ворота.
- Константы: `JUMP_TIME = 0.7`, `SLIDE_TIME = 0.7`, `HIT_SLOW = 0.75`, `INVULN = 1`, `POINTS = 10`, `MULT_EVERY = 5`, `MULT_CAP = 5`; очки ворот `round(POINTS × speedMul × min(5, 1 + floor(streak / 5)))`, `speedMul` — до прироста, `streak` — после этих ворот.
- Раскладка: `d ≥ 1 с × скорость`, `d + len ≤ 40` (`SPAWN × 2/3`), зазор `max(0.6 с × скорость, 6)`, на одном `d` не больше двух на разных дорожках, подходы к рядам 0–2 пустые. Длины: barrier 0.6, boom 0.4, bus 8.
- Клипы Meshy: бег 16 (RunFast), прыжок 13 (Jump_Run), подкат 516 (slide_light), удар 519 (sliding_stumble).
- Рекорд — ключ `jts_arcade_runner_best_v2`.
- Бюджет всего 3D ≤ 3 МБ.
- vitest: `npm test -- --exclude '.claude/**'` (иначе подхватит соседние worktree). E2E — ОДНИМ воркером и на свободном порту: `E2E_PORT=3197 npx playwright test tests/arcade-runner.spec.js --workers=1`.
- Коммиты — conventional, по-русски, в конце `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Раскладка препятствий (`obstacles.js`)

**Files:**
- Create: `src/practice/arcade/runner/obstacles.js`
- Test: `src/practice/arcade/runner/obstacles.test.js`

**Interfaces:**
- Consumes: `LANES`, `SPAWN`, `RUN_DIFFICULTIES`, `SPEED_CAP` из `engine.js` (уже есть).
- Produces: `KINDS` (`{ barrier: { len: 0.6 }, boom: { len: 0.4 }, bus: { len: 8 } }`), `WARMUP_ROWS = 3`, `CLEAR_FROM = 40`, `layoutObstacles({ difficulty, rowIndex, speed, rng }) → [{ lane, kind, len, d }]`. `difficulty` — ключ сложности (`easy|medium|hard|veryHard`), `rowIndex` — номер ряда, К КОТОРОМУ ведёт подход, `speed` — ед./с.

- [ ] **Step 1: Зависимости в worktree**

```bash
cd /c/Users/nural/Desktop/jts-web-app/.claude/worktrees/word-rush-moves
npm ci
```

Expected: без ошибок, появился `node_modules/`.

- [ ] **Step 2: Написать падающий тест**

`src/practice/arcade/runner/obstacles.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { LANES, RUN_DIFFICULTIES, SPAWN, SPEED_CAP } from './engine.js'
import { CLEAR_FROM, KINDS, WARMUP_ROWS, layoutObstacles } from './obstacles.js'

// Тот же генератор, что у окон в сцене: раскладка на фиксированном зерне
// воспроизводима, и гарантии проверяются на сотнях раскладок.
function seeded(seed) {
  let a = seed
  return () => (a = (a * 16807) % 2147483647) / 2147483647
}

// Скорость на старте, в середине и у потолка — у потолка окно раскладки уже.
const speedsOf = (d) => [1, 1.3, SPEED_CAP].map((m) => (SPAWN / d.lead) * m)

function* layouts(n = 300) {
  for (const d of RUN_DIFFICULTIES) {
    for (const speed of speedsOf(d)) {
      for (let seed = 1; seed <= n; seed++) {
        const layout = layoutObstacles({ difficulty: d.key, rowIndex: WARMUP_ROWS, speed, rng: seeded(seed * 7919) })
        yield { d, speed, layout }
      }
    }
  }
}

describe('layoutObstacles', () => {
  it('подходы к рядам 0–2 пустые — разминка', () => {
    for (const d of RUN_DIFFICULTIES) {
      for (let rowIndex = 0; rowIndex < WARMUP_ROWS; rowIndex++) {
        expect(layoutObstacles({ difficulty: d.key, rowIndex, speed: SPAWN / d.lead, rng: seeded(7) })).toEqual([])
      }
    }
  })

  it('каждое препятствие заметно после ворот и не лезет в чистую треть', () => {
    for (const { speed, layout } of layouts()) {
      for (const o of layout) {
        expect(o.d).toBeGreaterThanOrEqual(speed - 1e-9)
        expect(o.d + o.len).toBeLessThanOrEqual(CLEAR_FROM + 1e-9)
        expect(o.len).toBe(KINDS[o.kind].len)
        expect(o.lane).toBeGreaterThanOrEqual(0)
        expect(o.lane).toBeLessThan(LANES)
      }
    }
  })

  it('на одном расстоянии не больше двух и на разных дорожках; между расстояниями — зазор', () => {
    for (const { speed, layout } of layouts()) {
      const byD = new Map()
      for (const o of layout) byD.set(o.d, [...(byD.get(o.d) || []), o])
      const slots = [...byD.entries()].sort((a, b) => a[0] - b[0])
      for (const [, group] of slots) {
        expect(group.length).toBeLessThanOrEqual(2)
        expect(new Set(group.map((o) => o.lane)).size).toBe(group.length)
      }
      for (let i = 1; i < slots.length; i++) {
        const [d0, g0] = slots[i - 1]
        const end = d0 + Math.max(...g0.map((o) => o.len))
        expect(slots[i][0] - end).toBeGreaterThanOrEqual(Math.max(0.6 * speed, 6) - 1e-9)
      }
    }
  })

  it('плотность по сложностям', () => {
    const counts = {}
    for (const { d, layout } of layouts()) (counts[d.key] ||= new Set()).add(layout.length)
    expect([...counts.easy].sort()).toEqual([0, 1])
    expect([...counts.medium]).toEqual([1])
    expect([...counts.hard].sort()).toEqual([1, 2])
    expect([...counts.veryHard]).toEqual([1])
  })

  it('easy — без автобусов; hard иногда ставит пару на одном расстоянии', () => {
    let pairs = 0
    for (const { d, layout } of layouts()) {
      if (d.key === 'easy') expect(layout.some((o) => o.kind === 'bus')).toBe(false)
      if (d.key === 'hard' && layout.length === 2 && layout[0].d === layout[1].d) pairs++
    }
    expect(pairs).toBeGreaterThan(0)
  })

  it('veryHard у потолка скорости — без автобуса, но не пустой', () => {
    const d = RUN_DIFFICULTIES.find((x) => x.key === 'veryHard')
    const speed = (SPAWN / d.lead) * SPEED_CAP
    for (let seed = 1; seed <= 300; seed++) {
      const layout = layoutObstacles({ difficulty: 'veryHard', rowIndex: WARMUP_ROWS, speed, rng: seeded(seed * 7919) })
      expect(layout).toHaveLength(1)
      expect(layout[0].kind).not.toBe('bus')
    }
  })

  it('неизвестная сложность — пусто', () => {
    expect(layoutObstacles({ difficulty: 'nope', rowIndex: 9, speed: 10, rng: seeded(1) })).toEqual([])
  })
})
```

- [ ] **Step 3: Убедиться, что тест падает**

Run: `npx vitest run src/practice/arcade/runner/obstacles.test.js`
Expected: FAIL — `Failed to resolve import "./obstacles.js"`.

- [ ] **Step 4: Реализация**

`src/practice/arcade/runner/obstacles.js`:

```js
// «Word Rush» — раскладка препятствий на подходе к воротам. Чистый модуль,
// как deck.js: случайность приходит снаружи (`rng`), поэтому гарантии честной
// раскладки проверяются тестом на фиксированном зерне.
//
// Раскладку подхода к ряду N+1 кладут в момент появления ряда N — ЗА его
// воротами, на расстоянии `d` от них (engine.spawnRow ставит её на SPAWN + d).
// Положи мы её вместе с рядом N+1, ближние препятствия возникали бы прямо
// перед бегуном, а не выезжали из тумана.

import { LANES, SPAWN } from './engine.js'

// Длина вдоль дороги, ед. Сцена вписывает модель в неё же — иначе удар
// случался бы «в воздухе» перед моделью или за ней.
export const KINDS = {
  barrier: { len: 0.6 },
  boom: { len: 0.4 },
  bus: { len: 8 },
}
// Первые подходы пустые: сначала освоиться со словами, потом уворачиваться.
export const WARMUP_ROWS = 3
// Последняя треть пути перед воротами чистая: там перестраиваются на ответ.
export const CLEAR_FROM = (SPAWN * 2) / 3
// Секунда после ворот — заметить препятствие, на какой бы дорожке ни вышел.
const REACT = 1
// Между препятствиями по длине — время приземлиться и сделать новое движение.
const SPACING = 0.6
const MIN_SPACING = 6

const ALL = ['barrier', 'boom', 'bus']
// easy — без автобуса: его не перепрыгнуть и не проехать, только обежать,
// а на A1 внимание нужно словам. veryHard — одно: на ряд всего 2.5 с.
const PLAN = {
  easy: { counts: [0, 1], kinds: ['barrier', 'boom'], pair: 0 },
  medium: { counts: [1], kinds: ALL, pair: 0 },
  hard: { counts: [1, 2], kinds: ALL, pair: 0.5 },
  veryHard: { counts: [1], kinds: ALL, pair: 0 },
}

const pick = (list, rng) => list[Math.floor(rng() * list.length)]

export function layoutObstacles({ difficulty, rowIndex, speed, rng = Math.random }) {
  const plan = PLAN[difficulty]
  if (!plan || rowIndex < WARMUP_ROWS) return []
  const count = pick(plan.counts, rng)
  const gap = Math.max(SPACING * speed, MIN_SPACING)
  // Вид влезает, если стоит целиком до чистой трети. Не влезает — не ставим:
  // у потолка скорости veryHard вмещает барьер или шлагбаум, но не автобус.
  const fitting = (at) => plan.kinds.filter((k) => at + KINDS[k].len <= CLEAR_FROM)
  const out = []
  let from = REACT * speed
  while (out.length < count) {
    const kinds = fitting(from)
    if (!kinds.length) break
    const kind = pick(kinds, rng)
    const len = KINDS[kind].len
    const d = from + rng() * (CLEAR_FROM - len - from)
    const lane = Math.floor(rng() * LANES)
    out.push({ lane, kind, len, d })
    let end = d + len
    // Пара на одном расстоянии — две дорожки из трёх: третья всегда пустая,
    // неизбежного удара не бывает.
    if (out.length < count && rng() < plan.pair) {
      const kind2 = pick(fitting(d), rng)
      const lanes = [0, 1, 2].filter((l) => l !== lane)
      out.push({ lane: pick(lanes, rng), kind: kind2, len: KINDS[kind2].len, d })
      end = Math.max(end, d + KINDS[kind2].len)
    }
    from = end + gap
  }
  return out
}
```

- [ ] **Step 5: Тест проходит**

Run: `npx vitest run src/practice/arcade/runner/obstacles.test.js`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add src/practice/arcade/runner/obstacles.js src/practice/arcade/runner/obstacles.test.js
git commit -m "feat(arcade): Word Rush — раскладка препятствий на подходе к воротам

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Движок — позы, столкновения, удар, очки (`engine.js`)

**Files:**
- Modify: `src/practice/arcade/runner/engine.js` (весь файл)
- Test: `src/practice/arcade/runner/engine.test.js`

**Interfaces:**
- Consumes: ничего нового (раскладка приходит массивом `[{ lane, kind, len, d }]` из Task 1).
- Produces:
  - константы `JUMP_TIME`, `SLIDE_TIME`, `HIT_SLOW`, `INVULN`, `POINTS`, `MULT_EVERY`, `MULT_CAP`;
  - `multOf(streak) → number`;
  - `jump(s)`, `slide(s)` → новое состояние;
  - `spawnRow(s, row, layout = [])`;
  - в состоянии: `pose: 'run'|'jump'|'slide'`, `poseLeft`, `invuln`, `hits`, `lastHit: { n, kind, lane, at } | null`, `obstacles: [{ id, lane, kind, len, z, hit }]`, `obstacleSeq`; у `last` — поле `points`.

- [ ] **Step 1: Дописать тесты**

В `src/practice/arcade/runner/engine.test.js` заменить импорт на:

```js
import { describe, expect, it } from 'vitest'
import { DIFFICULTIES } from '../engine.js'
import {
  HIT_SLOW,
  INVULN,
  LIVES,
  MAX_DT,
  ROW_GAP,
  RUN_DIFFICULTIES,
  SPAWN,
  SPEED_CAP,
  SPEED_STEP,
  advance,
  createRun,
  isOver,
  jump,
  move,
  multOf,
  needsRow,
  slide,
  spawnRow,
  speedOf,
} from './engine.js'
```

В тесте `'верные ворота: очко, серия, скорость растёт, жизни на месте'` заменить название и первую проверку:

```js
  it('верные ворота: очки, серия, скорость растёт, жизни на месте', () => {
    const s = hit(createRun(6))
    expect(s.score).toBe(10)
```

В конец файла добавить:

```js
// Длины как в obstacles.js — движок их не знает, их приносит раскладка.
const LEN = { barrier: 0.6, boom: 0.4, bus: 8 }
// Препятствие в двух единицах перед бегуном (скорость на старте 10 ед./с).
const ahead = (kind, extra = {}) => ({
  ...createRun(6),
  obstacles: [{ id: 0, lane: 1, kind, len: LEN[kind], z: 2, hit: false }],
  ...extra,
})
function run(s, seconds, every = 0.1) {
  for (let t = 0; t < seconds - 1e-9; t += every) s = advance(s, every)
  return s
}

describe('позы', () => {
  it('прыжок длится 0.7 с, потом бег', () => {
    let s = jump(createRun(6))
    expect(s.pose).toBe('jump')
    s = run(s, 0.6)
    expect(s.pose).toBe('jump')
    s = advance(s, 0.1)
    expect(s.pose).toBe('run')
  })

  it('повторный прыжок в прыжке ничего не делает', () => {
    const s = advance(jump(createRun(6)), 0.3)
    expect(jump(s)).toBe(s)
  })

  it('«вниз» в прыжке — сразу подкат, «вверх» в подкате — сразу прыжок', () => {
    const s = slide(advance(jump(createRun(6)), 0.2))
    expect(s.pose).toBe('slide')
    expect(jump(s).pose).toBe('jump')
  })

  it('дорожку можно менять в прыжке', () => {
    expect(move(jump(createRun(6)), 1).lane).toBe(2)
  })

  it('после конца забега позы не меняются', () => {
    const over = { ...createRun(6), lives: 0 }
    expect(jump(over)).toBe(over)
    expect(slide(over)).toBe(over)
  })
})

describe('препятствия', () => {
  it('барьер: в беге — удар, прыжок проходит, подкат не спасает', () => {
    expect(run(ahead('barrier'), 0.6).hits).toBe(1)
    expect(run(jump(ahead('barrier')), 0.6).hits).toBe(0)
    expect(run(slide(ahead('barrier')), 0.6).hits).toBe(1)
  })

  it('шлагбаум: проходит только подкат', () => {
    expect(run(slide(ahead('boom')), 0.6).hits).toBe(0)
    expect(run(jump(ahead('boom')), 0.6).hits).toBe(1)
    expect(run(ahead('boom'), 0.6).hits).toBe(1)
  })

  it('автобус бьёт в любой позе', () => {
    expect(run(jump(ahead('bus')), 0.6).hits).toBe(1)
    expect(run(slide(ahead('bus')), 0.6).hits).toBe(1)
  })

  it('другая дорожка — мимо', () => {
    expect(run(ahead('bus', { lane: 0 }), 1.5).hits).toBe(0)
  })

  it('перестроение в полосу автобуса посреди корпуса — удар', () => {
    let s = { ...createRun(6), obstacles: [{ id: 0, lane: 0, kind: 'bus', len: 8, z: -3, hit: false }] }
    s = advance(s, 0.1)
    expect(s.hits).toBe(0)
    s = advance(move(s, -1), 0.1)
    expect(s.hits).toBe(1)
  })

  it('удар: скорость ×0.75, серия с нуля, жизни целы, lastHit для сцены', () => {
    const s = run(ahead('bus', { speedMul: 1.4, streak: 7 }), 0.4)
    expect(s.speedMul).toBeCloseTo(1.4 * HIT_SLOW)
    expect(s.streak).toBe(0)
    expect(s.lives).toBe(LIVES)
    expect(s.hits).toBe(1)
    expect(s.lastHit).toMatchObject({ n: 1, kind: 'bus', lane: 1 })
    expect(s.invuln).toBeGreaterThan(0)
  })

  it('удар не опускает скорость ниже стартовой', () => {
    expect(run(ahead('bus', { speedMul: 1.1 }), 0.4).speedMul).toBe(1)
  })

  it('удар сбрасывает позу в бег', () => {
    expect(run(jump(ahead('bus')), 0.4).pose).toBe('run')
  })

  it('неуязвимость: второй удар не засчитан, пока она идёт; после — засчитан', () => {
    const at = (z, id) => ({ id, lane: 1, kind: 'barrier', len: 0.6, z, hit: false })
    let s = { ...createRun(6), obstacles: [at(2, 0), at(6, 1), at(16, 2)] }
    s = run(s, 1)
    expect(s.hits).toBe(1)
    s = run(s, 1)
    expect(s.hits).toBe(2)
    expect(INVULN).toBeLessThan(1.4)
  })

  it('длинный кадр не проскакивает барьер', () => {
    const s = advance(ahead('barrier', { obstacles: [{ id: 0, lane: 1, kind: 'barrier', len: 0.6, z: 1, hit: false }] }), 10)
    expect(s.hits).toBe(1)
  })

  it('препятствия едут и без ряда, проехавшие выбрасываются', () => {
    let s = ahead('barrier', { lane: 0 })
    s = advance(s, 0.1)
    expect(s.row).toBeNull()
    expect(s.obstacles[0].z).toBeCloseTo(1)
    s = run(s, 1)
    expect(s.obstacles).toEqual([])
  })

  it('spawnRow кладёт раскладку за ворота ряда', () => {
    const s = spawnRow(createRun(6), ROW, [{ lane: 2, kind: 'barrier', len: 0.6, d: 15 }])
    expect(s.row.z).toBe(SPAWN)
    expect(s.obstacles).toEqual([{ id: 0, lane: 2, kind: 'barrier', len: 0.6, z: SPAWN + 15, hit: false }])
    expect(s.obstacleSeq).toBe(1)
  })
})

describe('очки', () => {
  it('множитель: ×1 до пятых подряд, ×2 с пятых, потолок ×5', () => {
    expect([0, 1, 4, 5, 9, 10, 19, 20, 100].map(multOf)).toEqual([1, 1, 1, 2, 2, 3, 4, 5, 5])
  })

  it('верные ворота: 10 × скорость до прироста × множитель после', () => {
    const s = hit({ ...createRun(6), speedMul: 1.5, streak: 4 })
    expect(s.last.points).toBe(30)
    expect(s.score).toBe(30)
  })

  it('неверные ворота очков не дают', () => {
    const s = miss(createRun(6))
    expect(s.last.points).toBe(0)
    expect(s.score).toBe(0)
  })
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/practice/arcade/runner/engine.test.js`
Expected: FAIL — `jump is not a function` / `multOf is not a function`, `score` 1 вместо 10.

- [ ] **Step 3: Реализация — заменить `engine.js` целиком**

```js
// «Word Rush» — правила забега второй игры «Аркады». Чистый модуль, как
// engine.js у Speak or Die: ни React, ни three.js, время приходит снаружи,
// поэтому забег проверяется тестом кадр за кадром.
//
// Мир одномерный: бегун стоит на месте (z = 0), ряд ворот появляется на
// расстоянии SPAWN и едет к нему. Проход считается в кадре, где ряд дошёл до
// нуля, — по дорожке, на которой бегун стоит в этот момент. На сцене всегда
// один ряд: иначе неясно, к какому ряду относится слово сверху.
//
// Препятствия едут той же скоростью, но живут отдельно от ряда: раскладку
// подхода к следующему ряду кладут за воротами текущего (obstacles.js), и она
// ещё на дороге, когда ряда уже нет. Удар стоит скорости и серии, но не
// жизни: жизнь отнимает только незнание слова (решение владельца 01.10.2026).

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

// Прыжок и подкат длятся столько, потом бегун сам возвращается в бег.
export const JUMP_TIME = 0.7
export const SLIDE_TIME = 0.7
// Удар: скорость ×0.75, но не ниже стартовой, и секунда неуязвимости — иначе
// длинный автобус или соседнее препятствие били бы второй раз подряд.
export const HIT_SLOW = 0.75
export const INVULN = 1
// Очки: верные ворота стоят POINTS × скорость × множитель серии. Считай мы
// ворота, как раньше, удар ничего бы не стоил, а медленный бег (больше
// времени на чтение) был бы даже выгоден.
export const POINTS = 10
export const MULT_EVERY = 5
export const MULT_CAP = 5

// Какая поза проходит препятствие. Автобуса здесь нет: его не проходит никакая.
const CLEARS = { barrier: 'jump', boom: 'slide' }
// Проехавшее препятствие живёт ещё немного: сцена дорисовывает его хвост.
const BEHIND = -2
// 0.1 × 7 в плавающей точке не ровно 0.7 — поза не должна жить лишний кадр.
const EPS = 1e-9

// Время от появления ряда до ворот на старте и уровни слов Словаря.
const LEADS = { easy: 6, medium: 4.5, hard: 3.5, veryHard: 2.5 }
const LEVELS = { easy: ['A1', 'A2'], medium: ['B1'], hard: ['B2'], veryHard: ['C1'] }

export const RUN_DIFFICULTIES = DIFFICULTIES.map((d) => ({
  key: d.key,
  band: d.band,
  lead: LEADS[d.key],
  levels: LEVELS[d.key],
}))

export const multOf = (streak) => Math.min(MULT_CAP, 1 + Math.floor(streak / MULT_EVERY))

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
    pose: 'run',
    poseLeft: 0,
    invuln: 0,
    hits: 0,
    lastHit: null,
    obstacles: [],
    obstacleSeq: 0,
  }
}

export const isOver = (s) => s.lives <= 0
export const speedOf = (s) => s.baseSpeed * s.speedMul
export const needsRow = (s) => !isOver(s) && !s.row && s.gap <= 0

// `n` — номер ряда в забеге: по нему сцена понимает, что ворота новые.
// `layout` — раскладка подхода к СЛЕДУЮЩЕМУ ряду (obstacles.js); её `d`
// отсчитан от этих ворот назад, поэтому препятствия выезжают из тумана вслед
// за воротами, а не возникают перед бегуном.
export function spawnRow(s, row, layout = []) {
  const added = layout.map((o, i) => ({
    id: s.obstacleSeq + i,
    lane: o.lane,
    kind: o.kind,
    len: o.len,
    z: SPAWN + o.d,
    hit: false,
  }))
  return {
    ...s,
    row: { ...row, z: SPAWN, n: s.seq },
    obstacles: added.length ? [...s.obstacles, ...added] : s.obstacles,
    obstacleSeq: s.obstacleSeq + added.length,
  }
}

export function move(s, dir) {
  if (isOver(s)) return s
  const lane = Math.max(0, Math.min(LANES - 1, s.lane + dir))
  return lane === s.lane ? s : { ...s, lane }
}

export function jump(s) {
  if (isOver(s) || s.pose === 'jump') return s
  return { ...s, pose: 'jump', poseLeft: JUMP_TIME }
}

// «Вниз» в прыжке — сразу подкат: как в Subway, приземления не ждём.
export function slide(s) {
  if (isOver(s) || s.pose === 'slide') return s
  return { ...s, pose: 'slide', poseLeft: SLIDE_TIME }
}

export function advance(s, seconds) {
  if (isOver(s)) return s
  const dt = Math.max(0, Math.min(seconds, MAX_DT))
  const dist = speedOf(s) * dt
  // Столкновения — позой начала кадра, потом она отсчитывается: прыжок
  // прикрывает ровно JUMP_TIME, а не на кадр меньше.
  const next = tick(runObstacles({ ...s, elapsed: s.elapsed + dt }, dist), dt)
  if (!next.row) return { ...next, gap: Math.max(0, next.gap - dt) }
  const z = next.row.z - dist
  if (z > 0) return { ...next, row: { ...next.row, z } }
  return pass(next)
}

function tick(s, dt) {
  const poseLeft = Math.max(0, s.poseLeft - dt)
  const done = s.pose !== 'run' && poseLeft <= EPS
  return {
    ...s,
    pose: done ? 'run' : s.pose,
    poseLeft: done ? 0 : poseLeft,
    invuln: Math.max(0, s.invuln - dt),
  }
}

function runObstacles(s, dist) {
  if (!s.obstacles.length) return s
  let next = s
  const moved = []
  for (const o of s.obstacles) {
    const z = o.z - dist
    if (z + o.len < BEHIND) continue
    // Перекрытие за кадр, а не положение в конце кадра: длинный кадр не
    // проносит бегуна сквозь барьер, а автобус бьёт и того, кто перестроился
    // в его полосу посреди корпуса.
    const touches = !o.hit && o.lane === next.lane && z <= 0 && o.z + o.len >= 0
    if (touches && next.invuln <= 0 && CLEARS[o.kind] !== next.pose) {
      next = crash(next, o)
      moved.push({ ...o, z, hit: true })
    } else {
      moved.push({ ...o, z })
    }
  }
  return { ...next, obstacles: moved }
}

// Бегун не останавливается и проходит препятствие насквозь: в Subway тут
// конец забега, у нас — потеря темпа.
function crash(s, o) {
  const hits = s.hits + 1
  return {
    ...s,
    speedMul: Math.max(1, s.speedMul * HIT_SLOW),
    streak: 0,
    pose: 'run',
    poseLeft: 0,
    invuln: INVULN,
    hits,
    lastHit: { n: hits, kind: o.kind, lane: o.lane, at: s.elapsed },
  }
}

function pass(s) {
  const { row, lane } = s
  const hit = lane === row.correct
  const picked = row.options[lane]
  const seq = s.seq + 1
  const streak = hit ? s.streak + 1 : 0
  const points = hit ? Math.round(POINTS * s.speedMul * multOf(streak)) : 0
  const last = { hit, lane, correct: row.correct, id: row.id, prompt: row.prompt, answer: row.answer, picked, points, seq, at: s.elapsed }
  const base = { ...s, row: null, gap: ROW_GAP, seq, last, streak }
  if (hit) {
    return {
      ...base,
      score: s.score + points,
      bestStreak: Math.max(s.bestStreak, streak),
      speedMul: Math.min(SPEED_CAP, s.speedMul * SPEED_STEP),
    }
  }
  return {
    ...base,
    lives: s.lives - 1,
    mistakes: [...s.mistakes, { prompt: row.prompt, answer: row.answer, picked }],
  }
}
```

- [ ] **Step 4: Тесты проходят**

Run: `npx vitest run src/practice/arcade/runner/`
Expected: PASS — `engine.test.js`, `obstacles.test.js`, `deck.test.js` зелёные.

- [ ] **Step 5: Commit**

```bash
git add src/practice/arcade/runner/engine.js src/practice/arcade/runner/engine.test.js
git commit -m "feat(arcade): Word Rush — позы, препятствия, удар и очки в движке

Удар стоит скорости и серии, не жизни. Очки — 10 × скорость × множитель
серии, иначе удар бесплатен, а медленный бег выгоден.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Склейка клипов в один GLB (`scripts/lib/glb.js`)

**Files:**
- Create: `scripts/lib/glb.js`, `scripts/merge-runner-clips.js`
- Test: `scripts/lib/glb.test.js`

**Interfaces:**
- Produces (CommonJS, как соседний `zip.js`): `readGlb(buf) → { json, bin }`, `writeGlb({ json, bin }) → Buffer`, `keepAnimation(glb, index, name) → glb`, `addAnimation(target, source, index, name) → target`. Скрипт: `node scripts/merge-runner-clips.js --base <file>[:N] --clip <name>=<file>[:N] … --out <file>`; экспорт `parseRef(ref) → { file, index }`.

- [ ] **Step 1: Написать падающий тест**

`scripts/lib/glb.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { readGlb, writeGlb, keepAnimation, addAnimation } = require('./glb.js')
const { parseRef } = require('../merge-runner-clips.js')

// Крошечный GLB: узлы-кости и одна анимация вращения последней кости.
function makeGlb(nodes, values, name = 'Armature|clip') {
  const times = [0, 1]
  const bin = Buffer.alloc(4 * (times.length + values.length))
  times.forEach((v, i) => bin.writeFloatLE(v, i * 4))
  values.forEach((v, i) => bin.writeFloatLE(v, (times.length + i) * 4))
  const json = {
    asset: { version: '2.0' },
    nodes: nodes.map((n) => ({ name: n })),
    buffers: [{ byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: times.length * 4 },
      { buffer: 0, byteOffset: times.length * 4, byteLength: values.length * 4 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: times.length, type: 'SCALAR' },
      { bufferView: 1, componentType: 5126, count: values.length / 4, type: 'VEC4' },
    ],
    animations: [
      { name, samplers: [{ input: 0, output: 1 }], channels: [{ sampler: 0, target: { node: nodes.length - 1, path: 'rotation' } }] },
    ],
  }
  return readGlb(writeGlb({ json, bin }))
}

const floatsOf = (glb, accessor) => {
  const acc = glb.json.accessors[accessor]
  const bv = glb.json.bufferViews[acc.bufferView]
  const out = []
  for (let i = 0; i < bv.byteLength / 4; i++) out.push(glb.bin.readFloatLE((bv.byteOffset || 0) + (acc.byteOffset || 0) + i * 4))
  return out
}

describe('glb', () => {
  it('запись и чтение сходятся, длины кратны четырём', () => {
    const glb = makeGlb(['Hips'], [0, 0, 0, 1, 0, 0.5, 0, 1])
    const buf = writeGlb(glb)
    expect(buf.readUInt32LE(0)).toBe(0x46546c67)
    expect(buf.length % 4).toBe(0)
    expect(buf.readUInt32LE(8)).toBe(buf.length)
    const back = readGlb(buf)
    expect(back.json.nodes).toEqual([{ name: 'Hips' }])
    expect(floatsOf(back, 1)).toEqual([0, 0, 0, 1, 0, 0.5, 0, 1])
  })

  it('keepAnimation оставляет одну анимацию под новым именем', () => {
    const glb = makeGlb(['Hips'], [0, 0, 0, 1, 0, 0, 0, 1])
    glb.json.animations.push({ ...glb.json.animations[0], name: 'other' })
    keepAnimation(glb, 1, 'run')
    expect(glb.json.animations.map((a) => a.name)).toEqual(['run'])
  })

  it('addAnimation переносит клип на кости базы по имени', () => {
    const base = keepAnimation(makeGlb(['Root', 'Hips', 'Spine'], [0, 0, 0, 1, 0, 0, 0, 1]), 0, 'run')
    const jump = makeGlb(['Hips', 'Spine'], [0.1, 0.2, 0.3, 0.9, 0.4, 0.5, 0.6, 0.7])
    addAnimation(base, jump, 0, 'jump')
    const added = base.json.animations[1]
    expect(added.name).toBe('jump')
    // Spine — в источнике узел 1, в базе узел 2.
    expect(added.channels[0].target).toEqual({ node: 2, path: 'rotation' })
    expect(floatsOf(base, added.samplers[0].output)).toEqual([0.1, 0.2, 0.3, 0.9, 0.4, 0.5, 0.6, 0.7].map(Math.fround))
    expect(floatsOf(base, added.samplers[0].input)).toEqual([0, 1])
    for (const bv of base.json.bufferViews) expect((bv.byteOffset || 0) % 4).toBe(0)
    expect(base.json.buffers[0].byteLength).toBe(base.bin.length)
    const back = readGlb(writeGlb(base))
    expect(back.json.animations.map((a) => a.name)).toEqual(['run', 'jump'])
  })

  it('кость, которой нет в базе, — ошибка: скелеты разные', () => {
    const base = makeGlb(['Hips'], [0, 0, 0, 1, 0, 0, 0, 1])
    const other = makeGlb(['mixamorig:Hips'], [0, 0, 0, 1, 0, 0, 0, 1])
    expect(() => addAnimation(base, other, 0, 'jump')).toThrow(/скелеты разные/)
  })

  it('нет анимации с таким номером — ошибка', () => {
    const glb = makeGlb(['Hips'], [0, 0, 0, 1, 0, 0, 0, 1])
    expect(() => keepAnimation(glb, 3, 'run')).toThrow(/#3/)
  })
})

describe('parseRef', () => {
  it('номер анимации после двоеточия, путь Windows не ломается', () => {
    expect(parseRef('C:\\tmp\\run.glb')).toEqual({ file: 'C:\\tmp\\run.glb', index: 0 })
    expect(parseRef('C:\\tmp\\run.glb:2')).toEqual({ file: 'C:\\tmp\\run.glb', index: 2 })
    expect(parseRef('jump.glb')).toEqual({ file: 'jump.glb', index: 0 })
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run scripts/lib/glb.test.js`
Expected: FAIL — `Cannot find module './glb.js'`.

- [ ] **Step 3: Реализация `scripts/lib/glb.js`**

```js
// Чтение, запись и склейка анимаций GLB без внешних зависимостей — как
// zip.js рядом. Нужен одному сценарию: собрать бегуна Word Rush из четырёх
// выгрузок Meshy (бег, прыжок, подкат, спотыкание). Каждая — та же модель с
// тем же ригом и своим клипом; сетку и скелет берём из одной, клипы — из всех.
// Тянуть ради этого @gltf-transform/core не стали.

const MAGIC = 0x46546c67 // 'glTF'
const JSON_CHUNK = 0x4e4f534a
const BIN_CHUNK = 0x004e4942

const pad4 = (n) => (n + 3) & ~3

function readGlb(buf) {
  if (buf.readUInt32LE(0) !== MAGIC) throw new Error('glb: это не GLB-файл')
  const total = buf.readUInt32LE(8)
  let json = null
  let bin = Buffer.alloc(0)
  for (let at = 12; at < total; ) {
    const len = buf.readUInt32LE(at)
    const type = buf.readUInt32LE(at + 4)
    const data = buf.subarray(at + 8, at + 8 + len)
    if (type === JSON_CHUNK) json = JSON.parse(data.toString('utf8'))
    else if (type === BIN_CHUNK) bin = Buffer.from(data)
    at += 8 + len
  }
  if (!json) throw new Error('glb: нет JSON-чанка')
  return { json, bin }
}

function writeGlb({ json, bin }) {
  const text = Buffer.from(JSON.stringify(json), 'utf8')
  const jsonLen = pad4(text.length)
  const binLen = pad4(bin.length)
  const total = 12 + 8 + jsonLen + (bin.length ? 8 + binLen : 0)
  const out = Buffer.alloc(total)
  out.writeUInt32LE(MAGIC, 0)
  out.writeUInt32LE(2, 4)
  out.writeUInt32LE(total, 8)
  out.writeUInt32LE(jsonLen, 12)
  out.writeUInt32LE(JSON_CHUNK, 16)
  // Формат требует добивать JSON пробелами, а BIN — нулями (их даёт alloc).
  out.fill(0x20, 20, 20 + jsonLen)
  text.copy(out, 20)
  if (bin.length) {
    const at = 20 + jsonLen
    out.writeUInt32LE(binLen, at)
    out.writeUInt32LE(BIN_CHUNK, at + 4)
    bin.copy(out, at + 8)
  }
  return out
}

function keepAnimation(glb, index, name) {
  const anim = glb.json.animations?.[index]
  if (!anim) throw new Error(`glb: нет анимации #${index}`)
  // Сироты-аксессоры выброшенных клипов уберёт `gltf-transform prune`.
  glb.json.animations = [{ ...anim, name }]
  return glb
}

function addAnimation(target, source, index, name) {
  const anim = source.json.animations?.[index]
  if (!anim) throw new Error(`glb: нет анимации #${index}`)
  const t = target.json
  t.accessors ||= []
  t.bufferViews ||= []
  t.animations ||= []
  const byName = new Map((t.nodes || []).map((n, i) => [n.name, i]))
  let bin = target.bin
  const views = new Map()
  const accessors = new Map()

  const copyView = (vi) => {
    if (views.has(vi)) return views.get(vi)
    const bv = source.json.bufferViews[vi]
    const start = bv.byteOffset || 0
    const offset = pad4(bin.length)
    bin = Buffer.concat([bin, Buffer.alloc(offset - bin.length), source.bin.subarray(start, start + bv.byteLength)])
    const copy = { buffer: 0, byteOffset: offset, byteLength: bv.byteLength }
    if (bv.byteStride) copy.byteStride = bv.byteStride
    t.bufferViews.push(copy)
    views.set(vi, t.bufferViews.length - 1)
    return views.get(vi)
  }
  const copyAccessor = (ai) => {
    if (accessors.has(ai)) return accessors.get(ai)
    const acc = source.json.accessors[ai]
    if (acc.sparse) throw new Error('glb: разреженные аксессоры в анимации не поддержаны')
    t.accessors.push({ ...acc, bufferView: copyView(acc.bufferView) })
    accessors.set(ai, t.accessors.length - 1)
    return accessors.get(ai)
  }

  const samplers = anim.samplers.map((s) => ({ ...s, input: copyAccessor(s.input), output: copyAccessor(s.output) }))
  const channels = anim.channels
    .filter((c) => c.target.node !== undefined)
    .map((c) => {
      const bone = source.json.nodes[c.target.node]?.name
      const node = byName.get(bone)
      // Кости нет — риг другой, и клип дёргал бы не те суставы.
      if (node === undefined) throw new Error(`glb: кости «${bone}» нет в базовой модели — скелеты разные`)
      return { ...c, target: { ...c.target, node } }
    })
  t.animations.push({ name, samplers, channels })
  bin = Buffer.concat([bin, Buffer.alloc(pad4(bin.length) - bin.length)])
  t.buffers[0].byteLength = bin.length
  target.bin = bin
  return target
}

module.exports = { readGlb, writeGlb, keepAnimation, addAnimation }
```

- [ ] **Step 4: Реализация `scripts/merge-runner-clips.js`**

```js
// Склейка бегуна Word Rush: сетка, скелет и бег — из одной выгрузки Meshy,
// клипы прыжка, подката и спотыкания — из выгрузок того же рига (3d_rigging
// одной модели с разными animation_action_id).
//
//   node scripts/merge-runner-clips.js --base run.glb[:N] \
//     --clip jump=jump.glb[:N] --clip slide=slide.glb[:N] --clip stumble=stumble.glb[:N] \
//     --out merged.glb
//
// `:N` — номер анимации в файле (по умолчанию 0): в выгрузке Meshy их бывает
// несколько, нужная видна в `npx -y @gltf-transform/cli inspect`.
const fs = require('fs')
const { readGlb, writeGlb, keepAnimation, addAnimation } = require('./lib/glb.js')

// Номер — только цифры после последнего двоеточия: «C:\…» им не считается.
function parseRef(ref) {
  const m = /^(.*?)(?::(\d+))?$/.exec(ref)
  return { file: m[1], index: m[2] ? Number(m[2]) : 0 }
}

function main(argv) {
  let base = null
  let out = null
  const clips = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') base = parseRef(argv[++i])
    else if (argv[i] === '--out') out = argv[++i]
    else if (argv[i] === '--clip') {
      const [name, ref] = argv[++i].split(/=(.*)/s)
      clips.push({ name, ...parseRef(ref) })
    }
  }
  if (!base || !out || !clips.length) {
    console.error('usage: merge-runner-clips.js --base run.glb[:N] --clip jump=jump.glb[:N] … --out merged.glb')
    process.exit(1)
  }
  const glb = keepAnimation(readGlb(fs.readFileSync(base.file)), base.index, 'run')
  for (const c of clips) addAnimation(glb, readGlb(fs.readFileSync(c.file)), c.index, c.name)
  fs.writeFileSync(out, writeGlb(glb))
  console.log(`${out}: ${glb.json.animations.map((a) => a.name).join(', ')}`)
}

if (require.main === module) main(process.argv.slice(2))

module.exports = { parseRef }
```

- [ ] **Step 5: Тест проходит**

Run: `npx vitest run scripts/lib/glb.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/glb.js scripts/lib/glb.test.js scripts/merge-runner-clips.js
git commit -m "feat(arcade): склейка клипов бегуна в один GLB без зависимостей

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Ассеты — бегун с четырьмя клипами и три препятствия

**Files:**
- Create: `public/arcade/runner/runner-v2.glb`, `public/arcade/runner/barrier.glb`, `public/arcade/runner/boom.glb`, `public/arcade/runner/bus.glb`

**Interfaces:**
- Consumes: `scripts/merge-runner-clips.js` (Task 3).
- Produces: `runner-v2.glb` — один скин, клипы с именами ровно `run`, `jump`, `slide`, `stumble`; три GLB препятствий без анимаций. Сцена (Task 5) грузит их по этим путям.

Работа идёт через Higgsfield MCP (серверный UUID `9477acf8-…`). Сырые файлы — в scratchpad (`$SCRATCH`), в репозиторий — только итог. `runner.glb` в этой задаче НЕ удаляется: на нём ещё держится сцена до Task 5.

- [ ] **Step 1: Загрузить инструменты**

ToolSearch: `select:mcp__9477acf8-9e8f-4dfc-bfed-1407e315d100__generate_3d,mcp__9477acf8-9e8f-4dfc-bfed-1407e315d100__generate_image,mcp__9477acf8-9e8f-4dfc-bfed-1407e315d100__jobs_wait,mcp__9477acf8-9e8f-4dfc-bfed-1407e315d100__job_display,mcp__9477acf8-9e8f-4dfc-bfed-1407e315d100__models_explore`.

- [ ] **Step 2: Проверить цену**

`generate_3d` с `get_cost: true`: `{ model: "3d_rigging", model_url: "https://dev-tutor.justtostudy.kz/arcade/runner/runner.glb", height_meters: 1.7, enable_animation: true, animation_action_id: 13 }`. Цену ×4 и ×3 для `image_to_3d` (Step 7) сообщить пользователю ДО генерации.

- [ ] **Step 3: Четыре рига одной модели**

Источник — опубликованный бегун на дев-стенде (проверено 01.10.2026: `200`, `model/gltf-binary`, 916 404 байт). Четыре вызова `generate_3d`, модель `3d_rigging`, одинаковые `model_url` и `height_meters: 1.7`, `enable_animation: true`, `animation_action_id` — `16`, `13`, `516`, `519`. Дождаться `jobs_wait`, скачать:

```bash
SCRATCH="<scratchpad>/word-rush"
mkdir -p "$SCRATCH"
curl -sSL -o "$SCRATCH/rig-run.glb" "<url результата 16>"
curl -sSL -o "$SCRATCH/rig-jump.glb" "<url результата 13>"
curl -sSL -o "$SCRATCH/rig-slide.glb" "<url результата 516>"
curl -sSL -o "$SCRATCH/rig-stumble.glb" "<url результата 519>"
```

- [ ] **Step 4: Проверить выгрузки**

```bash
for f in run jump slide stumble; do echo "== $f"; npx -y @gltf-transform/cli inspect "$SCRATCH/rig-$f.glb" | grep -A12 -i -E "^ *(ANIMATIONS|TEXTURES|SKINS)"; done
```

Expected: у каждой есть скин, текстура (≥ 1) и анимация с нужным клипом; записать номер нужной анимации в каждом файле (`:N` для Step 5). Если **текстур 0** (Meshy не прочитал `EXT_texture_webp` опубликованного файла): взять вместо `model_url` адрес исходной `image_to_3d`-задачи бегуна 30.09.2026 (`job_display`/история Higgsfield, модель `image_to_3d`), повторить Step 3. Нет в истории — `generate_image` по промпту бегуна из `docs/superpowers/plans/2026-09-30-arcade-word-rush.md` (Task 1, Step 1), затем `image_to_3d` (`should_texture: true`, `target_polycount: 10000`, `topology: "triangle"`), и его выходной URL — в `model_url` Step 3.

- [ ] **Step 5: Склеить и ужать**

```bash
node scripts/merge-runner-clips.js --base "$SCRATCH/rig-run.glb:<N>" \
  --clip jump="$SCRATCH/rig-jump.glb:<N>" --clip slide="$SCRATCH/rig-slide.glb:<N>" \
  --clip stumble="$SCRATCH/rig-stumble.glb:<N>" --out "$SCRATCH/runner-merged.glb"
npx -y @gltf-transform/cli prune "$SCRATCH/runner-merged.glb" "$SCRATCH/runner-pruned.glb"
npx -y @gltf-transform/cli resize "$SCRATCH/runner-pruned.glb" "$SCRATCH/runner-1k.glb" --width 1024 --height 1024
npx -y @gltf-transform/cli webp "$SCRATCH/runner-1k.glb" public/arcade/runner/runner-v2.glb
npx -y @gltf-transform/cli inspect public/arcade/runner/runner-v2.glb | grep -A8 -i "ANIMATIONS"
ls -la public/arcade/runner/runner-v2.glb
```

Expected: склейка печатает `runner-merged.glb: run, jump, slide, stumble`; в inspect четыре анимации с этими именами; файл ≤ 1.5 МБ. Ошибка «скелеты разные» — риги не совпали: повторить Step 3 от одного источника.

- [ ] **Step 6: Посмотреть корневое движение клипов**

```bash
node -e "
const { readGlb } = require('./scripts/lib/glb.js')
const g = readGlb(require('fs').readFileSync(process.argv[1]))
for (const a of g.json.animations) {
  const ch = a.channels.find((c) => c.target.path === 'translation')
  if (!ch) { console.log(a.name, 'без translation'); continue }
  const acc = g.json.accessors[a.samplers[ch.sampler].output]
  const bv = g.json.bufferViews[acc.bufferView]
  const at = (bv.byteOffset || 0) + (acc.byteOffset || 0)
  const v = [...Array(acc.count * 3)].map((_, i) => g.bin.readFloatLE(at + i * 4))
  const axis = (k) => { const xs = v.filter((_, i) => i % 3 === k); return (Math.max(...xs) - Math.min(...xs)).toFixed(3) }
  console.log(a.name, g.json.nodes[ch.target.node].name, 'размах x/y/z:', axis(0), axis(1), axis(2))
}" public/arcade/runner/runner-v2.glb
```

Expected: у `run` размах x/z — сантиметры (бег на месте, как у старого RunFast). У `jump`/`slide`/`stumble` размах z может быть большим — его гасит `lockHorizontal` в сцене (Task 5); размах y у `jump` записать в отчёт: по нему потом подбирается `JUMP_ARC`.

- [ ] **Step 7: Препятствия**

Три `generate_image` (модель `gpt_image_2_5`, `aspect_ratio: "1:1"`), каждый результат проверить глазами (предмет целиком, ровный фон, без текста), иначе ещё вариант:

barrier:
```
Stylized low-poly 3D game asset for a mobile endless-runner: a short road construction barrier,
one horizontal plank with white and orange (#FF631E) diagonal stripes on two small sturdy feet,
knee height, isolated, three-quarter front view, whole object visible, plain light grey studio
background, soft even lighting, clean silhouette, no text, no logos.
```

boom:
```
Stylized low-poly 3D game asset for a mobile endless-runner: an overhead height barrier —
two short grey posts with a horizontal red-and-white striped bar across the top at chest height,
open empty space underneath the bar, isolated, three-quarter front view, whole object visible,
plain light grey studio background, soft even lighting, clean silhouette, no text, no logos.
```

bus:
```
Stylized low-poly 3D game asset for a mobile endless-runner: a city bus with violet (#874BF8)
and white livery and an orange (#FF631E) stripe, rounded friendly shapes, isolated, three-quarter
front view showing the long side, whole vehicle visible, plain light grey studio background,
soft even lighting, clean silhouette, no text, no logos, no people.
```

Затем для каждой картинки `generate_3d`, модель `image_to_3d` (параметры сверить `models_explore get image_to_3d`): медиа — job_id картинки (роль `image`), `should_texture: true`, `target_polycount: 5000`, `topology: "triangle"`, без рига и анимации. `jobs_wait`, скачать и ужать:

```bash
for k in barrier boom bus; do
  curl -sSL -o "$SCRATCH/$k-raw.glb" "<url результата $k>"
  npx -y @gltf-transform/cli resize "$SCRATCH/$k-raw.glb" "$SCRATCH/$k-512.glb" --width 512 --height 512
  npx -y @gltf-transform/cli webp "$SCRATCH/$k-512.glb" "public/arcade/runner/$k.glb"
done
ls -la public/arcade/runner/
```

Expected: каждое препятствие ≤ 0.5 МБ; сумма `runner-v2.glb` + три препятствия ≤ 2.6 МБ (бюджет всего 3D ≤ 3 МБ вместе с `skyline.webp`).

- [ ] **Step 8: Commit**

```bash
git add public/arcade/runner/runner-v2.glb public/arcade/runner/barrier.glb public/arcade/runner/boom.glb public/arcade/runner/bus.glb
git commit -m "feat(arcade): ассеты Word Rush — бегун с клипами прыжка, подката и удара; барьер, шлагбаум, автобус

Клипы Meshy 16/13/516/519 на одном риге, склейка scripts/merge-runner-clips.js;
препятствия — Higgsfield image→3D.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Сцена — препятствия, клипы, мигание (`runnerScene.js`)

**Files:**
- Modify: `src/screens/arcade/runner/runnerScene.js`
- Delete: `public/arcade/runner/runner.glb`

**Interfaces:**
- Consumes: `KINDS` (Task 1); `INVULN`, `JUMP_TIME`, `SLIDE_TIME`, `SPAWN`, `LANES` (Task 2); ассеты Task 4.
- Produces: `loadRunnerAssets() → { runner, skyline, obstacles: { barrier, boom, bus } }`; `render(snap, dt)` дополнительно читает `snap.pose` (`run|jump|slide`), `snap.posePhase` (0–1), `snap.invuln` (с), `snap.obstacles` (`[{ lane, kind, len, z }]` или `null`), `snap.lastHit` (`{ n }` или `null`). API `{ render, resize, reset, dispose }` не меняется.

У сцены нет юнит-тестов (WebGL): проверка — сборка здесь и живой прогон в Task 7.

- [ ] **Step 1: Шапка, импорты, константы**

Заменить абзац шапки:

```js
// Бегун — модель Higgsfield (Meshy image→3D с авто-ригом и клипом бега),
// ворота и город строятся кодом: неоновая трубка светится без постобработки
// и перекрашивается одним color.setHex, а дома — одинаковые боксы с окнами,
// которые переезжают вперёд, когда уходят за камеру.
```

на:

```js
// Бегун — модель Higgsfield (Meshy image→3D с авто-ригом): бег, прыжок,
// подкат и спотыкание — клипы одного рига, склеенные в runner-v2.glb
// (scripts/merge-runner-clips.js). Препятствия — тоже модели, вписанные в
// размер из правил. Ворота и город строятся кодом: неоновая трубка светится
// без постобработки и перекрашивается одним color.setHex, а дома — одинаковые
// боксы с окнами, которые переезжают вперёд, когда уходят за камеру.
```

Заменить импорт движка:

```js
import { LANES, SPAWN } from '../../../practice/arcade/runner/engine.js'
```

на:

```js
import { INVULN, JUMP_TIME, LANES, SLIDE_TIME, SPAWN } from '../../../practice/arcade/runner/engine.js'
import { KINDS } from '../../../practice/arcade/runner/obstacles.js'
```

Заменить строку `const STUMBLE = 0.6` на:

```js
// Подскок на промахе мимо ворот — кодом, как было; удар о препятствие играет
// свой клип (stumble).
const MISS_HOP = 0.6
// Дуга прыжка поверх клипа: Jump_Run подпрыгивает невысоко, а барьер должен
// читаться перепрыгнутым, а не пройденным насквозь. Подбирается живым прогоном.
const JUMP_ARC = 0.7
const FADE = 0.1
// Размер препятствия на сцене — из правил: барьер ниже дуги прыжка, под
// перекладиной шлагбаума проходит подкат, автобус выше всего. Длина вдоль
// дороги — из движка (KINDS), иначе удар случался бы «в воздухе».
const OBSTACLE_SIZE = {
  barrier: { w: LANE_W - 0.5, h: 0.9 },
  boom: { w: LANE_W - 0.2, h: 1.7 },
  bus: { w: LANE_W - 0.3, h: 2.9 },
}
// На дороге разом — подход к текущему ряду и хвост прошлого: до четырёх
// одного вида. Не хватит экземпляра — препятствие стало бы невидимым, а удар
// о невидимое нечестен.
const POOL = 4
const POSES = ['run', 'jump', 'slide', 'stumble']
```

- [ ] **Step 2: Загрузка ассетов**

Заменить `loadRunnerAssets` целиком:

```js
export async function loadRunnerAssets() {
  const loader = new GLTFLoader()
  const [runner, barrier, boom, bus, skyline] = await Promise.all([
    loader.loadAsync(`${BASE}/runner-v2.glb`),
    // Препятствия обязательны, как и бегун: без модели препятствие невидимо,
    // а удар о невидимое нечестен — лучше честно не стартовать.
    loader.loadAsync(`${BASE}/barrier.glb`),
    loader.loadAsync(`${BASE}/boom.glb`),
    loader.loadAsync(`${BASE}/bus.glb`),
    // Панорама — украшение: без неё остаётся небо цветом, игра не ломается.
    new THREE.TextureLoader().loadAsync(`${BASE}/skyline.webp`).catch(() => null),
    // Надписи рисуются шрифтом страницы на canvas — без ожидания первые
    // таблички выходили бы системным шрифтом.
    document.fonts?.load('800 64px Manrope').catch(() => null),
  ])
  return { runner, skyline, obstacles: { barrier, boom, bus } }
}
```

- [ ] **Step 3: Бегун с клипами и вписывание препятствий**

Заменить `function makeRunner(gltf) { … }` целиком (до `export function createRunnerScene`):

```js
// Клипы прыжка, подката и удара у Meshy могут уносить бёдра вперёд и вбок —
// бегун «уезжал» бы с дорожки. Гасим горизонталь, высоту оставляем: в ней сам
// прыжок. Бег не трогаем: RunFast бежит на месте (проверено по ключам).
function lockHorizontal(clip) {
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
  // Клипы названы по позам при склейке. Одноклиповый файл без имён — это бег:
  // так сцена переживёт и модель без клипов поз (правила от них не зависят).
  const clips = Object.fromEntries(gltf.animations.map((c) => [c.name, c]))
  if (!clips.run && gltf.animations[0]) clips.run = gltf.animations[0]
  const mixer = new THREE.AnimationMixer(model)
  const actions = {}
  for (const name of POSES) {
    const clip = clips[name]
    if (!clip) continue
    const action = mixer.clipAction(name === 'run' ? clip : lockHorizontal(clip))
    if (name !== 'run') {
      action.setLoop(THREE.LoopOnce, 1)
      action.clampWhenFinished = true
    }
    actions[name] = action
  }
  actions.run?.play()
  return { hero, mixer, actions }
}

// Модель из image→3D стоит как получилось: разворачиваем длинной стороной
// куда надо (автобус — вдоль дороги, барьер и шлагбаум — поперёк) и вписываем
// в размер из правил, стоящей на земле и по центру своего отрезка дороги.
function fitObstacle(gltf, kind) {
  const model = gltf.scene
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  if ((kind === 'bus') !== size.z > size.x) {
    model.rotation.y = Math.PI / 2
    model.updateMatrixWorld(true)
    box.setFromObject(model)
    box.getSize(size)
  }
  const center = box.getCenter(new THREE.Vector3())
  model.position.set(-center.x, -box.min.y, -center.z)
  const holder = new THREE.Group()
  holder.add(model)
  const { w, h } = OBSTACLE_SIZE[kind]
  holder.scale.set(w / (size.x || 1), h / (size.y || 1), KINDS[kind].len / (size.z || 1))
  return holder
}
```

- [ ] **Step 4: Пул препятствий и бегун с действиями**

После строк

```js
  rowGroup.visible = false
  scene.add(rowGroup)
```

вставить:

```js

  // Препятствия — по пулу экземпляров на вид: меши не создаются посреди
  // забега, клоны делят геометрию и материалы шаблона.
  const pools = {}
  for (const kind of Object.keys(OBSTACLE_SIZE)) {
    const template = fitObstacle(assets.obstacles[kind], kind)
    pools[kind] = Array.from({ length: POOL }, () => {
      const item = template.clone()
      item.visible = false
      scene.add(item)
      return item
    })
  }
```

Заменить `const { hero, mixer } = makeRunner(assets.runner)` на `const { hero, mixer, actions } = makeRunner(assets.runner)`.

- [ ] **Step 5: Состояние сцены, переключение клипов, сброс**

Заменить блок от `  let rowKey = null` до конца функции `reset()` включительно:

```js
  let rowKey = null
  let lastSeq = 0
  let runnerX = laneX(1)
  let hop = 0
  // Клип, который играет бегун, и поза движка в прошлом кадре: клип
  // запускается на смене, а не каждый кадр.
  let shown = 'run'
  let poseKey = 'run'
  let hitKey = 0
  let stumbleLeft = 0

  // Новый клип стартует с начала, старый гаснет за FADE. `seconds` подгоняет
  // длину клипа под позу движка: клип Meshy длится сколько длится, а прыжок в
  // правилах — 0.7 с.
  function play(name, seconds) {
    const to = actions[name]
    if (!to) return
    const from = actions[shown]
    to.reset()
    if (seconds) to.timeScale = to.getClip().duration / seconds
    to.play()
    if (from && from !== to) from.crossFadeTo(to, FADE, false)
    shown = name
  }

  function reset() {
    rowKey = null
    lastSeq = 0
    runnerX = laneX(1)
    hop = 0
    poseKey = 'run'
    hitKey = 0
    stumbleLeft = 0
    if (shown !== 'run') play('run')
    hero.visible = true
    rowGroup.visible = false
    for (const kind in pools) for (const item of pools[kind]) item.visible = false
  }
```

- [ ] **Step 6: Отрисовка кадра**

В `render` заменить блок от `    const last = snap.last` до `    renderer.render(scene, camera)` включительно:

```js
    const last = snap.last
    if (last && last.seq !== lastSeq) {
      lastSeq = last.seq
      paint(gates[last.correct], gates[last.correct].text, TONE.hit)
      if (!last.hit) {
        paint(gates[last.lane], gates[last.lane].text, TONE.miss)
        hop = MISS_HOP
      }
    }

    // Препятствия: экземпляры из пула по видам, лишние спрятаны.
    const used = { barrier: 0, boom: 0, bus: 0 }
    for (const o of snap.obstacles || []) {
      // Дальше точки появления ворот не рисуем: препятствие выезжает из тумана
      // там же, где ряд, а не висит пятном цвета тумана на фоне неба.
      if (o.z > SPAWN) continue
      const item = pools[o.kind]?.[used[o.kind]++]
      if (!item) continue
      item.position.set(laneX(o.lane), 0, -(o.z + o.len / 2))
    }
    for (const kind in pools) {
      pools[kind].forEach((item, i) => {
        item.visible = i < used[kind]
      })
    }

    // Клипы. Удар важнее позы: спотыкание начинается в кадре удара, хотя
    // движок в том же кадре вернул позу в бег.
    if (snap.lastHit && snap.lastHit.n !== hitKey) {
      hitKey = snap.lastHit.n
      stumbleLeft = INVULN
      play('stumble', INVULN)
    }
    const pose = snap.pose || 'run'
    if (pose !== poseKey) {
      poseKey = pose
      if (pose === 'jump') play('jump', JUMP_TIME)
      else if (pose === 'slide') play('slide', SLIDE_TIME)
      else if (stumbleLeft <= 0) play('run')
    }
    if (stumbleLeft > 0 && snap.moving) {
      stumbleLeft -= dt
      if (stumbleLeft <= 0 && poseKey === 'run') play('run')
    }

    const dx = laneX(snap.lane) - runnerX
    runnerX += dx * (1 - Math.exp(-dt * 14))
    hero.position.x = runnerX
    hero.rotation.z = THREE.MathUtils.clamp(dx * 0.12, -0.3, 0.3)
    let hopY = 0
    if (hop > 0) {
      hop = Math.max(0, hop - dt)
      const k = Math.sin((1 - hop / MISS_HOP) * Math.PI)
      hopY = k * 0.35
      hero.rotation.x = k * 0.25
    } else {
      hero.rotation.x = 0
    }
    const arc = poseKey === 'jump' ? Math.sin(Math.PI * Math.min(1, snap.posePhase || 0)) * JUMP_ARC : 0
    hero.position.y = hopY + arc
    // Неуязвимость видна миганием, как в аркадах: сквозь препятствия бегун
    // проходит, и без мигания это выглядело бы багом.
    hero.visible = !(snap.invuln > 0) || Math.floor(snap.invuln * 10) % 2 === 0
    shadow.position.x = runnerX
    shadow.scale.setScalar(1 - Math.min(0.5, arc * 0.6))
    // Темп бега — от скорости забега; клипы поз идут своим темпом из play().
    if (actions.run) actions.run.timeScale = 0.75 + 0.35 * (snap.speedMul || 1)
    mixer.update(snap.moving ? dt : 0)
    camera.position.x = runnerX * 0.35
    renderer.render(scene, camera)
```

В `dispose()` заменить `mixer?.stopAllAction()` на `mixer.stopAllAction()` (миксер теперь есть всегда).

- [ ] **Step 7: Удалить старую модель и проверить сборку**

```bash
git rm public/arcade/runner/runner.glb
grep -rn "runner.glb\|STUMBLE\b" src/ || echo "нет ссылок"
npm run build
```

Expected: `нет ссылок`; сборка без ошибок (экран ещё не шлёт новые поля снимка — сцена их терпит: `snap.obstacles || []`, `snap.pose || 'run'`).

- [ ] **Step 8: Commit**

```bash
git add src/screens/arcade/runner/runnerScene.js
git commit -m "feat(arcade): сцена Word Rush — препятствия из пула, клипы поз, мигание неуязвимости

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Экран — ввод, шапка, итоги, строки, стили

**Files:**
- Modify: `src/screens/arcade/runner/RunnerGame.jsx`
- Modify: `src/screens/arcade/runner/RunnerResults.jsx`
- Modify: `src/arcade.css`
- Modify: `src/i18n.jsx`
- Test: `src/i18n.arcade.test.js`

**Interfaces:**
- Consumes: `jump`, `slide`, `multOf`, `JUMP_TIME`, `SLIDE_TIME` (Task 2), `layoutObstacles` (Task 1), поля снимка сцены (Task 5).
- Produces: поле держит `data-pose`, `data-hits`, `data-obstacles` (`lane:kind` через `|`, ближние первыми) — для e2e (Task 7). Новые ключи `arcade.run.rule.moves`, `arcade.run.rule.hits`, `arcade.run.mult`, `arcade.run.hit`, `arcade.run.results.hits`.

- [ ] **Step 1: Падающий тест словаря**

В `src/i18n.arcade.test.js` заменить строку

```js
    for (const stat of ['score', 'best', 'streak']) expect(ru.has(`arcade.run.results.${stat}`)).toBe(true)
```

на

```js
    for (const stat of ['score', 'best', 'streak', 'hits']) expect(ru.has(`arcade.run.results.${stat}`)).toBe(true)
    for (const key of ['rule.moves', 'rule.hits', 'mult', 'hit']) expect(ru.has(`arcade.run.${key}`)).toBe(true)
```

Run: `npx vitest run src/i18n.arcade.test.js`
Expected: FAIL — `hits` нет в словаре.

- [ ] **Step 2: Строки ru**

В `src/i18n.jsx` (блок `ru`):

| Было | Стало |
|---|---|
| `    'arcade.run.rule.controls': '← → — сменить дорожку',` | `    'arcade.run.rule.moves': 'Барьер — перепрыгнуть, шлагбаум — проехать подкатом, автобус — обежать',`<br>`    'arcade.run.rule.hits': 'Удар сбивает скорость и серию, но не жизнь',`<br>`    'arcade.run.rule.controls': '← → — дорожка, ↑ — прыжок, ↓ — подкат',` |
| `    'arcade.run.overHint': 'Верных ворот: {score}',` | `    'arcade.run.overHint': 'Очков: {score}',` |
| `    'arcade.run.streak': 'Серия ×{n}',` | `    'arcade.run.streak': 'Серия {n}',`<br>`    'arcade.run.mult': 'Множитель очков ×{n}',`<br>`    'arcade.run.hit': 'Удар! Скорость и серия сброшены',` |
| `    'arcade.run.controls': 'Клавиши ← → или A / D · на телефоне — свайп или тап по краю поля',` | `    'arcade.run.controls': 'Клавиши ← → или A / D, прыжок ↑ W пробел, подкат ↓ S · на телефоне — свайпы, тап по краю — дорожка',` |
| `    'arcade.run.results.score': 'Верных ворот',` | `    'arcade.run.results.score': 'Очки',` |
| `    'arcade.run.results.streak': 'Лучшая серия',` | `    'arcade.run.results.streak': 'Лучшая серия',`<br>`    'arcade.run.results.hits': 'Ударов',` |

«Серия ×{n}» меняется на «Серия {n}»: рядом со счётом теперь множитель «×2», и два «×» подряд читались бы одним и тем же.

- [ ] **Step 3: Строки en**

| Было | Стало |
|---|---|
| `    'arcade.run.rule.controls': '← → to switch lanes',` | `    'arcade.run.rule.moves': 'Jump barriers, slide under booms, run around buses',`<br>`    'arcade.run.rule.hits': 'A crash costs speed and streak, not a life',`<br>`    'arcade.run.rule.controls': '← → lanes, ↑ jump, ↓ slide',` |
| `    'arcade.run.overHint': 'Right gates: {score}',` | `    'arcade.run.overHint': 'Points: {score}',` |
| `    'arcade.run.streak': 'Streak ×{n}',` | `    'arcade.run.streak': 'Streak {n}',`<br>`    'arcade.run.mult': 'Points multiplier ×{n}',`<br>`    'arcade.run.hit': 'Crash! Speed and streak reset',` |
| `    'arcade.run.controls': 'Keys ← → or A / D · on a phone, swipe or tap the edge of the field',` | `    'arcade.run.controls': 'Keys ← → or A / D, jump ↑ W Space, slide ↓ S · on a phone, swipe; tap an edge to switch lanes',` |
| `    'arcade.run.results.score': 'Right gates',` | `    'arcade.run.results.score': 'Points',` |
| `    'arcade.run.results.streak': 'Best streak',` | `    'arcade.run.results.streak': 'Best streak',`<br>`    'arcade.run.results.hits': 'Crashes',` |

- [ ] **Step 4: Строки kk**

| Было | Стало |
|---|---|
| `    'arcade.run.rule.controls': '← → — жолды ауыстыру',` | `    'arcade.run.rule.moves': 'Кедергіден секіріңіз, шлагбаумның астынан сырғанаңыз, автобусты айналып өтіңіз',`<br>`    'arcade.run.rule.hits': 'Соқтығыс жылдамдық пен серияны алады, өмірді емес',`<br>`    'arcade.run.rule.controls': '← → — жол, ↑ — секіру, ↓ — сырғанау',` |
| `    'arcade.run.overHint': 'Дұрыс қақпалар: {score}',` | `    'arcade.run.overHint': 'Ұпай: {score}',` |
| `    'arcade.run.streak': 'Қатарынан ×{n}',` | `    'arcade.run.streak': 'Қатарынан {n}',`<br>`    'arcade.run.mult': 'Ұпай көбейткіші ×{n}',`<br>`    'arcade.run.hit': 'Соқтығыс! Жылдамдық пен серия жоғалды',` |
| `    'arcade.run.controls': '← → немесе A / D пернелері · телефонда — сырғытыңыз не алаң шетін түртіңіз',` | `    'arcade.run.controls': '← → немесе A / D пернелері, секіру ↑ W Space, сырғанау ↓ S · телефонда — сырғытыңыз, шетін түртсеңіз — жол',` |
| `    'arcade.run.results.score': 'Дұрыс қақпалар',` | `    'arcade.run.results.score': 'Ұпай',` |
| `    'arcade.run.results.streak': 'Ең ұзын серия',` | `    'arcade.run.results.streak': 'Ең ұзын серия',`<br>`    'arcade.run.results.hits': 'Соқтығыс',` |

Run: `npx vitest run src/i18n.arcade.test.js`
Expected: PASS.

- [ ] **Step 5: `RunnerGame.jsx` — импорты, ключ рекорда, шапка**

Заменить импорт движка:

```js
import {
  JUMP_TIME,
  LIVES,
  RUN_DIFFICULTIES,
  SLIDE_TIME,
  advance,
  createRun,
  isOver,
  jump,
  move,
  multOf,
  needsRow,
  slide,
  spawnRow,
  speedOf,
} from '../../../practice/arcade/runner/engine.js'
import { layoutObstacles } from '../../../practice/arcade/runner/obstacles.js'
```

Заменить `const BEST_KEY = 'jts_arcade_runner_best'` на:

```js
// Очки с 01.10.2026 — от скорости и серии, а не число ворот: старый рекорд
// «в воротах» сравнивать не с чем, поэтому ключ новый (старый не читаем).
const BEST_KEY = 'jts_arcade_runner_best_v2'
```

В `hudOf` после строки `    streak: s?.streak ?? 0,` вставить:

```js
    mult: multOf(s?.streak ?? 0),
    hits: s?.hits ?? 0,
    pose: s?.pose ?? 'run',
    // Препятствия впереди, ближние первыми, — для e2e: тест знает, в какую
    // дорожку шагнуть. Строка меняется только на появлении и проезде, а не
    // каждый кадр, иначе шапка перерисовывалась бы 60 раз в секунду.
    obstacles: s
      ? s.obstacles
          .filter((o) => !o.hit && o.z + o.len > 0)
          .sort((a, b) => a.z - b.z)
          .map((o) => `${o.lane}:${o.kind}`)
          .join('|')
      : '',
    crash: s?.lastHit && s.elapsed - s.lastHit.at < TOAST_SECONDS ? s.lastHit.n : 0,
```

После функции `hudOf` добавить:

```js
// Доля позы 0…1 — сцене, чтобы дуга прыжка шла в такт движку.
function posePhase(s) {
  if (s.pose === 'jump') return 1 - s.poseLeft / JUMP_TIME
  if (s.pose === 'slide') return 1 - s.poseLeft / SLIDE_TIME
  return 0
}
```

- [ ] **Step 6: `RunnerGame.jsx` — кадр**

Заменить строку `        if (needsRow(s)) s = spawnRow(s, g.deck.next())` на:

```js
        if (needsRow(s)) {
          // Раскладка — подхода к СЛЕДУЮЩЕМУ ряду: кладётся за воротами этого.
          const layout = layoutObstacles({
            difficulty: RUN_DIFFICULTIES[g.level].key,
            rowIndex: s.seq + 1,
            speed: speedOf(s),
          })
          s = spawnRow(s, g.deck.next(), layout)
        }
```

В объекте снимка `current.render({ … })` после строки `          moving: st === 'ready' || st === 'starting' || ACTIVE.includes(st),` вставить:

```js
          pose: running ? s.pose : 'run',
          posePhase: running ? posePhase(s) : 0,
          invuln: running ? s.invuln : 0,
          obstacles: running ? s.obstacles : null,
          lastHit: running ? s.lastHit : null,
```

- [ ] **Step 7: `RunnerGame.jsx` — ввод**

Заменить функцию `steer`:

```js
  function act(fn) {
    const g = game.current
    if (g.state && ACTIVE.includes(statusRef.current)) g.state = fn(g.state)
  }

  function steer(dir) {
    act((s) => move(s, dir))
  }

  // Прыжок и подкат — только в забеге: на отсчёте движок стоит, и поза
  // провисела бы до старта.
  function leap(up) {
    if (statusRef.current === 'playing') act(up ? jump : slide)
  }
```

В обработчике `onKey` после строки `      const dir = e.code === 'ArrowLeft' || …` вставить:

```js
      const up = e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space'
      const down = e.code === 'ArrowDown' || e.code === 'KeyS'
```

и заменить `      } else if ((e.code === 'Escape' || e.code === 'KeyP') && (st === 'playing' || st === 'paused')) {` на:

```js
      } else if ((up || down) && ACTIVE.includes(st)) {
        // Пробел без preventDefault заодно нажал бы кнопку в фокусе (пауза)
        // и прокрутил страницу; стрелки вверх/вниз — тоже прокрутка.
        e.preventDefault()
        leap(up)
      } else if ((e.code === 'Escape' || e.code === 'KeyP') && (st === 'playing' || st === 'paused')) {
```

В `onPointerUp` заменить комментарий и тело после вычисления `dy`:

```js
    if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) steer(Math.sign(dx))
    else if (Math.abs(dy) > 30 && Math.abs(dy) > Math.abs(dx)) leap(dy < 0)
    else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
```

(строки `const r = …` и `steer(e.clientX < …)` остаются), а комментарий над функцией — на:

```js
  // Свайп влево/вправо — сдвиг на дорожку, вверх/вниз — прыжок и подкат; тап —
  // к той половине поля, где коснулись. Кнопки оверлеев тоже внутри поля, но
  // их нажатия приходят не во время забега и сюда не доходят.
```

- [ ] **Step 8: `RunnerGame.jsx` — правила, поле, шапка**

В списке правил после `<li>{t('arcade.run.rule.speed')}</li>` вставить:

```jsx
          <li>{t('arcade.run.rule.moves')}</li>
          <li>{t('arcade.run.rule.hits')}</li>
```

У `<div className="ar-run-stage" …>` после `data-score={hud.score}` добавить:

```jsx
          data-pose={hud.pose}
          data-hits={hud.hits}
          data-obstacles={hud.obstacles}
```

Заменить блок счёта:

```jsx
              <div className="ar-run-score">
                <small>{t('arcade.run.score')}</small>
                <b>{hud.score}</b>
                {hud.mult >= 2 && (
                  <span className="ar-run-mult" role="img" aria-label={t('arcade.run.mult', { n: hud.mult })}>
                    ×{hud.mult}
                  </span>
                )}
                {hud.streak >= 3 && <em>{t('arcade.run.streak', { n: hud.streak })}</em>}
              </div>
```

После блока `{hud.toast && ( … )}` вставить:

```jsx
          {hud.crash > 0 && (
            <p key={hud.crash} className="ar-run-toast ar-run-toast--hit" role="status">
              {t('arcade.run.hit')}
            </p>
          )}
```

- [ ] **Step 9: `RunnerResults.jsx` — удары**

Заменить массив `tiles`:

```js
  const tiles = [
    { key: 'score', value: result.score },
    { key: 'best', value: result.best },
    { key: 'streak', value: result.bestStreak },
    { key: 'hits', value: result.hits },
  ]
```

и комментарий над компонентом — на:

```js
// Итоги забега: очки, рекорд этой сложности (localStorage этого браузера),
// лучшая серия, удары о препятствия и список ошибок — ради него игра и
// учебная: слово, его перевод и что выбрал ученик.
```

- [ ] **Step 10: Стили**

В `src/arcade.css`:

1. Заменить

```css
  /* Горизонтальный свайп — сдвиг на дорожку, вертикальный — прокрутка. */
  touch-action: pan-y;
```

на

```css
  /* Все свайпы — игра: влево/вправо — дорожка, вверх/вниз — прыжок и подкат.
     С pan-y вертикальный свайп прокручивал бы страницу вместо прыжка. */
  touch-action: none;
```

2. После строки `.ar-run-score em { … }` вставить:

```css
.ar-run-mult {
  display: inline-block; margin-left: 6px; padding: 2px 8px; border-radius: 999px;
  background: #ffd79a; color: #3a1a86; font-size: 14px; font-weight: 800; vertical-align: 6px;
}
```

3. После правила `.ar-run-toast { … }` (перед `.ar-run-count`) вставить:

```css
/* Удар — ниже подсказки ошибки и другим цветом: оба могут всплыть разом. */
.ar-run-toast--hit { top: 58%; background: #ff8a1e; box-shadow: 0 10px 24px -8px rgba(255, 138, 30, 0.6); }
```

4. Заменить

```css
.ar-run-results__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.ar-stat--score { --st-bg: #edf9f2; --st-ink: #168049; }
```

на

```css
.ar-run-results__grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.ar-stat--score { --st-bg: #edf9f2; --st-ink: #168049; }
.ar-stat--hits { --st-bg: #fff1e6; --st-ink: #b54708; }
```

5. Заменить

```css
  .ar-run-score b { font-size: 28px; }
  .ar-run-results__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
```

на

```css
  .ar-run-score b { font-size: 28px; }
  .ar-run-results__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
```

- [ ] **Step 11: Проверка**

```bash
npx vitest run src/i18n.arcade.test.js src/textCollapse.test.js src/practice/arcade/runner/
npm run lint
npm run build
```

Expected: тесты PASS; lint — без новых ошибок в тронутых файлах (старые 6 ошибок в practice/vocab — pre-existing); сборка без ошибок.

- [ ] **Step 12: Commit**

```bash
git add src/screens/arcade/runner/RunnerGame.jsx src/screens/arcade/runner/RunnerResults.jsx src/arcade.css src/i18n.jsx src/i18n.arcade.test.js
git commit -m "feat(arcade): Word Rush — прыжок и подкат с клавиш и свайпов, множитель, удары в итогах

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: E2E, живой прогон, CLAUDE.md

**Files:**
- Modify: `tests/arcade-runner.spec.js`
- Modify: `CLAUDE.md`
- Modify (не в git): `C:/Users/nural/Desktop/jts-web-app/.claude/launch.json` — конфиг превью worktree

**Interfaces:**
- Consumes: `data-pose`, `data-hits`, `data-obstacles`, `data-score` поля (Task 6).

- [ ] **Step 1: Обновить e2e**

В `tests/arcade-runner.spec.js`: в первом тесте заменить название и ожидание счёта:

```js
test('верные ворота дают очки, неверные — отнимают жизнь и показывают перевод', async ({ page }) => {
```

```js
  await expect(stage(page)).toHaveAttribute('data-score', '10', { timeout: 15000 })
```

После функции `goToLane` добавить:

```js
// Проходит ряд верными воротами и ждёт, пока счёт вырастет.
async function passRow(page) {
  const correct = await nextRow(page)
  const before = await stage(page).getAttribute('data-score')
  await goToLane(page, correct)
  await expect(stage(page)).not.toHaveAttribute('data-score', before, { timeout: 15000 })
}
```

Перед тестом `'зал открывает обе игры и возвращает назад'` вставить:

```js
test('↑ — прыжок, ↓ — подкат, поза сама возвращается в бег', async ({ page }) => {
  test.setTimeout(90_000)
  await openRunner(page)
  await startAt(page, 'Лёгкий')
  await nextRow(page)
  await page.keyboard.press('ArrowUp')
  await expect(stage(page)).toHaveAttribute('data-pose', 'jump')
  await expect(stage(page)).toHaveAttribute('data-pose', 'run', { timeout: 5000 })
  await page.keyboard.press('ArrowDown')
  await expect(stage(page)).toHaveAttribute('data-pose', 'slide')
})

test('после разминки на дороге препятствия; удар стоит серии, а не жизни', async ({ page }) => {
  test.setTimeout(150_000)
  await openRunner(page)
  // Средний: на подход ровно одно препятствие (Лёгкий иногда кладёт ноль).
  await startAt(page, 'Средний')
  for (let i = 0; i < 3; i++) await passRow(page)
  const layout = await stage(page).getAttribute('data-obstacles')
  expect(layout).not.toBe('')
  // Ближнее — первое; в беге его не проходит ни одно препятствие.
  await goToLane(page, Number(layout.split('|')[0].split(':')[0]))
  await expect(stage(page)).toHaveAttribute('data-hits', '1', { timeout: 15000 })
  await expect(stage(page)).toHaveAttribute('data-lives', '3')
})
```

- [ ] **Step 2: Прогнать e2e одним воркером**

```bash
E2E_PORT=3197 npx playwright test tests/arcade-runner.spec.js --workers=1
```

Expected: 5 passed на `desktop` и `mobile`. Если Playwright-Chromium не стоит — обёртка с `channel: 'chrome'` (см. память «E2E через системный Chrome»). Пока идёт e2e, другие сборки и dev-серверы не запускать: SwiftShader грузит процессор.

- [ ] **Step 3: Живой прогон**

В основном дереве в `.claude/launch.json` добавить в `configurations`:

```json
    {
      "name": "web-word-rush-moves",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["--prefix", ".claude/worktrees/word-rush-moves", "run", "dev"],
      "port": 3000,
      "autoPort": true
    }
```

`preview_start { name: "web-word-rush-moves" }`, открыть `/?screen=arcade&game=runner`, Средний, старт. Проверить: после трёх рядов выезжают препятствия; ↑ перепрыгивает барьер, ↓ проходит под шлагбаумом, удар — спотыкание, мигание, тост «Удар!», счёт и жизни не падают, «×2» после пятых подряд. `read_console_messages` — без ошибок. Телефон: `resize_window` 375×812, свайп вверх/вниз — прыжок/подкат, страница не прокручивается, без горизонтальной прокрутки; итоги — плитки 2×2. Вернуть `resize_window { preset: "desktop" }`.

- [ ] **Step 4: Записать анимацию**

Скрытая панель и пауза переходов врут про анимацию — снимать живой записью. Скрипт в scratchpad `record-run.mjs`:

```js
import { chromium } from 'playwright'

const base = process.argv[2] // адрес dev-сервера из preview_start
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: process.argv[3] } })
const page = await ctx.newPage()
await page.goto(`${base}/?screen=arcade&game=runner`)
await page.getByRole('button', { name: /Старт/ }).click({ timeout: 60000 })
await page.waitForSelector('.ar-run-stage[data-options]:not([data-options=""])', { timeout: 60000 })
for (const key of ['ArrowUp', 'ArrowDown', 'ArrowUp']) {
  await page.keyboard.press(key)
  await page.waitForTimeout(1200)
}
await ctx.close()
await browser.close()
```

```bash
node "<scratchpad>/record-run.mjs" http://localhost:<port> "<scratchpad>/video"
```

Посмотреть видео по кадрам (cv2 или ffmpeg в PNG): прыжок, подкат, возврат в бег — без рывков и без «уезда» с дорожки. Бегун прыгает слишком низко или высоко — подобрать `JUMP_ARC` в `runnerScene.js` по размаху y из Task 4 Step 6, повторить запись.

- [ ] **Step 5: CLAUDE.md**

В абзаце про мир Word Rush заменить

```
Бегун — Higgsfield: картинка → Meshy image→3D с авто-ригом и клипом RunFast
(бег на месте), текстура ужата до 1024 WebP (`public/arcade/runner/runner.glb`,
~0.9 МБ); ворота и город — кодом
```

на

```
Бегун — Higgsfield: картинка → Meshy image→3D с авто-ригом; бег (RunFast 16),
прыжок (Jump_Run 13), подкат (slide_light 516) и спотыкание (sliding_stumble
519) — клипы одного рига (`3d_rigging` одной модели), склеенные в
`public/arcade/runner/runner-v2.glb` своим `scripts/merge-runner-clips.js`;
текстура 1024 WebP. Препятствия (`barrier`/`boom`/`bus.glb`) — image→3D,
сцена вписывает их в размер из правил; ворота и город — кодом
```

и заменить `Рекорд — localStorage (\`jts_arcade_runner_best\`),` на `Рекорд — localStorage (\`jts_arcade_runner_best_v2\`: очки с 01.10.2026 в других единицах),`.

После абзаца про плашки вариантов («Слова ряда дублируются плашками…») вставить абзац:

```
Прыжок и подкат — позы движка (`jump`/`slide`, по 0.7 с). Препятствия
(`obstacles.js`: барьер — прыжком, шлагбаум — подкатом, автобус — только
обойти) раскладываются для подхода к ряду N+1 в момент появления ряда N, ЗА
его воротами: положи их вместе с рядом N+1 — ближние возникали бы перед
бегуном, а не выезжали из тумана. Последняя треть пути перед воротами чистая,
на одном расстоянии не больше двух препятствий, первые три подхода пустые.
Удар стоит скорости (×0.75, не ниже стартовой) и серии, но НЕ жизни — жизнь
только за незнание слова (решение владельца 01.10.2026). Поэтому очки —
`10 × скорость × множитель серии` (×2 с пятых подряд, до ×5): считай мы
ворота, удар был бы бесплатным, а медленный бег — выгодным. У поля
`touch-action: none`: вертикальный свайп — прыжок и подкат, а не прокрутка.
```

Строку про атрибуты для теста заменить: `Шапка поля держит \`data-options\`/\`data-correct\`/\`data-lane\` — для теста.` → `Шапка поля держит \`data-options\`/\`data-correct\`/\`data-lane\`/\`data-pose\`/\`data-hits\`/\`data-obstacles\` — для теста.`

- [ ] **Step 6: Полная проверка**

```bash
npm test -- --exclude '.claude/**'
npm run lint
npm run build
```

Expected: vitest — красные только известные pre-existing (`practice-contract:20`, флак `vocab:242`); lint — только 6 старых ошибок в practice/vocab; сборка зелёная.

- [ ] **Step 7: Commit**

```bash
git add tests/arcade-runner.spec.js CLAUDE.md
git commit -m "test(arcade): Word Rush — e2e прыжка и удара; CLAUDE.md про позы, препятствия и очки

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
