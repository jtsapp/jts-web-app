// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import {
  stripExerciseNumber,
  stripExerciseNumbersInHtml,
  stripExerciseNumbersInText,
} from './stripExerciseNumber.js'

describe('stripExerciseNumber', () => {
  it('removes «N ·» course prefixes so the badge is the only number', () => {
    expect(stripExerciseNumber('3 · Choose the sentence closest in meaning.')).toBe(
      'Choose the sentence closest in meaning.',
    )
    expect(stripExerciseNumber('6 · Where does the word in violet go?')).toBe(
      'Where does the word in violet go?',
    )
  })

  it('keeps titles without a leading number', () => {
    expect(stripExerciseNumber('Раскройте скобки')).toBe('Раскройте скобки')
  })
})

describe('stripExerciseNumbersInText', () => {
  it('also drops «N ·» after a sentence in the instruction', () => {
    expect(
      stripExerciseNumbersInText(
        'Read the words. Click a card to see an example. 1 · Match each word or phrase to its meaning.',
      ),
    ).toBe('Read the words. Click a card to see an example. Match each word or phrase to its meaning.')
  })
})

describe('stripExerciseNumbersInHtml', () => {
  it('cleans .instruction inside course HTML', () => {
    const html = '<div class="instruction">6 · Where does the word in violet go?</div><p>Hi</p>'
    expect(stripExerciseNumbersInHtml(html)).toContain('Where does the word in violet go?')
    expect(stripExerciseNumbersInHtml(html)).not.toMatch(/6\s*·/)
  })
})
