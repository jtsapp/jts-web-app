import { describe, it, expect } from 'vitest'
import { HINT_MAX_CHARS, singingContext, sttHint } from './sttHint.js'

// Обратная связь 11.11: в караоке распознавание теряло спетые слова — текст песни идёт подсказкой.
describe('sttHint', () => {
  it('строки песни — фразами, припев один раз, пунктуация убрана', () => {
    const hint = sttHint('I woke up, in the morning!\nOh-oh, yeah…\nI woke up, in the morning!\n\n')
    expect(hint.phrases).toEqual(['I woke up in the morning', 'Oh-oh yeah'])
  })

  it('пусто или мусор — подсказки нет', () => {
    expect(sttHint('')).toBeNull()
    expect(sttHint(null)).toBeNull()
    expect(sttHint('!!! …')).toBeNull()
  })

  it('длинный текст обрезается до лимита Soniox с запасом', () => {
    const hint = sttHint('la '.repeat(5000))
    expect(hint.text.length).toBeLessThanOrEqual(HINT_MAX_CHARS)
    expect(hint.phrases[0].length).toBeLessThanOrEqual(80)
  })

  it('контекст Soniox — текст песни и что это пение', () => {
    const ctx = singingContext(sttHint('Hello from the other side'))
    expect(ctx.text).toBe('Hello from the other side')
    expect(ctx.general[0].value).toMatch(/sings/)
  })
})
