import { describe, it, expect } from 'vitest'
import { accuracyTone, chartScale, typeTiles, weekStart, weeklyOverall } from './progress.js'

describe('прогресс IELTS', () => {
  it('неделя начинается в понедельник, на неделю — последний замер', () => {
    expect(weekStart('2026-10-01')).toBe('2026-09-28')
    expect(weekStart('2026-09-28')).toBe('2026-09-28')
    expect(weekStart('2026-10-04')).toBe('2026-09-28')
    const w = weeklyOverall([
      { date: '2026-09-15', overall: 5.5 },
      { date: '2026-09-29', overall: 6.0 },
      { date: '2026-10-01', overall: 6.5 },
      { date: '2026-10-02', overall: null },
    ])
    expect(w).toEqual([{ week: '2026-09-14', band: 5.5, n: 0 }, { week: '2026-09-28', band: 6.5, n: 2 }])
  })

  it('шкала графика — шагом 0.5, не уже 1.5 и с целью внутри', () => {
    expect(chartScale([6.0, 6.5], 7.0)).toEqual({ lo: 5.5, hi: 7, ticks: [5.5, 6, 6.5, 7] })
    expect(chartScale([4.5, 6.5], null).ticks).toEqual([4.5, 5, 5.5, 6, 6.5])
  })

  it('плитки: цвет по точности, типы без ответов — «нет данных», диктовка не плитка', () => {
    expect(accuracyTone(7, 10)).toBe('high')
    expect(accuracyTone(5, 10)).toBe('mid')
    expect(accuracyTone(4, 10)).toBe('low')
    expect(accuracyTone(0, 0)).toBe('none')
    const tiles = typeTiles(['tfng', 'ynng'], [{ type: 'tfng', correct: 9, total: 10 }, { type: 'dictation', correct: 1, total: 2 }, { type: 'odd', correct: 0, total: 1 }])
    expect(tiles.map((x) => [x.type, x.tone])).toEqual([['tfng', 'high'], ['ynng', 'none'], ['odd', 'low']])
    expect(tiles[0].label).toBe('True / False / Not Given')
  })

  it('note/table/flow-chart в Reading — одна плитка сверх макета и только при ответах', () => {
    const list = ['tfng', 'multiple_choice_multi']
    expect(typeTiles(list, [{ type: 'tfng', correct: 1, total: 2 }])).toHaveLength(2)
    const t = typeTiles(list, [{ type: 'note_completion', correct: 3, total: 4 }, { type: 'table_completion', correct: 1, total: 4 }])
    expect(t.map((x) => x.type)).toEqual(['tfng', 'multiple_choice_multi', 'note_table_flow'])
    expect(t[2]).toMatchObject({ correct: 4, total: 8, tone: 'mid', label: 'Note / table / flow-chart' })
    // у Listening note_completion — свой тип из списка, не группа
    expect(typeTiles(['note_completion'], [{ type: 'note_completion', correct: 1, total: 1 }], 'listening')).toHaveLength(1)
  })
})
