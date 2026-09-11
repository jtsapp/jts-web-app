// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

const catalog = { value: [] }

vi.mock('../api.js', () => ({
  // Оболочка теперь рисует колокольчик уведомлений (LearningLayout →
  // NotificationBell), и он ходит в api.js — без заглушки падает весь экран.
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  // Сайдбар спрашивает демо-статус сам — пункт «Главная» и плашка скидки.
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getCourseCatalog: vi.fn(async () => catalog.value),
}))

import CourseCatalogPage from './CourseCatalogPage.jsx'

// Форма — как у настоящей ручки: id курса, код уровня CEFR в code.
const A0 = {
  id: 1,
  code: 'A0',
  label: 'A0',
  units: [
    // Бэкенд отдаёт тип именем enum'а — в верхнем регистре.
    { id: 1, name: 'Lessons 1–3', lessons: [{ id: 10, title: 'Two hellos', type: 'LESSON' }] },
  ],
}

function draw() {
  return render(
    <I18nProvider>
      <CourseCatalogPage token="TOK" userName="Тест" onNav={() => {}} onProfile={() => {}} onOpenLesson={() => {}} />
    </I18nProvider>
  )
}

describe('CourseCatalogPage', () => {
  beforeEach(() => { catalog.value = [A0] })

  it('показывает человеческое название типа урока, а не ключ словаря', async () => {
    draw()

    await waitFor(() => expect(screen.getByText('Two hellos')).toBeTruthy())
    expect(screen.getByText('Урок')).toBeTruthy()
    expect(screen.queryByText(/catalog\.type/)).toBeNull()
  })

  it('два курса одного уровня — два отдельных раздела со своими названиями', async () => {
    // Курсов одного уровня CEFR теперь бывает несколько (общий B2 и Business
    // English). Экран обязан различать их по id и называть по названию, а не
    // по коду: иначе это два одинаковых заголовка «B2».
    catalog.value = [
      { id: 5, code: 'B2', label: 'just to study — B2 · Course', units: [{ id: 3, name: 'Unit 3', lessons: [{ id: 30, title: 'Future forms', type: 'LESSON' }] }] },
      { id: 7, code: 'B2', label: 'English for Media & Marketing · B2+/C1', separateAccess: true, units: [{ id: 4, name: 'Media', lessons: [{ id: 40, title: 'Press release', type: 'LESSON' }] }] },
    ]
    const { container } = draw()

    await waitFor(() => expect(screen.getByText('Press release')).toBeTruthy())
    expect(screen.getByText('Future forms')).toBeTruthy()
    expect([...container.querySelectorAll('.cc-level__title')].map((h) => h.textContent))
      .toEqual(['just to study — B2 · Course', 'English for Media & Marketing · B2+/C1'])
  })
})
