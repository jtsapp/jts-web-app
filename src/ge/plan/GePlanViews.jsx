import { useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import {
  CheckIcon, ChevronLeftIcon, ChevronRightIcon, EventIcon, PlayIcon, RadioOffIcon, ReplayIcon, ScheduleIcon, TargetIcon,
} from '../../ielts/icons.jsx'
import GeTaskRow, { taskMeta } from './GeTaskRow.jsx'
import {
  addDays, byDate, dayMinutes, dayStatus, mondayOf, monthGrid, plateOf, roadWeek, shiftMonth, taskShort, taskTitle, weekDates,
  weekNumber,
} from './planModel.js'

// Три вида плана общего курса (спека 2026-10-13, секция 4) — роадмап на две недели, неделя, месяц — над одними задачами
// бэкенда. Вид и разметка — как у плана IELTS (src/ielts/plan/PlanViews.jsx, классы ih-*), код — свой: IELTS не трогаем
// (решение владельца 12.10.2026). Отличия от IELTS: недели календарные пн–вс, контроля недели нет (контрольные курса —
// тесты юнитов — идут в тропе наравне с уроками), задачи занятий и ДЗ — из расписания и домашних заданий.

const loc = (lang) => (lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU')
const dfmt = (lang, iso, o) => new Intl.DateTimeFormat(loc(lang), { timeZone: 'UTC', ...o }).format(new Date(`${iso}T00:00:00Z`))
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const DOW = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export function Legend() {
  const { t } = useI18n()
  const items = [['done', CheckIcon], ['current', RadioOffIcon], ['started', PlayIcon], ['planned', ScheduleIcon], ['missed', ReplayIcon]]
  return (
    <ul className="ih-legend" aria-label={t('gePlan.legend')}>
      {items.map(([k, Ic]) => (
        <li key={k}>
          <span className={`ih-legend__ic is-${k}`} aria-hidden="true"><Ic size={14} /></span>
          {t(`gePlan.st.${k}`)}
        </li>
      ))}
    </ul>
  )
}

/** Панель выбранного дня: задачи (те же строки, что на «Сегодня») и нагрузка дня. */
export function DayPanel({ date, weekN, dayN, tasks, titles, today, onPrev, onNext, onStart }) {
  const { t, lang } = useI18n()
  const list = tasks || []
  const firstOpen = list.findIndex((x) => x.status !== 'completed')
  const full = cap(dfmt(lang, date, { weekday: 'long', day: 'numeric', month: 'long' }))
  return (
    <aside className="ih-dp" aria-label={t('gePlan.dayPanel')}>
      <header className="ih-dp__head">
        <div>
          <h2>{weekN && dayN ? `${t('gePlan.week.n', { n: String(weekN) })} · ${t('gePlan.day', { n: String(dayN) })}` : full}</h2>
          {weekN && dayN && <span>{full}</span>}
        </div>
        {(onPrev || onNext) && (
          <span className="ih-dp__nav">
            <button type="button" className="ih-iconbtn" disabled={!onPrev} onClick={onPrev} aria-label={t('gePlan.prev')}><ChevronLeftIcon size={20} /></button>
            <button type="button" className="ih-iconbtn" disabled={!onNext} onClick={onNext} aria-label={t('gePlan.next')}><ChevronRightIcon size={20} /></button>
          </span>
        )}
      </header>
      {list.length ? (
        <>
          <span className="ih-chip2">
            {date === today && <b>{t('gePlan.st.current')}</b>}
            <ScheduleIcon size={14} /> {t('gePlan.dayLoad', { n: String(list.length), min: String(dayMinutes(list)) })}
          </span>
          <ul className="ge-tasks">
            {list.map((task, i) => (
              <GeTaskRow key={task.id} task={task} title={titles?.[task.id]} primary={date <= today && i === firstOpen} onStart={onStart} />
            ))}
          </ul>
        </>
      ) : (
        <p className="ih-dp__rest">{t('gePlan.rest')}</p>
      )}
    </aside>
  )
}

// ---------------------------------------------------------------- роадмап

const DAY_ICON = { done: CheckIcon, current: null, started: PlayIcon, missed: ReplayIcon, planned: null }
// ширина ленты дороги, ось — центр точки дня от верха ряда, поля карты (как у IELTS)
const ROAD_W = 60
const ROAD_AXIS = 30
const ROAD_PAD = 24

function RoadNode({ day, selected, onPick }) {
  const { t } = useI18n()
  const Ic = DAY_ICON[day.status]
  return (
    <li className={`ih-road2__day is-${day.status}${selected ? ' is-sel' : ''}`}>
      {day.status === 'current' && <span className="ih-road2__here">{t('gePlan.youAreHere')}</span>}
      <button type="button" onClick={() => onPick(day.date)} aria-pressed={selected} aria-label={`${t('gePlan.day', { n: String(day.n) })}: ${t(`gePlan.st.${day.status}`)}`}>
        <span className="ih-road2__dot">{Ic && <Ic size={20} />}</span>
        <span className="ih-road2__label">{t('gePlan.day', { n: String(day.n) })}</span>
      </button>
    </li>
  )
}

function RoadWeek({ week, n, today, selected, onPick, flip, laneRef }) {
  const { t, lang } = useI18n()
  const range = `${dfmt(lang, week.monday, { day: 'numeric' })}–${dfmt(lang, addDays(week.monday, 6), { day: 'numeric', month: 'long' })}`
  return (
    <div className={`ih-road2__week${flip ? ' is-flip' : ''}`}>
      <div className="ih-road2__tag">
        <b>{t('gePlan.week.n', { n: String(n) })}</b>
        <span>{range}</span>
      </div>
      {week.done && <span className="ih-road2__done">{t('gePlan.weekDone')}</span>}
      <ol className="ih-road2__lane" ref={laneRef}>
        {week.days.length ? (
          week.days.map((d) => <RoadNode key={d.date} day={d} selected={selected === d.date} onPick={onPick} />)
        ) : (
          // пустая неделя впереди — горизонт плана ещё не дошёл; позади — задач тогда не было (до старта плана)
          <li className="ih-road2__day is-planned"><span className="ih-road2__label">{t(week.monday > today ? 'gePlan.beyond' : 'gePlan.noTasks')}</span></li>
        )}
      </ol>
    </div>
  )
}

export function RoadmapView({ plan, titles, onStart }) {
  const { t } = useI18n()
  const today = plan.today
  const startMonday = mondayOf(plan.planStart || today)
  const lastMonday = mondayOf(plan.planUntil || today)
  const thisMonday = mondayOf(today)
  // окно — две недели, текущая вторая (как в IELTS); в первую неделю плана — она и следующая
  const initial = addDays(thisMonday, -7) < startMonday ? startMonday : addDays(thisMonday, -7)
  const [first, setFirst] = useState(initial)
  const mondays = [first, addDays(first, 7)].filter((m) => m <= lastMonday)
  const weeks = mondays.map((m) => roadWeek(plan.tasks, m, today))
  const allDays = weeks.flatMap((w) => w.days.map((d) => d.date))
  const [sel, setSel] = useState(() => allDays.find((d) => d >= today) || allDays[allDays.length - 1] || today)
  const tasksOf = byDate(plan.tasks)
  const selWeek = weeks.find((w) => w.days.some((d) => d.date === sel)) || weeks[0]
  const selDay = selWeek?.days.find((d) => d.date === sel)
  const idx = allDays.indexOf(sel)

  // S-образная дорога SVG по реальным позициям рядов — как у IELTS: высота подписи недели разная на разных языках
  const mapRef = useRef(null)
  const lanes = useRef([])
  const [road, setRoad] = useState(null)
  useLayoutEffect(() => {
    const [a, b] = lanes.current
    const map = mapRef.current
    if (!map) return undefined
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
      return setRoad({
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
  }, [first, plan])

  // окно сдвинулось — выбранный день должен оказаться в нём, иначе панель показывает невидимый день и стрелки мертвы
  const moveWindow = (next) => {
    setFirst(next)
    const days = [next, addDays(next, 7)]
      .filter((m) => m <= lastMonday)
      .flatMap((m) => roadWeek(plan.tasks, m, today).days.map((d) => d.date))
    setSel(days.includes(today) ? today : days[0] || next)
  }
  const say = selDay && selDay.status === 'current' ? 'gePlan.say.today' : 'gePlan.say.keep'
  const n1 = weekNumber(first, plan.planStart || today)
  return (
    <div className="ih-planrow">
      <section className="ih-roadcard">
        <header className="ih-roadcard__head">
          <button type="button" className="ih-iconbtn" disabled={first <= startMonday} onClick={() => moveWindow(addDays(first, -14) < startMonday ? startMonday : addDays(first, -14))} aria-label={t('gePlan.prev')}><ChevronLeftIcon size={20} /></button>
          <div>
            <h2>{mondays.length > 1 ? t('gePlan.weeks', { a: String(n1), b: String(n1 + 1) }) : t('gePlan.week.n', { n: String(n1) })}</h2>
          </div>
          <button type="button" className="ih-iconbtn" disabled={addDays(first, 7) >= lastMonday} onClick={() => moveWindow(addDays(first, 14) > lastMonday ? lastMonday : addDays(first, 14))} aria-label={t('gePlan.next')}><ChevronRightIcon size={20} /></button>
          <span className="ih-spacer" />
          <button type="button" className="ih-softbtn" onClick={() => { setFirst(initial); setSel(today) }}>
            <TargetIcon size={18} /> {t('gePlan.toToday')}
          </button>
        </header>
        <div className="ih-road2" ref={mapRef}>
          {weeks.map((w, i) => (
            <RoadWeek key={w.monday} week={w} n={n1 + i} today={today} selected={sel} onPick={setSel} flip={i === 1} laneRef={(el) => (lanes.current[i] = el)} />
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
        weekN={selDay ? weekNumber(selWeek.monday, plan.planStart || today) : null}
        dayN={selDay?.n}
        tasks={tasksOf[sel] || []}
        titles={titles}
        today={today}
        onPrev={idx > 0 ? () => setSel(allDays[idx - 1]) : undefined}
        onNext={idx >= 0 && idx < allDays.length - 1 ? () => setSel(allDays[idx + 1]) : undefined}
        onStart={onStart}
      />
    </div>
  )
}

// ---------------------------------------------------------------- неделя

// Вторая строка карточки недели: заголовок карточки — уже короткое имя раздела, повторять его («Воркбук / Воркбук»,
// «Урок / Урок: …») незачем. Уроку — название шага тропы, ДЗ — его название, практике — полное имя раздела.
function cardSub(t, task, courseTitle) {
  if (task.kind === 'course') return courseTitle || ''
  if (task.kind === 'live') return task.extra?.teacherName || ''
  const full = taskTitle(t, task, courseTitle)
  return full === taskShort(t, task) ? '' : full
}

export function WeekView({ plan, titles, monday, onWeek, onStart, onMove, moveError }) {
  const { t, lang } = useI18n()
  const today = plan.today
  const startMonday = mondayOf(plan.planStart || today)
  const lastMonday = mondayOf(plan.planUntil || today)
  const dates = weekDates(monday)
  const tasksOf = byDate(plan.tasks)
  const inWeek = plan.tasks.filter((x) => dates.includes(x.date))
  const firstOpen = inWeek.find((x) => x.status !== 'completed' && x.date >= today) || null
  const [selId, setSelId] = useState(firstOpen?.id ?? null)
  const sel = inWeek.find((x) => x.id === selId) || firstOpen
  const [moving, setMoving] = useState(false)
  const range = `${dfmt(lang, dates[0], { day: 'numeric' })}–${dfmt(lang, dates[6], { day: 'numeric', month: 'long' })}`
  return (
    <div className="ih-weekv">
      <div className="ih-navrow">
        <button type="button" className="ih-iconbtn" disabled={monday <= startMonday} onClick={() => onWeek(addDays(monday, -7))} aria-label={t('gePlan.prev')}><ChevronLeftIcon size={20} /></button>
        <h2>{range}</h2>
        <button type="button" className="ih-iconbtn" disabled={monday >= lastMonday} onClick={() => onWeek(addDays(monday, 7))} aria-label={t('gePlan.next')}><ChevronRightIcon size={20} /></button>
        <button type="button" className="ih-softbtn" onClick={() => onWeek(null)}><TargetIcon size={18} /> {t('gePlan.thisWeek')}</button>
      </div>
      <div className="ih-week7">
        {dates.map((d, i) => {
          const list = tasksOf[d] || []
          return (
            <section key={d} className={`ih-week7__col${d === today ? ' is-today' : ''}`}>
              <header>
                <span>{t(`gePlan.dow.${DOW[i]}`)}</span>
                <b>{dfmt(lang, d, { day: 'numeric' })}</b>
              </header>
              <ul>
                {list.length ? list.map((task) => {
                  const st = task.status === 'completed' ? 'done' : task.date === today ? 'current' : task.overdue ? 'missed' : 'planned'
                  return (
                    <li key={task.id}>
                      <button type="button" className={`ih-wcard is-${st} ge-wcard--${plateOf(task)}${sel?.id === task.id ? ' is-sel' : ''}`} onClick={() => { setSelId(task.id); setMoving(false) }}>
                        <span className="ih-wcard__st" aria-hidden="true">{st === 'done' ? <CheckIcon size={12} /> : null}</span>
                        <b>{taskShort(t, task)}</b>
                        {cardSub(t, task, titles?.[task.id]) && <span className="ih-wcard__sub">{cardSub(t, task, titles?.[task.id])}</span>}
                        <span className="ih-wcard__min"><ScheduleIcon size={12} /> {taskMeta(t, lang, task)}</span>
                      </button>
                    </li>
                  )
                }) : <li className="ih-week7__rest">{t('gePlan.rest')}</li>}
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
              <span className={`ih-wsel__ring is-${sel.status}`} aria-hidden="true">{sel.status === 'completed' && <CheckIcon size={28} />}</span>
              <div>
                <b>{taskTitle(t, sel, titles?.[sel.id])}</b>
                <span><ScheduleIcon size={14} /> {taskMeta(t, lang, sel)}</span>
              </div>
            </div>
          </div>
          {sel.status !== 'completed' && (
            <div className="ih-wsel__actions">
              <button type="button" className="ih-btn2 ih-btn2--primary" onClick={() => onStart?.(sel)}>
                {sel.status === 'in_progress' ? t('gePlan.continue') : t('gePlan.start')}
              </button>
              {sel.movable && (moving ? (
                <input type="date" className="ih-ptask__date" min={today} max={plan.planUntil || undefined} defaultValue={sel.date} aria-label={t('gePlan.moveTo')} autoFocus
                  onChange={(e) => { if (e.target.value) { setMoving(false); onMove?.(sel, e.target.value) } }} onBlur={() => setMoving(false)} />
              ) : (
                <button type="button" className="ih-btn2 ih-btn2--outline" onClick={() => setMoving(true)}><EventIcon size={16} /> {t('gePlan.move')}</button>
              ))}
              {moveError && <span className="ge-move__error" role="alert">{t('gePlan.moveFail')}</span>}
              <small>{t('gePlan.moveNote')}</small>
            </div>
          )}
        </section>
      )}
      {monday > lastMonday && <p className="ge-plan__beyond">{t('gePlan.beyond')}</p>}
      <Legend />
    </div>
  )
}

// ---------------------------------------------------------------- месяц

export function MonthView({ plan, titles, month, onMonth, onStart }) {
  const { t, lang } = useI18n()
  const today = plan.today
  const [sel, setSel] = useState(today)
  const grid = monthGrid(month)
  const tasksOf = byDate(plan.tasks)
  const monthTitle = `${cap(dfmt(lang, month, { month: 'long' }))} ${month.slice(0, 4)}`
  // занятия и ДЗ — первыми: в клетке видно два чипа, и они не должны прятаться за «+N» под практикой
  const rank = (x) => (x.kind === 'live' ? 0 : x.kind === 'homework' ? 1 : x.kind === 'course' ? 2 : 3)
  const beyond = plan.planUntil && `${month.slice(0, 7)}-01` > plan.planUntil
  return (
    <div className="ih-monthwrap">
      <div className="ih-navrow">
        <button type="button" className="ih-iconbtn" onClick={() => onMonth(shiftMonth(month, -1))} aria-label={t('gePlan.prev')}><ChevronLeftIcon size={20} /></button>
        <h2>{monthTitle}</h2>
        <button type="button" className="ih-iconbtn" onClick={() => onMonth(shiftMonth(month, 1))} aria-label={t('gePlan.next')}><ChevronRightIcon size={20} /></button>
        <button type="button" className="ih-softbtn" onClick={() => { onMonth(null); setSel(today) }}><TargetIcon size={18} /> {t('gePlan.toToday')}</button>
      </div>
      <div className="ih-planrow ih-planrow--month">
        <div className="ih-monthv">
          <div className="ih-month2" role="grid">
            {DOW.map((d) => <span key={d} className="ih-month2__dow">{t(`gePlan.dow.${d}`)}</span>)}
            {grid.map(({ date, inMonth }) => {
              const list = [...(tasksOf[date] || [])].sort((a, b) => rank(a) - rank(b))
              const shown = list.slice(0, 2)
              const st = dayStatus(list, date, today)
              return (
                <button key={date} type="button" className={`ih-month2__day${inMonth ? '' : ' is-out'}${date === today ? ' is-today' : ''}${date === sel ? ' is-sel' : ''}`} onClick={() => setSel(date)}>
                  <span className="ih-month2__n">{Number(date.slice(8))}</span>
                  {shown.map((x) => (
                    <span key={x.id} className={`ih-mchip ge-mchip--${plateOf(x)}${x.status === 'completed' ? ' is-done' : ''}${x.kind === 'homework' ? ' is-homework' : ''}`} title={taskTitle(t, x, titles?.[x.id])}>
                      {x.status === 'completed' && <CheckIcon size={11} />} {taskShort(t, x)}
                    </span>
                  ))}
                  {list.length > shown.length && <span className="ih-mchip is-more">{t('gePlan.more', { n: String(list.length - shown.length) })}</span>}
                  {!list.length && inMonth && st === 'rest' && new Date(`${date}T00:00:00Z`).getUTCDay() === 0 && <span className="ih-month2__rest">{t('gePlan.rest')}</span>}
                </button>
              )
            })}
          </div>
          {beyond && <p className="ge-plan__beyond">{t('gePlan.beyond')}</p>}
          <Legend />
        </div>
        <DayPanel date={sel} tasks={tasksOf[sel] || []} titles={titles} today={today} onStart={onStart} />
      </div>
    </div>
  )
}
