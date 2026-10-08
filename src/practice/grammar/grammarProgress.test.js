// Ревью 08.10.2026: юнит, пройденный ДО того, как его задали на дом, в домашке
// не засчитывался никогда — markUnitDone выходил раньше отчёта, раз юнит уже
// в списке пройденных. Ученик проходил задание из домашки заново, а оно
// оставалось «не выполнено». Бэкенд повтор отчёта игнорирует, так что
// отчитываемся о каждом прохождении.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../practiceHomework.js', () => ({ countUnitTowardsHomework: vi.fn(() => Promise.resolve()) }))

import { countUnitTowardsHomework } from '../practiceHomework.js'
import { markUnitDone, isUnitDone } from './grammarProgress.js'

describe('markUnitDone → домашняя работа', () => {
  beforeEach(() => countUnitTowardsHomework.mockClear())

  it('повторное прохождение юнита тоже засчитывается в домашку', () => {
    markUnitDone('a2', 3)
    markUnitDone('a2', 3)
    expect(isUnitDone('a2', 3)).toBe(true)
    expect(countUnitTowardsHomework).toHaveBeenCalledTimes(2)
    expect(countUnitTowardsHomework).toHaveBeenLastCalledWith('grammar', 'a2', 3)
  })
})
