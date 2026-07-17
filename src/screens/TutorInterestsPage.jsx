import { useState } from 'react'
import TutorShell from '../tutor/TutorShell.jsx'
import { INTEREST_TOPICS } from '../tutor/interests.js'
import { useT } from '../i18n/LanguageContext.jsx'

export default function TutorInterestsPage({
  user,
  onNavigate,
  onProfile,
  onBack,
  tutor = {},
  // id тем из сохранённого профиля — подсвечиваем прошлый выбор.
  initialIds = [],
  // Получает массив id выбранных тем.
  onContinue,
}) {
  const t = useT()
  const { name = 'Спарк', avatar = '/tutor/tutor-spark.png' } = tutor
  // Ничего не предвыбираем: интересы — выбор ученика, а не наша догадка.
  const [selected, setSelected] = useState(() => new Set(initialIds))

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
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
          {INTEREST_TOPICS.map(({ id, tKey }) => (
            <button
              key={id}
              type="button"
              className={'t-topic' + (selected.has(id) ? ' is-selected' : '')}
              onClick={() => toggle(id)}
            >
              {t(tKey)}
            </button>
          ))}
        </div>

        <button
          className="t-pill t-pill--primary"
          type="button"
          // Минимум одна тема: без интересов тьютору не за что зацепиться.
          disabled={selected.size === 0}
          onClick={() => onContinue?.(Array.from(selected))}
          style={{ marginTop: 42, width: 370, opacity: selected.size === 0 ? 0.45 : 1 }}
        >
          {t('common.continue')}
        </button>
      </div>
    </TutorShell>
  )
}
