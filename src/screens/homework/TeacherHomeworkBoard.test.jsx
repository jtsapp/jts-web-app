// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

const submitted = {
  id: 2, studentName: 'Сакен Ученик', title: 'Unit 3 · Present Perfect', status: 'SUBMITTED',
  submittedAt: '2026-08-17T18:30:00', dueDate: '2026-08-24', grade: null, teacherComment: null,
  materials: [{ id: 1, fileName: 'task.pdf', url: 'u1' }],
  submissions: [{ id: 9, fileName: 'answer.jpg', url: 'u2' }],
}
// id больше, чем у взятой в проверку: тайбрейк идёт по убыванию id, и с
// прежним id 1 порядок сходился даже без записи IN_REVIEW в REVIEW_ORDER —
// тест проходил на сломанном коде.
const assigned = { ...submitted, id: 5, title: 'Unit 4 · Past Simple', status: 'ASSIGNED', submittedAt: null, submissions: [] }
const graded = { ...submitted, id: 3, title: 'Unit 2 · Daily routine', status: 'COMPLETED', grade: 5, teacherComment: 'Молодец' }
const taken = { ...submitted, id: 4, title: 'Unit 5 · Modals', status: 'IN_REVIEW' }

vi.mock('../../api.js', () => ({
  getHomeworkBoard: vi.fn(async () => [assigned, graded, submitted, taken]),
  getHomeworkById: vi.fn(async () => submitted),
  saveHomeworkFeedback: vi.fn(async () => ({ ...submitted, teacherComment: 'Переделай второе' })),
  gradeHomework: vi.fn(async () => ({ ...submitted, status: 'COMPLETED', grade: 4, teacherComment: '' })),
  returnHomeworkForRevision: vi.fn(async () => ({ ...submitted, status: 'NEEDS_REVISION', teacherComment: 'Переделай второе' })),
}))

import TeacherHomeworkBoard from './TeacherHomeworkBoard.jsx'
import * as api from '../../api.js'

const renderBoard = () => render(
  <I18nProvider><TeacherHomeworkBoard token="TOK" /></I18nProvider>
)

const openFirst = async (container) => {
  await waitFor(() => expect(container.querySelector('.hw-card')).not.toBeNull())
  fireEvent.click(container.querySelectorAll('.hw-card')[0])
  await waitFor(() => expect(container.querySelector('.hw-detail__title')).not.toBeNull())
}

describe('TeacherHomeworkBoard', () => {
  beforeEach(() => vi.clearAllMocks())

  // Сданные работы ждут преподавателя — они и должны быть сверху, иначе он
  // ищет их среди заданных и уже проверенных.
  it('сданные работы стоят первыми, проверенные — последними', async () => {
    const { container } = renderBoard()
    await waitFor(() => expect(container.querySelectorAll('.hw-card')).toHaveLength(4))
    const titles = [...container.querySelectorAll('.hw-card__title')].map((e) => e.textContent)
    expect(titles).toEqual([
      'Unit 3 · Present Perfect', 'Unit 5 · Modals', 'Unit 4 · Past Simple', 'Unit 2 · Daily routine',
    ])
  })

  // Регрессия: IN_REVIEW не разбирался вовсе — взятая в проверку работа читалась
  // как «Задано» и лежала среди тех, которых преподаватель не открывал. Пятый
  // статус завели ровно ради этого различия.
  it('взятая в проверку отличается от сданной и подписью, и цветом', async () => {
    const { container } = renderBoard()
    await waitFor(() => expect(container.querySelectorAll('.hw-card')).toHaveLength(4))
    const badges = [...container.querySelectorAll('.hw-card .hw-badge')].map((e) => e.textContent)
    // Первые две карточки — сданная и взятая в проверку; ниже даты фикстур
    // делают подписи зависимыми от сегодняшнего числа, и сверять их незачем.
    expect(badges.slice(0, 2)).toEqual(['На проверке', 'Взята в проверку'])
    expect(container.querySelector('.hw-badge--inReview')).not.toBeNull()
  })

  it('в открытой карточке подпись та же, что в списке', async () => {
    const { container } = renderBoard()
    await waitFor(() => expect(container.querySelectorAll('.hw-card')).toHaveLength(4))
    fireEvent.click(container.querySelectorAll('.hw-card')[1])
    await waitFor(() => expect(container.querySelector('.hw-detail__title')).not.toBeNull())
    expect(container.querySelector('.hw-detail .hw-badge').textContent).toBe('Взята в проверку')
  })

  it('в карточке видно ответ ученика и файлы задания', async () => {
    const { container } = renderBoard()
    await openFirst(container)
    expect(screen.getByText('task.pdf')).toBeTruthy()
    expect(screen.getByText('answer.jpg')).toBeTruthy()
    expect(screen.getByText('Ученик: Сакен Ученик')).toBeTruthy()
  })

  it('оценка не ставится, пока не выбран балл', async () => {
    const { container } = renderBoard()
    await openFirst(container)
    expect(screen.getByRole('button', { name: /поставить оценку/i }).disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: '4' }))
    fireEvent.click(screen.getByRole('button', { name: /поставить оценку/i }))

    await waitFor(() => expect(api.gradeHomework).toHaveBeenCalledWith('TOK', 2, 4, ''))
    await waitFor(() => expect(container.querySelector('.hw__done')).not.toBeNull())
  })

  it('отзыв сохраняется без оценки', async () => {
    const { container } = renderBoard()
    await openFirst(container)

    fireEvent.change(container.querySelector('.hw-field__input'), { target: { value: 'Переделай второе' } })
    fireEvent.click(screen.getByRole('button', { name: /сохранить отзыв/i }))

    await waitFor(() => expect(api.saveHomeworkFeedback).toHaveBeenCalledWith('TOK', 2, 'Переделай второе'))
    expect(api.gradeHomework).not.toHaveBeenCalled()
  })

  // Вернуть работу молча нельзя: ученик не поймёт, что переделывать.
  it('вернуть на доработку можно только с отзывом', async () => {
    const { container } = renderBoard()
    await openFirst(container)
    const back = screen.getByRole('button', { name: /вернуть на доработку/i })
    expect(back.disabled).toBe(true)

    fireEvent.change(container.querySelector('.hw-field__input'), { target: { value: 'Переделай второе' } })
    expect(screen.getByRole('button', { name: /вернуть на доработку/i }).disabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: /вернуть на доработку/i }))

    await waitFor(() => expect(api.returnHomeworkForRevision).toHaveBeenCalledWith('TOK', 2, 'Переделай второе'))
  })

  it('уже проверенная работа открывается с оценкой и отзывом', async () => {
    const { container } = renderBoard()
    await waitFor(() => expect(container.querySelectorAll('.hw-card')).toHaveLength(4))
    // Проверенная — последняя: ниже неё в порядке разбора ничего нет.
    fireEvent.click(container.querySelectorAll('.hw-card')[3])

    await waitFor(() => expect(container.querySelector('.hw-field__input').value).toBe('Молодец'))
    expect(container.querySelector('.hw-grade-btn--on').textContent).toBe('5')
  })

  it('ошибка сохранения показывается, а не глотается', async () => {
    api.gradeHomework.mockRejectedValueOnce(new Error('boom'))
    const { container } = renderBoard()
    await openFirst(container)

    fireEvent.click(screen.getByRole('button', { name: '3' }))
    fireEvent.click(screen.getByRole('button', { name: /поставить оценку/i }))

    await waitFor(() => expect(container.querySelector('.hw__error')).not.toBeNull())
  })

  // Работы, оценённые до шкалы 1–5, хранят и 7, и 100. Такой балл бэкенд
  // больше не примет (@Min/@Max) — он не подставляется, и «Поставить оценку»
  // ждёт заново выбранную оценку вместо гарантированного 400.
  it('старая оценка вне шкалы не подставляется в кнопки', async () => {
    api.getHomeworkBoard.mockResolvedValueOnce([{ ...graded, id: 4, grade: 100 }])
    const { container } = renderBoard()
    await openFirst(container)

    expect(container.querySelector('.hw-grade-btn--on')).toBeNull()
    expect(screen.getByRole('button', { name: /поставить оценку/i }).disabled).toBe(true)
  })

  it('когда у учеников нет работ — честное пустое состояние', async () => {
    api.getHomeworkBoard.mockResolvedValueOnce([])
    const { container } = renderBoard()
    await waitFor(() => expect(screen.getByText(/домашних работ у ваших учеников пока нет/i)).toBeTruthy())
    expect(container.querySelector('.hw-card')).toBeNull()
  })
})
