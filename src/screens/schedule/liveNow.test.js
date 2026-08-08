import { describe, it, expect } from 'vitest'
import { findLiveOccurrence } from './liveNow.js'

const occ = (lessonId, lessonStatus, scheduledAt) => ({ lessonId, lessonStatus, scheduledAt })

describe('findLiveOccurrence', () => {
  it('находит идущий урок, даже если он не сегодня', () => {
    // Ровно тот случай, из-за которого ученик не мог попасть в класс: урок
    // начался вчера и остался IN_PROGRESS, а календарь открыт на сегодня.
    const list = [
      occ(1, 'SCHEDULED', '2026-08-09T19:00:00'),
      occ(49, 'IN_PROGRESS', '2026-08-08T23:59:00'),
    ]
    expect(findLiveOccurrence(list)?.lessonId).toBe(49)
  })

  it('считает идущим и урок на паузе — учитель к нему вернётся', () => {
    expect(findLiveOccurrence([occ(7, 'PAUSED', '2026-08-09T10:00:00')])?.lessonId).toBe(7)
  })

  it('молчит, когда ничего не идёт', () => {
    expect(findLiveOccurrence([occ(1, 'SCHEDULED', '2026-08-09T19:00:00')])).toBeNull()
    expect(findLiveOccurrence([occ(2, 'COMPLETED', '2026-08-01T10:00:00')])).toBeNull()
    expect(findLiveOccurrence([])).toBeNull()
    expect(findLiveOccurrence(null)).toBeNull()
  })

  it('из двух идущих берёт начавшийся раньше — он и есть текущий', () => {
    const list = [
      occ(2, 'IN_PROGRESS', '2026-08-09T12:00:00'),
      occ(1, 'IN_PROGRESS', '2026-08-09T09:00:00'),
    ]
    expect(findLiveOccurrence(list)?.lessonId).toBe(1)
  })
})
