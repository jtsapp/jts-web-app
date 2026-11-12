// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import DayPanel from './DayPanel.jsx'

function renderPanel(props) {
  return render(
    <I18nProvider>
      <DayPanel dayDate={new Date(2026, 7, 4)} items={[]} onOpenLesson={() => {}} {...props} />
    </I18nProvider>
  )
}

describe('DayPanel', () => {
  // Обратная связь 11.11: при переносе ученик видит новое (или прежнее) время.
  it('у перенесённого урока — «Перенесено с …», у исходного — «Перенесено на …»', () => {
    const items = [
      { lessonId: 1, participantId: 11, scheduledAt: '2026-08-04T20:00:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'SCHEDULED', format: 'ONLINE', movedFrom: '2026-08-02T18:00:00' },
      { lessonId: 2, participantId: 12, scheduledAt: '2026-08-04T21:00:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'COMPLETED', format: 'ONLINE', movedTo: '2026-08-06T19:30:00' },
      { lessonId: 3, participantId: 13, scheduledAt: '2026-08-04T22:00:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'SCHEDULED', format: 'ONLINE' },
    ]
    const { container } = renderPanel({ items })
    const notes = [...container.querySelectorAll('[data-testid="lesson-moved"]')].map((n) => n.textContent)
    expect(notes).toHaveLength(2)
    expect(notes[0]).toMatch(/^Перенесено с .*18:00/)
    expect(notes[1]).toMatch(/^Перенесено на .*19:30/)
  })

  it('renders one lesson row per item', () => {
    const items = [
      { lessonId: 1, participantId: 11, scheduledAt: '2026-08-04T20:00:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'COMPLETED', format: 'ONLINE' },
      { lessonId: 2, participantId: 12, scheduledAt: '2026-08-04T21:00:00', durationMinutes: 60, teacherName: 'Demo 2', lessonStatus: 'SCHEDULED', format: 'ONLINE' },
    ]
    const { container } = renderPanel({ items })
    expect(container.querySelectorAll('.sch-row')).toHaveLength(2)
  })

  // В завершённый урок ученик возвращается доделывать задания, а не смотреть,
  // — отсюда и подпись на кнопке (spec-lesson-always-open).
  it('в завершённый урок можно войти', () => {
    const items = [
      { lessonId: 1, participantId: 11, scheduledAt: '2026-08-04T20:00:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'COMPLETED', format: 'ONLINE' },
    ]
    const { getByRole } = renderPanel({ items })
    expect(getByRole('button', { name: 'Открыть урок' })).toBeTruthy()
  })

  // Главное, ради чего всё затевалось: преподаватель не нажал «Начать» — урок
  // всё равно открывается. Раньше кнопки не было вовсе.
  it('в ещё не начатый урок тоже можно войти', () => {
    const items = [
      { lessonId: 2, participantId: 12, scheduledAt: '2026-08-04T21:00:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'SCHEDULED', format: 'ONLINE' },
    ]
    const { getByRole } = renderPanel({ items })
    expect(getByRole('button', { name: 'Открыть урок' })).toBeTruthy()
  })

  // Идущий урок зовёт в класс, а не «открыть»: там преподаватель и звонок.
  it('идущий урок зовёт в класс', () => {
    const items = [
      { lessonId: 3, participantId: 13, scheduledAt: '2026-08-04T21:00:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'IN_PROGRESS', format: 'ONLINE' },
    ]
    const { getByRole } = renderPanel({ items })
    expect(getByRole('button', { name: 'Войти в класс' })).toBeTruthy()
  })

  // Отменённого занятия не было — входить некуда.
  it('у отменённого урока кнопки нет', () => {
    const items = [
      { lessonId: 4, participantId: 14, scheduledAt: '2026-08-04T21:00:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'CANCELLED', format: 'ONLINE' },
    ]
    const { container } = renderPanel({ items })
    expect(container.querySelector('.sch-row__join')).toBeNull()
  })

  // Карточка дня в макете разводит групповое и индивидуальное занятие цветом и
  // словом. Тип не приходит со списком occurrences — его приносит догрузка
  // урока, и панель обязана раздать его нужной строке, а не первой попавшейся.
  it('вид занятия берётся из карточки своего урока', () => {
    const items = [
      { lessonId: 1, participantId: 11, scheduledAt: '2026-08-04T20:00:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'SCHEDULED', format: 'ONLINE' },
      { lessonId: 2, participantId: 12, scheduledAt: '2026-08-04T21:00:00', durationMinutes: 60, teacherName: 'Demo 2', lessonStatus: 'SCHEDULED', format: 'ONLINE' },
    ]
    const cards = new Map([
      ['1', { meetingUrl: null, group: true }],
      ['2', { meetingUrl: null, group: false }],
    ])
    const { container } = renderPanel({ items, cards })
    const rows = container.querySelectorAll('.sch-row')
    expect(rows[0].querySelector('.sch-row__kind--group').textContent).toBe('Группа')
    expect(rows[1].querySelector('.sch-row__kind--solo').textContent).toBe('Индивидуальный')
  })

  it('тип занятия ещё не догрузился — чипа нет вовсе', () => {
    const items = [
      { lessonId: 1, participantId: 11, scheduledAt: '2026-08-04T20:00:00', durationMinutes: 60, teacherName: 'Demo', lessonStatus: 'SCHEDULED', format: 'ONLINE' },
    ]
    const { container } = renderPanel({ items })
    expect(container.querySelector('.sch-row__kind')).toBeNull()
  })

  it('shows the empty state when there are no items', () => {
    const { container } = renderPanel({ items: [] })
    expect(container.querySelectorAll('.sch-row')).toHaveLength(0)
    expect(container.querySelector('.sch__status')).not.toBeNull()
  })
})
