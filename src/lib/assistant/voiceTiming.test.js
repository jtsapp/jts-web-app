import { describe, it, expect } from 'vitest'
import { TIMING_FLAG, timingParts, voiceTimingVisible } from './voiceTiming.js'

const store = (v) => ({ getItem: (k) => (k === TIMING_FLAG ? v : null) })
const t = (key, vars) => `${key}:${vars.s}`

describe('замер голоса в окне помощника', () => {
  it('подпись — на деве и по флагу, на проде и локально без флага — нет', () => {
    expect(voiceTimingVisible('dev-tutor.justtostudy.kz', store(null))).toBe(true)
    expect(voiceTimingVisible('ai-tutor.justtostudy.kz', store(null))).toBe(false)
    expect(voiceTimingVisible('localhost', store(null))).toBe(false)
    expect(voiceTimingVisible('localhost', store('1'))).toBe(true)
    expect(voiceTimingVisible('ai-tutor.justtostudy.kz', store('1'))).toBe(true)
  })

  it('закрытое хранилище не роняет окно — решает адрес', () => {
    const broken = { getItem: () => { throw new Error('SecurityError') } }
    expect(voiceTimingVisible('localhost', broken)).toBe(false)
    expect(voiceTimingVisible('dev-tutor.justtostudy.kz', broken)).toBe(true)
  })

  it('секунды с одним знаком; чего не мерили — того в подписи нет', () => {
    expect(timingParts({ sttMs: 940, textMs: 1260, soundMs: 2049 }, t)).toEqual([
      'assistant.timing.stt:0.9',
      'assistant.timing.text:1.3',
      'assistant.timing.sound:2.0',
    ])
    expect(timingParts({ textMs: 800, soundMs: null }, t)).toEqual(['assistant.timing.text:0.8'])
    expect(timingParts(null, t)).toEqual([])
  })
})
