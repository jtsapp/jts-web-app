import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getCourseCatalog } from '../../api.js'

// Выбор урока из каталога прямо на живом уроке (design-spec §4.10).
//
// Учитель берёт отсюда уровень → юнит → урок, и выбранный урок становится
// материалом раздела: дальше его показывает существующий follow-me. Отдельного
// канала «показать урок каталога» не заводим — материал персистентный, значит
// выбор переживает перезагрузку страницы у ученика.
//
// Закрытые преподавателем уроки бэкенд помечает `locked`. Спека требует
// показывать их строкой «Закрыт», а не прятать: иначе в дереве появляются
// пропуски и непонятно, куда делся урок из программы.

const TYPE_LABEL = {
  LESSON: 'catalog.type.lesson',
  VIDEO: 'catalog.type.video',
  REVIEW: 'catalog.type.review',
  LEADIN: 'catalog.type.leadin',
  TEST: 'catalog.type.test',
}

function typeKey(type) {
  return TYPE_LABEL[String(type || '').toUpperCase()] || TYPE_LABEL.LESSON
}

/** Совпадение по названию урока или юнита — поиск фильтрует дерево целиком. */
function matches(query, unit, lesson) {
  if (!query) return true
  const q = query.toLowerCase()
  return (unit.name || '').toLowerCase().includes(q) || (lesson.title || '').toLowerCase().includes(q)
}

export default function CatalogPicker({ token, busy = false, onPick, onClose }) {
  const { t } = useI18n()
  const [levels, setLevels] = useState(null)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  // Свёрнуты все, кроме первого юнита (спека §4.10). Хранится множество
  // раскрытых, чтобы поиск не перетирал ручной выбор пользователя.
  const [opened, setOpened] = useState(() => new Set())

  useEffect(() => {
    let alive = true
    setError(false)
    getCourseCatalog(token)
      .then((data) => {
        if (!alive) return
        setLevels(data || [])
        const first = data?.[0]?.units?.[0]
        if (first) setOpened(new Set([first.id]))
      })
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [token])

  const tree = useMemo(() => {
    return (levels || [])
      .map((level) => ({
        ...level,
        units: (level.units || [])
          .map((unit) => ({ ...unit, lessons: (unit.lessons || []).filter((l) => matches(query, unit, l)) }))
          .filter((unit) => unit.lessons.length > 0),
      }))
      .filter((level) => level.units.length > 0)
  }, [levels, query])

  // При поиске раскрываем всё найденное: иначе результат прячется под
  // свёрнутыми шапками и выглядит как «ничего не нашлось».
  const isOpen = (unit) => Boolean(query) || opened.has(unit.id)

  function toggle(unit) {
    setOpened((prev) => {
      const next = new Set(prev)
      if (next.has(unit.id)) next.delete(unit.id)
      else next.add(unit.id)
      return next
    })
  }

  return (
    <div className="cp" role="dialog" aria-modal="true" aria-label={t('catalog.title')}>
      <div className="cp__head">
        <div>
          <h2 className="cp__title">{t('catalog.title')}</h2>
          <p className="cp__subtitle">{t('live.catalog.subtitle')}</p>
        </div>
        <button type="button" className="cp__close" onClick={onClose} aria-label={t('common.back')}>
          ✕
        </button>
      </div>

      <label className="cp__search">
        <span className="cp__search-icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('live.catalog.search')}
          autoComplete="off"
        />
      </label>

      <div className="cp__body">
        {levels === null && !error && <p className="cp__state">{t('catalog.loading')}</p>}
        {error && <p className="cp__state cp__state--error">{t('catalog.error')}</p>}
        {levels !== null && !error && tree.length === 0 && (
          <p className="cp__state">{query ? t('live.catalog.nothing') : t('catalog.empty')}</p>
        )}

        {tree.map((level) => (
          <section key={level.id} className="cp-level">
            <h3 className="cp-level__title">{level.label || level.code}</h3>

            {level.units.map((unit) => (
              <div key={unit.id} className="cp-unit">
                <button
                  type="button"
                  className="cp-unit__head"
                  onClick={() => toggle(unit)}
                  aria-expanded={isOpen(unit)}
                >
                  <span className="cp-unit__name">{unit.name}</span>
                  <span className="cp-unit__count">{unit.lessons.length}</span>
                  <span className="cp-unit__chev" aria-hidden="true">{isOpen(unit) ? '▴' : '▾'}</span>
                </button>

                {isOpen(unit) && (
                  <ul className="cp-lessons">
                    {unit.lessons.map((lesson) => (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          className={`cp-lesson${lesson.locked ? ' is-locked' : ''}`}
                          disabled={lesson.locked || busy}
                          title={lesson.locked ? t('live.catalog.lockedHint') : undefined}
                          onClick={() => onPick?.(lesson)}
                        >
                          <span className="cp-lesson__type">{t(typeKey(lesson.type))}</span>
                          <span className="cp-lesson__title">{lesson.title}</span>
                          <span className="cp-lesson__action">
                            {lesson.locked ? t('live.catalog.locked') : t('live.catalog.show')}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
