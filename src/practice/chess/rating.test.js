// src/practice/chess/rating.test.js
import { describe, it, expect } from 'vitest'
import { START_RATING, expected, nextRating, scoreFor, isRated } from './rating.js'

describe('рейтинг ученика', () => {
  it('стартует с 800', () => expect(START_RATING).toBe(800))
  it('ожидание против равного — половина, против сильного — меньше', () => {
    expect(expected(800, 800)).toBeCloseTo(0.5)
    expect(expected(800, 1200)).toBeCloseTo(0.0909, 3)
  })
  it('победа над равным +16, поражение −16, ничья 0', () => {
    expect(nextRating(800, 800, 1)).toBe(816)
    expect(nextRating(800, 800, 0)).toBe(784)
    expect(nextRating(800, 800, 0.5)).toBe(800)
  })
  it('победа над сильным даёт больше, чем над слабым', () => {
    expect(nextRating(800, 1200, 1) - 800).toBeGreaterThan(nextRating(800, 400, 1) - 800)
  })
  it('ниже пола не падает', () => expect(nextRating(100, 2800, 0)).toBe(100))
  it('очко считается со стороны ученика', () => {
    expect(scoreFor('1-0', 'w')).toBe(1)
    expect(scoreFor('1-0', 'b')).toBe(0)
    expect(scoreFor('0-1', 'b')).toBe(1)
    expect(scoreFor('1/2-1/2', 'b')).toBe(0.5)
  })
  it('с возвратом хода, подсказкой или брошенная до второго хода — не рейтинговая', () => {
    expect(isRated({ usedUndo: false, usedHint: false, playerMoves: 2 })).toBe(true)
    expect(isRated({ usedUndo: true, usedHint: false, playerMoves: 20 })).toBe(false)
    expect(isRated({ usedUndo: false, usedHint: true, playerMoves: 20 })).toBe(false)
    expect(isRated({ usedUndo: false, usedHint: false, playerMoves: 1 })).toBe(false)
  })
})
