import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { ArrowForwardIcon, ChevronLeftIcon } from '../../ielts/icons.jsx'
import { PlusIcon, TickIcon } from '../icons.jsx'
import { MINUTES, addDays, monday, parse, summarize } from '../model/plan.js'
import { fmtDate } from '../model/dates.js'

const LANGS = [
  ['ru', 'Русский'],
  ['kk', 'Қазақша'],
  ['en', 'English'],
]
const LEVELS = ['light', 'standard', 'intensive']

/**
 * «Когда вы реально можете заниматься?» (Figma SAT 10): дни, минуты на занятие, язык разборов — и итог справа, который
 * считается тут же теми же правилами, что план на сервере (summarize). Интенсивность не спрашивают — она выводится.
 * Подсказку макета «В день живого урока с преподавателем план сам станет легче» не рисуем: живых уроков SAT в
 * платформе пока нет, и обещать облегчённый план нечестно (у IELTS это тоже в списке несделанного).
 */
export default function StudyTime({ initial, examDate, rebuilding, busy, error, onBack, onBuild }) {
  const { t, lang } = useI18n()
  const [days, setDays] = useState(initial?.days?.length ? initial.days : [1, 3, 5, 6])
  const [minutes, setMinutes] = useState(initial?.minutes || 60)
  const [explain, setExplain] = useState(initial?.lang || lang || 'ru')
  const [warn, setWarn] = useState(null)
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const today = useMemo(() => new Date(), [])
  const sum = summarize(today, examDate, [...days].sort(), minutes)

  // имена дней — от календаря, а не таблицей на трёх языках (как dayLabel прототипа)
  const dayNames = useMemo(() => {
    const m = monday(parse('2026-09-28'))
    return Array.from({ length: 7 }, (_, i) => {
      const s = new Intl.DateTimeFormat(loc, { weekday: 'short' }).format(addDays(m, i)).replace('.', '')
      return s.charAt(0).toUpperCase() + s.slice(1, 2)
    })
  }, [loc])

  const toggle = (d) => {
    setWarn(null)
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))
  }
  const build = () => {
    if (!days.length) return setWarn(t('sat.time.pickDay'))
    onBuild({ days: [...days].sort(), minutes, lang: explain })
  }
  const examShort = examDate
    ? fmtDate(loc, new Date(`${examDate}T00:00:00Z`), { day: 'numeric', month: 'short', timeZone: 'UTC' })
    : '—'

  return (
    <main className="st-time">
      <h1>{t('sat.time.title')}</h1>
      <p className="st-time__lead">{t('sat.time.lead')}</p>
      <div className="st-time__grid">
        <div className="st-time__form">
          <section className="st-card">
            <h2>{t('sat.time.days')}</h2>
            <p className="st-muted">{t('sat.time.daysSub')}</p>
            <div className="st-time__days" role="group" aria-label={t('sat.time.days')}>
              {dayNames.map((name, i) => {
                const d = i + 1
                const on = days.includes(d)
                return (
                  <button key={d} type="button" className={`st-time__day ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => toggle(d)}>
                    <b>{name}</b>
                    {on ? <TickIcon size={16} /> : <PlusIcon size={16} />}
                  </button>
                )
              })}
            </div>
          </section>
          <section className="st-card">
            <h2>{t('sat.time.minutes')}</h2>
            <div className="st-time__mins" role="radiogroup" aria-label={t('sat.time.minutes')}>
              {MINUTES.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={minutes === m} className={`st-time__min ${minutes === m ? 'is-on' : ''}`} onClick={() => setMinutes(m)}>
                  {t('sat.time.min', { n: String(m) })}
                </button>
              ))}
            </div>
          </section>
          <section className="st-card">
            <h2>{t('sat.time.lang')}</h2>
            <p className="st-muted">{t('sat.time.langSub')}</p>
            <div className="ih-seg st-time__langs" role="radiogroup" aria-label={t('sat.time.lang')}>
              {LANGS.map(([k, label]) => (
                <button key={k} type="button" role="radio" aria-checked={explain === k} className={explain === k ? 'is-on' : ''} onClick={() => setExplain(k)}>
                  {label}
                </button>
              ))}
            </div>
          </section>
        </div>
        <aside className="st-time__sum" aria-live="polite">
          <span className="st-time__eyebrow">{t('sat.time.total')}</span>
          <h2>{t(`sat.time.level.${sum.intensity}`)}</h2>
          <p>{t('sat.time.formula', { d: plural(t, lang, 'sat.time.sessions', days.length), m: String(minutes), w: String(sum.weekly) })}</p>
          <div className="st-time__tiles">
            <span><b>{sum.weeks}</b>{plural(t, lang, 'sat.time.weeksWord', sum.weeks).replace(/^\d+\s*/, '')}</span>
            <span><b>{sum.lessons}</b>{plural(t, lang, 'sat.time.lessonsWord', sum.lessons).replace(/^\d+\s*/, '')}</span>
            <span><b>{examShort}</b>{examDate ? t('sat.time.exam') : t('sat.time.noDate')}</span>
          </div>
          <span className="st-time__scalelabel">{t('sat.time.scale')}</span>
          <div className="st-time__scale">
            {LEVELS.map((l) => (
              <span key={l} className={l === sum.intensity ? 'is-on' : ''}><i />{t(`sat.time.short.${l}`)}</span>
            ))}
          </div>
          {!examDate && <p className="st-time__prov">{t('sat.time.provisional')}</p>}
        </aside>
      </div>
      {(warn || error) && <p className="st-error" role="alert">{warn || error}</p>}
      <div className="st-time__foot">
        <button type="button" className="ih-btn ih-btn--outline st-time__back" onClick={onBack}><ChevronLeftIcon size={18} />{t('sat.ob.back')}</button>
        <span className="st-spacer" />
        <button type="button" className="ih-cta" disabled={busy} onClick={build}>
          {t(rebuilding ? 'sat.plan.rebuild' : 'sat.time.build')}<ArrowForwardIcon size={20} />
        </button>
      </div>
    </main>
  )
}
