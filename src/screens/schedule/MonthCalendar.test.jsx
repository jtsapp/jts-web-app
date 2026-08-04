// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import MonthCalendar from './MonthCalendar.jsx'
import { occurrencesByDayKey } from './lessonFormat.js'

function renderCal(props) {
  return render(
    <I18nProvider>
      <MonthCalendar
        year={2026}
        month={7}
        selectedDayKey="2026-08-04"
        occByDay={new Map()}
        onSelectDay={() => {}}
        onPrevMonth={() => {}}
        onNextMonth={() => {}}
        {...props}
      />
    </I18nProvider>
  )
}

describe('MonthCalendar', () => {
  it('renders 42 day cells', () => {
    const { container } = renderCal()
    expect(container.querySelectorAll('.cal__day')).toHaveLength(42)
  })

  it('marks days that have occurrences with dots', () => {
    const occByDay = occurrencesByDayKey([
      { lessonId: 1, scheduledAt: '2026-08-04T20:00:00', lessonStatus: 'COMPLETED', durationMinutes: 60 },
    ])
    const { container } = renderCal({ occByDay })
    expect(container.querySelectorAll('.cal__dot')).toHaveLength(1)
  })

  it('fires onSelectDay with the clicked day key', () => {
    const onSelectDay = vi.fn()
    renderCal({ onSelectDay })
    // Aug 4 2026 has aria-label containing "4" and the month; find by role + name.
    const cell = screen.getByRole('button', { name: /^4 август/i })
    fireEvent.click(cell)
    expect(onSelectDay).toHaveBeenCalledWith('2026-08-04')
  })

  it('applies the selected class to the selected day', () => {
    const { container } = renderCal({ selectedDayKey: '2026-08-04' })
    const sel = container.querySelector('.cal__day--sel')
    expect(sel).not.toBeNull()
    expect(sel.textContent).toContain('4')
  })

  it('fires month navigation handlers', () => {
    const onPrevMonth = vi.fn()
    const onNextMonth = vi.fn()
    renderCal({ onPrevMonth, onNextMonth })
    fireEvent.click(screen.getByLabelText('Предыдущий месяц'))
    fireEvent.click(screen.getByLabelText('Следующий месяц'))
    expect(onPrevMonth).toHaveBeenCalledTimes(1)
    expect(onNextMonth).toHaveBeenCalledTimes(1)
  })
})
