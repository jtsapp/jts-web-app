import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getMyLessonOccurrences, getLessonsSummary } from '../../api.js'
import { groupByDay, dayLabelKey } from './lessonFormat.js'
import ScheduleSummary from './ScheduleSummary.jsx'
import LessonRow from './LessonRow.jsx'

export default function LessonSchedule({ token, onOpenLesson }) {
  const { t, lang } = useI18n()
  const [occ, setOcc] = useState([])
  const [summary, setSummary] = useState(null)
  const [state, setState] = useState('loading') // 'loading' | 'ready' | 'error'

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setState('loading')
    Promise.all([getMyLessonOccurrences(token), getLessonsSummary(token)])
      .then(([o, s]) => {
        if (cancelled) return
        setOcc(Array.isArray(o) ? o : [])
        setSummary(s || null)
        setState('ready')
      })
      .catch(() => { if (!cancelled) setState('error') })
    return () => { cancelled = true }
  }, [token])

  if (!token) return null

  const groups = groupByDay(occ)
  return (
    <section className="sch">
      <h2 className="sch__title">{t('schedule.title')}</h2>
      {state === 'loading' && <p className="sch__status">{t('schedule.loading')}</p>}
      {state === 'error' && <p className="sch__status sch__status--error">{t('schedule.error')}</p>}
      {state === 'ready' && (
        <>
          <ScheduleSummary summary={summary} />
          {groups.length === 0 && <p className="sch__status">{t('schedule.empty')}</p>}
          {groups.map((g) => {
            const labelKey = dayLabelKey(g.date)
            const heading = labelKey
              ? t(`schedule.${labelKey}`)
              : g.date.toLocaleDateString(lang || 'ru', { day: 'numeric', month: 'long', weekday: 'short' })
            return (
              <div key={g.dayKey} className="sch__day">
                <div className="sch__day-h">{heading}</div>
                {g.items.map((o) => (
                  <LessonRow key={o.participantId ?? o.lessonId} occ={o} onOpenLesson={onOpenLesson} />
                ))}
              </div>
            )
          })}
        </>
      )}
    </section>
  )
}
