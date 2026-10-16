import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Токен звонка Луне: вход обязателен, свой дневной лимит под `user-<id>-luna`,
// короткая metadata для агента в режиме assistant.
let authResult
vi.mock('@/lib/auth-server.js', () => ({
  bearerFromRequest: (req) => (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || null,
  verifyTokenStatus: async () => authResult,
}))
const usage = vi.hoisted(() => ({ today: 0, db: true, opened: [], stale: [], open: false, failUsage: false, failOpen: false }))
vi.mock('@/lib/usage.js', () => ({
  isDbConfigured: () => usage.db,
  closeStaleSessions: async (id) => usage.stale.push(id),
  getUsage: async () => {
    if (usage.failUsage) throw new Error('db down')
    return { todaySeconds: usage.today }
  },
  openSession: async (room, id) => {
    if (usage.failOpen) throw new Error('db down')
    usage.opened.push([room, id])
  },
}))
vi.mock('@/lib/assistant/callUsage.js', async (importOriginal) => ({
  ...(await importOriginal()),
  hasOpenAssistantCall: async () => usage.open,
}))

// Прогрев профиля ученика: сам профиль собирает studentContext.js (бэкенд и
// база) — здесь только кого и когда роут просит прогреть.
vi.mock('@/lib/assistant/studentContext.js', () => ({ warmStudentContext: vi.fn() }))
const { warmStudentContext } = await import('@/lib/assistant/studentContext.js')

const { POST } = await import('./route.js')

const post = (body = {}, token = 'tok', host = null) =>
  POST(
    new Request('http://localhost/api/assistant/call', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(host ? { 'x-forwarded-host': host } : {}),
      },
      body: JSON.stringify(body),
    }),
  )

// Payload JWT без проверки подписи — посмотреть, что уехало агенту.
const claims = (jwt) => JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'))

describe('POST /api/assistant/call', () => {
  const saved = {}
  beforeEach(() => {
    authResult = { status: 'ok', user: { userId: 42, name: 'Айгерім' } }
    Object.assign(usage, { today: 0, db: true, opened: [], stale: [], open: false, failUsage: false, failOpen: false })
    for (const k of ['LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'LIVEKIT_URL']) saved[k] = process.env[k]
    process.env.LIVEKIT_API_KEY = '﻿key'
    process.env.LIVEKIT_API_SECRET = 'secret-secret-secret-secret-secret'
    process.env.LIVEKIT_URL = 'wss://example.livekit.cloud'
  })
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })

  it('без входа — 401; без LiveKit — 503', async () => {
    authResult = { status: 'invalid' }
    expect((await post({}, null)).status).toBe(401)
    authResult = { status: 'ok', user: { userId: 1 } }
    delete process.env.LIVEKIT_URL
    expect((await post()).status).toBe(503)
  })

  it('токен: режим assistant, голос Луны, бюджет — остаток дня; учёт под user-<id>-luna', async () => {
    usage.today = 5 * 60
    const res = await post({ lang: 'kz' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.room).toMatch(/^jts-luna-[a-z0-9]+-\d+$/)
    expect(data.ttl).toBe(10 * 60)
    expect(data.limitSec).toBe(15 * 60)
    expect(usage.stale).toEqual(['user-42-luna'])
    expect(usage.opened).toEqual([[data.room, 'user-42-luna']])
    const meta = JSON.parse(claims(data.token).metadata)
    expect(meta).toEqual({ mode: 'assistant', tutor: 'gentle', lang: 'kz', sessionTtlSec: 600, userName: 'Айгерім' })
  })

  it('лимит исчерпан (или меньше минуты) — 403 limited, комнату не открываем', async () => {
    usage.today = 15 * 60 - 30
    const res = await post()
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ limited: true, error: 'daily_limit', limitSec: 900 })
    expect(usage.opened).toEqual([])
  })

  it('идёт другой звонок (вторая вкладка) — 409: бюджет дня не удваивается', async () => {
    usage.open = true
    const res = await post()
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ error: 'call_busy' })
    expect(usage.opened).toEqual([])
  })

  it('выданный звонок греет профиль ученика: первая реплика Луны не ждёт бэкенд', async () => {
    warmStudentContext.mockClear()
    usage.open = true
    expect((await post()).status).toBe(409)
    expect(warmStudentContext).not.toHaveBeenCalled()
    usage.open = false
    expect((await post({}, 'student-bearer')).status).toBe(200)
    expect(warmStudentContext).toHaveBeenCalledWith('student-bearer', expect.objectContaining({ userId: 42 }))
  })

  it('база упала — звонка нет (503), а не полный бюджет без счёта', async () => {
    usage.failUsage = true
    expect((await post()).status).toBe(503)
    usage.failUsage = false
    usage.failOpen = true
    const res = await post()
    expect(res.status).toBe(503)
    expect((await res.json()).token).toBeUndefined()
  })

  it('на проде звонка пока нет — 404 и в обход кнопки', async () => {
    expect((await post({}, 'tok', 'ai-tutor.justtostudy.kz')).status).toBe(404)
    expect((await post({}, 'tok', 'dev-tutor.justtostudy.kz')).status).toBe(200)
  })

  it('чужой язык — русский', async () => {
    const data = await (await post({ lang: 'de' })).json()
    expect(JSON.parse(claims(data.token).metadata).lang).toBe('ru')
  })
})
