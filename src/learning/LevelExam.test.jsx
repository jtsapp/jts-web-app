// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import LevelExam from './LevelExam.jsx'

// Экзамен в миниатюре: по вопросу на навык плюс пропуск в диалоге — все виды
// заданий настоящего экзамена, но ответить на всё можно в пять кликов.
// Порог 4 из 5: одна ошибка — сдал, две — нет.
const EXAM = {
  level: 'a1',
  version: 't1',
  total: 5,
  pass: 4,
  sections: [
    {
      key: 'grammar',
      dialogue: {
        intro: 'Complete the chat.',
        lines: [{ sp: 'A', parts: ['Where ', { gap: 0 }, ' you?'] }],
        gaps: [{ id: 'gd1', options: ['was', 'were', 'are'], answer: 1 }],
      },
      questions: [{ id: 'g1', prompt: 'She ___ tea.', options: ['like', 'likes', 'liking'], answer: 1 }],
    },
    { key: 'vocabulary', questions: [{ id: 'v1', prompt: 'A teacher ___.', options: ['teaches', 'cooks', 'drives'], answer: 0 }] },
    {
      key: 'reading',
      passages: [
        {
          id: 'r1',
          title: 'Text A',
          text: ['Lucia is a nurse from Brazil.'],
          questions: [{ id: 'r1q1', prompt: 'Lucia is from Brazil.', options: ['True', 'False'], answer: 0, tf: true }],
        },
      ],
    },
    {
      key: 'listening',
      passages: [
        {
          id: 'l1',
          audio: 'x.mp3',
          lines: [{ sp: 'J', t: 'I can swim really well.' }],
          questions: [{ id: 'l1q1', prompt: 'Jack can swim ___.', options: ['badly', 'well', 'a little'], answer: 1 }],
        },
      ],
    },
  ],
  tips: {
    grammar: { en: 'G', ru: 'Совет по грамматике', kk: 'G-kk' },
    vocabulary: { en: 'V', ru: 'Совет по словам', kk: 'V-kk' },
    reading: { en: 'R', ru: 'Совет по чтению', kk: 'R-kk' },
    listening: { en: 'L', ru: 'Совет по аудированию', kk: 'L-kk' },
  },
}

const RIGHT = { gd1: 1, g1: 1, v1: 0, r1q1: 0, l1q1: 1 }
const TOKEN = `h.${btoa(JSON.stringify({ userId: 7 }))}.s`

function renderExam(props = {}) {
  const handlers = { onExit: vi.fn(), onPassed: vi.fn() }
  const view = render(
    <I18nProvider>
      <LevelExam exam={EXAM} level="A1" token={TOKEN} {...handlers} {...props} />
    </I18nProvider>,
  )
  return { ...view, ...handlers }
}

// Ответ исходным индексом варианта: порядок на экране перемешан, поэтому ищем
// кнопку по data-opt, а не по месту.
function answer(container, id, idx) {
  const select = container.querySelector(`select[data-qid="${id}"]`)
  if (select) fireEvent.change(select, { target: { value: String(idx) } })
  else fireEvent.click(container.querySelector(`[data-qid="${id}"] [data-opt="${idx}"]`))
}

function answerAll(container, answers) {
  for (const [id, idx] of Object.entries(answers)) answer(container, id, idx)
}

const finishButton = (container) => container.querySelector('.ex-finish')

describe('LevelExam', () => {
  beforeEach(() => {
    localStorage.clear()
    // jsdom не умеет прокрутку и сыплет «Not implemented» в вывод.
    window.scrollTo = vi.fn()
  })

  it('«Завершить» ждёт ответа на все вопросы', () => {
    const { container } = renderExam()
    expect(finishButton(container).disabled).toBe(true)
    expect(finishButton(container).textContent).toBe('Осталось ответить: 5')
    answerAll(container, { gd1: 1, g1: 1, v1: 0, r1q1: 0 })
    expect(screen.getByText('Отвечено 4 из 5')).toBeTruthy()
    expect(finishButton(container).disabled).toBe(true)
    answer(container, 'l1q1', 1)
    expect(finishButton(container).disabled).toBe(false)
    expect(finishButton(container).textContent).toBe('Завершить экзамен')
  })

  it('до конца ничего не подсвечивается как верное или неверное', () => {
    const { container } = renderExam()
    answer(container, 'g1', 0)
    const picked = container.querySelector('[data-qid="g1"] [data-opt="0"]')
    expect(picked.className).toContain('is-sel')
    expect(container.querySelector('.is-right, .is-wrong')).toBe(null)
  })

  it('сдал: итоги, монеты по 10 за верный ответ, черновик стёрт', () => {
    const { container, onPassed } = renderExam()
    answerAll(container, RIGHT)
    expect(localStorage.getItem('jts_level_exam')).toBeTruthy()
    fireEvent.click(finishButton(container))
    expect(screen.getByText('Экзамен сдан!')).toBeTruthy()
    expect(container.querySelector('.ex-res__score b').textContent).toBe('5')
    expect(screen.getByText('Все навыки на уровне')).toBeTruthy()
    expect(onPassed).toHaveBeenCalledWith(50)
    expect(localStorage.getItem('jts_level_exam')).toBe(null)
  })

  it('не сдал: советы только по проседающим навыкам, зачёта нет', () => {
    const { container, onPassed } = renderExam()
    answerAll(container, { ...RIGHT, gd1: 0, l1q1: 2 })
    fireEvent.click(finishButton(container))
    expect(screen.getByText('Пока не хватает баллов')).toBeTruthy()
    expect(container.querySelector('.ex-res__score b').textContent).toBe('3')
    const tips = container.querySelector('.ex-tips').textContent
    expect(tips).toContain('Совет по грамматике')
    expect(tips).toContain('Совет по аудированию')
    expect(tips).not.toContain('Совет по словам')
    expect(onPassed).not.toHaveBeenCalled()
  })

  it('разбор: верное зелёным, свой промах красным, у пропуска — верный ответ, стенограмма видна', () => {
    const { container } = renderExam()
    expect(screen.queryByText('I can swim really well.')).toBe(null)
    answerAll(container, { ...RIGHT, gd1: 0, l1q1: 2 })
    fireEvent.click(finishButton(container))
    fireEvent.click(screen.getByText('Посмотреть ответы'))

    expect(container.querySelector('[data-qid="l1q1"] [data-opt="1"]').className).toContain('is-right')
    expect(container.querySelector('[data-qid="l1q1"] [data-opt="2"]').className).toContain('is-wrong')
    expect(container.querySelector('[data-qid="l1q1"]').className).toContain('is-wrong')
    expect(container.querySelector('[data-qid="g1"]').className).toContain('is-right')
    expect(container.querySelector('select[data-qid="gd1"]').className).toContain('is-wrong')
    expect(container.querySelector('.ex-gap__key').textContent).toBe('were')
    expect(screen.getByText('I can swim really well.')).toBeTruthy()
    // В разборе ответы не меняются.
    fireEvent.click(container.querySelector('[data-qid="l1q1"] [data-opt="1"]'))
    expect(container.querySelector('[data-qid="l1q1"] [data-opt="2"]').className).toContain('is-wrong')

    fireEvent.click(screen.getByText('К итогам'))
    expect(screen.getByText('Пока не хватает баллов')).toBeTruthy()
  })

  it('черновик переживает перемонтирование, «Пройти снова» начинает с чистого листа', () => {
    const first = renderExam()
    answerAll(first.container, { gd1: 1, v1: 0 })
    first.unmount()

    const second = renderExam()
    expect(screen.getByText('Ответы с прошлого раза сохранены — можно продолжать.')).toBeTruthy()
    expect(second.container.querySelector('[data-qid="v1"] [data-opt="0"]').className).toContain('is-sel')
    expect(second.container.querySelector('select[data-qid="gd1"]').value).toBe('1')
    answerAll(second.container, RIGHT)
    fireEvent.click(finishButton(second.container))
    fireEvent.click(screen.getByText('Пройти снова'))
    expect(finishButton(second.container).textContent).toBe('Осталось ответить: 5')
    expect(screen.queryByText('Ответы с прошлого раза сохранены — можно продолжать.')).toBe(null)
    second.unmount()

    renderExam()
    expect(screen.queryByText('Ответы с прошлого раза сохранены — можно продолжать.')).toBe(null)
  })

  it('выход: без ответов и с итогов — сразу, посреди экзамена — с переспросом', () => {
    const { container, onExit } = renderExam()
    const exit = () => fireEvent.click(container.querySelector('.cp-bar__exit'))
    exit()
    expect(onExit).toHaveBeenLastCalledWith(true)
    answer(container, 'g1', 1)
    exit()
    expect(onExit).toHaveBeenLastCalledWith(false)
    answerAll(container, RIGHT)
    fireEvent.click(finishButton(container))
    fireEvent.click(screen.getByText('К урокам уровня'))
    expect(onExit).toHaveBeenLastCalledWith(true)
  })

  it('отказ бэкенда в зачёте виден на итогах', () => {
    const { container } = renderExam({ restricted: true })
    answerAll(container, RIGHT)
    fireEvent.click(finishButton(container))
    expect(container.querySelector('.le-restricted')).toBeTruthy()
  })
})
