// @vitest-environment jsdom
//
// Набор слова по буквам — то самое задание, про которое пришло «словарь пишет
// ошибка, хоть и верно» (жалоба преподавателя 17.09.2026, раскладка английская).

import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { I18nProvider, useI18n } from '../../i18n.jsx'
import { FillUI } from './VocabPractice.jsx'

const WORD = { key: 'pleasant', word: 'pleasant', translationRu: 'приятный', example: 'It is our most pleasant season.' }

function Harness({ word = WORD, onDone }) {
  const { t } = useI18n()
  return (
    <FillUI
      word={word}
      sentence="It is our most ________ season."
      lang="ru"
      t={t}
      speak={() => {}}
      token={null}
      onDone={onDone}
    />
  )
}

const boxes = (c) => [...c.querySelectorAll('input.vp-letter')]

/** Набрать слово так, как это делает человек: по букве в каждую ячейку. */
function напечатать(container, text) {
  const inputs = boxes(container)
  inputs.forEach((input, i) => {
    if (input.disabled) return          // первая буква открыта подсказкой
    fireEvent.change(input, { target: { value: text[i] } })
  })
}

describe('FillUI — набор слова по буквам', () => {
  it('правильно набранное слово принимается', () => {
    const onDone = vi.fn()
    const { container } = render(<I18nProvider><Harness onDone={onDone} /></I18nProvider>)

    напечатать(container, 'pleasant')
    fireEvent.click(screen.getByRole('button', { name: /Проверить|Check/i }))

    // Верный ответ обязан быть принят: ни «откройте ещё букву», ни «Ошибка».
    expect(container.querySelector('.vp-state')).toBeNull()
    expect(boxes(container).every((i) => i.className.includes('ok'))).toBe(true)
  })

  // Тупик: «Открыть букву» открывает только ПУСТУЮ ячейку. Ячеек пустых нет —
  // кнопка молчит, а «Проверить» продолжает советовать открыть ещё букву.
  // Выхода из этого состояния, кроме «Не помню», нет.
  it('ошибся при всех заполненных — экран даёт выход, а не совет открыть букву', () => {
    const onDone = vi.fn()
    const { container } = render(<I18nProvider><Harness onDone={onDone} /></I18nProvider>)

    напечатать(container, 'plaesant')   // две буквы переставлены местами
    fireEvent.click(screen.getByRole('button', { name: /Проверить|Check/i }))

    const подсказка = container.querySelector('.vp-state')?.textContent || ''
    const заполнены = boxes(container).every((i) => i.value)
    // Либо честный вердикт, либо реально открытая буква — но не совет,
    // которому невозможно последовать.
    expect(заполнены && /букв/i.test(подсказка)).toBe(false)
  })

  // Курсор обязан сам ехать дальше: иначе после каждой буквы надо мышью
  // попадать в следующий прочерк.
  it('после введённой буквы фокус переходит на следующую ячейку', () => {
    const { container } = render(<I18nProvider><Harness onDone={() => {}} /></I18nProvider>)
    const inputs = boxes(container)

    fireEvent.change(inputs[1], { target: { value: 'l' } })

    expect(document.activeElement).toBe(inputs[2])
  })

  // Раскладка бывает русской, и «е» от «e» на экране неотличима. Отказывать за
  // это — наказывать за раскладку, а не за незнание слова.
  it('кириллические двойники латиницы принимаются', () => {
    const { container } = render(<I18nProvider><Harness onDone={() => {}} /></I18nProvider>)

    напечатать(container, 'pl\u0435\u0430sant')   // е и а — кириллические
    fireEvent.click(screen.getByRole('button', { name: /Проверить|Check/i }))

    expect(boxes(container).every((i) => i.className.includes('ok'))).toBe(true)
  })

  // Само слово из букв не собрать — «Не помню» остаётся честным выходом и
  // по-прежнему ставит ошибку. Проверяем, что мы его не сломали.
  it('«Не помню» показывает слово и засчитывает ошибку', () => {
    const onDone = vi.fn()
    const { container } = render(<I18nProvider><Harness onDone={onDone} /></I18nProvider>)

    fireEvent.click(screen.getByRole('button', { name: /Не помню|remember/i }))

    expect(boxes(container).map((i) => i.value).join('')).toBe('pleasant')
    expect(boxes(container).every((i) => i.className.includes('no'))).toBe(true)
  })
})
