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

import { useLessonBoard } from './useLessonBoard.js'

function emit(dest, payload) {
  act(() => { lastClient.subs[dest]({ body: JSON.stringify(payload) }) })
}

beforeEach(() => { lastClient = undefined })

describe('useLessonBoard', () => {
  it('connects with wss brokerURL + Bearer and subscribes to board, cursor, board-settings', async () => {
    const { result } = renderHook(() => useLessonBoard(14, 'TOK', 116, {}))
    expect(lastClient.cfg.brokerURL).toMatch(/^wss?:\/\/.+\/ws$/)
    expect(lastClient.cfg.connectHeaders.Authorization).toBe('Bearer TOK')
    await waitFor(() => expect(result.current.connected).toBe(true))
    expect(Object.keys(lastClient.subs).sort()).toEqual([
      '/topic/lesson/14/board',
      '/topic/lesson/14/board-settings',
      '/topic/lesson/14/cursor',
    ])
  })

  it('publishes add/update/remove/clear to the board destinations with the web-admin payload shape', async () => {
    const { result } = renderHook(() => useLessonBoard(14, 'TOK', 116, {}))
    await waitFor(() => expect(result.current.connected).toBe(true))
    act(() => {
      result.current.sendAdd('obj1', 'rect', '{"id":"obj1"}')
      result.current.sendUpdate('obj1', 'rect', '{"id":"obj1","x":2}')
      result.current.sendRemove('obj1')
      result.current.sendClear()
    })
    const byDest = Object.fromEntries(lastClient.published.map((p) => [p.destination, JSON.parse(p.body)]))
    expect(byDest['/app/lesson/14/board/add']).toEqual({ objectId: 'obj1', type: 'rect', json: '{"id":"obj1"}' })
    expect(byDest['/app/lesson/14/board/update']).toEqual({ objectId: 'obj1', type: 'rect', json: '{"id":"obj1","x":2}' })
    expect(byDest['/app/lesson/14/board/remove']).toEqual({ objectId: 'obj1' })
    expect(byDest['/app/lesson/14/board/clear']).toEqual({})
  })

  it('publishes cursor to /cursor (not /board/cursor)', async () => {
    const { result } = renderHook(() => useLessonBoard(14, 'TOK', 116, {}))
    await waitFor(() => expect(result.current.connected).toBe(true))
    act(() => { result.current.sendCursor(10, 20, 'pen') })
    const frame = lastClient.published.find((p) => p.destination === '/app/lesson/14/cursor')
    expect(JSON.parse(frame.body)).toEqual({ x: 10, y: 20, tool: 'pen' })
  })

  it('drops board and cursor echoes from self (senderUserId / userId === selfUserId)', async () => {
    const onBoardEvent = vi.fn()
    const onCursor = vi.fn()
    renderHook(() => useLessonBoard(14, 'TOK', 116, { onBoardEvent, onCursor }))
    await waitFor(() => expect(lastClient.connected).toBe(true))
    emit('/topic/lesson/14/board', { eventType: 'ADD', objectId: 'o', json: '{}', senderUserId: 116 })
    emit('/topic/lesson/14/cursor', { userId: 116, name: 'Me', x: 1, y: 2, tool: 'pen' })
    expect(onBoardEvent).not.toHaveBeenCalled()
    expect(onCursor).not.toHaveBeenCalled()
  })

  it('delivers remote board, cursor and settings events to handlers', async () => {
    const onBoardEvent = vi.fn()
    const onCursor = vi.fn()
    const onSettings = vi.fn()
    renderHook(() => useLessonBoard(14, 'TOK', 116, { onBoardEvent, onCursor, onSettings }))
    await waitFor(() => expect(lastClient.connected).toBe(true))
    const board = { eventType: 'ADD', objectId: 'o', type: 'rect', json: '{}', senderUserId: 200 }
    const cursor = { userId: 200, name: 'Ann', x: 5, y: 6, tool: 'pen' }
    const settings = { drawingDisabled: true, cursorsHidden: false }
    emit('/topic/lesson/14/board', board)
    emit('/topic/lesson/14/cursor', cursor)
    emit('/topic/lesson/14/board-settings', settings)
    expect(onBoardEvent).toHaveBeenCalledWith(board)
    expect(onCursor).toHaveBeenCalledWith(cursor)
    expect(onSettings).toHaveBeenCalledWith(settings)
  })

  it('senders are no-ops before connect (no throw, nothing published)', () => {
    const { result } = renderHook(() => useLessonBoard(0, '', 0, {}))
    expect(() => {
      result.current.sendAdd('o', 'rect', '{}')
      result.current.sendCursor(1, 2, 'pen')
    }).not.toThrow()
  })

  it('drops connected on socket close / stomp error', async () => {
    const { result } = renderHook(() => useLessonBoard(14, 'TOK', 116, {}))
    await waitFor(() => expect(result.current.connected).toBe(true))
    act(() => { lastClient.cfg.onWebSocketClose() })
    await waitFor(() => expect(result.current.connected).toBe(false))
    act(() => { lastClient.cfg.onStompError() })
    expect(result.current.connected).toBe(false)
  })

  it('ignores a malformed board frame without calling the handler', async () => {
    const onBoardEvent = vi.fn()
    renderHook(() => useLessonBoard(14, 'TOK', 116, { onBoardEvent }))
    await waitFor(() => expect(lastClient.connected).toBe(true))
    act(() => { lastClient.subs['/topic/lesson/14/board']({ body: 'not-json{' }) })
    expect(onBoardEvent).not.toHaveBeenCalled()
  })
})
