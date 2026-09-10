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

  it('английский — две формы, казахский — одна', () => {
    expect(pluralForm(1, 'en')).toBe('one')
    expect(pluralForm(2, 'en')).toBe('many')
    expect(pluralForm(1, 'kk')).toBe('many')
  })
})

describe('plural', () => {
  it('собирает ключ и подставляет число', () => {
    const t = (key, vars) => `${key}:${vars.n}`
    expect(plural(t, 'ru', 'pricing.lessons', 24)).toBe('pricing.lessons.few:24')
    expect(plural(t, 'ru', 'pricing.lessons', 12)).toBe('pricing.lessons.many:12')
  })
})
