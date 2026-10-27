// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getSatMeCached: vi.fn(async () => null),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false })),
  listNotifications: vi.fn(),
  markNotificationRead: vi.fn(async () => ({})),
  markAllNotificationsRead: vi.fn(async () => ({})),
  getNotificationChannels: vi.fn(),
  saveNotificationChannels: vi.fn(),
}))

import * as api from '../api.js'
import NotificationsPage from './NotificationsPage.jsx'

const list = () => [
  { id: 1, title: 'Менеджер подтвердил запись', message: 'Elementary 212: запись подтверждена.', deepLink: '/group-choice', isRead: false, channels: 'EMAIL,PUSH', createdAt: '2026-10-29T10:00:00' },
  { id: 2, title: 'Абонемент оплачен', message: 'Спасибо!', deepLink: '/group-choice', isRead: true, channels: 'PUSH', createdAt: '2026-10-28T10:00:00' },
  { id: 3, title: 'Новое задание', message: 'Проверьте домашнюю работу', deepLink: 'homework', isRead: false, channels: '', createdAt: '2026-10-27T10:00:00' },
]

function draw(onNav = () => {}) {
  return render(
    <I18nProvider>
      <NotificationsPage token="TOK" userName="Аружан" userLevel="A2" onNav={onNav} onProfile={() => {}} />
    </I18nProvider>
  )
}

describe('Уведомления ученика', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listNotifications.mockResolvedValue(list())
    api.getNotificationChannels.mockResolvedValue({ email: true, push: false })
  })

  it('у каждого уведомления стоят ровно те каналы, по которым оно ушло, а без каналов — «Только кабинет»', async () => {
    draw()

    const first = await screen.findByTestId('n-1')
    expect(first.textContent).toContain('Email')
    expect(first.textContent).toContain('Push')
    expect(screen.getByTestId('n-2').textContent).toContain('Push')
    expect(screen.getByTestId('n-2').textContent).not.toContain('Email')
    expect(screen.getByTestId('n-3').textContent).toContain('Только кабинет')
  })

  it('непрочитанные помечены «Новое», в заголовке — их число', async () => {
    draw()

    await screen.findByTestId('n-1')
    expect(screen.getByTestId('n-1').textContent).toContain('Новое')
    expect(screen.getByTestId('n-2').textContent).not.toContain('Новое')
    expect(screen.getByTestId('feed').textContent).toContain('Уведомления (2)')
  })

  it('открытие уведомления отмечает его прочитанным и ведёт в раздел', async () => {
    const onNav = vi.fn()
    draw(onNav)

    fireEvent.click(await screen.findByTestId('n-1'))

    await waitFor(() => expect(onNav).toHaveBeenCalledWith('group', null))
    expect(api.markNotificationRead).toHaveBeenCalledWith('TOK', 1)
  })

  it('«Отметить все прочитанными» снимает отметки', async () => {
    draw()
    await screen.findByTestId('n-1')

    fireEvent.click(screen.getByRole('button', { name: 'Отметить все прочитанными' }))

    await waitFor(() => expect(screen.getByTestId('n-1').textContent).not.toContain('Новое'))
    expect(api.markAllNotificationsRead).toHaveBeenCalledWith('TOK')
  })

  it('переключатель канала сохраняется сразу и показывает ответ сервера', async () => {
    api.saveNotificationChannels.mockResolvedValue({ email: true, push: true })
    draw()
    const push = await screen.findByRole('switch', { name: 'Push' })
    expect(push.checked).toBe(false)

    fireEvent.click(push)

    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push' }).checked).toBe(true))
    expect(api.saveNotificationChannels).toHaveBeenCalledWith('TOK', { email: true, push: true })
  })

  it('не получилось сохранить канал — переключатель возвращается назад и показана ошибка', async () => {
    api.saveNotificationChannels.mockRejectedValue(Object.assign(new Error('x'), { serverMessage: 'Сервер недоступен' }))
    draw()
    const email = await screen.findByRole('switch', { name: 'Email' })

    fireEvent.click(email)

    expect(await screen.findByText('Сервер недоступен')).toBeTruthy()
    expect(screen.getByRole('switch', { name: 'Email' }).checked).toBe(true)
  })

  it('пустая лента — понятное сообщение, а без ручки каналов блока настройки нет', async () => {
    api.listNotifications.mockResolvedValue([])
    api.getNotificationChannels.mockRejectedValue(new Error('404'))
    draw()

    expect(await screen.findByText('Уведомлений пока нет.')).toBeTruthy()
    expect(screen.queryByTestId('channels')).toBeNull()
  })
})
