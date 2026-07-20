import { useState, useRef, useEffect } from 'react'
import Shell from '../components/Shell.jsx'
import { ChevronRightIcon } from '../components/icons.jsx'
import { useI18n } from '../i18n.jsx'
import Multiline from '../components/Multiline.jsx'
import { isGoogleAuthEnabled, renderGoogleButton } from '../lib/googleAuth.js'
import { COUNTRIES, DEFAULT_COUNTRY, formatNational, isNationalComplete } from '../data/countries.js'

export default function PhoneLoginPage({ onBack, onSubmit, onGoogleToken, loading, error }) {
  const { t, lang } = useI18n()
  const [country, setCountry] = useState(DEFAULT_COUNTRY)
  const [digits, setDigits] = useState('') // только цифры нац. номера, без кода страны
  const [pickerOpen, setPickerOpen] = useState(false)
  const [googleReady, setGoogleReady] = useState(false)
  const googleRef = useRef(null)
  const pickerRef = useRef(null)
  const inputRef = useRef(null)

  // Google-вход и здесь: пользователи, зарегистрированные через Google, не
  // имеют телефона и войти по OTP не могут. Перерисовка — при смене языка.
  useEffect(() => {
    if (!isGoogleAuthEnabled()) return
    let cancelled = false
    renderGoogleButton(googleRef.current, (idToken) => onGoogleToken?.(idToken), lang)
      .then((ok) => {
        if (!cancelled && ok) setGoogleReady(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  // Закрытие выпадашки по клику вне неё.
  useEffect(() => {
    if (!pickerOpen) return
    function onDoc(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [pickerOpen])

  function onChange(e) {
    let raw = e.target.value.replace(/\D/g, '')
    // Вставили номер целиком с кодом страны — срезаем код.
    if (raw.startsWith(country.dial) && raw.length > country.max) {
      raw = raw.slice(country.dial.length)
    } else if (country.dial === '7' && raw.length === 11 && raw[0] === '8') {
      // «8 (777)…» — местная запись кода +7.
      raw = raw.slice(1)
    }
    setDigits(raw.slice(0, country.max))
  }

  function pickCountry(c) {
    setCountry(c)
    setPickerOpen(false)
    setDigits((d) => d.slice(0, c.max))
    // Возвращаем фокус в поле — код выбран, осталось дописать номер.
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const valid = isNationalComplete(country, digits)

  function submit(e) {
    e.preventDefault()
    if (valid && !loading) onSubmit('+' + country.dial + digits)
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
            <div className="phone-country" ref={pickerRef}>
              <button
                type="button"
                className="phone-country__btn"
                onClick={() => setPickerOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={pickerOpen}
                aria-label={t('phone.country')}
              >
                <span className="phone-country__flag">{country.flag}</span>
                <span className="phone-country__dial">+{country.dial}</span>
                <span className={`phone-country__chev ${pickerOpen ? 'is-open' : ''}`}>
                  <ChevronRightIcon size={14} />
                </span>
              </button>

              {pickerOpen && (
                <ul className="phone-country__menu" role="listbox">
                  {COUNTRIES.map((c) => (
                    <li key={c.iso}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={c.iso === country.iso}
                        className={`phone-country__item ${c.iso === country.iso ? 'is-active' : ''}`}
                        onClick={() => pickCountry(c)}
                      >
                        <span className="phone-country__flag">{c.flag}</span>
                        <span className="phone-country__name">{c.name}</span>
                        <span className="phone-country__code">+{c.dial}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              autoFocus
              placeholder={t('phone.placeholder')}
              value={formatNational(country, digits)}
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

          {googleReady && <div className="auth-divider">{t('auth.or')}</div>}
          <div
            className="google-slot google-slot--center"
            ref={googleRef}
            style={googleReady ? undefined : { display: 'none' }}
          />
        </form>
      </div>
    </Shell>
  )
}
