import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { ChevronLeftIcon, ChevronRightIcon, InfoIcon, CheckCircleIcon } from '../../ielts/icons.jsx'
import LessonMenu from './LessonMenu.jsx'
import { PHASES, addDays, iso, parse, phaseRanges, progress, shownStatus } from '../model/plan.js'
import { skillName, skillSection } from '../names.js'
import { fmtDate } from '../model/dates.js'

const STATUS = ['done', 'next', 'planned', 'skipped', 'moved']

/**
 * Неделя плана (Figma SAT 13): полоса фаз с прогрессом всего плана, семь дней недели с карточками занятий
 * (статус цветом и словом), меню занятия по клику, легенда и правило пересборки.
 */
export default function WeekView({ plan, next, todayIso, busy, onLesson, onStart }) {
  const { t, lang } = useI18n()
  const weeks = plan.weeks
  const todayWeek = Math.max(0, weeks.findIndex((w) => w.monday === iso(addDays(parse(todayIso), -((parse(todayIso).getDay() + 6) % 7)))))
  const [wi, setWi] = useState(todayWeek)
  const [menu, setMenu] = useState(null)
  // Меню занятия — в точке правого клика (clientX/Y): левый клик сразу начинает занятие.
  const openMenu = (e, id) => { e.preventDefault(); setMenu({ id, x: e.clientX, y: e.clientY }) }
  const week = weeks[Math.min(wi, weeks.length - 1)]
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const fmt = (d, o) => fmtDate(loc, d, o)
  const mon = parse(week.monday)
  const prog = progress(plan)
  const ranges = phaseRanges(plan)
  const curPhase = week.phase
  const hours = Math.round((week.lessons.reduce((a, l) => a + (l.minutes || 0), 0) / 60) * 10) / 10

  return (
    <div className="st-week">
      <div className="st-card st-phases">
        <div className="st-phases__row">
          <span className="st-phases__tile is-done">
            <b><CheckCircleIcon size={16} />{t('sat.phase.diagnostic')}</b>
            <small>{t('sat.week.w0')}</small>
          </span>
          {ranges.map((r) => {
            const key = PHASES.find((p) => p.id === r.phase).key
            const state = r.phase === curPhase ? 'is-here' : r.phase < curPhase ? 'is-past' : ''
            return (
              <span key={r.phase} className={`st-phases__tile ${state}`}>
                <b>{t(`sat.phase.${key}`)}</b>
                <small>{r.from === r.to ? t('sat.week.wN', { n: String(r.from) }) : t('sat.week.wRange', { a: String(r.from), b: String(r.to) })}</small>
              </span>
            )
          })}
        </div>
        <div className="st-phases__prog">
          <span className="st-rep__bar"><i style={{ width: `${Math.max(2, prog.pct)}%` }} /></span>
          <b>{t('sat.week.progress', { d: String(prog.done), n: String(prog.total), p: String(prog.pct) })}</b>
        </div>
      </div>

      <div className="st-card st-week__card">
        <div className="st-week__head">
          <div>
            <h2>{t('sat.week.title', { n: String(week.index + 1), from: fmt(mon, { day: 'numeric', month: 'short' }), to: fmt(addDays(mon, 6), { day: 'numeric', month: 'short' }) })}</h2>
            <span className="st-muted">{plural(t, lang, 'sat.week.lessons', week.lessons.length)} · {t('sat.week.hours', { h: String(hours) })}</span>
          </div>
          <span className="st-spacer" />
          <button type="button" className="ih-round st-week__nav" disabled={wi <= 0} aria-label={t('sat.week.prev')} onClick={() => { setMenu(null); setWi(wi - 1) }}><ChevronLeftIcon size={18} /></button>
          <button type="button" className="ih-btn ih-btn--outline st-week__now" disabled={wi === todayWeek} onClick={() => { setMenu(null); setWi(todayWeek) }}>{t('sat.week.current')}</button>
          <button type="button" className="ih-round st-week__nav" disabled={wi >= weeks.length - 1} aria-label={t('sat.week.next')} onClick={() => { setMenu(null); setWi(wi + 1) }}><ChevronRightIcon size={18} /></button>
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
                  const section = skillSection(l.skillIds[0])
                  return (
                    <div key={l.id} className="st-week__slot">
                      <button type="button" className={`st-lesson is-${st}`} aria-haspopup="dialog" aria-expanded={menu?.id === l.id} onClick={(e) => (l.status === 'skipped' ? openMenu(e, l.id) : onStart(l.id))}
                        onContextMenu={(e) => openMenu(e, l.id)}>
                        <span className="st-lesson__sec"><i className={`st-dot is-${section}`} />{section === 'math' ? 'Math' : 'R&W'}</span>
                        <b>{l.skillIds.map((s) => skillName(s, lang)).join(' · ')}</b>
                        <span className="st-lesson__acts">{l.actions.map((a) => t(`sat.action.${a}`)).join(' · ')}</span>
                        <span className="st-lesson__st">{st === 'done' && <CheckCircleIcon size={14} />}{t(`sat.status.${st}`)}</span>
                      </button>
                      {menu?.id === l.id && (
                        <LessonMenu
                          lesson={l}
                          examDate={plan.examDate}
                          todayIso={todayIso}
                          busy={busy}
                          at={menu}
                          onClose={() => setMenu(null)}
                          onStart={() => onStart(l.id)}
                          onStatus={(s) => onLesson(l.id, { status: s }).then(() => setMenu(null))}
                          onMove={(date) => onLesson(l.id, { date }).then(() => setMenu(null))}
                        />
                      )}
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
