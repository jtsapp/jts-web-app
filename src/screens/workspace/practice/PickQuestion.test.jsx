// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import PickQuestion, { isCompactPick } from './PickQuestion.jsx'
import PracticeBlock from '../blocks/PracticeBlock.jsx'

const QUESTION = { id: 'q1', type: 'pick', prompt: '☕ coffee', options: ['👍', '👎'] }

function show(props = {}) {
  const onAnswer = props.onAnswer ?? vi.fn()
  const result = render(
    <I18nProvider>
      <PickQuestion question={QUESTION} answer={null} checked={false} onAnswer={onAnswer} readOnly={false} {...props} />
    </I18nProvider>,
  )
  return { ...result, onAnswer }
}

describe('isCompactPick', () => {
  it('emoji и короткие слова — строка', () => {
    expect(isCompactPick(['👍', '👎'])).toBe(true)
    expect(isCompactPick(['часто', 'редко'])).toBe(true)
  })

  it('фразы warm-up — столбик, иначе текст сыплется по букве', () => {
    expect(isCompactPick([
      'they say nothing at all',
      'they finish your sentences for you',
      'they look at their phone',
      'they interrupt with their own story',
    ])).toBe(false)
  })
})

describe('опрос про себя', () => {
  it('сам подпись не рисует — её ставит карточка упражнения', () => {
    // Пунктов в опросе десяток, правило одно: подпись под каждым и прятала
    // вопросы, и ломала строку «слово — кнопки» надвое.
    const { container } = show()
    expect(container.querySelector('.lw-pick__hint')).toBeNull()
  })

  it('короткие ответы рисуются строкой', () => {
    const { container } = show()
    expect(container.querySelector('.lw-q--pick-row')).toBeTruthy()
  })

  it('длинные фразы — столбиком, без row-модификатора', () => {
    const { container } = show({
      question: {
        id: 'warm',
        type: 'pick',
        prompt: 'Which of these makes you stop telling a story?',
        options: [
          'they say nothing at all',
          'they finish your sentences for you',
          'they look at their phone',
          'they interrupt with their own story',
        ],
      },
    })
    expect(container.querySelector('.lw-q--pick')).toBeTruthy()
    expect(container.querySelector('.lw-q--pick-row')).toBeNull()
    expect(container.querySelector('.lw-q__media')).toBeTruthy()
  })

  it('выбор уходит наверх', () => {
    const { getByText, onAnswer } = show()
    fireEvent.click(getByText('👍'))
    expect(onAnswer).toHaveBeenCalledWith('q1', '👍')
  })

  it('после проверки выбор не меняется', () => {
    const { getByText, onAnswer } = show({ checked: true })
    fireEvent.click(getByText('👍'))
    expect(onAnswer).not.toHaveBeenCalled()
  })
})

describe('подпись опроса в карточке упражнения', () => {
  const block = {
    title: 'Warm-up',
    questions: [
      { id: 'q1', type: 'pick', prompt: '☕ coffee', options: ['👍', '👎'] },
      { id: 'q2', type: 'pick', prompt: '🎵 music', options: ['👍', '👎'] },
      { id: 'q3', type: 'pick', prompt: '🍕 pizza', options: ['👍', '👎'] },
    ],
  }

  function drawBlock(b) {
    return render(
      <I18nProvider>
        <PracticeBlock block={b} answers={{}} checked={false} onAnswer={() => {}} onCheck={() => {}} readOnly={false} />
      </I18nProvider>,
    )
  }

  it('объясняется один раз на всё упражнение, а не под каждым пунктом', () => {
    const { container } = drawBlock(block)
    expect(container.querySelectorAll('.lw-pick__hint')).toHaveLength(1)
    expect(container.querySelectorAll('.lw-q--pick')).toHaveLength(3)
  })

  it('у упражнения без опроса подписи нет вовсе', () => {
    const { container } = drawBlock({
      title: 'Grammar',
      questions: [{ id: 'c1', type: 'choice', prompt: 'A?', options: ['a', 'b'], answer: 'a' }],
    })
    expect(container.querySelector('.lw-pick__hint')).toBeNull()
  })

  it('подпись стоит перед вопросами, а не после них', () => {
    // Правило читают до того, как отвечать, — иначе оно объясняет задним числом.
    const { container } = drawBlock(block)
    const hint = container.querySelector('.lw-pick__hint')
    const list = container.querySelector('.lw-practice__list')
    expect(hint.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
