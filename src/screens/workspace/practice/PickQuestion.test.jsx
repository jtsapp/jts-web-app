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
  it('варианты «картинка + слово» показываются карточками', () => {
    const { container } = show({ id: 'q1', type: 'pick', prompt: 'Что нравится?', options: ['☕️ Coffee', '📅 Mondays'] })

    expect(container.querySelectorAll('.lw-opt--card')).toHaveLength(2)
    expect(screen.getByText('Coffee')).toBeTruthy()
    // Картинка вынесена над словом, а не осталась в подписи.
    expect(container.querySelector('.lw-opt__emoji').textContent).toBe('☕️')
  })

  it('ответ из одного значка остаётся пилюлей', () => {
    const { container } = show({ id: 'q2', type: 'pick', prompt: 'coffee', options: ['👍', '👎'] })

    expect(container.querySelector('.lw-opt--card')).toBeNull()
    expect(container.querySelectorAll('.lw-opt')).toHaveLength(2)
    expect(screen.getByText('👍')).toBeTruthy()
  })

  it('варианты без картинок тоже остаются пилюлями', () => {
    const { container } = show({ id: 'q3', type: 'pick', prompt: 'Как часто?', options: ['Часто', 'Редко'] })

    expect(container.querySelector('.lw-opts--cards')).toBeNull()
    expect(screen.getByText('Часто')).toBeTruthy()
  })
})
