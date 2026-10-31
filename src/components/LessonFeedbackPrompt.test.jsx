// @vitest-environment jsdom
import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import LessonFeedbackPrompt from './LessonFeedbackPrompt.jsx'
import { getPendingLessonFeedback, submitLessonFeedback } from '../api.js'
vi.mock('../i18n.jsx', () => ({ useI18n: () => ({ lang: 'ru' }) }))
vi.mock('../api.js', () => ({ getPendingLessonFeedback: vi.fn(), submitLessonFeedback: vi.fn() }))
const lesson = { lessonId: 7, teacherName: 'Тестовый преподаватель' }
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
beforeEach(() => { vi.clearAllMocks(); getPendingLessonFeedback.mockResolvedValue(lesson); submitLessonFeedback.mockResolvedValue({}) })
afterEach(() => cleanup())
describe('Опрос ученика после урока', () => {
  it('показывает реальный ожидающий урок, без трёх ответов отправить нельзя', async () => {
    render(<LessonFeedbackPrompt token="t" />)
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Тестовый преподаватель')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Отправить оценку' }).disabled).toBe(true)
    expect(submitLessonFeedback).not.toHaveBeenCalled()
  })
  it('передаёт две оценки и качество связи на сервер, затем закрывает окно', async () => {
    render(<LessonFeedbackPrompt token="t" />)
    await screen.findByRole('dialog')
    screen.getAllByRole('radio', { name: '5' }).forEach(input => fireEvent.click(input))
    fireEvent.click(screen.getByRole('radio', { name: 'Хорошее' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Всё понятно  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Отправить оценку' }))
    await waitFor(() => expect(submitLessonFeedback).toHaveBeenCalledWith('t', 7, { lessonRating: 5, teacherRating: 5, connectionQuality: 'EXCELLENT', comment: 'Всё понятно' }))
    await waitFor(() => expect(screen.queryByText('Как прошёл урок?')).toBeNull())
  })
  it('после ошибки сохраняет ответы и позволяет повторить отправку', async () => {
    submitLessonFeedback.mockRejectedValue(new Error('offline'))
    render(<LessonFeedbackPrompt token="t" />)
    await screen.findByRole('dialog')
    screen.getAllByRole('radio', { name: '5' }).forEach(input => fireEvent.click(input))
    fireEvent.click(screen.getByRole('radio', { name: 'Хорошее' }))
    fireEvent.click(screen.getByRole('button', { name: 'Отправить оценку' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Отправить оценку' }).disabled).toBe(false)
    expect(screen.getAllByRole('radio', { name: '5' }).every(input => input.checked)).toBe(true)
  })
  it('не открывает окно при отсутствии урока или на экране входа', async () => {
    getPendingLessonFeedback.mockResolvedValue(null)
    const view = render(<LessonFeedbackPrompt token="t" />)
    await waitFor(() => expect(getPendingLessonFeedback).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('dialog')).toBeNull()
    view.unmount(); vi.clearAllMocks()
    render(<LessonFeedbackPrompt token="t" enabled={false} />)
    expect(getPendingLessonFeedback).not.toHaveBeenCalled()
  })
  it('«Позже» не открывает тот же опрос сразу при возвращении в приложение', async () => {
    render(<LessonFeedbackPrompt token="t" />)
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: 'Позже' }))
    fireEvent.focus(window)
    await waitFor(() => expect(getPendingLessonFeedback).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('Как прошёл урок?')).toBeNull()
  })
})
