// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import MobileTabBar from './MobileTabBar.jsx'

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
})
