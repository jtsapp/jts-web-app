// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import MinutesTopUpPage from './MinutesTopUpPage.jsx'

const backend = {
  offers: [],
  offersFail: false,
  leadAccepted: true,
  order: { paymentUrl: null },
  orderCalls: [],
  leadCalls: [],
}

vi.mock('../api.js', () => ({
  getOffers: vi.fn(async () => {
    if (backend.offersFail) throw new Error('offline')
    return backend.offers
  }),
  createLead: vi.fn(async (token, payload) => {
    backend.leadCalls.push(payload)
    return { accepted: backend.leadAccepted }
  }),
  createOrder: vi.fn(async (token, payload) => {
    backend.orderCalls.push(payload)
    return backend.order
  }),
}))

/** Пакеты минут из миграции V225 + чужой раздел, который сюда попасть не должен. */
const CATALOG = [
  { code: 'ind-60-12', kind: 'INDIVIDUAL', title: '12 уроков', price: 84000, currency: 'KZT', lessons: 12, durationMinutes: 60 },
  { code: 'min-20', kind: 'TUTOR_MINUTES', title: '20 минут', price: 5000, currency: 'KZT', minutes: 20 },
  { code: 'min-60', kind: 'TUTOR_MINUTES', title: '60 минут', price: 13500, currency: 'KZT', minutes: 60 },
  { code: 'min-120', kind: 'TUTOR_MINUTES', title: '120 минут', price: 24000, currency: 'KZT', minutes: 120 },
]

function renderPage() {
  const onBack = vi.fn()
  const view = render(
    <I18nProvider>
      <MinutesTopUpPage token="tok" onBack={onBack} />
    </I18nProvider>,
  )
  return { ...view, onBack }
}

async function renderLoaded() {
  const view = renderPage()
  await waitFor(() => expect(view.container.querySelector('.tu-pack')).toBeTruthy())
  return view
}

const packs = (container) => [...container.querySelectorAll('.tu-pack')]
const packByName = (container, name) =>
  packs(container).find((el) => el.querySelector('.tu-pack__name')?.textContent === name)

beforeEach(() => {
  window.open = vi.fn()
  backend.offers = CATALOG
  backend.offersFail = false
  backend.leadAccepted = true
  backend.order = { paymentUrl: null }
  backend.orderCalls.length = 0
  backend.leadCalls.length = 0
})

describe('Докупить минуты', () => {
  it('показывает только пакеты минут, с ценой за минуту', async () => {
    const { container } = await renderLoaded()
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
  it('выгода больших пакетов показана процентом', async () => {
    const { container } = await renderLoaded()
    const badges = packs(container).map((el) => el.querySelector('.tu-pack__off')?.textContent || '')
    expect(badges).toEqual(['', '-10%', '-20%'])
  })

  it('по умолчанию выбран самый маленький пакет и он же в заказе', async () => {
    const { container } = await renderLoaded()
    expect(packByName(container, '20 минут').getAttribute('aria-checked')).toBe('true')
    expect(container.querySelector('.tu-order__row').textContent).toContain('Пакет 20 минут')
    expect(screen.getByText('Оплатить 5 000 ₸')).toBeTruthy()
  })

  it('выбор пакета — ровно один, заказ и кнопка пересчитываются', async () => {
    const { container } = await renderLoaded()
    fireEvent.click(packByName(container, '120 минут'))
    const checked = packs(container).filter((el) => el.getAttribute('aria-checked') === 'true')
    expect(checked).toHaveLength(1)
    expect(container.querySelector('.tu-order__total b').textContent).toBe('24 000 ₸')
    expect(screen.getByText('Оплатить 24 000 ₸')).toBeTruthy()
  })

  it('объясняет, как работают докупленные минуты', async () => {
    const { container } = await renderLoaded()
    const rows = [...container.querySelectorAll('.tu-how__row b')].map((el) => el.textContent)
    expect(rows).toEqual(['Сначала тратится суточный лимит', 'Не сгорают'])
  })

  it('в заказ уходит код выбранного пакета, без цены', async () => {
    const { container } = await renderLoaded()
    fireEvent.click(packByName(container, '60 минут'))
    fireEvent.click(container.querySelector('.tu-order__pay'))
    fireEvent.click(screen.getByText('Оплатить через Kaspi.kz'))

    await waitFor(() => expect(backend.orderCalls).toHaveLength(1))
    expect(backend.orderCalls[0].items).toEqual([{ offerCode: 'min-60', quantity: 1 }])
    expect(JSON.stringify(backend.orderCalls[0])).not.toContain('13500')
    expect(backend.leadCalls[0].source).toBe('MINUTES')
  })

  it('ссылки на оплату нет — остаётся путь к менеджеру', async () => {
    const { container } = await renderLoaded()
    fireEvent.click(container.querySelector('.tu-order__pay'))
    fireEvent.click(screen.getByText('Оплатить через Kaspi.kz'))
    await waitFor(() => expect(window.open).toHaveBeenCalledTimes(1))
    expect(window.open.mock.calls[0][0].startsWith('https://wa.me/')).toBe(true)
  })

  it('«Связаться со мной» оставляет заявку без ухода из приложения', async () => {
    const { container } = await renderLoaded()
    fireEvent.click(container.querySelector('.tu-order__pay'))
    fireEvent.click(screen.getByText('Связаться со мной'))
    await waitFor(() => expect(screen.getByText('Заявка принята')).toBeTruthy())
    expect(window.open).not.toHaveBeenCalled()
  })

  it('каталог не загрузился — ошибка и повтор', async () => {
    backend.offersFail = true
    const { container } = renderPage()
    await waitFor(() => expect(screen.getByText('Не удалось загрузить тарифы')).toBeTruthy())
    expect(container.querySelectorAll('.tu-pack')).toHaveLength(0)

    backend.offersFail = false
    fireEvent.click(screen.getByText('Попробовать снова'))
    await waitFor(() => expect(container.querySelector('.tu-pack')).toBeTruthy())
  })

  it('стрелка возвращает назад', async () => {
    const { onBack } = await renderLoaded()
    fireEvent.click(screen.getByLabelText('Назад'))
    expect(onBack).toHaveBeenCalled()
  })
})
