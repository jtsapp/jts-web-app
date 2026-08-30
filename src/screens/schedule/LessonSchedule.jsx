import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getMyLessonOccurrences, getLessonsSummary, getTrialRequestState } from '../../api.js'
import { occurrencesByDayKey, monthShift, dayKey, dateFromKey } from './lessonFormat.js'
import { roleFromToken } from '../../lib/jwt.js'
import { pickFeaturedOccurrence } from './liveNow.js'
import { useMeetingUrls, useLessonTopic } from './useLessonDetails.js'
import ScheduleSummary from './ScheduleSummary.jsx'
import MonthCalendar from './MonthCalendar.jsx'
import DayPanel from './DayPanel.jsx'
import NextLessonCard from './NextLessonCard.jsx'
import TrialRequestCard from './TrialRequestCard.jsx'

export default function LessonSchedule({ token, onOpenLesson }) {
  const { t } = useI18n()
  const [occ, setOcc] = useState([])
  const [summary, setSummary] = useState(null)
  // Заявка на пробный урок: null — состояния нет (не загрузилось или запрос
  // упал). Тогда экран остаётся расписанием, каким был, — это безопасный отказ:
  // пустой календарь хуже карточки, но обещать звонок, не зная, есть ли у
  // человека преподаватель, нельзя.
  const [trial, setTrial] = useState(null)
  const [state, setState] = useState('loading') // 'loading' | 'ready' | 'error'

  const now = new Date()
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selectedDayKey, setSelectedDayKey] = useState(dayKey(now))

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setState('loading')
    Promise.all([
      getMyLessonOccurrences(token),
      getLessonsSummary(token),
      // Тем же заходом, чтобы не мигать: сначала календарём, а через полсекунды
      // карточкой вместо него. Своё падение эта ручка держит при себе —
      // расписание из-за неё ронять не за что.
      getTrialRequestState(token).catch(() => null),
    ])
      .then(([o, s, tr]) => {
        if (cancelled) return
        setOcc(Array.isArray(o) ? o : [])
        setSummary(s || null)
        setTrial(tr)
        setState('ready')
      })
      .catch(() => { if (!cancelled) setState('error') })
    return () => { cancelled = true }
  }, [token])

  // Карточка заявки — только ученику и только при пустом календаре. Три условия,
  // и каждое стоит здесь из-за конкретного способа потерять расписание:
  //
  // 1. Роль. Признак teacherAssigned бэкенд считает как «есть ли у пользователя
  //    группа с преподавателем», а группы нет ни у преподавателя, ни у
  //    менеджера, ни у админа (User.group — «Null for non-student roles»).
  //    Значит все они получают false, и без проверки роли карточка съедала весь
  //    экран «Уроки» вместе с единственной кнопкой «Войти в класс», причём
  //    навсегда: F5 возвращал то же самое. Именно роль, а не !isTeacher —
  //    менеджер и куратор ломались бы ровно так же.
  // 2. Пустой календарь. teacherAssigned бывает false и при непустом
  //    расписании: у группы преподаватель необязателен (GroupService.createGroup
  //    ставит его только если передан, LessonService не назначает его групповым
  //    урокам), а после смены преподавателя остаётся история занятий. Скрыть
  //    занятия, о которых человек не узнает иначе, дороже, чем не показать ему
  //    предложение записаться.
  // 3. Сам признак. Обратное — календарь бывает пустым и у ученика с
  //    преподавателем (каникулы, конец оплаченного пакета), и обещать ему
  //    звонок менеджера незачем: он уже в обучении.
  const showTrialCard = state === 'ready'
    && trial != null
    && !trial.teacherAssigned
    && String(roleFromToken(token) ?? '').toUpperCase() === 'STUDENT'
    && occ.length === 0

  // Учитель нажал «Начать урок», пока ученик сидел на расписании — occurrences
  // грузились только один раз при монтировании, и «Идёт сейчас» не появлялся
  // без ручного F5 (тот же класс проблемы, что и опрос статуса внутри самого
  // живого урока в LiveLessonPage). Тихий фон, без «loading»/мигания списка:
  // ошибку одного тика тоже молчим — при следующем тике само поправится.
  // Скрытая вкладка не опрашиваем — экономим батарею/трафик и не копит
  // очередь запросов; при возврате сразу один тик.
  // Под карточкой заявки расписания на экране нет — обновлять нечего, и опрос
  // раз в 20 секунд был бы запросом в никуда.
  useEffect(() => {
    if (!token || showTrialCard) return undefined
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      getMyLessonOccurrences(token).then((o) => setOcc(Array.isArray(o) ? o : [])).catch(() => {})
    }
    const id = setInterval(tick, 20000)
    const onVis = () => {
      if (!document.hidden) tick()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [token, showTrialCard])

  const occByDay = useMemo(() => occurrencesByDayKey(occ), [occ])
  const featured = useMemo(() => pickFeaturedOccurrence(occ), [occ])
  const dayItems = useMemo(() => occByDay.get(selectedDayKey) || [], [occByDay, selectedDayKey])

  // Ссылки на видеозвонок нужны и карточке сверху, и строкам открытого дня —
  // грузим их одним списком, чтобы общий урок не запрашивался дважды.
  const meetingUrls = useMeetingUrls(token, [featured?.lessonId, ...dayItems.map((o) => o.lessonId)])
  const featuredTopic = useLessonTopic(token, featured?.lessonId ?? null)

  // Гость расписания не имеет: уроки висят на аккаунте. Раньше здесь стоял
  // возврат null, и вкладка «Онлайн-уроки» открывалась пустым белым полем без
  // единого слова — тот же случай, что и вечная загрузка домашки.
  if (!token) return <p className="sch__status">{t('schedule.needAuth')}</p>

  // Человек, зарегистрировавшийся на сайте сам, приходит без преподавателя и
  // без расписания, и завести его сам не может: заявка урока не создаёт. Пустой
  // календарь ему ничего не объясняет — вместо всего расписания, вместе с его
  // заголовками, показываем карточку заявки.
  if (showTrialCard) {
    return (
      <section className="sch">
        <TrialRequestCard token={token} state={trial} onRequested={setTrial} />
      </section>
    )
  }

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
              meetingUrl={featured ? meetingUrls.get(String(featured.lessonId)) : null}
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
              meetingUrls={meetingUrls}
              onOpenLesson={onOpenLesson}
            />
          </div>
        </>
      )}
    </section>
  )
}
