'use client'

import { useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { optOrder } from '../../../practice/workbook/engine.js'
import { Note, Qnum } from '../ActShell.jsx'

// Викторина урока (B2). Порт R.quiz (data/jtsworkbook-b2.html:13417):
// вопросы идут ПО ОДНОМУ, ответ засчитывается с первой и единственной попытки,
// в конце — счёт. Это контрольная точка, а не ворота: порога прохождения нет.
//
// Второй попытки здесь нет намеренно, поэтому и «показать ответы» на экране не
// появляется: кнопка живёт от промахов (ctl.state.wrong), а промахов викторина
// не считает — ровно как прототип.

export default function QuizAct({ act, ctl }) {
  const { t } = useI18n()
  const items = act.items
  const [pos, setPos] = useState(0)
  const [right, setRight] = useState(0)
  const [picked, setPicked] = useState(null) // индекс варианта в порядке показа

  // «Показать ответы» из разбора ошибок закрывает остаток как неверные — тогда
  // викторина сразу показывает итог. Это ВЫВОД из состояния экрана, а не своё
  // состояние: копия в useState разъехалась бы с ctl на один кадр.
  if (pos >= items.length || ctl.revealed) {
    return (
      <div className="wb-quizscore">
        <div className="wb-quizscore__k">{t('workbook.quizScore')}</div>
        <div className="wb-quizscore__n">
          {right} / {items.length}
        </div>
      </div>
    )
  }

  const it = items[pos]
  const order = optOrder(act, it, pos)
  const rightIdx = order.indexOf(it.a)
  const answered = picked != null

  return (
    <>
      <div className="wb-qbar">
        <div className="wb-qbar__track">
          <i style={{ width: Math.round((pos / items.length) * 100) + '%' }} />
        </div>
        <b>{t('workbook.quizOf', { a: pos + 1, b: items.length })}</b>
      </div>
      <div className="wb-item">
        <div className="wb-qline">
          <Qnum n={pos} />
          <span>{it.q}</span>
        </div>
        <div className="wb-opts">
          {order.map((oi, k) => {
            let state = null
            if (answered) {
              if (k === rightIdx) state = picked === rightIdx ? 'ok' : 'rev'
              else if (k === picked) state = 'no'
            }
            return (
              <button
                key={k}
                type="button"
                className={'wb-opt' + (state ? ' is-' + state : '')}
                disabled={answered}
                aria-label={String(it.o[oi])}
                onClick={() => {
                  if (answered) return
                  const ok = k === rightIdx
                  setPicked(k)
                  if (ok) setRight((n) => n + 1)
                  ctl.judge(pos, ok)
                }}
              >
                {it.o[oi]}
              </button>
            )
          })}
        </div>
        {answered && it.why ? (
          <Note kind={picked === rightIdx ? 'good' : 'tell'} icon="💡">
            {it.why}
          </Note>
        ) : null}
        {answered ? (
          <button
            type="button"
            className="wb-ghost wb-ghost--gap"
            onClick={() => {
              setPicked(null)
              setPos((p) => p + 1)
            }}
          >
            {t('workbook.nextScreen')} →
          </button>
        ) : null}
      </div>
    </>
  )
}
