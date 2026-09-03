// @vitest-environment jsdom
//
// flushModule — досыл отложенной отметки. Появился из-за демо-лимитов: право на
// новую сессию (/api/practice/entitlement) сервер считает по строкам в БД, а
// pushModule копит отметки с debounce в 600 мс. Без гарантии «отметка принята
// раньше, чем спросили право» лимит не удерживал бы ровно ту сессию, которая
// его добила, — и дефект стал бы плавающим вместо стабильного.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { pushModule, flushModule, PUSH_DELAY_MS } from './practiceSync.js'

// Управляемый fetch: тест сам решает, когда сервер ответит.
function deferredFetch() {
  const calls = []
  const fn = vi.fn((url, init) => {
    let settle
    const p = new Promise((resolve) => { settle = () => resolve({ ok: true, json: async () => ({ ok: true }) }) })
    calls.push({ url, body: JSON.parse(init.body), settle })
    return p
  })
  fn.calls = calls
  return fn
}

beforeEach(() => {
  localStorage.setItem('jts_access_token', 'TOK')
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('flushModule', () => {
  it('досылает отложенную отметку немедленно, не дожидаясь debounce', async () => {
    const fetchMock = deferredFetch()
    vi.stubGlobal('fetch', fetchMock)

    pushModule('listening', new Set(['a1_001']))
    expect(fetchMock).not.toHaveBeenCalled() // ещё в debounce

    const flushed = flushModule('listening')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.calls[0].url).toBe('/api/practice/state')
    expect(fetchMock.calls[0].body).toEqual({ module: 'listening', state: { done: ['a1_001'] } })

    fetchMock.calls[0].settle()
    await flushed
    // Таймер debounce снят — второго POST с той же отметкой не будет.
    await vi.advanceTimersByTimeAsync(PUSH_DELAY_MS * 2)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('не отпускает вызывающего, пока сервер не принял отметку', async () => {
    const fetchMock = deferredFetch()
    vi.stubGlobal('fetch', fetchMock)

    pushModule('grammar', new Set(['g1']))
    let done = false
    const flushed = flushModule('grammar').then(() => { done = true })

    await Promise.resolve()
    expect(done).toBe(false) // ответа ещё нет — ждём

    fetchMock.calls[0].settle()
    await flushed
    expect(done).toBe(true)
  })

  it('дожидается и УЖЕ улетевшего POST (debounce успел сработать сам)', async () => {
    const fetchMock = deferredFetch()
    vi.stubGlobal('fetch', fetchMock)

    pushModule('shadowing', new Set(['sg_000']))
    await vi.advanceTimersByTimeAsync(PUSH_DELAY_MS)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    let done = false
    const flushed = flushModule('shadowing').then(() => { done = true })
    await Promise.resolve()
    expect(done).toBe(false)

    fetchMock.calls[0].settle()
    await flushed
    expect(done).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1) // повторно не шлём
  })

  it('без отложенных отметок — ни одного запроса', async () => {
    const fetchMock = deferredFetch()
    vi.stubGlobal('fetch', fetchMock)

    await flushModule('situations')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('гость (без токена) на сервер не пишет и flush его не ждёт', async () => {
    localStorage.removeItem('jts_access_token')
    const fetchMock = deferredFetch()
    vi.stubGlobal('fetch', fetchMock)

    pushModule('workbooks', new Set(['a0']))
    await flushModule('workbooks')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
