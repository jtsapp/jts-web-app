import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useVoiceAssistant,
  useLocalParticipant,
  useTranscriptions,
  useDataChannel,
  useRoomContext,
  useTrackVolume,
} from '@livekit/components-react'
import { ConnectionState, Track } from 'livekit-client'
import '@livekit/components-styles'
import TutorShell from '../tutor/TutorShell.jsx'
import TutorFace from '../tutor/TutorFace.jsx'
import JarvisOrb from '../tutor/JarvisOrb.jsx'
import TutorThumb from '../tutor/TutorThumb.jsx'
import { moodToEmotion } from '../tutor/avatarEmotions.js'
import { cutAtSec } from '../tutor/scenarioClock.js'
import ScenarioBrief from '../tutor/ScenarioBrief.jsx'
import { hasBrief } from '../tutor/scenarioBrief.js'
import { micLevel } from '../tutor/micLevel.js'
import { MicIcon, CheckIcon, CrossIcon } from '../tutor/TutorIcons.jsx'
import { useT, useLang } from '../i18n/LanguageContext.jsx'
import { getDeviceId, authHeaders } from '../lib/identity.js'
import { getEnglishOnly } from '../lib/englishOnly.js'

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
  // avatar сюда больше не разбираем: картинку рисует TutorThumb, а у Джарвиса
  // её нет вовсе — дефолт подставил бы ему аватарку Спарка.
  const { name: tutorName = 'Спарк' } = tutor

  const [perm, setPerm] = useState('prompt') // 'prompt' | 'granted'
  // Сцены с брифингом не стартуют сами: сначала ученик читает ситуацию и
  // нажимает «я готов». Влетать в звонок в 911, не зная, что ты видишь из
  // окна, — это провал не по английскому.
  const briefId = hasBrief(scenarioId) ? scenarioId : ''
  const [briefAck, setBriefAck] = useState(false)
  // Комнату по концу сцены удаляет агент, и до клиента это доезжает как обычный
  // разрыв. Без флага onDisconnected увёл бы ученика с экрана раньше, чем он
  // увидел «связь пропала» и результат. Снимает флаг только кнопка «Готово».
  const holdRef = useRef(false)
  const [tokenData, setTokenData] = useState(null)
  // null | 'daily' | 'monthly' | 'mic' | 'expired' | 'generic'
  const [error, setError] = useState(null)

  // Разрешение на микрофон спрашиваем один раз: если браузер его уже помнит,
  // экран «дайте разрешение» не показываем — стартуем сразу. getUserMedia при
  // state==='granted' не открывает промпт, поэтому жест пользователя не нужен.
  // Нет Permissions API (старый Safari) или state 'prompt'/'denied' — как
  // раньше, кнопка с явным запросом.
  useEffect(() => {
    // Разрешение уже есть, но сцена с брифингом ждёт кнопку — иначе гейт
    // мелькнёт и пропадёт.
    if (briefId && !briefAck) return
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
  }, [briefAck])

  // Комнату запрашиваем ровно один раз за экран. К этой функции ведут три
  // дороги — кнопка «разрешить», кнопка «я готов» и эффект по briefAck, — и
  // каждый лишний проход открывал ВТОРУЮ комнату со своим openSession. Брошенную
  // комнату потом добивал closeStaleSessions и списывал ученику минуты, которых
  // он не говорил.
  const micStartedRef = useRef(false)

  async function requestMic() {
    if (micStartedRef.current) return
    micStartedRef.current = true
    // Реальный запрос доступа к микрофону (жест пользователя).
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((tr) => tr.stop())
    } catch {
      // Отказ микрофона — не финал: ученик может разрешить и нажать ещё раз.
      micStartedRef.current = false
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
          // Тумблер с дашборда. Читаем в момент выдачи токена: внутри уже
          // начатого разговора настройка не меняется — промпт агента собирается
          // один раз на старте комнаты.
          ...(getEnglishOnly() ? { englishOnly: true } : {}),
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
      {/* Пока висит гейт со ситуацией, просьбы про микрофон быть не должно:
          иначе ученик жмёт «разрешить», следом «я готов» — и это два звонка. */}
      {perm !== 'granted' && !error && !(briefId && !briefAck) && (
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
          <TutorThumb tutor={tutor} className="t-status__avatar" />
          <div className="t-status__meta">
            <span className="t-status__name">{tutorName}</span>
            <span className="t-status__role">{t('role.tutor')}</span>
          </div>
        </div>

        {briefId && !briefAck ? (
          <ScenarioBrief
            scenarioId={briefId}
            action={
              <button
                className="t-pill t-pill--primary"
                type="button"
                // Микрофон здесь НЕ запрашиваем: briefAck перезапускает эффект
                // выше, и он сделает это сам. Дублирующий вызов открывал вторую
                // комнату.
                onClick={() => setBriefAck(true)}
              >
                {t('scen.briefReady')}
              </button>
            }
          />
        ) : error ? (
          <div className="t-voice__card">
            <CallFace face={tutor.face || ''} emotion="idle" agentState="idle" />
            <div className="t-voice__text">{errorText}</div>
          </div>
        ) : connected ? (
          <LiveKitRoom
            token={tokenData.token}
            serverUrl={tokenData.url}
            connect
            audio
            video={false}
            onDisconnected={() => {
              if (holdRef.current) return
              onFinish?.()
            }}
            className="t-voice__room"
          >
            {/* Аудио-элементы вне визуального потока — иначе они расширяют
                обёртку и карточка съезжает влево. */}
            <div className="t-voice__audio">
              <RoomAudioRenderer />
            </div>
            <CallStage
              onFinish={onFinish}
              t={t}
              ttl={tokenData.ttl}
              briefId={briefId}
              limitSec={tokenData.scenarioLimitSec || 0}
              holdRef={holdRef}
              face={tutor.face || ''}
            />
          </LiveKitRoom>
        ) : (
          <div className="t-voice__card">
            <CallFace face={tutor.face || ''} emotion="idle" agentState="idle" />
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

// Сколько держать реакцию на лице ПОСЛЕ того, как тьютор договорил. Сам тег
// приходит в начале реплики и попадает на лицо сразу: речь больше не занимает
// мимику (см. setSpeaking в avatarEngine.js), поэтому эмоция живёт всю реплику
// и ещё это окно. Раньше тег ждал конца озвучки — эмоцию, которой агент пометил
// фразу, ученик видел только когда фраза уже кончилась.
//
// Окно нужно, чтобы лицо потом вернулось к «слушаю»: иначе ученик не видит,
// что микрофон снова его. Цвет доезжает примерно за 1.6с (TAU_COLOR), так что
// окно короче ~3с читалось бы как вспышка.
const REACTION_MS = 4500

// Кнопка микрофона вынесена в отдельный компонент НЕ ради красоты: useTrackVolume
// обновляет стейт по несколько раз в секунду, и внутри CallStage это
// перерисовывало бы заодно лицо тьютора с липсинком. Здесь ререндер заперт в
// одной кнопке. Пороги и шкала — в micLevel(), там же объяснено зачем.
function MicButton({ track, listening, micOn, onClick, label }) {
  const volume = useTrackVolume(micOn && listening ? track : undefined)
  const level = micLevel(volume, { micOn, listening })
  return (
    <button
      className={'t-voice__mic' + (level > 0 ? ' is-hearing' : '')}
      style={level > 0 ? { '--mic-level': level.toFixed(2) } : undefined}
      type="button"
      onClick={onClick}
    >
      <MicIcon size={28} />
      {label}
    </button>
  )
}

// Аватар звонка: у обычных тьюторов — лицо, у Джарвиса — орб (tutors.js →
// face: 'orb'). Орбу эмоции не нужны, ему хватает состояния агента: он живёт
// свечением, а не мимикой.
//
// Уровень МИКРОФОНА орбу сюда намеренно не заводим — useTrackVolume тикает по
// несколько раз в секунду и перерисовывал бы весь CallStage (ровно поэтому он
// и заперт в MicButton, см. комментарий выше). Что ученика слышат, показывает
// кольцо на кнопке мика; орб отражает сторону тьютора.
function CallFace({ face, emotion, intensity, speaking, agentState, audioTrack }) {
  if (face === 'orb') {
    const state = ['listening', 'thinking', 'speaking'].includes(agentState) ? agentState : 'idle'
    return <JarvisOrb state={state} audioTrack={audioTrack} />
  }
  return (
    <TutorFace
      emotion={emotion}
      intensity={intensity}
      speaking={speaking}
      audioTrack={audioTrack}
    />
  )
}

// Внутри LiveKitRoom: состояние агента → выражение лица, живая подпись, тумблер мика.
function CallStage({ onFinish, t, ttl, briefId = '', limitSec = 0, holdRef, face = '' }) {
  const state = useConnectionState()
  const va = useVoiceAssistant()
  const room = useRoomContext()
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant()
  const transcriptions = useTranscriptions()
  // У сцены со своими часами на экране идёт её бюджет, а не остаток дневного
  // лимита: ученику обещали пять минут — он и должен видеть пять минут.
  const left = useCountdown(limitSec > 0 ? limitSec : ttl)

  // Scenario outcome — the agent publishes a JSON verdict on topic "lesson"
  // (report_task_complete) when a structured scenario ends. We render it as a
  // pass/fail card over the call.
  const [verdict, setVerdict] = useState(null)
  // Шпаргалка со ситуацией. Свёрнута по умолчанию: развёрнутая перекрывает лицо.
  const [peek, setPeek] = useState(false)
  useDataChannel('lesson', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload))
      // Первый вердикт побеждает. Сторож часов сцены просит агента закрыть сцену
      // отказом, и если ученик уже прошёл её на третьей минуте, второй вердикт
      // перевернул бы карточку с «пройдено» на «не пройдено» у него на глазах.
      if (data && typeof data === 'object') setVerdict((prev) => prev || data)
    } catch {
      /* ignore malformed payloads */
    }
  })

  // Обрыв на исходе бюджета сцены. По картинке авторитетен клиент: агент в этот
  // же момент шлёт вердикт и удаляет комнату, но экран результата не должен
  // зависеть от того, успел ли он.
  const [lineDead, setLineDead] = useState(false)
  const cutAt = cutAtSec(limitSec)
  useEffect(() => {
    if (cutAt === null || left === null || verdict) return
    const elapsed = limitSec - left
    if (elapsed < cutAt) return
    if (holdRef) holdRef.current = true
    setLineDead(true)
  }, [left, cutAt, limitSec, verdict, holdRef])

  // Показанный вердикт держит экран так же, как обрыв: комнату после сцены
  // удаляет агент, и без этого onDisconnected уводил ученика с карточки
  // результата раньше, чем он успевал её прочитать.
  useEffect(() => {
    if (verdict && holdRef) holdRef.current = true
  }, [verdict, holdRef])

  // Вердикт от агента ждём три секунды после обрыва, дальше рисуем свой: «не
  // успел» — это тоже результат, и ученик обязан его увидеть.
  useEffect(() => {
    if (!lineDead || verdict) return
    const id = setTimeout(() => {
      setVerdict({ passed: false, summary: t('scen.lineDeadHint'), tips: [] })
    }, 3000)
    return () => clearTimeout(id)
  }, [lineDead, verdict, t])

  // Эмоция тьютора. Тег приходит в начале реплики и сразу идёт на лицо — с ним
  // же тьютор её и произносит.
  const [reaction, setReaction] = useState(null)
  const reactionTimer = useRef(null)
  const stopReactionTimer = () => {
    if (reactionTimer.current) {
      clearTimeout(reactionTimer.current)
      reactionTimer.current = null
    }
  }

  useDataChannel('mood', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload))
      const key = moodToEmotion(data?.mood, Number(data?.intensity))
      const level = Number(data?.intensity)
      // Number.isInteger, а не только диапазон: 1.5 прошло бы `>= 1 && <= 3`,
      // а сила — это индекс в таблице подвижности, дробной она не бывает.
      if (key && Number.isInteger(level) && level >= 1 && level <= 3) {
        stopReactionTimer()
        setReaction({ key, level })
      }
    } catch {
      /* ignore malformed payloads */
    }
  })

  const connected = state === ConnectionState.Connected
  const agentPresent = va.state !== 'disconnected' && Boolean(va.audioTrack)
  const speaking = va.state === 'speaking'

  // Реакция держится всю реплику, а гаснет через окно после неё.
  useEffect(() => {
    if (speaking || !reaction || reactionTimer.current) return
    reactionTimer.current = setTimeout(() => {
      reactionTimer.current = null
      setReaction(null)
    }, REACTION_MS)
    // Таймер НАМЕРЕННО не снимается на смену speaking. Снять его — значит
    // оставить эмоцию от прошлой реплики висеть на следующей, если та пришла
    // без тега: гасить её тогда будет некому.
  }, [speaking, reaction])

  useEffect(() => stopReactionTimer, [])

  // Голос тьютора для липсинка. Берём сырой MediaStreamTrack: TrackReference
  // пересоздаётся на каждый ререндер, а трек внутри тот же — иначе эффект с
  // AudioContext пересобирался бы вхолостую по десятку раз за реплику.
  const agentTrack = va.audioTrack?.publication?.track?.mediaStreamTrack || null

  // Микрофон ученика — для индикации «слышу тебя» на кнопке (см. MicButton).
  const micTrack = localParticipant?.getTrackPublication(Track.Source.Microphone)?.track || undefined

  // Речи в этой лесенке нет: она не эмоция, а отдельный флаг ниже. Во время
  // реплики на лице то, чем её пометил агент, — а без тега просто нейтраль,
  // которая говорит.
  let emotion = 'idle'
  let intensity = 2
  if (!connected || !agentPresent) emotion = 'idle'
  else if (va.state === 'thinking') emotion = 'thinking'
  else if (reaction) {
    emotion = reaction.key
    intensity = reaction.level
  } else if (va.state === 'listening') emotion = 'listening'

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
  const tutorSpeaking = speaking
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

  // Явное завершение разговора. Раньше выйти можно было только кликом по орбу
  // (ничем не подписанным) или «назад», и минуты списывались только когда комната
  // закрывалась сама. Рвём соединение → onDisconnected у LiveKitRoom уводит на
  // onFinish, а room_finished-вебхук биллит сессию.
  const endCall = () => {
    if (room) void room.disconnect()
    else onFinish?.()
  }

  // Пауза между обрывом и результатом намеренная: удар должен дойти отдельно
  // от разбора, иначе «связь пропала» проскочит незамеченным.
  if (lineDead && !verdict) {
    return (
      <div className="t-voice__card t-linedead" role="status" aria-live="polite">
        <h2 className="t-linedead__title">{t('scen.lineDead')}</h2>
      </div>
    )
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
        <button
          className="t-pill t-pill--primary t-verdict__done"
          type="button"
          onClick={() => {
            if (holdRef) holdRef.current = false
            onFinish?.()
          }}
        >
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
      {briefId && (
        <button className="t-voice__peek" type="button" onClick={() => setPeek((v) => !v)}>
          {t('scen.briefPeek')}
        </button>
      )}
      {briefId && peek && (
        <div className="t-voice__peekpanel">
          <ScenarioBrief
            scenarioId={briefId}
            action={
              <button className="t-pill" type="button" onClick={() => setPeek(false)}>
                {t('scen.briefClose')}
              </button>
            }
          />
        </div>
      )}
      {/* Лицо не завершает звонок по клику: неподписанный клик по картинке
          рвал разговор случайным тапом. Завершение — явной кнопкой ниже. */}
      <CallFace
        face={face}
        emotion={emotion}
        intensity={intensity}
        speaking={speaking}
        agentState={va.state}
        audioTrack={agentTrack}
      />
      <div className="t-voice__text">
        <span className={'t-voice__cap' + (isUser ? ' is-user' : '')}>{text}</span>
      </div>
      <MicButton
        track={micTrack}
        listening={va.state === 'listening'}
        micOn={micOn}
        onClick={toggleMic}
        label={micOn ? t('voice.micOn') : t('voice.micOff')}
      />
      <button className="t-voice__end" type="button" onClick={endCall}>
        {t('voice.end')}
      </button>
    </div>
  )
}
