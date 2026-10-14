import { describe, it, expect, vi, beforeEach } from 'vitest'

// Говорение теста уровня: тема — только по id из своих данных, мусор отсекается до платных вызовов, ответ — в форме,
// которую принимает v16 (status / speaking_level / confidence / subscores). Внешние сервисы подменены.
const resolveProfileId = vi.fn()
const structured = vi.fn()
const transcribeWavFast = vi.fn()
const assessPronunciationChunked = vi.fn()

vi.mock('@/lib/auth-server.js', () => ({ resolveProfileId: (...a) => resolveProfileId(...a) }))
vi.mock('@/lib/anthropic.js', () => ({ hasAnthropicKey: () => true, structured: (...a) => structured(...a) }))
vi.mock('@/lib/ielts/azure-pronunciation.js', () => ({
  isAzureSpeechConfigured: () => true,
  transcribeWavFast: (...a) => transcribeWavFast(...a),
  assessPronunciationChunked: (...a) => assessPronunciationChunked(...a),
}))
vi.mock('@/lib/soniox-stt.js', () => ({ isSonioxConfigured: () => false, transcribeWavSoniox: async () => '' }))

const { POST } = await import('./route.js')

// WAV 16 кГц mono: 44 байта заголовка + 2 байта на сэмпл.
const wav = (seconds) => new File([new Uint8Array(44 + Math.round(seconds * 32000))], 'a.wav', { type: 'audio/wav' })

function req(file, meta, { token = 'TOK' } = {}) {
  const form = new FormData()
  if (file) form.append('audio', file)
  form.append('metadata', JSON.stringify(meta))
  return new Request('http://x/api/placement/speaking', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
}

const LONG_ANSWER = 'I usually get up at seven and then I go to work by bus because it is fast and cheap for me'

describe('/api/placement/speaking', () => {
  let n = 0
  beforeEach(() => {
    // свой профиль на тест: дневной счётчик роута живёт в памяти процесса
    resolveProfileId.mockReset().mockResolvedValue({ id: `user-${++n}` })
    structured.mockReset().mockResolvedValue({
      level: 'B1', confidence: 'medium', range: 3, accuracy: 3, fluency: 4, coherence: 3,
      summary: 'Хорошо', strengths: ['a'], improvements: ['b'],
    })
    transcribeWavFast.mockReset().mockResolvedValue(LONG_ANSWER)
    assessPronunciationChunked.mockReset().mockResolvedValue({ mock: false, overall: 81, accuracy: 80, fluency: 82, prosody: 70 })
  })

  it('оценивает запись и отвечает в форме v16', async () => {
    const res = await POST(req(wav(40), { topicId: 'a1-day', lang: 'ru', measured: { grammar: 'A2' } }))
    const d = await res.json()
    expect(d).toMatchObject({ status: 'completed', speaking_level: 'B1', confidence: 'medium', topicId: 'a1-day' })
    expect(d.subscores).toEqual({ range: 3, accuracy: 3, fluency: 4, coherence: 3, pronunciation: 81 })
    // текст темы в промпт кладёт сервер, а не клиент
    expect(structured.mock.calls[0][0].userMessage).toContain('Describe your usual day.')
  })

  it('неизвестная тема и короткая запись — отказ без платных вызовов', async () => {
    expect((await POST(req(wav(40), { topicId: 'evil' }))).status).toBe(400)
    expect((await POST(req(wav(5), { topicId: 'a1-day' }))).status).toBe(400)
    expect(transcribeWavFast).not.toHaveBeenCalled()
    expect(structured).not.toHaveBeenCalled()
  })

  it('почти без слов — уровень не называем', async () => {
    transcribeWavFast.mockResolvedValue('hello um')
    const d = await (await POST(req(wav(30), { topicId: 'a1-day' }))).json()
    expect(d.status).toBe('insufficient')
    expect(structured).not.toHaveBeenCalled()
  })

  it('без токена — 401', async () => {
    expect((await POST(req(wav(40), { topicId: 'a1-day' }, { token: null }))).status).toBe(401)
  })

  it('три оценки в сутки на профиль', async () => {
    resolveProfileId.mockResolvedValue({ id: 'user-limit' })
    for (let i = 0; i < 3; i++) expect((await POST(req(wav(40), { topicId: 'a1-day' }))).status).toBe(200)
    expect((await POST(req(wav(40), { topicId: 'a1-day' }))).status).toBe(429)
  })
})
