// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NUMBERS_KEY, NUMBERS_PROGRESS_EVENT } from '../practiceKeys.js'

// Синк — сеть, в юните его глушим: проверяем сам прогресс.
const pushModule = vi.fn()
vi.mock('../practiceSync.js', () => ({ pushModule: (...a) => pushModule(...a) }))

const { mergeNumbers, normalize, readNumbers, updateNumbers } = await import('./numbersProgress.js')

const EMPTY = { sections: {}, bestCombo: 0, totalCorrect: 0, seen: {} }
const round = (passed, best, stars = 0, plays = 1) => ({ passed, best, stars, plays })
const section = (rounds, extra = {}) => ({ rounds, stars: 0, best: 0, bestCr: 0, done: false, plays: rounds.length, ...extra })

beforeEach(() => {
  localStorage.clear()
  pushModule.mockClear()
})
afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('прогресс «Чисел»', () => {
  it('пустой, битый и чужой формы стейт — чистый старт, а не падение', () => {
    expect(readNumbers()).toEqual(EMPTY)
    for (const bad of ['{не json', '[1]', '"x"', 'null', '{"sections":[1]}', '{"sections":{"../x":{}}}']) {
      localStorage.setItem(NUMBERS_KEY, bad)
      expect(readNumbers(), bad).toEqual(EMPTY)
    }
  })

  it('normalize обрезает чужие значения и держит дыры раундов', () => {
    const s = normalize({ sections: { basic: { rounds: [{ passed: true, best: 7, stars: 9, plays: -2 }, null, 'x'] } }, bestCombo: 'a' })
    expect(s.sections.basic.rounds).toEqual([round(true, 1, 3, 0), null, null])
    expect(s.bestCombo).toBe(0)
  })

  it('merge: пройденное где угодно — пройдено, результат и звёзды — максимум', () => {
    const phone = { sections: { basic: section([round(true, 0.9, 2), round(false, 0.4)]) }, bestCombo: 6, totalCorrect: 40, seen: { boss1: { 'a→1': 2 } } }
    const laptop = { sections: { basic: section([round(false, 0.5, 0, 3)]), teens: section([round(true, 1, 3)]) }, bestCombo: 3, totalCorrect: 55, seen: { boss1: { 'a→1': 5, 'b→2': 1 } } }
    const m = mergeNumbers(phone, laptop)
    expect(m.sections.basic.rounds).toEqual([round(true, 0.9, 2, 3), round(false, 0.4)])
    expect(m.sections.teens.rounds[0].passed).toBe(true)
    expect([m.bestCombo, m.totalCorrect]).toEqual([6, 55])
    expect(m.seen.boss1).toEqual({ 'a→1': 5, 'b→2': 1 })
  })

  it('updateNumbers меняет свежую копию, пишет черновик и будит экран событием', () => {
    const woke = vi.fn()
    window.addEventListener(NUMBERS_PROGRESS_EVENT, woke)
    updateNumbers((s) => { s.sections.basic = section([round(true, 0.8, 1)]); s.totalCorrect = 8 })
    window.removeEventListener(NUMBERS_PROGRESS_EVENT, woke)
    expect(readNumbers().sections.basic.rounds[0].passed).toBe(true)
    expect(JSON.parse(localStorage.getItem(NUMBERS_KEY)).totalCorrect).toBe(8)
    expect(woke).toHaveBeenCalled()
    // Гостю синк не положен, но зовётся всегда — решает сам pushModule.
    expect(pushModule).toHaveBeenCalledWith('numbers', expect.objectContaining({ totalCorrect: 8 }))
  })

  it('копия, которую вернул readNumbers, не меняется от updateNumbers', () => {
    const before = readNumbers()
    updateNumbers((s) => { s.bestCombo = 4 })
    expect(before.bestCombo).toBe(0)
    expect(readNumbers().bestCombo).toBe(4)
  })
})
