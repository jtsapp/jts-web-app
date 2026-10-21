import { describe, it, expect } from 'vitest'
import { createRing, wav16k } from './preroll.js'

describe('кольцевой буфер «уха»', () => {
  it('отдаёт хвост от позиции, старое затирается', () => {
    const r = createRing(10, 1) // 10 сэмплов
    r.push(Float32Array.from([1, 2, 3, 4, 5, 6]))
    r.push(Float32Array.from([7, 8, 9, 10, 11, 12]))
    expect(r.fed).toBe(12)
    expect([...r.slice(8)]).toEqual([9, 10, 11, 12])
    expect([...r.slice(0)]).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('wavFrom — WAV 16 кГц от начала слова с запасом', async () => {
    const r = createRing(48000, 8)
    r.push(new Float32Array(48000 * 3))
    const buf = Buffer.from(await r.wavFrom(2).arrayBuffer())
    expect(buf.toString('ascii', 0, 4)).toBe('RIFF')
    expect(buf.readUInt32LE(24)).toBe(16000)
    // 1 с после слова + запас 0.25 с при 16 кГц, 2 байта на сэмпл
    expect(buf.readUInt32LE(40)).toBe(Math.round(1.25 * 16000) * 2)
  })

  it('без времени слова — последние 4 с; пустой буфер — ничего', () => {
    const r = createRing(16000, 8)
    expect(r.wavFrom(null)).toBe(null)
    r.push(new Float32Array(16000 * 6))
    expect(r.wavFrom(null).size).toBe(44 + 4 * 16000 * 2)
  })

  it('wav16k — заголовок PCM mono 16 бит', async () => {
    const buf = Buffer.from(await wav16k(new Float32Array(16000), 16000).arrayBuffer())
    expect(buf.readUInt16LE(22)).toBe(1)
    expect(buf.readUInt16LE(34)).toBe(16)
    expect(buf.length).toBe(44 + 32000)
  })
})
