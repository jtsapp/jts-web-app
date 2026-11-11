import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/speech.js', () => ({ playTts: vi.fn(), stopTts: vi.fn() }))
const { playTts, stopTts } = await import('../../lib/speech.js')
const { speakPunctuation, stopPunctuation } = await import('./voice.js')

afterEach(() => vi.clearAllMocks())

function fakeSynth() {
  const spoken = []
  globalThis.window = globalThis.window || globalThis
  globalThis.SpeechSynthesisUtterance = function (t) {
    this.text = t
  }
  window.speechSynthesis = { speak: (u) => spoken.push(u), cancel: vi.fn() }
  return spoken
}

describe('голос Луны в Punctuation World', () => {
  it('британский голос Soniox, темп прототипа', () => {
    speakPunctuation('Dexter has a map.')
    expect(playTts).toHaveBeenLastCalledWith('Dexter has a map.', expect.objectContaining({ voice: 'Freya', lang: 'en', speed: 0.9 }))
  })

  it('сервер не ответил — голос устройства en-GB', () => {
    const spoken = fakeSynth()
    speakPunctuation('Where is the ferry?')
    playTts.mock.calls[0][1].onFail('error')
    expect(spoken[0].lang).toBe('en-GB')
    expect(spoken[0].text).toBe('Where is the ferry?')
  })

  it('onEnd — ровно один раз, и когда звука не было вовсе', () => {
    const onEnd = vi.fn()
    speakPunctuation('', { onEnd })
    const o = playTts.mock.calls[0][1]
    o.onFail('empty')
    o.onCancel()
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('stopPunctuation глушит и общий плеер, и голос устройства', () => {
    fakeSynth()
    stopPunctuation()
    expect(stopTts).toHaveBeenCalled()
    expect(window.speechSynthesis.cancel).toHaveBeenCalled()
  })
})
