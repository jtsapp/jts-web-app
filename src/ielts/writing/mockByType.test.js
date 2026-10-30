import { describe, expect, it } from 'vitest'
import { mockLimits, mockTasks, mockTypeName, mockTypes, parseMockKey, pickMockTask } from './mockByType.js'

// замечание владельца 10 (30.10.2026): mock Writing не только «Task 1 / Task 2», но и по типам
describe('mock Writing по типу', () => {
  it('типы — по треку: графики у Academic, письма у General Training, жанры эссе у обоих', () => {
    expect(mockTypes('academic').map((x) => x.key)).toEqual([
      'task1:line', 'task1:bar', 'task1:pie', 'task1:table', 'task1:process', 'task1:map', 'task1:multi',
      'task2:opinion', 'task2:discussion', 'task2:adv_disadv', 'task2:problem_solution', 'task2:two_part',
    ])
    expect(mockTypes('general').map((x) => x.key)).toEqual([
      'task1:formal', 'task1:semi_formal', 'task1:informal',
      'task2:opinion', 'task2:discussion', 'task2:adv_disadv', 'task2:problem_solution', 'task2:two_part',
    ])
    expect(parseMockKey('task1:formal', 'academic')).toBeNull()
    expect(parseMockKey('task1:line', 'general')).toBeNull()
    expect(parseMockKey('task2:opinion', 'general')).toEqual({ kind: 'task2', category: 'opinion', key: 'task2:opinion' })
    expect(parseMockKey('nonsense', 'academic')).toBeNull()
    expect(mockTypeName('task1:semi_formal')).toBe('Task 1 · Semi-formal letter')
    expect(mockTypeName('task2:adv_disadv')).toBe('Task 2 · Advantages and disadvantages')
    expect(mockLimits('task1')).toEqual({ minutes: 20, words: 150 })
    expect(mockLimits('task2')).toEqual({ minutes: 40, words: 250 })
  })

  it('задания типа — своего трека и своей категории', () => {
    const items = [
      { id: 'A1', kind: 'task1', category: 'line', module: 'academic' },
      { id: 'A2', kind: 'task1', category: 'bar', module: 'academic' },
      { id: 'G1', kind: 'task1', category: 'formal', module: 'general' },
      { id: 'E1', kind: 'task2', category: 'opinion', module: 'both' },
      { id: 'E2', kind: 'task2', category: 'discussion', module: 'both' },
    ]
    expect(mockTasks(items, 'task1:line', 'academic').map((x) => x.id)).toEqual(['A1'])
    expect(mockTasks(items, 'task1:formal', 'general').map((x) => x.id)).toEqual(['G1'])
    expect(mockTasks(items, 'task1:formal', 'academic')).toEqual([])
    expect(mockTasks(items, 'task2:opinion', 'general').map((x) => x.id)).toEqual(['E1'])
    expect(mockTasks(items, 'task1:map', 'academic')).toEqual([])
    expect(mockTasks(undefined, 'task2:opinion', 'academic')).toEqual([])
  })

  it('задание mock: начатый — продолжить, иначе ещё не написанное (по уровню), иначе написанное давнее всех', () => {
    expect(pickMockTask([])).toBeNull()
    const done = (id, at) => ({ id, attemptCount: 1, lastAttempt: { finishedAt: at } })
    const old = done('OLD', '2026-09-01T10:00:00')
    const recent = done('NEW', '2026-10-20T10:00:00')
    expect(pickMockTask([recent, old])).toEqual({ task: old, reason: 'repeat' })
    const fresh = { id: 'F', attemptCount: 0, level: 'below' }
    const fit = { id: 'FIT', attemptCount: 0, level: 'fit' }
    expect(pickMockTask([recent, fresh, fit, old])).toEqual({ task: fit, reason: 'fresh' })
    expect(pickMockTask([recent, fresh, old])).toEqual({ task: fresh, reason: 'fresh' })
    // начатый на устройстве mock продолжается, даже если есть не написанные
    expect(pickMockTask([fit, recent], ['NEW'])).toEqual({ task: recent, reason: 'resume' })
  })
})
