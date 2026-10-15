import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { CloseIcon } from '../../ielts/icons.jsx'
import { CalculateIcon, EyeIcon, FlashIcon, RouteIcon, SchoolIcon, StopwatchIcon } from '../icons.jsx'

export const ERROR_TYPES = [
  { key: 'knowledge', Icon: SchoolIcon },
  { key: 'misread', Icon: EyeIcon },
  { key: 'calculation', Icon: CalculateIcon },
  { key: 'strategy', Icon: RouteIcon },
  { key: 'time', Icon: StopwatchIcon },
  { key: 'careless', Icon: FlashIcon },
]

/**
 * «Какая это была ошибка?» (Figma SAT 20): окно открывается само после неверного ответа в учебном режиме — ученик
 * называет тип, и ошибка с ним уходит в журнал и очередь повторения. Простой список из шести типов, ничего не
 * отмечено заранее; «Пропустить» и крестик закрывают без типа. После окна страница открывает объяснение (Figma 21).
 */
export default function ErrorTypeDialog({ busy, onSave, onSkip }) {
  const { t } = useI18n()
  const [chosen, setChosen] = useState(null)
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onSkip()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSkip])

  return (
    <div className="ih-dialog" role="presentation" onClick={onSkip}>
      <div ref={ref} className="st-modal st-etype" role="dialog" aria-modal="true" aria-labelledby="st-etype-title" tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="st-navdlg__head">
          <div>
            <h2 id="st-etype-title">{t('sat.etype.title')}</h2>
            <p>{t('sat.etype.sub')}</p>
          </div>
          <button type="button" className="ih-round st-navdlg__close" aria-label={t('sat.run.close')} onClick={onSkip}><CloseIcon size={18} /></button>
        </div>
        <div className="st-etype__list" role="radiogroup" aria-labelledby="st-etype-title">
          {ERROR_TYPES.map(({ key }) => (
            <button key={key} type="button" role="radio" aria-checked={chosen === key} className={`st-etype__row ${chosen === key ? 'is-on' : ''}`} onClick={() => setChosen(key)}>
              <i aria-hidden="true" />
              {t(`sat.etype.${key}`)}
            </button>
          ))}
        </div>
        <div className="st-navdlg__actions">
          <button type="button" className="ih-btn ih-btn--outline st-navdlg__back" onClick={onSkip}>{t('sat.etype.skip')}</button>
          <button type="button" className="ih-cta st-etype__save" disabled={!chosen || busy} onClick={() => onSave(chosen)}>{t('sat.etype.save')}</button>
        </div>
      </div>
    </div>
  )
}
