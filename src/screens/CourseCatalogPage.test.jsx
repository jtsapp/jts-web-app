// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({
  // Оболочка теперь рисует колокольчик уведомлений (LearningLayout →
  // NotificationBell), и он ходит в api.js — без заглушки падает весь экран.
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  // Сайдбар спрашивает демо-статус сам — пункт «Главная» и плашка скидки.
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getCourseCatalog: vi.fn(async () => ([
    {
      level: 'A0',
      label: 'A0',
      units: [
        // Бэкенд отдаёт тип именем enum'а — в верхнем регистре.
        { id: 1, name: 'Lessons 1–3', lessons: [{ id: 10, title: 'Two hellos', type: 'LESSON' }] },
      ],
    },
  ])),
}))

import CourseCatalogPage from './CourseCatalogPage.jsx'

describe('CourseCatalogPage', () => {
  it('показывает человеческое название типа урока, а не ключ словаря', async () => {
    render(
      <I18nProvider>
        <CourseCatalogPage token="TOK" userName="Тест" onNav={() => {}} onProfile={() => {}} onOpenLesson={() => {}} />
      </I18nProvider>
    )

    await waitFor(() => expect(screen.getByText('Two hellos')).toBeTruthy())
    expect(screen.getByText('Урок')).toBeTruthy()
    expect(screen.queryByText(/catalog\.type/)).toBeNull()
  })
})
