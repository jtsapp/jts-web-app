import { describe, it, expect } from 'vitest'
import { demoTimeLeft, formatDemoLeft } from './demoAccess.js'

// Словарь-заглушка вместо I18nProvider: формат остатка — чистая склейка, и
// тащить сюда React ради неё незачем.
const t = (key, vars = {}) => {
  const dict = {
    'demo.left.prefix': 'осталось {rest}',
    'demo.left.d': '{n} д',
    'demo.left.h': '{n} ч',
    'demo.left.m': '{n} мин',
    'demo.left.expired': 'срок истёк',
  }
  let s = dict[key] || key
  for (const k in vars) s = s.split(`{${k}}`).join(vars[k])
  return s
}

const NOW = Date.parse('2026-09-02T12:00:00Z')

describe('demoTimeLeft', () => {
  it('без даты — демо бессрочное, а не истёкшее', () => {
    const left = demoTimeLeft(null, NOW)
    expect(left.endless).toBe(true)
    expect(left.expired).toBe(false)
    expect(formatDemoLeft(t, left)).toBe('')
  })

  it('прошедшая дата — истекло', () => {
    const left = demoTimeLeft('2026-09-01T12:00:00', NOW)
    expect(left.expired).toBe(true)
    expect(formatDemoLeft(t, left)).toBe('срок истёк')
  })

  it('часы и минуты внутри суток', () => {
    const left = demoTimeLeft('2026-09-03T06:24:00', NOW)
    expect(left).toMatchObject({ endless: false, expired: false, days: 0, hours: 18, minutes: 24 })
    expect(formatDemoLeft(t, left)).toBe('осталось 18 ч 24 мин')
  })

  // Дальше суток минуты не показываем — «6 д 3 ч 41 мин» всё равно читается
  // как «ещё долго».
  it('больше суток — дни и часы без минут', () => {
    const left = demoTimeLeft('2026-09-08T15:41:00', NOW)
    expect(left.days).toBe(6)
    expect(formatDemoLeft(t, left)).toBe('осталось 6 д 3 ч')
  })

  // Бэкенд отдаёт LocalDateTime без зоны, и без явного 'Z' Safari считает её
  // UTC, а Chrome — местной: пять часов разницы на одном аккаунте.
  it('дата без зоны читается как UTC', () => {
    const naive = demoTimeLeft('2026-09-02T18:00:00', NOW)
    const explicit = demoTimeLeft('2026-09-02T18:00:00Z', NOW)
    expect(naive.ms).toBe(explicit.ms)
    expect(naive.hours).toBe(6)
  })

  it('мусор вместо даты — как будто срока нет', () => {
    expect(demoTimeLeft('не дата', NOW).endless).toBe(true)
  })
})
