// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import HtmlBlock from './HtmlBlock.jsx'

afterEach(cleanup)

function block(props) {
  return (
    <I18nProvider>
      <section><HtmlBlock html="<p>hello world</p>" ranges={[{ start: 0, end: 5 }]} {...props} /></section>
    </I18nProvider>
  )
}

/** Подсказка «Клик по выделению — снять» («NEW 2», 17:3625): снятие кликом было, о нём не знали. */
describe('HtmlBlock — подсказка о снятии подсветки', () => {
  it('наведение и фокус показывают её, Enter снимает подсветку', () => {
    const tap = vi.fn()
    const { container } = render(block({ onMarkTap: tap }))
    const mark = container.querySelector('mark.st-hl')
    expect(mark.tabIndex).toBe(0)
    fireEvent.mouseOver(mark)
    expect(screen.getByRole('tooltip').textContent).toBe('Клик по выделению — снять')
    fireEvent.mouseOut(mark)
    expect(screen.queryByRole('tooltip')).toBeNull()
    fireEvent.focus(mark)
    expect(screen.getByRole('tooltip')).toBeTruthy()
    fireEvent.keyDown(mark, { key: 'Enter' })
    expect(tap).toHaveBeenCalledWith(0)
  })

  it('после выделения пальцем — один раз и сама прячется через 2,5 с', () => {
    vi.useFakeTimers()
    try {
      const { rerender } = render(block({ onMarkTap: () => {} }))
      expect(screen.queryByRole('tooltip')).toBeNull()
      rerender(block({ onMarkTap: () => {}, flash: { at: 2, n: 1 } }))
      expect(screen.getByRole('tooltip')).toBeTruthy()
      act(() => vi.advanceTimersByTime(2600))
      expect(screen.queryByRole('tooltip')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('там, где снять нельзя (разборы), подсказки нет', () => {
    const { container } = render(block({}))
    const mark = container.querySelector('mark.st-hl')
    expect(mark.tabIndex).toBe(-1)
    fireEvent.mouseOver(mark)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})
