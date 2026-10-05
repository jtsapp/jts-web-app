import { useEffect, useRef } from 'react'
import { useI18n } from '../../i18n.jsx'
import { CloseIcon, InfoIcon } from '../../ielts/icons.jsx'
import { BulbIcon } from '../icons.jsx'

/**
 * Подсказка (Figma SAT 22): ступенчатые подсказки вопроса из банка, по одной; ответа в них нет. Предупреждение —
 * попытка станет «с подсказкой» и mastery не сдвинет. Дальше — следующая подсказка или полное решение (оно откроет
 * ответ, это уже помощь уровня «объяснение»).
 */
export default function HintPopover({ hints, total, busy, onMore, onSolution, onClose }) {
  const { t } = useI18n()
  const ref = useRef(null)
  const i = hints.length - 1
  useEffect(() => {
    ref.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div ref={ref} className="st-hint" role="dialog" aria-labelledby="st-hint-title" tabIndex={-1}>
      <div className="st-hint__head">
        <span className="st-hint__icon"><BulbIcon size={20} /></span>
        <div>
          <b id="st-hint-title">{t('sat.study.hintN', { n: String(i + 1), total: String(total) })}</b>
          <small>{t('sat.study.hintSub')}</small>
        </div>
        <span className="st-spacer" />
        <button type="button" className="ih-round st-navdlg__close" aria-label={t('sat.run.close')} onClick={onClose}><CloseIcon size={18} /></button>
      </div>
      <p className="st-hint__text">{hints[i]}</p>
      <p className="st-hint__warn"><InfoIcon size={18} />{t('sat.study.hintWarn')}</p>
      <div className="st-hint__actions">
        {hints.length < total ? (
          <button type="button" className="st-hint__more" disabled={busy} onClick={onMore}>
            <BulbIcon size={16} />{t('sat.study.hintNext', { n: String(hints.length + 1) })}
          </button>
        ) : <span />}
        <button type="button" className="st-link" onClick={onSolution}>{t('sat.study.fullSolution')}</button>
      </div>
    </div>
  )
}
