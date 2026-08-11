// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import ProfilePage from './ProfilePage.jsx'

// Находка ревью: текущее звание в nextRoleFor читалось из ROLE_BY_LEVEL
// напрямую, с собственным фолбэком 'A1', в обход roleForLevel. На коде уровня,
// которого в таблице нет (бэкенд волен прислать любой), прямое чтение давало
// undefined — и «следующим» званием подсвечивалось то же самое, что у студента
// уже есть.
describe('ProfilePage — следующее звание', () => {
  // Без токена компонент не ходит в сеть (все эффекты начинаются с `if
  // (!token) return`), поэтому заглушки api здесь не нужны.
  const renderProfile = (userLevel) =>
    render(
      <I18nProvider>
        <ProfilePage userName="Демо" userLevel={userLevel} onNav={() => {}} onLogout={() => {}} />
      </I18nProvider>,
    )

  const coins = (container) => [...container.querySelectorAll('.pf-progress__coin')]

  it('на неизвестном коде уровня следующего звания нет — оно совпало бы с текущим', () => {
    const { container } = renderProfile('Z9')
    const [, next] = coins(container)
    expect(next.className).not.toContain('pf-progress__coin--dim')
  })

  it('без уровня в профиле — то же самое: A0 и A1 это одно звание, Купец', () => {
    const { container } = renderProfile('')
    const [, next] = coins(container)
    expect(next.className).not.toContain('pf-progress__coin--dim')
  })

  it('A1 → A2 звание меняется: цель показана отдельной монетой', () => {
    const { container } = renderProfile('A1')
    const [current, next] = coins(container)
    expect(current.getAttribute('src')).toContain('merchant')
    expect(next.getAttribute('src')).toContain('knight')
    expect(next.className).toContain('pf-progress__coin--dim')
  })
})

// Находка ревью: бейдж уровня падал на A1, тогда как общая функция звания
// (roleForLevel) — на A0. На пустом уровне студент видел звание Купца рядом с
// кодом уровня A1, которого у него нет.
describe('ProfilePage — бейдж уровня', () => {
  const renderProfile = (props) =>
    render(
      <I18nProvider>
        <ProfilePage userName="Демо" onNav={() => {}} onLogout={() => {}} {...props} />
      </I18nProvider>,
    )

  it('без уровня в профиле показывает A0 — первый уровень карты', () => {
    const { container } = renderProfile({ userLevel: '' })
    expect(container.querySelector('.pf-rank__cefr').textContent).toBe('A0')
  })

  it('уровень вообще не передан — тот же A0, а не A1', () => {
    const { container } = renderProfile({})
    expect(container.querySelector('.pf-rank__cefr').textContent).toBe('A0')
  })
})
