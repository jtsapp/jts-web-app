import { useCallback, useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getSatErrorLog } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import EmptyState from '../../ielts/ui/EmptyState.jsx'
import { FlagIcon } from '../../ielts/icons.jsx'
import { SatModal } from '../question/ToolDialogs.jsx'
import { domainName, skillName } from '../names.js'
import { DIFFICULTIES, toggleIn } from '../practice/FilterBlocks.jsx'
import { EMPTY, KINDS, REASONS, SOURCES, STATUSES, filterItems, reasonOf, reasonShares, skillsIn } from '../errors/errorLog.js'
import ErrorReview from '../errors/ErrorReview.jsx'

const DIFF_LABEL = Object.fromEntries(DIFFICULTIES)

/**
 * «Работа над ошибками» (ТЗ SAT 21.10, задача 9; вкладка «Ошибки» вернулась в меню). Три блока: выводы и статистика —
 * текстом над цифрами, список со всеми фильтрами, разбор вопроса по клику. Данные — журнал, который платформа уже
 * собирает (причину называет сам студент), плюс неотвеченные. Вёрстка — до макета.
 */
export default function ErrorsTab({ onPractice, explainLang, initialSkill }) {
  const { t, lang } = useI18n()
  const token = loadToken()
  const [page, setPage] = useState(null)
  const [filters, setFilters] = useState(() => ({ ...EMPTY, skill: initialSkill || 'all' }))
  const [open, setOpen] = useState(null)

  const load = useCallback(() => {
    getSatErrorLog(token).then(setPage).catch(() => setPage({ items: [], stats: null }))
  }, [token])
  useEffect(() => load(), [load])

  const items = useMemo(() => filterItems(page?.items || [], filters), [page, filters])
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }))

  if (!page) return <p className="st-muted">{t('sat.study.loading')}</p>
  if (!page.items.length) {
    // новому студенту — не пустая страница, а объяснение, откуда тут возьмутся записи
    return <EmptyState icon={<FlagIcon size={28} />} title={t('sat.el.emptyTitle')} text={t('sat.el.emptyText')} />
  }
  const s = page.stats

  return (
    <div className="st-el">
      {s && (
        <section className="st-card st-el__stats">
          {s.insights.length > 0 && (
            <ul className="st-el__insights">
              {s.insights.map((x) => (
                <li key={x.key}>{t(`sat.el.insight.${x.key}`, { skill: x.skillId ? skillName(x.skillId, lang) : '' })}</li>
              ))}
            </ul>
          )}
          <p><b>{t('sat.el.total', { n: String(s.total), r: String(s.reviewed) })}</b>{s.unanswered > 0 && <> · {t('sat.el.unansweredN', { n: String(s.unanswered) })}</>}</p>
          <div className="st-el__cols">
            <div>
              <h3>{t('sat.el.byReason')}</h3>
              {reasonShares(s.byReason).map((r) => (
                <div key={r.reason} className="st-el__bar"><span>{t(`sat.el.reason.${r.reason}`)}</span><i style={{ width: `${r.pct}%` }} /><b>{r.n}</b></div>
              ))}
            </div>
            <div>
              <h3>{t('sat.el.topSkills')}</h3>
              <ol>{s.topSkills.map((e) => <li key={e.skillId}>{skillName(e.skillId, lang)} · {e.n}</li>)}</ol>
              <h3>{t('sat.el.bySection')}</h3>
              <p>{Object.entries(s.bySection).map(([k, n]) => `${k === 'math' ? 'Math' : 'R&W'}: ${n}`).join(' · ')}</p>
              <h3>{t('sat.filters.difficulty')}</h3>
              <p>{Object.entries(s.byDifficulty).map(([k, n]) => `${DIFF_LABEL[k] || k}: ${n}`).join(' · ')}</p>
            </div>
          </div>
        </section>
      )}

      <section className="st-card st-el__list">
        <div className="st-el__filters">
          <select value={filters.section} onChange={set('section')} aria-label={t('sat.prac.section')}>
            <option value="all">{t('sat.el.f.allSections')}</option><option value="rw">R&W</option><option value="math">Math</option>
          </select>
          <select value={filters.skill} onChange={set('skill')} aria-label={t('sat.el.f.skill')}>
            <option value="all">{t('sat.el.f.allSkills')}</option>
            {skillsIn(page.items).map((id) => <option key={id} value={id}>{skillName(id, lang)}</option>)}
          </select>
          <select value={filters.reason} onChange={set('reason')} aria-label={t('sat.el.f.reason')}>
            <option value="all">{t('sat.el.f.allReasons')}</option>
            {REASONS.map((r) => <option key={r} value={r}>{t(`sat.el.reason.${r}`)}</option>)}
          </select>
          <select value={filters.source} onChange={set('source')} aria-label={t('sat.el.f.source')}>
            <option value="all">{t('sat.el.f.allSources')}</option>
            {SOURCES.map((x) => <option key={x} value={x}>{t(`sat.el.source.${x}`)}</option>)}
          </select>
          <select value={filters.status} onChange={set('status')} aria-label={t('sat.el.f.status')}>
            {STATUSES.map((x) => <option key={x} value={x}>{t(`sat.el.status.${x}`)}</option>)}
          </select>
          <select value={filters.kind} onChange={set('kind')} aria-label={t('sat.el.f.kind')}>
            {KINDS.map((x) => <option key={x} value={x}>{t(`sat.el.kind.${x}`)}</option>)}
          </select>
          <span className="st-el__diff">
            {DIFFICULTIES.map(([d, label]) => (
              <button key={d} type="button" aria-pressed={filters.difficulty.includes(d)} className={filters.difficulty.includes(d) ? 'is-on' : ''}
                onClick={() => setFilters((f) => ({ ...f, difficulty: toggleIn(f.difficulty, d) }))}>{label}</button>
            ))}
          </span>
          <input type="date" value={filters.from} onChange={set('from')} aria-label={t('sat.el.f.from')} />
          <input type="date" value={filters.to} onChange={set('to')} aria-label={t('sat.el.f.to')} />
          <button type="button" className="st-link" onClick={() => setFilters(EMPTY)}>{t('sat.filters.reset')}</button>
        </div>
        <p className="st-muted">{t('sat.filters.count', { n: String(items.length) })}</p>
        <table className="st-el__table">
          <tbody>
            {items.map((i) => (
              <tr key={i.id} onClick={() => setOpen(i.id)} className={i.reviewed ? 'is-reviewed' : ''}>
                <td className="st-el__q">{i.preview || i.questionId}</td>
                <td>{i.section === 'math' ? 'Math' : 'R&W'} · {skillName(i.skillId, lang)}<br /><small className="st-muted">{i.domain ? domainName(i.domain, lang) : ''}</small></td>
                <td>{DIFF_LABEL[i.difficulty] || '—'}</td>
                <td>{i.kind === 'unanswered' ? t('sat.el.kind.unanswered') : t(`sat.el.reason.${reasonOf(i)}`)}</td>
                <td>{t(`sat.el.source.${i.source}`)}</td>
                <td>{String(i.createdAt).slice(0, 10)}</td>
                <td>{i.reviewed ? t('sat.el.status.reviewed') : t('sat.el.status.open')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {open && (
        <SatModal wide title={t('sat.el.reviewTitle')} onClose={() => setOpen(null)}>
          <ErrorReview id={open} explainLang={explainLang} onChanged={load} onPractice={onPractice} />
        </SatModal>
      )}
    </div>
  )
}
