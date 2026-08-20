// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import GapQuestion from './GapQuestion.jsx'

const keyed = { id: 'q1', type: 'gap', gapBefore: 'I', gapAfter: 'coffee.', answers: ['like', 'love'] }
const open = { id: 'q2', type: 'gap', gapBefore: 'Write about your day:', gapAfter: '', open: true }

function show(question, props = {}) {
  return render(
    <I18nProvider>
      <GapQuestion question={question} answer="" checked={false} onAnswer={() => {}} {...props} />
    </I18nProvider>
  )
}

describe('GapQuestion: проверка по эталону', () => {
  it('верный ответ отмечается верным', () => {
    const { container } = show(keyed, { answer: 'like', checked: true })

    expect(container.querySelector('.lw-gap-input.is-correct')).not.toBeNull()
  })

  it('неверный ответ отмечается неверным и показывает эталон', () => {
    const { container } = show(keyed, { answer: 'drink', checked: true })

    expect(container.querySelector('.lw-gap-input.is-wrong')).not.toBeNull()
    expect(screen.getByText(/like \/ love/)).toBeTruthy()
  })
})

describe('GapQuestion: свободный пропуск', () => {
  it('любой набор букв не выдаётся за верный ответ', () => {
    const { container } = show(open, { answer: 'ljbefvj', checked: true })

    // Ни зелёного поля, ни галочки: сверять было не с чем.
    expect(container.querySelector('.lw-gap-input.is-correct')).toBeNull()
    expect(container.querySelector('.lw-gap-input__check')).toBeNull()
    expect(container.querySelector('.lw-gap-input.is-accepted')).not.toBeNull()
  })

  it('но и неверным его не объявляют — ответ принят', () => {
    const { container } = show(open, { answer: 'ljbefvj', checked: true })

    expect(container.querySelector('.lw-gap-input.is-wrong')).toBeNull()
    expect(screen.getByText(/проверит преподаватель/i)).toBeTruthy()
  })

  it('до проверки поле обычное', () => {
    const { container } = show(open, { answer: 'что-то', checked: false })

    expect(container.querySelector('.lw-gap-input.is-accepted')).toBeNull()
  })
})
