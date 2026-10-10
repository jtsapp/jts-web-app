import { describe, it, expect } from 'vitest'
import {
  roundBand,
  overallBand,
  bandGap,
  formatBand,
  xpLevel,
  groupNumber,
  daysUntil,
  planSummary,
  recommendedTaskId,
  phaseStartDates,
  roadmapView,
} from './dashboard.js'

describe('roundBand — правило округления §17.3 на все остатки', () => {
  it.each([
    [6.0, 6.0],
    [6.125, 6.0],
    [6.25, 6.5],
    [6.375, 6.5],
    [6.5, 6.5],
    [6.625, 6.5],
    [6.75, 7.0],
    [6.875, 7.0],
  ])('%s → %s', (x, want) => expect(roundBand(x)).toBe(want))

  it('пример из ТЗ: 6.5 + 6.5 + 5.0 + 7.0 → 6.5', () => {
    expect(overallBand(null, { listening: 6.5, reading: 6.5, writing: 5, speaking: 7 })).toBe(6.5)
  })
})

describe('overallBand', () => {
  it('готовый overall важнее расчёта', () => {
    expect(overallBand(6, { listening: 6.5, reading: 6 })).toBe(6)
  })
  it('без overall считает по измеренным секциям, пропуская null', () => {
    expect(overallBand(null, { listening: 6.5, reading: 6, writing: null, speaking: null })).toBe(6.5)
  })
  it('ничего не измерено — null, а не 0', () => {
    expect(overallBand(null, {})).toBeNull()
    expect(overallBand(null, null)).toBeNull()
  })
})

describe('мелкие форматтеры', () => {
  it('bandGap не уходит в минус и терпит null', () => {
    expect(bandGap(6, 7)).toBe(1)
    expect(bandGap(7.5, 7)).toBe(0)
    expect(bandGap(null, 7)).toBeNull()
  })
  it('formatBand', () => {
    expect(formatBand(6)).toBe('6.0')
    expect(formatBand(null)).toBe('—')
  })
  it('xpLevel: 1000 XP на уровень, уровень бэкенда главнее', () => {
    expect(xpLevel(1240)).toBe(2)
    expect(xpLevel(1240, 4)).toBe(4)
    expect(xpLevel(null)).toBeNull()
  })
  it('groupNumber', () => {
    expect(groupNumber(1240)).toBe('1 240')
  })
})

describe('daysUntil считает календарные дни', () => {
  it('время суток не влияет', () => {
    expect(daysUntil('2026-12-12', new Date(2026, 8, 28, 23, 59))).toBe(75)
    expect(daysUntil('2026-12-12', new Date(2026, 8, 28, 0, 1))).toBe(75)
  })
  it('без даты — null', () => expect(daysUntil(null)).toBeNull())
})

describe('план дня', () => {
  const tasks = [
    { id: 'a', minutes: 15, done: true },
    { id: 'b', minutes: 15 },
    { id: 'c', minutes: 40 },
  ]
  it('planSummary', () => {
    expect(planSummary(tasks)).toEqual({ done: 1, count: 3, totalMinutes: 70, leftMinutes: 55 })
  })
  it('рекомендация — первая незакрытая, если явной нет', () => {
    expect(recommendedTaskId(tasks)).toBe('b')
    expect(recommendedTaskId([...tasks.slice(0, 2), { id: 'c', minutes: 1, recommended: true }])).toBe('c')
    expect(recommendedTaskId([{ id: 'x', done: true }])).toBeNull()
  })
})

describe('roadmap', () => {
  it('12 недель делятся 2/4/3/3', () => {
    const start = new Date(2026, 0, 1)
    const starts = phaseStartDates(start, new Date(2026, 0, 1 + 84))
    expect(starts.map((d) => daysUntil(d, start))).toEqual([0, 14, 42, 63])
  })
  it('без даты экзамена — фазы без дат', () => {
    expect(phaseStartDates(new Date(), null)).toBeNull()
    expect(roadmapView(null).every((p) => p.eta === null)).toBe(true)
  })
  it('статусы фаз от текущей', () => {
    expect(roadmapView({ currentPhase: 2 }).map((p) => p.status)).toEqual(['done', 'current', 'upcoming', 'upcoming'])
    expect(roadmapView(null)[0].status).toBe('current')
  })
})
