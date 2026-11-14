import { describe, expect, it } from 'vitest'
import { mergePartsOfSpeech, normalize } from './progress.js'

const EMPTY = { acts: {}, cases: {}, clues: {}, seen: {} }

describe('прогресс Parts of Speech World', () => {
  it('normalize берёт только известную форму', () => {
    expect(normalize(null)).toEqual(EMPTY)
    expect(normalize([])).toEqual(EMPTY)
    expect(
      normalize({
        acts: {
          u01a1: { score: 5.9, total: 8 },
          u01a2: { score: 9, total: 6 },
          u01a3: { score: 0, total: 5 },
          u02a1: { score: 2, total: 0 },
          '<img>': { score: 1, total: 1 },
          u02a2: 'x',
        },
        cases: {
          c01: { done: [2, 0, 0, '1', -1, 99], first: { 0: [9, 10], 2: [12, 10], x: [1, 1], 1: 'x', 3: [1, 0] }, complete: 'yes' },
          // открытое, но не начатое дело (и сброшенное «Replay») — не прогресс
          c02: { done: [], first: {}, complete: false },
          c03: { done: [], first: {}, complete: true },
          'c 4': { done: [0], first: {}, complete: false },
        },
        clues: { c01: [1, 1, 0, 'x'], c02: [], '<x>': [0] },
        seen: { hunt: 1, sort: true, forge: 0, '<b>': 1 },
        lang: 'ru',
      }),
    ).toEqual({
      acts: { u01a1: { score: 5, total: 8 }, u01a2: { score: 6, total: 6 }, u01a3: { score: 0, total: 5 } },
      cases: { c01: { done: [0, 2], first: { 0: [9, 10], 2: [10, 10] }, complete: false }, c03: { done: [], first: {}, complete: true } },
      clues: { c01: [0, 1] },
      seen: { hunt: 1, sort: 1 },
    })
  })

  it('merge двух устройств: решённое объединяется, счёт — лучший, закрытое где угодно дело закрыто', () => {
    const phone = {
      acts: { u01a1: { score: 4, total: 8 }, u01a2: { score: 6, total: 6 } },
      cases: { c01: { done: [0, 1], first: { 0: [10, 10], 1: [0, 1] }, complete: false }, c02: { done: [0, 1, 2, 3, 4], first: {}, complete: true } },
      clues: { c01: [0] },
      seen: { sort: 1 },
    }
    const laptop = {
      acts: { u01a1: { score: 7, total: 8 }, u02a1: { score: 1, total: 4 } },
      cases: { c01: { done: [2, 3], first: { 0: [7, 10], 2: [3, 6] }, complete: false } },
      clues: { c01: [2], c03: [1] },
      seen: { hunt: 1 },
    }
    expect(mergePartsOfSpeech(phone, laptop)).toEqual({
      acts: { u01a1: { score: 7, total: 8 }, u01a2: { score: 6, total: 6 }, u02a1: { score: 1, total: 4 } },
      cases: {
        c01: { done: [0, 1, 2, 3], first: { 0: [10, 10], 1: [0, 1], 2: [3, 6] }, complete: false },
        c02: { done: [0, 1, 2, 3, 4], first: {}, complete: true },
      },
      clues: { c01: [0, 2], c03: [1] },
      seen: { sort: 1, hunt: 1 },
    })
    // сведение не зависит от порядка там, где нет ничьей
    expect(mergePartsOfSpeech(laptop, phone).acts).toEqual(mergePartsOfSpeech(phone, laptop).acts)
  })

  it('лучший счёт — по доле верных (материал могли перезалить с другим числом заданий), ничья — этого устройства', () => {
    const merged = mergePartsOfSpeech({ acts: { a1: { score: 4, total: 8 }, a2: { score: 3, total: 6 } } }, { acts: { a1: { score: 3, total: 5 }, a2: { score: 2, total: 4 } } })
    expect(merged.acts).toEqual({ a1: { score: 3, total: 5 }, a2: { score: 2, total: 4 } })
  })
})
