import { describe, it, expect, vi, beforeEach } from 'vitest'

// Цель уровня: только по токену, записывается лишь цель, которую экран сумеет
// нарисовать. Личность и база подменены — проверяем сам роут.
const resolveProfileId = vi.fn()
const loadLevelGoal = vi.fn()
const saveLevelGoal = vi.fn()
let dbConfigured = true

vi.mock('@/lib/auth-server.js', () => ({
  resolveProfileId: (...a) => resolveProfileId(...a),
}))

vi.mock('@/lib/db/sql.js', () => ({
  isDbConfigured: () => dbConfigured,
  getSql: () => null,
}))

vi.mock('@/lib/db/levelGoal.js', () => ({
  loadLevelGoal: (...a) => loadLevelGoal(...a),
  saveLevelGoal: (...a) => saveLevelGoal(...a),
}))

const { GET, PUT } = await import('./route.js')

function req(method, body, { token = 'TOK' } = {}) {
  return new Request('http://x/api/profile/level-goal', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  })
}

describe('/api/profile/level-goal', () => {
  beforeEach(() => {
    dbConfigured = true
    resolveProfileId.mockReset().mockResolvedValue({ id: 'user-7', name: null })
    loadLevelGoal.mockReset().mockResolvedValue({ target: 'B2', from: 'A0' })
    saveLevelGoal.mockReset().mockImplementation(async (_id, g) => g)
  })

  it('GET отдаёт цель профиля из токена', async () => {
    const res = await GET(req('GET'))
    expect(await res.json()).toEqual({ configured: true, goal: { target: 'B2', from: 'A0' } })
    expect(loadLevelGoal).toHaveBeenCalledWith('user-7')
  })

  it('без токена — 401, до личности и базы не доходит', async () => {
    for (const [fn, method] of [[GET, 'GET'], [PUT, 'PUT']]) {
      const res = await fn(req(method, method === 'PUT' ? { target: 'B2', from: 'A0' } : undefined, { token: null }))
      expect(res.status).toBe(401)
    }
    expect(resolveProfileId).not.toHaveBeenCalled()
  })

  // Пустой ответ без базы не должен стирать выбранную цель: клиент отличает
  // «базы нет» по configured: false и держится кэша.
  it('без базы GET — configured: false и goal: null, не ошибка', async () => {
    dbConfigured = false
    const res = await GET(req('GET'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ configured: false, goal: null })
  })

  it('PUT пишет нормализованную цель', async () => {
    const res = await PUT(req('PUT', { target: 'b2', from: 'a0' }))
    expect(await res.json()).toEqual({ configured: true, goal: { target: 'B2', from: 'A0' } })
    expect(saveLevelGoal).toHaveBeenCalledWith('user-7', { target: 'B2', from: 'A0' })
  })

  it('PUT { target: null } снимает цель', async () => {
    const res = await PUT(req('PUT', { target: null }))
    expect(res.status).toBe(200)
    expect(saveLevelGoal).toHaveBeenCalledWith('user-7', null)
  })

  it('цель не выше старта, мусор и пустое тело — 400 без записи', async () => {
    for (const body of [{ target: 'A1', from: 'A2' }, { target: 'Z9', from: 'A1' }, {}, 'not json']) {
      const res = await PUT(req('PUT', body))
      expect(res.status).toBe(400)
    }
    expect(saveLevelGoal).not.toHaveBeenCalled()
  })
})
