// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import OrderQuestion from './OrderQuestion.jsx'

const QUESTION = {
  id: 'q1',
  type: 'order',
  words: ['how many friends you could really trust', 'falling out with a best friend', 'a short word'],
  answer: ['a short word', 'falling out with a best friend', 'how many friends you could really trust'],
}

function renderOrder(props = {}) {
  return render(
    <I18nProvider>
      <OrderQuestion question={QUESTION} answer={[]} checked={false} onAnswer={() => {}} {...props} />
    </I18nProvider>
  )
}

describe('OrderQuestion — банк слов', () => {
  // Регрессия: взятое слово раньше пряталось через `visibility: hidden`, но
  // держало свою ширину в потоке. У фраз-предложений (а не отдельных слов)
  // несколько таких невидимых, но всё ещё широких плашек подряд отодвигали
  // оставшиеся слова банка в случайные на вид места (см. реальный урок B1,
  // «Are you really my friend?», s5-o0).
  it('взятое слово пропадает из банка совсем, а не остаётся невидимой плашкой', () => {
    const { container } = renderOrder({ answer: ['a short word'] })
    const bankButtons = [...container.querySelectorAll('.lw-order__bank .lw-ochip')]

    expect(bankButtons.map((b) => b.textContent)).toEqual([
      'how many friends you could really trust',
      'falling out with a best friend',
    ])
    expect(container.querySelectorAll('[aria-hidden]').length).toBe(0)
  })

  it('клик по слову банка добавляет его в собранное предложение', () => {
    const onAnswer = vi.fn()
    const { container } = renderOrder({ onAnswer })
    const first = container.querySelector('.lw-order__bank .lw-ochip')
    fireEvent.click(first)
    expect(onAnswer).toHaveBeenCalledWith('q1', ['how many friends you could really trust'])
  })

  it('клик по собранному слову откатывает всё после него — вернувшееся слово встаёт на своё место в банке', () => {
    const onAnswer = vi.fn()
    const { container } = renderOrder({
      answer: ['how many friends you could really trust', 'falling out with a best friend'],
      onAnswer,
    })
    const placed = container.querySelectorAll('.lw-order__sentence .lw-ochip--placed')
    fireEvent.click(placed[0])
    expect(onAnswer).toHaveBeenCalledWith('q1', [])
  })
})
