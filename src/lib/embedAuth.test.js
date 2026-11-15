import { describe, it, expect, vi, afterEach } from 'vitest'
import { requestEmbedToken } from './embedAuth.js'

function fakeWindow() {
  const listeners = []
  return {
    listeners,
    addEventListener: (_, fn) => listeners.push(fn),
    removeEventListener: (_, fn) => listeners.splice(listeners.indexOf(fn), 1),
  }
}

const answer = (token) => ({ source: 'jts-lesson', type: 'practice-auth', token })

describe('requestEmbedToken', () => {
  afterEach(() => vi.useRealTimers())

  it('спрашивает токен у страницы урока и принимает ответ только от неё', async () => {
    const win = fakeWindow()
    const parent = { postMessage: vi.fn() }
    const promise = requestEmbedToken({ win, parent, apiOrigin: 'https://api.test', timeoutMs: 1000 })
    expect(parent.postMessage).toHaveBeenCalledWith({ source: 'jts-practice', type: 'auth-request' }, 'https://api.test')
    win.listeners[0]({ origin: 'https://evil.test', source: parent, data: answer('X') })
    win.listeners[0]({ origin: 'https://api.test', source: {}, data: answer('Y') })
    win.listeners[0]({ origin: 'https://api.test', source: parent, data: { source: 'jts-lesson', type: 'other', token: 'Z' } })
    win.listeners[0]({ origin: 'https://api.test', source: parent, data: answer('T') })
    await expect(promise).resolves.toBe('T')
    expect(win.listeners).toHaveLength(0)
  })

  it('молчание страницы — null, а не вечное ожидание', async () => {
    vi.useFakeTimers()
    const win = fakeWindow()
    const promise = requestEmbedToken({ win, parent: { postMessage: () => {} }, apiOrigin: 'https://api.test', timeoutMs: 500 })
    vi.advanceTimersByTime(500)
    await expect(promise).resolves.toBeNull()
    expect(win.listeners).toHaveLength(0)
  })

  it('кабинет не в рамке никого не спрашивает', async () => {
    const win = fakeWindow()
    await expect(requestEmbedToken({ win, parent: win, apiOrigin: 'https://api.test' })).resolves.toBeNull()
    expect(win.listeners).toHaveLength(0)
  })
})
