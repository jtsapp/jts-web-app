import { useState } from 'react'
import Shell from '../components/Shell.jsx'
import { RuFlagIcon } from '../components/icons.jsx'
import { useI18n } from '../i18n.jsx'
import Multiline from '../components/Multiline.jsx'

// Форматируем ТОЛЬКО национальный номер (без кода страны): (777) 123-45-67
// Разделитель добавляем только когда в следующей группе уже есть цифра —
// иначе хвостовой разделитель ломает backspace.
function formatNational(d) {
  d = d.slice(0, 10)
  if (!d) return ''
  let out = '(' + d.slice(0, 3)
  if (d.length > 3) out += ') ' + d.slice(3, 6)
  if (d.length > 6) out += '-' + d.slice(6, 8)
  if (d.length > 8) out += '-' + d.slice(8, 10)
  return out
}

export default function PhoneLoginPage({ onBack, onSubmit, loading, error }) {
  const { t } = useI18n()
  const [digits, setDigits] = useState('') // только 10 цифр номера, без +7

  function onChange(e) {
    let raw = e.target.value.replace(/\D/g, '')
    // если вставили номер целиком с кодом страны (11 цифр, 7/8) — убираем код.
    // Проверяем только при вставке (было меньше 10), чтобы не ломать обычный набор.
    if (raw.length === 11 && (raw[0] === '7' || raw[0] === '8') && digits.length < 10) {
      raw = raw.slice(1)
    }
    setDigits(raw.slice(0, 10))
  }

  const valid = digits.length === 10

  function submit(e) {
    e.preventDefault()
    if (valid && !loading) onSubmit('+7' + digits)
  }

  return (
    <Shell onBack={onBack}>
      <div className="form-inner">
        <form className="form-card" onSubmit={submit}>
          <h2 className="form-title">
            <Multiline text={t('phone.title')} />
          </h2>
          <p className="form-sub">{t('phone.subtitle')}</p>

          <div className="phone-field">
            <span className="phone-flag">
              <RuFlagIcon />
            </span>
            <span className="phone-prefix">+7</span>
            <input
              type="tel"
              inputMode="numeric"
              autoFocus
              placeholder="(777) 123-45-67"
              value={formatNational(digits)}
              onChange={onChange}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button className="form-primary" type="submit" disabled={!valid || loading}>
            {loading ? t('phone.sending') : t('phone.submit')}
          </button>

          <p className="form-note">
            {t('phone.note')}
            <a href="#" onClick={(e) => e.preventDefault()}>
              {t('phone.privacy')}
            </a>
          </p>
        </form>
      </div>
    </Shell>
  )
}
