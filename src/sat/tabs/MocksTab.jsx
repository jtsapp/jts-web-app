import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { abandonSatMock, addSatScore, deleteSatScore, getSatMocks, getSatScores, startSatMock, startSatMockModule } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { errorText, isQuotaError } from '../../lib/examQuota.js'
import ConfirmDialog from '../../ielts/ui/ConfirmDialog.jsx'
import { QuotaNotice } from '../../components/ExamDemoBanner.jsx'
import { ArrowForwardIcon, CheckCircleIcon, InfoIcon, RadioOffIcon } from '../../ielts/icons.jsx'
import { AssignmentIcon, BlockIcon, CafeIcon, CalculateIcon, LaptopIcon, NAV_ICONS, RouteIcon } from '../icons.jsx'
import { MOCK_BLOCKS, MOCK_MIN_WIDTH, TOTAL_MINUTES, hoursMinutes, mid } from '../model/mock.js'
import { fmtDate } from '../model/dates.js'
import { AddScoreDialog, ScoreTrajectory, ScoresTable, gapToTarget } from '../mock/ScoresPanel.jsx'
import { enterFullWindow, leaveFullWindow } from '../fullWindow.js'

/**
 * Запасной список для таблицы, пока /mobile/sat/scores нет на бэкенде: только симуляции из /mocks (без past papers),
 * балл — середина диапазона «внутренней оценки JTS».
 */
export function entriesFromRuns(runs = []) {
  return runs
    .filter((r) => !r.paperId && r.total && r.finishedAt)
    .map((r) => ({
      id: `sim-${r.id}`,
      source: 'SIMULATION',
      label: null,
      takenOn: String(r.finishedAt).slice(0, 10),
      rw: r.sections?.rw ? Math.round(mid(r.sections.rw) / 10) * 10 : null,
      math: r.sections?.math ? Math.round(mid(r.sections.math) / 10) * 10 : null,
      total: Math.round(mid(r.total) / 10) * 10,
      delta: null,
      mockId: r.id,
    }))
}

/**
 * Вкладка «Пробники» (Figma SAT 16, B5–B7): полная симуляция JTS рядом с траекторией к цели, под ними — таблица
 * «Результаты»: симуляции и баллы, которые ученик добавил сам (Bluebook, официальный SAT, решение D2), с изменением
 * к предыдущему. Past papers — своя страница во всё окно (B6), отсюда на неё ведёт кнопка; в таблицу их результаты
 * не входят. Симуляция идёт во весь экран (B7).
 */
export default function MocksTab({ target, onOpenRun, onReview, onPapers, onPricing }) {
  const { t, lang } = useI18n()
  const token = loadToken()
  const [hub, setHub] = useState(null)
  const [scores, setScores] = useState(null)
  const [timed, setTimed] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [quota, setQuota] = useState(null)
  const [abandon, setAbandon] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState(null)
  const [wide, setWide] = useState(true)
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const fmt = (s) => fmtDate(loc, new Date(s), { day: 'numeric', month: 'short', year: 'numeric' })

  const load = useCallback(() => {
    getSatMocks(token).then(setHub).catch((e) => setError(errorText(e, t)))
    getSatScores(token).then((s) => setScores(s || { entries: [] })).catch(() => setScores(false))
  }, [token, t])
  useEffect(() => load(), [load])
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= MOCK_MIN_WIDTH)
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  // старт: прохождение создаёт сервер, первый модуль начинается сразу — как startModule прототипа после create.
  // Полный экран просим здесь, в клике: позже браузер его не даст.
  const begin = async (body) => {
    enterFullWindow()
    setBusy(true)
    setError(null)
    try {
      const run = await startSatMock(token, body)
      await startSatMockModule(token, run.id)
      onOpenRun(run.id)
    } catch (e) {
      leaveFullWindow()
      if (isQuotaError(e)) setQuota(errorText(e, t))
      else setError(errorText(e, t))
      setBusy(false)
    }
  }
  const resume = (id) => {
    enterFullWindow()
    onOpenRun(id)
  }
  const drop = async () => {
    setAbandon(false)
    setBusy(true)
    try {
      await abandonSatMock(token, hub.active.id)
      load()
    } catch (e) {
      setError(errorText(e, t))
    } finally {
      setBusy(false)
    }
  }
  const addScore = async (body) => {
    setBusy(true)
    setAddError(null)
    try {
      await addSatScore(token, body)
      setAdding(false)
      load()
    } catch (e) {
      setAddError(errorText(e, t))
    } finally {
      setBusy(false)
    }
  }
  const removeScore = async (id) => {
    setBusy(true)
    try {
      await deleteSatScore(token, id)
      setScores((s) => (s ? { ...s, entries: (s.entries || []).filter((e) => e.id !== id) } : s))
    } catch (e) {
      setError(errorText(e, t))
    } finally {
      setBusy(false)
    }
  }

  if (quota) return <QuotaNotice text={quota} onBack={() => setQuota(null)} onPricing={onPricing} />
  if (!hub) return error ? <p className="st-error" role="alert">{error}</p> : null
  const active = hub.active
  const cap = hub.capacity
  const entries = scores ? scores.entries || [] : entriesFromRuns(hub.runs || [])
  const goal = (scores && scores.target) || target || null
  const gap = gapToTarget(entries, goal)

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
          <button type="button" className="ih-cta" disabled={busy || !wide} onClick={() => resume(active.id)}>{t('sat.mock.resume')}<ArrowForwardIcon size={20} /></button>
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
          <p className="st-muted">{gap == null ? t('sat.scores.trajSub') : gap > 0 ? t('sat.scores.gap', { n: String(gap) }) : t('sat.scores.reached')}</p>
          <ScoreTrajectory entries={entries} target={goal} />
          {entries.length > 0 && (
            <div className="st-mocks__legend">
              <span className="st-mocks__src is-simulation"><i />{t('sat.scores.src.SIMULATION')}</span>
              <span className="st-mocks__src is-bluebook"><i />{t('sat.scores.src.BLUEBOOK')}</span>
              <span className="st-mocks__src is-official"><i />{t('sat.scores.src.OFFICIAL')}</span>
            </div>
          )}
        </section>
      </div>

      {/* Past papers — своя страница во всё окно (B6, прототип b5e85dfa): отсюда на неё одна кнопка */}
      <section className="st-card st-mocks__papersLink">
        <span className="st-mocks__simIcon">{NAV_ICONS.papers(24)}</span>
        <div>
          <h2>{t('sat.papers.title')}</h2>
          <p className="st-muted">{t('sat.papers.lead')}</p>
        </div>
        <span className="st-spacer" />
        <button type="button" className="ih-btn ih-btn--outline" onClick={onPapers}>{t('sat.papers.open')}<ArrowForwardIcon size={18} /></button>
      </section>

      {/* Полные «hard»-симуляции I и II (B7, CH11 / CH12 курса): та же симуляция по модулям, но из сложных наборов.
          Сервер отдаёт их в hub.hard и стартует по { variant } */}
      {hub.hard?.length > 0 && (
        <section className="st-card st-mocks__hard">
          <h2>{t('sat.hard.title')}</h2>
          <p className="st-muted">{t('sat.hard.lead')}</p>
          <ul className="st-mocks__hardList">
            {hub.hard.map((h) => (
              <li key={h.id}>
                <div>
                  <b>{h.title || h.unitCode}</b>
                  <small className="st-muted">
                    {h.unitCode ? `${h.unitCode} · ` : ''}{t('sat.mock.fourModules')}
                    {h.sat > 0 ? ` · ${t('sat.hard.sat', { n: String(h.sat) })}` : ''}
                  </small>
                </div>
                <span className="st-spacer" />
                <button type="button" className="ih-btn ih-btn--outline" disabled={busy || !!active || !wide || h.available === false} onClick={() => begin({ variant: h.id, timed })}>
                  {h.available === false ? t('sat.hard.soon') : t('sat.papers.start')}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ScoresTable entries={entries} busy={busy} onAdd={() => { setAddError(null); setAdding(true) }} onDelete={removeScore} onReview={onReview} />

      {adding && <AddScoreDialog busy={busy} error={addError} onSave={addScore} onClose={() => setAdding(false)} />}
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
