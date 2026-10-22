import { describe, expect, it } from 'vitest'
import { mergeCartoons, normalize } from './progress.js'

describe('прогресс Cartoon World', () => {
  it('normalize берёт только известную форму', () => {
    expect(normalize(null)).toEqual({ missions: {} })
    expect(normalize({ missions: {
      'ext-abc': { turns: [{ t: 'Hi there friend', p: 0, w: 'hi' }, { t: 5 }, 'x'], done: true, at: 10, u: 12, draft: 'не синкается' },
      '../x': { turns: [] },
      'cat-y': 'мусор',
    } })).toEqual({ missions: { 'ext-abc': { turns: [{ t: 'Hi there friend', p: 0, w: 'hi' }], done: true, at: 10, u: 12 } } })
  })

  it('merge: пройденное остаётся пройденным, ходы — у свежей копии', () => {
    const phone = { missions: { a: { turns: [{ t: 'one', p: -1, w: '' }, { t: 'two', p: 0, w: '' }], done: true, at: 50, u: 50 }, b: { turns: [{ t: 'x', p: 1, w: '' }], u: 10 } } }
    const laptop = { missions: { a: { turns: [{ t: 'one', p: -1, w: '' }], u: 70 }, c: { turns: [], u: 5 } } }
    expect(mergeCartoons(phone, laptop)).toEqual({ missions: {
      a: { turns: [{ t: 'one', p: -1, w: '' }], u: 70, done: true, at: 50 },
      b: { turns: [{ t: 'x', p: 1, w: '' }], u: 10 },
      c: { turns: [], u: 5 },
    } })
  })
})
