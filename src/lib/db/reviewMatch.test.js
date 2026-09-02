// Фикстуры — НЕ выдуманные: это реальные строки из mistake_log/resolved_log
// прода на 03.09.2026. Именно на них подстрочное сравнение промахивалось, и
// тьютор гонял ученику Past Simple в каждой сессии подряд.

import { describe, it, expect } from 'vitest'
import { reviewTokens, matchesReviewItem, splitReviewLists } from './reviewMatch.js'

const PAST_SIMPLE =
  'wrong tense in response: I don\'t. → No, I didn\'t. / Yes, I did. (When someone asks a Past Simple question with "did", answer with "did" too — "Yes, I did" or "No, I didn\'t".)'
const AVOIDING_RU =
  'avoiding English: Я не знаю. → I don\'t know. (Say it in English — that\'s what you\'re here for.)'
const ARTICLE_DOMBRA =
  'missing article: I play football and dombra. → I play football and the dombra. (Musical instruments take the definite article: the dombra, the piano.)'
const ORDERING =
  "wrong frame for ordering: I want iced → Could I get an iced coffee (Use polite ordering frames like 'Could I get...')"
const TO_BE =
  'missing auxiliary verb: They not bad → They are not bad (The verb "to be" (am/is/are) must always appear in the sentence.)'
const ARTICLE_JAR =
  'missing article: I use jar → I use a jar (Use the indefinite article "a" before a countable noun in singular form.)'

describe('reviewTokens', () => {
  it('сводит число к единственному — «questions» и «question» это один токен', () => {
    expect(reviewTokens('Past Simple questions')).toEqual(['past', 'simple', 'question'])
  })

  it('режет пунктуацию, кавычки и стрелку, служебные слова выкидывает', () => {
    expect(reviewTokens('I want iced → Could I get an iced coffee')).not.toContain('→')
    expect(reviewTokens('a frame with the coffee')).toEqual(['frame', 'coffee'])
  })

  it('не ломается о кириллицу и пустую строку', () => {
    expect(reviewTokens('Я не знаю')).toEqual(['я', 'не', 'знаю'])
    expect(reviewTokens('')).toEqual([])
    expect(reviewTokens(null)).toEqual([])
  })

  it('не калечит короткие слова ради единственного числа', () => {
    // 'is', 'as', 'his' не должны терять «s» — иначе токены расходятся вслепую
    expect(reviewTokens('is as')).toEqual(['is', 'as'])
  })
})

describe('matchesReviewItem — то, ради чего всё затевалось', () => {
  it('«Past Simple questions with did» гасит ошибку с Past Simple question', () => {
    // Подстрочно НЕ совпадало: в ошибке «question» в единственном числе и в кавычках.
    expect(PAST_SIMPLE.toLowerCase().includes('past simple questions with did')).toBe(false)
    expect(matchesReviewItem(PAST_SIMPLE, 'Past Simple questions with did')).toBe(true)
  })

  it('и не гасит соседние ошибки того же ученика', () => {
    expect(matchesReviewItem(AVOIDING_RU, 'Past Simple questions with did')).toBe(false)
    expect(matchesReviewItem(ARTICLE_JAR, 'Past Simple questions with did')).toBe(false)
  })

  it('работает на остальных живых парах resolved → mistake', () => {
    expect(matchesReviewItem(ARTICLE_DOMBRA, 'missing article with musical instruments')).toBe(true)
    expect(matchesReviewItem(ORDERING, 'polite ordering frames (Could I get...)')).toBe(true)
    expect(matchesReviewItem(TO_BE, 'They are (verb to be)')).toBe(true)
  })

  it('«missing article» из одной ошибки не гасит другую ошибку с артиклем', () => {
    // Обе про артикль, но перерос ученик именно инструменты — банка остаётся.
    expect(matchesReviewItem(ARTICLE_JAR, 'missing article with musical instruments')).toBe(false)
  })

  it('точное совпадение и совпадение с самим собой', () => {
    expect(matchesReviewItem(PAST_SIMPLE, PAST_SIMPLE)).toBe(true)
    expect(matchesReviewItem(TO_BE, 'They are (verb to be)')).toBe(true)
  })

  it('однословный запрос требует подстроки — иначе выкосит пол-журнала', () => {
    // 'article' есть в обеих ошибках про артикль: как подстрока — да, но
    // одиночный токен не должен работать как ковровая бомбардировка.
    expect(matchesReviewItem(ARTICLE_JAR, 'article')).toBe(true)
    expect(matchesReviewItem(PAST_SIMPLE, 'article')).toBe(false)
  })

  it('пустой запрос не матчит ничего', () => {
    expect(matchesReviewItem(PAST_SIMPLE, '')).toBe(false)
    expect(matchesReviewItem(PAST_SIMPLE, '   ')).toBe(false)
    expect(matchesReviewItem('', 'past simple')).toBe(false)
  })
})

describe('splitReviewLists', () => {
  it('одна и та же ошибка не попадает в оба блока промпта', () => {
    // Ровно случай user-114 из прода: PAST_SIMPLE лежал и в mistake_log, и в
    // review_item, и уезжал тьютору дважды с приказом «quiz on these».
    const out = splitReviewLists({
      mistakes: [PAST_SIMPLE, AVOIDING_RU],
      due: [PAST_SIMPLE],
      parked: [PAST_SIMPLE],
      resolved: [],
    })
    expect(out.dueReviews).toEqual([PAST_SIMPLE])
    expect(out.mistakes).toEqual([AVOIDING_RU])
  })

  it('отложенная ошибка не возвращается через блок «Recent mistakes»', () => {
    // Показали в прошлый раз → SR отодвинул её, из due она ушла. Если бы она
    // при этом всплывала в mistakes, кулдаун не давал бы ничего.
    const out = splitReviewLists({
      mistakes: [PAST_SIMPLE, AVOIDING_RU],
      due: [],
      parked: [PAST_SIMPLE, AVOIDING_RU],
      resolved: [],
    })
    expect(out.dueReviews).toEqual([])
    expect(out.mistakes).toEqual([])
  })

  it('ошибка без строки расписания остаётся видимой', () => {
    // Миграция не доехала / вставка review_item не прошла — тьютор не должен
    // потерять ошибку совсем.
    const out = splitReviewLists({ mistakes: [PAST_SIMPLE], due: [], parked: [], resolved: [] })
    expect(out.mistakes).toEqual([PAST_SIMPLE])
  })

  it('пройденное гасится в обоих списках сразу', () => {
    const out = splitReviewLists({
      mistakes: [PAST_SIMPLE, ARTICLE_JAR],
      due: [PAST_SIMPLE, ARTICLE_DOMBRA],
      parked: [],
      resolved: ['Past Simple questions with did'],
    })
    expect(out.dueReviews).toEqual([ARTICLE_DOMBRA])
    expect(out.mistakes).toEqual([ARTICLE_JAR])
  })

  it('режет длинный хвост ошибок по cap, due не режет', () => {
    const many = Array.from({ length: 20 }, (_, i) => `mistake number ${i}: a → b (rule)`)
    const out = splitReviewLists({ mistakes: many, due: [], resolved: [], cap: 12 })
    expect(out.mistakes).toHaveLength(12)
  })

  it('переживает пустой вход', () => {
    expect(splitReviewLists()).toEqual({ dueReviews: [], mistakes: [] })
  })
})
