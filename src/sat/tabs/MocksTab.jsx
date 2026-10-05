import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { abandonSatMock, getSatMocks, startSatMock, startSatMockModule } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { plural } from '../../lib/plural.js'
import ConfirmDialog from '../../ielts/ui/ConfirmDialog.jsx'
import { ArrowForwardIcon, CheckCircleIcon, InfoIcon, RadioOffIcon } from '../../ielts/icons.jsx'
import { AssignmentIcon, BlockIcon, CafeIcon, CalculateIcon, LaptopIcon, RouteIcon } from '../icons.jsx'
import { MOCK_BLOCKS, MOCK_MIN_WIDTH, TOTAL_MINUTES, deltas, hoursMinutes, mid, trajectory } from '../model/mock.js'
import { fmtDate } from '../model/dates.js'

const W = 372
const H = 210
const PAD = { l: 34, r: 10, t: 12, b: 26 }

/** Траектория к цели (Figma 16): диапазон каждой сданной симуляции — столбик, середина — точка; линия цели. */
function Trajectory({ runs, target, lang, t }) {
  const tr = trajectory(runs, target)
  if (!tr || !tr.points.length) return <p className="st-muted st-mocks__empty">{t('sat.mock.trajEmpty')}</p>
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const y = (v) => PAD.t + (1 - (v - tr.lo) / (tr.hi - tr.lo)) * (H - PAD.t - PAD.b)
  const n = tr.points.length
  const x = (i) => PAD.l + 20 + (n === 1 ? (W - PAD.l - PAD.r - 40) / 2 : (i * (W - PAD.l - PAD.r - 40)) / (n - 1))
  // подпись точки — месяц, как в макете; несколько попыток в одном месяце дали бы «окт окт окт» — тогда с числом
  const months = tr.points.map((p) => new Date(p.finishedAt).toISOString().slice(0, 7))
  const labelOpts = new Set(months).size === months.length ? { month: 'short' } : { day: 'numeric', month: 'short' }
  return (
    <svg className="st-traj" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('sat.mock.trajectory')}>
      {tr.ticks.map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="st-traj__grid" />
          <text x={PAD.l - 6} y={y(v) + 3} className="st-traj__tick">{v}</text>
        </g>
      ))}
      {target && target >= tr.lo && target <= tr.hi && (
        <g>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(target)} y2={y(target)} className="st-traj__goal" />
          <text x={W - PAD.r - 4} y={y(target) - 6} className="st-traj__goalText">{t('sat.mock.goal', { n: String(target) })}</text>
        </g>
      )}
      {n > 1 && (
        <polyline className="st-traj__line" points={tr.points.map((p, i) => `${x(i)},${y(mid(p.total))}`).join(' ')} />
      )}
      {tr.points.map((p, i) => (
        <g key={p.id}>
          <rect x={x(i) - 7} y={y(p.total.high)} width="14" height={Math.max(4, y(p.total.low) - y(p.total.high))} rx="7" className="st-traj__band" />
          <circle cx={x(i)} cy={y(mid(p.total))} r="6" className="st-traj__dot" />
          <text x={x(i)} y={H - 6} className="st-traj__month">{fmtDate(loc, new Date(p.finishedAt), labelOpts)}</text>
        </g>
      ))}
    </svg>
  )
}

/**
 * Вкладка «Пробники» (Figma SAT 16): запуск полной симуляции JTS и история результатов. Симуляция — четыре модуля и
 * перерыв по правилам экзамена; итог — диапазон, не балл. Пробники (past papers) — свой блок, его в макете нет.
 * «Добавить результат» (35) не строим — решение B плана: в таблице только прохождения JTS.
 */
export default function MocksTab({ target, onOpenRun, onReview }) {
  const { t, lang } = useI18n()
  const token = loadToken()
  const [hub, setHub] = useState(null)
  const [timed, setTimed] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [paper, setPaper] = useState(null)
  const [abandon, setAbandon] = useState(false)
  const [wide, setWide] = useState(true)
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const fmt = (s) => fmtDate(loc, new Date(s), { day: 'numeric', month: 'short', year: 'numeric' })

  const load = useCallback(() => {
    getSatMocks(token).then(setHub).catch((e) => setError(e?.serverMessage || t('sat.study.netError')))
  }, [token, t])
  useEffect(() => load(), [load])
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= MOCK_MIN_WIDTH)
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  // старт: прохождение создаёт сервер, первый модуль начинается сразу — как startModule прототипа после create
  const begin = async (body) => {
    setBusy(true)
    setError(null)
    try {
      const run = await startSatMock(token, body)
      await startSatMockModule(token, run.id)
      onOpenRun(run.id)
    } catch (e) {
      setError(e?.serverMessage || t('sat.study.netError'))
      setBusy(false)
    }
  }
  const drop = async () => {
    setAbandon(false)
    setBusy(true)
    try {
      await abandonSatMock(token, hub.active.id)
      load()
    } catch (e) {
      setError(e?.serverMessage || t('sat.study.netError'))
    } finally {
      setBusy(false)
    }
  }

  if (!hub) return error ? <p className="st-error" role="alert">{error}</p> : null
  const active = hub.active
  const cap = hub.capacity
  const runs = hub.runs || []
  const dl = deltas(runs)

  let action
  if (active) {
    action = (
      <div className="st-mocks__notice">
        <div>
          <b>{t('sat.mock.unfinished')}</b>
          <span>{t('sat.mock.inProgress', { n: String(active.index + 1), total: String(active.modules), date: fmt(active.startedAt) })}</span>
          <span className="st-muted">{t('sat.mock.oneAtATime')}</span>
        </div>
        <div className="st-mocks__acts">
          <button type="button" className="ih-btn ih-btn--outline" disabled={busy} onClick={() => setAbandon(true)}>{t('sat.mock.abandon')}</button>
          <button type="button" className="ih-cta" disabled={busy || !wide} onClick={() => onOpenRun(active.id)}>{t('sat.mock.resume')}<ArrowForwardIcon size={20} /></button>
        </div>
      </div>
    )
  } else if (!cap.ok) {
    // Нет в Figma: банк не набирает четыре модуля (capacity прототипа) — говорим заранее, а не на втором модуле
    action = <p className="st-mocks__warn"><InfoIcon size={18} />{t('sat.mock.notEnough', { rw: String(cap.have.rw), math: String(cap.have.math), nrw: String(cap.need.rw), nmath: String(cap.need.math) })}</p>
  } else {
    action = (
      <div className="st-mocks__modes" role="radiogroup" aria-label={t('sat.mock.timing')}>
        {[true, false].map((v) => (
          <button key={String(v)} type="button" role="radio" aria-checked={timed === v} className={`st-mocks__mode ${timed === v ? 'is-on' : ''}`} onClick={() => setTimed(v)}>
            {timed === v ? <CheckCircleIcon size={20} /> : <RadioOffIcon size={20} />}
            <span><b>{t(v ? 'sat.mock.timed' : 'sat.mock.untimed')}</b><small>{t(v ? 'sat.mock.timedDesc' : 'sat.mock.untimedDesc')}</small></span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="st-mocks">
      {error && <p className="st-error" role="alert">{error}</p>}
      <div className="st-mocks__row">
        <section className="st-card st-mocks__sim">
          <div className="st-mocks__simHead">
            <span className="st-mocks__simIcon"><AssignmentIcon size={24} /></span>
            <div>
              <h2>{t('sat.mock.simTitle')}</h2>
              <p className="st-muted">{t('sat.mock.simSub', { time: hoursMinutes(t, TOTAL_MINUTES) })}</p>
            </div>
          </div>
          <div className="st-mocks__blocks">
            {MOCK_BLOCKS.map((b) => (b.section ? (
              <div key={b.key} className={`st-mocks__block is-${b.section}`}>
                <b>{b.section === 'math' ? 'Math' : 'R&W'} {b.n}</b>
                <small>{t('sat.mock.min', { n: String(b.minutes) })}</small>
              </div>
            ) : (
              <div key={b.key} className="st-mocks__block is-break" title={t('sat.mock.breakMin', { n: String(b.minutes) })}><CafeIcon size={18} /></div>
            )))}
          </div>
          <ul className="st-mocks__rules">
            <li><BlockIcon size={18} />{t('sat.mock.ruleNoHelp')}</li>
            <li><RouteIcon size={18} />{t('sat.mock.ruleRouting')}</li>
            <li><CalculateIcon size={18} />{t('sat.mock.ruleDesmos')}</li>
          </ul>
          {action}
          <div className="st-mocks__foot">
            <span className={`st-mocks__width ${wide ? '' : 'is-short'}`}><LaptopIcon size={18} />{t(wide ? 'sat.mock.needWide' : 'sat.mock.tooNarrow')}</span>
            <span className="st-spacer" />
            {!active && cap.ok && (
              <button type="button" className="ih-cta" disabled={busy || !wide} onClick={() => begin({ timed })}>
                {t('sat.mock.startSim')}<ArrowForwardIcon size={20} />
              </button>
            )}
          </div>
        </section>
        <section className="st-card st-mocks__traj">
          <h2>{t('sat.mock.trajectory')}</h2>
          <p className="st-muted">{t('sat.mock.trajectorySub')}</p>
          <Trajectory runs={runs} target={target} lang={lang} t={t} />
          {runs.length > 0 && (
            <div className="st-mocks__legend">
              <span className="st-mocks__src is-sim"><i />{t('sat.mock.legendSim')}</span>
            </div>
          )}
        </section>
      </div>

      {hub.papers?.length > 0 && (
        // Нет в Figma: адаптация прототипа mock.js (paperCard) — пробники целиком, без подсказок и объяснений
        <section className="st-card st-mocks__papers">
          <h2>{t('sat.mock.papersTitle')}</h2>
          <p className="st-muted">{t('sat.mock.papersLead')}</p>
          <ul>
            {hub.papers.map((p) => (
              <li key={p.id}>
                <div>
                  <b>{p.title}</b>
                  <small className="st-muted">
                    {plural(t, lang, 'sat.q', p.count)} · {t('sat.mock.fourModules')}
                    {p.sat > 0 && <> · {plural(t, lang, 'sat.mock.satTimes', p.sat)}</>}
                  </small>
                </div>
                <button type="button" className="ih-btn ih-btn--outline" disabled={busy || !!active || !wide} onClick={() => setPaper(p)}>{t('sat.mock.sitPaper')}</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="st-card st-mocks__hist">
        <h2>{t('sat.mock.results')}</h2>
        <p className="st-muted">{t('sat.mock.resultsSub')}</p>
        {runs.length === 0 ? <p className="st-muted st-mocks__empty">{t('sat.mock.noResults')}</p> : (
          <div className="st-mocks__table" role="table">
            <div className="st-mocks__tr is-head" role="row">
              {['date', 'source', 'rw', 'math', 'total', 'delta'].map((k) => <span key={k} role="columnheader">{t(`sat.mock.col.${k}`)}</span>)}
              <span role="columnheader" />
            </div>
            {runs.map((r, i) => (
              <div key={r.id} className="st-mocks__tr" role="row">
                <span role="cell" className="is-wide">{fmt(r.finishedAt)}</span>
                <span role="cell" className="is-wide">
                  <span className={`st-mocks__src ${r.paperId ? 'is-paper' : 'is-sim'}`} title={r.paperTitle || undefined}><i /><span>{r.paperTitle || t('sat.mock.srcSim')}</span></span>
                  {!r.timed && <span className="st-mocks__tag">{t('sat.mock.untimedTag')}</span>}
                </span>
                <span role="cell" data-label={t('sat.mock.col.rw')}><b>{r.sections?.rw?.low != null ? `${r.sections.rw.low}–${r.sections.rw.high}` : '—'}</b></span>
                <span role="cell" data-label={t('sat.mock.col.math')}><b>{r.sections?.math?.low != null ? `${r.sections.math.low}–${r.sections.math.high}` : '—'}</b></span>
                <span role="cell" className="st-mocks__total" data-label={t('sat.mock.col.total')}>
                  <b>{r.total ? `${r.total.low}–${r.total.high}` : '—'}</b>
                  <span className="st-mocks__est">{t('sat.mock.estimateChip')}</span>
                </span>
                <span role="cell" data-label={t('sat.mock.col.delta')} className={dl[i] > 0 ? 'is-up' : dl[i] < 0 ? 'is-down' : 'st-muted'}>{dl[i] == null ? '—' : `${dl[i] > 0 ? '+' : ''}${dl[i]}`}</span>
                <span role="cell"><button type="button" className="st-link" onClick={() => onReview(r.id)}>{t('sat.mock.reviewShort')}</button></span>
              </div>
            ))}
          </div>
        )}
        <p className="st-mocks__note"><InfoIcon size={20} />{t('sat.mock.historyNote')}</p>
      </section>

      <ConfirmDialog
        open={!!paper}
        title={paper?.title || ''}
        text={t('sat.mock.paperConfirm')}
        confirmLabel={t('sat.mock.sitPaper')}
        cancelLabel={t('sat.mock.abandonCancel')}
        busy={busy}
        onConfirm={() => {
          const p = paper
          setPaper(null)
          begin({ paperId: p.id, timed: true })
        }}
        onCancel={() => setPaper(null)}
      />
      <ConfirmDialog
        open={abandon}
        title={t('sat.mock.abandonTitle')}
        text={t('sat.mock.abandonText')}
        confirmLabel={t('sat.mock.abandonConfirm')}
        cancelLabel={t('sat.mock.abandonCancel')}
        busy={busy}
        onConfirm={drop}
        onCancel={() => setAbandon(false)}
      />
    </div>
  )
}
