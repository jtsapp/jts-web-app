// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import PricingPage from './PricingPage.jsx'

// Каталог приезжает с бэкенда — в тесте сети нет. Ответы держим в объекте:
// vi.mock поднимается наверх файла, и подменить их внутри it нечем.
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

/** Ровно тот каталог, что засеян миграцией V225. */
const CATALOG = [
  { code: 'self-1', kind: 'SELF_STUDY', title: '1 уровень', price: 35000, currency: 'KZT', levels: 1, tutorMinutes: 500 },
  { code: 'self-2', kind: 'SELF_STUDY', title: '2 уровня', price: 60000, currency: 'KZT', levels: 2, tutorMinutes: 1000 },
  { code: 'ind-60-8', kind: 'INDIVIDUAL', title: '8 уроков', price: 56000, currency: 'KZT', lessons: 8, durationMinutes: 60 },
  { code: 'ind-60-12', kind: 'INDIVIDUAL', title: '12 уроков', price: 84000, currency: 'KZT', lessons: 12, durationMinutes: 60 },
  { code: 'ind-30-12', kind: 'INDIVIDUAL', title: '12 уроков', price: 48000, currency: 'KZT', lessons: 12, durationMinutes: 30 },
  { code: 'group-12', kind: 'GROUP', title: '12 уроков · 1 курс', price: 29990, currency: 'KZT', lessons: 12 },
]

function renderPage() {
  const onBack = vi.fn()
  const view = render(
    <I18nProvider>
      <PricingPage token="tok" onBack={onBack} />
    </I18nProvider>,
  )
  return { ...view, onBack }
}

/**
 * Дожидается каталога. Ждём именно корзину, а не первую плитку: длительность
 * урока выбирается эффектом уже после прихода каталога, и плитки индивидуальных
 * появляются вторым проходом.
 */
async function renderLoaded() {
  const view = renderPage()
  await waitFor(() => expect(view.container.querySelector('.pr-cart__pay')).toBeTruthy())
  return view
}

function tile(container, title) {
  return [...container.querySelectorAll('.pr-tile')].find(
    (el) => el.querySelector('.pr-tile__title')?.textContent === title,
  )
}

async function addTile(container, title) {
  let el
  await waitFor(() => {
    el = tile(container, title)
    expect(el, `плитка «${title}»`).toBeTruthy()
  })
  fireEvent.click(within(el).getByLabelText('Добавить в заказ'))
  return el
}

beforeEach(() => {
  window.open = vi.fn()
  backend.offers = CATALOG
  backend.offersFail = false
  backend.leadAccepted = true
  backend.order = { paymentUrl: null }
  backend.orderCalls.length = 0
  backend.leadCalls.length = 0
})

describe('Витрина тарифов', () => {
  it('рисует разделы по тому, что прислал сервер', async () => {
    const { container } = await renderLoaded()
    expect(screen.getByText('Self Study')).toBeTruthy()
    expect(screen.getByText('Индивидуальные уроки')).toBeTruthy()
    expect(screen.getByText('Групповые уроки')).toBeTruthy()
    // 2 Self Study + 2 индивидуальных по 60 минут + 1 групповой
    await waitFor(() => expect(container.querySelectorAll('.pr-tile')).toHaveLength(5))
  })

  // Раздела, которого нет в каталоге, не должно быть и на экране.
  it('пустой раздел не рисуется', async () => {
    backend.offers = CATALOG.filter((o) => o.kind !== 'GROUP')
    await renderLoaded()
    expect(screen.queryByText('Групповые уроки')).toBeNull()
  })

  it('цены и подписи берутся из ответа сервера', async () => {
    const { container } = await renderLoaded()
    await waitFor(() => expect(tile(container, '12 уроков')).toBeTruthy())
    const t12 = tile(container, '12 уроков')
    expect(t12.querySelector('.pr-tile__price').textContent).toBe('84 000 ₸')
    expect(t12.querySelector('.pr-tile__note').textContent).toBe('7 000 ₸ за урок')
  })

  it('пустая корзина: подсказка вместо строк, оплата недоступна', async () => {
    const { container } = await renderLoaded()
    expect(screen.getByText('Выберите тариф — он появится здесь')).toBeTruthy()
    expect(container.querySelector('.pr-cart__pay').disabled).toBe(true)
  })

  // Числа с макета: 12 индивидуальных по 60 минут — 84 000, групповой — 29 990.
  it('заказ из макета даёт его же итог', async () => {
    const { container } = await renderLoaded()
    await addTile(container, '12 уроков')
    await addTile(container, '12 уроков · 1 курс')
    expect(container.querySelectorAll('.pr-line')).toHaveLength(2)
    expect(container.querySelector('.pr-cart__count').textContent).toBe('2')
    expect(container.querySelector('.pr-cart__total b').textContent).toBe('113 990 ₸')
    expect(container.querySelector('.pr-cart__pay').disabled).toBe(false)
  })

  it('переключатель длительности строится по каталогу и меняет цены', async () => {
    const { container } = await renderLoaded()
    await waitFor(() =>
      expect(tile(container, '12 уроков')?.querySelector('.pr-tile__price').textContent).toBe('84 000 ₸'),
    )
    fireEvent.click(screen.getByText('30 минут'))
    await waitFor(() =>
      expect(tile(container, '12 уроков').querySelector('.pr-tile__price').textContent).toBe('48 000 ₸'),
    )
  })

  it('счётчик в корзине пересчитывает итог, ноль убирает строку', async () => {
    const { container } = await renderLoaded()
    await addTile(container, '8 уроков')
    fireEvent.click(within(container.querySelector('.pr-line')).getByLabelText('Добавить ещё один'))
    expect(container.querySelector('.pr-cart__total b').textContent).toBe('112 000 ₸')
    fireEvent.click(within(container.querySelector('.pr-line')).getByLabelText('Убрать один'))
    fireEvent.click(within(container.querySelector('.pr-line')).getByLabelText('Убрать один'))
    expect(container.querySelectorAll('.pr-line')).toHaveLength(0)
  })

  it('корзину можно очистить корзиной строки', async () => {
    const { container } = await renderLoaded()
    await addTile(container, '1 уровень')
    fireEvent.click(screen.getByLabelText('Убрать из заказа'))
    expect(container.querySelectorAll('.pr-line')).toHaveLength(0)
  })

  /* ------------------------------- оплата ------------------------------- */

  // Цену клиент не отправляет вовсе — её считает сервер по кодам.
  it('в заказ уходят коды и количества, без цен', async () => {
    const { container } = await renderLoaded()
    await addTile(container, '12 уроков')
    fireEvent.click(container.querySelector('.pr-cart__pay'))
    fireEvent.click(screen.getByText('Оплатить через Kaspi.kz'))

    await waitFor(() => expect(backend.orderCalls).toHaveLength(1))
    const sent = backend.orderCalls[0]
    expect(sent.items).toEqual([{ offerCode: 'ind-60-12', quantity: 1 }])
    expect(JSON.stringify(sent)).not.toContain('84000')
    expect(sent.idempotencyKey).toBeTruthy()
  })

  it('есть ссылка на оплату — уходим платить, чат не открываем', async () => {
    backend.order = { paymentUrl: 'https://pay.example/1' }
    // jsdom не умеет навигацию — мокаем переход.
    const href = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'http://localhost/', assign: href },
    })

    const { container } = await renderLoaded()
    await addTile(container, '12 уроков')
    fireEvent.click(container.querySelector('.pr-cart__pay'))
    fireEvent.click(screen.getByText('Оплатить через Kaspi.kz'))

    await waitFor(() => expect(href).toHaveBeenCalledWith('https://pay.example/1'))
    expect(window.open).not.toHaveBeenCalled()
  })

  // Эквайринг ещё не подключён — заказ создаётся без ссылки, и человека ведём
  // к менеджеру, а не на пустую страницу оплаты.
  it('ссылки нет — остаётся прежний путь к менеджеру', async () => {
    const { container } = await renderLoaded()
    await addTile(container, '12 уроков')
    fireEvent.click(container.querySelector('.pr-cart__pay'))
    fireEvent.click(screen.getByText('Связаться с менеджером'))

    await waitFor(() => expect(window.open).toHaveBeenCalledTimes(1))
    expect(window.open.mock.calls[0][0].startsWith('https://wa.me/')).toBe(true)
    expect(backend.leadCalls[0].source).toBe('PRICING')
  })

  it('«Связаться со мной» оставляет заявку и показывает подтверждение', async () => {
    const { container } = await renderLoaded()
    await addTile(container, '12 уроков')
    fireEvent.click(container.querySelector('.pr-cart__pay'))
    fireEvent.click(screen.getByText('Связаться со мной'))

    await waitFor(() => expect(screen.getByText('Заявка принята')).toBeTruthy())
    expect(window.open).not.toHaveBeenCalled()
  })

  it('перезвонить некуда — открывается чат', async () => {
    backend.leadAccepted = false
    const { container } = await renderLoaded()
    await addTile(container, '12 уроков')
    fireEvent.click(container.querySelector('.pr-cart__pay'))
    fireEvent.click(screen.getByText('Связаться со мной'))

    await waitFor(() => expect(window.open).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Заявка принята')).toBeNull()
  })

  /* ----------------------------- каталог не пришёл ----------------------- */

  // Запасного прайса в бандле нет намеренно: показать старые цены и посчитать
  // заказ по новым хуже, чем честно сказать, что не загрузилось.
  it('каталог не загрузился — ошибка и повтор, а не старые цены', async () => {
    backend.offersFail = true
    const { container } = renderPage()

    await waitFor(() => expect(screen.getByText('Не удалось загрузить тарифы')).toBeTruthy())
    expect(container.querySelectorAll('.pr-tile')).toHaveLength(0)

    backend.offersFail = false
    fireEvent.click(screen.getByText('Попробовать снова'))
    await waitFor(() => expect(container.querySelector('.pr-tile')).toBeTruthy())
  })

  it('пустой каталог считается ошибкой, а не пустой витриной', async () => {
    backend.offers = []
    renderPage()
    await waitFor(() => expect(screen.getByText('Не удалось загрузить тарифы')).toBeTruthy())
  })

  it('стрелка возвращает назад', async () => {
    const { onBack } = await renderLoaded()
    fireEvent.click(screen.getByLabelText('Назад'))
    expect(onBack).toHaveBeenCalled()
  })
})
