// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import SkillRatings from './SkillRatings.jsx'

// ТЗ v2.0, 5.5: Профиль считает навыки той же формулой, что «Главная» (доля верных с первой попытки в заданиях уровня):
// у одного ученика было чтение 32% на «Главной» и 73% в Профиле.
describe('SkillRatings', () => {
  it('доля по заданиям уровня, подпись источника; меньше пяти заданий — «мало данных», без заданий — пусто', () => {
    const { container } = render(
      <I18nProvider>
        <SkillRatings level="B1" stats={{ reading: { done: 10, firstTry: 7 }, grammar: { done: 3, firstTry: 3 } }} />
      </I18nProvider>,
    )
    expect(container.querySelector('.pf-skills__src').textContent).toBe('Уровень B1 · % верных с первой попытки в заданиях уровня B1')
    const meta = (skill) => container.querySelector(`[data-skill="${skill}"] .pf-skill__meta`).textContent
    expect(meta('reading')).toContain('70')
    expect(meta('grammar')).toMatch(/мало данных/i)
    // «Мало данных» — серые полоски, а не цветные.
    expect(container.querySelectorAll('[data-skill="grammar"] .is-muted').length).toBe(2)
    expect(container.querySelectorAll('[data-skill="reading"] .is-on').length).toBe(8)
    expect(container.querySelectorAll('[data-skill="writing"] .is-on').length).toBe(0)
  })

  // Решение владельца 07.11.2026: процент по всем прошлым заданиям, пока заданий уровня меньше пяти, — так и подписан.
  it('процент по прошлым заданиям помечен в подписи', () => {
    const { container } = render(
      <I18nProvider>
        <SkillRatings level="B1" stats={{ reading: { done: 40, firstTry: 30, estimate: true } }} />
      </I18nProvider>,
    )
    expect(container.querySelector('.pf-skills__src').textContent).toBe(
      'Уровень B1 · % верных с первой попытки в заданиях уровня B1; где их пока меньше пяти — по всем прошлым заданиям',
    )
    expect(container.querySelector('[data-skill="reading"] .pf-skill__meta').textContent).toContain('75')
  })
})
