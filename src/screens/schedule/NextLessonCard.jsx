import { useI18n } from '../../i18n.jsx'
import { ChevronRightIcon } from '../../components/icons.jsx'
import { canJoin, dayLabelKey, lessonTimeRange, parseLessonDate } from './lessonFormat.js'
import MeetLink from './MeetLink.jsx'

// Инициалы вместо фото: фотографии преподавателя бэкенд в расписании не отдаёт,
// а безликая серая заглушка на месте человека выглядит поломкой.
function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('')
}

/**
 * Карточка урока над календарём: кто ведёт, что за урок и вход в класс.
 *
 * Показывает идущий урок, а если такого нет — ближайший (см.
 * pickFeaturedOccurrence). Вход в класс — самое срочное действие экрана,
 * поэтому оно здесь, а не в клетке календаря: урок может идти в день, который
 * ученик сейчас не открыл, и найти его там он бы не смог.
 */
export default function NextLessonCard({ occ, topic, card, onOpenLesson }) {
  const { t, lang } = useI18n()
  const locale = lang || 'ru'
  const meetingUrl = card?.meetingUrl
  const group = card?.group

  if (!occ) {
    return (
      <div className="lesson-card lesson-card--empty">
        <p className="sch__status">{t('schedule.noUpcoming')}</p>
      </div>
    )
  }

  const live = canJoin(occ.lessonStatus)
  const date = parseLessonDate(occ.scheduledAt)
  const labelKey = dayLabelKey(date)
  const dayLabel = labelKey
    ? t(`schedule.${labelKey}`)
    : date.toLocaleDateString(locale, { day: 'numeric', month: 'long' })
  const when = `${dayLabel}, ${lessonTimeRange(occ, locale)}`

  return (
    <div className="lesson-card">
      <div className="lesson-card__head">
        <div className="lesson-card__avatar" aria-hidden="true">{initials(occ.teacherName)}</div>
        <div className="lesson-card__who">
          <div className="lesson-card__name">{occ.teacherName || '—'}</div>
          <div className="lesson-card__role">{t('schedule.teacherRole')}</div>
        </div>
      </div>

      <div className="lesson-card__sep" />

      <div className="lesson-card__foot">
        <div className="lesson-card__info">
          <div className="lesson-card__topic">{topic || when}</div>
          <div className="lesson-card__meta">
            {/* Вид занятия — в макете он стоит рядом с состоянием урока: для
                ученика групповое и индивидуальное — это разный урок. */}
            {group != null && (
              <span className={`sch-row__kind sch-row__kind--${group ? 'group' : 'solo'}`}>
                {t(group ? 'schedule.kindGroup' : 'schedule.kindSolo')}
              </span>
            )}
            <span className={`lesson-card__state ${live ? 'lesson-card__state--live' : ''}`}>
              <span className="lesson-card__dot" aria-hidden="true" />
              {live ? t('schedule.lessonStarted') : t('schedule.notStarted')}
            </span>
            {topic && <span className="lesson-card__when">{when}</span>}
            <MeetLink url={meetingUrl} />
          </div>
        </div>

        {/* Кнопка остаётся на месте и до начала урока — так видно, что вход
            именно здесь; неактивна, пока преподаватель не открыл класс. */}
        <button
          type="button"
          className="lesson-card__join"
          disabled={!live}
          onClick={() => onOpenLesson(occ.lessonId)}
        >
          {t('schedule.joinLesson')}
          <span className="lesson-card__chev" aria-hidden="true"><ChevronRightIcon size={14} /></span>
        </button>
      </div>
    </div>
  )
}
