import { describe, expect, it } from 'vitest'
import { bluebookNo, monthDone, roadStops } from './course.js'

describe('дорога курса на роудмапе (B8)', () => {
  it('диагностика → месяц → контрольная точка → … без недельного списка', () => {
    const stops = roadStops()
    expect(stops.map((s) => s.kind)).toEqual(['diagnostic', 'month', 'checkpoint', 'month', 'checkpoint', 'month'])
    // каждый месяц перечисляет свои 12 тем, все 36 — ровно по разу
    const codes = stops.filter((s) => s.kind === 'month').flatMap((s) => s.lessons.map((l) => l.code))
    expect(codes).toHaveLength(36)
    expect(new Set(codes).size).toBe(36)
  })

  it('диагностика — Bluebook Practice Test 6, чекпоинт месяца 2 — Practice Test 9', () => {
    const stops = roadStops()
    expect(stops[0].bluebook).toBe(6)
    expect(stops[2].bluebook).toBe(8)
    expect(stops[4].bluebook).toBe(9)
  })

  it('номер теста — из названия; без номера — null', () => {
    expect(bluebookNo({ name: { en: 'Official Bluebook Practice Test 9' } })).toBe(9)
    expect(bluebookNo({ name: { en: 'The latest official Bluebook practice test' } })).toBeNull()
  })

  it('счёт пройденного в месяце', () => {
    const m = roadStops()[1]
    expect(monthDone(m, { [m.lessons[0].code]: 'done', [m.lessons[1].code]: 'current' })).toBe(1)
  })
})
