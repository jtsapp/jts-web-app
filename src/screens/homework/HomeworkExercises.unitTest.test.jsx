// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import HomeworkExercises from './HomeworkExercises.jsx'

vi.mock('../../api.js', () => ({
  saveHomeworkAnswer: vi.fn(() => Promise.resolve({})),
  getCourseCatalogLesson: vi.fn(() => Promise.resolve({ type: 'LESSON' })),
}))
import { saveHomeworkAnswer, getCourseCatalogLesson } from '../../api.js'

const question = (id, extra = {}) => ({ id, type: 'choice', prompt: `Вопрос ${id}`, options: ['a', 'b'], answer: 'a', ...extra })

function show(hw, token = 'jwt') {
  return render(<I18nProvider><HomeworkExercises hw={{ status: 'ASSIGNED', ...hw }} token={token} /></I18nProvider>)
}

/**
 * Юнит-тест каталога на дом — решение владельца: без ключей, одна сдача на
 * весь пакет. Обычный урок, заданный тем же путём, остаётся тренажёром с
 * покарточной проверкой (соседний спек это уже покрывает).
 *
 * Тип урока экран спрашивает у каталога по catalogLessonId пакета — в
 * назначении ДЗ его нет, только след происхождения. «Сдано» выводится из
 * studentAnswer на сервере, без своего флага.
 */
describe('HomeworkExercises — юнит-тест на дом', () => {
  beforeEach(() => {
    localStorage.clear()
    saveHomeworkAnswer.mockClear()
    saveHomeworkAnswer.mockResolvedValue({})
    getCourseCatalogLesson.mockClear()
    getCourseCatalogLesson.mockResolvedValue({ type: 'LESSON' })
  })

  const тест = { id: 1, batchId: 'b1', catalogLessonId: 314, lessonTitle: 'Unit 1 Review Test' }

  it('спрашивает тип урока по catalogLessonId пакета', async () => {
    show({ id: 2, exercises: [{ ...тест, question: question('q1') }] })

    await waitFor(() => expect(getCourseCatalogLesson).toHaveBeenCalledWith(314, 'jwt'))
  })

  it('юнит-тест: «Проверить» у карточек нет, вместо него — «Завершить тест»', async () => {
    getCourseCatalogLesson.mockResolvedValue({ type: 'REVIEW' })
    show({ id: 2, exercises: [{ ...тест, question: question('q1') }] })

    await screen.findByRole('button', { name: /Завершить тест/i })
    expect(screen.queryByRole('button', { name: /Проверить/i })).toBeNull()
  })

  it('обычный урок тем же путём — «Проверить» как раньше, «Завершить тест» нет', async () => {
    getCourseCatalogLesson.mockResolvedValue({ type: 'LESSON' })
    show({ id: 2, exercises: [{ ...тест, question: question('q1') }] })

    await waitFor(() => expect(getCourseCatalogLesson).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: /Проверить/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Завершить тест/i })).toBeNull()
  })

  it('«Завершить тест» недоступна, пока отвечены не все вопросы пакета', async () => {
    getCourseCatalogLesson.mockResolvedValue({ type: 'REVIEW' })
    show({ id: 2, exercises: [
      { ...тест, id: 1, question: question('q1') },
      { ...тест, id: 2, question: question('q2') },
    ] })

    const кнопкаЛокатор = () => screen.getByRole('button', { name: /Завершить тест/i })
    await screen.findByRole('button', { name: /Завершить тест/i })
    expect(кнопкаЛокатор().disabled).toBe(true)

    fireEvent.click(screen.getAllByText('a')[0])
    expect(кнопкаЛокатор().disabled).toBe(true)

    fireEvent.click(screen.getAllByText('a')[1])
    await waitFor(() => expect(кнопкаЛокатор().disabled).toBe(false))
  })

  it('«Завершить тест» шлёт ответ каждого вопроса пакета и открывает разбор', async () => {
    getCourseCatalogLesson.mockResolvedValue({ type: 'REVIEW' })
    show({ id: 2, exercises: [
      { ...тест, id: 11, question: question('q1') },
      { ...тест, id: 12, question: question('q2') },
    ] })

    fireEvent.click(screen.getAllByText('a')[0])
    fireEvent.click(screen.getAllByText('a')[1])
    await screen.findByRole('button', { name: /Завершить тест/i })
    await waitFor(() => expect(screen.getByRole('button', { name: /Завершить тест/i }).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: /Завершить тест/i }))

    await waitFor(() => expect(saveHomeworkAnswer).toHaveBeenCalledTimes(2))
    expect(saveHomeworkAnswer).toHaveBeenCalledWith(2, 11, 'jwt', 'a', true)
    expect(saveHomeworkAnswer).toHaveBeenCalledWith(2, 12, 'jwt', 'a', true)
  })

  it('уже сданный пакет (studentAnswer на каждом вопросе) открыт сразу — без кнопки, эталоны видны', async () => {
    getCourseCatalogLesson.mockResolvedValue({ type: 'REVIEW' })
    show({ id: 2, exercises: [
      { ...тест, id: 1, studentAnswer: 'a', answerCorrect: true, question: question('q1') },
      { ...тест, id: 2, studentAnswer: 'b', answerCorrect: false, question: question('q2') },
    ] })

    await waitFor(() => expect(getCourseCatalogLesson).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: /Завершить тест/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Проверить/i })).toBeNull()
  })
})
