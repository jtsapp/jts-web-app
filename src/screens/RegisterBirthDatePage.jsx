import { useState } from 'react'
import Shell from '../components/Shell.jsx'
import { useI18n } from '../i18n.jsx'
import Multiline from '../components/Multiline.jsx'
import BirthDateInput from '../components/BirthDateInput.jsx'
import { birthDateProblem } from '../lib/birthDate.js'

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

          <div className="date-field">
            <label className="date-field__label" htmlFor="regbirth-day">
              {t('regbirth.label')}
            </label>
            <BirthDateInput id="regbirth-day" autoFocus value={value} onChange={setValue} />
          </div>

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
