import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Оценка Speaking из банка: один невнятный, битый или потерянный ответ и один сбой модели не роняют оценку остальных
// (решение владельца 25.10.2026). Бэкенд, распознаватели и модель подменены.
const structured = vi.fn()
const transcribeWavFast = vi.fn()
const assessPronunciationChunked = vi.fn()

vi.mock('@/lib/auth-server.js', () => ({ BACKEND_URL: 'http://backend', bearerFromRequest: (r) => (r.headers.get('authorization') || '').replace(/^Bearer /, '') || null }))
vi.mock('@/lib/anthropic.js', () => ({ hasAnthropicKey: () => true, IELTS_REVIEW_MODEL: 'main-model', structured: (...a) => structured(...a) }))
vi.mock('@/lib/ielts/quota.js', () => ({ checkIeltsQuota: async () => ({ blocked: false, resolved: { error: 'no_db' } }) }))
vi.mock('@/lib/db/ielts.js', () => ({ isDbConfigured: () => false, recordIeltsSpeaking: async () => {} }))
vi.mock('@/lib/ielts/azure-pronunciation.js', () => ({
  isAzureSpeechConfigured: () => true,
  transcribeWavFast: (...a) => transcribeWavFast(...a),
  assessPronunciationChunked: (...a) => assessPronunciationChunked(...a),
}))
vi.mock('@/lib/soniox-stt.js', () => ({ isSonioxConfigured: () => false, transcribeWavSoniox: async () => '' }))

const { POST } = await import('./route.js')

const IDS = ['S-P1-T01-01', 'S-P1-T01-02', 'S-P1-T01-03', 'S-P1-T01-04', 'S-P1-T01-05']
// у каждого ответа свой размер — по нему подмена распознавателя узнаёт, какой это ответ
const wav = (i) => new File([new Uint8Array(44 + 32000 * (10 + i))], `${IDS[i]}.wav`, { type: 'audio/wav' })
const answerOf = (buf) => Math.round((buf.length - 44) / 32000) - 10

function req(files, { token = 'TOK' } = {}) {
  const form = new FormData()
  form.append('testId', 'S-P1-T01')
  form.append('mode', 'exam')
  form.append('uiLang', 'ru')
  form.append('items', JSON.stringify(IDS.map((itemId) => ({ itemId, durationSec: 45 }))))
  files.forEach((f, i) => f && form.append(`audio_${i}`, f))
  return new Request('http://x/api/ielts/speaking/assess', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
}

const GOOD = { fluencyCoherence: 6, lexicalResource: 6.5, grammaticalRange: 5.5, strengths: ['a'], improvements: ['b'], feedback: 'Хорошо.' }

describe('/api/ielts/speaking/assess', () => {
  let calls
  beforeEach(() => {
    process.env.IELTS_GRADER_KEY = 'KEY'
    calls = []
    vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => {
      const body = init.body ? JSON.parse(init.body) : null
      calls.push({ url: String(url), method: init.method, body })
      if (String(url).endsWith('/speaking')) return Response.json({ attemptId: 7, task: { part: 1, questions: IDS.map((id) => ({ id, question: `Question ${id}?` })) } }, { status: 201 })
      if (String(url).endsWith('/grading') && init.method === 'PUT') return Response.json({ attempt: { id: 7, band: 6 } })
      if (String(url).endsWith('/grading/fail')) return new Response(null, { status: 204 })
      return new Response(null, { status: 404 })
    }))
    structured.mockReset().mockResolvedValue(GOOD)
    assessPronunciationChunked.mockReset().mockResolvedValue({ mock: false, accuracy: 80, transcript: '' })
    transcribeWavFast.mockReset().mockImplementation(async (buf) => {
      const i = answerOf(buf)
      if (i === 1) throw new Error('azure exploded') // распознаватель упал на одном ответе
      if (i === 2) return 'uh' // обрывок — невнятный ответ
      return 'I live in a small town in the north of Kazakhstan and I like it.'
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('пропускает потерянный, битый и невнятный ответы, а остальные оценивает — даже если первая модель упала', async () => {
    structured.mockRejectedValueOnce(new Error('529 overloaded'))
    const res = await POST(req([wav(0), wav(1), wav(2), wav(3), null]))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ attempt: { id: 7, band: 6 } })

    // запасная модель ответила со второй попытки
    expect(structured.mock.calls.map((c) => c[0].model)).toEqual(['main-model', 'claude-haiku-4-5-20251001'])
    // модели ушли только внятные ответы, остальные — пометкой
    const msg = structured.mock.calls[1][0].userMessage
    expect(msg).toContain('answered 2 of 5')
    expect(msg.match(/\[SKIPPED\]/g)).toHaveLength(3)

    const put = calls.find((c) => c.method === 'PUT')
    expect(put.body.criteria).toMatchObject({ fluencyCoherence: 6, pronunciation: expect.any(Number) })
    expect(put.body.items.map((x) => [x.itemId, !!x.skipped])).toEqual([[IDS[0], false], [IDS[1], true], [IDS[2], true], [IDS[3], false], [IDS[4], true]])
    expect(calls.some((c) => c.url.endsWith('/grading/fail'))).toBe(false)
  })

  it('все ответы невнятные — понятная ошибка no_speech, работа помечена failed', async () => {
    transcribeWavFast.mockResolvedValue('')
    const res = await POST(req([wav(0), wav(1)]))
    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({ error: 'no_speech', attemptId: 7 })
    expect(structured).not.toHaveBeenCalled()
    expect(calls.find((c) => c.url.endsWith('/grading/fail')).body).toEqual({ reason: 'no_speech' })
  })

  it('ни одного файла — no_speech сразу, без работы на бэкенде', async () => {
    const res = await POST(req([null, null]))
    expect(res.status).toBe(422)
    expect(calls).toHaveLength(0)
  })

  it('не ответила ни одна модель — model_failed с attemptId (mock закрывает им секцию)', async () => {
    structured.mockRejectedValue(new Error('down'))
    const res = await POST(req([wav(0)]))
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'model_failed', attemptId: 7 })
    expect(structured).toHaveBeenCalledTimes(3)
  })

  it('отказ бэкенда при создании работы — код по причине, а не общее «не удалось»', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ messages: ['Нет доступа к оценке'] }, { status: 403 })))
    expect(await (await POST(req([wav(0)]))).json()).toEqual({ error: 'grading_unavailable' })
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({}, { status: 401 })))
    expect(await (await POST(req([wav(0)]))).json()).toEqual({ error: 'auth_required' })
  })
})
