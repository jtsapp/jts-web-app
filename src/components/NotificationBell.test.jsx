// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

let lastClient
vi.mock('@stomp/stompjs', () => {
  class Client {
    constructor(cfg) { this.cfg = cfg; this.subs = {}; lastClient = this }
    activate() { this.cfg.onConnect && this.cfg.onConnect() }
    subscribe(dest, cb) { this.subs[dest] = cb; return { unsubscribe() {} } }
    deactivate() { this.deactivated = true }
  }
  return { Client }
})

vi.mock('../api.js', () => ({
  listNotifications: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}))

vi.mock('../lib/session.js', () => ({ loadToken: () => 'TOK' }))
vi.mock('../lib/jwt.js', () => ({ userIdFromToken: () => 7 }))
vi.mock('../lib/wsUrl.js', () => ({ wsBase: () => 'wss://example.test/ws' }))

import { NotificationProvider, NotificationBell } from './NotificationBell.jsx'
import { listNotifications, getUnreadNotificationCount, markNotificationRead } from '../api.js'

beforeEach(() => {
  lastClient = undefined
  getUnreadNotificationCount.mockResolvedValue({ count: 2 })
  listNotifications.mockResolvedValue([
    {
      id: 1,
      title: 'Новое ДЗ',
      message: 'Past Simple',
      deepLink: 'homework',
      isRead: false,
      createdAt: '2026-08-24T12:00:00',
    },
  ])
  markNotificationRead.mockResolvedValue({})
})

describe('NotificationBell', () => {
  it('shows unread badge and opens homework from a list item', async () => {
    const onNavigate = vi.fn()
    render(
      <I18nProvider>
        <NotificationProvider token="TOK" onNavigate={onNavigate}>
          <NotificationBell />
        </NotificationProvider>
      </I18nProvider>,
    )

    await waitFor(() => expect(screen.getByText('2')).toBeTruthy())
    fireEvent.click(screen.getByLabelText('Уведомления'))
    await waitFor(() => expect(screen.getByText('Новое ДЗ')).toBeTruthy())
    fireEvent.click(screen.getByText('Новое ДЗ'))
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('homework', null))
    expect(markNotificationRead).toHaveBeenCalledWith('TOK', 1)
  })

  it('subscribes to the user notification topic', async () => {
    render(
      <I18nProvider>
        <NotificationProvider token="TOK" onNavigate={() => {}}>
          <NotificationBell />
        </NotificationProvider>
      </I18nProvider>,
    )
    await waitFor(() => expect(lastClient).toBeTruthy())
    expect(lastClient.cfg.brokerURL).toBe('wss://example.test/ws')
    expect(Object.keys(lastClient.subs)).toContain('/topic/notifications/7')
  })
})
