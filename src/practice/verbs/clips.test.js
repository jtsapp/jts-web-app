import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createClips, parseWav } from './clips.js'
import { fakeAudioContext } from './__fixtures__/fakeAudio.js'

const AUDIO = path.join(__dirname, '..', '..', '..', 'public', 'practice', 'verbs', 'audio')
const wav = (key) => new Uint8Array(readFileSync(path.join(AUDIO, `${key}.wav`)))

// WAV руками: RIFF, fmt, по желанию LIST нечётной длины, data.
function makeWav(samples, { rate = 8000, list = false } = {}) {
  const chunks = []
  const fmt = Buffer.alloc(8 + 16)
  fmt.write('fmt ', 0, 'latin1')
  fmt.writeUInt32LE(16, 4)
  fmt.writeUInt16LE(1, 8)
  fmt.writeUInt16LE(1, 10)
  fmt.writeUInt32LE(rate, 12)
  fmt.writeUInt32LE(rate * 2, 16)
  fmt.writeUInt16LE(2, 20)
  fmt.writeUInt16LE(16, 22)
  chunks.push(fmt)
  if (list) {
    const l = Buffer.alloc(8 + 3 + 1) // три байта и выравнивание до чётного
    l.write('LIST', 0, 'latin1')
    l.writeUInt32LE(3, 4)
    chunks.push(l)
  }
  const data = Buffer.alloc(8 + samples.length * 2)
  data.write('data', 0, 'latin1')
  data.writeUInt32LE(samples.length * 2, 4)
  samples.forEach((s, i) => data.writeInt16LE(s, 8 + i * 2))
  chunks.push(data)
  const body = Buffer.concat(chunks)
  const head = Buffer.alloc(12)
  head.write('RIFF', 0, 'latin1')
  head.writeUInt32LE(4 + body.length, 4)
  head.write('WAVE', 8, 'latin1')
  return new Uint8Array(Buffer.concat([head, body]))
}

describe('parseWav', () => {
  it('настоящая запись: 16 кГц, длина по data-чанку, сэмплы в [-1, 1]', () => {
    const r = parseWav(wav('go'))
    expect(r.rate).toBe(16000)
    expect(r.samples.length / r.rate).toBeCloseTo(0.349, 2)
    expect(Math.max(...r.samples)).toBeLessThanOrEqual(1)
    expect(Math.min(...r.samples)).toBeGreaterThanOrEqual(-1)
  })

  it('перешагивает LIST нечётной длины и читает PCM', () => {
    const r = parseWav(makeWav([16384, -16384], { list: true }))
    expect(r.rate).toBe(8000)
    expect(Array.from(r.samples)).toEqual([0.5, -0.5])
  })

  it('мусор и пустой data — null, а не исключение', () => {
    expect(parseWav(new Uint8Array([1, 2, 3]))).toBeNull()
    expect(parseWav(new TextEncoder().encode('not a wav file at all'))).toBeNull()
    expect(parseWav(makeWav([]))).toBeNull()
  })
})

describe('createClips', () => {
  const setup = (ctx = fakeAudioContext()) => {
    const load = vi.fn((url) => {
      const key = decodeURIComponent(url.split('/').pop().replace('.wav', ''))
      if (key === 'missing') return Promise.reject(new Error('404'))
      return Promise.resolve(wav(key).buffer.slice(0))
    })
    return { clips: createClips({ getContext: () => ctx, load }), ctx, load }
  }

  it('грузит раз и играет на время часов контекста', async () => {
    const { clips, ctx, load } = setup()
    await Promise.all([clips.ensure(['go', 'went']), clips.ensure(['go'])])
    expect(load).toHaveBeenCalledTimes(2)
    expect(clips.has('went')).toBe(true)
    expect(clips.play('went', 1.5)).toBe(true)
    const s = ctx.started.at(-1)
    expect(s.at).toBe(1.5)
    expect(s.buffer.sampleRate).toBe(16000)
  })

  it('нет записи — ensure отказывает; нет звука — тоже', async () => {
    const { clips } = setup()
    await expect(clips.ensure(['go', 'missing'])).rejects.toThrow()
    const mute = createClips({ getContext: () => null, load: () => Promise.resolve(wav('go').buffer) })
    await expect(mute.ensure(['go'])).rejects.toThrow(/no audio/)
    expect(mute.play('go', 0)).toBe(false)
  })

  it('стоп глушит всё запущенное и не зовёт onended', async () => {
    const { clips, ctx } = setup()
    await clips.ensure(['go'])
    const ended = vi.fn()
    clips.play('go', 0, ended)
    const node = ctx.started.at(-1).node
    clips.stop()
    expect(node.stopped).toBe(true)
    expect(node.onended).toBeNull()
    expect(ended).not.toHaveBeenCalled()
  })

  it('прогрев молча переживает промах', async () => {
    const { clips } = setup()
    expect(() => clips.prefetch(['missing', 'go'])).not.toThrow()
    await new Promise((r) => setTimeout(r, 0))
    expect(clips.has('go')).toBe(true)
  })
})

describe('после ревью', () => {
  it('громкость до первой игры контекст не создаёт', () => {
    const getContext = vi.fn(() => fakeAudioContext())
    const clips = createClips({ getContext, load: () => Promise.resolve(wav('go').buffer) })
    clips.setVolume(40)
    expect(getContext).not.toHaveBeenCalled()
  })

  it('буфер не строится (старый Safari) — play честно отвечает false', async () => {
    const ctx = fakeAudioContext()
    ctx.createBuffer = () => {
      throw new Error('NotSupportedError')
    }
    const clips = createClips({ getContext: () => ctx, load: () => Promise.resolve(wav('go').buffer.slice(0)) })
    await clips.ensure(['go'])
    expect(clips.play('go', 0)).toBe(false)
  })
})
