// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import PickQuestion from './PickQuestion.jsx'

const withEmoji = { id: 'q1', type: 'pick', prompt: 'Что нравится?', options: ['☕️ Coffee', '📅 Mondays'] }

function show(question, props = {}) {
  return render(
    <I18nProvider>
      <PickQuestion question={question} answer={null} onAnswer={() => {}} {...props} />
    </I18nProvider>
  )
}

describe('PickQuestion', () => {
  it('без просьбы экрана рисует пилюли — как на остальных экранах', () => {
    const { container } = show(withEmoji)

    expect(container.querySelector('.lw-opt--card')).toBeNull()
    // Строка варианта остаётся целой: картинка и слово не разъезжаются.
    expect(screen.getByText('☕️ Coffee')).toBeTruthy()
  })

  it('по просьбе экрана — карточки: картинка над словом', () => {
    const { container } = show(withEmoji, { optionCards: true })

    expect(container.querySelectorAll('.lw-opt--card')).toHaveLength(2)
    expect(container.querySelector('.lw-opt__emoji').textContent).toBe('☕️')
    expect(screen.getByText('Coffee')).toBeTruthy()
  })

  it('ответ из одного значка карточкой не становится даже по просьбе', () => {
    const { container } = show({ id: 'q2', type: 'pick', prompt: 'coffee', options: ['👍', '👎'] }, { optionCards: true })

    expect(container.querySelector('.lw-opt--card')).toBeNull()
    expect(screen.getByText('👍')).toBeTruthy()
  })
})
