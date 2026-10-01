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
// Первый подход пустой: освоиться со словами, потом уворачиваться. Было три —
// начало забега выходило пустой пробежкой (жалоба владельца 01.10.2026).
export const WARMUP_ROWS = 2
// Последняя треть пути перед воротами чистая: там перестраиваются на ответ.
export const CLEAR_FROM = (SPAWN * 2) / 3
// Секунда после ворот — заметить препятствие, на какой бы дорожке ни вышел.
export const REACT = 1
// Между препятствиями по длине — время приземлиться и сделать новое движение.
const SPACING = 0.6
const MIN_SPACING = 6

const ALL = ['barrier', 'boom', 'bus']
// Стена на всю ширину — только из проходимых: барьер и шлагбаум берутся
// прыжком, автобус — ничем, и стена с ним была бы неизбежным ударом.
const PASSABLE = ['barrier', 'boom']
// `counts` — сколько заходов на подходе; заход — одно препятствие, пара на
// соседних дорожках (`pair`) или стена во все три (`wall`). easy — без
// автобуса: его не перепрыгнуть и не проехать, только обежать, а на A1
// внимание нужно словам. veryHard — реже: на ряд всего 2.5 с.
const PLAN = {
  easy: { counts: [1, 2], kinds: PASSABLE, pair: 0.2, wall: 0.15 },
  medium: { counts: [2, 3], kinds: ALL, pair: 0.3, wall: 0.25 },
  hard: { counts: [2, 3], kinds: ALL, pair: 0.4, wall: 0.3 },
  veryHard: { counts: [1, 2], kinds: ALL, pair: 0.25, wall: 0.25 },
}

const pick = (list, rng) => list[Math.floor(rng() * list.length)]

export function layoutObstacles({ difficulty, rowIndex, speed, rng = Math.random }) {
  const plan = PLAN[difficulty]
  if (!plan || rowIndex < WARMUP_ROWS) return []
  const count = pick(plan.counts, rng)
  const gap = Math.max(SPACING * speed, MIN_SPACING)
  // Вид влезает, если стоит целиком до чистой трети. Не влезает — не ставим:
  // у потолка скорости veryHard вмещает барьер или шлагбаум, но не автобус.
  const fitting = (at, kinds = plan.kinds) => kinds.filter((k) => at + KINDS[k].len <= CLEAR_FROM)
  const out = []
  let from = REACT * speed
  for (let left = count; left > 0; left--) {
    const kinds = fitting(from)
    if (!kinds.length) break
    const roll = rng()
    const wall = roll < plan.wall && fitting(from, PASSABLE).length > 0
    const kind = wall ? pick(fitting(from, PASSABLE), rng) : pick(kinds, rng)
    const len = KINDS[kind].len
    // Место под оставшиеся заходы держим заранее: случайный первый, упавший
    // к концу отрезка, съедал бы место у остальных, и подход выходил реже
    // обещанного.
    const room = CLEAR_FROM - from - len - (left - 1) * (gap + KINDS.boom.len)
    const d = from + rng() * Math.max(0, room)
    const lane = Math.floor(rng() * LANES)
    let lanes = [lane]
    if (wall) lanes = [0, 1, 2]
    else if (roll < plan.wall + plan.pair) lanes = [lane, pick([0, 1, 2].filter((l) => l !== lane), rng)]
    let end = d
    for (const l of lanes) {
      // Первое препятствие захода — уже выбранного вида; остальные из тех,
      // что влезают на это расстояние (у стены — только проходимые). Пара
      // занимает две дорожки из трёх: третья пустая, неизбежного удара нет.
      const k = l === lane ? kind : pick(fitting(d, wall ? PASSABLE : plan.kinds), rng)
      out.push({ lane: l, kind: k, len: KINDS[k].len, d })
      end = Math.max(end, d + KINDS[k].len)
    }
    from = end + gap
  }
  return out
}
