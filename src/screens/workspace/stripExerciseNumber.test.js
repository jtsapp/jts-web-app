import { describe, it, expect } from 'vitest'
import { stripExerciseNumber } from './stripExerciseNumber.js'

describe('stripExerciseNumber', () => {
  it('removes «N ·» course prefixes so the badge is the only number', () => {
    expect(stripExerciseNumber('3 · Choose the sentence closest in meaning.')).toBe(
      'Choose the sentence closest in meaning.',
    )
    expect(stripExerciseNumber('4 · One item in each group does not belong.')).toBe(
      'One item in each group does not belong.',
    )
  })

  it('keeps titles without a leading number', () => {
    expect(stripExerciseNumber('Раскройте скобки')).toBe('Раскройте скобки')
  })
})
