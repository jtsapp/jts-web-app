// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

const api = vi.hoisted(() => ({ getSatErrorLog: vi.fn(), getSatErrorReview: vi.fn(() => new Promise(() => {})) }))
vi.mock('../../api.js', () => api)
vi.mock('../../lib/session.js', () => ({ loadToken: () => 'tok' }))

import ErrorsTab from './ErrorsTab.jsx'

afterEach(cleanup)
const show = (props = {}) => render(<I18nProvider><ErrorsTab {...props} /></I18nProvider>)

const page = {
  items: [
    { id: 1, questionId: 'q1', preview: 'Solve for x', section: 'math', domain: 'm.alg', skillId: 'm.alg.linear', difficulty: 3, reason: 'time', kind: 'wrong', source: 'practice', createdAt: '2026-11-10T10:00', reviewed: false },
    { id: 2, questionId: 'q2', preview: 'Which word', section: 'rw', domain: 'rw.cs', skillId: 'rw.cs.words-in-context', difficulty: 1, reason: null, kind: 'unanswered', source: 'simulation', createdAt: '2026-11-11T10:00', reviewed: false },
  ],
  stats: {
    total: 2, reviewed: 0, unanswered: 1, byReason: { time: 1 }, bySection: { math: 1, rw: 1 },
    topSkills: [{ skillId: 'm.alg.linear', n: 1 }], byDifficulty: { 3: 1, 1: 1 }, lastWeeks: [0, 0, 0, 2],
    insights: [{ key: 'unanswered', skillId: null }],
  },
}

/** «Работа над ошибками» (ТЗ SAT 21.10, задача 9). */
describe('страница ошибок SAT', () => {
  it('у нового студента — объяснение, а не пустая страница', async () => {
    api.getSatErrorLog.mockResolvedValueOnce({ items: [], stats: null })
    show()
    expect(await screen.findByText('Ошибок пока нет')).toBeTruthy()
  })

  it('выводы над цифрами, неверные и неотвеченные раздельно, фильтр по навыку из «ошибок в очереди»', async () => {
    api.getSatErrorLog.mockResolvedValueOnce(page)
    const { container } = show({ initialSkill: 'm.alg.linear' })
    expect(await screen.findByText(/Много вопросов без ответа/)).toBeTruthy()
    const rows = container.querySelectorAll('.st-el__table tr')
    expect(rows).toHaveLength(1)
    expect(rows[0].textContent).toContain('Нехватка времени')
    fireEvent.click(screen.getByText('Сбросить фильтры'))
    expect(container.querySelectorAll('.st-el__table tr')).toHaveLength(2)
    expect(container.textContent).toContain('Не ответил')
  })

  it('клик по строке открывает разбор вопроса', async () => {
    api.getSatErrorLog.mockResolvedValueOnce(page)
    const { container } = show()
    await screen.findByText('Solve for x')
    fireEvent.click(container.querySelector('.st-el__table tr'))
    expect(api.getSatErrorReview).toHaveBeenCalledWith('tok', 1)
  })
})
