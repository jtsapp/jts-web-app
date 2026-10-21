import { LANGS, useI18n } from '../../i18n.jsx'
import AuthLayout, { AuthHeading } from './AuthLayout.jsx'
import { PrimaryButton } from './fields.jsx'

// Приветствие на самом языке карточки, а не на языке интерфейса: по нему и
// узнают свой язык (макет «Выбор языка»).
const HELLO = { ru: 'Привет!', kk: 'Сәлем!', en: 'Hello!' }
// Порядок карточек — как в кадре: русский, казахский, английский.
const ORDER = ['ru', 'kk', 'en']

/**
 * Первый экран регистрации: язык интерфейса. Выбор применяется сразу — экран
 * тут же переводится, и видно, что выбрал. Тот же язык меняет и переключатель
 * в шапке, поэтому карточка «отмечена» по текущему языку, а не своим стейтом.
 */
export default function LanguageStep({ onBack, onContinue }) {
  const { t, lang, setLang } = useI18n()
  const langs = ORDER.map((code) => LANGS.find((l) => l.code === code)).filter(Boolean)

  return (
    <AuthLayout
      centered
      onBack={onBack}
      onSubmit={onContinue}
      actions={<PrimaryButton>{t('rg.continue')}</PrimaryButton>}
    >
      <AuthHeading title={t('rg.lang.title')} sub={t('rg.lang.sub')} />
      <div className="rg-langs" role="radiogroup" aria-label={t('rg.lang.title')}>
        {langs.map((l) => {
          const Flag = l.Flag
          const active = l.code === lang
          return (
            <button
              key={l.code}
              type="button"
              role="radio"
              aria-checked={active}
              className={`rg-lang${active ? ' is-active' : ''}`}
              onClick={() => setLang(l.code)}
              lang={l.code === 'kk' ? 'kk' : l.code}
            >
              <span className="rg-lang__flag">
                <Flag size={32} />
              </span>
              <span className="rg-lang__text">
                <span className="rg-lang__name">{l.label}</span>
                <span className="rg-lang__hello">{HELLO[l.code]}</span>
              </span>
              <span className="rg-radio" aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </AuthLayout>
  )
}
