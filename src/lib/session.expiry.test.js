// @vitest-environment jsdom
// Сессия кончилась посреди работы: что считать концом, а что — нет.
//
// Вкладка, простоявшая ночь, — обычный случай: access живёт сутки, и дальше
// каждый запрос получает 401. Раньше никто на это не реагировал, и приложение
// «ломалось» молча. Теперь хелперы api.js сообщают о 401 сюда, а решает эта
// функция — и ошибка в ней в обе стороны дорогая: не заметить конец сессии
// значит оставить «Нет данных» без объяснения, а принять за него обычный 401 по
// правам — выбросить человека посреди заполненной формы.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reportUnauthorized, setSessionHooks, saveToken, loadToken, loadRefreshToken } from './session.js'

const ACCESS = 'access-old'
const REFRESH = 'refresh-1'

let hooks
let calls

/** Ответы на два адреса, которые ходит восстановление: проверка и обновление. */
function backend({ me = 401, refresh = null, meThrows = false } = {}) {
  calls = { me: 0, refresh: 0 }
  globalThis.fetch = vi.fn(async (url) => {
    if (String(url).includes('/api/auth/me')) {
      calls.me++
      if (meThrows) throw new Error('сеть')
      return { status: me, ok: me >= 200 && me < 300, json: async () => ({ user: { userId: 1 } }) }
    }
    if (String(url).includes('/api/auth/refresh')) {
      calls.refresh++
      const r = refresh ?? { status: 401 }
      return { status: r.status, ok: r.status === 200, json: async () => r.body ?? null }
    }
    throw new Error('неожиданный адрес ' + url)
  })
}

/** Дать фоновому разбору (verifyAndRecover) закончиться. */
const settle = () => new Promise((r) => setTimeout(r, 20))

beforeEach(() => {
  localStorage.clear()
  saveToken(ACCESS, REFRESH)
  hooks = { onRefreshed: vi.fn(), onExpired: vi.fn() }
  setSessionHooks(hooks)
})

afterEach(() => {
  setSessionHooks({})
  vi.restoreAllMocks()
})

describe('reportUnauthorized — конец сессии', () => {
  it('access и refresh отвергнуты — сессия кончилась: токены стёрты, App предупреждён', async () => {
    backend({ me: 401, refresh: { status: 401 } })

    reportUnauthorized(ACCESS)
    await settle()

    expect(hooks.onExpired).toHaveBeenCalledTimes(1)
    expect(loadToken()).toBeNull()
    expect(loadRefreshToken()).toBeNull()
  })

  it('access протух, refresh принят — тихое обновление, плашки нет', async () => {
    backend({
      me: 401,
      refresh: { status: 200, body: { accessToken: 'access-new', refreshToken: 'refresh-2' } },
    })

    reportUnauthorized(ACCESS)
    await settle()

    expect(hooks.onRefreshed).toHaveBeenCalledWith('access-new')
    expect(hooks.onExpired).not.toHaveBeenCalled()
    expect(loadToken()).toBe('access-new')
  })
})

describe('reportUnauthorized — когда сессию рвать НЕЛЬЗЯ', () => {
  // 401 у запроса с ЖИВЫМ токеном бывает и про права: ручка не для этой роли.
  // Выбросить за это на вход — потерять всё, что человек вводил.
  it('сервер принял токен — 401 был про права, сессия цела', async () => {
    backend({ me: 200 })

    reportUnauthorized(ACCESS)
    await settle()

    expect(hooks.onExpired).not.toHaveBeenCalled()
    expect(hooks.onRefreshed).not.toHaveBeenCalled()
    expect(calls.refresh).toBe(0)
    expect(loadToken()).toBe(ACCESS)
  })

  // Гостевой демо-токен — не сессия: человек не входил, и «истекла» ему не о чем.
  it('токен не из хранилища сессии (гостевой) — вообще не разбираем', async () => {
    backend({ me: 401, refresh: { status: 401 } })

    reportUnauthorized('guest-demo-token')
    await settle()

    expect(calls.me).toBe(0)
    expect(hooks.onExpired).not.toHaveBeenCalled()
    expect(loadToken()).toBe(ACCESS)
  })

  it('пустой токен — ничего не происходит', async () => {
    backend()

    reportUnauthorized(null)
    reportUnauthorized('')
    await settle()

    expect(calls.me).toBe(0)
  })

  // Принцип модуля: разлогин только при реальном отказе. Отвал сети или 503
  // бэкенда сессию не сбрасывает — иначе короткий сбой выбрасывал бы людей.
  it('сеть пропала при проверке — сессию не трогаем', async () => {
    backend({ meThrows: true })

    reportUnauthorized(ACCESS)
    await settle()

    expect(hooks.onExpired).not.toHaveBeenCalled()
    expect(loadToken()).toBe(ACCESS)
  })

  it('бэкенд недоступен при обновлении (5xx) — решать рано, токены на месте', async () => {
    backend({ me: 401, refresh: { status: 503 } })

    reportUnauthorized(ACCESS)
    await settle()

    expect(hooks.onExpired).not.toHaveBeenCalled()
    expect(loadToken()).toBe(ACCESS)
    expect(loadRefreshToken()).toBe(REFRESH)
  })
})

describe('reportUnauthorized — пачка запросов', () => {
  // Каталоги, баланс и прогресс падают одновременно, и каждый зовёт сюда. Один
  // разбор на всех: иначе десять плашек и десять обменов refresh-токена (а он
  // одноразовый — вторая попытка уже вернёт 401 и уронит живую сессию).
  it('десять 401 подряд — одна проверка и одно решение', async () => {
    backend({ me: 401, refresh: { status: 401 } })

    for (let i = 0; i < 10; i++) reportUnauthorized(ACCESS)
    await settle()

    expect(calls.me).toBe(1)
    expect(hooks.onExpired).toHaveBeenCalledTimes(1)
  })
})
