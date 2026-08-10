import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { ChevronLeftIcon } from '../components/icons.jsx'
import {
  getCourseIndex,
  loadCourseLesson,
  loadCourseTest,
  loadCourseImages,
  loadCourseShell,
} from './courseData.js'

// Урок курса уровня — не переложенный в наши типы заданий, а перенесённый
// целиком: его разметка, его движок (public/course/<level>/engine.js), его
// стили. Иначе половина курса (сортировка по колонкам, слоты, порядок слов,
// поиск ошибки, диалоги, юнит-тесты) не пережила бы конвертацию.
//
// Как это держится вместе:
//   1. в контейнер .jc кладётся оболочка курса — движок ищет её узлы по id,
//      поэтому она обязана быть в DOM раньше скрипта;
//   2. данные уровня передаются через window.__JC_* (движок читает их на
//      старте как свои UNITS/LESSONS/REVIEWS);
//   3. скрипт движка — обычный <script>, а не модуль: разметка курса зовёт его
//      функции инлайновыми onclick. Он завёрнут в IIFE и раздаёт функции в
//      window, поэтому повторный запуск при смене уровня безопасен.
export default function CourseLesson({ level, lessonNo, testUnit, onExit, onDone }) {
  const { t } = useI18n()
  const hostRef = useRef(null)
  const [state, setState] = useState({ loading: true, error: null })
  const [title, setTitle] = useState('')

  useEffect(() => {
    let alive = true
    const host = hostRef.current
    if (!host) return undefined
    let script = null

    setState({ loading: true, error: null })
    ;(async () => {
      try {
        const [index, shell, images, data] = await Promise.all([
          getCourseIndex(level),
          loadCourseShell(level),
          loadCourseImages(level),
          testUnit ? loadCourseTest(level, testUnit) : loadCourseLesson(level, lessonNo),
        ])
        if (!alive || !index) throw new Error('course index')

        // Движку нужен весь список уроков и тестов (шапка, «следующий шаг»,
        // содержание), но грузить 36 разметок ради заголовков нельзя —
        // отдаём мету из каталога, а полностью только открытый урок.
        // html:'' у соседей не для красоты: движок считает урок пройденным,
        // пересчитывая data-tid в его разметке (allDone), и на undefined
        // падал бы при отрисовке «следующего шага».
        const lessons = {}
        for (const l of index.lessons || []) lessons[l.n] = { unit: l.unit, no: l.no, title: l.title, blurb: l.blurb, html: '' }
        const reviews = {}
        for (const r of index.tests || []) reviews[r.unit] = { unit: r.unit, title: r.title, items: r.items, pass: r.pass }
        if (testUnit) reviews[testUnit] = data
        else lessons[lessonNo] = data

        // Стили курса — отдельный файл уровня, каждый селектор в нём уже
        // ограничен контейнером .jc (скоупинг делает экстрактор). Линк
        // добавляется один раз на уровень и остаётся в head.
        const cssId = `jc-css-${String(level).toLowerCase()}`
        if (!document.getElementById(cssId)) {
          const link = document.createElement('link')
          link.id = cssId
          link.rel = 'stylesheet'
          link.href = `/course/${String(level).toLowerCase()}/course.css`
          document.head.appendChild(link)
        }

        window.__JC_UNITS = index.units || []
        window.__JC_LESSONS = lessons
        window.__JC_REVIEWS = reviews
        window.__JC_IMGX = images || {}
        window.__JC_AUDIO_BASE = `/course/${String(level).toLowerCase()}/audio/`

        host.innerHTML = shell
        setTitle(data.title || '')

        const start = () => {
          if (!alive) return
          try {
            if (testUnit) window.__JC.openReview(testUnit)
            else window.__JC.openLesson(lessonNo)
            setState({ loading: false, error: null })
          } catch (e) {
            setState({ loading: false, error: e.message || 'engine' })
          }
        }

        script = document.createElement('script')
        script.src = `/course/${String(level).toLowerCase()}/engine.js`
        script.async = false
        window.addEventListener('jc:ready', start, { once: true })
        script.onerror = () => alive && setState({ loading: false, error: 'engine' })
        document.body.appendChild(script)
      } catch (e) {
        if (alive) setState({ loading: false, error: e.message || 'error' })
      }
    })()

    return () => {
      alive = false
      // Курс пишет ответы в localStorage по ходу набора, но последний
      // несохранённый textarea сбрасывается только здесь.
      try {
        window.__JC?.flush()
      } catch {
        /* движок мог не успеть загрузиться */
      }
      if (script) script.remove()
      host.innerHTML = ''
    }
  }, [level, lessonNo, testUnit])

  // Счёт для наград приложения: сколько проверяемых пунктов сошлось.
  const finish = () => {
    let score = { ok: 0, total: 0 }
    try {
      score = window.__JC?.score() || score
    } catch {
      /* урок можно закрыть и не решая ничего */
    }
    onDone?.({
      outcome: 'success',
      correct: score.ok,
      wrong: Math.max(0, score.total - score.ok),
      // Столько же монет за верный ответ, сколько в нативном плеере уроков.
      points: score.ok * 10,
      accuracy: score.total ? Math.round((score.ok / score.total) * 100) : 100,
    })
  }

  return (
    <div className="jc-wrap">
      <div className="jc-bar">
        <button className="jc-bar__back" onClick={onExit}>
          <ChevronLeftIcon size={18} />
          {t('common.back')}
        </button>
        <span className="jc-bar__title">{title}</span>
        <button className="jc-bar__done" onClick={finish} disabled={state.loading || !!state.error}>
          {t('lesson.finish')}
        </button>
      </div>

      {state.loading && (
        <div className="ki-state">
          <div className="ki-spinner" />
          <p>{t('lessons.loading')}</p>
        </div>
      )}
      {!state.loading && state.error && (
        <div className="ki-state ki-state--error">
          <p>{t('lessons.error')}</p>
        </div>
      )}

      {/* data-mode держит курс в режиме самостоятельного обучения: блоки
          1-to-1 и Group остаются в разметке, но скрыты правилом курса
          [data-only]{display:none} — мы их не трогаем.
          Ширины колонок курса задаются его же переменными, поэтому колонки
          содержания и словаря схлопываются здесь, а не переопределением
          грида: инлайн-стиль выигрывает у таблицы стилей без войны
          специфичностей. */}
      <div className="jc" data-mode="self" style={{ '--sidebar': '0px', '--aside': '0px' }} ref={hostRef} />
    </div>
  )
}
