import { useCallback, useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { wsBase } from '../../lib/wsUrl.js'

// In-lesson coordination separate from the whiteboard connection (see web-admin's
// LessonLiveSocketService): "follow-me" navigation (`focus`) and a signal that any
// section/material changed (`sections-changed`, listeners reload the section list).
// The teacher publishes focus; students apply it to jump to the same section/material.
// Our own focus echo (senderUserId === selfUserId) is dropped. Handlers live in a ref so
// subscribing runs once per lesson. Degrades softly: no connection → sendFocus no-op.
export function useLessonLive(lessonId, token, selfUserId, handlers) {
  const [connected, setConnected] = useState(false)
  const clientRef = useRef(null)
  const handlersRef = useRef(handlers)
  useEffect(() => { handlersRef.current = handlers })

  useEffect(() => {
    if (!lessonId || !token) return undefined
    const client = new Client({
      brokerURL: wsBase(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true)
        client.subscribe(`/topic/lesson/${lessonId}/focus`, (m) => {
          const evt = parse(m.body)
          if (!evt || evt.senderUserId === selfUserId) return
          handlersRef.current?.onFocus?.(evt)
        })
        client.subscribe(`/topic/lesson/${lessonId}/sections-changed`, () => {
          handlersRef.current?.onSectionsChanged?.()
        })
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    })
    clientRef.current = client
    client.activate()
    return () => { client.deactivate(); clientRef.current = null; setConnected(false) }
  }, [lessonId, token, selfUserId])

  const sendFocus = useCallback((sectionId, materialId) => {
    const client = clientRef.current
    if (!client?.connected) return
    client.publish({ destination: `/app/lesson/${lessonId}/focus`, body: JSON.stringify({ sectionId, materialId }) })
  }, [lessonId])

  return { connected, sendFocus }
}

function parse(body) {
  try { return JSON.parse(body) } catch { return null }
}
