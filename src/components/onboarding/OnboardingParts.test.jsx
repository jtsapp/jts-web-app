// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Calendar, Option } from './OnboardingParts.jsx'

describe('OnboardingParts', () => {
  it('Option — радио с подписью', () => {
    const onClick = vi.fn()
    render(<Option on title="Пока не знаю" hint="подсказка" onClick={onClick} />)
    const r = screen.getByRole('radio', { name: /Пока не знаю/ })
    expect(r.getAttribute('aria-checked')).toBe('true')
    fireEvent.click(r)
    expect(onClick).toHaveBeenCalled()
  })
  it('Calendar — сегодня доступно, выбор отдаёт ISO', () => {
    const onChange = vi.fn()
    const today = new Date()
    render(<Calendar value={null} onChange={onChange} lang="ru" />)
    const day = screen.getByRole('button', { name: String(today.getDate()) })
    expect(day.disabled).toBe(false)
    fireEvent.click(day)
    expect(onChange.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
