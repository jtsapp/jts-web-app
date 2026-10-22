import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { ArrowForwardIcon, ChevronLeftIcon, ChevronRightIcon } from '../../ielts/icons.jsx'
import { NotesIcon, TargetIcon, TickIcon, TrophyIcon } from '../icons.jsx'
import { parse } from '../model/plan.js'
import { ROAD, nodeAt, phaseLessons, roadPoint } from '../model/roadmap.js'
import { fmtDate } from '../model/dates.js'
import BluebookPanel from './BluebookPanel.jsx'
import SelfPrepPanel from './SelfPrepPanel.jsx'

/**
 * Роудмап SAT (Figma 12, фазы — ТЗ 21.10.2026): фазы от диагностики до дня экзамена дорогой-змейкой, под ней — карточка
 * выбранной фазы. Фазы приходят с сервера (/mobile/sat/roadmap) — тот же источник, что у «Сегодня» и счётчиков; фаз
 * от 4 до 8 (пакеты, дата экзамена), поэтому узлы раскладываются по длине дороги, а не по таблице координат.
 * Карточка теста — форма баллов Bluebook и сравнение; фазы 7 — список дел; фазы с занятиями — пройдено по отметкам.
 */
export default function RoadmapView({ data, bluebook, schedule, onStartLesson, onReload, selfPrepActions }) {
  const { t, lang } = useI18n()
  const r = data?.roadmap
  const phases = (r?.phases || []).filter((p) => p.kind !== 'exam')
  const [open, setOpen] = useState(r?.active)
  useEffect(() => setOpen(r?.active), [r?.active])
  if (!r) return null

  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const fmt = (d, o) => fmtDate(loc, d, o)
  const count = phases.length + 1 // + трофей дня экзамена
  const at = phases.map((_, i) => roadPoint(nodeAt(i, count)))
  const trophy = roadPoint(nodeAt(count - 1, count))
  const curIdx = Math.max(0, phases.findIndex((p) => p.n === r.active))
  const idx = Math.max(0, phases.findIndex((p) => p.n === open))
  const step = phases[idx]
  const lessons = step ? phaseLessons(step, schedule) : null
  const next = (schedule?.lessons || []).find((l) => l.next)
  const nextInStep = next && step?.lessonFrom != null && next.number >= step.lessonFrom && next.number <= step.lessonTo ? next : null

  const when = (p) => {
    if (p.n === 1) return t('sat.road.beforeLesson1')
    if (p.weekFrom == null) return t('sat.road.afterWeek', { n: String(p.n === 3 ? 4 : 8) })
    return p.weekFrom === p.weekTo ? t('sat.road.week', { n: String(p.weekFrom) }) : t('sat.road.weeks', { a: String(p.weekFrom), b: String(p.weekTo) })
  }
  const stepNo = (p) => r.phases.filter((x) => x.counted && x.n <= p.n).length

  return (
    <div className="st-road">
      {!data.inGroup && <p className="st-plan__note">{t('sat.road.noGroup')}</p>}
      <div className="st-road__map">
        <div className="st-road__nav">
          <button type="button" className="ih-round st-road__arrow" disabled={idx <= 0} aria-label={t('sat.road.prev')} onClick={() => setOpen(phases[idx - 1].n)}>
            <ChevronLeftIcon size={18} />
          </button>
          <span>{step?.counted ? t('sat.road.phaseOf', { n: String(stepNo(step)), total: String(r.countedTotal) }) : t(`sat.phase.${step?.key}`)}</span>
          <button type="button" className="ih-round st-road__arrow" disabled={idx >= phases.length - 1} aria-label={t('sat.road.next')} onClick={() => setOpen(phases[idx + 1].n)}>
            <ChevronRightIcon size={18} />
          </button>
        </div>
        <svg className="st-road__svg" viewBox="0 0 1088 380" role="img" aria-label={t('sat.road.label2')}>
          <path d={ROAD} className="st-road__track" fill="none" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" />
          {curIdx > 0 && <path d={ROAD} className="st-road__passed" fill="none" strokeWidth="46" strokeDasharray={`${nodeAt(curIdx, count)} 9999`} />}
          <path d={ROAD} className="st-road__dash" fill="none" strokeWidth="3" strokeDasharray="10 12" />
          {phases.map((p, i) => {
            const n = at[i]
            const done = p.status === 'done'
            const here = p.n === r.active
            const warn = p.status === 'incomplete'
            return (
              <g key={p.n} className={`st-road__node ${open === p.n ? 'is-open' : ''}`} onClick={() => setOpen(p.n)} role="button" tabIndex={0}
                aria-label={t(`sat.phase.${p.key}`)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen(p.n)}>
                <circle cx={n.x} cy={n.y} r={here ? 26 : 21} className={warn ? 'is-warn' : done ? 'is-done' : here ? 'is-here' : 'is-next'} />
                {done ? (
                  <path d={`M${n.x - 8} ${n.y} l5 5 l10 -11`} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <text x={n.x} y={n.y + (here ? 8 : 6)} textAnchor="middle" className={here ? 'st-road__num is-here' : 'st-road__num'}>{warn ? '!' : p.n}</text>
                )}
              </g>
            )
          })}
          <circle cx={trophy.x} cy={trophy.y} r="23" fill="#f5a524" />
          <g transform={`translate(${trophy.x - 11} ${trophy.y - 11}) scale(0.92)`} fill="#fff">
            <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
          </g>
        </svg>
        {at[curIdx] && r.active !== 8 && (
          <span className="st-road__here" style={{ left: `${(at[curIdx].x / 1088) * 100}%`, top: `${((at[curIdx].y + 52) / 380) * 100}%` }}>
            <TargetIcon size={14} />{t('sat.road.here', { phase: t(`sat.phase.${phases[curIdx].key}`) })}
          </span>
        )}
        <span className="st-road__exam" style={{ left: `${(trophy.x / 1088) * 100}%`, top: `${((trophy.y + 36) / 380) * 100}%` }}>
          <span className="st-road__examicon"><TrophyIcon size={16} /></span>
          <span><b>{t('sat.road.examDay')}</b><small>{data.examDate ? fmt(parse(data.examDate), { day: 'numeric', month: 'long' }) : t('sat.dateUndecided')}</small></span>
        </span>
      </div>

      {step && (
        <article key={open} className="st-card st-road__card ih-enter">
          <div className="st-road__cardhead">
            <div>
              <span className="st-road__eyebrow">{step.counted ? t('sat.road.phaseOf', { n: String(stepNo(step)), total: String(r.countedTotal) }) : ''}</span>
              <h2>{t(`sat.phase.${step.key}`)}</h2>
            </div>
            <span className="st-spacer" />
            <span className="st-road__chip">{when(step)}</span>
            {step.start && step.n !== 1 && (
              <span className="st-road__chip">
                {fmt(parse(step.start), { day: 'numeric', month: 'short' })}
                {step.end && step.end !== step.start && <> → {fmt(parse(step.end), { day: 'numeric', month: 'short' })}</>}
              </span>
            )}
            {step.status === 'incomplete' && <span className="st-road__chip is-warn">{t('sat.road.incomplete')}</span>}
          </div>
          <p className="st-road__lead">{t(`sat.phaseText.${step.key}.lead`)}</p>
          <div className="st-road__boxes">
            <div>
              <b><NotesIcon size={18} />{t('sat.road.doing')}</b>
              <p>{t(`sat.phaseText.${step.key}.do`)}</p>
            </div>
            <div>
              <b><TargetIcon size={18} />{t('sat.road.end')}</b>
              <p>{t(`sat.phaseText.${step.key}.end`)}</p>
            </div>
          </div>
          {lessons && (
            <div className="st-road__progress">
              <div>
                <b>{t('sat.road.lessonsDone', { d: String(lessons.done), n: String(lessons.total) })}</b>
                <span className="st-rep__bar"><i style={{ width: `${lessons.total ? Math.max(3, (lessons.done * 100) / lessons.total) : 0}%` }} /></span>
              </div>
              {nextInStep && onStartLesson && (
                <button type="button" className="ih-cta st-road__start" onClick={() => onStartLesson(nextInStep)}>
                  {t('sat.road.practice')}<ArrowForwardIcon size={20} />
                </button>
              )}
            </div>
          )}
          {step.n === 1 && step.status === 'done' && <p className="st-road__done"><TickIcon size={18} />{t('sat.road.diagDone')}</p>}
          {step.bluebookTest && bluebook && (
            <BluebookPanel test={step.bluebookTest} tests={bluebook.tests} snapshots={bluebook.snapshots}
              currentDomains={bluebook.currentDomains} currentFocus={bluebook.currentFocus} onSaved={onReload} />
          )}
          {step.kind === 'self' && <SelfPrepPanel prep={data.selfPrep} {...(selfPrepActions || {})} />}
        </article>
      )}
    </div>
  )
}
