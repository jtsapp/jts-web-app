// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

const api = vi.hoisted(() => ({ getSatErrorReview: vi.fn(), checkSatAnswer: vi.fn(), patchSatError: vi.fn() }))
vi.mock('../../api.js', () => api)
vi.mock('../../lib/session.js', () => ({ loadToken: () => 'tok' }))

import ErrorReview from './ErrorReview.jsx'

afterEach(cleanup)

const item = { id: 7, questionId: 'q7', section: 'rw', skillId: 'rw.cs.words-in-context', difficulty: 3, reason: 'knowledge', kind: 'wrong', source: 'paper', createdAt: '2026-09-26T10:00', reviewed: false }
const review = {
  item,
  question: { type: 'mcq', section: 'rw', stem: '<p>Which choice best maintains the tone?</p>', options: ['<p>a</p>', '<p>kind of a big deal</p>', '<p>a significant advance</p>', '<p>d</p>'] },
  given: 'B', answer: 'C', explanation: { ru: 'Вариант B — разговорный.' },
}

/** Разбор ошибки — панель справа («NEW 2», 17:9308). */
describe('разбор ошибки SAT', () => {
  it('ваш и верный ответ карточками, отмеченная причина, разбор; Past paper можно решить заново', async () => {
    api.getSatErrorReview.mockResolvedValueOnce(review)
    const { container } = render(<I18nProvider><ErrorReview item={item} onClose={() => {}} /></I18nProvider>)
    expect(await screen.findByText('Ваш ответ · B')).toBeTruthy()
    expect(container.querySelector('.st-elr__ans.is-bad').textContent).toContain('kind of a big deal')
    expect(container.querySelector('.st-elr__ans.is-ok').textContent).toContain('a significant advance')
    expect(screen.getByText('Причина, которую вы отметили · «Пробел в знаниях»')).toBeTruthy()
    expect(screen.getByText('Вариант B — разговорный.')).toBeTruthy()
    expect(container.textContent).not.toContain('Desmos')
    fireEvent.click(screen.getByText('Решить заново'))
    expect(screen.getByText('Проверить')).toBeTruthy()
  })
})
