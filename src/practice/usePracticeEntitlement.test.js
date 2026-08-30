// @vitest-environment jsdom
//
// check() срезает поход на сервер, когда потолка нет, — и это единственное
// место, где «лимита нет» нельзя путать с «квоту спросить не удалось». Роут
// отвечает 200 с limit: null в обоих случаях (fail-open), поэтому сбой
// /mobile/content-quota в момент монтирования однажды выключал гейт раздела
// целиком: до размонтирования экрана право больше не спрашивалось ни разу.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePracticeEntitlement } from './usePracticeEntitlement.js'

// Мини-сервер: тело ответа меняется по ходу теста, запросы считаются.
function mockServer(body) {
  const server = { body, asked: 0 }
  server.fetch = vi.fn(async (url) => {
    if (String(url).startsWith('/api/practice/entitlement')) {
      server.asked += 1
      if (server.body === null) throw new Error('network down')
      return { ok: true, json: async () => server.body }
    }
    return { ok: true, json: async () => ({ ok: true }) }
  })
  return server
}

function mount(server) {
  vi.stubGlobal('fetch', server.fetch)
  return renderHook(() => usePracticeEntitlement('listening', 'TOK'))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('usePracticeEntitlement.check: «лимита нет» ≠ «спросить не удалось»', () => {
  it('«лимита нет» от живого сервера кэшируется — лишних запросов нет', async () => {
    const server = mockServer({ configured: true, allowed: true, limit: null, completed: 0, quotaKnown: true })
    const { result } = mount(server)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(server.asked).toBe(1)

    let fresh
    await act(async () => { fresh = await result.current.check() })

    expect(server.asked).toBe(1) // ученику без потолка сервер не нужен
    expect(fresh.allowed).toBe(true)
  })

  it('«квоту спросить не удалось» не кэшируется: следующий старт спрашивает снова', async () => {
    // 200, но бэкенд про квоту не ответил: limit тот же null, что и у ученика
    // без потолка, — отличается только quotaKnown.
    const server = mockServer({ configured: true, allowed: true, limit: null, completed: 8, quotaKnown: false })
    const { result } = mount(server)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.allowed).toBe(true) // fail-open: сбой не запирает
    expect(server.asked).toBe(1)

    // Квота ожила и вернула исчерпанный демо-лимит.
    server.body = { configured: true, allowed: false, limit: 8, completed: 8, quotaKnown: true }
    let fresh
    await act(async () => { fresh = await result.current.check() })

    expect(server.asked).toBe(2)
    expect(fresh.allowed).toBe(false)
    expect(result.current.allowed).toBe(false)
  })

  it('упавший запрос о праве тоже не кэшируется', async () => {
    const server = mockServer(null) // сам /api/practice/entitlement недоступен
    const { result } = mount(server)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.allowed).toBe(true)

    server.body = { configured: true, allowed: false, limit: 8, completed: 8, quotaKnown: true }
    let fresh
    await act(async () => { fresh = await result.current.check() })

    expect(server.asked).toBe(2)
    expect(fresh.allowed).toBe(false)
  })

  it('гостю право не спрашиваем вовсе', async () => {
    const server = mockServer({ configured: true, allowed: false, limit: 0, completed: 0, quotaKnown: true })
    vi.stubGlobal('fetch', server.fetch)
    const { result } = renderHook(() => usePracticeEntitlement('listening', null))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let fresh
    await act(async () => { fresh = await result.current.check() })

    expect(server.asked).toBe(0)
    expect(fresh.allowed).toBe(true)
  })
})
