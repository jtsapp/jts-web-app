import { useCallback, useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { wsBase } from '../../lib/wsUrl.js'

// Live whiteboard transport for one lesson. Deliberately mirrors web-admin's
// LessonBoardSocketService (same topics, same payload shapes) so a teacher drawing in
// web-admin and a student here share one board over the same backend. Auth rides the
// STOMP CONNECT frame. The broker fans a publish back to its sender, so echoes of our own
// edits (senderUserId / userId === selfUserId) are dropped to avoid double-applying them.
// Remote events are delivered through the latest `handlers` (kept in a ref) so subscribing
// once per lesson never re-runs on every render. Degrades softly: no connection → senders no-op.
export function useLessonBoard(lessonId, token, selfUserId, handlers) {
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
        client.subscribe(`/topic/lesson/${lessonId}/board`, (m) => {
          const evt = parse(m.body)
          if (!evt || evt.senderUserId === selfUserId) return
          handlersRef.current?.onBoardEvent?.(evt)
        })
        client.subscribe(`/topic/lesson/${lessonId}/cursor`, (m) => {
          const evt = parse(m.body)
          if (!evt || evt.userId === selfUserId) return
          handlersRef.current?.onCursor?.(evt)
        })
        client.subscribe(`/topic/lesson/${lessonId}/board-settings`, (m) => {
          const evt = parse(m.body)
          if (evt) handlersRef.current?.onSettings?.(evt)
        })
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    })
    clientRef.current = client
    client.activate()
    return () => { client.deactivate(); clientRef.current = null; setConnected(false) }
  }, [lessonId, token, selfUserId])

  const publishBoard = useCallback((action, body) => {
    const client = clientRef.current
    if (!client?.connected) return
    client.publish({ destination: `/app/lesson/${lessonId}/board/${action}`, body: JSON.stringify(body) })
  }, [lessonId])

  const sendAdd = useCallback((objectId, type, json) => publishBoard('add', { objectId, type, json }), [publishBoard])
  const sendUpdate = useCallback((objectId, type, json) => publishBoard('update', { objectId, type, json }), [publishBoard])
  const sendRemove = useCallback((objectId) => publishBoard('remove', { objectId }), [publishBoard])
  const sendClear = useCallback(() => publishBoard('clear', {}), [publishBoard])
  const sendCursor = useCallback((x, y, tool) => {
    const client = clientRef.current
    if (!client?.connected) return
    client.publish({ destination: `/app/lesson/${lessonId}/cursor`, body: JSON.stringify({ x, y, tool }) })
  }, [lessonId])

  return { connected, sendAdd, sendUpdate, sendRemove, sendClear, sendCursor }
}

function parse(body) {
  try { return JSON.parse(body) } catch { return null }
}
