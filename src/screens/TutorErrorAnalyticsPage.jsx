import TutorShell from '../tutor/TutorShell.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

// Разбор ошибок после разговора. Секции приходят пропсом ({ h, p }) — их будет
// собирать голосовой агент; пока данных нет, показываем пустое состояние вместо
// демонстрационного разбора, который раньше был захардкожен.
export default function TutorErrorAnalyticsPage({
  user,
  onNavigate,
  onProfile,
  onBack,
  tutor = {},
  blocks = [],
  onToPlan,
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
      title={t('erran.title')}
      layout="flow"
    >
      <div className="t-erran">
        <div className="t-erran__card">
          <img src={avatar} alt="" />
          <div className="t-erran__cardtext">
            <span>{t('erran.by')}</span>
            <b>{name}</b>
          </div>
        </div>

        {blocks.length === 0 ? (
          <p className="t-erran__empty">{t('erran.empty')}</p>
        ) : (
          <div className="t-erran__blocks">
            {blocks.map((b) => (
              <div className="t-erran__block" key={b.h}>
                <h3>{b.h}</h3>
                <p>{b.p}</p>
              </div>
            ))}
          </div>
        )}

        <div className="t-erran__btns">
          <button className="t-pill t-pill--blue t-erran__btn" type="button" onClick={onToPlan}>
            {t('erran.toPlan')}
          </button>
          <button className="t-pill t-pill--primary t-erran__btn" type="button" onClick={onRetry}>
            {t('erran.retry')}
          </button>
        </div>
      </div>
    </TutorShell>
  )
}
