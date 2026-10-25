import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { isEmailIdentifier } from '../../api.js'
import { formatNational } from '../../data/countries.js'
import AuthLayout, { AuthHeading } from './AuthLayout.jsx'
import { CodeCells, ResendPill, splitPhone } from './fields.jsx'

const RESEND_SECONDS = 60

/** Номер для строки «Отправили SMS на +7 (700) 000-45-67». */
function prettyPhone(full) {
  const { country, digits } = splitPhone(full)
  return country.dial ? `+${country.dial} ${formatNational(country, digits)}` : `+${digits}`
}

/**
 * Код из письма или SMS (макеты «Код из письма», «Код из SMS»): четыре ячейки,
 * проверка сама после четвёртой цифры, таймер повторной отправки.
 *
 * Куда ушёл код, видно по адресату `to`: регистрация шлёт его на почту, вход
 * по коду — туда, что ввели (номер или почту). «Изменить» возвращает на шаг,
 * где адрес вводили.
 */
export default function CodeStep({ to, title, step, total, onBack, onChangeTo, onSubmit, onResend, onEdit, busy, error }) {
  const { t } = useI18n()
  const byEmail = isEmailIdentifier(to)
  const [seconds, setSeconds] = useState(RESEND_SECONDS)

  useEffect(() => {
    if (seconds <= 0) return undefined
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [seconds])

  function resend() {
    setSeconds(RESEND_SECONDS)
    onResend?.()
  }

  return (
    <AuthLayout step={step} total={total} onBack={onBack} busy={busy}>
      <AuthHeading title={title || t(byEmail ? 'rg.code.titleEmail' : 'rg.code.titlePhone')} />
      <p className="rg-to">
        <span>{t(byEmail ? 'rg.code.sentEmail' : 'rg.code.sentSms', { to: byEmail ? to : prettyPhone(to) })}</span>
        {onChangeTo && (
          <button type="button" className="rg-link" onClick={onChangeTo}>
            {t('rg.code.change')}
          </button>
        )}
      </p>
      <CodeCells error={Boolean(error)} disabled={busy} onComplete={onSubmit} onEdit={onEdit} />
      {error && (
        <div className="rg-note rg-note--error rg-note--center" role="alert">
          {error}
        </div>
      )}
      <div className="rg-resend-wrap">
        <ResendPill seconds={seconds} onResend={resend} />
      </div>
      <p className="rg-fine" aria-live="polite">
        {busy ? t('otp.checking') : t('rg.code.auto')}
      </p>
    </AuthLayout>
  )
}
