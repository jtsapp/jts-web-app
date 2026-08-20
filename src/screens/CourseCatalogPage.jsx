import { useEffect, useMemo, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { getCourseCatalog } from '../api.js'
import { ChevronRightIcon } from '../components/icons.jsx'

const TYPE_ICON = { lesson: '📘', video: '▶', review: '🏆', leadin: '★', test: '🎓' }

// Пикер живых уроков: опубликованное дерево уровень → юнит → урок из
// /mobile/course-catalog. Выбор урока отдаёт его id наверх (onOpenLesson),
// App грузит его в LessonWorkspacePage.
// Тип урока приходит от бэкенда именем enum'а («LESSON»), а ключи словаря и
// имена CSS-классов — в нижнем регистре. Без приведения на карточке урока
// вместо «Урок» показывался сам ключ — «catalog.type.LESSON».
function typeKey(type) {
  const key = String(type || '').toLowerCase()
  return key in TYPE_ICON ? key : 'lesson'
}

export default function CourseCatalogPage({ userName, userLevel = 'A1', token, onNav, onProfile, onOpenLesson, onBack }) {
  const { t } = useI18n()
  const [levels, setLevels] = useState(null) // null = ещё грузим
  const [error, setError] = useState(false)

  // Закрытые преподавателем уроки не показываем совсем, а не замком: юнит без
  // единого доступного урока и уровень без юнитов тоже исчезают, иначе в дереве
  // остаются пустые заголовки. Бэкенд всё равно отдаёт 403 на попытке открыть.
  const visibleLevels = useMemo(() => {
    return (levels || [])
      .map((level) => ({
        ...level,
        units: (level.units || [])
          .map((unit) => ({ ...unit, lessons: (unit.lessons || []).filter((l) => !l.locked) }))
          .filter((unit) => unit.lessons.length > 0),
      }))
      .filter((level) => level.units.length > 0)
  }, [levels])

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
    <LearningLayout userName={userName} userLevel={userLevel} active="lessons" token={token} onNav={onNav} onProfile={onProfile} rail>
      <div className="cc">
        {/* Каталог открывается с экрана «Уроки». Без этой кнопки уйти отсюда можно
            было только через сайдбар, а на узком экране он спрятан в drawer — то
            есть выхода не было вовсе. */}
        {onBack && (
          <button type="button" className="cc__back" onClick={onBack}>
            <ChevronRightIcon size={16} />
            {t('catalog.back')}
          </button>
        )}

        <header className="cc__head">
          <h1 className="cc__title">{t('catalog.title')}</h1>
          <p className="cc__subtitle">{t('catalog.subtitle')}</p>
        </header>

        {levels === null && !error && <div className="cc__state">{t('catalog.loading')}</div>}
        {error && <div className="cc__state cc__state--error">{t('catalog.error')}</div>}
        {/* Считаем по видимым: если всё, что было, закрыто преподавателем,
            экран не должен выглядеть «загрузка не удалась». */}
        {levels !== null && !error && visibleLevels.length === 0 && (
          <div className="cc__state">{t('catalog.empty')}</div>
        )}

        {visibleLevels.map((level) => (
          <section key={level.id} className="cc-level">
            <h2 className="cc-level__title">{level.label || level.code}</h2>

            {level.units.map((unit) => (
              <div key={unit.id} className="cc-unit">
                <div className="cc-unit__head">
                  {unit.emoji && <span className="cc-unit__emoji" aria-hidden="true">{unit.emoji}</span>}
                  <span className="cc-unit__name">{unit.name}</span>
                  <span className="cc-unit__count">{(unit.lessons || []).length}</span>
                </div>

                <ul className="cc-lessons">
                  {unit.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        className="cc-lesson"
                        onClick={() => onOpenLesson?.(lesson.id)}
                      >
                        <span className={`cc-lesson__type cc-lesson__type--${typeKey(lesson.type)}`}>
                          <span aria-hidden="true">{TYPE_ICON[typeKey(lesson.type)] || TYPE_ICON.lesson}</span>
                          {t(`catalog.type.${typeKey(lesson.type)}`)}
                        </span>
                        <span className="cc-lesson__title">{lesson.title}</span>
                        <span className="cc-lesson__open">{t('catalog.open')}</span>
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
