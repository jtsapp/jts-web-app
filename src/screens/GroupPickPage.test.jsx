// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

const group = (over = {}) => ({
  id: 1, name: 'Elementary 212', direction: 'GENERAL', level: 'A2', language: 'RU', startDate: '2026-11-05', daysToStart: 6,
  days: ['MONDAY', 'WEDNESDAY', 'FRIDAY'], startTime: '19:00:00', durationMinutes: 60, teacherId: null, teacherName: null,
  members: 3, maxSeats: 6, waiting: 0, status: 'RECRUITING', recruitmentEnd: '2026-11-01T10:00:00', ...over,
})
const enrollment = (over = {}) => ({
  group: group(), paymentStatus: 'BOOKING', confirmed: false, bookedUntil: '2026-10-28T14:30:00', paymentDeadline: null, source: 'ONBOARDING',
  payRequested: false, ...over,
})

vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getSatMeCached: vi.fn(async () => null),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false })),
  getGroupState: vi.fn(),
  suggestGroups: vi.fn(),
  enrollInGroup: vi.fn(),
  payForGroup: vi.fn(),
  startGroupTrial: vi.fn(),
  cancelGroupEnrollment: vi.fn(),
  joinGroupWaitlist: vi.fn(),
  leaveGroupWaitlist: vi.fn(),
  askGroupManager: vi.fn(),
}))

import * as api from '../api.js'
import GroupPickPage from './GroupPickPage.jsx'

function draw() {
  return render(
    <I18nProvider>
      <GroupPickPage token="TOK" userName="Аружан" userLevel="A2" onNav={() => {}} onProfile={() => {}} />
    </I18nProvider>
  )
}

const pickWishes = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Пн' }))
  fireEvent.click(screen.getByRole('button', { name: 'Вечер после 17:00' }))
}

describe('Выбрать группу', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getGroupState.mockResolvedValue({ enrollment: null, waiting: [] })
  })

  it('без ручки на стенде — «скоро появится», а не ошибка', async () => {
    api.getGroupState.mockResolvedValue(null)
    draw()

    expect(await screen.findByTestId('group-unavailable')).toBeTruthy()
  })

  it('уровень подставлен из теста, а «Подобрать» ждёт день и время суток', async () => {
    draw()

    const form = await screen.findByTestId('wishes-form')
    expect(form.querySelectorAll('select')[1].value).toBe('A2')
    const submit = screen.getByRole('button', { name: 'Подобрать группы' })
    expect(submit.disabled).toBe(true)

    pickWishes()
    expect(submit.disabled).toBe(false)
  })

  it('подбор отправляет пожелания и показывает группы: лучшая выделена, полная — с листом ожидания', async () => {
    api.suggestGroups.mockResolvedValue([
      { group: group({ id: 1, name: 'Elementary 212' }), match: 100, full: false, freeSeats: 3, conflict: null },
      { group: group({ id: 2, name: 'Elementary 213', members: 6, status: 'FULL' }), match: 80, full: true, freeSeats: 0, conflict: null },
    ])
    draw()
    await screen.findByTestId('wishes-form')

    pickWishes()
    fireEvent.click(screen.getByRole('button', { name: 'Подобрать группы' }))

    expect(await screen.findByTestId('group-1')).toBeTruthy()
    expect(api.suggestGroups).toHaveBeenCalledWith('TOK', { direction: 'GENERAL', level: 'A2', language: 'RU', days: ['MONDAY'], dayparts: ['EVENING'] })
    expect(screen.getByTestId('group-1').textContent).toContain('Лучшее совпадение')
    expect(screen.getByTestId('group-1').textContent).toContain('Совпадение 100%')
    expect(screen.getByTestId('group-1').textContent).toContain('Пн · Ср · Пт 19:00 · 60 мин')
    expect(screen.getByTestId('group-2').textContent).toContain('Мест нет')
    expect(screen.getByTestId('group-2').textContent).toContain('Встать в лист ожидания')
    expect(screen.getByTestId('group-2').textContent).not.toContain('Лучшее совпадение')
  })

  it('«Записаться» бронирует место и показывает карточку записи с четырьмя шагами', async () => {
    api.suggestGroups.mockResolvedValue([{ group: group(), match: 100, full: false, freeSeats: 3, conflict: null }])
    api.enrollInGroup.mockResolvedValue({ enrollment: enrollment(), waiting: [] })
    draw()
    await screen.findByTestId('wishes-form')
    pickWishes()
    fireEvent.click(screen.getByRole('button', { name: 'Подобрать группы' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Записаться' }))

    const card = await screen.findByTestId('enrollment-card')
    expect(api.enrollInGroup).toHaveBeenCalledWith('TOK', 1)
    expect(card.querySelectorAll('.gp-step').length).toBe(4)
    expect(card.textContent).toContain('Бронь 24 ч, не оплачено')
    expect(card.textContent).toContain('14:30')
    expect(card.textContent).toContain('Преподавателя назначим до старта')
  })

  it('«Оплатить» не делает оплату сама: статус остаётся, ученик видит, что менеджер пришлёт ссылку', async () => {
    api.getGroupState.mockResolvedValue({ enrollment: enrollment(), waiting: [] })
    api.payForGroup.mockResolvedValue({ enrollment: enrollment({ payRequested: true }), waiting: [] })
    draw()

    fireEvent.click(await screen.findByRole('button', { name: 'Оплатить абонемент' }))

    await waitFor(() => expect(screen.getByText('Ждём оплату: менеджер пришлёт ссылку.')).toBeTruthy())
    expect(screen.getByTestId('enrollment-card').textContent).toContain('Бронь 24 ч, не оплачено')
    expect(screen.getByRole('button', { name: 'Оплатить абонемент' }).disabled).toBe(true)
  })

  it('оплаченное место (по абонементу или отметке менеджера) показывается оплаченным, кнопок оплаты нет', async () => {
    api.getGroupState.mockResolvedValue({ enrollment: enrollment({ paymentStatus: 'PAID', confirmed: true, bookedUntil: null }), waiting: [] })
    draw()

    const card = await screen.findByTestId('enrollment-card')
    expect(card.textContent).toContain('Абонемент оплачен. Спасибо!')
    expect(screen.queryByRole('button', { name: 'Оплатить абонемент' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Сначала пробный урок' })).toBeNull()
  })

  it('пробный урок записывается одним нажатием', async () => {
    api.getGroupState.mockResolvedValue({ enrollment: enrollment(), waiting: [] })
    api.startGroupTrial.mockResolvedValue({ enrollment: enrollment({ paymentStatus: 'TRIAL', bookedUntil: null, paymentDeadline: '2026-11-09' }), waiting: [] })
    draw()

    fireEvent.click(await screen.findByRole('button', { name: 'Сначала пробный урок' }))

    expect(await screen.findByText(/первое занятие бесплатно, абонемент нужно оплатить до 9 ноября/)).toBeTruthy()
    expect(api.startGroupTrial).toHaveBeenCalledWith('TOK')
  })

  it('отмена записи спрашивает подтверждение, потом освобождает место и возвращает к выбору', async () => {
    api.getGroupState.mockResolvedValue({ enrollment: enrollment(), waiting: [] })
    api.cancelGroupEnrollment.mockResolvedValue({ enrollment: null, waiting: [] })
    draw()

    fireEvent.click(await screen.findByRole('button', { name: 'Отменить запись' }))
    expect(api.cancelGroupEnrollment).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Да, отменить' }))

    expect(await screen.findByTestId('wishes-form')).toBeTruthy()
    expect(api.cancelGroupEnrollment).toHaveBeenCalledWith('TOK')
  })

  it('«Оставить» в вопросе об отмене ничего не отправляет', async () => {
    api.getGroupState.mockResolvedValue({ enrollment: enrollment(), waiting: [] })
    draw()

    fireEvent.click(await screen.findByRole('button', { name: 'Отменить запись' }))
    fireEvent.click(screen.getByRole('button', { name: 'Оставить' }))

    expect(api.cancelGroupEnrollment).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('групп нет — «Попросить менеджера» отправляет пожелания один раз', async () => {
    api.suggestGroups.mockResolvedValue([])
    api.askGroupManager.mockResolvedValue({ ok: true })
    draw()
    await screen.findByTestId('wishes-form')
    pickWishes()
    fireEvent.click(screen.getByRole('button', { name: 'Подобрать группы' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Попросить менеджера' }))

    expect(await screen.findByText(/Менеджер получил ваши пожелания/)).toBeTruthy()
    expect(api.askGroupManager).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Попросить менеджера' })).toBeNull()
  })

  it('отказ сервера показывается текстом сервера, а карточка остаётся на месте', async () => {
    api.suggestGroups.mockResolvedValue([{ group: group(), match: 100, full: false, freeSeats: 3, conflict: null }])
    api.enrollInGroup.mockRejectedValue(Object.assign(new Error('x'), { serverMessage: 'Ученик уже записан в группу набора' }))
    draw()
    await screen.findByTestId('wishes-form')
    pickWishes()
    fireEvent.click(screen.getByRole('button', { name: 'Подобрать группы' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Записаться' }))

    expect(await screen.findByText('Ученик уже записан в группу набора')).toBeTruthy()
    expect(screen.getByTestId('group-1')).toBeTruthy()
  })
})
