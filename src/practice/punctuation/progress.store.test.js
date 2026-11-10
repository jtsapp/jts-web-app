// @vitest-environment jsdom
//
// Хранилище прогресса Punctuation World: запись → чтение, копия для движка и
// забитый localStorage (под входом его съедает кэш каталогов, см. progressQuota.test.js).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PUNCTUATION_KEY } from '../practiceKeys.js'
import { readPunctuation, writePunctuation } from './progress.js'

const EMPTY = { read: {}, p: {}, fin: 0 }

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('хранилище Punctuation World', () => {
  it('пустое хранилище читается как пустой прогресс', () => {
    expect(readPunctuation()).toEqual(EMPTY)
  })

  it('записанное читается обратно и лежит под ключом прототипа', () => {
    writePunctuation({ read: { 1: 1 }, p: { 1: 2 }, fin: 0 })
    expect(readPunctuation()).toEqual({ read: { 1: 1 }, p: { 1: 2 }, fin: 0 })
    expect(JSON.parse(localStorage.getItem(PUNCTUATION_KEY))).toEqual(readPunctuation())
  })

  it('read отдаёт копию: движок меняет её, не трогая память', () => {
    writePunctuation({ ...EMPTY, read: { 1: 1 } })
    const s = readPunctuation()
    s.read[7] = 1
    s.p[1] = 3
    expect(readPunctuation()).toEqual({ ...EMPTY, read: { 1: 1 } })
  })

  it('забитый localStorage не прячет пройденное', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    writePunctuation({ ...EMPTY, read: { 1: 1 } })
    writePunctuation({ ...EMPTY, read: { 1: 1, 7: 1 }, p: { 7: 3 } })
    expect(readPunctuation()).toEqual({ read: { 1: 1, 7: 1 }, p: { 7: 3 }, fin: 0 })
  })
})
