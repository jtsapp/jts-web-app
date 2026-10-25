import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Роут образца Скорочтения: claim у бэкенда → синтез ElevenLabs → PUT на бэкенд. Бэкенд, синтез и проверка
// входа подменены; fetch отвечает по адресу.
const verifyTokenStatus = vi.fn()
vi.mock('@/lib/auth-server.js', () => ({
  BACKEND_URL: 'http://be',
  verifyTokenStatus: (...a) => verifyTokenStatus(...a),
  bearerFromRequest: (req) => {
    const m = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') || '')
    return m ? m[1] : null
  },
}))

const { POST } = await import('./route.js')
const { SPEED_READING_VOICES } = await import('@/lib/speedReading/sample.js')

const SAMPLE = { url: 'https://files/x.mp3', words: [['Hi', 0, 0.3]], wpm: 160 }
const TEXT = 'Good evening and welcome'

function chars(text) {
  const c = [...text]
  return { characters: c, character_start_times_seconds: c.map((_, i) => i * 0.1), character_end_times_seconds: c.map((_, i) => (i + 1) * 0.1) }
}

let routes
let calls
function on(match, handler) {
  routes.push([match, handler])
}
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

function req(body = { id: 'weather' }, token = 'TOK') {
  return new Request('http://x/api/practice/speed-reading/sample', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  routes = []
  calls = []
  vi.stubEnv('SPEED_READING_KEY', 'srk')
  vi.stubEnv('ELEVENLABS_API_KEY', 'el')
  verifyTokenStatus.mockReset().mockResolvedValue({ status: 'ok', user: { userId: 5 } })
  vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => {
    calls.push({ url: String(url), init })
    for (const [match, handler] of routes) if (String(url).includes(match)) return handler(init)
    throw new Error(`нет подмены для ${url}`)
  }))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const urls = () => calls.map((c) => c.url)

describe('POST /api/practice/speed-reading/sample', () => {
  it('без входа — 401, ни бэкенд, ни синтез не зовутся', async () => {
    const res = await POST(req({ id: 'weather' }, null))
    expect(res.status).toBe(401)
    expect(calls).toEqual([])
  })

  it('кривой id — 400', async () => {
    expect((await POST(req({ id: '../admin' }))).status).toBe(400)
    expect((await POST(req('не json'))).status).toBe(400)
    expect(calls).toEqual([])
  })

  it('нет служебного ключа — 503', async () => {
    vi.stubEnv('SPEED_READING_KEY', '')
    vi.stubEnv('IELTS_GRADER_KEY', '')
    const res = await POST(req())
    expect(res.status).toBe(503)
    await expect(res.json()).resolves.toEqual({ error: 'not_configured' })
  })

  it('токен отвергнут — 401; бэкенд недоступен — 502', async () => {
    verifyTokenStatus.mockResolvedValueOnce({ status: 'unauthorized', user: null })
    expect((await POST(req())).status).toBe(401)
    verifyTokenStatus.mockResolvedValueOnce({ status: 'unavailable', user: null })
    expect((await POST(req())).status).toBe(502)
    expect(calls).toEqual([])
  })

  it('образец готов — отдаём его, синтеза нет', async () => {
    on('/sample-claim', () => json({ ready: true, sample: SAMPLE }))
    const res = await POST(req())
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ sample: SAMPLE })
    expect(urls()).toEqual(['http://be/integrations/web/speed-reading/weather/sample-claim'])
    expect(calls[0].init.method).toBe('POST')
    expect(calls[0].init.headers['x-integration-key']).toBe('srk')
  })

  it('образец уже готовит другой запрос — 202 pending', async () => {
    on('/sample-claim', () => json({ messages: ['busy'] }, 409))
    const res = await POST(req())
    expect(res.status).toBe(202)
    await expect(res.json()).resolves.toEqual({ pending: true })
  })

  it('нет такого текста — 404', async () => {
    on('/sample-claim', () => json({}, 404))
    expect((await POST(req())).status).toBe(404)
  })

  it('ключа ElevenLabs нет — 503 до claim: отметку «готовится» не ставим', async () => {
    vi.stubEnv('ELEVENLABS_API_KEY', '')
    const res = await POST(req())
    expect(res.status).toBe(503)
    expect(calls).toEqual([])
  })

  it('синтез без разметки — 502, образец бэкенду не отправляется', async () => {
    on('/sample-claim', () => json({ ready: false, voice: 'uk-female', body: TEXT, hash: 'h1' }))
    on('api.elevenlabs.io', () => json({ audio_base64: Buffer.from('ID3').toString('base64'), alignment: null }))
    const res = await POST(req())
    expect(res.status).toBe(502)
    expect(urls().some((u) => u.endsWith('/sample'))).toBe(false)
  })

  it('образца нет — синтез голосом текста и PUT на бэкенд', async () => {
    on('/sample-claim', () => json({ ready: false, voice: 'uk-male', body: TEXT, hash: 'h1' }))
    on('api.elevenlabs.io', () => json({ audio_base64: Buffer.from('ID3').toString('base64'), alignment: chars(TEXT) }))
    on('/sample', () => json({ sample: SAMPLE }))
    const res = await POST(req())
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ sample: SAMPLE })
    const el = calls.find((c) => c.url.includes('elevenlabs'))
    expect(el.url).toContain(`/text-to-speech/${SPEED_READING_VOICES['uk-male']}/with-timestamps`)
    expect(JSON.parse(el.init.body).text).toBe(TEXT)
    const put = calls.at(-1)
    expect(put.url).toBe('http://be/integrations/web/speed-reading/weather/sample')
    expect(put.init.method).toBe('PUT')
    expect(put.init.headers['x-integration-key']).toBe('srk')
    const form = put.init.body
    expect(form.get('hash')).toBe('h1')
    expect(JSON.parse(form.get('words')).map((w) => w[0])).toEqual(['Good', 'evening', 'and', 'welcome'])
    expect(Number(form.get('wpm'))).toBeGreaterThan(0)
    const audio = form.get('audio')
    expect(audio.type).toBe('audio/mpeg')
    expect(Buffer.from(await audio.arrayBuffer()).toString()).toBe('ID3')
  })

  it('текст поправили, пока шёл синтез (PUT 409) — 202 pending, клиент спросит снова', async () => {
    on('/sample-claim', () => json({ ready: false, voice: 'uk-female', body: TEXT, hash: 'old' }))
    on('api.elevenlabs.io', () => json({ audio_base64: Buffer.from('ID3').toString('base64'), alignment: chars(TEXT) }))
    on('/sample', () => json({}, 409))
    const res = await POST(req())
    expect(res.status).toBe(202)
  })

  it('синтез упал — 502', async () => {
    on('/sample-claim', () => json({ ready: false, voice: 'uk-female', body: TEXT, hash: 'h1' }))
    on('api.elevenlabs.io', () => new Response('boom', { status: 500 }))
    const res = await POST(req())
    expect(res.status).toBe(502)
    expect(urls().some((u) => u.endsWith('/sample'))).toBe(false)
  })
})
