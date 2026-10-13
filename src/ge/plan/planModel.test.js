import { describe, it, expect } from 'vitest'
import {
  courseTitles, dayMinutes, dayStatus, minutesLabel, monthGrid, mondayOf, plateOf, roadWeek, shiftMonth, taskRoute, taskTitle,
  todayView, weekNumber,
} from './planModel.js'
import { openNodes } from './courseFrontier.js'
import { gePlanShape } from '../../api.js'

// Модель плана по дням на экране (спека 2026-10-13, секция 4): подписи, «Начать», тропа курса, «Сегодня» и даты видов.

const t = (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key)
const task = (id, date, extra = {}) => ({ id, date, kind: 'practice', module: 'ai_tutor', minutes: 15, got: 0, status: 'planned', overdue: false, ...extra })

describe('куда ведёт «Начать»', () => {
  it('по виду и разделу', () => {
    expect(taskRoute({ kind: 'course' }, 'B1')).toEqual({ to: 'course', payload: { level: 'B1' } })
    expect(taskRoute({ kind: 'live' })).toEqual({ to: 'lessons' })
    expect(taskRoute({ kind: 'homework' })).toEqual({ to: 'homework' })
    expect(taskRoute({ kind: 'practice', module: 'ai_tutor' })).toEqual({ to: 'tutor' })
    expect(taskRoute({ kind: 'practice', module: 'workbooks' }, 'B1')).toEqual({ to: 'workbook', payload: { level: 'b1' } })
    expect(taskRoute({ kind: 'practice', module: 'shadowing' })).toEqual({ to: 'practice', payload: { filter: 'shadowing' } })
    expect(taskRoute({ kind: 'practice', module: 'media_practice' })).toEqual({ to: 'practice', payload: { skill: 'reading' } })
    expect(taskRoute({ kind: 'practice', module: 'vocabulary_sr' })).toEqual({ to: 'vocab' })
  })
})

describe('подписи', () => {
  it('урок курса — по тропе, если она есть', () => {
    expect(taskTitle(t, { kind: 'course' }, 'Famous people')).toBe('gePlan.course.named:{"title":"Famous people"}')
    expect(taskTitle(t, { kind: 'course' })).toBe('gePlan.course')
    expect(taskTitle(t, { kind: 'homework', title: 'Unit 3' })).toBe('Unit 3')
    expect(taskTitle(t, { kind: 'practice', module: 'shadowing' })).toBe('gePlan.module.shadowing')
    expect(plateOf({ kind: 'practice', module: '???' })).toBe('media_practice')
  })

  it('минуты: начатая практика — «got / n», у ДЗ минут нет', () => {
    expect(minutesLabel(t, task(1, '2026-10-14', { got: 6, status: 'in_progress' }))).toBe('gePlan.minOf:{"got":"6","n":"15"}')
    expect(minutesLabel(t, task(1, '2026-10-14'))).toBe('gePlan.min:{"n":"15"}')
    expect(minutesLabel(t, { kind: 'homework', minutes: 0 })).toBe('')
  })

  it('k-я открытая задача курса получает k-й непройденный шаг тропы', () => {
    const trail = [{ code: 'L1', title: 'A' }, { code: 'L2', title: 'B' }, { code: 'T1', title: 'Test 1' }, { code: 'L3', title: 'C' }]
    const frontier = openNodes(trail, new Set(['L1']))
    expect(frontier.map((n) => n.code)).toEqual(['L2', 'T1', 'L3'])
    const tasks = [
      { id: 3, date: '2026-10-16', kind: 'course', status: 'planned' },
      { id: 1, date: '2026-10-12', kind: 'course', status: 'completed' },
      { id: 2, date: '2026-10-14', kind: 'course', status: 'available' },
    ]
    expect(courseTitles(tasks, frontier)).toEqual({ 2: 'B', 3: 'Test 1' })
    expect(courseTitles(tasks, [])).toEqual({})
  })
})

describe('«Сегодня»', () => {
  const today = '2026-10-14'
  it('просроченное этой недели и задачи дня', () => {
    const plan = {
      today,
      tasks: [
        task(9, '2026-10-09', { overdue: true, status: 'available' }), // прошлая неделя — не тащим
        task(1, '2026-10-12', { overdue: true, status: 'available' }),
        task(2, today),
        task(3, '2026-10-15'),
      ],
    }
    const v = todayView(plan)
    expect(v.tasks.map((x) => x.id)).toEqual([1, 2])
    expect(v.ahead).toEqual([])
  })

  it('всё сделано — «дальше по плану» из двух ближайших', () => {
    const plan = { today, tasks: [task(2, today, { status: 'completed' }), task(3, '2026-10-15'), task(4, '2026-10-16'), task(5, '2026-10-19')] }
    const v = todayView(plan)
    expect(v.tasks.map((x) => x.id)).toEqual([2])
    expect(v.ahead.map((x) => x.id)).toEqual([3, 4])
  })
})

describe('даты и дни', () => {
  it('недели — календарные, с понедельника', () => {
    expect(mondayOf('2026-10-18')).toBe('2026-10-12')
    expect(mondayOf('2026-10-12')).toBe('2026-10-12')
    expect(weekNumber('2026-10-19', '2026-10-14')).toBe(2)
    expect(weekNumber('2026-10-12', '2026-10-14')).toBe(1)
  })

  it('сетка месяца и сдвиг', () => {
    const g = monthGrid('2026-10-14')
    expect(g).toHaveLength(42)
    expect(g[0]).toEqual({ date: '2026-09-28', inMonth: false })
    expect(g.find((d) => d.date === '2026-10-01').inMonth).toBe(true)
    expect(shiftMonth('2026-12-05', 1)).toBe('2027-01-01')
  })

  it('состояние дня и минуты', () => {
    expect(dayStatus([], '2026-10-14', '2026-10-14')).toBe('rest')
    expect(dayStatus([task(1, 'x', { status: 'completed' })], '2026-10-13', '2026-10-14')).toBe('done')
    expect(dayStatus([task(1, 'x')], '2026-10-14', '2026-10-14')).toBe('current')
    expect(dayStatus([task(1, 'x')], '2026-10-13', '2026-10-14')).toBe('missed')
    expect(dayMinutes([task(1, 'x', { minutes: 15 }), task(2, 'x', { minutes: 20 }), task(3, 'x', { status: 'completed' })])).toBe(35)
  })

  it('роадмап недели — только дни с задачами, по порядку', () => {
    const w = roadWeek([task(1, '2026-10-14'), task(2, '2026-10-12', { status: 'completed' })], '2026-10-12', '2026-10-14')
    expect(w.days.map((d) => [d.n, d.date, d.status])).toEqual([[1, '2026-10-12', 'done'], [2, '2026-10-14', 'current']])
    expect(w.done).toBe(false)
  })
})

describe('gePlanShape', () => {
  it('заглушка {} и старый бэкенд — не план', () => {
    expect(gePlanShape({})).toBe(null)
    expect(gePlanShape(null)).toBe(null)
    expect(gePlanShape({ state: 'ready', tasks: [] })).toEqual({ state: 'ready', tasks: [] })
  })
})
