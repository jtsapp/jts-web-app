import { useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import {
  ArrowForwardIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, EventIcon, FlagIcon, PlayIcon, RadioOffIcon,
  ReplayIcon, ScheduleIcon, TargetIcon,
} from '../icons.jsx'
import { OriginChip, SecPlate, TeacherNote } from '../today/TodayCards.jsx'
import { byDate, dayMinutes, dayStatus, monthGrid, planWeek, shiftMonth, taskLabel, taskOrigin, weekDates } from './planModel.js'

// Три вида плана по дизайну «IELTS new» (Figma, раздел 2): роадмап (две недели дорогой, панель дня), неделя (семь
// колонок, панель задачи) и месяц (сетка, панель дня, ближайшие события). Все три — над одними задачами бэкенда.

const loc = (lang) => (lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU')
const dfmt = (lang, iso, o) => new Intl.DateTimeFormat(loc(lang), { timeZone: 'UTC', ...o }).format(new Date(`${iso}T00:00:00Z`))
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export function Legend() {
  const { t } = useI18n()
  const items = [
    ['done', CheckIcon], ['current', RadioOffIcon], ['started', PlayIcon], ['planned', ScheduleIcon], ['missed', ReplayIcon], ['control', FlagIcon],
  ]
  return (
    <ul className="ih-legend" aria-label={t('ieltsPlanV.legend')}>
      {items.map(([k, Ic]) => (
        <li key={k}>
          <span className={`ih-legend__ic is-${k}`} aria-hidden="true"><Ic size={14} /></span>
          {t(`ieltsPlanV.st.${k}`)}
        </li>
      ))}
    </ul>
  )
}

// Карточка задачи в панели дня: плашка навыка, название, минуты; кнопка во всю ширину (макет DayPanel)
function PanelTask({ task, primary, onStart, onMark }) {
  const { t } = useI18n()
  const done = task.status === 'completed'
  return (
    <li className={`ih-dp__task${primary ? ' is-primary' : ''}${taskOrigin(task) ? ` is-${taskOrigin(task)}` : ''}`}>
      <div className="ih-dp__row">
        <SecPlate sec={task.sec} />
        <div className="ih-tt__body">
          <b>{taskLabel(t, task)}</b>
          <TeacherNote task={task} />
          <span className="ih-tt__meta">{t('ieltsHub.minutes', { n: String(task.minutes) })}{task.n > 1 ? ` · ${task.got}/${task.n}` : ''} <OriginChip task={task} /></span>
        </div>
      </div>
      {done ? (
        <span className="ih-tt__done"><CheckIcon size={16} /> {t('ieltsPlan.status.completed')}</span>
      ) : (
        <>
          <button type="button" className={`ih-btn2 ${primary ? 'ih-btn2--primary' : 'ih-btn2--outline'}`} onClick={() => onStart?.(task)}>
            {primary || task.status === 'in_progress' ? t('ieltsPlan.continue') : t('ieltsPlanV.open')}
          </button>
          {task.completionRule === 'self_report' && (
            <button type="button" className="ih-link" onClick={() => onMark?.(task, true)}>{t('ieltsPlan.markDone')}</button>
          )}
        </>
      )}
    </li>
  )
}

/** Панель выбранного дня: задачи, минуты и контроль этой недели (тот же id, что на «Сегодня»). */
export function DayPanel({ date, weekN, dayN, tasks, control, today, onPrev, onNext, onStart, onMark, events }) {
  const { t, lang } = useI18n()
  const work = (tasks || []).filter((x) => x.origin !== 'weekly_control')
  const firstOpen = work.findIndex((x) => x.status !== 'completed')
  return (
    <aside className="ih-dp" aria-label={t('ieltsPlanV.dayPanel')}>
      <header className="ih-dp__head">
        <div>
          <h2>{weekN && dayN ? t('ieltsPlanV.weekDay', { w: String(weekN), d: String(dayN) }) : cap(dfmt(lang, date, { weekday: 'long', day: 'numeric', month: 'long' }))}</h2>
          {weekN && dayN && <span>{cap(dfmt(lang, date, { weekday: 'long', day: 'numeric', month: 'long' }))}</span>}
        </div>
        {onPrev && (
          <span className="ih-dp__nav">
            <button type="button" className="ih-iconbtn" onClick={onPrev} aria-label={t('ieltsPlanV.prevDay')}><ChevronLeftIcon size={20} /></button>
            <button type="button" className="ih-iconbtn" onClick={onNext} aria-label={t('ieltsPlanV.nextDay')}><ChevronRightIcon size={20} /></button>
          </span>
        )}
      </header>
      {work.length ? (
        <>
          <span className="ih-chip2">
            {date === today && <b>{t('ieltsPlanV.today')}</b>}
            <ScheduleIcon size={14} /> {t('ieltsPlanV.dayLoad', { n: String(work.length), min: String(dayMinutes(work)) })}
          </span>
          <ul className="ih-dp__list">
            {work.map((task, i) => <PanelTask key={task.id} task={task} primary={date <= today && i === firstOpen} onStart={onStart} onMark={onMark} />)}
          </ul>
        </>
      ) : (
        <p className="ih-dp__rest">{t('ieltsPlan.rest')}</p>
      )}
      {control && (
        <>
          <hr className="ih-dp__sep" />
          <div className="ih-dp__ctl">
            <span className="ih-plate ih-plate--control-warm" style={{ width: 44, height: 44 }} aria-hidden="true"><FlagIcon size={24} /></span>
            <div>
              <b>{t(`ieltsPlan.control.${control.control || 'weekly'}`)}</b>
              <span>{cap(dfmt(lang, control.date, { weekday: 'long', day: 'numeric', month: 'long' }))}</span>
            </div>
          </div>
          <span className={`ih-chip2 is-${control.status}`}><EventIcon size={14} /> {t(`ieltsPlan.status.${control.status}`)}</span>
          <p className="ih-dp__text">{t('ieltsPlanV.controlText')}</p>
          <button type="button" className="ih-link" onClick={() => onStart?.(control)}>{t('ieltsPlanV.seeTask')} <ArrowForwardIcon size={18} /></button>
        </>
      )}
      {events?.length > 0 && (
        <>
          <hr className="ih-dp__sep" />
          <b className="ih-dp__evtitle">{t('ieltsPlanV.events')}</b>
          <ul className="ih-dp__events">
            {events.map((e) => (
              <li key={e.id}>
                <span className={`ih-plate ${e.control === 'weekly' || e.control === 'month' ? 'ih-plate--control-warm' : 'ih-plate--listening'}`} style={{ width: 36, height: 36 }} aria-hidden="true"><FlagIcon size={18} /></span>
                <span><b>{(e.control || 'weekly') === 'weekly' ? t('ieltsToday.control.weekly', { n: String(e.calendarWeek) }) : t(`ieltsPlan.control.${e.control}`)}</b><small>{cap(dfmt(lang, e.date, { weekday: 'short', day: 'numeric', month: 'long' }))}</small></span>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  )
}

// ---------------------------------------------------------------- роадмап

const DAY_ICON = { done: CheckIcon, current: null, started: PlayIcon, missed: ReplayIcon, planned: null }
// ширина ленты дороги, ось — центр точки дня от верха ряда (padding 10 + половина точки 40), поля карты
const ROAD_W = 60
const ROAD_AXIS = 30
const ROAD_PAD = 24

function RoadNode({ day, selected, onPick }) {
  const { t } = useI18n()
  const Ic = DAY_ICON[day.status]
  return (
    <li className={`ih-road2__day is-${day.status}${selected ? ' is-sel' : ''}`}>
      {day.status === 'current' && <span className="ih-road2__here">{t('ieltsPlanV.youAreHere')}</span>}
      <button type="button" onClick={() => onPick(day.date)} aria-pressed={selected} aria-label={`${t('ieltsPlanV.day', { n: String(day.n) })}: ${t(`ieltsPlanV.st.${day.status}`)}`}>
        <span className="ih-road2__dot">{Ic && <Ic size={20} />}</span>
        <span className="ih-road2__label">{t('ieltsPlanV.day', { n: String(day.n) })}</span>
      </button>
    </li>
  )
}

function RoadWeek({ week, title, selected, onPick, flip, laneRef }) {
  const { t, lang } = useI18n()
  return (
    <div className={`ih-road2__week${flip ? ' is-flip' : ''}`}>
      <div className="ih-road2__tag">
        <b>{t('ieltsPlan.week', { n: String(week.n) })}</b>
        {title && <span>{title[lang] || title.ru}</span>}
      </div>
      {week.done && <span className="ih-road2__done">{t('ieltsPlanV.weekDone')}</span>}
      <ol className="ih-road2__lane" ref={laneRef}>
        {week.days.map((d) => <RoadNode key={d.date} day={d} selected={selected === d.date} onPick={onPick} />)}
        {week.control && (
          <li className={`ih-road2__day is-flag is-${week.control.status}${selected === week.control.date ? ' is-sel' : ''}`}>
            <button type="button" onClick={() => onPick(week.control.date)} aria-label={t('ieltsToday.control.weekly', { n: String(week.n) })}>
              <span className="ih-road2__dot"><FlagIcon size={24} /></span>
              <span className="ih-road2__label">{t('ieltsToday.control.weekly', { n: String(week.n) })}</span>
            </button>
          </li>
        )}
      </ol>
    </div>
  )
}

export function RoadmapView({ data, onStart, onMark }) {
  const { t } = useI18n()
  const today = data.today
  const cur = data.currentWeek || 1
  const total = data.enrollment.calendarWeeks || 1
  // окно — две недели, текущая вторая (как в макете «Недели 3–4»); на первой неделе — 1–2
  const [first, setFirst] = useState(Math.max(1, Math.min(cur - 1, total - 1)))
  const weeks = [first, first + 1].filter((n) => n <= total).map((n) => planWeek(data.tasks, n, today))
  const allDays = weeks.flatMap((w) => [...w.days.map((d) => d.date), ...(w.control ? [w.control.date] : [])])
  const [sel, setSel] = useState(() => allDays.find((d) => d >= today) || allDays[allDays.length - 1] || today)
  const tasksOf = byDate(data.tasks)
  const selWeek = weeks.find((w) => w.days.some((d) => d.date === sel) || w.control?.date === sel) || weeks[0]
  const selDay = selWeek?.days.find((d) => d.date === sel)
  const idx = allDays.indexOf(sel)
  // Дорога — одна S-образная лента, как в макете: первая неделя слева направо, поворот направо вниз, обратно влево,
  // поворот налево вниз, вторая неделя снова слева направо. Рисуется SVG по реальным позициям рядов (высота подписи
  // недели разная на разных языках); прежнее CSS-полукольцо давало комок без осевой и вторую неделю «против хода».
  const mapRef = useRef(null)
  const lanes = useRef([])
  const [road, setRoad] = useState(null)
  useLayoutEffect(() => {
    const [a, b] = lanes.current
    const map = mapRef.current
    if (!map) return
    const measure = () => {
      if (!a || getComputedStyle(map).getPropertyValue('--road-svg').trim() === '0') {
        if (a) a.style.marginRight = ''
        if (b) b.style.marginLeft = ''
        return setRoad(null)
      }
      const m = map.getBoundingClientRect()
      const ra = a.getBoundingClientRect()
      const yA = ra.top - m.top + ROAD_AXIS
      if (!b) return setRoad({ w: m.width, h: m.height, d: `M ${ra.left - m.left} ${yA} H ${ra.right - m.left}` })
      const rb0 = b.getBoundingClientRect()
      const r = (rb0.top - ra.top) / 4
      // повороты выходят за ряды на радиус — ряды отодвигаем, чтобы лента не резалась краем карты
      a.style.marginRight = `${Math.max(0, r + ROAD_W / 2 - ROAD_PAD)}px`
      b.style.marginLeft = `${Math.max(0, r + ROAD_W / 2 - ROAD_PAD)}px`
      const rA = a.getBoundingClientRect()
      const rb = b.getBoundingClientRect()
      const xA0 = rA.left - m.left + 8
      const xA1 = rA.right - m.left - 8
      const xB0 = rb.left - m.left + 8
      const xB1 = rb.right - m.left - 8
      const yB = rb.top - m.top + ROAD_AXIS
      const yM = yA + 2 * r
      setRoad({
        w: m.width,
        h: m.height,
        d: `M ${xA0} ${yA} H ${xA1} A ${r} ${r} 0 0 1 ${xA1} ${yM} H ${xB0} A ${r} ${r} 0 0 0 ${xB0} ${yB} H ${xB1}`,
      })
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(map)
    return () => {
      ro?.disconnect()
      if (a) a.style.marginRight = ''
      if (b) b.style.marginLeft = ''
    }
  }, [first, data])
  const say = selDay && selDay.status === 'current' ? 'ieltsPlanV.say.mid' : 'ieltsPlanV.say.keep'
  return (
    <div className="ih-planrow">
      <section className="ih-roadcard">
        <header className="ih-roadcard__head">
          <button type="button" className="ih-iconbtn" disabled={first <= 1} onClick={() => setFirst(first - 2 >= 1 ? first - 2 : 1)} aria-label={t('ieltsPlanV.prevWeeks')}><ChevronLeftIcon size={20} /></button>
          <div>
            <h2>{weeks.length > 1 ? t('ieltsPlanV.weeks', { a: String(first), b: String(first + 1) }) : t('ieltsPlan.week', { n: String(first) })}</h2>
            <span>{t('ieltsPlanV.programme', { name: data.enrollment.programmeName || '' })}</span>
          </div>
          <button type="button" className="ih-iconbtn" disabled={first + 1 >= total} onClick={() => setFirst(Math.min(first + 2, total - 1))} aria-label={t('ieltsPlanV.nextWeeks')}><ChevronRightIcon size={20} /></button>
          <span className="ih-spacer" />
          <button type="button" className="ih-softbtn" onClick={() => { setFirst(Math.max(1, Math.min(cur - 1, total - 1))); setSel(today) }}>
            <TargetIcon size={18} /> {t('ieltsPlanV.toToday')}
          </button>
        </header>
        <div className="ih-road2" ref={mapRef}>
          {weeks.map((w, i) => (
            <RoadWeek key={w.n} week={w} title={data.weekTitles?.[w.programmeWeek]} selected={sel} onPick={setSel} flip={i === 1} laneRef={(el) => (lanes.current[i] = el)} />
          ))}
          {road && (
            <svg className="ih-road2__svg" width={road.w} height={road.h} viewBox={`0 0 ${road.w} ${road.h}`} aria-hidden="true">
              <path d={road.d} className="ih-road2__band" style={{ strokeWidth: ROAD_W }} />
              <path d={road.d} className="ih-road2__axis" />
            </svg>
          )}
          <div className="ih-road2__mascot">
            <img src="/ielts/mascot/laptop.webp" alt="" aria-hidden="true" width="117" height="98" />
            <p>{t(say)}</p>
          </div>
        </div>
        <Legend />
      </section>
      <DayPanel
        date={sel}
        weekN={selWeek?.n}
        dayN={selDay?.n}
        tasks={tasksOf[sel] || []}
        control={selWeek?.control}
        today={today}
        onPrev={idx > 0 ? () => setSel(allDays[idx - 1]) : undefined}
        onNext={idx < allDays.length - 1 ? () => setSel(allDays[idx + 1]) : undefined}
        onStart={onStart}
        onMark={onMark}
      />
    </div>
  )
}

// ---------------------------------------------------------------- неделя

export function WeekView({ data, n, onWeek, onStart, onMove }) {
  const { t, lang } = useI18n()
  const today = data.today
  const dates = weekDates(data.enrollment.startDate, n)
  const tasksOf = byDate(data.tasks)
  const firstOpen = data.tasks.find((x) => dates.includes(x.date) && x.status !== 'completed' && x.date >= today)
  const [selId, setSelId] = useState(firstOpen?.id ?? null)
  const sel = data.tasks.find((x) => x.id === selId) || firstOpen || null
  const [moving, setMoving] = useState(false)
  const total = data.enrollment.calendarWeeks || 1
  const range = `${dfmt(lang, dates[0], { day: 'numeric' })}–${dfmt(lang, dates[6], { day: 'numeric', month: 'long' })}`
  return (
    <div className="ih-weekv">
      <div className="ih-navrow">
        <button type="button" className="ih-iconbtn" disabled={n <= 1} onClick={() => onWeek(n - 1)} aria-label={t('ieltsPlanV.prevWeek')}><ChevronLeftIcon size={20} /></button>
        <h2>{range}</h2>
        <button type="button" className="ih-iconbtn" disabled={n >= total} onClick={() => onWeek(n + 1)} aria-label={t('ieltsPlanV.nextWeek')}><ChevronRightIcon size={20} /></button>
        <button type="button" className="ih-softbtn" onClick={() => onWeek(null)}><TargetIcon size={18} /> {t('ieltsPlanV.thisWeek')}</button>
      </div>
      <div className="ih-week7">
        {dates.map((d) => {
          const list = tasksOf[d] || []
          return (
            <section key={d} className={`ih-week7__col${d === today ? ' is-today' : ''}`}>
              <header>
                <span>{cap(dfmt(lang, d, { weekday: 'short' }))}</span>
                <b>{dfmt(lang, d, { day: 'numeric' })}{list.some((x) => x.origin === 'weekly_control') && <FlagIcon size={14} />}</b>
              </header>
              <ul>
                {list.length ? list.map((task) => {
                  const st = task.origin === 'weekly_control' ? 'control' : task.status === 'completed' ? 'done' : task.date === today ? 'current' : task.overdue ? 'missed' : 'planned'
                  return (
                    <li key={task.id}>
                      <button type="button" className={`ih-wcard is-${st}${sel?.id === task.id ? ' is-sel' : ''}${taskOrigin(task) ? ` is-${taskOrigin(task)}` : ''}`} onClick={() => { setSelId(task.id); setMoving(false) }}>
                        <span className="ih-wcard__st" aria-hidden="true">{st === 'done' ? <CheckIcon size={12} /> : st === 'control' ? <FlagIcon size={12} /> : null}</span>
                        <b>{task.sec === 'control' ? t('ieltsPlanV.control') : task.sec === 'vocab' ? t('ieltsPlan.sec.vocab') : cap(task.sec)}</b>
                        <span className="ih-wcard__sub">{taskLabel(t, task).split(' · ').slice(1).join(' · ') || taskLabel(t, task)}</span>
                        <span className="ih-wcard__min"><ScheduleIcon size={12} /> {t('ieltsHub.minutes', { n: String(task.minutes) })}</span>
                        {taskOrigin(task) ? <OriginChip task={task} short /> : <span className="ih-wcard__mode">{t(`ieltsToday.mode.${task.mode || 'self_study'}`)}</span>}
                      </button>
                    </li>
                  )
                }) : <li className="ih-week7__rest">{t('ieltsPlanV.rest')}</li>}
              </ul>
            </section>
          )
        })}
      </div>
      {sel && (
        <section className="ih-wsel">
          <div className="ih-wsel__info">
            <h3>{cap(dfmt(lang, sel.date, { weekday: 'long', day: 'numeric', month: 'long' }))}</h3>
            <div className="ih-wsel__task">
              <span className={`ih-wsel__ring is-${sel.status}`} aria-hidden="true">{sel.status === 'completed' && <CheckIcon size={22} />}</span>
              <div>
                <b>{taskLabel(t, sel)}</b>
                <TeacherNote task={sel} />
                {taskOrigin(sel) ? <OriginChip task={sel} /> : <span>{t(`ieltsToday.mode.${sel.mode || 'self_study'}`)}</span>}
                <span><ScheduleIcon size={14} /> {t('ieltsPlanV.minutes', { n: String(sel.minutes) })}</span>
              </div>
            </div>
          </div>
          {sel.status !== 'completed' && (
            <div className="ih-wsel__actions">
              <button type="button" className="ih-btn2 ih-btn2--primary" onClick={() => onStart?.(sel)}>
                {sel.status === 'in_progress' ? t('ieltsPlan.continue') : t('ieltsPlan.start')}
              </button>
              {sel.origin !== 'weekly_control' && sel.mode === 'self_study' && (moving ? (
                <input type="date" className="ih-ptask__date" min={today} defaultValue={sel.date} aria-label={t('ieltsPlan.moveTo')} autoFocus
                  onChange={(e) => { if (e.target.value) { setMoving(false); onMove?.(sel, e.target.value) } }} onBlur={() => setMoving(false)} />
              ) : (
                <button type="button" className="ih-btn2 ih-btn2--outline" onClick={() => setMoving(true)}><EventIcon size={16} /> {t('ieltsPlanV.moveTask')}</button>
              ))}
              <small>{t('ieltsPlanV.moveNote')}</small>
            </div>
          )}
        </section>
      )}
      <Legend />
    </div>
  )
}

// ---------------------------------------------------------------- месяц

export function MonthView({ data, month, onMonth, onStart, onMark }) {
  const { t, lang } = useI18n()
  const today = data.today
  const [sel, setSel] = useState(today)
  const grid = monthGrid(month)
  const tasksOf = byDate(data.tasks)
  const week = data.tasks.find((x) => x.date === sel)?.calendarWeek
  const control = week ? data.tasks.find((x) => x.calendarWeek === week && x.origin === 'weekly_control') : null
  const events = data.tasks.filter((x) => (x.origin === 'weekly_control' || x.kind === 'checkpoint') && x.date >= today && x.status !== 'completed').slice(0, 3)
  // Шапка месяца — над календарём и панелью дня: панель встаёт вровень с сеткой, как в макете (раньше она поднималась к
  // шапке, а ключи цветов висели строкой под ней). «Октябрь 2026» без «г.»: месяц — именительным, год отдельно.
  const monthTitle = `${cap(dfmt(lang, month, { month: 'long' }))} ${month.slice(0, 4)}`
  return (
    <div className="ih-monthwrap">
      <div className="ih-navrow">
        <button type="button" className="ih-iconbtn" onClick={() => onMonth(shiftMonth(month, -1))} aria-label={t('ieltsPlanV.prevMonth')}><ChevronLeftIcon size={20} /></button>
        <h2>{monthTitle}</h2>
        <button type="button" className="ih-iconbtn" onClick={() => onMonth(shiftMonth(month, 1))} aria-label={t('ieltsPlanV.nextMonth')}><ChevronRightIcon size={20} /></button>
        <button type="button" className="ih-softbtn" onClick={() => { onMonth(null); setSel(today) }}><TargetIcon size={18} /> {t('ieltsPlanV.today')}</button>
        <span className="ih-spacer" />
        <ul className="ih-mkeys">
          <li><i className="is-task" />{t('ieltsPlanV.keyTasks')}</li>
          <li><i className="is-control" />{t('ieltsPlanV.control')}</li>
          <li><i className="is-mock" />Mock</li>
          <li><i className="is-homework" />{t('ieltsPlan.origin.homeworkShort')}</li>
          <li><i className="is-teacher" />{t('ieltsPlan.origin.teacherShort')}</li>
        </ul>
      </div>
    <div className="ih-planrow ih-planrow--month">
      <div className="ih-monthv">
        <div className="ih-month2" role="grid">
          {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => <span key={d} className="ih-month2__dow">{t(`ieltsPlanV.dow.${d}`)}</span>)}
          {grid.map(({ date, inMonth }) => {
            const list = tasksOf[date] || []
            // задачи преподавателя (ДЗ, затем «добавлено преподавателем») — первыми: в клетке видно два-три чипа, и
            // они не должны прятаться за «Ещё N» под задачами программы
            const rank = (x) => (taskOrigin(x) === 'homework' ? 0 : taskOrigin(x) === 'teacher' ? 1 : 2)
            const work = list.filter((x) => x.origin !== 'weekly_control' && x.kind !== 'checkpoint').sort((a, b) => rank(a) - rank(b))
            const ctl = list.find((x) => x.origin === 'weekly_control' || x.kind === 'checkpoint')
            const st = dayStatus(list, date, today)
            const shown = work.slice(0, ctl ? 1 : 2)
            return (
              <button key={date} type="button" className={`ih-month2__day${inMonth ? '' : ' is-out'}${date === today ? ' is-today' : ''}${date === sel ? ' is-sel' : ''}`} onClick={() => setSel(date)}>
                <span className="ih-month2__n">{Number(date.slice(8))}</span>
                {ctl && (
                  <span className={`ih-mchip ${ctl.control === 'weekly' || ctl.control === 'month' ? 'is-control' : 'is-mock'}`}>
                    <FlagIcon size={11} /> {ctl.control === 'weekly' ? t('ieltsPlanV.controlN', { n: String(ctl.calendarWeek) }) : t(`ieltsPlan.control.${ctl.control}`)}
                  </span>
                )}
                {shown.map((x) => (
                  <span key={x.id} className={`ih-mchip${x.status === 'completed' ? ' is-done' : ''}${taskOrigin(x) ? ` is-${taskOrigin(x)}` : ''}`} title={taskOrigin(x) ? taskLabel(t, x) : undefined}>
                    {x.status === 'completed' && <CheckIcon size={11} />} {x.sec === 'vocab' ? t('ieltsPlan.sec.vocab') : cap(x.sec)}
                  </span>
                ))}
                {work.length > shown.length && <span className="ih-mchip is-more">{t('ieltsPlanV.more', { n: String(work.length - shown.length) })}</span>}
                {!list.length && inMonth && st === 'rest' && date.slice(0, 7) === month.slice(0, 7) && new Date(`${date}T00:00:00Z`).getUTCDay() === 0 && <span className="ih-month2__rest">{t('ieltsPlanV.rest')}</span>}
              </button>
            )
          })}
        </div>
        <Legend />
      </div>
      <DayPanel date={sel} tasks={tasksOf[sel] || []} control={null} today={today} onStart={onStart} onMark={onMark} events={events.length ? events : (control ? [control] : [])} />
    </div>
    </div>
  )
}
