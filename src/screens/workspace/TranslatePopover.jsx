import { useLayoutEffect, useRef, useState } from 'react'

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), Math.max(min, max))
}

// Попап тап-перевода живого урока — та же карточка, что в читалке книг
// (.bk-pop), но position: fixed от вьюпорта (см. useTapTranslate.js), поэтому
// раскладка проще: без хоста, только край экрана.
export default function TranslatePopover({ pop, onSave }) {
  const [pos, setPos] = useState(null)
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!pop || !el) return
    const GAP = 8
    const EDGE = 8
    const a = pop.rect
    const p = el.getBoundingClientRect()
    const vw = document.documentElement.clientWidth
    const vh = document.documentElement.clientHeight
    const fitsBelow = a.bottom + GAP + p.height <= vh - EDGE
    const fitsAbove = a.top - GAP - p.height >= EDGE
    const top = fitsBelow || !fitsAbove ? a.bottom + GAP : a.top - GAP - p.height
    const left = clamp(a.left + a.width / 2 - p.width / 2, EDGE, vw - EDGE - p.width)
    setPos((prev) =>
      prev && Math.abs(prev.left - left) < 0.5 && Math.abs(prev.top - top) < 0.5 ? prev : { left, top },
    )
  })

  useLayoutEffect(() => {
    if (!pop) setPos(null)
  }, [pop])

  if (!pop) return null

  return (
    <div
      ref={ref}
      className="lw-tap-pop"
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="lw-tap-pop__word">{pop.word}</div>
      <div className="lw-tap-pop__tr">{pop.loading ? 'Переводим…' : pop.translation || 'Перевод не найден'}</div>
      {pop.alternates.length > 0 && <div className="lw-tap-pop__alts">{pop.alternates.join(', ')}</div>}
      <button
        className={`lw-tap-pop__save ${pop.saved ? 'is-on' : ''}`}
        onClick={onSave}
        disabled={!pop.translation || pop.loading || pop.saving || pop.saved}
      >
        {pop.saved ? '✓ В словаре' : pop.saving ? 'Сохраняем…' : 'Сохранить в словарь'}
      </button>
    </div>
  )
}
