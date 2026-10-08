import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n.jsx'

/**
 * Выбор цели — уровни чипами, от ближайшей ступени до потолка (goalOptions).
 *
 * Один и тот же выбор живёт в двух местах: в первом шаге тура «Главной» и в
 * диалоге по клику на медаль «Цель — …». Двумя копиями разметки они разошлись
 * бы при первой правке макета.
 */
export function GoalPicker({ options, value, onPick }) {
  const { t } = useI18n()
  return (
    <div className="hm-goal" role="radiogroup" aria-label={t('home.goal.pick')}>
      {options.map((code) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === code}
          key={code}
          className={`hm-goal__chip${value === code ? ' is-on' : ''}`}
          onClick={() => onPick(code)}
        >
          <b>{code}</b>
          <i>{t(`cefr.${code}`)}</i>
        </button>
      ))}
    </div>
  )
}

/** Диалог смены цели — по клику на медаль. Выбор применяется сразу, без «Сохранить». */
export function GoalDialog({ options, value, onPick, onClose }) {
  const { t } = useI18n()

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Портал — по той же причине, что у тура: обёртка смены экранов анимируется
  // transform'ом, и position: fixed внутри неё ехал бы вместе со страницей.
  return createPortal(
    <div className="hm-goaldlg" onClick={onClose}>
      <div
        className="hm-goaldlg__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hm-goaldlg-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hm-goaldlg__head">
          <h2 className="hm-goaldlg__title" id="hm-goaldlg-title">{t('home.goal.title')}</h2>
          <button type="button" className="hm-goaldlg__close" aria-label={t('common.close')} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 4 14 14M14 4 4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="hm-goaldlg__sub">{t('home.goal.text')}</p>
        <GoalPicker
          options={options}
          value={value}
          onPick={(code) => {
            onPick(code)
            onClose?.()
          }}
        />
      </div>
    </div>,
    document.body,
  )
}
