import { describe, expect, it, vi } from 'vitest'

vi.mock('../../api.js', () => ({ stopGeDay: vi.fn() }))

const { stopGeDay } = await import('../../api.js')
const { stopSummary, stopToday } = await import('./stopDay.js')
const { canStopDay } = await import('./dayControl.js')

const t = (key, vars = {}) => `${key}${vars.n ? `(${vars.n})` : ''}`

describe('«На сегодня всё»', () => {
  it('итог — из ответа сервера: сделано и перенесено, с формами числа', () => {
    expect(stopSummary(t, 'ru', { stop: { done: 2, moved: 1 } })).toBe('assistant.stop.done.few(2) assistant.stop.moved.one(1)')
    expect(stopSummary(t, 'ru', { stop: { done: 0, moved: 5 } })).toBe('assistant.stop.noneDone assistant.stop.moved.many(5)')
    expect(stopSummary(t, 'ru', { stop: { done: 1, moved: 0 } })).toBe('assistant.stop.done.one(1) assistant.stop.nothingMoved')
  })

  it('ручка есть — по полю stopDay в плане, даже null', () => {
    expect(canStopDay({ state: 'ready', tasks: [], stopDay: null })).toBe(true)
    expect(canStopDay({ state: 'ready', tasks: [] })).toBe(false)
    expect(canStopDay({ state: 'no_route', stopDay: null })).toBe(false)
    expect(canStopDay(null)).toBe(false)
  })

  it('сбой или плана нет — исключение (окно скажет «не вышло»)', async () => {
    stopGeDay.mockResolvedValueOnce(null)
    await expect(stopToday('tok')).rejects.toThrow()
    stopGeDay.mockResolvedValueOnce({ state: 'ready', tasks: [], stopDay: { moved: 1 }, stop: { done: 1, moved: 1 } })
    await expect(stopToday('tok')).resolves.toMatchObject({ stop: { moved: 1 } })
  })
})
