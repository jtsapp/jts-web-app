// src/screens/chess/HistoryView.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import HistoryView from './HistoryView.jsx'
import { chessT } from './strings.js'

const t = chessT('en')
const rec = (over = {}) => ({
  id: 'g1', endedAt: Date.UTC(2026, 10, 14), color: 'w', botRating: 800, time: 0, result: '1-0', reason: 'checkmate',
  pgn: '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#', rated: true, ratingBefore: 800, ratingAfter: 816, ...over,
})

describe('история партий', () => {
  it('пустая история зовёт сыграть', () => {
    const { container } = render(<HistoryView t={t} history={[]} open={null} onOpen={() => {}} onClose={() => {}} />)
    expect(container.textContent).toContain('No games yet')
  })
  it('строка партии: исход со стороны ученика, соперник, число ходов', () => {
    const onOpen = vi.fn()
    const { container } = render(<HistoryView t={t} history={[rec(), rec({ id: 'g2', color: 'b' })]} open={null} onOpen={onOpen} onClose={() => {}} />)
    const rows = container.querySelectorAll('[data-game]')
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toContain('You won')
    expect(rows[0].textContent).toContain('vs 800')
    expect(rows[0].textContent).toContain('7 moves')
    expect(rows[1].textContent).toContain('You lost')
    fireEvent.click(rows[0])
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'g1' }))
  })
  it('разбор открывается на последнем ходу и листается', () => {
    const { container } = render(<HistoryView t={t} history={[rec()]} open={rec()} onOpen={() => {}} onClose={() => {}} />)
    const board = () => container.querySelector('.ch-board')
    const final = board().dataset.fen
    expect(container.querySelector('[data-square="f7"]').dataset.piece).toBe('wq')
    fireEvent.click(container.querySelector('[data-step="first"]'))
    expect(container.querySelector('[data-square="e2"]').dataset.piece).toBe('wp')
    fireEvent.click(container.querySelector('[data-step="next"]'))
    expect(container.querySelector('[data-square="e4"]').dataset.piece).toBe('wp')
    fireEvent.click(container.querySelector('[data-ply="7"]'))
    expect(board().dataset.fen).toBe(final)
    fireEvent.keyDown(container.querySelector('.ch-review'), { key: 'ArrowLeft' })
    expect(container.querySelector('[data-square="f7"]').dataset.piece).toBe('bp')
  })
  it('нечитаемая партия не роняет экран', () => {
    const { container } = render(<HistoryView t={t} history={[rec({ pgn: '1. Zz9' })]} open={rec({ pgn: '1. Zz9' })} onOpen={() => {}} onClose={() => {}} />)
    expect(container.textContent).toContain('could not be opened')
  })
})
