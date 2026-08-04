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

  it('shows the empty state when there are no items', () => {
    const { container } = renderPanel({ items: [] })
    expect(container.querySelectorAll('.sch-row')).toHaveLength(0)
    expect(container.querySelector('.sch__status')).not.toBeNull()
  })
})
