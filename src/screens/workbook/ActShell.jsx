'use client'

import { useCallback, useMemo, useState } from 'react'
import { createActState, hit, slip, actDone, revealRest } from '../../practice/workbook/actCtl.js'

// Общая обвязка экрана задания: счётчик мест, «неверно», «показать ответы» и
// мелкие кирпичики разметки. Порт поведения renderAct из прототипа
// (data/jtsworkbook-a0.html:6289) — правильный ответ не показывается сам:
// он открывается только кнопкой «показать», и тогда место засчитывается как
// ошибка. Это поведенческий контракт, а не украшение.

export function useAct(act) {
  const [state, setState] = useState(() => createActState(act))
  const [revealed, setRevealed] = useState(false)
  // «Заново» пересобирает экран с нуля: новый счётчик и новые узлы, без
  // остатков подсветки — в прототипе build() делал ровно это.
  const [gen, setGen] = useState(0)

  const judge = useCallback((idx, ok) => setState((s) => hit(s, idx, ok)), [])
  const miss = useCallback(() => setState((s) => slip(s)), [])
  const reveal = useCallback(() => {
    setRevealed(true)
    setState((s) => revealRest(s))
  }, [])
  const again = useCallback(() => {
    setState(createActState(act))
    setRevealed(false)
    setGen((g) => g + 1)
  }, [act])

  return useMemo(
    () => ({ state, judge, miss, reveal, again, revealed, gen, done: actDone(state) }),
    [state, judge, miss, reveal, again, revealed, gen]
  )
}

/**
 * Место (пункт) экрана: держит собственную «чистоту» — верно ли решено с
 * первой попытки — и закрывается ровно один раз.
 */
export function useSlot(ctl, idx) {
  const [clean, setClean] = useState(true)
  // own — «решил сам». Отдельно от closed: «показать ответ» закрывает все
  // оставшиеся места как ошибки, и без этого флага раскрытый ответ выглядел бы
  // как заработанный.
  const [own, setOwn] = useState(false)
  const closed = !!ctl.state.closed[idx]

  const wrong = useCallback(() => {
    setClean(false)
    ctl.miss()
  }, [ctl])

  const right = useCallback(() => {
    setOwn(true)
    ctl.judge(idx, clean)
  }, [ctl, idx, clean])

  return { clean, closed, own, wrong, right }
}

/* ── Кирпичики ─────────────────────────────────────────────────────────── */
export function Note({ kind = 'tell', icon, children }) {
  return (
    <div className={'wb-note wb-note--' + kind}>
      {icon ? (
        <span className="wb-note__ic" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </div>
  )
}

export function Qnum({ n }) {
  return <i className="wb-qn">{n + 1}</i>
}

export function Pic({ p }) {
  if (!p) return null
  return (
    <span className="wb-pic" aria-hidden="true">
      {p}
    </span>
  )
}

/**
 * Точки прогресса экрана. Порт paintTally: закрытые места закрашены, промахи —
 * оранжевым; больше двенадцати точек не рисуем, дальше только счёт.
 */
export function Tally({ state, freeLabel, rightFirstLabel }) {
  if (state.free) return <div className="wb-tally wb-tally--free">{freeLabel}</div>
  const show = Math.min(state.total, 12)
  if (actDone(state)) {
    return (
      <div className="wb-tally" aria-live="polite">
        <b className="wb-tally__done">{rightFirstLabel}</b>
      </div>
    )
  }
  return (
    <div className="wb-tally" aria-live="polite">
      {Array.from({ length: show }, (_, k) => {
        const closed = k < state.resolved
        const bad = state.missed.includes(k)
        return <span key={k} className={'wb-dot' + (closed ? (bad ? ' is-bad' : ' is-on') : '')} />
      })}
      <span className="wb-tally__n">
        {state.resolved} / {state.total}
      </span>
    </div>
  )
}
