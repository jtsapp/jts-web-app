import { describe, it, expect, vi, beforeEach } from 'vitest'

// Тест про доступ и выбор голоса. Сам синтез (lib/tutorVoice.js) замокан:
// проверяется, кого и с каким языком зовёт роут и что отдаёт при сбое.
let authResult
vi.mock('@/lib/auth-server.js', () => ({
  bearerFromRequest: (req) => (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || null,
  verifyTokenStatus: async () => authResult,
}))
const impl = { gemini: null, soniox: null, pcm: null, stream: null, eleven: null }
vi.mock('@/lib/tutorVoice.js', () => ({
  synthGemini: vi.fn(async () => impl.gemini()),
  synthGeminiPcm: vi.fn(async () => impl.pcm()),
  synth: vi.fn(async () => impl.soniox()),
  streamEleven: vi.fn((text, tutor, opts) => impl.eleven(text, tutor, opts)),
}))
// Поток Gemini подменён целиком: сам gRPC проверяет geminiTtsStream.test.js.
vi.mock('@/lib/geminiTtsStream.js', async () => {
  const actual = await vi.importActual('@/lib/geminiTtsStream.js')
  return {
    GrpcError: actual.GrpcError,
    isPermanent: actual.isPermanent,
    streamGemini: vi.fn((text, opts) => impl.stream(text, opts)),
  }
})
const { streamEleven, synth, synthGemini, synthGeminiPcm } = await import('@/lib/tutorVoice.js')
const { GrpcError, streamGemini } = await import('@/lib/geminiTtsStream.js')
const { FIRST_AUDIO_MS, GET, POST, SYNTH_TIMEOUT_MS, resetStreamState, voiceLang } = await import('./route.js')

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

  // Казахский интерфейс — помощник Айзере (persona.js): её клон ElevenLabs на любом
  // языке фразы, как в звонке Speaking Buddy. Gemini и Soniox Луны не зовутся.
  it('Айзере — её голос ElevenLabs и по-казахски, и по-русски (числа словами)', async () => {
    const kk = await post({ text: 'Тәжірибе бөлімін ашыңыз.', lang: 'kk', persona: 'aizere' })
    expect(kk.status).toBe(200)
    expect(kk.headers.get('x-assistant-voice')).toBe('eleven')
    expect(synth).toHaveBeenCalledWith('eleven', 'Тәжірибе бөлімін ашыңыз.', 'aizere', 'kk')
    await post({ text: 'Осталось 5 заданий.', lang: 'ru', persona: 'aizere' })
    expect(synth).toHaveBeenLastCalledWith('eleven', 'Осталось пять заданий.', 'aizere', 'ru')
    expect(synthGemini).not.toHaveBeenCalled()
  })

  it('Айзере: ElevenLabs не ответил — 502 (клиент дочитает потоком), лимит не тратится', async () => {
    impl.soniox = async () => ({ status: 503 })
    expect((await post({ text: 'Сәлеметсіз бе', persona: 'aizere' })).status).toBe(502)
    expect(synthGemini).not.toHaveBeenCalled()
  })

  it('чужая персона в запросе — голос Луны', async () => {
    const res = await post({ text: 'Привет', lang: 'ru', persona: 'dexter' })
    expect(res.headers.get('x-assistant-voice')).toBe('gemini')
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

// Полсекунды PCM 24 кГц — «звук» Gemini для кодера MP3.
const pcm = (ms = 200) => {
  const n = (24000 * ms) / 1000
  const b = Buffer.alloc(n * 2)
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(5000 * Math.sin(i / 7)), i * 2)
  return b
}
const get = (url, headers = {}) => GET(new Request(`http://localhost${url}`, { headers }))
const isMp3 = (buf) => buf.length > 0 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0

describe('POST /api/assistant/speak { stream: true } → GET билета', () => {
  beforeEach(() => {
    authResult = { status: 'ok', user: { userId: ++uid } }
    impl.gemini = audio('audio/wav')
    impl.soniox = audio('audio/mpeg')
    impl.pcm = async () => ({ pcm: pcm() })
    impl.stream = async (text, { onAudio }) => {
      onAudio(pcm(100))
      onAudio(pcm(100))
    }
    impl.eleven = async (text, tutor, { onAudio }) => {
      onAudio(Buffer.from([0xff, 0xfb, 1, 2]))
      onAudio(Buffer.from([3, 4]))
    }
    for (const f of [synth, synthGemini, synthGeminiPcm, streamGemini, streamEleven]) f.mockClear()
    resetStreamState()
    delete process.env.ASSISTANT_TTS_STREAM
  })

  const ticket = async (body) => {
    const res = await post({ stream: true, ...body })
    expect(res.status).toBe(200)
    const { url } = await res.json()
    expect(url).toMatch(/^\/api\/assistant\/speak\?s=[0-9a-f-]{36}$/)
    return url
  }

  // Голос — тот же, что у Луны в звонке: поток Cloud TTS, «Aoede», en-US.
  it('POST отвечает адресом, GET отдаёт MP3 потока; голос и числа — как у записи', async () => {
    const url = await ticket({ text: 'У вас там 0%.', lang: 'ru' })
    const res = await get(url)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('audio/mpeg')
    expect(res.headers.get('x-assistant-voice')).toBe('gemini')
    expect(isMp3(Buffer.from(await res.arrayBuffer()))).toBe(true)
    expect(streamGemini).toHaveBeenCalledWith('У вас там ноль процентов.', expect.objectContaining({ voice: 'Aoede', languageCode: 'en-US' }))
    expect(synthGemini).not.toHaveBeenCalled()
  })

  it('пока синтез идёт — ответ потоком, без буфера nginx', async () => {
    let release
    impl.stream = async (text, { onAudio }) => {
      onAudio(pcm(200))
      await new Promise((r) => (release = r))
      onAudio(pcm(200))
    }
    const url = await ticket({ text: 'Фраза.', lang: 'ru' })
    const res = await get(url)
    expect(res.headers.get('x-accel-buffering')).toBe('no')
    expect(res.headers.get('content-length')).toBeNull()
    release()
    expect(isMp3(Buffer.from(await res.arrayBuffer()))).toBe(true)
  })

  it('готовая запись — с Range для Safari', async () => {
    const url = await ticket({ text: 'Фраза.', lang: 'ru' })
    await (await get(url)).arrayBuffer()
    const res = await get(url, { range: 'bytes=0-1' })
    expect(res.status).toBe(206)
    expect(res.headers.get('content-range')).toMatch(/^bytes 0-1\/\d+$/)
  })

  it('поток отказал до звука — та же фраза через REST, тем же голосом', async () => {
    impl.stream = async () => {
      throw new GrpcError(14, 'unavailable')
    }
    const url = await ticket({ text: 'Фраза.', lang: 'ru' })
    const res = await get(url)
    expect(res.headers.get('content-type')).toBe('audio/mpeg')
    expect(isMp3(Buffer.from(await res.arrayBuffer()))).toBe(true)
    expect(synthGeminiPcm).toHaveBeenCalledWith('Фраза.', { voice: 'Aoede', languageCode: 'en-US' })
  })

  it(`поток молчит ${FIRST_AUDIO_MS / 1000} с — обрываем и берём REST`, async () => {
    vi.useFakeTimers()
    try {
      impl.stream = (text, { signal }) =>
        new Promise((_, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('a'), { name: 'AbortError' }))))
      const url = await ticket({ text: 'Фраза.', lang: 'ru' })
      const pending = get(url)
      await vi.advanceTimersByTimeAsync(FIRST_AUDIO_MS + 10)
      expect((await pending).headers.get('content-type')).toBe('audio/mpeg')
      expect(synthGeminiPcm).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it(`поток застрял посреди фразы — через ${SYNTH_TIMEOUT_MS / 1000} с билет закрывается тем, что успело прийти`, async () => {
    vi.useFakeTimers()
    try {
      impl.eleven = (text, tutor, { onAudio, signal }) => {
        onAudio(Buffer.from([0xff, 0xfb, 9]))
        return new Promise((_, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('a'), { name: 'AbortError' }))))
      }
      const res = await get(await ticket({ text: 'Сәлем.', lang: 'kk', persona: 'aizere' }))
      const body = res.arrayBuffer()
      await vi.advanceTimersByTimeAsync(SYNTH_TIMEOUT_MS + 10)
      expect([...Buffer.from(await body)]).toEqual([0xff, 0xfb, 9])
      expect(synth).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('голоса Луны нет совсем — GET уводит на /api/tts «Grace», лимит не тратится', async () => {
    impl.stream = async () => {
      throw new GrpcError(13, 'internal')
    }
    impl.pcm = async () => {
      throw new Error('quota')
    }
    const url = await ticket({ text: 'У вас 0%.', lang: 'ru' })
    const res = await get(url)
    expect(res.status).toBe(307)
    const to = new URL(res.headers.get('location'), 'http://localhost')
    expect(to.pathname).toBe('/api/tts')
    expect(to.searchParams.get('v')).toBe('Grace')
    expect(to.searchParams.get('l')).toBe('ru')
    // Soniox по-русски цифры читает сам — текст уходит как в ответе.
    expect(to.searchParams.get('t')).toBe('У вас 0%.')
    // 100 таких фраз подряд — и сто первая не упирается в лимит.
    for (let i = 0; i < 100; i++) await get(await ticket({ text: 'Фраза.', lang: 'ru' }))
    expect((await post({ stream: true, text: 'Ещё.', lang: 'ru' })).status).toBe(200)
  })

  it('поток не заработает и дальше (UNIMPLEMENTED) — роут по-старому отвечает записью', async () => {
    impl.stream = async () => {
      throw new GrpcError(12, 'no streaming here')
    }
    await get(await ticket({ text: 'Раз.', lang: 'ru' }))
    const res = await post({ stream: true, text: 'Два.', lang: 'ru' })
    expect(res.headers.get('content-type')).toBe('audio/wav')
    expect(streamGemini).toHaveBeenCalledTimes(1)
  })

  it('рубильник ASSISTANT_TTS_STREAM=off и казахский — записью, как раньше', async () => {
    process.env.ASSISTANT_TTS_STREAM = 'off'
    expect((await post({ stream: true, text: 'Фраза.', lang: 'ru' })).headers.get('content-type')).toBe('audio/wav')
    delete process.env.ASSISTANT_TTS_STREAM
    const kk = await post({ stream: true, text: 'Тәжірибе бөлімін ашыңыз.', lang: 'kk' })
    expect(kk.headers.get('x-assistant-voice')).toBe('soniox')
    expect(streamGemini).not.toHaveBeenCalled()
  })

  // Сколько ждали первого звука — заголовком (окно на деве подписывает это под
  // ответом) и строкой лога без текста фразы.
  it('первый звук: заголовок x-assistant-first-ms и строка лога без текста', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    try {
      const res = await get(await ticket({ text: 'Секретная фраза.', lang: 'ru' }))
      expect(res.headers.get('x-assistant-first-ms')).toMatch(/^\d+$/)
      await res.arrayBuffer()
      const row = info.mock.calls.find((c) => c[0] === '[assistant-speak]')
      expect(JSON.parse(row[1])).toMatchObject({ voice: 'gemini', mode: 'stream', chars: 16 })
      expect(row[1]).not.toContain('Секретная')
    } finally {
      info.mockRestore()
    }
  })

  // Айзере — её клон ElevenLabs потоком (/stream отдаёт MP3 сам, без кодера).
  it('Айзере: поток ElevenLabs, MP3 как есть, числа словами', async () => {
    const res = await get(await ticket({ text: 'У вас 5 заданий.', lang: 'ru', persona: 'aizere' }))
    expect(res.headers.get('x-assistant-voice')).toBe('eleven')
    expect([...Buffer.from(await res.arrayBuffer())]).toEqual([0xff, 0xfb, 1, 2, 3, 4])
    expect(streamEleven).toHaveBeenCalledWith('У вас пять заданий.', 'aizere', expect.objectContaining({ signal: expect.anything() }))
    expect(streamGemini).not.toHaveBeenCalled()
  })

  it('Айзере: поток отказал — её же голос записью целиком; нет и его — /api/tts «Maya»', async () => {
    impl.eleven = async () => {
      throw new Error('ElevenLabs TTS stream 500')
    }
    const whole = await get(await ticket({ text: 'Сәлем.', lang: 'kk', persona: 'aizere' }))
    expect(whole.headers.get('content-type')).toBe('audio/mpeg')
    expect(synth).toHaveBeenCalledWith('eleven', 'Сәлем.', 'aizere')

    impl.soniox = async () => ({ status: 503 })
    const res = await get(await ticket({ text: 'Сәлем.', lang: 'kk', persona: 'aizere' }))
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location'), 'http://localhost').searchParams.get('v')).toBe('Maya')
  })

  it('чужой или протухший билет — 404', async () => {
    expect((await get('/api/assistant/speak?s=00000000-0000-4000-8000-000000000000')).status).toBe(404)
    expect((await get('/api/assistant/speak')).status).toBe(404)
  })
})
