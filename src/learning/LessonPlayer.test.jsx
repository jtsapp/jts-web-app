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

  // Находка 1 (Important): строка ответа должна показывать верно/неверно теми же
  // цветами и в той же манере, что choice (correct/wrong) и chips (ok/no) — не
  // одинаковой рамкой независимо от правильности.
  it('верный порядок красит строку ответа классом ok, как у соседних типов', () => {
    const { container } = renderLesson([orderTask])
    for (const word of ['I', 'like', 'coffee']) fireEvent.click(screen.getByRole('button', { name: word }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    const line = container.querySelector('.kl-order__line')
    expect(line.classList.contains('ok')).toBe(true)
    expect(line.classList.contains('no')).toBe(false)
  })

  it('неверный порядок красит строку ответа классом no, а не тем же стилем, что верный', () => {
    const { container } = renderLesson([orderTask])
    for (const word of ['coffee', 'I', 'like']) fireEvent.click(screen.getByRole('button', { name: word }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    const line = container.querySelector('.kl-order__line')
    expect(line.classList.contains('no')).toBe(true)
    expect(line.classList.contains('ok')).toBe(false)
  })

  // Находка 2 (Minor): слово может повторяться в банке (реальные данные,
  // public/learning/a0.json → L07-4.tasks[16]). Кнопки не шафлятся (в отличие от
  // choice/chips), поэтому порядок в DOM совпадает с порядком words — это и есть
  // устойчивый способ адресоваться к конкретной из двух одинаковых кнопок.
  it('слово, повторяющееся в банке дважды, собирается в правильном порядке по индексу', () => {
    const onDone = vi.fn()
    const dupTask = {
      type: 'order',
      sec: '4. Practice',
      word: 'Собери предложение',
      words: ['What', 'do', 'do', 'you'],
      answer: ['What', 'do', 'you', 'do'],
    }
    renderLesson([dupTask], { onDone })
    const dos = screen.getAllByRole('button', { name: 'do' })
    fireEvent.click(screen.getByRole('button', { name: 'What' }))
    fireEvent.click(dos[0]) // words[1] — первое «do»
    fireEvent.click(screen.getByRole('button', { name: 'you' }))
    fireEvent.click(dos[1]) // words[2] — второе «do»
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(screen.getByText(/верно/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /продолжить/i }))
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'success', correct: 1, wrong: 0 }))
  })

  // Находка 3 (Minor): пустой список слов не должен засчитывать ответ без клика —
  // 0 === 0 совпадает по длине сразу же, если не проверить words.length явно.
  it('пустой список слов не активирует кнопку проверки сразу', () => {
    renderLesson([{ ...orderTask, words: [], answer: [] }])
    expect(screen.getByRole('button', { name: /проверить/i }).disabled).toBe(true)
  })

  // Находка 4 (Minor): kl-order на банке слов был мёртвым классом — без единого
  // правила в styles.css и без использования как селектора. Банк order должен
  // выглядеть и размечаться так же, как обычный kl-bank у соседних типов.
  it('банк слов не несёт мёртвый класс kl-order', () => {
    const { container } = renderLesson([orderTask])
    const bank = container.querySelector('.kl-bank')
    expect(bank.classList.contains('kl-order')).toBe(false)
  })
})
