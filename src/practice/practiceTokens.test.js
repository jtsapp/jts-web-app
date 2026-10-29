import { describe, expect, it } from 'vitest'
import { coinLegend, nextPrizeOf, sectionTokenPoints, taskTokenPoints } from './practiceTokens.js'

const RULES = [
  { name: 'Юнит грамматики', points: 5 },
  { name: 'Тренажёр аудирования / чтения / письма / говорения', points: 4 },
  { name: 'Мемы и рилсы — 5 штук', points: 1 },
]

describe('sectionTokenPoints', () => {
  it('даёт очки по настроенному действию секции', () => {
    expect(sectionTokenPoints(RULES, 'grammar')).toBe(5)
    expect(sectionTokenPoints(RULES, 'listenPair')).toBe(4)
    expect(sectionTokenPoints(RULES, 'reading')).toBe(4)
    expect(sectionTokenPoints(RULES, 'memes')).toBe(1)
  })

  it('не обещает токены там, где правила нет или секция ничего не начисляет', () => {
    expect(sectionTokenPoints(RULES, 'tales')).toBe(0)
    expect(sectionTokenPoints(RULES, 'books')).toBe(0)
    expect(sectionTokenPoints([], 'grammar')).toBe(0)
    expect(sectionTokenPoints(null, 'grammar')).toBe(0)
  })

  it('имя сравнивается без учёта регистра и пробелов по краям', () => {
    expect(sectionTokenPoints([{ name: '  юнит ГРАММАТИКИ ', points: 5 }], 'grammar')).toBe(5)
  })

  it('игры — по своим правилам каталога V415', () => {
    const rules = [
      ...RULES,
      { name: 'Listening мини-игра', points: 4 },
      { name: 'Услышь детали — найди свою картинку', points: 4 },
      { name: 'Слушай слово и находи на картинке', points: 3 },
      { name: 'Мир чисел Декстера — уровень', points: 3 },
    ]
    expect(sectionTokenPoints(rules, 'listening')).toBe(4)
    expect(sectionTokenPoints(rules, 'listenchoose')).toBe(4)
    expect(sectionTokenPoints(rules, 'words')).toBe(3)
    expect(sectionTokenPoints(rules, 'numbers')).toBe(3)
    expect(sectionTokenPoints(rules, 'writing')).toBe(4)
    expect(sectionTokenPoints(rules, 'cartoons')).toBe(0)
    expect(sectionTokenPoints(rules, 'wordhunt')).toBe(0)
  })

  it('мини-игра Listening на старом бэкенде (без своего правила) — по общему «Тренажёру»', () => {
    expect(sectionTokenPoints(RULES, 'listening')).toBe(4)
    expect(sectionTokenPoints(RULES, 'listenchoose')).toBe(0)
  })

  it('своё правило с нулём — токенов нет, общий «Тренажёр» не подставляется', () => {
    expect(sectionTokenPoints([...RULES, { name: 'Listening мини-игра', points: 0 }], 'listening')).toBe(0)
  })
})


describe('nextPrizeOf', () => {
  it('берёт ближайший приз, на который не хватает токенов; все открыты — null', () => {
    const prizes = [{ costTokens: 400 }, { costTokens: 150 }, { costTokens: 50 }]
    expect(nextPrizeOf(prizes, 100)).toEqual({ costTokens: 150 })
    expect(nextPrizeOf(prizes, 400)).toBeNull()
    expect(nextPrizeOf(undefined, 0)).toBeNull()
  })
})

describe('coinLegend', () => {
  it('серебряная с нуля, фиолетовая после неё, золотая до максимума', () => {
    expect(coinLegend({ silver: 200, purple: 200, gold: 200, max: 600 })).toEqual([
      { key: 'silver', from: 0, to: 199 },
      { key: 'purple', from: 200, to: 399 },
      { key: 'gold', from: 400, to: 600 },
    ])
  })
})

describe('taskTokenPoints', () => {
  const data = {
    myLessonPoints: 2,
    lessonPoints: { gen: 1, prem: 2 },
    practiceRules: [
      { name: 'Домашняя работа сдана', points: 8 },
      { name: 'Разговор голосом от 10 минут', points: 10 },
    ],
  }

  it('урок с преподавателем — по тарифу ученика, без тарифа — General', () => {
    expect(taskTokenPoints(data, { kind: 'live' })).toBe(2)
    expect(taskTokenPoints({ lessonPoints: { gen: 1 } }, { kind: 'live' })).toBe(1)
  })

  it('домашка и разговор со Speaking Buddy — по своим правилам; урок курса и словарь токенов не дают', () => {
    expect(taskTokenPoints(data, { kind: 'homework' })).toBe(8)
    expect(taskTokenPoints(data, { kind: 'practice', module: 'ai_tutor' })).toBe(10)
    expect(taskTokenPoints(data, { kind: 'course' })).toBe(0)
    expect(taskTokenPoints(data, { kind: 'practice', module: 'vocabulary_sr' })).toBe(0)
    expect(taskTokenPoints(null, { kind: 'live' })).toBe(0)
  })
})
