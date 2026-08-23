import { useEffect, useRef } from 'react'

// Пульс вкладки. 20 с против запаса HEARTBEAT_GRACE_SEC=45 на сервере — два
// пропуска подряд ещё переживаем, три уже нет. Чаще незачем: цена ошибки —
// секунды лимита, а не минуты.
export const PING_INTERVAL_MS = 20000

// Отметка жизненного цикла разговора → /api/livekit/session. keepalive, чтобы
// «closed» доехал, даже если вкладку закрывают прямо сейчас.
export function reportCallSession(room, event, { beacon = false } = {}) {
  if (!room) return
  // deviceId сюда НЕ кладём. Чей это разговор, решил токен-роут, когда заводил
  // строку сессии: у залогиненного там `user-<id>`, а не device-id браузера, и
  // присланный клиентом id просто не совпадал — сессия не тарифицировалась
  // вовсе, а лимит после звонка выглядел выросшим.
  const payload = JSON.stringify({ room, event })
  if (beacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    // sendBeacon переживает выгрузку страницы, fetch — нет.
    navigator.sendBeacon('/api/livekit/session', payload)
    return
  }
  void fetch('/api/livekit/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Молча: не доехал пульс — сервер сам закроет сессию по мёртвому пульсу,
    // а ронять из-за этого экран разговора незачем.
  })
}

/**
 * Ведёт учётную сессию разговора: включает отсчёт минут в момент, когда в
 * комнате появился ТЬЮТОР, дальше держит пульс и закрывает сессию по концу.
 *
 * Отсчёт именно от тьютора, а не от открытия комнаты: между выдачей токена и
 * первым словом тьютора ученик просто ждёт соединения, и эти секунды раньше
 * списывались с его лимита.
 *
 * @param {string} room комната из ответа токен-роута
 * @param {boolean} tutorPresent тьютор в комнате (агент подключён и слышен)
 * @returns {() => void} закрыть сессию немедленно (кнопка «Завершить разговор»)
 */
export function useCallSession(room, tutorPresent) {
  const armedRef = useRef(false)
  const closedRef = useRef(false)

  const close = useRef(() => {})
  close.current = () => {
    // Закрываем только то, что успели открыть, и ровно один раз: повторный
    // «closed» ушёл бы в пустоту, а на сервере это лишний запрос на каждый
    // ререндер кнопки.
    if (!armedRef.current || closedRef.current) return
    closedRef.current = true
    reportCallSession(room, 'closed')
  }

  useEffect(() => {
    if (!room || !tutorPresent || armedRef.current) return
    armedRef.current = true
    reportCallSession(room, 'armed')
  }, [room, tutorPresent])

  useEffect(() => {
    if (!room) return
    const id = setInterval(() => {
      if (armedRef.current && !closedRef.current) reportCallSession(room, 'ping')
    }, PING_INTERVAL_MS)
    // Вкладку закрывают или сворачивают насовсем — успеваем отдать «closed»
    // маячком. Без этого сессия висела бы до серверного таймаута по пульсу.
    const onHide = () => {
      if (!armedRef.current || closedRef.current) return
      closedRef.current = true
      reportCallSession(room, 'closed', { beacon: true })
    }
    window.addEventListener('pagehide', onHide)
    return () => {
      clearInterval(id)
      window.removeEventListener('pagehide', onHide)
    }
  }, [room])

  return () => close.current()
}
