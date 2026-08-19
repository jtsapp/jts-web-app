// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import HomeworkExercises from './HomeworkExercises.jsx'

vi.mock('../../api.js', () => ({ saveHomeworkAnswer: vi.fn(() => Promise.resolve({})) }))
import { saveHomeworkAnswer } from '../../api.js'

const question = (id, type, extra = {}) => ({ id, type, prompt: `Вопрос ${id}`, ...extra })

function show(hw, token = 'jwt') {
  return render(<I18nProvider><HomeworkExercises hw={hw} token={token} /></I18nProvider>)
}

describe('HomeworkExercises', () => {
  beforeEach(() => {
    localStorage.clear()
    saveHomeworkAnswer.mockClear()
    saveHomeworkAnswer.mockResolvedValue({})
  })

  it('не рисует секцию, когда заданий с урока нет', () => {
    const { container } = show({ id: 1, exercises: [{ id: 9, taskId: 3, taskTitle: 'Из библиотеки' }] })

    expect(container.querySelector('.hw-exercises')).toBeNull()
  })

  it('рисует каждый тип его же компонентом урока, а не текстом', () => {
    const { container } = show({ id: 2, exercises: [
      { id: 1, title: 'Выбор', question: question('q1', 'choice', { options: ['a', 'b'], answer: 'a' }) },
      { id: 2, title: 'Пропуск', question: question('q2', 'gap', { gapBefore: 'I', gapAfter: 'coffee', answers: ['like'] }) },
      { id: 3, title: 'Пары', question: question('q3', 'match', { pairs: [{ left: 'cat', right: 'кот' }] }) },
      { id: 4, title: 'Порядок', question: question('q4', 'order', { words: ['b', 'a'], answer: ['a', 'b'] }) },
      { id: 5, title: 'Несколько', question: question('q5', 'multi', { options: ['a', 'b'], answers: ['a'] }) },
      { id: 6, title: 'Опрос', question: question('q6', 'pick', { options: ['a', 'b'] }) },
    ] })

    // Разметка та же, что на уроке: по ней задание и получает своё оформление
    // и поведение — от неё зависят и стили, и проверка.
    for (const type of ['choice', 'gap', 'match', 'order', 'multi', 'pick']) {
      expect(container.querySelector(`.lw-q--${type}`)).not.toBeNull()
    }
    expect(container.querySelectorAll('.lw-practice').length).toBe(6)
  })

  it('формулировку печатает сам вопрос, в шапке карточки её копии нет', () => {
    const { container } = show({ id: 2, exercises: [
      { id: 1, title: '🔊 Word 1', question: question('q1', 'choice', { prompt: '🔊 Word 1', options: ['a'], answer: 'a' }) },
    ] })

    expect(container.querySelector('.lw-practice__title')).toBeNull()
    expect(screen.getAllByText('🔊 Word 1')).toHaveLength(1)
  })

  it('считает решённые задания и восстанавливает ответы из хранилища', () => {
    localStorage.setItem('hw-answers:3', JSON.stringify({ q1: 'a' }))

    show({ id: 3, exercises: [
      { id: 1, title: 'Первый', question: question('q1', 'choice', { options: ['a', 'b'], answer: 'a' }) },
      { id: 2, title: 'Второй', question: question('q2', 'choice', { options: ['a', 'b'], answer: 'b' }) },
    ] })

    expect(screen.getByText('1 из 2 решено')).toBeTruthy()
  })
})

describe('HomeworkExercises: ответ уходит преподавателю', () => {
  const choice = { id: 1, title: 'Выбор', question: { id: 'q1', type: 'choice', prompt: 'A?', options: ['a', 'b'], answer: 'a' } }

  beforeEach(() => {
    localStorage.clear()
    saveHomeworkAnswer.mockClear()
    saveHomeworkAnswer.mockResolvedValue({})
  })

  it('по «Проверить» отправляет ответ и вердикт', async () => {
    show({ id: 7, exercises: [choice] })

    fireEvent.click(screen.getByText('a'))
    fireEvent.click(screen.getByRole('button', { name: /Проверить/i }))

    await waitFor(() => expect(saveHomeworkAnswer).toHaveBeenCalledTimes(1))
    const [hwId, exerciseId, token, answer, correct] = saveHomeworkAnswer.mock.calls[0]
    expect([hwId, exerciseId, token, answer, correct]).toEqual([7, 1, 'jwt', 'a', true])
  })

  it('неверный ответ уходит с correct=false, а не молчит', async () => {
    show({ id: 7, exercises: [choice] })

    fireEvent.click(screen.getByText('b'))
    fireEvent.click(screen.getByRole('button', { name: /Проверить/i }))

    await waitFor(() => expect(saveHomeworkAnswer).toHaveBeenCalled())
    expect(saveHomeworkAnswer.mock.calls[0][4]).toBe(false)
  })

  it('упавшая отправка честно сообщает, что преподаватель ответа не увидит', async () => {
    saveHomeworkAnswer.mockRejectedValue(new Error('offline'))
    show({ id: 7, exercises: [choice] })

    fireEvent.click(screen.getByText('a'))
    fireEvent.click(screen.getByRole('button', { name: /Проверить/i }))

    expect(await screen.findByText(/Ответ не сохранился/)).toBeTruthy()
  })

  it('ответ с сервера важнее черновика в localStorage', () => {
    localStorage.setItem('hw-answers:7', JSON.stringify({ q1: 'b' }))

    show({ id: 7, exercises: [{ ...choice, studentAnswer: 'a' }] })

    expect(screen.getByText('1 из 1 решено')).toBeTruthy()
  })

  it('без токена ничего не отправляет, но проверку показывает', async () => {
    show({ id: 7, exercises: [choice] }, null)

    fireEvent.click(screen.getByText('a'))
    fireEvent.click(screen.getByRole('button', { name: /Проверить/i }))

    expect(saveHomeworkAnswer).not.toHaveBeenCalled()
  })
})

describe('HomeworkExercises: прогресс', () => {
  beforeEach(() => localStorage.clear())

  it('полоса прогресса объявляет решённое ассистивным технологиям', () => {
    localStorage.setItem('hw-answers:9', JSON.stringify({ q1: 'a' }))

    const { container } = show({ id: 9, exercises: [
      { id: 1, question: question('q1', 'choice', { options: ['a', 'b'], answer: 'a' }) },
      { id: 2, question: question('q2', 'choice', { options: ['a', 'b'], answer: 'b' }) },
    ] })

    const bar = container.querySelector('[role="progressbar"]')
    expect(bar.getAttribute('aria-valuenow')).toBe('1')
    expect(bar.getAttribute('aria-valuemax')).toBe('2')
  })

  it('когда решено всё, счётчик меняет вид — это видно без чтения цифр', () => {
    localStorage.setItem('hw-answers:9', JSON.stringify({ q1: 'a' }))

    const { container } = show({ id: 9, exercises: [
      { id: 1, question: question('q1', 'choice', { options: ['a', 'b'], answer: 'a' }) },
    ] })

    expect(container.querySelector('.hw-exercises__count--done')).not.toBeNull()
  })
})
