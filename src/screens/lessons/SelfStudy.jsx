import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getCourseCatalog, getCatalogProgress, completeCatalogLesson, uncompleteCatalogLesson } from '../../api.js'
import { levelIndex } from '../../kingdoms.js'

const TYPE_ICON = { lesson: '📘', video: '▶', review: '🏆', leadin: '★', test: '🎓' }

function typeKey(type) {
  const key = String(type || 'lesson').toLowerCase()
  return key in TYPE_ICON ? key : 'lesson'
}

/**
 * Открыт ли уровень ученику.
 *
 * Та же формула, что у карты королевств и словаря: A1 открыт всегда, дальше —
 * до своего уровня включительно. Держим правило одинаковым во всех трёх
 * местах: разное «докуда открыто» на соседних экранах ученик читает как
 * поломку, а не как замысел.
 */
function isLevelOpen(levelId, userLevel) {
  const eff = Math.max(levelIndex(userLevel), levelIndex('A1'))
  return levelIndex(levelId) <= eff
}

/**
 * Самостоятельное обучение: материалы каталога, которые ученик проходит сам.
 *
 * Каталог целиком — инструмент преподавателя, и ученику он не показывался
 * намеренно: там всё содержимое курса, включая уровни, до которых человек ещё
 * не дошёл. Поэтому здесь не «каталог для ученика», а его срез — уровни до
 * своего и только те уроки, которые преподаватель открыл (`locked`).
 *
 * Каждый урок лежит в каталоге ТРИЖДЫ — по разу на режим: SELF_STUDY,
 * ONE_TO_ONE и GROUP (215 + 215 + 215 на текущем контенте). Берём только
 * самостоятельный: без этого ученик увидел бы каждый урок три раза подряд с
 * одинаковым названием, а открывал бы то версию для занятия с преподавателем,
 * то для группы.
 *
 * Прогресс ученик отмечает сам. Автоматически «пройдено» взять неоткуда: из
 * 215 самостоятельных уроков только 71 разобран на шаги, остальные 144
 * открываются документом, и события завершения у них не бывает. Отмечать по
 * факту открытия было бы враньём — «открыл» и «прошёл» разные вещи.
 */
export default function SelfStudy({ token, userLevel = 'A1', onOpenLesson }) {
  const { t } = useI18n()
  const [levels, setLevels] = useState(null) // null — ещё грузим
  const [error, setError] = useState(false)
  const [done, setDone] = useState(() => new Set())

  useEffect(() => {
    if (!token) return
    let alive = true
    setError(false)
    getCourseCatalog(token, (fresh) => alive && setLevels(fresh || []))
      .then((data) => alive && setLevels(data || []))
      .catch(() => alive && setError(true))
    // Прогресс не критичен для экрана: не ответил — список работает, просто без
    // галочек. Ронять из-за него весь раздел незачем.
    getCatalogProgress(token)
      .then((r) => alive && setDone(new Set((r?.completedLessonIds || []).map(Number))))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [token])

  const toggleDone = async (lessonId) => {
    const id = Number(lessonId)
    const was = done.has(id)
    // Рисуем сразу, не дожидаясь сети: галочка должна отвечать на нажатие, а не
    // на скорость соединения. Не сошлось — возвращаем как было.
    setDone((prev) => {
      const next = new Set(prev)
      if (was) next.delete(id)
      else next.add(id)
      return next
    })
    try {
      const r = was ? await uncompleteCatalogLesson(token, id) : await completeCatalogLesson(token, id)
      setDone(new Set((r?.completedLessonIds || []).map(Number)))
    } catch {
      setDone((prev) => {
        const next = new Set(prev)
        if (was) next.add(id)
        else next.delete(id)
        return next
      })
    }
  }

  const visible = useMemo(() => {
    return (levels || [])
      // Уровень опознаётся по code (A0, A1…): id у уровня каталога числовой,
      // и levelIndex на нём молча вернул бы 0 — гейтинг открыл бы весь курс.
      .filter((level) => isLevelOpen(level.code, userLevel))
      .map((level) => ({
        ...level,
        units: (level.units || [])
          .map((unit) => ({
            ...unit,
            lessons: (unit.lessons || []).filter(
              (l) => !l.locked && String(l.mode || '').toUpperCase() === 'SELF_STUDY',
            ),
          }))
          .filter((unit) => unit.lessons.length > 0),
      }))
      .filter((level) => level.units.length > 0)
  }, [levels, userLevel])

  if (!token) return <p className="cc__state">{t('selfStudy.needAuth')}</p>
  if (error) return <p className="cc__state cc__state--error">{t('catalog.error')}</p>
  if (levels === null) return <p className="cc__state">{t('catalog.loading')}</p>

  // Пусто по двум разным причинам, и ученику полезнее знать, по какой:
  // материалов ещё не завели — или его уровень пока ниже первого открытого.
  if (visible.length === 0) {
    return <p className="cc__state">{t('selfStudy.empty')}</p>
  }

  return (
    <div className="cc">
      <p className="cc__subtitle">{t('selfStudy.lead')}</p>

      {visible.map((level) => (
        <section key={level.id ?? level.code} className="cc-level">
          <h2 className="cc-level__title">{level.code || level.label}</h2>

          {level.units.map((unit) => (
            <div key={unit.id} className="cc-unit">
              <div className="cc-unit__head">
                {unit.emoji && <span className="cc-unit__emoji" aria-hidden="true">{unit.emoji}</span>}
                <span className="cc-unit__name">{unit.name}</span>
                {/* «3 из 4», а не просто число уроков: в разделе, который
                    проходят сами, полезнее видеть остаток, а не объём. */}
                <span className="cc-unit__count">
                  {t('selfStudy.ofTotal', {
                    n: String(unit.lessons.filter((l) => done.has(Number(l.id))).length),
                    total: String(unit.lessons.length),
                  })}
                </span>
              </div>

              <ul className="cc-lessons">
                {unit.lessons.map((lesson) => (
                  <li key={lesson.id} className={`ss-row${done.has(Number(lesson.id)) ? ' is-done' : ''}`}>
                    <button type="button" className="cc-lesson" onClick={() => onOpenLesson?.(lesson.id)}>
                      <span className={`cc-lesson__type cc-lesson__type--${typeKey(lesson.type)}`}>
                        <span aria-hidden="true">{TYPE_ICON[typeKey(lesson.type)]}</span>
                        {t(`catalog.type.${typeKey(lesson.type)}`)}
                      </span>
                      <span className="cc-lesson__title">{lesson.title}</span>
                      <span className="cc-lesson__open">{t('selfStudy.start')}</span>
                    </button>
                    {/* Соседом строки, а не внутри неё: строка сама кнопка,
                        открывающая урок, и вложенная кнопка невалидна. */}
                    <button
                      type="button"
                      className="ss-mark"
                      onClick={() => toggleDone(lesson.id)}
                      aria-pressed={done.has(Number(lesson.id))}
                      title={t(done.has(Number(lesson.id)) ? 'selfStudy.unmark' : 'selfStudy.mark')}
                      aria-label={t(done.has(Number(lesson.id)) ? 'selfStudy.unmark' : 'selfStudy.mark')}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
