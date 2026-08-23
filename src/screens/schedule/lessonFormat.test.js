import { describe, it, expect } from 'vitest'
import {
  parseLessonDate, canJoin, canOpen, lessonStateKey, dayKey,
  buildMonthMatrix, occurrencesByDayKey, monthShift, dateFromKey,
  lessonTimeRange, lessonTopicFromSections,
} from './lessonFormat.js'

describe('lessonFormat', () => {
  it('parseLessonDate reads a naive datetime as local time (no UTC shift)', () => {
    const d = parseLessonDate('2026-08-10T11:30:00')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(7) // August
    expect(d.getDate()).toBe(10)
    expect(d.getHours()).toBe(11)
    expect(d.getMinutes()).toBe(30)
  })

  it('canJoin is true only for IN_PROGRESS and PAUSED', () => {
    expect(canJoin('IN_PROGRESS')).toBe(true)
    expect(canJoin('PAUSED')).toBe(true)
    expect(canJoin('SCHEDULED')).toBe(false)
    expect(canJoin('COMPLETED')).toBe(false)
    expect(canJoin('CANCELLED')).toBe(false)
  })

  it('canOpen lets a student reopen a completed lesson in view-only', () => {
    expect(canOpen('COMPLETED')).toBe(true)
    expect(canOpen('IN_PROGRESS')).toBe(true)
    expect(canOpen('SCHEDULED')).toBe(false)
    expect(canOpen('CANCELLED')).toBe(false)
  })

  it('lessonStateKey marks a SCHEDULED lesson whose end has passed as overdue', () => {
    const occ = { scheduledAt: '2026-08-10T11:30:00', durationMinutes: 60, lessonStatus: 'SCHEDULED' }
    expect(lessonStateKey(occ, new Date('2026-08-10T13:00:00'))).toBe('overdue')
  })

  it('lessonStateKey keeps a future SCHEDULED lesson as scheduled', () => {
    const occ = { scheduledAt: '2026-08-10T11:30:00', durationMinutes: 60, lessonStatus: 'SCHEDULED' }
    expect(lessonStateKey(occ, new Date('2026-08-10T09:00:00'))).toBe('scheduled')
  })

  it('lessonStateKey passes through live and terminal statuses', () => {
    const base = { scheduledAt: '2026-08-10T11:30:00', durationMinutes: 60 }
    expect(lessonStateKey({ ...base, lessonStatus: 'IN_PROGRESS' })).toBe('inProgress')
    expect(lessonStateKey({ ...base, lessonStatus: 'PAUSED' })).toBe('paused')
    expect(lessonStateKey({ ...base, lessonStatus: 'COMPLETED' })).toBe('completed')
    expect(lessonStateKey({ ...base, lessonStatus: 'CANCELLED' })).toBe('cancelled')
  })

  it('dayKey formats local Y-M-D', () => {
    expect(dayKey(new Date(2026, 7, 1, 3, 9))).toBe('2026-08-01')
  })

})

describe('buildMonthMatrix', () => {
  it('returns 6 weeks of 7 days, Monday-first', () => {
    const weeks = buildMonthMatrix(2026, 7) // August 2026
    expect(weeks).toHaveLength(6)
    weeks.forEach((w) => expect(w).toHaveLength(7))
    // Aug 1 2026 is a Saturday → first cell is Monday Jul 27 2026
    expect(weeks[0][0].date.getFullYear()).toBe(2026)
    expect(weeks[0][0].date.getMonth()).toBe(6) // July
    expect(weeks[0][0].date.getDate()).toBe(27)
    expect(weeks[0][0].inMonth).toBe(false)
    // First in-month day is Aug 1 at column index 5 (Saturday)
    expect(weeks[0][5]).toMatchObject({ inMonth: true })
    expect(weeks[0][5].date.getDate()).toBe(1)
  })

  it('marks only the target month as inMonth', () => {
    const weeks = buildMonthMatrix(2026, 1) // Feb 2026 (non-leap)
    const inMonthDays = weeks.flat().filter((c) => c.inMonth)
    expect(inMonthDays).toHaveLength(28)
    expect(Math.max(...inMonthDays.map((c) => c.date.getDate()))).toBe(28)
  })

  it('handles a leap February', () => {
    const weeks = buildMonthMatrix(2024, 1) // Feb 2024 (leap)
    expect(weeks.flat().filter((c) => c.inMonth)).toHaveLength(29)
  })

  it('handles a month starting on Monday without a blank leading week gap', () => {
    const weeks = buildMonthMatrix(2026, 5) // June 2026 starts Monday
    expect(weeks[0][0]).toMatchObject({ inMonth: true })
    expect(weeks[0][0].date.getDate()).toBe(1)
  })
})

describe('occurrencesByDayKey', () => {
  it('buckets by local day and sorts within a day by start time', () => {
    const occ = [
      { lessonId: 1, scheduledAt: '2026-08-04T20:00:00' },
      { lessonId: 2, scheduledAt: '2026-08-04T09:30:00' },
      { lessonId: 3, scheduledAt: '2026-08-05T10:00:00' },
    ]
    const map = occurrencesByDayKey(occ)
    expect(map.get('2026-08-04').map((o) => o.lessonId)).toEqual([2, 1])
    expect(map.get('2026-08-05').map((o) => o.lessonId)).toEqual([3])
    expect(map.has('2026-08-06')).toBe(false)
  })
})

describe('monthShift', () => {
  it('rolls forward across the year boundary', () => {
    expect(monthShift(2026, 11, 1)).toEqual({ year: 2027, month: 0 })
  })
  it('rolls backward across the year boundary', () => {
    expect(monthShift(2026, 0, -1)).toEqual({ year: 2025, month: 11 })
  })
})

describe('dateFromKey', () => {
  it('parses YYYY-MM-DD to a local-midnight Date', () => {
    const d = dateFromKey('2026-08-04')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(7)
    expect(d.getDate()).toBe(4)
    expect(d.getHours()).toBe(0)
  })
})

describe('lessonTimeRange', () => {
  it('складывает конец урока из длительности', () => {
    const occ = { scheduledAt: '2026-08-06T18:00:00', durationMinutes: 60 }
    expect(lessonTimeRange(occ, 'ru')).toBe('18:00 – 19:00')
  })

  it('без длительности показывает только начало', () => {
    expect(lessonTimeRange({ scheduledAt: '2026-08-06T18:00:00' }, 'ru')).toBe('18:00')
  })
})

describe('lessonTopicFromSections', () => {
  const sections = (materials, position = 0) => ({ position, materials })

  it('берёт материал первого раздела и срезает служебный суффикс режима', () => {
    const list = [
      sections([{ title: 'Coffee—yes. Mondays—no. · 1-на-1' }], 0),
      sections([{ title: 'Другой урок · Группа' }], 1),
    ]
    expect(lessonTopicFromSections(list)).toBe('Coffee—yes. Mondays—no.')
  })

  it('срезает и английские хвосты режимов, которые ставит бэкенд сейчас', () => {
    expect(lessonTopicFromSections([sections([{ title: 'Coffee—yes. Mondays—no. · 1 to 1' }])]))
      .toBe('Coffee—yes. Mondays—no.')
    expect(lessonTopicFromSections([sections([{ title: 'Weekend plans · Group' }])]))
      .toBe('Weekend plans')
  })

  // Точка-разделитель бывает и в честном названии — такое резать нельзя.
  it('не режет « · » внутри настоящего названия материала', () => {
    expect(lessonTopicFromSections([sections([{ title: 'Unit 3 · Present Perfect' }])]))
      .toBe('Unit 3 · Present Perfect')
  })

  it('идёт по разделам в порядке position, а не в порядке ответа', () => {
    const list = [
      sections([{ title: 'Второй' }], 2),
      sections([], 0),
      sections([{ title: 'Первый' }], 1),
    ]
    expect(lessonTopicFromSections(list)).toBe('Первый')
  })

  it('без материалов темы нет', () => {
    expect(lessonTopicFromSections([sections([]), sections([{ title: '  ' }])])).toBeNull()
    expect(lessonTopicFromSections([])).toBeNull()
    expect(lessonTopicFromSections(null)).toBeNull()
  })
})
