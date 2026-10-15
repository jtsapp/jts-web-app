import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getSatCourse } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { CheckCircleIcon, ChevronRightIcon, FlagIcon } from '../../ielts/icons.jsx'
import { ExpandLessIcon, PlayCircleIcon } from '../icons.jsx'
import { monthDone, roadStops, sectionOf, states } from '../model/course.js'
import { readUnits } from '../course/reading.js'
import { pick } from '../model/profile.js'

/**
 * Дорога курса под картой роудмапа (B8, прототип roadmap.js после 7934498a / e48a2be9 / d55de44c / 7e01922d):
 * диагностика (Bluebook Practice Test 6) → месяц → контрольная точка → … Месяц сворачивается стрелкой и перечисляет
 * свои темы, каждая строка открывает юнит. Недельного списка нет, кнопок «Материалы» и «Пробники» на контрольных
 * точках нет — у каждой только номер теста Bluebook. Открыт месяц, где ученик сейчас.
 */
export default function CourseRoad({ onUnit }) {
  const { t, lang } = useI18n()
  const [progress, setProgress] = useState(null)
  const [read] = useState(() => readUnits())
  const stops = useMemo(() => roadStops(), [])
  useEffect(() => {
    let alive = true
    getSatCourse(loadToken())
      .then((r) => alive && setProgress(r?.units || {}))
      .catch(() => alive && setProgress({}))
    return () => {
      alive = false
    }
  }, [])
  const st = useMemo(() => states(progress || {}, read), [progress, read])
  const currentMonth = stops.find((s) => s.kind === 'month' && s.lessons.some((l) => st[l.code] === 'current'))?.id
  const [open, setOpen] = useState(() => new Set())
  // месяц, где ученик сейчас, открыт с первого показа; дальше решает стрелка
  useEffect(() => {
    if (currentMonth) setOpen((o) => (o.size ? o : new Set([currentMonth])))
  }, [currentMonth])
  const toggle = (id) => setOpen((o) => {
    const n = new Set(o)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  })

  return (
    <section className="st-card st-croad" aria-labelledby="st-croad-title">
      <h2 id="st-croad-title">{t('sat.croad.title')}</h2>
      <ol className="st-croad__list">
        {stops.map((s) => {
          if (s.kind !== 'month') {
            return (
              <li key={s.id} className={`st-croad__stop is-${s.kind}`}>
                <span className="st-croad__pin"><FlagIcon size={16} /></span>
                <div>
                  <span className="st-head__eyebrow">{t(`sat.croad.${s.kind}`)}{s.bluebook ? ` · Bluebook ${s.bluebook}` : ''}</span>
                  <b>{pick(s.test.name, lang)}</b>
                  {s.test.note && <p className="st-muted">{pick(s.test.note, lang)}</p>}
                </div>
              </li>
            )
          }
          const isOpen = open.has(s.id)
          const done = monthDone(s, st)
          return (
            <li key={s.id} className={`st-croad__stop is-month ${isOpen ? 'is-open' : ''} ${s.id === currentMonth ? 'is-here' : ''}`}>
              <span className="st-croad__pin">{stops.filter((x) => x.kind === 'month').indexOf(s) + 1}</span>
              <div className="st-croad__month">
                <button type="button" className="st-croad__fold" aria-expanded={isOpen} aria-controls={`st-croad-${s.id}`} onClick={() => toggle(s.id)}>
                  <span>
                    <b>{pick(s.phase.name, lang)}</b>
                    <small className="st-muted">{t('sat.mat.weeks', { w: s.phase.weeks })} · {t('sat.croad.done', { d: String(done), n: String(s.lessons.length) })}</small>
                  </span>
                  <span className="st-spacer" />
                  <span className="st-croad__arrow" aria-hidden="true"><ExpandLessIcon size={20} /></span>
                </button>
                {isOpen && (
                  <ul id={`st-croad-${s.id}`} className="st-croad__topics">
                    {s.lessons.map((l) => (
                      <li key={l.code}>
                        <button type="button" className={`st-croad__topic is-${st[l.code] || 'ahead'}`} onClick={() => onUnit(l.code)}>
                          <span className="st-croad__state" aria-hidden="true">
                            {st[l.code] === 'done' ? <CheckCircleIcon size={18} /> : st[l.code] === 'current' ? <PlayCircleIcon size={18} /> : null}
                          </span>
                          <span className={`st-mat__code is-${sectionOf(l)}`}>{l.code}</span>
                          <span className="st-croad__name">{pick(l.t, lang)}</span>
                          <ChevronRightIcon size={18} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
