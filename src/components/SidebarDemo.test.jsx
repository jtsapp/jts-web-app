// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import Sidebar from './Sidebar.jsx'

const demo = { value: { isDemo: false, expiresAt: null } }

vi.mock('../api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getBalance: vi.fn().mockResolvedValue({ coins: 0, streak: 0, streakActiveToday: false }),
  getDemoAccess: vi.fn(async () => demo.value),
}))

function tokenFor(role = 'USER') {
  const b64 = (value) =>
    btoa(unescape(encodeURIComponent(JSON.stringify(value))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  return `${b64({ alg: 'HS256' })}.${b64({ role, userId: 1 })}.sig`
}

function renderSidebar(onNav = () => {}) {
  return render(
    <I18nProvider>
      <Sidebar userName="Сакен" userLevel="B1" token={tokenFor()} onNav={onNav} onProfile={() => {}} />
    </I18nProvider>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
  demo.value = { isDemo: false, expiresAt: null }
})

describe('Sidebar — демо-аккаунт', () => {
  it('обычному ученику «Главную» и скидку не показывает', async () => {
    const { container } = renderSidebar()
    await waitFor(() => expect(container.querySelector('.sb__balance')).toBeTruthy())
    expect(screen.queryByText('Главная')).toBeNull()
    expect(container.querySelector('.dm-offer')).toBeFalsy()
  })

  it('демо-ученику добавляет «Главную» первым пунктом', async () => {
    demo.value = { isDemo: true, expiresAt: null }
    const { container } = renderSidebar()
    await waitFor(() => expect(screen.getByText('Главная')).toBeTruthy())
    const items = [...container.querySelectorAll('.sb__item')].map((el) => el.textContent)
    expect(items[0]).toBe('Главная')
    expect(items).toContain('Обучение')
  })

  // Стрик и монеты у демо-ученика всё равно пустые — на их месте важнее скидка.
  it('вместо стрика и монет — плашка скидки, она ведёт на тарифы', async () => {
    demo.value = { isDemo: true, expiresAt: null }
    const onNav = vi.fn()
    const { container } = renderSidebar(onNav)
    await waitFor(() => expect(container.querySelector('.dm-offer')).toBeTruthy())
    expect(container.querySelector('.sb__balance')).toBeFalsy()
    expect(screen.getByText('900 ₸')).toBeTruthy()
    fireEvent.click(screen.getByText('Использовать скидку'))
    expect(onNav).toHaveBeenCalledWith('pricing')
  })
})
