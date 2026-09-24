import { describe, it, expect } from 'vitest'
import { cefrOf, practiceLevelFor, matchesLevel, nearestLevelCode } from './practiceLevel.js'

describe('practiceLevel', () => {
  it('cefrOf нормализует свободную строку уровня', () => {
    expect(cefrOf('b1')).toBe('B1')
    expect(cefrOf(' B1+ ')).toBe('B1')
    expect(cefrOf('C2')).toBe('C2')
    expect(cefrOf('')).toBeNull()
    expect(cefrOf('Intermediate')).toBeNull()
    expect(cefrOf(null)).toBeNull()
  })

  it('A0 и неизвестный уровень ученика — A1 в переключателе', () => {
    expect(practiceLevelFor('A0')).toBe('A1')
    expect(practiceLevelFor(undefined)).toBe('A1')
    expect(practiceLevelFor('b2')).toBe('B2')
    expect(practiceLevelFor('C2')).toBe('C2')
  })

  it('материал без уровня виден на любом уровне', () => {
    expect(matchesLevel('B1', 'B1')).toBe(true)
    expect(matchesLevel('B1', 'B2')).toBe(false)
    expect(matchesLevel('', 'C2')).toBe(true)
    expect(matchesLevel(undefined, 'A1')).toBe(true)
  })

  it('nearestLevelCode откатывает C2 на C1 и берёт точное совпадение', () => {
    const codes = ['a1', 'a2', 'b1', 'b2', 'c1']
    expect(nearestLevelCode('C2', codes)).toBe('c1')
    expect(nearestLevelCode('B1', codes)).toBe('b1')
    expect(nearestLevelCode('A0', codes)).toBe('a1')
    expect(nearestLevelCode('B2', ['a0', 'a1', 'a2', 'b1', 'b2'])).toBe('b2')
    expect(nearestLevelCode('C1', ['a0', 'a1', 'a2', 'b1', 'b2'])).toBe('b2')
    expect(nearestLevelCode('B1', [])).toBeNull()
  })
})
