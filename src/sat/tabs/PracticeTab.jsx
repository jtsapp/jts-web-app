import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getSatErrors, getSatPracticePool, getSatProgress, getSatTaxonomy } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { plural } from '../../lib/plural.js'
import { ArrowForwardIcon, ExpandMoreIcon, ScheduleIcon } from '../../ielts/icons.jsx'
import { BulbIcon, InsightsIcon, StopwatchIcon, TargetIcon, TickIcon } from '../icons.jsx'
import { domainName, skillName } from '../names.js'

const MODES = [
  { key: 'module', Icon: StopwatchIcon },
  { key: 'skills', Icon: TargetIcon },
  { key: 'weak', Icon: InsightsIcon },
  { key: 'custom', Icon: TickIcon },
]
const COUNTS = [5, 10, 20]
const PACE = { rw: 71, math: 95 }

/**
 * Практика (Figma SAT 15): рекомендация «Слабые», секция, режим (модуль · по навыкам · слабые · свой набор), дерево
 * навыков с mastery и числом вопросов в банке, справа — сводка сессии, количество, фильтры и честное «N вопросов
 * подходят» с сервера. Всё в учебном режиме: подсказки и разборы доступны. Фильтр «Отмеченные» из макета не
 * сделан: отметки «Отметить» живут в черновике на устройстве, сервер о них не знает.
 */
export default function PracticeTab({ onStart }) {
  const { t, lang } = useI18n()
  const token = loadToken()
  const [section, setSection] = useState('rw')
  const [mode, setMode] = useState('skills')
  const [picked, setPicked] = useState([])
  const [open, setOpen] = useState({})
  const [count, setCount] = useState(10)
  const [filters, setFilters] = useState({ difficulty: [], status: [], original: false })
  const [tax, setTax] = useState(null)
  const [progress, setProgress] = useState(null)
  const [queue, setQueue] = useState({})
  const [pool, setPool] = useState(null)
  const [weak, setWeak] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getSatTaxonomy(token).then(setTax).catch(() => setTax({ domains: [], skills: [] }))
    getSatProgress(token).then(setProgress).catch(() => setProgress({ skills: [] }))
    getSatErrors(token, 'all')
      .then((list) => {
        const q = {}
        for (const e of list) if (!e.resolvedAt) q[e.skillId] = (q[e.skillId] || 0) + 1
        setQueue(q)
      })
      .catch(() => {})
  }, [token])

  // рекомендация — два самых приоритетных навыка секции (тот же ранг, что строит план)
  useEffect(() => {
    getSatPracticePool(token, { mode: 'weak', section, count: 10 }).then(setWeak).catch(() => setWeak(null))
  }, [token, section])

  const body = useMemo(() => ({
    mode,
    section,
    skillIds: mode === 'skills' ? picked : undefined,
    count,
    difficulty: filters.difficulty,
    status: filters.status,
    source: filters.original ? 'original' : undefined,
  }), [mode, section, picked, count, filters])

  // «N вопросов подходят» — с сервера, с небольшой задержкой, чтобы не спрашивать на каждый клик
  useEffect(() => {
    if (mode === 'skills' && !picked.length) {
      setPool({ count: 0 })
      return undefined
    }
    const id = setTimeout(() => {
      getSatPracticePool(token, body).then(setPool).catch(() => setPool(null))
    }, 250)
    return () => clearTimeout(id)
  }, [token, body, mode, picked.length])

  const mastery = useMemo(() => Object.fromEntries((progress?.skills || []).map((s) => [s.id, s])), [progress])
  const bank = useMemo(() => Object.fromEntries((tax?.skills || []).map((s) => [s.id, s.questions])), [tax])
  const domains = (tax?.domains || []).filter((d) => d.section === section).sort((a, b) => a.order - b.order)
  const skillsOf = (d) => (tax?.skills || []).filter((s) => s.domain === d)

  const toggleSkill = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const toggleList = (key, v) => setFilters((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }))
  const take = mode === 'module' ? (section === 'math' ? 22 : 27) : count
  const matching = pool?.count ?? 0
  const minutes = Math.max(1, Math.round((Math.min(take, matching || take) * PACE[section]) / 60))

  const start = async (override) => {
    setBusy(true)
    setError(null)
    try {
      await onStart(override || body)
    } catch (e) {
      setError(e?.serverMessage || t('sat.study.netError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="st-prac">
      {weak?.skillIds?.length > 0 && (
        <div className="st-reco">
          <span className="st-reco__icon"><InsightsIcon size={24} /></span>
          <div>
            <b>{t('sat.prac.reco', { n: String(Math.min(10, weak.count)) })}</b>
            <span>{t('sat.prac.recoSub', { skills: weak.skillIds.map((s) => skillName(s, lang)).join(t('sat.month.and')) })}</span>
          </div>
          <span className="st-spacer" />
          <button type="button" className="st-reco__btn" disabled={busy || !weak.count} onClick={() => start({ mode: 'weak', section, count: 10 })}>
            {t('sat.prac.start')}<ArrowForwardIcon size={18} />
          </button>
        </div>
      )}
      <div className="st-prac__grid">
        <div className="st-prac__main">
          <div className="st-prac__bar">
            <div className="ih-seg" role="tablist">
              {['rw', 'math'].map((s) => (
                <button key={s} type="button" role="tab" aria-selected={section === s} className={section === s ? 'is-on' : ''}
                  onClick={() => { setSection(s); setPicked([]) }}>
                  {s === 'rw' ? 'Reading and Writing' : 'Math'}
                </button>
              ))}
            </div>
            <span className="st-spacer" />
            <span className="st-prac__note"><BulbIcon size={14} />{t('sat.prac.studyMode')}</span>
          </div>
          <div className="st-prac__modes" role="radiogroup" aria-label={t('sat.prac.type')}>
            {MODES.map(({ key, Icon }) => (
              <button key={key} type="button" role="radio" aria-checked={mode === key} className={`st-prac__mode ${mode === key ? 'is-on' : ''}`} onClick={() => setMode(key)}>
                <Icon size={20} />
                <b>{t(`sat.prac.mode.${key}`)}</b>
                <small>{key === 'module' ? t('sat.prac.moduleSub', { n: String(section === 'math' ? 22 : 27), m: String(section === 'math' ? 35 : 32) }) : t(`sat.prac.modeSub.${key}`)}</small>
              </button>
            ))}
          </div>
          <div className="st-card st-tree">
            <h2>{t('sat.prac.skills')}</h2>
            <p className="st-muted">{t(mode === 'skills' ? 'sat.prac.skillsSub' : 'sat.prac.skillsInfo')}</p>
            {domains.map((d) => {
              const own = skillsOf(d.id)
              const inBank = own.reduce((a, s) => a + (bank[s.id] || 0), 0)
              const chosen = own.filter((s) => picked.includes(s.id)).length
              const isOpen = !!open[d.id] || chosen > 0
              return (
                <div key={d.id} className={`st-tree__dom ${isOpen ? 'is-open' : ''}`}>
                  <button type="button" className="st-tree__head" aria-expanded={isOpen} onClick={() => setOpen((o) => ({ ...o, [d.id]: !isOpen }))}>
                    <ExpandMoreIcon size={18} />
                    <b>{domainName(d.id, lang)}</b>
                    <span className="st-spacer" />
                    {chosen > 0 && <span className="st-tree__picked">{t('sat.prac.picked', { n: String(chosen), total: String(own.length) })}</span>}
                    <span className="st-tree__bank">{t('sat.prac.inBank', { n: String(inBank) })}</span>
                  </button>
                  {isOpen && (
                    <ul>
                      {own.map((s) => {
                        const m = mastery[s.id]
                        const errs = queue[s.id] || 0
                        return (
                          <li key={s.id}>
                            <label className={!bank[s.id] ? 'is-empty' : ''}>
                              <input type="checkbox" checked={picked.includes(s.id)} disabled={mode !== 'skills' || !bank[s.id]} onChange={() => toggleSkill(s.id)} />
                              <span>{skillName(s.id, lang)}</span>
                            </label>
                            <span className="st-spacer" />
                            <small className="st-muted">
                              {!bank[s.id] ? t('sat.prac.noBank') : errs ? plural(t, lang, 'sat.prac.errsInQueue', errs) : m?.needed ? plural(t, lang, 'sat.prac.needMore', m.needed) : ''}
                            </small>
                            {m && m.status !== 'no-data' && <span className={`st-mchip is-${m.status}`}><i />{t(`sat.mastery.${m.status}`)}</span>}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <aside className="st-card st-sess">
          <h2>{t('sat.prac.yours')}</h2>
          <dl>
            <dt>{t('sat.prac.type')}</dt><dd><b>{t(`sat.prac.mode.${mode}`)}</b></dd>
            <dt>{t('sat.prac.section')}</dt><dd><span className={`st-sess__sec is-${section}`}><i />{section === 'math' ? 'Math' : 'R&W'}</span></dd>
          </dl>
          {mode === 'skills' && (
            <>
              <span className="st-sess__label">{t('sat.prac.skills')}</span>
              <div className="st-sess__chips">
                {picked.length ? picked.map((s) => <span key={s} className="st-sess__chip">{skillName(s, lang)}</span>) : <span className="st-muted">{t('sat.prac.pickHint')}</span>}
              </div>
            </>
          )}
          {mode === 'weak' && weak?.skillIds && (
            <div className="st-sess__chips">{weak.skillIds.map((s) => <span key={s} className="st-sess__chip">{skillName(s, lang)}</span>)}</div>
          )}
          {mode !== 'module' && (
            <>
              <span className="st-sess__label">{t('sat.prac.count')}</span>
              <div className="ih-seg st-sess__counts">
                {COUNTS.map((n) => <button key={n} type="button" className={count === n ? 'is-on' : ''} onClick={() => setCount(n)}>{n}</button>)}
              </div>
            </>
          )}
          <span className="st-sess__label">{t('sat.prac.filters')}</span>
          <div className="st-sess__filters">
            {[1, 2, 3].map((d) => (
              <button key={d} type="button" aria-pressed={filters.difficulty.includes(d)} className={filters.difficulty.includes(d) ? 'is-on' : ''} onClick={() => toggleList('difficulty', d)}>
                {t('sat.prac.diff', { n: String(d) })}
              </button>
            ))}
            <button type="button" aria-pressed={filters.status.includes('wrong')} className={filters.status.includes('wrong') ? 'is-on' : ''} onClick={() => toggleList('status', 'wrong')}>{t('sat.prac.wrong')}</button>
            <button type="button" aria-pressed={filters.status.includes('new')} className={filters.status.includes('new') ? 'is-on' : ''} onClick={() => toggleList('status', 'new')}>{t('sat.prac.new')}</button>
            <button type="button" aria-pressed={filters.original} className={filters.original ? 'is-on' : ''} onClick={() => setFilters((f) => ({ ...f, original: !f.original }))}>JTS Original</button>
          </div>
          {/* ни один вопрос не подходит — минут нет: «≈12 мин · 0 вопросов» противоречило само себе */}
          <p className="st-sess__fit">
            <ScheduleIcon size={18} />
            {matching ? t('sat.prac.fit', { m: String(minutes), n: plural(t, lang, 'sat.prac.qFit', matching) }) : plural(t, lang, 'sat.prac.qFit', 0)}
          </p>
          {error && <p className="st-error" role="alert">{error}</p>}
          <button type="button" className="ih-cta st-sess__start" disabled={busy || !matching} onClick={() => start()}>
            {t('sat.prac.startSession')}<ArrowForwardIcon size={20} />
          </button>
        </aside>
      </div>
    </div>
  )
}
