import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { synthTutor } from './tutorVoice.js'

// Синтез тьюторов вынесен из /api/tutor-tts в общий модуль — проверяем, что
// откат Луны остался прежним: без ключа Google она звучит Soniox «Grace», а не
// чужим голосом и не тишиной.
describe('synthTutor', () => {
  const env = { ...process.env }
  beforeEach(() => {
    delete process.env.GOOGLE_CREDENTIALS_JSON
    process.env.SONIOX_API_KEY = 's'
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    process.env = { ...env }
  })

  const okFetch = () => vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }))

  it('Луна без ключа Google — откат на Soniox голосом Grace', async () => {
    const fetchMock = okFetch()
    vi.stubGlobal('fetch', fetchMock)
    const r = await synthTutor('luna', 'Привет', 'ru')
    expect(r.contentType).toBe('audio/mpeg')
    expect(fetchMock.mock.calls[0][0]).toBe('https://tts-rt.soniox.com/tts')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ voice: 'Grace', language: 'ru', text: 'Привет' })
  })

  it('kz интерфейса → язык Soniox kk', async () => {
    const fetchMock = okFetch()
    vi.stubGlobal('fetch', fetchMock)
    await synthTutor('luna', 'Сәлем', 'kz')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).language).toBe('kk')
  })

  it('совсем без ключей — 503, вызывающий решает сам', async () => {
    delete process.env.SONIOX_API_KEY
    vi.stubGlobal('fetch', okFetch())
    expect(await synthTutor('luna', 'Привет', 'ru')).toEqual({ status: 503 })
  })
})
