// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import LiveHeader from './LiveHeader.jsx'

function renderHeader(props = {}) {
  return render(
    <I18nProvider>
      <LiveHeader status="IN_PROGRESS" teacherName="Адильжан Алимжанов" onExit={() => {}} {...props} />
    </I18nProvider>
  )
}

describe('LiveHeader — присутствие преподавателя', () => {
  // Ростера «В классе» в новом макете нет, поэтому «на связи ли учитель»
  // сообщает шапка: без этого пустой класс и молчащий преподаватель выглядят
  // для ученика одинаково.
  it('преподаватель в классе — зелёная точка и подпись «на связи»', () => {
    const { container } = renderHeader({ teacherOnline: true })
    expect(container.querySelector('.lv-top__dot.is-on')).toBeTruthy()
    expect(screen.getByText(/на связи/)).toBeTruthy()
  })

  it('преподавателя нет — точка гаснет, подпись меняется', () => {
    const { container } = renderHeader({ teacherOnline: false })
    const dot = container.querySelector('.lv-top__dot')
    expect(dot).toBeTruthy()
    expect(dot.classList.contains('is-on')).toBe(false)
    expect(screen.getByText(/не на связи/)).toBeTruthy()
  })

  // У преподавателя своя картина класса (ростер и выбор ученика), и точка на
  // собственном аватаре ему ничего не сообщает — проп не передаётся вовсе.
  it('присутствие не передано — точки нет', () => {
    const { container } = renderHeader()
    expect(container.querySelector('.lv-top__dot')).toBeNull()
  })

  it('обрыв связи виден отдельно от присутствия', () => {
    const { container } = renderHeader({ connected: false, teacherOnline: true })
    expect(container.querySelector('.lv-top__offline')).toBeTruthy()
  })
})
