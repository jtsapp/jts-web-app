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

// Регрессия на живую поломку: ученик вписывал в открытый пропуск набор букв
// («cwdcwdcwdc») и получал зелёную галочку. Проверить такой ответ может только
// преподаватель — вердикта у клиента нет и быть не может (FR-74).
describe('открытый ответ вердикта не получает', () => {
  const openGap = { id: 'g1', type: 'gap', open: true, gapBefore: 'Do your brother live with you? →', gapAfter: '' }

  it('набор букв не объявляется верным', () => {
    const verdict = gradeQuestion(openGap, 'cwdcwdcwdc')
    expect(verdict.manual).toBe(true)
  })

  it('correct тут значит «ответ дан», а не «верно»', () => {
    // Оно нужно, чтобы шаг засчитался и работу можно было сдать.
    expect(gradeQuestion(openGap, 'cwdcwdcwdc').correct).toBe(true)
    expect(gradeQuestion(openGap, '   ').correct).toBe(false)
  })

  it('у пропуска с эталоном вердикт настоящий и manual не выставляется', () => {
    const withKey = { id: 'g2', type: 'gap', answers: ['does'], gapBefore: '', gapAfter: '' }
    expect(gradeQuestion(withKey, 'does')).toEqual({ correct: true })
    expect(gradeQuestion(withKey, 'cwdcwdcwdc')).toEqual({ correct: false })
  })

  it('опрос про себя тоже без вердикта — сверять не с чем', () => {
    expect(gradeQuestion({ id: 'p1', type: 'pick' }, '👍').manual).toBe(true)
  })
})

// Зеркало серверного AutoGradingTest.переписаннаяФразаЗасчитываетсяЦеликом.
// Пока экран считал без контекста задания, ученик видел красный крест там, где
// сервер засчитывал ответ верным, а преподаватель — третье.
describe('пропуск: ответ-продолжение эталона', () => {
  const rewrite = {
    id: 'g1', type: 'gap', answers: ['does not live'],
    gapBefore: 'He', gapAfter: 'here',
  }

  it('фраза целиком словами задания засчитывается', () => {
    expect(gradeQuestion(rewrite, 'does not live here').correct).toBe(true)
  })

  it('сам эталон тоже', () => {
    expect(gradeQuestion(rewrite, 'does not live').correct).toBe(true)
  })

  it('чужие слова так не проходят', () => {
    expect(gradeQuestion(rewrite, 'does not live in Almaty').correct).toBe(false)
  })
})
