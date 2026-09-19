// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VERBS_KEY, VERBS_PROGRESS_EVENT } from '../practiceKeys.js'
import { DEFAULT_SETTINGS, normalizeSettings, readSettings, writeSettings } from './verbsSettings.js'

// Синк — сеть, в юните его глушим: проверяем сам прогресс, а не поход на
// сервер (он best-effort и для гостя вообще no-op).
const pushModule = vi.fn()
vi.mock('../practiceSync.js', () => ({ pushModule: (...a) => pushModule(...a) }))

const { readState, recordResult, resetResults, savedCount, scoresFor, toggleSaved } = await import('./verbsProgress.js')

beforeEach(() => {
  localStorage.clear()
  pushModule.mockClear()
})
afterEach(() => localStorage.clear())

describe('прогресс', () => {
  it('пустой, битый и чужой формы стейт — чистый старт, а не падение', () => {
    expect(readState()).toEqual({ saved: {}, progress: {} })
    localStorage.setItem(VERBS_KEY, '{не json')
    expect(readState()).toEqual({ saved: {}, progress: {} })
    localStorage.setItem(VERBS_KEY, JSON.stringify({ saved: [1], progress: 'x' }))
    expect(readState()).toEqual({ saved: {}, progress: {} })
  })

  it('звёздочка ставится и снимается, снятая не хранится false', () => {
    toggleSaved('go')
    toggleSaved('be')
    expect(savedCount()).toBe(2)
    toggleSaved('go')
    expect(readState().saved).toEqual({ be: true })
    expect(pushModule).toHaveBeenLastCalledWith('verbs', { saved: { be: true }, progress: {} })
  })

  it('результат копит попытки по ключу режима и будит экран событием', () => {
    const woke = vi.fn()
    window.addEventListener(VERBS_PROGRESS_EVENT, woke)
    recordResult('practice-v4-write-3-A1', 'go', { kind: 'written', score: { hits: 1, total: 2 } })
    recordResult('practice-v4-write-3-A1', 'go', { kind: 'written', score: { hits: 2, total: 2 } })
    recordResult('practice-v4-write-2-A1', 'go', { kind: 'written', score: { hits: 1, total: 1 } })
    window.removeEventListener(VERBS_PROGRESS_EVENT, woke)
    expect(scoresFor('practice-v4-write-3-A1').go).toEqual({ done: true, kind: 'written', attempts: 2, hits: 2, total: 2, best: 2 })
    expect(scoresFor('practice-v4-write-2-A1').go.attempts).toBe(1)
    expect(woke).toHaveBeenCalledTimes(3)
  })

  it('сброс стирает результаты, но оставляет отмеченные глаголы', () => {
    toggleSaved('go')
    recordResult('k', 'go', { kind: 'manual' })
    resetResults()
    expect(readState()).toEqual({ saved: { go: true }, progress: {} })
  })
})

describe('настройки устройства', () => {
  it('мусор приводится к умолчаниям и границам прототипа', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS)
    const n = normalizeSettings({ bpm: 500, volume: -3, tutor: 'x', formCount: 7, limit: 13, part: 'nope', practiceLevel: 'C1', beat: 'yes' })
    expect(n).toMatchObject({ bpm: 116, volume: 0, tutor: 90, formCount: 3, limit: 0, part: 'learn', practiceLevel: 'A1', beat: false })
  })

  it('запись сливается с прочитанным и переживает перечитывание', () => {
    writeSettings({ bpm: 80, part: 'practice' })
    writeSettings({ formCount: 2 })
    expect(readSettings()).toMatchObject({ bpm: 80, part: 'practice', formCount: 2, beat: true })
  })
})

describe('хранилище не пишет', () => {
  it('результаты живут в памяти, а не теряются сразу', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    recordResult('k', 'go', { kind: 'manual' })
    recordResult('k', 'be', { kind: 'manual' })
    toggleSaved('go')
    expect(Object.keys(scoresFor('k'))).toEqual(['go', 'be'])
    expect(readState().saved).toEqual({ go: true })
    spy.mockRestore()
  })

  it('правка настроек сливается с памятью экрана, а не с пустым хранилищем', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const a = writeSettings({ bpm: 76 }, DEFAULT_SETTINGS)
    const b = writeSettings({ practiceLevel: 'B1' }, a)
    expect(b).toMatchObject({ bpm: 76, practiceLevel: 'B1' })
    spy.mockRestore()
  })
})
