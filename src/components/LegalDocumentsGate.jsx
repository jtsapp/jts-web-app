import { useEffect, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { getLegalAcknowledgement, acceptLegalDocuments } from '../api.js'
import { LEGAL_VERSION, documentLanguage } from '../lib/legalDocuments.js'
import LegalDocumentsLinks from './LegalDocumentsLinks.jsx'
import LangSelector from './LangSelector.jsx'

export default function LegalDocumentsGate({ token, required, onLogout, children }) {
  const { t, lang } = useI18n()
  const [status, setStatus] = useState(null)
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [language, setLanguage] = useState(documentLanguage(lang))

  useEffect(() => {
    if (!required) return
    let alive = true
    setStatus(null)
    setError('')
    let timeout
    const deadline = new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('timeout')), 15000) })
    Promise.race([getLegalAcknowledgement(token), deadline]).then((value) => {
      if (!alive) return
      if (value?.version !== LEGAL_VERSION) { setError('legal.loadError'); return }
      setStatus(value)
    }).catch(() => { if (alive) setError('legal.loadError') }).finally(() => clearTimeout(timeout))
    return () => { alive = false; clearTimeout(timeout) }
  }, [token, required, attempt])

  const accept = async (event) => {
    event.preventDefault()
    if (!checked || busy || !status) return
    setBusy(true)
    setError('')
    let saveTimeout
    try {
      const deadline = new Promise((_, reject) => { saveTimeout = setTimeout(() => reject(new Error('timeout')), 15000) })
      const value = await Promise.race([acceptLegalDocuments(token, { version: LEGAL_VERSION, accepted: true, language }), deadline])
      if (value?.version !== LEGAL_VERSION || !value.acceptedAt) throw new Error('Not saved')
      setStatus(value)
    } catch { setError('legal.error') }
    finally { clearTimeout(saveTimeout); setBusy(false) }
  }

  if (!required || status?.acceptedAt) return children
  return <main className="legal-gate">
    <form className="legal-card" onSubmit={accept} aria-labelledby="legal-title" aria-busy={busy}>
      <div className="legal-card__top"><b>just to study</b><LangSelector /></div>
      <h1 id="legal-title">{t('legal.title')}</h1>
      <p>{t('legal.intro')}</p>
      <label className="legal-language">{t('legal.language')}
        <select value={language} onChange={(e) => { setLanguage(e.target.value); setChecked(false) }} disabled={busy}>
          <option value="ru">Русский</option><option value="kk">Қазақша</option>
        </select>
      </label>
      <LegalDocumentsLinks language={language} />
      {lang === 'en' && <p>{t('legal.englishNote')}</p>}
      {!status && !error && <p role="status">{t('legal.loading')}</p>}
      {status && <label className="legal-check">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} disabled={busy} />
        <span>{t('legal.agree')}</span>
      </label>}
      {error && <p className="legal-error" role="alert">{t(error)}</p>}
      <div className="legal-actions">
        {error === 'legal.loadError' ? <button type="button" onClick={() => setAttempt((n) => n + 1)}>{t('legal.retry')}</button>
          : <button type="submit" className="legal-primary" disabled={!status || !checked || busy}>{t(busy ? 'legal.saving' : 'legal.continue')}</button>}
        <button type="button" className="legal-signout" onClick={onLogout} disabled={busy}>{t('legal.logout')}</button>
      </div>
    </form>
  </main>
}
