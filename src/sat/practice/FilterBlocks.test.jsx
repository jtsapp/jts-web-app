// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent, screen } from '@testing-library/react'
import FilterBlocks, { EMPTY_FILTERS, matchesFilters } from './FilterBlocks.jsx'
import { I18nProvider } from '../../i18n.jsx'

afterEach(cleanup)

/** Фильтры в два блока (ТЗ SAT 21.10, задача 5): ИЛИ внутри блока, И между блоками, пусто — всё. */
describe('фильтры практики', () => {
  it('два блока с заголовками, сложность словами College Board, нет «JTS Original»', () => {
    render(<I18nProvider><FilterBlocks value={EMPTY_FILTERS} onChange={() => {}} count={38} /></I18nProvider>)
    for (const label of ['Сложность', 'Ответы', 'Easy', 'Medium', 'Hard', 'Верные', 'Неверные', 'Без ответа', 'Подходит: 38']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    expect(screen.queryByText('JTS Original')).toBeNull()
  })

  it('«сложные, где я ошибся» и сброс', () => {
    const onChange = vi.fn()
    const { rerender } = render(<I18nProvider><FilterBlocks value={EMPTY_FILTERS} onChange={onChange} /></I18nProvider>)
    fireEvent.click(screen.getByText('Hard'))
    expect(onChange).toHaveBeenLastCalledWith({ difficulty: [3], status: [] })
    rerender(<I18nProvider><FilterBlocks value={{ difficulty: [3], status: ['wrong'] }} onChange={onChange} /></I18nProvider>)
    fireEvent.click(screen.getByText('Сбросить фильтры'))
    expect(onChange).toHaveBeenLastCalledWith(EMPTY_FILTERS)
  })

  it('правило фильтра на клиенте совпадает с сервером', () => {
    const f = { difficulty: [3], status: ['wrong'] }
    expect(matchesFilters(f, 3, false)).toBe(true)
    expect(matchesFilters(f, 3, true)).toBe(false)
    expect(matchesFilters(f, 2, false)).toBe(false)
    expect(matchesFilters(EMPTY_FILTERS, 1, null)).toBe(true)
    expect(matchesFilters({ difficulty: [], status: ['new'] }, 1, null)).toBe(true)
  })

  it('вид «Практики» NEW 2: числа на чипах, «Сбросить» в заголовке, пояснение; без «Подходит»', () => {
    const onChange = vi.fn()
    const counts = { difficulty: { 1: 214, 2: 252, 3: 129 }, status: { right: 124, wrong: 45, new: 426 } }
    const { container } = render(
      <I18nProvider>
        <FilterBlocks value={{ difficulty: [2], status: [] }} onChange={onChange} counts={counts} variant="counted" hint="Пояснение" />
      </I18nProvider>,
    )
    expect(screen.getByRole('button', { name: 'Medium 252' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Без ответа 426' })).toBeTruthy()
    expect(screen.getByText('Пояснение')).toBeTruthy()
    expect(screen.queryByText(/Подходит/)).toBeNull()
    // сброс — в строке «Сложность», коротким словом
    const reset = container.querySelector('.st-filters__head .st-filters__reset')
    expect(reset.textContent).toBe('Сбросить')
    fireEvent.click(reset)
    expect(onChange).toHaveBeenLastCalledWith(EMPTY_FILTERS)
  })
})
