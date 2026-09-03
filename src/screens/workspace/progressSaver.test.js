import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createProgressSaver } from './progressSaver.js'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createProgressSaver', () => {
  it('пишет один раз после паузы, а не на каждую букву', () => {
    const save = vi.fn()
    const saver = createProgressSaver(save, 800)
    saver.schedule(7, 'a')
    saver.schedule(7, 'ab')
    saver.schedule(7, 'abc')
    expect(save).not.toHaveBeenCalled()

    vi.advanceTimersByTime(800)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith(7, 'abc', false)
  })

  // Ученик ответил и сразу вышел — раньше запись гасилась вместе со страницей.
  it('выход досылает то, что не успело уйти', () => {
    const save = vi.fn()
    const saver = createProgressSaver(save, 800)
    saver.schedule(7, 'ответ')
    saver.flush(true)

    expect(save).toHaveBeenCalledWith(7, 'ответ', true)
    vi.advanceTimersByTime(800)
    expect(save).toHaveBeenCalledTimes(1)
  })

  // Прежде запись материала A заменялась записью материала B, и строка A
  // оставалась пустой навсегда.
  it('переход на другой материал не отменяет запись прежнего', () => {
    const save = vi.fn()
    const saver = createProgressSaver(save, 800)
    saver.schedule(7, 'работа по A')
    saver.schedule(9, 'работа по B')

    expect(save).toHaveBeenCalledWith(7, 'работа по A', false)
    vi.advanceTimersByTime(800)
    expect(save).toHaveBeenCalledWith(9, 'работа по B', false)
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('пустой flush ничего не пишет', () => {
    const save = vi.fn()
    createProgressSaver(save, 800).flush(true)
    expect(save).not.toHaveBeenCalled()
  })

  it('после записи ожидающего больше нет', () => {
    const save = vi.fn()
    const saver = createProgressSaver(save, 800)
    saver.schedule(7, 'x')
    expect(saver.hasPending()).toBe(true)
    vi.advanceTimersByTime(800)
    expect(saver.hasPending()).toBe(false)
    saver.flush(true)
    expect(save).toHaveBeenCalledTimes(1)
  })
})
