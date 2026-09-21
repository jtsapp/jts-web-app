// @vitest-environment jsdom
// Урок A2–B2 — 40–90 экранов, и позиция жила только в памяти плеера:
// перезагрузка страницы (или выгруженная телефоном вкладка) отбрасывала на
// первый шаг. Теперь плеер запоминает шаг и счёт и предлагает продолжить.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import CourseStepPlayer from './CourseStepPlayer.jsx'
import { readResume } from '../lib/lessonResume.js'

const TOKEN = `h.${btoa(JSON.stringify({ userId: 41 })).replace(/=+$/, '')}.s`
const steps = [1, 2, 3, 4, 5].map((n) => ({ stage: 'Grammar', type: 'note', title: `Правило ${n}`, html: `<p>Текст ${n}</p>` }))

function play(extra = {}) {
  return render(
    <I18nProvider>
      <CourseStepPlayer steps={steps} title="Урок" level="A2" token={TOKEN} resumeKey="a2:L7" onExit={() => {}} onDone={() => {}} {...extra} />
    </I18nProvider>,
  )
}

// Заголовок шага разбит на слова (перевод по тапу) — сверяем текстом элемента.
const stepTitle = () => document.querySelector('.cp-note__h')?.textContent.replace(/\s+/g, ' ').trim()
const next = () => fireEvent.click(screen.getByRole('button', { name: /продолжить$/i }))

beforeEach(() => {
  localStorage.clear()
  cleanup()
})

describe('CourseStepPlayer — продолжение урока после перезагрузки', () => {
  it('после перезагрузки предлагает продолжить с того же шага', () => {
    play()
    next()
    next() // на третьем шаге
    cleanup() // «перезагрузка»

    play()
    expect(screen.getByText(/шаге 3 из 5/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /продолжить с шага/i }))
    expect(stepTitle()).toBe('Правило 3')
    expect(screen.queryByText(/шаге 3 из 5/i)).toBeNull()
  })

  it('«Начать сначала» открывает первый шаг и забывает позицию', () => {
    play()
    next()
    next()
    cleanup()

    play()
    fireEvent.click(screen.getByRole('button', { name: /начать сначала/i }))
    expect(stepTitle()).toBe('Правило 1')
    expect(readResume(TOKEN, 'a2:L7', 5)).toBeNull()
  })

  // На экране две «Продолжить»: в плашке и внизу шага, и нижняя заметнее.
  // Промах мимо плашки не должен стоить сохранённой позиции.
  it('нижняя «Продолжить» вместо плашки позицию не затирает — плашка остаётся', () => {
    play()
    next()
    next()
    next() // на четвёртом шаге
    cleanup()

    play()
    next() // промах: ушли на второй шаг обычной кнопкой
    expect(stepTitle()).toBe('Правило 2')
    expect(readResume(TOKEN, 'a2:L7', 5)).toMatchObject({ idx: 3 })
    fireEvent.click(screen.getByRole('button', { name: /продолжить с шага 4/i }))
    expect(stepTitle()).toBe('Правило 4')
  })

  it('сам дошёл до сохранённого шага — предложение снимается, позиция пишется дальше', () => {
    play()
    next()
    cleanup() // остановились на втором шаге

    play()
    next() // своим ходом на второй — догнали сохранённую позицию
    expect(screen.queryByRole('button', { name: /продолжить с шага/i })).toBeNull()
    next()
    expect(readResume(TOKEN, 'a2:L7', 5)).toMatchObject({ idx: 2 })
  })

  it('«Начать сначала» посреди урока запоминает уже текущий шаг', () => {
    play()
    next()
    next()
    next()
    cleanup()

    play()
    next()
    fireEvent.click(screen.getByRole('button', { name: /начать сначала/i }))
    expect(stepTitle()).toBe('Правило 2')
    expect(readResume(TOKEN, 'a2:L7', 5)).toMatchObject({ idx: 1 })
  })

  it('законченный урок продолжить не предлагает', () => {
    play()
    for (let i = 0; i < 5; i++) next()
    cleanup()

    play()
    expect(screen.queryByText(/из 5/i)).toBeNull()
    expect(stepTitle()).toBe('Правило 1')
  })

  it('без resumeKey плеер ничего не запоминает (каталог, живой урок)', () => {
    play({ resumeKey: undefined })
    next()
    cleanup()
    expect(localStorage.getItem('jts_lesson_resume')).toBeNull()
  })

  it('чужая позиция не всплывает у другого ученика', () => {
    play()
    next()
    next()
    cleanup()

    const other = `h.${btoa(JSON.stringify({ userId: 42 })).replace(/=+$/, '')}.s`
    play({ token: other })
    expect(screen.queryByText(/из 5/i)).toBeNull()
  })
})
