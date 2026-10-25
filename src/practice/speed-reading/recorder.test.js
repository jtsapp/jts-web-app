import { describe, it, expect, vi } from 'vitest'
import { openRecorder, canRecord, MAX_RECORD_MS } from './recorder.js'

function fakeStream() {
  const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }]
  return { tracks, getTracks: () => tracks }
}

function fakeRecorderClass() {
  const made = []
  class FakeMR {
    constructor(stream) {
      this.stream = stream
      this.state = 'inactive'
      this.mimeType = 'audio/webm'
      made.push(this)
    }
    start(ms) {
      this.timeslice = ms
      this.state = 'recording'
    }
    stop() {
      this.state = 'inactive'
      this.ondataavailable?.({ data: new Blob(['abc'], { type: 'audio/webm' }) })
      queueMicrotask(() => this.onstop?.())
    }
  }
  return { FakeMR, made }
}

function timers() {
  const list = []
  return {
    list,
    setTimeout: (fn, ms) => {
      list.push({ fn, ms, on: true })
      return list.length
    },
    clearTimeout: (id) => {
      if (list[id - 1]) list[id - 1].on = false
    },
    fire: () => list.filter((t) => t.on).forEach((t) => ((t.on = false), t.fn())),
  }
}

describe('openRecorder', () => {
  it('микрофон по запросу, запись кусками по 250 мс, стоп — WAV и дорожки отпущены', async () => {
    const stream = fakeStream()
    const { FakeMR, made } = fakeRecorderClass()
    const toWav = vi.fn(async (blob) => new Blob([await blob.text(), '-wav'], { type: 'audio/wav' }))
    const getUserMedia = vi.fn(async () => stream)
    const rec = await openRecorder({ getUserMedia, MediaRecorderCtor: FakeMR, toWav, timers: timers() })
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(made).toHaveLength(0) // MediaRecorder — только на start(): отсчёт 3-2-1 идёт до записи
    rec.start()
    expect(made[0].timeslice).toBe(250)
    const wav = await rec.stop()
    expect(await wav.text()).toBe('abc-wav')
    expect(toWav.mock.calls[0][0].type).toBe('audio/webm')
    expect(stream.tracks.every((t) => t.stop.mock.calls.length === 1)).toBe(true)
    expect(await rec.stop()).toBe(wav) // повторный стоп — тот же итог
  })

  it('потолок записи — onLimit через 3 минуты', async () => {
    const t = timers()
    const onLimit = vi.fn()
    const { FakeMR } = fakeRecorderClass()
    const rec = await openRecorder({ getUserMedia: async () => fakeStream(), MediaRecorderCtor: FakeMR, toWav: async (b) => b, onLimit, timers: t })
    rec.start()
    expect(MAX_RECORD_MS).toBe(180000)
    expect(t.list[0].ms).toBe(MAX_RECORD_MS)
    t.fire()
    expect(onLimit).toHaveBeenCalledOnce()
  })

  it('cancel — дорожки отпущены, WAV не собирается', async () => {
    const stream = fakeStream()
    const toWav = vi.fn()
    const { FakeMR } = fakeRecorderClass()
    const rec = await openRecorder({ getUserMedia: async () => stream, MediaRecorderCtor: FakeMR, toWav, timers: timers() })
    rec.start()
    rec.cancel()
    await Promise.resolve()
    expect(stream.tracks[0].stop).toHaveBeenCalled()
    expect(toWav).not.toHaveBeenCalled()
  })

  it('отказ в микрофоне — та же ошибка наружу', async () => {
    const err = Object.assign(new Error('denied'), { name: 'NotAllowedError' })
    await expect(openRecorder({ getUserMedia: async () => { throw err }, MediaRecorderCtor: class {}, timers: timers() })).rejects.toBe(err)
  })

  it('перевод в WAV упал — null, дорожки всё равно отпущены', async () => {
    const stream = fakeStream()
    const { FakeMR } = fakeRecorderClass()
    const rec = await openRecorder({ getUserMedia: async () => stream, MediaRecorderCtor: FakeMR, toWav: async () => { throw new Error('decode') }, timers: timers() })
    rec.start()
    expect(await rec.stop()).toBeNull()
    expect(stream.tracks[1].stop).toHaveBeenCalled()
  })
})

describe('canRecord', () => {
  it('нужны getUserMedia и MediaRecorder', () => {
    expect(canRecord({ navigator: { mediaDevices: { getUserMedia() {} } }, MediaRecorder: class {} })).toBe(true)
    expect(canRecord({ navigator: {}, MediaRecorder: class {} })).toBe(false)
    expect(canRecord({ navigator: { mediaDevices: { getUserMedia() {} } } })).toBe(false)
  })
})
