// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor, within } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import ServicesPage from './ServicesPage.jsx'

// Демо-статус — в изменяемой переменной: vi.mock поднимается наверх файла, и подменить его изнутри it нечем.
const demo = { value: false }

vi.mock('../api.js', () => ({
  // С токеном оболочка будит колокольчик уведомлений — без заглушки падает весь экран.
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 1253, streak: 4, streakActiveToday: true })),
  getDemoAccess: vi.fn(async () => ({ isDemo: demo.value, expiresAt: null })),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false })),
  getSatMeCached: vi.fn(async () => null),
}))

function renderServices(props = {}) {
  const onNav = vi.fn()
  const onProfile = vi.fn()
  const view = render(
    <I18nProvider>
      <ServicesPage userName="Сакен" userLevel="B2" token="T" onNav={onNav} onProfile={onProfile} {...props} />
    </I18nProvider>,
  )
  return { ...view, onNav, onProfile }
}

beforeEach(() => {
  demo.value = false
})

describe('Сервисы', () => {
  it('профиль: имя, «Профиль», уровень; плашка ведёт в профиль', () => {
    const { container, onProfile } = renderServices()
    const hero = container.querySelector('.svc-hero')
    expect(within(hero).getByText('Сакен')).toBeTruthy()
    expect(within(hero).getByText('Профиль')).toBeTruthy()
    expect(within(hero).getByText('Уровень B2')).toBeTruthy()
    fireEvent.click(hero)
    expect(onProfile).toHaveBeenCalledTimes(1)
  })

  it('плитки — разделы меню, которые не стали вкладками', () => {
    const { container, onNav } = renderServices()
    const grid = container.querySelector('.svc-grid')
    expect([...grid.querySelectorAll('.svc-tile__name')].map((n) => n.textContent)).toEqual(['Повторение', 'Домашняя работа', 'Словарь'])
    fireEvent.click(within(grid).getByText('Словарь'))
    expect(onNav).toHaveBeenCalledWith('vocab')
  })

  it('монеты и стрик — плашками рядом с уровнем', async () => {
    const { container } = renderServices()
    await waitFor(() => expect(container.querySelectorAll('.svc-chip')).toHaveLength(3))
    expect(container.querySelector('.svc-hero').textContent).toContain('1 253')
  })

  it('у демо вместо монет — плашка скидки под плитками', async () => {
    demo.value = true
    const { container } = renderServices()
    await waitFor(() => expect(container.querySelector('.svc .dm-offer')).not.toBeNull())
    expect(container.querySelectorAll('.svc-chip')).toHaveLength(1)
  })

  it('без имени — «Профиль» один раз', () => {
    const { container } = renderServices({ userName: '' })
    const name = container.querySelector('.svc-hero__name')
    expect(name.querySelector('b').textContent).toBe('Профиль')
    expect(name.querySelector('span')).toBeNull()
  })
})
