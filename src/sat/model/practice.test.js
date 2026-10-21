import { describe, expect, it } from 'vitest'
import { countForSection, countOptions, moduleSize } from './practice.js'

describe('размер набора практики (ТЗ SAT, задача 7)', () => {
  it('модуль: 27 вопросов R&W, 22 Math', () => {
    expect(moduleSize('rw')).toBe(27)
    expect(moduleSize('math')).toBe(22)
  })

  it('селектор: короткие наборы плюс полный модуль секции', () => {
    expect(countOptions('rw')).toEqual([5, 10, 20, 27])
    expect(countOptions('math')).toEqual([5, 10, 20, 22])
  })

  it('смена секции переносит полный модуль, а выбранный вручную короткий набор не трогает', () => {
    expect(countForSection(27, 'rw', 'math')).toBe(22)
    expect(countForSection(22, 'math', 'rw')).toBe(27)
    expect(countForSection(10, 'rw', 'math')).toBe(10)
  })
})
