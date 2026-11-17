// @vitest-environment jsdom
//
// Блокнот Literature World: нормализация, сведение двух устройств (в момент снимка сервера) и хранилище — запись
// уходит как есть, копия для движка, забитый localStorage.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LITERATURE_KEY } from '../practiceKeys.js'
import { mergeLiterature, normalize, readLiterature, writeLiterature } from './progress.js'

beforeEach(() => {
  localStorage.clear()
  writeLiterature({ notebook: {} })
})
afterEach(() => vi.restoreAllMocks())

describe('блокнот: форма', () => {
  it('берёт только похожее на блокнот: id слова и время сохранения', () => {
    expect(normalize(null)).toEqual({ notebook: {} })
    expect(normalize({ notebook: [1, 2] })).toEqual({ notebook: {} })
    expect(normalize({ notebook: { solitude: 1700000000000, 'green-eyed': 5, '': 1, 'Bad Id': 3, x: 'yes', y: -1, z: 0 } })).toEqual({
      notebook: { solitude: 1700000000000, 'green-eyed': 5 },
    })
  })

  it('сведение двух устройств: слова объединяются, время — большее', () => {
    expect(mergeLiterature({ notebook: { a: 1, b: 5 } }, { notebook: { b: 3, c: 7 } })).toEqual({ notebook: { a: 1, b: 5, c: 7 } })
    expect(mergeLiterature(null, { notebook: { a: 2 } })).toEqual({ notebook: { a: 2 } })
  })
})

describe('блокнот: хранилище', () => {
  it('записанное читается обратно и лежит под своим ключом', () => {
    writeLiterature({ notebook: { solitude: 10 } })
    expect(readLiterature()).toEqual({ notebook: { solitude: 10 } })
    expect(JSON.parse(localStorage.getItem(LITERATURE_KEY))).toEqual({ notebook: { solitude: 10 } })
  })

  it('запись движка — как есть: убранное из блокнота слово остаётся убранным', () => {
    writeLiterature({ notebook: { a: 1, b: 2 } })
    writeLiterature({ notebook: { a: 1 } })
    expect(readLiterature()).toEqual({ notebook: { a: 1 } })
  })

  it('read отдаёт копию: движок меняет её, не трогая память', () => {
    writeLiterature({ notebook: { a: 1 } })
    const s = readLiterature()
    s.notebook.b = 2
    expect(readLiterature()).toEqual({ notebook: { a: 1 } })
  })

  it('забитый localStorage не прячет сохранённое', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    writeLiterature({ notebook: { a: 1, b: 2 } })
    expect(readLiterature()).toEqual({ notebook: { a: 1, b: 2 } })
  })
})
