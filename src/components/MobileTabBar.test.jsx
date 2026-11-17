// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import MobileTabBar from './MobileTabBar.jsx'

vi.mock('../matching/matchingStore.js', () => ({ useMatching: vi.fn() }))
// Вкладка «Мой учитель» и её бейдж сверяются с разделами тарифа: ответ «тариф неизвестен» — всё открыто.
vi.mock('../api.js', async (load) => ({ ...(await load()), getMySections: vi.fn(async () => ({ known: false, allowed: [] })) }))
import { useMatching } from '../matching/matchingStore.js'

beforeEach(() => {
  useMatching.mockReturnValue({ status: 'unavailable', card: null, handoffs: [] })
})

function renderBar(props = {}) {
  const onNav = vi.fn()
  const view = render(
    <I18nProvider>
      <MobileTabBar active="home" onNav={onNav} {...props} />
    </I18nProvider>,
  )
  return { ...view, onNav }
}

describe('нижняя панель', () => {
  it('пять вкладок с подписями приложения', () => {
    const { container } = renderBar()
    expect([...container.querySelectorAll('.mtab__label')].map((n) => n.textContent)).toEqual([
      'Главная', 'Практика', 'Speaking Buddy', 'Уроки', 'Сервисы',
    ])
  })

  it('раздел из «Сервисов» подсвечивает «Сервисы»', () => {
    const { container } = renderBar({ active: 'vocab' })
    const active = container.querySelector('.mtab__item.is-active')
    expect(active.getAttribute('data-tab')).toBe('services')
    expect(active.getAttribute('aria-current')).toBe('page')
  })

  it('нажатие ведёт в раздел', () => {
    const { container, onNav } = renderBar()
    fireEvent.click(container.querySelector('[data-tab="practice"]'))
    expect(onNav).toHaveBeenCalledWith('practice')
  })

  it('подбор учителя ждёт действия — точка на «Уроках», а не на «Сервисах»: «Мой учитель» — вкладка «Уроков»', async () => {
    expect(renderBar().container.querySelector('.mtab__dot')).toBeNull()
    useMatching.mockReturnValue({ status: 'ready', card: { apiVersion: 2, matchStatus: 'self', tariffConfirmed: true, requests: [] }, handoffs: [] })
    const { container } = renderBar({ token: 'T' })
    await waitFor(() => expect(container.querySelector('[data-tab="lessons"] .mtab__dot')).not.toBeNull())
    expect(container.querySelector('[data-tab="services"] .mtab__dot')).toBeNull()
  })
})
