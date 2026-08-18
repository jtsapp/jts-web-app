// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import HomeworkExercises from './HomeworkExercises.jsx'

const question = (id, type, extra = {}) => ({ id, type, prompt: `Вопрос ${id}`, ...extra })

function show(hw) {
  return render(<I18nProvider><HomeworkExercises hw={hw} /></I18nProvider>)
}

describe('HomeworkExercises', () => {
  beforeEach(() => localStorage.clear())

  it('не рисует секцию, когда заданий с урока нет', () => {
    const { container } = show({ id: 1, exercises: [{ id: 9, taskId: 3, taskTitle: 'Из библиотеки' }] })

    expect(container.querySelector('.hw-exercises')).toBeNull()
  })

  it('рисует все типы вопросов урока, включая те, которых нет в библиотеке задач', () => {
    show({ id: 2, exercises: [
      { id: 1, title: 'Выбор', question: question('q1', 'choice', { options: ['a', 'b'], answer: 'a' }) },
      { id: 2, title: 'Пропуск', question: question('q2', 'gap', { gapBefore: 'I', gapAfter: 'coffee', answers: ['like'] }) },
      { id: 3, title: 'Пары', question: question('q3', 'match', { pairs: [{ left: 'cat', right: 'кот' }] }) },
      { id: 4, title: 'Порядок', question: question('q4', 'order', { words: ['b', 'a'], answer: ['a', 'b'] }) },
      { id: 5, title: 'Несколько', question: question('q5', 'multi', { options: ['a', 'b'], answers: ['a'] }) },
      { id: 6, title: 'Опрос', question: question('q6', 'pick', { options: ['a', 'b'] }) },
    ] })

    for (const title of ['Выбор', 'Пропуск', 'Пары', 'Порядок', 'Несколько', 'Опрос']) {
      expect(screen.getByText(title)).toBeTruthy()
    }
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
