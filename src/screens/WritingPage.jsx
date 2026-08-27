import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import PracticeLimitScreen from '../components/PracticeLimitScreen.jsx'
import { useI18n } from '../i18n.jsx'
import { usePracticeEntitlement } from '../practice/usePracticeEntitlement.js'
import { buildGenre, LEVEL_TITLES } from '../practice/writing/engine.js'
import { WRITING_PROGRESS_EVENT } from '../practice/practiceKeys.js'
import WritingLevels from './writing/WritingLevels.jsx'
import WritingGenres from './writing/WritingGenres.jsx'
import WritingTrainer from './writing/WritingTrainer.jsx'
import WritingPad from './writing/WritingPad.jsx'
import WritingResult from './writing/WritingResult.jsx'
import useSelectionTranslate from './writing/useSelectionTranslate.js'

export const WRITING_LEVELS = ['a1', 'a2', 'a2p', 'b1', 'b2', 'c1']

// Данные уровня и meta грузим лениво и кэшируем промисы на уровне модуля
// (паттерн loadGrammarIndex): возврат на экран не перекачивает сотни КБ.
const levelCache = new Map()
function fetchLevel(level) {
  if (!levelCache.has(level)) {
    levelCache.set(
      level,
      fetch(`/practice/writing/${level}.json`)
        .then((r) => {
          if (!r.ok) throw new Error('bad status ' + r.status)
          return r.json()
        })
        .catch((e) => {
          // Неудачную загрузку из кэша выкидываем, иначе ошибка «прилипает»
          // до перезагрузки страницы.
          levelCache.delete(level)
          throw e
        }),
    )
  }
  return levelCache.get(level)
}
// Кэш собранных жанров — модульный, а не ref: движок детерминирован (seeded),
// поэтому пережившая перемонтирование сборка не может устареть, а ref в
// getGenre ловил бы react-hooks/refs на каждом чтении в рендере.
const genreCache = new Map() // `${level}:${genreId}` -> жанр

let metaPromise = null
function fetchMeta() {
  if (!metaPromise) {
    metaPromise = fetch('/practice/writing/meta.json')
      .then((r) => {
        if (!r.ok) throw new Error('bad status ' + r.status)
        return r.json()
      })
      .catch((e) => {
        metaPromise = null
        throw e
      })
  }
  return metaPromise
}

// Экран «Письмо»: внутренняя view-машина (как State.screen в прототипе) —
// каталог уровней → жанры → тренажёр из 6 шагов → Блокнот → разбор. Отдельных
// Next-роутов нет намеренно: навигация всего приложения — state-машина App.jsx.
export default function WritingPage({ userLevel, userName, token, initialTarget, onNav, onProfile, isDemoAccount }) {
  const { t } = useI18n()
  const [view, setView] = useState({ name: 'levels' })
  const [meta, setMeta] = useState(null)
  const [levels, setLevels] = useState({}) // level -> {seeds, bank}
  const [error, setError] = useState('')

  // Тик прогресса: и локальные отметки, и гидратация с сервера шлют одно
  // событие — карточки каталога и чипы шагов пересчитываются сами.
  const [progressTick, setProgressTick] = useState(0)
  useEffect(() => {
    const bump = () => setProgressTick((n) => n + 1)
    window.addEventListener(WRITING_PROGRESS_EVENT, bump)
    return () => window.removeEventListener(WRITING_PROGRESS_EVENT, bump)
  }, [])

  useEffect(() => {
    let alive = true
    fetchMeta()
      .then((m) => alive && setMeta(m))
      .catch(() => alive && setError(t('writing.loadError')))
    return () => {
      alive = false
    }
  }, [t])

  const loadLevel = useCallback(
    (level) => {
      if (levels[level]) return Promise.resolve(levels[level])
      return fetchLevel(level)
        .then((data) => {
          setLevels((prev) => (prev[level] ? prev : { ...prev, [level]: data }))
          setError('')
          return data
        })
        .catch(() => {
          setError(t('writing.loadError'))
          return null
        })
    },
    [levels, t],
  )

  // Жанр собирается детерминированно из seed+bank (движок seeded, поэтому
  // кэш — только чтобы не пересобирать на каждый рендер).
  const getGenre = useCallback(
    (level, genreId) => {
      if (!meta || !levels[level]) return null
      const key = level + ':' + genreId
      if (!genreCache.has(key)) {
        const seed = levels[level].seeds.find((s) => s.id === genreId)
        if (!seed) return null
        genreCache.set(key, buildGenre(seed, levels[level].bank, meta))
      }
      return genreCache.get(key)
    },
    [meta, levels],
  )

  // Прыжок с карточки Практики сразу в уровень/жанр (?screen=writing + payload).
  const appliedTargetRef = useRef(false)
  useEffect(() => {
    if (appliedTargetRef.current || !initialTarget) return
    appliedTargetRef.current = true
    const level = WRITING_LEVELS.includes(initialTarget.level) ? initialTarget.level : null
    if (!level) return
    loadLevel(level).then((data) => {
      if (!data) return
      if (initialTarget.genreId && data.seeds.some((s) => s.id === initialTarget.genreId)) {
        setView({ name: 'trainer', level, genreId: initialTarget.genreId, step: 1 })
      } else {
        setView({ name: 'genres', level })
      }
    })
  }, [initialTarget, loadLevel])

  const entitlement = usePracticeEntitlement('writing', token)

  // Перевод выделенного слова/фразы (ru+kk): работает на всех вью, кроме
  // редактора Блокнота (хук сам игнорирует выделение внутри .wr-editor).
  const activeLevel = view.level || null
  useSelectionTranslate({
    levelData: activeLevel ? levels[activeLevel] : null,
    token,
    enabled: true,
  })

  const openGenres = useCallback(
    (level) => {
      loadLevel(level).then((data) => data && setView({ name: 'genres', level }))
    },
    [loadLevel],
  )

  const openTrainer = useCallback((level, genreId) => {
    setView({ name: 'trainer', level, genreId, step: 1 })
  }, [])

  const openPad = useCallback(
    ({ level = null, genreId = null, seedText = null, withTimer = false } = {}) => {
      // Блокнот без жанра («Свободное письмо») данных уровня не требует.
      if (level) loadLevel(level)
      setView({ name: 'pad', level, genreId, seedText, withTimer })
    },
    [loadLevel],
  )

  const showResult = useCallback((assessment, text, level, genreId) => {
    setView({ name: 'result', assessment, text, level, genreId })
  }, [])

  // Назад — зеркало цепочки прототипа: levels ← genres ← trainer; pad
  // возвращает в тренажёр своего жанра (или в уровни для свободного письма);
  // result — в Блокнот.
  const goBack = useCallback(() => {
    if (view.name === 'genres') setView({ name: 'levels' })
    else if (view.name === 'trainer') setView({ name: 'genres', level: view.level })
    else if (view.name === 'pad') {
      if (view.genreId) setView({ name: 'trainer', level: view.level, genreId: view.genreId, step: 6 })
      else setView({ name: 'levels' })
    } else if (view.name === 'result') {
      setView({ name: 'pad', level: view.level, genreId: view.genreId, seedText: null, withTimer: false })
    } else onNav?.('practice')
  }, [view, onNav])

  const crumbSpan = useMemo(() => {
    if (view.name === 'genres' && LEVEL_TITLES[view.level]) return LEVEL_TITLES[view.level][0]
    if (view.name === 'trainer') {
      const g = getGenre(view.level, view.genreId)
      return g ? g.title : ''
    }
    if (view.name === 'pad') {
      const g = view.genreId ? getGenre(view.level, view.genreId) : null
      return g ? g.title : t('writing.pad.free')
    }
    if (view.name === 'result') return t('writing.result.crumb')
    return t('writing.hero.crumb')
  }, [view, getGenre, t])

  const body = () => {
    if (!entitlement.loading && !entitlement.allowed) {
      return (
        <PracticeLimitScreen
          limit={entitlement.limit}
          onBack={() => onNav?.('practice')}
          isDemoAccount={isDemoAccount}
        />
      )
    }
    if (view.name === 'levels') {
      return (
        <WritingLevels
          progressTick={progressTick}
          onOpenLevel={openGenres}
          onOpenPad={() => openPad()}
        />
      )
    }
    if (view.name === 'genres') {
      return (
        <WritingGenres
          level={view.level}
          levelData={levels[view.level]}
          progressTick={progressTick}
          onOpen={(genreId) => openTrainer(view.level, genreId)}
        />
      )
    }
    if (view.name === 'trainer') {
      const genre = getGenre(view.level, view.genreId)
      if (!genre || !meta) return <div className="wr-note">{t('writing.loading')}</div>
      return (
        <WritingTrainer
          genre={genre}
          meta={meta}
          level={view.level}
          step={view.step}
          progressTick={progressTick}
          onStep={(step) => setView({ ...view, step })}
          onBackToGenres={() => setView({ name: 'genres', level: view.level })}
          onOpenPad={(opts) => openPad({ level: view.level, genreId: view.genreId, ...opts })}
        />
      )
    }
    if (view.name === 'pad') {
      const genre = view.genreId ? getGenre(view.level, view.genreId) : null
      return (
        <WritingPad
          genre={genre}
          meta={meta}
          level={view.level}
          seedText={view.seedText}
          withTimer={view.withTimer}
          token={token}
          onResult={(assessment, text) => showResult(assessment, text, view.level, view.genreId)}
          onBack={goBack}
        />
      )
    }
    if (view.name === 'result') {
      const genre = view.genreId ? getGenre(view.level, view.genreId) : null
      return (
        <WritingResult
          assessment={view.assessment}
          text={view.text}
          genre={genre}
          onBackToPad={goBack}
          onBackToTrainer={() =>
            view.genreId
              ? setView({ name: 'trainer', level: view.level, genreId: view.genreId, step: 6 })
              : setView({ name: 'levels' })
          }
        />
      )
    }
    return null
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="wr">
        <div className="wr-top">
          <button type="button" className="wr-back" onClick={goBack}>
            ← {t('writing.back')}
          </button>
          <div className="wr-crumb">
            <b>{t('practice.writing.title')}</b>
            <span>{crumbSpan}</span>
          </div>
        </div>
        {error && <div className="wr-note wr-note--err">{error}</div>}
        {body()}
      </div>
    </LearningLayout>
  )
}
