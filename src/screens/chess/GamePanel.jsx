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

export function PlayerBar({ name, sub, side, snap }) {
  // Взятое этой стороной — фигуры соперника; перевес показываем у того, кто впереди.
  const taken = [...snap.captured[side]].sort((a, b) => ORDER[a] - ORDER[b])
  const lead = side === 'w' ? snap.lead : -snap.lead
  const running = snap.status === 'playing' && snap.turn === side && snap.moves.length > 0 && !snap.engineError
  return (
    <div className="ch-player">
      <div className="ch-player__who"><b>{name}</b>{sub && <span>{sub}</span>}</div>
      <div className="ch-player__taken" aria-hidden="true">
        {taken.map((type, i) => <Piece key={i} type={type} color={other(side)} className="ch-taken" />)}
        {lead > 0 && <span className="ch-player__lead">+{lead}</span>}
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
  const rows = []
  for (let i = 0; i < moves.length; i += 2) rows.push([moves[i], moves[i + 1]])
  const cell = (m, ply) => {
    if (!m) return <span />
    const cls = `ch-moves__san ${current === ply ? 'is-on' : ''}`
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

export function Actions({ t, snap, onUndo, onHint, onFlip, onResign, onNew }) {
  const playing = snap.status === 'playing'
  const myTurn = playing && snap.turn === snap.playerColor && !snap.thinking && !snap.engineError
  return (
    <div className="ch-actions">
      <button type="button" className="ch-btn" data-act="undo" disabled={!snap.canUndo} onClick={onUndo}>{t('undo')}</button>
      <button type="button" className="ch-btn" data-act="hint" disabled={!myTurn || snap.hintPending} onClick={onHint}>{t('hint')}</button>
      <button type="button" className="ch-btn" data-act="flip" onClick={onFlip}>{t('flip')}</button>
      <button type="button" className="ch-btn" data-act="resign" disabled={!playing} onClick={onResign}>{t('resign')}</button>
      <button type="button" className="ch-btn ch-btn--main" data-act="new" onClick={onNew}>{t('newGame')}</button>
    </div>
  )
}
