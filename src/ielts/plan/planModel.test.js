import { describe, expect, it } from 'vitest'
import { addDays, byDate, groupWeeks, monthGrid, shiftMonth, statusTone, subLabel, taskLabel, taskRoute } from './planModel.js'

const t = (key, vars = {}) => key + (Object.keys(vars).length ? JSON.stringify(vars) : '')

describe('planModel', () => {
  it('ведёт задачу в её место раздела, словарь — в общий словарь, контроль — по виду', () => {
    expect(taskRoute({ kind: 'type', sub: 'tfng' })).toEqual({ tab: 'learn', view: 'types' })
    expect(taskRoute({ kind: 't2' })).toEqual({ tab: 'learn', view: 'writing-task2' })
    expect(taskRoute({ kind: 'vocab' })).toEqual({ screen: 'vocab' })
    expect(taskRoute({ kind: 'control', origin: 'weekly_control', control: 'final' })).toEqual({ tab: 'mocks' })
    expect(taskRoute({ kind: 'control', origin: 'weekly_control', control: 'weekly' })).toEqual({ tab: 'learn', view: 'texts' })
  })

  it('подписывает задачу секцией и видом, контроль — его видом', () => {
    expect(taskLabel(t, { sec: 'reading', kind: 'type', sub: 'matching_headings', n: 2 })).toBe('Reading · ieltsPlan.item.type{"sub":"Matching headings","n":"2"}')
    expect(taskLabel(t, { sec: 'control', kind: 'control', origin: 'weekly_control', control: 'month' })).toBe('ieltsPlan.control.month')
  })

  it('называет подвиды программы словами, а не кодами прототипа', () => {
    const tr = (key) => (key === 'ieltsReading.drill.ng.name' ? 'Отличить NOT GIVEN от FALSE' : key)
    expect(subLabel(tr, { kind: 'guide', sub: 't1ac.map' })).toBe('Task 1 Academic · Map')
    expect(subLabel(tr, { kind: 'guide', sub: 't2Lex.hedging' })).toBe('Task 2 language · Hedging')
    expect(subLabel(tr, { kind: 'drill', sub: 'ng' })).toBe('Отличить NOT GIVEN от FALSE')
    expect(subLabel(tr, { kind: 'type', sub: 'ynng' })).toBe('Yes / No / Not Given')
    expect(subLabel(tr, { kind: 't1', sub: 'bar/semi_formal' })).toBe('Bar chart · Semi-formal letter')
    expect(subLabel(tr, { kind: 't2', sub: 'problem_solution' })).toBe('Problem–solution')
    expect(subLabel(tr, { kind: 'vocab', sub: 'awl-3' })).toBe('AWL 3')
    expect(subLabel(tr, { kind: 'pm' })).toBe('')
  })

  it('группирует по неделям плана: контроль недели — отдельно, выполнение — по задачам', () => {
    const tasks = [
      { id: 1, calendarWeek: 1, date: '2026-10-07', origin: 'programme', status: 'completed' },
      { id: 2, calendarWeek: 1, date: '2026-10-09', origin: 'programme', status: 'available' },
      { id: 3, calendarWeek: 1, date: '2026-10-12', origin: 'weekly_control', status: 'scheduled' },
      { id: 4, calendarWeek: 2, date: '2026-10-14', origin: 'programme', status: 'planned' },
    ]
    const w = groupWeeks(tasks)
    expect(w.map((x) => [x.n, x.done, x.total, x.control?.id ?? null])).toEqual([[1, 1, 2, 3], [2, 0, 1, null]])
    expect(Object.keys(byDate(tasks))).toEqual(['2026-10-07', '2026-10-09', '2026-10-12', '2026-10-14'])
  })

  it('даты — календарные, без сдвига на переходе времени', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(shiftMonth('2026-12-15', 1)).toBe('2027-01-01')
    const g = monthGrid('2026-10-07')
    expect(g).toHaveLength(42)
    expect(g[0].date).toBe('2026-09-28')   // понедельник перед 1 октября
    expect(g.filter((x) => x.inMonth)).toHaveLength(31)
  })

  it('статус подписан и словом, тон — только подсказка', () => {
    expect(statusTone('completed')).toBe('green')
    expect(statusTone('available', true)).toBe('orange')
    expect(statusTone('planned')).toBe('muted')
  })
})
