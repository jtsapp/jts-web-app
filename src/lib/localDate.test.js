import { describe, it, expect } from 'vitest'
import { dayMonth, weekdayLong, weekdayShort } from './localDate.js'

const SAT_24_OCT = new Date(2026, 9, 24) // суббота, 24 октября 2026

describe('localDate — даты «Главной» на языке интерфейса', () => {
  it('казахский — своими названиями, а не «M10 24» и «Sat» из Intl', () => {
    expect(dayMonth(SAT_24_OCT, 'kk')).toBe('24 қазан')
    expect(weekdayShort(SAT_24_OCT, 'kk')).toBe('сб')
    expect(weekdayLong(SAT_24_OCT, 'kk')).toBe('сенбі')
  })
  it('русский и английский — Intl', () => {
    expect(dayMonth(SAT_24_OCT, 'ru')).toBe('24 октября')
    expect(dayMonth(SAT_24_OCT, 'en')).toBe('24 October')
  })
  it('битая дата — пустая строка', () => {
    expect(dayMonth(new Date('x'), 'ru')).toBe('')
  })
})
