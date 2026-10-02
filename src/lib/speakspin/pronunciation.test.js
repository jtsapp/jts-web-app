// Перевод балла Azure в шкалу 1..5: границы порогов и «не оценивали».

import { describe, it, expect } from 'vitest'
import { pronunciationBand } from './pronunciation.js'

describe('pronunciationBand', () => {
  it('пороги: <45→1, <60→2, <75→3, <88→4, иначе 5', () => {
    expect(pronunciationBand(0)).toBe(1)
    expect(pronunciationBand(44.9)).toBe(1)
    expect(pronunciationBand(45)).toBe(2)
    expect(pronunciationBand(59.9)).toBe(2)
    expect(pronunciationBand(60)).toBe(3)
    expect(pronunciationBand(74.9)).toBe(3)
    expect(pronunciationBand(75)).toBe(4)
    expect(pronunciationBand(87.9)).toBe(4)
    expect(pronunciationBand(88)).toBe(5)
    expect(pronunciationBand(100)).toBe(5)
  })

  it('нет числа — null, а не единица', () => {
    // «Не оценивали» нельзя показать студенту как худший балл.
    expect(pronunciationBand(null)).toBeNull()
    expect(pronunciationBand(undefined)).toBeNull()
    expect(pronunciationBand(NaN)).toBeNull()
    expect(pronunciationBand(Infinity)).toBeNull()
    expect(pronunciationBand('abc')).toBeNull()
    expect(pronunciationBand(true)).toBeNull()
  })

  it('строка-число читается как число', () => {
    expect(pronunciationBand('80')).toBe(4)
  })
})
