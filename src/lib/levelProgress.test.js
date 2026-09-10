import { describe, it, expect } from 'vitest'
import { levelSummary, nextLevel, rankSkills, skillPercent, weeklyDelta } from './levelProgress.js'

describe('skillPercent', () => {
  it('без заданий — ноль, а не 100%', () => {
    expect(skillPercent()).toBe(0)
    expect(skillPercent({ done: 0, firstTry: 0 })).toBe(0)
  })

  // Одно верное задание — не «100% владения»: процент придерживается объёмом,
  // ровно как полоски рейтинга в профиле.
  it('маленький объём зажимает процент', () => {
    expect(skillPercent({ done: 1, firstTry: 1 })).toBe(4)
    expect(skillPercent({ done: 25, firstTry: 25 })).toBe(100)
  })

  it('точность влияет линейно', () => {
    expect(skillPercent({ done: 25, firstTry: 20 })).toBe(80)
  })
})

describe('rankSkills', () => {
  it('сортирует от сильного к слабому', () => {
    const ranked = rankSkills({
      speaking: { done: 25, firstTry: 21 },
      writing: { done: 25, firstTry: 10 },
    })
    expect(ranked[0]).toEqual({ skill: 'speaking', percent: 84 })
    expect(ranked[ranked.length - 1].percent).toBe(0)
  })
})

describe('nextLevel', () => {
  it('следующая ступень CEFR', () => {
    expect(nextLevel('B1')).toBe('B2')
    expect(nextLevel('b1')).toBe('B2')
  })
  it('на потолке следующей нет', () => {
    expect(nextLevel('C2')).toBe(null)
  })
  it('неизвестный уровень не роняет карточку', () => {
    expect(nextLevel(undefined)).toBe('A2')
  })
})

describe('levelSummary', () => {
  const SKILLED = {
    listening: { done: 25, firstTry: 25 },
    speaking: { done: 25, firstTry: 25 },
    reading: { done: 25, firstTry: 25 },
    writing: { done: 25, firstTry: 25 },
    grammar: { done: 25, firstTry: 25 },
    vocab: { done: 25, firstTry: 25 },
  }

  it('процент и остаток — из освоенных материалов, а не из навыков', () => {
    const s = levelSummary('B1', SKILLED, { level: 'B1', next: 'B2', percent: 40, done: 12, total: 30, remaining: 18 })

    // Навыки безупречны, но уровень пройден на 40%: это разные величины, и
    // карточка обязана показывать вторую — «сколько пройдено», а не «как точно».
    expect(s.percent).toBe(40)
    expect(s.done).toBe(12)
    expect(s.total).toBe(30)
    expect(s.remaining).toBe(18)
    expect(s.next).toBe('B2')
  })

  it('без ответа сервера процента нет вовсе', () => {
    const s = levelSummary('B1', SKILLED)

    // Не ноль: ноль означал бы «ничего не пройдено», а мы просто ещё не знаем.
    // Подставить сюда правдоподобное число хуже, чем не показать ничего.
    expect(s.percent).toBe(null)
    expect(s.remaining).toBe(null)
  })

  it('у новичка нет ни сильной, ни слабой стороны', () => {
    const s = levelSummary('A1', null, { level: 'A1', next: 'A2', percent: 0, done: 0, total: 40, remaining: 40 })
    expect(s.percent).toBe(0)
    expect(s.strongest).toBe(null)
    expect(s.weakest).toBe(null)
    expect(s.remaining).toBe(40)
  })

  it('на C2 следующего уровня нет', () => {
    expect(levelSummary('C2', null).next).toBe(null)
  })

  it('купленный курс выше своего ведёт карточку целиком', () => {
    // Ученик A1 купил A2 — проходит он A2. Считать полосу по A2, а подписывать
    // карточку «A1» нельзя: вышло бы «ВАШ УРОВЕНЬ A1» с дорожкой до B1.
    const s = levelSummary('A1', null, { level: 'A2', next: 'B1', percent: 20, done: 4, total: 20, remaining: 16 })

    expect(s.level).toBe('A2')
    expect(s.next).toBe('B1')
  })

  it('сервер сказал «выше некуда» — своего мнения о потолке у карточки нет', () => {
    const s = levelSummary('B2', null, { level: 'C2', next: null, percent: 10, done: 1, total: 10, remaining: 9 })

    expect(s.next).toBe(null)
  })
})

describe('weeklyDelta', () => {
  it('без снимка прироста ещё нет', () => {
    expect(weeklyDelta(40, null)).toBe(null)
  })
  it('разница со снимком', () => {
    expect(weeklyDelta(46, { percent: 40, at: 0 }, 1000)).toBe(6)
  })
})
