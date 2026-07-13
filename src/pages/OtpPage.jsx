import { useState, useRef, useEffect } from 'react'
import Shell from '../components/Shell.jsx'
import Multiline from '../components/Multiline.jsx'
import { useI18n } from '../i18n.jsx'

const LENGTH = 4

export default function OtpPage({ phone, onBack, onSubmit, onResend, loading, error }) {
  const { t } = useI18n()
  const [digits, setDigits] = useState(Array(LENGTH).fill(''))
  const [seconds, setSeconds] = useState(60)
  const inputs = useRef([])

  // Таймер повторной отправки
  useEffect(() => {
    if (seconds <= 0) return
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])

  useEffect(() => {
    if (inputs.current[0]) inputs.current[0].focus()
  }, [])

  const code = digits.join('')
  const valid = code.length === LENGTH

  function setAt(i, val) {
    setDigits((prev) => {
      const next = [...prev]
      next[i] = val
      return next
    })
  }

  function onChange(i, e) {
    const v = e.target.value.replace(/\D/g, '')
    if (!v) {
      setAt(i, '')
      return
    }
    // поддержка вставки кода целиком
    if (v.length > 1) {
      const chars = v.slice(0, LENGTH).split('')
      setDigits((prev) => {
        const next = [...prev]
        chars.forEach((c, k) => {
          if (i + k < LENGTH) next[i + k] = c
        })
        return next
      })
      const last = Math.min(i + chars.length, LENGTH - 1)
      inputs.current[last]?.focus()
      return
    }
    setAt(i, v)
    if (i < LENGTH - 1) inputs.current[i + 1]?.focus()
  }

  function onKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus()
      setAt(i - 1, '')
    }
    if (e.key === 'Enter' && valid) submit(e)
  }

  function submit(e) {
    e.preventDefault()
    if (valid && !loading) onSubmit(code)
  }

  function resend() {
    if (seconds > 0) return
    setDigits(Array(LENGTH).fill(''))
    setSeconds(60)
    onResend?.()
    inputs.current[0]?.focus()
  }

  return (
    <Shell onBack={onBack}>
      <div className="form-inner">
      <form className="form-card" onSubmit={submit}>
        <h2 className="form-title">
          <Multiline text={t('otp.title')} />
        </h2>
        <p className="form-sub">{t('otp.subtitle')}</p>

        <div className="otp-row">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputs.current[i] = el)}
              className={`otp-box ${d ? 'otp-box--filled' : ''}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => onChange(i, e)}
              onKeyDown={(e) => onKeyDown(i, e)}
              aria-label={`Цифра ${i + 1}`}
            />
          ))}
        </div>

        {error && <div className="form-error">{error}</div>}

        <button className="form-primary" type="submit" disabled={!valid || loading}>
          {loading ? t('otp.checking') : t('otp.submit')}
        </button>

        <p className="form-note form-note--center">
          {seconds > 0 ? (
            t('otp.resendIn', { sec: seconds })
          ) : (
            <a href="#" onClick={(e) => { e.preventDefault(); resend() }}>
              {t('otp.resend')}
            </a>
          )}
        </p>
      </form>
      </div>
    </Shell>
  )
}
