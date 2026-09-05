// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import PickQuestion from './PickQuestion.jsx'
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

describe('опрос про себя', () => {
  it('сам подпись не рисует — её ставит карточка упражнения', () => {
    // Пунктов в опросе десяток, правило одно: подпись под каждым и прятала
    // вопросы, и ломала строку «слово — кнопки» надвое.
    const { container } = show()
    expect(container.querySelector('.lw-pick__hint')).toBeNull()
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
