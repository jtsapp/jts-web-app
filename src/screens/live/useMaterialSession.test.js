// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

let clients
vi.mock('@stomp/stompjs', () => {
  class Client {
    constructor(cfg) { this.cfg = cfg; this.subs = {}; this.published = []; this.connected = false; clients.push(this) }
    activate() { this.connected = true; this.cfg.onConnect && this.cfg.onConnect() }
    subscribe(dest, cb) { this.subs[dest] = cb; return { unsubscribe() {} } }
    publish(frame) { this.published.push(frame) }
    deactivate() { this.connected = false; this.deactivated = true }
  }
  return { Client }
})

import { useMaterialSession } from './useMaterialSession.js'

beforeEach(() => { clients = [] })

describe('useMaterialSession', () => {
  it('subscribes to both mirror directions, their catch-up history, and answers when sessionId given', async () => {
    const { result } = renderHook(() => useMaterialSession(9, { sessionId: 3, token: 'TOK', handlers: {} }))
    const c = clients[0]
    expect(c.cfg.brokerURL).toMatch(/^wss?:\/\/.+\/ws$/)
    expect(c.cfg.connectHeaders.Authorization).toBe('Bearer TOK')
    await waitFor(() => expect(result.current.connected).toBe(true))
    expect(Object.keys(c.subs).sort()).toEqual([
      '/app/material-assignment/9/mirror-history',
      '/app/material-assignment/9/teacher-mirror-history',
      '/topic/material-assignment/9/mirror',
      '/topic/material-assignment/9/teacher-mirror',
      '/topic/material-session/3/answers',
    ])
  })

  it('omits the answers subscription without a sessionId', async () => {
    renderHook(() => useMaterialSession(9, { token: 'TOK', handlers: {} }))
    await waitFor(() => expect(clients[0].connected).toBe(true))
    expect(Object.keys(clients[0].subs)).not.toContain('/topic/material-session/3/answers')
  })

  it('replays catch-up history through onMirror, and routes live/teacher/answer events', async () => {
    const onMirror = vi.fn()
    const onTeacherMirror = vi.fn()
    const onAnswer = vi.fn()
    renderHook(() => useMaterialSession(9, { sessionId: 3, token: 'TOK', handlers: { onMirror, onTeacherMirror, onAnswer } }))
    await waitFor(() => expect(clients[0].connected).toBe(true))
    const c = clients[0]
    const ev = (s) => ({ selector: s, eventType: 'click', value: null })
    act(() => { c.subs['/app/material-assignment/9/mirror-history']({ body: JSON.stringify([ev('#a'), ev('#b')]) }) })
    expect(onMirror).toHaveBeenCalledTimes(2)
    act(() => { c.subs['/topic/material-assignment/9/mirror']({ body: JSON.stringify(ev('#c')) }) })
    expect(onMirror).toHaveBeenCalledTimes(3)
    act(() => { c.subs['/topic/material-assignment/9/teacher-mirror']({ body: JSON.stringify(ev('#d')) }) })
    expect(onTeacherMirror).toHaveBeenCalledWith(ev('#d'))
    act(() => { c.subs['/topic/material-session/3/answers']({ body: JSON.stringify({ taskId: 1, correct: true }) }) })
    expect(onAnswer).toHaveBeenCalledWith({ taskId: 1, correct: true })
  })

  it('sendMirror / sendTeacherMirror publish to the assignment destinations', async () => {
    const { result } = renderHook(() => useMaterialSession(9, { token: 'TOK', handlers: {} }))
    await waitFor(() => expect(result.current.connected).toBe(true))
    act(() => {
      result.current.sendMirror({ selector: '#x', eventType: 'input', value: 'hi' })
      result.current.sendTeacherMirror({ selector: '#y', eventType: 'click', value: null })
    })
    const byDest = Object.fromEntries(clients[0].published.map((p) => [p.destination, JSON.parse(p.body)]))
    expect(byDest['/app/material-assignment/9/mirror']).toEqual({ selector: '#x', eventType: 'input', value: 'hi' })
    expect(byDest['/app/material-assignment/9/teacher-mirror']).toEqual({ selector: '#y', eventType: 'click', value: null })
  })

  it('isolates the socket per hook instance (fixes web-admin H1 singleton bug)', async () => {
    const a = renderHook(() => useMaterialSession(11, { token: 'TOK', handlers: {} }))
    const b = renderHook(() => useMaterialSession(22, { token: 'TOK', handlers: {} }))
    await waitFor(() => expect(a.result.current.connected && b.result.current.connected).toBe(true))
    // Two live, independent clients — mounting the second never tore down the first.
    expect(clients).toHaveLength(2)
    expect(clients[0]).not.toBe(clients[1])
    expect(clients[0].deactivated).toBeUndefined()
    expect(Object.keys(clients[0].subs)).toContain('/topic/material-assignment/11/mirror')
    expect(Object.keys(clients[1].subs)).toContain('/topic/material-assignment/22/mirror')
  })

  it('drops connected on socket close, and ignores a malformed mirror frame', async () => {
    const onMirror = vi.fn()
    const { result } = renderHook(() => useMaterialSession(9, { token: 'TOK', handlers: { onMirror } }))
    await waitFor(() => expect(result.current.connected).toBe(true))
    act(() => { clients[0].subs['/topic/material-assignment/9/mirror']({ body: 'oops' }) })
    expect(onMirror).not.toHaveBeenCalled()
    act(() => { clients[0].cfg.onWebSocketClose() })
    await waitFor(() => expect(result.current.connected).toBe(false))
  })
})
