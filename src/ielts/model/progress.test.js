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
    expect(w).toEqual([{ week: '2026-09-14', band: 5.5 }, { week: '2026-09-28', band: 6.5 }])
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
  })
})
