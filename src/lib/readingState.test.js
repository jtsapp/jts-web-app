import { describe, it, expect } from 'vitest'
import { sanitizeReadingState, mergeReadingState, readingDelta } from './readingState.js'
import { mergeModuleState } from './practiceContract.js'

const r = (score, total) => ({ score, total })

describe('mergeReadingState', () => {
  it('по заданию побеждает лучший счёт, done только включается', () => {
    const a = { texts: { t1: { ex: { 0: r(5, 5), 1: r(1, 6) }, done: true } } }
    const b = { texts: { t1: { ex: { 0: r(2, 5), 1: r(6, 6) }, done: false } } }
    expect(mergeReadingState(a, b)).toEqual({ texts: { t1: { ex: { 0: r(5, 5), 1: r(6, 6) }, done: true } } })
  })

  it('урезанная дельта не стирает остальные задания и тексты', () => {
    // Ровно то, что ломало итог: клиент слал «старое + одно задание», и
    // сервер, заменяя состояние, терял остальные.
    const a = { texts: { t1: { ex: { 0: r(5, 5), 1: r(6, 6) }, done: false }, t2: { ex: { 0: r(1, 2) }, done: true } } }
    const delta = { texts: { t1: { ex: { 2: r(3, 6) } } } }
    expect(mergeReadingState(a, delta)).toEqual({
      texts: { t1: { ex: { 0: r(5, 5), 1: r(6, 6), 2: r(3, 6) }, done: false }, t2: { ex: { 0: r(1, 2) }, done: true } },
    })
  })

  it('повтор той же дельты ничего не меняет', () => {
    const a = { texts: { t1: { ex: { 0: r(3, 5) }, done: false } } }
    const once = mergeReadingState(a, { texts: { t1: { ex: { 0: r(4, 5) } } } })
    expect(mergeReadingState(once, { texts: { t1: { ex: { 0: r(4, 5) } } } })).toEqual(once)
  })

  it('мусор вместо существующего — как пустое', () => {
    expect(mergeReadingState('"{}"', { texts: { t1: { ex: { 0: r(1, 1) } } } }))
      .toEqual({ texts: { t1: { ex: { 0: r(1, 1) }, done: false } } })
  })

  it('mergeModuleState для reading сливает, а не заменяет', () => {
    const a = { texts: { t1: { ex: { 0: r(5, 5) }, done: false } } }
    expect(mergeModuleState('reading', a, { texts: { t1: { ex: { 0: r(0, 5) } } } }).texts.t1.ex[0]).toEqual(r(5, 5))
  })
})

describe('sanitizeReadingState', () => {
  it('приводит к форме и отбрасывает лишние поля', () => {
    expect(sanitizeReadingState({ texts: { t1: { ex: { 0: { score: 1, total: 2, x: 1 } }, extra: 1 } }, junk: 1 }))
      .toEqual({ texts: { t1: { ex: { 0: r(1, 2) }, done: false } } })
  })

  it('пустой объект — пустое состояние', () => {
    expect(sanitizeReadingState({})).toEqual({ texts: {} })
  })

  it.each([
    ['не объект', null],
    ['массив', []],
    ['texts массив', { texts: [] }],
    ['счёт больше максимума', { texts: { t1: { ex: { 0: r(3, 2) } } } }],
    ['отрицательный счёт', { texts: { t1: { ex: { 0: r(-1, 2) } } } }],
    ['дробный счёт', { texts: { t1: { ex: { 0: r(1.5, 2) } } } }],
    ['индекс не число', { texts: { t1: { ex: { a: r(1, 2) } } } }],
    ['индекс за пределом', { texts: { t1: { ex: { 50: r(1, 2) } } } }],
    ['done не boolean', { texts: { t1: { ex: {}, done: 'yes' } } }],
    ['слишком длинный id', { texts: { ['x'.repeat(65)]: { ex: {} } } }],
  ])('отклоняет: %s', (_, raw) => {
    expect(sanitizeReadingState(raw)).toBeNull()
  })

  it('отклоняет больше 1000 текстов', () => {
    const texts = {}
    for (let i = 0; i < 1001; i++) texts['t' + i] = { ex: {} }
    expect(sanitizeReadingState({ texts })).toBeNull()
  })
})

describe('readingDelta', () => {
  it('возвращает только то, что лучше базы', () => {
    const base = { texts: { t1: { ex: { 0: r(5, 5), 1: r(2, 6) }, done: true } } }
    const next = { texts: { t1: { ex: { 0: r(5, 5), 1: r(6, 6) }, done: true }, t2: { ex: {}, done: true } } }
    expect(readingDelta(base, next)).toEqual({ texts: { t1: { ex: { 1: r(6, 6) } }, t2: { ex: {}, done: true } } })
  })

  it('нечего досылать — null', () => {
    const s = { texts: { t1: { ex: { 0: r(5, 5) }, done: true } } }
    expect(readingDelta(s, s)).toBeNull()
  })
})
