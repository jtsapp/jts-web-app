// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import Sidebar from './Sidebar.jsx'

function renderSidebar(props) {
  return render(
    <I18nProvider>
      <Sidebar userName="Demo" userLevel="A1" active="lessons" onNav={() => {}} onProfile={() => {}} {...props} />
    </I18nProvider>
  )
}

describe('Sidebar rail mode', () => {
  it('adds sb--rail when rail is true', () => {
    const { container } = renderSidebar({ rail: true })
    expect(container.querySelector('aside.sb.sb--rail')).not.toBeNull()
  })

  it('does not add sb--rail by default', () => {
    const { container } = renderSidebar()
    expect(container.querySelector('aside.sb.sb--rail')).toBeNull()
    expect(container.querySelector('aside.sb')).not.toBeNull()
  })
})

// Чип профиля: имя сверху, подпись «Профиль» снизу. Без имени подпись
// поднимается наверх и снизу НИЧЕГО не рисуется — иначе выходило «Профиль»
// над «Профиль» (жалоба владельца 08.09.2026). Так же ведёт себя MobileTopBar.
describe('Sidebar profile chip', () => {
  it('shows the name on top and the label under it', () => {
    const { container } = renderSidebar({ userName: 'Сакен' })
    const text = container.querySelector('.sb__profile-text')
    expect(text.querySelector('b').textContent).toBe('Сакен')
    expect(text.querySelector('span').textContent).toBe('Профиль')
  })

  it('does not repeat the label when there is no name', () => {
    const { container } = renderSidebar({ userName: '' })
    const text = container.querySelector('.sb__profile-text')
    expect(text.querySelector('b').textContent).toBe('Профиль')
    expect(text.querySelector('span')).toBeNull()
  })
})
