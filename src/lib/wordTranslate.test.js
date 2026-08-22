import { describe, expect, it } from 'vitest'
import { cleanWord, isPhraseSelection, isTapSelection } from './wordTranslate.js'

describe('isPhraseSelection', () => {
  it('принимает короткое словосочетание', () => {
    expect(isPhraseSelection('get on')).toBe(true)
    expect(isPhraseSelection('Rest is wasted time')).toBe(true)
  })

  it('отсекает одно слово и абзац', () => {
    expect(isPhraseSelection('when')).toBe(false)
    expect(isPhraseSelection('')).toBe(false)
    expect(
      isPhraseSelection("I'm currently travelling around Europe. Choose the correct word."),
    ).toBe(false)
    expect(isPhraseSelection('line one\nline two')).toBe(false)
  })
})

describe('isTapSelection', () => {
  it('слово и короткая фраза открывают тултип', () => {
    expect(isTapSelection('when')).toBe(true)
    expect(isTapSelection('the end you')).toBe(true)
  })

  it('абзац не держит старый перевод', () => {
    expect(
      isTapSelection('By the end you can greet people (formal and informal), say goodbye, introduce'),
    ).toBe(false)
  })
})

describe('isPhraseSelection', () => {
  it('принимает короткое словосочетание', () => {
    expect(isPhraseSelection('get on')).toBe(true)
    expect(isPhraseSelection('Rest is wasted time')).toBe(true)
  })

  it('отсекает одно слово и абзац', () => {
    expect(isPhraseSelection('when')).toBe(false)
    expect(isPhraseSelection('')).toBe(false)
    expect(
      isPhraseSelection("I'm currently travelling around Europe. Choose the correct word."),
    ).toBe(false)
    expect(isPhraseSelection('line one\nline two')).toBe(false)
  })
})

describe('cleanWord', () => {
  it('оставляет пробелы внутри фразы', () => {
    expect(cleanWord('get on!')).toBe('get on')
  })
})
