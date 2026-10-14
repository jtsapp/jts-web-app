import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getSatCourse } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { plural } from '../../lib/plural.js'
import { CheckCircleIcon, ChevronRightIcon, FlagIcon } from '../../ielts/icons.jsx'
import { PlayCircleIcon } from '../icons.jsx'
import { COURSE, months, sectionOf, states, testBefore, unitOf } from '../model/course.js'
import { readUnits } from '../course/reading.js'
import { pick } from '../model/profile.js'

const SECTIONS = ['all', 'rw', 'math']

/**
 * «Материалы» — курс «36 юнитов» как программа (Нет в Figma: адаптация прототипа materials.js и programme.js): три
 * месяца по 12 юнитов, официальный тест Bluebook в начале и в конце первых двух месяцев. Отвечает на «что в курсе и где
 * я в нём» — ни роудмап (форма), ни план (эта неделя) на это не отвечают. Пройденное — сданный набор юнита (сервер) или
 * дочитанный урок у юнита без набора (устройство); текущий — первый непройденный.
 */
export default function MaterialsTab({ onOpen }) {
  const { t, lang } = useI18n()
  const token = loadToken()
  const [progress, setProgress] = useState(null)
  const [section, setSection] = useState('all')
  const [read] = useState(() => readUnits())

  useEffect(() => {
    getSatCourse(token).then((r) => setProgress(r?.units || {})).catch(() => setProgress({}))
  }, [token])

  const st = useMemo(() => states(progress || {}, read), [progress, read])
  if (!progress) return null
  const done = Object.values(st).filter((s) => s === 'done').length
  const total = COURSE.lessons.length
  const pct = Math.round((done / total) * 100)
  const first = testBefore()

  return (
    <div className="st-mat">
      <section className="st-card st-mat__head">
        <span className="st-mat__eyebrow">{t('sat.mat.eyebrow')}</span>
        <h2>{t('sat.mat.title', { n: String(total), w: String(COURSE.schedule.weeks) })}</h2>
        <div className="st-mat__bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
        <p className="st-muted">
          {t('sat.mat.done', { done: String(done), total: String(total), pct: String(pct) })} ·{' '}
          {t('sat.mat.shape', { per: String(COURSE.schedule.perWeek), tests: String(COURSE.schedule.tests) })}
        </p>
      </section>

      <div className="ih-seg st-mat__seg" role="tablist" aria-label={t('sat.mat.filter')}>
        {SECTIONS.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={section === s} className={section === s ? 'is-on' : ''} onClick={() => setSection(s)}>
            {t(`sat.mat.sec.${s}`)}
          </button>
        ))}
      </div>

      {first && <OfficialTest test={first} lang={lang} t={t} />}
      {months(section).map(({ phase, lessons, test }) => (
        <section key={phase.id} className="st-card st-mat__month">
          <div className="st-mat__monthHead">
            <div>
              <h3>{pick(phase.name, lang)}</h3>
              <p className="st-muted">{pick(phase.lead, lang)}</p>
            </div>
            <span className="ih-chip ih-chip--sm"><span>{t('sat.mat.weeks', { w: phase.weeks })}</span></span>
          </div>
          <ul className="st-mat__units">
            {lessons.map((l) => {
              const s = st[l.code]
              const p = progress[l.code]
              const sec = sectionOf(l)
              const unit = unitOf(l)
              let caption
              if (l.hard) caption = t('sat.mat.hardCaption')
              else if (p?.questions) caption = `${pick(unit?.name, lang)} · ${plural(t, lang, 'sat.q', p.questions)}`
              // 24 набора юнитов загружены (SAT-SYNC-PLAN A4) — заглушку «набор готовится» больше не печатаем; пока
              // счёт не пришёл, строка — просто имя раздела
              else caption = pick(unit?.name, lang)
              return (
                <li key={l.code}>
                  <button type="button" className={`st-mat__unit is-${s}`} onClick={() => onOpen(l.code)}>
                    <span className="st-mat__state" aria-hidden="true">
                      {s === 'done' ? <CheckCircleIcon size={20} /> : s === 'current' ? <PlayCircleIcon size={20} /> : null}
                    </span>
                    <span className={`st-mat__code is-${sec}`}>{l.code}</span>
                    <span className="st-mat__text">
                      <b>{pick(l.t, lang)}</b>
                      <small>{caption}</small>
                    </span>
                    {s === 'current' && <span className="st-mat__now">{t('sat.mat.now')}</span>}
                    {p?.answered > 0 && !p?.finished && <span className="st-mat__rec">{p.answered} / {p.questions}</span>}
                    <ChevronRightIcon size={18} />
                  </button>
                </li>
              )
            })}
          </ul>
          {test && <OfficialTest test={test} lang={lang} t={t} inside />}
        </section>
      ))}
      <p className="st-muted st-mat__hint">{t('sat.mat.hint')}</p>
    </div>
  )
}

/** Официальный тест Bluebook: проходится в самом Bluebook — у нас только напоминание, где он стоит в курсе. */
function OfficialTest({ test, lang, t, inside }) {
  return (
    <div className={`st-mat__test ${inside ? 'is-inside' : ''}`}>
      <span className="st-mat__testIcon"><FlagIcon size={18} /></span>
      <div>
        <b>{pick(test.name, lang)}</b>
        <small>{pick(test.note, lang)}</small>
      </div>
      <span className="ih-chip ih-chip--sm"><span>{t('sat.mat.inBluebook')}</span></span>
    </div>
  )
}
