import { describe, it, expect } from 'vitest'
import {
  COUNTRIES,
  COUNTRY_OPTIONS,
  DEFAULT_COUNTRY,
  E164_MAX,
  OTHER_COUNTRY,
  formatNational,
  isNationalComplete,
} from './countries.js'

/**
 * «Можно сделать так, что принимают не только +7 — есть студенты и учителя не
 * из Кз». Список был закрытым и коротким: страны в нём нет — номер ввести
 * нечем, регистрация и вход упираются в тупик.
 */
describe('список стран', () => {
  it('Казахстан остаётся выбранным по умолчанию', () => {
    expect(DEFAULT_COUNTRY.iso).toBe('kz')
    expect(DEFAULT_COUNTRY.dial).toBe('7')
  })

  it('в выпадашке страны и «другая» последним пунктом', () => {
    expect(COUNTRY_OPTIONS).toHaveLength(COUNTRIES.length + 1)
    expect(COUNTRY_OPTIONS[COUNTRY_OPTIONS.length - 1]).toBe(OTHER_COUNTRY)
  })

  it('кроме +7 есть и другие коды', () => {
    const dials = new Set(COUNTRIES.map((c) => c.dial))
    expect(dials.size).toBeGreaterThan(10)
    expect([...dials].some((d) => d !== '7')).toBe(true)
  })

  // Иначе номер не влезет в канонический вид: код и номер вместе — до 15 цифр.
  it('ни у одной страны код и номер вместе не выходят за E.164', () => {
    for (const country of COUNTRIES) {
      expect(country.dial.length + country.max).toBeLessThanOrEqual(E164_MAX)
      expect(country.min).toBeGreaterThan(0)
      expect(country.min).toBeLessThanOrEqual(country.max)
    }
  })

  it('коды — только цифры, флаг и название на месте', () => {
    for (const country of COUNTRIES) {
      expect(country.dial).toMatch(/^\d+$/)
      expect(country.name.trim()).not.toBe('')
      expect(country.flag.trim()).not.toBe('')
    }
  })

  // iso — ключ строки списка в React, дубли ломали бы выбор.
  it('коды стран не повторяются', () => {
    const isos = COUNTRY_OPTIONS.map((c) => c.iso)
    expect(new Set(isos).size).toBe(isos.length)
  })
})

describe('«Другая страна»', () => {
  // Код набирают в самом поле, поэтому своего кода у пункта нет.
  it('без кода: номер вводится целиком', () => {
    expect(OTHER_COUNTRY.dial).toBe('')
  })

  it('принимает номер длиной по E.164 и отвергает короче', () => {
    expect(isNationalComplete(OTHER_COUNTRY, '491234567')).toBe(true)
    expect(isNationalComplete(OTHER_COUNTRY, '123456789012345')).toBe(true)
    expect(isNationalComplete(OTHER_COUNTRY, '123456')).toBe(false)
    expect(isNationalComplete(OTHER_COUNTRY, '1234567890123456')).toBe(false)
  })

  it('показывается группами по три цифры', () => {
    expect(formatNational(OTHER_COUNTRY, '4930123456')).toBe('493 012 345 6')
  })
})

describe('маска +7', () => {
  it('привычный вид остаётся у Казахстана и России', () => {
    expect(formatNational(DEFAULT_COUNTRY, '7771234567')).toBe('(777) 123-45-67')
  })

  it('неполный номер не считается готовым', () => {
    expect(isNationalComplete(DEFAULT_COUNTRY, '77712345')).toBe(false)
    expect(isNationalComplete(DEFAULT_COUNTRY, '7771234567')).toBe(true)
  })
})
