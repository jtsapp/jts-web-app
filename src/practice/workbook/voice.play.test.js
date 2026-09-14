// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Контракт кнопки «Аудио» в воркбуке A0: файла Track_07_11.mp3 в репозитории
// нет, поэтому playTrack обязан в том же тике прогреть speechSynthesis.
// Иначе iOS теряет жест на 404 mp3 и синтез молчит — «не включается аудио».

const spoken = []

class FakeUtterance {
  constructor(text) {
    this.text = text
    this.volume = 1
    this.rate = 1
    this.pitch = 1
    this.lang = ''
    this.onend = null
    this.onerror = null
  }
}

class FakeAudio {
  constructor(src = '') {
    this.src = src
    this.playbackRate = 1
    this.onended = null
    this.onerror = null
  }
  play() {
    return Promise.reject(new DOMException('NotSupportedError'))
  }
  pause() {}
}

function stubSpeech({ voices = [] } = {}) {
  const synth = {
    speaking: false,
    paused: false,
    getVoices: () => voices,
    speak: (u) => spoken.push(u),
    cancel: vi.fn(),
    resume: vi.fn(),
    addEventListener: vi.fn(),
  }
  vi.stubGlobal('speechSynthesis', synth)
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  vi.stubGlobal('Audio', FakeAudio)
  return synth
}

beforeEach(() => {
  spoken.length = 0
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('workbook playTrack', () => {
  it('без mp3 греет синтез в том же тике, что и вызов', async () => {
    stubSpeech()
    const { playTrack } = await import('./voice.js')
    playTrack([], ['read', 'cook'])

    expect(spoken[0]).toMatchObject({ text: ' ', volume: 0 })
  })

  it('после 404 mp3 читает реплики, не отменяя прогрев', async () => {
    const synth = stubSpeech()
    const { playTrack } = await import('./voice.js')
    playTrack(['/missing.mp3'], ['read'])

    expect(spoken[0]).toMatchObject({ text: ' ', volume: 0 })
    expect(synth.cancel).toHaveBeenCalledTimes(1)

    await vi.runAllTimersAsync()
    const texts = spoken.map((u) => u.text)
    expect(texts).toContain('read')
    expect(synth.cancel).toHaveBeenCalledTimes(1)
  })

  it('не ждёт список голосов: пустой getVoices() всё равно говорит', async () => {
    stubSpeech({ voices: [] })
    const { speak } = await import('./voice.js')
    speak(['hello'])
    await vi.advanceTimersByTimeAsync(90)
    expect(spoken.some((u) => u.text === 'hello')).toBe(true)
  })
})
