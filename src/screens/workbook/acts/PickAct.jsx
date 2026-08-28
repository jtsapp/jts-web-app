'use client'

import { useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { optOrder } from '../../../practice/workbook/engine.js'
import { Note, Pic, Qnum, useSlot } from '../ActShell.jsx'
import { loc } from '../loc.js'

// Выбор варианта: choose / odd / label / respond и tf. Порт pickRender
// (data/jtsworkbook-a0.html:5376). Неверный вариант гаснет, но пункт остаётся
// живым — прототип даёт перебрать, просто балл за первую попытку потерян.

function Option({ text, state, disabled, onPick }) {
  return (
    <button
      type="button"
      className={'wb-opt' + (state ? ' is-' + state : '')}
      disabled={disabled}
      onClick={onPick}
      aria-label={String(text)}
    >
      {text}
    </button>
  )
}

function PickItem({ act, it, i, ctl, head }) {
  const { t } = useI18n()
  const slot = useSlot(ctl, i)
  const order = optOrder(act, it, i)
  // «Плохие» варианты гасим поимённо: у прототипа кнопка неверного ответа
  // остаётся на экране красной, а не исчезает.
  const [bad, setBad] = useState([])
  const revealed = ctl.revealed && !slot.own

  const solved = slot.own || slot.closed
  return (
    <div className={'wb-item' + (solved ? ' is-solved' : '')}>
      {head(it, i)}
      <div className="wb-opts">
        {order.map((oi, k) => {
          let state = null
          if (solved && oi === it.a) state = revealed ? 'rev' : 'ok'
          else if (revealed && oi === it.a) state = 'rev'
          else if (bad.includes(oi)) state = 'no'
          return (
            <Option
              key={k}
              text={it.o[oi]}
              state={state}
              disabled={solved}
              onPick={() => {
                if (solved) return
                if (oi === it.a) slot.right()
                else {
                  setBad((b) => (b.includes(oi) ? b : b.concat([oi])))
                  slot.wrong()
                }
              }}
            />
          )
        })}
      </div>
      {revealed ? (
        <Note kind="tell" icon="📘">
          {t('workbook.answerIs')} <b>{it.o[it.a]}</b>
          {it.why ? ' — ' + it.why : ''}
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

export default function PickAct({ act, ctl }) {
  const { lang } = useI18n()
  return (
    <>
      {act.items.map((it, i) => (
        <PickItem
          key={i}
          act={act}
          it={it}
          i={i}
          ctl={ctl}
          head={(item, k) => (
            <div className="wb-qline">
              <Qnum n={k} />
              <Pic p={item.pic} />
              <span>{loc(item.q, lang)}</span>
            </div>
          )}
        />
      ))}
    </>
  )
}

/** Ситуация + «что скажешь?»: у respond вместо вопроса сценка. */
export function RespondAct({ act, ctl }) {
  const { t } = useI18n()
  return (
    <>
      {act.items.map((it, i) => (
        <PickItem
          key={i}
          act={act}
          it={it}
          i={i}
          ctl={ctl}
          head={(item) => (
            <div className="wb-sit">
              <div className="wb-sit__em" aria-hidden="true">
                {item.em || '💬'}
              </div>
              <div className="wb-sit__s">{item.sit}</div>
              <div className="wb-sit__ask">{t('workbook.whatSay')}</div>
            </div>
          )}
        />
      ))}
    </>
  )
}

/**
 * Верно/неверно. Прототип превращает его в обычный выбор из двух с nosh:true —
 * порядок «Верно, Неверно» фиксирован, иначе кнопки прыгали бы между пунктами.
 */
export function TfAct({ act, ctl }) {
  const { t } = useI18n()
  const norm = {
    ...act,
    nosh: true,
    items: act.items.map((it) => ({
      q: it.s,
      pic: it.pic,
      o: [t('workbook.true'), t('workbook.false')],
      a: it.a ? 0 : 1,
      why: it.why,
    })),
  }
  return <PickAct act={norm} ctl={ctl} />
}
