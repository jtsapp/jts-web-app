// src/screens/chess/HistoryView.jsx
'use client'

// Сыгранные партии и их разбор по ходам. Та же доска, что в игре, но без ввода. На этом экране позже
// появится тренер (часть 2): позиции каждого хода уже здесь.
import { useMemo, useState } from 'react'
import Board from './Board.jsx'
import { MoveList } from './GamePanel.jsx'
import { createGame, boardOf } from '../../practice/chess/game.js'
import { scoreFor } from '../../practice/chess/rating.js'

const HEADS = { 1: 'won', 0: 'lost', 0.5: 'draw' }
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const none = () => []

function movesOf(pgn) {
  try { return createGame(pgn).moves() } catch { return null }
}

function Review({ t, record, onClose }) {
  const moves = useMemo(() => movesOf(record.pgn), [record.pgn])
  const [ply, setPly] = useState(moves ? moves.length : 0)
  if (!moves) {
    return (
      <div className="ch-review">
        <button type="button" className="ch-btn" onClick={onClose}>{t('back')}</button>
        <p className="ch-alert">{t('badGame')}</p>
      </div>
    )
  }
  const go = (n) => setPly(Math.max(0, Math.min(moves.length, n)))
  const fen = ply === 0 ? START : moves[ply - 1].after
  const last = ply === 0 ? null : { from: moves[ply - 1].from, to: moves[ply - 1].to }
  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') go(ply - 1)
    else if (e.key === 'ArrowRight') go(ply + 1)
    else return
    e.preventDefault()
  }
  const steps = [['first', '⏮', 0], ['prev', '◀', ply - 1], ['next', '▶', ply + 1], ['last', '⏭', moves.length]]
  return (
    // tabIndex: стрелки листают партию, когда фокус где угодно внутри разбора
    <div className="ch-review ch-game" tabIndex={-1} onKeyDown={onKeyDown}>
      <div className="ch-stage">
        <Board fen={fen} board={boardOf(fen)} orientation={record.color} playerColor={record.color} interactive={false}
          movesFrom={none} onMove={none} lastMove={last} check={null} hint={null} animateLast={false} t={t} />
      </div>
      <aside className="ch-side">
        <button type="button" className="ch-btn" onClick={onClose}>{t('back')}</button>
        <MoveList moves={moves} current={ply} onPick={go} />
        <div className="ch-steps">
          {steps.map(([key, glyph, to]) => (
            <button key={key} type="button" className="ch-btn" data-step={key} aria-label={t(key)} onClick={() => go(to)}>{glyph}</button>
          ))}
        </div>
      </aside>
    </div>
  )
}

export default function HistoryView({ t, history, open, onOpen, onClose }) {
  if (open) return <Review key={open.id} t={t} record={open} onClose={onClose} />
  if (!history.length) return <p className="ch-empty">{t('gamesEmpty')}</p>
  return (
    <ul className="ch-games">
      {history.map((r) => {
        const score = scoreFor(r.result, r.color)
        const count = movesOf(r.pgn)?.length ?? 0
        return (
          <li key={r.id}>
            <button type="button" className={`ch-games__row ch-games__row--${HEADS[score]}`} data-game={r.id} onClick={() => onOpen(r)}>
              <b>{t(HEADS[score])}</b>
              <span>{t(`reason.${r.reason}`)}</span>
              <span>{t(r.color === 'w' ? 'white' : 'black')} · {t('vs', { rating: r.botRating })}</span>
              <span>{t('movesCount', { n: count })}</span>
              <span>{r.rated ? `${r.ratingBefore} → ${r.ratingAfter}` : '—'}</span>
              <time dateTime={new Date(r.endedAt).toISOString()}>{new Date(r.endedAt).toLocaleDateString()}</time>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
