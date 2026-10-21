// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import WeekView from './WeekView.jsx'
import MonthView from './MonthView.jsx'
import { I18nProvider } from '../../i18n.jsx'

/**
 * Клик по занятию плана: левая кнопка сразу начинает занятие, правая открывает меню
 * («Начать сейчас», «Перенести», «Выполнено», «Пропущено») левым верхним углом в точке клика,
 * а не под карточкой — так просил владелец (15.10.2026).
 */
const plan = {
  examDate: '2026-12-05',
  weeks: [{
    index: 0, monday: '2026-10-12', phase: 1,
    lessons: [{ id: 'a', date: '2026-10-15', status: 'planned', skillIds: [], actions: [], minutes: 30 }],
  }],
}
const props = { plan, next: null, todayIso: '2026-10-15' }

afterEach(cleanup)

describe.each([['WeekView', WeekView], ['MonthView', MonthView]])('%s', (_, View) => {
  it('левый клик начинает занятие без меню', () => {
    const onStart = vi.fn()
    const { container } = render(<I18nProvider><View {...props} onStart={onStart} /></I18nProvider>)
    fireEvent.click(container.querySelector('.st-lesson'))
    expect(onStart).toHaveBeenCalledWith('a')
  })

  it('меню занятия нет: правый клик ничего не открывает, статусы проставляет система (ТЗ SAT, задача 3.4)', () => {
    const onStart = vi.fn()
    const { container } = render(<I18nProvider><View {...props} onStart={onStart} /></I18nProvider>)
    fireEvent.contextMenu(container.querySelector('.st-lesson'), { clientX: 120, clientY: 80 })
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    expect(onStart).not.toHaveBeenCalled()
  })
})
