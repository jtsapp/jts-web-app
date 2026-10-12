// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import GeRoutePage from './GeRoutePage.jsx'

// «Как дойти до цели» (спека 2026-10-12, секция 2): три формата, рекомендация, куда ведёт выбор, пустые состояния.

const state = { profile: null, progress: null, occ: [] }
vi.mock('../components/LearningLayout.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../api.js', () => ({
  getGeProfile: vi.fn(async () => state.profile),
  getLevelProgress: vi.fn(async () => state.progress),
  getMyLessonOccurrences: vi.fn(async () => state.occ),
  setGeRoute: vi.fn(async (_t, route) => ({ ...state.profile, route })),
}))

const base = {
  onboarded: true,
  purpose: 'work',
  targetLevel: 'B2',
  fromLevel: 'A2',
  dailyMinutes: 30,
  deadlineWindow: 'none',
  route: null,
  deadline: { state: 'none', date: null, daysRemaining: null, approximate: false },
  journey: { start: 'A2', current: { level: 'A2', percent: 0 }, target: 'B2', reached: false },
}
const renderPage = (props = {}) =>
  render(
    <I18nProvider>
      <GeRoutePage token="tok" {...props} />
    </I18nProvider>,
  )

beforeEach(() => {
  state.profile = { ...base }
  state.progress = { track: 'SELF_STUDY', percent: 0 }
  state.occ = []
})

describe('GeRoutePage', () => {
  it('три формата, рекомендация по цели и разрыву, «самостоятельно» ведёт на «Главную»', async () => {
    const onChosen = vi.fn()
    const onPricing = vi.fn()
    renderPage({ onChosen, onPricing })
    await waitFor(() => expect(screen.getByText('Как дойти до B2')).toBeTruthy())
    expect(document.querySelectorAll('.ih-route__opt').length).toBe(3)
    expect(document.querySelector('.ih-route__opt.is-rec h2').textContent).toBe('В группе')
    fireEvent.click(screen.getByRole('button', { name: 'Учиться самостоятельно' }))
    await waitFor(() => expect(onChosen).toHaveBeenCalled())
    expect(onPricing).not.toHaveBeenCalled()
  })

  it('уже занимается в группе: её карточка «Ваш формат» и ведёт дальше без тарифов', async () => {
    const onChosen = vi.fn()
    state.progress = { track: 'LESSONS', percent: 0 }
    state.occ = [{ lessonType: 'GROUP', scheduledAt: '2026-10-01T10:00' }]
    renderPage({ onChosen })
    await waitFor(() => expect(screen.getByText('Ваш формат')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    await waitFor(() => expect(onChosen).toHaveBeenCalled())
  })

  it('чужой платный формат ведёт в тарифы', async () => {
    const onPricing = vi.fn()
    renderPage({ onPricing })
    await waitFor(() => expect(screen.getByText('Как дойти до B2')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать индивидуально' }))
    await waitFor(() => expect(onPricing).toHaveBeenCalled())
  })

  it('без уровня — тест', async () => {
    const onTest = vi.fn()
    state.profile = { ...base, journey: { ...base.journey, current: { level: null, percent: null } } }
    renderPage({ onTest })
    await waitFor(() => expect(screen.getByText('Сначала определим уровень')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Пройти тест' }))
    expect(onTest).toHaveBeenCalled()
  })

  it('цель достигнута — выбрать новую', async () => {
    const onEdit = vi.fn()
    state.profile = { ...base, journey: { ...base.journey, current: { level: 'B2', percent: 0 }, reached: true } }
    renderPage({ onEdit })
    await waitFor(() => expect(screen.getByText('Цель B2 уже достигнута')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать новую цель' }))
    expect(onEdit).toHaveBeenCalled()
  })
})
