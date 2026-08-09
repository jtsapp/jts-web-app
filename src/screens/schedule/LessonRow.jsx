import { useI18n } from '../../i18n.jsx'
import { parseLessonDate, lessonStateKey, canJoin } from './lessonFormat.js'

export default function LessonRow({ occ, onOpenLesson }) {
  const { t, lang } = useI18n()
  const time = parseLessonDate(occ.scheduledAt).toLocaleTimeString(lang || 'ru', { hour: '2-digit', minute: '2-digit' })
  const stateKey = lessonStateKey(occ)
  const joinable = canJoin(occ.lessonStatus)
  const format = (occ.format || 'ONLINE').toLowerCase()
  return (
    <div className={`sch-row sch-row--${stateKey}`}>
      <div className="sch-row__time">{time}</div>
      <div className="sch-row__main">
        <div className="sch-row__teacher">{occ.teacherName || '—'}</div>
        <div className="sch-row__meta">
          <span className={`sch-badge sch-badge--${stateKey}`}>{t(`schedule.status.${stateKey}`)}</span>
          <span className="sch-row__format">{t(`schedule.format.${format}`)}</span>
        </div>
      </div>
      {joinable ? (
        <button className="sch-row__join" onClick={() => onOpenLesson(occ.lessonId)}>{t('schedule.join')}</button>
      ) : (
        <span className="sch-row__hint">{t('schedule.notStarted')}</span>
      )}
    </div>
  )
}
