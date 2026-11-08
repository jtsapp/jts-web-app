import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getSatBank, getSatErrors, getSatPracticePool, getSatProgress, getSatTaxonomy } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { plural } from '../../lib/plural.js'
import { ArrowForwardIcon, ExpandMoreIcon, InfoIcon, ScheduleIcon } from '../../ielts/icons.jsx'
import { BulbIcon, GridIcon, InsightsIcon, StopwatchIcon, TargetIcon, TrendingDownIcon, TuneIcon } from '../icons.jsx'
import { domainName, skillName } from '../names.js'
import { countForSection, countOptions, moduleSize } from '../model/practice.js'
import { errorText } from '../../lib/examQuota.js'
import FilterBlocks, { EMPTY_FILTERS } from '../practice/FilterBlocks.jsx'
import BankView, { BankLegend } from '../bank/BankView.jsx'
import { filterCounts, progressText, scopeCells, skillsProgress } from '../bank/bank.js'

const MODES = [
  { key: 'module', Icon: StopwatchIcon },
  { key: 'skills', Icon: TargetIcon },
  { key: 'weak', Icon: TrendingDownIcon },
  { key: 'custom', Icon: TuneIcon },
  // пятый режим — не набор, а весь банк сеткой (ТЗ 21.10, задача 8)
  { key: 'all', Icon: GridIcon },
]
const PACE = { rw: 71, math: 95 }
const SECTION_NAME = { rw: 'Reading and Writing', math: 'Math' }

/** Кольцо «22% решено» панели банка (Figma «NEW 2», 17:7703): доля решённых от всего банка секции. */
function SolvedRing({ pct, label }) {
  const r = 48
  const len = 2 * Math.PI * r
  return (
    <div className="st-bankp__ring" role="img" aria-label={`${pct}% ${label}`}>
      <svg width="104" height="104" viewBox="0 0 104 104" aria-hidden="true">
        <circle cx="52" cy="52" r={r} className="st-bankp__track" />
        <circle cx="52" cy="52" r={r} className="st-bankp__arc" strokeDasharray={`${(len * pct) / 100} ${len}`} transform="rotate(-90 52 52)" />
      </svg>
      <span><b>{pct}%</b><small>{label}</small></span>
    </div>
  )
}

/**
 * Практика (Figma SAT 15): рекомендация «Слабые», секция, режим (модуль · по навыкам · слабые · свой набор), дерево
 * навыков с mastery и числом вопросов в банке, справа — сводка сессии, количество, фильтры и честное «N вопросов
 * подходят» с сервера. Всё в учебном режиме: подсказки и разборы доступны. Секция в панели не повторяется — она
 * выбрана вкладками сверху (задача 5). Фильтр «Отмеченные» из макета не сделан: отметки «Отметить» живут в черновике
 * на устройстве, сервер о них не знает. initialMode — режим при открытии: «Сегодня» фазы 7 ведёт сюда сразу во «Все
 * вопросы» (банк) или «Слабые».
 * Макет «NEW 2» (17:2184, 17:7703): пять режимов в ряд, числа на чипах фильтра — с клиента по уже загруженному банку
 * (в пределах выбранного режима), в «Все вопросы» вместо сессии — «Прогресс по секции», а секция и режимы — на всю
 * ширину над сеткой и панелью.
 */
export default function PracticeTab({ onStart, onErrors, explainLang, initialMode = 'skills' }) {
  const { t, lang } = useI18n()
  const token = loadToken()
  const [section, setSection] = useState('rw')
  const [mode, setMode] = useState(initialMode)
  const [picked, setPicked] = useState([])
  const [open, setOpen] = useState({})
  const [count, setCount] = useState(moduleSize('rw'))
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [tax, setTax] = useState(null)
  const [progress, setProgress] = useState(null)
  const [queue, setQueue] = useState({})
  const [pool, setPool] = useState(null)
  const [weak, setWeak] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  // «Все вопросы»: сводка банка секции для панели (сам банк держит BankView)
  const [bankInfo, setBankInfo] = useState(null)
  const isBank = mode === 'all'

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

  // прогресс по банку для дерева навыков — та же цифра, что у темы в «Все вопросы» (задача 8); в режиме «Все вопросы»
  // его сразу обновляет BankView после каждого ответа
  useEffect(() => {
    let alive = true
    setBankInfo(null)
    getSatBank(token, section).then((b) => alive && setBankInfo(b)).catch(() => {})
    return () => {
      alive = false
    }
  }, [token, section])

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
  }), [mode, section, picked, count, filters])

  // «N вопросов подходят» — с сервера, с небольшой задержкой, чтобы не спрашивать на каждый клик
  useEffect(() => {
    if (isBank) return undefined
    if (mode === 'skills' && !picked.length) {
      setPool({ count: 0 })
      return undefined
    }
    const id = setTimeout(() => {
      getSatPracticePool(token, body).then(setPool).catch(() => setPool(null))
    }, 250)
    return () => clearTimeout(id)
  }, [token, body, mode, picked.length, isBank])

  const mastery = useMemo(() => Object.fromEntries((progress?.skills || []).map((s) => [s.id, s])), [progress])
  const bank = useMemo(() => Object.fromEntries((tax?.skills || []).map((s) => [s.id, s.questions])), [tax])
  const domains = (tax?.domains || []).filter((d) => d.section === section).sort((a, b) => a.order - b.order)
  const skillsOf = (d) => (tax?.skills || []).filter((s) => s.domain === d)

  const toggleSkill = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const take = mode === 'module' ? moduleSize(section) : count
  const matching = pool?.count ?? 0
  const minutes = Math.max(1, Math.round((Math.min(take, matching || take) * PACE[section]) / 60))
  // числа на чипах — по вопросам того же режима, из которого соберётся набор: навыки, слабые или вся секция
  const fcounts = useMemo(() => {
    if (!bankInfo) return undefined
    const scope = mode === 'skills' ? picked : mode === 'weak' ? weak?.skillIds || [] : null
    return filterCounts(scopeCells(bankInfo, scope), filters)
  }, [bankInfo, mode, picked, weak, filters])
  const solvedPct = bankInfo?.total ? Math.round((bankInfo.answered * 100) / bankInfo.total) : 0

  const start = async (override) => {
    setBusy(true)
    setError(null)
    try {
      await onStart(override || body)
    } catch (e) {
      setError(errorText(e, t))
    } finally {
      setBusy(false)
    }
  }

  // секция и режимы: в «Все вопросы» — на всю ширину над сеткой и панелью (17:7703), иначе — над деревом навыков
  const head = (
    <div className="st-prac__head">
      <div className="st-prac__bar">
        <div className="ih-seg" role="tablist">
          {['rw', 'math'].map((s) => (
            <button key={s} type="button" role="tab" aria-selected={section === s} className={section === s ? 'is-on' : ''}
              onClick={() => { setCount((c) => countForSection(c, section, s)); setSection(s); setPicked([]) }}>
              {SECTION_NAME[s]}
            </button>
          ))}
        </div>
        <span className="st-spacer" />
        {isBank ? (
          <span className="st-prac__note is-bank"><InfoIcon size={16} />{t('sat.bank.noteChip')}</span>
        ) : (
          <span className="st-prac__note"><BulbIcon size={14} />{t('sat.prac.studyMode')}</span>
        )}
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
    </div>
  )

  return (
    <div className="st-prac">
      {!isBank && weak?.skillIds?.length > 0 && (
        <div className="st-reco">
          <span className="st-reco__icon"><InsightsIcon size={24} /></span>
          <div>
            <b>{t('sat.prac.reco', { mode: t('sat.prac.mode.weak'), q: plural(t, lang, 'sat.q', Math.min(10, weak.count)) })}</b>
            <span>{t('sat.prac.recoSub', { skills: weak.skillIds.map((s) => skillName(s, lang)).join(t('sat.month.and')) })}</span>
          </div>
          <span className="st-spacer" />
          <button type="button" className="st-reco__btn" disabled={busy || !weak.count} onClick={() => start({ mode: 'weak', section, count: 10 })}>
            {t('sat.prac.start')}<ArrowForwardIcon size={18} />
          </button>
        </div>
      )}
      {isBank && head}
      <div className="st-prac__grid">
        <div className="st-prac__main">
          {!isBank && head}
          {isBank && <BankView section={section} filters={filters} explainLang={explainLang} onBank={setBankInfo} domainOrder={domains.map((d) => d.id)} />}
          {!isBank && <div className="st-card st-tree">
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
                    {bankInfo
                      ? <span className="st-tree__bank">{progressText(t, skillsProgress(bankInfo, own.map((x) => x.id)))}</span>
                      : <span className="st-tree__bank">{t('sat.prac.inBank', { n: String(inBank) })}</span>}
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
                            {errs && bank[s.id] && onErrors ? (
                              <button type="button" className="st-link" onClick={() => onErrors(s.id)}>{plural(t, lang, 'sat.prac.errsInQueue', errs)}</button>
                            ) : (
                              <small className="st-muted">
                                {!bank[s.id] ? t('sat.prac.noBank') : errs ? plural(t, lang, 'sat.prac.errsInQueue', errs) : m?.needed ? plural(t, lang, 'sat.prac.needMore', m.needed) : ''}
                              </small>
                            )}
                            {m && m.status !== 'no-data' && <span className={`st-mchip is-${m.status}`}><i />{t(`sat.mastery.${m.status}`)}</span>}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>}
        </div>
        {isBank ? (
          // в банке нет количества и «Начать сессию» — вместо них прогресс по секции (17:7703)
          <aside className="st-card st-sess st-bankp">
            <h2>{t('sat.bank.panelTitle')}</h2>
            {bankInfo && (
              <>
                <p className="st-bankp__sub">{SECTION_NAME[section]} · {plural(t, lang, 'sat.q', bankInfo.total)}</p>
                <div className="st-bankp__sum">
                  <SolvedRing pct={solvedPct} label={t('sat.bank.solved')} />
                  <BankLegend counts={{ right: bankInfo.correct, wrong: bankInfo.answered - bankInfo.correct, none: bankInfo.total - bankInfo.answered }} />
                </div>
              </>
            )}
            <FilterBlocks value={filters} onChange={setFilters} counts={fcounts} variant="counted" />
            <p className="st-bankp__note"><InfoIcon size={16} />{t('sat.bank.panelNote')}</p>
          </aside>
        ) : (
          <aside className="st-card st-sess">
            <h2>{t('sat.prac.yours')}</h2>
            <dl>
              <dt>{t('sat.prac.type')}</dt><dd><b>{t(`sat.prac.mode.${mode}`)}</b></dd>
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
                  {countOptions().map((n) => <button key={n} type="button" className={count === n ? 'is-on' : ''} onClick={() => setCount(n)}>{n}</button>)}
                </div>
              </>
            )}
            {/* два блока: «Сложность» и «Ответы» — ИЛИ внутри, И между (ТЗ 21.10, задача 5); «JTS Original» убран. «Подходит: N»
                под ними больше нет (NEW 2): то же число стоит строкой ниже, рядом с минутами */}
            <FilterBlocks value={filters} onChange={setFilters} counts={fcounts} variant="counted" hint={t('sat.filters.hint')} />
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
        )}
      </div>
    </div>
  )
}
