import { useEffect, useRef } from 'react'
import PillButton from './PillButton.jsx'

// Подтверждение необратимого шага («Сдать ответы?»). Esc и клик по фону — отмена; фокус сразу на «Отмене»,
// чтобы случайный Enter не сдал тест.
export default function ConfirmDialog({ open, title, text, confirmLabel, cancelLabel, onConfirm, onCancel, busy }) {
  const cancelRef = useRef(null)
  // onCancel — свежая стрелка на каждом рендере; на экзамене экран рендерится раз в секунду (часы), и эффект с ним в
  // зависимостях каждую секунду возвращал фокус на «Отмену» — до «Сдать» с клавиатуры было не дойти
  const cancelFn = useRef(onCancel)
  cancelFn.current = onCancel
  useEffect(() => {
    if (!open) return undefined
    cancelRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && cancelFn.current?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  if (!open) return null
  return (
    <div className="ih-dialog" role="presentation" onClick={onCancel}>
      <div className="ih-dialog__box" role="dialog" aria-modal="true" aria-labelledby="ih-dialog-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="ih-dialog-title">{title}</h2>
        {text && <p>{text}</p>}
        <div className="ih-dialog__actions">
          <button ref={cancelRef} type="button" className="ih-btn ih-btn--outline" onClick={onCancel}>
            {cancelLabel}
          </button>
          <PillButton variant="primary" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </PillButton>
        </div>
      </div>
    </div>
  )
}
