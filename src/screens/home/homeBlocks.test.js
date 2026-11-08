import { describe, it, expect } from 'vitest'
import { courseStep, dayProgress, homeFormat, nextCourseTest, teacherHomework, teacherPlanToday, weekDays } from './homeBlocks.js'

const NOW = new Date(2026, 10, 7, 12, 0) // суббота, 7 ноября 2026

describe('homeFormat — какой блок справа', () => {
  it('формат из абонемента — как у меню и Луны', () => {
    expect(homeFormat({ sections: { known: true, format: 'GROUP' } })).toBe('teacher')
    expect(homeFormat({ sections: { known: true, format: 'SELF' } })).toBe('self')
    expect(homeFormat({ demo: true, sections: { known: true, format: 'GROUP' } })).toBe('demo')
  })
  it('без абонемента решают данные; пока меню грузится — не решаем', () => {
    expect(homeFormat({ sections: { status: 'loading' } })).toBeNull()
    expect(homeFormat({ sections: { status: 'error' }, homework: [{ id: 1 }] })).toBe('teacher')
    expect(homeFormat({ sections: { status: 'ready', known: false } })).toBe('self')
  })
})

describe('weekDays — полоса недели', () => {
  it('семь дней от сегодня, отменённые уроки точку не ставят', () => {
    const days = weekDays(
      [
        { lessonId: 1, scheduledAt: '2026-11-09T18:00:00', lessonStatus: 'SCHEDULED' },
        { lessonId: 2, scheduledAt: '2026-11-10T18:00:00', lessonStatus: 'CANCELLED' },
      ],
      NOW,
    )
    expect(days).toHaveLength(7)
    expect(days[0].today).toBe(true)
    expect(days[0].key).toBe('2026-11-07')
    expect(days.filter((d) => d.lessons.length).map((d) => d.key)).toEqual(['2026-11-09'])
  })
})

describe('teacherHomework — домашка от преподавателя', () => {
  it('сначала ждущее ученика, потом на проверке, потом проверенное; не больше трёх', () => {
    const rows = teacherHomework(
      [
        { id: 1, title: 'Проверена', status: 'COMPLETED', grade: 5 },
        { id: 2, title: 'На проверке', status: 'SUBMITTED' },
        { id: 3, title: 'Задана', status: 'ASSIGNED', dueDate: '2026-11-12' },
        { id: 4, title: 'Просрочена', status: 'ASSIGNED', dueDate: '2026-10-01' },
        { id: 5, title: 'Закрыта без сдачи', status: 'COMPLETED', closedWithoutSubmission: true },
      ],
      NOW,
    )
    expect(rows.map((r) => [r.title, r.tone, r.canOpen])).toEqual([
      ['Просрочена', 'late', true],
      ['Задана', 'todo', true],
      ['На проверке', 'check', false],
    ])
  })
  it('сданные и проверенные — свежие первыми', () => {
    const rows = teacherHomework(
      [
        { id: 1, title: 'Старая', status: 'SUBMITTED', submittedAt: '2026-10-01T10:00:00' },
        { id: 2, title: 'Свежая', status: 'SUBMITTED', submittedAt: '2026-11-05T10:00:00' },
        { id: 3, title: 'Проверена', status: 'COMPLETED', reviewedAt: '2026-11-06T10:00:00' },
      ],
      NOW,
    )
    expect(rows.map((r) => r.title)).toEqual(['Свежая', 'Старая', 'Проверена'])
  })
  it('проверенная — зелёным, когда ждущих нет', () => {
    const rows = teacherHomework([{ id: 1, title: 'A', status: 'COMPLETED', grade: 4 }], NOW)
    expect(rows[0].tone).toBe('ok')
    expect(rows[0].canOpen).toBe(false)
  })
})

describe('courseStep — «урок N из M»', () => {
  const trail = [
    { code: 'L1', kind: 'lesson' },
    { code: 'L2', kind: 'lesson' },
    { code: 'T1', kind: 'test' },
    { code: 'L3', kind: 'lesson' },
  ]
  it('первый непройденный урок, тесты не считаются', () => {
    expect(courseStep(trail, ['L1'])).toEqual({ n: 2, total: 3, allDone: false })
    expect(courseStep(trail, new Set())).toEqual({ n: 1, total: 3, allDone: false })
  })
  it('всё пройдено — allDone; тропы нет — null', () => {
    expect(courseStep(trail, ['L1', 'L2', 'L3'])).toEqual({ n: 3, total: 3, allDone: true })
    expect(courseStep([], [])).toBeNull()
  })
  it('ближайший тест — после какого урока и можно ли сейчас', () => {
    expect(nextCourseTest(trail, ['L1'])).toMatchObject({ node: { code: 'T1' }, afterLesson: 2, ready: false })
    expect(nextCourseTest(trail, ['L1', 'L2'])).toMatchObject({ afterLesson: 2, ready: true })
    expect(nextCourseTest(trail, ['L1', 'L2', 'T1', 'L3'])).toBeNull()
  })
})

describe('план дня', () => {
  const plan = {
    state: 'ready',
    today: '2026-11-07',
    tasks: [
      { id: 1, kind: 'course', date: '2026-11-07', minutes: 30, status: 'completed' },
      { id: 2, kind: 'practice', date: '2026-11-07', minutes: 15, got: 6, status: 'in_progress' },
      { id: 3, kind: 'live', date: '2026-11-07', minutes: 60, status: 'planned' },
      { id: 4, kind: 'practice', origin: 'teacher', date: '2026-11-07', minutes: 10, status: 'planned' },
      { id: 5, kind: 'practice', origin: 'teacher', date: '2026-11-08', minutes: 10, status: 'planned' },
    ],
  }
  it('минуты дня — по своим задачам: сделанные целиком, начатые набранным', () => {
    expect(dayProgress(plan)).toEqual({ done: 36, total: 45, allDone: false })
    expect(dayProgress({ ...plan, tasks: [] })).toBeNull()
    expect(dayProgress(null)).toBeNull()
  })
  it('задачи преподавателя на сегодня считаются отдельно', () => {
    expect(teacherPlanToday(plan)).toBe(1)
  })
})
