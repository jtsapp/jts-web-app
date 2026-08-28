'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { orderTiles, sortOrder, seqOrder, orderOk } from '../../../practice/workbook/engine.js'
import { Note, Pic, Qnum, useSlot } from '../ActShell.jsx'
import { loc } from '../loc.js'

// Задания «в тапах»: сборка предложения, поиск ошибки, разбор по группам и
// порядок событий. Порт R.order/R.fix/R.sort/R.seq (data/jtsworkbook-a0.html
// :5715, :5786, :5831, :5999) без drag-and-drop — только тап.

/* ── Собери предложение ────────────────────────────────────────────────── */
function OrderItem({ act, it, i, ctl }) {
  const slot = useSlot(ctl, i)
  const tiles = orderTiles(act, i)
  const [built, setBuilt] = useState([]) // индексы плиток в собранной строке
  const [bad, setBad] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const closed = slot.closed
  const revealed = ctl.revealed && !slot.own

  const check = (next) => {
    if (next.length < it.w.length) return
    if (orderOk(it, next.map((k) => tiles[k]))) {
      setBad(false)
      slot.right()
      return
    }
    setBad(true)
    slot.wrong()
    // Слова не выбрасываются — через паузу они возвращаются в лоток.
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setBad(false)
      setBuilt([])
    }, 820)
  }

  const push = (k) => {
    if (closed || built.includes(k)) return
    const next = built.concat([k])
    setBuilt(next)
    check(next)
  }
  const pull = (k) => {
    if (closed) return
    setBad(false)
    setBuilt((b) => b.filter((x) => x !== k))
  }

  return (
    <div className={'wb-item' + (closed || revealed ? ' is-solved' : '')}>
      <div className="wb-qline">
        <Qnum n={i} />
        <Pic p={it.pic} />
        <span className="wb-ph">{it.hint || ''}</span>
      </div>
      <div className={'wb-built' + (bad ? ' is-no' : '') + (slot.own ? ' is-ok' : '') + (revealed ? ' is-rev' : '')}>
        {revealed ? (
          <span className="wb-corr">{it.a}</span>
        ) : (
          built.map((k) => (
            <button key={k} type="button" className="wb-tok" disabled={closed} onClick={() => pull(k)}>
              {tiles[k]}
            </button>
          ))
        )}
      </div>
      {closed || revealed ? null : (
        <div className="wb-tiles">
          {tiles.map((w, k) => (
            <button
              key={k}
              type="button"
              className={'wb-tok' + (built.includes(k) ? ' is-used' : '')}
              disabled={built.includes(k)}
              onClick={() => push(k)}
            >
              {w}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function OrderAct({ act, ctl }) {
  const { t } = useI18n()
  return (
    <>
      <Note kind="tell" icon="👆">
        {t('workbook.tapOrder')}
      </Note>
      {act.items.map((it, i) => (
        <OrderItem key={i} act={act} it={it} i={i} ctl={ctl} />
      ))}
    </>
  )
}

/* ── Найди ошибку ──────────────────────────────────────────────────────── */
function FixItem({ it, i, ctl }) {
  const { t } = useI18n()
  const slot = useSlot(ctl, i)
  const [bad, setBad] = useState([])
  const closed = slot.closed
  const revealed = ctl.revealed && !slot.own

  return (
    <div className={'wb-item' + (closed || revealed ? ' is-solved' : '')}>
      <div className="wb-qline">
        <Qnum n={i} />
        <Pic p={it.pic} />
        {it.w.map((w, k) => {
          let state = null
          if (k === it.bad && (slot.own || revealed)) state = slot.own ? 'ok' : 'rev'
          else if (bad.includes(k)) state = 'no'
          return (
            <button
              key={k}
              type="button"
              className={'wb-fixw' + (state ? ' is-' + state : '')}
              disabled={closed || revealed}
              onClick={() => {
                // Задание — «одно слово лишнее, ткни в него», поэтому попадание
                // по нему это ВЕРНЫЙ ответ, а не ошибка.
                if (k === it.bad) slot.right()
                else {
                  setBad((b) => (b.includes(k) ? b : b.concat([k])))
                  slot.wrong()
                }
              }}
            >
              {w}
            </button>
          )
        })}
        {closed || revealed ? <span className="wb-corr">→ {it.fix}</span> : null}
      </div>
      {slot.own && it.why ? (
        <Note kind={slot.clean ? 'good' : 'tell'} icon="💡">
          {it.why}
        </Note>
      ) : slot.own && !slot.clean ? (
        <Note kind="good" icon="✓">
          {t('workbook.gotIt')}
        </Note>
      ) : null}
    </div>
  )
}

export function FixAct({ act, ctl }) {
  return (
    <>
      {act.items.map((it, i) => (
        <FixItem key={i} it={it} i={i} ctl={ctl} />
      ))}
    </>
  )
}

/* ── Разложи по группам ────────────────────────────────────────────────── */
export function SortAct({ act, ctl }) {
  const { t, lang } = useI18n()
  // Порядок чипов — из движка; место в счётчике нумеруется по нему же, как в
  // прототипе (dataset.idx присваивался уже перемешанному списку).
  const order = sortOrder(act)
  const [placed, setPlaced] = useState({}) // idx чипа → колонка
  const [clean, setClean] = useState({})
  const [bad, setBad] = useState(null)
  const timer = useRef(null)
  const [active, setActive] = useState(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const place = (slotIdx, col) => {
    const it = act.items[order[slotIdx]]
    if (placed[slotIdx] !== undefined) return
    setActive(null)
    if (it.c === col) {
      setPlaced((p) => ({ ...p, [slotIdx]: col }))
      ctl.judge(slotIdx, clean[slotIdx] !== false)
      return
    }
    setClean((c) => ({ ...c, [slotIdx]: false }))
    setBad(slotIdx)
    ctl.miss()
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setBad(null), 900)
  }

  const revealed = ctl.revealed
  const chipCol = (slotIdx) => {
    if (placed[slotIdx] !== undefined) return placed[slotIdx]
    if (revealed) return act.items[order[slotIdx]].c
    return null
  }

  return (
    <>
      <div className={'wb-cols' + (act.cols.length > 2 ? ' wb-cols--3' : '')}>
        {act.cols.map((c, k) => (
          <div
            key={k}
            className={'wb-col' + (active != null ? ' is-armed' : '')}
            onClick={() => active != null && place(active, k)}
          >
            <h4>{loc(c, lang)}</h4>
            <div className="wb-drop">
              {order.map((oi, slotIdx) =>
                chipCol(slotIdx) === k ? (
                  <span
                    key={slotIdx}
                    className={'wb-tok is-' + (placed[slotIdx] !== undefined ? 'ok' : 'rev')}
                  >
                    <Pic p={act.items[oi].pic} />
                    {act.items[oi].x}
                  </span>
                ) : null
              )}
            </div>
          </div>
        ))}
      </div>
      <Note kind="tell" icon="👆">
        {t('workbook.tapWordCol')}
      </Note>
      <div className="wb-tiles">
        {order.map((oi, slotIdx) =>
          chipCol(slotIdx) === null ? (
            <button
              key={slotIdx}
              type="button"
              className={
                'wb-tok' + (active === slotIdx ? ' is-act' : '') + (bad === slotIdx ? ' is-no' : '')
              }
              onClick={(e) => {
                e.stopPropagation()
                setActive((a) => (a === slotIdx ? null : slotIdx))
              }}
            >
              <Pic p={act.items[oi].pic} />
              {act.items[oi].x}
            </button>
          ) : null
        )}
      </div>
    </>
  )
}

/* ── Порядок событий ───────────────────────────────────────────────────── */
export function SeqAct({ act, ctl }) {
  const order = seqOrder(act)
  const [pos, setPos] = useState(0)
  const [clean, setClean] = useState(true)
  const [bad, setBad] = useState(null)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const revealed = ctl.revealed
  const tap = (oi) => {
    if (pos >= act.items.length) return
    if (oi === pos) {
      ctl.judge(pos, clean)
      setPos((p) => p + 1)
      // Чистота считается заново для каждой позиции: промах на третьем пункте
      // не должен обесценивать четвёртый.
      setClean(true)
      return
    }
    setClean(false)
    setBad(oi)
    ctl.miss()
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setBad(null), 460)
  }

  return (
    <div className="wb-seq">
      {order.map((oi) => {
        const done = oi < pos
        const shown = done || revealed
        return (
          <button
            key={oi}
            type="button"
            className={'wb-seqrow' + (done ? ' is-ok' : revealed ? ' is-rev' : '') + (bad === oi ? ' is-no' : '')}
            disabled={shown}
            onClick={() => tap(oi)}
          >
            <span className="wb-seqrow__n" aria-hidden="true">
              {shown ? oi + 1 : '·'}
            </span>
            <Pic p={act.items[oi].pic} />
            <span className="wb-seqrow__x">{act.items[oi].s}</span>
          </button>
        )
      })}
    </div>
  )
}
