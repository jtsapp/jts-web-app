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

      {/* Итоги урока (макет Figma «Обучение», секция Wrap): слева маскот на
          цветной карточке, справа — результат и кнопки. */}
      {end && end.outcome === 'success' && (
        <div className="le-over le-over--ok">
          <div className="le-card">
            <div className="le-art le-art--win">
              <img src="/assets/learning/result-win.webp" alt="" />
            </div>
            <div className="le-info">
              <div className="le-pct">{end.accuracy ?? 100}%</div>
              <h2 className="le-title">
                {(end.accuracy ?? 100) >= 80 ? 'Отличный результат' : (end.accuracy ?? 100) >= 50 ? 'Хорошая работа' : 'Урок пройден'}
              </h2>
              <div className="le-sub">{open?.steps?.title || t('learn.done')} — пройден</div>
              <div className="le-stats">
                <div className="le-stat le-stat--wrong">
                  <b>{end.wrong ?? 0}</b>
                  <span>Неверных ответов</span>
                </div>
                <div className="le-stat le-stat--right">
                  <b>{end.correct ?? 0}</b>
                  <span>Верных ответов</span>
                </div>
              </div>
              {/* Урок решён верно, но не засчитан: лимит от админа. Прячем
                  «следующий урок» — он всё равно упрётся в тот же отказ. */}
              {restricted ? (
                <>
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
                </>
              ) : (
                <>
                  <button className="le-btn" onClick={goNext}>
                    Перейти на следующий урок
                  </button>
                  <button className="le-again" onClick={retry}>
                    Пройти снова
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Итоги урока (провал — сердца кончились) */}
      {end && end.outcome === 'fail' && (
        <div className="le-over le-over--fail">
          <div className="le-card">
            <div className="le-art le-art--lose">
              <img src="/assets/learning/result-lose.webp" alt="" />
            </div>
            <div className="le-info">
              <div className="le-heart">
                <b>💔</b>
                <span>Жизней больше нет</span>
              </div>
              <h2 className="le-title">Ой-ой</h2>
              <div className="le-sub">Видимо, нужно попробовать ещё раз</div>
              <button className="le-btn" onClick={retry}>
                Попробовать ещё раз
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Подтверждение выхода из незаконченного урока */}
      {confirmExit && (
        <div className="lx-over" onClick={() => setConfirmExit(false)}>
          <div className="lx-card" onClick={(e) => e.stopPropagation()}>
            <button className="lx-close" aria-label="Закрыть" onClick={() => setConfirmExit(false)}>
              ×
            </button>
            <img className="lx-art" src="/assets/lesson/exit.png" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
            <h2 className="lx-title">Вы уверены что хотите выйти?</h2>
            <div className="lx-sub">Урок не будет пройден</div>
            <button className="le-btn lx-continue" onClick={() => setConfirmExit(false)}>
              Продолжить обучение
            </button>
            <button className="lx-leave" onClick={exitLesson}>
              Выйти в меню
            </button>
          </div>
        </div>
      )}
    </LearningLayout>
  )
}
