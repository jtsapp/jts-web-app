// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const playTts = vi.fn()
const prefetchTts = vi.fn()
const stopTts = vi.fn()
vi.mock('../../lib/speech.js', () => ({
  playTts: (...a) => playTts(...a),
  prefetchTts: (...a) => prefetchTts(...a),
  stopTts: (...a) => stopTts(...a),
}))

const { prefetch, say, silence, SLOW_RATE } = await import('./voice.js')

beforeEach(() => {
  playTts.mockReset()
  prefetchTts.mockReset()
  stopTts.mockReset()
  window.speechSynthesis = { cancel: vi.fn(), speak: vi.fn() }
  window.SpeechSynthesisUtterance = function Utterance(text) {
    this.text = text
  }
})

describe('озвучка', () => {
  it('Soniox британским голосом; «Медленнее» — тот же адрес с темпом устройства', () => {
    say('mother')
    say('mother', { slow: true })
    expect(playTts.mock.calls[0]).toEqual(['mother', expect.objectContaining({ voice: 'Freya', lang: 'en', speed: 0.9, rate: 1 })])
    expect(playTts.mock.calls[1][1]).toMatchObject({ voice: 'Freya', speed: 0.9, rate: SLOW_RATE })
  })

  it('синтез не начался — голос устройства en-GB на темпах прототипа', () => {
    say('My mother is a teacher.', { kind: 'sentence', slow: true })
    playTts.mock.calls[0][1].onFail('error')
    const u = window.speechSynthesis.speak.mock.calls[0][0]
    expect(u).toMatchObject({ text: 'My mother is a teacher.', lang: 'en-GB', rate: 0.6 })

    say('book', { kind: 'word', slow: true })
    playTts.mock.calls[1][1].onFail('timeout')
    expect(window.speechSynthesis.speak.mock.calls[1][0].rate).toBe(0.55)
  })

  it('пустой текст молчит; prefetch — те же голос и темп', () => {
    say('')
    expect(playTts).not.toHaveBeenCalled()
    prefetch('book')
    expect(prefetchTts).toHaveBeenCalledWith('book', { voice: 'Freya', lang: 'en', speed: 0.9 })
  })

  it('silence гасит и Soniox, и голос устройства', () => {
    silence()
    expect(stopTts).toHaveBeenCalled()
    expect(window.speechSynthesis.cancel).toHaveBeenCalled()
  })
})
