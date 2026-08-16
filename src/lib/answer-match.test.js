// Регрессия на жалобу из «Обучения»: верные ответы шли в «Неверный ответ».
// Причина — сверка текста: апостроф вырезался только ASCII, а «do not» и
// «don't» считались разными ответами.
import { describe, it, expect } from 'vitest'
import { normAnswer, answerMatches } from './answer-match.js'

describe('normAnswer', () => {
  it('снимает регистр, знаки и лишние пробелы', () => {
    expect(normAnswer('  Yes,  he  is! ')).toBe('yes he is')
  })

  it('уравнивает апострофы — ASCII и типографский', () => {
    expect(normAnswer("don't")).toBe(normAnswer('don’t'))
  })

  it('уравнивает стяжение и полную форму', () => {
    expect(normAnswer("I don't like Mondays.")).toBe(normAnswer('I do not like Mondays'))
    expect(normAnswer("I'm Anna")).toBe(normAnswer('I am Anna'))
    expect(normAnswer("he isn't from China")).toBe(normAnswer('he is not from China'))
  })

  it('не трогает were: без апострофа «we’re» и прошедшее неотличимы', () => {
    expect(normAnswer('we were late')).toBe('we were late')
    expect(normAnswer('we were going')).toBe('we were going')
  })

  it('дефис считает пробелом', () => {
    expect(normAnswer('well-known')).toBe(normAnswer('well known'))
  })
})

describe('answerMatches', () => {
  it('принимает оба написания отрицания', () => {
    expect(answerMatches('do not', ["don't"])).toBe(true)
    expect(answerMatches("don't", ['do not'])).toBe(true)
    expect(answerMatches('does', ["don't"])).toBe(false)
  })

  it('принимает ответ с типографским апострофом в данных', () => {
    expect(answerMatches("I don't like Mondays.", ['I don’t like Mondays.'])).toBe(true)
  })

  it('пустой ответ не засчитывается', () => {
    expect(answerMatches('   ', ['do not'])).toBe(false)
  })

  it('альтернативы через | и списком', () => {
    expect(answerMatches('but', ['but|and'])).toBe(true)
    expect(answerMatches('and', ['but', 'and'])).toBe(true)
  })

  it('«перепиши предложение»: целая фраза проходит, выдуманный хвост нет', () => {
    const cue = 'I ___ like Mondays.'
    expect(answerMatches("don't like Mondays", ["don't"], cue)).toBe(true)
    expect(answerMatches("don't like coffee", ["don't"], cue)).toBe(false)
  })
})
