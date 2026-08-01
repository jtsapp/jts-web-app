import { useI18n } from '../../i18n.jsx'

export default function TeacherControls({ status, busy, onStart, onPause, onResume, onComplete }) {
  const { t } = useI18n()
  return (
    <div className="live__section">
      <div className="live-controls">
        {status === 'SCHEDULED' && <button className="btn-start" disabled={busy} onClick={onStart}>{t('live.controls.start')}</button>}
        {status === 'IN_PROGRESS' && <button className="btn-pause" disabled={busy} onClick={onPause}>{t('live.controls.pause')}</button>}
        {status === 'PAUSED' && <button className="btn-resume" disabled={busy} onClick={onResume}>{t('live.controls.resume')}</button>}
        {(status === 'IN_PROGRESS' || status === 'PAUSED') && <button className="btn-complete" disabled={busy} onClick={onComplete}>{t('live.controls.complete')}</button>}
      </div>
    </div>
  )
}
