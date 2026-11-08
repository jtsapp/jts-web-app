import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, FlagIcon } from '../../ielts/icons.jsx'
import { addDays, lessonsInMonth, monthGrid, parse, shownStatus } from '../model/plan.js'
import { bluebookDays } from '../model/roadmap.js'
import { fmtDate } from '../model/dates.js'

/**
 * Месяц плана (Figma «NEW 2», 17:1866): календарь с понедельника, над каждой строкой — неделя курса и её фаза (цвет
 * полоски — фаза), в днях — занятия группы (точка секции и тема; сделанное зелёным), Bluebook-тест и день экзамена —
 * чёрными чипами с флагом в своей клетке. Клик по занятию — практика по его теме.
 */
export default function MonthView({ plan, roadmap, next, todayIso, onStart }) {
  const { t, lang } = useI18n()
  const today = parse(todayIso)
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() })
  // Меню занятия — в точке правого клика (clientX/Y): левый клик сразу начинает занятие.
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const fmt = (d, o) => fmtDate(loc, d, o)
  const rows = monthGrid(plan, ym.y, ym.m)
  const count = lessonsInMonth(plan, ym.y, ym.m)
  const title = fmt(new Date(ym.y, ym.m, 1), { month: 'long', year: 'numeric' }).replace(/\s*г$/, '')
  const shift = (n) => {
    const d = new Date(ym.y, ym.m + n, 1)
    setYm({ y: d.getFullYear(), m: d.getMonth() })
  }
  const tests = bluebookDays(roadmap)
  const weekdays = Array.from({ length: 7 }, (_, i) => fmt(addDays(parse('2026-09-28'), i), { weekday: 'short' }))

  // Бейджи «Мини-тест», «Полные пробники», «День экзамена» под календарём убраны (ТЗ SAT 17.10, задача 3.3):
  // мини-тест и пробники были подписями к обычным занятиям, а не отдельными тестами. День экзамена — в клетке.

  return (
    <div className="st-month">
      <div className="st-card st-month__card">
        <div className="st-month__head">
          <h2>{title.charAt(0).toUpperCase() + title.slice(1)}</h2>
          <span className="st-month__badge">{plural(t, lang, 'sat.month.lessons', count)}</span>
          <span className="st-spacer" />
          <button type="button" className="ih-round st-week__nav" aria-label={t('sat.month.prev')} onClick={() => shift(-1)}><ChevronLeftIcon size={18} /></button>
          <button type="button" className="ih-btn ih-btn--outline st-week__now" disabled={ym.y === today.getFullYear() && ym.m === today.getMonth()}
            onClick={() => { setYm({ y: today.getFullYear(), m: today.getMonth() }) }}>{t('sat.month.current')}</button>
          <button type="button" className="ih-round st-week__nav" aria-label={t('sat.month.next')} onClick={() => shift(1)}><ChevronRightIcon size={18} /></button>
        </div>
        <div className="st-month__wd">{weekdays.map((w) => <span key={w}>{w}</span>)}</div>
        {rows.map((r) => {
          const key = r.week ? roadmap.phases.find((p) => p.n === r.week.phase)?.key : null
          return (
            <div key={r.monday} className="st-month__row">
              {r.week && (
                <span className={`st-month__label is-${key}`}><i />{t('sat.month.weekLabel', { n: String(r.week.index + 1), phase: t(`sat.phase.${key}`) })}</span>
              )}
              <div className="st-month__cells">
                {r.days.map((d, i) => (
                  <div key={d.date} className={`st-month__cell ${d.inMonth ? '' : 'is-out'} ${d.date === todayIso ? 'is-today' : ''} ${d.date < todayIso ? 'is-past' : ''}`}>
                    <span className="st-month__num">{d.day}{d.date === todayIso && <em>{t('sat.week.today')}</em>}</span>
                    {tests[d.date] != null && <span className="st-month__exam"><FlagIcon size={14} /><span>{t('sat.strip.test', { n: String(tests[d.date]) })}</span></span>}
                    {plan.examDate === d.date && <span className="st-month__exam"><FlagIcon size={14} /><span>{t('sat.road.examDay')}</span></span>}
                    {d.lessons.map((l) => {
                      const st = shownStatus(l, next)
                      return (
                        <div key={l.id} className="st-month__slot">
                          <button type="button" className={`st-lesson st-mlesson is-${st}`} onClick={() => onStart(l.id)}>
                            {st === 'done' ? <CheckCircleIcon size={13} /> : <i className={`st-dot is-${l.section}`} />}
                            <span>{l.topic}</span>
                          </button>
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
    </div>
  )
}
