import { useEffect } from 'react'
import { useI18n } from '../../i18n.jsx'

// Общая модалка раздела «Письмо» — порт #modal прототипа (data/jtswriting.html
// 474–476 и 9894–9906): клик по затемнению закрывает, Escape — тоже; на мобиле
// карточка прижата к низу экрана, с 640px — по центру (стили .wr-modal).
// Крестик — добавка к прототипу (там закрывали только фоном и кнопками),
// чтобы у модалки всегда был явный выход, даже когда контент без кнопок.
export default function WritingModal({ open, onClose, children }) {
  const { t } = useI18n()

  // Слушатель Escape глобальный, но живёт только пока модалка открыта —
  // иначе несколько модалок на странице перехватывали бы клавишу друг у друга.
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="wr-modal" role="dialog" aria-modal="true">
      <div className="wr-modal__bg" onClick={onClose} />
      <div className="wr-modal__card">
        <button type="button" className="wr-modal__x" onClick={onClose} aria-label={t('writing.modal.close')}>
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}
