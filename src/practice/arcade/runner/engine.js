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
