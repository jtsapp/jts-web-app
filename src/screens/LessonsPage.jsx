import { useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'

const TABS = [
  { key: 'clubs', label: 'lessons.tabClubs' },
  { key: 'online', label: 'lessons.tabOnline' },
]

export default function LessonsPage({ userLevel = 'A1', userName, onNav, onProfile }) {
  const { t } = useI18n()
  const [tab, setTab] = useState('online')

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="lessons" onNav={onNav} onProfile={onProfile}>
      <div className="ls">
        <header className="ls__head">
          <h1 className="ls__title">{t('nav.lessons')}</h1>
        </header>

        <div className="ls__tabs">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              className={`ls-tab ${tab === key ? 'ls-tab--active' : ''}`}
              onClick={() => setTab(key)}
            >
              {t(label)}
            </button>
          ))}
        </div>

        {/* Обе вкладки пока ведут на заглушку — контент готовится. */}
        <div className="ls__body">
          <div className="soon">
            <div className="soon__art">
              <img src="/assets/lessons/under-construction.png" alt="" />
            </div>
            <div className="soon__text">
              <b>{t('soon.title')}</b>
              <span>{t('soon.subtitle')}</span>
            </div>
          </div>
        </div>
      </div>
    </LearningLayout>
  )
}
