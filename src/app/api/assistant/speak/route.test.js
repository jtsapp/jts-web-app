import { describe, it, expect, vi, beforeEach } from 'vitest'

// Тест про доступ и выбор голоса. Сам синтез (lib/tutorVoice.js) замокан:
// проверяется, кого и с каким языком зовёт роут и куда уходит при сбое.
let authResult
vi.mock('@/lib/auth-server.js', () => ({
  bearerFromRequest: (req) => (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || null,
  verifyTokenStatus: async () => authResult,
}))
const impl = { gemini: null, soniox: null }
vi.mock('@/lib/tutorVoice.js', () => ({
  synth: vi.fn(async (provider) => impl[provider]()),
}))
const { synth } = await import('@/lib/tutorVoice.js')
const { POST, voiceLang } = await import('./route.js')

const audio = (type) => async () => ({ audio: Buffer.from([1, 2]), contentType: type })
const post = (body, token = 'tok') =>
  POST(
    new Request('http://localhost/api/assistant/speak', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    }),
  )

let uid = 500
describe('POST /api/assistant/speak', () => {
  beforeEach(() => {
    authResult = { status: 'ok', user: { userId: ++uid } }
    impl.gemini = audio('audio/wav')
    impl.soniox = audio('audio/mpeg')
    synth.mockClear()
  })

  it('язык фразы: казахские буквы или казахский интерфейс — kk', () => {
    expect(voiceLang('Домашка в разделе «Үй жұмысы»', 'ru')).toBe('kk')
    expect(voiceLang('Откройте «Практику»', 'ru')).toBe('ru')
    expect(voiceLang('Open Practice', 'en')).toBe('en')
    expect(voiceLang('Ашыңыз', 'kk')).toBe('kk')
    expect(voiceLang('Откройте', undefined)).toBe('ru')
  })

  it('без входа — 401, пустой текст — 400', async () => {
    authResult = { status: 'invalid' }
    expect((await post({ text: 'Привет' }, null)).status).toBe(401)
    authResult = { status: 'ok', user: { userId: ++uid } }
    expect((await post({ text: '  ' })).status).toBe(400)
    expect(synth).not.toHaveBeenCalled()
  })

  it('русский — голос Луны: Gemini «Aoede» (ключ luna)', async () => {
    const res = await post({ text: 'Откройте «Практику».', lang: 'ru' })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('audio/wav')
    expect(res.headers.get('x-assistant-voice')).toBe('gemini')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(synth).toHaveBeenCalledWith('gemini', 'Откройте «Практику».', 'luna', 'ru')
  })

  it('казахский — сразу Soniox «Grace», Gemini не зовётся', async () => {
    const res = await post({ text: 'Тәжірибе бөлімін ашыңыз.', lang: 'kk' })
    expect(res.headers.get('x-assistant-voice')).toBe('soniox')
    expect(synth).toHaveBeenCalledTimes(1)
    expect(synth).toHaveBeenCalledWith('soniox', 'Тәжірибе бөлімін ашыңыз.', 'luna', 'kk')
  })

  it('Gemini упал или не настроен — Soniox той же фразой', async () => {
    impl.gemini = async () => {
      throw new Error('quota')
    }
    expect((await post({ text: 'Привет', lang: 'ru' })).headers.get('x-assistant-voice')).toBe('soniox')
    impl.gemini = async () => ({ status: 503 })
    expect((await post({ text: 'Привет', lang: 'ru' })).headers.get('x-assistant-voice')).toBe('soniox')
  })

  it('оба упали — 502', async () => {
    impl.gemini = async () => {
      throw new Error('x')
    }
    impl.soniox = async () => {
      throw new Error('y')
    }
    expect((await post({ text: 'Привет', lang: 'ru' })).status).toBe(502)
  })

  it('длинный текст подрезается до 600 символов', async () => {
    await post({ text: 'а'.repeat(900), lang: 'ru' })
    expect(synth.mock.calls[0][1]).toHaveLength(600)
  })

  it('лимит — 429', async () => {
    for (let i = 0; i < 100; i++) expect((await post({ text: 'Привет', lang: 'ru' })).status).toBe(200)
    expect((await post({ text: 'Привет', lang: 'ru' })).status).toBe(429)
  })
})
