import { describe, it, expect } from 'vitest'
import { findLiveOccurrence, pickFeaturedOccurrence } from './liveNow.js'

const occ = (lessonId, lessonStatus, scheduledAt) => ({ lessonId, lessonStatus, scheduledAt, durationMinutes: 60 })

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

describe('pickFeaturedOccurrence', () => {
  const now = new Date('2026-08-10T12:00:00')

  it('идущий урок важнее ближайшего запланированного', () => {
    const list = [
      occ(1, 'SCHEDULED', '2026-08-10T18:00:00'),
      occ(49, 'IN_PROGRESS', '2026-08-08T23:59:00'),
    ]
    expect(pickFeaturedOccurrence(list, now)?.lessonId).toBe(49)
  })

  it('без идущего берёт ближайший будущий урок', () => {
    const list = [
      occ(3, 'SCHEDULED', '2026-08-12T10:00:00'),
      occ(2, 'SCHEDULED', '2026-08-10T18:00:00'),
    ]
    expect(pickFeaturedOccurrence(list, now)?.lessonId).toBe(2)
  })

  it('идущий урок засчитывается и сейчас: начался в 11:30, ещё не кончился', () => {
    const list = [occ(5, 'SCHEDULED', '2026-08-10T11:30:00')]
    expect(pickFeaturedOccurrence(list, now)?.lessonId).toBe(5)
  })

  // Просроченный урок предлагать нельзя: время вышло, преподаватель класс так
  // и не открыл — кнопка «присоединиться» вела бы в никуда.
  it('просроченные, отменённые и проведённые уроки не показываются', () => {
    expect(pickFeaturedOccurrence([occ(6, 'SCHEDULED', '2026-08-10T09:00:00')], now)).toBeNull()
    expect(pickFeaturedOccurrence([occ(7, 'CANCELLED', '2026-08-11T09:00:00')], now)).toBeNull()
    expect(pickFeaturedOccurrence([occ(8, 'COMPLETED', '2026-08-09T09:00:00')], now)).toBeNull()
    expect(pickFeaturedOccurrence([], now)).toBeNull()
    expect(pickFeaturedOccurrence(null, now)).toBeNull()
  })
})
