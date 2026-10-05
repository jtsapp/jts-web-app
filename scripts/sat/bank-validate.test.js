import { describe, it, expect } from 'vitest'
import { validateBank } from './bank-validate.js'

const ctx = { skillIds: new Set(['m.alg.linear', 'rw.cs.words-in-context']), lessonCodes: new Set(['U1']) }
const meta = { source: 'JTS Original', licenseStatus: 'original', reviewStatus: 'draft' }
const tri = { en: 'e', ru: 'р', kk: 'қ' }
const math = { id: 'm1', skillId: 'm.alg.linear', section: 'math', difficulty: 2, type: 'spr', stem: 's', answer: ['7/2', '3.5'], explanation: tri, calculator: true, meta }
const rw = { id: 'r1', skillId: 'rw.cs.words-in-context', section: 'rw', difficulty: 1, type: 'mcq', stem: 's', options: ['a', 'b', 'c', 'd'], answer: 'B', explanation: tri, distractors: { A: tri }, calculator: false, meta }

describe('проверка банка SAT (порт validateAll)', () => {
  it('правильные вопросы проходят', () => {
    expect(validateBank([math, rw], ctx)).toEqual([])
  })

  it('ловит дубли, неизвестный навык, калькулятор не по секции и нечисловой SPR', () => {
    const p = validateBank([math, { ...math }, { ...math, id: 'm2', skillId: 'x', calculator: false, answer: ['abc'] }], ctx)
    expect(p.map((x) => x.message)).toEqual(['duplicate id', 'unknown skillId x', 'spr answer not numeric: abc', 'calculator must be true for math and false for rw'])
  })

  it('R&W mcq без разбора вариантов — ошибка, но не у пробника', () => {
    expect(validateBank([{ ...rw, distractors: undefined }], ctx)[0].message).toBe('R&W mcq needs distractor rationales')
    const paper = { ...rw, explanation: undefined, distractors: undefined, meta: { ...meta, kind: 'paper' } }
    expect(validateBank([paper], ctx)).toEqual([])
    expect(validateBank([{ ...paper, hints: [tri] }], ctx)[0].message).toMatch(/paper item carries no/)
  })

  it('урок: достаточно en, но код урока обязан существовать', () => {
    const lesson = { ...math, explanation: { en: 'e' }, meta: { ...meta, kind: 'lesson', lessonCode: 'U1' } }
    expect(validateBank([lesson], ctx)).toEqual([])
    expect(validateBank([{ ...lesson, meta: { ...lesson.meta, lessonCode: 'U99' } }], ctx)[0].message).toMatch(/names no class/)
  })
})
