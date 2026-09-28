import { describe, it, expect, vi, beforeEach } from 'vitest'

const verifyTokenStatus = vi.fn()
const listAssistantErrorReports = vi.fn()

vi.mock('../../../../lib/auth-server.js', () => ({
  verifyTokenStatus: (...a) => verifyTokenStatus(...a),
}))

vi.mock('../../../../lib/db/sql.js', () => ({
  isDbConfigured: () => true,
}))

vi.mock('../../../../lib/db/assistantErrorReports.js', () => ({
  LIST_PAGE: 30,
  listAssistantErrorReports: (...a) => listAssistantErrorReports(...a),
}))

const { GET, OPTIONS } = await import('./route.js')

const admin = { status: 'ok', user: { userId: 1, role: 'ADMIN' } }

function req(query = '', token = 'TOK') {
  return new Request(`http://x/api/admin/assistant-errors${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

describe('GET /api/admin/assistant-errors', () => {
  beforeEach(() => {
    verifyTokenStatus.mockReset().mockResolvedValue(admin)
    listAssistantErrorReports.mockReset().mockResolvedValue({ items: [], total: 0 })
  })

  it('отдаёт список админу', async () => {
    listAssistantErrorReports.mockResolvedValue({
      items: [{ id: 9, userMessage: 'белый экран', screenName: 'Урок' }],
      total: 1,
    })
    const res = await GET(req('?q=белый&limit=10&offset=0'))
    expect(res.status).toBe(200)
    expect(listAssistantErrorReports).toHaveBeenCalledWith({ limit: '10', offset: '0', q: 'белый' })
    await expect(res.json()).resolves.toEqual({
      items: [{ id: 9, userMessage: 'белый экран', screenName: 'Урок' }],
      total: 1,
    })
  })

  it('менеджеру тоже — он разбирает такие обращения', async () => {
    verifyTokenStatus.mockResolvedValue({ status: 'ok', user: { userId: 2, role: 'MANAGER' } })
    expect((await GET(req())).status).toBe(200)
  })

  it('ученику не отдаёт', async () => {
    verifyTokenStatus.mockResolvedValue({ status: 'ok', user: { userId: 9, role: 'STUDENT' } })
    expect((await GET(req())).status).toBe(403)
    expect(listAssistantErrorReports).not.toHaveBeenCalled()
  })

  it('без токена — 401', async () => {
    verifyTokenStatus.mockResolvedValue({ status: 'unauthorized', user: null })
    expect((await GET(req('', null))).status).toBe(401)
  })

  it('бэкенд недоступен — 503, а не 401', async () => {
    verifyTokenStatus.mockResolvedValue({ status: 'unavailable', user: null })
    expect((await GET(req())).status).toBe(503)
  })

  it('preflight разрешает Authorization', async () => {
    const res = OPTIONS()
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})
