import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Роут кэширует токен в модульной переменной, поэтому каждый сценарий берёт
// СВЕЖИЙ модуль: иначе второй тест отвечал бы кэшем первого и ничего не
// проверял.
async function загрузить() {
  vi.resetModules()
  return (await import('./route.js')).POST
}

/** JWT с exp: разбирается тем же способом, что и в самом роуте. */
function jwt(expSec) {
  const b64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64url')
  return `${b64({ alg: 'HS256' })}.${b64({ exp: expSec, userId: 1 })}.sig`
}

const ЖИВОЙ = jwt(Math.floor(Date.now() / 1000) + 3600)

const исходные = { phone: process.env.DEMO_PHONE, password: process.env.DEMO_PASSWORD }

beforeEach(() => {
  process.env.DEMO_PHONE = '+7 (777) 123-45-67'
  process.env.DEMO_PASSWORD = 'секрет'
})

afterEach(() => {
  vi.unstubAllGlobals()
  if (исходные.phone === undefined) delete process.env.DEMO_PHONE
  else process.env.DEMO_PHONE = исходные.phone
  if (исходные.password === undefined) delete process.env.DEMO_PASSWORD
  else process.env.DEMO_PASSWORD = исходные.password
})

describe('POST /api/practice/demo-token', () => {
  it('отдаёт токен, а пароль наружу не уходит', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ accessToken: ЖИВОЙ }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await (await загрузить())()
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.accessToken).toBe(ЖИВОЙ)
    // Ровно то, ради чего всё и затевалось: в ответе один токен и ничего больше.
    expect(Object.keys(body)).toEqual(['accessToken'])
    expect(JSON.stringify(body)).not.toContain('секрет')
  })

  it('телефон уходит на бэкенд нормализованным, вместе с паролем', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ accessToken: ЖИВОЙ }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await (await загрузить())()

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toMatch(/\/auth\/login$/)
    // Формат бэкенда — только цифры (normalizePhone в src/api.js).
    expect(JSON.parse(init.body)).toEqual({ phone: '77771234567', password: 'секрет' })
  })

  // Стенд без настроенной пары — нормальное состояние, а не поломка: раньше в
  // этом месте стояли значения по умолчанию, и стенд молча ходил под общим
  // аккаунтом, о чём никто не знал.
  it('без DEMO_PHONE/DEMO_PASSWORD отвечает 503 и в бэкенд не ходит', async () => {
    delete process.env.DEMO_PHONE
    delete process.env.DEMO_PASSWORD
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const res = await (await загрузить())()

    expect(res.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('отказ бэкенда не пересказывается анониму', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ message: 'Пользователь заблокирован' }), { status: 401 })))

    const res = await (await загрузить())()

    expect(res.status).toBe(502)
    expect(JSON.stringify(await res.json())).not.toContain('заблокирован')
  })

  it('второй запрос отвечает из кэша, а не новым входом', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ accessToken: ЖИВОЙ }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const POST = await загрузить()
    await POST()
    await POST()

    // Аккаунт один на всех гостей — держать бэкенд под нагрузкой ради одной и
    // той же сессии незачем.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('токен без разбираемого exp не кэшируется: иначе однажды раздали бы протухший', async () => {
    const безExp = `${Buffer.from('{}').toString('base64url')}.${Buffer.from('{}').toString('base64url')}.s`
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ accessToken: безExp }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const POST = await загрузить()
    await POST()
    await POST()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('ответ нельзя раздать из промежуточного кэша', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ accessToken: ЖИВОЙ }), { status: 200 })))

    const res = await (await загрузить())()

    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })
})
