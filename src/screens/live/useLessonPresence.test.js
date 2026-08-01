// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

let lastClient
vi.mock('@stomp/stompjs', () => {
  class Client {
    constructor(cfg) { this.cfg = cfg; this.subs = {}; this.published = []; lastClient = this }
    activate() { this.cfg.onConnect && this.cfg.onConnect() }
    subscribe(dest, cb) { this.subs[dest] = cb; return { unsubscribe() {} } }
    publish(frame) { this.published.push(frame) }
    deactivate() { this.deactivated = true }
  }
  return { Client }
})

import { useLessonPresence } from './useLessonPresence.js'

beforeEach(() => { lastClient = undefined })

describe('useLessonPresence', () => {
  it('connects with wss brokerURL + Bearer, subscribes presence, publishes join, parses roster', async () => {
    const { result } = renderHook(() => useLessonPresence(14, 'TOK'))
    expect(lastClient.cfg.brokerURL).toMatch(/^wss?:\/\/.+\/ws$/)
    expect(lastClient.cfg.connectHeaders.Authorization).toBe('Bearer TOK')
    await waitFor(() => expect(result.current.connected).toBe(true))
    expect(lastClient.published[0].destination).toBe('/app/lesson/14/presence/join')
    act(() => {
      lastClient.subs['/topic/lesson/14/presence']({ body: JSON.stringify([{ userId: 116, name: 'Сабина', role: 'STUDENT' }]) })
    })
    await waitFor(() => expect(result.current.roster).toEqual([{ userId: 116, name: 'Сабина', role: 'STUDENT' }]))
  })
})
