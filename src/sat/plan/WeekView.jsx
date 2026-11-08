import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { pluralForm } from '../../lib/plural.js'
import { ChevronLeftIcon, ChevronRightIcon, InfoIcon, CheckCircleIcon } from '../../ielts/icons.jsx'
import { addDays, iso, parse, shownStatus } from '../model/plan.js'
import { fmtDate } from '../model/dates.js'
import PhaseStrip from './PhaseStrip.jsx'

const STATUS = ['done', 'next', 'planned', 'skipped', 'moved']

/**
 * Неделя плана (Figma «NEW 2», 17:1583): полоса фаз с прогрессом курса, семь дней недели с занятиями группы (статус
 * цветом и словом) и легенда. Фазы и счётчик «X из N» — с сервера (data — ответ /mobile/sat/roadmap), занятия — из
 * расписания группы (schedule — им же заполняется отрезок текущей фазы).
 */
export default function WeekView({ plan, data, schedule, next, todayIso, onStart }) {
  const { t, lang } = useI18n()
  const roadmap = data.roadmap
  const weeks = plan.weeks
  const todayWeek = Math.max(0, weeks.findIndex((w) => w.monday === iso(addDays(parse(todayIso), -((parse(todayIso).getDay() + 6) % 7)))))
  const [wi, setWi] = useState(todayWeek)
  // Меню занятия — в точке правого клика (clientX/Y): левый клик сразу начинает занятие.
  const week = weeks[Math.min(wi, weeks.length - 1)]
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const fmt = (d, o) => fmtDate(loc, d, o)
  const mon = parse(week.monday)
  const pct = roadmap.lessonCount ? Math.round((roadmap.attended * 100) / roadmap.lessonCount) : 0
  // длина занятия у всех одна (90 минут), но берём из данных — строка не соврёт, если школа её поменяет
  const minutes = week.lessons[0]?.minutes || 90
  const count = week.lessons.length

  return (
    <div className="st-week">
      <div className="st-card st-week__phases">
        <div className="st-road__strip">
          <PhaseStrip roadmap={data} schedule={schedule} size="L" />
        </div>
        <div className="st-week__prog">
          <span className="st-road__bar"><i style={{ width: `${Math.max(2, pct)}%` }} /></span>
          <b>{t('sat.week.progress', { d: String(roadmap.attended), n: String(roadmap.lessonCount), p: String(pct) })}</b>
        </div>
      </div>

      <div className="st-card st-week__card">
        <div className="st-week__head">
          <div>
            <h2>{t('sat.week.title', { n: String(week.index + 1), from: fmt(mon, { day: 'numeric', month: 'short' }), to: fmt(addDays(mon, 6), { day: 'numeric', month: 'short' }) })}</h2>
            <span className="st-muted">{t(`sat.week.sub.${pluralForm(count, lang)}`, { n: String(count), m: String(minutes) })}</span>
          </div>
          <span className="st-spacer" />
          <button type="button" className="ih-round st-week__nav" disabled={wi <= 0} aria-label={t('sat.week.prev')} onClick={() => { setWi(wi - 1) }}><ChevronLeftIcon size={18} /></button>
          <button type="button" className="ih-btn ih-btn--outline st-week__now" disabled={wi === todayWeek} onClick={() => { setWi(todayWeek) }}>{t('sat.week.current')}</button>
          <button type="button" className="ih-round st-week__nav" disabled={wi >= weeks.length - 1} aria-label={t('sat.week.next')} onClick={() => { setWi(wi + 1) }}><ChevronRightIcon size={18} /></button>
        </div>
        <div className="st-week__days">
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(mon, i)
            const dIso = iso(d)
            const today = dIso === todayIso
            const lessons = week.lessons.filter((l) => l.date === dIso)
            return (
              <div key={dIso} className={`st-week__day ${today ? 'is-today' : ''} ${dIso < todayIso ? 'is-past' : ''}`}>
                <span className="st-week__dayhead">
                  <small>{fmt(d, { weekday: 'short' })}</small>
                  <b>{d.getDate()}</b>
                  {today && <em>{t('sat.week.today')}</em>}
                </span>
                {lessons.map((l) => {
                  const st = shownStatus(l, next)
                  return (
                    <div key={l.id} className="st-week__slot">
                      <button type="button" className={`st-lesson is-${st}`} onClick={() => onStart(l.id)}>
                        <span className="st-lesson__sec"><i className={`st-dot is-${l.section}`} />{l.section === 'math' ? 'Math' : l.section === 'rw' ? 'R&W' : 'SAT'}</span>
                        <b>{l.topic}</b>
                        {/* шаги занятия у всех одинаковые (Figma W5) — строка постоянная, пока сервер не отдаёт свои */}
                        <span className="st-lesson__acts">{t('sat.lesson.steps')}</span>
                        <span className="st-lesson__st">{st === 'done' && <CheckCircleIcon size={14} />}{t(`sat.status.${st}`)}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
        <div className="st-week__legend">
          {STATUS.map((s) => <span key={s} className={`st-legend is-${s}`}><i />{t(`sat.status.${s}`)}</span>)}
        </div>
      </div>
      <p className="st-plan__note"><InfoIcon size={20} />{t('sat.week.note')}</p>
    </div>
  )
}
