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

// The server may send an array or an object wrapping the participants; accept both,
// keep only entries with a user id.
function normalizeRoster(payload) {
  const list = Array.isArray(payload) ? payload : (payload?.participants ?? payload?.users ?? [])
  return list
    .map((p) => ({ userId: Number(p.userId ?? p.id), name: p.name, role: p.role }))
    .filter((p) => Number.isFinite(p.userId))
}
