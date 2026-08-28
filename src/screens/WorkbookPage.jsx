'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import PracticeLimitScreen from '../components/PracticeLimitScreen.jsx'
import { useI18n } from '../i18n.jsx'
import { usePracticeEntitlement } from '../practice/usePracticeEntitlement.js'
import { WORKBOOK_PROGRESS_EVENT } from '../practice/practiceKeys.js'
import { readState, missKeys, nextLesson } from '../practice/workbook/workbookProgress.js'
import { markWorkbookLevelDone } from '../practice/workbooks/workbooksProgress.js'
import { WORKBOOK_LEVELS } from '../practice/workbooks/levels.js'
import { stopAudio } from '../practice/workbook/voice.js'
import WorkbookUnits, { LessonSheet } from './workbook/WorkbookUnits.jsx'
import WorkbookAct from './workbook/WorkbookAct.jsx'
import WorkbookWrap from './workbook/WorkbookWrap.jsx'
import WorkbookReview from './workbook/WorkbookReview.jsx'

// Раздел «Воркбук» — нативный порт standalone-прототипа. Внутренняя
// view-машина (каталог → экран задания → итог урока → разбор ошибок), как в
// «Письме»: отдельных Next-роутов нет намеренно, вся навигация приложения —
// state-машина App.jsx.
//
// Данные грузим лениво и кэшируем промисы на уровне модуля: возврат в каталог
// не должен перекачивать урок заново.
const cache = new Map()
function fetchJson(url) {
  if (!cache.has(url)) {
    cache.set(
      url,
      // cache:'no-cache' — не «без кэша», а «сверься перед выдачей»: файл
      // отдаётся из public с часовым max-age, и после пересборки данных
      // студент до часа видел бы старый каталог (так пропала звёздочка
      // челленджа у A1). Ответ 304 стоит одного условного запроса, а тело
      // по-прежнему берётся из браузерного кэша.
      fetch(url, { cache: 'no-cache' })
        .then((r) => {
          if (!r.ok) throw new Error('bad status ' + r.status)
          return r.json()
        })
        .catch((e) => {
          // Неудачную загрузку выкидываем из кэша, иначе ошибка «прилипает».
          cache.delete(url)
          throw e
        })
    )
  }
  return cache.get(url)
}

const fetchIndex = (level) => fetchJson('/practice/workbook/' + level + '/index.json')
const fetchMeta = (level) => fetchJson('/practice/workbook/' + level + '/meta.json')
const fetchLesson = (level, n) => fetchJson('/practice/workbook/' + level + '/lesson-' + n + '.json')

export default function WorkbookPage({
  userLevel,
  userName,
  token,
  initialTarget,
  onNav,
  onProfile,
  isDemoAccount,
}) {
  const { t } = useI18n()
  const level = (initialTarget?.level || 'a0').toLowerCase()
  const levelMeta = WORKBOOK_LEVELS.find((l) => l.code === level) || WORKBOOK_LEVELS[0]

  const [view, setView] = useState({ name: 'units' })
  const [index, setIndex] = useState(null)
  const [meta, setMeta] = useState(null)
  const [lessons, setLessons] = useState({})
  const [error, setError] = useState('')
  const [slow, setSlow] = useState(false)
  const [sheet, setSheet] = useState(false)
  // Черновики свободных экранов — на странице, а не в экране: экран
  // перемонтируется на каждом шаге, и внутри они бы не пережили переход.
  const [drafts, setDrafts] = useState({})

  // Прогресс перечитывается по событию: и локальная отметка, и гидратация с
  // сервера шлют одно и то же — каталог и полоса шагов пересчитываются сами.
  const [progress, setProgress] = useState(() => ({ prog: {}, miss: {}, sc: {} }))
  useEffect(() => {
    const sync = () => setProgress(readState())
    sync()
    window.addEventListener(WORKBOOK_PROGRESS_EVENT, sync)
    return () => window.removeEventListener(WORKBOOK_PROGRESS_EVENT, sync)
  }, [])

  const entitlement = usePracticeEntitlement('workbooks', token)

  useEffect(() => {
    let alive = true
    Promise.all([fetchIndex(level), fetchMeta(level)])
      .then(([idx, m]) => {
        if (!alive) return
        setIndex(idx)
        setMeta(m)
      })
      .catch(() => alive && setError(t('workbook.loadError')))
    return () => {
      alive = false
    }
  }, [level, t])

  // Открытый уровень — единица квоты PRACTICE_WORKBOOKS (та же, что была у
  // оверлея). Отмечаем один раз, когда данные реально доехали.
  useEffect(() => {
    if (index) markWorkbookLevelDone(level)
  }, [index, level])

  useEffect(() => () => stopAudio(), [])

  const loadLesson = useCallback(
    (n, then) => {
      if (lessons[n]) {
        then(lessons[n])
        return
      }
      fetchLesson(level, n)
        .then((L) => {
          setLessons((m) => ({ ...m, [n]: L }))
          then(L)
        })
        .catch(() => setError(t('workbook.loadError')))
    },
    [lessons, level, t]
  )

  const openLesson = useCallback(
    (n, at) => {
      loadLesson(n, (L) => {
        const state = readState()
        let start = at
        if (start == null) {
          start = 0
          for (let i = 0; i < L.acts.length; i++) {
            if (!state.prog[level + ':' + n + '.' + i]) {
              start = i
              break
            }
          }
        }
        setView({ name: 'act', n, i: start })
      })
    },
    [loadLesson, level]
  )

  const openReview = useCallback(() => {
    const keys = missKeys(level, readState())
    if (!keys.length) {
      setView({ name: 'units' })
      return
    }
    const [n, i] = keys[0].slice(level.length + 1).split('.').map(Number)
    loadLesson(n, () => setView({ name: 'review', n, i }))
  }, [level, loadLesson])

  const counts = useMemo(
    () => (index ? Object.fromEntries(Object.entries(index.lessons).map(([n, m]) => [n, m.acts])) : {}),
    [index]
  )
  const nums = useMemo(() => Object.keys(counts).map(Number).sort((a, b) => a - b), [counts])

  const goBack = () => {
    if (view.name === 'units') {
      onNav?.('practice')
      return
    }
    setView({ name: 'units' })
  }

  const backLabel =
    view.name === 'units' ? t('workbook.back.practice') : levelMeta.label + ' · ' + t('workbook.back.units')

  const crumb = () => {
    if (view.name === 'act' || view.name === 'wrap') return lessons[view.n]?.title || ''
    if (view.name === 'review') return t('workbook.reviewTitle')
    return levelMeta.title
  }

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
    if (error) return <div className="wb-note wb-note--err">{error}</div>
    if (!index || !meta) return <div className="wb-loading">{t('workbook.loading')}</div>

    if (view.name === 'units') {
      return (
        <WorkbookUnits
          level={level}
          index={index}
          progress={progress}
          levelTitle={levelMeta.label + ' · ' + levelMeta.title}
          onOpenLesson={(n) => openLesson(n)}
          onReview={openReview}
        />
      )
    }

    const lesson = lessons[view.n]
    if (!lesson) return <div className="wb-loading">{t('workbook.loading')}</div>

    if (view.name === 'act') {
      return (
        <>
          <WorkbookAct
            /* key обязателен: без перемонтирования счётчик мест остаётся от
               предыдущего задания, и «Дальше» разблокируется не вовремя. */
            key={view.n + '.' + view.i}
            level={level}
            lesson={lesson}
            index={view.i}
            meta={meta}
            progress={progress}
            slow={slow}
            onSlow={setSlow}
            onBack={() => setView({ name: 'units' })}
            onMenu={() => setSheet(true)}
            onDone={(last) =>
              last ? setView({ name: 'wrap', n: view.n }) : setView({ name: 'act', n: view.n, i: view.i + 1 })
            }
            draft={drafts[view.n + '.' + view.i] || ''}
            onDraft={(v) => setDrafts((d) => ({ ...d, [view.n + '.' + view.i]: v }))}
          />
          {sheet ? (
            <LessonSheet
              level={level}
              lesson={lesson}
              progress={progress}
              meta={meta}
              onPick={(i) => {
                setSheet(false)
                setView({ name: 'act', n: view.n, i })
              }}
              onClose={() => setSheet(false)}
            />
          ) : null}
        </>
      )
    }

    if (view.name === 'wrap') {
      const after = nums[nums.indexOf(view.n) + 1]
      return (
        <WorkbookWrap
          level={level}
          lesson={lesson}
          progress={progress}
          onBack={() => setView({ name: 'units' })}
          onReview={openReview}
          nextTitle={after ? index.lessons[after]?.title : null}
          onNext={() => openLesson(after ?? nextLesson(level, nums, counts, progress))}
          onTick={() => setProgress(readState())}
          /* Пересдача зачёта: прогресс урока уже стёрт, начинаем с первого
             экрана — иначе openLesson вернул бы на «первый непройденный»
             ещё по старому состоянию. */
          onRetake={() => setView({ name: 'act', n: view.n, i: 0 })}
        />
      )
    }

    if (view.name === 'review') {
      const keys = missKeys(level, progress)
      return (
        <WorkbookReview
          key={view.n + '.' + view.i}
          level={level}
          lesson={lesson}
          index={view.i}
          missed={progress.miss[level + ':' + view.n + '.' + view.i] || []}
          meta={meta}
          slow={slow}
          onSlow={setSlow}
          left={keys.length}
          onBack={() => setView({ name: 'units' })}
          onNext={openReview}
        />
      )
    }
    return null
  }

  return (
    <LearningLayout
      userName={userName}
      userLevel={userLevel}
      active="practice"
      token={token}
      onNav={onNav}
      onProfile={onProfile}
    >
      <div className="wb">
        <div className="wb-top">
          <button type="button" className="wb-backbtn" onClick={goBack}>
            ← {backLabel}
          </button>
          <div className="wb-crumb">
            <b>{t('practice.chip.workbooks')}</b>
            <span>{crumb()}</span>
          </div>
        </div>
        {body()}
      </div>
    </LearningLayout>
  )
}
