import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import AuthLayout, { AuthHeading } from './AuthLayout.jsx'
import { Field, PasswordInput, PrimaryButton } from './fields.jsx'

const MIN_LEN = 6 // совпадает с @Size(min = 6) в SetPasswordRequest на бэкенде

/**
 * Последний шаг саморегистрации: аккаунт уже создан по коду, но пароля у него
 * нет вовсе (RegistrationService пишет null) — войти потом можно было бы
 * только новым кодом. Пропустить шаг нельзя намеренно, поэтому и «назад» нет.
 */
export default function PasswordStep({ step, total, onSubmit, busy, error }) {
  const { t } = useI18n()
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [tried, setTried] = useState(false)

  const tooShort = password.length < MIN_LEN
  // Несовпадение видно, как только повтор набран не короче пароля — раньше это
  // просто недописанный повтор, а не ошибка.
  const mismatch = password !== repeat && (tried || repeat.length >= password.length) && repeat.length > 0
  const emptyRepeat = tried && !repeat

  function submit() {
    setTried(true)
    if (tooShort || password !== repeat) return
    onSubmit(password)
  }

  return (
    <AuthLayout
      step={step}
      total={total}
      onSubmit={submit}
      busy={busy}
      actions={
        <>
          {error && (
            <div className="rg-note rg-note--error rg-note--center" role="alert">
              {error}
            </div>
          )}
          <PrimaryButton busy={busy} busyLabel={t('setpass.saving')}>
            {t('setpass.submit')}
          </PrimaryButton>
        </>
      }
    >
      <AuthHeading title={t('rg.pass.title')} sub={t('setpass.subtitle')} />
      <Field
        label={t('rg.pass.label')}
        htmlFor="rg-pass"
        hint={t('setpass.tooShort', { n: String(MIN_LEN) })}
        error={tried && tooShort ? t('setpass.tooShort', { n: String(MIN_LEN) }) : null}
      >
        <PasswordInput
          id="rg-pass"
          autoFocus
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          invalid={tried && tooShort}
        />
      </Field>
      <Field
        label={t('rg.pass.repeat')}
        htmlFor="rg-pass2"
        error={mismatch || emptyRepeat ? t('setpass.mismatch') : null}
      >
        <PasswordInput
          id="rg-pass2"
          autoComplete="new-password"
          value={repeat}
          onChange={setRepeat}
          invalid={mismatch || emptyRepeat}
        />
      </Field>
    </AuthLayout>
  )
}
