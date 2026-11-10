// @vitest-environment jsdom
//
// Хранилище прогресса Tenses World: запись → чтение, копия для движка и забитый
// localStorage (под входом его съедает кэш каталогов, см. progressQuota.test.js).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TENSES_KEY } from '../practiceKeys.js'
import { readTenses, writeTenses } from './progress.js'

const EMPTY = { practice: {}, visited: {}, last: null }

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('хранилище Tenses World', () => {
  it('пустое хранилище читается как пустой прогресс', () => {
    expect(readTenses()).toEqual(EMPTY)
  })

  it('записанное читается обратно и лежит под ключом прототипа', () => {
    writeTenses({ practice: { recognise: { done: true, best: 12, total: 16 } }, visited: { 'past-simple': 1 }, last: 'past-simple' })
    expect(readTenses().practice.recognise).toEqual({ done: true, best: 12, total: 16 })
    expect(JSON.parse(localStorage.getItem(TENSES_KEY))).toEqual(readTenses())
  })

  it('read отдаёт копию: движок меняет её, не трогая память', () => {
    writeTenses({ ...EMPTY, visited: { 'past-simple': 1 } })
    const s = readTenses()
    s.visited['future-simple'] = 1
    s.practice.final = { done: true, best: 1, total: 22 }
    expect(readTenses()).toEqual({ ...EMPTY, visited: { 'past-simple': 1 } })
  })

  it('забитый localStorage не прячет пройденное', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    writeTenses({ ...EMPTY, practice: { recognise: { done: true, best: 1, total: 16 } } })
    writeTenses({ ...EMPTY, practice: { recognise: { done: true, best: 1, total: 16 }, final: { done: true, best: 2, total: 22 } } })
    expect(Object.keys(readTenses().practice)).toEqual(['recognise', 'final'])
  })
})
