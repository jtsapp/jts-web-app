import TutorShell from '../tutor/TutorShell.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

// Экран результата теста разговорного уровня: крупный кружок с уровнем + честное
// обоснование от Sonnet (почему именно такой уровень), сильные стороны и что
// подтянуть. Без assessment (напр. старый прогон) показываем только уровень.
export default function TutorLevelResultPage({
  user,
  onNavigate,
  onProfile,
  onBack,
  tutor = {},
  level = 'A1',
  assessment = null,
  onContinue,
  onRetry,
}) {
  const t = useT()
  const { name = 'Спарк', avatar = '/tutor/tutor-spark.png' } = tutor
  const strengths = Array.isArray(assessment?.strengths) ? assessment.strengths : []
  const improvements = Array.isArray(assessment?.improvements) ? assessment.improvements : []
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

        {assessment?.rationale ? (
          <div className="t-levelwhy">
            <h2 className="t-levelwhy__title">{t('result.why')}</h2>
            <p className="t-levelwhy__text">{assessment.rationale}</p>
            {strengths.length > 0 && (
              <div className="t-levelwhy__block">
                <span className="t-levelwhy__label">{t('result.strengths')}</span>
                <ul className="t-levelwhy__list">
                  {strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {improvements.length > 0 && (
              <div className="t-levelwhy__block">
                <span className="t-levelwhy__label">{t('result.improvements')}</span>
                <ul className="t-levelwhy__list">
                  {improvements.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}

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
