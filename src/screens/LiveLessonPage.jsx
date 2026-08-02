import { useEffect, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { getLessonById, startLiveLesson, pauseLiveLesson, resumeLiveLesson, completeLiveLesson } from '../api.js'
import { roleFromToken, userIdFromToken } from '../lib/jwt.js'
import { canControl } from './live/liveStatus.js'
import { useLessonPresence } from './live/useLessonPresence.js'
import LiveStatusBadge from './live/LiveStatusBadge.jsx'
import PresenceRoster from './live/PresenceRoster.jsx'
import TeacherControls from './live/TeacherControls.jsx'
import LiveBoard from './live/LiveBoard.jsx'
import SectionsPanel from './live/SectionsPanel.jsx'

const PAUSE_MINUTES = 5

export default function LiveLessonPage({ lessonId, userName, userLevel, token, onNav, onProfile, onBack }) {
  const { t } = useI18n()
  const [lesson, setLesson] = useState(null)
  const [state, setState] = useState('loading') // 'loading' | 'ready' | 'error'
  const [busy, setBusy] = useState(false)
  const role = roleFromToken(token)
  const selfUserId = userIdFromToken(token)
  const isStaff = canControl(role)
  const { roster, connected } = useLessonPresence(lessonId, token)
  const pollRef = useRef(null)

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

  async function act(fn) {
    setBusy(true)
    try { const updated = await fn(token, lessonId); if (updated) setLesson(updated); else await load() }
    catch { /* keep current lesson; surface via reload */ await load() }
    finally { setBusy(false) }
  }

  const status = lesson?.status
  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="lessons" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="live">
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
                <SectionsPanel lessonId={lessonId} token={token} selfUserId={selfUserId} isStaff={isStaff} />
                <LiveBoard lessonId={lessonId} token={token} selfUserId={selfUserId} isStaff={isStaff} />
              </>
            )}
          </>
        )}
      </div>
    </LearningLayout>
  )
}
