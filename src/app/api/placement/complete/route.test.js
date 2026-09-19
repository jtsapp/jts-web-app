import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Снимок теста на уровень уходит в backend (POST /placement-test/report) —
// вторая, необязательная запись рядом с основным сохранением в jts-web-app.
// Проверяем именно её: когда шлём, чем шлём, и что провал backend'а не рушит
// ответ студенту (см. комментарий у reportToBackend в route.js).

const resolveProfileId = vi.fn()
const upsertProfile = vi.fn()
const loadPlacementSession = vi.fn()
const finishPlacementSession = vi.fn()
const scoreGradedAnswers = vi.fn()
const scorePlacementSession = vi.fn()
let dbConfigured = true

vi.mock('@/lib/db/sql.js', () => ({
  isDbConfigured: () => dbConfigured,
  getSql: () => null,
}))

vi.mock('@/lib/db/profile.js', () => ({
  upsertProfile: (...a) => upsertProfile(...a),
}))

// bearerFromRequest и BACKEND_URL — настоящие (парсинг заголовка и константа,
// без сети); мокаем только resolveProfileId, который сам ходит в backend.
vi.mock('@/lib/auth-server.js', async (importOriginal) => {
  const real = await importOriginal()
  return { ...real, resolveProfileId: (...a) => resolveProfileId(...a) }
})

vi.mock('@/lib/db/placementSession.js', () => ({
  loadPlacementSession: (...a) => loadPlacementSession(...a),
  finishPlacementSession: (...a) => finishPlacementSession(...a),
}))

vi.mock('@/lib/placementScore.js', () => ({
  scoreGradedAnswers: (...a) => scoreGradedAnswers(...a),
  scorePlacementSession: (...a) => scorePlacementSession(...a),
}))

const { POST } = await import('./route.js')
const { BACKEND_URL } = await import('@/lib/auth-server.js')

function req(body, { token = 'TOK' } = {}) {
  return new Request('http://x/api/placement/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/placement/complete — доклад backend', () => {
  beforeEach(() => {
    dbConfigured = true
    resolveProfileId.mockReset().mockResolvedValue({ id: 'user-7', name: null })
    upsertProfile.mockReset().mockResolvedValue(undefined)
    loadPlacementSession.mockReset().mockResolvedValue(null)
    finishPlacementSession.mockReset().mockResolvedValue(undefined)
    scoreGradedAnswers.mockReset()
    scorePlacementSession.mockReset().mockReturnValue({
      level: 'B1', theta: 0.4, se: 0.3, flags: ['unresolved'], answered: 12,
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('вошедший студент со снимком — POST в backend с measured-уровнем и флагами', async () => {
    const res = await POST(req({ level: 'B1', session: { theta0: 0, variant: 'express' } }))
    expect(res.status).toBe(200)

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe(`${BACKEND_URL}/placement-test/report`)
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer TOK')
    expect(JSON.parse(init.body)).toEqual({
      level: 'B1', theta: 0.4, se: 0.3, flags: ['unresolved'], variant: null, answered: 12,
    })
  })

  it('анонимный прогон (без bearer-токена) backend не зовёт', async () => {
    resolveProfileId.mockResolvedValue({ id: 'device-9', name: null })
    const res = await POST(req({ level: 'B1', session: { theta0: 0 } }, { token: null }))

    expect(res.status).toBe(200)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('без снимка (нет summary и нечего пересчитать) — backend не зовём', async () => {
    scorePlacementSession.mockReturnValue(null)
    const res = await POST(req({ level: 'B1' }))

    expect(res.status).toBe(200)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('backend недоступен — студенту всё равно приходит успешный ответ', async () => {
    fetch.mockRejectedValue(new Error('ECONNREFUSED'))

    const res = await POST(req({ level: 'B1', session: { theta0: 0 } }))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, level: 'B1' })
    expect(upsertProfile).toHaveBeenCalledTimes(1)
  })
})
