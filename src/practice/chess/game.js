// src/practice/chess/game.js
// Партия поверх chess.js. Правила (ходы, шах, мат, повторения) — библиотечные; здесь только форма, в которой
// их видит остальной раздел. Про бота, часы и React модуль не знает — на нём же поедет онлайн.
import { Chess } from 'chess.js'

const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9 }

const record = (m) => ({
  san: m.san, from: m.from, to: m.to, color: m.color, piece: m.piece,
  captured: m.captured || null, promotion: m.promotion || null, flags: m.flags, before: m.before, after: m.after,
})

export function createGame(pgn = '') {
  const chess = new Chess()
  if (pgn) chess.loadPgn(pgn)
  return {
    fen: () => chess.fen(),
    turn: () => chess.turn(),
    pgn: () => chess.pgn(),
    ply: () => chess.history().length,
    board: () => chess.board(),
    inCheck: () => chess.inCheck(),
    moves: () => chess.history({ verbose: true }).map(record),
    // Превращение даёт четыре хода на одну клетку — доске нужна одна отметка, фигуру спросит выбор.
    movesFrom(square) {
      const seen = new Map()
      for (const m of chess.moves({ square, verbose: true })) {
        if (!seen.has(m.to)) seen.set(m.to, { to: m.to, capture: m.flags.includes('c') || m.flags.includes('e'), promotion: !!m.promotion })
      }
      return [...seen.values()]
    },
    // chess.js 1.x на недопустимый ход бросает; доске удобнее null.
    move({ from, to, promotion }) {
      try { return record(chess.move({ from, to, promotion })) } catch { return null }
    },
    undo() {
      const m = chess.undo()
      return m ? record(m) : null
    },
    outcome() {
      if (chess.isCheckmate()) return { result: chess.turn() === 'w' ? '0-1' : '1-0', reason: 'checkmate' }
      if (chess.isStalemate()) return { result: '1/2-1/2', reason: 'stalemate' }
      if (chess.isInsufficientMaterial()) return { result: '1/2-1/2', reason: 'insufficient' }
      if (chess.isThreefoldRepetition()) return { result: '1/2-1/2', reason: 'threefold' }
      if (chess.isDrawByFiftyMoves()) return { result: '1/2-1/2', reason: 'fifty' }
      return null
    },
  }
}

export function kingSquare(board, color) {
  for (const row of board) for (const cell of row) if (cell && cell.type === 'k' && cell.color === color) return cell.square
  return null
}

/** Что взяла каждая сторона, в порядке взятий. */
export function capturedBy(moves) {
  const out = { w: [], b: [] }
  for (const m of moves) if (m.captured) out[m.color].push(m.captured)
  return out
}

/** Перевес белых в пешках; превращение считается как прибавка разницы фигур. */
export function materialLead(moves) {
  let lead = 0
  for (const m of moves) {
    const sign = m.color === 'w' ? 1 : -1
    if (m.captured) lead += sign * VALUE[m.captured]
    if (m.promotion) lead += sign * (VALUE[m.promotion] - VALUE.p)
  }
  return lead
}

// Для ничьей по времени: упавший флаг — не поражение, если сопернику нечем ставить мат.
export function canMate(board, color) {
  const mine = board.flat().filter((c) => c && c.color === color && c.type !== 'k').map((c) => c.type)
  if (!mine.length) return false
  return !(mine.length === 1 && (mine[0] === 'n' || mine[0] === 'b'))
}

/** Доска позиции по FEN — разбор листает партию по сохранённым позициям ходов. */
export const boardOf = (fen) => new Chess(fen).board()
