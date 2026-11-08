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

describe('прогресс домена в дереве «Практики»', async () => {
  const { skillsProgress } = await import('./bank.js')
  it('сумма навыков домена — та же метрика, что у темы банка', () => {
    const b = { topics: [
      { skillId: 'a', total: 10, answered: 4, correct: 3 },
      { skillId: 'b', total: 5, answered: 1, correct: 0 },
      { skillId: 'c', total: 7, answered: 7, correct: 7 },
    ] }
    expect(skillsProgress(b, ['a', 'b'])).toEqual({ answered: 5, total: 15, pct: 60 })
    expect(skillsProgress(null, ['a'])).toEqual({ answered: 0, total: 0, pct: 0 })
  })
})

describe('«Все вопросы» по макету NEW 2 (17:7703)', async () => {
  const { collapseRows, filterCounts, gridRows, groupByDomain, progressText, scopeCells } = await import('./bank.js')
  const b = { topics: [
    { skillId: 's2', domain: 'd2', total: 1, answered: 1, correct: 1, cells: [['x', 1, 1]] },
    { skillId: 's1', domain: 'd1', total: 2, answered: 1, correct: 0, cells: [['a', 1, 0], ['b', 2, null]] },
    { skillId: 's3', domain: 'd1', total: 1, answered: 0, correct: 0, cells: [['c', 3, null]] },
  ] }

  it('темы — домены по таксономии, клетки навыков подряд, суммы сложены', () => {
    const g = groupByDomain(b, ['d1', 'd2'])
    expect(g.map((d) => d.domain)).toEqual(['d1', 'd2'])
    expect(g[0]).toMatchObject({ total: 3, answered: 1, correct: 0, skillIds: ['s1', 's3'] })
    expect(g[0].cells.map((c) => c[0])).toEqual(['a', 'b', 'c'])
    // домен вне таксономии — в конец, без потери
    expect(groupByDomain(b, ['d2']).map((d) => d.domain)).toEqual(['d2', 'd1'])
    expect(groupByDomain(null)).toEqual([])
  })

  it('строки по 20 с подписью из номеров клеток, свёртка до 8 строк', () => {
    const cells = Array.from({ length: 45 }, (_, i) => [[`q${i}`, 1, null], i + 1])
    const rows = gridRows(cells)
    expect(rows.map((r) => [r.from, r.to, r.cells.length])).toEqual([[1, 20, 20], [21, 40, 20], [41, 45, 5]])
    expect(gridRows([])).toEqual([])
    const many = gridRows(Array.from({ length: 595 }, (_, i) => [[`q${i}`, 1, null], i + 1]))
    const c = collapseRows(many)
    expect(c.rows.length).toBe(8)
    expect(c.rows[7].to).toBe(160)
    expect(c.hidden).toBe(22)
    expect(collapseRows(many, 8, true).hidden).toBe(0)
    expect(collapseRows(rows).hidden).toBe(0)
  })

  it('область счёта: навыки или вся секция', () => {
    expect(scopeCells(b, ['s1']).map((c) => c[0])).toEqual(['a', 'b'])
    expect(scopeCells(b).length).toBe(4)
    expect(scopeCells(b, []).length).toBe(0)
  })

  it('числа на чипах: блок не учитывает свой же выбор, только соседний', () => {
    const cells = scopeCells(b)
    expect(filterCounts(cells, { difficulty: [], status: [] })).toEqual({
      difficulty: { 1: 2, 2: 1, 3: 1 }, status: { right: 1, wrong: 1, new: 2 },
    })
    // выбран Medium: числа сложности прежние, «Ответы» — только среди средних
    expect(filterCounts(cells, { difficulty: [2], status: [] })).toEqual({
      difficulty: { 1: 2, 2: 1, 3: 1 }, status: { right: 0, wrong: 0, new: 1 },
    })
    expect(filterCounts(cells, { difficulty: [], status: ['new'] }).difficulty).toEqual({ 1: 0, 2: 1, 3: 1 })
  })

  it('ничего не решено — «не начато», а не «0% верно»', () => {
    const t = (k, v) => `${k}:${JSON.stringify(v)}`
    expect(progressText(t, { answered: 0, total: 20, pct: 0 })).toBe('sat.bank.notStarted:{"n":"20"}')
    expect(progressText(t, { answered: 5, total: 20, pct: 60 })).toContain('sat.bank.progress')
  })
})
