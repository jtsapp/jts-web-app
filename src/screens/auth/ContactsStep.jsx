import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { isEmailIdentifier } from '../../api.js'
import { isNationalComplete } from '../../data/countries.js'
import { legalDocumentUrl } from '../../lib/legalDocuments.js'
import AuthLayout, { AuthHeading } from './AuthLayout.jsx'
import {
  Field,
  GoogleButton,
  InputBox,
  OrDivider,
  PhoneInput,
  PrimaryButton,
  joinPhone,
  splitPhone,
} from './fields.jsx'

/**
 * «Как с вами связаться?»: почта и телефон на одном экране. Код уходит на
 * почту (RegistrationService шлёт его туда, когда есть оба поля), номер нужен
 * для связи с куратором.
 *
 * В макете следом идёт ещё и код из SMS, но бэкенд при регистрации проверяет
 * только почту — шаг SMS отложен (решение владельца 21.10.2026), поэтому и
 * тексты здесь про один код, а не «на почту и в SMS».
 *
 * serverError — ответ бэкенда на запрос кода: { field: 'email'|'phone'|null,
 * text }. Занятая почта или номер встают под своё поле со ссылкой «Войти».
 */
export default function ContactsStep({
  step,
  total,
  initialEmail = '',
  initialPhone = '',
  onBack,
  onSubmit,
  onGoogleToken,
  onLogin,
  onEdit,
  busy,
  serverError,
}) {
  const { t, lang } = useI18n()
  const [email, setEmail] = useState(initialEmail)
  const [phone, setPhone] = useState(() => splitPhone(initialPhone))
  const [tried, setTried] = useState(false)
  const [phoneLeft, setPhoneLeft] = useState(false)

  const emailProblem = isEmailIdentifier(email) ? null : 'rg.email.invalid'
  const phoneProblem = isNationalComplete(phone.country, phone.digits) ? null : 'regphone.invalid'
  // «Проверка формата на лету»: недобранный номер подсвечиваем, как только из
  // поля ушли, — не дожидаясь кнопки. Пока набирают, не дёргаем.
  const showPhone = phoneProblem && (tried || (phoneLeft && phone.digits.length > 0))

  const emailTaken = serverError?.field === 'email'
  const phoneTaken = serverError?.field === 'phone'
  const generic = serverError && !emailTaken && !phoneTaken ? serverError.text : null

  function edit(fn) {
    return (v) => {
      fn(v)
      if (serverError) onEdit?.()
    }
  }

  function submit() {
    setTried(true)
    if (emailProblem || phoneProblem) return
    onSubmit(email.trim(), joinPhone(phone))
  }

  const takenLine = (text) => (
    <span className="rg-note__row">
      {text}{' '}
      <button type="button" className="rg-link rg-link--sm" onClick={onLogin}>
        {t('rg.signIn')}
      </button>
    </span>
  )

  return (
    <AuthLayout
      step={step}
      total={total}
      onBack={onBack}
      onSubmit={submit}
      busy={busy}
      actions={
        <>
          {generic && (
            <div className="rg-note rg-note--error rg-note--center" role="alert">
              {generic}
            </div>
          )}
          <PrimaryButton busy={busy} busyLabel={t('rg.sending')}>
            {t('rg.continue')}
          </PrimaryButton>
          {onGoogleToken && (
            <>
              <OrDivider />
              <GoogleButton label={t('rg.google.continue')} text="continue_with" onToken={onGoogleToken} />
            </>
          )}
          <p className="rg-consent">
            {t('rg.consent')}
            <a href={legalDocumentUrl('privacy', lang)} target="_blank" rel="noopener noreferrer">
              {t('rg.privacy')}
            </a>
          </p>
        </>
      }
    >
      <AuthHeading title={t('rg.contacts.title')} sub={t('rg.contacts.sub')} />

      <Field
        label={t('rg.email.label')}
        htmlFor="rg-email"
        hint={t('rg.email.hint')}
        error={emailTaken ? takenLine(t('rg.email.taken')) : tried && emailProblem ? t(emailProblem) : null}
      >
        <InputBox invalid={emailTaken || (tried && Boolean(emailProblem))}>
          <input
            id="rg-email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus={!initialEmail}
            placeholder="name@mail.com"
            value={email}
            onChange={(e) => edit(setEmail)(e.target.value)}
          />
        </InputBox>
      </Field>

      <Field
        label={t('rg.phone.label')}
        htmlFor="rg-phone"
        hint={t('rg.phone.hint')}
        error={phoneTaken ? takenLine(t('rg.phone.taken')) : showPhone ? t(phoneProblem) : null}
      >
        <PhoneInput
          id="rg-phone"
          value={phone}
          onChange={edit(setPhone)}
          onBlur={() => setPhoneLeft(true)}
          invalid={phoneTaken || Boolean(showPhone)} />
      </Field>
    </AuthLayout>
  )
}
