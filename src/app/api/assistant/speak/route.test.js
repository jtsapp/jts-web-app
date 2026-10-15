import { describe, it, expect, vi, beforeEach } from 'vitest'

// Тест про доступ и выбор голоса. Сам синтез (lib/tutorVoice.js) замокан:
// проверяется, кого и с каким языком зовёт роут и что отдаёт при сбое.
let authResult
vi.mock('@/lib/auth-server.js', () => ({
  bearerFromRequest: (req) => (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || null,
  verifyTokenStatus: async () => authResult,
}))
const impl = { gemini: null, soniox: null }
vi.mock('@/lib/tutorVoice.js', () => ({
  synthGemini: vi.fn(async () => impl.gemini()),
  synth: vi.fn(async () => impl.soniox()),
}))
const { synth, synthGemini } = await import('@/lib/tutorVoice.js')
const { POST, SYNTH_TIMEOUT_MS, voiceLang } = await import('./route.js')

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
    synthGemini.mockClear()
  })

  it('язык фразы: казахские буквы или закреплённый клиентом kk — kk; кириллица — ru', () => {
    expect(voiceLang('Домашка в разделе «Үй жұмысы»', 'ru')).toBe('kk')
    expect(voiceLang('Откройте «Практику»', 'ru')).toBe('ru')
    expect(voiceLang('Open Practice', 'en')).toBe('en')
    expect(voiceLang('Ашыңыз', 'kk')).toBe('kk')
    expect(voiceLang('Откройте', undefined)).toBe('ru')
    // Казахское имя в начале русской фразы (первая реплика Луны) — голос её, а не казахский синтез.
    expect(voiceLang('Айгерім, вы на Главной, и у вас домашка.', 'ru')).toBe('ru')
  })

  it('без входа — 401, пустой текст — 400', async () => {
    authResult = { status: 'invalid' }
    expect((await post({ text: 'Привет' }, null)).status).toBe(401)
    authResult = { status: 'ok', user: { userId: ++uid } }
    expect((await post({ text: '  ' })).status).toBe(400)
    expect(synthGemini).not.toHaveBeenCalled()
  })

  // Голос — ровно как у Луны в звонке: Gemini «Aoede» с en-US (плагин google
  // агента по умолчанию). С ru-RU Gemini звучал другим диктором (живой прогон
  // 14.10.2026: «голос не как у Луны»), поэтому язык один, а цифры русской
  // фразы уходят словами — иначе «0%» звучит «zero percent».
  it('русский — голос Луны как в звонке (Aoede, en-US), числа словами', async () => {
    const res = await post({ text: 'У вас там 0%.', lang: 'ru' })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('audio/wav')
    expect(res.headers.get('x-assistant-voice')).toBe('gemini')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(synthGemini).toHaveBeenCalledWith('У вас там ноль процентов.', { voice: 'Aoede', languageCode: 'en-US' })
  })

  it('английский — тот же голос, цифры как есть', async () => {
    await post({ text: 'Open lesson 3.', lang: 'en' })
    expect(synthGemini).toHaveBeenCalledWith('Open lesson 3.', { voice: 'Aoede', languageCode: 'en-US' })
  })

  it('эмодзи вслух не читаются — и на сервере тоже', async () => {
    await post({ text: 'Отлично! 😊 Так держать 👍', lang: 'ru' })
    expect(synthGemini.mock.calls[0][0]).toBe('Отлично! Так держать')
  })

  it('фраза из одних эмодзи — 400, синтез не зовётся', async () => {
    expect((await post({ text: '😊👍', lang: 'ru' })).status).toBe(400)
    expect(synthGemini).not.toHaveBeenCalled()
  })

  it('казахский — Soniox «Grace» (у Gemini казахского нет)', async () => {
    const res = await post({ text: 'Тәжірибе бөлімін ашыңыз.', lang: 'kk' })
    expect(res.headers.get('x-assistant-voice')).toBe('soniox')
    expect(synthGemini).not.toHaveBeenCalled()
    expect(synth).toHaveBeenCalledWith('soniox', 'Тәжірибе бөлімін ашыңыз.', 'luna', 'kk')
  })

  // Сервер Soniox за Gemini больше не подставляет: в этом пути Soniox собирает
  // фразу целиком 10–12 с (замер на дев-стенде 14.10.2026), и ответ вставал
  // посреди фразы. Клиент сам берёт потоковый /api/tts — первый звук ~0.6 с.
  it('Gemini упал или не настроен — 502 сразу, лимит не тратится', async () => {
    impl.gemini = async () => {
      throw new Error('quota')
    }
    expect((await post({ text: 'Привет', lang: 'ru' })).status).toBe(502)
    impl.gemini = async () => ({ status: 503 })
    expect((await post({ text: 'Привет', lang: 'ru' })).status).toBe(502)
    expect(synth).not.toHaveBeenCalled()
  })

  it(`Gemini читает длинную фразу 8–10 с — это не «завис»: ждём до ${SYNTH_TIMEOUT_MS / 1000} с`, async () => {
    expect(SYNTH_TIMEOUT_MS).toBeGreaterThanOrEqual(15000)
    vi.useFakeTimers()
    try {
      impl.gemini = () => new Promise((r) => setTimeout(() => r({ audio: Buffer.from([1]), contentType: 'audio/wav' }), 10_000))
      const pending = post({ text: 'Длинная фраза.', lang: 'ru' })
      await vi.advanceTimersByTimeAsync(10_010)
      expect((await pending).headers.get('x-assistant-voice')).toBe('gemini')
    } finally {
      vi.useRealTimers()
    }
  })

  it('Gemini завис совсем — после срока 502', async () => {
    vi.useFakeTimers()
    try {
      impl.gemini = () => new Promise(() => {})
      const pending = post({ text: 'Привет', lang: 'ru' })
      await vi.advanceTimersByTimeAsync(SYNTH_TIMEOUT_MS + 10)
      expect((await pending).status).toBe(502)
    } finally {
      vi.useRealTimers()
    }
  })

  it('длинный текст подрезается до 600 символов', async () => {
    await post({ text: 'а'.repeat(900), lang: 'ru' })
    expect(synthGemini.mock.calls[0][0]).toHaveLength(600)
  })

  it('лимит — 429', async () => {
    for (let i = 0; i < 100; i++) expect((await post({ text: 'Привет', lang: 'ru' })).status).toBe(200)
    expect((await post({ text: 'Привет', lang: 'ru' })).status).toBe(429)
  })
})
