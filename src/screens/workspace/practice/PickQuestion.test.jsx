// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import PickQuestion from './PickQuestion.jsx'
import { gradeQuestion } from '../practiceGrading.js'

const QUESTION = {
  id: 's1-p0',
  type: 'pick',
  prompt: '☕ coffee',
  options: ['👍', '👎'],
}

function renderQuestion(props = {}) {
  const onAnswer = props.onAnswer ?? vi.fn()
  const result = render(
    <I18nProvider>
      <PickQuestion
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

describe('PickQuestion — опрос про себя', () => {
  it('запоминает выбор', () => {
    const { onAnswer } = renderQuestion()
    fireEvent.click(screen.getByRole('button', { name: '👍' }))
    expect(onAnswer).toHaveBeenCalledWith('s1-p0', '👍')
  })

  it('после проверки ничего не помечает верным или неверным — сравнивать не с чем', () => {
    const { container } = renderQuestion({ answer: '👎', checked: true })
    expect(container.querySelector('.is-ok')).toBeNull()
    expect(container.querySelector('.is-no')).toBeNull()
    expect(container.querySelector('.is-selected')).not.toBeNull()
  })

  it('смотрящему преподавателю выбирать нечем', () => {
    const { onAnswer } = renderQuestion({ readOnly: true })
    fireEvent.click(screen.getByRole('button', { name: '👍' }))
    expect(onAnswer).not.toHaveBeenCalled()
  })
})

describe('gradeQuestion — опрос про себя', () => {
  it('засчитывает любой сделанный выбор', () => {
    expect(gradeQuestion(QUESTION, '👍').correct).toBe(true)
    expect(gradeQuestion(QUESTION, '👎').correct).toBe(true)
  })

  it('не засчитывает отсутствие выбора — иначе шаг считался бы пройденным сам собой', () => {
    expect(gradeQuestion(QUESTION, '').correct).toBe(false)
    expect(gradeQuestion(QUESTION, null).correct).toBe(false)
  })
})

describe('PickQuestion — «выбери сколько хочешь»', () => {
  const MANY = { ...QUESTION, id: 's4-p1', multiple: true, options: ['fresh air', 'meeting people'] }

  it('копит несколько отметок', () => {
    const onAnswer = vi.fn()
    render(
      <I18nProvider>
        <PickQuestion question={MANY} answer={['fresh air']} checked={false} onAnswer={onAnswer} />
      </I18nProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'meeting people' }))
    expect(onAnswer).toHaveBeenCalledWith('s4-p1', ['fresh air', 'meeting people'])
  })

  it('засчитывается за любую непустую отметку', () => {
    expect(gradeQuestion(MANY, ['fresh air']).correct).toBe(true)
    expect(gradeQuestion(MANY, []).correct).toBe(false)
  })
})
