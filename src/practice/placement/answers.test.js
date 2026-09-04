import { describe, it, expect } from 'vitest'
import { IDK_DRAFT, isItemAnswered } from './answers.js'
import { checkOpenAnswer } from './engine.generated.js'

const mcq = { id: 'q1', options: [{ t: 'a' }, { t: 'b' }], key: 1 }
const open = { id: 'q2', answer: ['works'] }
const tfns = { id: 'q3', type: 'tfns', statements: [{ key: 'T' }, { key: 'F' }] }
const match = { id: 'q4', type: 'match', pairs: [['a', 1], ['b', 2]] }

describe('isItemAnswered', () => {
  it('пустой черновик — не ответ', () => {
    expect(isItemAnswered(mcq, undefined)).toBe(false)
    expect(isItemAnswered(open, {})).toBe(false)
    expect(isItemAnswered(open, { text: '   ' })).toBe(false)
  })

  it('обычный ответ засчитывается', () => {
    expect(isItemAnswered(mcq, { optIndex: 0 })).toBe(true)
    expect(isItemAnswered(open, { text: 'works' })).toBe(true)
    expect(isItemAnswered(tfns, { answers: ['T', 'F'] })).toBe(true)
    expect(isItemAnswered(match, { map: [0, 1] })).toBe(true)
  })

  it('частично собранный ответ — ещё не ответ', () => {
    expect(isItemAnswered(tfns, { answers: ['T'] })).toBe(false)
    expect(isItemAnswered(match, { map: [0, null] })).toBe(false)
  })

  it('«не знаю» — полноценный ответ для любого типа задания', () => {
    // Иначе на задании с полем ввода (A0-мост) кнопка «Завершить раздел»
    // остаётся заблокированной и выйти из раздела нечем.
    for (const item of [mcq, open, tfns, match]) {
      expect(isItemAnswered(item, { ...IDK_DRAFT })).toBe(true)
    }
  })

  it('«не знаю» уходит в движок как неверный ответ, а не как догадка', () => {
    expect(IDK_DRAFT.optIndex).toBe(-1) // ни с одним вариантом не совпадёт
    expect(IDK_DRAFT.optIndex === mcq.key).toBe(false)
    expect(checkOpenAnswer(open, IDK_DRAFT.text)).toBe(false)
  })

  it('«не знаю» стирает частично собранный ответ', () => {
    expect(IDK_DRAFT.answers).toEqual([])
    expect(IDK_DRAFT.map).toEqual([])
    expect(IDK_DRAFT.text).toBe('')
  })

  it('в словарном блоке «не знаю» — это свой вариант в списке', () => {
    expect(isItemAnswered({}, { optIndex: -1 }, 'vocab')).toBe(true)
    expect(isItemAnswered({}, {}, 'vocab')).toBe(false)
  })
})
