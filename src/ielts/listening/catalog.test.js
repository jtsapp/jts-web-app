import { describe, it, expect } from 'vitest'
import { listeningTasks, dictations, spellings, listeningSummary, listeningAccuracy } from './catalog.js'

const items = [
  { id: 'LST-P1-D1', kind: 'part', attemptCount: 2, lastAttempt: { rawScore: 7, maxScore: 10 } },
  { id: 'DC-01', kind: 'dictation', attemptCount: 1, lastAttempt: { rawScore: 90, maxScore: 105 } },
  { id: 'SPL-01', kind: 'spelling', attemptCount: 0 },
]

describe('каталог Listening', () => {
  it('раскладывает задания, диктовку и правописание', () => {
    expect(listeningTasks(items).map((t) => t.id)).toEqual(['LST-P1-D1'])
    expect(dictations(items).map((t) => t.id)).toEqual(['DC-01'])
    expect(spellings(items).map((t) => t.id)).toEqual(['SPL-01'])
  })

  it('сводка и точность: диктовка в точность Listening не входит (там слова, а не вопросы)', () => {
    expect(listeningSummary(items).tasks).toEqual({ total: 1, done: 1, attempts: 2 })
    expect(listeningSummary(items).spelling.done).toBe(0)
    expect(listeningAccuracy(items)).toBe(70)
  })
})
