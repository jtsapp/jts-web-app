import { describe, expect, it } from 'vitest'
import { checkAnswer, formatAnswer, parseNumber } from './check.js'

const mcq = { format: 'mcq', answer: 'C' }
const spr = (...answer) => ({ format: 'spr', answer })

describe('parseNumber', () => {
  it('читает целые, десятичные, дроби и минус из ключа', () => {
    expect(parseNumber('10800')).toEqual({ value: 10800, decimals: 0 })
    expect(parseNumber('-9.333')).toEqual({ value: -9.333, decimals: 3 })
    expect(parseNumber('.75')).toEqual({ value: 0.75, decimals: 2 })
    expect(parseNumber('−28/3').value).toBeCloseTo(-9.3333, 4)
  })

  it('запятая — десятичная точка, пробелы не мешают', () => {
    expect(parseNumber(' 0,575 ')).toEqual({ value: 0.575, decimals: 3 })
  })

  it('не число — null', () => {
    for (const s of ['', '  ', 'abc', '1/0', '1/2/3', '-', '.', '1.5/2', null]) expect(parseNumber(s)).toBeNull()
  })
})

describe('checkAnswer', () => {
  it('вариант — по букве без учёта регистра', () => {
    expect(checkAnswer(mcq, 'C')).toBe(true)
    expect(checkAnswer(mcq, 'c')).toBe(true)
    expect(checkAnswer(mcq, 'B')).toBe(false)
    expect(checkAnswer(mcq, '')).toBe(false)
  })

  it('ввод: дробь и десятичная запись равноценны', () => {
    const q = spr('91/4', '22.75')
    for (const s of ['91/4', '22.75', '22,75', '182/8']) expect(checkAnswer(q, s)).toBe(true)
    expect(checkAnswer(q, '22.7')).toBe(false)
  })

  it('точный ответ не засчитывается приближением', () => {
    expect(checkAnswer(spr('91/4', '22.75'), '22.749')).toBe(false)
    expect(checkAnswer(spr('7.25'), '7.251')).toBe(false)
  })

  it('бесконечная дробь: обрезка или округление от трёх знаков', () => {
    const q = spr('19/24', '0.792') // 0.791666…
    for (const s of ['0.792', '0.791', '.7916', '.7917', '19/24']) expect(checkAnswer(q, s)).toBe(true)
    for (const s of ['0.79', '0.8', '0.793']) expect(checkAnswer(q, s)).toBe(false)
  })

  it('отрицательный ответ', () => {
    const q = spr('-28/3', '-9.333')
    for (const s of ['-28/3', '−9.333', '-9.3333', '-56/6']) expect(checkAnswer(q, s)).toBe(true)
    expect(checkAnswer(q, '9.333')).toBe(false)
  })

  it('несколько допустимых ответов', () => {
    const q = spr('35', '36', '37')
    expect(['35', '36', '37', '38'].map((s) => checkAnswer(q, s))).toEqual([true, true, true, false])
  })

  it('мусор вместо числа не засчитывается', () => {
    expect(checkAnswer(spr('16'), 'шестнадцать')).toBe(false)
    expect(checkAnswer(spr('16'), '')).toBe(false)
  })
})

describe('formatAnswer', () => {
  it('буква или перечень допустимых записей', () => {
    expect(formatAnswer(mcq, 'или')).toBe('C')
    expect(formatAnswer(spr('91/4', '22.75'), 'или')).toBe('91/4 или 22.75')
  })
})
