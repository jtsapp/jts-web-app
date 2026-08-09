import { useEffect, useMemo, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import {
  getLessonById, startLiveLesson, pauseLiveLesson, resumeLiveLesson, completeLiveLesson,
  getLessonSections, getLessonMessages, sendLessonMessage, setLessonMeetingUrl,
} from '../api.js'
import { roleFromToken, userIdFromToken } from '../lib/jwt.js'
import { canControl } from './live/liveStatus.js'
import { useLessonPresence } from './live/useLessonPresence.js'
import { useLessonLiveSocket } from './live/useLessonLiveSocket.js'
import LiveStatusBadge from './live/LiveStatusBadge.jsx'
import PresenceRoster from './live/PresenceRoster.jsx'
import TeacherControls from './live/TeacherControls.jsx'
import LiveBoard from './live/LiveBoard.jsx'
import SectionMaterialFrame from './live/SectionMaterialFrame.jsx'
import LessonRoute from './workspace/LessonRoute.jsx'
import LessonContent from './workspace/LessonContent.jsx'
import TopicsList from './workspace/TopicsList.jsx'
import StepNav from './workspace/StepNav.jsx'
import SystemBanner from './workspace/SystemBanner.jsx'
import TeacherChat from './workspace/TeacherChat.jsx'
import { loadCatalogLesson } from './workspace/loadCatalogLesson.js'
import { catalogLessonIdFor } from './live/catalogLessonByUrl.js'
import { stepProgress } from './workspace/practiceGrading.js'
import { knowsFocusTarget } from './live/followFocus.js'

const PAUSE_MINUTES = 5
const MESSAGE_POLL_MS = 5000

/**
 * Ответ приходит строкой: у выбора и пропуска это сам ответ, у сопоставления —
 * JSON-карта {слово: пара}. Разбираем только объекты: строка `"commutes"` —
 * валидный JSON, и слепой JSON.parse превратил бы её ответ в мусор на первом
 * же слове, которое парсер прочтёт числом или ключевым словом («null», «7»).
 */
function parseAnswer(value) {
  if (typeof value !== 'string') return value ?? null
  if (!value.startsWith('{')) return value
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : value
  } catch {
    return value
  }
}

export default function LiveLessonPage({ lessonId, userName, userLevel, token, onNav, onProfile, onBack }) {
  const { t } = useI18n()
  const [lesson, setLesson] = useState(null)
  const [state, setState] = useState('loading') // 'loading' | 'ready' | 'error'
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('lesson') // 'lesson' | 'board'
  const role = roleFromToken(token)
  const selfUserId = userIdFromToken(token)
  const isStaff = canControl(role)
  const { roster, connected } = useLessonPresence(lessonId, token)
  const pollRef = useRef(null)

  // --- Разделы урока ("Маршрут урока") + материал активного раздела -------
  const [sections, setSections] = useState([])
  const [activeSectionId, setActiveSectionId] = useState(null)
  // true пока открытый материал — «догоняющая» копия для follow-me: не
  // восстанавливает свой прогресс и не сохраняет его (см. SectionMaterialFrame).
  const [followMode, setFollowMode] = useState(false)
  // Разобранный урок каталога для активного материала: шаги, темы и задания с
  // ответами. Пока его нет — материал показывается файлом в iframe, как раньше
  // (так открываются и материалы, которые преподаватель загрузил сам).
  const [catalogLesson, setCatalogLesson] = useState(null)
  const [activeStepId, setActiveStepId] = useState(null)
  const [answers, setAnswers] = useState({})
  const [checkedSteps, setCheckedSteps] = useState(() => new Set())
  // Шаг, на котором стоит преподаватель. Приходит только событием focus, поэтому
  // до первого «Внимание на упражнение» бегунка «Т» на треке нет — и это честно:
  // выдумывать ему позицию значило бы показывать ученику неправду.
  const [teacherStepId, setTeacherStepId] = useState(null)
  // Живая трансляция урока, открытого шагами. Здесь лежит то, что делает
  // собеседник: его шаг и — если это ученик — его ответы. Своё состояние
  // (activeStepId/answers) сюда не смешивается: преподаватель волен смотреть
  // другой шаг, и подменять ему экран без спроса нельзя.
  const [peerStepId, setPeerStepId] = useState(null)
  const [peerName, setPeerName] = useState(null)
  const [studentAnswers, setStudentAnswers] = useState({})
  const [studentCheckedSteps, setStudentCheckedSteps] = useState(() => new Set())
  const [reloadToken, setReloadToken] = useState(0)
  // Учитель: true после "Внимание на упражнение" - его дальнейшие действия
  // в материале транслируются студентам, пока он не уйдёт с раздела сам.
  const [presenting, setPresenting] = useState(false)
  const materialFrameRef = useRef(null)

  const activeSection = sections.find((s) => s.id === activeSectionId) || null
  const activeMaterial = activeSection?.materials?.[0] || null
  // Без пикера студента на этот заход: учитель просматривает первого
  // участника занятия (как loadLesson()/selectStudent() по умолчанию в web-admin).
  const reviewStudentId = lesson?.participants?.[0]?.studentId ?? null

  const sectionStatusById = useMemo(() => {
    const map = {}
    sections.forEach((s) => { map[s.id] = s.id === activeSectionId ? 'current' : (s.completed ? 'done' : 'upcoming') })
    return map
  }, [sections, activeSectionId])

  // Ошибку загрузки разделов раньше глотали молча, и любой сбой выглядел как
  // «преподаватель ещё ничего не открыл» — ученик ждал материал, которого не
  // будет. Теперь пустой урок и неудачный запрос — это разные сообщения.
  const [sectionsFailed, setSectionsFailed] = useState(false)

  function loadSections() {
    getLessonSections(token, lessonId).then((list) => {
      setSections(list)
      setSectionsFailed(false)
      setActiveSectionId((prev) => (prev != null && list.some((s) => s.id === prev)) ? prev : (list[0]?.id ?? null))
    }).catch(() => setSectionsFailed(true))
  }

  function selectSection(sectionId) {
    setActiveSectionId(sectionId)
    setFollowMode(false)
    if (isStaff) setPresenting(false)
  }

  // Урок каталога показываем разобранным на шаги, а не файлом в iframe.
  //
  // Структура разбирается один раз при регистрации уровня и лежит на бэкенде;
  // здесь её остаётся забрать. Это и есть разница между «картинкой урока» и
  // уроком: в iframe задания статичны (конвертация превращает их в разметку),
  // а из структуры рендерятся настоящие — с выбором варианта и проверкой.
  //
  // Материал, загруженный преподавателем самим, в каталоге не найдётся — он и
  // дальше открывается файлом, и это правильно: разбирать чужой PDF не во что.
  useEffect(() => {
    let cancelled = false
    const url = activeMaterial?.fileUrl
    // Сброс идёт той же промисной веткой, что и загрузка: setState прямо в теле
    // эффекта запускает каскад рендеров (и на это ругается линтер).
    Promise.resolve(url ? catalogLessonIdFor(url, token) : null)
      .then((id) => (id == null ? null : loadCatalogLesson(id, token)))
      .then((loaded) => {
        if (cancelled) return
        setCatalogLesson(loaded || null)
        setActiveStepId(loaded?.steps?.[0]?.id ?? null)
      })
      .catch(() => { if (!cancelled) setCatalogLesson(null) })
    return () => { cancelled = true }
  }, [activeMaterial?.fileUrl, token])

  // Через useMemo, а не выражением: пустой массив создавался бы заново на каждый
  // рендер и обнулял мемоизацию статусов ниже.
  const lessonSteps = useMemo(() => catalogLesson?.steps || [], [catalogLesson])
  const activeStepIndex = lessonSteps.findIndex((s) => s.id === activeStepId)
  const activeStep = activeStepIndex >= 0 ? lessonSteps[activeStepIndex] : null

  // Статусы шагов урока: текущий — активный, пройденные — до него, остальные
  // считаются пройденными только если их задания уже отвечены верно.
  const stepStatusById = useMemo(() => {
    const map = {}
    lessonSteps.forEach((step, i) => {
      if (step.id === activeStepId) map[step.id] = 'current'
      else if (i < activeStepIndex) map[step.id] = 'done'
      else map[step.id] = stepProgress([step], answers).done === 1 ? 'done' : 'locked'
    })
    return map
  }, [lessonSteps, activeStepId, activeStepIndex, answers])

  // Маршрут урока — один список на два потребителя: карточку слева и кнопки
  // «Назад/Далее» под заданием. Раньше он собирался прямо в разметке, и добавить
  // второй способ переходить по шагам значило бы продублировать выбор ветки
  // (шаги урока или разделы занятия) — вместе с шансом, что они разъедутся.
  //
  // Шаги внутри урока (разминка, слова, правило, практика) — это то, что видит
  // ученик, когда материал разобран; разделами занятия маршрут остаётся, только
  // если материал не из каталога и разбирать нечего. Нумеруем по месту в списке:
  // position из базы считается с нуля («ШАГ 00»).
  const onLessonSteps = lessonSteps.length > 0
  const routeSteps = useMemo(
    () => (onLessonSteps ? lessonSteps : sections.map((s, i) => ({ id: s.id, order: i + 1, title: s.title }))),
    [onLessonSteps, lessonSteps, sections]
  )
  const routeActiveId = onLessonSteps ? activeStepId : activeSectionId
  const selectRouteStep = onLessonSteps ? setActiveStepId : selectSection

  // Ученик и преподаватель на треке. Смотрю на свой шаг всегда; собеседник —
  // там, куда его поставила трансляция, и пока он ничего не прислал, бегунка
  // нет: выдумывать ему позицию значило бы показывать неправду.
  const studentStepId = isStaff ? peerStepId : activeStepId
  const lessonTeacherStepId = isStaff ? activeStepId : peerStepId

  function handleAnswer(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    // Ответ уходит собеседнику сразу, а не по «Проверить»: преподаватель должен
    // видеть, что ученик печатает и выбирает, пока тот это делает — иначе помощь
    // приходит уже к готовому ответу. Значение сериализуем: у match это карта.
    sendStepProgress({
      stepId: activeStepId,
      questionId,
      value: typeof value === 'string' ? value : JSON.stringify(value),
    })
  }

  function handleCheckStep() {
    setCheckedSteps((prev) => {
      if (prev.has(activeStepId)) return prev
      const next = new Set(prev)
      next.add(activeStepId)
      return next
    })
    sendStepProgress({ stepId: activeStepId, checked: true })
  }

  // --- Ссылка на видеозвонок (учитель может вписать/поменять) -------------
  const [editingMeetingUrl, setEditingMeetingUrl] = useState(false)
  const [meetingUrlDraft, setMeetingUrlDraft] = useState('')

  function openMeetingUrlEditor() {
    setMeetingUrlDraft(lesson?.meetingUrl || '')
    setEditingMeetingUrl(true)
  }

  function saveMeetingUrl() {
    const url = meetingUrlDraft.trim()
    setLessonMeetingUrl(token, lessonId, url || null).then((updated) => {
      if (updated) setLesson(updated)
      setEditingMeetingUrl(false)
    }).catch(() => {})
  }

  // --- Чат с учителем (поллинг, как в web-admin) --------------------------
  const [messages, setMessages] = useState([])
  const chatMessages = messages.map((m) => {
    const isTeacher = m.senderUserId === lesson?.teacherId
    return {
      id: m.id,
      from: isTeacher ? 'teacher' : 'student',
      text: m.body,
      // Своё сообщение подписываем как «Вы» (см. TeacherChat) — реальное имя
      // нужно только для входящих, иначе легко перепутать, кто пишет.
      senderName: isTeacher ? m.senderName : undefined,
    }
  })

  function refreshMessages() {
    getLessonMessages(token, lessonId).then(setMessages).catch(() => {})
  }

  function handleSendMessage(text) {
    sendLessonMessage(token, lessonId, text).then(setMessages).catch(() => {})
  }

  // --- Живая синхронизация (follow-me + зеркалирование) -------------------
  const { sendFocus, sendMirror, sendPresent, sendStepProgress } = useLessonLiveSocket(lessonId, token, selfUserId, {
    onFocus: (evt) => {
      if (evt.sectionId == null) return
      // Где стоит преподаватель — знает только это событие, и знать это стоит
      // обоим: по спеке классрума на треке два бегунка, и они расходятся, когда
      // преподаватель уходит на шаг вперёд или назад. Пишем до проверки роли —
      // иначе у него самого бегунок «Т» стоял бы на первом шаге вечно.
      setTeacherStepId(evt.sectionId)
      if (isStaff) return
      // Учитель мог прикрепить урок из каталога уже после того, как ученик
      // открыл занятие: раздел и материал из события тогда ученику незнакомы,
      // и переключаться было бы не на что. Перечитываем разделы — иначе он
      // молча остаётся на прежнем уроке.
      if (!knowsFocusTarget(sections, evt)) loadSections()
      setActiveSectionId(evt.sectionId)
      setFollowMode(true)
      setReloadToken((n) => n + 1)
    },
    onPresent: (evt) => {
      if (isStaff || evt.materialId !== activeMaterial?.materialId) return
      materialFrameRef.current?.replay(evt.events)
    },
    onSectionsChanged: loadSections,
    // Учительский канал шагов слушает только преподаватель (см. хук).
    isStaff,
    // Урок, открытый шагами: что делает собеседник прямо сейчас.
    //
    // Событие описывает ровно одно действие, поэтому каждое поле проверяем
    // отдельно: переход по шагу приходит без ответа, ответ — без «Проверить».
    // Записывать их скопом значило бы стирать ответ при каждом переходе.
    onStepProgress: (evt) => {
      if (evt.senderName) setPeerName(evt.senderName)
      if (evt.stepId != null) setPeerStepId(evt.stepId)
      // Ответы бывают только ученические: преподаватель за ученика не отвечает
      // (см. readOnly в ChoiceQuestion), и «ответ преподавателя» означал бы,
      // что где-то разъехались роли.
      if (evt.senderRole !== 'STUDENT') return
      if (evt.questionId != null) {
        setStudentAnswers((prev) => ({ ...prev, [evt.questionId]: parseAnswer(evt.value) }))
      }
      if (evt.checked && evt.stepId != null) {
        setStudentCheckedSteps((prev) => {
          if (prev.has(evt.stepId)) return prev
          const next = new Set(prev)
          next.add(evt.stepId)
          return next
        })
      }
    },
  })

  // Свой шаг уходит собеседнику при каждом переходе — так на треке появляются
  // оба бегунка. Раньше позиция преподавателя приходила только событием focus,
  // а оно несёт id раздела занятия: на маршруте из шагов урока ему не с чем
  // совпасть, и «Т» там не появлялся никогда.
  //
  // Эффект стоит именно здесь, ниже useLessonLiveSocket: sendStepProgress —
  // const из его результата, и упоминание в списке зависимостей выше по файлу
  // читается на рендере, до инициализации (уже ловили ReferenceError).
  useEffect(() => {
    if (!onLessonSteps || !activeStepId) return
    sendStepProgress({ stepId: activeStepId })
  }, [onLessonSteps, activeStepId, sendStepProgress])

  function handleBridgeMirror(event) {
    if (!activeMaterial) return
    sendMirror(activeMaterial.materialId, event)
  }

  function handleBridgePresentEvent(events) {
    if (!activeMaterial) return
    sendPresent(activeMaterial.materialId, events)
  }

  function handleFocusClick() {
    if (!activeSectionId) return
    sendFocus(activeSectionId, activeMaterial?.materialId ?? null)
    // Своё эхо брокера сокет глушит, поэтому onFocus здесь не сработает —
    // бегунок «Т» ставим сразу, иначе преподаватель не увидит себя на треке.
    setTeacherStepId(activeSectionId)
    setPresenting(true)
  }

  function nameFor(userId) {
    if (userId === selfUserId) return t('live.roster.you')
    if (lesson?.teacherId === userId) return lesson.teacherName || `#${userId}`
    const p = lesson?.participants?.find((x) => x.studentId === userId)
    if (p) return p.studentName || `#${userId}`
    return `#${userId}`
  }

  function load() {
    return getLessonById(token, lessonId)
      .then((data) => { setLesson(data); setState('ready') })
      .catch(() => setState('error'))
  }

  useEffect(() => {
    if (!lessonId || !token) return undefined
    load()
    // No STOMP status topic exists; a student polls so "teacher started" appears on its own.
    if (!isStaff) {
      pollRef.current = setInterval(() => {
        getLessonById(token, lessonId).then((d) => { setLesson(d); setState('ready') }).catch(() => {})
      }, 5000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, token, isStaff])

  useEffect(() => {
    if (!lessonId || !token) return undefined
    loadSections()
    refreshMessages()
    const handle = setInterval(refreshMessages, MESSAGE_POLL_MS)
    return () => clearInterval(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, token])

  async function act(fn) {
    setBusy(true)
    try { const updated = await fn(token, lessonId); if (updated) setLesson(updated); else await load() }
    catch { /* keep current lesson; surface via reload */ await load() }
    finally { setBusy(false) }
  }

  const status = lesson?.status
  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="lessons" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="live live--wide">
        <button className="live__back" onClick={onBack}>← {t('schedule.back')}</button>

        {state === 'loading' && <p className="live__status-msg">{t('schedule.loading')}</p>}
        {state === 'error' && <p className="live__status-msg">{t('live.loadError')}</p>}

        {state === 'ready' && lesson && (
          <>
            <div className="live__head">
              <h1 className="live__title">{t('live.title')}</h1>
              <span className="live__teacher">{lesson.teacherName || ''}</span>
              <LiveStatusBadge status={status} />
              {/* Кто в классе — здесь же, строкой. Отдельной карточкой во всю
                  ширину это отодвигало материал урока ниже первого экрана. */}
              <PresenceRoster roster={roster} connected={connected} nameFor={nameFor} />
            </div>

            {!isStaff && status === 'SCHEDULED' && <p className="live__status-msg">{t('live.waiting')}</p>}

            {isStaff && (
              <TeacherControls
                status={status}
                busy={busy}
                onStart={() => act(startLiveLesson)}
                onPause={() => act((tk, id) => pauseLiveLesson(tk, id, PAUSE_MINUTES))}
                onResume={() => act(resumeLiveLesson)}
                onComplete={() => act(completeLiveLesson)}
              />
            )}

            {(status === 'IN_PROGRESS' || status === 'PAUSED') && (
              <>
                <div className="ls__tabs">
                  <button className={`ls-tab ${tab === 'lesson' ? 'ls-tab--active' : ''}`} onClick={() => setTab('lesson')}>
                    {t('lesson.ws.tabLesson')}
                  </button>
                  <button className={`ls-tab ${tab === 'board' ? 'ls-tab--active' : ''}`} onClick={() => setTab('board')}>
                    {t('lesson.ws.tabBoard')}
                  </button>
                </div>

                {tab === 'lesson' && (
                  <div className="lw-live-body">
                    <div className="lw-live-route">
                      {sections.length === 0 ? (
                        <p className={`live__status-msg ${sectionsFailed ? 'live__status-msg--error' : ''}`}>
                          {t(sectionsFailed ? 'lesson.ws.sectionsFailed' : 'lesson.ws.noSections')}
                        </p>
                      ) : (
                        <LessonRoute
                          steps={routeSteps}
                          activeStepId={routeActiveId}
                          statusById={onLessonSteps ? stepStatusById : sectionStatusById}
                          onSelect={selectRouteStep}
                          {...(onLessonSteps
                            // На шагах урока позиции обоих приходят трансляцией
                            // step-progress; на разделах занятия — событием focus,
                            // и там известен только преподаватель.
                            ? { studentStepId, teacherStepId: lessonTeacherStepId }
                            : { teacherStepId })}
                        />
                      )}
                    </div>

                    <div className="lw-live-main">
                      {isStaff && (
                        <button className="lw-focus-btn" disabled={!activeSectionId} onClick={handleFocusClick}>
                          {t('lesson.ws.focus')}
                        </button>
                      )}
                      {activeStep ? (
                        <>
                          {/* Ученик ушёл на другой шаг — преподаватель об этом
                              узнаёт, а не догадывается по бегунку на треке. */}
                          {isStaff && peerStepId && peerStepId !== activeStepId && (
                            <SystemBanner
                              tone="attention"
                              text={t('live.peerOnStep', {
                                name: peerName || t('live.roster.student'),
                                title: lessonSteps.find((s) => s.id === peerStepId)?.title || '',
                              })}
                              actionLabel={t('live.peerGo')}
                              onAction={() => setActiveStepId(peerStepId)}
                            />
                          )}
                          <LessonContent
                            step={activeStep}
                            // Преподаватель смотрит работу ученика, ученик — свою.
                            answers={isStaff ? studentAnswers : answers}
                            checked={isStaff ? studentCheckedSteps.has(activeStepId) : checkedSteps.has(activeStepId)}
                            onAnswer={handleAnswer}
                            onCheck={handleCheckStep}
                            readOnly={isStaff}
                          />
                        </>
                      ) : (
                        <SectionMaterialFrame
                          ref={materialFrameRef}
                          lessonId={lessonId}
                          token={token}
                          material={activeMaterial}
                          isStaff={isStaff}
                          reviewStudentId={reviewStudentId}
                          follow={followMode}
                          reloadToken={reloadToken}
                          presenting={presenting}
                          onMirror={handleBridgeMirror}
                          onPresentEvent={handleBridgePresentEvent}
                        />
                      )}

                      {/* Урок проходится кнопками под заданием, а не только
                          кликом по маршруту сбоку — см. StepNav. */}
                      <StepNav steps={routeSteps} activeStepId={routeActiveId} onSelect={selectRouteStep} />
                    </div>

                    <div className="lw-live-aside">
                      <div className="lw-card lw-meet">
                        {editingMeetingUrl ? (
                          <div className="lw-meet__form">
                            <input
                              className="lw-meet__input"
                              value={meetingUrlDraft}
                              onChange={(e) => setMeetingUrlDraft(e.target.value)}
                              placeholder={t('lesson.ws.meetPlaceholder')}
                              autoFocus
                            />
                            <div className="lw-meet__form-actions">
                              <button className="lw-meet__save" onClick={saveMeetingUrl}>{t('lesson.ws.meetSave')}</button>
                              <button className="lw-meet__cancel" onClick={() => setEditingMeetingUrl(false)}>{t('lesson.ws.meetCancel')}</button>
                            </div>
                          </div>
                        ) : lesson.meetingUrl ? (
                          <>
                            {/* Свёрнутый звонок по спеке §5.1(B): плоская
                                карточка-CTA, а не строка-ссылка — для ученика
                                это главное действие в правой колонке. */}
                            <a className="lw-meet__link" href={lesson.meetingUrl} target="_blank" rel="noreferrer">
                              <svg className="lw-meet__icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                                <path
                                  fill="currentColor"
                                  d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.3 2.2Z"
                                />
                              </svg>
                              {t('lesson.ws.call')}
                            </a>
                            {isStaff && (
                              <button className="lw-meet__edit-btn" onClick={openMeetingUrlEditor}>{t('lesson.ws.meetEdit')}</button>
                            )}
                          </>
                        ) : isStaff ? (
                          <button className="lw-meet__edit-btn" onClick={openMeetingUrlEditor}>{t('lesson.ws.meetAdd')}</button>
                        ) : (
                          // Ученику нечего нажимать, пока учитель не дал ссылку: писать
                          // «Позвонить учителю» здесь — обещание кнопки, которой нет.
                          <p className="lw-meet__empty">{t('lesson.ws.callNoLink')}</p>
                        )}
                      </div>
                      {catalogLesson?.topics?.length > 0 && (
                        <TopicsList topics={catalogLesson.topics} activeTopicId={activeStep?.topicId} />
                      )}
                      <TeacherChat messages={chatMessages} onSend={handleSendMessage} />
                    </div>
                  </div>
                )}

                {tab === 'board' && (
                  <LiveBoard lessonId={lessonId} token={token} selfUserId={selfUserId} isStaff={isStaff} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </LearningLayout>
  )
}
