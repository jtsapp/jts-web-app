import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET, POST } from './route.js'

// Синтез переехал в lib/tutorVoice.js — роут обязан отвечать как раньше:
// кнопки «послушать» и визитки тьюторов на нём держатся.
describe('/api/tutor-tts после выноса синтеза', () => {
  const env = { ...process.env }
  beforeEach(() => {
    delete process.env.GOOGLE_CREDENTIALS_JSON
    process.env.SONIOX_API_KEY = 's'
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([7, 7]), { status: 200 })))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    process.env = { ...env }
  })

  const post = (body) =>
    POST(new Request('http://localhost/api/tutor-tts', { method: 'POST', body: JSON.stringify(body) }))

  it('Луна без Google — звук Soniox, без кэша', async () => {
    const res = await post({ tutor: 'luna', text: 'Hi', lang: 'en' })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('audio/mpeg')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([7, 7]))
  })

  it('пустой текст — 400, без ключей — 503', async () => {
    expect((await post({ tutor: 'luna', text: ' ' })).status).toBe(400)
    delete process.env.SONIOX_API_KEY
    expect((await post({ tutor: 'luna', text: 'Hi' })).status).toBe(503)
  })

  it('GET — какие провайдеры настроены', async () => {
    const body = await (await GET()).json()
    expect(body).toMatchObject({ gemini: false, soniox: true })
    expect(Object.keys(body).sort()).toEqual(['eleven', 'fish', 'gemini', 'openai', 'soniox'])
  })
})
