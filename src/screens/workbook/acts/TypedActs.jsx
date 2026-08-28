'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { typeOk } from '../../../practice/workbook/engine.js'
import { Note, Qnum, useSlot } from '../ActShell.jsx'

// Набранные ответы уровней B1/B2: переписать предложение (ttrans), собрать
// слово от корня (wform) и цепочка из двух перезаписей одного предложения
// (chain). Порт typedItem + R.ttrans/R.wform/R.chain
// (data/jtsworkbook-b1.html, data/jtsworkbook-b2.html).
//
// Судья набранного — уровня, а не общий: на B1 «I have not seen him» и
// «I haven't seen him» это один ответ, на A0 — разные (см. match.js). Поэтому
// level протаскивается до самой строки ввода.

/**
 * Строка ввода с собственным местом в счётчике. Общая для ttrans/wform/chain:
 * все три судятся одинаково, различается только шапка над полем.
 */
function TypedRow({ item, idx, ctl, level, head, wide }) {
  const { t } = useI18n()
  const slot = useSlot(ctl, idx)
  const [value, setValue] = useState('')
  const [bad, setBad] = useState(false)
  const timer = useRef(null)
  const inp = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const closed = slot.closed
  const revealed = ctl.revealed && !slot.own

  const judge = () => {
    if (closed || !value.trim()) return
    if (typeOk(item, value, level)) {
      setValue(item.a)
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
    <div className={'wb-typed' + (closed || revealed ? ' is-solved' : '')}>
      {head}
      <div className="wb-trow">
        <input
          ref={inp}
          className={
            'wb-tin' + (wide ? ' wb-tin--wide' : '') +
            (bad ? ' is-no' : slot.own ? ' is-ok' : revealed ? ' is-rev' : '')
          }
          type="text"
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label={item.cue || item.q || item.a}
          placeholder={item.ph || ''}
          value={revealed ? item.a : value}
          disabled={closed || revealed}
          onChange={(e) => setValue(e.target.value)}
          // По потере фокуса не судим: недописанное предложение когда-то
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
          {t('workbook.answerIs')} <b>{item.a}</b>
          {item.why ? ' — ' + item.why : ''}
        </Note>
      ) : slot.own && item.why ? (
        <Note kind={slot.clean ? 'good' : 'tell'} icon="💡">
          {item.why}
        </Note>
      ) : slot.own && !slot.clean ? (
        <Note kind="good" icon="✓">
          {t('workbook.gotIt')}
        </Note>
      ) : null}
    </div>
  )
}

/* ── Перепиши предложение ──────────────────────────────────────────────── */
export function TtransAct({ act, ctl, level }) {
  const { t } = useI18n()
  return (
    <>
      {act.say ? (
        <Note kind="tell" icon="🗣️">
          {t('workbook.sayIt')}
        </Note>
      ) : null}
      {act.items.map((it, i) => (
        <TypedRow
          key={i}
          item={it}
          idx={i}
          ctl={ctl}
          level={level}
          wide
          head={
            <>
              <div className="wb-qline">
                <Qnum n={i} />
                <span className="wb-srcline">{it.from}</span>
              </div>
              <div className="wb-cue">
                <span className="wb-cue__ar" aria-hidden="true">
                  ↓
                </span>
                <span>{it.cue}</span>
              </div>
            </>
          }
        />
      ))}
    </>
  )
}

/* ── Собери слово от корня ─────────────────────────────────────────────── */
export function WformAct({ act, ctl, level }) {
  return (
    <>
      {act.items.map((it, i) => (
        <TypedRow
          key={i}
          item={it}
          idx={i}
          ctl={ctl}
          level={level}
          head={
            <div className="wb-qline">
              <Qnum n={i} />
              <span>{it.q}</span>
              <span className="wb-root">{it.root}</span>
            </div>
          }
        />
      ))}
    </>
  )
}

/* ── Цепочка: одно предложение, два шага ───────────────────────────────── */
/* Место в счётчике — ШАГ, а не пункт: иначе экран закрывался бы на половине
   работы. Номер места считается по порядку шагов, как L.add() в прототипе. */
export function ChainAct({ act, ctl, level }) {
  let idx = -1
  return (
    <>
      {act.items.map((it, i) => (
        <div className="wb-item wb-chain" key={i}>
          <div className="wb-qline">
            <Qnum n={i} />
            <span className="wb-srcline">{it.from}</span>
          </div>
          {it.steps.map((st, k) => {
            idx++
            return (
              <TypedRow
                key={k}
                item={st}
                idx={idx}
                ctl={ctl}
                level={level}
                wide
                head={
                  <div className="wb-cstep">
                    <span className="wb-cstep__n" aria-hidden="true">
                      {k + 1}
                    </span>
                    <span className="wb-cstep__cue">{st.cue}</span>
                  </div>
                }
              />
            )
          })}
        </div>
      ))}
    </>
  )
}
