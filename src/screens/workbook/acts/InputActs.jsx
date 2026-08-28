'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { typeOk, dropLines, memoDeck } from '../../../practice/workbook/engine.js'
import { Note, Pic, Qnum, useSlot } from '../ActShell.jsx'
import { loc, vocEmoji, vocMeaning } from '../loc.js'

// Ввод и выбор внутри текста: type / drop / memo. Порт R.type (:5946),
// R.drop (:6041) и R.memo (:5890) из data/jtsworkbook-a0.html.

/* ── Набери ответ ──────────────────────────────────────────────────────── */
function TypeItem({ it, i, ctl, level }) {
  const { t, lang } = useI18n()
  const slot = useSlot(ctl, i)
  const [value, setValue] = useState('')
  const [bad, setBad] = useState(false)
  const timer = useRef(null)
  const inp = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const closed = slot.closed
  const revealed = ctl.revealed && !slot.own

  const judge = () => {
    if (closed || !value.trim()) return
    if (typeOk(it, value, level)) {
      setValue(it.a)
      setBad(false)
      slot.right()
      return
    }
    setBad(true)
    slot.wrong()
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setBad(false), 560)
    try {
      inp.current?.select()
    } catch {
      /* поле уже размонтировано */
    }
  }

  return (
    <div className={'wb-item' + (closed || revealed ? ' is-solved' : '')}>
      <div className="wb-qline">
        <Qnum n={i} />
        <Pic p={it.pic} />
        <span>{loc(it.q, lang)}</span>
      </div>
      <div className="wb-trow">
        <input
          ref={inp}
          className={'wb-tin' + (bad ? ' is-no' : slot.own ? ' is-ok' : revealed ? ' is-rev' : '')}
          type="text"
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label={loc(it.q, lang)}
          placeholder={it.ph || ''}
          value={revealed ? it.a : value}
          disabled={closed || revealed}
          onChange={(e) => setValue(e.target.value)}
          // Ничего не судим по потере фокуса: недонабранное слово когда-то
          // помечалось неверным раньше, чем студент дописывал его.
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              judge()
            }
          }}
        />
        <button
          type="button"
          className="wb-tgo"
          aria-label={t('workbook.check')}
          disabled={closed || revealed}
          onClick={judge}
        >
          →
        </button>
      </div>
      {revealed ? (
        <Note kind="tell" icon="📘">
          {t('workbook.answerIs')} <b>{it.a}</b>
        </Note>
      ) : slot.own && it.why ? (
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

export function TypeAct({ act, ctl, level }) {
  return (
    <>
      {act.items.map((it, i) => (
        <TypeItem key={i} it={it} i={i} ctl={ctl} level={level} />
      ))}
    </>
  )
}

/* ── Выбор внутри текста ───────────────────────────────────────────────── */
export function DropAct({ act, ctl }) {
  const { t } = useI18n()
  const lines = dropLines(act)
  const [clean, setClean] = useState({})
  const [own, setOwn] = useState({})
  const [bad, setBad] = useState({})
  const timers = useRef({})
  useEffect(() => {
    const list = timers.current
    return () => Object.values(list).forEach(clearTimeout)
  }, [])

  let slotIdx = -1
  return (
    <div className="wb-dropbox">
      {lines.map((parts, li) => (
        <p className="wb-dl" key={li}>
          {parts.map((part, pi) => {
            if (!part.pick) return <span key={pi}>{part.text}</span>
            slotIdx++
            const idx = slotIdx
            const closed = !!ctl.state.closed[idx]
            const revealed = ctl.revealed && !own[idx]
            return (
              <select
                key={pi}
                className={'wb-dsel' + (bad[idx] ? ' is-no' : own[idx] ? ' is-ok' : revealed ? ' is-rev' : '')}
                aria-label={t('workbook.chooseWord')}
                disabled={closed || revealed}
                value={closed || revealed ? '0' : ''}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '') return
                  // Верный вариант в данных всегда нулевой; перемешан только показ.
                  if (Number(v) === 0) {
                    setOwn((o) => ({ ...o, [idx]: true }))
                    ctl.judge(idx, clean[idx] !== false)
                    return
                  }
                  setClean((c) => ({ ...c, [idx]: false }))
                  setBad((b) => ({ ...b, [idx]: true }))
                  ctl.miss()
                  clearTimeout(timers.current[idx])
                  timers.current[idx] = setTimeout(
                    () => setBad((b) => ({ ...b, [idx]: false })),
                    460
                  )
                }}
              >
                <option value="">—</option>
                {part.order.map((oi) => (
                  <option key={oi} value={String(oi)}>
                    {part.opts[oi]}
                  </option>
                ))}
              </select>
            )
          })}
        </p>
      ))}
    </div>
  )
}

/* ── Пары слов ─────────────────────────────────────────────────────────── */
export function MemoAct({ act, ctl }) {
  const { t, lang } = useI18n()
  const deck = memoDeck(act)
  const [open, setOpen] = useState([])
  const [got, setGot] = useState({})
  const [tries, setTries] = useState(0)
  const [slipped, setSlipped] = useState({})
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const face = (c) => {
    const p = act.pairs[c.pair]
    // Игра в пары есть только у A0–A2, и там словарь всегда с переводом; форму
    // всё равно спрашиваем у loc, чтобы карточка не зависела от длины массива.
    const shape = p.length === 3 ? 'def' : 'ru-kk'
    return c.side === 'word' ? p[0] : ((vocEmoji(p, shape) || '') + ' ' + vocMeaning(p, lang, shape)).trim()
  }

  const flip = (k) => {
    if (open.length > 1 || open.includes(k) || got[deck[k].pair]) return
    const next = open.concat([k])
    setOpen(next)
    if (next.length < 2) return
    setTries((n) => n + 1)
    const [a, b] = next
    if (deck[a].pair === deck[b].pair) {
      const pair = deck[a].pair
      setGot((g) => ({ ...g, [pair]: true }))
      setOpen([])
      // Пара засчитана «с первой», только если ни одна из её карточек ещё не
      // участвовала в промахе — а не потому, что доске повезло с ходами.
      ctl.judge(pair, !slipped[pair])
      return
    }
    setSlipped((s) => ({ ...s, [deck[a].pair]: true, [deck[b].pair]: true }))
    ctl.miss()
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen([]), 700)
  }

  const found = Object.keys(got).length
  return (
    <>
      <div className="wb-memo-st">
        <span>
          🃏 {t('workbook.pairs')}: <b>{found}</b>/{act.pairs.length}
        </span>
        <span>
          👆 {t('workbook.tries')}: <b>{tries}</b>
        </span>
      </div>
      <div className="wb-memo">
        {deck.map((c, k) => {
          const isGot = !!got[c.pair]
          const isUp = isGot || open.includes(k) || ctl.revealed
          return (
            <button
              key={k}
              type="button"
              className={'wb-mcard' + (isUp ? ' is-up' : '') + (isGot ? ' is-got' : '') + (ctl.revealed && !isGot ? ' is-rev' : '')}
              onClick={() => flip(k)}
            >
              {isUp ? (
                <span className="wb-mcard__face">{face(c)}</span>
              ) : (
                <span className="wb-mcard__back" aria-hidden="true">
                  {c.side === 'word' ? '🔤' : '💭'}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}
