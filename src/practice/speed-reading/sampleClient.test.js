import { describe, it, expect, vi } from 'vitest'
import { requestSample, SAMPLE_URL } from './sampleClient.js'

const SAMPLE = { url: 'https://files/x.mp3', words: [['Hi', 0, 0.3]], wpm: 160 }
const res = (status, body) => new Response(body == null ? null : JSON.stringify(body), { status })

function seq(...answers) {
  const queue = answers.slice()
  return vi.fn(async () => {
    const a = queue.shift()
    if (a instanceof Error) throw a
    return a
  })
}

describe('requestSample', () => {
  it('готов — сразу', async () => {
    const fetchImpl = seq(res(200, { sample: SAMPLE }))
    const out = await requestSample('weather', { token: 'TOK', fetchImpl, sleep: vi.fn() })
    expect(out).toEqual({ status: 'ready', sample: SAMPLE })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe(SAMPLE_URL)
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer TOK')
    expect(JSON.parse(init.body)).toEqual({ id: 'weather' })
  })

  it('202 — ждём 3 с и спрашиваем снова', async () => {
    const sleep = vi.fn(async () => {})
    const out = await requestSample('w', { token: 't', fetchImpl: seq(res(202, { pending: true }), res(202, { pending: true }), res(200, { sample: SAMPLE })), sleep })
    expect(out.status).toBe('ready')
    expect(sleep.mock.calls).toEqual([[3000], [3000]])
  })

  it('десять раз 202 — сдаёмся', async () => {
    const answers = Array.from({ length: 10 }, () => res(202, { pending: true }))
    const fetchImpl = seq(...answers)
    const out = await requestSample('w', { token: 't', fetchImpl, sleep: vi.fn(async () => {}) })
    expect(out).toEqual({ status: 'error' })
    expect(fetchImpl).toHaveBeenCalledTimes(10)
  })

  it('503 — образец недоступен; сеть или 502 — ошибка', async () => {
    expect(await requestSample('w', { token: 't', fetchImpl: seq(res(503, {})), sleep: vi.fn() })).toEqual({ status: 'unavailable' })
    expect(await requestSample('w', { token: 't', fetchImpl: seq(new Error('offline')), sleep: vi.fn() })).toEqual({ status: 'error' })
    expect(await requestSample('w', { token: 't', fetchImpl: seq(res(502, {})), sleep: vi.fn() })).toEqual({ status: 'error' })
  })

  it('экран ушёл — опрос прекращается', async () => {
    let alive = true
    const fetchImpl = seq(res(202, {}), res(200, { sample: SAMPLE }))
    const sleep = vi.fn(async () => {
      alive = false
    })
    expect(await requestSample('w', { token: 't', fetchImpl, sleep, alive: () => alive })).toEqual({ status: 'cancelled' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
