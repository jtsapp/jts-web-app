import { describe, expect, it } from 'vitest'
import { EMPTY, filterItems, reasonOf, reasonShares, skillsIn } from './errorLog.js'

const items = [
  { id: 1, section: 'math', skillId: 'm.alg.linear', difficulty: 3, reason: 'time', kind: 'wrong', source: 'practice', reviewed: false, createdAt: '2026-11-10T10:00' },
  { id: 2, section: 'math', skillId: 'm.alg.linear', difficulty: 1, reason: null, kind: 'wrong', source: 'simulation', reviewed: true, createdAt: '2026-11-12T10:00' },
  { id: 3, section: 'rw', skillId: 'rw.cs.words-in-context', difficulty: 2, reason: null, kind: 'unanswered', source: 'paper', reviewed: false, createdAt: '2026-11-15T10:00' },
]

describe('журнал ошибок SAT', () => {
  it('фильтры: секция, сложность, источник, статус, вид, даты', () => {
    expect(filterItems(items, { ...EMPTY, section: 'math' }).map((i) => i.id)).toEqual([1, 2])
    expect(filterItems(items, { ...EMPTY, difficulty: [3] }).map((i) => i.id)).toEqual([1])
    expect(filterItems(items, { ...EMPTY, source: 'paper' }).map((i) => i.id)).toEqual([3])
    expect(filterItems(items, { ...EMPTY, status: 'open' }).map((i) => i.id)).toEqual([1, 3])
    expect(filterItems(items, { ...EMPTY, kind: 'unanswered' }).map((i) => i.id)).toEqual([3])
    expect(filterItems(items, { ...EMPTY, from: '2026-11-11', to: '2026-11-14' }).map((i) => i.id)).toEqual([2])
  })

  it('причина: без причины — отдельная группа «не указана», у неотвеченного причины нет', () => {
    expect(reasonOf(items[1])).toBe('none')
    expect(reasonOf(items[2])).toBeNull()
    expect(filterItems(items, { ...EMPTY, reason: 'none' }).map((i) => i.id)).toEqual([2])
  })

  it('доли причин считаются вместе с «не указана»', () => {
    expect(reasonShares({ time: 1, none: 1 })).toEqual([
      { reason: 'time', n: 1, pct: 50 },
      { reason: 'none', n: 1, pct: 50 },
    ])
    expect(skillsIn(items)).toEqual(['m.alg.linear', 'rw.cs.words-in-context'])
  })
})
