import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/speech.js', () => ({ playTts: vi.fn(), stopTts: vi.fn() }))
const { playTts, stopTts } = await import('../../lib/speech.js')
const { speakPronunciation, stopPronunciation } = await import('./voice.js')

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

describe('озвучка без записи', () => {
  it('британский голос Soniox, американский — для GA, «Медленно» — темп', () => {
    speakPronunciation('ship')
    expect(playTts).toHaveBeenLastCalledWith('ship', expect.objectContaining({ voice: 'Freya', lang: 'en', speed: 0.9 }))
    speakPronunciation('water', { accent: 'GA', slow: true })
    expect(playTts).toHaveBeenLastCalledWith('water', expect.objectContaining({ voice: 'Grace', speed: 0.7 }))
  })

  it('сервер не ответил — голос устройства с тем же акцентом', () => {
    const spoken = fakeSynth()
    speakPronunciation('water', { accent: 'GA' })
    playTts.mock.calls[0][1].onFail('error')
    expect(spoken[0].lang).toBe('en-US')
    expect(spoken[0].text).toBe('water')
  })

  it('onEnd — ровно один раз, и когда звука не было вовсе', () => {
    const onEnd = vi.fn()
    speakPronunciation('', { onEnd })
    const o = playTts.mock.calls[0][1]
    o.onFail('empty')
    o.onCancel()
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('stopPronunciation глушит и общий плеер, и голос устройства', () => {
    fakeSynth()
    stopPronunciation()
    expect(stopTts).toHaveBeenCalled()
    expect(window.speechSynthesis.cancel).toHaveBeenCalled()
  })
})
