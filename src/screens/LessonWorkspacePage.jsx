'use client'

import { useMemo, useState } from 'react'
import { SAMPLE_LESSON } from './workspace/sampleLesson.js'
import { stepProgress } from './workspace/practiceGrading.js'
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
export default function LessonWorkspacePage({ onExit }) {
  const lesson = SAMPLE_LESSON
  const steps = lesson.steps

  const [activeStepId, setActiveStepId] = useState(steps[0].id)
  const [answers, setAnswers] = useState({})
  const [checkedSteps, setCheckedSteps] = useState(() => new Set())
  const [messages, setMessages] = useState(lesson.chat || [])

  const activeIndex = steps.findIndex((step) => step.id === activeStepId)
  const activeStep = activeIndex >= 0 ? steps[activeIndex] : null

  // Статусы шагов маршрута — визуальные (клик по любому шагу не блокируется,
  // см. LessonRoute): текущий — активный; всё до него — done; после него —
  // done только если practice-вопросы этого шага уже отвечены верно
  // (stepProgress на массиве из одного шага), иначе — locked.
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
