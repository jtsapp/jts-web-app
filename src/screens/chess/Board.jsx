// src/screens/chess/Board.jsx
'use client'

// Доска. Правил не знает: позицию, допустимые ходы выбранной фигуры и колбэк хода получает пропсами —
// поэтому та же доска показывает и живую партию, и разбор сыгранной (interactive = false).
// Ход — перетаскиванием или двумя тапами; возможные ходы — точка на пустой клетке и кольцо на клетке
// со взятием (приём Lichess, код свой).
import { useRef, useState } from 'react'
import { Piece } from './pieces.jsx'

const FILES = 'abcdefgh'
const PROMOTIONS = ['q', 'r', 'b', 'n']
// Сдвиг указателя, с которого нажатие считается перетаскиванием, а не тапом.
const DRAG_START = 6

export function squaresFor(orientation) {
  const files = orientation === 'w' ? [...FILES] : [...FILES].reverse()
  const ranks = orientation === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8]
  return ranks.flatMap((r) => files.map((f) => f + r))
}

const pieceAt = (board, square) => board[8 - Number(square[1])][FILES.indexOf(square[0])]

export default function Board({ fen, board, orientation, playerColor, interactive, movesFrom, onMove, lastMove, check, hint, animateLast, t }) {
  const rootRef = useRef(null)
  // Выбор привязан к позиции: сходил бот или вернули ход — старый выбор недействителен сам, без эффекта.
  const [picked, setPicked] = useState(null) // { fen, square }
  const [promo, setPromo] = useState(null) // { fen, from, to }
  const [drag, setDrag] = useState(null) // { from, startX, startY, x, y, moved }
  const squares = squaresFor(orientation)
  const selected = picked && picked.fen === fen ? picked.square : null
  const asking = promo && promo.fen === fen ? promo : null
  const targets = selected ? movesFrom(selected) : []
  const colors = { w: t('white').toLowerCase(), b: t('black').toLowerCase() }

  const tryMove = (from, to) => {
    const move = movesFrom(from).find((m) => m.to === to)
    setPicked(null)
    if (!move) return false
    if (move.promotion) setPromo({ fen, from, to })
    else onMove(from, to, undefined)
    return true
  }

  const press = (square) => {
    if (!interactive || asking) return false
    if (selected && selected !== square && targets.some((m) => m.to === square)) { tryMove(selected, square); return false }
    const piece = pieceAt(board, square)
    if (piece && piece.color === playerColor) { setPicked({ fen, square }); return true }
    setPicked(null)
    return false
  }

  const onPointerDown = (square) => (e) => {
    if (e.button > 0) return
    if (!press(square)) return
    // Захват на доске: дальше движение и отпускание приходят ей, где бы ни был указатель.
    try { rootRef.current?.setPointerCapture(e.pointerId) } catch { /* указатель уже отпущен */ }
    setDrag({ from: square, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, moved: false })
  }

  const onPointerMove = (e) => {
    if (!drag) return
    const moved = drag.moved || Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > DRAG_START
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved })
  }

  const squareAt = (x, y) => {
    const rect = rootRef.current.getBoundingClientRect()
    const col = Math.floor(((x - rect.left) / rect.width) * 8)
    const row = Math.floor(((y - rect.top) / rect.height) * 8)
    return col >= 0 && col < 8 && row >= 0 && row < 8 ? squares[row * 8 + col] : null
  }

  const onPointerUp = (e) => {
    if (!drag) return
    const { from, moved } = drag
    setDrag(null)
    if (!moved) return
    const to = squareAt(e.clientX, e.clientY)
    // Бросили мимо допустимой клетки — фигура возвращается и остаётся выбранной.
    if (to && to !== from && !tryMove(from, to)) setPicked({ fen, square: from })
  }

  const onKeyDown = (square) => (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    press(square)
  }

  const choose = (piece) => {
    onMove(asking.from, asking.to, piece)
    setPromo(null)
  }

  const center = (square) => {
    const i = squares.indexOf(square)
    return { x: (i % 8) + 0.5, y: Math.floor(i / 8) + 0.5 }
  }
  const arrow = hint ? { a: center(hint.from), b: center(hint.to) } : null
  const promoIndex = asking ? squares.indexOf(asking.to) : -1

  return (
    <div ref={rootRef} className="ch-board" role="group" aria-label={t('board')} data-fen={fen} data-orientation={orientation}
      data-assistant-noclick onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => setDrag(null)}>
      {squares.map((square, i) => {
        const piece = pieceAt(board, square)
        const file = FILES.indexOf(square[0])
        const dark = (file + Number(square[1])) % 2 === 1
        const target = targets.find((m) => m.to === square)
        const dragging = drag && drag.moved && drag.from === square
        const arrived = animateLast && lastMove && lastMove.to === square
        const cls = ['ch-sq', dark ? 'ch-sq--dark' : 'ch-sq--light']
        if (lastMove && (lastMove.from === square || lastMove.to === square)) cls.push('ch-sq--last')
        if (selected === square) cls.push('ch-sq--picked')
        if (check === square) cls.push('ch-sq--check')
        // Приехавшая фигура соперника: смещение в клетках от клетки, откуда она шла.
        const from = arrived ? squares.indexOf(lastMove.from) : -1
        const style = dragging
          ? { transform: `translate(${drag.x - drag.startX}px, ${drag.y - drag.startY}px)` }
          : arrived ? { '--ch-dx': (from % 8) - (i % 8), '--ch-dy': Math.floor(from / 8) - Math.floor(i / 8) } : undefined
        return (
          <button key={square} type="button" className={cls.join(' ')} data-square={square} data-piece={piece ? piece.color + piece.type : ''}
            aria-label={`${square}, ${piece ? `${colors[piece.color]} ${t(`piece.${piece.type}`)}` : t('empty')}`}
            onPointerDown={onPointerDown(square)} onKeyDown={onKeyDown(square)}>
            {i % 8 === 0 && <span className="ch-coord ch-coord--rank" aria-hidden="true">{square[1]}</span>}
            {i >= 56 && <span className="ch-coord ch-coord--file" aria-hidden="true">{square[0]}</span>}
            {piece && (
              <Piece key={arrived ? `${square}-${fen}` : square} type={piece.type} color={piece.color} style={style}
                className={dragging ? 'ch-piece--drag' : arrived ? 'ch-piece--arrived' : ''} />
            )}
            {target && <span className={`ch-mark ch-mark--${target.capture ? 'ring' : 'dot'}`} data-move={target.capture ? 'ring' : 'dot'} />}
          </button>
        )
      })}
      {arrow && (
        <svg className="ch-arrow" viewBox="0 0 8 8" aria-hidden="true">
          <defs>
            <marker id="ch-arrow-head" viewBox="0 0 4 4" markerWidth="2.6" markerHeight="2.6" refX="2.4" refY="2" orient="auto">
              <path d="M0 0L4 2L0 4z" />
            </marker>
          </defs>
          <line x1={arrow.a.x} y1={arrow.a.y} x2={arrow.b.x} y2={arrow.b.y} markerEnd="url(#ch-arrow-head)" />
        </svg>
      )}
      {asking && (
        <>
          <button type="button" className="ch-promo__veil" aria-label={t('cancel')} onClick={() => setPromo(null)} />
          <div className={`ch-promo ${promoIndex < 8 ? 'ch-promo--top' : 'ch-promo--bottom'}`} style={{ left: `${(promoIndex % 8) * 12.5}%` }}
            role="dialog" aria-label={t('promoteTo')}>
            {PROMOTIONS.map((p) => (
              <button key={p} type="button" data-promote={p} aria-label={t(`piece.${p}`)} onClick={() => choose(p)}>
                <Piece type={p} color={playerColor} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
