// @vitest-environment jsdom
//
// Хранилище прогресса Prepositions World: запись → чтение, копия для движка и
// забитый localStorage (под входом его съедает кэш каталогов, см. progressQuota.test.js).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PREPOSITIONS_KEY } from '../practiceKeys.js'
import { readPrepositions, writePrepositions } from './progress.js'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('хранилище Prepositions World', () => {
  it('пустое хранилище читается как пустой прогресс', () => {
    expect(readPrepositions()).toEqual({ done: {}, score: {} })
  })

  it('записанное читается обратно и лежит под ключом прототипа', () => {
    writePrepositions({ done: { 'place-in-on-at': 1 }, score: { F: { best: 0.9, stars: 3 } } })
    expect(readPrepositions()).toEqual({ done: { 'place-in-on-at': 1 }, score: { F: { best: 0.9, stars: 3 } } })
    expect(JSON.parse(localStorage.getItem(PREPOSITIONS_KEY))).toEqual(readPrepositions())
  })

  it('read отдаёт копию: движок меняет её, не трогая память', () => {
    writePrepositions({ done: { a: 1 }, score: {} })
    const s = readPrepositions()
    s.done.b = 1
    s.score.F = { best: 1, stars: 3 }
    expect(readPrepositions()).toEqual({ done: { a: 1 }, score: {} })
  })

  it('мусор при записи отсеивается', () => {
    writePrepositions({ done: { a: 1, '': 1 }, score: { junk: { best: 1, stars: 3 } } })
    expect(readPrepositions()).toEqual({ done: { a: 1 }, score: {} })
  })

  it('забитый localStorage не прячет прочитанное', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    writePrepositions({ done: { a: 1 }, score: {} })
    writePrepositions({ done: { a: 1, b: 1 }, score: {} })
    expect(readPrepositions().done).toEqual({ a: 1, b: 1 })
  })
})
