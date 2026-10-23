import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getLessonVideoToken } from '../../api.js'
import { createVideoClient } from './zoomVideoClient.js'
import { callFallback, orderTiles } from './videoLayout.js'

// Код отказа Zoom при входе участника, которого хост удалил из этой сессии.
const REMOVED_FROM_SESSION = 3009

// Звонок урока поверх Zoom Video SDK. Клиент создаётся только при join(), поэтому
// SDK не грузится у тех, кто звонок не открывал. Любой сбой звонка не должен ронять урок:
// он уходит в phase 'failed' с подсказкой, что показать вместо плиток.
export function useLessonVideo({ token, lessonId, teacherUserId, enabled, createClient = createVideoClient }) {
  const [phase, setPhase] = useState('idle')
  const [fallback, setFallback] = useState(null)
  const [deviceError, setDeviceError] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [selfId, setSelfId] = useState(null)
  const [people, setPeople] = useState([])
  const [speakerIds, setSpeakerIds] = useState([])
  const [micOn, setMicOn] = useState(false)
  const [camOn, setCamOn] = useState(false)
  const clientRef = useRef(null)
  const unsubscribeRef = useRef([])
  const leavingRef = useRef(false)
  // Номер текущей попытки входа: выход, уход со страницы и конец урока его меняют,
  // и недоделанный join() после каждого await видит, что он уже никому не нужен.
  const attemptRef = useRef(0)
  const connectingRef = useRef(false)
  // SDK держит один клиент на вкладку, поэтому новый вход ждёт, пока закончится прошлый выход.
  const leavePromiseRef = useRef(Promise.resolve())
  // Звук запущен в SDK; без него (отказ в микрофоне, выход из аудио) mute/unmute не сработают.
  const audioStartedRef = useRef(false)

  const dropClient = useCallback((end = false) => {
    unsubscribeRef.current.forEach((off) => off())
    unsubscribeRef.current = []
    const client = clientRef.current
    clientRef.current = null
    if (!client) return
    audioStartedRef.current = false
    // Выход не ждём в интерфейсе: при закрытии вкладки ответа всё равно не будет.
    leavePromiseRef.current = Promise.resolve(client.leave(end)).catch(() => {})
  }, [])

  const refreshPeople = useCallback(() => {
    if (clientRef.current) setPeople(clientRef.current.participants())
  }, [])

  const fail = useCallback((reason) => {
    dropClient()
    setFallback(reason)
    setPhase('failed')
  }, [dropClient])

  const connect = useCallback(async (stale) => {
    leavingRef.current = false
    setFallback(null)
    setDeviceError(false)
    setPhase('connecting')
    let grant
    try {
      grant = await getLessonVideoToken(token, lessonId)
    } catch (err) {
      if (stale()) return
      setPhase('failed')
      setFallback(callFallback(err))
      return
    }
    if (stale()) return
    try {
      await leavePromiseRef.current
      if (stale()) return
      const client = await createClient()
      if (stale()) return
      clientRef.current = client
      unsubscribeRef.current = [
        client.on('participants', refreshPeople),
        client.on('audio', (state) => {
          setMicOn(state === 'unmuted')
          if (state === 'left') audioStartedRef.current = false
        }),
        client.on('speaker', (ids) => setSpeakerIds(ids.map(String))),
        client.on('connection', (state, reason) => {
          if (state === 'reconnecting') setPhase('reconnecting')
          else if (state === 'connected') setPhase('connected')
          // Урок завершён только если так сказал хост; любой другой обрыв — сеть, можно повторить.
          else if (!leavingRef.current) fail(reason === 'ended by host' ? 'ended' : 'retry')
        }),
        client.on('removed', () => { dropClient(); setPhase('removed') }),
      ]
      await client.join(grant.sessionName, grant.token, grant.userName)
      if (stale()) {
        // Выход, отправленный до конца входа, SDK мог не принять — выходим ещё раз.
        client.leave().catch(() => {})
        return
      }
      setIsHost(Boolean(grant.host))
      setSelfId(client.selfId())
      try {
        await client.startAudio()
        audioStartedRef.current = true
        setMicOn(true)
      } catch {
        // Нет доступа к микрофону: слышать других можно, поэтому звонок не рвём.
        setDeviceError(true)
        setMicOn(false)
      }
      if (stale()) return
      setCamOn(false)
      refreshPeople()
      setPhase('connected')
    } catch (err) {
      if (stale()) return
      // 3009: хост уже удалял этого участника, и Zoom не пустит его в сессию до её конца.
      if (err?.errorCode === REMOVED_FROM_SESSION || err?.sdk?.errorCode === REMOVED_FROM_SESSION) {
        dropClient()
        setPhase('removed')
      } else {
        fail('link')
      }
    }
  }, [token, lessonId, createClient, fail, dropClient, refreshPeople])

  const join = useCallback(async () => {
    if (!enabled || clientRef.current || connectingRef.current) return
    const attempt = ++attemptRef.current
    const stale = () => attemptRef.current !== attempt
    connectingRef.current = true
    try {
      await connect(stale)
    } finally {
      if (!stale()) connectingRef.current = false
    }
  }, [enabled, connect])

  // end: хост завершает сессию для всех — у остальных придёт «ended by host».
  const closeCall = useCallback(async (end) => {
    leavingRef.current = true
    attemptRef.current += 1
    connectingRef.current = false
    dropClient(end)
    setPhase('idle')
    setPeople([])
    setSpeakerIds([])
  }, [dropClient])

  // Обработчик кнопки получает событие клика, поэтому end сюда не пропускаем.
  const leave = useCallback(() => closeCall(false), [closeCall])

  const toggleMic = useCallback(async () => {
    const client = clientRef.current
    if (!client) return
    try {
      if (!audioStartedRef.current) {
        await client.startAudio()
        audioStartedRef.current = true
        setMicOn(true)
        setDeviceError(false)
        return
      }
      if (micOn) await client.muteSelf()
      else await client.unmuteSelf()
      setMicOn(!micOn)
    } catch {
      setDeviceError(true)
    }
  }, [micOn])

  const toggleCamera = useCallback(async () => {
    const client = clientRef.current
    if (!client) return
    try {
      if (camOn) await client.stopVideo()
      else await client.startVideo()
      setCamOn(!camOn)
      refreshPeople()
    } catch {
      setDeviceError(true)
    }
  }, [camOn, refreshPeople])

  // Чужими микрофонами и составом управляет только хост; сервер проверяет это ещё раз.
  const hostCall = useCallback(
    async (name, ...args) => { if (isHost) await clientRef.current?.[name](...args) },
    [isHost],
  )
  const muteUser = useCallback((userId) => hostCall('muteUser', userId), [hostCall])
  const muteAll = useCallback(() => hostCall('muteAll'), [hostCall])
  const removeUser = useCallback((userId) => hostCall('removeUser', userId), [hostCall])

  const attachVideo = useCallback((userId, quality) => clientRef.current.attachVideo(userId, quality), [])
  const detachVideo = useCallback((userId) => clientRef.current?.detachVideo(userId), [])

  useEffect(() => () => {
    leavingRef.current = true
    attemptRef.current += 1
    dropClient()
  }, [dropClient])

  // Урок завершён или отменён — звонок закрываем сами, чтобы не оставлять живую сессию без экрана.
  useEffect(() => {
    if (!enabled && (clientRef.current || connectingRef.current)) closeCall(isHost)
  }, [enabled, closeCall, isHost])

  const tiles = useMemo(() => {
    return orderTiles(people, teacherUserId).map((p) => ({
      ...p,
      speaking: speakerIds.includes(p.userId),
      isSelf: p.userId === selfId,
    }))
  }, [people, speakerIds, teacherUserId, selfId])

  return {
    phase, fallback, deviceError, isHost, tiles, micOn, camOn,
    join, leave, toggleMic, toggleCamera, muteUser, muteAll, removeUser, attachVideo, detachVideo,
  }
}
