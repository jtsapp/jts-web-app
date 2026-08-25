import { useState } from 'react'
import Shell from '../components/Shell.jsx'
import { useI18n } from '../i18n.jsx'
import Multiline from '../components/Multiline.jsx'

/**
 * Основной вход: телефон ИЛИ почта + пароль. Бэкенд принимает оба поля
 * (см. LoginRequest/AuthService), поэтому здесь одно поле идентификатора —
 * что именно ввели, определяет api.js по наличию «@».
 *
 * Вход по коду никуда не делся и доступен ссылкой ниже: аккаунты, заведённые
 * саморегистрацией до появления этого экрана, пароля не имеют вовсе, и отнимать
 * у них единственный способ войти нельзя.
 */
export default function PasswordLoginPage({ onBack, onSubmit, onOtpLogin, loading, error }) {
  const { t } = useI18n()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)

  // Телефон не валидируем по маске: здесь принимаем и почту, и номер в любом
  // разумном виде — нормализацией занимается api.js, а неверный идентификатор
  // всё равно отсеет бэкенд.
  const valid = identifier.trim().length >= 5 && password.length > 0

  function submit(e) {
    e.preventDefault()
    if (!valid || loading) return
    onSubmit(identifier.trim(), password)
  }

  return (
    <Shell onBack={onBack}>
      <div className="form-inner">
        <form className="form-card" onSubmit={submit}>
          <h2 className="form-title">
            <Multiline text={t('login.title')} />
          </h2>
          <p className="form-sub">{t('login.subtitle')}</p>

          <input
            type="text"
            autoFocus
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            /* Не tel: пока в поле нет «@», isEmailIdentifier=false и на
               мобильной клавиатуре остаются только цифры — почту ввести нельзя.
               text подходит и для номера, и для email. */
            inputMode="text"
            placeholder={t('login.identifierPlaceholder')}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="email-field"
          />

          <input
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder={t('login.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="email-field"
          />

          <label className="form-check">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            {t('setpass.show')}
          </label>

          {error && <div className="form-error">{error}</div>}

          <button className="form-primary" type="submit" disabled={!valid || loading}>
            {loading ? t('login.submitting') : t('login.submit')}
          </button>

          <p className="form-note form-note--center">
            <a href="#" onClick={(e) => { e.preventDefault(); onOtpLogin?.() }}>
              {t('login.useOtp')}
            </a>
          </p>

        </form>
      </div>
    </Shell>
  )
}
