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
