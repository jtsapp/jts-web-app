import { useState } from 'react'
import Shell from '../components/Shell.jsx'
import { useI18n } from '../i18n.jsx'
import Multiline from '../components/Multiline.jsx'

const MIN_LEN = 6 // совпадает с @Size(min = 6) в SetPasswordRequest на бэкенде

/**
 * Последний шаг саморегистрации: аккаунт уже создан по OTP, но пароля у него
 * нет вообще (RegistrationService пишет null), и войти потом можно только новым
 * кодом. Здесь пользователь задаёт постоянный пароль — после этого работает
 * обычный вход «телефон или почта + пароль».
 *
 * Пропустить шаг нельзя намеренно: аккаунт без пароля не может войти тем
 * способом, который мы теперь предлагаем основным.
 */
export default function SetPasswordPage({ onSubmit, loading, error }) {
  const { t } = useI18n()
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [show, setShow] = useState(false)

  const tooShort = password.length > 0 && password.length < MIN_LEN
  const mismatch = repeat.length > 0 && password !== repeat
  const valid = password.length >= MIN_LEN && password === repeat

  function submit(e) {
    e.preventDefault()
    if (!valid || loading) return
    onSubmit(password)
  }

  return (
    <Shell>
      <div className="form-inner">
        <form className="form-card" onSubmit={submit}>
          <h2 className="form-title">
            <Multiline text={t('setpass.title')} />
          </h2>
          <p className="form-sub">{t('setpass.subtitle')}</p>

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

          <button className="form-primary" type="submit" disabled={!valid || loading}>
            {loading ? t('setpass.saving') : t('setpass.submit')}
          </button>
        </form>
      </div>
    </Shell>
  )
}
