import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { materialMirrorUrl } from '../../api.js'
import { useMaterialSession } from './useMaterialSession.js'

// Renders one interactive material in an iframe and wires screen mirroring, faithfully porting
// web-admin's material-session-monitor:
//   iframe → host: the backend-injected bridge posts {source:'jts-bridge', type:'mirror', ...}
//                  which we forward over this monitor's `channel`.
//   host → iframe: incoming events for that same channel are postMessage'd back down as
//                  {source:'jts-bridge-host', type:'mirror', ...} for the bridge to replay.
// `channel`='student' mirrors the student→teacher direction; 'teacher' the reverse. Each monitor
// owns its own socket (see useMaterialSession) so two monitors never clobber one another.
//
// Security: the /render URL carries the JWT in the query string — the same documented web-admin
// trade-off as api.materialRenderUrl; replace with a short-lived ticket when the backend offers one.
export default function MaterialMirrorMonitor({ materialId, assignmentId, token, channel = 'student', mode = 'live', sessionId }) {
  const { t } = useI18n()
  const frameRef = useRef(null)
  const [answers, setAnswers] = useState({}) // questionId -> latest answer (deduped)

  const replayIntoFrame = useCallback((event) => {
    frameRef.current?.contentWindow?.postMessage(
      { source: 'jts-bridge-host', type: 'mirror', selector: event.selector, eventType: event.eventType, value: event.value ?? null },
      '*',
    )
  }, [])

  const isTeacherChannel = channel === 'teacher'
  const { connected, sendMirror, sendTeacherMirror } = useMaterialSession(assignmentId, {
    sessionId,
    token,
    handlers: {
      // Replay only the direction this monitor watches (mirror for 'student', teacher-mirror for 'teacher').
      onMirror: isTeacherChannel ? undefined : replayIntoFrame,
      onTeacherMirror: isTeacherChannel ? replayIntoFrame : undefined,
      onAnswer: (a) => setAnswers((prev) => ({ ...prev, [a.questionId]: a })),
    },
  })

  // Forward the bridge's captured DOM interactions from OUR iframe over the mirror channel.
  useEffect(() => {
    const onMessage = (event) => {
      if (event.source !== frameRef.current?.contentWindow) return
      const data = event.data
      if (!data || data.source !== 'jts-bridge' || data.type !== 'mirror') return
      const mirrorEvent = { selector: data.selector, eventType: data.eventType, value: data.value ?? null }
      if (isTeacherChannel) sendTeacherMirror(mirrorEvent)
      else sendMirror(mirrorEvent)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [isTeacherChannel, sendMirror, sendTeacherMirror])

  const url = useMemo(
    () => materialMirrorUrl(materialId, { assignmentId, mode, token, sessionId }),
    [materialId, assignmentId, mode, token, sessionId],
  )
  const answerList = Object.values(answers)

  return (
    <section className="mirror" aria-label={t('mirror.title')}>
      <div className="mirror__stage">
        <span className={`board__conn${connected ? ' is-on' : ''}`}>{connected ? t('live.connected') : t('live.disconnected')}</span>
        <iframe
          ref={frameRef}
          className="mirror__frame"
          title={t('mirror.title')}
          src={url}
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>

      {sessionId != null && (
        <aside className="mirror__answers" aria-label={t('mirror.answers.title')}>
          <h3 className="mirror__answers-title">{t('mirror.answers.title')}</h3>
          {answerList.length === 0 && <p className="mirror__answers-empty">{t('mirror.answers.empty')}</p>}
          <ul className="mirror__answers-list">
            {answerList.map((a) => (
              <li key={a.questionId} className={`mirror__answer${a.isCorrect === false ? ' is-wrong' : a.isCorrect ? ' is-right' : ''}`}>
                <span className="mirror__answer-q">{a.questionId}</span>
                {a.isCorrect != null && <span className="mirror__answer-mark" aria-hidden="true">{a.isCorrect ? '✓' : '✗'}</span>}
                {a.points != null && <span className="mirror__answer-pts">{a.points}</span>}
              </li>
            ))}
          </ul>
        </aside>
      )}
    </section>
  )
}
