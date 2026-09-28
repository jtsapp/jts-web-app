import { describe, it, expect } from 'vitest'
import { normalizeCefr, resolveHomeLevel } from './homeLevel.js'

describe('resolveHomeLevel — профиль главнее теста', () => {
  it('пустой профиль + тест A2 → A2', () => {
    expect(resolveHomeLevel(null, 'A2')).toBe('A2')
    expect(resolveHomeLevel('', 'a2')).toBe('A2')
  })

  it('профиль A2 после теста A1 → A2', () => {
    expect(resolveHomeLevel('A2', 'A1')).toBe('A2')
    expect(resolveHomeLevel('a2', 'A1')).toBe('A2')
  })

  it('есть только профиль — его и показываем', () => {
    expect(resolveHomeLevel('B1', null)).toBe('B1')
  })

  it('нет ни профиля, ни теста — уровня нет', () => {
    expect(resolveHomeLevel(null, null)).toBeNull()
    expect(resolveHomeLevel('', '')).toBeNull()
  })
})

describe('normalizeCefr', () => {
  it('пустые значения не маскирует под A1', () => {
    expect(normalizeCefr(null)).toBeNull()
    expect(normalizeCefr(undefined)).toBeNull()
    expect(normalizeCefr('  ')).toBeNull()
  })

  it('приводит регистр', () => {
    expect(normalizeCefr('a1')).toBe('A1')
  })
})
