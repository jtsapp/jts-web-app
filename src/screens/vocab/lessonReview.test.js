import { describe, it, expect } from 'vitest'
import {
  cycleQuestionCount,
  planCycle,
  shouldOfferCycle4,
  foldResults,
  answersMatch,
  writeTranslationOk,
  buildChoiceOptions,
  uniqueByKey,
} from './lessonReview.js'

const words = (n) =>
  Array.from({ length: n }, (_, i) => ({ key: `w${i + 1}`, word: `w${i + 1}` }))

const rng = () => {
  let t = 42
  return () => {
    t = (t * 1664525 + 1013904223) >>> 0
    return t / 2 ** 32
  }
}

describe('lesson vocab cycles', () => {
  it('цикл 1: вопросов столько, сколько слов', () => {
    expect(cycleQuestionCount(12, 1)).toBe(12)
    const tasks = planCycle(words(10), 1, null, rng())
    const q = tasks.reduce((n, t) => n + t.wordKeys.length, 0)
    expect(q).toBe(10)
  })

  it('цикл 2: N+20% и больше вопросов на ошибки', () => {
    expect(cycleQuestionCount(10, 2)).toBe(12)
    const prev = {
      w1: false, w2: false, w3: true, w4: true, w5: true,
      w6: true, w7: true, w8: true, w9: true, w10: true,
    }
    const tasks = planCycle(words(10), 2, prev, rng())
    const keys = tasks.flatMap((t) => t.wordKeys)
    expect(keys).toHaveLength(12)
    const wrongHits = keys.filter((k) => k === 'w1' || k === 'w2').length
    expect(wrongHits).toBeGreaterThanOrEqual(Math.round(12 * 0.8) - 1)
  })

  it('цикл 4 только если остались ошибки, 4–5 вопросов', () => {
    expect(shouldOfferCycle4({ a: true, b: false })).toBe(true)
    expect(shouldOfferCycle4({ a: true, b: true })).toBe(false)
    const tasks = planCycle(words(10), 4, { w1: false, w2: false }, rng())
    const q = tasks.reduce((n, t) => n + t.wordKeys.length, 0)
    expect(q).toBeGreaterThanOrEqual(4)
    expect(q).toBeLessThanOrEqual(5)
    expect(tasks.flatMap((t) => t.wordKeys).every((k) => k === 'w1' || k === 'w2')).toBe(true)
  })

  it('foldResults: ошибка по слову перекрывает поздний успех', () => {
    expect(foldResults([
      { key: 'awkward', ok: true },
      { key: 'awkward', ok: false },
      { key: 'interrupt', ok: true },
    ])).toEqual({ awkward: false, interrupt: true })
  })

  it('сравнение ответов нечувствительно к регистру и пунктуации', () => {
    expect(answersMatch('Awkward!', 'awkward')).toBe(true)
    expect(writeTranslationOk('Неловкий', { translationRu: 'неловкий', translationKz: 'ыңғайсыз' })).toBe(true)
    expect(writeTranslationOk('ыңғайсыз', { translationRu: 'неловкий', translationKz: 'ыңғайсыз' })).toBe(true)
    expect(writeTranslationOk('нет', { translationRu: 'неловкий' })).toBe(false)
  })

  it('choice не повторяет «и» и не дублирует один отвлекающий', () => {
    const word = { key: 'work', word: 'work', translationRu: 'Работайте сверху вниз' }
    const bank = [
      word,
      { key: 'and', word: 'and', translationRu: 'и' },
      { key: 'in', word: 'in', translationRu: 'в' },
    ]
    const opts = buildChoiceOptions(word, bank, 'ru', rng())
    const texts = opts.map((o) => o.text)
    expect(texts.filter((t) => t === 'Работайте сверху вниз')).toHaveLength(1)
    expect(texts).not.toContain('и')
    expect(texts).not.toContain('в')
    expect(new Set(texts).size).toBe(texts.length)
    expect(texts.length).toBeGreaterThanOrEqual(2)
  })

  it('match не троится одно слово и несёт только разные ключи', () => {
    const one = planCycle(words(1), 4, { w1: false }, rng())
    expect(one.some((t) => t.type === 'match')).toBe(false)
    expect(one.every((t) => new Set(t.wordKeys).size === t.wordKeys.length)).toBe(true)

    const many = planCycle(words(10), 1, null, rng())
    const matches = many.filter((t) => t.type === 'match')
    expect(matches.length).toBeGreaterThan(0)
    for (const t of matches) {
      expect(t.wordKeys.length).toBeGreaterThanOrEqual(3)
      expect(new Set(t.wordKeys).size).toBe(t.wordKeys.length)
    }
  })

  it('uniqueByKey оставляет первое вхождение, planCycle не плодит одно слово', () => {
    expect(uniqueByKey([
      { key: 'work', word: 'work' },
      { key: 'work', word: 'work' },
      { key: 'from', word: 'from' },
    ])).toEqual([{ key: 'work', word: 'work' }, { key: 'from', word: 'from' }])

    const dupes = Array.from({ length: 8 }, () => ({ key: 'work', word: 'work' }))
    const tasks = planCycle(dupes, 1, null, rng())
    const keys = tasks.flatMap((t) => t.wordKeys)
    expect(keys).toEqual(['work'])
    expect(tasks.some((t) => t.type === 'match')).toBe(false)
  })
})
