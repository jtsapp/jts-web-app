// src/practice/chess/chessProgress.test.js
import { describe, it, expect, vi } from 'vitest'

vi.mock('../practiceSync.js', () => ({ pushModule: vi.fn() }))

import { normalize, mergeChess, currentOf, HISTORY_MAX } from './chessProgress.js'

const rec = (id, endedAt, over = {}) => ({
  id, endedAt, color: 'w', botRating: 800, time: 0, result: '1-0', reason: 'checkmate',
  pgn: '1. e4 e5', rated: true, ratingBefore: 800, ratingAfter: 816, ...over,
})
const cur = (id, movedAt, over = {}) => JSON.stringify({
  id, startedAt: 1, movedAt, color: 'w', botRating: 800, time: 5, pgn: '1. e4',
  clock: { w: 300000, b: 299000 }, clockLog: [{ w: 300000, b: 300000 }, { w: 300000, b: 300000 }], usedUndo: false, usedHint: false, ...over,
})

describe('хранилище шахмат', () => {
  it('пустое и мусорное состояние — старт с 800', () => {
    expect(normalize(null)).toEqual({ rating: 800, games: 0, current: null, history: [] })
    expect(normalize({ rating: 'x', history: 'y', current: 7 })).toEqual({ rating: 800, games: 0, current: null, history: [] })
  })
  it('битые записи истории выбрасываются, история сортируется и режется до 50', () => {
    const many = Array.from({ length: 60 }, (_, i) => rec(`g${i}`, i))
    const s = normalize({ rating: 900, games: 60, history: [...many, { id: 'bad' }, rec('x', 5, { result: '2-0' })] })
    expect(s.history).toHaveLength(HISTORY_MAX)
    expect(s.history[0].id).toBe('g59')
  })
  it('текущая партия — строкой; разбирается, битая пропадает', () => {
    const s = normalize({ current: cur('a', 10) })
    expect(currentOf(s).pgn).toBe('1. e4')
    expect(currentOf(s).clockLog).toHaveLength(2)
    expect(normalize({ current: '{oops' }).current).toBe(null)
    expect(normalize({ current: JSON.stringify({ id: 'a', color: 'x', pgn: '' }) }).current).toBe(null)
  })
  it('сведение: история объединяется по id, рейтинг — у кого больше партий', () => {
    const server = { rating: 850, games: 3, current: null, history: [rec('a', 1), rec('b', 2)] }
    const local = { rating: 790, games: 2, current: null, history: [rec('b', 2), rec('c', 3)] }
    const m = mergeChess(server, local)
    expect(m.history.map((r) => r.id)).toEqual(['c', 'b', 'a'])
    expect(m.rating).toBe(850)
    expect(m.games).toBe(3)
  })
  it('сведение: текущая — с более поздним ходом; уже сыгранная не воскресает', () => {
    const a = { rating: 800, games: 0, current: cur('x', 10), history: [] }
    const b = { rating: 800, games: 0, current: cur('y', 20), history: [] }
    expect(currentOf(mergeChess(a, b)).id).toBe('y')
    const done = { rating: 816, games: 1, current: null, history: [rec('y', 30)] }
    expect(mergeChess(done, b).current).toBe(null)
  })
})
