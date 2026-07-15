import { useEffect, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { ChevronLeftIcon } from '../components/icons.jsx'
import { useI18n } from '../i18n.jsx'
import { getLessonModules, getPracticeToken } from '../api.js'

// Кольцо общего прогресса королевства (пройдено/всего уроков) — как в шапке
// мобильного приложения (Figma node 903-3033).
function ProgressRing({ done = 0, total = 0 }) {
  const r = 22
  const c = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(1, done / total) : 0
  const offset = c * (1 - pct)
  return (
    <svg className="kh-ring" width="54" height="54" viewBox="0 0 54 54">
      <circle cx="27" cy="27" r={r} className="kh-ring__track" />
      <circle
        cx="27"
        cy="27"
        r={r}
        className="kh-ring__value"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 27 27)"
      />
      <text x="27" y="28" className="kh-ring__label" dominantBaseline="middle" textAnchor="middle">
        {done}/{total}
      </text>
    </svg>
  )
}

// Интерьер королевства: сразу открывает урок из раздела «Уроки (контент)»
// админки — опубликованный Speakout-модуль (/mobile/lesson-modules), чей
// CEFR-уровень совпадает с уровнем королевства (Sunhaven → A1). Сверху —
// арт-шапка королевства (сцена + портрет короля + уровень + кольцо прогресса,
// по мобильному дизайну), под ней — hosted-сайт модуля в iframe.
export default function KingdomInteriorPage({ kingdom, userName, userLevel, token, onNav, onBack }) {
  const { t } = useI18n()
  const k = kingdom || { id: 'sunhaven', name: 'Sunhaven', king: 'Майкл Флот', level: 'A1' }
  const level = k.level || userLevel || 'A1'

  const [state, setState] = useState({ loading: true, error: null, module: null })

  useEffect(() => {
    let alive = true
    setState({ loading: true, error: null, module: null })
    // Таймаут: если бэкенд не отвечает (dev-server периодически лежит),
    // не висим на спиннере вечно, а показываем ошибку через 15 c.
    const withTimeout = (promise, ms) =>
      Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Сервер не отвечает')), ms)
        ),
      ])
    ;(async () => {
      try {
        const authToken = await withTimeout(getPracticeToken(token), 15000)
        // Кладём токен в глобал приложения: мост урока (в same-origin iframe
        // /api/hl) читает его как window.parent.__JTS_TOKEN__, чтобы ходить в
        // backend за сердцами/монетами.
        if (typeof window !== 'undefined') window.__JTS_TOKEN__ = authToken
        const all = await withTimeout(getLessonModules(authToken), 15000)
        if (!alive) return
        // Берём модуль этого королевства (по CEFR-уровню) — тот, что можно открыть.
        const want = String(level).toUpperCase()
        const forLevel = (Array.isArray(all) ? all : [])
          .filter((m) => String(m.level || '').toUpperCase() === want)
          .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
        const module = forLevel.find((m) => m.indexUrl) || forLevel[0] || null
        setState({ loading: false, error: null, module })
      } catch (e) {
        if (!alive) return
        setState({ loading: false, error: e.message || 'Не удалось загрузить уроки', module: null })
      }
    })()
    return () => {
      alive = false
    }
  }, [level, token])

  const { loading, error, module } = state

  // Прокси /api/hl отдаёт урочный контент с нашего origin, поэтому высоту
  // контента можно измерить и подогнать под неё iframe:
  //   • тропа (index) → iframe в полную высоту контента: внутренней прокрутки
  //     нет, скроллится вся страница, и арт-шапка уезжает вместе с ней;
  //   • страница урока → высота с вьюпорт (центрируется по 100dvh) — отдаём
  //     стили CSS, чтобы урок не проваливался вниз.
  const SCALE = 0.82
  const CLIP = 205
  const frameRef = useRef(null)
  const roRef = useRef(null)
  // true, когда в iframe открыта страница урока (а не тропа): прячем арт-шапку
  // и показываем HUD урока (сердца/прогресс) без верхнего клипа.
  const [inLesson, setInLesson] = useState(false)
  // Экран завершения урока: null | {outcome:'success'|'fail', correct, wrong, accuracy, nextUrl}
  // Присылается мостом из iframe через postMessage.
  const [lessonEnd, setLessonEnd] = useState(null)

  // Реальный прогресс королевства: пройденные уроки хранит сам hosted-урок в
  // localStorage['jts-{level}-done'] (массив кодов). iframe проксируется на наш
  // origin, поэтому localStorage общий — читаем длину напрямую.
  const doneKey = 'jts-' + String(level).toLowerCase() + '-done'
  const readDone = () => {
    if (typeof window === 'undefined') return 0
    try {
      const a = JSON.parse(window.localStorage.getItem(doneKey) || '[]')
      return Array.isArray(a) ? a.length : 0
    } catch {
      return 0
    }
  }
  const [doneCount, setDoneCount] = useState(0)

  // Перезайти в текущий урок (сброс сердец до 3). Оверлей НЕ убираем здесь —
  // он держится до загрузки урока (handleFrameLoad снимет), чтобы при переходе
  // ничего не мелькало (встроенный экран завершения и т.п.).
  const retryLesson = () => {
    try {
      frameRef.current?.contentWindow?.location.reload()
    } catch {
      setLessonEnd(null)
    }
  }
  // Перейти на следующий урок (или перезагрузить, если ссылки нет).
  const goNextLesson = (url) => {
    try {
      if (url) frameRef.current.contentWindow.location.href = url
      else frameRef.current?.contentWindow?.location.reload()
    } catch {
      setLessonEnd(null)
    }
  }

  useEffect(() => {
    const onMsg = (e) => {
      const d = e.data
      if (d && d.jts === 'lesson' && (d.outcome === 'success' || d.outcome === 'fail')) {
        setLessonEnd(d)
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  const fitFrame = () => {
    const iframe = frameRef.current
    if (!iframe) return
    let doc
    try {
      doc = iframe.contentDocument
    } catch {
      return
    }
    if (!doc || !doc.documentElement) return
    const stage = iframe.parentElement
    const scroll = iframe.closest('.km-scroll')
    const isIndex = !!doc.getElementById('path')
    setInLesson(!isIndex)
    if (isIndex) {
      // Обновляем реальный прогресс королевства (мог измениться после урока).
      setDoneCount(readDone())
      // Тропа: масштаб .82 + клип сверху (CSS top:-205 прячет шапку «Speakout»),
      // высота под весь контент → страница скроллится, арт-шапка уезжает.
      iframe.style.transform = ''
      iframe.style.width = ''
      iframe.style.top = ''
      iframe.style.minHeight = ''
      const hc = doc.documentElement.scrollHeight
      iframe.style.height = hc + 'px'
      if (stage) stage.style.height = Math.max(240, Math.round(hc * SCALE - CLIP)) + 'px'
    } else {
      // Урок: без масштаба и клипа — рисуем в натуральную величину и точно под
      // видимую область (урок сам свёрстан как один экран: HUD сверху, контент,
      // липкая кнопка «Проверить/Продолжить» снизу — теперь она видна).
      iframe.style.transform = 'none'
      iframe.style.width = '100%'
      iframe.style.top = '0px'
      // Гасим CSS min-height (884px из индексного варианта) — иначе iframe
      // выше видимой сцены и липкая кнопка снизу уходит под обрез.
      iframe.style.minHeight = '0px'
      const vis = scroll ? scroll.clientHeight : 600
      iframe.style.height = vis + 'px'
      if (stage) stage.style.height = vis + 'px'
    }
  }

  const handleFrameLoad = () => {
    if (roRef.current) {
      roRef.current.disconnect()
      roRef.current = null
    }
    setLessonEnd(null) // новый урок/страница загрузилась — убираем экран конца
    fitFrame()
    const iframe = frameRef.current
    let doc
    try {
      doc = iframe && iframe.contentDocument
    } catch {
      doc = null
    }
    if (!doc) return
    // Тропа достраивается JS-ом hosted-страницы уже после load — до-меряем
    // через ResizeObserver, пока высота не устаканится.
    try {
      const ro = new ResizeObserver(fitFrame)
      ro.observe(doc.documentElement)
      roRef.current = ro
    } catch {
      /* ResizeObserver может отсутствовать — не критично */
    }
  }

  useEffect(() => {
    return () => {
      if (roRef.current) roRef.current.disconnect()
    }
  }, [])

  return (
    <LearningLayout
      userName={userName}
      userLevel={userLevel}
      active="learning"
      onNav={onNav}
      onProfile={() => {}}
    >
      <div className="li-top">
        <button className="li-back" onClick={onBack}>
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
          <p>Загружаем уроки…</p>
        </div>
      )}

      {!loading && error && (
        <div className="ki-state ki-state--error">
          <p>Ошибка: {error}</p>
        </div>
      )}

      {!loading && !error && (!module || !module.indexUrl) && (
        <div className="li-empty">
          <img className="li-empty__art" src={`/assets/world/kings/${k.id}.jpg`} alt={k.name} />
          <div className="li-empty__title">{t('kingdom.empty')}</div>
          <div className="li-empty__sub">Для уровня {level} пока нет опубликованных уроков в админке</div>
        </div>
      )}

      {/* Арт-шапка королевства + hosted-сайт Speakout-модуля в iframe.
          Обёрнуты в .km-scroll — прокручивается только эта область (баннер
          уезжает вместе с тропой), а «Назад», сайдбар и футер остаются. */}
      {!loading && !error && module?.indexUrl && (
        <div className="km-scroll">
          <div
            className={'kh-hero' + (inLesson ? ' is-hidden' : '')}
            style={{
              backgroundImage: `url(/assets/world/hero/${String(level).toLowerCase()}.png), linear-gradient(135deg, #7c4dff, #4a2b9e)`,
            }}
          >
            <div className="kh-hero__scrim" />
            <div className="kh-hero__info">
              <div className="kh-hero__king">
                <img
                  className="kh-hero__avatar"
                  src={`/assets/world/kings/${k.id}_portrait.png`}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.style.visibility = 'hidden'
                  }}
                />
                <span className="kh-hero__kingname">Король {k.king}</span>
              </div>
              <div className="kh-hero__level">{t('kingdom.levelBadge', { label: level })}</div>
            </div>
            <div className="kh-hero__ring">
              <ProgressRing
                done={Math.min(doneCount, module.lessonCount || 0)}
                total={module.lessonCount || 0}
              />
            </div>
          </div>

          {/* Курс (тропа + уроки) отдаётся через свой прокси-роут /api/hl —
              он прячет нижний бренд-футер hosted-сайта и держит навигацию на
              нашем origin (footer скрыт на всех страницах). Клип сверху
              (.km-stage overflow:hidden + сдвиг iframe) прячет верхнюю шапку
              «Speakout». iframe высотой с вьюпорт — чтобы страницы уроков
              (центрируются по 100dvh) не уезжали вниз; сцена чуть выше
              вьюпорта → арт-шапка уезжает при прокрутке. */}
          <div className="km-stage">
            <iframe
              ref={frameRef}
              className="km-frame"
              src={`/api/hl${new URL(module.indexUrl).pathname}`}
              title={module.title}
              allow="autoplay; fullscreen; microphone"
              onLoad={handleFrameLoad}
            />
          </div>

          {/* Экран завершения урока поверх области урока */}
          {lessonEnd && lessonEnd.outcome === 'success' && (
            <div className="le-over le-over--ok">
              <div className="le-card">
                <img className="le-art" src="/assets/lesson/success.png" alt="" />
                <div className="le-info">
                  <div className="le-pct">{lessonEnd.accuracy ?? 100}%</div>
                  <h2 className="le-title">
                    {(lessonEnd.accuracy ?? 100) >= 80
                      ? 'Отличный результат'
                      : (lessonEnd.accuracy ?? 100) >= 50
                        ? 'Хорошая работа'
                        : 'Урок пройден'}
                  </h2>
                  <div className="le-sub">Урок пройден</div>
                  <div className="le-stats">
                    <div className="le-stat le-stat--wrong">
                      <b>{lessonEnd.wrong ?? 0}</b>
                      <span>Неверных ответов</span>
                    </div>
                    <div className="le-stat le-stat--right">
                      <b>{lessonEnd.correct ?? 0}</b>
                      <span>Верных ответов</span>
                    </div>
                  </div>
                  <button className="le-btn" onClick={() => goNextLesson(lessonEnd.nextUrl)}>
                    Перейти на следующий урок
                  </button>
                  <button className="le-again" onClick={retryLesson}>
                    Пройти снова
                  </button>
                </div>
              </div>
            </div>
          )}

          {lessonEnd && lessonEnd.outcome === 'fail' && (
            <div className="le-over le-over--fail">
              <div className="le-card">
                <img className="le-art" src="/assets/lesson/fail.png" alt="" />
                <div className="le-info">
                  <div className="le-heart">
                    💔<span>Жизней больше нет</span>
                  </div>
                  <h2 className="le-title">Ой-ой</h2>
                  <div className="le-sub">Видимо, нужно попробовать ещё раз</div>
                  <button className="le-btn" onClick={retryLesson}>
                    Попробовать ещё раз
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </LearningLayout>
  )
}
