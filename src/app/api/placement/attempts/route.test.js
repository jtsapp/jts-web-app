import { describe, it, expect, vi, beforeEach } from 'vitest'
import fixture from '@/placement/__fixtures__/envelope-b1.json'

// Результат теста v16: только по токену, в базу — только конверт, прошедший проверку. Личность и база подменены.
const resolveProfileId = vi.fn()
const saveAttempt = vi.fn()
const loadLatestAttempt = vi.fn()
let dbConfigured = true

vi.mock('@/lib/auth-server.js', () => ({ resolveProfileId: (...a) => resolveProfileId(...a) }))
vi.mock('@/lib/db/sql.js', () => ({ isDbConfigured: () => dbConfigured, getSql: () => null }))
vi.mock('@/lib/db/placementV16.js', () => ({
  saveAttempt: (...a) => saveAttempt(...a),
  loadLatestAttempt: (...a) => loadLatestAttempt(...a),
}))

const { GET, POST } = await import('./route.js')

function req(method, body, { token = 'TOK' } = {}) {
  return new Request('http://x/api/placement/attempts', {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  })
}

describe('/api/placement/attempts', () => {
  beforeEach(() => {
    dbConfigured = true
    resolveProfileId.mockReset().mockResolvedValue({ id: 'user-7' })
    saveAttempt.mockReset().mockResolvedValue({ attemptId: 'jts_fixture_b1_travel' })
    loadLatestAttempt.mockReset().mockResolvedValue(fixture)
  })

  it('POST сохраняет конверт под профилем из токена', async () => {
    const res = await POST(req('POST', { envelope: fixture }))
    expect(await res.json()).toEqual({ configured: true, saved: true, attemptId: 'jts_fixture_b1_travel' })
    expect(saveAttempt).toHaveBeenCalledWith('user-7', expect.objectContaining({ schemaVersion: 1 }))
  })

  it('чужая форма — 400, в базу не идёт', async () => {
    const res = await POST(req('POST', { envelope: { schemaVersion: 1, source: 'other' } }))
    expect(res.status).toBe(400)
    expect(saveAttempt).not.toHaveBeenCalled()
    expect((await POST(req('POST', '{oops'))).status).toBe(400)
  })

  it('без токена — 401, до личности не доходит', async () => {
    expect((await POST(req('POST', { envelope: fixture }, { token: null }))).status).toBe(401)
    expect((await GET(req('GET', undefined, { token: null }))).status).toBe(401)
    expect(resolveProfileId).not.toHaveBeenCalled()
  })

  it('GET отдаёт последний конверт; без базы — честное configured: false', async () => {
    expect((await (await GET(req('GET'))).json()).envelope.assessment.overallCEFR).toBe('B1')
    dbConfigured = false
    expect(await (await GET(req('GET'))).json()).toEqual({ configured: false, envelope: null })
  })
})
