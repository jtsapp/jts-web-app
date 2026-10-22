import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { ChevronLeftIcon, ChevronRightIcon, InfoIcon, CheckCircleIcon } from '../../ielts/icons.jsx'
import { addDays, iso, parse, shownStatus } from '../model/plan.js'
import { fmtDate } from '../model/dates.js'

const STATUS = ['done', 'next', 'planned', 'skipped', 'moved']

/**
 * Неделя плана (Figma SAT 13): полоса фаз с прогрессом курса, семь дней недели с занятиями группы (статус цветом и
 * словом) и легенда. Фазы и счётчик «X из N» — с сервера (roadmap), занятия — из расписания группы.
 */
export default function WeekView({ plan, roadmap, next, todayIso, onStart }) {
  const { t, lang } = useI18n()
  const weeks = plan.weeks
  const todayWeek = Math.max(0, weeks.findIndex((w) => w.monday === iso(addDays(parse(todayIso), -((parse(todayIso).getDay() + 6) % 7)))))
  const [wi, setWi] = useState(todayWeek)
  // Меню занятия — в точке правого клика (clientX/Y): левый клик сразу начинает занятие.
  const week = weeks[Math.min(wi, weeks.length - 1)]
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const fmt = (d, o) => fmtDate(loc, d, o)
  const mon = parse(week.monday)
  const phases = roadmap.phases.filter((p) => p.kind !== 'exam' && p.kind !== 'self')
  const pct = roadmap.lessonCount ? Math.round((roadmap.attended * 100) / roadmap.lessonCount) : 0
  const curPhase = roadmap.active
  const hours = Math.round((week.lessons.reduce((a, l) => a + (l.minutes || 0), 0) / 60) * 10) / 10

  return (
    <div className="st-week">
      <div className="st-card st-phases">
        <div className="st-phases__row">
          {phases.map((p) => {
            const state = p.n === curPhase ? 'is-here' : p.status === 'done' ? 'is-done' : p.n < curPhase ? 'is-past' : ''
            return (
              <span key={p.n} className={`st-phases__tile ${state}`}>
                <b>{p.status === 'done' && <CheckCircleIcon size={16} />}{t(`sat.phase.${p.key}`)}</b>
                <small>{p.weekFrom == null ? '·' : p.weekFrom === p.weekTo ? t('sat.week.wN', { n: String(p.weekFrom) }) : t('sat.week.wRange', { a: String(p.weekFrom), b: String(p.weekTo) })}</small>
              </span>
            )
          })}
        </div>
        <div className="st-phases__prog">
          <span className="st-rep__bar"><i style={{ width: `${Math.max(2, pct)}%` }} /></span>
          <b>{t('sat.week.progress', { d: String(roadmap.attended), n: String(roadmap.lessonCount), p: String(pct) })}</b>
        </div>
      </div>

      <div className="st-card st-week__card">
        <div className="st-week__head">
          <div>
            <h2>{t('sat.week.title', { n: String(week.index + 1), from: fmt(mon, { day: 'numeric', month: 'short' }), to: fmt(addDays(mon, 6), { day: 'numeric', month: 'short' }) })}</h2>
            <span className="st-muted">{plural(t, lang, 'sat.week.lessons', week.lessons.length)} · {t('sat.week.hours', { h: String(hours) })}</span>
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
                        <span className="st-lesson__sec"><i className={`st-dot is-${l.section}`} />{l.section === 'math' ? 'Math' : l.section === 'rw' ? 'R&W' : 'SAT'} · {l.time}</span>
                        <b>{l.topic}</b>
                        <span className="st-lesson__acts">{t('sat.lesson.number', { n: String(l.number) })}</span>
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
