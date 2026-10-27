import { describe, it, expect } from 'vitest'
import {
  DAYS, DAYPARTS, bestSuggestionId, bookingActive, clock, defaultWishes, enrollmentSteps, formatDate, orderedSuggestions,
  scheduleLine, splitLocal, toggled, wishesReady,
} from './groupLogic.js'

describe('пожелания ученика', () => {
  it('уровень берётся из теста, а язык — из языка интерфейса', () => {
    expect(defaultWishes('B1', 'ru')).toEqual({ direction: 'GENERAL', level: 'B1', language: 'RU', days: [], dayparts: [] })
    expect(defaultWishes('B1', 'kk').language).toBe('KK')
    expect(defaultWishes('C2', 'en').language).toBe('RU')
  })

  it('неизвестный уровень не ломает форму: подставляется A1', () => {
    expect(defaultWishes(undefined, 'ru').level).toBe('A1')
    expect(defaultWishes('', 'ru').level).toBe('A1')
  })

  it('искать можно, только когда отмечены и день, и время суток', () => {
    expect(wishesReady({ days: [], dayparts: [] })).toBe(false)
    expect(wishesReady({ days: ['MONDAY'], dayparts: [] })).toBe(false)
    expect(wishesReady({ days: [], dayparts: ['EVENING'] })).toBe(false)
    expect(wishesReady({ days: ['MONDAY'], dayparts: ['EVENING'] })).toBe(true)
  })

  it('отметки добавляются и снимаются, порядок недели сохраняется', () => {
    let days = toggled([], 'FRIDAY', DAYS)
    days = toggled(days, 'MONDAY', DAYS)
    expect(days).toEqual(['MONDAY', 'FRIDAY'])
    expect(toggled(days, 'FRIDAY', DAYS)).toEqual(['MONDAY'])
    expect(toggled(['EVENING'], 'MORNING', DAYPARTS)).toEqual(['MORNING', 'EVENING'])
  })
})

describe('даты и график', () => {
  it('время и локальная дата сервера читаются без перевода часового пояса', () => {
    expect(clock('19:00:00')).toBe('19:00')
    expect(clock(null)).toBe('')
    expect(splitLocal('2026-10-29T10:05:00')).toEqual({ date: '2026-10-29', time: '10:05' })
    expect(splitLocal(null)).toEqual({ date: '', time: '' })
  })

  it('дата пишется на языке интерфейса, пустая — прочерком', () => {
    expect(formatDate('2026-11-05', 'ru')).toBe('5 ноября')
    expect(formatDate('2026-11-05T09:00:00', 'en')).toBe('5 November')
    expect(formatDate('', 'ru')).toBe('—')
    expect(formatDate(null, 'kk')).toBe('—')
  })

  it('строка графика: дни, время и длительность', () => {
    const group = { days: ['MONDAY', 'WEDNESDAY'], startTime: '19:00:00', durationMinutes: 60 }
    expect(scheduleLine(group, (day) => ({ MONDAY: 'Пн', WEDNESDAY: 'Ср' })[day], 'мин')).toBe('Пн · Ср 19:00 · 60 мин')
  })
})

describe('четыре шага записи', () => {
  const states = (enrollment) => enrollmentSteps(enrollment).map((step) => step.state)

  it('сразу после записи: место выбрано, оплата — текущий шаг', () => {
    expect(states({ paymentStatus: 'BOOKING', confirmed: false })).toEqual(['done', 'on', 'todo', 'todo'])
  })

  it('пробный урок закрывает шаг оплаты, дальше ждём менеджера', () => {
    expect(states({ paymentStatus: 'TRIAL', confirmed: false })).toEqual(['done', 'done', 'on', 'todo'])
  })

  it('менеджер подтвердил без оплаты: оплата остаётся текущей, подтверждение уже сделано', () => {
    expect(states({ paymentStatus: 'BOOKING', confirmed: true })).toEqual(['done', 'on', 'done', 'todo'])
  })

  it('оплачено и подтверждено: остаётся только напоминание', () => {
    expect(states({ paymentStatus: 'PAID', confirmed: true })).toEqual(['done', 'done', 'done', 'on'])
  })

  it('шаги идут в порядке ТЗ', () => {
    expect(enrollmentSteps({ paymentStatus: 'PAID', confirmed: true }).map((step) => step.key)).toEqual(['seat', 'pay', 'confirm', 'remind'])
  })

  it('срок «до …» есть только у брони без оплаты и пробного урока', () => {
    expect(bookingActive({ paymentStatus: 'BOOKING', bookedUntil: '2026-10-28T10:00:00' })).toBe(true)
    expect(bookingActive({ paymentStatus: 'TRIAL', bookedUntil: null })).toBe(false)
    expect(bookingActive({ paymentStatus: 'BOOKING', bookedUntil: null })).toBe(false)
  })
})

describe('подходящие группы', () => {
  const item = (id, match, full) => ({ group: { id }, match, full })

  it('лучшая — первая из тех, где есть места', () => {
    expect(bestSuggestionId([item(1, 100, true), item(2, 80, false), item(3, 60, false)])).toBe(2)
    expect(bestSuggestionId([item(1, 100, true)])).toBeNull()
    expect(bestSuggestionId([])).toBeNull()
  })

  it('полные группы уходят вниз, порядок по совпадению внутри частей сохраняется', () => {
    expect(orderedSuggestions([item(1, 100, true), item(2, 80, false), item(3, 60, true), item(4, 40, false)]).map((x) => x.group.id)).toEqual([2, 4, 1, 3])
  })
})
