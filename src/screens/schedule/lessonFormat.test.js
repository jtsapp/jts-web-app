import { describe, it, expect } from 'vitest'
import {
  parseLessonDate, canJoin, lessonStateKey, dayKey, groupByDay,
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

  it('groupByDay buckets by local day (ascending) and sorts items by time', () => {
    const occ = [
      { lessonId: 2, scheduledAt: '2026-08-10T11:30:00', durationMinutes: 60, lessonStatus: 'SCHEDULED' },
      { lessonId: 1, scheduledAt: '2026-08-01T03:09:00', durationMinutes: 60, lessonStatus: 'IN_PROGRESS' },
      { lessonId: 3, scheduledAt: '2026-08-10T09:00:00', durationMinutes: 60, lessonStatus: 'SCHEDULED' },
    ]
    const groups = groupByDay(occ)
    expect(groups.map((g) => g.dayKey)).toEqual(['2026-08-01', '2026-08-10'])
    expect(groups[1].items.map((i) => i.lessonId)).toEqual([3, 2])
  })
})
