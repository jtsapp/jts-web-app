import { describe, it, expect, vi, beforeEach } from 'vitest'

// Ручка для карточки «Мои студенты» в админке. Роль спрашиваем у бэкенда, а
// «свой ли ученик» у преподавателя — отдельной ручкой бэкенда.
const verifyTokenStatus = vi.fn()
const checkStudentActivityAccess = vi.fn()
const isDbConfigured = vi.fn()
const loadStudentAppActivity = vi.fn()
const buildStudentAppActivity = vi.fn()

vi.mock('../../../../lib/auth-server.js', () => ({
  verifyTokenStatus: (...a) => verifyTokenStatus(...a),
  checkStudentActivityAccess: (...a) => checkStudentActivityAccess(...a),
  profileIdForUser: (id) => `user-${id}`,
}))

vi.mock('../../../../lib/db/sql.js', () => ({
  isDbConfigured: () => isDbConfigured(),
}))

vi.mock('../../../../lib/db/studentActivity.js', () => ({
  loadStudentAppActivity: (...a) => loadStudentAppActivity(...a),
  buildStudentAppActivity: (...a) => buildStudentAppActivity(...a),
}))

const { GET, OPTIONS } = await import('./route.js')

const as = (role) => ({ status: 'ok', user: { userId: 1, role } })

function req(studentId = '141', token = 'TOK') {
  const qs = studentId === null ? '' : `?studentId=${studentId}`
  return new Request(`http://x/api/admin/student-activity${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

describe('GET /api/admin/student-activity', () => {
  beforeEach(() => {
    verifyTokenStatus.mockReset().mockResolvedValue(as('ADMIN'))
    checkStudentActivityAccess.mockReset().mockResolvedValue('allowed')
    isDbConfigured.mockReset().mockReturnValue(true)
    loadStudentAppActivity.mockReset().mockResolvedValue({ raw: true })
    buildStudentAppActivity.mockReset().mockReturnValue({ configured: true, skills: [] })
  })

  it('админу отдаёт данные по ключу ученика', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(loadStudentAppActivity).toHaveBeenCalledWith('user-141')
    expect(buildStudentAppActivity).toHaveBeenCalledWith({ raw: true })
    await expect(res.json()).resolves.toEqual({ configured: true, skills: [] })
    // Админка живёт на другом домене.
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    // Админу и менеджеру проверка ростера не нужна.
    expect(checkStudentActivityAccess).not.toHaveBeenCalled()
  })

  it('менеджеру отдаёт', async () => {
    verifyTokenStatus.mockResolvedValue(as('MANAGER'))
    expect((await GET(req())).status).toBe(200)
  })

  it('преподавателю — только когда бэкенд подтвердил «свой ученик»', async () => {
    verifyTokenStatus.mockResolvedValue(as('TEACHER'))
    expect((await GET(req())).status).toBe(200)
    expect(checkStudentActivityAccess).toHaveBeenCalledWith('TOK', 141)
  })

  it('преподавателю чужого ученика — 403, данные не читаются', async () => {
    verifyTokenStatus.mockResolvedValue(as('TEACHER'))
    checkStudentActivityAccess.mockResolvedValue('forbidden')
    expect((await GET(req())).status).toBe(403)
    expect(loadStudentAppActivity).not.toHaveBeenCalled()
  })

  it('проверка ростера не удалась — 503, а не «нет доступа»', async () => {
    verifyTokenStatus.mockResolvedValue(as('TEACHER'))
    checkStudentActivityAccess.mockResolvedValue('unavailable')
    expect((await GET(req())).status).toBe(503)
  })

  it('бэкенд счёл токен протухшим на проверке ростера — 401', async () => {
    verifyTokenStatus.mockResolvedValue(as('TEACHER'))
    checkStudentActivityAccess.mockResolvedValue('unauthorized')
    expect((await GET(req())).status).toBe(401)
  })

  it('непонятный вердикт проверки ростера — 403: пускаем только по «allowed»', async () => {
    // Проверка прав не должна открываться от значения, которого мы не ждали.
    verifyTokenStatus.mockResolvedValue(as('TEACHER'))
    checkStudentActivityAccess.mockResolvedValue(undefined)
    expect((await GET(req())).status).toBe(403)
    expect(loadStudentAppActivity).not.toHaveBeenCalled()
  })

  it('ученику — 403, бэкенд даже не спрашиваем', async () => {
    verifyTokenStatus.mockResolvedValue(as('STUDENT'))
    expect((await GET(req())).status).toBe(403)
    expect(checkStudentActivityAccess).not.toHaveBeenCalled()
    expect(loadStudentAppActivity).not.toHaveBeenCalled()
  })

  it('без токена — 401', async () => {
    verifyTokenStatus.mockResolvedValue({ status: 'unauthorized', user: null })
    expect((await GET(req('141', ''))).status).toBe(401)
  })

  it('бэкенд недоступен — 503, а не 401', async () => {
    verifyTokenStatus.mockResolvedValue({ status: 'unavailable', user: null })
    expect((await GET(req())).status).toBe(503)
  })

  it('кривой studentId — 400', async () => {
    expect((await GET(req('abc'))).status).toBe(400)
    expect((await GET(req('0'))).status).toBe(400)
    expect((await GET(req('1.5'))).status).toBe(400)
    expect((await GET(req(null))).status).toBe(400)
  })

  it('кривой studentId у преподавателя — 400, ростер у бэкенда не спрашиваем', async () => {
    // Хелпер проверки подставляет id в адрес бэкенда и сам его не проверяет:
    // отсев должен случиться раньше запроса, а не после него.
    verifyTokenStatus.mockResolvedValue(as('TEACHER'))
    expect((await GET(req('../1'))).status).toBe(400)
    expect(checkStudentActivityAccess).not.toHaveBeenCalled()
    expect(loadStudentAppActivity).not.toHaveBeenCalled()
  })

  it('без БД — 503 configured:false', async () => {
    isDbConfigured.mockReturnValue(false)
    const res = await GET(req())
    expect(res.status).toBe(503)
    await expect(res.json()).resolves.toMatchObject({ configured: false })
  })

  it('сбой чтения — 500', async () => {
    loadStudentAppActivity.mockRejectedValue(new Error('boom'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await GET(req())).status).toBe(500)
    spy.mockRestore()
  })

  it('OPTIONS — 204 с CORS', async () => {
    const res = OPTIONS()
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET')
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
  })
})
