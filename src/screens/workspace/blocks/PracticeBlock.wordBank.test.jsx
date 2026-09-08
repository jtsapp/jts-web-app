// @vitest-environment jsdom
//
// Слово из банка кладётся в пропуск — на стороне УЧЕНИКА.
//
// Регрессия: задание «вставь слово из словаря» экстрактор разрывает пополам —
// банк остаётся в html блока, а предложения становятся отдельными gap-вопросами.
// Движок bindWordBank к этой разметке не цепляется: он ищет .wbank/.wchip и
// input.gap, а тут .bank/.bw и React-инпуты. Поэтому слова банка не делали
// ничего, и ученик мог заполнить пропуск только руками с клавиатуры.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import PracticeBlock from './PracticeBlock.jsx'

const пропуск = (id, before) => ({
  id, type: 'gap', gapBefore: before, gapAfter: '.', answers: ['communication'],
})

const БЛОК = {
  type: 'practice',
  title: 'Complete each sentence',
  html: '<div class="bank"><span class="bw">communication</span><span class="bw">meet</span></div>',
  questions: [пропуск('g1', 'The internet has improved '), пропуск('g2', 'How many friends have you ')],
}

function renderBlock(props = {}) {
  return render(
    <I18nProvider>
      <PracticeBlock block={БЛОК} answers={{}} checked={false} onAnswer={() => {}} {...props} />
    </I18nProvider>
  )
}

const чип = (container, word) =>
  [...container.querySelectorAll('.bw')].find((e) => e.textContent === word)

describe('PracticeBlock — банк слов кладётся в пропуск у ученика', () => {
  beforeEach(() => vi.clearAllMocks())

  it('без выбранного пропуска слово уходит в первый пустой', () => {
    const onAnswer = vi.fn()
    const { container } = renderBlock({ onAnswer })

    fireEvent.click(чип(container, 'communication'))

    expect(onAnswer).toHaveBeenCalledWith('g1', 'communication')
  })

  it('выбранный пропуск важнее порядка', () => {
    const onAnswer = vi.fn()
    const { container } = renderBlock({ onAnswer })

    fireEvent.focus(container.querySelectorAll('input')[1])
    fireEvent.click(чип(container, 'communication'))

    expect(onAnswer).toHaveBeenCalledWith('g2', 'communication')
  })

  it('второе слово уходит в следующий пустой, а не поверх первого', () => {
    const onAnswer = vi.fn()
    const { container } = renderBlock({ onAnswer, answers: { g1: 'communication' } })

    fireEvent.click(чип(container, 'meet'))

    expect(onAnswer).toHaveBeenCalledWith('g2', 'meet')
  })

  // Клик по слову банка — это ответ. Раньше он открывал бы перевод.
  it('перевод по слову банка не открывается', () => {
    const onWord = vi.fn()
    const { container } = renderBlock({ onWord, onAnswer: vi.fn() })

    fireEvent.click(чип(container, 'meet'))

    expect(onWord).not.toHaveBeenCalled()
  })

  it('всё заполнено — ничего не кладём и перевод всё равно не открываем', () => {
    const onAnswer = vi.fn()
    const onWord = vi.fn()
    const { container } = renderBlock({ onAnswer, onWord, answers: { g1: 'communication', g2: 'meet' } })

    fireEvent.click(чип(container, 'meet'))

    expect(onAnswer).not.toHaveBeenCalled()
    expect(onWord).not.toHaveBeenCalled()
  })

  it('закрытая работа банк не слушает', () => {
    const onAnswer = vi.fn()
    const { container } = renderBlock({ onAnswer, readOnly: true })

    fireEvent.click(чип(container, 'communication'))

    expect(onAnswer).not.toHaveBeenCalled()
  })
})
