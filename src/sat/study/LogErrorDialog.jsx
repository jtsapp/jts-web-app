import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { CloseIcon } from '../../ielts/icons.jsx'
import { ERROR_TYPES } from './ErrorTypeDialog.jsx'
import { COURSE, ordered, sectionOf } from '../model/course.js'
import { pick } from '../model/profile.js'

/** Первые слова вопроса — заготовка заголовка строки журнала (прототип errors.js: «opening words»). */
export function openingWords(html, max = 90) {
  const text = String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, '')}…` : text
}

/**
 * «Log error» (B3, прототип 93e93191 / bfccc897): промах практики становится строкой журнала ошибок — заголовок,
 * тема (юнит курса или свои слова) и причина. Раньше после промаха сам выпрыгивал выбор типа ошибки (Figma 23);
 * прототип от всплывающих окон после ответа отказался — запись делается кнопкой, когда ученик сам решит.
 * Предположение типа по времени ответа (suggestErrorType бэкенда) отмечено заранее.
 */
export default function LogErrorDialog({ doc, result, section, busy, onSave, onClose }) {
  const { t, lang } = useI18n()
  const [title, setTitle] = useState(() => openingWords(doc?.stem))
  const [unitCode, setUnitCode] = useState('')
  const [topic, setTopic] = useState('')
  const [type, setType] = useState(result?.errorType || result?.suggestedErrorType || null)
  const [problem, setProblem] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // юниты курса своей секции первыми — промах по Math вряд ли относится к юниту R&W
  const units = useMemo(() => {
    const all = ordered(COURSE).filter((l) => l.unit !== 'ch')
    const mine = all.filter((l) => sectionOf(l) === section)
    return [...mine, ...all.filter((l) => sectionOf(l) !== section)]
  }, [section])

  const save = () => {
    const name = title.trim()
    if (!name) {
      setProblem(true)
      return
    }
    const unit = units.find((l) => l.code === unitCode)
    onSave({
      title: name,
      unitCode: unitCode || null,
      topic: unit ? pick(unit.t, lang) : topic.trim() || null,
      errorType: type,
    })
  }

  return (
    <div className="ih-dialog" role="presentation" onClick={onClose}>
      <div ref={ref} className="st-modal st-logerr" role="dialog" aria-modal="true" aria-labelledby="st-logerr-title" tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="st-navdlg__head">
          <div>
            <h2 id="st-logerr-title">{t('sat.logerr.title')}</h2>
            <p>{t('sat.logerr.sub')}</p>
          </div>
          <button type="button" className="ih-round st-navdlg__close" aria-label={t('sat.run.close')} onClick={onClose}><CloseIcon size={18} /></button>
        </div>
        <label className="st-field">
          <span>{t('sat.logerr.what')}</span>
          <textarea rows={2} value={title} onChange={(e) => { setTitle(e.target.value); setProblem(false) }} placeholder={t('sat.logerr.whatPh')} />
          {problem && <small className="st-field__err" role="alert">{t('sat.logerr.needWhat')}</small>}
        </label>
        <label className="st-field">
          <span>{t('sat.logerr.topic')}</span>
          <select value={unitCode} onChange={(e) => setUnitCode(e.target.value)}>
            <option value="">{t('sat.logerr.topicOther')}</option>
            {units.map((l) => <option key={l.code} value={l.code}>{l.code} · {pick(l.t, lang)}</option>)}
          </select>
          {!unitCode && <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t('sat.logerr.topicPh')} />}
        </label>
        <div className="st-field">
          <span>{t('sat.logerr.why')}</span>
          <div className="st-logerr__types" role="radiogroup" aria-label={t('sat.logerr.why')}>
            {ERROR_TYPES.map(({ key, Icon }) => (
              <button key={key} type="button" role="radio" aria-checked={type === key} className={`st-logerr__type ${type === key ? 'is-on' : ''}`} onClick={() => setType(type === key ? null : key)}>
                <Icon size={16} />{t(`sat.etype.${key}`)}
                {result?.suggestedErrorType === key && <em className="st-etype__sug">{t('sat.etype.suggested')}</em>}
              </button>
            ))}
          </div>
        </div>
        <div className="st-navdlg__actions">
          <button type="button" className="ih-btn ih-btn--outline st-navdlg__back" onClick={onClose}>{t('sat.logerr.cancel')}</button>
          <button type="button" className="ih-cta" disabled={busy} onClick={save}>{t('sat.logerr.save')}</button>
        </div>
      </div>
    </div>
  )
}
