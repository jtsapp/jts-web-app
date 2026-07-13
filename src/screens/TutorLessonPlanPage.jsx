import TutorShell from '../tutor/TutorShell.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

const LESSONS = [
  { num: '01', title: 'Практика Present Continious' },
  { num: '02', title: 'Практика Family Tree' },
  { num: '03', title: 'Практика Present Continious' },
  { num: '04', title: 'Практика Family Tree' },
  { num: '05', title: 'Практика Present Continious' },
  { num: '06', title: 'Практика Present Continious' },
  { num: '07', title: 'Практика Present Continious' },
]

export default function TutorLessonPlanPage({ user, onNavigate, onProfile, onBack }) {
  const t = useT()
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
          <b>{t('plan.progress', { done: 0, total: 7 })}</b>
          <div className="t-plan__bar">
            <span />
          </div>
        </div>

        <div className="t-plan__list">
          {LESSONS.map((l) => (
            <div className="t-plan__card" key={l.num}>
              <div className="t-plan__body">
                <div className="t-plan__head">
                  <span className="t-plan__num">{l.num}</span>
                  <span className="t-plan__title">{l.title}</span>
                </div>
                <p className="t-plan__desc">{t('plan.desc')}</p>
              </div>
              <span className="t-radio" />
            </div>
          ))}
        </div>
      </div>
    </TutorShell>
  )
}
