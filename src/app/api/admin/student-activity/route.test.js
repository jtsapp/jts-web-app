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

// Значение кодируем: '+12' без кодирования превратилось бы в ' 12' (плюс в
// запросе — пробел), и проверялся бы не тот вход.
function req(studentId = '141', token = 'TOK') {
  const qs = studentId === null ? '' : `?studentId=${encodeURIComponent(studentId)}`
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

  it('менеджеру отдаёт любого ученика, ростер бэкенда не спрашиваем', async () => {
    verifyTokenStatus.mockResolvedValue(as('MANAGER'))
    expect((await GET(req())).status).toBe(200)
    expect(loadStudentAppActivity).toHaveBeenCalledWith('user-141')
    expect(checkStudentActivityAccess).not.toHaveBeenCalled()
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

  it('без токена и без БД — 401, а не 503: сначала личность, потом состояние сервера', async () => {
    verifyTokenStatus.mockResolvedValue({ status: 'unauthorized', user: null })
    isDbConfigured.mockReturnValue(false)
    const res = await GET(req('141', ''))
    expect(res.status).toBe(401)
    expect(verifyTokenStatus).toHaveBeenCalledWith('')
    // Незнакомцу не рассказываем, настроена ли у нас база.
    await expect(res.json()).resolves.toEqual({ error: 'Unauthorized.' })
    expect(loadStudentAppActivity).not.toHaveBeenCalled()
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

  // Number() принимает все эти строки: пробелы, шестнадцатеричную и
  // экспоненциальную запись, знак, нули впереди. А числа выше 2^53 он округляет к
  // соседнему целому, и id 9007199254740993 превратился бы в ...992.
  // Хелпер проверки подставляет id в адрес бэкенда и сам его не проверяет:
  // отсев должен случиться раньше запроса, а не после него.
  it.each([
    { name: 'пробелы', value: ' 12 ' },
    { name: 'шестнадцатеричная запись', value: '0x10' },
    { name: 'экспонента', value: '1e3' },
    { name: 'плюс', value: '+12' },
    { name: 'минус', value: '-3' },
    { name: 'нули впереди', value: '00012' },
    { name: 'пустая строка', value: '' },
    { name: 'хвост из букв', value: '12abc' },
    { name: 'полноширинные цифры', value: '１２' },
    { name: 'выше безопасного целого', value: '9007199254740992' },
    { name: 'выше безопасного целого, округляется к соседнему', value: '9007199254740993' },
    { name: 'две точки (схлопываются в адресе бэкенда)', value: '..' },
    { name: 'уход вверх по адресу', value: '../1' },
  ])('кривой studentId ($name) у преподавателя — 400, ростер и данные не трогаем', async ({ value }) => {
    verifyTokenStatus.mockResolvedValue(as('TEACHER'))
    const res = await GET(req(value))
    expect(res.status).toBe(400)
    expect(checkStudentActivityAccess).not.toHaveBeenCalled()
    expect(loadStudentAppActivity).not.toHaveBeenCalled()
  })

  it('наибольшее безопасное целое — допустимый id', async () => {
    expect((await GET(req('9007199254740991'))).status).toBe(200)
    expect(loadStudentAppActivity).toHaveBeenCalledWith('user-9007199254740991')
  })

  it('без БД — 503 configured:false', async () => {
    isDbConfigured.mockReturnValue(false)
    const res = await GET(req())
    expect(res.status).toBe(503)
    await expect(res.json()).resolves.toMatchObject({ configured: false })
  })

  // Текст исключения может нести адрес базы, имя пользователя, кусок запроса:
  // сотруднику он ни к чему, а в лог сервера идёт целиком.
  const DB_ERROR_TEXT = 'connect ECONNREFUSED 10.0.0.5:5432 password authentication failed for user "jts"'
  it.each([
    { name: 'чтение', arrange: () => loadStudentAppActivity.mockRejectedValue(new Error(DB_ERROR_TEXT)) },
    {
      name: 'сведение ответа',
      arrange: () => buildStudentAppActivity.mockImplementation(() => { throw new Error(DB_ERROR_TEXT) }),
    },
  ])('сбой ($name) — 500 с общим текстом, подробности только в логе', async ({ arrange }) => {
    arrange()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await GET(req())
    expect(res.status).toBe(500)
    const body = await res.text()
    expect(JSON.parse(body)).toEqual({ error: 'Student activity load failed.' })
    expect(body).not.toContain('ECONNREFUSED')
    expect(body).not.toContain('password')
    expect(spy).toHaveBeenCalledWith('[admin.student-activity] load failed', expect.objectContaining({ message: DB_ERROR_TEXT }))
    spy.mockRestore()
  })

  // Админка живёт на другом домене: ответ без Access-Control-Allow-Origin браузер
  // отбросит, и сотрудник увидит «сеть недоступна» вместо настоящей причины
  // (401, 403, 503). Поэтому заголовок обязан стоять на КАЖДОМ выходе, а не только
  // на успешном.
  const teacherWithRoster = (verdict) => () => {
    verifyTokenStatus.mockResolvedValue(as('TEACHER'))
    checkStudentActivityAccess.mockResolvedValue(verdict)
  }
  it.each([
    { name: '200', arrange: () => {}, status: 200 },
    { name: '400 кривой id', arrange: () => {}, status: 400, studentId: 'abc' },
    { name: '401 без токена', arrange: () => verifyTokenStatus.mockResolvedValue({ status: 'unauthorized', user: null }), status: 401 },
    { name: '401 ростер: токен протух', arrange: teacherWithRoster('unauthorized'), status: 401 },
    { name: '403 ученик', arrange: () => verifyTokenStatus.mockResolvedValue(as('STUDENT')), status: 403 },
    { name: '403 ростер: чужой ученик', arrange: teacherWithRoster('forbidden'), status: 403 },
    { name: '503 бэкенд недоступен', arrange: () => verifyTokenStatus.mockResolvedValue({ status: 'unavailable', user: null }), status: 503 },
    { name: '503 ростер: спросить не удалось', arrange: teacherWithRoster('unavailable'), status: 503 },
    { name: '503 БД не настроена', arrange: () => isDbConfigured.mockReturnValue(false), status: 503 },
    { name: '500 сбой чтения', arrange: () => loadStudentAppActivity.mockRejectedValue(new Error('boom')), status: 500 },
  ])('CORS * на ответе $name', async ({ arrange, status, studentId = '141' }) => {
    arrange()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await GET(req(studentId))
    spy.mockRestore()
    expect(res.status).toBe(status)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('OPTIONS — 204 с CORS', async () => {
    const res = OPTIONS()
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET')
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
  })
})
