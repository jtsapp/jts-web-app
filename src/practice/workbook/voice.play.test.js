// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Контракт кнопки «Аудио» в воркбуке A0: файла Track_07_11.mp3 в репозитории
// нет, поэтому playTrack обязан в том же тике прогреть speechSynthesis.
// Иначе iOS теряет жест на 404 mp3 и синтез молчит — «не включается аудио».
//
// С 23.09.2026 реплики первым читает Soniox (src/lib/speech.js), синтез
// устройства — запасной. Подставной playTts по умолчанию сразу сообщает о
// провале, и первые тесты проверяют именно запасной путь.

const spoken = []
const tts = { calls: [], prefetch: [], unlocks: 0, mode: 'down' }
vi.mock('../../lib/speech.js', () => ({
  playTts: (text, o) => {
    tts.calls.push({ text, ...o })
    if (tts.mode === 'down') o.onFail?.('error')
    return true
  },
  prefetchTts: (text, o) => tts.prefetch.push({ text, ...o }),
  stopTts: () => {},
  unlockSpeech: () => {
    tts.unlocks++
  },
}))

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
  tts.calls.length = 0
  tts.prefetch.length = 0
  tts.unlocks = 0
  tts.mode = 'down'
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

describe('workbook: Soniox первым', () => {
  it('элемент Soniox разблокируется в том же тике, что и нажатие', async () => {
    stubSpeech()
    tts.mode = 'up'
    const { playTrack } = await import('./voice.js')
    playTrack(['/missing.mp3'], ['read'])
    expect(tts.unlocks).toBe(1)
  })

  it('диалог читается двумя голосами по репликам, следующая заказана заранее', async () => {
    stubSpeech()
    tts.mode = 'up'
    const { speak } = await import('./voice.js')
    const done = vi.fn()
    speak(['Where is the station? — It is next to the bank.'], {}, done)

    expect(tts.calls).toHaveLength(1)
    expect(tts.calls[0]).toMatchObject({ text: 'Where is the station?', voice: 'Freya', speed: 0.95 })
    expect(tts.prefetch[0]).toMatchObject({ text: 'It is next to the bank.', voice: 'Oliver' })

    tts.calls[0].onEnd()
    await vi.advanceTimersByTimeAsync(500)
    expect(tts.calls).toHaveLength(2)
    expect(tts.calls[1]).toMatchObject({ text: 'It is next to the bank.', voice: 'Oliver' })

    tts.calls[1].onEnd()
    await vi.advanceTimersByTimeAsync(600)
    expect(done).toHaveBeenCalledOnce()
    // Синтез устройства молчит, когда Soniox ответил.
    expect(spoken.filter((u) => u.text.trim())).toHaveLength(0)
  })

  it('медленно — медленнее и Soniox, одиночное слово — разборчивее', async () => {
    stubSpeech()
    tts.mode = 'up'
    const { speak } = await import('./voice.js')
    speak(['The cat sat on the mat.'], { slow: true })
    expect(tts.calls[0].speed).toBe(0.75)
    speak(['cook'])
    expect(tts.calls[1].speed).toBe(0.9)
  })

  it('Soniox отказал посреди диалога — остаток дочитывает синтез с той же реплики', async () => {
    stubSpeech()
    tts.mode = 'up'
    const { speak } = await import('./voice.js')
    speak(['One. — Two.'])
    tts.mode = 'down'
    tts.calls[0].onEnd()
    await vi.runAllTimersAsync()
    const texts = spoken.map((u) => u.text).filter((x) => x.trim())
    expect(texts).toEqual(['Two.'])
  })

  it('оборванный стопом диалог дальше не идёт', async () => {
    stubSpeech()
    tts.mode = 'up'
    const { speak, stopAudio } = await import('./voice.js')
    speak(['One. — Two.'])
    stopAudio()
    tts.calls[0].onEnd()
    await vi.runAllTimersAsync()
    expect(tts.calls).toHaveLength(1)
  })
})
