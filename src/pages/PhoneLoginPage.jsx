import { useState } from 'react'
import Shell from '../components/Shell.jsx'
import { RuFlagIcon } from '../components/icons.jsx'

// Форматирование под маску +7 (___) ___-__-__
function formatPhone(digits) {
  const d = digits.slice(0, 10)
  let out = '+7'
  if (d.length > 0) out += ' (' + d.slice(0, 3)
  if (d.length >= 3) out += ') ' + d.slice(3, 6)
  if (d.length >= 6) out += '-' + d.slice(6, 8)
  if (d.length >= 8) out += '-' + d.slice(8, 10)
  return out
}

export default function PhoneLoginPage({ onBack, onSubmit, loading, error }) {
  const [digits, setDigits] = useState('')

  function onChange(e) {
    let only = e.target.value.replace(/\D/g, '')
    // код страны отбрасываем только если введён целиком (11 цифр с 7/8),
    // чтобы не срезать ведущую 7 у обычного 10-значного номера (777…, 701…)
    if (only.length === 11 && (only[0] === '7' || only[0] === '8')) only = only.slice(1)
    setDigits(only.slice(0, 10))
  }

  const full = '+7' + digits
  const valid = digits.length === 10

  function submit(e) {
    e.preventDefault()
    if (valid && !loading) onSubmit(full)
  }

  return (
    <Shell onBack={onBack}>
      <div className="form-inner">
      <form className="form-card" onSubmit={submit}>
        <h2 className="form-title">Войти по номеру телефона</h2>
        <p className="form-sub">
          Введите свой номер и мы отправим вам СМС с кодом для подтверждения
        </p>

        <div className="phone-field">
          <span className="phone-flag">
            <RuFlagIcon />
          </span>
          <input
            type="tel"
            inputMode="numeric"
            autoFocus
            placeholder="+7 (___) ___-__-__"
            value={digits ? formatPhone(digits) : ''}
            onChange={onChange}
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <button className="form-primary" type="submit" disabled={!valid || loading}>
          {loading ? 'Отправляем…' : 'Войти'}
        </button>

        <p className="form-note">
          Нажимая на кнопку «Войти» вы соглашаетесь с нашей{' '}
          <a href="#" onClick={(e) => e.preventDefault()}>
            политикой конфиденциальности
          </a>
        </p>
      </form>
      </div>
    </Shell>
  )
}
