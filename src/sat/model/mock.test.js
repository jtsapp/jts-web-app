import { describe, expect, it } from 'vitest'
import { TOTAL_MINUTES, clock, deltas, hoursMinutes, moduleNo, onScale, reviewList, shortClock, trajectory } from './mock.js'

const t = (k, v = {}) => (k === 'sat.mock.hm' ? `${v.h} ч ${v.m} мин` : k === 'sat.mock.h' ? `${v.h} ч` : `${v.m} мин`)

describe('mock model', () => {
  it('exam form is 2 h 24 min with the break, as Figma 16 says', () => {
    expect(TOTAL_MINUTES).toBe(144)
    expect(hoursMinutes(t, TOTAL_MINUTES)).toBe('2 ч 24 мин')
    expect(hoursMinutes(t, 45)).toBe('45 мин')
    expect(hoursMinutes(t, 60)).toBe('1 ч')
  })

  it('clocks', () => {
    expect(clock(552)).toBe('09:12')
    expect(shortClock(108)).toBe('1:48')
    expect(moduleNo('rw2')).toBe(2)
  })

  it('delta compares the middle of the ranges with the previous run', () => {
    const runs = [
      { total: { low: 1150, high: 1230 } },
      { total: { low: 1090, high: 1170 } },
      { total: null },
    ]
    expect(deltas(runs)).toEqual([60, null, null])
  })

  it('trajectory scale covers ranges and the target in hundreds, oldest first', () => {
    const runs = [
      { id: 'b', finishedAt: '2026-09-12', total: { low: 1150, high: 1230 } },
      { id: 'a', finishedAt: '2026-08-24', total: { low: 1100, high: 1180 } },
    ]
    const tr = trajectory(runs, 1350)
    expect(tr.lo).toBe(1000)
    expect(tr.hi).toBe(1400)
    expect(tr.ticks).toEqual([1000, 1100, 1200, 1300, 1400])
    expect(tr.points.map((p) => p.id)).toEqual(['a', 'b'])
    expect(trajectory([], null)).toBeNull()
    const wide = trajectory([{ id: 'c', finishedAt: '2026-10-05', total: { low: 430, high: 580 } }], 1500)
    expect(wide.ticks).toEqual([400, 600, 800, 1000, 1200, 1400, 1600])
    const odd = trajectory([{ id: 'd', finishedAt: '2026-10-05', total: { low: 700, high: 780 } }], 1500)
    expect(odd.ticks).toEqual([600, 800, 1000, 1200, 1400, 1600])
  })

  it('scale position', () => {
    expect(onScale(400)).toBe(0)
    expect(onScale(1000)).toBe(50)
    expect(onScale(1700)).toBe(100)
  })

  it('review filter keeps the exam order and counts blanks as wrong', () => {
    const modules = [
      { key: 'rw1', items: [{ id: 1, correct: true }, { id: 2, correct: false, given: 'A' }, { id: 3, correct: false, marked: true }] },
      { key: 'rw2', items: [{ id: 4, correct: true, marked: true }] },
    ]
    expect(reviewList(modules, 'all').map((x) => x.item.id)).toEqual([1, 2, 3, 4])
    expect(reviewList(modules, 'wrong').map((x) => x.item.id)).toEqual([2, 3])
    expect(reviewList(modules, 'marked').map((x) => x.item.id)).toEqual([3, 4])
    // «Без ответа» (Figma 29): пустой ответ, а не просто неверный
    expect(reviewList(modules, 'blank').map((x) => x.item.id)).toEqual([3])
  })
})
