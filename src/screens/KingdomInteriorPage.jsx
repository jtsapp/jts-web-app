import { useEffect, useState, useCallback, useMemo } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { ChevronLeftIcon, CastleIcon } from '../components/icons.jsx'
import { useI18n } from '../i18n.jsx'
import { getLessonModules, getPracticeToken, completeLessonModule, getContentQuota } from '../api.js'
import { getLevelLessons, loadLesson } from '../learning/lessonData.js'
import { loadDone, markDone, ContentRestrictedError } from '../learning/lessonProgress.js'
import LessonPlayer from '../learning/LessonPlayer.jsx'
import { SUPPORT_WHATSAPP_URL } from '../lib/support.js'
import { kingdomAvatar } from '../kingdoms.js'
import { getCourseIndex, courseTrail, loadCourseSteps } from '../learning/courseData.js'
import { isStepLevel, tasksToSteps } from '../learning/nativeSteps.js'
import CourseStepPlayer from '../learning/CourseStepPlayer.jsx'

// Кольцо общего прогресса королевства (пройдено/всего уроков) — по шапке
// мобильного приложения (Figma node 903-3033).
function ProgressRing({ done = 0, total = 0, size = 54, showLabel = true }) {
  const r = 22
  const c = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(1, done / total) : 0
  const offset = c * (1 - pct)
  return (
    <svg className="kh-ring" width={size} height={size} viewBox="0 0 54 54">
      <circle cx="27" cy="27" r={r} className="kh-ring__track" />
      <circle cx="27" cy="27" r={r} className="kh-ring__value" strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 27 27)" />
      {showLabel && (
        <text x="27" y="28" className="kh-ring__label" dominantBaseline="middle" textAnchor="middle">
          {done}/{total}
        </text>
      )}
    </svg>
  )
}

// Иконки экрана итогов — выгружены из макета (Figma «Обучение» → Wrap):
// Streamline Ultimate «Smiley-Wrong», Streamline Plump «Check-Thick» и группа
// разбитого сердца. Рисуем их разметкой, а не картинками: они однотонные и
// должны попадать в цвет карточки.
function WrongIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 21 21" fill="none" aria-hidden="true">
      <g stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0.65625 10.5C0.65625 13.1107 1.69335 15.6145 3.53942 17.4606C5.38548 19.3066 7.88927 20.3438 10.5 20.3438C13.1107 20.3438 15.6145 19.3066 17.4606 17.4606C19.3066 15.6145 20.3438 13.1107 20.3438 10.5C20.3438 7.88927 19.3066 5.38548 17.4606 3.53942C15.6145 1.69335 13.1107 0.65625 10.5 0.65625C7.88927 0.65625 5.38548 1.69335 3.53942 3.53942C1.69335 5.38548 0.65625 7.88927 0.65625 10.5Z" />
        <path d="M5.90625 7.21875H8.53125" />
        <path d="M7.21875 8.53125V5.90625" />
        <path d="M12.4688 7.21875H15.0938" />
        <path d="M13.7812 8.53125V5.90625" />
        <path d="M5.90625 15.0941C5.90625 12.8506 6.94925 11.9922 8.41225 11.9922C10.9498 11.9922 10.0494 15.0941 12.5877 15.0941C14.0525 15.0941 15.0938 14.2348 15.0938 11.9922" />
      </g>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.2067 3.80546C18.615 4.36213 18.5242 5.11171 18.1442 5.68796C14.5879 11.0755 12.0267 14.3484 10.6096 16.0421C9.90667 16.8817 8.68583 16.9434 7.89083 16.1896C5.8202 14.2207 3.87435 12.1245 2.06458 9.91338C1.56042 9.29546 1.45625 8.42338 1.94708 7.79463C2.37375 7.24796 2.86083 6.7788 3.30125 6.40713C4.03167 5.79046 5.08625 5.93046 5.74292 6.62546C7.76917 8.77213 8.99042 10.2713 8.99042 10.2713C8.99042 10.2713 10.9979 7.33796 14.2188 2.82546C14.7175 2.12671 15.6063 1.8013 16.3571 2.21755C16.96 2.55213 17.6608 3.0613 18.2067 3.80505V3.80546Z"
        fill="#fff"
      />
    </svg>
  )
}

function BrokenHeartIcon() {
  return (
    <svg width="64" height="55" viewBox="0 0 64 55" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M62.1798 19.8545C61.4733 29.7333 54.9723 38.0652 48.3111 43.7629C44.9483 46.6388 41.4525 48.9255 38.4345 50.4808C36.9264 51.2577 35.5075 51.8679 34.26 52.2757C33.0681 52.6655 31.8341 52.9383 30.7732 52.8625C30.3745 52.8339 29.9586 52.7532 29.535 52.634L34.26 39.1903L33.2805 31.9679L37.325 25.9011L35.3028 18.6787L38.4345 15.212L35.3028 11.1675L39.9843 8.56741L39.9843 2.8578C41.1453 2.29946 42.3011 1.88582 43.4463 1.61045C47.1547 0.718738 50.607 1.31538 53.5052 2.92696C59.2086 6.09808 62.5663 13.0425 62.1816 19.8228L62.1798 19.8545Z"
        fill="url(#le-heart-a)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M29.9859 52.5958C29.2644 52.4799 28.5098 52.2611 27.7729 51.9972C26.5371 51.5549 25.1358 50.9054 23.6499 50.087C20.6763 48.4484 17.2453 46.0654 13.964 43.0972C7.46355 37.2165 1.19664 28.7072 0.764991 18.8125L0.763845 18.7808C0.568176 11.9925 4.11738 5.14404 9.9064 2.13267C12.8485 0.60225 16.316 0.101786 19.9982 1.09622C23.0652 1.92448 26.1808 3.76032 29.2373 6.72707C30.9907 4.6999 24.4408 12.4909 26.2894 11.3235L29.2373 14.5014L23.6499 16.2347L27.7729 18.8125L22.8227 25.4794L27.7729 30.3906L24.2671 36.4574L27.7729 40.213L29.9859 52.5958Z"
        fill="url(#le-heart-b)"
      />
      <defs>
        <linearGradient id="le-heart-a" x1="34.5343" y1="0.278752" x2="30.7738" y2="52.8625" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F83C3C" />
          <stop offset="1" stopColor="#FF5C5C" />
        </linearGradient>
        <linearGradient id="le-heart-b" x1="28.9447" y1="0.0126847" x2="31.2423" y2="52.6806" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F83C3C" />
          <stop offset="1" stopColor="#FF5C5C" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// Горизонтальное смещение узла в «лесенке» юнита. В макете колонка узлов
// шириной 200 при узле 100, а сами узлы идут центр → влево → вправо → центр
// (Figma «Обучение», Screen 4005:30480, кадр List).
const KT_OFFSET = [50, 0, 100, 50]

// Интерьер королевства: нативная тропа уроков уровня + нативный плеер урока
// (LessonPlayer). Раньше здесь был iframe hosted-Speakout — теперь весь урок
// рендерится React-компонентами из public/learning/<level>.json (экстрактор
// scripts/extract-kingdom-lessons.js). Прогресс — на бэкенде (lessonProgress).
export default function KingdomInteriorPage({ kingdom, userName, userLevel, token, unlockAll = false, onNav, onProfile, onBack, isDemoAccount }) {
  const { t } = useI18n()
  const k = kingdom || { id: 'sunhaven', name: 'Sunhaven', king: 'Майкл Флот', level: 'A1' }
  const level = k.level || userLevel || 'A1'

  const [state, setState] = useState({ loading: true, error: null })
  const [moduleId, setModuleId] = useState(null)
  const [lessons, setLessons] = useState([]) // [{code,order,title,taskCount}]
  // Уровень переведён на перенесённый курс (public/course/<level>/): тропа и
  // сам урок берутся оттуда, а не из public/learning/<level>.json. Уровни без
  // такого каталога продолжают работать по-старому.
  const [course, setCourse] = useState(null)
  const [done, setDone] = useState(new Set()) // пройденные коды
  // Модуль закрыт админом для ЭТОГО студента (флаг locked из
  // GET /mobile/lesson-modules) — тропа целиком недоступна.
  const [moduleLocked, setModuleLocked] = useState(false)
  // Квота «сколько уроков модуля можно пройти» (см. ContentQuotaService на
  // бэкенде) — null значит без лимита. В отличие от moduleLocked (весь модуль
  // разом), это блокирует уроки НАЧИНАЯ с индекса moduleQuota, а не в конце.
  const [moduleQuota, setModuleQuota] = useState(null)
  // Квота «N из M» исчерпана: бэкенд отдал 403 на завершении урока. Урок
  // не засчитан, показываем это на экране итогов вместо тихой синхронизации.
  const [restricted, setRestricted] = useState(false)

  const [open, setOpen] = useState(null) // { code, data, attempt } — открытый урок
  const [busy, setBusy] = useState(false) // грузим данные урока
  const [end, setEnd] = useState(null) // { outcome, correct, wrong, accuracy, points }
  const [confirmExit, setConfirmExit] = useState(false)

  useEffect(() => {
    let alive = true
    setState({ loading: true, error: null })
    ;(async () => {
      try {
        // Токен для бэкенда (сердца/монеты/прогресс). Каталог уроков уровня —
        // из статики; модуль этого уровня — для moduleId (прогресс) и total.
        let authToken = token
        try {
          authToken = (await getPracticeToken(token)) || token
        } catch {
          /* без practice-токена читаем прогресс под обычным token */
        }
        const [mods, oldTrail, courseIndex] = await Promise.all([
          getLessonModules(authToken).catch(() => []),
          getLevelLessons(level).catch(() => []),
          getCourseIndex(level),
        ])
        if (!alive) return
        const trail = courseIndex ? courseTrail(courseIndex) : oldTrail
        setCourse(courseIndex)
        const want = String(level).toUpperCase()
        const mod = (Array.isArray(mods) ? mods : [])
          .filter((m) => String(m.level || '').toUpperCase() === want)
          .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))[0]
        const mid = mod ? mod.id : null
        setModuleId(mid)
        setModuleLocked(!!mod?.locked)
        setModuleQuota(mid != null ? await getContentQuota(authToken, 'LESSON_MODULE', mid) : null)
        setLessons(trail)
        const d = await loadDone(level, authToken, mid)
        if (!alive) return
        setDone(new Set(d))
        setState({ loading: false, error: trail.length ? null : 'empty' })
      } catch (e) {
        if (alive) setState({ loading: false, error: e.message || 'error' })
      }
    })()
    return () => {
      alive = false
    }
  }, [level, token])

  const total = lessons.length
  const doneCount = lessons.filter((l) => done.has(l.code)).length

  // Группировка тропы по юнитам (l.unit): подряд идущие уроки с одним unit —
  // один юнит; gi — глобальный индекс урока (нужен для блокировки).
  const units = useMemo(() => {
    const out = []
    lessons.forEach((l, gi) => {
      const key = l.unit ?? 1
      let g = out[out.length - 1]
      if (!g || g.unit !== key) {
        g = { unit: key, items: [] }
        out.push(g)
      }
      g.items.push({ l, gi })
    })
    return out
  }, [lessons])

  // Урок разблокирован, если это первый или предыдущий пройден, модуль не
  // закрыт админом целиком, и индекс урока не упирается в квоту "сколько
  // уроков этого модуля можно пройти" (moduleQuota=null — без лимита). Раньше
  // квота проверялась только В МОМЕНТ завершения урока (403 от бэкенда) — тропа
  // при этом всё равно рисовала следующие уроки открытыми для клика, и студент
  // мог их пройти вплоть до конца, просто без начисления награды. Теперь узлы
  // сверх квоты не открываются вовсе, как и просил менеджер.
  //
  // unlockAll (?unlock=1, только dev) снимает последовательность, но НЕ
  // ограничения админа: блокировку модуля и квоту не обходит даже просмотр
  // контента.
  const isUnlocked = useCallback(
    (i) =>
      !moduleLocked &&
      (moduleQuota == null || i < moduleQuota) &&
      (unlockAll || i === 0 || (lessons[i - 1] && done.has(lessons[i - 1].code))),
    [lessons, done, moduleLocked, moduleQuota, unlockAll],
  )

  const openLesson = useCallback(
    async (code) => {
      // Урок рендерится из статики (public/learning/<level>.json), а не с
      // бэкенда, поэтому 403 на модуле сам по себе его не закрывает —
      // проверяем здесь, иначе диплинк/гонка загрузки откроют закрытый урок.
      // Кнопка узла тропы уже disabled при !unlocked — эта проверка на случай
      // прямого вызова (goNext, диплинк) в обход клика по узлу.
      if (moduleLocked) return
      const i = lessons.findIndex((l) => l.code === code)
      if (i >= 0 && !isUnlocked(i)) return
      setBusy(true)
      setEnd(null)
      setRestricted(false)
      try {
        // Урок курса — очередь шагов, собранная из его же контента
        // (scripts/build-course-steps.js). L<n> — урок, T<u> — тест юнита.
        if (course) {
          const m = /^([LT])(\d+)$/.exec(code)
          if (!m) return
          // L<n> — урок, T<u> — юнит-тест: файлы шагов лежат рядом.
          const data = await loadCourseSteps(level, m[1] === 'L' ? m[2] : 'T' + m[2])
          if (data) setOpen({ code, attempt: 0, steps: data })
          return
        }
        const data = await loadLesson(level, code)
        if (!data) return
        // A0/A1 хранят урок уже по одному заданию на экран — отдаём их новому
        // плееру; B2/C1 остаются на старом (у них свои типы chips/watch).
        if (isStepLevel(level)) {
          const steps = tasksToSteps(data)
          setOpen({ code, attempt: 0, steps: { title: data.title, blurb: '', steps } })
          return
        }
        setOpen({ code, data, attempt: 0 })
      } finally {
        setBusy(false)
      }
    },
    [level, moduleLocked, lessons, isUnlocked, course],
  )

  const retry = () => {
    setEnd(null)
    setOpen((o) => (o ? { ...o, attempt: o.attempt + 1 } : o))
  }

  const goNext = () => {
    const i = lessons.findIndex((l) => l.code === open?.code)
    const next = i >= 0 ? lessons[i + 1] : null
    // Квота исчерпана ровно на границе (только что прошли последний доступный
    // урок): следующий уже заблокирован isUnlocked. Не открываем его молча —
    // остаёмся на экране итогов, переключая на тот же "🔒 квота" вид, что и
    // при отказе бэкенда на завершении (см. onDone/ContentRestrictedError).
    if (next && !isUnlocked(i + 1)) {
      setRestricted(true)
      return
    }
    setEnd(null)
    if (next) openLesson(next.code)
    else setOpen(null) // последний урок — назад на тропу
  }

  const onDone = useCallback(
    async (stats) => {
      setEnd(stats)
      setRestricted(false)
      if (stats.outcome !== 'success' || !open) return
      // Отмечаем урок пройденным (бэкенд + локально). Монеты/XP/стрик начисляет
      // сам per-lesson complete (в markDone) — один раз за урок. Если модуль не
      // найден (moduleId=null), падаем на модульный complete, чтобы награда не
      // пропала; двойного начисления нет — ветки взаимоисключающие.
      let next
      try {
        next = await markDone(level, token, moduleId, open.code, stats.points)
      } catch (e) {
        // Квота исчерпана / модуль закрыт: урок НЕ засчитан. Раньше это
        // исключение просто гасилось внутри markDone, урок падал в localStorage
        // и тропа ехала дальше — ограничение из админки не срабатывало вовсе.
        if (e instanceof ContentRestrictedError) {
          setRestricted(true)
          return
        }
        throw e
      }
      setDone(new Set(next))
      if (moduleId == null && token && stats.points > 0) {
        completeLessonModule(token, stats.points).catch(() => {})
      }
    },
    [open, level, token, moduleId],
  )

  // «Назад»: из незаконченного урока — подтверждение; с экрана итогов — уходим
  // целиком (и урок, и итоги), с тропы — из королевства.
  const handleBack = () => {
    if (open && !end) setConfirmExit(true)
    else if (open) exitLesson()
    else onBack()
  }
  const exitLesson = () => {
    setConfirmExit(false)
    setEnd(null)
    setOpen(null)
  }

  const { loading, error } = state

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="learning" onNav={onNav} onProfile={onProfile}>
      {/* Верхняя навигация — только для состояний без шапки-баннера (загрузка/
          ошибка/пусто). В основном виде «Назад» живёт в самой шапке. */}
      {(loading || !!error) && (
        <div className="li-top">
          <button className="li-back" onClick={handleBack}>
            <ChevronLeftIcon size={18} />
            {t('common.back')}
          </button>
          <div className="li-crumb">
            <b>{t('kingdom.title', { name: k.name })}</b>
            <span>{t('kingdom.levelBadge', { label: level })}</span>
          </div>
        </div>
      )}

      {loading && (
        <div className="ki-state">
          <div className="ki-spinner" />
          <p>{t('lessons.loading')}</p>
        </div>
      )}

      {!loading && error && error !== 'empty' && (
        <div className="ki-state ki-state--error">
          <p>{t('lessons.error')}</p>
        </div>
      )}

      {!loading && error === 'empty' && (
        <div className="li-empty">
          <img className="li-empty__art" src={`/assets/world/kings/${k.id}.webp`} alt={k.name} />
          <div className="li-empty__title">{t('kingdom.empty')}</div>
        </div>
      )}

      {/* Модуль закрыт преподавателем — тропу не показываем вообще (раньше
          рисовали её серой): закрытый контент не должен маячить перед глазами.
          Экран в том же стиле, что «в королевстве пока пусто». */}
      {!loading && !error && !open && moduleLocked && (
        <div className="li-empty">
          <div className="li-top">
            <button className="li-back" onClick={onBack}>
              <ChevronLeftIcon size={18} />
              {t('common.back')}
            </button>
          </div>
          <div className="li-empty__title">🔒 {t('learn.moduleLocked')}</div>
        </div>
      )}

      {!loading && !error && !open && !moduleLocked && (
        <div className="km-scroll">
          {/* Верхняя полоса: «Назад» и хлебные крошки королевства (макет Figma
              «Обучение», Screen 4005:30480). Раньше и то и другое жило внутри
              цветной шапки-баннера — теперь шапка стала карточкой уровня. */}
          <div className="kt-bar">
            <button className="kt-bar__back" onClick={handleBack}>
              <ChevronLeftIcon size={18} />
              {t('common.back')}
            </button>
            <span className="kt-bar__castle" aria-hidden="true">
              <CastleIcon size={18} />
            </span>
            <div className="kt-bar__place">
              <b>{k.name}</b>
              <span>{t('kingdom.levelBadge', { label: level })}</span>
            </div>
          </div>

          <div className="kt-body">
            <div className="kt-hero" style={{ background: k.ring }}>
              <div className="kt-hero__text">
                <div className="kt-hero__level">{t('kingdom.levelBadge', { label: level })}</div>
                <div className="kt-hero__prog">
                  <ProgressRing done={doneCount} total={total} size={24} showLabel={false} />
                  <span>{t('learn.done')} {doneCount}/{total}</span>
                </div>
              </div>
              <img
                className="kt-hero__mascot"
                src={`/assets/world/levels/${kingdomAvatar(k)}.webp`}
                alt=""
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            </div>

            {/* Тропа: узлы сгруппированы по юнитам (l.unit), внутри юнита —
                «лесенка» из 3D-печенек. Смещение по горизонтали задано макетом
                и повторяется с периодом 4: центр, влево, вправо, центр. */}
            {units.map((g) => {
              const doneN = g.items.filter(({ l }) => done.has(l.code)).length
              return (
                <section key={g.unit} className="kt-unit">
                  <div className="kt-unit__head">
                    <span className="kt-unit__title">
                      {g.unit === 0 ? t('lesson.examUnit') : t('lesson.unit', { n: g.unit })}
                    </span>
                    <span className="kt-unit__count">
                      {doneN}/{g.items.length}
                    </span>
                  </div>

                  <ol className="kt-list" style={{ height: `${g.items.length * 100}px` }}>
                    {g.items.map(({ l, gi }, j) => {
                      const isDone = done.has(l.code)
                      const unlocked = isUnlocked(gi)
                      // «Кубок» — последний узел юнита (у курса это юнит-тест),
                      // у него в макете своя, золотая печенька.
                      const isLast = j === g.items.length - 1
                      const state = isDone ? 'complete' : unlocked ? 'active' : 'inactive'
                      const cls = `kt-step is-${state}${isLast ? ' is-last' : ''}`
                      return (
                        <li key={l.code} className="kt-list__cell" style={{ left: `${KT_OFFSET[j % 4]}px`, top: `${j * 100}px` }}>
                          <button
                            className={cls}
                            disabled={!unlocked || busy}
                            onClick={() => openLesson(l.code)}
                            title={!unlocked ? t('lesson.locked') : l.title || l.code}
                            aria-label={l.title || l.code}
                          />
                        </li>
                      )
                    })}
                  </ol>
                </section>
              )
            })}
          </div>
        </div>
      )}

      {/* Открытый урок: перенесённый курс рисует себя сам, остальные уровни —
          нативным плеером (замена iframe).

          С экрана итогов плеер снимаем совсем. Раньше он оставался под
          итогами: страница прокручивалась к «пройденному» уроку с живыми
          кнопками, а его «Выйти» уводил в пустой экран — итоги оставались
          показанными поверх уже закрытого урока. */}
      {!loading && open && !end && (
        <div className="km-lesson">
          {open.steps ? (
            <CourseStepPlayer
              key={`${open.code}-${open.attempt}`}
              level={level}
              steps={open.steps.steps}
              title={open.steps.title}
              subtitle={open.steps.blurb}
              passRatio={open.steps.passRatio ?? null}
              onExit={handleBack}
              onDone={onDone}
            />
          ) : (
            <LessonPlayer
              key={`${open.code}-${open.attempt}`}
              lesson={open.data}
              level={level}
              token={token}
              onExit={handleBack}
              onDone={onDone}
            />
          )}
        </div>
      )}

      {/* Итоги урока — по макету Figma «Обучение» → секция Wrap. Маскот слева
          цельной картинкой: в макете персонаж выходит за скруглённый фон, и
          собирать это из CSS-фона плюс вырезанного персонажа значит терять
          напуски и кадрирование. */}
      {end && end.outcome === 'success' && (
        <div className="le-over le-over--ok">
          <div className="le-card">
            <img className="le-art le-art--win" src="/assets/learning/result-win.webp" alt="" />
            <div className="le-info">
              <div className="le-pct">{end.accuracy ?? 100}%</div>
              <div className="le-head">
                <h2 className="le-title">
                  {(end.accuracy ?? 100) >= 80 ? 'Отличный результат' : (end.accuracy ?? 100) >= 50 ? 'Хорошая работа' : 'Урок пройден'}
                </h2>
                <p className="le-sub">{open?.steps?.title || t('learn.done')} — пройден</p>
              </div>
              <div className="le-bottom">
                <div className="le-stats">
                  <div className="le-stat le-stat--wrong">
                    <div className="le-stat__row">
                      <span className="le-stat__ic" aria-hidden="true">
                        <WrongIcon />
                      </span>
                      <b>{end.wrong ?? 0}</b>
                    </div>
                    <span>Неверных ответов</span>
                  </div>
                  <div className="le-stat le-stat--right">
                    <div className="le-stat__row">
                      <span className="le-stat__ic" aria-hidden="true">
                        <CheckIcon />
                      </span>
                      <b>{end.correct ?? 0}</b>
                    </div>
                    <span>Верных ответов</span>
                  </div>
                </div>
                {/* Урок решён верно, но не засчитан: лимит от админа. Прячем
                    «следующий урок» — он всё равно упрётся в тот же отказ. */}
                {restricted ? (
                  <div className="le-acts">
                    <div className="le-restricted" role="status">
                      🔒{' '}
                      {isDemoAccount ? (
                        <>
                          {t('learn.quotaReachedDemo')}{' '}
                          <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                            {t('demo.cta')}
                          </a>
                        </>
                      ) : (
                        t('learn.quotaReached')
                      )}
                    </div>
                    <button className="le-btn" onClick={exitLesson}>
                      {t('common.back')}
                    </button>
                  </div>
                ) : (
                  <div className="le-acts">
                    <button className="le-btn" onClick={goNext}>
                      Перейти на следующий урок
                    </button>
                    <button className="le-again" onClick={retry}>
                      Пройти снова
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Итоги урока (провал — сердца кончились) */}
      {end && end.outcome === 'fail' && (
        <div className="le-over le-over--fail">
          <div className="le-card le-card--fail">
            <img className="le-art le-art--lose" src="/assets/learning/result-lose.webp" alt="" />
            <div className="le-info le-info--fail">
              <div className="le-fail">
                <div className="le-heart">
                  <BrokenHeartIcon />
                  <span>Жизней больше нет</span>
                </div>
                <div className="le-head">
                  <h2 className="le-title">Ой-ой</h2>
                  <p className="le-sub le-sub--bold">Видимо, нужно попробовать еще раз</p>
                </div>
              </div>
              <button className="le-btn" onClick={retry}>
                Попробовать еще раз
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Подтверждение выхода из незаконченного урока */}
      {confirmExit && (
        <div className="lx-over" onClick={() => setConfirmExit(false)}>
          <div className="lx-card" onClick={(e) => e.stopPropagation()}>
            <button className="lx-close" aria-label={t('common.close')} onClick={() => setConfirmExit(false)}>
              ×
            </button>
            <img className="lx-art" src="/assets/lesson/exit.png" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
            <h2 className="lx-title">{t('lesson.exitAsk')}</h2>
            <div className="lx-sub">{t('lesson.exitAskSub')}</div>
            <div className="lx-acts">
              <button className="le-btn lx-continue" onClick={() => setConfirmExit(false)}>
                {t('lesson.exitStay')}
              </button>
              <button className="lx-leave" onClick={exitLesson}>
                {t('lesson.exitLeave')}
              </button>
            </div>
          </div>
        </div>
      )}
    </LearningLayout>
  )
}
