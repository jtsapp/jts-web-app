import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import PageHeader from '../ui/PageHeader.jsx'
import { SecPlate } from '../today/TodayCards.jsx'
import { ArrowForwardIcon, ChevronRightIcon, TimerIcon, TrendingUpIcon } from '../icons.jsx'
import { getIeltsProgress } from '../../api.js'

// «Подробный прогресс» по дизайну «IELTS new» (Figma, раздел 1, экран 4): фильтры (навык, период, источник), общая
// оценка с долей программы, карточки навыков с источником и датой, динамика только сопоставимых попыток, частые
// ошибки и история работ. Пропуски данных — прочерк со статусом, не ноль; доля программы — не уровень IELTS (ТЗ v4).

const SKILLS = ['listening', 'reading', 'writing', 'speaking']
const SKILL_NAME = { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' }
const SHORT = { listening: 'L', reading: 'R', writing: 'W', speaking: 'S' }
const PERIODS = [30, 90, 180, 0]
const SOURCES = ['all', 'diagnostic', 'full', 'work', 'partial']

const loc = (lang) => (lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU')
const dfmt = (lang, iso, o = { day: 'numeric', month: 'short' }) => (iso ? new Intl.DateTimeFormat(loc(lang), { timeZone: 'UTC', ...o }).format(new Date(`${String(iso).slice(0, 10)}T00:00:00Z`)) : '')

/** Отбор истории по фильтрам: навык, период (дней, 0 — всё), источник оценки. Чистая функция — под тестом. */
const HISTORY_PAGE = 15

export function filterHistory(rows, { skill, period, source }, today = new Date()) {
  const since = period ? new Date(today.getTime() - period * 86400000) : null
  return (rows || []).filter((r) => (skill === 'all' || r.skill === skill)
    && (source === 'all' || r.source === source)
    && (!since || new Date(r.finishedAt) >= since))
}

// График: только сопоставимые точки (диагностика и полные тесты), цель — горизонтальная линия; ось 4.0–9.0 по данным
function ScoreChart({ points, target }) {
  const { t, lang } = useI18n()
  if (!points.length) return <p className="ih-muted ih-pg__empty">{t('ieltsProgressV.noSeries')}</p>
  const vals = points.map((p) => p.overall).concat(target != null ? [target] : [])
  const lo = Math.max(1, Math.floor(Math.min(...vals) * 2) / 2 - 0.5)
  const hi = Math.min(9, Math.ceil(Math.max(...vals) * 2) / 2 + 0.5)
  const W = 400
  const H = 160
  const x = (i) => (points.length === 1 ? W / 2 : 20 + (i * (W - 40)) / (points.length - 1))
  const y = (v) => 10 + ((hi - v) / (hi - lo || 1)) * (H - 20)
  // шаг шкалы: на широком диапазоне — целые баллы, иначе подписи 1.0…7.5 через 0.5 налезали друг на друга
  const step = hi - lo > 3 ? 1 : 0.5
  const ticks = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 0.001; v += step) ticks.push(v)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.overall).toFixed(1)}`).join(' ')
  return (
    <div className="ih-pg__chart">
      <svg viewBox={`-30 0 ${W + 40} ${H + 44}`} role="img" aria-label={t('ieltsProgressV.chartAria')}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1="0" x2={W} y1={y(v)} y2={y(v)} stroke="#ece8f5" />
            {(target == null || Math.abs(v - target) > 0.24) && <text x="-8" y={y(v) + 4} textAnchor="end" className="ih-pg__tick">{v.toFixed(1)}</text>}
          </g>
        ))}
        {/* цель — оранжевой линией и оранжевой подписью на оси (как в макете); подпись своя, даже если цель между делениями */}
        {target != null && <line x1="0" x2={W} y1={y(target)} y2={y(target)} stroke="#f5a524" strokeWidth="1.5" />}
        {target != null && <text x="-8" y={y(target) + 4} textAnchor="end" className="ih-pg__tick is-goal">{Number(target).toFixed(1)}</text>}
        <path d={line} fill="none" stroke="#9047ff" strokeWidth="2.5" />
        {points.map((p, i) => (
          <g key={`${p.date}${p.source}`}>
            <circle cx={x(i)} cy={y(p.overall)} r="5" fill={p.source === 'diagnostic' ? '#fff' : '#9047ff'} stroke={p.source === 'diagnostic' ? '#8e8a9c' : '#9047ff'} strokeWidth="2" />
            <text x={x(i)} y={y(p.overall) - 10} textAnchor="middle" className="ih-pg__val">{p.overall.toFixed(1)}</text>
            <text x={x(i)} y={H + 22} textAnchor="middle" className="ih-pg__xl">{t(`ieltsProgressV.src.${p.source}`)}</text>
            <text x={x(i)} y={H + 36} textAnchor="middle" className="ih-pg__xd">{dfmt(lang, p.date)}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export default function ProgressPage({ token, data, programmeName, onBack, onOpenAttempt, onTrain }) {
  const { t, lang } = useI18n()
  const [p, setP] = useState(null)
  const [skill, setSkill] = useState('all')
  const [period, setPeriod] = useState(90)
  const [source, setSource] = useState('all')
  // «сейчас» для фильтра периода — момент загрузки данных, а не каждого рендера
  const [now, setNow] = useState(0)
  useEffect(() => {
    let alive = true
    getIeltsProgress(token).then((x) => {
      if (!alive) return
      setNow(Date.now())
      setP(x)
    }).catch(() => alive && setP({ error: true }))
    return () => {
      alive = false
    }
  }, [token])

  const hist = useMemo(() => filterHistory(p?.recent, { skill, period, source }, new Date(now)), [p, skill, period, source, now])
  // история — порциями: бэкенд отдаёт до 100 работ, и все сразу растягивали экран телефона на 7000 px.
  // Смена фильтра начинает с первой порции (лимит привязан к подписи фильтров, без эффекта со сбросом)
  const sig = `${skill}|${period}|${source}`
  const [more, setMore] = useState({ sig: '', n: HISTORY_PAGE })
  const limit = more.sig === sig ? more.n : HISTORY_PAGE
  const series = useMemo(() => {
    const since = period ? now - period * 86400000 : 0
    return (p?.series || []).filter((x) => (skill === 'all' || x.skill === skill || x.source === 'diagnostic')
      && (source === 'all' || x.source === source) && new Date(x.date).getTime() >= since)
  }, [p, skill, period, source, now])

  const cur = data.journey?.current
  const target = data.journey?.target ?? data.targetBand ?? null
  const completion = p?.completion

  return (
    <div className="ih-pg">
      <button type="button" className="ih-link ih-pg__back" onClick={onBack}>← {t('ieltsHub.tab.today')}</button>
      <PageHeader title={t('ieltsProgressV.title')} sub={`${programmeName ? `${programmeName} · ` : ''}${t('ieltsProgressV.sub')}`} />
      <div className="ih-pg__filters">
        <span>{t('ieltsProgressV.skill')}</span>
        <div className="ih-seg2 ih-seg2--sm" role="tablist" aria-label={t('ieltsProgressV.skill')}>
          {['all', ...SKILLS].map((s) => (
            <button key={s} type="button" role="tab" aria-selected={skill === s} className={skill === s ? 'is-on' : ''} onClick={() => setSkill(s)}>
              {s === 'all' ? t('ieltsPractice.all') : SHORT[s]}
            </button>
          ))}
        </div>
        <label className="ih-pg__select">
          {t('ieltsProgressV.period')}
          <select value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
            {PERIODS.map((d) => <option key={d} value={d}>{d ? t('ieltsProgressV.days', { n: String(d) }) : t('ieltsProgressV.allTime')}</option>)}
          </select>
        </label>
        <label className="ih-pg__select">
          {t('ieltsProgressV.source')}
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            {SOURCES.map((s) => <option key={s} value={s}>{t(`ieltsProgressV.srcAll.${s}`)}</option>)}
          </select>
        </label>
      </div>

      {!p ? <p className="ih-muted">{t('ieltsReading.loading')}</p> : p.error ? <p className="ih-muted">{t('ieltsPlan.errorText')}</p> : (
        <>
          <div className="ih-pg__cards">
            <section className="ih-pg__overall">
              <span className="ih-pg__label">{t('ieltsProgressV.overall')}</span>
              <b className="ih-pg__big">{cur ? cur.score.toFixed(1) : '—'}</b>
              <span className="ih-pg__meta">{cur ? `${t(`ieltsGoal.src.${cur.source?.startsWith('full_') ? 'full' : cur.source === 'diagnostic' ? 'diagnostic' : 'sections'}`)} · ${dfmt(lang, cur.date, { day: 'numeric', month: 'long' })} · ${t('ieltsProgressV.platform')}` : t('ieltsGoal.say.noScore')}</span>
              {completion && (
                <>
                  <span className="ih-progline__bar"><i style={{ width: `${completion.percent}%` }} /></span>
                  <small>{t('ieltsProgressV.programmeShare', { p: String(completion.percent) })}</small>
                </>
              )}
            </section>
            {SKILLS.map((s) => {
              const c = p.skills?.[s] || {}
              return (
                <section key={s} className="ih-pg__skill">
                  <header><SecPlate sec={s} size={36} /> <b>{SKILL_NAME[s]}</b></header>
                  <b className="ih-pg__band">{c.band != null ? Number(c.band).toFixed(1) : '—'}</b>
                  <span className="ih-pg__meta">
                    {c.checking && c.band == null ? t('ieltsGoal.checking') : c.source ? `${t(`ieltsProgressV.src.${c.source}`)} · ${dfmt(lang, c.date)}` : t('ieltsProgressV.noScore')}
                  </span>
                  {c.checking ? (
                    <span className="ih-stchip is-started"><TimerIcon size={12} /> {t('ieltsGoal.checking')}</span>
                  ) : c.delta != null ? (
                    <span className={`ih-stchip${c.delta > 0 ? ' is-done' : ''}`}>
                      {c.delta > 0 ? <TrendingUpIcon size={12} /> : null}
                      {c.delta > 0 ? t('ieltsProgressV.delta', { d: `+${c.delta.toFixed(1)}` }) : c.delta < 0 ? t('ieltsProgressV.delta', { d: c.delta.toFixed(1) }) : t('ieltsProgressV.same')}
                    </span>
                  ) : null}
                </section>
              )
            })}
          </div>

          <div className="ih-pg__row">
            <section className="ih-pg__panel">
              <header className="ih-pg__phead">
                <div>
                  <h2>{t('ieltsProgressV.dynamics')}</h2>
                  <span>{t('ieltsProgressV.dynamicsSub')}</span>
                </div>
                <span className="ih-pg__legend">
                  <i className="is-diag" />{t('ieltsProgressV.src.diagnostic')}<i className="is-full" />{t('ieltsProgressV.src.full')}
                  {target != null && <><i className="is-goal" />{t('ieltsProgressV.goal', { b: Number(target).toFixed(1) })}</>}
                </span>
              </header>
              <ScoreChart points={series} target={target} />
            </section>
            <section className="ih-pg__panel">
              <h2>{t('ieltsProgressV.errors')}</h2>
              {p.errors?.length ? (
                <ul className="ih-pg__errors">
                  {p.errors.map((e) => (
                    <li key={`${e.kind}${e.key}`}>
                      <button type="button" onClick={() => onTrain?.(e)}>
                        <SecPlate sec={e.skill} size={36} />
                        <span>
                          <b>{e.kind === 'trap' ? t(`ieltsReading.trap.${e.key}`) : t(`ieltsToday.crit.${e.key}`)}</b>
                          <small>{SKILL_NAME[e.skill]} · {e.kind === 'trap' ? t('ieltsProgressV.errCount', { n: String(e.count) }) : t('ieltsProgressV.critBand', { b: Number(e.band).toFixed(1), n: String(e.count ?? 0) })}</small>
                        </span>
                        <ChevronRightIcon size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="ih-muted">{t('ieltsProgressV.noErrors')}</p>}
            </section>
          </div>

          <section className="ih-pg__panel ih-pg__history">
            <header className="ih-pg__phead">
              <h2>{t('ieltsProgressV.history')}</h2>
              <span>{t('ieltsProgressV.shown', { skill: skill === 'all' ? t('ieltsProgressV.allSkills') : SKILL_NAME[skill], period: period ? t('ieltsProgressV.days', { n: String(period) }) : t('ieltsProgressV.allTime') })}</span>
            </header>
            {hist.length ? (
              <table className="ih-pg__table">
                <tbody>
                  {hist.slice(0, limit).map((r) => (
                    <tr key={r.id}>
                      <td className="ih-pg__d">{dfmt(lang, r.finishedAt)}</td>
                      <td><b>{r.title}</b></td>
                      <td><span className={`ih-pg__type is-${r.source}`}>{t(`ieltsProgressV.type.${r.source}`)}</span></td>
                      <td className="ih-pg__score">
                        {r.band != null ? `${Number(r.band).toFixed(1)}${r.source === 'work' ? ` · ${t('ieltsProgressV.ai')}` : ''}`
                          : ['pending_ai', 'grading'].includes(r.status) ? t('ieltsGoal.checking') : '—'}
                      </td>
                      <td>
                        <button type="button" className="ih-link" onClick={() => onOpenAttempt?.(r)}>
                          {t(r.source === 'work' ? 'ieltsProgressV.openVersion' : r.source === 'partial' ? 'ieltsPlanV.open' : 'ieltsProgressV.openReview')} <ArrowForwardIcon size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="ih-muted">{t('ieltsProgressV.noHistory')}</p>}
            {hist.length > limit && (
              <button type="button" className="ih-btn2 ih-btn2--outline ih-pg__more" onClick={() => setMore({ sig, n: limit + HISTORY_PAGE })}>
                {t('ieltsProgressV.more', { n: String(Math.min(HISTORY_PAGE, hist.length - limit)), total: String(hist.length) })}
              </button>
            )}
          </section>
        </>
      )}
    </div>
  )
}
