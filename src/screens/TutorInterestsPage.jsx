import { useState } from 'react'
import TutorShell from '../tutor/TutorShell.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

// Ключи тем интереса — тексты берём из словаря (t) по ним же.
const TOPIC_KEYS = [
  'interests.topic.code',
  'interests.topic.football',
  'interests.topic.sport',
  'interests.topic.psy',
  'interests.topic.games',
  'interests.topic.esport',
  'interests.topic.art',
  'interests.topic.politics',
  'interests.topic.movies',
  'interests.topic.fashion',
]

export default function TutorInterestsPage({
  user,
  onNavigate,
  onProfile,
  onBack,
  tutor = {},
  onContinue,
}) {
  const t = useT()
  const { name = 'Спарк', avatar = '/tutor/tutor-spark.png' } = tutor
  const [selected, setSelected] = useState(
    () => new Set(['interests.topic.psy', 'interests.topic.movies', 'interests.topic.fashion']),
  )

  function toggle(key) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <TutorShell
      active="tutor"
      user={user}
      onNavigate={onNavigate}
      onProfile={onProfile}
      onBack={onBack}
      layout="flow"
    >
      <div className="t-status" style={{ paddingTop: 66 }}>
        <div className="t-status__head">
          <img className="t-status__avatar" src={avatar} alt="" />
          <div className="t-status__meta">
            <span className="t-status__name">{name}</span>
            <span className="t-status__role">{t('role.tutor')}</span>
          </div>
        </div>

        <h1 className="t-status__heading">{t('interests.heading', { name })}</h1>
        <p className="t-interests__sub">{t('interests.sub')}</p>

        <div className="t-interests__chips">
          {TOPIC_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={'t-topic' + (selected.has(key) ? ' is-selected' : '')}
              onClick={() => toggle(key)}
            >
              {t(key)}
            </button>
          ))}
        </div>

        <button
          className="t-pill t-pill--primary"
          type="button"
          onClick={onContinue}
          style={{ marginTop: 42, width: 370 }}
        >
          {t('common.continue')}
        </button>
      </div>
    </TutorShell>
  )
}
