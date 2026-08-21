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
import LessonContent from './workspace/LessonContent.jsx'

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

  // Шаг урока не всегда сводится к очереди экранов плеера (`vocab`-колода,
  // вопрос типа order/multi/pick/match — см. комментарий в liveSteps.js): тогда
  // `steps` пустеет весь, и вместо плеера показываем документ урока целиком —
  // тот же `LessonContent`, что и в живом уроке, только с собственной вкладочной
  // навигацией по шагам, а не route-панелью преподавателя.
  const useDocView = steps.length === 0 && (lesson?.steps?.length ?? 0) > 0
  const [docStepId, setDocStepId] = useState(null)
  useEffect(() => {
    setDocStepId(lesson?.steps?.[0]?.id ?? null)
  }, [lesson])
  const docStep = lesson?.steps?.find((s) => s.id === docStepId) || lesson?.steps?.[0] || null
  const [docAnswers, setDocAnswers] = useState({})
  const [docChecked, setDocChecked] = useState(() => new Set())
  const handleDocAnswer = useCallback((questionId, value) => {
    setDocAnswers((prev) => ({ ...prev, [questionId]: value }))
  }, [])
  const handleDocCheck = useCallback((key) => {
    setDocChecked((prev) => new Set(prev).add(key))
  }, [])

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

  const activeTopicId = useDocView ? (docStep?.topicId ?? null) : topicIdAtStep(lesson, steps, stepIndex)
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
          {useDocView ? (
            // Плеер не осилил урок целиком (vocab-колода или вопрос типа
            // order/multi/pick/match — см. liveSteps.js): показываем документ
            // урока, как в живом уроке, со своей вкладочной навигацией по шагам
            // вместо очереди экранов.
            <div className="lw-doc">
              {lesson.steps.length > 1 && (
                <div className="ls__tabs lw-material-tabs">
                  {lesson.steps.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`ls-tab ${s.id === docStep?.id ? 'ls-tab--active' : ''}`}
                      onClick={() => setDocStepId(s.id)}
                    >
                      {s.title || s.id}
                    </button>
                  ))}
                </div>
              )}
              <div className="lw-doc__body">
                <LessonContent
                  step={docStep}
                  answers={docAnswers}
                  checkedKeys={docChecked}
                  onAnswer={handleDocAnswer}
                  onCheck={handleDocCheck}
                  readOnly={false}
                />
                {/* Правая колонка обещана шапкой этого файла и в очереди
                    экранов уже есть — а в документальной ветке её не было
                    вовсе. Урок, который плеер не осилил, оставался без звонка,
                    тем и чата: те же три карточки, тот же компонент. */}
                <LessonAside
                  lesson={lesson}
                  activeTopicId={activeTopicId}
                  messages={chatMessages}
                  onSend={handleSend}
                />
              </div>
            </div>
          ) : (
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
          )}

          {/* Итоги урока (Figma, Wrap → 4065:30498). Действия свои: следующего
              урока у живого занятия нет, его назначает преподаватель в
              расписании — поэтому вместо «на следующий урок» выход в меню. */}
          {!useDocView && end && (
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
