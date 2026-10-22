import { describe, expect, it } from 'vitest'
import { ROAD_LENGTH, nextGroupLesson, nodeAt, phaseLessons, roadPoint, scheduleAsPlan } from './roadmap.js'

const roadmap = {
  phases: [
    { n: 1, key: 'diagnostic', lessonFrom: null },
    { n: 2, key: 'foundations1', lessonFrom: 1, lessonTo: 12 },
    { n: 4, key: 'foundations2', lessonFrom: 13, lessonTo: 24 },
  ],
}

const lesson = (id, number, week, startsAt, status, next = false) => ({
  id, number, week, section: number % 2 ? 'RW' : 'MATH', topic: `T${number}`, skillIds: ['rw.cs.words-in-context'],
  startsAt, status, next,
})

describe('roadmap SAT', () => {
  it('занятия группы раскладываются по неделям курса с фазой и статусом студента', () => {
    const plan = scheduleAsPlan({
      lessons: [
        lesson(1, 1, 1, '2026-11-02T19:00:00+05:00', 'DONE'),
        lesson(2, 2, 1, '2026-11-04T19:00:00+05:00', 'MISSED'),
        lesson(14, 13, 5, '2026-11-30T19:00:00+05:00', 'PLANNED', true),
      ],
    }, roadmap, '2027-03-13')

    expect(plan.weeks.map((w) => [w.index, w.monday, w.phase])).toEqual([[0, '2026-11-02', 2], [4, '2026-11-30', 4]])
    expect(plan.weeks[0].lessons.map((l) => l.status)).toEqual(['done', 'skipped'])
    expect(plan.weeks[0].lessons[0].time).toBe('19:00')
    expect(nextGroupLesson(plan).number).toBe(13)
    expect(plan.examDate).toBe('2027-03-13')
  })

  it('дата занятия берётся по Алматы, а не в поясе браузера', () => {
    const plan = scheduleAsPlan({ lessons: [lesson(1, 1, 1, '2026-11-02T23:30:00+05:00', 'PLANNED')] }, roadmap)
    expect(plan.weeks[0].lessons[0].date).toBe('2026-11-02')
  })

  it('пройдено в фазе — только отмеченные преподавателем, пропуск не в счёт', () => {
    const r = phaseLessons(roadmap.phases[1], { lessons: [lesson(1, 1, 1, 'x', 'DONE'), lesson(2, 2, 1, 'x', 'MISSED')] })
    expect(r).toEqual({ done: 1, total: 12 })
    expect(phaseLessons(roadmap.phases[0], { lessons: [] })).toBeNull()
  })

  it('узлы дороги от старта до финиша при любом числе фаз', () => {
    expect(roadPoint(nodeAt(0, 7))).toEqual({ x: 103, y: 310 })
    expect(roadPoint(nodeAt(6, 7))).toEqual({ x: 943, y: 70 })
    const mid = roadPoint(ROAD_LENGTH / 2)
    expect(mid.y).toBe(190)
  })
})
