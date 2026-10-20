'use client'

import { useEffect } from 'react'
import { Client } from '@stomp/stompjs'
import { wsBase } from '../lib/wsUrl.js'
import { stompConnectHeaders } from '../lib/stompAuth.js'

const PULSE_MS = 10000

/**
 * Пока приложение ученика открыто, преподаватель видит «на платформе».
 * Колокольчик есть не на каждом экране: самоподготовка, материал и живой урок
 * его не монтируют, и без отдельного пульса ученик там выглядит вышедшим.
 * Закрытие вкладки пульс обрывает и запрещает сокету переподключиться.
 */
export default function PlatformPresence({ token }) {
  useEffect(() => {
    if (!token) return undefined
    let beat = null
    const client = new Client({
      brokerURL: wsBase(),
      connectHeaders: stompConnectHeaders(token),
      reconnectDelay: 5000,
      heartbeatIncoming: 25000,
      heartbeatOutgoing: 0,
      beforeConnect: () => {
        // Токен в React мог устареть, пока в хранилище уже лежит свежий.
        // Со старым Bearer соединение анонимное, и пульс не засчитывается.
        client.connectHeaders = stompConnectHeaders(token)
      },
      onConnect: () => {
        pulse()
        if (beat) clearInterval(beat)
        beat = setInterval(pulse, PULSE_MS)
      },
    })
    const pulse = () => {
      if (!client.connected) return
      client.publish({ destination: '/app/presence/platform', body: '{}' })
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') pulse()
    }
    const stop = () => {
      client.reconnectDelay = 0
      if (beat) { clearInterval(beat); beat = null }
      client.deactivate()
    }
    window.addEventListener('pagehide', stop)
    document.addEventListener('visibilitychange', onVisible)
    client.activate()
    return () => {
      window.removeEventListener('pagehide', stop)
      document.removeEventListener('visibilitychange', onVisible)
      stop()
    }
  }, [token])
  return null
}
