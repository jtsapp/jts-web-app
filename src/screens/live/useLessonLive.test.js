// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

let lastClient
vi.mock('@stomp/stompjs', () => {
  class Client {
    constructor(cfg) { this.cfg = cfg; this.subs = {}; this.published = []; this.connected = false; lastClient = this }
    activate() { this.connected = true; this.cfg.onConnect && this.cfg.onConnect() }
    subscribe(dest, cb) { this.subs[dest] = cb; return { unsubscribe() {} } }
    publish(frame) { this.published.push(frame) }
    deactivate() { this.connected = false; this.deactivated = true }
  }
  return { Client }
})

import { useLessonLive } from './useLessonLive.js'

function emit(dest, payload) {
  act(() => { lastClient.subs[dest]({ body: JSON.stringify(payload) }) })
}

beforeEach(() => { lastClient = undefined })

describe('useLessonLive', () => {
  it('connects and subscribes to focus + sections-changed', async () => {
    const { result } = renderHook(() => useLessonLive(14, 'TOK', 116, {}))
    expect(lastClient.cfg.brokerURL).toMatch(/^wss?:\/\/.+\/ws$/)
    expect(lastClient.cfg.connectHeaders.Authorization).toBe('Bearer TOK')
    await waitFor(() => expect(result.current.connected).toBe(true))
    expect(Object.keys(lastClient.subs).sort()).toEqual([
      '/topic/lesson/14/focus',
      '/topic/lesson/14/sections-changed',
    ])
  })

  it('sendFocus publishes { sectionId, materialId } to /app/lesson/{id}/focus', async () => {
    const { result } = renderHook(() => useLessonLive(14, 'TOK', 116, {}))
    await waitFor(() => expect(result.current.connected).toBe(true))
    act(() => { result.current.sendFocus(7, 42) })
    const frame = lastClient.published.find((p) => p.destination === '/app/lesson/14/focus')
    expect(JSON.parse(frame.body)).toEqual({ sectionId: 7, materialId: 42 })
  })

  it('drops our own focus echo (senderUserId === selfUserId)', async () => {
    const onFocus = vi.fn()
    renderHook(() => useLessonLive(14, 'TOK', 116, { onFocus }))
    await waitFor(() => expect(lastClient.connected).toBe(true))
    emit('/topic/lesson/14/focus', { sectionId: 7, materialId: 42, senderUserId: 116 })
    expect(onFocus).not.toHaveBeenCalled()
  })

  it('delivers a remote focus and the sections-changed signal to handlers', async () => {
    const onFocus = vi.fn()
    const onSectionsChanged = vi.fn()
    renderHook(() => useLessonLive(14, 'TOK', 116, { onFocus, onSectionsChanged }))
    await waitFor(() => expect(lastClient.connected).toBe(true))
    const focus = { sectionId: 7, materialId: 42, senderUserId: 200 }
    emit('/topic/lesson/14/focus', focus)
    act(() => { lastClient.subs['/topic/lesson/14/sections-changed']({ body: '' }) })
    expect(onFocus).toHaveBeenCalledWith(focus)
    expect(onSectionsChanged).toHaveBeenCalledTimes(1)
  })

  it('drops connected on socket close, and ignores a malformed focus frame', async () => {
    const onFocus = vi.fn()
    const { result } = renderHook(() => useLessonLive(14, 'TOK', 116, { onFocus }))
    await waitFor(() => expect(result.current.connected).toBe(true))
    act(() => { lastClient.subs['/topic/lesson/14/focus']({ body: '}{bad' }) })
    expect(onFocus).not.toHaveBeenCalled()
    act(() => { lastClient.cfg.onWebSocketClose() })
    await waitFor(() => expect(result.current.connected).toBe(false))
  })
})
