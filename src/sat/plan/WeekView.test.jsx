// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import WeekView from './WeekView.jsx'
import MonthView from './MonthView.jsx'
import { I18nProvider } from '../../i18n.jsx'

/**
 * Клик по занятию группы ведёт сразу в практику по теме; меню занятия нет (ТЗ SAT, задача 3.4).
 * Фазы и счётчики — с сервера (roadmap), недели — из расписания группы.
 */
const plan = {
  examDate: '2026-12-05',
  weeks: [{
    index: 0, monday: '2026-10-12', phase: 2,
    lessons: [{ id: 'a', number: 1, date: '2026-10-15', time: '19:00', section: 'rw', topic: 'Words in Context', status: 'planned',
      skillIds: [], actions: [], minutes: 90 }],
  }],
}
const roadmap = {
  active: 2, attended: 0, lessonCount: 24,
  phases: [
    { n: 1, key: 'diagnostic', kind: 'test', status: 'done', weekFrom: null },
    { n: 2, key: 'foundations1', kind: 'lessons', status: 'active', weekFrom: 1, weekTo: 4 },
    { n: 8, key: 'exam', kind: 'exam', status: 'upcoming', weekFrom: null },
  ],
}
const props = { plan, roadmap, next: null, todayIso: '2026-10-15' }

afterEach(cleanup)

describe.each([['WeekView', WeekView], ['MonthView', MonthView]])('%s', (_, View) => {
  it('клик по занятию открывает практику по его теме без меню', () => {
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

it('неделя показывает фазы с сервера и тему занятия группы', () => {
  const { container } = render(<I18nProvider><WeekView {...props} onStart={() => {}} /></I18nProvider>)
  const text = container.textContent
  expect(text).toContain('Words in Context')
  expect(text).toContain('0 из 24')
  expect(text).not.toContain('Глубокая практика')
})
