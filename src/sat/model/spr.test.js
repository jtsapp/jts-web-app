import { describe, it, expect } from 'vitest'
import { check, normalize, validate, value } from './spr.js'

describe('SPR-ответ SAT', () => {
  it('нормализует минусы, пробелы и плюс', () => {
    expect(normalize(' −3.5 ')).toBe('-3.5')
    expect(normalize('+7/2')).toBe('7/2')
    expect(value('7/2')).toBe(3.5)
    expect(value('.5')).toBe(0.5)
    expect(value('1/0')).toBeNull()
    expect(value('abc')).toBeNull()
  })

  it('формат проверяется до ответа: символы, смешанная дробь, длина', () => {
    expect(validate('').code).toBe('empty')
    expect(validate('50%').code).toBe('symbol')
    expect(validate('1,000').code).toBe('symbol')
    expect(validate('3 1/2').code).toBe('mixed')
    expect(validate('123456').code).toBe('length')
    expect(validate('2592/5').ok).toBe(true)
    expect(validate('-49/150').ok).toBe(true)
    expect(validate('1234567/89').code).toBe('length')
    expect(validate('-12345').ok).toBe(true)
    expect(validate('x+1').code).toBe('format')
    expect(validate('7/2')).toEqual({ ok: true, normalized: '7/2', value: 3.5 })
  })

  it('дробь и десятичная запись эквивалентны', () => {
    expect(check('3.5', ['7/2'])).toBe(true)
    expect(check('7/2', ['3.5'])).toBe(true)
    expect(check('.6667', ['2/3'])).toBe(false)
    expect(check('0.3333333', ['1/3'])).toBe(true)
    expect(check('15', '15')).toBe(true)
    expect(check('', ['0'])).toBe(false)
  })
})
