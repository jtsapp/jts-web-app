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
  it('подходы до WARMUP_ROWS пустые — разминка', () => {
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

  // Заход — препятствия на одном расстоянии.
  const slotsOf = (layout) => {
    const byD = new Map()
    for (const o of layout) byD.set(o.d, [...(byD.get(o.d) || []), o])
    return [...byD.entries()].sort((a, b) => a[0] - b[0])
  }

  it('заход — одна, две или три дорожки, все разные; стена — только из проходимых прыжком', () => {
    for (const { layout } of layouts()) {
      for (const [, group] of slotsOf(layout)) {
        expect(group.length).toBeLessThanOrEqual(3)
        expect(new Set(group.map((o) => o.lane)).size).toBe(group.length)
        if (group.length === 3) for (const o of group) expect(['barrier', 'boom']).toContain(o.kind)
      }
    }
  })

  it('между заходами — зазор на приземление', () => {
    for (const { speed, layout } of layouts()) {
      const slots = slotsOf(layout)
      for (let i = 1; i < slots.length; i++) {
        const [d0, g0] = slots[i - 1]
        const end = d0 + Math.max(...g0.map((o) => o.len))
        expect(slots[i][0] - end).toBeGreaterThanOrEqual(Math.max(0.6 * speed, 6) - 1e-9)
      }
    }
  })

  // До 01.10.2026 было по одному препятствию на подход (hard изредка два),
  // easy — через раз ни одного. У потолка скорости окно раскладки короче, и
  // заходов там меньше — поэтому считаем на стартовой скорости.
  it('плотность по сложностям на старте: заходов больше прежнего', () => {
    const slots = {}
    for (const d of RUN_DIFFICULTIES) {
      for (let seed = 1; seed <= 300; seed++) {
        const layout = layoutObstacles({ difficulty: d.key, rowIndex: WARMUP_ROWS, speed: SPAWN / d.lead, rng: seeded(seed * 7919) })
        ;(slots[d.key] ||= []).push(slotsOf(layout).length)
      }
    }
    const mean = (list) => list.reduce((a, b) => a + b, 0) / list.length
    expect(new Set(slots.easy)).toEqual(new Set([1, 2]))
    expect(Math.min(...slots.medium)).toBeGreaterThanOrEqual(1)
    expect(mean(slots.medium)).toBeGreaterThan(2)
    expect(mean(slots.hard)).toBeGreaterThan(2)
    expect(Math.max(...slots.medium)).toBe(3)
    expect(Math.max(...slots.veryHard)).toBe(2)
  })

  it('стены во все три дорожки встречаются на каждой сложности, но не в каждом подходе', () => {
    for (const d of RUN_DIFFICULTIES) {
      let walls = 0
      let total = 0
      for (let seed = 1; seed <= 300; seed++) {
        const layout = layoutObstacles({ difficulty: d.key, rowIndex: WARMUP_ROWS, speed: SPAWN / d.lead, rng: seeded(seed * 7919) })
        total++
        if (slotsOf(layout).some(([, g]) => g.length === 3)) walls++
      }
      expect(walls).toBeGreaterThan(0)
      expect(walls).toBeLessThan(total * 0.75)
    }
  })

  it('easy — без автобусов; hard иногда ставит пару на одном расстоянии', () => {
    let pairs = 0
    for (const { d, layout } of layouts()) {
      if (d.key === 'easy') expect(layout.some((o) => o.kind === 'bus')).toBe(false)
      if (d.key === 'hard' && slotsOf(layout).some(([, g]) => g.length === 2)) pairs++
    }
    expect(pairs).toBeGreaterThan(0)
  })

  it('veryHard у потолка скорости — один заход без автобуса, но не пустой', () => {
    const d = RUN_DIFFICULTIES.find((x) => x.key === 'veryHard')
    const speed = (SPAWN / d.lead) * SPEED_CAP
    for (let seed = 1; seed <= 300; seed++) {
      const layout = layoutObstacles({ difficulty: 'veryHard', rowIndex: WARMUP_ROWS, speed, rng: seeded(seed * 7919) })
      expect(slotsOf(layout)).toHaveLength(1)
      for (const o of layout) expect(o.kind).not.toBe('bus')
    }
  })

  it('неизвестная сложность — пусто', () => {
    expect(layoutObstacles({ difficulty: 'nope', rowIndex: 9, speed: 10, rng: seeded(1) })).toEqual([])
  })
})
