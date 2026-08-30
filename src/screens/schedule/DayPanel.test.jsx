// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import DayPanel from './DayPanel.jsx'

function renderPanel(props) {
  return render(
    <I18nProvider>
      <DayPanel dayDate={new Date(2026, 7, 4)} items={[]} onOpenLesson={() => {}} {...props} />
    </I18nProvider>
  )
}

describe('DayPanel', () => {
  it('renders one lesson row per item', () => {
    const items = [
      { lessonId: 1, participantId: 11, scheduledAt: '2026-08-04T20:00:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'COMPLETED', format: 'ONLINE' },
      { lessonId: 2, participantId: 12, scheduledAt: '2026-08-04T21:00:00', durationMinutes: 60, teacherName: 'Demo 2', lessonStatus: 'SCHEDULED', format: 'ONLINE' },
    ]
    const { container } = renderPanel({ items })
    expect(container.querySelectorAll('.sch-row')).toHaveLength(2)
  })

  it('lets a student reopen a completed lesson in view-only', () => {
    const items = [
      { lessonId: 1, participantId: 11, scheduledAt: '2026-08-04T20:00:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'COMPLETED', format: 'ONLINE' },
    ]
    const { getByRole } = renderPanel({ items })
    expect(getByRole('button', { name: 'Смотреть' })).toBeTruthy()
  })

  // Карточка дня в макете разводит групповое и индивидуальное занятие цветом и
  // словом. Тип не приходит со списком occurrences — его приносит догрузка
  // урока, и панель обязана раздать его нужной строке, а не первой попавшейся.
  it('вид занятия берётся из карточки своего урока', () => {
    const items = [
      { lessonId: 1, participantId: 11, scheduledAt: '2026-08-04T20:00:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'SCHEDULED', format: 'ONLINE' },
      { lessonId: 2, participantId: 12, scheduledAt: '2026-08-04T21:00:00', durationMinutes: 60, teacherName: 'Demo 2', lessonStatus: 'SCHEDULED', format: 'ONLINE' },
    ]
    const cards = new Map([
      ['1', { meetingUrl: null, group: true }],
      ['2', { meetingUrl: null, group: false }],
    ])
    const { container } = renderPanel({ items, cards })
    const rows = container.querySelectorAll('.sch-row')
    expect(rows[0].querySelector('.sch-row__kind--group').textContent).toBe('Группа')
    expect(rows[1].querySelector('.sch-row__kind--solo').textContent).toBe('Индивидуальный')
  })

  it('тип занятия ещё не догрузился — чипа нет вовсе', () => {
    const items = [
      { lessonId: 1, participantId: 11, scheduledAt: '2026-08-04T20:00:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'SCHEDULED', format: 'ONLINE' },
    ]
    const { container } = renderPanel({ items })
    expect(container.querySelector('.sch-row__kind')).toBeNull()
  })

  it('shows the empty state when there are no items', () => {
    const { container } = renderPanel({ items: [] })
    expect(container.querySelectorAll('.sch-row')).toHaveLength(0)
    expect(container.querySelector('.sch__status')).not.toBeNull()
  })
})
