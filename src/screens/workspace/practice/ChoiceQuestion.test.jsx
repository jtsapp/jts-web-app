// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import ChoiceQuestion from './ChoiceQuestion.jsx'

const QUESTION = {
  id: 'q1',
  type: 'choice',
  prompt: 'A?',
  options: ['a', 'b'],
  answer: 'a',
}

function show(props = {}) {
  const onAnswer = props.onAnswer ?? vi.fn()
  const result = render(
    <I18nProvider>
      <ChoiceQuestion
        question={QUESTION}
        answer={props.answer ?? null}
        checked={props.checked ?? false}
        onAnswer={onAnswer}
        readOnly={false}
      />
    </I18nProvider>,
  )
  return { ...result, onAnswer }
}

describe('ChoiceQuestion — оценка только после «Проверить»', () => {
  it('до проверки выбранный вариант не зелёный и не красный', () => {
    const { container, onAnswer } = show()
    fireEvent.click(container.querySelectorAll('.lw-opt')[0])
    expect(onAnswer).toHaveBeenCalledWith('q1', 'a')

    const { container: after } = show({ answer: 'a' })
    const cls = after.querySelectorAll('.lw-opt')[0].className
    expect(cls).toMatch(/is-selected/)
    expect(cls).not.toMatch(/is-ok/)
    expect(cls).not.toMatch(/is-no/)
    expect(after.querySelectorAll('.lw-opt')[0].disabled).toBe(false)
  })

  it('после проверки ряд закрыт и виден вердикт', () => {
    const { container } = show({ answer: 'b', checked: true })
    const opts = container.querySelectorAll('.lw-opt')
    expect(opts[0].className).toMatch(/is-ok/)
    expect(opts[1].className).toMatch(/is-no/)
    expect(opts[0].disabled).toBe(true)
    expect(opts[1].disabled).toBe(true)
  })
})
