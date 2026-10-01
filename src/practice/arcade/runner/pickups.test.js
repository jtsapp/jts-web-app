import { describe, expect, it } from 'vitest'
import { LANES, RUN_DIFFICULTIES, SPAWN, SPEED_CAP } from './engine.js'
import { CLEAR_FROM, WARMUP_ROWS, layoutObstacles } from './obstacles.js'
import { COIN_GAP, TRAIL, layoutPickups } from './pickups.js'

function seeded(seed) {
  let a = seed
  return () => (a = (a * 16807) % 2147483647) / 2147483647
}

// Препятствия и предметы одного подхода — как их кладёт RunnerGame.
function* approaches(n = 200) {
  for (const d of RUN_DIFFICULTIES) {
    for (const speed of [1, 1.3, SPEED_CAP].map((m) => (SPAWN / d.lead) * m)) {
      for (let seed = 1; seed <= n; seed++) {
        const rng = seeded(seed * 7919)
        const obstacles = layoutObstacles({ difficulty: d.key, rowIndex: WARMUP_ROWS, speed, rng })
        yield { d, speed, obstacles, pickups: layoutPickups({ difficulty: d.key, speed, obstacles, rng }) }
      }
    }
  }
}

describe('layoutPickups', () => {
  it('предметы — после ворот и до чистой трети, на дорожках', () => {
    for (const { speed, pickups } of approaches()) {
      for (const p of pickups) {
        expect(p.d).toBeGreaterThanOrEqual(0.5 * speed - 1e-9)
        expect(p.d).toBeLessThanOrEqual(CLEAR_FROM + 1e-9)
        expect(p.lane).toBeGreaterThanOrEqual(0)
        expect(p.lane).toBeLessThan(LANES)
      }
    }
  })

  it('монеты — цепочками по дорожке с шагом COIN_GAP, не внутри автобуса', () => {
    let coins = 0
    for (const { obstacles, pickups } of approaches()) {
      const byLane = new Map()
      for (const p of pickups.filter((x) => x.kind === 'coin')) byLane.set(p.lane, [...(byLane.get(p.lane) || []), p])
      for (const [lane, list] of byLane) {
        expect(list.length).toBeLessThanOrEqual(TRAIL)
        for (let i = 1; i < list.length; i++) {
          const steps = (list[i].d - list[0].d) / COIN_GAP
          expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-6)
        }
        for (const c of list) {
          const inBus = obstacles.some((o) => o.kind === 'bus' && o.lane === lane && c.d >= o.d - 1.2 && c.d <= o.d + o.len + 1.2)
          expect(inBus).toBe(false)
        }
      }
      coins += pickups.filter((x) => x.kind === 'coin').length
    }
    expect(coins).toBeGreaterThan(0)
  })

  it('монета высоко — ровно там, где на её дорожке барьер или шлагбаум', () => {
    let high = 0
    for (const { obstacles, pickups } of approaches()) {
      for (const c of pickups.filter((x) => x.kind === 'coin')) {
        const over = obstacles.some((o) => o.lane === c.lane && c.d >= o.d - 1.2 && c.d <= o.d + o.len + 1.2)
        expect(c.high).toBe(over)
        if (c.high) high++
      }
    }
    expect(high).toBeGreaterThan(0)
  })

  it('турбо — не больше одного на подход, не вплотную к препятствию, не на каждом подходе', () => {
    let with1 = 0
    let total = 0
    for (const { obstacles, pickups } of approaches()) {
      const boosts = pickups.filter((x) => x.kind === 'boost')
      expect(boosts.length).toBeLessThanOrEqual(1)
      for (const b of boosts) {
        expect(b.high).toBe(false)
        expect(obstacles.some((o) => o.lane === b.lane && b.d >= o.d - 3 && b.d <= o.d + o.len + 3)).toBe(false)
      }
      total++
      if (boosts.length) with1++
    }
    expect(with1).toBeGreaterThan(total * 0.15)
    expect(with1).toBeLessThan(total * 0.5)
  })

  it('неизвестная сложность — пусто', () => {
    expect(layoutPickups({ difficulty: 'nope', speed: 10, rng: seeded(1) })).toEqual([])
  })
})
