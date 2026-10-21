// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import WordCells, { cellGroups } from './WordCells.jsx'

const item = (over = {}) => ({
  card: { en: 'get up' },
  target: 'getup',
  step: 'word',
  typed: 'ge',
  revealed: 1,
  wordMark: null,
  ...over,
})

describe('ячейки слова', () => {
  it('пробел фразы делит группы, апостроф и дефис ячеек не получают', () => {
    expect(cellGroups('get up')).toEqual([[0, 1, 2], [3, 4]])
    expect(cellGroups("o'clock")).toEqual([[0, 1, 2, 3, 4, 5]])
    expect(cellGroups('well-known|famous')).toEqual([[0, 1, 2, 3, 4, 5, 6, 7, 8]])
  })

  it('буквы по ячейкам, текущая и подсказанная подсвечены, длинное слово мельче', () => {
    const { container } = render(<WordCells item={item()} inputRef={createRef()} label="w" onType={() => {}} onSubmit={() => {}} />)
    const cells = container.querySelectorAll('.jl-cell')
    expect([...cells].map((c) => c.textContent)).toEqual(['g', 'e', '', '', ''])
    expect(cells[0].classList.contains('is-hint')).toBe(true)
    expect(cells[2].classList.contains('is-cur')).toBe(true)
    const long = render(<WordCells item={item({ card: { en: 'responsibility' }, target: 'responsibility', typed: '' })} inputRef={createRef()} label="w" onType={() => {}} onSubmit={() => {}} />)
    expect(long.container.querySelector('.jl-cells--sm')).not.toBeNull()
  })

  it('набор идёт в поле, Enter — проверка', () => {
    const onType = vi.fn()
    const onSubmit = vi.fn()
    const { container } = render(<WordCells item={item()} inputRef={createRef()} label="w" onType={onType} onSubmit={onSubmit} />)
    const input = container.querySelector('input')
    fireEvent.change(input, { target: { value: 'get' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onType).toHaveBeenCalledWith('get')
    expect(onSubmit).toHaveBeenCalled()
  })
})
