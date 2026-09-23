// Оценка произношения длинной записи кусками параллельно. Потоковая оценка
// Azure идёт ~0.2 от длины аудио (5 минут речи — 57 с), и на проде за
// Cloudflare, который рвёт запрос после 100 секунд молчания, это съедало почти
// весь запас. Куски режутся по паузам — слово, разрезанное пополам, Azure
// засчитал бы как ошибку произношения.
import { describe, it, expect, vi } from 'vitest'
import { quietCuts, pcmToWav, extractPcm, assessPronunciationChunked } from './azure-pronunciation.js'

const RATE = 16000

// «Речь» — громкий шум, «пауза» — тишина. segments: [[секунды, громко?], ...]
function pcmOf(segments) {
  const total = segments.reduce((s, [sec]) => s + sec, 0)
  const pcm = Buffer.alloc(Math.round(total * RATE) * 2)
  let i = 0
  let seed = 1
  for (const [sec, loud] of segments) {
    const n = Math.round(sec * RATE)
    for (let k = 0; k < n; k++, i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      pcm.writeInt16LE(loud ? (seed % 20000) - 10000 : 0, i * 2)
    }
  }
  return pcm
}

const sec = (bytes) => bytes / 2 / RATE

describe('quietCuts', () => {
  it('короткая запись — один кусок целиком', () => {
    const pcm = pcmOf([[40, true]])
    expect(quietCuts(pcm, RATE, { maxChunkSec: 60 })).toEqual([[0, pcm.length]])
  })

  it('длинная запись режется в паузах, куски подряд и без дыр', () => {
    // 150 с речи, паузы на 48–49 и 101–102 с — цели резки 50 и 100 с.
    const pcm = pcmOf([
      [48, true],
      [1, false],
      [52, true],
      [1, false],
      [48, true],
    ])
    const cuts = quietCuts(pcm, RATE, { maxChunkSec: 60 })
    expect(cuts).toHaveLength(3)
    expect(cuts[0][0]).toBe(0)
    expect(cuts.at(-1)[1]).toBe(pcm.length)
    for (let i = 1; i < cuts.length; i++) expect(cuts[i][0]).toBe(cuts[i - 1][1])
    expect(sec(cuts[0][1])).toBeGreaterThanOrEqual(48)
    expect(sec(cuts[0][1])).toBeLessThanOrEqual(49)
    expect(sec(cuts[1][1])).toBeGreaterThanOrEqual(101)
    expect(sec(cuts[1][1])).toBeLessThanOrEqual(102)
    // Режем по границе сэмпла (16 бит), иначе кусок начнётся с полусэмпла.
    for (const [a, b] of cuts) {
      expect(a % 2).toBe(0)
      expect(b % 2).toBe(0)
    }
  })

  it('пауз нет вовсе — всё равно режет, и ни один кусок не вылезает за потолок с запасом поиска', () => {
    const pcm = pcmOf([[300, true]])
    const cuts = quietCuts(pcm, RATE, { maxChunkSec: 60 })
    expect(cuts).toHaveLength(5)
    for (const [a, b] of cuts) expect(sec(b - a)).toBeLessThanOrEqual(60 + 10)
  })
})

describe('pcmToWav', () => {
  it('extractPcm читает обратно те же сэмплы и частоту', () => {
    const pcm = pcmOf([[1, true]])
    const back = extractPcm(pcmToWav(pcm, RATE))
    expect(back.sampleRate).toBe(RATE)
    expect(Buffer.compare(back.pcm, pcm)).toBe(0)
  })
})

describe('assessPronunciationChunked', () => {
  const long = pcmToWav(pcmOf([[48, true], [1, false], [52, true], [1, false], [48, true]]), RATE)

  it('куски оцениваются параллельно, итог взвешен по словам', async () => {
    let inFlight = 0
    let peak = 0
    const results = [
      { accuracy: 90, fluency: 80, completeness: 100, prosody: 70, overall: 85, mock: false, transcript: 'one two three' },
      { accuracy: 60, fluency: 60, completeness: 100, prosody: 60, overall: 60, mock: false, transcript: 'four' },
      null, // тишина или сбой куска — в итог не идёт
    ]
    let call = 0
    const assess = vi.fn(async () => {
      const r = results[call++]
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((ok) => setTimeout(ok, 5))
      inFlight--
      return r
    })
    const out = await assessPronunciationChunked(long, { maxChunkSec: 60, assess })
    expect(assess).toHaveBeenCalledTimes(3)
    expect(peak).toBe(3)
    // 3 слова по 90 и 1 слово по 60 → 82.5 → 83
    expect(out).toMatchObject({ accuracy: 83, fluency: 75, completeness: 100, prosody: 68, overall: 79, mock: false })
    expect(out.transcript).toBe('one two three four')
  })

  it('каждый кусок уходит валидным WAV', async () => {
    const seen = []
    await assessPronunciationChunked(long, {
      maxChunkSec: 60,
      assess: async (wav) => {
        seen.push(extractPcm(wav))
        return null
      },
    })
    expect(seen.every((p) => p && p.sampleRate === RATE && p.pcm.length > 0)).toBe(true)
    expect(seen.reduce((s, p) => s + p.pcm.length, 0)).toBe(extractPcm(long).pcm.length)
  })

  it('все куски пустые — null, как у обычной оценки', async () => {
    expect(await assessPronunciationChunked(long, { maxChunkSec: 60, assess: async () => null })).toBeNull()
  })

  it('короткая запись — один вызов с исходным файлом', async () => {
    const short = pcmToWav(pcmOf([[20, true]]), RATE)
    const assess = vi.fn(async () => null)
    await assessPronunciationChunked(short, { maxChunkSec: 60, assess })
    expect(assess).toHaveBeenCalledTimes(1)
    expect(assess.mock.calls[0][0]).toBe(short)
  })
})
