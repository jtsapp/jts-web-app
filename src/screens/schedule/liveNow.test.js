import { describe, it, expect } from 'vitest'
import { findLiveOccurrence, pickFeaturedOccurrence, LIVE_STALE_AFTER_MS } from './liveNow.js'

const occ = (lessonId, lessonStatus, scheduledAt) => ({ lessonId, lessonStatus, scheduledAt, durationMinutes: 60 })

describe('findLiveOccurrence', () => {
  it('находит идущий урок, даже если он не сегодня', () => {
    // Ровно тот случай, из-за которого ученик не мог попасть в класс: урок
    // начался вчера перед полуночью и остался IN_PROGRESS, а календарь после
    // полуночи открыт уже на сегодня.
    const list = [
      occ(1, 'SCHEDULED', '2026-08-09T19:00:00'),
      occ(49, 'IN_PROGRESS', '2026-08-08T23:59:00'),
    ]
    expect(findLiveOccurrence(list, new Date('2026-08-09T00:30:00'))?.lessonId).toBe(49)
  })

  it('считает идущим и урок на паузе — учитель к нему вернётся', () => {
    const now = new Date('2026-08-09T10:30:00')
    expect(findLiveOccurrence([occ(7, 'PAUSED', '2026-08-09T10:00:00')], now)?.lessonId).toBe(7)
  })

  it('молчит, когда ничего не идёт', () => {
    const now = new Date('2026-08-09T12:00:00')
    expect(findLiveOccurrence([occ(1, 'SCHEDULED', '2026-08-09T19:00:00')], now)).toBeNull()
    expect(findLiveOccurrence([occ(2, 'COMPLETED', '2026-08-01T10:00:00')], now)).toBeNull()
    expect(findLiveOccurrence([], now)).toBeNull()
    expect(findLiveOccurrence(null, now)).toBeNull()
  })

  it('из двух идущих берёт начавшийся раньше — он и есть текущий', () => {
    const list = [
      occ(2, 'IN_PROGRESS', '2026-08-09T12:00:00'),
      occ(1, 'IN_PROGRESS', '2026-08-09T09:00:00'),
    ]
    expect(findLiveOccurrence(list, new Date('2026-08-09T12:30:00'))?.lessonId).toBe(1)
  })

  // Бэкенд урок сам не закрывает: не нажал преподаватель «Завершить» — урок
  // IN_PROGRESS навсегда. Такой урок не идёт, сколько бы ни говорил статус.
  it('забытый незакрытый урок идущим не считается', () => {
    const forgotten = occ(21, 'IN_PROGRESS', '2026-09-21T17:30:00')
    expect(findLiveOccurrence([forgotten], new Date('2026-10-01T12:00:00'))).toBeNull()
    expect(findLiveOccurrence([{ ...forgotten, lessonStatus: 'PAUSED' }], new Date('2026-10-01T12:00:00'))).toBeNull()
  })

  it('идущим урок остаётся ровно LIVE_STALE_AFTER_MS после конца по расписанию', () => {
    const lesson = occ(5, 'IN_PROGRESS', '2026-08-09T17:00:00') // конец в 18:00
    const end = new Date('2026-08-09T18:00:00').getTime()
    expect(findLiveOccurrence([lesson], new Date(end + LIVE_STALE_AFTER_MS))?.lessonId).toBe(5)
    expect(findLiveOccurrence([lesson], new Date(end + LIVE_STALE_AFTER_MS + 60000))).toBeNull()
  })

  it('урок без durationMinutes считается часовым и для срока «идёт»', () => {
    const noDuration = { lessonId: 9, lessonStatus: 'IN_PROGRESS', scheduledAt: '2026-08-09T17:00:00' }
    const end = new Date('2026-08-09T18:00:00').getTime()
    expect(findLiveOccurrence([noDuration], new Date(end + LIVE_STALE_AFTER_MS))?.lessonId).toBe(9)
    expect(findLiveOccurrence([noDuration], new Date(end + LIVE_STALE_AFTER_MS + 60000))).toBeNull()
  })
})

describe('pickFeaturedOccurrence', () => {
  const now = new Date('2026-08-10T12:00:00')

  it('идущий урок важнее ближайшего запланированного', () => {
    const list = [
      occ(1, 'SCHEDULED', '2026-08-10T18:00:00'),
      occ(49, 'IN_PROGRESS', '2026-08-10T11:00:00'),
    ]
    expect(pickFeaturedOccurrence(list, now)?.lessonId).toBe(49)
  })

  // Прод, 01.10.2026: ученик открывает «Уроки», а карточка ведёт в урок
  // 21 сентября — преподаватель не закрыл ни один урок, и самый старый
  // незакрытый перебивал сегодняшний.
  it('забытые незакрытые уроки не перебивают сегодняшний', () => {
    const list = [
      occ(21, 'IN_PROGRESS', '2026-09-21T17:30:00'),
      occ(24, 'PAUSED', '2026-09-24T17:30:00'),
      occ(28, 'IN_PROGRESS', '2026-09-28T17:30:00'),
      occ(1, 'SCHEDULED', '2026-10-01T17:30:00'),
      occ(5, 'SCHEDULED', '2026-10-05T17:30:00'),
    ]
    expect(pickFeaturedOccurrence(list, new Date('2026-10-01T12:00:00'))?.lessonId).toBe(1)
  })

  it('только забытый незакрытый урок — карточке показывать нечего', () => {
    const list = [occ(21, 'IN_PROGRESS', '2026-09-21T17:30:00')]
    expect(pickFeaturedOccurrence(list, new Date('2026-10-01T12:00:00'))).toBeNull()
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

  // Урок без длительности не должен пропадать из карточки в минуту начала —
  // ему даётся стандартный час, чтобы преподаватель успел открыть класс.
  it('урок без durationMinutes живёт в карточке ещё час после начала', () => {
    const noDuration = { lessonId: 9, lessonStatus: 'SCHEDULED', scheduledAt: '2026-08-10T11:30:00' }
    expect(pickFeaturedOccurrence([noDuration], now)?.lessonId).toBe(9)
    expect(pickFeaturedOccurrence([{ ...noDuration, scheduledAt: '2026-08-10T10:30:00' }], now)).toBeNull()
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
