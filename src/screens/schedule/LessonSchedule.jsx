import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getMyLessonOccurrences, getLessonsSummary } from '../../api.js'
import { occurrencesByDayKey, monthShift, dayKey, dateFromKey } from './lessonFormat.js'
import ScheduleSummary from './ScheduleSummary.jsx'
import MonthCalendar from './MonthCalendar.jsx'
import DayPanel from './DayPanel.jsx'

export default function LessonSchedule({ token, onOpenLesson }) {
  const { t } = useI18n()
  const [occ, setOcc] = useState([])
  const [summary, setSummary] = useState(null)
  const [state, setState] = useState('loading') // 'loading' | 'ready' | 'error'

  const now = new Date()
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selectedDayKey, setSelectedDayKey] = useState(dayKey(now))

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

  const occByDay = useMemo(() => occurrencesByDayKey(occ), [occ])

  if (!token) return null

  return (
    <section className="sch">
      <h2 className="sch__title">{t('schedule.title')}</h2>
      {state === 'loading' && <p className="sch__status">{t('schedule.loading')}</p>}
      {state === 'error' && <p className="sch__status sch__status--error">{t('schedule.error')}</p>}
      {state === 'ready' && (
        <>
          <ScheduleSummary summary={summary} />
          <div className="cal-layout">
            <MonthCalendar
              year={view.year}
              month={view.month}
              selectedDayKey={selectedDayKey}
              occByDay={occByDay}
              onSelectDay={setSelectedDayKey}
              onPrevMonth={() => setView((v) => monthShift(v.year, v.month, -1))}
              onNextMonth={() => setView((v) => monthShift(v.year, v.month, 1))}
            />
            <DayPanel
              dayDate={dateFromKey(selectedDayKey)}
              items={occByDay.get(selectedDayKey) || []}
              onOpenLesson={onOpenLesson}
            />
          </div>
        </>
      )}
    </section>
  )
}
