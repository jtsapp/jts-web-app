import { describe, it, expect } from 'vitest'
import { answerTally } from './practiceGrading.js'

describe('answerTally — итог урока по ответам', () => {
  const steps = [
    { id: 's1', blocks: [{ type: 'practice', questions: [
      { id: 'q1', type: 'choice', options: ['a', 'b'], answer: 'a' },
      { id: 'q2', type: 'choice', options: ['a', 'b'], answer: 'b' },
    ] }] },
    { id: 's2', blocks: [{ type: 'info', html: '<p>текст</p>' }] },
    { id: 's3', blocks: [{ type: 'practice', questions: [
      { id: 'q3', type: 'choice', options: ['a', 'b'], answer: 'a' },
    ] }] },
  ]

  it('считает верные и неверные по вопросам', () => {
    expect(answerTally(steps, { q1: 'a', q2: 'a', q3: 'a' })).toEqual({ correct: 2, wrong: 1, accuracy: 67 })
  })

  it('не записывает неотвеченное в ошибки', () => {
    // Отвечен один вопрос из трёх и верно — это 100%, а не 33%.
    expect(answerTally(steps, { q1: 'a' })).toEqual({ correct: 1, wrong: 0, accuracy: 100 })
  })

  it('пустой урок — 0%, а не «отлично»', () => {
    expect(answerTally(steps, {})).toEqual({ correct: 0, wrong: 0, accuracy: 0 })
    expect(answerTally([], {})).toEqual({ correct: 0, wrong: 0, accuracy: 0 })
  })
})
