import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import BirthDateInput from '../../components/BirthDateInput.jsx'
import { CalendarMonthIcon } from '../../components/authIcons.jsx'
import { isNationalComplete } from '../../data/countries.js'
import { birthDateProblem } from '../../lib/birthDate.js'
import AuthLayout, { AuthHeading } from './AuthLayout.jsx'
import { Field, PhoneInput, PrimaryButton, joinPhone, splitPhone } from './fields.jsx'

/**
 * «Остался один шаг» после входа через Google (макет «Вход через Google»).
 * Google не отдаёт ни номер, ни дату рождения, а школе нужно и то и другое:
 * номер — для связи и CRM, дата — бэкенду (@NotNull в регистрации). Дальше
 * этого экрана такой ученик не идёт, поэтому кнопки «назад» нет.
 *
 * Спрашиваем только то, чего в профиле нет: у ученика, вошедшего через Google
 * давно, дата может быть, а номера — нет (и наоборот).
 *
 * В макете следом идёт код из SMS — он отложен вместе с шагом SMS регистрации:
 * номер сохраняется без подтверждения, как и раньше.
 */
export default function GoogleGateStep({ needPhone, needBirth, initialPhone = '', onSubmit, onEdit, busy, error }) {
  const { t } = useI18n()
  const [phone, setPhone] = useState(() => splitPhone(initialPhone))
  const [birth, setBirth] = useState('')
  const [tried, setTried] = useState(false)

  const phoneProblem = needPhone && !isNationalComplete(phone.country, phone.digits) ? 'regphone.invalid' : null
  const birthKey = !needBirth ? null : birth ? birthDateProblem(birth) : 'required'
  const birthProblem = birthKey ? (birthKey === 'required' ? 'rg.birth.required' : `regbirth.${birthKey}`) : null
  const showBirth = birthProblem && (tried || (birth && birthKey !== 'required'))

  const sub = needPhone && needBirth ? 'rg.google.sub' : needPhone ? 'rg.google.subPhone' : 'rg.google.subBirth'

  function submit() {
    setTried(true)
    if (phoneProblem || birthProblem) return
    onSubmit({ phone: needPhone ? joinPhone(phone) : null, birthDate: needBirth ? birth : null })
  }

  return (
    <AuthLayout
      onSubmit={submit}
      busy={busy}
      actions={
        <>
          {error && (
            <div className="rg-note rg-note--error rg-note--center" role="alert">
              {error}
            </div>
          )}
          <PrimaryButton busy={busy} busyLabel={t('regphone.saving')}>
            {t('rg.continue')}
          </PrimaryButton>
        </>
      }
    >
      <AuthHeading title={t('rg.google.title')} sub={t(sub)} />
      {needPhone && (
        <Field label={t('rg.phone.label')} htmlFor="rg-gphone" error={tried && phoneProblem ? t(phoneProblem) : null}>
          <PhoneInput
            id="rg-gphone"
            autoFocus
            value={phone}
            onChange={(v) => {
              setPhone(v)
              if (error) onEdit?.()
            }}
            invalid={tried && Boolean(phoneProblem)}
          />
        </Field>
      )}
      {needBirth && (
        <Field label={t('regbirth.label')} htmlFor="rg-gbirth" error={showBirth ? t(birthProblem) : null}>
          <div className={`rg-dob${showBirth ? ' is-invalid' : ''}`}>
            <BirthDateInput
              id="rg-gbirth"
              autoFocus={!needPhone}
              value={birth}
              onChange={setBirth}
              pickerIcon={<CalendarMonthIcon />}
            />
          </div>
        </Field>
      )}
    </AuthLayout>
  )
}
