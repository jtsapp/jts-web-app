// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
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

describe('Отметка «не пришёл»: ученик не оспаривает сам, а пишет менеджеру (ТЗ «Отметка уроков», версия 2)', () => {
  it('ничего нет, если отметки «не пришёл» нет или срок вышел', () => {
    const { queryByText, queryByRole } = renderPanel(disputes())
    expect(queryByText(/Напишите менеджеру/)).toBeNull()
    expect(queryByRole('button', { name: 'Оспорить пропуск' })).toBeNull()
  })

  it('в течение 24 часов — подсказка «напишите менеджеру», кнопки «Оспорить» нет', () => {
    const d = disputes({ disputable: new Map([['7', '2026-10-27T11:00:00']]) })
    const { getByText, queryByRole } = renderPanel(d)

    expect(getByText(/Напишите менеджеру в течение 24 часов/)).toBeTruthy()
    expect(queryByRole('button', { name: 'Оспорить пропуск' })).toBeNull()
    expect(d.raise).not.toHaveBeenCalled()
  })

  it('заявка менеджера — статус вместо подсказки', () => {
    const { getByText, queryByText } = renderPanel(disputes({ disputed: new Map([['7', 'OVERTURNED']]) }))
    expect(getByText('Отметка исправлена: вы были на уроке')).toBeTruthy()
    expect(queryByText(/Напишите менеджеру/)).toBeNull()
  })
})
