import { describe, it, expect, vi, beforeEach } from 'vitest'

const verifyTokenStatus = vi.fn()
const updateAssistantErrorReport = vi.fn()
const deleteAssistantErrorReport = vi.fn()

vi.mock('../../../../../lib/auth-server.js', () => ({
  verifyTokenStatus: (...a) => verifyTokenStatus(...a),
}))

vi.mock('../../../../../lib/db/sql.js', () => ({
  isDbConfigured: () => true,
}))

vi.mock('../../../../../lib/db/assistantErrorReports.js', () => ({
  updateAssistantErrorReport: (...a) => updateAssistantErrorReport(...a),
  deleteAssistantErrorReport: (...a) => deleteAssistantErrorReport(...a),
}))

const { PATCH, DELETE, OPTIONS } = await import('./route.js')

const admin = { status: 'ok', user: { userId: 1, role: 'ADMIN', name: 'Алия' } }
const ctx = (id = '7') => ({ params: Promise.resolve({ id }) })

function req(method, body, token = 'TOK') {
  return new Request('http://x/api/admin/assistant-errors/7', {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('/api/admin/assistant-errors/[id]', () => {
  beforeEach(() => {
    verifyTokenStatus.mockReset().mockResolvedValue(admin)
    updateAssistantErrorReport.mockReset().mockResolvedValue({ ok: true, item: { id: 7 } })
    deleteAssistantErrorReport.mockReset().mockResolvedValue('deleted')
  })

  it('PATCH: правит текст и примечание, подписывает именем из токена', async () => {
    const res = await PATCH(req('PATCH', { summary: 'новый текст', note: 'передали в разработку' }), ctx())
    expect(res.status).toBe(200)
    expect(updateAssistantErrorReport).toHaveBeenCalledWith(
      '7',
      { summary: 'новый текст', note: 'передали в разработку' },
      { name: 'Алия' },
    )
    await expect(res.json()).resolves.toEqual({ item: { id: 7 } })
  })

  it('PATCH: имя автора берётся из токена, а не из тела', async () => {
    await PATCH(req('PATCH', { note: 'x', noteAuthorName: 'Чужой' }), ctx())
    expect(updateAssistantErrorReport.mock.calls[0][2]).toEqual({ name: 'Алия' })
  })

  it('PATCH: нет записи — 404, пустая правка — 400', async () => {
    updateAssistantErrorReport.mockResolvedValue({ ok: false, reason: 'not_found' })
    expect((await PATCH(req('PATCH', { note: 'x' }), ctx())).status).toBe(404)
    updateAssistantErrorReport.mockResolvedValue({ ok: false, reason: 'invalid' })
    expect((await PATCH(req('PATCH', {}), ctx())).status).toBe(400)
  })

  it('PATCH: битый JSON — 400', async () => {
    const bad = new Request('http://x/api/admin/assistant-errors/7', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer TOK' },
      body: '{oops',
    })
    expect((await PATCH(bad, ctx())).status).toBe(400)
    expect(updateAssistantErrorReport).not.toHaveBeenCalled()
  })

  it('DELETE: удаляет; нет записи — 404', async () => {
    const res = await DELETE(req('DELETE'), ctx())
    expect(res.status).toBe(200)
    expect(deleteAssistantErrorReport).toHaveBeenCalledWith('7')
    deleteAssistantErrorReport.mockResolvedValue('not_found')
    expect((await DELETE(req('DELETE'), ctx())).status).toBe(404)
  })

  it('менеджеру можно', async () => {
    verifyTokenStatus.mockResolvedValue({ status: 'ok', user: { userId: 2, role: 'MANAGER', name: 'М' } })
    expect((await DELETE(req('DELETE'), ctx())).status).toBe(200)
  })

  it('ученику нельзя ни править, ни удалять', async () => {
    verifyTokenStatus.mockResolvedValue({ status: 'ok', user: { userId: 9, role: 'STUDENT' } })
    expect((await PATCH(req('PATCH', { note: 'x' }), ctx())).status).toBe(403)
    expect((await DELETE(req('DELETE'), ctx())).status).toBe(403)
    expect(updateAssistantErrorReport).not.toHaveBeenCalled()
    expect(deleteAssistantErrorReport).not.toHaveBeenCalled()
  })

  it('без токена — 401, бэкенд недоступен — 503', async () => {
    verifyTokenStatus.mockResolvedValue({ status: 'unauthorized', user: null })
    expect((await DELETE(req('DELETE', undefined, null), ctx())).status).toBe(401)
    verifyTokenStatus.mockResolvedValue({ status: 'unavailable', user: null })
    expect((await DELETE(req('DELETE'), ctx())).status).toBe(503)
  })

  it('preflight разрешает PATCH и DELETE', () => {
    const res = OPTIONS()
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('PATCH')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('DELETE')
  })
})
