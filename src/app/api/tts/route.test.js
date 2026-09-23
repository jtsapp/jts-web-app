import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Роут /api/tts: Soniox потоком, дисковый кэш, лимиты. Сеть Soniox подменяем
// — настоящий синтез в тестах стоил бы денег и минутного лимита организации.

// Похожая на MP3 запись: ID3-тег и немного «кадров» — роут кэширует только то,
// что похоже на звук.
const MP3 = Buffer.concat([Buffer.from('ID3\u0004\u0000\u0000', 'latin1'), Buffer.alloc(600, 0xaa)])

function streamOf(buf) {
  return new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(buf.subarray(0, 100)))
      c.enqueue(new Uint8Array(buf.subarray(100)))
      c.close()
    },
  })
}

let dir
let fetchMock
let GET

const req = (qs, headers = {}) => new Request(`http://localhost/api/tts?${qs}`, { headers })

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jts-tts-test-'))
  vi.stubEnv('TTS_CACHE_DIR', dir)
  vi.stubEnv('SONIOX_API_KEY', '\uFEFFsnx_test')
  vi.stubEnv('TTS_SONIOX_PER_MIN', '')
  fetchMock = vi.fn(async () => new Response(streamOf(MP3), { status: 200, headers: { 'content-type': 'audio/mpeg' } }))
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.resetModules()
  ;({ GET } = await import('./route.js'))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  fs.rmSync(dir, { recursive: true, force: true })
})

const cachedFiles = () => fs.readdirSync(dir).filter((f) => f.endsWith('.mp3'))

describe('GET /api/tts', () => {
  it('голос не из белого списка — 400, в Soniox не ходим', async () => {
    const res = await GET(req('v=Nobody&t=hello'))
    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('нечего читать — 400', async () => {
    const res = await GET(req('v=Grace&t=%20%20'))
    expect(res.status).toBe(400)
  })

  it('промах кэша: поток из Soniox уходит ученику и дописывается в кэш', async () => {
    const res = await GET(req('v=Freya&l=en&s=0.9&t=Good%20morning'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('audio/mpeg')
    expect(res.headers.get('cache-control')).toMatch(/public/)
    const body = Buffer.from(await res.arrayBuffer())
    expect(body.equals(MP3)).toBe(true)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://tts-rt.soniox.com/tts')
    // BOM из Windows-пайпа в ключе срезан.
    expect(init.headers.authorization).toBe('Bearer snx_test')
    expect(JSON.parse(init.body)).toEqual({
      model: 'tts-rt-v2',
      voice: 'Freya',
      language: 'en',
      text: 'Good morning',
      speed: 0.9,
      audio_format: 'mp3',
    })

    await vi.waitFor(() => expect(cachedFiles()).toHaveLength(1))
  })

  it('попадание в кэш: Soniox не зовём, Range отдаёт 206', async () => {
    await (await GET(req('v=Grace&t=apple'))).arrayBuffer()
    await vi.waitFor(() => expect(cachedFiles()).toHaveLength(1))
    fetchMock.mockClear()

    const full = await GET(req('v=Grace&t=%20apple%20'))
    expect(full.status).toBe(200)
    expect(Buffer.from(await full.arrayBuffer()).equals(MP3)).toBe(true)
    expect(full.headers.get('accept-ranges')).toBe('bytes')

    const part = await GET(req('v=Grace&t=apple', { range: 'bytes=0-1' }))
    expect(part.status).toBe(206)
    expect(part.headers.get('content-range')).toBe(`bytes 0-1/${MP3.length}`)
    expect(Buffer.from(await part.arrayBuffer())).toEqual(MP3.subarray(0, 2))

    const tail = await GET(req('v=Grace&t=apple', { range: 'bytes=-10' }))
    expect(tail.status).toBe(206)
    expect(Buffer.from(await tail.arrayBuffer())).toEqual(MP3.subarray(MP3.length - 10))

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('без ключа — 503, клиент читает голосом устройства', async () => {
    vi.stubEnv('SONIOX_API_KEY', '')
    const res = await GET(req('v=Grace&t=hello'))
    expect(res.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [402, 503], // кончился баланс — не про этот запрос
    [401, 503], // ключ отозван
    [429, 429],
    [500, 502],
  ])('Soniox %i → %i, ошибка не кэшируется', async (upstream, expected) => {
    fetchMock.mockResolvedValueOnce(new Response('{"error_code":1}', { status: upstream }))
    const res = await GET(req('v=Grace&t=hello'))
    expect(res.status).toBe(expected)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(cachedFiles()).toHaveLength(0)
  })

  it('не MP3 в ответе (обрыв, мусор) в кэш не попадает', async () => {
    fetchMock.mockResolvedValueOnce(new Response(streamOf(Buffer.alloc(600, 0x20)), { status: 200 }))
    await (await GET(req('v=Grace&t=hello'))).arrayBuffer()
    await new Promise((r) => setTimeout(r, 30))
    expect(cachedFiles()).toHaveLength(0)
  })

  it('один текст почти одновременно — один синтез, оба получают запись', async () => {
    let open
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          open = () => resolve(new Response(streamOf(MP3), { status: 200 }))
        }),
    )
    const first = GET(req('v=Grace&t=together'))
    const second = GET(req('v=Grace&t=together'))
    await new Promise((r) => setTimeout(r, 20))
    open()
    const [a, b] = await Promise.all([first, second])
    expect(Buffer.from(await a.arrayBuffer()).equals(MP3)).toBe(true)
    expect(Buffer.from(await b.arrayBuffer()).equals(MP3)).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('первый синтез сорвался — второй пробует сам', async () => {
    let open
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          open = () => resolve(new Response('{"error_code":500}', { status: 500 }))
        }),
    )
    const first = GET(req('v=Grace&t=retry'))
    const second = GET(req('v=Grace&t=retry'))
    await new Promise((r) => setTimeout(r, 20))
    open()
    expect((await first).status).toBe(502)
    expect((await second).status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('общий лимит в минуту — 429, дальше Soniox не дёргаем', async () => {
    vi.stubEnv('TTS_SONIOX_PER_MIN', '2')
    for (const w of ['one', 'two']) expect((await GET(req(`v=Grace&t=${w}`))).status).toBe(200)
    const res = await GET(req('v=Grace&t=three'))
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('30')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
