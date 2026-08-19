import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getMyLessonOccurrences, getLessonsSummary } from '../../api.js'
import { occurrencesByDayKey, monthShift, dayKey, dateFromKey } from './lessonFormat.js'
import { findLiveOccurrence } from './liveNow.js'
import ScheduleSummary from './ScheduleSummary.jsx'
import MonthCalendar from './MonthCalendar.jsx'
import DayPanel from './DayPanel.jsx'
import LiveNowBanner from './LiveNowBanner.jsx'

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

  // Учитель нажал «Начать урок», пока ученик сидел на расписании — occurrences
  // грузились только один раз при монтировании, и «Идёт сейчас» не появлялся
  // без ручного F5 (тот же класс проблемы, что и опрос статуса внутри самого
  // живого урока в LiveLessonPage). Тихий фон, без «loading»/мигания списка:
  // ошибку одного тика тоже молчим — при следующем тике само поправится.
  useEffect(() => {
    if (!token) return undefined
    const id = setInterval(() => {
      getMyLessonOccurrences(token).then((o) => setOcc(Array.isArray(o) ? o : [])).catch(() => {})
    }, 20000)
    return () => clearInterval(id)
  }, [token])

  const occByDay = useMemo(() => occurrencesByDayKey(occ), [occ])
  const liveNow = useMemo(() => findLiveOccurrence(occ), [occ])

  if (!token) return null

  return (
    <section className="sch">
      <h2 className="sch__title">{t('schedule.title')}</h2>
      {state === 'loading' && <p className="sch__status">{t('schedule.loading')}</p>}
      {state === 'error' && <p className="sch__status sch__status--error">{t('schedule.error')}</p>}
      {state === 'ready' && (
        <>
          <LiveNowBanner occ={liveNow} onOpenLesson={onOpenLesson} />
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
