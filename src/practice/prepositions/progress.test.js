import { describe, expect, it } from 'vitest'
import { mergePrepositions, normalize } from './progress.js'

describe('прогресс Prepositions World', () => {
  it('normalize берёт только известную форму', () => {
    expect(normalize(null)).toEqual({ done: {}, score: {} })
    expect(normalize({ done: { 'place-in-on-at': 1, '': 1, x: 0 }, score: { 'L:a': { best: 2, stars: 9 }, 'Q:z': { best: 1, stars: 3 }, F: 'x' } }))
      .toEqual({ done: { 'place-in-on-at': 1 }, score: { 'L:a': { best: 1, stars: 3 } } })
  })

  it('merge: прочитанное объединяется, результат — лучший', () => {
    const a = { done: { l1: 1 }, score: { 'L:l1': { best: 0.5, stars: 1 }, F: { best: 0.95, stars: 3 } } }
    const b = { done: { l2: 1 }, score: { 'L:l1': { best: 0.8, stars: 2 }, 'C:place': { best: 0.7, stars: 2 } } }
    expect(mergePrepositions(a, b)).toEqual({
      done: { l1: 1, l2: 1 },
      score: { 'L:l1': { best: 0.8, stars: 2 }, F: { best: 0.95, stars: 3 }, 'C:place': { best: 0.7, stars: 2 } },
    })
  })
})
