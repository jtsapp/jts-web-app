import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, normalizeSpeaking, userMessage } from './speakingGrader.js'

describe('оценка Speaking из банка', () => {
  it('ответы уходят модели данными в тегах, с длительностью и темпом; пустой ответ помечен', () => {
    const job = { task: { part: 1, questions: [{ id: 'q1', question: 'Where is your hometown?' }, { id: 'q2', question: 'Do you like it?' }] } }
    const msg = userMessage(job, [{ itemId: 'q1', durationSec: 24.4, wpm: 130, transcript: "I'm from Taraz." }])
    expect(msg).toContain("Q: Where is your hometown?\nA (24 s, 130 wpm): I'm from Taraz.")
    expect(msg).toContain('A (0 s, — wpm): (no speech)')
    expect(msg.startsWith('<answers>')).toBe(true)
    expect(buildSystemPrompt(2, 'kk')).toContain('Part 2')
    expect(buildSystemPrompt(2, 'kk')).toContain('in Kazakh')
  })

  it('три критерия от модели, произношение — от Azure; без него null, а не выдумка', () => {
    const r = normalizeSpeaking({ fluencyCoherence: 6.2, lexicalResource: 7, grammaticalRange: 5.8, strengths: ['a', ''], improvements: ['b'], feedback: 'ok' }, null)
    expect(r.criteria).toEqual({ fluencyCoherence: 6, lexicalResource: 7, grammaticalRange: 6, pronunciation: null })
    expect(r.strengths).toEqual(['a'])
    expect(() => normalizeSpeaking({ fluencyCoherence: 6 }, 7)).toThrow()
  })
})
