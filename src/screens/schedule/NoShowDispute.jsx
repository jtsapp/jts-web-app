import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'

const MIN_REASON = 5

/**
 * «Оспорить пропуск» в строке урока: учитель отметил «не пришёл», а ученик был или не согласен. Причина уходит
 * координатору; срок — 24 часа после отметки, его считает сервер. После подачи — статус заявки вместо кнопки.
 */
export default function NoShowDispute({ lessonId, deadline, status, onRaise }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (status) {
    return <span className={`sch-badge sch-badge--dispute-${status.toLowerCase()}`}>{t(`schedule.dispute.status.${status}`)}</span>
  }
  if (!deadline) return null

  if (!open) {
    return (
      <button type="button" className="sch-row__dispute" onClick={() => setOpen(true)}>
        {t('schedule.dispute.open')}
      </button>
    )
  }

  const send = () => {
    setBusy(true)
    setError('')
    onRaise(lessonId, reason.trim())
      .then(() => setOpen(false))
      .catch((e) => setError(e?.serverMessage || t('schedule.dispute.failed')))
      .finally(() => setBusy(false))
  }

  return (
    <div className="sch-dispute">
      <label className="sch-dispute__label" htmlFor={`dispute-${lessonId}`}>{t('schedule.dispute.reason')}</label>
      <textarea id={`dispute-${lessonId}`} className="sch-dispute__input" rows={3} value={reason}
        disabled={busy} onChange={(e) => setReason(e.target.value)} />
      {error && <p className="sch-dispute__error" role="alert">{error}</p>}
      <div className="sch-dispute__actions">
        <button type="button" className="sch-dispute__cancel" disabled={busy} onClick={() => setOpen(false)}>
          {t('schedule.dispute.cancel')}
        </button>
        <button type="button" className="sch-dispute__send" disabled={busy || reason.trim().length < MIN_REASON} onClick={send}>
          {t('schedule.dispute.send')}
        </button>
      </div>
    </div>
  )
}
