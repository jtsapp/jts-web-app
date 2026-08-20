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

// Раньше экраны-рабочие места (каталог уроков, живой урок) просили сайдбар-рейл:
// колонку 72px, где логотип, подписи разделов, имя в профиле, роль и баланс
// убирались из потока через display: none и возвращались только по наведению.
// На этих экранах от сайдбара оставались два безымянных кружка, и куда ведёт
// иконка, узнать можно было только мышью. Рейла больше нет — сайдбар везде
// один и тот же, и ничего из него не пропадает.
describe('Sidebar', () => {
  it('рейла нет: ни модификатора на сайдбаре, ни пропа', () => {
    const { container } = renderSidebar({ rail: true })
    expect(container.querySelector('.sb--rail')).toBeNull()
    expect(container.querySelector('aside.sb')).not.toBeNull()
  })

  it('показывает подписи разделов, а не одни иконки', () => {
    const { container } = renderSidebar()
    const labels = [...container.querySelectorAll('.sb__item span')].map((s) => s.textContent.trim())
    expect(labels.length).toBeGreaterThan(0)
    expect(labels.every((l) => l.length > 0)).toBe(true)
  })

  it('ученик видит логотип, профиль с именем, роль и баланс', () => {
    const { container } = renderSidebar()
    expect(container.querySelector('.sb__logo')).not.toBeNull()
    expect(container.querySelector('.sb__profile-text').textContent).toContain('Demo')
    expect(container.querySelector('.sb__role-text').textContent.trim()).not.toBe('')
    expect(container.querySelector('.sb__role-lvl').textContent).toBe('A1')
    expect(container.querySelectorAll('.sb__stat-num')).toHaveLength(2)
  })
})
