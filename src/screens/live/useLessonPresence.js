import { useEffect, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { wsBase } from '../../lib/wsUrl.js'

// Live roster of who is actually connected to this lesson, driven by the server's
// presence broadcast. Auth rides the STOMP CONNECT frame (connectHeaders), not the
// WebSocket HTTP handshake. Degrades softly: no connection → empty roster.
export function useLessonPresence(lessonId, token) {
  const [roster, setRoster] = useState([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!lessonId || !token) return undefined
    const client = new Client({
      brokerURL: wsBase(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true)
        client.subscribe(`/topic/lesson/${lessonId}/presence`, (m) => {
          try { setRoster(normalizeRoster(JSON.parse(m.body))) } catch { /* ignore malformed frame */ }
        })
        client.publish({ destination: `/app/lesson/${lessonId}/presence/join`, body: '{}' })
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    })
    client.activate()
    return () => { client.deactivate(); setConnected(false); setRoster([]) }
  }, [lessonId, token])

  return { roster, connected }
}

// The server broadcasts { onlineUserIds: number[] }; fall back to a bare array.
// Only IDs are sent — display names are resolved by the caller from the loaded lesson.
function normalizeRoster(payload) {
  const ids = Array.isArray(payload?.onlineUserIds)
    ? payload.onlineUserIds
    : (Array.isArray(payload) ? payload : [])
  return ids.map((v) => ({ userId: Number(v) })).filter((p) => Number.isFinite(p.userId))
}
