'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { orderTiles, sortOrder, seqOrder, orderOk } from '../../../practice/workbook/engine.js'
import { Note, Pic, Qnum, useSlot } from '../ActShell.jsx'
import { slotIndexAt, useGrab, useZone, justDragged } from '../dnd.js'
import { loc } from '../loc.js'

// Сборка предложения, поиск ошибки, разбор по группам и порядок событий.
// Порт R.order/R.fix/R.sort/R.seq (data/jtsworkbook-a0.html :5715, :5786,
// :5831, :5999). Слово можно и перетащить, и поставить двумя тапами — обе
// дороги ведут в один и тот же судья, как в прототипе.

/* ── Собери предложение ────────────────────────────────────────────────── */
/* Плитка. У каждого предложения свой kind, поэтому слово из одной строки
   нельзя уронить в соседнюю. */
function Tile({ w, kind, payload, disabled, onTap }) {
  const ref = useGrab(kind, payload, disabled)
  return (
    <button
      ref={ref}
      type="button"
      className={'wb-tok' + (disabled ? ' is-used' : '')}
      disabled={disabled}
      onClick={() => {
        if (justDragged()) return
        onTap()
      }}
    >
      {w}
    </button>
  )
}

function OrderItem({ act, it, i, ctl }) {
  const slot = useSlot(ctl, i)
  const tiles = orderTiles(act, i)
  const [built, setBuilt] = useState([]) // индексы плиток в собранной строке
  const [bad, setBad] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const closed = slot.closed
  const revealed = ctl.revealed && !slot.own
  const KIND_TRAY = 'wb-order-' + i // из лотка в строку
  const KIND_LINE = 'wb-line-' + i // из строки обратно в лоток

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

  /* at — куда вставить: слово падает туда, где его отпустили, а не в конец. */
  const push = (k, at) => {
    if (closed || built.includes(k)) return
    const next = built.slice()
    if (at == null || at >= next.length) next.push(k)
    else next.splice(at, 0, k)
    setBuilt(next)
    check(next)
  }
  const pull = (k) => {
    if (closed) return
    setBad(false)
    setBuilt((b) => b.filter((x) => x !== k))
  }

  const lineRef = useZone(KIND_TRAY, (k, x, y, node) => push(k, slotIndexAt(node, x, y)), closed || revealed)
  const trayRef = useZone(KIND_LINE, (k) => pull(k), closed || revealed)

  return (
    <div className={'wb-item' + (closed || revealed ? ' is-solved' : '')}>
      <div className="wb-qline">
        <Qnum n={i} />
        <Pic p={it.pic} />
        <span className="wb-ph">{it.hint || ''}</span>
      </div>
      <div
        ref={lineRef}
        className={'wb-built' + (bad ? ' is-no' : '') + (slot.own ? ' is-ok' : '') + (revealed ? ' is-rev' : '')}
      >
        {revealed ? (
          <span className="wb-corr">{it.a}</span>
        ) : (
          built.map((k) => (
            <Tile
              key={k}
              w={tiles[k]}
              kind={KIND_LINE}
              payload={k}
              disabled={closed}
              onTap={() => pull(k)}
            />
          ))
        )}
      </div>
      {closed || revealed ? null : (
        <div ref={trayRef} className="wb-tiles">
          {tiles.map((w, k) => (
            <Tile
              key={k}
              w={w}
              kind={KIND_TRAY}
              payload={k}
              disabled={built.includes(k)}
              onTap={() => push(k)}
            />
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
const CHIP_KIND = 'wb-chip'

function SortCol({ title, armed, onPlace, children }) {
  const ref = useZone(CHIP_KIND, (slotIdx) => onPlace(slotIdx))
  return (
    <div
      ref={ref}
      className={'wb-col' + (armed ? ' is-armed' : '')}
      onClick={() => {
        if (justDragged()) return
        onPlace(null)
      }}
    >
      <h4>{title}</h4>
      <div className="wb-drop">{children}</div>
    </div>
  )
}

function Chip({ item, slotIdx, active, bad, onTap }) {
  const ref = useGrab(CHIP_KIND, slotIdx)
  return (
    <button
      ref={ref}
      type="button"
      className={'wb-tok' + (active ? ' is-act' : '') + (bad ? ' is-no' : '')}
      onClick={(e) => {
        e.stopPropagation()
        if (justDragged()) return
        onTap()
      }}
    >
      <Pic p={item.pic} />
      {item.x}
    </button>
  )
}

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
    if (slotIdx == null || placed[slotIdx] !== undefined) return
    const it = act.items[order[slotIdx]]
    setActive(null)
    if (it.c === col) {
      setPlaced((p) => ({ ...p, [slotIdx]: col }))
      ctl.judge(slotIdx, clean[slotIdx] !== false)
      return
    }
    // Чужая группа: слово остаётся в лотке красным и ждёт новой попытки.
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
          <SortCol
            key={k}
            title={loc(c, lang)}
            armed={active != null}
            // null приходит от тапа по колонке — тогда кладём выбранный чип.
            onPlace={(slotIdx) => place(slotIdx == null ? active : slotIdx, k)}
          >
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
          </SortCol>
        ))}
      </div>
      <Note kind="tell" icon="👆">
        {t('workbook.tapWordCol')}
      </Note>
      <div className="wb-tiles">
        {order.map((oi, slotIdx) =>
          chipCol(slotIdx) === null ? (
            <Chip
              key={slotIdx}
              item={act.items[oi]}
              slotIdx={slotIdx}
              active={active === slotIdx}
              bad={bad === slotIdx}
              onTap={() => setActive((a) => (a === slotIdx ? null : slotIdx))}
            />
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
