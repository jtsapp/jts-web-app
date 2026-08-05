import { useEffect, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { getCourseCatalog } from '../api.js'

const TYPE_ICON = { lesson: '📘', video: '▶', review: '🏆', leadin: '★', test: '🎓' }

// Пикер живых уроков: опубликованное дерево уровень → юнит → урок из
// /mobile/course-catalog. Выбор урока отдаёт его id наверх (onOpenLesson),
// App грузит его в LessonWorkspacePage.
export default function CourseCatalogPage({ userName, userLevel = 'A1', token, onNav, onProfile, onOpenLesson }) {
  const { t } = useI18n()
  const [levels, setLevels] = useState(null) // null = ещё грузим
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    setError(false)
    getCourseCatalog(token, (fresh) => alive && setLevels(fresh || []))
      .then((data) => alive && setLevels(data || []))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [token])

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="lessons" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="cc">
        <header className="cc__head">
          <h1 className="cc__title">{t('catalog.title')}</h1>
          <p className="cc__subtitle">{t('catalog.subtitle')}</p>
        </header>

        {levels === null && !error && <div className="cc__state">{t('catalog.loading')}</div>}
        {error && <div className="cc__state cc__state--error">{t('catalog.error')}</div>}
        {levels !== null && !error && levels.length === 0 && (
          <div className="cc__state">{t('catalog.empty')}</div>
        )}

        {levels?.map((level) => (
          <section key={level.id} className="cc-level">
            <h2 className="cc-level__title">{level.label || level.code}</h2>

            {(level.units || []).map((unit) => (
              <div key={unit.id} className="cc-unit">
                <div className="cc-unit__head">
                  {unit.emoji && <span className="cc-unit__emoji" aria-hidden="true">{unit.emoji}</span>}
                  <span className="cc-unit__name">{unit.name}</span>
                  <span className="cc-unit__count">{(unit.lessons || []).length}</span>
                </div>

                <ul className="cc-lessons">
                  {(unit.lessons || []).map((lesson) => (
                    <li key={lesson.id}>
                      {/* Закрытый админом урок остаётся в дереве (бэкенд его не
                          вырезает — иначе структура курса «поедет»), но кнопка
                          неактивна. Сервер всё равно отдаст 403 на открытии. */}
                      <button
                        type="button"
                        className={`cc-lesson${lesson.locked ? ' cc-lesson--locked' : ''}`}
                        disabled={!!lesson.locked}
                        title={lesson.locked ? t('catalog.locked') : undefined}
                        onClick={() => !lesson.locked && onOpenLesson?.(lesson.id)}
                      >
                        <span className={`cc-lesson__type cc-lesson__type--${lesson.type}`}>
                          <span aria-hidden="true">{TYPE_ICON[lesson.type] || TYPE_ICON.lesson}</span>
                          {t(`catalog.type.${lesson.type}`)}
                        </span>
                        <span className="cc-lesson__title">{lesson.title}</span>
                        <span className="cc-lesson__open">
                          {lesson.locked ? `🔒 ${t('catalog.locked')}` : t('catalog.open')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </LearningLayout>
  )
}
