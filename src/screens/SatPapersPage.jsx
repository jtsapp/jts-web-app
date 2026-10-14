import { useCallback, useEffect, useState } from 'react'
import { abandonSatMock, getSatMocks, startSatMock, startSatMockModule } from '../api.js'
import { loadToken } from '../lib/session.js'
import { errorText, isQuotaError } from '../lib/examQuota.js'
import { useI18n } from '../i18n.jsx'
import { plural } from '../lib/plural.js'
import ConfirmDialog from '../ielts/ui/ConfirmDialog.jsx'
import { QuotaNotice } from '../components/ExamDemoBanner.jsx'
import { ArrowForwardIcon, ChevronLeftIcon, CloseIcon } from '../ielts/icons.jsx'
import { LaptopIcon, NAV_ICONS } from '../sat/icons.jsx'
import { MOCK_MIN_WIDTH } from '../sat/model/mock.js'
import { fmtDate } from '../sat/model/dates.js'
import { useSatTheme } from '../sat/theme.js'
import { SatBrand } from '../sat/ui/SatNav.jsx'
import { enterFullWindow, leaveFullWindow } from '../sat/fullWindow.js'

function setParams(patch) {
  try {
    const url = new URL(window.location.href)
    for (const [k, v] of Object.entries(patch)) {
      if (v) url.searchParams.set(k, v)
      else url.searchParams.delete(k)
    }
    window.history.replaceState(window.history.state, '', url)
  } catch {
    /* без истории — параметры не пишем */
  }
}

/** «R&W 640 · Math 700» или raw-счёт, если оценки нет (у бумажного теста итог — та же внутренняя оценка). */
function scoreLine(r) {
  if (r.total?.low != null) return r.total.low === r.total.high ? String(r.total.low) : `${r.total.low}–${r.total.high}`
  return '—'
}

/**
 * Past papers — `?screen=sat-papers` (B6, прототип b5e85dfa / 442d0089 / c9a6ad9d): отдельный пункт навигации SAT,
 * экран во всё окно без сайдбара. Плитки тестов рядом, «Start» без подтверждения, ниже — недавние прохождения со
 * стрелкой на разбор. Результаты бумажных тестов живут здесь и в таблицу «Результаты» пробников не входят (B5).
 * Тест идёт во весь экран, как экзамен; модули — на экране от 1024 px.
 */
export default function SatPapersPage({ token, onNav }) {
  const { t, lang } = useI18n()
  useSatTheme()
  const authToken = token || loadToken()
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const [hub, setHub] = useState(null)
  const [error, setError] = useState(null)
  const [quota, setQuota] = useState(null)
  const [busy, setBusy] = useState(false)
  const [abandon, setAbandon] = useState(false)
  const [wide, setWide] = useState(true)

  const load = useCallback(() => {
    getSatMocks(authToken)
      .then(setHub)
      .catch((e) => {
        if (isQuotaError(e)) setQuota(errorText(e, t))
        else setError(errorText(e, t))
      })
  }, [authToken, t])
  useEffect(() => {
    load()
    window.scrollTo(0, 0)
  }, [load])
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= MOCK_MIN_WIDTH)
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  const toHub = (tab = 'mocks') => {
    leaveFullWindow()
    setParams({ satTab: tab })
    onNav?.('sat')
  }
  const openRun = (id, screen = 'sat-mock') => {
    setParams({ satMock: id })
    onNav?.(screen)
  }
  const sit = async (paperId) => {
    enterFullWindow()
    setBusy(true)
    setError(null)
    try {
      const run = await startSatMock(authToken, { paperId, timed: true })
      await startSatMockModule(authToken, run.id)
      openRun(run.id)
    } catch (e) {
      leaveFullWindow()
      if (isQuotaError(e)) setQuota(errorText(e, t))
      else setError(errorText(e, t))
      setBusy(false)
    }
  }
  const drop = async () => {
    setAbandon(false)
    setBusy(true)
    try {
      await abandonSatMock(authToken, hub.active.id)
      load()
    } catch (e) {
      setError(errorText(e, t))
    } finally {
      setBusy(false)
    }
  }

  const papers = hub?.papers || []
  const recent = (hub?.runs || []).filter((r) => r.paperId).slice(0, 8)
  const active = hub?.active

  let body
  if (quota) body = <QuotaNotice text={quota} onBack={() => toHub()} onPricing={() => onNav?.('sat-pricing')} />
  else if (!hub) body = error ? <p className="st-error" role="alert">{error}</p> : null
  else {
    body = (
      <main className="st-papers">
        <div className="st-papers__head">
          <span className="st-mocks__simIcon">{NAV_ICONS.papers(24)}</span>
          <div>
            <span className="st-head__eyebrow">{t('sat.nav.tools')}</span>
            <h1 className="st-head__title">{t('sat.papers.title')}</h1>
            <p className="st-muted">{t('sat.papers.pageLead')}</p>
          </div>
        </div>
        {error && <p className="st-error" role="alert">{error}</p>}
        {!wide && <p className="st-mocks__warn"><LaptopIcon size={18} />{t('sat.mock.tooNarrow')}</p>}
        {active && (
          <div className="st-mocks__notice">
            <div>
              <b>{t('sat.mock.unfinished')}</b>
              <span>{active.paperTitle || t('sat.mock.simName')} · {t('sat.mock.inProgress', { n: String(active.index + 1), total: String(active.modules), date: fmtDate(loc, new Date(active.startedAt), { day: 'numeric', month: 'short' }) })}</span>
              <span className="st-muted">{t('sat.mock.oneAtATime')}</span>
            </div>
            <div className="st-mocks__acts">
              <button type="button" className="ih-btn ih-btn--outline" disabled={busy} onClick={() => setAbandon(true)}>{t('sat.mock.abandon')}</button>
              <button type="button" className="ih-cta" disabled={busy || !wide} onClick={() => { enterFullWindow(); openRun(active.id) }}>{t('sat.mock.resume')}<ArrowForwardIcon size={20} /></button>
            </div>
          </div>
        )}
        {papers.length === 0 ? <p className="st-muted">{t('sat.papers.none')}</p> : (
          <div className="st-papers__grid">
            {papers.map((p) => (
              <section key={p.id} className="st-card st-papers__tile">
                <h2>{p.title}</h2>
                <p className="st-muted">{plural(t, lang, 'sat.q', p.count)} · {t('sat.mock.fourModules')}</p>
                {p.sat > 0 && <p className="st-muted">{plural(t, lang, 'sat.mock.satTimes', p.sat)}</p>}
                <button type="button" className="ih-cta" disabled={busy || !!active || !wide} onClick={() => sit(p.id)}>{t('sat.papers.start')}<ArrowForwardIcon size={18} /></button>
              </section>
            ))}
          </div>
        )}
        {recent.length > 0 && (
          <section className="st-card st-papers__recent">
            <h2>{t('sat.papers.recent')}</h2>
            <ul>
              {recent.map((r) => (
                <li key={r.id}>
                  <button type="button" className="st-papers__row" onClick={() => openRun(r.id, 'sat-mock-review')}>
                    <span><b>{r.paperTitle || r.paperId}</b><small className="st-muted">{r.finishedAt ? fmtDate(loc, new Date(r.finishedAt), { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</small></span>
                    <span className="st-spacer" />
                    <b>{scoreLine(r)}</b>
                    <ArrowForwardIcon size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    )
  }

  return (
    <div className="ih st st-ob st-full">
      <header className="st-ob__top">
        <button type="button" className="ih-round" onClick={() => toHub()} aria-label={t('sat.ob.back')}><ChevronLeftIcon size={20} /></button>
        <SatBrand />
        <span className="ih-chip ih-chip--sm"><span>{t('sat.papers.title')}</span></span>
        <span className="st-spacer" />
        <button type="button" className="st-ob__exit" onClick={() => toHub()}>{t('sat.ob.exit')}<CloseIcon size={16} /></button>
      </header>
      <div className="ih-enter">{body}</div>
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
