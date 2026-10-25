import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { isEmailIdentifier } from '../../api.js'
import AuthLayout, { AuthHeading } from './AuthLayout.jsx'
import { Field, GoogleButton, InputBox, OrDivider, PasswordInput, PrimaryButton, SwitchLine } from './fields.jsx'

/**
 * Вход (макеты «Вход · пароль», «Вход · ошибка», «Вход · по коду»). Основной
 * путь — телефон или почта и пароль: бэкенд принимает оба (LoginRequest), что
 * именно ввели, решает api.js по «@». Вход по коду — запасной: у аккаунтов,
 * заведённых до шага «придумайте пароль», пароля нет вовсе.
 *
 * Поле идентификатора — text, а не tel: на мобильной клавиатуре для tel почту
 * не набрать.
 */
/**
 * Номер без кода страны — «777 123 45 67» — казахстанский: поле одно, выбора
 * страны в нём нет (макет), а прежний экран входа по коду ставил +7 сам. Без
 * этого десять цифр ушли бы как есть, и бэкенд не нашёл бы «7XXXXXXXXXX».
 */
export function loginIdentifier(raw) {
  const trimmed = String(raw || '').trim()
  if (isEmailIdentifier(trimmed)) return trimmed
  const digits = trimmed.replace(/\D/g, '')
  return digits.length === 10 ? '+7' + digits : trimmed
}

function IdentifierField({ value, onChange, autoFocus, error = null }) {
  const { t } = useI18n()
  return (
    <Field label={t('login.identifierPlaceholder')} htmlFor="rg-login-id" error={error}>
      <InputBox invalid={Boolean(error)}>
        <input
          id="rg-login-id"
          type="text"
          inputMode="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </InputBox>
    </Field>
  )
}

function LoginExtras({ onGoogleToken, onRegister }) {
  const { t } = useI18n()
  return (
    <>
      {onGoogleToken && (
        <>
          <OrDivider />
          <GoogleButton label={t('rg.google.signin')} text="signin_with" onToken={onGoogleToken} />
        </>
      )}
      {onRegister && <SwitchLine question={t('rg.noAccount')} action={t('rg.register')} onClick={onRegister} />}
    </>
  )
}

export function LoginPasswordScreen({ onBack, onSubmit, onCodeLogin, onGoogleToken, onRegister, onEdit, busy, error }) {
  const { t } = useI18n()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  // Телефон не проверяем по маске: здесь и почта, и номер в любом разумном
  // виде — нормализует api.js, неверное отсеет бэкенд.
  const valid = identifier.trim().length >= 5 && password.length > 0

  function edit(fn) {
    return (v) => {
      fn(v)
      if (error) onEdit?.()
    }
  }

  return (
    <AuthLayout
      onBack={onBack}
      busy={busy}
      onSubmit={() => valid && onSubmit(loginIdentifier(identifier), password)}
      actions={
        <>
          <PrimaryButton arrow={false} disabled={!valid} busy={busy} busyLabel={t('login.submitting')}>
            {t('login.submit')}
          </PrimaryButton>
          {onCodeLogin && (
            <button type="button" className="rg-link rg-alt" onClick={onCodeLogin}>
              {t('login.useOtp')}
            </button>
          )}
          <LoginExtras onGoogleToken={onGoogleToken} onRegister={onRegister} />
        </>
      }
    >
      <AuthHeading title={t('rg.login.title')} sub={t('login.subtitle')} />
      <IdentifierField value={identifier} onChange={edit(setIdentifier)} autoFocus />
      <Field label={t('rg.pass.label')} htmlFor="rg-login-pass" error={error || null}>
        <PasswordInput
          id="rg-login-pass"
          autoComplete="current-password"
          value={password}
          onChange={edit(setPassword)}
          invalid={Boolean(error)}
        />
      </Field>
    </AuthLayout>
  )
}

export function LoginCodeScreen({ onBack, onSubmit, onPasswordLogin, onGoogleToken, onRegister, onEdit, busy, error }) {
  const { t } = useI18n()
  const [identifier, setIdentifier] = useState('')
  const valid = identifier.trim().length >= 5

  return (
    <AuthLayout
      onBack={onBack}
      busy={busy}
      onSubmit={() => valid && onSubmit(loginIdentifier(identifier))}
      actions={
        <>
          <PrimaryButton arrow={false} disabled={!valid} busy={busy} busyLabel={t('rg.sending')}>
            {t('rg.code.get')}
          </PrimaryButton>
          {onPasswordLogin && (
            <button type="button" className="rg-link rg-alt" onClick={onPasswordLogin}>
              {t('rg.login.withPassword')}
            </button>
          )}
          <LoginExtras onGoogleToken={onGoogleToken} onRegister={onRegister} />
        </>
      }
    >
      <AuthHeading title={t('rg.code.loginTitle')} sub={t('rg.code.loginSub')} />
      <IdentifierField
        value={identifier}
        onChange={(v) => {
          setIdentifier(v)
          if (error) onEdit?.()
        }}
        autoFocus
        error={error || null}
      />
    </AuthLayout>
  )
}
