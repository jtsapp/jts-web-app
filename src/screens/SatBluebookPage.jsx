import { useEffect, useState } from 'react'
import { getSatBluebook, submitSatBluebook } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import { ArrowForwardIcon, ChevronLeftIcon, CloseIcon, InfoIcon } from '../ielts/icons.jsx'
import { CalculateIcon, NorthEastIcon, OkCircleIcon } from '../sat/icons.jsx'
import { bluebookCheck, testParam } from '../sat/model/compare.js'
import { ReviewBanner } from '../sat/plan/BluebookPanel.jsx'

const BLUEBOOK_URL = 'https://bluebook.collegeboard.org/'

function readTest() {
  try {
    return testParam(new URLSearchParams(window.location.search).get('satBluebook'))
  } catch {
    return null
  }
}

function dropParam() {
  try {
    const url = new URL(window.location.href)
    url.searchParams.delete('satBluebook')
    window.history.replaceState(window.history.state, '', url)
  } catch {
    /* без истории — параметр останется, хаб его не читает */
  }
}

/** Поле балла макета: крупное число, подсказка шкалы справа; красная рамка — Total не сходится с секциями. */
function ScoreInput({ label, hint, value, onChange, bad, big, describedBy }) {
  return (
    <label className={`st-bbform__field ${big ? 'is-big' : ''}`}>
      <span>{label}</span>
      <span className={`st-bbform__input ${bad ? 'is-bad' : ''}`}>
        <input type="number" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={bad || undefined} aria-describedby={describedBy} />
        <small>{hint}</small>
      </span>
    </label>
  )
}

/**
 * Баллы Bluebook Test 6 / 8 / 10 — `?screen=sat-bluebook&satBluebook=<n>` (Figma «NEW 2», 17:8284 и 17:8367): экран во
 * всё окно, слева — как пишется тест, справа — три числа из отчёта. Total вводят сами, хотя сервер его не берёт (итог
 * всегда сумма секций): так опечатка в отчёте ловится здесь, а не у куратора. Дату не спрашиваем — сервер ставит
 * сегодняшнюю. После сохранения — назад, откуда пришли (вкладка и фаза в адресе остались).
 */
export default function SatBluebookPage({ token, onNav }) {
  const { t } = useI18n()
  const authToken = token || loadToken()
  const [test, setTest] = useState(null)
  const [data, setData] = useState(null)
  const [form, setForm] = useState({ total: '', math: '', rw: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [again, setAgain] = useState(false)

  useEffect(() => {
    setTest(readTest())
    window.scrollTo(0, 0)
    getSatBluebook(authToken).then(setData).catch(() => setData({ tests: [] }))
  }, [authToken])

  const back = () => {
    dropParam()
    onNav?.('sat')
  }
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const check = bluebookCheck(form)
  const mine = data?.tests?.find((x) => x.test === test) || null
  const rejected = mine?.reviewStatus === 'REJECTED'
  // форма — пока баллы не введены; после отклонения — по «Ввести баллы снова»
  const showForm = data && !mine?.entered && (!rejected || again)

  const save = async (e) => {
    e.preventDefault()
    if (check.state !== 'match' || busy) return
    setBusy(true)
    setError(null)
    try {
      await submitSatBluebook(authToken, test, { rw: Number(form.rw), math: Number(form.math) })
      back()
    } catch {
      setError(t('sat.bb.error'))
      setBusy(false)
    }
  }

  let body
  if (!test) body = <p className="st-error" role="alert">{t('sat.bb.noTest')}</p>
  else if (!data) body = null
  else {
    body = (
      <div className="st-bbform">
        <section className="st-card st-bbform__how">
          <h1>{t('sat.bb.formTitle', { n: String(test) })}</h1>
          <p className="st-bbform__lead">{t('sat.bb.formLead')}</p>
          <ol className="st-bbform__steps">
            <li>
              <b>{t('sat.bb.step1')}</b>
              <span>{t('sat.bb.step1Sub', { n: String(test) })}</span>
              <a className="st-bbform__open" href={BLUEBOOK_URL} target="_blank" rel="noreferrer">{t('sat.bb.open')}<NorthEastIcon size={16} /></a>
            </li>
            <li><b>{t('sat.bb.step2')}</b><span>{t('sat.bb.step2Sub')}</span></li>
            <li><b>{t('sat.bb.step3')}</b><span>{t('sat.bb.step3Sub')}</span></li>
          </ol>
          <p className="st-bbform__note"><InfoIcon size={18} />{t('sat.bb.unconfirmed')}</p>
        </section>

        <section className="st-card st-bbform__card">
          <h2>{t('sat.bb.yours')}</h2>
          {/* введённый тест форму не открывает: второй раз сервер его не примет — показываем, на какой он проверке */}
          {(mine?.entered || rejected) && <ReviewBanner test={mine} onEnter={rejected && !again ? () => setAgain(true) : null} />}
          {mine?.entered && (
            <div className="st-bbform__acts">
              <button type="button" className="ih-cta" onClick={back}>{t('sat.bb.done')}<ArrowForwardIcon size={20} /></button>
            </div>
          )}
          {showForm && (
            <form className="st-bbform__form" onSubmit={save} noValidate>
              <ScoreInput big label={t('sat.bb.totalLabel')} hint="400–1600" value={form.total} onChange={set('total')} bad={check.state === 'mismatch'}
                describedBy={check.state === 'mismatch' ? 'st-bb-mismatch' : undefined} />
              {check.state === 'mismatch' && (
                <small id="st-bb-mismatch" className="st-bbform__err">
                  {t('sat.bb.mismatch', { math: form.math, rw: form.rw, sum: String(check.sum), total: form.total })}
                </small>
              )}
              <div className="st-bbform__pair">
                <ScoreInput label={t('sat.bb.math')} hint="200–800" value={form.math} onChange={set('math')} />
                <ScoreInput label={t('sat.bb.rw')} hint="200–800" value={form.rw} onChange={set('rw')} />
              </div>
              {check.state === 'match' && (
                <p className="st-bbform__ok"><OkCircleIcon size={20} />{t('sat.bb.match', { rw: form.rw, math: form.math, sum: String(check.sum) })}</p>
              )}
              {check.state === 'mismatch' && (
                <>
                  <p className="st-bbform__warn"><InfoIcon size={18} />{t('sat.bb.mismatchHint', { sum: String(check.sum) })}</p>
                  <button type="button" className="st-bbform__auto" onClick={() => set('total')(String(check.sum))}>
                    <CalculateIcon size={18} />{t('sat.bb.auto')}
                  </button>
                </>
              )}
              {error && <p className="st-field__err" role="alert">{error}</p>}
              <div className="st-bbform__acts">
                <button type="button" className="ih-btn ih-btn--outline" onClick={back}>{t('sat.logerr.cancel')}</button>
                <span className="st-spacer" />
                <button type="submit" className="ih-cta" disabled={check.state !== 'match' || busy}>{t('sat.bb.save')}<ArrowForwardIcon size={20} /></button>
              </div>
            </form>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="ih st st-ob st-full">
      <header className="st-ob__top">
        <button type="button" className="ih-round" onClick={back} aria-label={t('sat.ob.back')}><ChevronLeftIcon size={20} /></button>
        <b className="st-ob__logo">just to study</b>
        {test && <span className="ih-chip ih-chip--sm"><span>{t('sat.bb.chip', { n: String(test) })}</span></span>}
        <span className="st-spacer" />
        <button type="button" className="st-ob__exit" onClick={back}>{t('sat.ob.exit')}<CloseIcon size={16} /></button>
      </header>
      <main className="ih-enter st-bbform__main">{body}</main>
    </div>
  )
}
