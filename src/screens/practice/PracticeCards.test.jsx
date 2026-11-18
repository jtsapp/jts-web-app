// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../i18n.jsx'
import { LevelSwitch } from './PracticeCards.jsx'

const names = () => screen.getAllByRole('radio').map((r) => r.textContent)

describe('переключатель уровня', () => {
  it('по умолчанию — «Все» и уровни Практики A1–C2', () => {
    render(<I18nProvider><LevelSwitch value="all" onChange={() => {}} /></I18nProvider>)
    expect(names()).toEqual(['Все', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  })

  it('свой набор уровней раздела; выбор уходит наверх, выбранный отмечен', () => {
    const onChange = vi.fn()
    render(<I18nProvider><LevelSwitch value="A0" onChange={onChange} levels={['A0', 'A1']} /></I18nProvider>)
    expect(names()).toEqual(['Все', 'A0', 'A1'])
    expect(screen.getByRole('radio', { name: 'A0' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByRole('radio', { name: 'A1' }))
    expect(onChange).toHaveBeenCalledWith('A1')
  })
})
