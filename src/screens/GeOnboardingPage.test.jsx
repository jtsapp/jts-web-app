// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import GeOnboardingPage from './GeOnboardingPage.jsx'
import { saveGeProfile } from '../api.js'

// Анкета General English (спека 2026-10-12, секция 1): шаги по тому, известен ли уровень, неактивные плитки цели,
// срок на шаге времени и куда вести после сохранения.

const saved = { onboarded: true, targetLevel: 'B2' }
vi.mock('../api.js', () => ({
  getGeProfile: vi.fn(async () => ({ onboarded: false })),
  getLevelProgress: vi.fn(async () => ({ percent: 0 })),
  saveGeProfile: vi.fn(async () => saved),
}))

const renderPage = (props) =>
  render(
    <I18nProvider>
      <GeOnboardingPage token="tok" {...props} />
    </I18nProvider>,
  )
const cta = () => document.querySelector('.ih-ob__cta')
const terms = () => [...document.querySelectorAll('.ih-obday__term')].map((n) => n.textContent)

beforeEach(() => vi.clearAllMocks())

describe('GeOnboardingPage', () => {
  it('уровень известен: четыре шага, неактивные плитки, срок по курсу — к маршруту', async () => {
    const onSaved = vi.fn()
    renderPage({ level: 'A2', onSaved })
    expect(screen.getByText('Шаг 1 из 4')).toBeTruthy()
    expect(cta().disabled).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: /Работа и карьера/ }))
    fireEvent.click(cta())

    expect(screen.getByRole('radio', { name: /^A2/ }).disabled).toBe(true)
    expect(screen.getByRole('radio', { name: /^A0/ }).disabled).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: /^B2/ }))
    fireEvent.click(cta())

    fireEvent.click(screen.getByRole('radio', { name: /Без срока/ }))
    fireEvent.click(cta())

    // A2→B2 = 72 урока: 15 минут в день — больше полутора лет, остальные — месяцами
    await waitFor(() => expect(terms().every((x) => x.includes('≈'))).toBe(true))
    expect(terms()).toHaveLength(4)
    expect(screen.queryByText('Срок посчитаем после теста')).toBe(null)
    fireEvent.click(cta())

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved, 'route'))
    expect(saveGeProfile).toHaveBeenCalledWith('tok', {
      purpose: 'work',
      targetLevel: 'B2',
      deadlineDate: null,
      deadlineWindow: 'none',
      dailyMinutes: 30,
      startMode: null,
    })
  })

  it('без уровня: пятый шаг, срок — после теста, «немного знаю» ведёт на тест', async () => {
    const onSaved = vi.fn()
    renderPage({ level: null, onSaved })
    fireEvent.click(screen.getByRole('radio', { name: /Для себя/ }))
    fireEvent.click(cta())
    fireEvent.click(screen.getByRole('radio', { name: /Пока не знаю/ }))
    fireEvent.click(cta())
    fireEvent.click(screen.getByRole('radio', { name: /Через 3–6 месяцев/ }))
    fireEvent.click(cta())
    expect(terms()).toEqual(Array(4).fill('Срок посчитаем после теста'))
    fireEvent.click(cta())
    expect(screen.getByText('Шаг 5 из 5')).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: /Немного знаю/ }))
    fireEvent.click(cta())
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved, 'test'))
    expect(saveGeProfile.mock.calls[0][1]).toMatchObject({ targetLevel: 'B1', deadlineWindow: '3-6m', startMode: 'some' })
  })

  it('правка — три шага, начиная с цели', () => {
    renderPage({ level: 'A2', edit: true })
    expect(screen.getByText('Шаг 1 из 3')).toBeTruthy()
    expect(screen.getByText('Какой уровень вам нужен?')).toBeTruthy()
  })
})
