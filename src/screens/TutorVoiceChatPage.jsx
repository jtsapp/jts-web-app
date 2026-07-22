import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useVoiceAssistant,
  useLocalParticipant,
  useTranscriptions,
  useDataChannel,
} from '@livekit/components-react'
import { ConnectionState } from 'livekit-client'
import '@livekit/components-styles'
import TutorShell from '../tutor/TutorShell.jsx'
import { MicIcon, CheckIcon, CrossIcon } from '../tutor/TutorIcons.jsx'
import { useT, useLang } from '../i18n/LanguageContext.jsx'
import { getDeviceId, authHeaders } from '../lib/identity.js'

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
  scenario = null,
  // Интересы (англ. метки) и профессия из профиля — уходят в metadata комнаты,
  // чтобы тьютор цеплялся за темы ученика.
  interests = [],
  profession = '',
  // Токен аккаунта. Не путать с tokenData.token — тот выдаёт LiveKit для комнаты.
  token = null,
  // Бэкенд отверг токен аккаунта (401). Чистит сессию и уводит на вход.
  onSessionExpired,
}) {
  const t = useT()
  const { lang } = useLang()
  // Structured voice scenario id (e.g. 'visa-interview') — when set, the token
  // route flips the agent into scenario mode and loads the matching prompt
  // from data/scenarios/<id>.md. Mutually exclusive with scenarioPrompt below.
  const scenarioId = typeof scenario === 'string' ? scenario : scenario?.id || ''
  // Free-text scenario (admin-authored, INK AI tutor "Сценарии"): no local .md
  // file, no code changes needed on the agent - the "setup" text the admin
  // wrote goes straight into the room's plain `scenario` field, which the
  // agent already folds into a generic ROLEPLAY MODE system-prompt block.
  const scenarioPrompt =
    scenario && typeof scenario === 'object' && !scenario.id ? scenario.prompt || '' : ''
  const { name: tutorName = 'Спарк', avatar = '/tutor/tutor-spark.png' } = tutor

  const [perm, setPerm] = useState('prompt') // 'prompt' | 'granted'
  const [tokenData, setTokenData] = useState(null)
  // null | 'daily' | 'monthly' | 'mic' | 'expired' | 'generic'
  const [error, setError] = useState(null)

  // Разрешение на микрофон спрашиваем один раз: если браузер его уже помнит,
  // экран «дайте разрешение» не показываем — стартуем сразу. getUserMedia при
  // state==='granted' не открывает промпт, поэтому жест пользователя не нужен.
  // Нет Permissions API (старый Safari) или state 'prompt'/'denied' — как
  // раньше, кнопка с явным запросом.
  useEffect(() => {
    let cancelled = false
    navigator.permissions
      ?.query({ name: 'microphone' })
      .then((st) => {
        if (!cancelled && st.state === 'granted') requestMic()
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        // Bearer решает, чьей будет память сессии: с токеном сервер положит в
        // metadata user-<id>, без него — deviceId.
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({
          deviceId: getDeviceId(),
          level: user?.level || 'B1',
          lang,
          tutor: tutor.key,
          ...(interests.length ? { interests } : {}),
          ...(profession ? { profession } : {}),
          ...(scenarioId ? { scenarioId } : {}),
          ...(scenarioPrompt ? { scenario: scenarioPrompt } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 403 && data.limited) {
        setError(data.error === 'monthly_limit' ? 'monthly' : 'daily')
        return
      }
      // Токен аккаунта протух: бэкенд отверг его на /user/me. Без этой ветки 401
      // падал в 'generic' — «голосовой режим временно недоступен», хотя ломался
      // не голос, а сессия, и чинилась она перезаходом. Сбрасываем сессию, чтобы
      // App увёл на вход, а не оставлял залогиненным с мёртвым токеном.
      if (res.status === 401) {
        setError('expired')
        onSessionExpired?.()
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
          : error === 'expired'
            ? t('voice.expired')
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
            className="t-voice__room"
          >
            {/* Аудио-элементы вне визуального потока — иначе они расширяют
                обёртку и карточка съезжает влево. */}
            <div className="t-voice__audio">
              <RoomAudioRenderer />
            </div>
            <CallStage onFinish={onFinish} t={t} ttl={tokenData.ttl} />
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

// Обратный отсчёт до конца сессии — сервер отдаёт ttl (остаток секунд), токен
// LiveKit истекает ровно тогда же, так что таймер отражает реальный лимит.
function useCountdown(ttl) {
  const [left, setLeft] = useState(typeof ttl === 'number' ? ttl : null)
  useEffect(() => {
    if (typeof ttl !== 'number') return
    setLeft(ttl)
    const iv = setInterval(() => {
      setLeft((s) => (s !== null && s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(iv)
  }, [ttl])
  return left
}

function fmtClock(sec) {
  if (sec === null) return ''
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Внутри LiveKitRoom: состояние агента → класс орба, живая подпись, тумблер мика.
function CallStage({ onFinish, t, ttl }) {
  const state = useConnectionState()
  const va = useVoiceAssistant()
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant()
  const transcriptions = useTranscriptions()
  const left = useCountdown(ttl)

  // Scenario outcome — the agent publishes a JSON verdict on topic "lesson"
  // (report_task_complete) when a structured scenario ends. We render it as a
  // pass/fail card over the call.
  const [verdict, setVerdict] = useState(null)
  useDataChannel('lesson', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload))
      if (data && typeof data === 'object') setVerdict(data)
    } catch {
      /* ignore malformed payloads */
    }
  })

  const connected = state === ConnectionState.Connected
  const agentPresent = va.state !== 'disconnected' && Boolean(va.audioTrack)
  const live = connected && agentPresent && (va.state === 'speaking' || va.state === 'listening')

  // Субтитры ТЬЮТОРА — из agentTranscriptions (синхрон с аудио). Показываем
  // предложение, которое он произносит сейчас; держится, пока не дойдёт до
  // следующего сегмента. Липкая ссылка не даёт подписи гаснуть между сегментами.
  const tutorRef = useRef('')
  const tutorCaption = useMemo(() => {
    const segs = va.agentTranscriptions ?? []
    if (segs.length > 0) {
      const latest = [...segs]
        .sort((a, b) => (a.firstReceivedTime ?? 0) - (b.firstReceivedTime ?? 0))
        .pop()
      const s = lastSentence(latest?.text || '')
      if (s) tutorRef.current = s
    }
    return tutorRef.current
  }, [va.agentTranscriptions])

  // Субтитры УЧЕНИКА — его собственная речь (транскрипции локального участника),
  // чтобы он видел, что сказал.
  const userRef = useRef('')
  const userId = localParticipant?.identity
  const userCaption = useMemo(() => {
    const mine = transcriptions
      .filter((ts) => ts.participantInfo?.identity === userId && ts.text.trim())
      .sort((a, b) => (a.streamInfo?.timestamp ?? 0) - (b.streamInfo?.timestamp ?? 0))
    const last = mine[mine.length - 1]
    if (last) userRef.current = lastSentence(last.text)
    return userRef.current
  }, [transcriptions, userId])

  // Тьютор говорит → его строка (тёмная). Иначе — строка ученика (фиолетовая,
  // как в макете). Фолбэк-статусы, пока ни у кого нет реплики.
  const tutorSpeaking = va.state === 'speaking'
  let text
  let isUser = false
  if (tutorSpeaking && tutorCaption) {
    text = tutorCaption
  } else if (userCaption) {
    text = userCaption
    isUser = true
  } else if (tutorCaption) {
    text = tutorCaption
  } else {
    text = !connected ? t('voice.connecting') : !agentPresent ? t('voice.waiting') : t('voice.prompt')
  }

  const micOn = isMicrophoneEnabled
  const toggleMic = () => {
    void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
  }

  if (verdict) {
    const passed = Boolean(verdict.passed)
    const tips = Array.isArray(verdict.tips) ? verdict.tips.filter(Boolean) : []
    return (
      <div
        className={'t-voice__card t-verdict' + (passed ? ' is-pass' : ' is-fail')}
        role="status"
        aria-live="polite"
      >
        <span className="t-verdict__badge" aria-hidden="true">
          {passed ? <CheckIcon size={44} /> : <CrossIcon size={44} />}
        </span>
        <h2 className="t-verdict__title">
          {passed ? t('scen.verdictPass') : t('scen.verdictFail')}
        </h2>
        {verdict.summary && <p className="t-verdict__summary">{verdict.summary}</p>}
        {tips.length > 0 && (
          <div className="t-verdict__advice">
            <span className="t-verdict__eyebrow">{t('scen.verdictTips')}</span>
            <ul className="t-verdict__tips">
              {tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
        <button className="t-pill t-pill--primary t-verdict__done" type="button" onClick={onFinish}>
          {t('scen.verdictDone')}
        </button>
      </div>
    )
  }

  return (
    <div className="t-voice__card">
      {left !== null && (
        <span className={'t-voice__timer' + (left <= 30 ? ' is-low' : '')}>{fmtClock(left)}</span>
      )}
      <div
        className={'t-voice__orb' + (live ? ' is-live' : '')}
        onClick={onFinish}
        role={onFinish ? 'button' : undefined}
      />
      <div className="t-voice__text">
        <span className={'t-voice__cap' + (isUser ? ' is-user' : '')}>{text}</span>
      </div>
      <button className="t-voice__mic" type="button" onClick={toggleMic}>
        <MicIcon size={28} />
        {micOn ? t('voice.micOn') : t('voice.micOff')}
      </button>
    </div>
  )
}
