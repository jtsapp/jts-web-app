// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({
  // Оболочка теперь рисует колокольчик уведомлений (LearningLayout →
  // NotificationBell), и он ходит в api.js — без заглушки падает весь экран.
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
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

import { getCourseCatalog } from '../api.js'
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

// Свёртка режимов: урок лежит в каталоге тремя записями, и клиент рисовал их
// подряд — «Two hellos» три раза, а счётчик юнита показывал 9 вместо 3.
describe('CourseCatalogPage: три режима одного урока — одна строка', () => {
  const threeModes = [
    {
      level: 'A0',
      label: 'A0',
      units: [{
        id: 1,
        name: 'Lessons 1–3',
        lessons: [
          { id: 10, code: 'L01-SELF', mode: 'SELF_STUDY', title: 'Two hellos', type: 'LESSON' },
          { id: 11, code: 'L01-1TO1', mode: 'ONE_TO_ONE', title: 'Two hellos', type: 'LESSON' },
          { id: 12, code: 'L01-GROUP', mode: 'GROUP', title: 'Two hellos', type: 'LESSON' },
        ],
      }],
    },
  ]

  it('название печатается один раз, режимы — кнопками, счётчик считает уроки', async () => {
    getCourseCatalog.mockResolvedValueOnce(threeModes)
    render(<I18nProvider><CourseCatalogPage token="jwt" /></I18nProvider>)

    await waitFor(() => expect(screen.getAllByText('Two hellos')).toHaveLength(1))
    expect(screen.getByText('Self study')).toBeTruthy()
    expect(screen.getByText('1 to 1')).toBeTruthy()
    expect(screen.getByText('Group')).toBeTruthy()
    // Счётчик юнита: три записи — это один урок.
    expect(screen.getByText('1')).toBeTruthy()
  })

  it('кнопка режима открывает именно свою запись', async () => {
    getCourseCatalog.mockResolvedValueOnce(threeModes)
    const onOpenLesson = vi.fn()
    render(<I18nProvider><CourseCatalogPage token="jwt" onOpenLesson={onOpenLesson} /></I18nProvider>)

    await waitFor(() => expect(screen.getByText('Group')).toBeTruthy())
    screen.getByText('Group').click()
    expect(onOpenLesson).toHaveBeenCalledWith(12)
  })
})
