import { test, expect } from '@playwright/test'
import { norm, gradeQuestion } from '../src/screens/workspace/practiceGrading.js'
import { SAMPLE_LESSON } from '../src/screens/workspace/sampleLesson.js'

test.describe('practiceGrading', () => {
  test('norm убирает регистр/пунктуацию/пробелы', () => {
    expect(norm('  Does  ')).toBe('does')
    // Стяжения раскрываются: «don't» и «do not» — один ответ (answer-match.js),
    // иначе студент терял балл за форму, а не за смысл.
    expect(norm("don't do!")).toBe('do not do')
    expect(norm('do not do')).toBe('do not do')
  })
  test('choice — верно только при точном совпадении', () => {
    const q = { id: 'q', type: 'choice', options: ['commute', 'commutes', 'is commute'], answer: 'commutes' }
    expect(gradeQuestion(q, 'commutes').correct).toBe(true)
    expect(gradeQuestion(q, 'commute').correct).toBe(false)
    expect(gradeQuestion(q, null).correct).toBe(false)
  })
  test('chips — сравнение по answer', () => {
    const q = { id: 'q', type: 'chips', bank: ['Does', 'Do', 'Is'], answer: 'Does' }
    expect(gradeQuestion(q, 'Does').correct).toBe(true)
    expect(gradeQuestion(q, 'Do').correct).toBe(false)
  })
  test('gap — нормализация + несколько допустимых', () => {
    const q = { id: 'q', type: 'gap', answers: ["doesn't drive", 'does not drive'] }
    expect(gradeQuestion(q, "Doesn't  drive").correct).toBe(true)
    expect(gradeQuestion(q, 'does not drive').correct).toBe(true)
    expect(gradeQuestion(q, 'drive').correct).toBe(false)
    expect(gradeQuestion(q, '').correct).toBe(false)
  })
  test('SAMPLE_LESSON корректной формы', () => {
    expect(SAMPLE_LESSON.steps.length).toBe(9)
    expect(SAMPLE_LESSON.topics.length).toBe(5)
    for (const s of SAMPLE_LESSON.steps) expect(typeof s.title).toBe('string')
    // хотя бы один practice-блок с вопросами
    const qs = SAMPLE_LESSON.steps.flatMap((s) => s.blocks).filter((b) => b.type === 'practice').flatMap((b) => b.questions)
    expect(qs.length).toBeGreaterThan(0)
    for (const q of qs) expect(['choice', 'chips', 'gap', 'match']).toContain(q.type)
  })
})
