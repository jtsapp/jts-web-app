import { describe, it, expect } from 'vitest'
import { forTrack, typeTrainers, drills, singleTexts, fullTests, testNumber, readingSummary, readingAccuracy } from './catalog.js'

const att = (raw, max) => ({ rawScore: raw, maxScore: max })
const items = [
  { id: 'RT-AC-TFNG-D', kind: 'types', module: 'academic', category: 'tfng', role: 'demo', attemptCount: 1, lastAttempt: att(2, 2) },
  { id: 'RT-AC-TFNG-01', kind: 'types', module: 'academic', category: 'tfng', role: 'practice', attemptCount: 0 },
  { id: 'RT-AC-TFNG-M', kind: 'types', module: 'academic', category: 'tfng', role: 'mini', attemptCount: 0 },
  { id: 'RT-GT-TFNG-01', kind: 'types', module: 'general', category: 'tfng', role: 'practice', attemptCount: 0 },
  { id: 'RT-AC-MH-01', kind: 'types', module: 'academic', category: 'matching_headings', role: 'practice', attemptCount: 0 },
  { id: 'RDR-NG-01', kind: 'drill', module: 'academic', category: 'ng', attemptCount: 2, lastAttempt: att(1, 4) },
  { id: 'RDR-GT-01', kind: 'drill', module: 'general', category: 'gt', attemptCount: 0 },
  { id: 'RM-AC-P01', kind: 'passage', module: 'academic', attemptCount: 1, lastAttempt: att(9, 13) },
  { id: 'RM-GT-S1-01', kind: 'section', module: 'general', attemptCount: 0 },
  { id: 'RM-AC-F07', kind: 'test', module: 'academic', attemptCount: 0 },
]

describe('каталог Reading', () => {
  it('трек фильтрует чужие тесты', () => {
    expect(forTrack(items, 'academic').map((t) => t.id)).not.toContain('RT-GT-TFNG-01')
    expect(forTrack(items, 'general').map((t) => t.id)).toContain('RM-GT-S1-01')
  })

  it('тренажёр типа собирает демо, практику и мини-тест', () => {
    const [tfng, mh] = typeTrainers(items, 'academic')
    expect(tfng.id).toBe('tfng')
    expect(tfng.demo.id).toBe('RT-AC-TFNG-D')
    expect(tfng.practice.map((t) => t.id)).toEqual(['RT-AC-TFNG-01'])
    expect(tfng.mini.id).toBe('RT-AC-TFNG-M')
    expect(tfng.started).toBe(true)
    expect(mh.started).toBe(false)
  })

  it('разделы: дриллы, тексты, полные тесты', () => {
    expect(drills(items, 'academic').map((d) => d.id)).toEqual(['ng'])
    expect(singleTexts(items, 'academic').map((t) => t.id)).toEqual(['RM-AC-P01'])
    expect(fullTests(items, 'academic').map((t) => t.id)).toEqual(['RM-AC-F07'])
    expect(testNumber('RM-AC-F07')).toBe(7)
    expect(testNumber('RD-AC-P1')).toBeNull()
  })

  it('сводка для карточки «Обучения»', () => {
    expect(readingSummary(items, 'academic')).toEqual({
      types: { started: 1, total: 2 },
      drills: { started: 1, total: 1 },
      texts: { done: 1, total: 1 },
      full: { done: 0, total: 1 },
    })
  })

  it('точность — по последним попыткам; без попыток — null', () => {
    expect(readingAccuracy(items)).toBe(Math.round((12 / 19) * 100))
    expect(readingAccuracy([])).toBeNull()
  })
})
