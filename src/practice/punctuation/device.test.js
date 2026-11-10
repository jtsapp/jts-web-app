// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PUNCTUATION_PREFS_KEY, PUNCTUATION_RUN_KEY } from '../practiceKeys.js'
import { normalizePrefs, normalizeRuns, readPrefs, readRuns, writePrefs, writeRuns } from './device.js'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('устройство Punctuation World: вид и недоигранное приключение', () => {
  it('вид: перевод только ru/kk, звук и Луна — булевы', () => {
    expect(normalizePrefs(null)).toEqual({ tr: '', mute: false, luna: false })
    expect(normalizePrefs({ tr: 'en', mute: 1, luna: true })).toEqual({ tr: '', mute: false, luna: true })
    writePrefs({ tr: 'kk', mute: true })
    expect(readPrefs()).toEqual({ tr: 'kk', mute: true, luna: false })
    // всё по умолчанию — ключ не держим
    writePrefs({ tr: '' })
    expect(localStorage.getItem(PUNCTUATION_PREFS_KEY)).toBeNull()
  })

  it('приключение — в форме прототипа, мусор отбрасывается', () => {
    expect(
      normalizeRuns({
        1: { s: 3, res: [1, 0, true, 'x', 0], marks: { 'Full stop': 4, Comma: -1, Junk: 'x' } },
        7: { s: 9, res: [], marks: {} },
        x: { s: 0, res: [] },
        2: { res: [1] },
        3: 'stage',
      }),
    ).toEqual({ 1: { s: 3, res: [1, 0, 1, 1, 0], marks: { 'Full stop': 4 } }, 7: { s: 6, res: [], marks: {} } })
  })

  it('пройденное приключение стирается с устройства, пустое — без ключа', () => {
    writeRuns({ 1: { s: 2, res: [1, 1], marks: {} } })
    expect(readRuns()).toEqual({ 1: { s: 2, res: [1, 1], marks: {} } })
    writeRuns({})
    expect(localStorage.getItem(PUNCTUATION_RUN_KEY)).toBeNull()
    expect(readRuns()).toEqual({})
  })

  it('забитый localStorage не роняет запись', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(writeRuns({ 1: { s: 1, res: [1], marks: {} } })).toEqual({ 1: { s: 1, res: [1], marks: {} } })
    expect(writePrefs({ tr: 'ru' })).toEqual({ tr: 'ru', mute: false, luna: false })
  })
})
