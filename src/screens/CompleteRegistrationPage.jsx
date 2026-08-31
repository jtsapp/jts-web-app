import { useEffect, useState } from 'react'
import Shell from '../components/Shell.jsx'
import { useI18n } from '../i18n.jsx'
import Multiline from '../components/Multiline.jsx'
import { completeActivation, getActivationInfo } from '../api.js'

const MIN_LEN = 6

/**
 * Студент, заведённый админом/менеджером, открывает одноразовую ссылку
 * /complete-registration/:token, задаёт свой пароль и дальше входит как обычно.
 */
export default function CompleteRegistrationPage({ token, onDone }) {
  const { t } = useI18n()
  const [state, setState] = useState('loading')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) {
      setState('invalid')
      setError(t('activate.invalid'))
      return
    }
    let cancelled = false
    getActivationInfo(token)
      .then((info) => {
        if (cancelled) return
        setName(info?.name || '')
        setState('form')
      })
      .catch((e) => {
        if (cancelled) return
        setError(e?.message || t('activate.invalid'))
        setState('invalid')
      })
    return () => { cancelled = true }
  }, [token, t])

  const tooShort = password.length > 0 && password.length < MIN_LEN
  const mismatch = repeat.length > 0 && password !== repeat
  const valid = password.length >= MIN_LEN && password === repeat

  async function submit(e) {
    e.preventDefault()
    if (!valid || saving) return
    setSaving(true)
    setError('')
    try {
      await completeActivation(token, password)
      setState('done')
    } catch (err) {
      setError(err?.message || t('setpass.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell>
      <div className="form-inner">
        {state === 'loading' && (
          <div className="form-card">
            <p className="form-sub">{t('activate.checking')}</p>
          </div>
        )}

        {state === 'invalid' && (
          <div className="form-card">
            <h2 className="form-title">
              <Multiline text={t('activate.title')} />
            </h2>
            <p className="form-error">{error}</p>
            <p className="form-sub">{t('activate.askAdmin')}</p>
          </div>
        )}

        {state === 'form' && (
          <form className="form-card" onSubmit={submit}>
            <h2 className="form-title">
              <Multiline text={t('activate.title')} />
            </h2>
            <p className="form-sub">
              {name ? t('activate.hello', { name }) : t('activate.helloAnon')}
            </p>

            <input
              type={show ? 'text' : 'password'}
              autoFocus
              autoComplete="new-password"
              placeholder={t('setpass.placeholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="email-field"
            />

            <input
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t('setpass.repeatPlaceholder')}
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              className="email-field"
            />

            <label className="form-check">
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
              {t('setpass.show')}
            </label>

            {tooShort && <div className="form-hint">{t('setpass.tooShort', { n: String(MIN_LEN) })}</div>}
            {mismatch && <div className="form-hint">{t('setpass.mismatch')}</div>}
            {error && <div className="form-error">{error}</div>}

            <button className="form-primary" type="submit" disabled={!valid || saving}>
              {saving ? t('setpass.saving') : t('activate.submit')}
            </button>
          </form>
        )}

        {state === 'done' && (
          <div className="form-card">
            <h2 className="form-title">
              <Multiline text={t('activate.doneTitle')} />
            </h2>
            <p className="form-sub">{t('activate.done')}</p>
            <button className="form-primary" type="button" onClick={onDone}>
              {t('activate.goLogin')}
            </button>
          </div>
        )}
      </div>
    </Shell>
  )
}
