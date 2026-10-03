// Роут ИИ-разбора «Аркады»: кто может звать, когда списывается попытка и что
// уходит в модель. Мокаются платный Claude, проверка токена и бюджет.

import { beforeEach, describe, expect, it, vi } from 'vitest'

const ext = vi.hoisted(() => ({ key: true, db: true, reply: null, fail: null, consumed: 0, refunded: 0, allow: true, calls: [] }))

vi.mock('@/lib/anthropic.js', () => ({
  hasAnthropicKey: () => ext.key,
  structured: vi.fn(async (args) => {
    ext.calls.push(args)
    if (ext.fail) throw ext.fail
    return ext.reply
  }),
}))
vi.mock('@/lib/auth-server.js', () => ({
  resolveProfileId: async () => ({ id: 'user-7', isDemoAccount: false }),
}))
vi.mock('@/lib/db/sql.js', () => ({ isDbConfigured: () => ext.db, getSql: () => null }))
vi.mock('@/lib/db/arcadeBudget.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getUsed: async () => ext.consumed,
    consume: async () => (ext.allow ? ++ext.consumed : null),
    refund: async () => {
      ext.refunded++
      ext.consumed--
    },
  }
})

import { GET, POST } from './route.js'

const SPEECH = 'I think my favourite food is soup because my grandmother makes it every Sunday and the whole family comes to eat it together'
const transcript = () => ({
  utterances: [{ text: SPEECH, confidence: null }],
  segments: [{ kind: 'WORD', text: SPEECH, start: 0.5, end: 20, tokens: SPEECH.split(' ').map((t) => ({ text: t, kind: 'WORD', repetition: false })) }],
})
const REPLY = {
  summary: 'Хороший раунд.',
  fluencyAndCoherence: { assessable: true, band: 6, comments: ['a'] },
  lexicalResource: { assessable: true, band: 6, comments: ['b'] },
  grammaticalRangeAndAccuracy: { assessable: true, band: 7, comments: ['c'] },
  strengths: ['s'],
  weaknesses: ['w'],
  recommendations: [{ advice: 'x', evidence: 'my grandmother makes it' }],
}

function post(body, auth = true) {
  return POST(
    new Request('http://x/api/practice/arcade/review', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(auth ? { authorization: 'Bearer T' } : {}) },
      body: JSON.stringify(body),
    }),
  )
}
const body = (extra = {}) => ({ level: 'easy', topicIndex: 0, language: 'ru', transcript: transcript(), ...extra })

beforeEach(() => {
  Object.assign(ext, { key: true, db: true, reply: REPLY, fail: null, consumed: 0, refunded: 0, allow: true, calls: [] })
})

describe('POST /api/practice/arcade/review', () => {
  it('гостю — 401, модель не зовётся', async () => {
    const res = await post(body(), false)
    expect(res.status).toBe(401)
    expect(ext.calls).toHaveLength(0)
  })

  it('разбор: списан один, в модель ушла стенограмма и язык отзыва', async () => {
    const res = await post(body())
    expect(res.status).toBe(200)
    const d = await res.json()
    expect(d.review.estimatedBand).toBe(6.5)
    expect(d.review.recommendations[0].evidence).toBe('my grandmother makes it')
    expect(d.budget).toMatchObject({ limit: 20, used: 1, remaining: 19 })
    expect(ext.calls).toHaveLength(1)
    expect(ext.calls[0].userMessage).toContain('Feedback language: Russian')
    expect(ext.calls[0].userMessage).toContain(SPEECH)
  })

  it('короткий раунд — 422 до списания и до модели', async () => {
    const t = transcript()
    t.utterances[0].text = 'too short'
    t.segments[0].tokens = t.segments[0].tokens.slice(0, 2)
    const res = await post(body({ transcript: t }))
    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({ error: 'too_short' })
    expect(ext.consumed).toBe(0)
    expect(ext.calls).toHaveLength(0)
  })

  it('лимит исчерпан — 429 с остатком, модель не зовётся', async () => {
    ext.allow = false
    ext.consumed = 20
    const res = await post(body())
    expect(res.status).toBe(429)
    expect((await res.json()).budget).toMatchObject({ remaining: 0 })
    expect(ext.calls).toHaveLength(0)
  })

  it('сбой модели и пустой ответ возвращают попытку; пустой ответ пробуется второй раз', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    ext.fail = new Error('boom')
    expect((await post(body())).status).toBe(502)
    ext.fail = Object.assign(new Error('Request timed out.'), { name: 'APIConnectionTimeoutError' })
    expect((await post(body())).status).toBe(504)
    ext.fail = null
    ext.calls = []
    ext.reply = { summary: '' }
    expect((await post(body())).status).toBe(502)
    expect(ext.calls).toHaveLength(2)
    expect(ext.refunded).toBe(3)
    expect(ext.consumed).toBe(0)
    // В логе — причина и форма ответа, по которой её можно разобрать.
    const line = errors.mock.calls.map((c) => c.join(' ')).find((l) => l.includes('arcade_review_reply'))
    expect(line).toContain('no summary and no assessed criterion')
    expect(line).toContain('"shape":"{summary:str(0)}"')
    errors.mockRestore()
  })

  it('ответ с расхождениями чинится, отдаётся ученику и пишется в лог', async () => {
    const warns = vi.spyOn(console, 'warn').mockImplementation(() => {})
    ext.reply = { ...REPLY, lexicalResource: JSON.stringify(REPLY.lexicalResource) }
    const res = await post(body())
    expect(res.status).toBe(200)
    expect((await res.json()).review.criteria[1].band).toBe(6)
    expect(warns.mock.calls.join(' ')).toContain('lexicalResource: JSON string')
    warns.mockRestore()
  })

  it('без ключа Anthropic — 503 not_configured', async () => {
    ext.key = false
    const res = await post(body())
    expect(res.status).toBe(503)
    expect(ext.consumed).toBe(0)
  })
})

describe('GET /api/practice/arcade/review', () => {
  it('гостю — без бюджета; своему — остаток на сегодня', async () => {
    const guest = await (await GET(new Request('http://x'))).json()
    expect(guest).toEqual({ configured: true, budget: null })
    ext.consumed = 3
    const mine = await (await GET(new Request('http://x', { headers: { authorization: 'Bearer T' } }))).json()
    expect(mine.budget).toMatchObject({ limit: 20, used: 3, remaining: 17 })
  })
})
