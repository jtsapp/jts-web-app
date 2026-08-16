import { useI18n } from '../../i18n.jsx'
import { dayLabelKey } from './lessonFormat.js'
import LessonRow from './LessonRow.jsx'

export default function DayPanel({ dayDate, items, meetingUrls, onOpenLesson }) {
  const { t, lang } = useI18n()
  const labelKey = dayLabelKey(dayDate)
  const heading = labelKey
    ? t(`schedule.${labelKey}`)
    : dayDate.toLocaleDateString(lang || 'ru', { day: 'numeric', month: 'long' })
  // «6 августа» — как в макете: capitalize из CSS сделал бы «6 Августа».
  return (
    <div className="cal-day">
      <div className="cal-day__h">{heading}</div>
      {items.length === 0
        ? <p className="sch__status">{t('schedule.dayEmpty')}</p>
        : items.map((o) => (
            <LessonRow
              key={o.participantId ?? o.lessonId}
              occ={o}
              meetingUrl={meetingUrls?.get(String(o.lessonId))}
              onOpenLesson={onOpenLesson}
            />
          ))}
    </div>
  )
}
