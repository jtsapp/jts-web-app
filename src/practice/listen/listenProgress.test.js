// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LISTEN_KEY, LISTEN_PROGRESS_EVENT } from '../practiceKeys.js'

// Синк — сеть, в юните его глушим: проверяем сам прогресс.
const pushModule = vi.fn()
vi.mock('../practiceSync.js', () => ({ pushModule: (...a) => pushModule(...a) }))

const { doneLessons, mergeListen, readBest, recordBest } = await import('./listenProgress.js')

beforeEach(() => {
  localStorage.clear()
  pushModule.mockClear()
})
afterEach(() => localStorage.clear())

describe('лучшие результаты', () => {
  it('битый и чужой формы стейт — пусто, неверные записи отброшены', () => {
    expect(readBest()).toEqual({})
    localStorage.setItem(LISTEN_KEY, JSON.stringify({ best: {
      'A1-L3-0': { ok: 5, n: 6, coins: 110 },
      'A1-T': { ok: 9, n: 6, coins: 10 },
      'bad key': { ok: 1, n: 1, coins: 1 },
      'A1-U2': { ok: 1, n: 2, coins: -5 },
    } }))
    expect(readBest()).toEqual({ 'A1-L3-0': { ok: 5, n: 6, coins: 110 } })
  })

  it('пишет только лучший результат, шлёт синк и будит экран', () => {
    const woke = vi.fn()
    window.addEventListener(LISTEN_PROGRESS_EVENT, woke)
    expect(recordBest('A0-L1-0', { ok: 3, n: 4, coins: 60 })).toBe(true)
    expect(recordBest('A0-L1-0', { ok: 2, n: 4, coins: 40 })).toBe(false)
    expect(recordBest('A0-L1-0', { ok: 4, n: 4, coins: 100 })).toBe(true)
    window.removeEventListener(LISTEN_PROGRESS_EVENT, woke)
    expect(readBest()['A0-L1-0']).toEqual({ ok: 4, n: 4, coins: 100 })
    expect(woke).toHaveBeenCalledTimes(2)
    expect(pushModule).toHaveBeenCalledWith('listen', { best: { 'A0-L1-0': { ok: 4, n: 4, coins: 100 } } })
  })

  it('сведение двух устройств — лучший по каждому ключу', () => {
    const a = { best: { 'A0-T': { ok: 10, n: 20, coins: 200 }, 'A0-U1': { ok: 1, n: 15, coins: 20 } } }
    const b = { best: { 'A0-T': { ok: 12, n: 20, coins: 180 }, 'B2-L1-1': { ok: 2, n: 2, coins: 50 } } }
    expect(mergeListen(a, b).best).toEqual({
      'A0-T': { ok: 10, n: 20, coins: 200 },
      'A0-U1': { ok: 1, n: 15, coins: 20 },
      'B2-L1-1': { ok: 2, n: 2, coins: 50 },
    })
  })

  it('урок пройден, если у любой его части есть результат; тесты и повторения не в счёт', () => {
    const best = { 'A1-L3-1': { ok: 1, n: 6, coins: 10 }, 'A1-L3-0': { ok: 1, n: 6, coins: 10 }, 'A1-L4-0': { ok: 1, n: 6, coins: 10 }, 'A1-L5-R': { ok: 1, n: 1, coins: 1 }, 'A1-T': { ok: 1, n: 1, coins: 1 }, 'A10-L1-0': { ok: 1, n: 1, coins: 1 } }
    expect(doneLessons(best, 'A1')).toBe(2)
  })
})
