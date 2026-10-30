import { useEffect, useId, useRef, useState } from 'react'
import { ExpandMoreIcon } from '../../ielts/icons.jsx'
import { TickIcon } from '../icons.jsx'
import { toggleIn } from '../practice/FilterBlocks.jsx'

/**
 * Фильтр-«таблетка» журнала ошибок («NEW 2», 17:9002): кнопка с названием, под ней — всплывающий список. Семь
 * фильтров чипами заняли бы три строки над таблицей, поэтому в макете они свёрнуты. Выбранное значение пишется
 * в самой таблетке — иначе, закрыв список, не видно, что фильтр включён. Esc и клик мимо закрывают список.
 */
export function PillMenu({ label, summary, children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const btn = useRef(null)
  const id = useId()

  useEffect(() => {
    if (!open) return undefined
    // фокус — на выбранный пункт (или первый): с клавиатуры список листается сразу, без лишнего Tab
    const pop = ref.current?.querySelector('.st-pill__pop')
    ;(pop?.querySelector('[aria-selected="true"]') || pop?.querySelector('button, input'))?.focus()
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      btn.current?.focus()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={`st-pill ${summary ? 'is-set' : ''}`} ref={ref}>
      <button ref={btn} type="button" className="st-pill__btn" aria-haspopup="true" aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}>
        <span>{label}{summary && <b>: {summary}</b>}</span>
        <ExpandMoreIcon size={16} />
      </button>
      {open && <div className="st-pill__pop" id={id}>{children(() => setOpen(false))}</div>}
    </div>
  )
}

/** Список значений: один выбор закрывает список, несколько (сложность) — остаётся открытым. options — [{value, label}]. */
export function PillSelect({ label, value, options, onChange, multi = false, allValue = 'all' }) {
  const isOn = (v) => (multi ? value.includes(v) : value === v)
  const chosen = options.filter((o) => o.value !== allValue && isOn(o.value)).map((o) => o.label)
  return (
    <PillMenu label={label} summary={chosen.length ? chosen.join(', ') : null}>
      {(close) => (
        <div role="listbox" aria-label={label} aria-multiselectable={multi || undefined}>
          {options.map((o) => (
            <button key={String(o.value)} type="button" role="option" aria-selected={isOn(o.value)} className={`st-pill__opt ${isOn(o.value) ? 'is-on' : ''}`}
              onClick={() => {
                if (multi) return onChange(toggleIn(value, o.value))
                onChange(o.value)
                return close()
              }}>
              <span>{o.label}</span>
              {isOn(o.value) && <TickIcon size={16} />}
            </button>
          ))}
        </div>
      )}
    </PillMenu>
  )
}

/** Дата: диапазон двумя полями в одном всплывающем окне. format — как показать день в таблетке. */
export function PillDate({ label, from, to, fromLabel, toLabel, format, onChange }) {
  const summary = from || to ? `${from ? format(from) : '…'} – ${to ? format(to) : '…'}` : null
  return (
    <PillMenu label={label} summary={summary}>
      {() => (
        <div className="st-pill__dates">
          <label>{fromLabel}<input type="date" value={from} max={to || undefined} onChange={(e) => onChange({ from: e.target.value, to })} /></label>
          <label>{toLabel}<input type="date" value={to} min={from || undefined} onChange={(e) => onChange({ from, to: e.target.value })} /></label>
        </div>
      )}
    </PillMenu>
  )
}
