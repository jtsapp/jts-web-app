// @vitest-environment jsdom
// getIeltsMe спрашивает сайдбар на каждом экране. Пока ручки /mobile/ielts/plan/me
// нет на бэкенде (или она падает), каждый переход ученика давал бы бэкенду 404/500
// со стеком в логе — ответ сервера поэтому помнится, а сетевая осечка нет.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./lib/session.js', () => ({ reportUnauthorized: vi.fn() }))

import { getIeltsMe, invalidateIeltsCache } from './api.js'

function answerWith(status, body = {}) {
  globalThis.fetch = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => '',
  }))
}

beforeEach(() => {
  invalidateIeltsCache()
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('getIeltsMe', () => {
  it('404 от бэкенда — обычный аккаунт, и повторно не спрашивает', async () => {
    answerWith(404)
    expect((await getIeltsMe('t-404')).ieltsAccount).toBe(false)
    expect((await getIeltsMe('t-404')).ieltsAccount).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('ответ сервера с ошибкой забывается через 10 минут', async () => {
    answerWith(500)
    await getIeltsMe('t-500')
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000)
    answerWith(200, { ieltsAccount: true })
    expect((await getIeltsMe('t-500')).ieltsAccount).toBe(true)
  })

  it('сетевая осечка не залипает: следующий вызов спрашивает снова', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('network')
    })
    expect((await getIeltsMe('t-net')).ieltsAccount).toBe(false)
    answerWith(200, { ieltsAccount: true })
    expect((await getIeltsMe('t-net')).ieltsAccount).toBe(true)
  })
})
