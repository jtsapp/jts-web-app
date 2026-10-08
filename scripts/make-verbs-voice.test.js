import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compress, fitClip, planClips, spokenText, toWav, MAX_CLIP_SEC } from './make-verbs-voice.js'

const RATE = 16000
const HERE = path.dirname(fileURLToPath(import.meta.url))
const tone = (sec, lead = 0, freq = 220) =>
  Float32Array.from({ length: Math.round((sec + lead) * RATE) }, (_, i) =>
    i < lead * RATE ? 0 : 0.5 * Math.sin((2 * Math.PI * freq * i) / RATE),
  )

describe('fitClip', () => {
  it('срезает тишину в начале: форма стартует на доле', () => {
    const r = fitClip(tone(0.3, 0.2))
    expect(r.sec).toBeLessThan(0.34)
    expect(Math.abs(r.samples[Math.round(0.01 * RATE)])).toBeGreaterThan(0.01)
  })
  it('длинное слово сжимает, а не рубит, и не выходит за потолок', () => {
    const r = fitClip(tone(0.6))
    expect(r.sec).toBeLessThanOrEqual(MAX_CLIP_SEC + 1e-6)
    expect(r.trimmed).toBe(false)
    expect(r.stretch).toBeGreaterThan(1)
  })
  it('сжатие не меняет высоту тона', () => {
    const out = compress(tone(0.6), 1.3)
    let cross = 0
    for (let i = 1; i < out.length; i++) if (out[i - 1] < 0 && out[i] >= 0) cross++
    expect(cross / (out.length / RATE)).toBeGreaterThan(200)
    expect(cross / (out.length / RATE)).toBeLessThan(240)
  })
})

describe('planClips', () => {
  it('ключи совпадают с файлами записей, лишних и пропущенных нет', () => {
    const verbs = JSON.parse(fs.readFileSync(path.join(HERE, '../public/practice/verbs/verbs.json'), 'utf8')).verbs
    const keys = [...planClips(verbs).keys()].sort()
    const files = fs
      .readdirSync(path.join(HERE, '../public/practice/verbs/audio'))
      .map((f) => f.replace('.wav', ''))
      .sort()
    expect(keys).toEqual(files)
  })
  it('омографы читаются однозначно', () => {
    expect(spokenText('read-base')).toBe('reed')
    expect(spokenText('read-past')).toBe('red')
  })
})

describe('toWav', () => {
  it('пишет 16 кГц моно PCM', () => {
    const w = toWav(tone(0.1))
    expect(w.toString('ascii', 0, 4)).toBe('RIFF')
    expect(w.readUInt32LE(24)).toBe(RATE)
    expect(w.readUInt16LE(22)).toBe(1)
  })
})
