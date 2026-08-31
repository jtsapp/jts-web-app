import { useI18n } from '../../i18n.jsx'
import { lessonStateKey, lessonTimeRange, canJoin, canOpen } from './lessonFormat.js'
import MeetLink from './MeetLink.jsx'

export default function LessonRow({ occ, card, onOpenLesson }) {
  const { t, lang } = useI18n()
  const stateKey = lessonStateKey(occ)
  const joinable = canJoin(occ.lessonStatus)
  const openable = canOpen(occ.lessonStatus)
  const format = (occ.format || 'ONLINE').toLowerCase()
  const meetingUrl = card?.meetingUrl
  // Тип занятия приезжает догрузкой урока и может ещё не приехать (или не
  // приехать вовсе — урок чужой группы). Тогда чипа просто нет: пустая плашка
  // на его месте выглядела бы поломкой.
  const group = card?.group

  return (
    <div className={`sch-row sch-row--${stateKey}`}>
      <div className="sch-row__main">
        {group != null && (
          <div className={`sch-row__kind sch-row__kind--${group ? 'group' : 'solo'}`}>
            {t(group ? 'schedule.kindGroup' : 'schedule.kindSolo')}
          </div>
        )}
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
      {openable && (
        <button type="button" className="sch-row__join" onClick={() => onOpenLesson(occ.lessonId)}>
          {joinable ? t('schedule.join') : t('schedule.viewLesson')}
        </button>
      )}
    </div>
  )
}
