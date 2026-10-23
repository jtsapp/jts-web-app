import { describe, expect, it } from 'vitest'
import { applyResult, topicProgress, visibleCells } from './bank.js'

const bank = {
  answered: 1, correct: 0, total: 3,
  topics: [{ skillId: 'm.alg.linear', total: 3, answered: 1, correct: 0, cells: [['q1', 1, 0], ['q2', 3, null], ['q3', 3, 1]] }],
}

/** «Все вопросы» (ТЗ SAT 21.10, задача 8). */
describe('банк SAT', () => {
  it('прогресс темы — «решено из всего · % верных от решённых»', () => {
    expect(topicProgress({ answered: 124, total: 595, correct: 88 })).toEqual({ answered: 124, total: 595, pct: 71 })
    expect(topicProgress({ answered: 0, total: 10, correct: 0 }).pct).toBe(0)
  })

  it('фильтры скрывают клетки, номер в банке остаётся', () => {
    expect(visibleCells(bank.topics[0], { difficulty: [3], status: [] }).map(([c, n]) => [c[0], n])).toEqual([['q2', 2], ['q3', 3]])
    expect(visibleCells(bank.topics[0], { difficulty: [], status: ['wrong'] }).map(([c]) => c[0])).toEqual(['q1'])
  })

  it('ответ сразу перекрашивает клетку и пересчитывает счётчики', () => {
    let b = applyResult(bank, 'q2', true)
    expect(b.topics[0].cells[1]).toEqual(['q2', 3, 1])
    expect(b.topics[0].answered).toBe(2)
    expect(b.correct).toBe(1)
    b = applyResult(b, 'q1', true)
    expect(b.topics[0].answered).toBe(2)
    expect(b.topics[0].correct).toBe(2)
  })
})
