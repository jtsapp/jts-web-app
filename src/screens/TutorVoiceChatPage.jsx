import { useMemo, useState } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useVoiceAssistant,
  useLocalParticipant,
  useTranscriptions,
} from '@livekit/components-react'
import { ConnectionState } from 'livekit-client'
import '@livekit/components-styles'
import TutorShell from '../tutor/TutorShell.jsx'
import { MicIcon } from '../tutor/TutorIcons.jsx'
import { useT, useLang } from '../i18n/LanguageContext.jsx'

// Стабильный id устройства — сервер по нему считает минуты (лимит 10/день).
function getDeviceId() {
  try {
    let id = localStorage.getItem('jts_device_id')
    if (!id) {
      id = 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem('jts_device_id', id)
    }
    return id
  } catch {
    return 'dev-ephemeral'
  }
}

function ArrowUpIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 5l6 6-1.4 1.4L13 8.8V19h-2V8.8l-3.6 3.6L6 11l6-6z" fill="currentColor" />
    </svg>
  )
}

// Последнее предложение текущей реплики — подпись сменяется, а не растёт.
function lastSentence(text) {
  const s = (text || '').trim()
  if (!s) return ''
  const parts = s.split(/(?<=[.!?…])\s+/)
  return (parts[parts.length - 1] || s).trim()
}

// Живой разговор: подключается к LiveKit-комнате (голосовой тьютор cascade),
// показывает орб по состоянию агента и живую подпись из транскрипций.
export default function TutorVoiceChatPage({
  user,
  onNavigate,
  onProfile,
  onBack,
  onFinish,
  tutor = {},
}) {
  const t = useT()
  const { lang } = useLang()
  const { name: tutorName = 'Спарк', avatar = '/tutor/tutor-spark.png' } = tutor

  const [perm, setPerm] = useState('prompt') // 'prompt' | 'granted'
  const [tokenData, setTokenData] = useState(null)
  // null | 'daily' | 'monthly' | 'mic' | 'generic'
  const [error, setError] = useState(null)

  async function requestMic() {
    // Реальный запрос доступа к микрофону (жест пользователя).
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((tr) => tr.stop())
    } catch {
      setError('mic')
      return
    }
    setPerm('granted')
    setError(null)
    try {
      const res = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: getDeviceId(),
          level: user?.level || 'B1',
          lang,
          tutor: tutor.key,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 403 && data.limited) {
        setError(data.error === 'monthly_limit' ? 'monthly' : 'daily')
        return
      }
      if (!res.ok || !data.configured || !data.token || !data.url) {
        setError('generic')
        return
      }
      setTokenData(data)
    } catch {
      setError('generic')
    }
  }

  const errorText =
    error === 'daily'
      ? t('voice.limitDaily')
      : error === 'monthly'
        ? t('voice.limitMonthly')
        : error === 'mic'
          ? t('voice.micDenied')
          : error === 'generic'
            ? t('voice.unavailable')
            : ''

  const connected = Boolean(tokenData?.token && tokenData?.url)

  return (
    <TutorShell active="tutor" user={user} onNavigate={onNavigate} onProfile={onProfile} onBack={onBack} layout="flow">
      {perm !== 'granted' && !error && (
        <div className="t-micperm" role="dialog" aria-label={t('voice.permHint')}>
          <div className="t-micperm__row">
            <span className="t-micperm__chips">
              <span className="t-micperm__chip t-micperm__chip--arrow">
                <ArrowUpIcon size={22} />
              </span>
              <span className="t-micperm__chip t-micperm__chip--mic">
                <MicIcon size={22} />
              </span>
            </span>
            <button className="t-micperm__allow" type="button" onClick={requestMic}>
              {t('voice.permAllow')}
            </button>
          </div>
          <p className="t-micperm__hint">{t('voice.permHint')}</p>
        </div>
      )}

      <div className="t-voice">
        <div className="t-status__head">
          <img className="t-status__avatar" src={avatar} alt="" />
          <div className="t-status__meta">
            <span className="t-status__name">{tutorName}</span>
            <span className="t-status__role">{t('role.tutor')}</span>
          </div>
        </div>

        {error ? (
          <div className="t-voice__card">
            <div className="t-voice__orb" />
            <div className="t-voice__text">{errorText}</div>
          </div>
        ) : connected ? (
          <LiveKitRoom
            token={tokenData.token}
            serverUrl={tokenData.url}
            connect
            audio
            video={false}
            onDisconnected={() => onFinish?.()}
            className="contents"
          >
            <RoomAudioRenderer />
            <CallStage onFinish={onFinish} t={t} />
          </LiveKitRoom>
        ) : (
          <div className="t-voice__card">
            <div className="t-voice__orb" />
            <div className="t-voice__text">
              {perm === 'granted' ? t('voice.connecting') : t('voice.permHint')}
            </div>
          </div>
        )}
      </div>
    </TutorShell>
  )
}

// Внутри LiveKitRoom: состояние агента → класс орба, живая подпись, тумблер мика.
function CallStage({ onFinish, t }) {
  const state = useConnectionState()
  const va = useVoiceAssistant()
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant()
  const transcriptions = useTranscriptions()

  const connected = state === ConnectionState.Connected
  const agentPresent = va.state !== 'disconnected' && Boolean(va.audioTrack)
  const live = connected && agentPresent && (va.state === 'speaking' || va.state === 'listening')

  const caption = useMemo(() => {
    const segs = [...transcriptions]
      .filter((ts) => ts.text.trim().length > 0)
      .sort((a, b) => (a.streamInfo?.timestamp ?? 0) - (b.streamInfo?.timestamp ?? 0))
    const last = segs[segs.length - 1]
    return last ? lastSentence(last.text) : ''
  }, [transcriptions])

  const text =
    caption || (!connected ? t('voice.connecting') : !agentPresent ? t('voice.waiting') : t('voice.prompt'))

  const micOn = isMicrophoneEnabled
  const toggleMic = () => {
    void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
  }

  return (
    <div className="t-voice__card">
      <div
        className={'t-voice__orb' + (live ? ' is-live' : '')}
        onClick={onFinish}
        role={onFinish ? 'button' : undefined}
      />
      <div className="t-voice__text">{text}</div>
      <button className="t-voice__mic" type="button" onClick={toggleMic}>
        <MicIcon size={28} />
        {micOn ? t('voice.micOn') : t('voice.micOff')}
      </button>
    </div>
  )
}
