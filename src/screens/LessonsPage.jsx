import { useEffect, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { getLessonModules } from '../api.js'

const TABS = [
  { key: 'clubs', label: 'lessons.tabClubs' },
  { key: 'online', label: 'lessons.tabOnline' },
]

export default function LessonsPage({ userLevel = 'A1', userName, token, onNav, onProfile }) {
  const { t } = useI18n()
  const [tab, setTab] = useState('online')
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    getLessonModules(token)
      .then((data) => {
        if (cancelled) return
        setModules(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError(true)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="lessons" token={token} onNav={onNav} onProfile={onProfile}>
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

        {/* Клубы (офлайн-группы) пока не заведены в админке - только «Онлайн». */}
        {tab === 'clubs' && (
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
        )}

        {tab === 'online' && (
          <div className="ls__body">
            {loading && <p className="ls__status">{t('lessons.loading')}</p>}
            {!loading && error && <p className="ls__status">{t('lessons.error')}</p>}
            {!loading && !error && modules.length === 0 && (
              <div className="soon">
                <div className="soon__art">
                  <img src="/assets/lessons/under-construction.png" alt="" />
                </div>
                <div className="soon__text">
                  <b>{t('soon.title')}</b>
                  <span>{t('soon.subtitle')}</span>
                </div>
              </div>
            )}
            {!loading && !error && modules.length > 0 && (
              <div className="ls__grid">
                {modules.map((m) => (
                  <a
                    key={m.id}
                    className="ls-card"
                    href={m.indexUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {m.posterUrl && <div className="ls-card__poster" style={{ backgroundImage: `url(${m.posterUrl})` }} />}
                    <div className="ls-card__body">
                      <div className="ls-card__title">{m.title}</div>
                      {m.subtitle && <div className="ls-card__subtitle">{m.subtitle}</div>}
                      <div className="ls-card__meta">
                        {m.level && <span className="ls-card__level">{m.level}</span>}
                        {typeof m.lessonCount === 'number' && (
                          <span className="ls-card__count">{t('lessons.count', { count: m.lessonCount })}</span>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </LearningLayout>
  )
}
