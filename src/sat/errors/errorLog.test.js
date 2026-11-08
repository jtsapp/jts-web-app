import { describe, expect, it } from 'vitest'
import { EMPTY, activeFilters, barsOf, counters, filterItems, insightTone, reasonBars, reasonOf, skillsIn } from './errorLog.js'

const items = [
  { id: 1, section: 'math', skillId: 'm.alg.linear', difficulty: 3, reason: 'time', kind: 'wrong', source: 'practice', reviewed: false, createdAt: '2026-11-10T10:00' },
  { id: 2, section: 'math', skillId: 'm.alg.linear', difficulty: 1, reason: null, kind: 'wrong', source: 'simulation', reviewed: true, createdAt: '2026-11-12T10:00' },
  { id: 3, section: 'rw', skillId: 'rw.cs.words-in-context', difficulty: 2, reason: null, kind: 'unanswered', source: 'paper', reviewed: false, createdAt: '2026-11-15T10:00' },
]

describe('журнал ошибок SAT', () => {
  it('фильтры: секция, сложность, источник, статус, даты', () => {
    expect(filterItems(items, { ...EMPTY, section: 'math' }).map((i) => i.id)).toEqual([1, 2])
    expect(filterItems(items, { ...EMPTY, difficulty: [3] }).map((i) => i.id)).toEqual([1])
    expect(filterItems(items, { ...EMPTY, source: 'paper' }).map((i) => i.id)).toEqual([3])
    expect(filterItems(items, { ...EMPTY, status: 'open' }).map((i) => i.id)).toEqual([1, 3])
    expect(filterItems(items, { ...EMPTY, from: '2026-11-11', to: '2026-11-14' }).map((i) => i.id)).toEqual([2])
  })

  it('«Не ответил» — пункт фильтра «Причина», без причины — свой пункт (17:9002)', () => {
    expect(reasonOf(items[0])).toBe('time')
    expect(reasonOf(items[1])).toBe('none')
    expect(reasonOf(items[2])).toBe('unanswered')
    expect(filterItems(items, { ...EMPTY, reason: 'none' }).map((i) => i.id)).toEqual([2])
    expect(filterItems(items, { ...EMPTY, reason: 'unanswered' }).map((i) => i.id)).toEqual([3])
  })

  it('«Сбросить» считает только изменённые фильтры', () => {
    expect(activeFilters(EMPTY)).toBe(0)
    expect(activeFilters({ ...EMPTY, difficulty: [1], from: '2026-11-01' })).toBe(2)
    expect(skillsIn(items)).toEqual(['m.alg.linear', 'rw.cs.words-in-context'])
  })

  it('счётчики — по всему журналу: разобрано и доля', () => {
    expect(counters(items)).toEqual({ total: 3, reviewed: 1, open: 2, pct: 33 })
    expect(counters([])).toEqual({ total: 0, reviewed: 0, open: 0, pct: 0 })
  })

  it('причины: от частой к редкой, % — от всех ошибок, полоса — от самой частой, «без причины» — сноской', () => {
    const { rows, none } = reasonBars({ careless: 9, time: 16, knowledge: 8, none: 7 }, 47)
    expect(rows).toEqual([
      { reason: 'time', n: 16, pct: 34, width: 100 },
      { reason: 'careless', n: 9, pct: 19, width: 56 },
      { reason: 'knowledge', n: 8, pct: 17, width: 50 },
    ])
    expect(none).toBe(7)
    expect(reasonBars({}, 0)).toEqual({ rows: [], none: 0 })
  })

  it('полосы правой колонки — от наибольшего', () => {
    expect(barsOf([['rw', 26], ['math', 13]])).toEqual([{ key: 'rw', n: 26, width: 100 }, { key: 'math', n: 13, width: 50 }])
    expect(barsOf([])).toEqual([])
  })

  it('вывод берёт цвет своей причины', () => {
    expect(insightTone('time')).toBe('time')
    expect(insightTone('knowledgeSkill')).toBe('knowledge')
    expect(insightTone('trend')).toBe('trend')
    expect(insightTone('unanswered')).toBe('unanswered')
    expect(insightTone('что-то новое')).toBe('unanswered')
  })
})
