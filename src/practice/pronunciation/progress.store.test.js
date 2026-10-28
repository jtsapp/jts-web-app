// @vitest-environment jsdom
//
// Хранилище прогресса Pronunciation World: запись → чтение, копия для движка и
// забитый localStorage (под входом его съедает кэш каталогов, см. progressQuota.test.js).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PRONUNCIATION_KEY } from '../practiceKeys.js'
import { readPronunciation, writePronunciation } from './progress.js'

const EMPTY = { learned: {}, rounds: {}, tutorial: false, level: null, last: null }

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('хранилище Pronunciation World', () => {
  it('пустое хранилище читается как пустой прогресс', () => {
    expect(readPronunciation()).toEqual(EMPTY)
  })

  it('записанное читается обратно и лежит под ключом прототипа', () => {
    writePronunciation({ ...EMPTY, learned: { 'A0.1': true }, rounds: { 'A0.1': [{ done: true, best: 1, plays: 1 }, {}, {}] }, level: 'A0' })
    expect(readPronunciation().rounds['A0.1'][0]).toEqual({ done: true, best: 1, plays: 1 })
    expect(JSON.parse(localStorage.getItem(PRONUNCIATION_KEY))).toEqual(readPronunciation())
  })

  it('read отдаёт копию: движок меняет её, не трогая память', () => {
    writePronunciation({ ...EMPTY, learned: { 'A0.1': true } })
    const s = readPronunciation()
    s.learned['A0.3'] = true
    s.rounds['A0.1'] = [{ done: true }, {}, {}]
    expect(readPronunciation()).toEqual({ ...EMPTY, learned: { 'A0.1': true } })
  })

  it('забитый localStorage не прячет пройденное', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    writePronunciation({ ...EMPTY, learned: { 'A0.1': true } })
    writePronunciation({ ...EMPTY, learned: { 'A0.1': true, 'A0.3': true } })
    expect(readPronunciation().learned).toEqual({ 'A0.1': true, 'A0.3': true })
  })
})
