// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LearningLayout from './LearningLayout.jsx'
import { EmbedContext } from '../lib/embedMode.js'
import { I18nProvider } from '../i18n.jsx'

describe('LearningLayout в рамке урока', () => {
  it('рисует только содержимое: без навигации, шапки и подвала', () => {
    const { container } = render(
      <I18nProvider>
        <EmbedContext.Provider value={true}>
          <LearningLayout active="practice" onNav={() => {}}><p>unit body</p></LearningLayout>
        </EmbedContext.Provider>
      </I18nProvider>,
    )
    expect(screen.getByText('unit body')).toBeTruthy()
    expect(container.querySelector('main.learning-embed')).toBeTruthy()
    expect(container.querySelector('nav, aside, footer, header, .learn__bell')).toBeNull()
  })
})
