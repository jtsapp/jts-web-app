import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY, formatNational } from '../../data/countries.js'
import { isGoogleAuthEnabled, renderGoogleButton } from '../../lib/googleAuth.js'
import {
  ArrowForwardIcon,
  ExpandMoreIcon,
  GoogleGIcon,
  ReplayIcon,
  TimerIcon,
  VisibilityIcon,
  VisibilityOffIcon,
} from '../../components/authIcons.jsx'

/**
 * Поле формы по макету: подпись сверху, коробка ввода, под ней одна строка —
 * подсказка серым или ошибка красным. Ошибка вытесняет подсказку, а не встаёт
 * второй строкой: в кадрах «· ошибка» под полем всегда ровно одна строка.
 */
export function Field({ label, htmlFor, hint, error, children }) {
  return (
    <div className={`rg-field${error ? ' is-invalid' : ''}`}>
      {label && (
        <label className="rg-label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {error ? (
        <div className="rg-note rg-note--error" role="alert">
          {error}
        </div>
      ) : (
        hint && <div className="rg-note">{hint}</div>
      )}
    </div>
  )
}

/** Коробка ввода: рамка, фокус и красная рамка ошибки — общие для всех полей. */
export function InputBox({ invalid, children, className = '' }) {
  return <div className={`rg-input${invalid ? ' is-invalid' : ''}${className ? ' ' + className : ''}`}>{children}</div>
}

export function PrimaryButton({ children, arrow = true, disabled, busyLabel, busy }) {
  return (
    <button type="submit" className="rg-btn" disabled={disabled || busy}>
      <span>{busy && busyLabel ? busyLabel : children}</span>
      {arrow && <ArrowForwardIcon />}
    </button>
  )
}

export function OrDivider() {
  const { t } = useI18n()
  return (
    <div className="rg-or" aria-hidden="true">
      <span>{t('auth.or')}</span>
    </div>
  )
}

/** Строка «Уже есть аккаунт? Войти» / «Нет аккаунта? Зарегистрироваться». */
export function SwitchLine({ question, action, onClick }) {
  return (
    <p className="rg-switch">
      {question}{' '}
      <button type="button" className="rg-link" onClick={onClick}>
        {action}
      </button>
    </p>
  )
}

// ─── Телефон ────────────────────────────────────────────────────────────────

/**
 * Полный номер («+77001234567», «77001234567») → страна и национальная часть.
 * Нужен там, где номер уже известен: заявка с лендинга, возврат на шаг назад.
 * Код ищем самый длинный из подходящих — «+998…» не должен прочитаться как +9.
 */
export function splitPhone(full) {
  const raw = String(full || '').replace(/\D/g, '')
  if (!raw) return { country: DEFAULT_COUNTRY, digits: '' }
  const match = COUNTRY_OPTIONS.filter((c) => c.dial && raw.startsWith(c.dial)).sort(
    (a, b) => b.dial.length - a.dial.length,
  )[0]
  if (!match) return { country: COUNTRY_OPTIONS[COUNTRY_OPTIONS.length - 1], digits: raw }
  // У +7 две страны — Казахстан стоит первым и он здесь по умолчанию.
  const country = match.dial === DEFAULT_COUNTRY.dial ? DEFAULT_COUNTRY : match
  return { country, digits: raw.slice(country.dial.length).slice(0, country.max) }
}

export function joinPhone({ country, digits }) {
  return '+' + country.dial + digits
}

/**
 * Номер по макету: «KZ  +7 │ (700) 000-45-67». Код страны — буквами, а не
 * флагом-эмодзи: на Windows флаги рисуются теми же двумя буквами, только
 * криво. По нажатию на код — список стран, как и раньше (студенты не только из
 * Казахстана).
 */
export function PhoneInput({ id, value, onChange, onBlur, invalid, autoFocus }) {
  const { t } = useI18n()
  const { country, digits } = value
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  function onInput(e) {
    let raw = e.target.value.replace(/\D/g, '')
    // Вставили номер целиком с кодом страны — срезаем код; «8 (777)…» — местная запись +7.
    if (country.dial && raw.startsWith(country.dial) && raw.length > country.max) {
      raw = raw.slice(country.dial.length)
    } else if (country.dial === '7' && raw.length === 11 && raw[0] === '8') {
      raw = raw.slice(1)
    }
    onChange({ country, digits: raw.slice(0, country.max) })
  }

  function pick(c) {
    setOpen(false)
    onChange({ country: c, digits: digits.slice(0, c.max) })
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div className="rg-phone" ref={wrapRef}>
      <InputBox invalid={invalid}>
        <button
          type="button"
          className="rg-phone__country"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={t('phone.country')}
        >
          <span className="rg-phone__iso">{country.iso === 'other' ? '' : country.iso.toUpperCase()}</span>
          {country.dial && <span className="rg-phone__dial">+{country.dial}</span>}
          {!country.dial && <ExpandMoreIcon />}
        </button>
        <span className="rg-phone__sep" aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          placeholder={
            !country.dial
              ? t('phone.placeholderAnyCountry')
              : country.dial === '7'
                ? t('rg.phone.placeholder')
                : t('phone.placeholder')
          }
          value={formatNational(country, digits)}
          onChange={onInput}
          onBlur={onBlur}
          aria-invalid={invalid || undefined}
        />
      </InputBox>
      {open && (
        <ul className="rg-phone__menu" role="listbox">
          {COUNTRY_OPTIONS.map((c) => (
            <li key={c.iso}>
              <button
                type="button"
                role="option"
                aria-selected={c.iso === country.iso}
                className={`rg-phone__item${c.iso === country.iso ? ' is-active' : ''}`}
                onClick={() => pick(c)}
              >
                <span className="rg-phone__item-iso">{c.iso === 'other' ? '…' : c.iso.toUpperCase()}</span>
                <span className="rg-phone__item-name">{c.name}</span>
                {c.dial && <span className="rg-phone__item-dial">+{c.dial}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Пароль ─────────────────────────────────────────────────────────────────

export function PasswordInput({ id, value, onChange, invalid, autoComplete, autoFocus }) {
  const { t } = useI18n()
  const [shown, setShown] = useState(false)
  return (
    <InputBox invalid={invalid}>
      <input
        id={id}
        type={shown ? 'text' : 'password'}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
      />
      <button
        type="button"
        className="rg-input__icon"
        onClick={() => setShown((s) => !s)}
        aria-label={t(shown ? 'rg.pass.hide' : 'rg.pass.show')}
        aria-pressed={shown}
      >
        {shown ? <VisibilityOffIcon /> : <VisibilityIcon />}
      </button>
    </InputBox>
  )
}

// ─── Код из письма / SMS ────────────────────────────────────────────────────

export const CODE_LENGTH = 4

/**
 * Четыре ячейки кода. Проверка — сама, после четвёртой цифры (в макете кнопки
 * нет вовсе: «Проверим автоматически — кнопка не нужна»).
 *
 * После ошибки ячейки остаются красными с набранным, а первая же новая цифра
 * начинает код заново — стирать четыре красные цифры по одной никто не станет.
 */
export function CodeCells({ error, disabled, onComplete, onEdit }) {
  const [digits, setDigits] = useState(() => Array(CODE_LENGTH).fill(''))
  const inputs = useRef([])
  const restart = useRef(false)

  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (!error) return
    restart.current = true
    inputs.current[0]?.focus()
  }, [error])

  function apply(next, focusAt) {
    setDigits(next)
    if (focusAt != null) inputs.current[focusAt]?.focus()
    const code = next.join('')
    if (code.length === CODE_LENGTH && next.every(Boolean)) onComplete?.(code)
  }

  function onChange(i, e) {
    const typed = e.target.value.replace(/\D/g, '')
    // Новая попытка после ошибки — с чистого листа и с первой ячейки.
    const fresh = restart.current && Boolean(typed)
    if (fresh) restart.current = false
    if (error) onEdit?.()
    const at = fresh ? 0 : i
    const next = fresh ? Array(CODE_LENGTH).fill('') : [...digits]
    if (!typed) {
      next[at] = ''
      setDigits(next)
      return
    }
    // Курсор встал за цифрой — пришли «старая + новая», нужна только новая.
    // Длиннее — это вставка или автоподстановка из SMS: раскладываем по ячейкам.
    const chars =
      typed.length === 2 && next[at] && typed[0] === next[at] ? [typed[1]] : typed.slice(0, CODE_LENGTH - at).split('')
    chars.forEach((c, k) => {
      next[at + k] = c
    })
    const last = at + chars.length
    apply(next, last < CODE_LENGTH ? last : null)
  }

  function onKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      e.preventDefault()
      const next = [...digits]
      next[i - 1] = ''
      setDigits(next)
      inputs.current[i - 1]?.focus()
    }
  }

  // Фокус живёт на первой пустой ячейке: в макете у неё фиолетовая рамка.
  const firstEmpty = digits.findIndex((d) => !d)

  return (
    <div className={`rg-code${error ? ' is-invalid' : ''}`}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el
          }}
          className={`rg-code__cell${d ? ' is-filled' : ''}${i === firstEmpty ? ' is-next' : ''}`}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          value={d}
          disabled={disabled}
          onFocus={(e) => e.target.select()}
          onChange={(e) => onChange(i, e)}
          onKeyDown={(e) => onKeyDown(i, e)}
          aria-label={`${i + 1} / ${CODE_LENGTH}`}
          aria-invalid={error ? true : undefined}
        />
      ))}
    </div>
  )
}

/** «Отправить повторно через 0:42» → по нулю «Отправить код повторно». */
export function ResendPill({ seconds, onResend }) {
  const { t } = useI18n()
  if (seconds > 0) {
    const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
    return (
      <div className="rg-resend" aria-live="polite">
        <TimerIcon />
        <span>{t('rg.code.resendIn', { time })}</span>
      </div>
    )
  }
  return (
    <button type="button" className="rg-resend rg-resend--ready" onClick={onResend}>
      <ReplayIcon />
      <span>{t('rg.code.resend')}</span>
    </button>
  )
}

// ─── Google ─────────────────────────────────────────────────────────────────

const GIS_MAX_WIDTH = 400
const GIS_HEIGHT = 40

/**
 * Кнопка Google по макету. id_token Google отдаёт только своей кнопке (GIS
 * renderButton) — стилизовать её нельзя, а своя кнопка токена не получит.
 * Поэтому видна кнопка макета, а поверх неё лежит настоящая кнопка GIS,
 * растянутая под тот же размер и прозрачная: нажатие попадает в неё.
 *
 * Без client ID (локально) или пока GIS не загрузился — кнопка макета
 * неактивна: молча не реагировать на нажатие хуже.
 */
export function GoogleButton({ label, text = 'continue_with', onToken }) {
  const { lang } = useI18n()
  const boxRef = useRef(null)
  const slotRef = useRef(null)
  const [ready, setReady] = useState(false)
  const onTokenRef = useRef(onToken)
  useEffect(() => {
    onTokenRef.current = onToken
  })

  useEffect(() => {
    if (!isGoogleAuthEnabled()) return
    let cancelled = false
    const width = Math.min(GIS_MAX_WIDTH, Math.round(boxRef.current?.clientWidth || GIS_MAX_WIDTH))
    renderGoogleButton(slotRef.current, (idToken) => onTokenRef.current?.(idToken), lang, { text, width })
      .then((ok) => {
        if (!cancelled && ok) setReady(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [lang, text])

  // Растягиваем кнопку GIS на всю кнопку макета (у GIS ширина не больше 400).
  useLayoutEffect(() => {
    if (!ready) return
    const box = boxRef.current
    const slot = slotRef.current
    if (!box || !slot) return
    const fit = () => {
      const inner = slot.firstElementChild
      const w = inner?.offsetWidth || GIS_MAX_WIDTH
      const h = inner?.offsetHeight || GIS_HEIGHT
      slot.style.transform = `scale(${box.clientWidth / w}, ${box.clientHeight / h})`
    }
    fit()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null
    ro?.observe(box)
    return () => ro?.disconnect()
  }, [ready])

  return (
    <div className="rg-google" ref={boxRef}>
      <button type="button" className="rg-btn rg-btn--outline" disabled={!ready} tabIndex={-1} aria-hidden={ready || undefined}>
        <GoogleGIcon />
        <span>{label}</span>
      </button>
      <div className="rg-google__gis" ref={slotRef} />
    </div>
  )
}
