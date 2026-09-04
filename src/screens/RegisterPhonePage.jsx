import { useRef, useState, useEffect } from 'react'
import Shell from '../components/Shell.jsx'
import { ChevronRightIcon } from '../components/icons.jsx'
import { useI18n } from '../i18n.jsx'
import Multiline from '../components/Multiline.jsx'
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY, formatNational, isNationalComplete } from '../data/countries.js'

/**
 * Шаг 1 саморегистрации: номер телефона. Код подтверждения сюда не идёт —
 * следом собираем почту (RegisterEmailPage), и именно на неё бэкенд шлёт OTP
 * (см. RegistrationService: email — канал по умолчанию, когда есть оба поля).
 * Порядок: номер → почта → код на почту → пароль.
 */
export default function RegisterPhonePage({ onBack, onSubmit, loading, error }) {
  const { t } = useI18n()
  const [country, setCountry] = useState(DEFAULT_COUNTRY)
  const [digits, setDigits] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef(null)
  const inputRef = useRef(null)

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
    if (raw.startsWith(country.dial) && raw.length > country.max) {
      raw = raw.slice(country.dial.length)
    } else if (country.dial === '7' && raw.length === 11 && raw[0] === '8') {
      raw = raw.slice(1)
    }
    setDigits(raw.slice(0, country.max))
  }

  function pickCountry(c) {
    setCountry(c)
    setPickerOpen(false)
    setDigits((d) => d.slice(0, c.max))
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const valid = isNationalComplete(country, digits)

  function submit(e) {
    e.preventDefault()
    if (!valid || loading) return
    onSubmit('+' + country.dial + digits)
  }

  return (
    <Shell onBack={onBack}>
      <div className="form-inner">
        <form className="form-card" onSubmit={submit}>
          <h2 className="form-title">
            <Multiline text={t('regphone.title')} />
          </h2>
          <p className="form-sub">{t('regphone.subtitle')}</p>

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
                  {COUNTRY_OPTIONS.map((c) => (
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
                        {/* У «другой страны» кода нет — его набирают в самом поле,
                            и голый «+» рядом с названием читался бы как ошибка. */}
                        {c.dial && <span className="phone-country__code">+{c.dial}</span>}
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
              placeholder={country.dial ? t('phone.placeholder') : t('phone.placeholderAnyCountry')}
              value={formatNational(country, digits)}
              onChange={onChange}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button className="form-primary" type="submit" disabled={!valid || loading}>
            {loading ? t('regphone.saving') : t('regphone.submit')}
          </button>
        </form>
      </div>
    </Shell>
  )
}
