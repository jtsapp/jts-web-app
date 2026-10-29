// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import DayPanel from './DayPanel.jsx'

const lesson = { lessonId: 7, participantId: 70, scheduledAt: '2026-10-26T10:00:00', durationMinutes: 60,
  teacherName: 'Жанар', lessonStatus: 'COMPLETED', format: 'ONLINE' }

function renderPanel(disputes) {
  return render(
    <I18nProvider>
      <DayPanel dayDate={new Date(2026, 9, 26)} items={[lesson]} onOpenLesson={() => {}} disputes={disputes} />
    </I18nProvider>
  )
}

const disputes = (over = {}) => ({ disputable: new Map(), disputed: new Map(), raise: vi.fn(() => Promise.resolve()), ...over })

describe('Оспорить пропуск (ТЗ «Кабинеты», раздел 11)', () => {
  it('кнопки нет, если отметки «не пришёл» нет или срок вышел (сервер не прислал урок)', () => {
    const { queryByRole } = renderPanel(disputes())
    expect(queryByRole('button', { name: 'Оспорить пропуск' })).toBeNull()
  })

  it('причина обязательна; отправка уходит с причиной', async () => {
    const d = disputes({ disputable: new Map([['7', '2026-10-27T11:00:00']]) })
    const { getByRole, getByLabelText } = renderPanel(d)

    fireEvent.click(getByRole('button', { name: 'Оспорить пропуск' }))
    const send = getByRole('button', { name: 'Отправить координатору' })
    fireEvent.change(getByLabelText(/Почему отметка/), { target: { value: 'был' } })
    expect(send.disabled).toBe(true)
    fireEvent.change(getByLabelText(/Почему отметка/), { target: { value: ' Я был на уроке, связь пропадала ' } })
    fireEvent.click(send)

    await waitFor(() => expect(d.raise).toHaveBeenCalledWith(7, 'Я был на уроке, связь пропадала'))
  })

  it('отказ сервера показывается его текстом', async () => {
    const err = Object.assign(new Error('x'), { serverMessage: 'Срок оспаривания — 24 часа после отметки — истёк' })
    const d = disputes({ disputable: new Map([['7', '2026-10-27T11:00:00']]), raise: vi.fn(() => Promise.reject(err)) })
    const { getByRole, getByLabelText, findByRole } = renderPanel(d)

    fireEvent.click(getByRole('button', { name: 'Оспорить пропуск' }))
    fireEvent.change(getByLabelText(/Почему отметка/), { target: { value: 'Я был на уроке' } })
    fireEvent.click(getByRole('button', { name: 'Отправить координатору' }))

    expect((await findByRole('alert')).textContent).toContain('истёк')
  })

  it('после подачи — статус заявки вместо кнопки', () => {
    const { getByText, queryByRole } = renderPanel(disputes({ disputed: new Map([['7', 'OVERTURNED']]) }))
    expect(getByText('Отметка исправлена: вы были на уроке')).toBeTruthy()
    expect(queryByRole('button', { name: 'Оспорить пропуск' })).toBeNull()
  })
})
