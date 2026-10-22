import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { submitSatBluebook } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { domainName } from '../names.js'

const BLUEBOOK_URL = 'https://bluebook.collegeboard.org/'
const SECTION_OK = (v) => Number.isInteger(v) && v >= 200 && v <= 800 && v % 10 === 0

function todayIso() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const signed = (n) => (n > 0 ? `+${n}` : String(n))

/**
 * Контрольный Bluebook-тест фазы 1, 3 или 5 (ТЗ 21.10, задача 1): инструкция, форма трёх баллов и сравнение.
 * Два блока сравнения нарочно раздельно: баллы — из тестов (6 → 8 → 10), домены — из данных платформы (снимки).
 */
export default function BluebookPanel({ test, tests, snapshots, currentDomains, currentFocus, onSaved }) {
  const { t, lang } = useI18n()
  const mine = tests?.find((x) => x.test === test) || null
  const entered = !!mine?.entered
  const [form, setForm] = useState({ rw: '', math: '', takenOn: todayIso() })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const rw = Number(form.rw)
  const math = Number(form.math)
  const ready = SECTION_OK(rw) && SECTION_OK(math)

  const submit = async (e) => {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setError(null)
    try {
      await submitSatBluebook(loadToken(), test, { rw, math, takenOn: form.takenOn })
      onSaved?.()
    } catch {
      setError(t('sat.bb.error'))
    } finally {
      setBusy(false)
    }
  }

  const done = (tests || []).filter((x) => x.entered)
  const shownSnaps = (snapshots || []).filter((s) => done.some((x) => x.test === s.test))

  return (
    <div className="st-bb">
      {!entered && (
        <>
          <p className="st-muted">{t('sat.bb.instr')}</p>
          {mine?.reviewStatus === 'REJECTED' && (
            <p className="st-bb__rejected">{t('sat.bb.rejected', { comment: mine.reviewComment || '—' })}</p>
          )}
          <a className="ih-btn ih-btn--outline st-bb__open" href={BLUEBOOK_URL} target="_blank" rel="noreferrer">{t('sat.bb.open')}</a>
          <form className="st-scoreform" onSubmit={submit} noValidate>
            <label className="st-field">
              <span>{t('sat.bb.date')}</span>
              <input type="date" value={form.takenOn} max={todayIso()} onChange={(e) => setForm((f) => ({ ...f, takenOn: e.target.value }))} />
            </label>
            <div className="st-scoreform__pair">
              <label className="st-field">
                <span>{t('sat.bb.rw')}</span>
                <input type="number" inputMode="numeric" min={200} max={800} step={10} placeholder="200–800" value={form.rw}
                  onChange={(e) => setForm((f) => ({ ...f, rw: e.target.value }))} />
              </label>
              <label className="st-field">
                <span>{t('sat.bb.math')}</span>
                <input type="number" inputMode="numeric" min={200} max={800} step={10} placeholder="200–800" value={form.math}
                  onChange={(e) => setForm((f) => ({ ...f, math: e.target.value }))} />
              </label>
            </div>
            <div className="st-scoreform__total"><span>{t('sat.bb.total')}</span><b>{ready ? rw + math : '—'}</b></div>
            {error && <p className="st-field__err">{error}</p>}
            <button type="submit" className="ih-cta" disabled={!ready || busy}>{t('sat.bb.save')}</button>
          </form>
        </>
      )}

      {done.length > 0 && (
        <section className="st-bb__block">
          <h3>{t('sat.bb.line')}</h3>
          <table className="st-bb__table">
            <thead><tr><th /><th>{t('sat.bb.total')}</th><th>{t('sat.bb.math')}</th><th>{t('sat.bb.rw')}</th><th /></tr></thead>
            <tbody>
              {done.map((x) => (
                <tr key={x.test}>
                  <th>Test {x.test}</th>
                  <td><b>{x.total}</b>{x.deltaTotal != null && <small className={x.deltaTotal >= 0 ? 'is-up' : 'is-down'}> {signed(x.deltaTotal)}</small>}</td>
                  <td>{x.math}{x.deltaMath != null && <small className={x.deltaMath >= 0 ? 'is-up' : 'is-down'}> {signed(x.deltaMath)}</small>}</td>
                  <td>{x.rw}{x.deltaRw != null && <small className={x.deltaRw >= 0 ? 'is-up' : 'is-down'}> {signed(x.deltaRw)}</small>}</td>
                  <td><span className={`st-bb__status is-${String(x.reviewStatus).toLowerCase()}`}>{x.reviewStatus === 'PENDING' ? t('sat.bb.pending') : t('sat.bb.approved')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {done.length > 1 && <p className="st-muted">{t('sat.bb.gain')}</p>}
        </section>
      )}

      {(shownSnaps.length > 0 || entered) && currentDomains && (
        <section className="st-bb__block">
          <h3>{t('sat.bb.domains')}</h3>
          <p className="st-muted">{t('sat.bb.domainsNote')}</p>
          <table className="st-bb__table st-bb__domains">
            <thead>
              <tr><th />{shownSnaps.map((s) => <th key={s.test}>{t('sat.bb.at', { n: String(s.test) })}</th>)}<th>{t('sat.bb.now')}</th></tr>
            </thead>
            <tbody>
              {currentDomains.map((d) => (
                <tr key={d.id}>
                  <th>{domainName(d.id, lang)}</th>
                  {shownSnaps.map((s) => {
                    const old = s.domains.find((x) => x.id === d.id)
                    return <td key={s.test}><span className={`st-band is-${old?.band || 'none'}`}>{t(`sat.bb.band.${old?.band || 'none'}`)}</span></td>
                  })}
                  <td><span className={`st-band is-${d.band}`}>{t(`sat.bb.band.${d.band}`)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {currentFocus?.length > 0 && (
            <p><b>{t('sat.bb.focus')}:</b> {currentFocus.map((id) => domainName(id, lang)).join(' · ')}</p>
          )}
        </section>
      )}
    </div>
  )
}
