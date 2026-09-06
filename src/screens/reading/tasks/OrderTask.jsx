'use client'

import { useI18n } from '../../../i18n.jsx'
import { useGrab, useZone, justDragged } from '../../workbook/dnd.js'

// Расстановка по порядку: order (события истории) и summary (предложения
// пересказа). Правильный порядок — исходный порядок items, перемешивает его
// initExercise. Кроме перетаскивания есть стрелки ↑↓: они единственный путь с
// клавиатуры и надёжный на маленьком экране.
export default function OrderTask({ ex, index, st, onMove, onDrop, res }) {
  const { t } = useI18n()
  const rows = res ? res.detail.rows : null
  const kind = 'rd-ord-' + index

  return (
    <>
      <ol className="rd-ord">
        {st.seq.map((k, pos) => (
          <Item
            key={k}
            kind={kind}
            pos={pos}
            text={ex.items[k]}
            row={rows ? rows[pos] : null}
            disabled={!!res}
            onMove={onMove}
            onDrop={onDrop}
            upLabel={t('reading.moveUp')}
            downLabel={t('reading.moveDown')}
          />
        ))}
      </ol>
      {/* Правильный порядок показываем только когда он не сошёлся: иначе
          подсказка висела бы над уже решённым заданием. */}
      {rows && rows.some((r) => !r.ok) && (
        <div className="rd-expl">
          <b>✓</b> {ex.items.map((s, k) => `${k + 1}. ${s}`).join(' ')}
        </div>
      )}
    </>
  )
}

function Item({ kind, pos, text, row, disabled, onMove, onDrop, upLabel, downLabel }) {
  const grab = useGrab(kind, { pos }, disabled)
  const zone = useZone(kind, (payload) => {
    if (payload && typeof payload.pos === 'number') onDrop(payload.pos, pos)
  }, disabled)

  const cls = ['rd-ord__item']
  if (row) cls.push(row.ok ? 'is-correct' : 'is-wrong')

  return (
    <li className={cls.join(' ')} ref={zone}>
      <span className="rd-ord__num" aria-hidden="true">{pos + 1}</span>
      <span className="rd-ord__handle" ref={grab} aria-hidden="true">⋮⋮</span>
      <span className="rd-ord__txt" lang="en">{text}</span>
      <span className="rd-ord__mv">
        <button
          type="button" disabled={disabled} aria-label={upLabel}
          onClick={() => { if (!justDragged()) onMove(pos, -1) }}
        >▲</button>
        <button
          type="button" disabled={disabled} aria-label={downLabel}
          onClick={() => { if (!justDragged()) onMove(pos, 1) }}
        >▼</button>
      </span>
    </li>
  )
}

/** Обмен соседей стрелкой — порт orderMove (jtsreading.html:946). */
export function orderMove(st, pos, dir) {
  const np = pos + dir
  if (np < 0 || np >= st.seq.length) return st
  const seq = st.seq.slice()
  ;[seq[pos], seq[np]] = [seq[np], seq[pos]]
  return { ...st, seq }
}

/** Перенос перетаскиванием: вынуть из from, вставить перед to. */
export function orderDrop(st, from, to) {
  if (from === to) return st
  const seq = st.seq.slice()
  const [item] = seq.splice(from, 1)
  seq.splice(to, 0, item)
  return { ...st, seq }
}
