import { describe, expect, it } from 'vitest'
import { lastScore, percent } from './tiles.js'

/** Плитки «Прогресса» (ТЗ SAT 21.10, задача 10). */
describe('плитки SAT', () => {
  it('примерный балл — последний результат по дате, из любого источника', () => {
    expect(lastScore([])).toBeNull()
    expect(lastScore([
      { takenOn: '2026-10-03', total: 1160, source: 'BLUEBOOK' },
      { takenOn: '2026-10-31', total: 1250, source: 'SIMULATION', delta: 90 },
      { takenOn: '2026-10-20', total: 1200, source: 'PAPER' },
    ])).toMatchObject({ total: 1250, source: 'SIMULATION', delta: 90 })
  })

  it('процент верных: без ответов — «нет данных», а не ноль', () => {
    expect(percent(0, 0)).toBeNull()
    expect(percent(7, 40)).toBe(18)
  })
})
