import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/speech.js', () => ({ playTts: vi.fn(), playUrl: vi.fn(), stopTts: vi.fn() }))
const { playTts, playUrl, stopTts } = await import('../../lib/speech.js')
const { sayWord, stopWords } = await import('./voice.js')

afterEach(() => vi.clearAllMocks())

function deviceVoice() {
  const speak = vi.fn()
  globalThis.SpeechSynthesisUtterance = function (t) {
    this.text = t
  }
  globalThis.window = globalThis.window || globalThis
  window.speechSynthesis = { speak, cancel: vi.fn() }
  return speak
}

describe('озвучка слов Word Hunt', () => {
  it('запись курса — общим плеером, done по концу записи', () => {
    const done = vi.fn()
    sayWord({ text: 'big', url: 'https://files/x.mp3', rate: 1, done })
    expect(playUrl).toHaveBeenCalledWith('https://files/x.mp3', expect.objectContaining({ rate: 1 }))
    expect(playTts).not.toHaveBeenCalled()
    playUrl.mock.calls[0][1].onEnd('ended')
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('запись не загрузилась — то же слово через Soniox', () => {
    sayWord({ text: 'big', url: 'https://files/x.mp3', done: vi.fn() })
    playUrl.mock.calls[0][1].onFail('error')
    expect(playTts).toHaveBeenCalledWith('big', expect.objectContaining({ voice: 'Freya', lang: 'en', speed: 0.95 }))
  })

  it('без записи — Soniox британским голосом; «Звук» 0.9 — темпом на устройстве, адрес синтеза тот же', () => {
    sayWord({ text: 'look at', url: '', rate: 0.9, done: vi.fn() })
    const opts = playTts.mock.calls[0][1]
    expect(opts.speed).toBe(0.95)
    expect(opts.rate).toBeCloseTo(0.9 / 0.95)
  })

  it('сервер не ответил — голос устройства en-GB, done один раз', () => {
    const speak = deviceVoice()
    const done = vi.fn()
    sayWord({ text: 'favourite', url: '', done })
    playTts.mock.calls[0][1].onFail('error')
    expect(speak).toHaveBeenCalled()
    expect(speak.mock.calls[0][0].lang).toBe('en-GB')
    speak.mock.calls[0][0].onend()
    speak.mock.calls[0][0].onend()
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('пустой текст — без голоса устройства, но done приходит', () => {
    const speak = deviceVoice()
    const done = vi.fn()
    sayWord({ text: '', url: '', done })
    playTts.mock.calls[0][1].onFail('empty')
    expect(speak).not.toHaveBeenCalled()
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('новое слово глушит запасной голос предыдущего: два голоса разом не звучат', () => {
    const cancel = vi.fn()
    globalThis.window = globalThis.window || globalThis
    window.speechSynthesis = { speak: vi.fn(), cancel }
    sayWord({ text: 'listen', url: '', done: vi.fn() })
    expect(cancel).toHaveBeenCalled()
    expect(cancel.mock.invocationCallOrder[0]).toBeLessThan(playTts.mock.invocationCallOrder[0])
  })

  it('stopWords глушит и общий плеер, и голос устройства', () => {
    const cancel = vi.fn()
    globalThis.window = globalThis.window || globalThis
    window.speechSynthesis = { speak: vi.fn(), cancel }
    stopWords()
    expect(stopTts).toHaveBeenCalled()
    expect(cancel).toHaveBeenCalled()
  })
})
