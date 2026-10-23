import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import BirthDateInput from '../../components/BirthDateInput.jsx'
import { CalendarMonthIcon } from '../../components/authIcons.jsx'
import { birthDateProblem } from '../../lib/birthDate.js'
import AuthLayout, { AuthHeading } from './AuthLayout.jsx'
import { Field, InputBox, PrimaryButton, SwitchLine } from './fields.jsx'

/**
 * Шаг «Давайте знакомиться»: имя и дата рождения на одном экране. Раньше это
 * был чат с Декстером и отдельный шаг даты; теперь Декстер — одна реплика над
 * полями (макет «Знакомство»).
 *
 * Дата нужна бэкенду ещё до кода (`birthDate` в /registration/initiate —
 * @NotNull), поэтому собираем её здесь, а не после входа.
 */
export default function NameStep({ step, total, initialName = '', initialBirth = '', onBack, onSubmit, onLogin }) {
  const { t } = useI18n()
  const [name, setName] = useState(initialName)
  const [birth, setBirth] = useState(initialBirth)
  // Ошибки показываем после первой попытки отправить, дальше — на лету. Дату —
  // ещё и как только она набрана целиком: «Регистрация с 6 лет» нужна сразу.
  const [tried, setTried] = useState(false)

  const nameProblem = name.trim() ? null : 'rg.name.required'
  const birthKey = birth ? birthDateProblem(birth) : 'required'
  const birthProblem = birthKey ? (birthKey === 'required' ? 'rg.birth.required' : `regbirth.${birthKey}`) : null
  const showBirth = birthProblem && (tried || (birth && birthKey !== 'required'))

  function submit() {
    setTried(true)
    if (nameProblem || birthProblem) return
    onSubmit(name.trim(), birth)
  }

  return (
    <AuthLayout
      step={step}
      total={total}
      onBack={onBack}
      onSubmit={submit}
      actions={
        <>
          <PrimaryButton>{t('rg.continue')}</PrimaryButton>
          {onLogin && <SwitchLine question={t('rg.haveAccount')} action={t('rg.signIn')} onClick={onLogin} />}
        </>
      }
    >
      <AuthHeading title={t('rg.name.title')} sub={t('rg.name.sub')} />

      <div className="rg-dexter">
        <img className="rg-dexter__avatar" src="/assets/reg/v2/dexter.webp" alt="" width="60" height="60" />
        <div className="rg-dexter__bubble">
          <span className="rg-dexter__who">{t('rg.dexter.who')}</span>
          <p className="rg-dexter__text">{t('rg.dexter.hello')}</p>
        </div>
      </div>

      <Field label={t('rg.name.label')} htmlFor="rg-name" error={tried && nameProblem ? t(nameProblem) : null}>
        <InputBox invalid={tried && Boolean(nameProblem)}>
          <input
            id="rg-name"
            type="text"
            autoComplete="given-name"
            autoFocus={!initialName}
            maxLength={100}
            placeholder={t('rg.name.placeholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </InputBox>
      </Field>

      <Field
        label={t('regbirth.label')}
        htmlFor="rg-birth"
        hint={t('rg.birth.hint')}
        error={showBirth ? t(birthProblem) : null}
      >
        <div className={`rg-dob${showBirth ? ' is-invalid' : ''}`}>
          <BirthDateInput
            id="rg-birth"
            autoFocus={Boolean(initialName)}
            value={birth}
            onChange={setBirth}
            pickerIcon={<CalendarMonthIcon />}
          />
        </div>
      </Field>
    </AuthLayout>
  )
}
