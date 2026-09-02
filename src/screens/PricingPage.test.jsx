// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import PricingPage from './PricingPage.jsx'

function renderPage() {
  const onBack = vi.fn()
  const view = render(
    <I18nProvider>
      <PricingPage onBack={onBack} />
    </I18nProvider>,
  )
  return { ...view, onBack }
}

/** Кнопка «+» плитки с этим заголовком. */
function addTile(container, title) {
  const tile = [...container.querySelectorAll('.pr-tile')].find(
    (el) => el.querySelector('.pr-tile__title')?.textContent === title,
  )
  expect(tile, `плитка «${title}»`).toBeTruthy()
  fireEvent.click(within(tile).getByLabelText('Добавить в заказ'))
  return tile
}

beforeEach(() => {
  window.open = vi.fn()
})

describe('Витрина тарифов', () => {
  it('показывает все три раздела и «входит в любой тариф»', () => {
    const { container } = renderPage()
    expect(screen.getByText('Self Study')).toBeTruthy()
    expect(screen.getByText('Индивидуальные уроки')).toBeTruthy()
    expect(screen.getByText('Групповые уроки')).toBeTruthy()
    // 4 пакета Self Study + 6 индивидуальных + 1 групповой
    expect(container.querySelectorAll('.pr-tile')).toHaveLength(11)
    expect(container.querySelectorAll('.pr-inc__cell')).toHaveLength(6)
  })

  it('пустая корзина: подсказка вместо строк, оплата недоступна', () => {
    const { container } = renderPage()
    expect(screen.getByText('Выберите тариф — он появится здесь')).toBeTruthy()
    expect(container.querySelector('.pr-cart__pay').disabled).toBe(true)
  })

  // Числа с макета: 12 индивидуальных по 60 минут — 84 000, групповой курс —
  // 29 990, итого 113 990.
  it('заказ из макета даёт его же итог', () => {
    const { container } = renderPage()
    addTile(container, '12 уроков')
    addTile(container, '12 уроков · 1 курс')
    expect(container.querySelectorAll('.pr-line')).toHaveLength(2)
    expect(container.querySelector('.pr-cart__count').textContent).toBe('2')
    expect(container.querySelector('.pr-cart__total b').textContent).toBe('113 990 ₸')
    expect(container.querySelector('.pr-cart__pay').disabled).toBe(false)
  })

  it('переключатель длительности меняет цены и состав пакетов', () => {
    const { container } = renderPage()
    const price = () =>
      [...container.querySelectorAll('.pr-tile')].find(
        (el) => el.querySelector('.pr-tile__title')?.textContent === '12 уроков',
      ).querySelector('.pr-tile__price').textContent
    expect(price()).toBe('84 000 ₸')
    fireEvent.click(screen.getByText('30 минут'))
    expect(price()).toBe('48 000 ₸')
  })

  it('счётчик в корзине пересчитывает итог, ноль убирает строку', () => {
    const { container } = renderPage()
    addTile(container, '8 уроков')
    const line = container.querySelector('.pr-line')
    fireEvent.click(within(line).getByLabelText('Добавить ещё один'))
    expect(container.querySelector('.pr-cart__total b').textContent).toBe('112 000 ₸')
    const plus2 = container.querySelector('.pr-line')
    fireEvent.click(within(plus2).getByLabelText('Убрать один'))
    fireEvent.click(within(container.querySelector('.pr-line')).getByLabelText('Убрать один'))
    expect(container.querySelectorAll('.pr-line')).toHaveLength(0)
    expect(container.querySelector('.pr-cart__pay').disabled).toBe(true)
  })

  it('корзину можно очистить корзиной строки', () => {
    const { container } = renderPage()
    addTile(container, '1 уровень')
    fireEvent.click(screen.getByLabelText('Убрать из заказа'))
    expect(container.querySelectorAll('.pr-line')).toHaveLength(0)
  })

  it('«Перейти к оплате» открывает выбор способа, а он уносит заказ менеджеру', () => {
    const { container } = renderPage()
    addTile(container, '12 уроков')
    fireEvent.click(container.querySelector('.pr-cart__pay'))
    expect(screen.getByText('Способ оплаты')).toBeTruthy()
    fireEvent.click(screen.getByText('Связаться с менеджером'))
    expect(window.open).toHaveBeenCalledTimes(1)
    const url = window.open.mock.calls[0][0]
    expect(url.startsWith('https://wa.me/')).toBe(true)
    // Состав заказа уезжает вместе со ссылкой — человеку не надо пересказывать.
    expect(decodeURIComponent(url)).toContain('84 000')
  })

  it('стрелка возвращает назад', () => {
    const { onBack } = renderPage()
    fireEvent.click(screen.getByLabelText('Назад'))
    expect(onBack).toHaveBeenCalled()
  })
})
