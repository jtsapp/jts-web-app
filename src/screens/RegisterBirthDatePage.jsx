import { useMemo, useState } from 'react'
import Shell from '../components/Shell.jsx'
import { useI18n } from '../i18n.jsx'
import Multiline from '../components/Multiline.jsx'

export function isValidBirthDate(value) {
  if (!value) return false
  const d = new Date(`${value}T12:00:00`)
  if (Number.isNaN(d.getTime())) return false
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  if (d > today) return false
  if (d.getFullYear() < 1900) return false
  return true
}

/**
 * Шаг регистрации: дата рождения. Идёт после почты, до запроса OTP.
 * Тот же экран используется после Google-входа, если дата ещё не указана.
 */
export default function RegisterBirthDatePage({ onBack, onSubmit, loading, error, googleGate = false }) {
  const { t } = useI18n()
  const [value, setValue] = useState('')
  const max = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const valid = isValidBirthDate(value)

  function submit(e) {
    e.preventDefault()
    if (!valid || loading) return
    onSubmit(value)
  }

  return (
    <Shell onBack={onBack}>
      <div className="form-inner">
        <form className="form-card" onSubmit={submit}>
          <h2 className="form-title">
            <Multiline text={t(googleGate ? 'regbirth.titleGoogle' : 'regbirth.title')} />
          </h2>
          <p className="form-sub">{t(googleGate ? 'regbirth.subtitleGoogle' : 'regbirth.subtitle')}</p>

          <label className="date-field">
            <span className="date-field__label">{t('regbirth.label')}</span>
            <input
              type="date"
              autoFocus
              required
              max={max}
              min="1900-01-01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="date-field__input"
            />
          </label>

          {value && !valid && <div className="form-error">{t('regbirth.invalid')}</div>}
          {error && <div className="form-error">{error}</div>}

          <button className="form-primary" type="submit" disabled={!valid || loading}>
            {loading ? t('regbirth.saving') : t('regbirth.submit')}
          </button>
        </form>
      </div>
    </Shell>
  )
}
