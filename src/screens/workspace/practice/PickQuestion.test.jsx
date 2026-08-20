// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import PickQuestion from './PickQuestion.jsx'

function show(question, props = {}) {
  return render(
    <I18nProvider>
      <PickQuestion question={question} answer={null} onAnswer={() => {}} {...props} />
    </I18nProvider>
  )
}

describe('PickQuestion', () => {
  it('вариант «картинка + слово» — карточка с картинкой над словом', () => {
    const { container } = show({ id: 'q1', type: 'pick', prompt: 'Что нравится?', options: ['☕️ Coffee', '📅 Mondays'] })

    expect(container.querySelectorAll('.lw-opt--card')).toHaveLength(2)
    expect(container.querySelector('.lw-opt__emoji').textContent).toBe('☕️')
    expect(screen.getByText('Coffee')).toBeTruthy()
  })

  it('пункт с картинкой в формулировке сам становится карточкой, оценка внутри', () => {
    const { container } = show({ id: 'q2', type: 'pick', prompt: '☕ coffee', options: ['👍', '👎'] })

    expect(container.querySelector('.lw-q--pick-card')).not.toBeNull()
    expect(container.querySelector('.lw-pick__item').textContent).toBe('☕coffee')
    // Оценка осталась пилюлями: карточка во всю колонку под один значок бессмысленна.
    expect(container.querySelector('.lw-opt--card')).toBeNull()
    expect(screen.getByText('👍')).toBeTruthy()
  })

  it('опрос без картинок остаётся прежним списком', () => {
    const { container } = show({ id: 'q3', type: 'pick', prompt: 'Как часто?', options: ['Часто', 'Редко'] })

    expect(container.querySelector('.lw-opts--cards')).toBeNull()
    expect(container.querySelector('.lw-q--pick-card')).toBeNull()
    expect(screen.getByText('Часто')).toBeTruthy()
  })
})
