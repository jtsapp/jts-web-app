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
})
