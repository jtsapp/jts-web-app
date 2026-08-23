import { describe, expect, it } from 'vitest'
import { cleanWord, isOversizedPhrase, isPhraseSelection, isTapSelection, sentenceContaining, splitSentences, wordFromTap } from './wordTranslate.js'

describe('splitSentences / sentenceContaining', () => {
  it('режет по концу предложения', () => {
    expect(splitSentences('She felt awkward at the party. Nobody spoke.')).toEqual([
      'She felt awkward at the party.',
      'Nobody spoke.',
    ])
  })

  it('из тапа по слову достаёт целое предложение', () => {
    expect(
      sentenceContaining('You want the name of the person who wrote the report. Next item.', 'person'),
    ).toBe('You want the name of the person who wrote the report.')
  })

  it('фразу без точки отдаёт целиком', () => {
    expect(sentenceContaining('Match each word to its meaning', 'word')).toBe(
      'Match each word to its meaning',
    )
  })
})

describe('isPhraseSelection', () => {
  it('принимает короткое словосочетание и целое предложение урока', () => {
    expect(isPhraseSelection('get on')).toBe(true)
    expect(isPhraseSelection('Rest is wasted time')).toBe(true)
    expect(isPhraseSelection('You want the name of the person who wrote the report.')).toBe(true)
    expect(isPhraseSelection("I'm currently travelling around Europe. Choose the correct word.")).toBe(
      true,
    )
  })

  it('отсекает одно слово, перенос строки и абзац', () => {
    expect(isPhraseSelection('when')).toBe(false)
    expect(isPhraseSelection('')).toBe(false)
    expect(isPhraseSelection('line one\nline two')).toBe(false)
    expect(
      isPhraseSelection(
        'Emma a final-year student at a business school is thinking about her future after graduation and what kind of job would really suit her best in the long run.',
      ),
    ).toBe(false)
    expect(
      isOversizedPhrase(
        'Emma a final-year student at a business school is thinking about her future after graduation and what kind of job would really suit her best in the long run.',
      ),
    ).toBe(true)
    expect(
      isPhraseSelection(
        'First sentence here. Second sentence here. Third sentence here. Fourth one too.',
      ),
    ).toBe(false)
  })
})

describe('isTapSelection', () => {
  it('слово и предложение открывают тултип', () => {
    expect(isTapSelection('when')).toBe(true)
    expect(isTapSelection('the end you')).toBe(true)
    expect(isTapSelection('You want the name of the person who wrote the report.')).toBe(true)
  })

  it('абзац не держит старый перевод', () => {
    expect(
      isTapSelection(
        'By the end you can greet people. Say goodbye. Introduce yourself. Talk about work. Ask questions. Answer them too. Then write a long story about your weekend plans.',
      ),
    ).toBe(false)
  })
})

describe('cleanWord / wordFromTap', () => {
  it('оставляет пробелы внутри фразы', () => {
    expect(cleanWord('get on!')).toBe('get on')
  })

  it('с тапа по слову берёт только это слово', () => {
    const el = { textContent: 'minutes,' }
    expect(wordFromTap(el)).toBe('minutes')
  })
})
