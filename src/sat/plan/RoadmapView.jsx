import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { ArrowForwardIcon, ChevronLeftIcon, ChevronRightIcon } from '../../ielts/icons.jsx'
import { NotesIcon, TargetIcon, TickIcon, TrophyIcon } from '../icons.jsx'
import { PHASES, addDays, parse } from '../model/plan.js'
import { fmtDate } from '../model/dates.js'

// Узлы дороги в координатах полотна 1088×380 (Figma 12: змейка из трёх рядов, повороты справа и слева)
const NODES = [
  { x: 103, y: 310 },
  { x: 526, y: 310 },
  { x: 938, y: 250 },
  { x: 544, y: 190 },
  { x: 148, y: 130 },
  { x: 558, y: 70 },
]
const TROPHY = { x: 943, y: 70 }
const ROAD = 'M103 310 H878 A60 60 0 0 0 878 190 H208 A60 60 0 0 1 208 70 H943'

/**
 * Роудмап (Figma SAT 12): шесть шагов от диагностики до дня экзамена дорогой-змейкой, под ней — карточка
 * выбранного шага: недели, даты, что делаете и к чему придёте, сколько занятий шага сделано.
 * steps — [{ phase, from, to, monday, sunday, done, total }] (недели с 1; у диагностики from = 0).
 * current — id фазы, где ученик сейчас. «Начать занятие» открывает ближайшее несделанное занятие (учебный режим).
 */
export default function RoadmapView({ steps, current, examDate, onStart }) {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(current)
  useEffect(() => setOpen(current), [current])
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const fmt = (d, o) => fmtDate(loc, d, o)
  const byPhase = Object.fromEntries(steps.map((s) => [s.phase, s]))
  const idx = PHASES.findIndex((p) => p.id === open)
  const step = byPhase[open]
  const key = PHASES[idx]?.key

  const stars = (s) => {
    if (!s) return 0
    if (s.phase < current) return 3
    if (s.phase > current || !s.total) return 0
    return Math.min(3, Math.ceil((s.done / s.total) * 3))
  }

  return (
    <div className="st-road">
      <div className="st-road__map">
        <div className="st-road__nav">
          <button type="button" className="ih-round st-road__arrow" disabled={idx <= 0} aria-label={t('sat.road.prev')} onClick={() => setOpen(PHASES[idx - 1].id)}>
            <ChevronLeftIcon size={18} />
          </button>
          <span>{t('sat.road.step', { n: String(idx + 1), total: '6' })}</span>
          <button type="button" className="ih-round st-road__arrow" disabled={idx >= PHASES.length - 1} aria-label={t('sat.road.next')} onClick={() => setOpen(PHASES[idx + 1].id)}>
            <ChevronRightIcon size={18} />
          </button>
        </div>
        <svg className="st-road__svg" viewBox="0 0 1088 380" role="img" aria-label={t('sat.road.label')}>
          <path d={ROAD} fill="none" stroke="#e3d6ff" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" />
          <path d={ROAD} fill="none" stroke="#fff" strokeWidth="2.5" strokeDasharray="12 10" />
          {PHASES.map((p, i) => {
            const n = NODES[i]
            const s = byPhase[p.id]
            const done = p.id < current
            const here = p.id === current
            const k = stars(s)
            return (
              <g key={p.id} className={`st-road__node ${open === p.id ? 'is-open' : ''}`} onClick={() => setOpen(p.id)} role="button" tabIndex={0}
                aria-label={t(`sat.phase.${p.key}`)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen(p.id)}>
                {[0, 1, 2].map((j) => (
                  <text key={j} x={n.x - 15 + j * 15} y={n.y - (here ? 34 : 28)} textAnchor="middle" className={j < k ? 'st-road__star is-on' : 'st-road__star'}>★</text>
                ))}
                <circle cx={n.x} cy={n.y} r={here ? 26 : 21} className={done ? 'is-done' : here ? 'is-here' : 'is-next'} />
                {done ? (
                  <path d={`M${n.x - 8} ${n.y} l5 5 l10 -11`} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <text x={n.x} y={n.y + (here ? 8 : 6)} textAnchor="middle" className={here ? 'st-road__num is-here' : 'st-road__num'}>{i + 1}</text>
                )}
              </g>
            )
          })}
          <circle cx={TROPHY.x} cy={TROPHY.y} r="23" fill="#f5a524" />
          <g transform={`translate(${TROPHY.x - 11} ${TROPHY.y - 11}) scale(0.92)`} fill="#fff">
            <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
          </g>
        </svg>
        {NODES[PHASES.findIndex((p) => p.id === current)] && (
          <span className="st-road__here" style={{ left: `${(NODES[PHASES.findIndex((p) => p.id === current)].x / 1088) * 100}%`, top: `${((NODES[PHASES.findIndex((p) => p.id === current)].y + 52) / 380) * 100}%` }}>
            <TargetIcon size={14} />{t('sat.road.here', { phase: t(`sat.phase.${PHASES.find((p) => p.id === current)?.key}`) })}
          </span>
        )}
        <span className="st-road__exam" style={{ left: `${(TROPHY.x / 1088) * 100}%`, top: `${((TROPHY.y + 36) / 380) * 100}%` }}>
          <span className="st-road__examicon"><TrophyIcon size={16} /></span>
          <span><b>{t('sat.road.examDay')}</b><small>{examDate ? fmt(parse(examDate), { day: 'numeric', month: 'long' }) : t('sat.dateUndecided')}</small></span>
        </span>
      </div>

      {step && key && (
        <article key={open} className="st-card st-road__card ih-enter">
          <div className="st-road__cardhead">
            <div>
              <span className="st-road__eyebrow">{t('sat.road.step', { n: String(idx + 1), total: '6' })}</span>
              <h2>{t(`sat.phase.${key}`)}</h2>
            </div>
            <span className="st-spacer" />
            <span className="st-road__chip">{step.from === 0 ? t('sat.road.week0') : step.from === step.to ? t('sat.road.week', { n: String(step.from) }) : t('sat.road.weeks', { a: String(step.from), b: String(step.to) })}</span>
            {step.monday && (
              <span className="st-road__chip">
                {fmt(parse(step.monday), { day: 'numeric', month: 'short' })}
                {step.from !== 0 && <> → {fmt(addDays(parse(step.sunday), 0), { day: 'numeric', month: 'short' })}</>}
              </span>
            )}
          </div>
          <p className="st-road__lead">{t(`sat.phaseText.${key}.lead`)}</p>
          <div className="st-road__boxes">
            <div>
              <b><NotesIcon size={18} />{t('sat.road.doing')}</b>
              <p>{t(`sat.phaseText.${key}.do`)}</p>
            </div>
            <div>
              <b><TargetIcon size={18} />{t('sat.road.end')}</b>
              <p>{t(`sat.phaseText.${key}.end`)}</p>
            </div>
          </div>
          {step.from !== 0 && (
            <div className="st-road__progress">
              <div>
                <b>{t('sat.road.lessonsDone', { d: String(step.done), n: String(step.total) })}</b>
                <span className="st-rep__bar"><i style={{ width: `${step.total ? Math.max(3, (step.done * 100) / step.total) : 0}%` }} /></span>
              </div>
              {open === current && onStart && (
                // ближайшее несделанное занятие плана — учебная сессия (фаза 5)
                <button type="button" className="ih-cta st-road__start" onClick={onStart}>
                  {t('sat.road.start')}<ArrowForwardIcon size={20} />
                </button>
              )}
            </div>
          )}
          {step.from === 0 && <p className="st-road__done"><TickIcon size={18} />{t('sat.road.diagDone')}</p>}
        </article>
      )}
    </div>
  )
}
