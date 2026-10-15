import { describe, expect, it } from 'vitest'
import {
  bands, horizonWeeks, intensity, monthGrid, nextLesson, parse, phaseForWeek, phaseRanges, progress, shownStatus, summarize,
} from './plan.js'

// Пример Figma 10–14 (тот же, что в SatPlannerTest бэкенда): вт 29 сен 2026, экзамен сб 5 дек, пн/ср/пт/сб по 60 минут
const TODAY = parse('2026-09-29')
const EXAM = '2026-12-05'

describe('SAT plan model', () => {
  it('сводка Figma 10 совпадает с правилами сервера', () => {
    expect(horizonWeeks(TODAY, EXAM)).toBe(10)
    expect(horizonWeeks(TODAY, null)).toBe(12)
    // 4 дня × 10 недель − прошедший понедельник − день экзамена
    expect(summarize(TODAY, EXAM, [1, 3, 5, 6], 60)).toEqual({ weeks: 10, lessons: 38, weekly: 240, intensity: 'standard' })
    expect(intensity(2, 60)).toBe('light')
    expect(intensity(5, 90)).toBe('intensive')
  })

  it('фазы по неделям Figma 13', () => {
    expect(Array.from({ length: 10 }, (_, i) => phaseForWeek(i, 10))).toEqual([2, 2, 3, 3, 3, 4, 4, 5, 5, 6])
    const plan = { weeks: Array.from({ length: 10 }, (_, i) => ({ index: i, phase: phaseForWeek(i, 10), lessons: [] })) }
    expect(phaseRanges(plan)).toEqual([
      { phase: 2, from: 1, to: 2 },
      { phase: 3, from: 3, to: 5 },
      { phase: 4, from: 6, to: 7 },
      { phase: 5, from: 8, to: 9 },
      { phase: 6, from: 10, to: 10 },
    ])
  })

  const plan = {
    weeks: [
      {
        index: 0,
        monday: '2026-09-28',
        phase: 2,
        lessons: [
          { id: 'a', date: '2026-09-28', status: 'done' },
          { id: 'b', date: '2026-09-30', status: 'planned' },
          { id: 'c', date: '2026-10-02', status: 'moved' },
        ],
      },
      { index: 1, monday: '2026-10-05', phase: 2, lessons: [{ id: 'd', date: '2026-10-05', status: 'planned' }] },
    ],
  }

  it('следующее занятие, статусы и прогресс', () => {
    const next = nextLesson(plan, '2026-09-29')
    expect(next.id).toBe('b')
    expect(shownStatus(plan.weeks[0].lessons[0], next)).toBe('done')
    expect(shownStatus(plan.weeks[0].lessons[1], next)).toBe('next')
    expect(shownStatus(plan.weeks[0].lessons[2], next)).toBe('moved')
    expect(progress(plan)).toEqual({ done: 1, total: 4, pct: 25 })
  })

  it('сетка октября 2026 начинается с понедельника 28 сентября и знает неделю плана', () => {
    const rows = monthGrid(plan, 2026, 9)
    expect(rows).toHaveLength(5)
    expect(rows[0].monday).toBe('2026-09-28')
    expect(rows[0].week.index).toBe(0)
    expect(rows[0].days[0]).toMatchObject({ day: 28, inMonth: false })
    expect(rows[0].days[2].lessons.map((l) => l.id)).toEqual(['b'])
    expect(rows[4].days[6]).toMatchObject({ date: '2026-11-01', inMonth: false })
  })

  it('полосы карты диагностики', () => {
    const b = bands([
      { id: 'rw.ii', band: 'strong', correct: 3, total: 3 },
      { id: 'rw.cs', band: 'weak', correct: 1, total: 3 },
      { id: 'm.alg', band: 'weak', correct: 0, total: 3 },
      { id: 'm.psda', band: 'shaky', correct: 2, total: 3 },
    ])
    expect(b.weak.map((d) => d.id)).toEqual(['m.alg', 'rw.cs'])
    expect(b.shaky.map((d) => d.id)).toEqual(['m.psda'])
    expect(b.strong.map((d) => d.id)).toEqual(['rw.ii'])
  })
})
