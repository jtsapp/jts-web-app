// @vitest-environment jsdom
import { it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import RulesCard from './RulesCard.jsx'

afterEach(cleanup)

it('правила — карточкой и свёрнутым блоком для телефона', () => {
  render(
    <I18nProvider>
      <RulesCard />
    </I18nProvider>,
  )
  expect(screen.getByRole('heading', { name: 'Правила сообщества' })).toBeTruthy()
  expect(document.querySelector('details.brg-rules-m summary').textContent).toBe('Правила сообщества')
  expect(document.querySelectorAll('.brg-rules .brg-rules__list li')).toHaveLength(4)
  expect(screen.getAllByText('Без ссылок, рекламы и личных контактов')).toHaveLength(2)
})
