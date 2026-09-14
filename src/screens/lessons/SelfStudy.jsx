import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { getCourseCatalog, getCatalogProgress, completeCatalogLesson, uncompleteCatalogLesson } from '../../api.js'
import { levelIndex } from '../../kingdoms.js'
import { readSelfStudyLevel, writeSelfStudyLevel } from './selfStudyLevel.js'
import { compareCourses, courseCaptions, courseKey, courseShortName, defaultCourse, findPickedCourse } from './selfStudyCourses.js'

/** Замок на чипе закрытого уровня и на карточке-заглушке. */
function LockIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2.5" fill="currentColor" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

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
function Cover({ lesson, unit, theme, no, children }) {
  const ang = 120 + ((lesson.id * 37) % 90)
  const ox = -70 + ((lesson.id * 29) % 80)
  const oy = -80 + ((lesson.id * 23) % 60)
  const os = 150 + ((lesson.id * 13) % 80)
  return (
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
      {children}
    </span>
  )
}

/**
 * Материал уровня, который ещё не куплен.
 *
 * Показан целиком — с названием, разделом и типом: закрытое содержимое, о
 * котором ничего не сказано, не продаётся, а прежняя заглушка «уровень закрыт»
 * сообщала ровно то, что ученик и так видел по замку на чипе. Нажатие ведёт в
 * тарифы: это единственное, что здесь можно сделать, и притворяться кнопкой
 * «Пройти» карточка не должна.
 *
 * Материал курса с отдельным доступом (`byGrant`) тарифом не открывается вовсе:
 * такой курс открывает только выдача менеджера, и дорога в тарифы вела бы туда,
 * где его нет. Поэтому там карточка не кнопка, а спокойный замок с подсказкой,
 * к кому идти, — нажать её значит никуда не попасть, и обещать нажатие нечего.
 */
function PaywallCard({ lesson, unit, theme, no, byGrant, onBuy }) {
  const { t } = useI18n()
  if (byGrant) {
    return (
      <div className="ss-card">
        <div className="gr-gcard ss-paywall ss-paywall--grant">
          <Cover lesson={lesson} unit={unit} theme={theme} no={no}>
            <span className="ss-paywall__lock"><LockIcon size={20} /></span>
          </Cover>
          <span className="gr-gcard__body">
            <span className="gr-unit-no">{t(`catalog.type.${typeKey(lesson.type)}`)}</span>
            <span className="gr-gcard__desc">{t('selfStudy.courseLockNote')}</span>
          </span>
        </div>
      </div>
    )
  }
  return (
    <div className="ss-card">
      <button type="button" className="gr-gcard ss-paywall" onClick={() => onBuy?.()}>
        <Cover lesson={lesson} unit={unit} theme={theme} no={no}>
          <span className="ss-paywall__lock"><LockIcon size={20} /></span>
        </Cover>
        <span className="gr-gcard__body">
          <span className="gr-unit-no">{t(`catalog.type.${typeKey(lesson.type)}`)}</span>
          <span className="gr-gcard__desc">{t('selfStudy.paywallNote')}</span>
          <span className="gr-gcard__t">{t('selfStudy.paywallCta')}</span>
        </span>
      </button>
    </div>
  )
}

function LessonCard({ lesson, unit, theme, no, done, onOpen, onToggle }) {
  const { t } = useI18n()
  const markLabel = t(done ? 'selfStudy.unmark' : 'selfStudy.mark')
  return (
    <div className={`ss-card${done ? ' is-done' : ''}`}>
      <button
        type="button"
        className={`gr-gcard${done ? ' is-done' : ''}`}
        onClick={() => onOpen?.(lesson.id)}
      >
        <Cover lesson={lesson} unit={unit} theme={theme} no={no} />
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
export default function SelfStudy({ token, userLevel = 'A1', onOpenLesson, onOpenPricing }) {
  const { t, lang } = useI18n()
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

  const shown = useMemo(() => {
    return (levels || [])
      .map((level) => ({
        ...level,
        // Замок ставит сервер: у него и уровень ученика, и выданные админом
        // уровни (LevelAccessService). Прежняя формула на клиенте про выдачи не
        // знала бы вовсе, а держать правило в двух местах — способ их разойти.
        // Поле необязательное: старый бэкенд его не шлёт, и тогда падаем на
        // прежнюю формулу, а не запираем ученику весь курс. Курс с отдельным
        // доступом эта формула не открывает: его открывает только выдача, а о
        // ней знает один сервер.
        locked: typeof level.locked === 'boolean'
          ? level.locked
          : Boolean(level.separateAccess) || !isLevelOpen(level.code, userLevel),
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
      .map((level) => ({
        ...level,
        // Витринные материалы отмечает сервер (первые несколько на уровень в
        // каждом режиме). Клиент своих трёх не отсчитывает: «первые три» на
        // экране и «первые три» в проверке доступа обязаны совпадать, иначе
        // ученик получит отказ на материал, который ему показали открытым.
        previewCount: level.units.reduce(
          (n, unit) => n + unit.lessons.filter((l) => l.preview).length,
          0,
        ),
      }))
      // Чипы идут по возрастанию — так же, как идёт курс; внутри уровня общий
      // курс раньше отдельного (см. compareCourses). Порядок каталога на это
      // полагаться не даёт: он про порядок заведения.
      .sort(compareCourses)
  }, [levels, userLevel])

  // Код уровня у двух курсов бывает один и тот же, поэтому где он повторяется,
  // рядом с ним на чипе стоит имя курса. Имя считается по всему каталогу, а не
  // по показанному: так курс зовётся одинаково здесь и в админке.
  const captions = useMemo(() => courseCaptions(shown, levels || []), [shown, levels])

  // Запомненный выбор перебивает умолчание, но только пока он валиден: каталог
  // мог обновиться, а уровень ученика — вырасти или, наоборот, оказаться ниже
  // сохранённого. Не нашли — открываем последний доступный, то есть тот, до
  // которого ученик дошёл.
  const pickedCourse = findPickedCourse(shown, picked)
  const active = pickedCourse || defaultCourse(shown)

  // В браузере мог остаться выбор старого формата — код уровня. Он уже привёл
  // на курс; переписываем его на id, чтобы следующий курс того же уровня не
  // перехватил выбор. Только открытый — по той же причине, что и на клике.
  useEffect(() => {
    if (pickedCourse && !pickedCourse.locked && courseKey(pickedCourse) !== picked) {
      writeSelfStudyLevel(courseKey(pickedCourse))
    }
  }, [pickedCourse, picked])

  if (!token) return <p className="cc__state">{t('selfStudy.needAuth')}</p>
  if (error) return <p className="cc__state cc__state--error">{t('catalog.error')}</p>
  if (levels === null) return <p className="cc__state">{t('catalog.loading')}</p>

  // Пусто по двум разным причинам, и ученику полезнее знать, по какой:
  // материалов ещё не завели — или его уровень пока ниже первого открытого.
  if (shown.length === 0 || !active) {
    return <p className="cc__state">{t('selfStudy.empty')}</p>
  }

  // Курс с отдельным доступом закрыт не потому, что он выше уровня ученика:
  // «Уровень B2 пока закрыт» рядом с открытым общим B2 читалось бы как
  // поломка, а совет обновить тариф — как неправда. Про него говорим курсом.
  const courseName = captions.get(courseKey(active)) || courseShortName(active.label, active.code) || active.code
  const lockedTitle = active.separateAccess
    ? t('selfStudy.courseLockedTitle', { course: courseName })
    : t('selfStudy.lockedTitle', { level: active.code })
  const lockedText = t(active.separateAccess ? 'selfStudy.courseLockedText' : 'selfStudy.lockedText')
  const previewTitle = active.separateAccess
    ? t('selfStudy.coursePreviewTitle', { course: courseName })
    : t('selfStudy.previewTitle', { level: active.code })
  // Витрину сервер размечает любому закрытому курсу, в том числе отдельному, —
  // а тот подпиской не открывается. Про него «остальные откроются с подпиской»
  // было бы неправдой, и кнопка тарифов тоже: остальное открывает менеджер.
  // Число витрины стоит во фразе, поэтому форма — по числу: одна строка на
  // все случаи давала «Первые 1 материала».
  const previewText = plural(
    t,
    lang,
    active.separateAccess ? 'selfStudy.coursePreviewText' : 'selfStudy.previewText',
    active.previewCount,
  )
  const canBuy = Boolean(onOpenPricing) && !active.separateAccess

  return (
    <div className="ss">
      <p className="cc__subtitle">{t('selfStudy.lead')}</p>

      {/* Показываем ВСЕ уровни, чужие — с замком. Раньше их просто не было в
          списке, и курс выглядел заканчивающимся там, где он продолжается:
          ученик не знал ни что дальше есть, ни что для этого нужно. */}
      <div className="gr-levels">
        {shown.map((level) => {
          const key = courseKey(level)
          const on = level === active
          const caption = captions.get(key)
          return (
            <button
              key={key}
              type="button"
              className={`gr-levelchip${on ? ' on' : ''}${level.locked ? ' is-locked' : ''}`}
              aria-pressed={on}
              // Имя на чипе режется многоточием — полное название курса в
              // подсказке, чтобы его можно было дочитать.
              title={caption ? level.label || undefined : undefined}
              onClick={() => {
                setPicked(key)
                // Запоминаем только открытый: вернуть ученика на замок вместо
                // урока было бы издевательством.
                if (!level.locked) writeSelfStudyLevel(key)
              }}
            >
              {level.locked && <LockIcon />}
              {level.code}
              {caption && <>{' '}<span className="gr-levelchip__name">{caption}</span></>}
            </button>
          )
        })}
      </div>

      {/* Закрытый уровень показываем целиком: первые материалы открыты, за
          остальными — подписка (у отдельного курса — выдача менеджера). Раньше
          здесь стояла заглушка «уровень закрыт», то есть ровно то, что ученик
          и так видел по замку на чипе. */}
      {active.locked && active.previewCount > 0 && (
        <div className="ss-preview">
          <span className="ss-preview__badge"><LockIcon size={20} /></span>
          <div className="ss-preview__body">
            <h2 className="ss-preview__title">{previewTitle}</h2>
            <p className="ss-preview__text">{previewText}</p>
          </div>
          {canBuy && (
            <button type="button" className="ss-preview__cta" onClick={() => onOpenPricing()}>
              {t('selfStudy.previewCta')}
            </button>
          )}
        </div>
      )}

      {/* Старый бэкенд витрины не размечает — тогда остаётся прежняя заглушка:
          закрытый уровень без единого открытого материала это просто стена
          замков, и показывать её россыпью карточек хуже, чем одной фразой. */}
      {active.locked && active.previewCount === 0 ? (
        <div className="ss-locked">
          <span className="ss-locked__badge"><LockIcon size={22} /></span>
          <h2 className="ss-locked__title">{lockedTitle}</h2>
          <p className="ss-locked__text">{lockedText}</p>
        </div>
      ) : active.units.map((unit, ui) => (
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
              active.locked && !lesson.preview ? (
                <PaywallCard
                  key={lesson.id}
                  lesson={lesson}
                  unit={unit}
                  theme={ui % 8}
                  no={li + 1}
                  byGrant={Boolean(active.separateAccess)}
                  onBuy={onOpenPricing}
                />
              ) : (
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
              )
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
