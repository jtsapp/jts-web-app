import { describe, it, expect } from 'vitest'
import {
  gridRows, toUtcSlot, localOf, schoolDay, schoolDaysCount, teachersFitting, fitSlotsOf, bestCells, slotKey,
  zoneOffsetMin, hhmm, schoolTimeToDate, slotLabel, nextOccurrence, sortSlots,
} from './slots.js'

const at = new Date('2026-10-26T10:00:00Z')

describe('slots', () => {
  it('grid rows: hourly for 60, half-hourly for 30, 07:00–22:00', () => {
    expect(gridRows(60)[0]).toBe(420)
    expect(gridRows(60).at(-1)).toBe(1320)
    expect(gridRows(60)).toHaveLength(16)
    expect(gridRows(30)).toHaveLength(31)
    expect(hhmm(gridRows(30)[1])).toBe('07:30')
  })

  it('reads zone offsets', () => {
    expect(zoneOffsetMin('Asia/Almaty', at)).toBe(300)
    expect(zoneOffsetMin('Europe/Moscow', at)).toBe(180)
    expect(zoneOffsetMin('UTC', at)).toBe(0)
  })

  it('converts day and time together across midnight', () => {
    expect(toUtcSlot(1, 7 * 60, 'Asia/Seoul', at)).toEqual({ weekday: 7, start: '22:00:00' })
    expect(toUtcSlot(1, 19 * 60, 'Europe/Moscow', at)).toEqual({ weekday: 1, start: '16:00:00' })
    expect(toUtcSlot(7, 23 * 60 + 30, 'UTC', at)).toEqual({ weekday: 7, start: '23:30:00' })
    expect(localOf({ weekday: 7, start: '22:00:00' }, 'Asia/Seoul', at)).toEqual({ day: 1, minutes: 420 })
    expect(localOf(toUtcSlot(3, 600, 'Asia/Almaty', at), 'Asia/Almaty', at)).toEqual({ day: 3, minutes: 600 })
  })

  it('counts different days by the school (Almaty) day', () => {
    expect(schoolDay({ weekday: 1, start: '20:00:00' })).toBe(2)
    expect(schoolDay({ weekday: 7, start: '20:00:00' })).toBe(1)
    expect(schoolDaysCount([{ weekday: 1, start: '14:00:00' }, { weekday: 1, start: '15:00:00' }])).toBe(1)
    expect(schoolDaysCount([{ weekday: 1, start: '14:00:00' }, { weekday: 2, start: '15:00:00' }])).toBe(2)
  })

  it('teachersFitting needs N school days of picked slots', () => {
    const cells = [
      { weekday: 1, start: '14:00:00', teacherIds: [3, 4] },
      { weekday: 3, start: '14:00:00', teacherIds: [3] },
      { weekday: 5, start: '14:00:00', teacherIds: [4, 5, 6] },
    ]
    const picked = cells.slice(0, 2).map(slotKey)
    expect(teachersFitting(cells, picked, 2)).toEqual([3])
    expect(teachersFitting(cells, picked, 1)).toEqual([3, 4])
    expect(fitSlotsOf(cells, 3, picked)).toHaveLength(2)
    expect(bestCells(cells, [], 2)).toEqual(['5-14:00', '1-14:00'])
    expect(bestCells(cells, ['5-14:00'], 1)).toEqual(['1-14:00'])
  })

  it('reads school LocalDateTime as UTC+5', () => {
    expect(schoolTimeToDate('2026-10-27T15:00:00').toISOString()).toBe('2026-10-27T10:00:00.000Z')
    expect(schoolTimeToDate('2026-10-27T15:00:00.123456').toISOString()).toBe('2026-10-27T10:00:00.000Z')
    expect(schoolTimeToDate(null)).toBeNull()
  })

  it('labels a slot in the student zone and language', () => {
    expect(slotLabel({ weekday: 1, start: '14:00:00' }, 'Asia/Almaty', 'ru', at)).toBe('Пн 19:00')
    expect(slotLabel({ weekday: 1, start: '14:00:00' }, 'Asia/Almaty', 'en', at)).toBe('Mon 19:00')
  })

  it('sorts slots by local week time and finds the first lesson ≥ 24 h ahead', () => {
    const s = [{ weekday: 3, start: '14:00:00' }, { weekday: 1, start: '14:00:00' }]
    expect(sortSlots(s, 'Asia/Almaty', at).map(slotKey)).toEqual(['1-14:00', '3-14:00'])
    // пн 26.10 10:00 UTC: понедельник 14:00 UTC наступит через 4 ч — раньше суток, значит ближайший — среда
    expect(nextOccurrence(s, at).toISOString()).toBe('2026-10-28T14:00:00.000Z')
  })
})
