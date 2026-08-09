import { test, expect } from '@playwright/test'
import { gradeQuestion, stepProgress } from '../src/screens/workspace/practiceGrading.js'

test.describe('practiceGrading — live-урок (match / gap.open)', () => {
  test('gap.open — принимает любой непустой ответ', () => {
    const q = { id: 'q1', type: 'gap', open: true, gapBefore: 'I usually ', gapAfter: ' to work.' }
    expect(gradeQuestion(q, 'walk').correct).toBe(true)
    expect(gradeQuestion(q, 'anything at all').correct).toBe(true)
    expect(gradeQuestion(q, '').correct).toBe(false)
    expect(gradeQuestion(q, '   ').correct).toBe(false)
    expect(gradeQuestion(q, null).correct).toBe(false)
  })

  test('gap без open по-прежнему требует эталонный ответ', () => {
    const q = { id: 'q2', type: 'gap', answers: ['walk'] }
    expect(gradeQuestion(q, 'walk').correct).toBe(true)
    expect(gradeQuestion(q, 'anything at all').correct).toBe(false)
  })

  test('match — верно только если ВСЕ пары совпали', () => {
    const q = {
      id: 'q3',
      type: 'match',
      pairs: [
        { left: 'listen', right: '👂' },
        { left: 'see', right: '👀' },
        { left: 'speak', right: '👄' },
      ],
    }
    expect(gradeQuestion(q, { listen: '👂', see: '👀', speak: '👄' }).correct).toBe(true)
    // одна пара неверна
    expect(gradeQuestion(q, { listen: '👂', see: '👄', speak: '👀' }).correct).toBe(false)
    // одна пара не отвечена
    expect(gradeQuestion(q, { listen: '👂', see: '👀' }).correct).toBe(false)
    // пустой ответ
    expect(gradeQuestion(q, {}).correct).toBe(false)
    expect(gradeQuestion(q, null).correct).toBe(false)
  })

  test('match — вопрос без pairs никогда не верен', () => {
    const q = { id: 'q4', type: 'match', pairs: [] }
    expect(gradeQuestion(q, {}).correct).toBe(false)
  })

  test('stepProgress учитывает match-вопросы наравне с остальными', () => {
    const steps = [
      {
        title: 'Шаг с match',
        blocks: [
          {
            type: 'practice',
            questions: [
              {
                id: 'm1',
                type: 'match',
                pairs: [
                  { left: 'a', right: '1' },
                  { left: 'b', right: '2' },
                ],
              },
            ],
          },
        ],
      },
    ]
    expect(stepProgress(steps, { m1: { a: '1', b: '2' } })).toEqual({ done: 1, total: 1 })
    expect(stepProgress(steps, { m1: { a: '1', b: 'wrong' } })).toEqual({ done: 0, total: 1 })
    expect(stepProgress(steps, {})).toEqual({ done: 0, total: 1 })
  })

  test('choice/chips без изменений', () => {
    const choice = { id: 'c1', type: 'choice', options: ['a', 'b'], answer: 'b' }
    expect(gradeQuestion(choice, 'b').correct).toBe(true)
    expect(gradeQuestion(choice, 'a').correct).toBe(false)
    const chips = { id: 'ch1', type: 'chips', bank: ['Do', 'Does'], answer: 'Does' }
    expect(gradeQuestion(chips, 'Does').correct).toBe(true)
    expect(gradeQuestion(chips, 'Do').correct).toBe(false)
  })
})
