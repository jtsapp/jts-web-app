'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import Sidebar from '../components/Sidebar.jsx'
import LessonExitConfirm from '../components/LessonExitConfirm.jsx'
import LessonResultCard from '../components/LessonResultCard.jsx'
import CourseStepPlayer from '../learning/CourseStepPlayer.jsx'
import { SAMPLE_LESSON } from './workspace/sampleLesson.js'
import { loadLiveLesson } from './workspace/liveLessonData.js'
import { liveLessonSteps } from './workspace/liveSteps.js'
import LessonAside from './workspace/LessonAside.jsx'
import LessonContent from './workspace/LessonContent.jsx'
import { ChevronLeftIcon } from '../components/icons.jsx'

/**
 * Файл курса умеет три варианта одного урока и выбирает их по `?mode=` —
 * `self` / `solo` / `group`, всё остальное считает за `solo` (единственный
 * скрипт внутри файла ставит `data-mode` на <html>, а вёрстка по нему прячет
 * лишнее). Без параметра ученик «Самостоятельно» получал вариант для занятия,
 * а не свой. Свои query и хвост URL сохраняем — файл лежит на чужом хранилище.
 */
function selfStudyUrl(fileUrl) {
  if (!fileUrl) return fileUrl
  try {
    const url = new URL(fileUrl, window.location.origin)
    url.searchParams.set('mode', 'self')
    return url.toString()
  } catch {
    return fileUrl
  }
}

/**
 * Шапка документа урока: назад и название.
 *
 * У плеера выход есть в его собственной шапке, а документ и материал до сих пор
 * открывались вообще без него — уйти можно было только через сайдбар, и то
 * догадавшись. Название рядом с кнопкой, потому что на этом экране его больше
 * негде прочитать: у материала оно внутри iframe, а у документа — только во
 * вкладках шагов.
 */
function DocBar({ title, onExit }) {
  const { t } = useI18n()
  return (
    <div className="lw-doc__bar">
      <button type="button" className="lw-doc__back" onClick={onExit}>
        <ChevronLeftIcon size={18} />
        <span>{t('lesson.ws.back')}</span>
      </button>
      {title && <h1 className="lw-doc__title">{title}</h1>}
    </div>
  )
}

// Экран онлайн-урока (Figma «pitch JTS» → Уроки → Онлайн-уроки).
//
// Урок в макете — очередь экранов с прогрессом сверху, то есть тот же плеер,
// что и в «Обучении» (CourseStepPlayer). Поэтому здесь нет второго движка
// заданий: экран только готовит плееру шаги (liveLessonSteps) и добавляет то,
// чего у урока «Обучения» нет — сайдбар приложения слева и правую колонку со
// звонком и чатом с учителем.
//
// `lessonId` — id урока (диплинк `?screen=lesson-workspace&lesson=…` в App.jsx).
// `loadLesson` — как достать контент по id: по умолчанию loadLiveLesson
// (LiveLesson → jsonUrl с files-api); для урока каталога App передаёт
// loadCatalogLesson. Без lessonId экран показывает демонстрационный урок; урок,
// который не загрузился, демо НЕ подменяет — об этом говорится прямо.
export default function LessonWorkspacePage({
  onExit,
  lessonId,
  token,
  catalogLessonId,
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
      // Не подставляем демо-урок вместо запрошенного. Раньше здесь стоял
      // `loaded || SAMPLE_LESSON`, и ученик, открыв урок каталога, получал
      // чужой демонстрационный урок про Present Simple с заглушкой «Место для
      // баннера» — и читал это как «материал обрезали». Не загрузилось —
      // говорим об этом прямо. SAMPLE_LESSON остаётся тем, чем задуман:
      // содержимым экрана, открытого вообще без урока.
      setLesson(loaded || null)
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
  // Шагов нет вовсе, но есть файл курса: урок просто не разбирали (см.
  // loadCatalogLesson). Плееру тут нечего показывать, а материал — есть.
  const useMaterialView = steps.length === 0 && (lesson?.steps?.length ?? 0) === 0 && Boolean(lesson?.fileUrl)
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
  const handleDocCheck = useCallback((key, questionIds = []) => {
    setDocChecked((prev) => {
      const next = new Set(prev).add(key)
      questionIds.forEach((id) => next.add(id))
      return next
    })
  }, [])

  const [messages, setMessages] = useState([])
  const [confirmExit, setConfirmExit] = useState(false)
  const [end, setEnd] = useState(null)
  // Пройти урок заново — это перемонтировать плеер: весь его прогресс живёт
  // внутри, и сбросить его снаружи нечем.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setMessages(lesson?.chat || [])
  }, [lesson])

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

  if (loading) {
    return (
      <div className="lw lw--loading" data-testid="lesson-workspace">
        <p className="lw-loading">{t('lesson.ws.loading')}</p>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="lw lw--loading" data-testid="lesson-workspace">
        <p className="lw-loading">{t('lesson.ws.loadFailed')}</p>
        <button type="button" className="lw-stepnav__btn lw-stepnav__btn--ghost" onClick={onExit}>
          {t('lesson.ws.exit')}
        </button>
      </div>
    )
  }

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
          {useMaterialView ? (
            // Урок не разобран на шаги — таких в каталоге две трети. Показываем
            // сам материал курса, а не пустой плеер: файл и есть урок, просто
            // без интерактива.
            // `.lw-doc` снаружи не для вида: на нём объявлены токены `--lw-*`,
            // и без него рамка материала осталась бы без фона и скруглений.
            <div className="lw-doc">
              <DocBar title={lesson.title} onExit={onExit} />
              <div className="lw-material-frame">
                <iframe
                  src={selfStudyUrl(lesson.fileUrl)}
                  title={lesson.title || t('lessons.tabSelf')}
                  className="lw-material-iframe"
                  allow="autoplay"
                />
              </div>
            </div>
          ) : useDocView ? (
            // Плеер не осилил урок целиком (vocab-колода или вопрос типа
            // order/multi/pick/match — см. liveSteps.js): показываем документ
            // урока, как в живом уроке, со своей вкладочной навигацией по шагам
            // вместо очереди экранов.
            <div className="lw-doc">
              <DocBar title={lesson.title} onExit={onExit} />
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
              <LessonContent
                step={docStep}
                answers={docAnswers}
                checkedKeys={docChecked}
                onAnswer={handleDocAnswer}
                onCheck={handleDocCheck}
                readOnly={false}
                token={token}
                source={lesson?.title}
                catalogLessonId={catalogLessonId}
              />
            </div>
          ) : (
            <CourseStepPlayer
              key={attempt}
              steps={steps}
              title={lesson.title || lesson.unit || ''}
              level={lesson.level}
              token={token}
              catalogLessonId={catalogLessonId}
              onExit={() => setConfirmExit(true)}
              onVocab={onVocab}
              withLang
              onDone={setEnd}
              aside={
                <LessonAside
                  lesson={lesson}
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
