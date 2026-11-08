import { describe, it, expect, vi, beforeEach } from 'vitest'

// «Память Луны» в Профиле: только по токену, удалить можно только своё; после удаления кэш профиля Луны сброшен.
const resolveProfileId = vi.fn()
const loadFacts = vi.fn()
const deleteFact = vi.fn()
const dropStudentContext = vi.fn()
let dbConfigured = true

vi.mock('@/lib/auth-server.js', () => ({ resolveProfileId: (...a) => resolveProfileId(...a) }))
vi.mock('@/lib/db/sql.js', () => ({ isDbConfigured: () => dbConfigured, getSql: () => null }))
vi.mock('@/lib/db/assistantFacts.js', () => ({ loadFacts: (...a) => loadFacts(...a), deleteFact: (...a) => deleteFact(...a) }))
vi.mock('@/lib/assistant/studentContext.js', () => ({ dropStudentContext: (...a) => dropStudentContext(...a) }))

const { GET, DELETE } = await import('./route.js')

const req = (method, query = '', { token = 'TOK' } = {}) =>
  new Request(`http://x/api/profile/luna-memory${query}`, { method, headers: token ? { Authorization: `Bearer ${token}` } : {} })

describe('/api/profile/luna-memory', () => {
  beforeEach(() => {
    dbConfigured = true
    resolveProfileId.mockReset().mockResolvedValue({ id: 'user-7', name: null })
    loadFacts.mockReset().mockResolvedValue([{ id: '3', fact: 'учится по вечерам', createdAt: 'a', expiresAt: 'b' }])
    deleteFact.mockReset().mockResolvedValue(true)
    dropStudentContext.mockReset()
  })

  it('GET — факты профиля из токена', async () => {
    const res = await GET(req('GET'))
    expect(await res.json()).toEqual({ configured: true, facts: [{ id: '3', fact: 'учится по вечерам', createdAt: 'a', expiresAt: 'b' }] })
    expect(loadFacts).toHaveBeenCalledWith('user-7')
  })

  it('без токена — 401; без базы — configured: false', async () => {
    expect((await GET(req('GET', '', { token: '' }))).status).toBe(401)
    dbConfigured = false
    expect(await (await GET(req('GET'))).json()).toEqual({ configured: false, facts: [] })
  })

  it('DELETE — своё, со сбросом кэша профиля Луны', async () => {
    const res = await DELETE(req('DELETE', '?id=3'))
    expect(res.status).toBe(200)
    expect(deleteFact).toHaveBeenCalledWith('user-7', '3')
    expect(dropStudentContext).toHaveBeenCalledWith('7')
  })

  it('DELETE — кривой id 400, не нашлось 404 без сброса кэша', async () => {
    expect((await DELETE(req('DELETE', '?id=abc'))).status).toBe(400)
    deleteFact.mockResolvedValue(false)
    expect((await DELETE(req('DELETE', '?id=4'))).status).toBe(404)
    expect(dropStudentContext).not.toHaveBeenCalled()
  })
})
