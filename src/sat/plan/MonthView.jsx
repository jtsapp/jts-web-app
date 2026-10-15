import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, DescriptionIcon, FlagIcon } from '../../ielts/icons.jsx'
import { TrophyIcon } from '../icons.jsx'
import LessonMenu from './LessonMenu.jsx'
import { PHASES, addDays, allLessons, lessonsInMonth, monthGrid, parse, shownStatus } from '../model/plan.js'
import { skillName, skillSection } from '../names.js'
import { fmtDate } from '../model/dates.js'

/**
 * Месяц плана (Figma SAT 14): календарь с понедельника, над каждой строкой — неделя плана и её фаза, в днях —
 * занятия (точка секции и навык; сделанное зелёным). Внизу — контрольные точки: первый мини-тест, недели пробников
 * и день экзамена. Клик по занятию — то же меню, что в «Неделе».
 */
export default function MonthView({ plan, next, todayIso, busy, onLesson, onStart }) {
  const { t, lang } = useI18n()
  const today = parse(todayIso)
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [menu, setMenu] = useState(null)
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const fmt = (d, o) => fmtDate(loc, d, o)
  const rows = monthGrid(plan, ym.y, ym.m)
  const count = lessonsInMonth(plan, ym.y, ym.m)
  const title = fmt(new Date(ym.y, ym.m, 1), { month: 'long', year: 'numeric' }).replace(/\s*г$/, '')
  const shift = (n) => {
    setMenu(null)
    const d = new Date(ym.y, ym.m + n, 1)
    setYm({ y: d.getFullYear(), m: d.getMonth() })
  }
  const weekdays = Array.from({ length: 7 }, (_, i) => fmt(addDays(parse('2026-09-28'), i), { weekday: 'short' }))

  // контрольные точки: первый мини-тест, недели пробников (первое занятие каждой), день экзамена
  const lessons = allLessons(plan)
  const firstMini = lessons.find((l) => l.actions.includes('mini-test') && l.status !== 'skipped')
  const mockWeeks = plan.weeks.filter((w) => w.phase === 5 && w.lessons.length).map((w) => w.lessons[0].date)
  const day = (iso, o = { day: 'numeric', month: 'long' }) => fmt(parse(iso), o)

  return (
    <div className="st-month">
      <div className="st-card st-month__card">
        <div className="st-month__head">
          <h2>{title.charAt(0).toUpperCase() + title.slice(1)}</h2>
          <span className="st-month__badge">{plural(t, lang, 'sat.month.lessons', count)}</span>
          <span className="st-spacer" />
          <button type="button" className="ih-round st-week__nav" aria-label={t('sat.month.prev')} onClick={() => shift(-1)}><ChevronLeftIcon size={18} /></button>
          <button type="button" className="ih-btn ih-btn--outline st-week__now" disabled={ym.y === today.getFullYear() && ym.m === today.getMonth()}
            onClick={() => { setMenu(null); setYm({ y: today.getFullYear(), m: today.getMonth() }) }}>{t('sat.month.current')}</button>
          <button type="button" className="ih-round st-week__nav" aria-label={t('sat.month.next')} onClick={() => shift(1)}><ChevronRightIcon size={18} /></button>
        </div>
        <div className="st-month__wd">{weekdays.map((w) => <span key={w}>{w}</span>)}</div>
        {rows.map((r) => {
          const key = r.week ? PHASES.find((p) => p.id === r.week.phase)?.key : null
          return (
            <div key={r.monday} className="st-month__row">
              {r.week && (
                <span className={`st-month__label is-${key}`}><i />{t('sat.month.weekLabel', { n: String(r.week.index + 1), phase: t(`sat.phase.${key}`) })}</span>
              )}
              <div className="st-month__cells">
                {r.days.map((d, i) => (
                  <div key={d.date} className={`st-month__cell ${d.inMonth ? '' : 'is-out'} ${d.date === todayIso ? 'is-today' : ''} ${d.date < todayIso ? 'is-past' : ''}`}>
                    <span className="st-month__num">{d.day}{d.date === todayIso && <em>{t('sat.week.today')}</em>}</span>
                    {plan.examDate === d.date && <span className="st-month__exam"><TrophyIcon size={14} />{t('sat.road.examDay')}</span>}
                    {d.lessons.map((l) => {
                      const st = shownStatus(l, next)
                      return (
                        <div key={l.id} className="st-month__slot">
                          <button type="button" className={`st-lesson st-mlesson is-${st}`} aria-haspopup="dialog" onClick={() => setMenu(menu === l.id ? null : l.id)}>
                            {st === 'done' ? <CheckCircleIcon size={13} /> : <i className={`st-dot is-${skillSection(l.skillIds[0])}`} />}
                            <span>{l.skillIds.map((s) => skillName(s, lang)).join(' · ')}</span>
                          </button>
                          {menu === l.id && (
                            <LessonMenu
                              lesson={l}
                              examDate={plan.examDate}
                              todayIso={todayIso}
                              busy={busy}
                              anchor={i >= 4 ? { right: 0 } : { left: 0 }}
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
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div className="st-month__marks">
        {firstMini && (
          <div className="st-card st-month__mark">
            <span className="st-month__markicon is-violet"><FlagIcon size={20} /></span>
            <span><b>{day(firstMini.date)}</b><small>{t('sat.month.mini')}</small></span>
          </div>
        )}
        {mockWeeks.length > 0 && (
          <div className="st-card st-month__mark">
            <span className="st-month__markicon"><DescriptionIcon size={20} /></span>
            <span><b>{mockWeeks.map((d) => day(d, { day: 'numeric' })).join(t('sat.month.and'))} {fmt(parse(mockWeeks[mockWeeks.length - 1]), { month: 'long', day: 'numeric' }).replace(/^\d+\s*/, '')}</b><small>{t('sat.month.mocks')}</small></span>
          </div>
        )}
        <div className="st-card st-month__mark">
          <span className="st-month__markicon is-gold"><TrophyIcon size={20} /></span>
          <span><b>{plan.examDate ? day(plan.examDate) : t('sat.dateUndecided')}</b><small>{t('sat.road.examDay')}</small></span>
        </div>
      </div>
    </div>
  )
}
