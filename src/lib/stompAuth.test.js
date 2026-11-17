import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const { loadToken, reportUnauthorized } = vi.hoisted(() => ({ loadToken: vi.fn(), reportUnauthorized: vi.fn() }))
vi.mock('./session.js', () => ({ loadToken, reportUnauthorized }))

import { stompConnectHeaders, withStompAuth, STOMP_TOKEN_REJECTED } from './stompAuth.js'

describe('stompConnectHeaders', () => {
  beforeEach(() => {
    loadToken.mockReset()
  })

  it('берёт свежий токен из storage, а не протухший prop', () => {
    loadToken.mockReturnValue('FRESH')
    expect(stompConnectHeaders('STALE')).toEqual({ Authorization: 'Bearer FRESH' })
  })

  it('без storage остаётся на токене из пропа', () => {
    loadToken.mockReturnValue(null)
    expect(stompConnectHeaders('TOK')).toEqual({ Authorization: 'Bearer TOK' })
  })
})

// Бэкенд отвечает на CONNECT с негодным токеном ERROR-кадром и закрывает сокет (backend
// StompAuthChannelInterceptor, 16.11). Раньше клиент через reconnectDelay приходил с тем же
// мёртвым токеном снова — и так бесконечно: 17.11 на проде одна вкладка открывала по два сокета
// каждые 1–3 секунды, /ws за день вырос втрое. Здесь — что клиент делает после такого отказа.
describe('withStompAuth', () => {
  const rejection = { command: 'ERROR', headers: { message: STOMP_TOKEN_REJECTED } }

  /** Клиент stompjs, каким его видит beforeConnect: активен, пока его не выключили. */
  const fakeClient = () => ({ active: true, connectHeaders: {} })

  /** Сколько миллисекунд beforeConnect держит подключение (шаг — 100 мс). */
  async function pauseBeforeConnect(options, client) {
    const started = Date.now()
    let done = false
    options.beforeConnect(client).then(() => { done = true })
    await vi.advanceTimersByTimeAsync(0)
    while (!done && Date.now() - started < 10 * 60_000) await vi.advanceTimersByTimeAsync(100)
    return Date.now() - started
  }

  /** Отказ в токене: попытка подключиться, затем ERROR от бэкенда. */
  async function rejectOnce(options, client) {
    await pauseBeforeConnect(options, client)
    options.onStompError(rejection)
  }

  beforeEach(() => {
    vi.useFakeTimers()
    loadToken.mockReset()
    loadToken.mockReturnValue('OLD')
    reportUnauthorized.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('без отказа подключается сразу и со свежим токеном', async () => {
    loadToken.mockReturnValue('FRESH')
    const options = withStompAuth('PROP', {})
    const client = fakeClient()

    expect(options.connectHeaders).toEqual({ Authorization: 'Bearer FRESH' })
    expect(await pauseBeforeConnect(options, client)).toBe(0)
    expect(client.connectHeaders).toEqual({ Authorization: 'Bearer FRESH' })
  })

  it('после отказа с тем же токеном ждёт 5 с, затем вдвое дольше, но не дольше 5 минут', async () => {
    const options = withStompAuth('OLD', {})
    const client = fakeClient()
    await pauseBeforeConnect(options, client)

    const pauses = []
    for (let i = 0; i < 8; i += 1) {
      options.onStompError(rejection)
      pauses.push(await pauseBeforeConnect(options, client))
    }

    expect(pauses).toEqual([5_000, 10_000, 20_000, 40_000, 80_000, 160_000, 300_000, 300_000])
  })

  it('отказ передаётся сессии: она обновит токен или закончит вход', async () => {
    const options = withStompAuth('OLD', {})
    await rejectOnce(options, fakeClient())

    expect(reportUnauthorized).toHaveBeenCalledWith('OLD')
  })

  it('новый токен в хранилище прерывает паузу, и подключение идёт уже с ним', async () => {
    const options = withStompAuth('OLD', {})
    const client = fakeClient()
    await rejectOnce(options, client)
    setTimeout(() => loadToken.mockReturnValue('NEW'), 2_500)

    const pause = await pauseBeforeConnect(options, client)

    expect(pause).toBeLessThanOrEqual(3_000)
    expect(client.connectHeaders).toEqual({ Authorization: 'Bearer NEW' })
  })

  it('удачное подключение сбрасывает паузу', async () => {
    const options = withStompAuth('OLD', {})
    const client = fakeClient()
    await rejectOnce(options, client)
    options.onStompError(rejection)

    options.onConnect({ command: 'CONNECTED' })

    expect(await pauseBeforeConnect(options, client)).toBe(0)
    options.onStompError(rejection)
    expect(await pauseBeforeConnect(options, client)).toBe(5_000)
  })

  it('прочие ошибки STOMP паузу не включают и о сессии не сообщают', async () => {
    const options = withStompAuth('OLD', {})
    const client = fakeClient()
    await pauseBeforeConnect(options, client)

    options.onStompError({ command: 'ERROR', headers: { message: 'Session closed.' } })

    expect(await pauseBeforeConnect(options, client)).toBe(0)
    expect(reportUnauthorized).not.toHaveBeenCalled()
  })

  it('выключенный клиент (страница закрыта) не досиживает паузу', async () => {
    const options = withStompAuth('OLD', {})
    const client = fakeClient()
    await rejectOnce(options, client)
    setTimeout(() => { client.active = false }, 1_500)

    expect(await pauseBeforeConnect(options, client)).toBeLessThanOrEqual(2_000)
  })

  it('свои настройки и обработчики вызывающего сохраняет', async () => {
    const own = { beforeConnect: vi.fn(), onConnect: vi.fn(), onStompError: vi.fn() }
    const options = withStompAuth('OLD', { brokerURL: 'wss://example.test/ws', reconnectDelay: 3000, ...own })
    const client = fakeClient()
    const connected = { command: 'CONNECTED' }

    await pauseBeforeConnect(options, client)
    options.onConnect(connected)
    options.onStompError(rejection)

    expect(options.brokerURL).toBe('wss://example.test/ws')
    expect(options.reconnectDelay).toBe(3000)
    expect(own.beforeConnect).toHaveBeenCalledWith(client)
    expect(own.onConnect).toHaveBeenCalledWith(connected)
    expect(own.onStompError).toHaveBeenCalledWith(rejection)
  })
})

// Клиент, собранный мимо withStompAuth, снова будет стучаться с мёртвым токеном каждые
// reconnectDelay. Проверка читает исходники: предмет — сама сборка клиента в каждом файле.
describe('сокеты приложения', () => {
  const src = join(dirname(fileURLToPath(import.meta.url)), '..')

  function sources(dir = src, acc = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) sources(path, acc)
      else if (/\.jsx?$/.test(entry.name) && !entry.name.includes('.test.')) acc.push(path)
    }
    return acc
  }

  it('каждый STOMP-клиент собирается через withStompAuth', () => {
    const withClient = sources().filter((path) => /new Client\(/.test(readFileSync(path, 'utf8')))
    const bare = withClient.filter((path) => {
      const code = readFileSync(path, 'utf8')
      return code.match(/new Client\(/g).length !== (code.match(/new Client\(withStompAuth\(/g) || []).length
    })

    expect(withClient.length).toBeGreaterThanOrEqual(5)
    expect(bare.map((path) => relative(src, path))).toEqual([])
  })
})
