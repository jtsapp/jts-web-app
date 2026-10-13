// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Контракт общего плеера Soniox: одна реплика на всё приложение, провал виден
// (onFail — только если звук так и не начался), и элемент один — ради iOS,
// где разрешение на звук выдаётся конкретному элементу.

const elements = []
let playImpl

class FakeAudio {
  constructor() {
    this.src = ''
    this.paused = true
    this.volume = 1
    this.playbackRate = 1
    this.defaultPlaybackRate = 1
    this.plays = 0
    elements.push(this)
  }
  play() {
    this.plays++
    this.paused = false
    return playImpl(this)
  }
  pause() {
    this.paused = true
  }
  removeAttribute(name) {
    if (name === 'src') this.src = ''
  }
  load() {}
}

let speech

beforeEach(async () => {
  elements.length = 0
  playImpl = () => Promise.resolve()
  vi.useFakeTimers()
  vi.stubGlobal('Audio', FakeAudio)
  vi.resetModules()
  speech = await import('./speech.js')
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('playTts', () => {
  it('ставит адрес /api/tts и зовёт play() синхронно — в тике нажатия', () => {
    speech.playTts('Hello there', { voice: 'Freya', speed: 0.9 })
    expect(elements).toHaveLength(1)
    expect(elements[0].src).toBe('/api/tts?v=Freya&l=en&s=0.9&t=Hello%20there')
    expect(elements[0].plays).toBe(1)
  })

  it('onStart — по «playing», onEnd — по «ended»', () => {
    const onStart = vi.fn()
    const onEnd = vi.fn()
    const onFail = vi.fn()
    speech.playTts('Hi', { onStart, onEnd, onFail })
    const a = elements[0]
    a.onplaying()
    expect(onStart).toHaveBeenCalledOnce()
    a.onended()
    expect(onEnd).toHaveBeenCalledOnce()
    expect(onFail).not.toHaveBeenCalled()
    expect(speech.isTtsActive()).toBe(false)
  })

  it('ошибка до старта (429/503/сеть) — onFail, чтобы вызывающий дочитал синтезом', () => {
    const onFail = vi.fn()
    const onEnd = vi.fn()
    speech.playTts('Hi', { onFail, onEnd })
    elements[0].onerror()
    expect(onFail).toHaveBeenCalledWith('error')
    expect(onEnd).not.toHaveBeenCalled()
    expect(speech.isTtsActive()).toBe(false)
  })

  it('обрыв после старта — это конец реплики, а не провал', () => {
    const onFail = vi.fn()
    const onEnd = vi.fn()
    speech.playTts('Hi', { onFail, onEnd })
    elements[0].onplaying()
    elements[0].onerror()
    expect(onEnd).toHaveBeenCalledOnce()
    expect(onFail).not.toHaveBeenCalled()
  })

  it('браузер не пустил звук без жеста — blocked', async () => {
    playImpl = () => Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' }))
    const onFail = vi.fn()
    speech.playTts('Hi', { onFail })
    await vi.advanceTimersByTimeAsync(0)
    expect(onFail).toHaveBeenCalledWith('blocked')
  })

  it('звук так и не начался — по сторожу timeout', async () => {
    playImpl = () => new Promise(() => {})
    const onFail = vi.fn()
    speech.playTts('Hi', { onFail })
    await vi.advanceTimersByTimeAsync(speech.START_TIMEOUT_MS - 1)
    expect(onFail).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(onFail).toHaveBeenCalledWith('timeout')
  })

  it('пустой текст — onFail("empty") и false, элемент не трогаем', () => {
    const onFail = vi.fn()
    expect(speech.playTts('   ', { onFail })).toBe(false)
    expect(onFail).toHaveBeenCalledWith('empty')
    expect(elements).toHaveLength(0)
  })

  it('новая реплика обрывает старую: у звучавшей — onEnd, её колбэки дальше молчат', () => {
    const first = { onEnd: vi.fn(), onFail: vi.fn() }
    speech.playTts('One', first)
    elements[0].onplaying()
    const second = { onStart: vi.fn() }
    speech.playTts('Two', second)
    expect(first.onEnd).toHaveBeenCalledOnce()
    // Элемент тот же — разрешение iOS живёт на нём.
    expect(elements).toHaveLength(1)
    expect(elements[0].src).toContain('t=Two')
    elements[0].onplaying()
    expect(second.onStart).toHaveBeenCalledOnce()
    expect(first.onFail).not.toHaveBeenCalled()
  })

  it('отказ опоздавшего play() старой реплики не валит новую', async () => {
    let rejectOld
    playImpl = () => new Promise((_, rej) => (rejectOld = rej))
    const first = { onFail: vi.fn() }
    speech.playTts('One', first)
    const reject = rejectOld
    playImpl = () => Promise.resolve()
    const second = { onFail: vi.fn() }
    speech.playTts('Two', second)
    reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    await vi.advanceTimersByTimeAsync(0)
    expect(first.onFail).not.toHaveBeenCalled()
    expect(second.onFail).not.toHaveBeenCalled()
  })

  it('темп элемента сбрасывается в 1 — Soniox уже прочитал с нужной скоростью', () => {
    speech.playTts('One')
    const a = elements[0]
    a.playbackRate = 0.5
    a.defaultPlaybackRate = 0.5
    speech.playTts('Two')
    expect(a.playbackRate).toBe(1)
    expect(a.defaultPlaybackRate).toBe(1)
  })

  it('rate — темп на устройстве: адрес /api/tts тот же, синтез один на все темпы', () => {
    speech.playTts('Thirteen', { voice: 'Freya', speed: 1, rate: 0.85 })
    const a = elements[0]
    expect(a.src).toBe('/api/tts?v=Freya&l=en&s=1&t=Thirteen')
    expect(a.playbackRate).toBe(0.85)
    expect(a.defaultPlaybackRate).toBe(0.85)
    expect(a.preservesPitch).toBe(true)
    speech.playTts('Thirteen', { voice: 'Freya', speed: 1, rate: 1.15 })
    expect(a.src).toBe('/api/tts?v=Freya&l=en&s=1&t=Thirteen')
    expect(a.playbackRate).toBe(1.15)
    speech.playTts('Thirteen', { voice: 'Freya', speed: 1 })
    expect(a.playbackRate).toBe(1)
  })
})

describe('playUrl', () => {
  it('готовая запись играет ТЕМ ЖЕ элементом (разрешение iOS), с темпом и обрывом прежней реплики', () => {
    const ended = vi.fn()
    speech.playTts('One', { onEnd: ended })
    const a = elements[0]
    a.onplaying()
    speech.playUrl('/practice/numbers/audio/abc.mp3', { rate: 0.85 })
    expect(elements).toHaveLength(1)
    expect(a.src).toBe('/practice/numbers/audio/abc.mp3')
    expect(a.playbackRate).toBe(0.85)
    expect(ended).toHaveBeenCalledTimes(1)
  })

  it('файл не загрузился до старта — onFail, чтобы вызывающий взял синтез', () => {
    const onFail = vi.fn()
    speech.playUrl('/practice/numbers/audio/missing.mp3', { onFail })
    elements[0].onerror()
    expect(onFail).toHaveBeenCalledWith('error')
  })

  it('пустой адрес — onFail("empty") и false', () => {
    const onFail = vi.fn()
    expect(speech.playUrl('', { onFail })).toBe(false)
    expect(onFail).toHaveBeenCalledWith('empty')
  })
})

describe('stopTts / пауза', () => {
  it('стоп звучавшей реплики зовёт onEnd — индикатор «играет» гаснет', () => {
    const onEnd = vi.fn()
    speech.playTts('Hi', { onEnd })
    elements[0].onplaying()
    speech.stopTts()
    expect(onEnd).toHaveBeenCalledOnce()
    expect(elements[0].paused).toBe(true)
    expect(elements[0].src).toBe('')
  })

  it('стоп до старта — ни onEnd, ни onFail', async () => {
    playImpl = () => new Promise(() => {})
    const onEnd = vi.fn()
    const onFail = vi.fn()
    speech.playTts('Hi', { onEnd, onFail })
    speech.stopTts()
    await vi.advanceTimersByTimeAsync(speech.START_TIMEOUT_MS + 10)
    expect(onEnd).not.toHaveBeenCalled()
    expect(onFail).not.toHaveBeenCalled()
  })

  it('стоп без реплики не обрывает тишину разблокировки', () => {
    speech.unlockSpeech()
    const a = elements[0]
    expect(a.src).toMatch(/^data:audio\/wav/)
    speech.stopTts()
    expect(a.src).toMatch(/^data:audio\/wav/)
  })

  it('пауза до старта снимает сторож, продолжение ставит его снова', async () => {
    playImpl = () => new Promise(() => {})
    const onFail = vi.fn()
    speech.playTts('Hi', { onFail })
    speech.pauseTts()
    await vi.advanceTimersByTimeAsync(speech.START_TIMEOUT_MS * 2)
    expect(onFail).not.toHaveBeenCalled()
    speech.resumeTts()
    await vi.advanceTimersByTimeAsync(speech.START_TIMEOUT_MS)
    expect(onFail).toHaveBeenCalledWith('timeout')
  })
})

describe('prefetchTts', () => {
  it('заказывает запись один раз на адрес', () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)) }))
    vi.stubGlobal('fetch', fetchMock)
    speech.prefetchTts('Next line', { voice: 'Oliver' })
    speech.prefetchTts('Next  line ', { voice: 'Oliver' })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/tts?v=Oliver&l=en&s=1&t=Next%20line')
  })
})
