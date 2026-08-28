import { useMemo, useState } from 'react'
import Shell from '../components/Shell.jsx'
import { useI18n } from '../i18n.jsx'
import Multiline from '../components/Multiline.jsx'
import { birthDateProblem, maxBirthDate, minBirthDate } from '../lib/birthDate.js'

// Реэкспорт ради вызывающих, которые знали проверку по этому имени; правило
// само живёт в src/lib/birthDate.js — его делят регистрация и профиль.
export { isValidBirthDate } from '../lib/birthDate.js'

/**
 * Шаг регистрации: дата рождения. Идёт после почты, до запроса OTP.
 * Тот же экран используется после Google-входа, если дата ещё не указана.
 */
export default function RegisterBirthDatePage({ onBack, onSubmit, loading, error, googleGate = false }) {
  const { t } = useI18n()
  const [value, setValue] = useState('')
  // Границы считаем один раз за монтирование: пересчёт в полночь роли не
  // играет, а useMemo без зависимостей держит поле стабильным при ререндерах.
  const max = useMemo(() => maxBirthDate(), [])
  const min = useMemo(() => minBirthDate(), [])

  const problem = birthDateProblem(value)
  const valid = problem === null

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
              min={min}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="date-field__input"
            />
          </label>

          {value && problem && <div className="form-error">{t(`regbirth.${problem}`)}</div>}
          {error && <div className="form-error">{error}</div>}

          <button className="form-primary" type="submit" disabled={!valid || loading}>
            {loading ? t('regbirth.saving') : t('regbirth.submit')}
          </button>
        </form>
      </div>
    </Shell>
  )
}
