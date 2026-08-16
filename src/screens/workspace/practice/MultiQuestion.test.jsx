// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import MultiQuestion from './MultiQuestion.jsx'
import { gradeQuestion } from '../practiceGrading.js'

const QUESTION = {
  id: 's5-u0',
  type: 'multi',
  prompt: 'Listen. Tick everything you hear.',
  options: ['read', 'cook', 'swim'],
  answers: ['read', 'swim'],
}

function renderQuestion(props = {}) {
  const onAnswer = props.onAnswer ?? vi.fn()
  const result = render(
    <I18nProvider>
      <MultiQuestion
        question={QUESTION}
        answer={null}
        checked={false}
        onAnswer={onAnswer}
        readOnly={false}
        {...props}
      />
    </I18nProvider>,
  )
  return { ...result, onAnswer }
}

describe('MultiQuestion — несколько верных ответов', () => {
  it('копит отмеченные варианты массивом', () => {
    const { onAnswer } = renderQuestion({ answer: ['read'] })
    fireEvent.click(screen.getByRole('button', { name: /swim/ }))
    expect(onAnswer).toHaveBeenCalledWith('s5-u0', ['read', 'swim'])
  })

  it('снимает отметку повторным нажатием', () => {
    const { onAnswer } = renderQuestion({ answer: ['read', 'swim'] })
    fireEvent.click(screen.getByRole('button', { name: /read/ }))
    expect(onAnswer).toHaveBeenCalledWith('s5-u0', ['swim'])
  })

  it('после проверки показывает и пропущенное верное, и лишнее выбранное', () => {
    const { container } = renderQuestion({ answer: ['cook'], checked: true })
    const byLabel = Object.fromEntries(
      [...container.querySelectorAll('.lw-opt')].map((el) => [el.textContent.replace(/[^a-z]/g, ''), el.className]),
    )
    expect(byLabel.read).toContain('is-ok')
    expect(byLabel.swim).toContain('is-ok')
    expect(byLabel.cook).toContain('is-no')
  })

  it('не даёт менять ответ после проверки', () => {
    const { onAnswer } = renderQuestion({ checked: true })
    fireEvent.click(screen.getByRole('button', { name: /read/ }))
    expect(onAnswer).not.toHaveBeenCalled()
  })

  it('смотрящему преподавателю отмечать нечем', () => {
    const { onAnswer } = renderQuestion({ readOnly: true })
    fireEvent.click(screen.getByRole('button', { name: /cook/ }))
    expect(onAnswer).not.toHaveBeenCalled()
  })
})

describe('gradeQuestion — несколько верных ответов', () => {
  it('засчитывает только полный набор без лишнего', () => {
    expect(gradeQuestion(QUESTION, ['read', 'swim']).correct).toBe(true)
    expect(gradeQuestion(QUESTION, ['swim', 'read']).correct).toBe(true)
  })

  it('не засчитывает неполный ответ', () => {
    expect(gradeQuestion(QUESTION, ['read']).correct).toBe(false)
  })

  it('не засчитывает ответ с лишним вариантом', () => {
    expect(gradeQuestion(QUESTION, ['read', 'swim', 'cook']).correct).toBe(false)
  })

  it('не засчитывает пустой ответ', () => {
    expect(gradeQuestion(QUESTION, []).correct).toBe(false)
    expect(gradeQuestion(QUESTION, null).correct).toBe(false)
  })
})
