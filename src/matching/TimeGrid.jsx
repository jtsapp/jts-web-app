import { useEffect, useMemo, useRef } from 'react'
import { dayShort, gridRows, hhmm, slotKey, toUtcSlot } from './slots.js'
import { useMatchingT } from './texts.js'

const DAYS = [1, 2, 3, 4, 5, 6, 7]

// Сетка «Удобное время» (ТЗ §2.3): строки — старты уроков в поясе ученика, цифра — сколько учителей свободны в этот
// слот. Ячейка хранит UTC-слот (день и время переводятся вместе), выбор — ключи slotKey. На десктопе отметку можно
// протянуть мышью по диапазону: режим (добавлять или снимать) берётся с первой ячейки, как в табличных редакторах.
export default function TimeGrid({ cells, duration, tz, picked, onChange, best = [] }) {
  const { t, lang } = useMatchingT()
  const at = useMemo(() => new Date(), [])
  const byKey = useMemo(() => new Map((cells || []).map((c) => [slotKey(c), c])), [cells])
  const pickedSet = useMemo(() => new Set(picked), [picked])
  const bestSet = useMemo(() => new Set(best), [best])
  // Режим протяжки живёт до отпускания кнопки; skipClick гасит клик, который браузер шлёт следом за pointerdown
  // той же ячейки, — отметку уже поставил pointerdown, и клик снял бы её обратно.
  const drag = useRef(null)
  const skipClick = useRef(null)
  // Последний выбор — в ref: при быстрой протяжке события приходят чаще перерисовок, и замыкание видело бы старый.
  const latest = useRef(picked)
  useEffect(() => {
    latest.current = picked
  }, [picked])

  useEffect(() => {
    const stop = () => {
      drag.current = null
    }
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [])

  const apply = (key, add) => {
    const now = latest.current
    const has = now.includes(key)
    let next = now
    if (add && !has) next = [...now, key]
    else if (!add && has) next = now.filter((k) => k !== key)
    if (next !== now) {
      latest.current = next
      onChange(next)
    }
  }

  return (
    <div className="mt-gridwrap">
      <table className="mt-slots">
        <thead>
          <tr>
            <th aria-hidden="true" />
            {DAYS.map((d) => (
              <th key={d} scope="col">{dayShort(lang, d)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gridRows(duration).map((minutes) => (
            <tr key={minutes}>
              <th scope="row" className="mt-num">{hhmm(minutes)}</th>
              {DAYS.map((day) => {
                const key = slotKey(toUtcSlot(day, minutes, tz, at))
                const count = byKey.get(key)?.teacherIds.length || 0
                const on = pickedSet.has(key)
                const cls = count === 0 ? 'mt-slot--zero' : count >= 3 ? 'mt-slot--many' : 'mt-slot--few'
                return (
                  <td key={day}>
                    <button
                      type="button"
                      className={`mt-slot ${cls} ${bestSet.has(key) ? 'mt-slot--best' : ''}`}
                      aria-pressed={on}
                      disabled={count === 0 && !on}
                      aria-label={t('time.cellLabel', { slot: `${dayShort(lang, day)} ${hhmm(minutes)}`, n: count })}
                      onClick={() => {
                        const skip = skipClick.current === key
                        skipClick.current = null
                        if (skip) return
                        apply(key, !latest.current.includes(key))
                      }}
                      onPointerDown={(e) => {
                        if (e.pointerType !== 'mouse' || e.button !== 0) return
                        const add = !latest.current.includes(key)
                        drag.current = { add }
                        skipClick.current = key
                        apply(key, add)
                      }}
                      onPointerEnter={(e) => {
                        if (e.pointerType === 'mouse' && drag.current && e.buttons === 1 && count > 0) apply(key, drag.current.add)
                      }}
                    >
                      {count === 0 ? '—' : on ? `✓ ${count}` : count}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
