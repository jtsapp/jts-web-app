import { useState } from 'react'
import Shell from '../components/Shell.jsx'
import { useI18n } from '../i18n.jsx'
import Multiline from '../components/Multiline.jsx'
import { isEmailIdentifier } from '../api.js'

/**
 * Шаг 2 саморегистрации: почта. Номер уже собран на прошлом шаге
 * (RegisterPhonePage) — при сабмите App.jsx запрашивает код сразу с обоими
 * идентификаторами (handleRegEmailSubmit → sendRegistrationOtp), и бэкенд
 * шлёт его на эту почту. Порядок: номер → почта → код на почту → пароль.
 */
export default function RegisterEmailPage({ onSubmit, loading, error }) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')

  const valid = isEmailIdentifier(email)

  function submit(e) {
    e.preventDefault()
    if (!valid || loading) return
    onSubmit(email.trim())
  }

  return (
    <Shell>
      <div className="form-inner">
        <form className="form-card" onSubmit={submit}>
          <h2 className="form-title">
            <Multiline text={t('regemail.title')} />
          </h2>
          <p className="form-sub">{t('regemail.subtitle')}</p>

          <input
            type="email"
            autoFocus
            placeholder={t('email.placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="email-field"
          />

          {error && <div className="form-error">{error}</div>}

          <button className="form-primary" type="submit" disabled={!valid || loading}>
            {loading ? t('regemail.saving') : t('regemail.submit')}
          </button>
        </form>
      </div>
    </Shell>
  )
}
