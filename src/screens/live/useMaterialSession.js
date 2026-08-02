import { useCallback, useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { wsBase } from '../../lib/wsUrl.js'

// Screen mirroring for one material assignment/session. Covers both directions —
// student→teacher (`mirror`) and teacher→student (`teacher-mirror`) — each with a one-shot
// catch-up history (an /app-prefixed subscribe the backend answers with every event so far,
// replayed through the same handler as live events), plus the persisted live-score feed
// (`answers`, only when a sessionId is passed).
//
// Unlike web-admin's providedIn:'root' MaterialSessionSocketService (whose single `client`
// field is overwritten when a second monitor mounts — the H1 "singleton socket dies on
// monitor switch" bug), each hook instance owns its OWN client in this effect, so two
// monitors (e.g. a teacher watching two students) never clobber each other.
export function useMaterialSession(assignmentId, { sessionId, token, handlers } = {}) {
  const [connected, setConnected] = useState(false)
  const clientRef = useRef(null)
  const handlersRef = useRef(handlers)
  useEffect(() => { handlersRef.current = handlers })

  useEffect(() => {
    if (!assignmentId || !token) return undefined
    const client = new Client({
      brokerURL: wsBase(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true)
        const each = (body, fn) => { const arr = parse(body); if (Array.isArray(arr)) arr.forEach(fn) }
        const onMirror = (e) => handlersRef.current?.onMirror?.(e)
        const onTeacherMirror = (e) => handlersRef.current?.onTeacherMirror?.(e)
        // student → teacher
        client.subscribe(`/app/material-assignment/${assignmentId}/mirror-history`, (m) => each(m.body, onMirror))
        client.subscribe(`/topic/material-assignment/${assignmentId}/mirror`, (m) => { const e = parse(m.body); if (e) onMirror(e) })
        // teacher → student
        client.subscribe(`/app/material-assignment/${assignmentId}/teacher-mirror-history`, (m) => each(m.body, onTeacherMirror))
        client.subscribe(`/topic/material-assignment/${assignmentId}/teacher-mirror`, (m) => { const e = parse(m.body); if (e) onTeacherMirror(e) })
        // persisted live score — only exists for graded materials once the student started
        if (sessionId) {
          client.subscribe(`/topic/material-session/${sessionId}/answers`, (m) => {
            const e = parse(m.body); if (e) handlersRef.current?.onAnswer?.(e)
          })
        }
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    })
    clientRef.current = client
    client.activate()
    return () => { client.deactivate(); clientRef.current = null; setConnected(false) }
  }, [assignmentId, sessionId, token])

  const publish = useCallback((action, event) => {
    const client = clientRef.current
    if (!client?.connected) return
    client.publish({ destination: `/app/material-assignment/${assignmentId}/${action}`, body: JSON.stringify(event) })
  }, [assignmentId])

  const sendMirror = useCallback((event) => publish('mirror', event), [publish])
  const sendTeacherMirror = useCallback((event) => publish('teacher-mirror', event), [publish])

  return { connected, sendMirror, sendTeacherMirror }
}

function parse(body) {
  try { return JSON.parse(body) } catch { return null }
}
