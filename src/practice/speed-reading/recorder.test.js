import { describe, it, expect, vi } from 'vitest'
import { openRecorder, canRecord, MAX_RECORD_MS, MIC_CONSTRAINTS, MIX_STOP_MS, wavPeak } from './recorder.js'

/** WAV 16 бит из сэмплов: 44 байта заголовка (содержимое неважно) и PCM. */
function pcmWav(samples) {
  const b = new Uint8Array(44 + samples.length * 2)
  const v = new DataView(b.buffer)
  samples.forEach((x, i) => v.setInt16(44 + i * 2, x, true))
  return new Blob([b], { type: 'audio/wav' })
}

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
  it('v1.2: с mixWith — вторая дорожка «голос + фон»: оба WAV, take() — сведённая запись', async () => {
    const stream = fakeStream()
    const { FakeMR, made } = fakeRecorderClass()
    const release = vi.fn()
    const mixed = { id: 'mixed' }
    const mixWith = vi.fn(() => ({ stream: mixed, release }))
    const toWav = vi.fn(async () => pcmWav([0, 4000, -3000]))
    const rec = await openRecorder({ getUserMedia: async () => stream, MediaRecorderCtor: FakeMR, toWav, mixWith, timers: timers() })
    expect(mixWith).not.toHaveBeenCalled() // сведение — на старте записи, после отсчёта
    rec.start()
    expect(mixWith).toHaveBeenCalledWith(stream)
    expect(made.map((m) => m.stream)).toEqual([stream, mixed])
    expect((await rec.stop()).type).toBe('audio/wav')
    const take = await rec.take()
    // сведённая — тоже WAV: webm Chrome без длительности не перематывается
    expect(take.type).toBe('audio/wav')
    expect(toWav).toHaveBeenCalledTimes(2)
    expect(release).toHaveBeenCalledOnce()
    expect(stream.tracks.every((t) => t.stop.mock.calls.length === 1)).toBe(true)
  })

  it('сведение записалось тишиной при живом голосе (спящий контекст iOS) — take() null, слушается голос', async () => {
    const { FakeMR } = fakeRecorderClass()
    let n = 0
    const toWav = vi.fn(async () => (n++ === 0 ? pcmWav([0, 9000, -7000]) : pcmWav([0, 3, -2])))
    const rec = await openRecorder({ getUserMedia: async () => fakeStream(), MediaRecorderCtor: FakeMR, toWav, mixWith: () => ({ stream: {}, release() {} }), timers: timers() })
    rec.start()
    await rec.stop()
    expect(await rec.take()).toBeNull()
  })

  it('сведённая дорожка не остановилась — основная запись не ждёт её дольше MIX_STOP_MS', async () => {
    const stream = fakeStream()
    const { FakeMR, made } = fakeRecorderClass()
    const t = timers()
    const rec = await openRecorder({ getUserMedia: async () => stream, MediaRecorderCtor: FakeMR, toWav: async () => pcmWav([5000]), mixWith: () => ({ stream: { id: 'mixed' }, release() {} }), timers: t })
    rec.start()
    made[1].stop = function () {
      this.state = 'inactive' // onstop так и не придёт
    }
    let wav = null
    const done = rec.stop().then((w) => (wav = w))
    await Promise.resolve()
    expect(t.list.some((x) => x.on && x.ms === MIX_STOP_MS)).toBe(true)
    t.fire()
    await done
    expect(wav).not.toBeNull()
    expect(stream.tracks.every((x) => x.stop.mock.calls.length === 1)).toBe(true) // микрофон отпущен
    expect(await rec.take()).toBeNull()
  })

  it('wavPeak — пик PCM после заголовка; пустой и битый — 0', async () => {
    expect(await wavPeak(pcmWav([10, -300, 200]))).toBe(300)
    expect(await wavPeak(new Blob(['RIFF']))).toBe(0)
  })

  it('сведение не построилось — запись идёт, take() — null', async () => {
    const { FakeMR, made } = fakeRecorderClass()
    const rec = await openRecorder({ getUserMedia: async () => fakeStream(), MediaRecorderCtor: FakeMR, toWav: async (b) => b, mixWith: () => null, timers: timers() })
    rec.start()
    expect(made).toHaveLength(1)
    expect(await rec.stop()).not.toBeNull()
    expect(await rec.take()).toBeNull()
  })

  it('микрофон по запросу, запись кусками по 250 мс, стоп — WAV и дорожки отпущены', async () => {
    const stream = fakeStream()
    const { FakeMR, made } = fakeRecorderClass()
    const toWav = vi.fn(async (blob) => new Blob([await blob.text(), '-wav'], { type: 'audio/wav' }))
    const getUserMedia = vi.fn(async () => stream)
    const rec = await openRecorder({ getUserMedia, MediaRecorderCtor: FakeMR, toWav, timers: timers() })
    expect(getUserMedia).toHaveBeenCalledWith(MIC_CONSTRAINTS)
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
