// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import LessonPlayer from './LessonPlayer.jsx'

function renderLesson(tasks, props = {}) {
  const lesson = { code: 'L01-1', title: 'Тест', tasks }
  return render(
    <I18nProvider>
      <LessonPlayer lesson={lesson} level="a0" token="t" onExit={() => {}} onDone={() => {}} {...props} />
    </I18nProvider>,
  )
}

const orderTask = {
  type: 'order',
  sec: '4. Practice',
  word: 'Собери предложение',
  words: ['coffee', 'I', 'like'],
  answer: ['I', 'like', 'coffee'],
  why: 'подлежащее, глагол, дополнение',
}

describe('LessonPlayer — задание order', () => {
  it('кнопка проверки недоступна, пока собраны не все слова', () => {
    renderLesson([orderTask])
    const check = screen.getByRole('button', { name: /проверить/i })
    expect(check.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'I' }))
    expect(screen.getByRole('button', { name: /проверить/i }).disabled).toBe(true)
  })

  it('верный порядок засчитывается и даёт монеты', () => {
    const onDone = vi.fn()
    renderLesson([orderTask], { onDone })
    for (const word of ['I', 'like', 'coffee']) fireEvent.click(screen.getByRole('button', { name: word }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(screen.getByText(/верно/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /продолжить/i }))
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'success', correct: 1, wrong: 0, points: 10 }))
  })

  it('неверный порядок показывает правильный ответ', () => {
    renderLesson([orderTask])
    for (const word of ['coffee', 'I', 'like']) fireEvent.click(screen.getByRole('button', { name: word }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(screen.getByText(/неверно/i)).toBeTruthy()
    expect(screen.getByText(/I like coffee/)).toBeTruthy()
  })

  it('повторный клик по слову возвращает его в банк', () => {
    renderLesson([orderTask])
    const word = screen.getByRole('button', { name: 'I' })
    fireEvent.click(word)
    fireEvent.click(screen.getByRole('button', { name: 'I' }))
    expect(screen.getByRole('button', { name: /проверить/i }).disabled).toBe(true)
  })
})
