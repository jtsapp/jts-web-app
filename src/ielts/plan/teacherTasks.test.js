import { describe, it, expect } from 'vitest'
import { originLabel, taskLabel, taskOrigin, taskRoute } from './planModel.js'

const t = (k, v = {}) => `${k}${Object.keys(v).length ? JSON.stringify(v) : ''}`

describe('задачи преподавателя в плане ученика', () => {
  const hw = { origin: 'teacher', mode: 'homework', sec: 'reading', date: '2026-10-10', extra: { title: 'Test 3 на время', dueDate: '2026-10-12', testId: 'RM-AC-F03', testKind: 'test' } }
  const task = { origin: 'teacher', mode: 'self_study', sec: 'other', extra: { title: 'Выписать 10 связок' } }

  it('ДЗ и задача преподавателя различаются, у программы метки нет', () => {
    expect(taskOrigin(hw)).toBe('homework')
    expect(taskOrigin(task)).toBe('teacher')
    expect(taskOrigin({ origin: 'programme', mode: 'self_study' })).toBeNull()
  })

  it('метка ДЗ — со сроком сдачи, а не с датой задачи', () => {
    expect(originLabel(t, hw, (d) => d)).toBe('ieltsPlan.origin.homework{"date":"2026-10-12"}')
    expect(originLabel(t, task, (d) => d)).toBe('ieltsPlan.origin.teacher')
  })

  it('подпись — формулировкой преподавателя, «Начать» — в выбранное задание', () => {
    expect(taskLabel(t, hw)).toBe('Reading · Test 3 на время')
    expect(taskLabel(t, task)).toBe('Выписать 10 связок')
    expect(taskRoute(hw)).toEqual({ tab: 'learn', view: 'reading-full', testId: 'RM-AC-F03' })
    expect(taskRoute({ ...task, sec: 'vocab' })).toEqual({ screen: 'vocab' })
  })
})
