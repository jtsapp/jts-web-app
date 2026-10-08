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

  // Срок приходит без зоны и читается как МЕСТНОЕ время сервера (+05:00):
  // 11:24 по Казахстану — это 06:24 UTC, до которого от 12:00 UTC следующего дня
  // и считаем. NOW — 12:00 UTC.
  it('часы и минуты внутри суток', () => {
    const left = demoTimeLeft('2026-09-03T11:24:00', NOW)
    expect(left).toMatchObject({ endless: false, expired: false, days: 0, hours: 18, minutes: 24 })
    expect(formatDemoLeft(t, left)).toBe('осталось 18 ч 24 мин')
  })

  // Дальше суток минуты не показываем — «6 д 3 ч 41 мин» всё равно читается
  // как «ещё долго».
  it('больше суток — дни и часы без минут', () => {
    const left = demoTimeLeft('2026-09-08T20:41:00', NOW)
    expect(left.days).toBe(6)
    expect(formatDemoLeft(t, left)).toBe('осталось 6 д 3 ч')
  })

  // Бэкенд отдаёт LocalDateTime без зоны — МЕСТНОЕ время сервера, а не UTC. Без
  // явного смещения Safari считает такую строку UTC, а Chrome — местной: пять
  // часов разницы на одном аккаунте. И 'Z' тоже было неверным: оно читало
  // казахстанскую стену часов как UTC и завышало остаток на 5 часов.
  it('дата без зоны читается как время Казахстана (+05:00)', () => {
    const naive = demoTimeLeft('2026-09-02T18:00:00', NOW)
    const explicit = demoTimeLeft('2026-09-02T18:00:00+05:00', NOW)
    expect(naive.ms).toBe(explicit.ms)
    // 18:00 по Казахстану = 13:00 UTC, от 12:00 UTC остаётся час.
    expect(naive.hours).toBe(1)
    expect(naive.minutes).toBe(0)
  })

  // Живая запись из прода (08.10.2026): аккаунт 1669 создан 05.10 в 03:48 по
  // Казахстану, срок — 14 суток. В базе — 18.10 22:48 UTC, сервер отдаёт
  // «2026-10-19T03:48:24». Плашка у него показывала 10 д 17 ч, а честных там было
  // около 10 д 12 ч: ровно пять часов лишних.
  it('срок аккаунта 1669 считается от казахстанского времени, а не от UTC', () => {
    const at = Date.parse('2026-10-08T10:00:00Z') // 15:00 по Казахстану
    const left = demoTimeLeft('2026-10-19T03:48:24.413591', at)
    expect(left).toMatchObject({ days: 10, hours: 12 })
  })

  it('мусор вместо даты — как будто срока нет', () => {
    expect(demoTimeLeft('не дата', NOW).endless).toBe(true)
  })
})
