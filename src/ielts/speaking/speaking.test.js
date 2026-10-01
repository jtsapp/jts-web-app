import { describe, it, expect } from 'vitest'
import { pronunciationBand, speakingBand, speakingQuestions, wordsPerMinute } from './speaking.js'

describe('Speaking: вопросы, темп и band', () => {
  it('у Part 2 отвечают на саму карточку, у Part 1 — на вопросы темы', () => {
    expect(speakingQuestions({ kind: 'part2', id: 'S-P2-001', cue: 'Describe a teacher', bullets: ['who'] })).toEqual([
      { id: 'S-P2-001', question: 'Describe a teacher', bullets: ['who'], followUp: undefined },
    ])
    expect(speakingQuestions({ kind: 'part1', questions: [{ id: 'q1', question: 'Where?' }] }).map((q) => q.id)).toEqual(['q1'])
  })

  it('темп — слова в минуту; пустой или слишком короткий ответ — без темпа', () => {
    expect(wordsPerMinute('one two three four five six', 3)).toBe(120)
    expect(wordsPerMinute('', 20)).toBeNull()
    expect(wordsPerMinute('hi', 1)).toBeNull()
  })

  it('band — по четырём критериям или по трём, если произношения нет', () => {
    expect(speakingBand({ fluencyCoherence: 6, lexicalResource: 6.5, grammaticalRange: 6, pronunciation: 7 })).toBe(6.5)
    expect(speakingBand({ fluencyCoherence: 6, lexicalResource: 6.5, grammaticalRange: 6, pronunciation: null })).toBe(6)
  })

  it('произношение — accuracy Azure, взвешенная по длительности ответов', () => {
    expect(pronunciationBand([{ accuracy: 80, durationSec: 30 }, { accuracy: 60, durationSec: 10 }, { mock: true, accuracy: 0, durationSec: 50 }])).toBe(7) // (80·30 + 60·10) / 40 = 75 → 6.75 → 7
    expect(pronunciationBand([])).toBeNull()
  })
})
