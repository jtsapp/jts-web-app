import { describe, it, expect, vi, beforeEach } from 'vitest'

// Уровень CEFR → Neon-профиль: что пишется, куда и что отдаётся клиенту. Личность и база подменены.

const resolveProfileId = vi.fn()
const upsertProfile = vi.fn()
let dbConfigured = true

vi.mock('@/lib/db/sql.js', () => ({
  isDbConfigured: () => dbConfigured,
  getSql: () => null,
}))

vi.mock('@/lib/db/profile.js', () => ({
  upsertProfile: (...a) => upsertProfile(...a),
}))

vi.mock('@/lib/auth-server.js', () => ({
  resolveProfileId: (...a) => resolveProfileId(...a),
}))

const { POST } = await import('./route.js')

function req(body, { token = 'TOK' } = {}) {
  return new Request('http://x/api/placement/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/placement/complete', () => {
  beforeEach(() => {
    dbConfigured = true
    resolveProfileId.mockReset().mockResolvedValue({ id: 'user-7' })
    upsertProfile.mockReset().mockResolvedValue(undefined)
  })

  it('пишет уровень в профиль того, кого назвал токен', async () => {
    const res = await POST(req({ level: 'B1', deviceId: 'dev-1' }))
    expect(await res.json()).toEqual({ configured: true, ok: true, level: 'B1', measured: 'B1' })
    expect(resolveProfileId).toHaveBeenCalledWith(expect.any(Request), 'dev-1')
    expect(upsertProfile).toHaveBeenCalledWith('user-7', { level: 'B1' })
  })

  it('A0 в профиле тьютора — A1 (profileLevel), но измеренный уровень отдаётся как есть', async () => {
    const res = await POST(req({ level: 'A0' }))
    expect(await res.json()).toMatchObject({ level: 'A1', measured: 'A0' })
    expect(upsertProfile).toHaveBeenCalledWith('user-7', { level: 'A1' })
  })

  it('незнакомый или пустой уровень — 400, в профиль ничего', async () => {
    for (const body of [{ level: 'Z9' }, {}, '{oops']) {
      expect((await POST(req(body))).status).toBe(400)
    }
    expect(upsertProfile).not.toHaveBeenCalled()
  })

  it('без базы — уровень всё равно возвращается клиенту', async () => {
    dbConfigured = false
    expect(await (await POST(req({ level: 'B2' }))).json()).toMatchObject({ configured: false, level: 'B2' })
    expect(upsertProfile).not.toHaveBeenCalled()
  })

  it('сбой записи — 500, а не ложное ok', async () => {
    upsertProfile.mockRejectedValue(new Error('db down'))
    expect((await POST(req({ level: 'B1' }))).status).toBe(500)
  })
})
