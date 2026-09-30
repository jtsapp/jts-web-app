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
