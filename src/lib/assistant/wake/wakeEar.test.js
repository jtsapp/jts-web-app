import { describe, it, expect, vi } from 'vitest'
import { createWakeEar } from './wakeEar.js'
import { installMicArbiter } from './micArbiter.js'

// Vosk, микрофон и AudioContext — подменные: проверяется порядок и состояния
// «уха», а не распознавание (его замеряет лаборатория, src/app/wake-lab).
function fakes() {
  const recs = []
  class Rec {
    constructor(rate, grammar) {
      this.rate = rate
      this.grammar = grammar
      this.handlers = {}
      this.removed = false
      this.fed = 0
      recs.push(this)
    }
    on(ev, fn) {
      this.handlers[ev] = fn
    }
    acceptWaveform() {
      this.fed += 1
    }
    remove() {
      this.removed = true
    }
    say(text) {
      this.handlers.result?.({ result: { text } })
    }
  }
  const model = { KaldiRecognizer: Rec, terminate: vi.fn() }
  const track = {
    readyState: 'live',
    stop: vi.fn(function stop() {
      this.readyState = 'ended'
    }),
  }
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] }
  const node = { connect: vi.fn(), disconnect: vi.fn(), onaudioprocess: null }
  const ctx = {
    state: 'running',
    sampleRate: 48000,
    destination: {},
    onstatechange: null,
    createMediaStreamSource: vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() })),
    createScriptProcessor: vi.fn(() => node),
    resume: vi.fn(async () => {
      ctx.state = 'running'
      ctx.onstatechange?.()
    }),
    suspend: vi.fn(async () => {
      ctx.state = 'suspended'
      ctx.onstatechange?.()
    }),
    close: vi.fn(async () => {}),
  }
  return {
    recs,
    model,
    track,
    node,
    ctx,
    loadModel: vi.fn(async () => model),
    getUserMedia: vi.fn(async () => stream),
    createContext: () => ctx,
  }
}

const ear = (f, extra = {}) => {
  const states = []
  const onWake = vi.fn()
  const e = createWakeEar({
    modelUrl: '/m.tar.gz',
    onWake,
    onState: (s, err) => states.push(err ? `${s}:${err}` : s),
    loadModel: f.loadModel,
    getUserMedia: f.getUserMedia,
    createContext: f.createContext,
    ...extra,
  })
  return { e, states, onWake }
}

describe('«ухо» позывного', () => {
  it('start: модель → микрофон → распознаватель с грамматикой и частотой контекста', async () => {
    const f = fakes()
    const { e, states } = ear(f)
    await e.start()
    expect(states).toEqual(['loading', 'listening'])
    expect(e.state).toBe('listening')
    expect(f.recs[0].rate).toBe(48000)
    expect(JSON.parse(f.recs[0].grammar)).toEqual(['привет луна', 'салем луна', '[unk]'])
    f.node.onaudioprocess({ inputBuffer: {} })
    expect(f.recs[0].fed).toBe(1)
  })

  it('позывной — onWake, остальное — нет', async () => {
    const f = fakes()
    const { e, onWake } = ear(f)
    await e.start()
    f.recs[0].say('[unk]')
    f.recs[0].say('привет луна')
    expect(onWake).toHaveBeenCalledTimes(1)
  })

  it('stop отдаёт микрофон; повторный start не качает модель заново', async () => {
    const f = fakes()
    const { e, states } = ear(f)
    await e.start()
    e.stop()
    expect(f.track.stop).toHaveBeenCalled()
    expect(f.recs[0].removed).toBe(true)
    expect(e.state).toBe('idle')
    await e.start()
    expect(f.loadModel).toHaveBeenCalledTimes(1)
    expect(f.recs).toHaveLength(2)
    expect(states.at(-1)).toBe('listening')
  })

  it('повторный start, пока ждём микрофон, — не дубль', async () => {
    const f = fakes()
    const { e } = ear(f)
    await Promise.all([e.start(), e.start()])
    expect(f.getUserMedia).toHaveBeenCalledTimes(1)
    expect(f.recs).toHaveLength(1)
  })

  it('stop посреди загрузки модели — микрофон не берётся', async () => {
    const f = fakes()
    let release
    f.loadModel.mockImplementation(
      () =>
        new Promise((r) => {
          release = () => r(f.model)
        }),
    )
    const { e } = ear(f)
    const p = e.start()
    e.stop()
    release()
    await p
    expect(f.getUserMedia).not.toHaveBeenCalled()
    expect(e.state).toBe('idle')
  })

  it('prepare: модель и разрешение заранее, микрофон сразу отдан, не слушает', async () => {
    const f = fakes()
    const { e, states } = ear(f)
    await e.prepare()
    expect(states).toEqual(['loading', 'idle'])
    expect(f.track.stop).toHaveBeenCalled()
    expect(f.recs).toHaveLength(0)
    await e.start()
    expect(f.loadModel).toHaveBeenCalledTimes(1)
    expect(states.at(-1)).toBe('listening')
  })

  it('отказ в микрофоне — error:denied; модель не скачалась — error:model, повтор качает снова', async () => {
    const f = fakes()
    f.getUserMedia.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NotAllowedError' }))
    const a = ear(f)
    await a.e.start()
    expect(a.states.at(-1)).toBe('error:denied')

    const g = fakes()
    g.loadModel.mockRejectedValueOnce(new Error('404'))
    const b = ear(g)
    await b.e.start()
    expect(b.states.at(-1)).toBe('error:model')
    await b.e.start()
    expect(g.loadModel).toHaveBeenCalledTimes(2)
    expect(b.states.at(-1)).toBe('listening')
  })

  it('спящий контекст — asleep, resume будит', async () => {
    const f = fakes()
    f.ctx.state = 'suspended'
    f.ctx.resume.mockImplementationOnce(async () => {})
    const { e, states } = ear(f)
    await e.start()
    expect(states.at(-1)).toBe('asleep')
    e.resume()
    expect(states.at(-1)).toBe('listening')
  })

  it('микрофон «уха» арбитр чужим не считает', async () => {
    const f = fakes()
    const win = { navigator: { mediaDevices: { getUserMedia: f.getUserMedia } } }
    const claim = vi.fn()
    const arb = installMicArbiter({ win, onClaim: claim })
    const { e } = ear(f, { getUserMedia: (c) => win.navigator.mediaDevices.getUserMedia(c) })
    await e.start()
    expect(claim).not.toHaveBeenCalled()
    expect(arb.isBusy()).toBe(false)
    arb.uninstall()
  })
})
