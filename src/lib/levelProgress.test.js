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
  it('процент — среднее по навыкам, цель — следующий уровень', () => {
    const s = levelSummary('B1', {
      listening: { done: 25, firstTry: 25 },
      speaking: { done: 25, firstTry: 25 },
      reading: { done: 25, firstTry: 25 },
      writing: { done: 25, firstTry: 25 },
      grammar: { done: 25, firstTry: 25 },
      vocab: { done: 25, firstTry: 25 },
    })
    expect(s.percent).toBe(100)
    expect(s.next).toBe('B2')
    expect(s.lessonsLeft).toBe(0)
    expect(s.practiceLeft).toBe(0)
  })

  it('у новичка нет ни сильной, ни слабой стороны', () => {
    const s = levelSummary('A1', null)
    expect(s.percent).toBe(0)
    expect(s.strongest).toBe(null)
    expect(s.weakest).toBe(null)
    // Остаток целиком: примерно 25 уроков и 9 практик.
    expect(s.lessonsLeft).toBe(25)
    expect(s.practiceLeft).toBe(9)
  })

  it('на C2 следующего уровня нет', () => {
    expect(levelSummary('C2', null).next).toBe(null)
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
