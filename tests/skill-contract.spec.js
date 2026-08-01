import { test, expect } from '@playwright/test'
import { isValidSkill, validateDeltas } from '../src/lib/skillContract.js'

test.describe('skillContract', () => {
  test('isValidSkill', () => {
    expect(isValidSkill('grammar')).toBe(true)
    expect(isValidSkill('nope')).toBe(false)
    expect(isValidSkill(null)).toBe(false)
  })
  test('валидные дельты нормализуются', () => {
    const out = validateDeltas({ deltas: { grammar: { done: 3, firstTry: 2 }, vocab: { done: 1, firstTry: 1 } } })
    expect(out).toEqual({ grammar: { done: 3, firstTry: 2 }, vocab: { done: 1, firstTry: 1 } })
  })
  test('пустое/битое тело → null', () => {
    expect(validateDeltas(null)).toBeNull()
    expect(validateDeltas({})).toBeNull()
    expect(validateDeltas({ deltas: {} })).toBeNull()
  })
  test('неизвестный навык → null', () => {
    expect(validateDeltas({ deltas: { nope: { done: 1, firstTry: 1 } } })).toBeNull()
  })
  test('отрицательные/нецелые → null', () => {
    expect(validateDeltas({ deltas: { grammar: { done: -1, firstTry: 0 } } })).toBeNull()
    expect(validateDeltas({ deltas: { grammar: { done: 1.5, firstTry: 0 } } })).toBeNull()
  })
  test('firstTry больше done → null', () => {
    expect(validateDeltas({ deltas: { grammar: { done: 1, firstTry: 2 } } })).toBeNull()
  })
})
