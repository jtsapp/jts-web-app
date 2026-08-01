import { test, expect } from '@playwright/test'
import { SKILLS, emptyStats, skillBars, addDelta, mergeDeltas } from '../src/practice/skillStatsCore.js'

test.describe('skillBars — формула полосок', () => {
  test('нет данных → 2 полоски', () => {
    expect(skillBars({ done: 0, firstTry: 0 })).toBe(2)
  })
  test('малый объём при 100% не даёт максимума', () => {
    expect(skillBars({ done: 3, firstTry: 3 })).toBe(3)
  })
  test('25 заданий на 100% → 10 полосок', () => {
    expect(skillBars({ done: 25, firstTry: 25 })).toBe(10)
  })
  test('25 заданий на 60% → 7 полосок', () => {
    expect(skillBars({ done: 25, firstTry: 15 })).toBe(7)
  })
  test('никогда не ниже 2 и не выше 10', () => {
    expect(skillBars({ done: 100, firstTry: 0 })).toBe(2)
    expect(skillBars({ done: 1000, firstTry: 1000 })).toBe(10)
  })
  test('firstTry > done не ломает (accuracy зажата в 1)', () => {
    expect(skillBars({ done: 25, firstTry: 40 })).toBe(10)
  })
})

test.describe('emptyStats / addDelta / mergeDeltas', () => {
  test('emptyStats — все навыки в нулях', () => {
    const e = emptyStats()
    expect(Object.keys(e).sort()).toEqual([...SKILLS].sort())
    for (const s of SKILLS) expect(e[s]).toEqual({ done: 0, firstTry: 0 })
  })
  test('addDelta прибавляет и не мутирует исходный', () => {
    const a = emptyStats()
    const b = addDelta(a, 'grammar', true)
    expect(a.grammar).toEqual({ done: 0, firstTry: 0 })
    expect(b.grammar).toEqual({ done: 1, firstTry: 1 })
    const c = addDelta(b, 'grammar', false)
    expect(c.grammar).toEqual({ done: 2, firstTry: 1 })
  })
  test('addDelta с неизвестным навыком — возвращает исходный без изменений', () => {
    const a = emptyStats()
    expect(addDelta(a, 'nope', true)).toBe(a)
  })
  test('mergeDeltas суммирует по навыкам', () => {
    const a = { grammar: { done: 2, firstTry: 1 } }
    const b = { grammar: { done: 3, firstTry: 2 }, vocab: { done: 1, firstTry: 1 } }
    const m = mergeDeltas(a, b)
    expect(m.grammar).toEqual({ done: 5, firstTry: 3 })
    expect(m.vocab).toEqual({ done: 1, firstTry: 1 })
  })
})
