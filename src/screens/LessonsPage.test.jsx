// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({
  // Оболочка теперь рисует колокольчик уведомлений (LearningLayout →
  // NotificationBell), и он ходит в api.js — без заглушки падает весь экран.
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getMyLessonOccurrences: vi.fn(async () => []),
  getLessonsSummary: vi.fn(async () => ({ conducted: 0, remaining: 0, cancelled: 0, rescheduled: 0 })),
  // Вкладка «Онлайн» спрашивает, есть ли у человека преподаватель: без этого
  // она не знает, рисовать расписание или карточку заявки (см. LessonSchedule).
  getTrialRequestState: vi.fn(async () => ({ requested: false, requestedAt: null, teacherAssigned: true, managerAssigned: false })),
  requestTrialLesson: vi.fn(async () => ({ requested: true, requestedAt: null, teacherAssigned: false, managerAssigned: false })),
  getLessonById: vi.fn(async () => ({})),
  getLessonSections: vi.fn(async () => []),
  // Вкладка «Самостоятельно» ходит в каталог и за прогрессом — без заглушек
  // падает весь экран, а не только она.
  getCourseCatalog: vi.fn(async () => []),
  getCatalogProgress: vi.fn(async () => ({ completedLessonIds: [] })),
  completeCatalogLesson: vi.fn(async () => ({ completedLessonIds: [] })),
  uncompleteCatalogLesson: vi.fn(async () => ({ completedLessonIds: [] })),
  getHomeworkBoard: vi.fn(async () => []),
  getHomeworkById: vi.fn(async () => ({})),
  saveHomeworkFeedback: vi.fn(async () => ({})),
  gradeHomework: vi.fn(async () => ({})),
  returnHomeworkForRevision: vi.fn(async () => ({})),
}))

import LessonsPage from './LessonsPage.jsx'

// Роль читается из полезной нагрузки JWT (см. lib/jwt.js) — подписи никто не
// проверяет, поэтому для теста достаточно собрать payload вручную.
function tokenWithRole(role) {
  const payload = Buffer.from(JSON.stringify({ role, userId: 1 })).toString('base64url')
  return `header.${payload}.signature`
}

const renderPage = (token, props = {}) => render(
  <I18nProvider>
    <LessonsPage token={token} userName="Тест" onNav={() => {}} onProfile={() => {}} onOpenLesson={() => {}} {...props} />
  </I18nProvider>
)

describe('возврат на свою вкладку', () => {
  it('initialTab открывает запрошенную вкладку', async () => {
    // Ученик уходит в материал из «Самостоятельно» — и кнопка «К урокам» должна
    // вернуть туда же, а не на расписание.
    const { container } = renderPage(tokenWithRole('STUDENT'), { initialTab: 'self' })

    await waitFor(() =>
      expect(container.querySelector('.ls-tab--active')?.textContent).toBe('Самостоятельно'),
    )
  })

  it('неизвестная вкладка откатывается к онлайн-урокам', async () => {
    // Вкладка преподавателя у ученика не существует — экран не должен остаться пустым.
    const { container } = renderPage(tokenWithRole('STUDENT'), { initialTab: 'homework' })

    await waitFor(() =>
      expect(container.querySelector('.ls-tab--active')?.textContent).toBe('Онлайн-уроки'),
    )
  })
})

describe('LessonsPage tabs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ученик видит клубы, онлайн-уроки и самостоятельное обучение', async () => {
    const { container } = renderPage(tokenWithRole('STUDENT'))
    await waitFor(() => expect(container.querySelectorAll('.ls-tab').length).toBeGreaterThan(0))
    expect([...container.querySelectorAll('.ls-tab')].map((b) => b.textContent))
      .toEqual(['Спикинг-клабы', 'Онлайн-уроки', 'Самостоятельно'])
  })

  // Проверка домашних работ — инструмент преподавателя, ученику её показывать
  // нельзя: бэкенд всё равно отдаст ему только свои работы.
  it('преподаватель дополнительно видит вкладку проверки домашних работ', async () => {
    const { container } = renderPage(tokenWithRole('TEACHER'))
    await waitFor(() => expect(container.querySelectorAll('.ls-tab')).toHaveLength(4))
    expect(screen.getByRole('button', { name: 'Домашние задания' })).toBeTruthy()
  })

  it('вкладка открывает список работ учеников', async () => {
    const { container } = renderPage(tokenWithRole('TEACHER'))
    fireEvent.click(await screen.findByRole('button', { name: 'Домашние задания' }))
    await waitFor(() => expect(container.querySelector('.hw__section-title')).not.toBeNull())
    expect(screen.getByText('Проверка домашних работ')).toBeTruthy()
  })
})
