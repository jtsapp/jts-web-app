import TutorShell from '../tutor/TutorShell.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

// Экран результата теста разговорного уровня — крупный кружок с уровнем.
export default function TutorLevelResultPage({
  user,
  onNavigate,
  onProfile,
  onBack,
  tutor = {},
  level = 'A1',
  onContinue,
  onRetry,
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
    >
      <div className="t-status" style={{ paddingTop: 69 }}>
        <div className="t-status__head">
          <img className="t-status__avatar" src={avatar} alt="" />
          <div className="t-status__meta">
            <span className="t-status__name">{name}</span>
            <span className="t-status__role">{t('role.tutor')}</span>
          </div>
        </div>

        <div className="t-levelcircle">{level}</div>

        <h1 className="t-status__heading" style={{ marginTop: 36 }}>
          {t('result.heading')}
        </h1>

        <div className="t-btnstack" style={{ marginTop: 48 }}>
          <button className="t-pill t-pill--primary" type="button" onClick={onContinue}>
            {t('common.continue')}
          </button>
          <button className="t-pill t-pill--blue" type="button" onClick={onRetry}>
            {t('result.retry')}
          </button>
        </div>
      </div>
    </TutorShell>
  )
}
