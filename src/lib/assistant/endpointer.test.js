import { describe, it, expect } from 'vitest'
import { NO_VOICE_MS, SILENCE_END_MS, createEndpointer } from './endpointer.js'

describe('конец голосового вопроса', () => {
  it(`тишина до речи — ждём до ${NO_VOICE_MS / 1000} с, потом no_voice`, () => {
    const e = createEndpointer()
    expect(e(false, 0)).toBe('go')
    expect(e(false, NO_VOICE_MS - 100)).toBe('go')
    expect(e(false, NO_VOICE_MS)).toBe('no_voice')
  })

  it(`после речи ${SILENCE_END_MS / 1000} с тишины — end`, () => {
    const e = createEndpointer()
    e(false, 0)
    e(true, 1000)
    expect(e(false, 2000)).toBe('go')
    expect(e(false, 1000 + SILENCE_END_MS)).toBe('end')
  })

  it('пауза короче порога не обрывает вопрос', () => {
    const e = createEndpointer()
    e(true, 0)
    expect(e(false, 1400)).toBe('go')
    expect(e(true, 1450)).toBe('go')
    expect(e(false, 2900)).toBe('go')
    expect(e(false, 1450 + SILENCE_END_MS)).toBe('end')
  })

  it('долгое раздумье перед вопросом не мешает, если голос появился до 8 с', () => {
    const e = createEndpointer()
    e(false, 0)
    expect(e(true, 7000)).toBe('go')
    // отметка 8 с уже позади, но голос был — это не «молчал», а пауза в речи
    expect(e(false, 8200)).toBe('go')
  })
})
