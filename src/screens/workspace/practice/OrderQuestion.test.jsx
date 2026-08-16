// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import OrderQuestion from './OrderQuestion.jsx'
import { gradeQuestion } from '../practiceGrading.js'

// Курс отдаёт слова перемешанными и держит правильный порядок отдельно —
// именно так их и разбирает экстрактор каталога.
const QUESTION = {
  id: 's3-o0',
  type: 'order',
  words: ['coffee', 'I', 'like'],
  answer: ['I', 'like', 'coffee'],
}

function renderQuestion(props = {}) {
  const onAnswer = props.onAnswer ?? vi.fn()
  const result = render(
    <I18nProvider>
      <OrderQuestion
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

describe('OrderQuestion — сборка предложения', () => {
  it('показывает слова в том порядке, в каком их дал курс, а не в правильном', () => {
    const { container } = renderQuestion()
    const bank = [...container.querySelectorAll('.lw-bank .lw-chip')].map((el) => el.textContent)
    expect(bank).toEqual(['coffee', 'I', 'like'])
  })

  it('добавляет слово в предложение массивом слов', () => {
    const { onAnswer } = renderQuestion()
    fireEvent.click(screen.getByRole('button', { name: 'like' }))
    expect(onAnswer).toHaveBeenCalledWith('s3-o0', ['like'])
  })

  it('убирает слово из банка, когда оно уже в предложении', () => {
    const { container } = renderQuestion({ answer: ['I'] })
    const bank = [...container.querySelectorAll('.lw-bank .lw-chip')].map((el) => el.textContent)
    expect(bank).toEqual(['coffee', 'like'])
  })

  it('возвращает слово в банк по повторному нажатию', () => {
    const { container, onAnswer } = renderQuestion({ answer: ['I', 'like'] })
    const placed = container.querySelectorAll('.lw-chip--placed')
    fireEvent.click(placed[0])
    expect(onAnswer).toHaveBeenCalledWith('s3-o0', ['like'])
  })

  it('убирает из банка ровно одно вхождение повторяющегося слова', () => {
    // «I like coffee, and I like tea» — два одинаковых слова в одном задании.
    const doubled = { ...QUESTION, words: ['I', 'like', 'I'], answer: ['I', 'I', 'like'] }
    const { container } = render(
      <I18nProvider>
        <OrderQuestion
          question={doubled}
          answer={['I']}
          checked={false}
          onAnswer={vi.fn()}
          readOnly={false}
        />
      </I18nProvider>,
    )
    const bank = [...container.querySelectorAll('.lw-bank .lw-chip')].map((el) => el.textContent)
    expect(bank).toEqual(['like', 'I'])
  })

  it('после проверки показывает правильный порядок, если ученик ошибся', () => {
    renderQuestion({ answer: ['like', 'I', 'coffee'], checked: true })
    expect(screen.getByText(/I like coffee/)).toBeTruthy()
  })

  it('не даёт менять ответ, когда шаг уже проверен', () => {
    const { container, onAnswer } = renderQuestion({ answer: ['I'], checked: true })
    fireEvent.click(container.querySelector('.lw-chip--placed'))
    expect(onAnswer).not.toHaveBeenCalled()
  })

  it('смотрящему преподавателю отвечать нечем', () => {
    const { onAnswer } = renderQuestion({ readOnly: true })
    fireEvent.click(screen.getByRole('button', { name: 'like' }))
    expect(onAnswer).not.toHaveBeenCalled()
  })
})

describe('gradeQuestion — порядок слов', () => {
  it('засчитывает только полное совпадение последовательности', () => {
    expect(gradeQuestion(QUESTION, ['I', 'like', 'coffee']).correct).toBe(true)
    expect(gradeQuestion(QUESTION, ['like', 'I', 'coffee']).correct).toBe(false)
  })

  it('не засчитывает недособранное предложение', () => {
    expect(gradeQuestion(QUESTION, ['I', 'like']).correct).toBe(false)
  })

  it('не спотыкается о регистр и точку — задание про порядок, а не про пунктуацию', () => {
    expect(gradeQuestion(QUESTION, ['i', 'like', 'coffee.']).correct).toBe(true)
  })

  it('не засчитывает пустой ответ', () => {
    expect(gradeQuestion(QUESTION, []).correct).toBe(false)
    expect(gradeQuestion(QUESTION, null).correct).toBe(false)
  })
})
