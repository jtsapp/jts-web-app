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
