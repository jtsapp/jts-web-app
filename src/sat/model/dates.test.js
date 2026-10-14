import { describe, expect, it } from 'vitest'
import { fmtDate } from './dates.js'

const d = (s) => new Date(`${s}T12:00:00`)

describe('fmtDate', () => {
  it('короткий месяц ru — три буквы, как в макете', () => {
    expect(fmtDate('ru-RU', d('2026-11-20'), { day: 'numeric', month: 'short' })).toBe('20 ноя')
    expect(fmtDate('ru-RU', d('2027-02-19'), { day: 'numeric', month: 'short' })).toBe('19 фев')
    expect(fmtDate('ru-RU', d('2026-09-28'), { day: 'numeric', month: 'short' })).toBe('28 сен')
    expect(fmtDate('ru-RU', d('2026-10-05'), { day: 'numeric', month: 'short' })).toBe('5 окт')
    // «г» месяца — не год: «авг.» остаётся «авг»
    expect(fmtDate('ru-RU', d('2027-08-28'), { month: 'short' })).toBe('авг')
    expect(fmtDate('ru-RU', d('2027-08-28'), { day: 'numeric', month: 'short', year: 'numeric' })).toBe('28 авг 2027')
    expect(fmtDate('ru-RU', d('2026-11-20'), { weekday: 'short', day: 'numeric', month: 'short' })).toBe('пт, 20 ноя')
  })

  it('год без « г.», длинный месяц не трогаем', () => {
    expect(fmtDate('ru-RU', d('2026-11-20'), { day: 'numeric', month: 'short', year: 'numeric' })).toBe('20 ноя 2026')
    expect(fmtDate('ru-RU', d('2026-11-20'), { day: 'numeric', month: 'long' })).toBe('20 ноября')
    expect(fmtDate('en-GB', d('2026-09-28'), { day: 'numeric', month: 'short' })).toBe('28 Sept')
  })
})
