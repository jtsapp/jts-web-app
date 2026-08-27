import { describe, it, expect, afterEach, vi } from 'vitest'
import { runCheck } from './checkApi.js'

// Достаточно слов (>=5) и пара связок — офлайн-фолбэк отрабатывает без жанра.
const PAYLOAD = {
  level: 'B1',
  genre: 'Complaint letter',
  targetWords: [120, 150],
  task: 'Write a complaint about a faulty phone.',
  text: 'I am writing to complain about my order. However, nobody answered my emails. Therefore I would like a refund.',
}

// Минимально валидный ответ сервера: validateAssessment требует scores,
// непустые summary и nextSteps; organisation 3.4 округлится до 3.5 (шаг 0.5).
const RAW = {
  scores: { task: 4, organisation: 3.4, vocabulary: 5, grammar: 2 },
  cefr: 'b1',
  summary: 'Solid work with a clear structure.',
  strengths: [],
  corrections: [],
  rewrite: '',
  nextSteps: ['Add a closing formula.'],
}

function okResponse(body) {
  return { ok: true, status: 200, json: async () => body }
}

describe('checkApi.runCheck', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('без токена не ходит в сеть и сразу отдаёт офлайн-оценку', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { assessment, mode } = await runCheck(PAYLOAD, { token: null })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mode).toBe('offline')
    expect(assessment.mode).toBe('offline')
    expect(assessment.scores).toBeTruthy()
    expect(assessment.nextSteps.length).toBeGreaterThan(0)
  })

  it('живой путь: валидирует ответ и отдаёт mode live', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ result: RAW }))
    vi.stubGlobal('fetch', fetchMock)
    const { assessment, mode } = await runCheck(PAYLOAD, { token: 'tok' })
    expect(mode).toBe('live')
    expect(assessment.mode).toBe('live')
    // Прошло через validateAssessment: полубалльное округление и верхний CEFR.
    expect(assessment.scores.organisation).toBe(3.5)
    expect(assessment.cefr).toBe('B1')
    // Запрос ушёл куда надо и с Bearer-токеном.
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/writing/check')
    expect(opts.headers.Authorization).toBe('Bearer tok')
    expect(JSON.parse(opts.body).text).toBe(PAYLOAD.text)
  })

  it('живой путь принимает и форму {assessment}', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse({ assessment: RAW })))
    const { mode } = await runCheck(PAYLOAD, { token: 'tok' })
    expect(mode).toBe('live')
  })

  it('401 и 429 падают в офлайн', async () => {
    for (const status of [401, 429]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({}) }))
      const { assessment, mode } = await runCheck(PAYLOAD, { token: 'tok' })
      expect(mode).toBe('offline')
      expect(assessment.mode).toBe('offline')
    }
  })

  it('ответ, не прошедший validateAssessment, падает в офлайн', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse({ result: { scores: null } })))
    const { mode } = await runCheck(PAYLOAD, { token: 'tok' })
    expect(mode).toBe('offline')
  })

  it('сетевая ошибка падает в офлайн', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const { mode } = await runCheck(PAYLOAD, { token: 'tok' })
    expect(mode).toBe('offline')
  })

  it('зависший запрос обрубается таймаутом и падает в офлайн', async () => {
    vi.useFakeTimers()
    // fetch, который никогда не резолвится — единственный выход это таймер.
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    const promise = runCheck(PAYLOAD, { token: 'tok', timeoutMs: 20000 })
    await vi.advanceTimersByTimeAsync(20000)
    const { assessment, mode } = await promise
    expect(mode).toBe('offline')
    expect(assessment.mode).toBe('offline')
  })
})
