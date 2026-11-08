import { useCallback, useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getSatErrorLog } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { plural } from '../../lib/plural.js'
import { ArrowForwardIcon, CloseIcon, HelpIcon, InfoIcon } from '../../ielts/icons.jsx'
import { HistoryIcon, OkCircleIcon } from '../icons.jsx'
import { skillName } from '../names.js'
import { parse } from '../model/plan.js'
import { fmtDate } from '../model/dates.js'
import { DIFFICULTIES } from '../practice/FilterBlocks.jsx'
import {
  EMPTY, REASON_FILTER, SOURCES, STATUSES, activeFilters, barsOf, counters, filterItems, insightTone, reasonBars, skillsIn,
} from '../errors/errorLog.js'
import { DiffChip, REASON_ICON, ReasonChip, SourceChip, StatusChip, useReasonWord } from '../errors/chips.jsx'
import { PillDate, PillSelect } from '../errors/PillFilters.jsx'
import ErrorReview from '../errors/ErrorReview.jsx'

const SECTION_SHORT = { rw: 'R&W', math: 'Math' }
const STEPS = [['wrong', CloseIcon], ['reason', HelpIcon], ['log', HistoryIcon], ['review', OkCircleIcon]]

/** «всего / разобрано / не разобрано»: в журнале — серые плитки и полоса доли, в статистике — белые на всю ширину. */
function Counters({ c, wide }) {
  const { t } = useI18n()
  return (
    <div className={`st-elcnt ${wide ? 'is-wide' : ''}`}>
      <div className="st-elcnt__tile"><b>{c.total}</b><span>{t('sat.el.cnt.total')}</span></div>
      <div className="st-elcnt__tile is-ok"><b>{c.reviewed}</b><span>{t('sat.el.cnt.reviewed')}</span></div>
      <div className="st-elcnt__tile is-open"><b>{c.open}</b><span>{t('sat.el.cnt.open')}</span></div>
      {!wide && (
        <div className="st-elcnt__bar">
          <b>{t('sat.el.reviewedPct', { p: String(c.pct) })}</b>
          <i><i style={{ width: `${c.pct}%` }} /></i>
        </div>
      )}
    </div>
  )
}

/** Строки «название — полоса — число» правой колонки статистики. */
function Bars({ title, rows, tone }) {
  return (
    <section className="st-card st-elbars">
      <h3>{title}</h3>
      {rows.map((r) => (
        <div key={r.key} className="st-elbars__row">
          <span>{r.label}</span>
          <i className={`is-${tone}`}><i style={{ width: `${r.width}%` }} /></i>
          <b>{r.n}</b>
        </div>
      ))}
    </section>
  )
}

/**
 * «Работа над ошибками» («NEW 2»: журнал 17:9002, разбор 17:9308, статистика 17:9658, пусто 17:9900). Журнал —
 * счётчики, фильтры-таблетки и таблица; клик по строке открывает разбор справа. «Статистика» отвечает на вопрос
 * «над чем работать»: выводы сервера, распределение по причинам и три разреза. Данные — журнал, который платформа
 * уже собирает (причину называет сам студент), плюс неотвеченные.
 */
export default function ErrorsTab({ onPractice, onOpenPractice, explainLang, initialSkill }) {
  const { t, lang } = useI18n()
  const token = loadToken()
  const word = useReasonWord()
  const [page, setPage] = useState(null)
  const [view, setView] = useState('journal')
  const [filters, setFilters] = useState(() => ({ ...EMPTY, skill: initialSkill || 'all' }))
  const [open, setOpen] = useState(null)

  const load = useCallback(() => {
    getSatErrorLog(token).then(setPage).catch(() => setPage({ items: [], stats: null }))
  }, [token])
  useEffect(() => load(), [load])

  const items = useMemo(() => filterItems(page?.items || [], filters), [page, filters])
  const cnt = useMemo(() => counters(page?.items || []), [page])
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const day = (iso) => fmtDate(loc, parse(String(iso).slice(0, 10)), { day: 'numeric', month: 'short' })
  const set = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }))

  if (!page) return <p className="st-muted">{t('sat.study.loading')}</p>
  const empty = !page.items.length
  const head = (
    <div className="st-el__head">
      <div>
        <h1>{t('sat.el.title')}</h1>
        <p className="st-muted">{t(empty ? 'sat.el.sub.empty' : view === 'stats' ? 'sat.el.sub.stats' : 'sat.el.sub.journal')}</p>
      </div>
      {!empty && (
        <div className="ih-seg" role="tablist">
          {['journal', 'stats'].map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? 'is-on' : ''} onClick={() => setView(v)}>{t(`sat.el.view.${v}`)}</button>
          ))}
        </div>
      )}
    </div>
  )

  if (empty) {
    // новому студенту — не пустая страница, а путь, которым сюда попадают ошибки, и выход в практику
    return (
      <div className="st-el">
        {head}
        <section className="st-card st-elempty">
          <span className="st-elempty__icon"><HistoryIcon size={36} /></span>
          <h2>{t('sat.el.emptyTitle')}</h2>
          <p>{t('sat.el.emptyText')}</p>
          <ol className="st-elempty__steps">
            {STEPS.map(([k, Icon]) => <li key={k}><span><Icon size={18} /></span>{t(`sat.el.step.${k}`)}</li>)}
          </ol>
          {onOpenPractice && <button type="button" className="ih-cta st-elempty__cta" onClick={onOpenPractice}>{t('sat.el.toPractice')}<ArrowForwardIcon size={18} /></button>}
        </section>
      </div>
    )
  }

  const s = page.stats
  const opt = (value, label) => ({ value, label })

  return (
    <div className="st-el">
      {head}
      {view === 'journal' ? (
        <>
          <p className="st-elbanner"><InfoIcon size={18} /><span>{t('sat.el.banner')}</span></p>
          <Counters c={cnt} />
          <div className="st-el__filters">
            <PillSelect label={t('sat.prac.section')} value={filters.section} onChange={set('section')}
              options={[opt('all', t('sat.el.f.allSections')), opt('rw', 'R&W'), opt('math', 'Math')]} />
            <PillSelect label={t('sat.el.f.skill')} value={filters.skill} onChange={set('skill')}
              options={[opt('all', t('sat.el.f.allSkills')), ...skillsIn(page.items).map((id) => opt(id, skillName(id, lang)))]} />
            <PillSelect multi label={t('sat.filters.difficulty')} value={filters.difficulty} onChange={set('difficulty')}
              options={DIFFICULTIES.map(([d, label]) => opt(d, label))} />
            <PillSelect label={t('sat.el.f.reason')} value={filters.reason} onChange={set('reason')}
              options={[opt('all', t('sat.el.f.allReasons')), ...REASON_FILTER.map((r) => opt(r, r === 'unanswered' ? t('sat.el.kind.unanswered') : t(`sat.el.reason.${r}`)))]} />
            <PillSelect label={t('sat.el.f.source')} value={filters.source} onChange={set('source')}
              options={[opt('all', t('sat.el.f.allSources')), ...SOURCES.map((x) => opt(x, t(`sat.el.source.${x}`)))]} />
            <PillSelect label={t('sat.el.f.status')} value={filters.status} onChange={set('status')}
              options={STATUSES.map((x) => opt(x, t(`sat.el.status.${x}`)))} />
            <PillDate label={t('sat.el.f.date')} from={filters.from} to={filters.to} fromLabel={t('sat.el.f.from')} toLabel={t('sat.el.f.to')}
              format={day} onChange={(r) => setFilters((f) => ({ ...f, ...r }))} />
            {activeFilters(filters) > 0 && <button type="button" className="st-link" onClick={() => setFilters(EMPTY)}>{t('sat.filters.resetShort')}</button>}
          </div>
          <div className="st-card st-el__list">
            <table className="st-el__table">
              <thead>
                <tr>
                  <th>{t('sat.el.col.question')}</th><th>{t('sat.el.col.skill')}</th><th>{t('sat.filters.difficulty')}</th>
                  <th>{t('sat.el.f.reason')}</th><th>{t('sat.el.f.source')}</th><th>{t('sat.el.f.date')}</th><th>{t('sat.el.f.status')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} tabIndex={0} className={open?.id === i.id ? 'is-open' : ''} onClick={() => setOpen(i)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen(i))}>
                    <td className="st-el__q"><span>{i.preview || i.questionId}</span></td>
                    <td>{SECTION_SHORT[i.section] || i.section} · {skillName(i.skillId, lang)}</td>
                    <td><DiffChip d={i.difficulty} /></td>
                    <td><ReasonChip item={i} /></td>
                    <td><SourceChip source={i.source} /></td>
                    <td className="st-muted">{day(i.createdAt)}</td>
                    <td><StatusChip reviewed={i.reviewed} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!items.length && <p className="st-muted st-el__none">{t('sat.el.noMatch')}</p>}
          </div>
        </>
      ) : (
        <>
          {s?.insights?.length > 0 && (
            <section className="st-elwork">
              <h3>{t('sat.el.work')}</h3>
              {s.insights.map((x) => {
                const tone = insightTone(x.key)
                const Icon = REASON_ICON[tone]
                return (
                  <p key={x.key} className="st-elwork__row">
                    <span className={`st-elicon is-${tone}`}><Icon size={18} /></span>
                    {t(`sat.el.insight.${x.key}`, { skill: x.skillId ? skillName(x.skillId, lang) : '' })}
                  </p>
                )
              })}
            </section>
          )}
          <Counters c={cnt} wide />
          {s && (
            <div className="st-elstats">
              <section className="st-card st-elreasons">
                <h2>{t('sat.el.byReason')}</h2>
                <p className="st-muted">{t('sat.el.byReasonSub')}</p>
                {(() => {
                  const { rows, none } = reasonBars(s.byReason, s.total)
                  return (
                    <>
                      {rows.map((r) => {
                        const Icon = REASON_ICON[r.reason]
                        return (
                          <div key={r.reason} className="st-elreasons__row">
                            <span className={`st-elicon is-${r.reason}`}><Icon size={18} /></span>
                            <b>{word(r.reason)}</b>
                            <i className={`is-${r.reason}`}><i style={{ width: `${r.width}%` }} /></i>
                            <strong>{r.n}</strong>
                            <small>{r.pct}%</small>
                          </div>
                        )
                      })}
                      {none > 0 && <p className="st-muted st-elreasons__note">{plural(t, lang, 'sat.el.noneNote', none)}</p>}
                      {s.unanswered > 0 && <p className="st-muted st-elreasons__note">{plural(t, lang, 'sat.el.unansweredNote', s.unanswered)}</p>}
                    </>
                  )
                })()}
              </section>
              <div className="st-elstats__side">
                <Bars title={t('sat.el.bySection')} tone="violet"
                  rows={barsOf(['rw', 'math'].filter((k) => s.bySection?.[k]).map((k) => [k, s.bySection[k]])).map((r) => ({ ...r, label: r.key === 'math' ? 'Math' : 'Reading and Writing' }))} />
                <Bars title={t('sat.el.topSkills')} tone="orange"
                  rows={barsOf((s.topSkills || []).slice(0, 5).map((e) => [e.skillId, e.n])).map((r) => ({ ...r, label: skillName(r.key, lang) }))} />
                <Bars title={t('sat.el.byDiff')} tone="grey"
                  rows={barsOf(DIFFICULTIES.filter(([d]) => s.byDifficulty?.[d]).map(([d]) => [d, s.byDifficulty[d]])).map((r) => ({ ...r, label: Object.fromEntries(DIFFICULTIES)[r.key] }))} />
              </div>
            </div>
          )}
        </>
      )}

      {open && (
        <ErrorReview item={open} explainLang={explainLang} onChanged={load} onPractice={onPractice} onClose={() => setOpen(null)} />
      )}
    </div>
  )
}
