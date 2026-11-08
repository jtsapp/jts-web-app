import { describe, it, expect } from 'vitest'
import { GRAMMAR_REF, MAX_ENTRIES, grammarRefFor, isEnglishQuestion, matchRef } from './grammarRef.js'
import { questionHints } from './turnHints.js'

// Справка школы по грамматике (ТЗ v2.0, 8.2) встаёт рядом с вопросом об английском и только с нужными темами: лишняя
// справка на вопросе о сайте сбивала бы ответ, а лишние записи растили бы каждый запрос.

describe('справка по грамматике', () => {
  it('записи уникальны, у каждой регулярка и текст', () => {
    const ids = GRAMMAR_REF.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const e of GRAMMAR_REF) {
      expect(e.match, e.id).toBeInstanceOf(RegExp)
      expect(e.text.trim().length, e.id).toBeGreaterThan(20)
    }
  })

  it('на вопрос о сайте не встаёт', () => {
    for (const q of ['Где мои домашки?', 'Как перенести урок?', 'Как работают токены?', 'Хочу пожаловаться на менеджера', 'Где найти Speaking Buddy?', 'Маған бүгін не істеу керек?', 'What should I do today?']) {
      expect(grammarRefFor(q), q).toBeNull()
    }
  })

  it('на вопрос о правиле — нужная тема', () => {
    expect(matchRef('Present Perfect или Past Simple: «Я был в Лондоне в 2019 году»?').map((e) => e.id)).toEqual(expect.arrayContaining(['present-perfect', 'past-simple']))
    expect(matchRef('Как сказать «Жаль, что я не знаю»? Объясни wish.').map((e) => e.id)).toContain('wish')
    expect(matchRef('Почему нельзя сказать «I am agree»?').map((e) => e.id)).toContain('agree')
    expect(grammarRefFor('Объясни present perfect')).toContain('have/has + третья форма')
  })

  it('не больше MAX_ENTRIES записей', () => {
    const q = 'Проверь: Yesterday I have went to the cinema, we was happy, she don\'t like it, I am interesting in music, if I will have time.'
    expect(matchRef(q).length).toBe(MAX_ENTRIES)
  })

  it('«the» в тексте ученика не поднимает статью об артиклях', () => {
    expect(matchRef('Проверь: I went to the cinema with my friends.').map((e) => e.id)).not.toContain('the')
    expect(matchRef('a мен the артикльдерінің айырмашылығы қандай?').map((e) => e.id)).toContain('the')
  })

  it('казахскому ответу — словарь терминов, даже без совпавших записей', () => {
    const ref = grammarRefFor('Ағылшынша сұрақ қалай қойылады?', { answerLang: 'kk' })
    expect(ref).toContain('бастауыш — подлежащее')
    expect(grammarRefFor('Где мои домашки?', { answerLang: 'kk' })).toBeNull()
    expect(isEnglishQuestion('«I English learn» деп айтуға бола ма?')).toBe(true)
  })

  it('в указаниях вопроса — справка, но не на непроверенном задании', () => {
    expect(questionHints({ question: 'Почему нельзя сказать «I am agree»?' }).join('\n')).toContain('Справка школы')
    expect(questionHints({ question: 'Проверь: She go to school.', unchecked: true }).join('\n')).not.toContain('Справка школы')
  })
})
