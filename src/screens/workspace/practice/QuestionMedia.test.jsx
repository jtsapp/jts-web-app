// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'

import ChoiceQuestion from './ChoiceQuestion.jsx'
import MultiQuestion from './MultiQuestion.jsx'
import PickQuestion from './PickQuestion.jsx'
import GapQuestion from './GapQuestion.jsx'
import OrderQuestion from './OrderQuestion.jsx'
import MatchQuestion from './MatchQuestion.jsx'
import ChipsQuestion from './ChipsQuestion.jsx'
import QuestionMedia from './QuestionMedia.jsx'

const speak = vi.fn()
vi.mock('../../../practice/vocab/audio.js', () => ({
  speak: (...args) => speak(...args),
}))

function show(Component, question) {
  return render(
    <I18nProvider>
      <Component question={question} answer={null} checked={false} onAnswer={() => {}} readOnly={false} />
    </I18nProvider>,
  )
}

// Картинка и звук лежат в снимке вопроса и приезжают одинаково у всех типов —
// добавляем их к минимальной валидной форме каждого.
const MEDIA = { imageUrl: 'data:image/png;base64,AAA', say: 'mother' }
const ТИПЫ = [
  ['выбор варианта', ChoiceQuestion, { id: 'q1', type: 'choice', options: ['a', 'b'], answer: 'a', ...MEDIA }],
  ['несколько верных', MultiQuestion, { id: 'q2', type: 'multi', options: ['a', 'b'], answers: ['a'], ...MEDIA }],
  ['опрос о себе', PickQuestion, { id: 'q3', type: 'pick', options: ['да', 'нет'], ...MEDIA }],
  ['пропуск', GapQuestion, { id: 'q4', type: 'gap', gapBefore: 'I', gapAfter: 'coffee.', answers: ['like'], ...MEDIA }],
  ['порядок слов', OrderQuestion, { id: 'q5', type: 'order', words: ['I', 'like'], answer: ['I', 'like'], ...MEDIA }],
  ['соединение пар', MatchQuestion, { id: 'q6', type: 'match', pairs: [{ left: 'a', right: 'b' }], ...MEDIA }],
  ['слово из частей', ChipsQuestion, {
    id: 'q7', type: 'chips', gapBefore: 'I', gapAfter: 'coffee.', bank: ['like', 'likes'], answer: 'like', ...MEDIA,
  }],
]

describe('Картинка и звук есть у каждого типа задания', () => {
  beforeEach(() => speak.mockClear())

  // Живая поломка: картинку и 🔊 рисовал только выбор варианта. Вопрос
  // «отметь всё, что услышал» приходил без кнопки, а пропуск с картинкой — без
  // картинки: ответить нечем, и что именно скрыли, ученику не видно.
  ТИПЫ.forEach(([название, Component, question]) => {
    it(`${название}: показывает картинку и кнопку прослушивания`, () => {
      const { container } = show(Component, question)

      expect(container.querySelector('.lw-q__img')).toBeTruthy()
      expect(container.querySelector('.lw-q__img').getAttribute('src')).toBe(MEDIA.imageUrl)
      expect(container.querySelector('.lw-say')).toBeTruthy()
    })
  })

  it('кнопка произносит именно то, что лежит в say', () => {
    const { container } = show(ChoiceQuestion, ТИПЫ[0][2])

    fireEvent.click(container.querySelector('.lw-say'))

    expect(speak).toHaveBeenCalledWith('mother')
  })
})

describe('QuestionMedia — что показывает и чего не показывает', () => {
  const render1 = (question) => render(
    <I18nProvider>
      <QuestionMedia question={question} />
    </I18nProvider>,
  )

  it('без картинки и звука не рисует ничего', () => {
    const { container } = render1({ id: 'q1', type: 'gap' })
    expect(container.innerHTML).toBe('')
  })

  /* Картинка — содержание вопроса, а не украшение: пустой alt объявил бы её
     декоративной, и для незрячего ученика задание исчезло бы совсем. */
  it('подписывает картинку формулировкой', () => {
    const { container } = render1({ id: 'q2', type: 'choice', prompt: 'Что на картинке?', imageUrl: MEDIA.imageUrl })
    expect(container.querySelector('.lw-q__img').getAttribute('alt')).toBe('Что на картинке?')
  })

  it('без формулировки подпись всё равно есть', () => {
    const { container } = render1({ id: 'q3', type: 'choice', imageUrl: MEDIA.imageUrl })
    expect(container.querySelector('.lw-q__img').getAttribute('alt')).toBeTruthy()
  })

  it('на пустом вопросе не падает', () => {
    const { container } = render1(null)
    expect(container.innerHTML).toBe('')
  })
})
