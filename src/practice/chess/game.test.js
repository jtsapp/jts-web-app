// src/practice/chess/game.test.js
import { describe, it, expect } from 'vitest'
import { createGame, kingSquare, capturedBy, materialLead, canMate, boardOf } from './game.js'

const play = (g, ...sans) => { for (const s of sans) expect(g.move(sanToMove(g, s))).not.toBe(null) }
// Тесту удобнее SAN, а игра принимает клетки — находим ход перебором допустимых.
function sanToMove(g, san) {
  for (const row of g.board()) for (const cell of row) {
    if (!cell || cell.color !== g.turn()) continue
    for (const m of g.movesFrom(cell.square)) {
      for (const promotion of m.promotion ? ['q', 'r', 'b', 'n'] : [undefined]) {
        const probe = createGame(g.pgn())
        const made = probe.move({ from: cell.square, to: m.to, promotion })
        if (made && made.san === san) return { from: cell.square, to: m.to, promotion }
      }
    }
  }
  throw new Error(`нет хода ${san}`)
}

describe('партия', () => {
  it('начальная позиция: ход белых, у пешки e2 два хода без взятий', () => {
    const g = createGame()
    expect(g.turn()).toBe('w')
    expect(g.movesFrom('e2')).toEqual([{ to: 'e3', capture: false, promotion: false }, { to: 'e4', capture: false, promotion: false }])
    expect(g.movesFrom('e7')).toEqual([])
  })
  it('недопустимый ход не делается и не бросает', () => {
    const g = createGame()
    expect(g.move({ from: 'e2', to: 'e5' })).toBe(null)
    expect(g.ply()).toBe(0)
  })
  it('детский мат: исход — победа белых матом', () => {
    const g = createGame()
    play(g, 'e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#')
    expect(g.outcome()).toEqual({ result: '1-0', reason: 'checkmate' })
  })
  it('взятие и взятие на проходе помечены как capture', () => {
    const g = createGame()
    play(g, 'e4', 'a6', 'e5', 'd5')
    expect(g.movesFrom('e5')).toContainEqual({ to: 'd6', capture: true, promotion: false })
    const m = g.move({ from: 'e5', to: 'd6' })
    expect(m.captured).toBe('p')
    expect(m.flags).toContain('e')
  })
  it('превращение: одна запись на клетку, фигура — по выбору', () => {
    const g = createGame()
    play(g, 'a4', 'b5', 'axb5', 'a6', 'bxa6', 'Bb7', 'axb7', 'Nc6')
    expect(g.movesFrom('b7').filter((m) => m.to === 'a8')).toEqual([{ to: 'a8', capture: true, promotion: true }])
    const m = g.move({ from: 'b7', to: 'a8', promotion: 'n' })
    expect(m.promotion).toBe('n')
  })
  it('рокировка помечена флагом', () => {
    const g = createGame()
    play(g, 'e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5')
    expect(g.move({ from: 'e1', to: 'g1' }).flags).toContain('k')
  })
  it('троекратное повторение — ничья', () => {
    const g = createGame()
    play(g, 'Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8')
    expect(g.outcome()).toEqual({ result: '1/2-1/2', reason: 'threefold' })
  })
  it('откат возвращает позицию, PGN восстанавливает партию целиком', () => {
    const g = createGame()
    play(g, 'e4', 'e5', 'Nf3')
    const fen = g.moves()[1].after
    expect(g.undo().san).toBe('Nf3')
    expect(g.fen()).toBe(fen)
    const copy = createGame(g.pgn())
    expect(copy.fen()).toBe(g.fen())
    expect(copy.moves().map((m) => m.san)).toEqual(['e4', 'e5'])
  })
  it('нечитаемый PGN бросает', () => expect(() => createGame('1. e4 e5 2. Zz9')).toThrow())
  it('король, взятое и перевес считаются по доске и ходам', () => {
    const g = createGame()
    play(g, 'e4', 'd5', 'exd5', 'Qxd5')
    expect(kingSquare(g.board(), 'b')).toBe('e8')
    expect(capturedBy(g.moves())).toEqual({ w: ['p'], b: ['p'] })
    expect(materialLead(g.moves())).toBe(0)
  })
  it('мат одним королём или королём с лёгкой фигурой невозможен', () => {
    expect(canMate(createGame('[FEN "8/8/8/8/8/4k3/8/4K3 w - - 0 1"]\n[SetUp "1"]\n\n*').board(), 'w')).toBe(false)
    expect(canMate(createGame().board(), 'w')).toBe(true)
  })
  it('доска по FEN — для разбора сыгранной партии', () => {
    const b = boardOf('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')
    expect(b[4][4]).toMatchObject({ square: 'e4', type: 'p', color: 'w' })
    expect(b[6][4]).toBe(null)
  })
})
