import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getMyLessonOccurrences, getLessonsSummary } from '../../api.js'
import { occurrencesByDayKey, monthShift, dayKey, dateFromKey } from './lessonFormat.js'
import { pickFeaturedOccurrence } from './liveNow.js'
import { useLessonCards, useLessonTopic } from './useLessonDetails.js'
import ScheduleSummary from './ScheduleSummary.jsx'
import MonthCalendar from './MonthCalendar.jsx'
import DayPanel from './DayPanel.jsx'
import NextLessonCard from './NextLessonCard.jsx'

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
  const featured = useMemo(() => pickFeaturedOccurrence(occ), [occ])
  const dayItems = useMemo(() => occByDay.get(selectedDayKey) || [], [occByDay, selectedDayKey])

  // Ссылки на видеозвонок нужны и карточке сверху, и строкам открытого дня —
  // грузим их одним списком, чтобы общий урок не запрашивался дважды.
  const cards = useLessonCards(token, [featured?.lessonId, ...dayItems.map((o) => o.lessonId)])
  const featuredTopic = useLessonTopic(token, featured?.lessonId ?? null)

  // Гость расписания не имеет: уроки висят на аккаунте. Раньше здесь стоял
  // возврат null, и вкладка «Онлайн-уроки» открывалась пустым белым полем без
  // единого слова — тот же случай, что и вечная загрузка домашки.
  if (!token) return <p className="sch__status">{t('schedule.needAuth')}</p>

  return (
    <section className="sch">
      <h2 className="sch__title">{t('schedule.title')}</h2>
      {state === 'loading' && <p className="sch__status">{t('schedule.loading')}</p>}
      {state === 'error' && <p className="sch__status sch__status--error">{t('schedule.error')}</p>}
      {state === 'ready' && (
        <>
          <div className="sch__top">
            <NextLessonCard
              occ={featured}
              topic={featuredTopic}
              card={featured ? cards.get(String(featured.lessonId)) : null}
              onOpenLesson={onOpenLesson}
            />
            <ScheduleSummary summary={summary} />
          </div>

          <h2 className="sch__title sch__title--second">{t('schedule.calendarTitle')}</h2>
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
              items={dayItems}
              cards={cards}
              onOpenLesson={onOpenLesson}
            />
          </div>
        </>
      )}
    </section>
  )
}
