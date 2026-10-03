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
// Так же едут и подбираемые предметы (pickups.js): монеты и турбо.

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
// Прыжок дольше подката: 0.7 с не читались прыжком (жалоба владельца
// 01.10.2026), а дольше полёт — и выше дуга на сцене, и прощает ранний толчок.
export const JUMP_TIME = 0.9
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
// Монета — мелочь рядом с воротами (10 × скорость × серия): она развлекает
// между рядами, но не перевешивает знание слова.
export const COIN_POINTS = 2
// Турбо: три секунды в полтора раза быстрее, препятствия не бьют, верные
// ворота в турбо дороже во столько же. Риск честный: ворота подъезжают
// быстрее, и на чтение остаётся меньше.
export const BOOST_TIME = 3
export const BOOST_MUL = 1.5

// Какие позы проходят препятствие. Автобуса здесь нет: его не проходит
// никакая. Шлагбаум с 01.10.2026 перепрыгивается тоже (просьба владельца) —
// сцена ставит его перекладину ниже дуги прыжка.
const CLEARS = { barrier: ['jump'], boom: ['jump', 'slide'] }
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
    pickups: [],
    pickupSeq: 0,
    coins: 0,
    boost: 0,
    boosts: 0,
  }
}

export const isOver = (s) => s.lives <= 0
const boostOf = (s) => (s.boost > 0 ? BOOST_MUL : 1)
export const speedOf = (s) => s.baseSpeed * s.speedMul * boostOf(s)
export const needsRow = (s) => !isOver(s) && !s.row && s.gap <= 0

// `n` — номер ряда в забеге: по нему сцена понимает, что ворота новые.
// `layout` — раскладка подхода к СЛЕДУЮЩЕМУ ряду (obstacles.js); её `d`
// отсчитан от этих ворот назад, поэтому препятствия выезжают из тумана вслед
// за воротами, а не возникают перед бегуном. `pickups` (pickups.js) —
// предметы того же подхода, отсчёт тот же.
export function spawnRow(s, row, layout = [], pickups = []) {
  const added = layout.map((o, i) => ({
    id: s.obstacleSeq + i,
    lane: o.lane,
    kind: o.kind,
    len: o.len,
    z: SPAWN + o.d,
    hit: false,
  }))
  const items = pickups.map((p, i) => ({
    id: s.pickupSeq + i,
    lane: p.lane,
    kind: p.kind,
    high: !!p.high,
    z: SPAWN + p.d,
    taken: false,
  }))
  return {
    ...s,
    row: { ...row, z: SPAWN, n: s.seq },
    obstacles: added.length ? [...s.obstacles, ...added] : s.obstacles,
    obstacleSeq: s.obstacleSeq + added.length,
    pickups: items.length ? [...s.pickups, ...items] : s.pickups,
    pickupSeq: s.pickupSeq + items.length,
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
  const next = tick(runPickups(runObstacles({ ...s, elapsed: s.elapsed + dt }, dist), dist), dt)
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
    boost: Math.max(0, s.boost - dt),
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
    const blocked = touches && !CLEARS[o.kind]?.includes(next.pose)
    if (blocked && next.boost > 0) {
      // Турбо сносит препятствие: удара нет, а сцена отбрасывает модель.
      moved.push({ ...o, z, hit: true, smashed: true })
    } else if (blocked && next.invuln <= 0) {
      next = crash(next, o)
      moved.push({ ...o, z, hit: true })
    } else {
      moved.push({ ...o, z })
    }
  }
  return { ...next, obstacles: moved }
}

// Предмет берётся в кадре, где проехал бегуна, на его дорожке. Монета над
// барьером (`high`) — только в прыжке: дугу монет над препятствием надо
// перепрыгнуть, а не пробежать сквозь. Взятый остаётся в списке с `taken` —
// сцена прячет его, а не теряет посреди анимации.
function runPickups(s, dist) {
  if (!s.pickups.length) return s
  let next = s
  const moved = []
  for (const p of s.pickups) {
    const z = p.z - dist
    if (z < BEHIND) continue
    const reach = !p.taken && p.lane === next.lane && p.z >= 0 && z <= 0 && (!p.high || next.pose === 'jump')
    if (reach) {
      next = take(next, p)
      moved.push({ ...p, z, taken: true })
    } else {
      moved.push({ ...p, z })
    }
  }
  return { ...next, pickups: moved }
}

function take(s, p) {
  if (p.kind === 'boost') return { ...s, boost: BOOST_TIME, boosts: s.boosts + 1 }
  return { ...s, coins: s.coins + 1, score: s.score + COIN_POINTS }
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
  const points = hit ? Math.round(POINTS * s.speedMul * boostOf(s) * multOf(streak)) : 0
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
