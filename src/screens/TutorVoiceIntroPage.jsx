import TutorShell from '../tutor/TutorShell.jsx'
import TutorStatus from '../tutor/TutorStatus.jsx'
import { CloseCircleIcon, MicIcon } from '../tutor/TutorIcons.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

// Экран «тьютор хочет узнать твой уровень разговорного английского».
export default function TutorVoiceIntroPage({
  user,
  onNavigate,
  onProfile,
  onBack,
  tutor = {},
  onStart,
  onDecline,
}) {
  const t = useT()
  const { name = 'Спарк', avatar = '/tutor/tutor-spark.png' } = tutor
  return (
    <TutorShell
      active="tutor"
      user={user}
      onNavigate={onNavigate}
      onProfile={onProfile}
      onBack={onBack}
      layout="flow"
      hideMobileNav
    >
      <TutorStatus
        heading={t('voiceIntro.heading', { name })}
        name={name}
        avatar={avatar}
        flow
      >
        {/* Пояснительная карточка «3-минутный разговор» — только мобилка (Figma
            frame 16). На десктопе экран остаётся заголовок + кнопки. */}
        <div className="t-vintro-hint">
          <span className="t-vintro-hint__mic">
            <MicIcon size={24} />
          </span>
          <p className="t-vintro-hint__text">{t('voiceIntro.hint')}</p>
        </div>

        <div className="t-btnstack">
          <button className="t-pill t-pill--primary t-pill--lg" type="button" onClick={onStart}>
            {t('voiceIntro.start')}
          </button>
          <button className="t-pill t-pill--blue" type="button" onClick={onDecline}>
            <CloseCircleIcon size={24} />
            {t('voiceIntro.decline')}
          </button>
        </div>
      </TutorStatus>
    </TutorShell>
  )
}
