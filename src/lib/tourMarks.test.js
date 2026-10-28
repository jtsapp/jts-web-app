// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Отметки туров: сервер — правда для аккаунта, localStorage — кэш. Повторы, от которых это спасает:
// ключ под device-id до появления профиля, другой браузер, гонка входа.
let marks
let calls

function respond(body, { status = 200 } = {}) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

beforeEach(async () => {
  localStorage.clear()
  localStorage.setItem('jts_device_id', 'dev-abc')
  vi.resetModules()
  marks = await import('./tourMarks.js')
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn((url, init = {}) => {
      calls.push({ url, method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : null, auth: init.headers?.Authorization })
      if ((init.method || 'GET') === 'GET') return respond({ configured: true, tours: ['practice'] })
      return respond({ configured: true, ok: true })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function loadFor(account = 'user-7', token = 'TOK') {
  marks.syncTourMarks({ token, account })
  await vi.waitFor(() => expect(marks.tourMarksReady(marks.getTourMarks(), account)).toBe(true))
}

describe('tourMarks', () => {
  it('пока отметки аккаунта едут, решать о туре нельзя; у гостя — сразу', async () => {
    expect(marks.tourMarksReady(marks.getTourMarks(), null)).toBe(true)
    // Аккаунт уже известен по токену, а загрузка ещё не началась — тоже ждём.
    expect(marks.tourMarksReady(marks.getTourMarks(), 'user-7')).toBe(false)
    marks.syncTourMarks({ token: 'TOK', account: 'user-7' })
    expect(marks.getTourMarks().status).toBe('loading')
    expect(marks.tourMarksReady(marks.getTourMarks(), 'user-7')).toBe(false)
    await loadFor()
    expect(calls[0]).toMatchObject({ url: '/api/profile/tours', method: 'GET', auth: 'Bearer TOK' })
  })

  it('тур, пройденный на другом устройстве, считается пройденным и ложится в кэш', async () => {
    await loadFor()
    expect(marks.isTourSeen('jts_tour_practice:user-7')).toBe(true)
    expect(localStorage.getItem('jts_tour_practice:user-7')).toBe('1')
    expect(marks.isTourSeen('jts_tour_home:user-7:ge')).toBe(false)
  })

  it('отметка конца тура уходит на сервер именем без владельца', async () => {
    await loadFor()
    marks.markTourSeen('jts_tour_home:user-7:ge')
    expect(localStorage.getItem('jts_tour_home:user-7:ge')).toBe('1')
    await vi.waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true))
    expect(calls.find((c) => c.method === 'POST')).toMatchObject({ body: { tours: ['home:ge'] }, auth: 'Bearer TOK' })
  })

  // Главный повтор: новый ученик видел тур под device-id (строки профиля ещё не было), после теста
  // ключ стал user-id — и тур выходил снова. Прежняя отметка браузера засчитывается и переезжает на сервер.
  it('отметка прежней схемы под device-id засчитывается и переезжает на сервер', async () => {
    localStorage.setItem('jts_tour_home:dev-abc:ge', '1')
    await loadFor()
    expect(marks.isTourSeen('jts_tour_home:user-7:ge')).toBe(true)
    expect(localStorage.getItem('jts_tour_home:user-7:ge')).toBe('1')
    await vi.waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true))
    expect(calls.find((c) => c.method === 'POST').body).toEqual({ tours: ['home:ge'] })
  })

  it('отметка браузера под user-id без серверной дописывается на сервер один раз', async () => {
    localStorage.setItem('jts_tour_learn:user-7', '1')
    await loadFor()
    expect(marks.isTourSeen('jts_tour_learn:user-7')).toBe(true)
    expect(marks.isTourSeen('jts_tour_learn:user-7')).toBe(true)
    await vi.waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1))
  })

  it('сервер не ответил — живём отметками браузера, ничего не отправляем', async () => {
    fetch.mockImplementation((url, init = {}) => {
      calls.push({ url, method: init.method || 'GET' })
      return respond({ configured: false, tours: [] })
    })
    localStorage.setItem('jts_tour_vocab:user-7', '1')
    await loadFor()
    expect(marks.getTourMarks().status).toBe('failed')
    expect(marks.isTourSeen('jts_tour_vocab:user-7')).toBe(true)
    expect(marks.isTourSeen('jts_tour_home:user-7')).toBe(false)
    marks.markTourSeen('jts_tour_home:user-7')
    expect(localStorage.getItem('jts_tour_home:user-7')).toBe('1')
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('провал записи — следующая проверка отправляет снова', async () => {
    await loadFor()
    fetch.mockImplementation((url, init = {}) => {
      calls.push({ url, method: init.method || 'GET' })
      return respond({ error: 'down' }, { status: 500 })
    })
    marks.markTourSeen('jts_tour_home:user-7')
    await vi.waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1))
    // Даём провалу отработать, потом снова спрашиваем — запись пробуется заново.
    await new Promise((r) => setTimeout(r, 0))
    expect(marks.isTourSeen('jts_tour_home:user-7')).toBe(true)
    await vi.waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(2))
  })

  it('ключи гостя и чужого аккаунта на сервер не уходят', async () => {
    await loadFor()
    marks.markTourSeen('jts_tour_home:dev-abc')
    marks.markTourSeen('jts_tour_home:user-8')
    marks.markTourSeen('jts_tour_ielts_shadowing')
    expect(localStorage.getItem('jts_tour_ielts_shadowing')).toBe('1')
    await new Promise((r) => setTimeout(r, 0))
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('смена аккаунта перечитывает отметки, обновление токена — нет; выход сбрасывает', async () => {
    await loadFor('user-7', 'TOK')
    marks.syncTourMarks({ token: 'TOK2', account: 'user-7' })
    expect(calls.filter((c) => c.method === 'GET')).toHaveLength(1)
    marks.markTourSeen('jts_tour_home:user-7')
    await vi.waitFor(() => expect(calls.find((c) => c.method === 'POST')?.auth).toBe('Bearer TOK2'))

    marks.syncTourMarks({ token: null, account: null })
    expect(marks.getTourMarks()).toEqual({ account: null, status: 'idle' })
    // Серверные отметки прежнего аккаунта не достаются следующему.
    await loadFor('user-8', 'TOK8')
    expect(calls.filter((c) => c.method === 'GET')).toHaveLength(2)
  })

  it('ответ прежнего аккаунта, доехавший после смены, отбрасывается', async () => {
    let release
    fetch.mockImplementationOnce(() => new Promise((r) => (release = () => r(new Response(JSON.stringify({ configured: true, tours: ['home'] }), { status: 200 })))))
    marks.syncTourMarks({ token: 'TOK', account: 'user-7' })
    marks.syncTourMarks({ token: 'TOK8', account: 'user-8' })
    await vi.waitFor(() => expect(marks.getTourMarks()).toEqual({ account: 'user-8', status: 'ready' }))
    release()
    await new Promise((r) => setTimeout(r, 0))
    expect(marks.isTourSeen('jts_tour_home:user-8')).toBe(false)
  })
})
