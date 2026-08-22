import { describe, it, expect } from 'vitest'
import { gradeQuestion, hasAttempt } from './practiceGrading.js'

describe('gradeQuestion — order (собери предложение)', () => {
  const question = { type: 'order', answer: ['I', 'like', 'coffee'] }

  it('верный порядок засчитывается', () => {
    expect(gradeQuestion(question, ['I', 'like', 'coffee']).correct).toBe(true)
  })

  it('неверный порядок — нет', () => {
    expect(gradeQuestion(question, ['coffee', 'like', 'I']).correct).toBe(false)
  })

  it('неполный набор — нет, а не «пока верно»', () => {
    expect(gradeQuestion(question, ['I', 'like']).correct).toBe(false)
  })

  it('регистр и знаки препинания не мешают (norm())', () => {
    expect(gradeQuestion(question, ['i', 'LIKE', 'coffee.']).correct).toBe(true)
  })
})

describe('gradeQuestion — multi (отметь всё, что услышал)', () => {
  const question = { type: 'multi', answers: ['cat', 'dog'] }

  it('полный набор — верно', () => {
    expect(gradeQuestion(question, ['dog', 'cat']).correct).toBe(true)
  })

  it('частичный набор — неверно (не «отметь наугад побольше»)', () => {
    expect(gradeQuestion(question, ['cat']).correct).toBe(false)
  })

  it('лишний вариант поверх верных — тоже неверно', () => {
    expect(gradeQuestion(question, ['cat', 'dog', 'bird']).correct).toBe(false)
  })
})

describe('gradeQuestion — pick (опрос про себя)', () => {
  it('любой выбор засчитывается — верного ответа нет', () => {
    expect(gradeQuestion({ type: 'pick' }, 'yes').correct).toBe(true)
    expect(gradeQuestion({ type: 'pick' }, ['yes', 'no']).correct).toBe(true)
  })

  it('пустой ответ не засчитывается', () => {
    expect(gradeQuestion({ type: 'pick' }, '').correct).toBe(false)
    expect(gradeQuestion({ type: 'pick' }, []).correct).toBe(false)
  })
})

describe('hasAttempt', () => {
  it('пустой выбор/ввод — не попытка', () => {
    expect(hasAttempt({ type: 'choice' }, null)).toBe(false)
    expect(hasAttempt({ type: 'choice' }, '')).toBe(false)
    expect(hasAttempt({ type: 'gap' }, '  ')).toBe(false)
    expect(hasAttempt({ type: 'order' }, [])).toBe(false)
    expect(hasAttempt({ type: 'match' }, {})).toBe(false)
  })

  it('любой ввод считается попыткой', () => {
    expect(hasAttempt({ type: 'choice' }, 'are')).toBe(true)
    expect(hasAttempt({ type: 'gap' }, 'lately')).toBe(true)
    expect(hasAttempt({ type: 'order' }, ['I'])).toBe(true)
    expect(hasAttempt({ type: 'match' }, { a: 'b' })).toBe(true)
  })
})
