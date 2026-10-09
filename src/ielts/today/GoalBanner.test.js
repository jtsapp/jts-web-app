import { describe, expect, it } from 'vitest'
import { goalState, sayKey } from './GoalBanner.jsx'
import { dayStatus, planWeek } from '../plan/planModel.js'

const journey = (over = {}) => ({
  baseline: { score: 5.5, source: 'diagnostic', date: '2026-09-12' },
  current: { score: 6.5, source: 'full_reading', date: '2026-10-05' },
  target: 7,
  checking: false,
  ...over,
})

describe('goalState — состояния блока цели (доска «Состояния даты и оценки»)', () => {
  it('без оценок — приглашение на диагностику, а не 0.0', () => {
    const s = goalState({ deadline: { state: 'upcoming', daysRemaining: 74 }, journey: { baseline: null, current: null, target: 7 } })
    expect(s.say.key).toBe('noScore')
    expect(s.base).toBeNull()
  })
  it('проверка идёт важнее даты; цель достигнута — по подтверждённой оценке', () => {
    expect(goalState({ deadline: { state: 'tomorrow' }, journey: journey({ checking: true }) }).say.key).toBe('checking')
    const r = goalState({ deadline: { state: 'upcoming' }, journey: journey({ current: { score: 7, source: 'full_reading', date: '2026-10-06' } }) })
    expect(r.reached).toBe(true)
    expect(r.say.key).toBe('reached')
  })
  it('даты: завтра, сегодня, не указана, прошла; иначе — разрыв до цели с навыком зоны роста', () => {
    expect(goalState({ deadline: { state: 'tomorrow' }, journey: journey() }).say.key).toBe('tomorrow')
    expect(goalState({ deadline: { state: 'today' }, journey: journey() }).say.key).toBe('today')
    expect(goalState({ deadline: { state: 'none' }, journey: journey() }).say.key).toBe('noDate')
    expect(goalState({ deadline: { state: 'passed' }, journey: journey() }).say.key).toBe('passed')
    const g = goalState({ deadline: { state: 'upcoming' }, journey: journey(), growthSkill: 'writing' })
    expect(g.say).toEqual({ key: 'gapSkill', vars: { gap: '0.5', skill: 'Writing' } })
  })
})

describe('план по дням', () => {
  const t = (id, date, status, origin = 'programme') => ({ id, date, status, origin, calendarWeek: 1, programmeWeek: 1, minutes: 15 })
  it('день: выполнен / текущий / пропущен / начат / запланирован / отдых', () => {
    expect(dayStatus([t(1, '2026-10-07', 'completed')], '2026-10-07', '2026-10-08')).toBe('done')
    expect(dayStatus([t(1, '2026-10-08', 'available')], '2026-10-08', '2026-10-08')).toBe('current')
    expect(dayStatus([t(1, '2026-10-07', 'available')], '2026-10-07', '2026-10-08')).toBe('missed')
    expect(dayStatus([t(1, '2026-10-09', 'completed'), t(2, '2026-10-09', 'planned')], '2026-10-09', '2026-10-08')).toBe('started')
    expect(dayStatus([t(1, '2026-10-10', 'planned')], '2026-10-10', '2026-10-08')).toBe('planned')
    expect(dayStatus([t(9, '2026-10-13', 'scheduled', 'weekly_control')], '2026-10-13', '2026-10-08')).toBe('rest')
  })
  it('неделя: «День 1…N» по датам с заданиями, контроль — отдельно', () => {
    const w = planWeek([t(1, '2026-10-08', 'available'), t(2, '2026-10-07', 'completed'), t(3, '2026-10-08', 'planned'), t(9, '2026-10-13', 'scheduled', 'weekly_control')], 1, '2026-10-08')
    expect(w.days.map((d) => [d.n, d.date, d.status])).toEqual([[1, '2026-10-07', 'done'], [2, '2026-10-08', 'current']])
    expect(w.control.id).toBe(9)
    expect(w.done).toBe(false)
  })
})

describe('sayKey', () => {
  it('берёт одну из формулировок состояния, у состояния без вариантов — основную', () => {
    expect(sayKey('gap', 0)).toBe('ieltsGoal.say.gap')
    expect(sayKey('gap', 0.5)).toBe('ieltsGoal.say.gap.2')
    expect(sayKey('gap', 0.99)).toBe('ieltsGoal.say.gap.3')
    expect(sayKey('today', 0.99)).toBe('ieltsGoal.say.today.2')
    expect(sayKey('passed', 0.99)).toBe('ieltsGoal.say.passed')
  })
})
