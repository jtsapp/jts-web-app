import { useEffect, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { wsBase } from '../../lib/wsUrl.js'
import { stompConnectHeaders } from '../../lib/stompAuth.js'

const PRESENCE_REJOIN_MS = 15000

// Live roster of who is actually connected to this lesson, driven by the server's
// presence broadcast. Auth rides the STOMP CONNECT frame (connectHeaders), not the
// WebSocket HTTP handshake. Degrades softly: no connection → empty roster.
export function useLessonPresence(lessonId, token) {
  const [roster, setRoster] = useState([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!lessonId || !token) return undefined
    let rejoin = null
    const announce = (client) => {
      if (!client?.connected) return
      client.publish({ destination: `/app/lesson/${lessonId}/presence/join`, body: '{}' })
    }
    const client = new Client({
      brokerURL: wsBase(),
      connectHeaders: stompConnectHeaders(token),
      reconnectDelay: 3000,
      heartbeatIncoming: 25000,
      heartbeatOutgoing: 0,
      beforeConnect: () => {
        client.connectHeaders = stompConnectHeaders(token)
      },
      onConnect: () => {
        setConnected(true)
        client.subscribe(`/topic/lesson/${lessonId}/presence`, (m) => {
          try { setRoster(normalizeRoster(JSON.parse(m.body))) } catch { /* ignore malformed frame */ }
        })
        announce(client)
        rejoin = setInterval(() => announce(client), PRESENCE_REJOIN_MS)
      },
      onWebSocketClose: () => {
        if (rejoin) { clearInterval(rejoin); rejoin = null }
        setConnected(false)
      },
      onStompError: () => setConnected(false),
    })
    client.activate()
    return () => {
      if (rejoin) clearInterval(rejoin)
      client.deactivate()
      setConnected(false)
      setRoster([])
    }
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
