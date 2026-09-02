// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import MinutesTopUpPage from './MinutesTopUpPage.jsx'

// Заявка уезжает в amoCRM через бэкенд — в тесте сети нет. `accepted` меняем
// прямо в объекте: vi.mock поднимается наверх файла, и подменить его внутри it
// нечем.
const lead = { accepted: true, calls: [] }
vi.mock('../api.js', () => ({
  createLead: vi.fn(async (token, payload) => {
    lead.calls.push(payload)
    return { accepted: lead.accepted }
  }),
}))


function renderPage() {
  const onBack = vi.fn()
  const view = render(
    <I18nProvider>
      <MinutesTopUpPage onBack={onBack} />
    </I18nProvider>,
  )
  return { ...view, onBack }
}

const packs = (container) => [...container.querySelectorAll('.tu-pack')]
const packByName = (container, name) =>
  packs(container).find((el) => el.querySelector('.tu-pack__name')?.textContent === name)

beforeEach(() => {
  window.open = vi.fn()
  lead.accepted = true
  lead.calls.length = 0
})

describe('Докупить минуты', () => {
  it('три пакета с ценой за минуту', () => {
    const { container } = renderPage()
    const rows = packs(container).map((el) => [
      el.querySelector('.tu-pack__name').textContent,
      el.querySelector('.tu-pack__price').textContent,
      el.querySelector('.tu-pack__per').textContent,
    ])
    expect(rows).toEqual([
      ['20 минут', '5 000 ₸', '250 ₸ за минуту'],
      ['60 минут', '13 500 ₸', '225 ₸ за минуту'],
      ['120 минут', '24 000 ₸', '200 ₸ за минуту'],
    ])
  })

  // Скидка считается от цены самого маленького пакета, а не хранится числом.
  it('выгода больших пакетов показана процентом', () => {
    const { container } = renderPage()
    const badges = packs(container).map((el) => el.querySelector('.tu-pack__off')?.textContent || '')
    expect(badges).toEqual(['', '-10%', '-20%'])
  })

  it('по умолчанию выбран самый маленький пакет и он же в заказе', () => {
    const { container } = renderPage()
    expect(packByName(container, '20 минут').getAttribute('aria-checked')).toBe('true')
    expect(container.querySelector('.tu-order__row').textContent).toContain('Пакет 20 минут')
    expect(container.querySelector('.tu-order__total b').textContent).toBe('5 000 ₸')
    expect(screen.getByText('Оплатить 5 000 ₸')).toBeTruthy()
  })

  it('выбор пакета — ровно один, заказ и кнопка пересчитываются', () => {
    const { container } = renderPage()
    fireEvent.click(packByName(container, '120 минут'))
    const checked = packs(container).filter((el) => el.getAttribute('aria-checked') === 'true')
    expect(checked).toHaveLength(1)
    expect(container.querySelector('.tu-order__row').textContent).toContain('Пакет 120 минут')
    expect(container.querySelector('.tu-order__total b').textContent).toBe('24 000 ₸')
    expect(screen.getByText('Оплатить 24 000 ₸')).toBeTruthy()
  })

  it('объясняет, как работают докупленные минуты', () => {
    const { container } = renderPage()
    const rows = [...container.querySelectorAll('.tu-how__row b')].map((el) => el.textContent)
    expect(rows).toEqual(['Сначала тратится суточный лимит', 'Не сгорают'])
  })

  it('оплата открывает выбор способа и уносит заказ менеджеру', async () => {
    const { container } = renderPage()
    fireEvent.click(packByName(container, '60 минут'))
    fireEvent.click(container.querySelector('.tu-order__pay'))
    expect(screen.getByText('Способ оплаты')).toBeTruthy()
    fireEvent.click(screen.getByText('Оплатить через Kaspi.kz'))
    await waitFor(() => expect(window.open).toHaveBeenCalledTimes(1))
    const url = window.open.mock.calls[0][0]
    expect(url.startsWith('https://wa.me/')).toBe(true)
    expect(decodeURIComponent(url)).toContain('Пакет 60 минут')
    expect(decodeURIComponent(url)).toContain('13 500')
    expect(lead.calls[0].source).toBe('MINUTES')
  })

  it('«Связаться со мной» оставляет заявку без ухода из приложения', async () => {
    const { container } = renderPage()
    fireEvent.click(container.querySelector('.tu-order__pay'))
    fireEvent.click(screen.getByText('Связаться со мной'))
    await waitFor(() => expect(screen.getByText('Заявка принята')).toBeTruthy())
    expect(window.open).not.toHaveBeenCalled()
  })

  it('стрелка возвращает назад', () => {
    const { onBack } = renderPage()
    fireEvent.click(screen.getByLabelText('Назад'))
    expect(onBack).toHaveBeenCalled()
  })
})
