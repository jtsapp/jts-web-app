import { describe, it, expect, vi } from 'vitest'
import { bufferResponse, createMp3Encoder, createSpeakStore, MAX_TICKETS, TICKET_TTL_MS } from './speakStream.js'

const settle = async (n = 4) => {
  for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0))
}
const readAll = async (stream) => Buffer.from(await new Response(stream).arrayBuffer())

// Полсекунды «речи»: тон с шумом, 24 кГц, 16 бит LE.
function pcm(ms = 500) {
  const n = (24000 * ms) / 1000
  const b = Buffer.alloc(n * 2)
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(6000 * Math.sin(i / 9)), i * 2)
  return b
}

describe('MP3 из потока PCM', () => {
  it('куски с любыми границами (и нечётными) дают тот же MP3, что и целиком', () => {
    const src = pcm()
    const whole = createMp3Encoder()
    const one = Buffer.concat([whole.push(src), whole.end()])
    const split = createMp3Encoder()
    const parts = []
    for (let i = 0; i < src.length; i += 777) parts.push(split.push(src.subarray(i, i + 777)))
    parts.push(split.end())
    const two = Buffer.concat(parts)
    expect(two.equals(one)).toBe(true)
    // Заголовок кадра MPEG: 11 единичных бит синхронизации.
    expect(one[0]).toBe(0xff)
    expect(one[1] & 0xe0).toBe(0xe0)
  })
})

describe('билеты озвучки', () => {
  it('звук отдаётся по мере синтеза, повторный GET — с начала', async () => {
    const store = createSpeakStore()
    let sink
    let finish
    const id = store.open({ text: 'Фраза' }, (s) => {
      sink = s
      return new Promise((r) => (finish = r))
    })
    const t = store.get(id)
    await settle()
    let readyNow = false
    store.ready(t).then(() => (readyNow = true))
    await settle()
    expect(readyNow).toBe(false)

    sink.write(Buffer.from([1, 2]))
    await settle()
    expect(readyNow).toBe(true)
    const first = readAll(store.stream(t))
    sink.write(Buffer.from([3]))
    finish()
    expect([...(await first)]).toEqual([1, 2, 3])
    expect([...(await readAll(store.stream(t)))]).toEqual([1, 2, 3])
    expect(t.done && !t.failed).toBe(true)
  })

  it('синтез упал без единого байта — билет failed, с ошибкой', async () => {
    const store = createSpeakStore()
    const t = store.get(store.open({}, async () => {
      throw new Error('nope')
    }))
    await store.ready(t)
    expect(t.failed).toBe(true)
    expect(t.error.message).toBe('nope')
  })

  it('упал после звука — не failed: звучит то, что успело', async () => {
    const store = createSpeakStore()
    const t = store.get(store.open({}, async (s) => {
      s.write(Buffer.from([9]))
      throw new Error('broke')
    }))
    await settle()
    expect(t.failed).toBe(false)
    expect([...(await readAll(store.stream(t)))]).toEqual([9])
  })

  it('чужой или кривой id — null', () => {
    const store = createSpeakStore()
    expect(store.get('../etc/passwd')).toBeNull()
    expect(store.get('00000000-0000-4000-8000-000000000000')).toBeNull()
    expect(store.get(undefined)).toBeNull()
  })

  it(`живёт ${TICKET_TTL_MS / 60000} минут, больше ${MAX_TICKETS} не копит`, async () => {
    vi.useFakeTimers()
    try {
      const store = createSpeakStore({ maxTickets: 3 })
      const ids = [1, 2, 3, 4].map(() => store.open({}, async () => {}))
      expect(store.size()).toBe(3)
      expect(store.get(ids[0])).toBeNull()
      expect(store.get(ids[3])).not.toBeNull()
      vi.advanceTimersByTime(TICKET_TTL_MS + 1)
      expect(store.size()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('готовая запись и Range', () => {
  const req = (range) => new Request('http://x/', { headers: range ? { range } : {} })

  it('пробный bytes=0-1 Safari — 206 с Content-Range', async () => {
    const r = bufferResponse(Buffer.from([1, 2, 3, 4]), req('bytes=0-1'))
    expect(r.status).toBe(206)
    expect(r.headers.get('content-range')).toBe('bytes 0-1/4')
    expect([...Buffer.from(await r.arrayBuffer())]).toEqual([1, 2])
  })

  it('без Range — целиком; за пределами — 416', async () => {
    const r = bufferResponse(Buffer.from([1, 2, 3]), req(), { 'x-a': '1' })
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toBe('audio/mpeg')
    expect(r.headers.get('x-a')).toBe('1')
    expect(bufferResponse(Buffer.from([1]), req('bytes=5-')).status).toBe(416)
  })
})
