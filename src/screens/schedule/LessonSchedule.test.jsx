// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

vi.mock('../../api.js', () => ({
  getMyLessonOccurrences: vi.fn(async () => ([
    { lessonId: 1, participantId: 11, scheduledAt: '2026-08-04T20:00:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'COMPLETED', format: 'ONLINE' },
  ])),
  getLessonsSummary: vi.fn(async () => ({ conducted: 1, remaining: 0, cancelled: 0, rescheduled: 0 })),
  getLessonById: vi.fn(async () => ({ id: 1, meetingUrl: 'https://meet.google.com/abc-defg-hij' })),
  getLessonSections: vi.fn(async () => ([{ position: 0, materials: [{ title: 'Coffee—yes. Mondays—no. · 1-на-1' }] }])),
}))

import LessonSchedule from './LessonSchedule.jsx'

function renderSchedule() {
  return render(
    <I18nProvider>
      <LessonSchedule token="TOK" onOpenLesson={() => {}} />
    </I18nProvider>
  )
}

describe('LessonSchedule container', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 7, 10, 12, 0, 0))
  })
  afterEach(() => { vi.useRealTimers() })

  it('renders the summary tiles and the calendar after loading', async () => {
    const { container } = renderSchedule()
    await waitFor(() => expect(container.querySelector('.cal')).not.toBeNull())
    expect(container.querySelectorAll('.sch-tile')).toHaveLength(4)
    expect(container.querySelectorAll('.cal__day')).toHaveLength(42)
  })

  it('day selection drives the day panel (default empty day → lesson day shows it)', async () => {
    const { container } = renderSchedule()
    await waitFor(() => expect(container.querySelector('.cal')).not.toBeNull())
    // Default selected day is "today" = Aug 10 2026, which has no lesson.
    expect(container.querySelectorAll('.cal-day .sch-row')).toHaveLength(0)
    // Clicking Aug 4 must invoke onSelectDay for the row to appear — anchor (^)
    // matches day 4 only, not 14/24.
    fireEvent.click(screen.getByRole('button', { name: /^4 август/i }))
    await waitFor(() => expect(container.querySelectorAll('.cal-day .sch-row')).toHaveLength(1))
  })

  it('shows an error state when loading fails', async () => {
    const api = await import('../../api.js')
    api.getMyLessonOccurrences.mockRejectedValueOnce(new Error('boom'))
    const { container } = renderSchedule()
    await waitFor(() => expect(container.querySelector('.sch__status--error')).not.toBeNull())
  })

  it('нет ближайших уроков — карточка сверху показывает пустое состояние', async () => {
    const { container } = renderSchedule()
    await waitFor(() => expect(container.querySelector('.cal')).not.toBeNull())
    // В моке единственный урок уже проведён — предлагать нечего.
    expect(container.querySelector('.lesson-card--empty')).not.toBeNull()
  })

  // Тот самый случай: урок начали 8-го и не закрыли, календарь открыт на 10-м.
  // Без карточки сверху ученику не попасть в класс — на своей клетке он видит
  // только «преподаватель ещё не начал урок» про другое занятие.
  it('идущий урок с другого дня всё равно даёт вход в класс', async () => {
    const api = await import('../../api.js')
    api.getMyLessonOccurrences.mockResolvedValueOnce([
      { lessonId: 49, participantId: 49, scheduledAt: '2026-08-08T23:59:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'IN_PROGRESS', format: 'ONLINE' },
    ])
    const opened = []
    render(
      <I18nProvider>
        <LessonSchedule token="TOK" onOpenLesson={(id) => opened.push(id)} />
      </I18nProvider>
    )

    const join = await screen.findByRole('button', { name: /присоединиться к уроку/i })
    fireEvent.click(join)

    expect(opened).toEqual([49])
  })

  // Ссылка на видеозвонок лежит в карточке урока, а не в списке occurrences —
  // расписание догружает её само и показывает рядом со статусом.
  it('догружает ссылку на видеозвонок для показанного урока', async () => {
    const api = await import('../../api.js')
    api.getMyLessonOccurrences.mockResolvedValueOnce([
      { lessonId: 49, participantId: 49, scheduledAt: '2026-08-10T23:00:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'SCHEDULED', format: 'ONLINE' },
    ])
    const { container } = renderSchedule()

    await waitFor(() => expect(container.querySelector('.lesson-card .meet-link')).not.toBeNull())
    expect(container.querySelector('.lesson-card .meet-link').getAttribute('href'))
      .toBe('https://meet.google.com/abc-defg-hij')
    expect(api.getLessonById).toHaveBeenCalledWith('TOK', '49')
  })

  it('тема урока из прикреплённого материала попадает в карточку', async () => {
    const api = await import('../../api.js')
    api.getMyLessonOccurrences.mockResolvedValueOnce([
      { lessonId: 49, participantId: 49, scheduledAt: '2026-08-10T23:00:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'SCHEDULED', format: 'ONLINE' },
    ])
    const { container } = renderSchedule()

    await waitFor(() =>
      expect(container.querySelector('.lesson-card__topic').textContent).toBe('Coffee—yes. Mondays—no.')
    )
  })
})

// Гость на вкладке «Онлайн-уроки» видел абсолютно пустое белое поле: расписание
// висит на аккаунте, а компонент возвращал null. Тот же класс дыры, что и
// вечная «Загрузка домашних работ…» у гостя.
describe('LessonSchedule — гость', () => {
  it('без токена объясняет, что нужен вход, а не рисует пустоту', () => {
    const { container } = render(
      <I18nProvider>
        <LessonSchedule token={null} onOpenLesson={() => {}} />
      </I18nProvider>
    )
    expect(container.textContent).toMatch(/Войдите в аккаунт/i)
  })
})
