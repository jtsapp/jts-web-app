'use client'

import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { SAMPLE_LESSON } from './workspace/sampleLesson.js'
import { stepProgress } from './workspace/practiceGrading.js'
import { loadLiveLesson } from './workspace/liveLessonData.js'
import WorkspaceHeader from './workspace/WorkspaceHeader.jsx'
import LessonRoute from './workspace/LessonRoute.jsx'
import LessonContent from './workspace/LessonContent.jsx'
import LessonAside from './workspace/LessonAside.jsx'

// Статично для мока (см. бриф Task 6, п.«elapsedSec») — 103с = 01:43.
// Реальный тикающий таймер — вне области подпроекта №1 (мок-урок).
const ELAPSED_SEC = 103

// Сборка экрана живого урока: держит весь стейт (активный шаг, ответы,
// отмеченные «Проверить» шаги, чат) и раздаёт его в три колонки —
// LessonRoute / LessonContent / LessonAside — плюс шапку. Дочерние
// компоненты остаются управляемыми и без собственного состояния прогресса.
//
// `lessonId` — id урока (диплинк `?screen=lesson-workspace&lesson=…` в App.jsx).
// `loadLesson` — как достать контент по id: по умолчанию loadLiveLesson
// (LiveLesson → jsonUrl с files-api); для урока каталога App передаёт
// loadCatalogLesson (сырой L*.html → клиентское извлечение + E6). Без
// сети/lessonId или при ошибке падаем на SAMPLE_LESSON, чтобы экран не пустовал.
export default function LessonWorkspacePage({ onExit, lessonId, token, loadLesson = loadLiveLesson }) {
  const { t } = useI18n()
  const [lesson, setLesson] = useState(() => (lessonId ? null : SAMPLE_LESSON))
  const [loading, setLoading] = useState(() => Boolean(lessonId))

  useEffect(() => {
    let cancelled = false
    if (!lessonId) {
      setLesson(SAMPLE_LESSON)
      setLoading(false)
      return undefined
    }
    setLoading(true)
    loadLesson(lessonId, token).then((loaded) => {
      if (cancelled) return
      setLesson(loaded || SAMPLE_LESSON)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [lessonId, token, loadLesson])

  const steps = useMemo(() => lesson?.steps || [], [lesson])

  const [activeStepId, setActiveStepId] = useState(() => (lessonId ? null : SAMPLE_LESSON.steps[0].id))
  const [answers, setAnswers] = useState({})
  const [checkedSteps, setCheckedSteps] = useState(() => new Set())
  const [messages, setMessages] = useState(() => (lessonId ? [] : SAMPLE_LESSON.chat || []))

  // Как только урок (за)гружен — выставляем первый шаг и чат урока. Для
  // мгновенного SAMPLE_LESSON это отработает один раз при монтировании; для
  // живого урока — когда loadLiveLesson резолвится.
  useEffect(() => {
    if (!lesson) return
    setActiveStepId((prev) => (prev && lesson.steps.some((s) => s.id === prev) ? prev : lesson.steps[0]?.id ?? null))
    setMessages(lesson.chat || [])
  }, [lesson])

  const activeIndex = steps.findIndex((step) => step.id === activeStepId)
  const activeStep = activeIndex >= 0 ? steps[activeIndex] : null

  // Статусы шагов маршрута — визуальные (клик по любому шагу не блокируется,
  // см. LessonRoute): текущий — активный; всё до него — done; после него —
  // done только если practice-вопросы этого шага уже отвечены верно
  // (stepProgress на массиве из одного шага), иначе — locked. Хук должен
  // отработать на каждом рендере (даже во время загрузки) — иначе порядок
  // хуков между рендерами разъедется; ранний return на loading — ниже, уже
  // после всех хуков.
  const statusById = useMemo(() => {
    const map = {}
    steps.forEach((step, i) => {
      if (step.id === activeStepId) {
        map[step.id] = 'current'
      } else if (i < activeIndex) {
        map[step.id] = 'done'
      } else {
        map[step.id] = stepProgress([step], answers).done === 1 ? 'done' : 'locked'
      }
    })
    return map
  }, [steps, activeStepId, activeIndex, answers])

  if (loading || !lesson) {
    return (
      <div className="lw lw--loading" data-testid="lesson-workspace">
        <p className="lw-loading">{t('lesson.ws.loading')}</p>
      </div>
    )
  }

  function handleAnswer(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  function handleCheck() {
    setCheckedSteps((prev) => {
      if (prev.has(activeStepId)) return prev
      const next = new Set(prev)
      next.add(activeStepId)
      return next
    })
  }

  function handleSend(text) {
    setMessages((prev) => [...prev, { id: `student-${Date.now()}-${prev.length}`, from: 'student', text }])
  }

  return (
    <div className="lw" data-testid="lesson-workspace">
      <WorkspaceHeader lesson={lesson} stepIndex={Math.max(activeIndex, 0)} elapsedSec={ELAPSED_SEC} onExit={onExit} />
      <div className="lw__body">
        <LessonRoute steps={steps} activeStepId={activeStepId} statusById={statusById} onSelect={setActiveStepId} />
        <div className="lw__main">
          <LessonContent
            step={activeStep}
            answers={answers}
            checked={checkedSteps.has(activeStepId)}
            onAnswer={handleAnswer}
            onCheck={handleCheck}
          />
          <LessonAside lesson={lesson} activeTopicId={activeStep?.topicId} messages={messages} onSend={handleSend} />
        </div>
      </div>
    </div>
  )
}
