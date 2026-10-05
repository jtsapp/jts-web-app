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
 * «В чём была ошибка?» (Figma SAT 23): после неверного ответа ученик называет тип — по нему очередь повторения и
 * журнал ошибок понимают, что тренировать. Предложение заранее отмечено, но это правило прототипа по времени ответа
 * и близости числа (suggestErrorType), а не AI: в макете оно подписано «AI предлагает», здесь — «Предположение»,
 * чтобы не обещать того, чего нет (решение A: AI — заглушки до флага SAT_AI). «Пропустить» — без типа.
 */
export default function ErrorTypeDialog({ suggested, timeSec, pace, current, busy, onSave, onSkip }) {
  const { t } = useI18n()
  const [chosen, setChosen] = useState(current || suggested || null)
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
        <div className="st-etype__grid" role="radiogroup" aria-labelledby="st-etype-title">
          {ERROR_TYPES.map(({ key, Icon }) => (
            <button key={key} type="button" role="radio" aria-checked={chosen === key} className={`st-etype__opt ${chosen === key ? 'is-on' : ''}`} onClick={() => setChosen(key)}>
              <Icon size={18} />
              <span>
                <b>{t(`sat.etype.${key}`)}</b>
                <small>{t(`sat.etype.${key}Sub`)}</small>
                {suggested === key && <em className="st-etype__sug">{t('sat.etype.suggested')}</em>}
              </span>
            </button>
          ))}
        </div>
        {suggested && (
          <p className="st-etype__why">{t(`sat.etype.why.${suggested}`, { s: String(timeSec ?? '—'), p: String(pace ?? '—') })}</p>
        )}
        <div className="st-navdlg__actions">
          <button type="button" className="ih-btn ih-btn--outline st-navdlg__back" onClick={onSkip}>{t('sat.etype.skip')}</button>
          <button type="button" className="ih-cta st-etype__save" disabled={!chosen || busy} onClick={() => onSave(chosen)}>{t('sat.etype.save')}</button>
        </div>
      </div>
    </div>
  )
}
