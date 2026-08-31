// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import LessonSidePanel from './LessonSidePanel.jsx'

const STEPS = [
  { id: 1, order: 1, title: 'Разминка: small talk' },
  { id: 2, order: 2, title: 'Правило: Present Perfect' },
  { id: 3, order: 3, title: 'Практика: just / yet / already' },
]

const PARTICIPANTS = [
  { studentId: 10, studentName: 'Данияр Серіков' },
  { studentId: 11, studentName: 'Камила Бектурова' },
]

function renderPanel(props = {}) {
  return render(
    <I18nProvider>
      <LessonSidePanel
        steps={STEPS}
        activeStepId={2}
        statusById={{ 1: 'done', 2: 'current', 3: 'locked' }}
        teacherId={7}
        teacherName="Адильжан Алимжанов"
        participants={PARTICIPANTS}
        onlineUserIds={new Set([7, 10])}
        selfUserId={10}
        {...props}
      />
    </I18nProvider>
  )
}

describe('LessonSidePanel — вкладки правой колонки', () => {
  // Числа рядом с названиями читались как нумерация вкладок, а не как размер
  // списка: «Темы 1», «Группа 2» выглядели пунктами 1 и 2.
  it('на вкладках только названия, без чисел', () => {
    renderPanel()
    expect(screen.getByRole('tab', { name: /Темы/ }).textContent).toBe('Темы')
    expect(screen.getByRole('tab', { name: /Группа/ }).textContent).toBe('Группа')
  })

  it('по умолчанию открыты темы', () => {
    renderPanel()
    expect(screen.getByRole('tab', { name: /Темы/ }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('Правило: Present Perfect')).toBeTruthy()
  })

  // Состав класса ученику раньше не показывался вовсе: он не знал ни с кем
  // занимается, ни кто на связи.
  it('вкладка «Группа» открывает состав класса', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /Группа/ }))
    expect(screen.getByText('Адильжан Алимжанов')).toBeTruthy()
    expect(screen.getByText('Камила Бектурова')).toBeTruthy()
    // Себя ученик видит строкой «Вы», а не собственным именем.
    expect(screen.getByText('Вы')).toBeTruthy()
    expect(screen.queryByText('Данияр Серіков')).toBeNull()
  })

  it('точка присутствия горит у тех, кто в классе', () => {
    const { container } = renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /Группа/ }))
    const rows = container.querySelectorAll('.lv-people__row')
    expect(rows).toHaveLength(3)
    // Учитель и «Вы» на связи, Камила — нет.
    expect(container.querySelectorAll('.lv-people__dot.is-on')).toHaveLength(2)
  })

  // «Смотреть экран» — право преподавателя: у ученика его нет ни на бэкенде,
  // ни по смыслу урока.
  it('ученику кнопки «Смотреть экран» не показывают', () => {
    const { container } = renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /Группа/ }))
    expect(container.querySelectorAll('.lv-people__act')).toHaveLength(0)
  })

  it('преподаватель переключает просмотр прямо из списка', () => {
    const onWatch = vi.fn()
    const { container } = renderPanel({ isStaff: true, selfUserId: 7, reviewStudentId: 10, onWatch })
    fireEvent.click(screen.getByRole('tab', { name: /Группа/ }))

    const watch = container.querySelectorAll('.lv-people__act')
    expect(watch).toHaveLength(2)
    // Выбранный ученик помечен — иначе непонятно, чью работу видно в центре.
    expect(watch[0].classList.contains('is-active')).toBe(true)

    fireEvent.click(watch[1])
    expect(onWatch).toHaveBeenCalledWith(11)
  })

  // Вызов адресный: нажали на строке одного — вызвали именно его, а не «класс».
  it('преподаватель вызывает ученика со строки списка', () => {
    const onCall = vi.fn()
    renderPanel({ isStaff: true, selfUserId: 7, onCall })
    fireEvent.click(screen.getByRole('tab', { name: /Группа/ }))

    const calls = screen.getAllByRole('button', { name: 'Вызвать' })
    expect(calls).toHaveLength(2)
    fireEvent.click(calls[1])
    expect(onCall).toHaveBeenCalledWith(11)
  })

  it('ученику вызывать некого — кнопки нет', () => {
    renderPanel({ onCall: vi.fn() })
    fireEvent.click(screen.getByRole('tab', { name: /Группа/ }))
    expect(screen.queryByRole('button', { name: 'Вызвать' })).toBeNull()
  })

  // Пока урок не загрузился, преподавателя нет: строка-заглушка «Учитель» без
  // имени сообщала бы, что он в классе.
  it('преподаватель неизвестен — строки о нём нет', () => {
    const { container } = renderPanel({ teacherId: null, teacherName: null })
    fireEvent.click(screen.getByRole('tab', { name: /Группа/ }))
    expect(container.querySelectorAll('.lv-people__row')).toHaveLength(2)
    expect(screen.queryByText('Учителя')).toBeNull()
  })

  it('урок один на один — во вкладке учитель и ученик', () => {
    const { container } = renderPanel({ participants: [{ studentId: 10, studentName: 'Данияр Серіков' }] })
    fireEvent.click(screen.getByRole('tab', { name: /Группа/ }))
    expect(container.querySelectorAll('.lv-people__row')).toHaveLength(2)
  })
})
