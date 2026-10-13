// Роут перевода выделения: свой повтор вместо ретраев SDK, потолок раньше
// клиентского и возврат лимита при сбое. Мокаются платный Claude, проверка
// токена и бюджет; часы — свои, чтобы проверить «на повтор не хватает времени».

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Anthropic from '@anthropic-ai/sdk'
import { TRANSLATE_CLIENT_TIMEOUT_MS, TRANSLATE_DEADLINE_MS } from '@/practice/writing/translateTimeouts.js'

const ext = vi.hoisted(() => ({ calls: [], script: [], consumed: 0, refunded: 0, now: 0, authMs: 0 }))

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
  resolveProfileId: async () => {
    // Проверка токена у бэкенда тоже съедает время из потолка.
    ext.now += ext.authMs
    return { id: 'user-7', isDemoAccount: false }
  },
}))
vi.mock('@/lib/db/sql.js', () => ({ isDbConfigured: () => true, getSql: () => null }))
vi.mock('@/lib/db/writingBudget.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    translateBudget: async () => null,
    consumeTranslate: async () => ++ext.consumed,
    refundTranslate: async () => {
      ext.refunded++
    },
  }
})

import { POST } from './route.js'

const REPLY = { ru: 'большая школа', kk: 'үлкен мектеп' }

function post() {
  return POST(
    new Request('http://x/api/writing/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer T' },
      body: JSON.stringify({ text: 'a big school' }),
    }),
  )
}

const overloaded = () => new Anthropic.InternalServerError(529, { type: 'overloaded_error' }, 'Overloaded', new Headers())

beforeEach(() => {
  Object.assign(ext, { calls: [], script: [], consumed: 0, refunded: 0, now: 1_000_000, authMs: 0 })
  vi.spyOn(Date, 'now').mockImplementation(() => ext.now)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('POST /api/writing/translate', () => {
  it('роут успевает раньше, чем клиент уйдёт в подстрочник', () => {
    // Иначе перевод списан из лимита, а ученик его уже не увидит.
    expect(TRANSLATE_DEADLINE_MS + 2000).toBeLessThanOrEqual(TRANSLATE_CLIENT_TIMEOUT_MS)
  })

  it('без ретраев SDK, вызов не дольше потолка', async () => {
    ext.script = [REPLY]
    const res = await post()
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject(REPLY)
    expect(ext.calls).toHaveLength(1)
    expect(ext.calls[0].maxRetries).toBe(0)
    expect(ext.calls[0].timeoutMs).toBeGreaterThan(0)
    expect(ext.calls[0].timeoutMs).toBeLessThanOrEqual(TRANSLATE_DEADLINE_MS)
    expect(ext.consumed).toBe(1)
    expect(ext.refunded).toBe(0)
  })

  it('перегрузка модели (529) — один повтор, лимит списан один раз', async () => {
    ext.script = [overloaded(), REPLY]
    const res = await post()
    expect(res.status).toBe(200)
    expect(ext.calls).toHaveLength(2)
    expect(ext.calls[1].maxRetries).toBe(0)
    expect(ext.consumed).toBe(1)
    expect(ext.refunded).toBe(0)
  })

  it('обрыв сети — тоже повтор', async () => {
    ext.script = [new Anthropic.APIConnectionError({ message: 'socket hang up' }), REPLY]
    const res = await post()
    expect(res.status).toBe(200)
    expect(ext.calls).toHaveLength(2)
  })

  it('второй сбой подряд — 502 и лимит назад, третьей попытки нет', async () => {
    ext.script = [overloaded(), overloaded(), REPLY]
    const res = await post()
    expect(res.status).toBe(502)
    expect(ext.calls).toHaveLength(2)
    expect(ext.refunded).toBe(1)
  })

  it('400 повтор не лечит — сразу 502 и лимит назад', async () => {
    ext.script = [new Anthropic.BadRequestError(400, { type: 'invalid_request_error' }, 'Bad', new Headers()), REPLY]
    const res = await post()
    expect(res.status).toBe(502)
    expect(ext.calls).toHaveLength(1)
    expect(ext.refunded).toBe(1)
  })

  it('на повтор не хватает времени — 502 сразу, а не ответ после ухода клиента', async () => {
    // Первый вызов висел до своего таймаута: до потолка осталось меньше,
    // чем нужно на перевод.
    ext.script = [
      () => {
        ext.now += 8000
        throw new Anthropic.APIConnectionTimeoutError()
      },
      REPLY,
    ]
    const res = await post()
    expect(res.status).toBe(502)
    expect(ext.calls).toHaveLength(1)
    expect(ext.refunded).toBe(1)
  })

  it('повтор получает только остаток потолка', async () => {
    ext.script = [
      () => {
        ext.now += 5000
        throw new Anthropic.APIConnectionTimeoutError()
      },
      REPLY,
    ]
    const res = await post()
    expect(res.status).toBe(200)
    expect(ext.calls).toHaveLength(2)
    expect(ext.calls[1].timeoutMs).toBeLessThanOrEqual(TRANSLATE_DEADLINE_MS - 5000)
  })

  it('долгий вход в бэкенд не обнуляет таймаут вызова (0 у SDK — 10 минут)', async () => {
    ext.authMs = TRANSLATE_DEADLINE_MS + 500
    ext.script = [REPLY]
    const res = await post()
    expect(res.status).toBe(200)
    expect(ext.calls[0].timeoutMs).toBeGreaterThan(0)
    expect(ext.calls[0].maxRetries).toBe(0)
  })
})
