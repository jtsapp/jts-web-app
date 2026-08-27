import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { literalAfter, applyPatches } = require('./extract-placement.js')

// Патчи банка — ручной аудит дистракторов и пропущенных допустимых ответов.
// Первая версия экстрактора копировала несуществующие поля патча и «применяла»
// 13 патчей, не меняя банк: студентов с корректными ответами («less», «may»)
// движок считал ошибившимися. Семантика ниже — копия applyBankPatches бандла.
describe('applyPatches', () => {
  const bank = () => ({
    items: [
      {
        id: 'rt-1',
        key: 0,
        options: [{ t: 'went', m: '' }, { t: 'goes', m: '' }, { t: 'gone', m: '' }, { t: 'go', m: '' }],
      },
      { id: 'u-1', answer: ['more'] },
      { id: 'u-2', stem: 'He ___ like coffee.', answer: ['does not'] },
    ],
  })

  it('option: заменяет дистрактор, найденный по тексту', () => {
    const b = bank()
    const applied = applyPatches(b, [
      { id: 'rt-1', kind: 'option', findText: 'gone', replace: { t: 'is going', m: 'почему' } },
    ])
    expect(applied).toEqual(['rt-1'])
    expect(b.items[0].options[2]).toEqual({ t: 'is going', m: 'почему' })
  })

  // Ключевую опцию патч тронуть не может — иначе задание осталось бы без
  // правильного ответа.
  it('option: не трогает правильный вариант, даже если текст совпал', () => {
    const b = bank()
    const applied = applyPatches(b, [
      { id: 'rt-1', kind: 'option', findText: 'went', replace: { t: 'x', m: '' } },
    ])
    expect(applied).toEqual([])
    expect(b.items[0].options[0].t).toBe('went')
  })

  it('answer: дописывает допустимые ответы без дублей', () => {
    const b = bank()
    const applied = applyPatches(b, [{ id: 'u-1', kind: 'answer', add: ['less', 'more'] }])
    expect(applied).toEqual(['u-1'])
    expect(b.items[1].answer).toEqual(['more', 'less'])
  })

  it('stem: заменяет формулировку только при точном совпадении', () => {
    const b = bank()
    applyPatches(b, [
      { id: 'u-2', kind: 'stem', findText: 'He ___ like coffee.', replace: 'He ___ like coffee. He never drinks it.' },
      { id: 'u-2', kind: 'stem', findText: 'другая строка', replace: 'мимо' },
    ])
    expect(b.items[2].stem).toBe('He ___ like coffee. He never drinks it.')
  })

  it('патч по чужому id молча пропускается', () => {
    const b = bank()
    expect(applyPatches(b, [{ id: 'нет-такого', kind: 'answer', add: ['x'] }])).toEqual([])
  })
})

describe('literalAfter', () => {
  it('вырезает сбалансированный литерал, не спотыкаясь о скобки в строках', () => {
    const src = 'const X = { a: "close } brace", b: { c: 1 } };'
    expect(literalAfter(src, 'const X = ')).toBe('{ a: "close } brace", b: { c: 1 } }')
  })

  it('на отсутствующем объявлении падает понятной ошибкой', () => {
    expect(() => literalAfter('ничего', 'const X = ')).toThrow(/не найдено/)
  })
})
