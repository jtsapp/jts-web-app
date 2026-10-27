import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDialogKeys } from '../lib/useDialogKeys.js'
import { useMatchingT, tariffLineText } from './texts.js'

// Окно раздела — порталом в body: экраны кабинета обрезают переполнение, а окну нужен весь экран. Корень несёт свой
// .mt (токены раздела) и метку для Луны — без неё помощник не видит окна (screenSnapshot.js).
export function MtModal({ title, onClose, full = false, children, label }) {
  const ref = useRef(null)
  useDialogKeys(ref, onClose)
  useEffect(() => {
    const prev = document.activeElement
    ref.current?.querySelector('button, [href], input, textarea, select')?.focus()
    return () => prev?.focus?.()
  }, [])
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      className="mt mt-overlay"
      data-assistant-overlay={label || title || 'подбор учителя'}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div ref={ref} className={`mt-modal ${full ? 'mt-modal--full' : ''}`} role="dialog" aria-modal="true" aria-label={label || title}>
        {title && (
          <div className="mt-row mt-between">
            <h2 className="mt-h2">{title}</h2>
            <CloseButton onClick={onClose} />
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function CloseButton({ onClick }) {
  const { t } = useMatchingT()
  return (
    <button type="button" className="mt-x" onClick={onClick} aria-label={t('btn.close')}>
      ✕
    </button>
  )
}

// Тост прототипа (toast(), 2.6 с) — один на экран: новый текст заменяет прежний.
export function useToast() {
  const [text, setText] = useState(null)
  const timer = useRef(null)
  const show = useCallback((value) => {
    clearTimeout(timer.current)
    setText(value)
    timer.current = setTimeout(() => setText(null), 2600)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  const node = text && typeof document !== 'undefined'
    ? createPortal(<div className="mt mt-toast" role="status">{text}</div>, document.body)
    : null
  return [node, show]
}

// Строка тарифа — только чтение (решение 25.10, ТЗ §3.0): ни кнопок, ни переключателей.
export function TariffLine({ tariff }) {
  const { lang } = useMatchingT()
  if (!tariff) return null
  return <span className="mt-pill mt-pill--gray">{tariffLineText(lang, tariff)}</span>
}

export function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('')
}

// Отказы подбора, у которых есть свой текст для ученика. Текст сервера ученику не показываем: в нём бывают
// внутренние причины («Лимит учеников», «Нет доступа…», ТЗ §2.4) и он всегда по-русски.
export const ERROR_CODES = [
  'slot_taken', 'tariff_pending', 'not_enough_days', 'limit_reached', 'already_asked', 'guarantee',
  'teacher_format', 'teacher_unavailable', 'format_locked',
]

export function errorText(e, t) {
  return t(ERROR_CODES.includes(e?.code) ? 'error.' + e.code : 'error.generic')
}

// Двойной клик не должен отправлять действие дважды (ТЗ §2.7: «двойной клик не создаёт дублей»): кнопка
// блокируется на время запроса, а повторный вызов, пока запрос идёт, ничего не делает.
export function useBusy() {
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const run = useCallback(async (fn) => {
    if (lock.current) return undefined
    lock.current = true
    setBusy(true)
    try {
      return await fn()
    } finally {
      lock.current = false
      setBusy(false)
    }
  }, [])
  return [busy, run]
}
