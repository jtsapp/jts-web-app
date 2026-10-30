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
    { id: 2, questionId: 'q2', preview: 'Which word', section: 'rw', domain: 'rw.cs', skillId: 'rw.cs.words-in-context', difficulty: 1, reason: null, kind: 'unanswered', source: 'paper', createdAt: '2026-11-11T10:00', reviewed: true },
  ],
  stats: {
    total: 2, reviewed: 1, unanswered: 1, byReason: { time: 1 }, bySection: { math: 1, rw: 1 },
    topSkills: [{ skillId: 'm.alg.linear', n: 1 }], byDifficulty: { 3: 1, 1: 1 }, lastWeeks: [0, 0, 0, 2],
    insights: [{ key: 'time', skillId: null }],
  },
}

/** «Работа над ошибками» («NEW 2», 17:9002 / 17:9308 / 17:9658 / 17:9900). */
describe('страница ошибок SAT', () => {
  it('у нового студента — путь ошибки в журнал и выход в практику', async () => {
    api.getSatErrorLog.mockResolvedValueOnce({ items: [], stats: null })
    const onOpenPractice = vi.fn()
    show({ onOpenPractice })
    expect(await screen.findByText('Здесь появятся ваши ошибки')).toBeTruthy()
    expect(screen.getByText('Выбрали причину')).toBeTruthy()
    fireEvent.click(screen.getByText('Перейти к практике'))
    expect(onOpenPractice).toHaveBeenCalled()
  })

  it('журнал: счётчики по всему журналу, фильтр по навыку из «ошибок в очереди», «Сбросить»', async () => {
    api.getSatErrorLog.mockResolvedValueOnce(page)
    const { container } = show({ initialSkill: 'm.alg.linear' })
    expect(await screen.findByText('Разобрано 50%')).toBeTruthy()
    const rows = () => container.querySelectorAll('.st-el__table tbody tr')
    expect(rows()).toHaveLength(1)
    expect(rows()[0].textContent).toContain('Время')
    fireEvent.click(screen.getByText('Сбросить'))
    expect(rows()).toHaveLength(2)
    expect(rows()[1].textContent).toContain('Не ответил')
    expect(rows()[1].textContent).toContain('Разобрана')
  })

  it('«Не ответил» — пункт фильтра «Причина»; Esc закрывает список', async () => {
    api.getSatErrorLog.mockResolvedValueOnce(page)
    const { container } = show()
    await screen.findByText('Solve for x')
    fireEvent.click(screen.getByRole('button', { name: /^Причина/ }))
    fireEvent.click(screen.getByRole('option', { name: 'Не ответил' }))
    expect(container.querySelectorAll('.st-el__table tbody tr')).toHaveLength(1)
    expect(screen.getByRole('button', { name: /Причина.*Не ответил/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^Источник/ }))
    expect(screen.getByRole('listbox')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('статистика: выводы и причины с процентом от всех ошибок', async () => {
    api.getSatErrorLog.mockResolvedValueOnce(page)
    show()
    await screen.findByText('Solve for x')
    fireEvent.click(screen.getByRole('tab', { name: 'Статистика' }))
    expect(screen.getByText(/из-за нехватки времени/)).toBeTruthy()
    expect(screen.getByText('50%')).toBeTruthy()
    expect(screen.getByText('Ещё 1 вопрос — без ответа')).toBeTruthy()
  })

  it('клик по строке открывает разбор справа, Esc закрывает', async () => {
    api.getSatErrorLog.mockResolvedValueOnce(page)
    const { container } = show()
    await screen.findByText('Solve for x')
    fireEvent.click(container.querySelector('.st-el__table tbody tr'))
    expect(api.getSatErrorReview).toHaveBeenCalledWith('tok', 1)
    expect(container.querySelector('.st-drawer [role="dialog"]')).not.toBeNull()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(container.querySelector('.st-drawer')).toBeNull()
  })
})
