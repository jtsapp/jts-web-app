import { describe, it, expect, vi } from 'vitest'
import { buildSystemPrompt, gradeSpeaking, isUsableAnswer, normalizeSpeaking, userMessage } from './speakingGrader.js'

const job = { task: { part: 1, questions: [{ id: 'q1', question: 'Where is your hometown?' }, { id: 'q2', question: 'Do you like it?' }, { id: 'q3', question: 'What do you do?' }] } }
const good = { fluencyCoherence: 6, lexicalResource: 6.5, grammaticalRange: 5.5, strengths: ['a'], improvements: ['b'], feedback: 'ok' }

describe('оценка Speaking из банка', () => {
  it('ответы уходят модели данными в тегах, с длительностью и темпом; невнятные помечены [SKIPPED]', () => {
    const msg = userMessage(job, [
      { itemId: 'q1', durationSec: 24.4, wpm: 130, transcript: "I'm from Taraz, a city in the south." },
      { itemId: 'q2', durationSec: 3, wpm: null, transcript: 'um' },
    ])
    expect(msg.startsWith('<answers>')).toBe(true)
    expect(msg).toContain("Q: Where is your hometown?\nA (24 s, 130 wpm): I'm from Taraz, a city in the south.")
    expect(msg).toContain('Q: Do you like it?\nA: [SKIPPED]')
    expect(msg).toContain('Q: What do you do?\nA: [SKIPPED]')
    expect(msg).toContain('answered 1 of 3 (2 skipped, not assessed)')
    expect(buildSystemPrompt(2, 'kk')).toContain('Part 2')
    expect(buildSystemPrompt(2, 'kk')).toContain('in Kazakh')
    expect(buildSystemPrompt(1, 'ru')).toContain('[SKIPPED]')
  })

  it('внятный ответ — три английских слова и больше, и их не меньше половины', () => {
    expect(isUsableAnswer('')).toBe(false)
    expect(isUsableAnswer('um yes')).toBe(false)
    expect(isUsableAnswer('I live in Almaty')).toBe(true)
    expect(isUsableAnswer('Я живу в Алматы, ok')).toBe(false)
    expect(isUsableAnswer('... ... ...')).toBe(false)
  })

  it('три критерия от модели, произношение — от Azure; без него null, а не выдумка', () => {
    const r = normalizeSpeaking({ fluencyCoherence: 6.2, lexicalResource: 7, grammaticalRange: 5.8, strengths: ['a', ''], improvements: ['b'], feedback: 'ok' }, null)
    expect(r.criteria).toEqual({ fluencyCoherence: 6, lexicalResource: 7, grammaticalRange: 6, pronunciation: null })
    expect(r.strengths).toEqual(['a'])
    expect(() => normalizeSpeaking({ fluencyCoherence: 6 }, 7)).toThrow()
  })

  it('балл строкой и одиночная строка вместо списка тоже принимаются', () => {
    const r = normalizeSpeaking({ fluencyCoherence: '6.5', lexicalResource: 'Band 7', grammaticalRange: '5,5', strengths: 'good linking', improvements: [], feedback: 'x' }, 6)
    expect(r.criteria).toEqual({ fluencyCoherence: 6.5, lexicalResource: 7, grammaticalRange: 5.5, pronunciation: 6 })
    expect(r.strengths).toEqual(['good linking'])
  })
})

describe('gradeSpeaking: оценка не зависит от одного ответа модели', () => {
  const base = { model: 'main', fallbackModel: 'spare', job, uiLang: 'ru', pronunciation: 7, answers: [{ itemId: 'q1', durationSec: 20, wpm: 120, transcript: 'I live in a small town.' }] }

  it('первая попытка удалась — это основная модель с рассуждением', async () => {
    const run = vi.fn().mockResolvedValue(good)
    const r = await gradeSpeaking({ ...base, run, deadline: Date.now() + 80_000 })
    expect(r).toMatchObject({ model: 'main', attempt: 1, criteria: { fluencyCoherence: 6, pronunciation: 7 } })
    expect(run.mock.calls[0][0]).toMatchObject({ model: 'main', effort: 'medium', maxRetries: 0 })
  })

  it('основная упала или вернула неполный ответ — отвечает запасная, затем основная без глубины', async () => {
    const run = vi.fn().mockRejectedValueOnce(new Error('529 overloaded')).mockResolvedValueOnce({ fluencyCoherence: 6 }).mockResolvedValueOnce(good)
    const r = await gradeSpeaking({ ...base, run, deadline: Date.now() + 80_000 })
    expect(run.mock.calls.map((c) => [c[0].model, c[0].effort])).toEqual([['main', 'medium'], ['spare', undefined], ['main', undefined]])
    expect(r).toMatchObject({ model: 'main', attempt: 3 })
  })

  it('на следующую попытку держится запас времени, а без времени попытка не начинается', async () => {
    const run = vi.fn().mockRejectedValue(new Error('timeout'))
    let t = 0
    const now = () => t
    run.mockImplementation(async ({ timeoutMs }) => {
      t += timeoutMs
      throw new Error('timeout')
    })
    await expect(gradeSpeaking({ ...base, run, now, deadline: 50_000 })).rejects.toThrow(/speaking grading failed/)
    // 50 с: первая — 35 с (15 в запас), вторая — все оставшиеся 15 с (запас ей не по карману), третьей не остаётся
    expect(run.mock.calls.map((c) => c[0].timeoutMs)).toEqual([35_000, 15_000])
  })
})
