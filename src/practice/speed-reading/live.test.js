import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { startLive, START_TIMEOUT, NO_WORDS_MS } from './live.js'

class FakeRecognition {
  constructor() {
    this.starts = 0
    this.stopped = false
    this.aborted = false
  }
  start() {
    this.starts++
  }
  stop() {
    this.stopped = true
  }
  abort() {
    this.aborted = true
  }
}

// Результат Web Speech API: список фраз, у каждой — вариант [0] и признак isFinal.
const result = (...items) => ({ results: items.map(([t, fin]) => Object.assign([{ transcript: t }], { isFinal: fin })) })

let r
beforeEach(() => {
  vi.useFakeTimers()
  r = new FakeRecognition()
})
afterEach(() => vi.useRealTimers())

describe('startLive', () => {
  it('английское распознавание, финальные и промежуточные слова', () => {
    const onWords = vi.fn()
    const live = startLive({ createRecognition: () => r, onWords })
    expect(live).not.toBeNull()
    expect([r.lang, r.continuous, r.interimResults, r.starts]).toEqual(['en-US', true, true, 1])
    r.onstart()
    r.onresult(result(['Good evening', true], ['and here', false]))
    expect(onWords).toHaveBeenLastCalledWith(['Good', 'evening', 'and', 'here'])
  })

  it('перезапуск после onend сохраняет уже услышанное', () => {
    const onWords = vi.fn()
    startLive({ createRecognition: () => r, onWords })
    r.onstart()
    r.onresult(result(['Good evening', true]))
    r.onend()
    expect(r.starts).toBe(2)
    r.onresult(result(['and welcome', false]))
    expect(onWords).toHaveBeenLastCalledWith(['Good', 'evening', 'and', 'welcome'])
  })

  it('нет события start за 2 с — распознавание молчит', () => {
    const onDead = vi.fn()
    startLive({ createRecognition: () => r, onWords: () => {}, onDead })
    expect(START_TIMEOUT).toBe(2)
    vi.advanceTimersByTime(2000)
    expect(onDead).toHaveBeenCalledWith('silent')
    expect(r.aborted).toBe(true)
  })

  it('старт был, но 6 с ни одного слова — тоже молчит', () => {
    const onDead = vi.fn()
    startLive({ createRecognition: () => r, onWords: () => {}, onDead })
    r.onstart()
    vi.advanceTimersByTime(NO_WORDS_MS - 1)
    expect(onDead).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onDead).toHaveBeenCalledWith('silent')
  })

  it('слова пришли — сторож не срабатывает', () => {
    const onDead = vi.fn()
    startLive({ createRecognition: () => r, onWords: () => {}, onDead })
    r.onstart()
    r.onresult(result(['hello', false]))
    vi.advanceTimersByTime(60000)
    expect(onDead).not.toHaveBeenCalled()
  })

  it('запрет микрофона или сеть — отказ с кодом; no-speech — нет', () => {
    const onDead = vi.fn()
    startLive({ createRecognition: () => r, onWords: () => {}, onDead })
    r.onstart()
    r.onerror({ error: 'no-speech' })
    expect(onDead).not.toHaveBeenCalled()
    r.onerror({ error: 'not-allowed' })
    expect(onDead).toHaveBeenCalledWith('blocked')
  })

  it('stop — без перезапуска и без отказа', () => {
    const onDead = vi.fn()
    const live = startLive({ createRecognition: () => r, onWords: () => {}, onDead })
    r.onstart()
    live.stop()
    expect(r.stopped).toBe(true)
    r.onend?.()
    expect(r.starts).toBe(1)
    vi.advanceTimersByTime(10000)
    expect(onDead).not.toHaveBeenCalled()
  })

  it('распознавателя нет — null', () => {
    expect(startLive({ createRecognition: () => null, onWords: () => {} })).toBeNull()
  })
})
