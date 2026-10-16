'use client'

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useAudioPlayback,
  useLocalParticipant,
  useRoomContext,
  useTranscriptions,
  useVoiceAssistant,
} from '@livekit/components-react'
import { attachCallBridge, createReplySender, sayInCall } from '../lib/assistant/callBridge.js'
import { useCallSession } from '../tutor/callSession.js'

// Звонок Луне-помощнику: комната LiveKit и её связь с окном Луны
// (AssistantWidget). Сам компонент ничего не рисует — окно, разговор и кнопки
// звонка остаются в виджете, здесь только звук, микрофон и протокол с агентом
// (lib/assistant/callBridge.js). Поэтому окно можно закрыть посреди звонка, а
// Луна будет вести тур или открывать раздел — разговор не обрывается.
//
// Грузится лениво (React.lazy в виджете) — только когда ученик позвонил.
//
// Учёт минут — тот же, что у тьютора (useCallSession: отсчёт с появления агента,
// пульс вкладки, закрытие), только строка сессии заведена под своим id
// (api/assistant/call, lib/assistant/callUsage.js).

/**
 * @param {{ session: {token: string, url: string, room: string},
 *   onAsk: (q: {id: string, text: string, opening: boolean, sender: ReturnType<typeof createReplySender>}) => void,
 *   onCancel: (id: string) => void,
 *   onState: (s: {agentState: string, micOn: boolean, audioBlocked: boolean, userText: string}) => void,
 *   onEnded: (reason: 'disconnected'|'error'|'mic') => void,
 *   controlRef: {current: null | {hangUp: () => void, toggleMic: () => void, say: (text: string) => Promise<void>, startAudio: () => Promise<void>}} }} props
 */
export default function AssistantCall({ session, onAsk, onCancel, onState, onEnded, controlRef }) {
  return (
    <LiveKitRoom
      token={session.token}
      serverUrl={session.url}
      connect
      audio
      video={false}
      onDisconnected={() => onEnded('disconnected')}
      onError={() => onEnded('error')}
      onMediaDeviceFailure={() => onEnded('mic')}
      className="asst__room"
    >
      <RoomAudioRenderer />
      <CallLink
        roomName={session.room}
        onAsk={onAsk}
        onCancel={onCancel}
        onState={onState}
        controlRef={controlRef}
      />
    </LiveKitRoom>
  )
}

function CallLink({ roomName, onAsk, onCancel, onState, controlRef }) {
  const room = useRoomContext()
  const va = useVoiceAssistant()
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant()
  const { canPlayAudio, startAudio } = useAudioPlayback(room)
  const transcriptions = useTranscriptions()

  // Агент в комнате — с этого момента идут минуты (как у тьютора).
  const agentPresent =
    va.state !== 'disconnected' &&
    (Boolean(va.agent) || va.state === 'listening' || va.state === 'thinking' || va.state === 'speaking')
  const closeSession = useCallSession(roomName, agentPresent)
  const closeRef = useRef(closeSession)

  // Колбэки окна живут дольше одного рендера: обработчики RPC ставятся один раз.
  const cb = useRef({ onAsk, onCancel, onState })
  useLayoutEffect(() => {
    cb.current = { onAsk, onCancel, onState }
    closeRef.current = closeSession
  })

  useEffect(
    () =>
      attachCallBridge(room, {
        onAsk: ({ id, text, opening, agent }) =>
          cb.current.onAsk({ id, text, opening, sender: createReplySender(room, agent, id) }),
        onCancel: (id) => cb.current.onCancel(id),
      }),
    [room],
  )

  // Что ученик говорит сейчас — его последняя подпись (транскрипции LiveKit):
  // видно, что Луна его слышит, ещё до конца реплики.
  const userId = localParticipant?.identity
  const userText = useMemo(() => {
    const own = transcriptions.filter((ts) => ts.participantInfo?.identity === userId && ts.text.trim())
    const last = own.sort((a, b) => (a.streamInfo?.timestamp ?? 0) - (b.streamInfo?.timestamp ?? 0)).pop()
    return last?.text?.trim() || ''
  }, [transcriptions, userId])

  const agentState = agentPresent ? va.state : 'connecting'
  useEffect(() => {
    cb.current.onState({ agentState, micOn: isMicrophoneEnabled, audioBlocked: !canPlayAudio, userText })
  }, [agentState, isMicrophoneEnabled, canPlayAudio, userText])

  const agentId = va.agent?.identity || ''
  useLayoutEffect(() => {
    controlRef.current = {
      hangUp: () => {
        closeRef.current()
        room.disconnect()
      },
      toggleMic: () => localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled),
      say: (text) => sayInCall(room, agentId, text),
      startAudio,
    }
  })

  // Ушли с экрана, где Луна разрешена (экзамен), вышли из аккаунта — звонок
  // закрывается вместе с компонентом, и минуты больше не идут.
  useEffect(
    () => () => {
      closeRef.current()
      controlRef.current = null
    },
    [controlRef],
  )

  return null
}
