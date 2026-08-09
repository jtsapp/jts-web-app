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
