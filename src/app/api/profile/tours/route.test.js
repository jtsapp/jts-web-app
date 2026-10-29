import { describe, it, expect, vi, beforeEach } from 'vitest'

// Пройденные туры: только по токену, пишутся лишь имена, которые клиент собирает из ключа.
// Личность и база подменены — проверяем сам роут.
const resolveProfileId = vi.fn()
const loadToursSeen = vi.fn()
const markToursSeen = vi.fn()
let dbConfigured = true

vi.mock('@/lib/auth-server.js', () => ({
  resolveProfileId: (...a) => resolveProfileId(...a),
}))

vi.mock('@/lib/db/sql.js', () => ({
  isDbConfigured: () => dbConfigured,
  getSql: () => null,
}))

vi.mock('@/lib/db/tourSeen.js', () => ({
  loadToursSeen: (...a) => loadToursSeen(...a),
  markToursSeen: (...a) => markToursSeen(...a),
}))

const { GET, POST } = await import('./route.js')

function req(method, body, { token = 'TOK' } = {}) {
  return new Request('http://x/api/profile/tours', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  })
}

describe('/api/profile/tours', () => {
  beforeEach(() => {
    dbConfigured = true
    resolveProfileId.mockReset().mockResolvedValue({ id: 'user-7', name: null })
    loadToursSeen.mockReset().mockResolvedValue(['home:ge', 'practice'])
    markToursSeen.mockReset().mockResolvedValue(undefined)
  })

  it('GET отдаёт туры профиля из токена', async () => {
    const res = await GET(req('GET'))
    expect(await res.json()).toEqual({ configured: true, tours: ['home:ge', 'practice'] })
    expect(loadToursSeen).toHaveBeenCalledWith('user-7')
  })

  it('без токена — 401, до личности и базы не доходит', async () => {
    for (const [fn, method] of [[GET, 'GET'], [POST, 'POST']]) {
      const res = await fn(req(method, method === 'POST' ? { tours: ['home'] } : undefined, { token: null }))
      expect(res.status).toBe(401)
    }
    expect(resolveProfileId).not.toHaveBeenCalled()
  })

  // Пустой список без базы не должен значить «туров не проходили»: клиент отличает это по
  // configured: false и держится отметок браузера.
  it('без базы GET — configured: false, POST — 503', async () => {
    dbConfigured = false
    const res = await GET(req('GET'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ configured: false, tours: [] })
    expect((await POST(req('POST', { tours: ['home'] }))).status).toBe(503)
    expect(markToursSeen).not.toHaveBeenCalled()
  })

  it('POST пишет туры без повторов', async () => {
    const res = await POST(req('POST', { tours: ['home:ge', 'practice', 'home:ge'] }))
    expect(await res.json()).toEqual({ configured: true, ok: true })
    expect(markToursSeen).toHaveBeenCalledWith('user-7', ['home:ge', 'practice'])
  })

  it('чужие имена, пустой список, слишком много и мусор — 400 без записи', async () => {
    const many = Array.from({ length: 21 }, (_, i) => `t${i}`)
    for (const body of [{ tours: ['Home Page'] }, { tours: ['home:ge:x'] }, { tours: [] }, { tours: many }, {}, 'not json']) {
      const res = await POST(req('POST', body))
      expect(res.status).toBe(400)
    }
    expect(markToursSeen).not.toHaveBeenCalled()
  })

  it('протухший токен — ответ resolveProfileId как есть', async () => {
    resolveProfileId.mockResolvedValue({ error: Response.json({ error: 'expired' }, { status: 401 }) })
    expect((await GET(req('GET'))).status).toBe(401)
    expect(loadToursSeen).not.toHaveBeenCalled()
  })
})
