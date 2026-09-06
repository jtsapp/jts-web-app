// Шов «демо-флаг из /user/me → недельные бюджеты платных вызовов».
//
// Сами потолки (writingBudget/shadowingBudget) уже проверены числами, но флаг
// им подают аргументом — а приезжает он сюда, в resolveProfileId, и дальше в
// пять мест роутов письма/перевода/шэдоуинга. Стоит потерять его здесь
// (isDemoAccount: false константой) или опечататься в роуте (resolved.isDemo),
// и демо-аккаунт получит потолки бесплатного тарифа: показ остатка и списание
// уедут СИНХРОННО, то есть в интерфейсе сигнала не будет вовсе. Ровно этот
// дефект чинил 349bdab7, и юнит-тестами он до сих пор не был закрыт.
//
// verifyToken стабим транспортом (fetch к бэкендовому /user/me) — так под
// проверкой оказывается и разбор ответа, где флаг и мог потеряться.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { resolveProfileId, fetchContentQuota, verifyTokenStatus } from './auth-server.js'

const bearer = (token) => new Request('https://app.test/api/x', { headers: { Authorization: `Bearer ${token}` } })
const anonymous = () => new Request('https://app.test/api/x')

// Бэкенд отвечает на /user/me; всё остальное — не наше дело этого модуля.
function stubBackend(user, { status = 200 } = {}) {
  const fetchMock = vi.fn(async (url) => {
    if (String(url).endsWith('/user/me')) {
      return { ok: status === 200, status, json: async () => user }
    }
    throw new Error(`unexpected fetch ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('resolveProfileId: демо-флаг', () => {
  it('демо-аккаунт узнаётся по ответу /user/me', async () => {
    stubBackend({ id: 7, name: 'Асель', isDemoAccount: true })

    const resolved = await resolveProfileId(bearer('TOK'), '')

    expect(resolved.id).toBe('user-7')
    expect(resolved.isDemoAccount).toBe(true)
  })

  it('обычный ученик — false, а не undefined', async () => {
    // Бэкенд поля может не прислать вовсе; undefined тут опасен тем, что
    // выбор потолка молча свалился бы в ветку «не демо» и в обратную сторону
    // (демо-ответ true) тоже прошёл бы незамеченным.
    stubBackend({ id: 7, name: 'Асель' })

    const resolved = await resolveProfileId(bearer('TOK'), '')

    expect(resolved.isDemoAccount).toBe(false)
  })

  it('токен, отвергнутый бэкендом, — 401, а не «не демо»', async () => {
    stubBackend(null, { status: 401 })

    const resolved = await resolveProfileId(bearer('STALE'), 'device-abc123')

    expect(resolved.error?.status).toBe(401)
    expect(resolved.id).toBeUndefined()
  })

  it('аноним демо-аккаунтом быть не может', async () => {
    const fetchMock = stubBackend({ id: 7, isDemoAccount: true })

    const resolved = await resolveProfileId(anonymous(), 'device-abc123')

    expect(resolved.id).toBe('device-abc123')
    expect(resolved.isDemoAccount).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled() // без токена бэкенд не спрашиваем
  })
})

// Квота отвечает limit: null и когда потолка правда нет, и когда её не удалось
// спросить (fail-open). Вызывающему нужно различать: по второму кэшировать
// вердикт нельзя — см. usePracticeEntitlement.check.
describe('fetchContentQuota: «потолка нет» ≠ «спросить не удалось»', () => {
  function stubQuota(impl) {
    const fetchMock = vi.fn(impl)
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('ответ бэкенда — квота известна', async () => {
    stubQuota(async () => ({ ok: true, json: async () => ({ limit: 8, source: 'DEMO', sourceName: null }) }))

    expect(await fetchContentQuota('TOK', 'PRACTICE_LISTENING')).toEqual({
      limit: 8, source: 'DEMO', sourceName: null, known: true,
    })
  })

  it('«потолка нет» от живого бэкенда — тоже известна', async () => {
    stubQuota(async () => ({ ok: true, json: async () => ({ limit: null, source: 'NONE' }) }))

    const quota = await fetchContentQuota('TOK', 'PRACTICE_LISTENING')

    expect(quota.limit).toBeNull()
    expect(quota.known).toBe(true)
  })

  it('5xx — limit тот же null, но квота НЕизвестна', async () => {
    stubQuota(async () => ({ ok: false, status: 503, json: async () => ({}) }))

    const quota = await fetchContentQuota('TOK', 'PRACTICE_LISTENING')

    expect(quota.limit).toBeNull() // fail-open: сбой не запирает ученика
    expect(quota.known).toBe(false)
  })

  it('бэкенд недоступен — квота НЕизвестна', async () => {
    stubQuota(async () => { throw new Error('ECONNREFUSED') })

    const quota = await fetchContentQuota('TOK', 'PRACTICE_LISTENING')

    expect(quota.limit).toBeNull()
    expect(quota.known).toBe(false)
  })

  it('гость — определённый ответ «квоты не касаются», а не сбой', async () => {
    const fetchMock = stubQuota(async () => { throw new Error('не должно вызываться') })

    const quota = await fetchContentQuota(null, 'PRACTICE_LISTENING')

    expect(quota.known).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

// Признак аккаунта класса едет тем же ответом /user/me, что и демо-флаг, и
// теряется так же незаметно: verifyTokenStatus собирает профиль поимённо, и
// поле, забытое в этом списке, до клиента не доедет вовсе — служебный аккаунт
// после F5 окажется в обычном кабинете вместо класса.
describe('verifyTokenStatus: признак аккаунта класса', () => {
  it('boothAccount из ответа бэкенда доезжает до клиента', async () => {
    stubBackend({ id: 501, name: 'Класс · Айгуль', boothAccount: true })

    const result = await verifyTokenStatus('TOK')

    expect(result.status).toBe('ok')
    expect(result.user.boothAccount).toBe(true)
  })

  it('обычный ученик — false, а не undefined', async () => {
    stubBackend({ id: 7, name: 'Асель' })

    const result = await verifyTokenStatus('TOK')

    expect(result.user.boothAccount).toBe(false)
  })
})
