import { describe, expect, it } from 'vitest'
import { addDays, byDate, groupWeeks, monthGrid, shiftMonth, statusTone, recommendTask, subLabel, taskLabel, taskRoute } from './planModel.js'

const t = (key, vars = {}) => key + (Object.keys(vars).length ? JSON.stringify(vars) : '')

describe('planModel', () => {
  it('советы при пустом плане ведут в mock и полные тесты', () => {
    expect(taskRoute(recommendTask({ key: 'mock' }))).toEqual({ tab: 'mocks' })
    expect(taskRoute(recommendTask({ key: 'reading-full', sec: 'reading' }))).toEqual({ tab: 'learn', view: 'reading-full' })
    expect(taskRoute(recommendTask({ key: 'listening-full', sec: 'listening' }))).toEqual({ tab: 'learn', view: 'listening-full' })
  })

  it('ведёт задачу в её место раздела, словарь — в общий словарь, контроль — по виду', () => {
    expect(taskRoute({ kind: 'weak' })).toEqual({ tab: 'learn', view: 'types' })
    expect(taskRoute({ kind: 't2' })).toEqual({ tab: 'learn', view: 'writing-task2' })
    expect(taskRoute({ kind: 'vocab' })).toEqual({ screen: 'vocab' })
    expect(taskRoute({ kind: 'control', origin: 'weekly_control', control: 'final' })).toEqual({ tab: 'mocks' })
    expect(taskRoute({ kind: 'control', origin: 'weekly_control', control: 'weekly' })).toEqual({ tab: 'learn', view: 'texts' })
  })

  // «Reading · TFNG» на «Сегодня» открывал страницу всех типов Reading: задача с подвидом ведёт в свой набор
  it('задача с подвидом ведёт в свой набор, главу или задание, а не в общий список раздела', () => {
    const list = (key) => ({ tab: 'learn', view: 'practice-list', list: key })
    expect(taskRoute({ kind: 'type', sub: 'tfng' })).toEqual(list('reading:types:tfng'))
    expect(taskRoute({ kind: 'demo', sub: 'matching_headings' })).toEqual(list('reading:types:matching_headings'))
    expect(taskRoute({ kind: 'mini', sub: 'tfng' })).toEqual(list('reading:types:tfng'))
    expect(taskRoute({ kind: 'drill', sub: 'ng' })).toEqual(list('reading:drill:ng'))
    expect(taskRoute({ kind: 't2', sub: 'opinion' })).toEqual(list('writing:task2:opinion'))
    expect(taskRoute({ kind: 'pair', sub: 'discussion', extra: { ac: 'line', gt: 'formal' } })).toEqual(list('writing:task2:discussion'))
    expect(taskRoute({ kind: 'p2', sub: 'person' })).toEqual(list('speaking:part2:person'))
    expect(taskRoute({ kind: 'guide', sub: 't1ac.line' })).toEqual({ tab: 'learn', view: 'writing-guide', section: 't1ac.line' })
    expect(taskRoute({ kind: 'sg', sub: 'p2' })).toEqual({ tab: 'learn', view: 'speaking-guide', section: 'p2' })
    expect(taskRoute({ kind: 'sh', sub: 'SH-02' })).toEqual({ tab: 'learn', view: 'speaking-shadowing', testId: 'SH-02' })
    // «полный Reading» — полные тесты Reading, а не полный mock всех секций; текст на время — список текстов
    expect(taskRoute({ kind: 'full', n: 1 })).toEqual({ tab: 'learn', view: 'reading-full' })
    expect(taskRoute({ kind: 'pm', n: 1 })).toEqual({ tab: 'learn', view: 'texts' })
    expect(taskRoute({ kind: 'fmt' })).toEqual({ tab: 'info' })
  })

  // «Идеи для эссе» — короткое упражнение, а не глава гида; дрилл банка, выбранный преподавателем, — сразу сам дрилл
  it('короткие тренировки Writing: «идеи для эссе» и дрилл преподавателя ведут в дриллы Writing', () => {
    expect(taskRoute({ kind: 'ideas', sec: 'writing' })).toEqual({ tab: 'learn', view: 'writing-drills' })
    const teacher = { origin: 'teacher', sec: 'writing', extra: { testId: 'WD-001', testKind: 'drill' } }
    expect(taskRoute(teacher)).toEqual({ tab: 'learn', view: 'writing-drills', testId: 'WD-001' })
    expect(taskRoute({ ...teacher, extra: { testId: 'W2-001', testKind: 'task2' } })).toEqual({ tab: 'learn', view: 'writing-task2', testId: 'W2-001' })
  })

  it('Task 1 ведёт к заданиям своего трека: письма у General Training, графики у Academic', () => {
    const task = { kind: 't1', sub: 'line', extra: { gt: 'informal', timed: false } }
    expect(taskRoute(task, 'academic')).toEqual({ tab: 'learn', view: 'practice-list', list: 'writing:task1:line' })
    expect(taskRoute(task, 'general')).toEqual({ tab: 'learn', view: 'practice-list', list: 'writing:task1:informal' })
  })

  // замечание владельца 10: задача программы «на время» (t2:opinion:timed) — mock этого типа, а не список заданий
  it('Writing «на время» ведёт в mock своего типа и трека; без timed — прежний список вида', () => {
    const mock = (key) => ({ tab: 'learn', view: 'writing-mock', list: key })
    expect(taskRoute({ kind: 't2', sub: 'opinion', extra: { timed: true } }, 'academic')).toEqual(mock('task2:opinion'))
    expect(taskRoute({ kind: 't2', sub: 'opinion', extra: { timed: false } }, 'academic')).toEqual({ tab: 'learn', view: 'practice-list', list: 'writing:task2:opinion' })
    const t1 = { kind: 't1', sub: 'bar', extra: { gt: 'formal', timed: true } }
    expect(taskRoute(t1, 'academic')).toEqual(mock('task1:bar'))
    expect(taskRoute(t1, 'general')).toEqual(mock('task1:formal'))
    // письма в задаче нет — у General Training графика не бывает: прежний список, а не mock чужого типа
    expect(taskRoute({ kind: 't1', sub: 'bar', extra: { gt: '', timed: true } }, 'general')).toEqual({ tab: 'learn', view: 'practice-list', list: 'writing:task1:bar' })
  })

  it('подпись Task 1, пары и текста на время — по треку ученика', () => {
    const tr = (key, vars = {}) => (vars.sub != null ? `${key}:${vars.sub}` : key)
    const t1 = { sec: 'writing', kind: 't1', sub: 'line', n: 1, extra: { gt: 'informal' } }
    expect(taskLabel(tr, t1, 'academic')).toBe('Writing · ieltsPlan.item.t1:Line graph')
    expect(taskLabel(tr, t1, 'general')).toBe('Writing · ieltsPlan.item.t1:Informal letter')
    const pair = { sec: 'writing', kind: 'pair', sub: 'opinion', n: 1, extra: { ac: 'bar', gt: 'formal' } }
    expect(subLabel(tr, pair, 'academic')).toBe('Opinion · Bar chart')
    expect(subLabel(tr, pair, 'general')).toBe('Opinion · Formal letter')
    expect(taskLabel(tr, { sec: 'reading', kind: 'pm', n: 1 }, 'general')).toBe('Reading · ieltsPlan.item.pmGt:')
    expect(taskLabel(tr, { sec: 'reading', kind: 'pm', n: 1 }, 'academic')).toBe('Reading · ieltsPlan.item.pm:')
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
