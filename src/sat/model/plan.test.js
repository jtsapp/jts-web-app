import { describe, expect, it } from 'vitest'
import {
  bands, monthGrid, nextLesson, shownStatus,
} from './plan.js'

describe('SAT plan model', () => {
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

  it('следующее занятие и статусы', () => {
    const next = nextLesson(plan, '2026-09-29')
    expect(next.id).toBe('b')
    expect(shownStatus(plan.weeks[0].lessons[0], next)).toBe('done')
    expect(shownStatus(plan.weeks[0].lessons[1], next)).toBe('next')
    expect(shownStatus(plan.weeks[0].lessons[2], next)).toBe('moved')
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
