import TutorShell from '../tutor/TutorShell.jsx'
import TutorStatus from '../tutor/TutorStatus.jsx'
import { ClockIcon, CloseCircleIcon, ArrowRightIcon } from '../tutor/TutorIcons.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

// Экран «тьютор не знает твоего уровня» — предложение пройти короткий тест.
export default function TutorLevelOfferPage({
  user,
  onNavigate,
  onProfile,
  onBack,
  tutor = {},
  onStartTest,
  onLater,
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
        heading={t('offer.heading', { name })}
        name={name}
        avatar={avatar}
        headingColor="#d0b2ff"
        flow
      >
        <div className="t-offer">
          <div className="t-offer__title">{t('offer.title', { name })}</div>
          <div className="t-offer__sub">{t('offer.sub')}</div>
          <button className="t-offer__cta" type="button" onClick={onStartTest}>
            <span className="t-offer__ctaLeft">
              <span className="t-offer__clock">
                <ClockIcon size={24} />
              </span>
              <span className="t-offer__ctaText">
                <b>{t('offer.cta')}</b>
                <small>{t('offer.ctaTime')}</small>
              </span>
            </span>
            <span className="t-offer__arrow">
              <ArrowRightIcon size={20} />
            </span>
          </button>
        </div>

        <button className="t-offer__later" type="button" onClick={onLater}>
          <CloseCircleIcon size={24} />
          {t('offer.later')}
        </button>
      </TutorStatus>
    </TutorShell>
  )
}
