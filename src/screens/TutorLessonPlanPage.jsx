import TutorShell from '../tutor/TutorShell.jsx'
import { useT } from '../i18n/LanguageContext.jsx'
import { SCENARIOS } from '../tutor/scenarios.js'
import { usePassedScenarios } from '../tutor/scenarioProgress.js'

// План уроков — сюжетная цепочка голосовых сценариев (единственный реальный
// учебный трек тьютора). Раньше тут был хардкод из семи одинаковых «Практика
// Present Continious»; теперь список и прогресс живут там же, где и на странице
// «Сценарии»: SCENARIOS + lesson_progress из /api/profile.
export default function TutorLessonPlanPage({ user, onNavigate, onProfile, onBack }) {
  const t = useT()
  const passed = usePassedScenarios()
  const lessons = SCENARIOS.map((s, i) => ({
    num: String(i + 1).padStart(2, '0'),
    title: s.label,
    desc: t(`scen.desc.${s.id}`),
    done: Boolean(passed?.has(s.id)),
  }))
  const done = lessons.filter((l) => l.done).length

  return (
    <TutorShell
      active="tutor"
      user={user}
      onNavigate={onNavigate}
      onProfile={onProfile}
      onBack={onBack}
      title={t('plan.title')}
      layout="flow"
    >
      <div className="t-plan">
        <div className="t-plan__progress">
          <b>{t('plan.progress', { done, total: lessons.length })}</b>
          <div className="t-plan__bar">
            <span style={{ width: done ? `${(done / lessons.length) * 100}%` : undefined }} />
          </div>
        </div>

        <div className="t-plan__list">
          {lessons.map((l) => (
            <div className={'t-plan__card' + (l.done ? ' is-done' : '')} key={l.num}>
              <div className="t-plan__body">
                <div className="t-plan__head">
                  <span className="t-plan__num">{l.num}</span>
                  <span className="t-plan__title">{l.title}</span>
                </div>
                <p className="t-plan__desc">{l.desc}</p>
              </div>
              <span className="t-radio" />
            </div>
          ))}
        </div>
      </div>
    </TutorShell>
  )
}
