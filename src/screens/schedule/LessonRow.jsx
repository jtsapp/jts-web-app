import { useI18n } from '../../i18n.jsx'
import { lessonStateKey, lessonTimeRange, canJoin } from './lessonFormat.js'
import MeetLink from './MeetLink.jsx'

export default function LessonRow({ occ, meetingUrl, onOpenLesson }) {
  const { t, lang } = useI18n()
  const stateKey = lessonStateKey(occ)
  const joinable = canJoin(occ.lessonStatus)
  const format = (occ.format || 'ONLINE').toLowerCase()

  return (
    <div className={`sch-row sch-row--${stateKey}`}>
      <div className="sch-row__main">
        <div className="sch-row__teacher">{occ.teacherName || '—'}</div>
        <div className="sch-row__time">{lessonTimeRange(occ, lang || 'ru')}</div>
        <div className="sch-row__meta">
          <span className={`sch-row__format sch-row__format--${format}`}>
            <span className="sch-row__dot" aria-hidden="true" />
            {t(`schedule.format.${format}`)}
          </span>
          {/* Ссылка на звонок — только у уроков, куда ещё можно попасть:
              на отменённом или уже проведённом она звала бы в пустую комнату. */}
          {!['completed', 'cancelled', 'overdue'].includes(stateKey) && <MeetLink url={meetingUrl} />}
          {/* «Запланирован» — состояние по умолчанию, оно не несёт информации
              и только шумит в списке. Бейдж появляется, когда с уроком что-то
              случилось: идёт, отменён, проведён, просрочен. */}
          {stateKey !== 'scheduled' && (
            <span className={`sch-badge sch-badge--${stateKey}`}>{t(`schedule.status.${stateKey}`)}</span>
          )}
        </div>
      </div>
      {joinable && (
        <button type="button" className="sch-row__join" onClick={() => onOpenLesson(occ.lessonId)}>
          {t('schedule.join')}
        </button>
      )}
    </div>
  )
}
