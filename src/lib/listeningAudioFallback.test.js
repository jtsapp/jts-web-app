// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { speakListeningAudio } from './ielts-audio.js'

// Между ElevenLabs и синтезом с 23.09.2026 стоит Soniox (src/lib/speech.js).
// Этот файл — про цепочку до синтеза, поэтому Soniox здесь «не отвечает»:
// подставной playTts сразу сообщает о провале.
const soniox = { up: false, calls: [] }
vi.mock('./speech.js', () => ({
  playTts: (text, o) => {
    soniox.calls.push({ text, ...o })
    if (soniox.up) o.onStart?.()
    else o.onFail?.('error')
    return true
  },
  stopTts: () => {},
  unlockSpeech: () => {},
}))

// Контракт: 'fallback' — это «синтез заговорил», а не «текст принят в очередь».
// На iOS speak() без жеста молчит и НЕ бросает; поверив ему, экран Listening
// уходил в «Играет…» навсегда и списывал одно из двух прослушиваний.

let utterances = []
class FakeUtterance {
  constructor(text) {
    this.text = text
    this.onstart = null
    this.onerror = null
    this.onend = null
    utterances.push(this)
  }
}
const synth = { speak: vi.fn(), cancel: vi.fn() }

// jsdom не реализует HTMLMediaElement.play/pause: без подмены разблокировка
// жеста внутри speakListeningAudio валит в консоль «Not implemented», хотя к
// предмету теста — браузерному фолбэку — никакого отношения не имеет.
class FakeAudio {
  constructor(src = '') {
    this.src = src
    this.paused = true
    this.volume = 1
    this.currentTime = 0
    this.onended = null
    this.onerror = null
  }
  play() {
    this.paused = false
    return Promise.resolve()
  }
  pause() {
    this.paused = true
  }
  addEventListener() {}
  removeEventListener() {}
}

beforeEach(() => {
  utterances = []
  synth.speak.mockClear()
  synth.cancel.mockClear()
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  vi.stubGlobal('speechSynthesis', synth)
  vi.stubGlobal('Audio', FakeAudio)
  // ElevenLabs недоступен — гарантированно уходим в браузерный фолбэк.
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('speakListeningAudio → браузерный фолбэк', () => {
  it('молчащий синтез (iOS без жеста) — это none, а не fallback', async () => {
    const p = speakListeningAudio('Section one. You will hear a conversation.')
    await vi.advanceTimersByTimeAsync(0) // отработал fetch, вызван speak()
    expect(synth.speak).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(2000) // ни onstart, ни onerror не пришли
    await expect(p).resolves.toBe('none')
    // cancel: перед speak() и по таймауту — чтобы опоздавшая речь не зазвучала.
    expect(synth.cancel).toHaveBeenCalledTimes(2)
  })

  it('onstart — звук пошёл, отдаём fallback', async () => {
    const p = speakListeningAudio('Section one.')
    await vi.advanceTimersByTimeAsync(0)
    utterances[0].onstart()
    await expect(p).resolves.toBe('fallback')
  })

  it('onerror до старта — none', async () => {
    const p = speakListeningAudio('Section one.')
    await vi.advanceTimersByTimeAsync(0)
    utterances[0].onerror({ error: 'not-allowed' })
    await expect(p).resolves.toBe('none')
  })

  it('onEnd не зовут, если речь так и не началась', async () => {
    const onEnd = vi.fn()
    const p = speakListeningAudio('Section one.', { onEnd })
    await vi.advanceTimersByTimeAsync(2000)
    await expect(p).resolves.toBe('none')
    utterances[0].onend?.() // наш cancel() в части браузеров приходит как end
    expect(onEnd).not.toHaveBeenCalled()
  })

  it('после старта onEnd прокидывается', async () => {
    const onEnd = vi.fn()
    const p = speakListeningAudio('Section one.', { onEnd })
    await vi.advanceTimersByTimeAsync(0)
    utterances[0].onstart()
    await p
    utterances[0].onend()
    expect(onEnd).toHaveBeenCalledTimes(1)
  })
})
describe('speakListeningAudio → Soniox перед синтезом', () => {
  it('ElevenLabs недоступен — читает Soniox, синтез не трогаем', async () => {
    soniox.up = true
    soniox.calls.length = 0
    try {
      const p = speakListeningAudio('Section one.', { volume: 0.9 })
      await vi.advanceTimersByTimeAsync(0)
      await expect(p).resolves.toBe('soniox')
      expect(soniox.calls[0]).toMatchObject({ text: 'Section one.', volume: 0.9 })
      expect(synth.speak).not.toHaveBeenCalled()
    } finally {
      soniox.up = false
    }
  })
})
