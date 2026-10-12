// Роут AI-проверки письма: строгая схема, свой повтор вместо ретраев SDK и
// возврат кредита. Мокаются платный Claude, проверка токена, бюджет и журнал.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import Anthropic from '@anthropic-ai/sdk'
import { CHECK_CLIENT_TIMEOUT_MS, CHECK_DEADLINE_MS } from '@/practice/writing/assessContract.js'

const ext = vi.hoisted(() => ({ calls: [], script: [], consumed: 0, refunded: 0, recorded: 0 }))

vi.mock('@/lib/anthropic.js', () => ({
  hasAnthropicKey: () => true,
  structured: vi.fn(async (args) => {
    ext.calls.push(args)
    const step = ext.script.shift()
    if (typeof step === 'function') return step()
    if (step instanceof Error) throw step
    return step
  }),
}))
vi.mock('@/lib/auth-server.js', () => ({
  resolveProfileId: async () => ({ id: 'user-7', isDemoAccount: false }),
}))
vi.mock('@/lib/db/sql.js', () => ({ isDbConfigured: () => true, getSql: () => null }))
vi.mock('@/lib/db/writingBudget.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    checkBudget: async () => null,
    consumeCheck: async () => ++ext.consumed,
    refundCheck: async () => {
      ext.refunded++
    },
  }
})
vi.mock('@/lib/db/writingAttempts.js', () => ({
  recordWritingAttempt: async () => {
    ext.recorded++
  },
  updateWritingSnapshot: async () => {},
}))

import { POST } from './route.js'

const TEXT = 'Last summer I went to Almaty with my family. We was there for one week and it was great.'
const REPLY = {
  scores: { task: 4, organisation: 4, vocabulary: 3.5, grammar: 3 },
  cefr: 'B1',
  summary: 'A clear story.',
  strengths: [{ quote: 'I went to Almaty', why: 'Clear.' }],
  corrections: [{ original: 'We was', corrected: 'We were', type: 'grammar', severity: 'high', explanation: 'Plural.' }],
  rewrite: 'Last summer I went to Almaty with my family. We were there for one week.',
  nextSteps: ['Check was/were.'],
}

function post() {
  return POST(
    new Request('http://x/api/writing/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer T' },
      body: JSON.stringify({ level: 'B1', genre: 'Story', targetWords: [80, 150], task: 'Write a story.', text: TEXT }),
    }),
  )
}

const overloaded = () => new Anthropic.InternalServerError(529, { type: 'overloaded_error' }, 'Overloaded', new Headers())

beforeEach(() => {
  Object.assign(ext, { calls: [], script: [], consumed: 0, refunded: 0, recorded: 0 })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('POST /api/writing/check', () => {
  it('роут успевает раньше, чем клиент сдастся', () => {
    // Иначе кредит списан, а ученик уже смотрит офлайн-проверку (баг 15).
    expect(CHECK_DEADLINE_MS + 5000).toBeLessThan(CHECK_CLIENT_TIMEOUT_MS)
    // И всё — под 100 с Cloudflare на проде.
    expect(CHECK_CLIENT_TIMEOUT_MS).toBeLessThan(100000)
  })

  it('строгая схема, без ретраев SDK, вызов не дольше потолка', async () => {
    ext.script = [REPLY]
    const res = await post()
    expect(res.status).toBe(200)
    const d = await res.json()
    expect(d.mode).toBe('live')
    expect(d.assessment.nextSteps).toEqual(['Check was/were.'])
    expect(ext.calls).toHaveLength(1)
    expect(ext.calls[0]).toMatchObject({ strict: true, maxRetries: 0 })
    expect(ext.calls[0].timeoutMs).toBeLessThanOrEqual(CHECK_DEADLINE_MS)
    expect(ext.consumed).toBe(1)
    expect(ext.refunded).toBe(0)
    expect(ext.recorded).toBe(1)
  })

  it('перегрузка модели — один повтор, кредит списан один раз', async () => {
    ext.script = [overloaded(), REPLY]
    const res = await post()
    expect(res.status).toBe(200)
    expect(ext.calls).toHaveLength(2)
    expect(ext.consumed).toBe(1)
    expect(ext.refunded).toBe(0)
  })

  it('обрыв сети — тоже повтор', async () => {
    ext.script = [new Anthropic.APIConnectionTimeoutError(), REPLY]
    const res = await post()
    expect(res.status).toBe(200)
    expect(ext.calls).toHaveLength(2)
  })

  it('второй сбой подряд — 502 и кредит назад, третьей попытки нет', async () => {
    ext.script = [overloaded(), overloaded(), REPLY]
    const res = await post()
    expect(res.status).toBe(502)
    expect(ext.calls).toHaveLength(2)
    expect(ext.refunded).toBe(1)
    expect(ext.recorded).toBe(0)
  })

  it('ошибка запроса (400) не повторяется', async () => {
    ext.script = [new Anthropic.BadRequestError(400, { type: 'invalid_request_error' }, 'bad', new Headers()), REPLY]
    const res = await post()
    expect(res.status).toBe(502)
    expect(ext.calls).toHaveLength(1)
    expect(ext.refunded).toBe(1)
  })

  it('повтора нет, если до потолка роута на него не хватит времени', async () => {
    const now = vi.spyOn(Date, 'now')
    let t = 1_000_000
    now.mockImplementation(() => t)
    // Первый вызов «шёл» 50 с и упал перегрузкой: до потолка 10 с — повтор
    // уже не успел бы, роут отвечает сразу.
    ext.script = [
      () => {
        t += 50000
        throw overloaded()
      },
      REPLY,
    ]
    const res = await post()
    now.mockRestore()
    expect(res.status).toBe(502)
    expect(ext.calls).toHaveLength(1)
    expect(ext.refunded).toBe(1)
  })

  it('повторный вызов получает только остаток времени', async () => {
    const now = vi.spyOn(Date, 'now')
    let t = 1_000_000
    now.mockImplementation(() => t)
    ext.script = [
      () => {
        t += 30000
        throw overloaded()
      },
      REPLY,
    ]
    const res = await post()
    now.mockRestore()
    expect(res.status).toBe(200)
    expect(ext.calls[1].timeoutMs).toBe(CHECK_DEADLINE_MS - 30000)
  })

  it('ответ без nextSteps — не разбор: 502 и кредит назад', async () => {
    const { nextSteps, ...rest } = REPLY
    void nextSteps
    ext.script = [rest]
    const res = await post()
    expect(res.status).toBe(502)
    expect(ext.refunded).toBe(1)
  })
})
