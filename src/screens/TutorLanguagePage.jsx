import TutorShell from '../tutor/TutorShell.jsx'
import MascotCard from '../tutor/MascotCard.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'

const LANGS = [
  { key: 'kz', label: 'Қазақша', flag: '/tutor/flag-kz.png' },
  { key: 'ru', label: 'Русский', flag: '/tutor/flag-ru.png' },
  { key: 'en', label: 'English', flag: '/tutor/flag-en.png' },
]

export default function TutorLanguagePage({ user, onNavigate, onProfile, onSelect }) {
  const { setLang, t } = useLang()

  // Выбор языка сразу меняет язык интерфейса, затем ведёт дальше по флоу.
  function pick(key) {
    setLang(key)
    onSelect && onSelect(key)
  }

  return (
    <TutorShell active="tutor" user={user} onNavigate={onNavigate} onProfile={onProfile}>
      <MascotCard>
        <div className="t-lang">
          <h1 className="t-lang__title">{t('lang.title')}</h1>
          <div className="t-lang__list">
            {LANGS.map(({ key, label, flag }) => (
              <button
                key={key}
                type="button"
                className="t-lang__option"
                onClick={() => pick(key)}
              >
                <img className="t-lang__flag" src={flag} alt="" />
                <span className="t-lang__label">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </MascotCard>
    </TutorShell>
  )
}
