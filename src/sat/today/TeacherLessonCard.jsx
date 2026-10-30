import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { ScheduleIcon, VideoIcon } from '../../ielts/icons.jsx'
import { GroupsIcon } from '../icons.jsx'
import { fmtDate } from '../model/dates.js'
import { JOIN_OPENS_MIN, LESSON_MINUTES, fmtMinutes, joinState, lessonClock, lessonDay, lessonStatus, lessonWeekday } from './lessonTime.js'

/**
 * Занятие с преподавателем (Figma «NEW 2», 17:6347) — тёмный блок над заданиями: 90 минут в группе — отдельно от
 * самостоятельной работы. Состояния, которых нет в макете: другой день — «Завтра, 18:30–20:00» или «Пт, 6 ноя, …»,
 * идёт — «идёт сейчас», прошло — «занятие прошло». lesson — то же занятие, что у «Заданий на сегодня» (currentLesson).
 */
export default function TeacherLessonCard({ lesson, lessonCount, todayIso }) {
  const { t, lang } = useI18n()
  // отсчёт «начнётся через …» и открытие ссылки зависят от минуты — перерисовываемся раз в минуту
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60000)
    return () => window.clearInterval(id)
  }, [])

  if (!lesson) return null
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const day = lessonDay(lesson.startsAt, todayIso)
  const dayText = day === 'today'
    ? t('sat.teach.today')
    : day === 'tomorrow'
      ? t('sat.teach.tomorrow')
      : `${lessonWeekday(lesson.startsAt, lang)}, ${fmtDate(loc, new Date(`${String(lesson.startsAt).slice(0, 10)}T00:00:00Z`), { day: 'numeric', month: 'short', timeZone: 'UTC' })}`
  const st = lessonStatus(lesson.startsAt, now)
  // отсчёт — только в день занятия: «через 26 ч» читается хуже, чем «Завтра, 18:30»
  const when = st.state === 'live'
    ? t('sat.teach.live')
    : st.state === 'over' || lesson.status === 'DONE'
      ? t('sat.teach.over')
      : day === 'today' && st.minutesLeft != null ? t('sat.teach.in', { time: fmtMinutes(t, st.minutesLeft) }) : null
  const join = joinState(lesson, now)
  const title = lessonCount
    ? t('sat.teach.title', { n: String(lesson.number), total: String(lessonCount), topic: lesson.topic })
    : t('sat.teach.titleShort', { n: String(lesson.number), topic: lesson.topic })

  return (
    <article className="st-teach">
      <div className="st-teach__info">
        <span className="st-teach__tag"><GroupsIcon size={16} />{t('sat.teach.tag', { n: String(LESSON_MINUTES) })}</span>
        <h2>{title}</h2>
        <span className="st-teach__when">
          <ScheduleIcon size={18} />
          {[`${dayText}, ${lessonClock(lesson.startsAt)}`, when].filter(Boolean).join(' · ')}
        </span>
        {lesson.teacherName && (
          <span className="st-teach__who">
            <i aria-hidden="true">{lesson.teacherName.trim().charAt(0).toUpperCase()}</i>
            <b>{lesson.teacherName}</b>
            <span>{t('sat.teach.teacher')}</span>
          </span>
        )}
      </div>
      {join !== 'hidden' && (
        <div className="st-teach__join">
          {/* ссылки на занятие на сервере пока нет (поля joinUrl в расписании не существует): кнопка ждёт неактивной,
              а с появлением поля откроется сама за 15 минут до начала */}
          {join === 'open'
            ? <a className="st-teach__btn" href={lesson.joinUrl} target="_blank" rel="noopener noreferrer"><VideoIcon size={20} />{t('sat.teach.join')}</a>
            : <button type="button" className="st-teach__btn" disabled><VideoIcon size={20} />{t('sat.teach.join')}</button>}
          {join === 'wait' && <small>{t('sat.teach.joinSoon', { n: String(JOIN_OPENS_MIN) })}</small>}
        </div>
      )}
    </article>
  )
}
