import { useEffect, useMemo, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import {
  getLessonById, startLiveLesson, pauseLiveLesson, resumeLiveLesson, completeLiveLesson,
  getLessonSections, getLessonMessages, sendLessonMessage, setLessonMeetingUrl,
  getLessonMaterialProgress, saveLessonMaterialProgress,
} from '../api.js'
import { serializeStepProgress, parseStepProgress } from './workspace/stepProgress.js'
import { roleFromToken, userIdFromToken } from '../lib/jwt.js'
import { canControl } from './live/liveStatus.js'
import { useLessonPresence } from './live/useLessonPresence.js'
import { useLessonLiveSocket } from './live/useLessonLiveSocket.js'
import { setAudioReporter, playBroadcastAudio, stopBroadcastAudio } from './live/audioReport.js'
import { useActiveQuestionTracker } from './live/useActiveQuestionTracker.js'
import LiveStatusBadge from './live/LiveStatusBadge.jsx'
import PresenceRoster from './live/PresenceRoster.jsx'
import StudentReviewPicker from './live/StudentReviewPicker.jsx'
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
import { materialView } from './workspace/materialView.js'
import { knowsFocusTarget } from './live/followFocus.js'

const PAUSE_MINUTES = 5
const MESSAGE_POLL_MS = 5000

/**
 * Ответ приходит строкой: у выбора и пропуска это сам ответ, у сопоставления —
 * JSON-карта {слово: пара}, у множественного выбора — JSON-массив [опция, ...].
 * Разбираем только объекты и массивы: строка `"commutes"` — валидный JSON, и
 * слепой JSON.parse превратил бы её ответ в мусор на первом же слове, которое
 * парсер прочтёт числом или ключевым словом («null», «7»).
 */
function parseAnswer(value) {
  if (typeof value !== 'string') return value ?? null
  if (!value.startsWith('{') && !value.startsWith('[')) return value
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
  const onlineUserIds = useMemo(() => new Set(roster.map((p) => p.userId)), [roster])
  const pollRef = useRef(null)

  // --- Разделы урока ("Маршрут урока") + материал активного раздела -------
  const [sections, setSections] = useState([])
  const [activeSectionId, setActiveSectionId] = useState(null)
  // true пока открытый материал — «догоняющая» копия для follow-me: не
  // восстанавливает свой прогресс и не сохраняет его (см. SectionMaterialFrame).
  const [followMode, setFollowMode] = useState(false)
  const followModeRef = useRef(false)
  // Разобранный урок каталога для активного материала: шаги, темы и задания с
  // ответами. Пока его нет — материал показывается файлом в iframe, как раньше
  // (так открываются и материалы, которые преподаватель загрузил сам).
  const [catalogLesson, setCatalogLesson] = useState(null)
  const [resolvedCatalogLessonId, setResolvedCatalogLessonId] = useState(null)
  const [activeStepId, setActiveStepId] = useState(null)
  const [answers, setAnswers] = useState({})
  // Несмотря на название — не id шагов, а составные ключи practice-карточек
  // (`practiceBlockKey` в LessonContent): один шаг урока несёт по несколько
  // независимых упражнений подряд, и «Проверить» должно снимать блокировку
  // только с того, где нажали. Имя не переименовано, чтобы не разъезжаться с
  // полем `checked` в сохранённом прогрессе (stepProgress.js) — формат тот же
  // массив строк, просто теперь не голые id шагов.
  const [checkedSteps, setCheckedSteps] = useState(() => new Set())
  // Шаг, на котором стоит преподаватель. Приходит только событием focus, поэтому
  // до первого «Внимание на упражнение» бегунка «Т» на треке нет — и это честно:
  // выдумывать ему позицию значило бы показывать ученику неправду.
  const [teacherStepId, setTeacherStepId] = useState(null)
  const [focusTargetId, setFocusTargetId] = useState(null)
  const [focusNonce, setFocusNonce] = useState(0)
  // Живая трансляция урока, открытого шагами. peerStepId/peerName — позиция
  // ЕДИНСТВЕННОГО учителя, как её видит студент (своё состояние —
  // activeStepId/answers — сюда не смешивается: преподаватель волен смотреть
  // другой шаг, и подменять ему экран без спроса нельзя).
  const [peerStepId, setPeerStepId] = useState(null)
  const [peerName, setPeerName] = useState(null)
  // Групповой урок — несколько студентов шлют прогресс одновременно. Карта по
  // studentId, а не одно значение на всё занятие: иначе просмотр одного
  // ученика стирал бы то, что уже прислал другой, пока на него не смотрели
  // (см. onStepProgress ниже и StudentReviewPicker).
  const [studentLiveState, setStudentLiveState] = useState({})
  const [reloadToken, setReloadToken] = useState(0)
  // Учитель: true после "Внимание на упражнение" - его дальнейшие действия
  // в материале транслируются студентам, пока он не уйдёт с раздела сам.
  const [presenting, setPresenting] = useState(false)
  const materialFrameRef = useRef(null)
  // Present events that arrived before the follow iframe mounted / finished
  // loading (same race web-admin solves with pendingPresent).
  const pendingPresentRef = useRef([])
  // Focus can name a catalog step before that lesson's JSON has loaded; catalog
  // resolve used to always reset to steps[0] and wipe the teacher's target.
  const pendingFocusStepRef = useRef(null)
  // Race: switching materials, `onLessonSteps` below still reads the PREVIOUS
  // material's (non-empty) steps during the async gap before the new catalog
  // lesson resolves — so the progress-restore effect can fire and land its
  // saved stepId *before* the catalog-resolve effect below runs and defaults
  // to steps[0], clobbering it right back to the start. This records what
  // restore last set, keyed by material, so catalog-resolve can defer to it
  // instead of blindly overwriting — see both effects below.
  const restoredStepRef = useRef({ materialId: null, stepId: null })

  const activeSection = sections.find((s) => s.id === activeSectionId) || null
  // К разделу можно прикрепить несколько материалов, и до сих пор ученик видел
  // только первый: остальные существовали в базе и не открывались ничем. В
  // web-admin для этого есть вкладки, здесь их не было.
  const sectionMaterials = activeSection?.materials || []
  const [activeMaterialId, setActiveMaterialId] = useState(null)
  const activeMaterial = sectionMaterials.find((m) => m.materialId === activeMaterialId) || sectionMaterials[0] || null
  // Кого из участников смотрит преподаватель — выбирается через
  // StudentReviewPicker (несколько студентов в групповом уроке), по умолчанию
  // первый участник занятия, как и раньше (loadLesson()/selectStudent() в
  // web-admin делают то же самое по умолчанию).
  const [reviewStudentId, setReviewStudentId] = useState(null)
  useEffect(() => {
    if (reviewStudentId == null && lesson?.participants?.length) {
      setReviewStudentId(lesson.participants[0].studentId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.participants])
  // Срез studentLiveState именно для того, кого сейчас смотрит преподаватель —
  // остальные студенты продолжают накапливаться в фоне (см. onStepProgress).
  const reviewState = reviewStudentId != null ? studentLiveState[reviewStudentId] : null
  const reviewStepId = reviewState?.stepId ?? null
  const reviewPeerName = reviewState?.name ?? null
  const reviewAnswers = reviewState?.answers ?? {}
  const reviewCheckedSteps = reviewState?.checkedSteps ?? new Set()
  const reviewLiveQuestionId = reviewState?.liveQuestionId ?? null

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
    return getLessonSections(token, lessonId).then((list) => {
      setSections(list)
      setSectionsFailed(false)
      setActiveSectionId((prev) => (prev != null && list.some((s) => String(s.id) === String(prev))) ? prev : (list[0]?.id ?? null))
      return list
    }).catch(() => {
      setSectionsFailed(true)
      return null
    })
  }

  function selectSection(sectionId) {
    setActiveSectionId(sectionId)
    // Материал выбирается заново: id из прошлого раздела в новом не найдётся,
    // и без сброса первый рендер сваливался бы на «первый по списку» молча.
    setActiveMaterialId(null)
    setFollowMode(false)
    followModeRef.current = false
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
  // Пока не ответили, урок это или файл, не открываем ни того, ни другого.
  //
  // Раньше на это время рендерился iframe — и он не просто мигал: бэкенд вшивает
  // в отрендеренный материал бридж, а тот сохраняет свой поток событий по ключу
  // (урок, материал, ученик). Тому же ключу принадлежат ответы урока из шагов,
  // так что мелькнувший iframe успевал записать поверх них пустой список.
  // Держим url, а не флаг: сброс флага — setState в теле эффекта, то есть каскад
  // рендеров, на который ругается линтер.
  const [catalogResolvedFor, setCatalogResolvedFor] = useState(null)
  const materialFileUrl = activeMaterial?.fileUrl || null
  const catalogResolved = materialFileUrl != null && catalogResolvedFor === materialFileUrl

  useEffect(() => {
    let cancelled = false
    const url = materialFileUrl
    // Сброс идёт той же промисной веткой, что и загрузка: setState прямо в теле
    // эффекта запускает каскад рендеров (и на это ругается линтер).
    Promise.resolve(url ? catalogLessonIdFor(url, token) : null)
      .then((id) =>
        id == null
          ? Promise.resolve({ id: null, loaded: null })
          : loadCatalogLesson(id, token).then((loaded) => ({ id, loaded })),
      )
      .then(({ id, loaded }) => {
        if (cancelled) return
        setResolvedCatalogLessonId(id)
        setCatalogLesson(loaded || null)
        const forced = pendingFocusStepRef.current
        pendingFocusStepRef.current = null
        const restored = restoredStepRef.current
        if (forced != null && (loaded?.steps || []).some((s) => String(s.id) === String(forced))) {
          setActiveStepId(forced)
        } else if (restored.materialId === activeMaterial?.materialId && restored.stepId != null) {
          // Progress-restore already landed the real step for this exact
          // material while this fetch was in flight — don't stomp it back
          // to the beginning. Consume it once: a later re-resolve for the
          // same material (e.g. a forced reload) shouldn't re-apply a now-
          // stale step over wherever the student has since navigated to.
          restoredStepRef.current = { materialId: null, stepId: null }
          setActiveStepId(restored.stepId)
        } else {
          setActiveStepId(loaded?.steps?.[0]?.id ?? null)
        }
        setCatalogResolvedFor(url)
      })
      .catch(() => {
        if (cancelled) return
        setResolvedCatalogLessonId(null)
        setCatalogLesson(null)
        setCatalogResolvedFor(url)
      })
    return () => { cancelled = true }
  }, [materialFileUrl, token])

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
  const selectRouteStep = onLessonSteps ? selectLessonStep : selectSection

  // Позиция сохраняется вместе с ответами: вернувшись, ученик продолжает там,
  // где остановился, а не с первого шага.
  function selectLessonStep(stepId) {
    setActiveStepId(stepId)
    persistProgress({ answers, checkedSteps, stepId })
  }

  // Ученик и преподаватель на треке. Смотрю на свой шаг всегда; собеседник —
  // там, куда его поставила трансляция, и пока он ничего не прислал, бегунка
  // нет: выдумывать ему позицию значило бы показывать неправду.
  const studentStepId = isStaff ? reviewStepId : activeStepId
  const lessonTeacherStepId = isStaff ? activeStepId : peerStepId

  function handleAnswer(questionId, value) {
    const next = { ...answers, [questionId]: value }
    setAnswers(next)
    persistProgress({ answers: next, checkedSteps, stepId: activeStepId })
    // Ответ уходит собеседнику сразу, а не по «Проверить»: преподаватель должен
    // видеть, что ученик печатает и выбирает, пока тот это делает — иначе помощь
    // приходит уже к готовому ответу. Значение сериализуем: у match это карта.
    sendStepProgress({
      stepId: activeStepId,
      questionId,
      value: typeof value === 'string' ? value : JSON.stringify(value),
      sectionId: activeSectionId,
      materialId: activeMaterial?.materialId ?? null,
    })
  }

  // `key` — составной ключ конкретной practice-карточки (LessonContent
  // передаёт его в onCheck), а не id шага: см. комментарий у checkedSteps.
  function handleCheckStep(key, questionIds = []) {
    const next = new Set(checkedSteps)
    next.add(key)
    questionIds.forEach((id) => next.add(id))
    setCheckedSteps(next)
    persistProgress({ answers, checkedSteps: next, stepId: activeStepId })
    sendStepProgress({
      stepId: activeStepId,
      checked: true,
      checkedKey: key,
      sectionId: activeSectionId,
      materialId: activeMaterial?.materialId ?? null,
    })
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
  const [chatSending, setChatSending] = useState(false)
  const chatMessages = messages.map((m) => {
    const mine = m.senderUserId === selfUserId
    const isTeacherMsg = m.senderUserId === lesson?.teacherId
    return {
      id: m.id,
      // `student` = свой пузырь справа (имя класса из дизайн-спеки)
      from: mine ? 'student' : 'teacher',
      text: m.body,
      senderName: mine
        ? undefined
        : (m.senderName || (isTeacherMsg ? undefined : m.senderName)),
    }
  })

  function refreshMessages() {
    getLessonMessages(token, lessonId).then(setMessages).catch(() => {})
  }

  function handleSendMessage(text) {
    const trimmed = String(text || '').trim()
    if (!trimmed || chatSending) return
    // Оптимистично — чат не должен ждать раунд-трип, чтобы казаться «живым».
    const tempId = `local-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: tempId, body: trimmed, senderUserId: selfUserId, senderName: null },
    ])
    setChatSending(true)
    sendLessonMessage(token, lessonId, trimmed)
      .then((list) => setMessages(list))
      .catch(() => refreshMessages())
      .finally(() => setChatSending(false))
  }

  function applyTeacherPointer(evt) {
    setTab('lesson')
    followModeRef.current = true
    setFollowMode(true)
    if (evt.sectionId != null) setActiveSectionId(evt.sectionId)
    if (evt.materialId != null) setActiveMaterialId(evt.materialId)
    if (evt.stepId != null) {
      pendingFocusStepRef.current = evt.stepId
      setActiveStepId(evt.stepId)
    }
    const qid = evt.questionId != null && String(evt.questionId) !== ''
      ? String(evt.questionId)
      : (evt.stepId != null ? 'block-0' : null)
    if (qid != null) setFocusTargetId(qid)
    setFocusNonce((n) => n + 1)
  }

  // --- Живая синхронизация (follow-me + зеркалирование) -------------------
  const { sendFocus, sendMirror, sendPresent, sendStepProgress, sendAudio } = useLessonLiveSocket(lessonId, token, selfUserId, {
    // Учитель нажал «Транслировать классу» — играем у себя тем же каналом,
    // которым уже следуем за самим учителем (focus/present).
    onAudioBroadcast: (evt) => playBroadcastAudio(evt),
    onFocus: (evt) => {
      if (evt.sectionId == null) return
      // На шагах урока бегунок «Т» = stepId; на разделах занятия = sectionId.
      setTeacherStepId(evt.stepId ?? evt.sectionId)
      if (isStaff) return
      const run = () => {
        applyTeacherPointer(evt)
        // iframe catch-up только для HTML-материала. На шагах каталога
        // reloadToken только лишний ре-рендер LessonContent.
        if (evt.stepId == null) setReloadToken((n) => n + 1)
      }
      if (!knowsFocusTarget(sections, evt)) {
        loadSections().then((list) => { if (list) run() })
        return
      }
      run()
    },
    onPresent: (evt) => {
      if (isStaff) return
      const events = evt.events || []
      if (!events.length) return
      // Material may still be switching after focus — buffer until iframe can replay.
      if (evt.materialId !== activeMaterial?.materialId || !materialFrameRef.current) {
        pendingPresentRef.current.push(...events)
        return
      }
      materialFrameRef.current.replay(events)
    },
    // Teacher only: a student's click/input/change/scroll inside the material they're
    // both looking at — replay it into the teacher's own iframe so it stays a live
    // mirror, not just a snapshot from when the page loaded. No pending-buffer here
    // (unlike onPresent above): a stale mirror event replayed after a late reload
    // would show a position the student has already moved past.
    onMirror: (evt) => {
      if (!isStaff) return
      if (evt.materialId !== activeMaterial?.materialId) return
      if (reviewStudentId != null && evt.studentId != null && evt.studentId !== reviewStudentId) return
      materialFrameRef.current?.mirror?.(evt)
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
      // Единственный собеседник у студента — учитель, здесь без карты: просто
      // «где сейчас преподаватель».
      if (evt.senderName) setPeerName(evt.senderName)
      if (evt.stepId != null) setPeerStepId(evt.stepId)
      // «Внимание на упражнение» включает followMode один раз (см. onFocus), но
      // без этого студента переносило бы только на первый шаг — дальше
      // преподаватель продолжает идти по уроку, а бегунок «Т» просто едет мимо
      // застывшего экрана. Пока следование включено, каждый следующий шаг
      // преподавателя переносит и сюда — до тех пор, пока студент сам не
      // сменит раздел (см. selectSection, где followMode гасится).
      if (!isStaff && evt.senderRole !== 'STUDENT' && (evt.stepId != null || evt.questionId != null)) {
        applyTeacherPointer(evt)
      }
      // Ответы бывают только ученические: преподаватель за ученика не отвечает
      // (см. readOnly в ChoiceQuestion), и «ответ преподавателя» означал бы,
      // что где-то разъехались роли.
      if (evt.senderRole !== 'STUDENT' || evt.senderUserId == null) return
      // Групповой урок — событие может прийти от ЛЮБОГО студента, не только
      // от того, кого сейчас просматривает преподаватель: пишем в его личную
      // ячейку карты, а не поверх чужой (см. studentLiveState выше).
      const studentId = evt.senderUserId
      setStudentLiveState((prev) => {
        const cur = prev[studentId] || { stepId: null, name: null, answers: {}, checkedSteps: new Set(), liveQuestionId: null }
        const next = { ...cur }
        if (evt.senderName) next.name = evt.senderName
        if (evt.stepId != null) next.stepId = evt.stepId
        // «Стою на вопросе X» и «ответил на вопрос X» — разные события с одним
        // и тем же questionId (см. handleQuestionView/handleAnswer): первое
        // приходит без value вовсе, и писать его в answers затёрло бы уже
        // данный ответ пустотой, стоило ученику просто прокрутить назад.
        if (evt.questionId != null) {
          next.liveQuestionId = evt.questionId
          if (evt.value != null) next.answers = { ...cur.answers, [evt.questionId]: parseAnswer(evt.value) }
        }
        if (evt.checked && evt.checkedKey != null && !cur.checkedSteps.has(evt.checkedKey)) {
          const checkedNext = new Set(cur.checkedSteps)
          checkedNext.add(evt.checkedKey)
          next.checkedSteps = checkedNext
        }
        return { ...prev, [studentId]: next }
      })
    },
    // Учитель переписал мой ответ (web-admin: catalog-step-review). handleAnswer уже
    // умеет и обновить экран, и сохранить в material_progress, и переотправить
    // учителю — поправка возвращается в его ленту step-progress тем же путём, что
    // и обычный ответ, поэтому отдельного эха сюда добавлять не нужно.
    onAnswerCorrection: (evt) => {
      if (isStaff || evt.questionId == null) return
      handleAnswer(evt.questionId, parseAnswer(evt.value))
    },
    // Учитель сбросил мои ответы на шаге (кнопка «Сбросить ответы на этом шаге» в
    // web-admin) — очищаем ровно те вопросы/карточки, что он видел на экране, и
    // сохраняем сразу: иначе первый же мой клик где угодно на уроке заново
    // отправил бы старый снимок answers/checkedSteps и незаметно откатил сброс.
    onAnswerReset: (evt) => {
      if (isStaff) return
      const questionIds = evt.questionIds || []
      const checkedKeys = evt.checkedKeys || []
      const nextAnswers = { ...answers }
      questionIds.forEach((id) => { delete nextAnswers[id] })
      const nextChecked = new Set(checkedSteps)
      questionIds.forEach((id) => nextChecked.delete(id))
      checkedKeys.forEach((key) => nextChecked.delete(key))
      setAnswers(nextAnswers)
      setCheckedSteps(nextChecked)
      persistProgress({ answers: nextAnswers, checkedSteps: nextChecked, stepId: activeStepId })
    },
  })

  // Ученик проскроллил/перешёл к вопросу, но ещё не обязательно ответил —
  // отдельное от handleAnswer событие (см. onStepProgress выше: value там нет
  // нарочно, чтобы не затирать уже данный ответ). useActiveQuestionTracker сам
  // не шлёт повторно один и тот же questionId, здесь дедуп не нужен.
  function handleQuestionView(questionId) {
    sendStepProgress({
      stepId: activeStepId,
      questionId,
      sectionId: activeSectionId,
      materialId: activeMaterial?.materialId ?? null,
    })
  }

  // Только у настоящего ученика на своём документе (не у преподавателя,
  // который смотрит тот же LessonContent readOnly'ем — иначе его собственный
  // скролл транслировался бы как будто это чужая позиция).
  const lessonContentRef = useRef(null)
  useActiveQuestionTracker(lessonContentRef, handleQuestionView, !isStaff && onLessonSteps)

  // --- сохранение работы ученика ------------------------------------------
  //
  // Живая трансляция несёт только дельту, и этого мало в двух местах: ученик
  // после F5 терял всё, а преподаватель, открывший урок позже, видел лишь то,
  // что ученик ответил при нём. Долговечная копия лежит в material_progress —
  // том же, куда пишет бридж iframe'а (см. stepProgress.js).
  const stepMaterialId = onLessonSteps ? activeMaterial?.materialId : null

  // Пока не прочитали сохранённое — не пишем: пустое состояние на старте
  // затёрло бы работу прошлой сессии. Храним id материала, а не флаг: сброс
  // флага пришлось бы делать setState прямо в теле эффекта, а это каскад
  // рендеров (на него же ругается линтер).
  const [progressLoadedFor, setProgressLoadedFor] = useState(null)
  const progressLoaded = stepMaterialId != null && progressLoadedFor === stepMaterialId

  useEffect(() => {
    if (!stepMaterialId) return undefined
    let cancelled = false
    // Преподаватель читает работу участника, ученик — свою (сервер и так не
    // отдаст чужую, см. assertAccess).
    getLessonMaterialProgress(token, lessonId, stepMaterialId, isStaff ? reviewStudentId : undefined)
      .then((saved) => {
        if (cancelled) return
        const restored = parseStepProgress(saved?.eventsJson)
        if (restored) {
          if (isStaff) {
            if (reviewStudentId != null) {
              setStudentLiveState((prev) => {
                const cur = prev[reviewStudentId] || { stepId: null, name: null, answers: {}, checkedSteps: new Set(), liveQuestionId: null }
                return {
                  ...prev,
                  [reviewStudentId]: {
                    ...cur,
                    answers: restored.answers,
                    checkedSteps: restored.checkedSteps,
                    ...(restored.stepId ? { stepId: restored.stepId } : {}),
                  },
                }
              })
            }
          } else {
            setAnswers(restored.answers)
            setCheckedSteps(restored.checkedSteps)
            // Возвращаем на тот шаг, где остановились: иначе урок каждый раз
            // начинается сначала, а ответы «где-то дальше по ленте».
            if (restored.stepId) {
              restoredStepRef.current = { materialId: stepMaterialId, stepId: restored.stepId }
              setActiveStepId(restored.stepId)
            }
          }
        }
        setProgressLoadedFor(stepMaterialId)
      })
      .catch(() => { if (!cancelled) setProgressLoadedFor(stepMaterialId) })
    return () => { cancelled = true }
  }, [stepMaterialId, lessonId, token, isStaff, reviewStudentId])

  // Пишет только ученик и только свою работу: у преподавателя в answers лежит
  // зеркало чужих ответов, и сохранять его значило бы писать чужое в свою
  // строку прогресса.
  //
  // Запись висит на действии, а не на эффекте по состоянию. Эффект срабатывал
  // бы и сразу после загрузки — а если восстанавливать было нечего (урок открыт
  // второй вкладкой, ответ пришёл не сюда, запрос не удался), он тут же записал
  // бы поверх сохранённого пустоту. Ответ теряется тем вернее, чем позже его
  // открыли.
  const saveTimerRef = useRef(null)
  useEffect(() => () => clearTimeout(saveTimerRef.current), [])

  // Живое аудио: пока это не преподаватель, каждый 🔊/аудио-клип уходит
  // собеседнику (см. audioReport.js — карточки словаря, вопросы на слух,
  // CourseStepPlayer и настоящие <audio> в разметке зовут её сами). Ref для
  // activeStepId, чтобы не пересоздавать подписку на каждый переход по шагу.
  const activeStepIdRef = useRef(activeStepId)
  useEffect(() => { activeStepIdRef.current = activeStepId })
  useEffect(() => {
    if (isStaff) return undefined
    setAudioReporter((payload) => sendAudio({ ...payload, stepId: activeStepIdRef.current }))
    return () => setAudioReporter(null)
  }, [isStaff, sendAudio])
  // Ушёл с урока — трансляция учителя, если играла, обрывается вместе с ним.
  useEffect(() => () => stopBroadcastAudio(), [])

  function persistProgress(next) {
    if (isStaff || !stepMaterialId || !progressLoaded) return
    // Дебаунс: ответ в поле ввода меняется на каждую букву.
    clearTimeout(saveTimerRef.current)
    const materialId = stepMaterialId
    saveTimerRef.current = setTimeout(() => {
      saveLessonMaterialProgress(token, lessonId, materialId, serializeStepProgress(next)).catch(() => {})
    }, 800)
  }

  // Свой шаг уходит собеседнику при каждом переходе — так на треке появляются
  // оба бегунка. Раньше позиция преподавателя приходила только событием focus,
  // а оно несёт id раздела занятия: на маршруте из шагов урока ему не с чем
  // совпасть, и «Т» там не появлялся никогда.
  //
  // Эффект стоит именно здесь, ниже useLessonLiveSocket: sendStepProgress —
  // const из его результата, и упоминание в списке зависимостей выше по файлу
  // читается на рендере, до инициализации (уже ловили ReferenceError).
  //
  // У ученика дополнительно шлём sectionId/materialId: иначе преподаватель
  // узнаёт о смене раздела только после ответа на шаге.
  useEffect(() => {
    if (!activeSectionId) return
    if (isStaff) {
      if (!onLessonSteps || !activeStepId) return
      sendStepProgress({
        stepId: activeStepId,
        sectionId: activeSectionId,
        materialId: activeMaterial?.materialId ?? null,
      })
      return
    }
    const payload = {
      sectionId: activeSectionId,
      materialId: activeMaterial?.materialId ?? null,
    }
    if (onLessonSteps && activeStepId) payload.stepId = activeStepId
    sendStepProgress(payload)
  }, [isStaff, onLessonSteps, activeStepId, activeSectionId, activeMaterial?.materialId, sendStepProgress])

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
    const stepId = onLessonSteps && activeStepId ? activeStepId : null
    sendFocus(activeSectionId, activeMaterial?.materialId ?? null, stepId, stepId ? 'block-0' : null)
    // Своё эхо брокера сокет глушит, поэтому onFocus здесь не сработает —
    // бегунок «Т» ставим сразу, иначе преподаватель не увидит себя на треке.
    setTeacherStepId(onLessonSteps ? activeStepId : activeSectionId)
    setPresenting(true)
    // На шагах каталога iframe нет — достаточно focus (+ stepId внутри него).
    if (onLessonSteps && activeStepId) {
      sendStepProgress({
        stepId: activeStepId,
        sectionId: activeSectionId,
        materialId: activeMaterial?.materialId ?? null,
      })
    }
    // Switch to the bridged iframe (catalog React steps have no DOM for the
    // mirror) and ask it for the stream that reached the teacher's stage —
    // same catch-up path as web-admin's focusOnExercise().
    setReloadToken((n) => n + 1)
  }

  // After «Внимание» remounts the iframe, pull a snapshot once it can answer.
  useEffect(() => {
    if (!presenting || !isStaff) return undefined
    const handle = setTimeout(() => {
      materialFrameRef.current?.requestSnapshot?.()
    }, 500)
    return () => clearTimeout(handle)
  }, [presenting, reloadToken, isStaff])

  // Flush present events buffered while the follow iframe was mounting.
  useEffect(() => {
    if (isStaff || !followMode || !activeMaterial) return undefined
    const handle = setTimeout(() => {
      if (!pendingPresentRef.current.length) return
      const batch = pendingPresentRef.current
      pendingPresentRef.current = []
      materialFrameRef.current?.replay(batch)
    }, 600)
    return () => clearTimeout(handle)
  }, [isStaff, followMode, activeMaterial?.materialId, reloadToken])

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
  // Урок идёт, стоит на паузе или уже закончился — экран собран одинаково,
  // разница в том, можно ли отвечать. Раньше ветка была только под «идёт» и
  // «пауза», и после «Завершить» ученик оставался с пустым экраном: ни ленты,
  // ни ответов, ни итога (спека §3.4 описывает совсем другое).
  const lessonOpen = status === 'IN_PROGRESS' || status === 'PAUSED' || status === 'COMPLETED' || followMode
  // Смотрящий не отвечает; на паузе и после урока — тоже, чтобы работа не
  // терялась и не дописывалась задним числом (спека §3.3, §3.4).
  const contentReadOnly = isStaff || status === 'PAUSED' || status === 'COMPLETED'
  const ownProgress = stepProgress(lessonSteps, isStaff ? reviewAnswers : answers)
  const view = materialView({ hasStep: activeStep != null, fileUrl: materialFileUrl, catalogResolved })

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="lessons" token={token} onNav={onNav} onProfile={onProfile} rail>
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

            {isStaff && (
              <StudentReviewPicker
                participants={lesson.participants}
                reviewStudentId={reviewStudentId}
                onSelect={setReviewStudentId}
                onlineUserIds={onlineUserIds}
              />
            )}

            {status === 'PAUSED' && (
              <SystemBanner tone="attention" text={t('live.paused')} />
            )}

            {status === 'COMPLETED' && (
              <SystemBanner
                text={`${t('live.finished')}${lesson.durationMinutes ? ` · ${t('live.finishedDuration', { minutes: lesson.durationMinutes })}` : ''}`}
              />
            )}

            {lessonOpen && (
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

                      {/* Разделы занятия, когда маршрут слева занят шагами урока.
                          Без этого они недостижимы вовсе: маршрут показывает либо
                          шаги, либо разделы, и стоит первому разделу оказаться
                          уроком каталога — остальные пропадают с экрана вместе с
                          прикреплёнными к ним материалами. */}
                      {onLessonSteps && sections.length > 1 && (
                        <div className="ls__tabs lw-material-tabs">
                          {sections.map((s, i) => (
                            <button
                              key={s.id}
                              type="button"
                              className={`ls-tab ${s.id === activeSectionId ? 'ls-tab--active' : ''}`}
                              onClick={() => selectSection(s.id)}
                            >
                              {s.title || t('live.materialTab', { n: i + 1 })}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Материалы внутри раздела. Вкладки нужны только там, где
                          выбирать есть из чего: у раздела с одним материалом это
                          была бы кнопка, которая ничего не переключает. */}
                      {sectionMaterials.length > 1 && (
                        <div className="ls__tabs lw-material-tabs">
                          {sectionMaterials.map((m, i) => (
                            <button
                              key={m.materialId}
                              type="button"
                              className={`ls-tab ${m.materialId === activeMaterial?.materialId ? 'ls-tab--active' : ''}`}
                              onClick={() => setActiveMaterialId(m.materialId)}
                            >
                              {m.title || t('live.materialTab', { n: i + 1 })}
                            </button>
                          ))}
                        </div>
                      )}
                      {view === 'steps' ? (
                        <>
                          {/* Ученик ушёл на другой шаг — преподаватель об этом
                              узнаёт, а не догадывается по бегунку на треке. */}
                          {isStaff && reviewStepId && reviewStepId !== activeStepId && (
                            <SystemBanner
                              tone="attention"
                              text={t('live.peerOnStep', {
                                name: reviewPeerName || t('live.roster.student'),
                                title: lessonSteps.find((s) => s.id === reviewStepId)?.title || '',
                              })}
                              actionLabel={t('live.peerGo')}
                              onAction={() => setActiveStepId(reviewStepId)}
                            />
                          )}
                          {/* Документ шага — тот же LessonContent, что у преподавателя.
                              Плеер «один вопрос = один экран» прятал указку: questionId
                              `block-N` живёт в карточках, а не в очереди CourseStepPlayer. */}
                          <div ref={lessonContentRef}>
                            <LessonContent
                              step={activeStep}
                              // Преподаватель смотрит работу ученика, ученик — свою.
                              answers={isStaff ? reviewAnswers : answers}
                              checkedKeys={isStaff ? reviewCheckedSteps : checkedSteps}
                              onAnswer={handleAnswer}
                              onCheck={handleCheckStep}
                              readOnly={contentReadOnly}
                              liveQuestionId={isStaff ? reviewLiveQuestionId : (followMode ? focusTargetId : null)}
                              liveFocusNonce={isStaff ? 0 : focusNonce}
                              token={token}
                              source={catalogLesson?.title || lesson?.title}
                              catalogLessonId={resolvedCatalogLessonId}
                            />
                          </div>
                        </>
                      ) : view === 'loading' ? (
                        <p className="live__status-msg">{t('schedule.loading')}</p>
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
                          кликом по маршруту сбоку — см. StepNav.

                          У ученика этих кнопок нет: он идёт по очереди экранов,
                          и её листает «Продолжить» самого плеера. Две навигации
                          на одном экране противоречили друг другу — «Далее»
                          перепрыгивала через весь шаг урока, мимо заданий,
                          которые плеер только собирался показать. */}
                      {isStaff && (
                        <StepNav steps={routeSteps} activeStepId={routeActiveId} onSelect={selectRouteStep} />
                      )}
                    </div>

                    <div className="lw-live-aside">
                      {/* Урок кончился — звонка на его месте быть не должно:
                          звонить уже некуда. Вместо него итог (спека §3.4). */}
                      {status === 'COMPLETED' ? (
                        <div className="lw-card lw-summary">
                          <h3 className="lw-summary__title">{t('live.summaryTitle')}</h3>
                          <p className="lw-summary__value">
                            {t('live.summaryDone', { done: ownProgress.done, total: ownProgress.total })}
                          </p>
                        </div>
                      ) : (
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
                      )}
                      {catalogLesson?.topics?.length > 0 && (
                        <TopicsList topics={catalogLesson.topics} activeTopicId={activeStep?.topicId} />
                      )}
                      <TeacherChat
                        messages={chatMessages}
                        onSend={handleSendMessage}
                        sending={chatSending}
                        title={isStaff ? t('lesson.ws.chatStaff') : t('lesson.ws.chat')}
                      />
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
