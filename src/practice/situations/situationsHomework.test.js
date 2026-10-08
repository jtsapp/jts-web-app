// @vitest-environment jsdom
// Ревью 08.10.2026 (#8): «Ситуации» отмечали сценарий у себя, но домашке не
// сообщали — заданный уровень так и оставался невыполненным, и «выполнено»
// преподаватель ставил руками. Уровень выдаётся целиком, как у Аудирования:
// уходят числа, порог считает сервер.
import { describe, it, expect, beforeEach, vi } from 'vitest'

const homework = vi.hoisted(() => ({ countUnitTowardsHomework: vi.fn(() => Promise.resolve()) }))
vi.mock('../practiceHomework.js', () => homework)

import { markScenarioDone } from './itemsProgress.js'

beforeEach(() => {
  localStorage.clear()
  homework.countUnitTowardsHomework.mockClear()
})

describe('markScenarioDone', () => {
  it('сценарий пройден — домашка получает ход по уровню', () => {
    markScenarioDone('A1', 3, 20)
    expect(homework.countUnitTowardsHomework).toHaveBeenCalledWith('situations', 'a1', 'a1', { done: 1, total: 20 })
  })

  it('повторное прохождение тоже отчитывается: уровень могли задать уже после', () => {
    markScenarioDone('a1', 3, 20)
    markScenarioDone('a1', 3, 20)
    expect(homework.countUnitTowardsHomework).toHaveBeenCalledTimes(2)
    expect(homework.countUnitTowardsHomework).toHaveBeenLastCalledWith('situations', 'a1', 'a1', { done: 1, total: 20 })
  })

  it('без уровня ничего не шлёт', () => {
    markScenarioDone('', 3, 20)
    expect(homework.countUnitTowardsHomework).not.toHaveBeenCalled()
  })
})
