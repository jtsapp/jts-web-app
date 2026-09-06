import { describe, it, expect, vi, beforeEach } from 'vitest'

// Ручка поддержки: сбрасывает ученику сегодняшний расход минут тьютора. Права
// проверяются чужие — токен выдал бэкенд, роль спрашиваем у него.
const verifyTokenStatus = vi.fn()
const getUsage = vi.fn()
const resetTodayUsage = vi.fn()

vi.mock('../../../../lib/auth-server.js', () => ({
  verifyTokenStatus: (...a) => verifyTokenStatus(...a),
  profileIdForUser: (id) => `user-${id}`,
}))

vi.mock('../../../../lib/usage.js', () => ({
  getUsage: (...a) => getUsage(...a),
  resetTodayUsage: (...a) => resetTodayUsage(...a),
  isDbConfigured: () => true,
  DAILY_LIMIT_SEC: 1200,
}))

const { GET, POST, OPTIONS } = await import('./route.js')

const admin = { status: 'ok', user: { userId: 1, role: 'ADMIN' } }

function req(body, token = 'TOK') {
  return new Request('http://x/api/admin/tutor-usage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('сброс дневного лимита тьютора', () => {
  beforeEach(() => {
    verifyTokenStatus.mockReset().mockResolvedValue(admin)
    getUsage.mockReset().mockResolvedValue({ todaySeconds: 0, monthSeconds: 0 })
    resetTodayUsage.mockReset().mockResolvedValue({ todaySeconds: 0, monthSeconds: 120 })
  })

  it('сбрасывает расход по ключу ученика', async () => {
    // Ключ в этих таблицах — `user-<id>`, тот же, что и во всём приложении.
    const res = await POST(req({ studentId: 234 }))

    expect(res.status).toBe(200)
    expect(resetTodayUsage).toHaveBeenCalledWith('user-234')
    await expect(res.json()).resolves.toMatchObject({ todaySeconds: 0 })
  })

  it('ученику эту ручку не отдаёт', async () => {
    // Иначе любой мог бы обнулять себе лимит из консоли браузера.
    verifyTokenStatus.mockResolvedValue({ status: 'ok', user: { userId: 9, role: 'STUDENT' } })

    expect((await POST(req({ studentId: 234 }))).status).toBe(403)
    expect(resetTodayUsage).not.toHaveBeenCalled()
  })

  it('менеджеру отдаёт — он и разбирает такие обращения', async () => {
    verifyTokenStatus.mockResolvedValue({ status: 'ok', user: { userId: 2, role: 'MANAGER' } })

    expect((await POST(req({ studentId: 234 }))).status).toBe(200)
  })

  it('без токена — 401', async () => {
    verifyTokenStatus.mockResolvedValue({ status: 'unauthorized', user: null })

    expect((await POST(req({ studentId: 234 }))).status).toBe(401)
  })

  it('бэкенд недоступен — 503, а не 401', async () => {
    // 401 отправил бы администратора перелогиниваться из-за чужого сбоя.
    verifyTokenStatus.mockResolvedValue({ status: 'unavailable', user: null })

    expect((await POST(req({ studentId: 234 }))).status).toBe(503)
  })

  it('без studentId ничего не трогает', async () => {
    expect((await POST(req({}))).status).toBe(400)
    expect(resetTodayUsage).not.toHaveBeenCalled()
  })

  it('GET показывает текущий расход, ничего не сбрасывая', async () => {
    getUsage.mockResolvedValue({ todaySeconds: 275, monthSeconds: 900 })
    const res = await GET(new Request('http://x/api/admin/tutor-usage?studentId=234', {
      headers: { Authorization: 'Bearer TOK' },
    }))

    await expect(res.json()).resolves.toMatchObject({ todaySeconds: 275, dailyLimitSec: 1200 })
    expect(resetTodayUsage).not.toHaveBeenCalled()
  })

  it('преflight отвечает и разрешает Authorization', async () => {
    // Панель живёт на другом домене: без этого браузер не отправит и запрос.
    const res = OPTIONS()
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
  })
})
