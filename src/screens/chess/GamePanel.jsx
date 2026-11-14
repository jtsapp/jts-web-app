// src/screens/chess/GamePanel.jsx
'use client'

import { useEffect, useRef } from 'react'
import { Piece } from './pieces.jsx'

const ORDER = { q: 0, r: 1, b: 2, n: 3, p: 4 }
const other = (c) => (c === 'w' ? 'b' : 'w')

function fmt(ms) {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  // В последние десять секунд — десятые: по целым секундам флаг падает «внезапно».
  if (ms < 10000) return `0:${String(Math.floor(ms / 1000)).padStart(2, '0')}.${Math.floor((ms % 1000) / 100)}`
  return `${m}:${String(s).padStart(2, '0')}`
}

// Полоса игрока над доской и под ней: кто, рейтинг, взятые фигуры, часы. Аватар — король своего цвета:
// по нему сразу видно, чья сторона сверху, и перевёрнута ли доска.
export function PlayerBar({ name, sub, side, snap }) {
  // Взятое этой стороной — фигуры соперника; перевес показываем у того, кто впереди.
  const taken = [...snap.captured[side]].sort((a, b) => ORDER[a] - ORDER[b])
  const lead = side === 'w' ? snap.lead : -snap.lead
  const running = snap.status === 'playing' && snap.turn === side && snap.moves.length > 0 && !snap.engineError
  return (
    <div className="ch-player">
      <div className={`ch-player__ava ch-player__ava--${side}`} aria-hidden="true"><Piece type="k" color={side} className="ch-player__king" /></div>
      <div className="ch-player__who">
        <div className="ch-player__name"><b>{name}</b>{sub && <span>{sub}</span>}</div>
        <div className="ch-player__taken" aria-hidden="true">
          {taken.map((type, i) => <Piece key={i} type={type} color={other(side)} className="ch-taken" />)}
          {lead > 0 && <span className="ch-player__lead">+{lead}</span>}
        </div>
      </div>
      {snap.clock && (
        <div className={`ch-clock ${running ? 'is-on' : ''} ${snap.clock[side] < 10000 ? 'is-low' : ''}`} data-side={side} role="timer">{fmt(snap.clock[side])}</div>
      )}
    </div>
  )
}

export function MoveList({ moves, current = null, onPick = null }) {
  const list = useRef(null)
  // В живой партии список сам доезжает до последнего хода; в разборе (onPick) — стоит, где листают.
  // Крутим сам список, а не scrollIntoView: тот двигает и предков, и на телефоне уводил всю страницу вбок.
  useEffect(() => {
    const el = list.current
    if (!el || onPick) return
    el.scrollTop = el.scrollHeight
    el.scrollLeft = el.scrollWidth
  }, [moves.length, onPick])
  // В живой партии подсвечен последний ход, в разборе — тот, на котором стоят.
  const marked = onPick ? current : moves.length
  const rows = []
  for (let i = 0; i < moves.length; i += 2) rows.push([moves[i], moves[i + 1]])
  const cell = (m, ply) => {
    if (!m) return <span />
    const cls = `ch-moves__san ${marked === ply ? 'is-on' : ''}`
    return onPick
      ? <button type="button" className={cls} data-ply={ply} onClick={() => onPick(ply)}>{m.san}</button>
      : <span className={cls} data-ply={ply}>{m.san}</span>
  }
  return (
    <ol className="ch-moves" ref={list}>
      {rows.map(([w, b], i) => (
        <li key={i}><span className="ch-moves__no">{i + 1}.</span>{cell(w, i * 2 + 1)}{cell(b, i * 2 + 2)}</li>
      ))}
    </ol>
  )
}

// Значки кнопок партии: подпись под значком короткая, а действие читается с первого взгляда.
const ICONS = {
  undo: 'M9 6 4 11l5 5M4 11h10a5 5 0 0 1 0 10h-3',
  hint: 'M9 21h6M10 17h4M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3z',
  flip: 'M7 4v14m0 0-3-3m3 3 3-3M17 20V6m0 0-3 3m3-3 3 3',
  resign: 'M5 21V4m0 1h11l-2 4 2 4H5',
}

function Icon({ name }) {
  return (
    <svg className="ch-act__ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  )
}

export function Actions({ t, snap, onUndo, onHint, onFlip, onResign, onNew }) {
  const playing = snap.status === 'playing'
  const myTurn = playing && snap.turn === snap.playerColor && !snap.thinking && !snap.engineError
  const items = [
    ['undo', !snap.canUndo, onUndo],
    ['hint', !myTurn || snap.hintPending, onHint],
    ['flip', false, onFlip],
    ['resign', !playing, onResign],
  ]
  return (
    <div className="ch-actions">
      <div className="ch-actions__row">
        {items.map(([key, disabled, run]) => (
          <button key={key} type="button" className="ch-act" data-act={key} title={t(key)} disabled={disabled} onClick={run}>
            <Icon name={key} /><span>{t(`${key}Short`)}</span>
          </button>
        ))}
      </div>
      <button type="button" className="ch-btn ch-btn--play" data-act="new" onClick={onNew}>{t('newGame')}</button>
    </div>
  )
}
