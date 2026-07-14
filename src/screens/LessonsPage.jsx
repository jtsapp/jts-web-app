import { useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'

const TABS = [
  { key: 'speaking', label: 'Спикинг-клабы' },
  { key: 'online', label: 'Онлайн-уроки' },
]

// Раздел «Уроки» — пока заглушка «в разработке» (спикинг-клабы / онлайн-уроки).
export default function LessonsPage({ userName, userLevel, onNav }) {
  const [tab, setTab] = useState('online')

  return (
    <LearningLayout
      userName={userName}
      userLevel={userLevel}
      active="lessons"
      onNav={onNav}
      onProfile={() => {}}
    >
      <div className="les">
        <h1 className="les__title">Уроки</h1>

        <div className="les__tabs">
          {TABS.map((tItem) => (
            <button
              key={tItem.key}
              className={'les__tab' + (tab === tItem.key ? ' is-active' : '')}
              onClick={() => setTab(tItem.key)}
            >
              {tItem.label}
            </button>
          ))}
        </div>

        <div className="les__empty">
          <img className="les__art" src="/lessons/coming_soon.png" alt="" />
          <div className="les__empty-title">Страница в разработке</div>
          <div className="les__empty-sub">Скоро оно станет доступно</div>
        </div>
      </div>
    </LearningLayout>
  )
}
