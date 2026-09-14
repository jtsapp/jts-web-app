import { describe, it, expect, vi, beforeEach } from 'vitest'

// Запись активного времени: только по токену, только в белый список модулей,
// секунды режутся потолком. Личность и база подменены — проверяем сам роут.
const resolveProfileId = vi.fn()
const addActivitySeconds = vi.fn()
let dbConfigured = true

vi.mock('@/lib/auth-server.js', () => ({
  resolveProfileId: (...a) => resolveProfileId(...a),
}))

vi.mock('@/lib/db/sql.js', () => ({
  isDbConfigured: () => dbConfigured,
  getSql: () => null,
}))

vi.mock('@/lib/db/activityTime.js', async (importOriginal) => {
  const real = await importOriginal()
  return { ...real, addActivitySeconds: (...a) => addActivitySeconds(...a) }
})

const { POST } = await import('./route.js')

function req(body, { token = 'TOK' } = {}) {
  return new Request('http://x/api/profile/activity', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/profile/activity', () => {
  beforeEach(() => {
    dbConfigured = true
    resolveProfileId.mockReset().mockResolvedValue({ id: 'user-7', name: null })
    addActivitySeconds.mockReset().mockResolvedValue(120)
  })

  it('пишет пачку в профиль из токена', async () => {
    const res = await POST(req({ module: 'workbooks', seconds: 61 }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ configured: true, recorded: 61, todaySeconds: 120 })
    expect(addActivitySeconds).toHaveBeenCalledWith('user-7', 'workbooks', 61)
  })

  it('без токена — 401, а до базы и личности дело не доходит', async () => {
    const res = await POST(req({ module: 'workbooks', seconds: 61 }, { token: null }))
    expect(res.status).toBe(401)
    expect(resolveProfileId).not.toHaveBeenCalled()
    expect(addActivitySeconds).not.toHaveBeenCalled()
  })

  it('протухший токен — отказ resolveProfileId как есть', async () => {
    resolveProfileId.mockResolvedValue({
      error: Response.json({ error: 'Invalid or expired access token.' }, { status: 401 }),
    })
    const res = await POST(req({ module: 'workbooks', seconds: 61 }))
    expect(res.status).toBe(401)
    expect(addActivitySeconds).not.toHaveBeenCalled()
  })

  // Время тьютора и шэдоуинга сервер считает сам — принять их от клиента значит
  // дать накрутить норматив по речи без единого звонка.
  it('тьютора, шэдоуинг и прочее от клиента не принимает', async () => {
    for (const moduleKey of ['ai_tutor', 'shadowing', 'media_practice', '', 42]) {
      const res = await POST(req({ module: moduleKey, seconds: 60 }))
      expect(`${moduleKey} → ${res.status}`).toBe(`${moduleKey} → 400`)
    }
    expect(addActivitySeconds).not.toHaveBeenCalled()
  })

  it('пачку сверх потолка режет', async () => {
    const res = await POST(req({ module: 'vocabulary_sr', seconds: 99_999 }))
    expect((await res.json()).recorded).toBe(300)
    expect(addActivitySeconds).toHaveBeenCalledWith('user-7', 'vocabulary_sr', 300)
  })

  it('пустая пачка — ответ без записи', async () => {
    const res = await POST(req({ module: 'workbooks', seconds: 0 }))
    expect(await res.json()).toEqual({ configured: true, recorded: 0 })
    expect(addActivitySeconds).not.toHaveBeenCalled()
  })

  it('битое тело — 400', async () => {
    const res = await POST(req('{не json'))
    expect(res.status).toBe(400)
  })

  it('без базы — 503, но токен всё равно проверяется первым', async () => {
    dbConfigured = false
    expect((await POST(req({ module: 'workbooks', seconds: 60 }, { token: null }))).status).toBe(401)
    expect((await POST(req({ module: 'workbooks', seconds: 60 }))).status).toBe(503)
  })

  it('сбой записи — 500, а не упавший процесс', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    addActivitySeconds.mockRejectedValue(new Error('boom'))
    const res = await POST(req({ module: 'workbooks', seconds: 60 }))
    expect(res.status).toBe(500)
    quiet.mockRestore()
  })
})
