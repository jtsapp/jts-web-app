import { describe, it, expect } from 'vitest'
import { plural, pluralForm } from './plural.js'

describe('pluralForm', () => {
  // Ровно те числа, что стоят на витрине тарифов: 8, 12, 16, 20, 24, 32 урока.
  it('русские формы', () => {
    expect(['one', 'few', 'many'].includes(pluralForm(1))).toBe(true)
    expect(pluralForm(1)).toBe('one')
    expect(pluralForm(2)).toBe('few')
    expect(pluralForm(8)).toBe('many')
    expect(pluralForm(12)).toBe('many')
    expect(pluralForm(16)).toBe('many')
    expect(pluralForm(20)).toBe('many')
    expect(pluralForm(24)).toBe('few')
    expect(pluralForm(32)).toBe('few')
  })

  it('11-14 — исключение', () => {
    expect(pluralForm(11)).toBe('many')
    expect(pluralForm(14)).toBe('many')
    expect(pluralForm(21)).toBe('one')
  })

  it('ноль и сотни — по правилам CLDR, а не по последней цифре числа', () => {
    expect(pluralForm(0)).toBe('many')
    expect(pluralForm(101)).toBe('one')
    expect(pluralForm(111)).toBe('many')
    expect(pluralForm(122)).toBe('few')
  })

  it('английский и казахский — две формы: ровно один и всё остальное', () => {
    expect(pluralForm(1, 'en')).toBe('one')
    expect(pluralForm(2, 'en')).toBe('many')
    expect(pluralForm(0, 'en')).toBe('many')
    expect(pluralForm(21, 'en')).toBe('many')
    // Существительное после числа по-казахски не меняется, но «один» свою
    // форму получает: во фразе «Алғашқы материалды» число выпадает, а при
    // двух и больше — стоит («Алғашқы 3 материалды»).
    expect(pluralForm(1, 'kk')).toBe('one')
    expect(pluralForm(2, 'kk')).toBe('many')
    expect(pluralForm(21, 'kk')).toBe('many')
  })

  it('незнакомый язык считается по-русски — как и словарь, откатывающийся на ru', () => {
    expect(pluralForm(2, 'de')).toBe('few')
    expect(pluralForm(5, undefined)).toBe('many')
  })

  it('знак и дробная часть не меняют формы', () => {
    expect(pluralForm(-2)).toBe('few')
    expect(pluralForm(1.5)).toBe('one')
  })
})

describe('plural', () => {
  it('собирает ключ и подставляет число', () => {
    const t = (key, vars) => `${key}:${vars.n}`
    expect(plural(t, 'ru', 'pricing.lessons', 24)).toBe('pricing.lessons.few:24')
    expect(plural(t, 'ru', 'pricing.lessons', 12)).toBe('pricing.lessons.many:12')
  })
})
