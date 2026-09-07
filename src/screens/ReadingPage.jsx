import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import PracticeLimitScreen from '../components/PracticeLimitScreen.jsx'
import { useI18n } from '../i18n.jsx'
import { usePracticeEntitlement } from '../practice/usePracticeEntitlement.js'
import { READING_PROGRESS_EVENT } from '../practice/practiceKeys.js'
import { readView, writeView, viewVars, stepFont } from '../practice/reading/viewSettings.js'
import ReadingLibrary from './reading/ReadingLibrary.jsx'
import ReadingText from './reading/ReadingText.jsx'
import ReadingResult from './reading/ReadingResult.jsx'
import ReadingSettings from './reading/ReadingSettings.jsx'
import { stopAudio } from '../practice/workbook/voice.js'

export const READING_LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1']

// Уровень — сотня-другая килобайт, поэтому грузим лениво и кэшируем промис на
// уровне модуля (паттерн WritingPage/loadGrammarIndex): возврат в каталог не
// перекачивает уже прочитанное.
const levelCache = new Map()
function fetchLevel(level) {
  if (!levelCache.has(level)) {
    levelCache.set(
      level,
      fetch(`/practice/reading/${level}.json`)
        .then((r) => {
          if (!r.ok) throw new Error('bad status ' + r.status)
          return r.json()
        })
        .catch((e) => {
          // Неудачную загрузку выкидываем из кэша, иначе ошибка «прилипает»
          // до перезагрузки страницы.
          levelCache.delete(level)
          throw e
        }),
    )
  }
  return levelCache.get(level)
}

// Словарь тапа по слову — 216 КБ, и он общий на все уровни. Тянем его ЛЕНИВО,
// с первого тапа: большинству читателей он не нужен вовсе (перевод ключевых
// слов уже лежит рядом с текстом).
let dictPromise = null
function fetchDict() {
  if (!dictPromise) {
    dictPromise = fetch('/practice/reading/dict.json')
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => {
        dictPromise = null
        return {}
      })
  }
  return dictPromise
}

// Экран «Чтение»: внутренняя view-машина (как S.screen в прототипе) —
// библиотека → читалка → результат. Отдельных Next-роутов нет намеренно:
// навигация всего приложения — state-машина App.jsx.
export default function ReadingPage({ userLevel, userName, token, initialTarget, onNav, onProfile, isDemoAccount }) {
  const { t } = useI18n()
  const [view, setView] = useState({ name: 'library' })
  // Уровень каталога живёт отдельно от view: возврат из текста должен вернуть
  // в тот же уровень и жанр, где читатель был.
  const [level, setLevel] = useState(() => (READING_LEVELS.includes(String(userLevel || '').toLowerCase()) ? String(userLevel).toLowerCase() : 'a1'))
  const [genre, setGenre] = useState('all')
  const [levels, setLevels] = useState({})
  const [dict, setDict] = useState(null)
  const [error, setError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [viewPrefs, setViewPrefs] = useState(() => readView())

  // Тик прогресса: и локальные отметки, и гидратация с сервера шлют одно
  // событие — карточки каталога пересчитываются сами.
  const [progressTick, setProgressTick] = useState(0)
  useEffect(() => {
    const bump = () => setProgressTick((n) => n + 1)
    window.addEventListener(READING_PROGRESS_EVENT, bump)
    return () => window.removeEventListener(READING_PROGRESS_EVENT, bump)
  }, [])

  // Уходя с раздела, глушим синтез: иначе браузер продолжает читать текст
  // на уже закрытом экране (в прототипе это чинил beforeunload).
  useEffect(() => () => stopAudio(), [])

  const loadLevel = useCallback(
    (lv) => {
      if (levels[lv]) return Promise.resolve(levels[lv])
      return fetchLevel(lv)
        .then((data) => {
          setLevels((prev) => (prev[lv] ? prev : { ...prev, [lv]: data }))
          setError('')
          return data
        })
        .catch(() => {
          setError(t('reading.loadError'))
          return null
        })
    },
    [levels, t],
  )

  useEffect(() => {
    loadLevel(level)
    // loadLevel меняется вместе с levels — зависимость по нему зациклила бы
    // загрузку; уровень здесь единственный настоящий вход.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level])

  const ensureDict = useCallback(() => {
    if (dict) return Promise.resolve(dict)
    return fetchDict().then((d) => {
      setDict(d)
      return d
    })
  }, [dict])

  const texts = levels[level] ? levels[level].texts : null

  // Прыжок из Практики: ?screen=reading (+ level/textId в payload).
  const appliedTargetRef = useRef(false)
  useEffect(() => {
    if (appliedTargetRef.current || !initialTarget) return
    appliedTargetRef.current = true
    const lv = READING_LEVELS.includes(initialTarget.level) ? initialTarget.level : null
    if (!lv) return
    setLevel(lv)
    if (!initialTarget.textId) return
    loadLevel(lv).then((data) => {
      if (data && data.texts.some((x) => x.id === initialTarget.textId)) {
        setView({ name: 'read', textId: initialTarget.textId })
      }
    })
  }, [initialTarget, loadLevel])

  const entitlement = usePracticeEntitlement('reading', token)

  const current = useMemo(
    () => (view.textId && texts ? texts.find((x) => x.id === view.textId) || null : null),
    [view.textId, texts],
  )

  const openText = useCallback((textId) => {
    stopAudio()
    setView({ name: 'read', textId })
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  const goLibrary = useCallback(() => {
    stopAudio()
    setView({ name: 'library' })
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  const goBack = useCallback(() => {
    if (view.name === 'read') goLibrary()
    else if (view.name === 'result') setView({ name: 'read', textId: view.textId })
    else onNav?.('practice')
  }, [view, goLibrary, onNav])

  const backLabel =
    view.name === 'read' ? t('reading.back.library')
      : view.name === 'result' ? t('reading.back.text')
        : t('reading.back.practice')

  const crumbSpan =
    view.name === 'library' ? t('reading.hero.crumb')
      : current ? current.title
        : ''

  const applyView = useCallback((next) => {
    setViewPrefs(next)
    writeView(next)
  }, [])

  const body = () => {
    if (!entitlement.loading && !entitlement.allowed) {
      return (
        <PracticeLimitScreen
          limit={entitlement.limit}
          onBack={() => onNav?.('practice')}
          isDemoAccount={isDemoAccount}
          source={entitlement.source}
          sourceName={entitlement.sourceName}
        />
      )
    }
    if (view.name === 'library') {
      return (
        <ReadingLibrary
          level={level}
          genre={genre}
          texts={texts}
          progressTick={progressTick}
          onLevel={setLevel}
          onGenre={setGenre}
          onOpen={openText}
        />
      )
    }
    if (!current) return <div className="rd-note">{t('reading.loading')}</div>
    if (view.name === 'read') {
      return (
        <ReadingText
          key={current.id}
          text={current}
          dict={dict}
          ensureDict={ensureDict}
          onFont={(dir) => applyView({ ...viewPrefs, fs: stepFont(viewPrefs.fs, dir) })}
          onSettings={() => setSettingsOpen(true)}
          onFinish={() => {
            stopAudio()
            setView({ name: 'result', textId: current.id })
            window.scrollTo({ top: 0, behavior: 'auto' })
          }}
        />
      )
    }
    return (
      <ReadingResult
        text={current}
        texts={texts}
        progressTick={progressTick}
        onOpen={openText}
        onLibrary={goLibrary}
        onReview={() => setView({ name: 'read', textId: current.id, tab: 'ex' })}
      />
    )
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      {/* data-selectable снимает глобальный запрет выделения (styles.css): весь
          раздел — поверхность чтения, и слово в тексте должно выделяться, чтобы
          его можно было перевести. */}
      <div className={`rd${viewPrefs.dys ? ' rd--dys' : ''}`} data-selectable="" style={viewVars(viewPrefs)}>
        <div className="rd-top">
          <button type="button" className="rd-back" onClick={goBack}>
            ← {backLabel}
          </button>
          <div className="rd-crumb">
            <b>{t('practice.reading.title')}</b>
            <span>{crumbSpan}</span>
          </div>
        </div>
        {error && <div className="rd-note rd-note--err">{error}</div>}
        {body()}
        {settingsOpen && (
          <ReadingSettings view={viewPrefs} onChange={applyView} onClose={() => setSettingsOpen(false)} />
        )}
      </div>
    </LearningLayout>
  )
}
