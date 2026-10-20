// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'

let lastClient
vi.mock('@stomp/stompjs', () => {
  class Client {
    constructor(cfg) { this.cfg = cfg; this.published = []; this.connected = false; lastClient = this }
    activate() { this.connected = true; this.cfg.beforeConnect && this.cfg.beforeConnect(); this.cfg.onConnect && this.cfg.onConnect() }
    publish(frame) { this.published.push(frame) }
    deactivate() { this.deactivated = true }
  }
  return { Client }
})

vi.mock('../lib/session.js', () => ({ loadToken: () => 'СВЕЖИЙ' }))
vi.mock('../lib/wsUrl.js', () => ({ wsBase: () => 'wss://example.test/ws' }))

import PlatformPresence from './PlatformPresence.jsx'

beforeEach(() => { lastClient = undefined })

describe('PlatformPresence', () => {
  it('шлёт пульс «на платформе» со свежим токеном, а не с пропом', () => {
    render(<PlatformPresence token="СТАРЫЙ" />)

    expect(lastClient.cfg.brokerURL).toBe('wss://example.test/ws')
    expect(lastClient.cfg.connectHeaders.Authorization).toBe('Bearer СВЕЖИЙ')
    expect(lastClient.published).toEqual([
      { destination: '/app/presence/platform', body: '{}' },
    ])
  })

  it('закрытие вкладки запрещает переподключение', () => {
    const { unmount } = render(<PlatformPresence token="СТАРЫЙ" />)

    window.dispatchEvent(new Event('pagehide'))

    expect(lastClient.reconnectDelay).toBe(0)
    expect(lastClient.deactivated).toBe(true)
    unmount()
  })
})
