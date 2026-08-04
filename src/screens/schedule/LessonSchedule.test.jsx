// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

vi.mock('../../api.js', () => ({
  getMyLessonOccurrences: vi.fn(async () => ([
    { lessonId: 1, participantId: 11, scheduledAt: '2026-08-04T20:00:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'COMPLETED', format: 'ONLINE' },
  ])),
  getLessonsSummary: vi.fn(async () => ({ conducted: 1, remaining: 0, cancelled: 0, rescheduled: 0 })),
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
  beforeEach(() => vi.clearAllMocks())

  it('renders the summary tiles and the calendar after loading', async () => {
    const { container } = renderSchedule()
    await waitFor(() => expect(container.querySelector('.cal')).not.toBeNull())
    expect(container.querySelectorAll('.sch-tile')).toHaveLength(4)
    expect(container.querySelectorAll('.cal__day')).toHaveLength(42)
  })

  it('shows the occurrence in the day panel for the day that has a lesson', async () => {
    const { container } = renderSchedule()
    await waitFor(() => expect(container.querySelector('.cal')).not.toBeNull())
    // Today defaults to the current date; select Aug 4 2026 explicitly.
    // Anchor the regex (^) so it matches day 4 only, not 14/24.
    fireEvent.click(screen.getByRole('button', { name: /^4 август/i }))
    await waitFor(() => expect(container.querySelectorAll('.cal-day .sch-row')).toHaveLength(1))
  })

  it('shows an error state when loading fails', async () => {
    const api = await import('../../api.js')
    api.getMyLessonOccurrences.mockRejectedValueOnce(new Error('boom'))
    const { container } = renderSchedule()
    await waitFor(() => expect(container.querySelector('.sch__status--error')).not.toBeNull())
  })
})
