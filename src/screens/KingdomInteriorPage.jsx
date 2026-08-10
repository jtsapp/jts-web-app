import { useEffect, useState, useCallback, useMemo } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { ChevronLeftIcon, CastleIcon, LeafIcon, WaveIcon, CrescentIcon, StarIcon, BurstIcon } from '../components/icons.jsx'
import { useI18n } from '../i18n.jsx'
import { getLessonModules, getPracticeToken, completeLessonModule, getContentQuota } from '../api.js'
import { getLevelLessons, loadLesson } from '../learning/lessonData.js'
import { loadDone, markDone, ContentRestrictedError } from '../learning/lessonProgress.js'
import LessonPlayer from '../learning/LessonPlayer.jsx'
import { SUPPORT_WHATSAPP_URL } from '../lib/support.js'

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

// Тип урока (l.type из index.json, считается экстрактором по первому заданию) →
// «печенька» узла тропы: иконка + цветовой класс. Закрытые узлы серые (CSS).
const COOKIE = {
  choice: { Icon: LeafIcon, cls: 'is-choice' },
  audio: { Icon: WaveIcon, cls: 'is-audio' },
  video: { Icon: CrescentIcon, cls: 'is-video' },
  info: { Icon: StarIcon, cls: 'is-info' },
  final: { Icon: BurstIcon, cls: 'is-final' },
}

// Интерьер королевства: нативная тропа уроков уровня + нативный плеер урока
// (LessonPlayer). Раньше здесь был iframe hosted-Speakout — теперь весь урок
// рендерится React-компонентами из public/learning/<level>.json (данные готовят
// scripts/extract-kingdom-lessons.js для A2–C1 и scripts/extract-jts-self-lessons.js
// для A0/A1). Прогресс — на бэкенде (lessonProgress).
export default function KingdomInteriorPage({ kingdom, userName, userLevel, token, onNav, onProfile, onBack, isDemoAccount }) {
  const { t } = useI18n()
  const k = kingdom || { id: 'sunhaven', name: 'Sunhaven', king: 'Майкл Флот', level: 'A1' }
  const level = k.level || userLevel || 'A1'

  const [state, setState] = useState({ loading: true, error: null })
  const [moduleId, setModuleId] = useState(null)
  const [lessons, setLessons] = useState([]) // [{code,order,title,taskCount}]
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
        const [mods, trail] = await Promise.all([
          getLessonModules(authToken).catch(() => []),
          getLevelLessons(level),
        ])
        if (!alive) return
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
  const isUnlocked = useCallback(
    (i) =>
      !moduleLocked &&
      (moduleQuota == null || i < moduleQuota) &&
      (i === 0 || (lessons[i - 1] && done.has(lessons[i - 1].code))),
    [lessons, done, moduleLocked, moduleQuota],
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
        const data = await loadLesson(level, code)
        if (data) setOpen({ code, data, attempt: 0 })
      } finally {
        setBusy(false)
      }
    },
    [level, moduleLocked, lessons, isUnlocked],
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

  // «Назад»: из незаконченного урока — подтверждение; с экрана итогов/тропы —
  // сразу (на тропу либо из королевства).
  const handleBack = () => {
    if (open && !end) setConfirmExit(true)
    else if (open) setOpen(null)
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
          <div
            className="kh-hero"
            style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.14), rgba(0,0,0,0.10)), ${k.ring}` }}
          >
            <div className="kh-hero__nav">
              <button className="kh-hero__back" onClick={handleBack} aria-label={t('common.back')}>
                <ChevronLeftIcon size={18} />
              </button>
              <span className="kh-hero__castle" style={{ color: k.ring }} aria-hidden="true">
                <CastleIcon size={18} />
              </span>
              <div className="kh-hero__place">
                <b>{k.name}</b>
                <span>{t('kingdom.levelBadge', { label: level })}</span>
              </div>
            </div>
            <div className="kh-hero__main">
              <div className="kh-hero__text">
                <div className="kh-hero__level">{t('kingdom.levelBadge', { label: level })}</div>
                <div className="kh-hero__prog">
                  <ProgressRing done={doneCount} total={total} size={22} showLabel={false} />
                  <span>{t('learn.done')} {doneCount}/{total}</span>
                </div>
              </div>
              <img
                className="kh-hero__mascot"
                src={`/assets/world/levels/${String(level).toLowerCase()}.webp`}
                alt=""
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            </div>
          </div>

          {/* Нативная тропа: узлы сгруппированы по юнитам (l.unit из index.json),
              внутри юнита — «лесенка»-серпантин. */}
          <div className="kt-units">
            {units.map((g) => {
              const isExam = g.unit === 0
              const doneN = g.items.filter(({ l }) => done.has(l.code)).length
              const node = ({ l, gi }, j) => {
                const isDone = done.has(l.code)
                const unlocked = isUnlocked(gi)
                const current = !isDone && unlocked
                const cls =
                  'kt-node' + (isDone ? ' is-done' : '') + (current ? ' is-current' : '') + (!unlocked ? ' is-locked' : '')
                const cookie = COOKIE[l.type] || COOKIE.choice
                const CookieIcon = cookie.Icon
                // «Лесенка»: узлы серпантином влево-вправо (период 6); экзамен — по центру.
                const dx = isExam ? 0 : Math.round(Math.sin((j / 3) * Math.PI) * 82)
                return (
                  <li key={l.code} className={cls} style={{ '--dx': `${dx}px` }}>
                    <button
                      className="kt-node__btn"
                      disabled={!unlocked || busy}
                      onClick={() => openLesson(l.code)}
                      title={!unlocked ? t('lesson.locked') : l.title || l.code}
                    >
                      <span className={`kt-node__cookie ${cookie.cls}`} aria-hidden="true">
                        <CookieIcon size={22} />
                        {isDone && (
                          <span className="kt-node__done">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                              <path d="m5 12.5 4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        )}
                      </span>
                      <span className="kt-node__label">{isExam ? t('lesson.examUnit') : l.title || l.code}</span>
                    </button>
                  </li>
                )
              }

              // Финальный экзамен — особый узел: печенька на белой карточке над
              // красными «горами»-вершиной (как в дизайне).
              if (isExam) {
                return (
                  <section key="exam" className="kt-exam">
                    <svg className="kt-exam__peaks" viewBox="0 0 1200 210" preserveAspectRatio="none" aria-hidden="true">
                      <path
                        d="M0 210V150L70 60 140 150 210 30 300 150 370 95 450 150 540 20 630 150 700 85 780 150 870 45 960 150 1040 100 1120 150 1200 55V210Z"
                        fill="#c9463f"
                      />
                    </svg>
                    <ol className="kt-trail kt-trail--exam">{g.items.map(node)}</ol>
                  </section>
                )
              }

              return (
                <section key={g.unit} className="kt-unit">
                  <div className="kt-unit__head">
                    <span className="kt-unit__title">{t('lesson.unit', { n: g.unit })}</span>
                    <span className="kt-unit__count">
                      {doneN}/{g.items.length}
                    </span>
                  </div>
                  <ol className="kt-trail">{g.items.map(node)}</ol>
                </section>
              )
            })}
          </div>
        </div>
      )}

      {/* Открытый урок — нативный плеер (замена iframe). */}
      {!loading && open && (
        <div className="km-lesson">
          <LessonPlayer
            key={`${open.code}-${open.attempt}`}
            lesson={open.data}
            level={level}
            token={token}
            onExit={handleBack}
            onDone={onDone}
          />
        </div>
      )}

      {/* Экран завершения урока (успех) */}
      {end && end.outcome === 'success' && (
        <div className="le-over le-over--ok">
          <div className="le-card">
            <img className="le-art" src="/assets/lesson/success.png" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
            <div className="le-info">
              <div className="le-pct">{end.accuracy ?? 100}%</div>
              <h2 className="le-title">
                {(end.accuracy ?? 100) >= 80 ? 'Отличный результат' : (end.accuracy ?? 100) >= 50 ? 'Хорошая работа' : 'Урок пройден'}
              </h2>
              <div className="le-sub">Урок пройден</div>
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

      {/* Экран завершения урока (провал — сердца кончились) */}
      {end && end.outcome === 'fail' && (
        <div className="le-over le-over--fail">
          <div className="le-card">
            <img className="le-art" src="/assets/lesson/fail.png" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
            <div className="le-info">
              <div className="le-heart">
                💔<span>Жизней больше нет</span>
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
