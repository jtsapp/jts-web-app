import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getCourseCatalog, getCatalogProgress, completeCatalogLesson, uncompleteCatalogLesson } from '../../api.js'
import { levelIndex } from '../../kingdoms.js'
import { readSelfStudyLevel, writeSelfStudyLevel } from './selfStudyLevel.js'

function typeKey(type) {
  const key = String(type || 'lesson').toLowerCase()
  return ['lesson', 'video', 'review', 'leadin', 'test'].includes(key) ? key : 'lesson'
}

/**
 * Открыт ли уровень ученику.
 *
 * Та же формула, что у карты королевств и словаря: A1 открыт всегда, дальше —
 * до своего уровня включительно. Держим правило одинаковым во всех трёх
 * местах: разное «докуда открыто» на соседних экранах ученик читает как
 * поломку, а не как замысел.
 */
function isLevelOpen(levelCode, userLevel) {
  const eff = Math.max(levelIndex(userLevel), levelIndex('A1'))
  return levelIndex(levelCode) <= eff
}

/**
 * Карточка урока — обложка курса как в каталоге грамматики: градиент по теме
 * юнита, текстура, орб и дуга, крупный номер, лого JTS, название и юнит.
 * Геометрия бликов детерминированно разводится по id, чтобы соседние карточки
 * не выглядели одинаково.
 *
 * Отметка «пройдено» стоит соседом карточки, а не внутри неё: карточка сама
 * кнопка, открывающая урок, и кнопка внутри кнопки — невалидная разметка.
 * Поэтому кружок позиционируется поверх обложки, оставаясь отдельным элементом.
 */
function LessonCard({ lesson, unit, theme, no, done, onOpen, onToggle }) {
  const { t } = useI18n()
  const ang = 120 + ((lesson.id * 37) % 90)
  const ox = -70 + ((lesson.id * 29) % 80)
  const oy = -80 + ((lesson.id * 23) % 60)
  const os = 150 + ((lesson.id * 13) % 80)
  const markLabel = t(done ? 'selfStudy.unmark' : 'selfStudy.mark')
  return (
    <div className={`ss-card${done ? ' is-done' : ''}`}>
      <button
        type="button"
        className={`gr-gcard${done ? ' is-done' : ''}`}
        onClick={() => onOpen?.(lesson.id)}
      >
        <span
          className="gr-cover"
          data-th={theme}
          style={{ '--ang': `${ang}deg`, '--ox': `${ox}px`, '--oy': `${oy}px`, '--os': `${os}px` }}
        >
          <span className="gr-cov-tex" />
          <span className="gr-cov-orb" />
          <span className="gr-cov-arc" />
          <span className="gr-cov-no">{String(no).padStart(2, '0')}</span>
          <span className="gr-cov-brand">
            <span className="gr-cov-mark">JTS</span>
            <span className="gr-cov-wm">Just to Study</span>
          </span>
          <span className="gr-cov-ttl">{lesson.title}</span>
          <span className="gr-cov-tag">{unit.name}</span>
        </span>
        <span className="gr-gcard__body">
          <span className="gr-unit-no">{t(`catalog.type.${typeKey(lesson.type)}`)}</span>
          {/* Подпись про сам урок, а не про юнит: описание юнита стоит и в
              заголовке секции, и на обложке, и повторять его на каждой
              карточке — шум. `hasContent` же отличает урок с заданиями от
              материала, который просто открывается документом. */}
          <span className="gr-gcard__desc">
            {t(lesson.hasContent ? 'selfStudy.withTasks' : 'selfStudy.material')}
          </span>
          <span className="gr-gcard__t">{t('selfStudy.start')}</span>
        </span>
        {done && (
          <span className="gr-gcard__done">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('selfStudy.doneBadge')}
          </span>
        )}
      </button>
      <button
        type="button"
        className="ss-mark"
        onClick={() => onToggle(lesson.id)}
        aria-pressed={done}
        title={markLabel}
        aria-label={markLabel}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}

/**
 * Самостоятельное обучение: материалы каталога, которые ученик проходит сам.
 *
 * Каталог целиком — инструмент преподавателя, и ученику он не показывался
 * намеренно: там всё содержимое курса, включая уровни, до которых человек ещё
 * не дошёл. Поэтому здесь не «каталог для ученика», а его срез — уровни до
 * своего и только те уроки, которые преподаватель открыл (`locked`).
 *
 * Уровни разложены по чипам, как в каталоге грамматики: правило «докуда
 * открыто» тогда видно глазами, а не выводится из того, что список кончился.
 * Открывается на том, где ученик был в прошлый раз, а впервые — на самом
 * высоком доступном, то есть на том, до которого он дошёл.
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
  // Выбранный уровень переживает вход в урок: экран размонтируется, а ученик,
  // вернувшись кнопкой «К урокам», должен попасть туда, откуда уходил.
  const [picked, setPicked] = useState(readSelfStudyLevel)

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

  const open = useMemo(() => {
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
      // Чипы идут по возрастанию, и последний — тот, до которого ученик дошёл.
      // Порядок каталога на это полагаться не даёт: он про порядок заведения.
      .sort((a, b) => levelIndex(a.code) - levelIndex(b.code))
  }, [levels, userLevel])

  // Запомненный выбор перебивает умолчание, но только пока он валиден: каталог
  // мог обновиться, а уровень ученика — вырасти или, наоборот, оказаться ниже
  // сохранённого. Не нашли — открываем последний доступный, то есть тот, до
  // которого ученик дошёл.
  const active = open.find((l) => l.code === picked) || open[open.length - 1]

  if (!token) return <p className="cc__state">{t('selfStudy.needAuth')}</p>
  if (error) return <p className="cc__state cc__state--error">{t('catalog.error')}</p>
  if (levels === null) return <p className="cc__state">{t('catalog.loading')}</p>

  // Пусто по двум разным причинам, и ученику полезнее знать, по какой:
  // материалов ещё не завели — или его уровень пока ниже первого открытого.
  if (open.length === 0) {
    return <p className="cc__state">{t('selfStudy.empty')}</p>
  }

  return (
    <div className="ss">
      <p className="cc__subtitle">{t('selfStudy.lead')}</p>

      {/* Только открытые уровни: чип на недоступный уровень был бы обещанием,
          которого экран не выполнит. */}
      <div className="gr-levels">
        {open.map((level) => (
          <button
            key={level.code}
            type="button"
            className={`gr-levelchip${level.code === active.code ? ' on' : ''}`}
            aria-pressed={level.code === active.code}
            onClick={() => {
              setPicked(level.code)
              writeSelfStudyLevel(level.code)
            }}
          >
            {level.code}
          </button>
        ))}
      </div>

      {active.units.map((unit, ui) => (
        <section key={unit.id} className="pp-sec">
          <div className="pp-sec__head">
            <h2>
              {unit.emoji && <span aria-hidden="true">{unit.emoji} </span>}
              {unit.name}
              {/* «3 из 4», а не просто число уроков: в разделе, который
                  проходят сами, полезнее видеть остаток, а не объём. */}
              <span className="gr-unitpill">
                {t('selfStudy.ofTotal', {
                  n: String(unit.lessons.filter((l) => done.has(Number(l.id))).length),
                  total: String(unit.lessons.length),
                })}
              </span>
            </h2>
          </div>

          <div className="gr-grid">
            {unit.lessons.map((lesson, li) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                unit={unit}
                theme={ui % 8}
                no={li + 1}
                done={done.has(Number(lesson.id))}
                onOpen={onOpenLesson}
                onToggle={toggleDone}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
