// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import PickQuestion from './PickQuestion.jsx'

const QUESTION = { id: 'q1', type: 'pick', prompt: '☕ coffee', options: ['👍', '👎'] }

function show(props = {}) {
  const onAnswer = props.onAnswer ?? vi.fn()
  const result = render(
    <I18nProvider>
      <PickQuestion
        question={QUESTION}
        answer={props.answer ?? null}
        checked={false}
        onAnswer={onAnswer}
        readOnly={false}
        {...props}
      />
    </I18nProvider>,
  )
  return { ...result, onAnswer }
}

describe('опрос про себя', () => {
  it('по умолчанию объясняет, что верного ответа нет', () => {
    const { container } = show()
    expect(container.querySelector('.lw-pick__hint')).toBeTruthy()
  })

  it('с showHint=false подпись не рисует', () => {
    // В разминке таких пунктов семь подряд, и правило одно на всё упражнение:
    // семь одинаковых строк прячут сами вопросы. Родитель оставляет подпись
    // только у первого пункта.
    const { container } = show({ showHint: false })
    expect(container.querySelector('.lw-pick__hint')).toBeNull()
  })

  it('выбор по-прежнему уходит наверх', () => {
    const { getByText, onAnswer } = show({ showHint: false })
    fireEvent.click(getByText('👍'))
    expect(onAnswer).toHaveBeenCalledWith('q1', '👍')
  })
})
