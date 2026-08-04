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
import TeacherChat from './workspace/TeacherChat.jsx'

const PAUSE_MINUTES = 5
const MESSAGE_POLL_MS = 5000

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

  function loadSections() {
    getLessonSections(token, lessonId).then((list) => {
      setSections(list)
      setActiveSectionId((prev) => (prev != null && list.some((s) => s.id === prev)) ? prev : (list[0]?.id ?? null))
    }).catch(() => {})
  }

  function selectSection(sectionId) {
    setActiveSectionId(sectionId)
    setFollowMode(false)
    if (isStaff) setPresenting(false)
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
  const chatMessages = messages.map((m) => ({
    id: m.id,
    from: m.senderUserId === lesson?.teacherId ? 'teacher' : 'student',
    text: m.body,
  }))

  function refreshMessages() {
    getLessonMessages(token, lessonId).then(setMessages).catch(() => {})
  }

  function handleSendMessage(text) {
    sendLessonMessage(token, lessonId, text).then(setMessages).catch(() => {})
  }

  // --- Живая синхронизация (follow-me + зеркалирование) -------------------
  const { sendFocus, sendMirror, sendPresent } = useLessonLiveSocket(lessonId, token, selfUserId, {
    onFocus: (evt) => {
      if (isStaff || evt.sectionId == null) return
      setActiveSectionId(evt.sectionId)
      setFollowMode(true)
      setReloadToken((n) => n + 1)
    },
    onPresent: (evt) => {
      if (isStaff || evt.materialId !== activeMaterial?.materialId) return
      materialFrameRef.current?.replay(evt.events)
    },
    onSectionsChanged: loadSections,
  })

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
      <div className={`live ${tab === 'lesson' ? 'live--wide' : ''}`}>
        <button className="live__back" onClick={onBack}>← {t('schedule.back')}</button>

        {state === 'loading' && <p className="live__status-msg">{t('schedule.loading')}</p>}
        {state === 'error' && <p className="live__status-msg">{t('live.loadError')}</p>}

        {state === 'ready' && lesson && (
          <>
            <div className="live__head">
              <h1 className="live__title">{t('live.title')}</h1>
              <span className="live__teacher">{lesson.teacherName || ''}</span>
              <LiveStatusBadge status={status} />
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

            <PresenceRoster roster={roster} connected={connected} nameFor={nameFor} />

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
                        <p className="live__status-msg">{t('lesson.ws.noSections')}</p>
                      ) : (
                        <LessonRoute
                          steps={sections.map((s) => ({ id: s.id, order: s.position, title: s.title }))}
                          activeStepId={activeSectionId}
                          statusById={sectionStatusById}
                          onSelect={selectSection}
                        />
                      )}
                    </div>

                    <div className="lw-live-main">
                      {isStaff && (
                        <button className="lw-focus-btn" disabled={!activeSectionId} onClick={handleFocusClick}>
                          {t('lesson.ws.focus')}
                        </button>
                      )}
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
                            <a className="lw-meet__link" href={lesson.meetingUrl} target="_blank" rel="noreferrer">
                              {t('lesson.ws.call')}
                            </a>
                            {isStaff && (
                              <button className="lw-meet__edit-btn" onClick={openMeetingUrlEditor}>{t('lesson.ws.meetEdit')}</button>
                            )}
                          </>
                        ) : isStaff ? (
                          <button className="lw-meet__edit-btn" onClick={openMeetingUrlEditor}>{t('lesson.ws.meetAdd')}</button>
                        ) : (
                          <p className="live__status-msg">{t('lesson.ws.call')}</p>
                        )}
                      </div>
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
