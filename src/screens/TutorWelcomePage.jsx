import TutorShell from '../tutor/TutorShell.jsx'
import MascotCard from '../tutor/MascotCard.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

export default function TutorWelcomePage({ user, onNavigate, onProfile, onContinue }) {
  const t = useT()
  return (
    <TutorShell active="tutor" user={user} onNavigate={onNavigate} onProfile={onProfile}>
      <MascotCard>
        <div className="t-welcome">
          <h1 className="t-welcome__title">{t('welcome.title')}</h1>
          <p className="t-welcome__sub">{t('welcome.sub')}</p>
          <button className="t-btn-primary" type="button" onClick={onContinue}>
            {t('common.continue')}
          </button>
        </div>
      </MascotCard>
    </TutorShell>
  )
}
