import TutorShell from '../tutor/TutorShell.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

// scenarioId — slug of data/scenarios/<id>.md loaded by the voice agent.
// Cards without a scenarioId fall back to free conversation.
const SCENARIOS = [
  {
    id: 'visa-interview',
    scenarioId: 'visa-interview',
    label: 'U.S. Visa Interview',
    img: '/tutor/visa-interview.jpg',
  },
]

export default function TutorScenariosPage({
  user,
  onNavigate,
  onProfile,
  onBack,
  onStart,
}) {
  const t = useT()
  return (
    <TutorShell
      active="tutor"
      user={user}
      onNavigate={onNavigate}
      onProfile={onProfile}
      onBack={onBack}
      title={t('scen.title')}
      layout="flow"
    >
      <div className="t-scen">
        <h1 className="t-scen__title">{t('scen.heading')}</h1>

        <div className="t-scen__grid">
          {SCENARIOS.map((s) => (
            <div className="t-scen__card" key={s.id}>
              <span
                className="t-scen__img"
                style={{ backgroundImage: `url(${s.img})` }}
              >
                <span className="t-scenario__badge">💼</span>
              </span>
              <div className="t-scen__label">{s.label}</div>
              <p className="t-scen__desc">{t('scen.desc')}</p>
              <button
                className="t-pill t-pill--primary t-scen__btn"
                type="button"
                onClick={() => onStart && onStart(s.scenarioId)}
              >
                {t('scen.start')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </TutorShell>
  )
}
