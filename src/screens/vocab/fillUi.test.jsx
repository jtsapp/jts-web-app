// @vitest-environment jsdom
//
// Набор слова по буквам — то самое задание, про которое пришло «словарь пишет
// ошибка, хоть и верно» (жалоба преподавателя 17.09.2026, раскладка английская).

import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { I18nProvider, useI18n } from '../../i18n.jsx'
import { FillUI } from './VocabPractice.jsx'

const WORD = { key: 'pleasant', word: 'pleasant', translationRu: 'приятный', example: 'It is our most pleasant season.' }

function Harness({ word = WORD, sentence = 'It is our most ________ season.', onDone }) {
  const { t } = useI18n()
  return (
    <FillUI
      word={word}
      sentence={sentence}
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

  // Половина каталога — фразы. Прочерк под пробелом выглядел как ещё одна
  // буква: ученик набирал верное «look at», а «Проверить» оставалась серой.
  it('во фразе ячейки только под буквы — пробел и апостроф стоят готовыми', () => {
    const word = { key: 'dont-like', word: 'don’t like', translationRu: 'не нравится' }
    const { container } = render(
      <I18nProvider><Harness word={word} sentence="I ________ fish." onDone={() => {}} /></I18nProvider>,
    )

    expect(boxes(container)).toHaveLength(8) // d o n t l i k e
    напечатать(container, 'dontlike')
    fireEvent.click(screen.getByRole('button', { name: /Проверить|Check/i }))

    expect(boxes(container).every((i) => i.className.includes('ok'))).toBe(true)
  })

  it('фраза набирается подряд: курсор перепрыгивает через пробел', () => {
    const word = { key: 'look-at', word: 'look at', translationRu: 'смотреть на' }
    const { container } = render(
      <I18nProvider><Harness word={word} sentence="________ the board." onDone={() => {}} /></I18nProvider>,
    )
    const inputs = boxes(container)

    fireEvent.change(inputs[3], { target: { value: 'k' } }) // последняя буква look

    expect(document.activeElement).toBe(inputs[4]) // первая буква at
  })

  // Курсор уезжает вперёд сам — значит, и назад его нужно уметь вернуть без
  // мыши, иначе опечатку не исправить.
  it('Backspace в пустой ячейке возвращает на предыдущую и стирает её', () => {
    const { container } = render(<I18nProvider><Harness onDone={() => {}} /></I18nProvider>)
    const inputs = boxes(container)

    fireEvent.change(inputs[1], { target: { value: 'x' } })
    fireEvent.keyDown(inputs[2], { key: 'Backspace' })

    expect(document.activeElement).toBe(inputs[1])
    expect(inputs[1].value).toBe('')
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

// Каждый неверный «Проверить» открывает букву, а открытая буква при проверке
// считается верной. Слово в итоге собиралось подсказками и уходило «Верно» —
// в изученные и прочь из «хуже всего запомненных». Подсказка сверх первой
// буквы теперь означает ошибку, хоть буквы на экране и сошлись.
describe('FillUI — слово, собранное подсказками, не засчитывается', () => {
  const WORD2 = { key: 'go', word: 'go', translationRu: 'идти', example: 'I ___ home.' }
  const check = () => fireEvent.click(screen.getByRole('button', { name: /Проверить|Check/i }))
  const cont = () => fireEvent.click(screen.getByRole('button', { name: /Продолжить|Continue/i }))

  it('чепуха + «Проверить» дважды → ошибка, а не «Верно»', () => {
    const onDone = vi.fn()
    const { container } = render(<I18nProvider><Harness word={WORD2} sentence="I ________ home." onDone={onDone} /></I18nProvider>)

    fireEvent.change(boxes(container)[1], { target: { value: 'x' } })
    check() // неверно → открыта «o»
    check() // все буквы — подсказки
    cont()

    expect(onDone).toHaveBeenCalledWith([{ key: 'go', ok: false }])
    expect(screen.queryByText(/^\s*Верно/)).toBeNull()
  })

  it('только «Открыть букву» до конца → ошибка', () => {
    const onDone = vi.fn()
    render(<I18nProvider><Harness onDone={onDone} /></I18nProvider>)

    const open = screen.getByRole('button', { name: /Открыть букву|Reveal/i })
    for (let i = 0; i < 8; i++) fireEvent.click(open)
    check()
    cont()

    expect(onDone).toHaveBeenCalledWith([{ key: 'pleasant', ok: false }])
  })

  it('без подсказок сверх первой буквы — по-прежнему верно', () => {
    const onDone = vi.fn()
    const { container } = render(<I18nProvider><Harness onDone={onDone} /></I18nProvider>)

    напечатать(container, 'pleasant')
    check()
    cont()

    expect(onDone).toHaveBeenCalledWith([{ key: 'pleasant', ok: true }])
  })
})
