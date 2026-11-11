import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { SCENES, sceneOf, volumeGain, createAmbience, REC_BG_LEVEL } from './ambience.js'

// Фон сцен в «контексте» без звука: узлы Web Audio — заглушки, которые помнят соединения. Проверяется обвязка
// (сигнал, шина записи, громкость, закрытие) и то, что каждая из 37 сцен рисуется без ошибки.

function param(v = 0) {
  return { value: v, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), cancelScheduledValues: vi.fn() }
}
function node(kind) {
  const n = { kind, to: [], connect: vi.fn((d) => (n.to.push(d), d)), disconnect: vi.fn((d) => (n.to = d ? n.to.filter((x) => x !== d) : [])), start: vi.fn(), stop: vi.fn() }
  return n
}
class FakeCtx {
  constructor() {
    this.state = 'running'
    this.currentTime = 0
    this.sampleRate = 8000
    this.destination = node('dest')
    this.made = []
    this.close = vi.fn()
    this.resume = vi.fn(async () => {})
  }
  mk(kind, extra = {}) {
    const n = Object.assign(node(kind), extra)
    this.made.push(n)
    return n
  }
  createGain() {
    return this.mk('gain', { gain: param(1) })
  }
  createDynamicsCompressor() {
    return this.mk('comp', { threshold: param(), ratio: param() })
  }
  createConvolver() {
    return this.mk('conv')
  }
  createBuffer(ch, len) {
    const data = Array.from({ length: ch }, () => new Float32Array(len))
    return { getChannelData: (c) => data[c] }
  }
  createBufferSource() {
    return this.mk('src', { loop: false })
  }
  createBiquadFilter() {
    return this.mk('filt', { frequency: param(), Q: param() })
  }
  createOscillator() {
    return this.mk('osc', { frequency: param(), type: 'sine' })
  }
  createStereoPanner() {
    return this.mk('pan', { pan: param() })
  }
  createMediaStreamDestination() {
    return this.mk('msd', { stream: { id: 'mixed' } })
  }
  createMediaStreamSource(s) {
    return this.mk('mss', { stream: s })
  }
}
function fakeTimers() {
  const list = []
  const add = (fn, ms, every) => (list.push({ fn, ms, every, on: true }), list.length)
  return {
    list,
    setTimeout: (fn, ms) => add(fn, ms, false),
    clearTimeout: (id) => list[id - 1] && (list[id - 1].on = false),
    setInterval: (fn, ms) => add(fn, ms, true),
    clearInterval: (id) => list[id - 1] && (list[id - 1].on = false),
    run: (ms) => list.filter((t) => t.on && !t.every && t.ms <= ms).forEach((t) => ((t.on = false), t.fn())),
  }
}

describe('сцены', () => {
  it('37 сцен — те, что в справочнике v1.2, у каждой значок и три названия', () => {
    const json = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/speed-reading-scenarios.json'), 'utf8'))
    expect(Object.keys(SCENES).sort()).toEqual(Object.keys(json.sounds).sort())
    for (const [key, sc] of Object.entries(SCENES)) {
      expect(sc.ic, key).toBe(json.sounds[key].icon)
      expect(sc.n, key).toEqual([json.sounds[key].ru, json.sounds[key].kk, json.sounds[key].en])
    }
    // и у каждого текста сцена есть
    for (const t of json.texts) expect(sceneOf(t.sound), t.id).not.toBeNull()
  })

  it('каждая сцена рисуется и отдаёт сигнал 0,9–6 с (дольше всех — гудки телефона)', () => {
    const timers = fakeTimers()
    const amb = createAmbience({ AudioContextCtor: FakeCtx, timers })
    for (const key of Object.keys(SCENES)) {
      const cue = amb.start(key)
      expect(cue, key).toBeGreaterThanOrEqual(0.9)
      expect(cue, key).toBeLessThan(6)
      expect(amb.playing()).toEqual({ key, preview: false })
    }
    amb.close()
  })

  it('незнакомый ключ — без звука и без ошибки', () => {
    const amb = createAmbience({ AudioContextCtor: FakeCtx, timers: fakeTimers() })
    expect(sceneOf('nope')).toBeNull()
    expect(sceneOf('constructor')).toBeNull()
    expect(amb.start('nope')).toBe(0)
    expect(amb.playing()).toBeNull()
  })
})

describe('createAmbience', () => {
  it('без Web Audio — тишина, а не исключение', () => {
    const amb = createAmbience({ AudioContextCtor: undefined, timers: fakeTimers() })
    expect(amb.wake()).toBe(false)
    expect(amb.start('airport')).toBe(0)
    expect(amb.mixer({}, true)).toBeNull()
    amb.close()
  })

  it('«послушать» гаснет само через 7 с и зовёт onPreviewEnd', () => {
    const timers = fakeTimers()
    const amb = createAmbience({ AudioContextCtor: FakeCtx, timers })
    const done = vi.fn()
    amb.start('airport', { preview: 7, onPreviewEnd: done })
    expect(amb.playing()).toEqual({ key: 'airport', preview: true })
    timers.run(7000)
    expect(done).toHaveBeenCalledOnce()
    expect(amb.playing()).toBeNull()
  })

  it('шина записи: сведение микрофона и фона на 45 %, сцена подключается к уже звучащей и отключается', () => {
    let ctx = null
    class Ctx extends FakeCtx {
      constructor() {
        super()
        ctx = this
      }
    }
    const amb = createAmbience({ AudioContextCtor: Ctx, timers: fakeTimers() })
    amb.wake()
    amb.start('stadium') // сигнал звучит до отсчёта — шины ещё нет
    const mic = { id: 'mic' }
    const m = amb.mixer(mic, true)
    expect(m.stream).toEqual({ id: 'mixed' })
    expect(m.bus.gain.value).toBe(REC_BG_LEVEL)
    const micNode = ctx.made.find((n) => n.kind === 'mss')
    expect(micNode.stream).toBe(mic)
    expect(micNode.to.map((n) => n.kind)).toEqual(['msd'])
    const intoBus = () => ctx.made.filter((n) => n.kind === 'gain' && n.to.includes(m.bus))
    expect(intoBus()).toHaveLength(0)
    amb.route(m.bus) // запись стартовала — звучащая сцена идёт и в неё
    expect(intoBus()).toHaveLength(1)
    amb.route(null)
    expect(intoBus()).toHaveLength(0)
    amb.route(m.bus)
    const before = intoBus().length
    amb.start('airport') // выключили и включили фон посреди записи — новая сцена сразу в шине
    // прежняя сцена отключается отложенно (затухание), поэтому новая — плюс одна
    expect(intoBus()).toHaveLength(before + 1)
    m.setOn(false)
    expect(m.bus.gain.value).toBe(0)
    m.release()
    expect(micNode.disconnect).toHaveBeenCalled()
    amb.close()
    expect(ctx.close).toHaveBeenCalled()
  })

  it('громкость — кривая прототипа, 45 % по умолчанию', () => {
    expect(volumeGain(0)).toBe(0)
    expect(volumeGain(100)).toBeCloseTo(1.8, 6)
    expect(volumeGain(45)).toBeCloseTo(Math.pow(0.45, 1.3) * 1.8, 6)
    const amb = createAmbience({ AudioContextCtor: FakeCtx, timers: fakeTimers() })
    expect(amb.volume).toBe(45)
    amb.setVolume(150)
    expect(amb.volume).toBe(100)
  })
})
