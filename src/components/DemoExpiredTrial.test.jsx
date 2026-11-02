// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import { SUPPORT_WHATSAPP_URL } from '../lib/support.js'
import { rememberDemoDeadline } from '../lib/demoAccess.js'
import { getTrialRequestState, requestTrialLesson } from '../api.js'
import DemoSubscriptionModal from './DemoSubscriptionModal.jsx'
import DemoBanner from './DemoBanner.jsx'
import DemoOfferCard from './DemoOfferCard.jsx'

// Срок демо вышел — плашки демо зовут на бесплатный пробный урок, а не к пакетам с
// ценами (решение 02.11.2026: цены пугают того, кто ещё не видел урока, а тарифы
// преподаватель предложит после урока). Сами тарифы остаются доступны: в окне к ним
// ведёт тихая ссылка. Заявку заводит /mobile/trial-request: бэкенд сам ставит сделке
// в amoCRM тег «Заявка на пробный урок».

vi.mock('../api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getTrialRequestState: vi.fn(),
  requestTrialLesson: vi.fn(),
}))

const PAST = '2026-10-01T10:00:00'
const FREE = { requested: false, requestedAt: null, teacherAssigned: false, managerAssigned: false }
const SENT = { ...FREE, requested: true, requestedAt: '2026-11-02T10:00:00' }

const inApp = (node) => render(<I18nProvider>{node}</I18nProvider>)

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem('jts_access_token', 'TOK')
  rememberDemoDeadline(PAST)
  getTrialRequestState.mockResolvedValue(FREE)
  requestTrialLesson.mockResolvedValue(SENT)
})

afterEach(() => {
  rememberDemoDeadline(null)
  localStorage.clear()
})

describe('окно после конца демо', () => {
  it('предлагает пробный урок, а не покупку', async () => {
    inApp(<DemoSubscriptionModal onClose={() => {}} onBuy={() => {}} />)
    await waitFor(() => expect(getTrialRequestState).toHaveBeenCalledWith('TOK'))
    expect(screen.getByText('Пробный доступ закончился')).toBeTruthy()
    expect(screen.getByText(/бесплатный пробный урок/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Записаться на пробный урок' })).toBeTruthy()
    expect(screen.queryByText('Приобрести подписку')).toBeNull()
  })

  it('тарифы — тихой ссылкой, а главная кнопка остаётся записью', async () => {
    const onBuy = vi.fn()
    const { container } = inApp(<DemoSubscriptionModal onClose={() => {}} onBuy={onBuy} />)
    await waitFor(() => expect(getTrialRequestState).toHaveBeenCalled())
    expect(container.querySelector('.ds-buy').textContent).toBe('Записаться на пробный урок')
    const link = screen.getByRole('button', { name: 'Посмотреть тарифы' })
    expect(link.className).toContain('ds-link')
    fireEvent.click(link)
    expect(onBuy).toHaveBeenCalledTimes(1)
    expect(requestTrialLesson).not.toHaveBeenCalled()
  })

  it('экрану некуда вести — ссылки на тарифы нет', async () => {
    inApp(<DemoSubscriptionModal onClose={() => {}} />)
    await waitFor(() => expect(getTrialRequestState).toHaveBeenCalled())
    expect(screen.queryByText('Посмотреть тарифы')).toBeNull()
  })

  it('кнопка оставляет заявку и окно говорит, что она принята', async () => {
    const onTrialBooked = vi.fn()
    inApp(<DemoSubscriptionModal onClose={() => {}} onTrialBooked={onTrialBooked} />)
    fireEvent.click(screen.getByRole('button', { name: 'Записаться на пробный урок' }))
    await screen.findByText('Заявка принята')
    expect(requestTrialLesson).toHaveBeenCalledWith('TOK')
    expect(onTrialBooked).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Записаться на пробный урок' })).toBeNull()
    // Кто не хочет ждать звонка, напишет сам.
    expect(screen.getByText('Написать менеджеру').getAttribute('href')).toBe(SUPPORT_WHATSAPP_URL)
    // Кнопка под фокусом исчезла — фокус не должен потеряться за пределами окна.
    expect(document.activeElement.textContent).toBe('Вернуться')
  })

  // Сделка заводится только на первую заявку, поэтому второй раз звать некуда:
  // человек, уже записавшийся с «Главной», сразу видит, что заявка принята.
  it('заявка уже есть — сразу «Заявка принята», без новой', async () => {
    getTrialRequestState.mockResolvedValue(SENT)
    inApp(<DemoSubscriptionModal onClose={() => {}} />)
    await screen.findByText('Заявка принята')
    expect(requestTrialLesson).not.toHaveBeenCalled()
  })

  it('заявка не ушла — видна ошибка, и можно нажать ещё раз', async () => {
    requestTrialLesson.mockRejectedValueOnce(new Error('сеть'))
    inApp(<DemoSubscriptionModal onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Записаться на пробный урок' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Не удалось отправить заявку. Попробуйте ещё раз')
    expect(screen.getByRole('button', { name: 'Записаться на пробный урок' })).toBeTruthy()
  })

  it('пока демо идёт, окно прежнее: покупка и никаких запросов', () => {
    rememberDemoDeadline(null)
    inApp(<DemoSubscriptionModal onClose={() => {}} onBuy={() => {}} />)
    expect(screen.getByText('Приобрести подписку')).toBeTruthy()
    expect(screen.queryByText('Посмотреть тарифы')).toBeNull()
    expect(getTrialRequestState).not.toHaveBeenCalled()
  })
})

describe('плашка «Главной» после конца демо', () => {
  it('зовёт на пробный урок', async () => {
    const onOpenAccess = vi.fn()
    const onTrial = vi.fn()
    inApp(<DemoBanner expiresAt={PAST} onOpenAccess={onOpenAccess} onTrial={onTrial} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Записаться на пробный урок' }))
    expect(onTrial).toHaveBeenCalledTimes(1)
    expect(onOpenAccess).not.toHaveBeenCalled()
    expect(screen.queryByText('Открыть полный доступ')).toBeNull()
    expect(screen.getByText(/запишитесь на бесплатный пробный урок/)).toBeTruthy()
  })

  it('заявка оставлена — кнопки нет, ждём менеджера', async () => {
    const { container } = inApp(<DemoBanner expiresAt={PAST} booked onOpenAccess={() => {}} />)
    await screen.findByText(/менеджер свяжется с вами/)
    expect(container.querySelector('.dm-banner__cta')).toBeNull()
  })

  it('пока демо идёт, зовёт на полный доступ', async () => {
    const until = new Date(Date.now() + 3 * 3600_000).toISOString()
    const onOpenAccess = vi.fn()
    const onTrial = vi.fn()
    inApp(<DemoBanner expiresAt={until} booked onOpenAccess={onOpenAccess} onTrial={onTrial} />)
    fireEvent.click(screen.getByText('Открыть полный доступ'))
    expect(onOpenAccess).toHaveBeenCalledTimes(1)
    expect(onTrial).not.toHaveBeenCalled()
  })
})

describe('плашка скидки после конца демо', () => {
  it('без цен — пробный урок бесплатно', () => {
    const onUse = vi.fn()
    const onTrial = vi.fn()
    const { container } = inApp(<DemoOfferCard onUse={onUse} onTrial={onTrial} />)
    expect(container.querySelector('.dm-offer__prices')).toBeNull()
    expect(container.textContent).not.toContain('₸')
    expect(screen.getByText('Пробный урок — бесплатно')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Записаться' }))
    expect(onTrial).toHaveBeenCalledTimes(1)
    expect(onUse).not.toHaveBeenCalled()
  })

  it('пока демо идёт, скидка прежняя и ведёт на тарифы', () => {
    rememberDemoDeadline(null)
    const onUse = vi.fn()
    inApp(<DemoOfferCard onUse={onUse} onTrial={() => {}} />)
    expect(screen.getByText('900 ₸')).toBeTruthy()
    fireEvent.click(screen.getByText('Использовать скидку'))
    expect(onUse).toHaveBeenCalledTimes(1)
  })
})
