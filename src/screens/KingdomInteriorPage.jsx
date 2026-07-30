import { useEffect, useState, useCallback } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { ChevronLeftIcon } from '../components/icons.jsx'
import { useI18n } from '../i18n.jsx'
import { getLessonModules, getPracticeToken, completeLessonModule } from '../api.js'
import { getLevelLessons, loadLesson } from '../learning/lessonData.js'
import { loadDone, markDone } from '../learning/lessonProgress.js'
import LessonPlayer from '../learning/LessonPlayer.jsx'

// Кольцо общего прогресса королевства (пройдено/всего уроков) — по шапке
// мобильного приложения (Figma node 903-3033).
function ProgressRing({ done = 0, total = 0 }) {
  const r = 22
  const c = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(1, done / total) : 0
  const offset = c * (1 - pct)
  return (
    <svg className="kh-ring" width="54" height="54" viewBox="0 0 54 54">
      <circle cx="27" cy="27" r={r} className="kh-ring__track" />
      <circle cx="27" cy="27" r={r} className="kh-ring__value" strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 27 27)" />
      <text x="27" y="28" className="kh-ring__label" dominantBaseline="middle" textAnchor="middle">
        {done}/{total}
      </text>
    </svg>
  )
}

// Интерьер королевства: нативная тропа уроков уровня + нативный плеер урока
// (LessonPlayer). Раньше здесь был iframe hosted-Speakout — теперь весь урок
// рендерится React-компонентами из public/learning/<level>.json (экстрактор
// scripts/extract-kingdom-lessons.js). Прогресс — на бэкенде (lessonProgress).
export default function KingdomInteriorPage({ kingdom, userName, userLevel, token, onNav, onProfile, onBack }) {
  const { t } = useI18n()
  const k = kingdom || { id: 'sunhaven', name: 'Sunhaven', king: 'Майкл Флот', level: 'A1' }
  const level = k.level || userLevel || 'A1'

  const [state, setState] = useState({ loading: true, error: null })
  const [moduleId, setModuleId] = useState(null)
  const [lessons, setLessons] = useState([]) // [{code,order,title,taskCount}]
  const [done, setDone] = useState(new Set()) // пройденные коды

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

  // Урок разблокирован, если это первый или предыдущий пройден.
  const isUnlocked = useCallback(
    (i) => i === 0 || (lessons[i - 1] && done.has(lessons[i - 1].code)),
    [lessons, done],
  )

  const openLesson = useCallback(
    async (code) => {
      setBusy(true)
      setEnd(null)
      try {
        const data = await loadLesson(level, code)
        if (data) setOpen({ code, data, attempt: 0 })
      } finally {
        setBusy(false)
      }
    },
    [level],
  )

  const retry = () => {
    setEnd(null)
    setOpen((o) => (o ? { ...o, attempt: o.attempt + 1 } : o))
  }

  const goNext = () => {
    const i = lessons.findIndex((l) => l.code === open?.code)
    const next = i >= 0 ? lessons[i + 1] : null
    setEnd(null)
    if (next) openLesson(next.code)
    else setOpen(null) // последний урок — назад на тропу
  }

  const onDone = useCallback(
    async (stats) => {
      setEnd(stats)
      if (stats.outcome !== 'success' || !open) return
      // Отмечаем урок пройденным (бэкенд + локально). Монеты/XP/стрик начисляет
      // сам per-lesson complete (в markDone) — один раз за урок. Если модуль не
      // найден (moduleId=null), падаем на модульный complete, чтобы награда не
      // пропала; двойного начисления нет — ветки взаимоисключающие.
      const next = await markDone(level, token, moduleId, open.code, stats.points)
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

      {!loading && !error && !open && (
        <div className="km-scroll">
          <div
            className="kh-hero"
            style={{ backgroundImage: `url(/assets/world/hero/${String(level).toLowerCase()}.png), linear-gradient(135deg, #7c4dff, #4a2b9e)` }}
          >
            <div className="kh-hero__scrim" />
            <div className="kh-hero__info">
              <div className="kh-hero__king">
                <img className="kh-hero__avatar" src={`/assets/world/kings/${k.id}_portrait.webp`} alt="" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
                <span className="kh-hero__kingname">Король {k.king}</span>
              </div>
              <div className="kh-hero__level">{t('kingdom.levelBadge', { label: level })}</div>
            </div>
            <div className="kh-hero__ring">
              <ProgressRing done={doneCount} total={total} />
            </div>
          </div>

          {/* Нативная тропа: список узлов-уроков с состоянием. */}
          <ol className="kt-trail">
            {lessons.map((l, i) => {
              const isDone = done.has(l.code)
              const unlocked = isUnlocked(i)
              const current = !isDone && unlocked
              const cls =
                'kt-node' + (isDone ? ' is-done' : '') + (current ? ' is-current' : '') + (!unlocked ? ' is-locked' : '')
              return (
                <li key={l.code} className={cls}>
                  <button
                    className="kt-node__btn"
                    disabled={!unlocked || busy}
                    onClick={() => openLesson(l.code)}
                    title={!unlocked ? t('lesson.locked') : ''}
                  >
                    <span className="kt-node__mark">{isDone ? '✓' : unlocked ? i + 1 : '🔒'}</span>
                    <span className="kt-node__meta">
                      <b>{l.title || l.code}</b>
                      <span>{current ? t('lesson.start') : isDone ? t('learn.done') : t('lesson.locked')}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
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
              <button className="le-btn" onClick={goNext}>
                Перейти на следующий урок
              </button>
              <button className="le-again" onClick={retry}>
                Пройти снова
              </button>
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
