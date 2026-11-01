import { describe, it, expect } from 'vitest'
import { applyWritingCaps } from './writingCaps.js'

const crit = (ta, cc = 7, lr = 7, gra = 7) => ({ taskResponse: ta, coherenceCohesion: cc, lexicalResource: lr, grammaticalRange: gra })
const base = { onTopic: true, overviewPresent: null, introCopied: false, copied: 0, effectiveWords: 270, minWords: 250, taskKind: 'task2' }

describe('ограничения Writing (порт saveAssessment, контракт §2)', () => {
  it('без нарушений — среднее с округлением IELTS, кодов нет', () => {
    expect(applyWritingCaps({ ...base, criteria: crit(7, 7, 7, 6) })).toEqual({ criteria: crit(7, 7, 7, 6), overall: 7, caps: [] })
  })

  it('не по теме: TA ≤ 2, общий ≤ 3.5', () => {
    const r = applyWritingCaps({ ...base, onTopic: false, criteria: crit(5, 7, 7.5, 7) })
    expect(r.criteria.taskResponse).toBe(2)
    expect(r.overall).toBe(3.5)
    expect(r.caps).toEqual(['off_topic'])
  })

  it('меньше половины минимума: TA ≤ 4, общий ≤ 4.5', () => {
    const r = applyWritingCaps({ ...base, effectiveWords: 73, criteria: crit(6, 6, 6, 6) })
    expect(r.criteria.taskResponse).toBe(4)
    expect(r.overall).toBe(4.5)
    expect(r.caps).toEqual(['too_short'])
  })

  it('меньше минимума: TA ≤ 5, общий без потолка', () => {
    const r = applyWritingCaps({ ...base, effectiveWords: 240, criteria: crit(7, 7, 7, 7) })
    expect(r.criteria.taskResponse).toBe(5)
    expect(r.overall).toBe(6.5)
    expect(r.caps).toEqual(['under_length'])
  })

  it('ровно половина — уже не too_short', () => {
    expect(applyWritingCaps({ ...base, effectiveWords: 125, criteria: crit(6) }).caps).toEqual(['under_length'])
  })

  it('Task 1 Academic без overview: TA ≤ 5; у Task 2 флаг не действует', () => {
    const t1 = { ...base, taskKind: 'task1_academic', minWords: 150, effectiveWords: 170, overviewPresent: false }
    expect(applyWritingCaps({ ...t1, criteria: crit(7) })).toMatchObject({ caps: ['no_overview'], criteria: { taskResponse: 5 } })
    expect(applyWritingCaps({ ...base, overviewPresent: false, criteria: crit(7) }).caps).toEqual([])
  })

  it('скопированное вступление — только пометка (по флагу или от 12 слов)', () => {
    expect(applyWritingCaps({ ...base, introCopied: true, criteria: crit(7) })).toMatchObject({ caps: ['copied_intro'], overall: 7 })
    expect(applyWritingCaps({ ...base, copied: 12, criteria: crit(7) }).caps).toEqual(['copied_intro'])
    expect(applyWritingCaps({ ...base, copied: 11, criteria: crit(7) }).caps).toEqual([])
  })

  it('ограничения складываются: не по теме и коротко', () => {
    const r = applyWritingCaps({ ...base, onTopic: false, effectiveWords: 60, criteria: crit(6, 6, 6, 6) })
    expect(r.criteria.taskResponse).toBe(2)
    expect(r.overall).toBe(3.5)
    expect(r.caps).toEqual(['off_topic', 'too_short'])
  })
})
