// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VIDEO_DICTATION_KEY, VIDEO_DICTATION_PROGRESS_EVENT } from '../practiceKeys.js'

// Синк — сеть, в юните его глушим: проверяем сам прогресс.
const pushModule = vi.fn()
vi.mock('../practiceSync.js', () => ({ pushModule: (...a) => pushModule(...a) }))

const { bestOf, isBetterResult, mergeVideoDictation, readBest, recordBest } = await import('./progress.js')

beforeEach(() => {
  localStorage.clear()
  pushModule.mockClear()
})
afterEach(() => localStorage.clear())

describe('какой результат лучше', () => {
  it('больше доля с первого раза; при равной доле — больше фраз', () => {
    expect(isBetterResult({ clean: 7, n: 10 }, null)).toBe(true)
    expect(isBetterResult({ clean: 8, n: 10 }, { clean: 7, n: 10 })).toBe(true)
    expect(isBetterResult({ clean: 7, n: 10 }, { clean: 7, n: 10 })).toBe(false)
    expect(isBetterResult({ clean: 4, n: 8 }, { clean: 5, n: 10 })).toBe(false)
    expect(isBetterResult({ clean: 6, n: 12 }, { clean: 5, n: 10 })).toBe(true)
    expect(isBetterResult({ clean: 3, n: 4 }, { clean: 7, n: 10 })).toBe(true)
  })
})

describe('лучшие результаты уроков', () => {
  it('битый и чужой формы стейт — пусто, неверные записи отброшены', () => {
    expect(readBest()).toEqual({})
    localStorage.setItem(VIDEO_DICTATION_KEY, JSON.stringify({ best: {
      'muddy-puddles-k3f9q': { clean: 7, n: 10 },
      'bad slug': { clean: 1, n: 1 },
      'too-many-k3f9q': { clean: 70, n: 61 },
      'more-than-all-k3f9q': { clean: 5, n: 4 },
      'zero-k3f9q': { clean: 0, n: 0 },
      'float-k3f9q': { clean: 1.5, n: 3 },
    } }))
    expect(readBest()).toEqual({ 'muddy-puddles-k3f9q': { clean: 7, n: 10 } })
  })

  it('пишет только лучший результат, шлёт синк и будит экран', () => {
    const woke = vi.fn()
    window.addEventListener(VIDEO_DICTATION_PROGRESS_EVENT, woke)
    expect(recordBest('muddy-puddles-k3f9q', { clean: 5, n: 10 })).toBe(true)
    expect(recordBest('muddy-puddles-k3f9q', { clean: 4, n: 10 })).toBe(false)
    expect(recordBest('muddy-puddles-k3f9q', { clean: 9, n: 10 })).toBe(true)
    window.removeEventListener(VIDEO_DICTATION_PROGRESS_EVENT, woke)
    expect(readBest()['muddy-puddles-k3f9q']).toEqual({ clean: 9, n: 10 })
    expect(woke).toHaveBeenCalledTimes(2)
    expect(pushModule).toHaveBeenLastCalledWith('videoDictation', { best: { 'muddy-puddles-k3f9q': { clean: 9, n: 10 } } })
  })

  it('неверный slug или результат не пишется', () => {
    expect(recordBest('bad slug', { clean: 1, n: 1 })).toBe(false)
    expect(recordBest('ok-k3f9q', { clean: 2, n: 1 })).toBe(false)
    expect(pushModule).not.toHaveBeenCalled()
  })

  it('урок со slug «constructor» не путается с прототипом объекта', () => {
    expect(bestOf({}, 'constructor')).toBeNull()
    expect(recordBest('constructor', { clean: 1, n: 2 })).toBe(true)
    expect(bestOf(readBest(), 'constructor')).toEqual({ clean: 1, n: 2 })
  })

  it('сведение двух устройств — лучший по каждому уроку', () => {
    const a = { best: { 'a-k3f9q': { clean: 5, n: 10 }, 'b-k3f9q': { clean: 1, n: 3 } } }
    const b = { best: { 'a-k3f9q': { clean: 6, n: 10 }, 'c-k3f9q': { clean: 2, n: 2 } } }
    expect(mergeVideoDictation(a, b).best).toEqual({
      'a-k3f9q': { clean: 6, n: 10 },
      'b-k3f9q': { clean: 1, n: 3 },
      'c-k3f9q': { clean: 2, n: 2 },
    })
  })
})
