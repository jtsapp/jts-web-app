'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import Sidebar from '../components/Sidebar.jsx'
import LessonExitConfirm from '../components/LessonExitConfirm.jsx'
import LessonResultCard from '../components/LessonResultCard.jsx'
import CourseStepPlayer from '../learning/CourseStepPlayer.jsx'
import { SAMPLE_LESSON } from './workspace/sampleLesson.js'
import { loadLiveLesson } from './workspace/liveLessonData.js'
import { liveLessonSteps, topicIdAtStep } from './workspace/liveSteps.js'
import LessonAside from './workspace/LessonAside.jsx'

// Экран онлайн-урока (Figma «pitch JTS» → Уроки → Онлайн-уроки).
//
// Урок в макете — очередь экранов с прогрессом сверху, то есть тот же плеер,
// что и в «Обучении» (CourseStepPlayer). Поэтому здесь нет второго движка
// заданий: экран только готовит плееру шаги (liveLessonSteps) и добавляет то,
// чего у урока «Обучения» нет — сайдбар приложения слева и правую колонку со
// звонком, топиками и чатом с учителем.
//
// `lessonId` — id урока (диплинк `?screen=lesson-workspace&lesson=…` в App.jsx).
// `loadLesson` — как достать контент по id: по умолчанию loadLiveLesson
// (LiveLesson → jsonUrl с files-api); для урока каталога App передаёт
// loadCatalogLesson. Без сети/lessonId или при ошибке падаем на SAMPLE_LESSON,
// чтобы экран не пустовал.
export default function LessonWorkspacePage({
  onExit,
  lessonId,
  token,
  loadLesson = loadLiveLesson,
  userName,
  userLevel = 'A1',
  onNav,
  onProfile,
  onVocab,
}) {
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

  const steps = useMemo(() => liveLessonSteps(lesson), [lesson])

  // Номер открытого экрана приходит из плеера: индекс живёт там, а правой
  // колонке он нужен, чтобы подсветить текущий топик.
  const [stepIndex, setStepIndex] = useState(0)
  const [messages, setMessages] = useState([])
  const [confirmExit, setConfirmExit] = useState(false)
  const [end, setEnd] = useState(null)
  // Пройти урок заново — это перемонтировать плеер: весь его прогресс живёт
  // внутри, и сбросить его снаружи нечем.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setMessages(lesson?.chat || [])
  }, [lesson])

  const handleStep = useCallback((index) => setStepIndex(index), [])

  const handleSend = useCallback((text) => {
    setMessages((prev) => [...prev, { id: `student-${Date.now()}-${prev.length}`, from: 'student', text }])
  }, [])

  // Подпись отправителя в пузыре (см. TeacherChat) — своё сообщение остаётся
  // без имени (компонент подставит «Вы»), входящие подписываются именем
  // учителя из урока.
  const chatMessages = useMemo(
    () => messages.map((m) => (m.from === 'teacher' ? { ...m, senderName: lesson?.teacher?.name } : m)),
    [messages, lesson],
  )

  const retry = () => {
    setEnd(null)
    setStepIndex(0)
    setAttempt((n) => n + 1)
  }

  if (loading || !lesson) {
    return (
      <div className="lw lw--loading" data-testid="lesson-workspace">
        <p className="lw-loading">{t('lesson.ws.loading')}</p>
      </div>
    )
  }

  const activeTopicId = topicIdAtStep(lesson, steps, stepIndex)
  const accuracy = end?.accuracy ?? 100

  return (
    <div className="learn learn--lesson" data-testid="lesson-workspace">
      <div className="learn__body">
        <Sidebar
          userName={userName}
          userLevel={userLevel}
          active="lessons"
          token={token}
          onNav={onNav}
          onProfile={onProfile}
        />
        <main className="learn__main">
          <CourseStepPlayer
            key={attempt}
            steps={steps}
            title={lesson.title || lesson.unit || ''}
            level={lesson.level}
            onExit={() => setConfirmExit(true)}
            onVocab={onVocab}
            withLang
            onStep={handleStep}
            onDone={setEnd}
            aside={
              <LessonAside
                lesson={lesson}
                activeTopicId={activeTopicId}
                messages={chatMessages}
                onSend={handleSend}
              />
            }
          />

          {/* Итоги урока (Figma, Wrap → 4065:30498). Действия свои: следующего
              урока у живого занятия нет, его назначает преподаватель в
              расписании — поэтому вместо «на следующий урок» выход в меню. */}
          {end && (
            <LessonResultCard
              accuracy={accuracy}
              correct={end.correct ?? 0}
              wrong={end.wrong ?? 0}
              subtitle={`${lesson.unit || lesson.title || t('learn.done')} — пройден`}
            >
              <button className="le-btn" onClick={onExit}>
                {t('lesson.exitLeave')}
              </button>
              <button className="le-again" onClick={retry}>
                Пройти снова
              </button>
            </LessonResultCard>
          )}

          {confirmExit && <LessonExitConfirm onStay={() => setConfirmExit(false)} onLeave={onExit} />}
        </main>
      </div>
    </div>
  )
}
