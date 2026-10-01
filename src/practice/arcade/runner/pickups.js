// «Word Rush» — монеты и турбо на подходе к воротам. Чистый модуль, как
// obstacles.js: тот же отсчёт `d` от ворот текущего ряда, та же случайность
// снаружи, и раскладка строится поверх уже готовых препятствий — предметы
// обходят автобус, а над барьером и шлагбаумом встают дугой.
//
// Зачем (жалоба владельца 01.10.2026): между рядами бегун просто бежал —
// «медленно и скучно». Монеты дают, за чем рулить между воротами, турбо —
// рывок скорости.

import { LANES } from './engine.js'
import { CLEAR_FROM } from './obstacles.js'

// Цепочка монет: столько штук через столько единиц — около секунды бега.
export const TRAIL = 5
export const COIN_GAP = 2.5
// Монета ближе этого к препятствию своей дорожки считается «над ним».
const NEAR = 1.2
// Турбо не кладём вплотную к препятствию: подбор не должен требовать
// прыжка, иначе его легко пропустить, не поняв почему.
const BOOST_CLEAR = 3

// `trails` — сколько цепочек на подходе, `boost` — вероятность турбо.
const PLAN = {
  easy: { trails: [1, 2], boost: 0.35 },
  medium: { trails: [1, 2], boost: 0.35 },
  hard: { trails: [1, 2], boost: 0.3 },
  veryHard: { trails: [1], boost: 0.25 },
}

const pick = (list, rng) => list[Math.floor(rng() * list.length)]

// Предметы — от полусекунды после ворот до чистой трети: перед воротами
// бегун перестраивается на ответ, и монета там сманивала бы на чужую дорожку.
export function layoutPickups({ difficulty, speed, obstacles = [], rng = Math.random }) {
  const plan = PLAN[difficulty]
  if (!plan) return []
  const from = 0.5 * speed
  const span = (TRAIL - 1) * COIN_GAP
  const near = (lane, d, pad) => obstacles.find((o) => o.lane === lane && d >= o.d - pad && d <= o.d + o.len + pad)
  const out = []
  const lanes = [0, 1, 2]
  for (let n = pick(plan.trails, rng); n > 0 && lanes.length; n--) {
    if (CLEAR_FROM - span < from) break
    // Цепочки — на разных дорожках: две на одной сливались бы в одну.
    const lane = lanes.splice(Math.floor(rng() * lanes.length), 1)[0]
    const d0 = from + rng() * (CLEAR_FROM - span - from)
    for (let i = 0; i < TRAIL; i++) {
      const d = d0 + i * COIN_GAP
      const o = near(lane, d, NEAR)
      // Внутри автобуса монете не место, над барьером — дугой, в прыжке.
      if (o?.kind === 'bus') continue
      out.push({ kind: 'coin', lane, d, high: !!o })
    }
  }
  if (rng() < plan.boost) {
    for (let tries = 0; tries < 6; tries++) {
      const lane = Math.floor(rng() * LANES)
      const d = from + rng() * (CLEAR_FROM - from)
      const busy = near(lane, d, BOOST_CLEAR) || out.some((p) => p.lane === lane && Math.abs(p.d - d) < COIN_GAP)
      if (busy) continue
      out.push({ kind: 'boost', lane, d, high: false })
      break
    }
  }
  return out
}
