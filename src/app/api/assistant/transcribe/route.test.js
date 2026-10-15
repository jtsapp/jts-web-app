import { describe, it, expect, vi, beforeEach } from 'vitest'

// Тест про доступ и выбор движка. Что распознают Soniox и Azure — не его дело,
// оба замоканы; проверяется, с какими языками и контекстом их зовут и в каком
// порядке.
let authResult
vi.mock('@/lib/auth-server.js', () => ({
  bearerFromRequest: (req) => (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || null,
  verifyTokenStatus: async () => authResult,
}))
const soniox = { configured: true, text: 'где моя домашка' }
vi.mock('@/lib/soniox-stt.js', () => ({
  isSonioxConfigured: () => soniox.configured,
  transcribeWavSoniox: vi.fn(async () => soniox.text),
}))
const azure = { fast: null, slow: 'үй жұмысы қайда' }
vi.mock('@/lib/ielts/azure-pronunciation.js', () => ({
  transcribeWavFast: vi.fn(async () => azure.fast),
  transcribeWav: vi.fn(async () => azure.slow),
}))
const { transcribeWavSoniox } = await import('@/lib/soniox-stt.js')
const { transcribeWavFast, transcribeWav } = await import('@/lib/ielts/azure-pronunciation.js')
const { POST } = await import('./route.js')

const wav = (bytes = 3200) => new File([new Uint8Array(bytes)], 'q.wav', { type: 'audio/wav' })
function post({ file = wav(), lang = 'ru', screen = 'homework', token = 'tok' } = {}) {
  const fd = new FormData()
  if (file) fd.append('audio', file)
  fd.append('lang', lang)
  fd.append('screen', screen)
  return POST(
    new Request('http://localhost/api/assistant/transcribe', {
      method: 'POST',
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: fd,
    }),
  )
}

// Лимитер живёт в модуле роута — у каждого теста свой ученик, чтобы счётчики не мешали друг другу.
let uid = 100
describe('POST /api/assistant/transcribe', () => {
  beforeEach(() => {
    authResult = { status: 'ok', user: { userId: ++uid } }
    soniox.configured = true
    soniox.text = 'где моя домашка'
    azure.fast = null
    azure.slow = 'үй жұмысы қайда'
    process.env.AZURE_SPEECH_KEY = 'a'
    process.env.AZURE_SPEECH_REGION = 'eastus'
    vi.clearAllMocks()
  })

  it('без входа — 401, и запись никуда не уходит', async () => {
    authResult = { status: 'invalid' }
    expect((await post({ token: null })).status).toBe(401)
    expect(transcribeWavSoniox).not.toHaveBeenCalled()
  })

  it('бэкенд проверки токена лежит — 503', async () => {
    authResult = { status: 'unavailable' }
    expect((await post()).status).toBe(503)
  })

  it('Soniox с языками интерфейса и контекстом сайта', async () => {
    const res = await post({ lang: 'kk', screen: 'homework' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ text: 'где моя домашка' })
    const [buf, opts] = transcribeWavSoniox.mock.calls[0]
    expect(buf.length).toBe(3200)
    expect(opts.lang).toEqual(['kk', 'ru', 'en'])
    expect(opts.context.terms).toContain('Үй жұмысы')
    expect(opts.context.general.find((g) => g.key === 'current_screen').value).toBe('Домашняя работа')
    expect(transcribeWavFast).not.toHaveBeenCalled()
  })

  it('непонятный язык интерфейса — как русский', async () => {
    await post({ lang: 'de' })
    expect(transcribeWavSoniox.mock.calls[0][1].lang).toEqual(['ru', 'kk', 'en'])
  })

  it('Soniox пусто → Azure с локалью интерфейса: сначала fast, на null — потоковый', async () => {
    soniox.text = ''
    const res = await post({ lang: 'kk' })
    expect(await res.json()).toEqual({ text: 'үй жұмысы қайда' })
    expect(transcribeWavFast.mock.calls[0][1].locale).toBe('kk-KZ')
    expect(transcribeWav.mock.calls[0][1]).toEqual({ locale: 'kk-KZ' })
  })

  it('Azure fast распознал — потоковый не нужен', async () => {
    soniox.text = ''
    azure.fast = 'где словарь'
    expect(await (await post()).json()).toEqual({ text: 'где словарь' })
    expect(transcribeWav).not.toHaveBeenCalled()
  })

  it('Soniox не настроен — сразу Azure', async () => {
    soniox.configured = false
    expect(await (await post()).json()).toEqual({ text: 'үй жұмысы қайда' })
    expect(transcribeWavSoniox).not.toHaveBeenCalled()
  })

  it('ничего не распознано — пустой текст, а не ошибка', async () => {
    soniox.text = ''
    azure.slow = ''
    const res = await post()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ text: '' })
  })

  it('нет ни Soniox, ни Azure — 503', async () => {
    soniox.configured = false
    delete process.env.AZURE_SPEECH_KEY
    expect((await post()).status).toBe(503)
  })

  it('без файла — 400, больше 30 с записи — 413', async () => {
    expect((await post({ file: null })).status).toBe(400)
    expect((await post({ file: wav(1_300_000) })).status).toBe(413)
  })

  it('лимит — 429 с retryAfterSec', async () => {
    for (let i = 0; i < 20; i++) expect((await post()).status).toBe(200)
    const res = await post()
    expect(res.status).toBe(429)
    expect((await res.json()).retryAfterSec).toBeGreaterThan(0)
  })
})
