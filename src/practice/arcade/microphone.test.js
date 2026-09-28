import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openMicrophone } from './microphone.js'

// Порт javaTest tests/microphone.test.ts: жизненный цикл микрофона на
// подставном устройстве — калибровка, закрытие и отмена ожидания разрешения.

function hardware() {
  const calls = []
  let stopped = false
  const stream = {
    getTracks: () => [{ stop: () => (stopped = true) }],
    getAudioTracks: () => [{ readyState: stopped ? 'ended' : 'live' }],
  }
  class FakeAudioContext {
    state = 'running'
    sampleRate = 48000
    resume() {
      calls.push('resume')
      return Promise.resolve()
    }
    close() {
      this.state = 'closed'
      calls.push('close')
      return Promise.resolve()
    }
    createMediaStreamSource() {
      return { connect() {}, disconnect() {} }
    }
    createAnalyser() {
      return {
        fftSize: 2048,
        getFloatTimeDomainData(samples) {
          samples.fill(0.03)
        },
      }
    }
  }
  return { calls, stream, FakeAudioContext, stopped: () => stopped }
}

let saved
beforeEach(() => {
  saved = {
    audio: Object.getOwnPropertyDescriptor(globalThis, 'AudioContext'),
    media: Object.getOwnPropertyDescriptor(globalThis.navigator, 'mediaDevices'),
  }
})
afterEach(() => {
  if (saved.audio) Object.defineProperty(globalThis, 'AudioContext', saved.audio)
  else delete globalThis.AudioContext
  if (saved.media) Object.defineProperty(globalThis.navigator, 'mediaDevices', saved.media)
  else delete globalThis.navigator.mediaDevices
})

function install(h, getUserMedia) {
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: h.FakeAudioContext })
  Object.defineProperty(globalThis.navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
}

describe('arcade microphone', () => {
  it('калибровка меряет шум комнаты, закрытие отпускает устройство', async () => {
    const h = hardware()
    install(h, async () => {
      h.calls.push('permission')
      return h.stream
    })
    let calibrated = false
    const mic = await openMicrophone(() => (calibrated = true))
    // Контекст будится до ожидания разрешения — в тике нажатия.
    expect(h.calls.slice(0, 2)).toEqual(['resume', 'permission'])
    expect(calibrated).toBe(true)
    expect(Math.abs(mic.noiseFloor - 0.03)).toBeLessThan(0.0001)
    expect(mic.active()).toBe(true)
    mic.close()
    expect(h.stopped()).toBe(true)
    expect(mic.active()).toBe(false)
  })

  it('отмена ожидания закрывает звук и гасит поток, пришедший позже', async () => {
    const h = hardware()
    let grant
    install(h, () => new Promise((resolve) => (grant = resolve)))
    const controller = new AbortController()
    const pending = openMicrophone(() => {}, controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(h.calls).toContain('close')
    grant(h.stream)
    await Promise.resolve()
    expect(h.stopped()).toBe(true)
  })

  it('без getUserMedia — ошибка с кодом, а не текстом', async () => {
    Object.defineProperty(globalThis.navigator, 'mediaDevices', { configurable: true, value: undefined })
    await expect(openMicrophone()).rejects.toMatchObject({ code: 'unsupported' })
  })
})
