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
import TutorHero from '../tutor/TutorHero.jsx'
import TutorPortrait from '../tutor/TutorPortrait.jsx'
import SituationGrid from '../tutor/SituationGrid.jsx'
import { moodToEmotion } from '../tutor/avatarEmotions.js'
import { cutAtSec } from '../tutor/scenarioClock.js'
import ScenarioBrief from '../tutor/ScenarioBrief.jsx'
import { hasBrief } from '../tutor/scenarioBrief.js'
import { micLevel } from '../tutor/micLevel.js'
import { lastSentence } from '../tutor/captions.js'
import { useLiveCaption } from '../tutor/useLiveCaption.js'
import { useCallSession } from '../tutor/callSession.js'
import { MicIcon, MicLineIcon, MicOffIcon, CallEndIcon, CheckIcon, ClockIcon, CrossIcon } from '../tutor/TutorIcons.jsx'
import { useT, useLang } from '../i18n/LanguageContext.jsx'
import TutorLimitModal from '../components/TutorLimitModal.jsx'
import { getDeviceId, authHeaders } from '../lib/identity.js'
import { getEnglishOnly } from '../lib/englishOnly.js'
import { getPushToTalk } from '../lib/pushToTalk.js'
import { usePushToTalk } from '../tutor/usePushToTalk.js'

function ArrowUpIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 5l6 6-1.4 1.4L13 8.8V19h-2V8.8l-3.6 3.6L6 11l6-6z" fill="currentColor" />
    </svg>
  )
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
  // Нрав тьютора (ось 18+): 'calm' | 'harsh' | null. Меняет только характер,
  // не тьютора — голос, язык и аватар остаются те же.
  temper = null,
  scenario = null,
  // Интересы (англ. метки) и профессия из профиля — уходят в metadata комнаты,
  // чтобы тьютор цеплялся за темы ученика.
  interests = [],
  profession = '',
  // Токен аккаунта. Не путать с tokenData.token — тот выдаёт LiveKit для комнаты.
  token = null,
  // Бэкенд отверг токен аккаунта (401). Чистит сессию и уводит на вход.
  onSessionExpired,
  // Ведёт на витрину пакетов минут — кнопка «Докупить минуты» в окне лимита.
  onTopUpMinutes,
  // Кнопки шапки страницы тьютора: «Другие тьюторы» и «Управление тьютором».
  onChangeTutor,
  onManage,
  // Сцена из сетки под звонком: App открывает звонок заново с ней.
  onScenario,
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
  // «Положить трубку» изнутри комнаты (CallStage кладёт сюда endCall): сетка
  // ситуаций стоит вне LiveKitRoom, а закрыть сессию учёта и комнату надо так
  // же, как красной кнопкой.
  const hangupRef = useRef(null)
  const [tokenData, setTokenData] = useState(null)
  // Режим рации этого звонка. Не читаем localStorage прямо в рендере (SSR его
  // не видит, и первый клиентский рендер разошёлся бы с серверным): значение
  // ставим там же, где отправляем его в metadata, — так экран и агент точно
  // договорились об одном и том же режиме.
  const [pushToTalk, setPushToTalkMode] = useState(false)
  // null | 'daily' | 'monthly' | 'mic' | 'expired' | 'generic'
  const [error, setError] = useState(null)
  // Величина лимита, в который упёрлись (сек, с сервера) — для подписи окна.
  const [limitSec, setLimitSec] = useState(0)

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
    const ptt = getPushToTalk()
    setPushToTalkMode(ptt)
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
          // Нрав читаем в момент выдачи токена, как и englishOnly ниже: внутри
          // уже начатого разговора он не меняется — промпт агента собирается
          // один раз на старте комнаты.
          ...(temper ? { temper } : {}),
          // Тумблер с дашборда. Читаем в момент выдачи токена: внутри уже
          // начатого разговора настройка не меняется — промпт агента собирается
          // один раз на старте комнаты.
          ...(getEnglishOnly() ? { englishOnly: true } : {}),
          // Режим рации: снимает с агента детектор конца речи вовсе — ход
          // закрывает отпускание кнопки. Читаем здесь же и по той же причине:
          // сессия агента собирается один раз на старте комнаты.
          ...(ptt ? { pushToTalk: true } : {}),
          ...(interests.length ? { interests } : {}),
          ...(profession ? { profession } : {}),
          ...(scenarioId ? { scenarioId } : {}),
          ...(scenarioPrompt ? { scenario: scenarioPrompt } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 403 && data.limited) {
        // 'total_limit' раньше попадал в 'daily' и человек читал «приходите
        // завтра» — а завтра ничего не менялось: кончился пул минут тарифа,
        // а не суточная норма.
        const kind =
          data.error === 'monthly_limit' ? 'monthly' : data.error === 'total_limit' ? 'total' : 'daily'
        setError(kind)
        // Величину лимита показываем ту, что прислал сервер: у ученика может
        // стоять персональный override или лимит тарифа.
        setLimitSec(Number(data.limitSec) || 0)
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

  // Исчерпанный лимит — не ошибка звонка, а момент продажи: у него своё окно с
  // кнопкой «Докупить минуты» (TutorLimitModal). Строкой в карточке остаются
  // только настоящие сбои — микрофон, протухшая сессия, недоступный голос.
  const limited = error === 'daily' || error === 'monthly' || error === 'total'
  const errorText =
    error === 'mic'
      ? t('voice.micDenied')
      : error === 'expired'
        ? t('voice.expired')
        : error === 'generic'
          ? t('voice.unavailable')
          : ''

  const connected = Boolean(tokenData?.token && tokenData?.url)

  return (
    // Звонок — та же страница тьютора (макет 29.10.2026): шапка с лицом и
    // полосой микрофона вместо карточки настроек, ниже сетка ситуаций. Нижняя
    // панель телефона в кадрах звонка есть — она и стоит. Своей полосы «Назад»
    // нет: в макете её нет, а выход из звонка — красная трубка.
    <TutorShell active="tutor" user={user} onNavigate={onNavigate} onProfile={onProfile} layout="flow">
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

      <div className="t-voice tp-page">
        <TutorHero
          tutor={tutor}
          level={user?.level || 'A1'}
          onOthers={onChangeTutor}
          onManage={onManage}
          className="tp-hero--call"
        >
          {briefId && !briefAck ? (
            <div className="tp-call__card">
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
            </div>
          ) : error ? (
            <div className="tp-call">
              <CallFace tutor={tutor} lines={[errorText || t('voice.unavailable')]} />
              {limited && (
                <TutorLimitModal kind={error} limitSec={limitSec} onBack={onBack} onBuy={onTopUpMinutes} />
              )}
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
                tutor={tutor}
                ttl={tokenData.ttl}
                limitSec={tokenData.scenarioLimitSec || 0}
                holdRef={holdRef}
                roomName={tokenData.room || ''}
                pushToTalk={pushToTalk}
                hangupRef={hangupRef}
              />
            </LiveKitRoom>
          ) : (
            <div className="tp-call">
              <CallFace tutor={tutor} lines={[perm === 'granted' ? t('voice.connecting') : t('voice.permHint')]} />
            </div>
          )}
        </TutorHero>

        {/* Ситуации и под звонком, как в макете. Нажатие — «положить трубку и
            набрать эту сцену»: звонок закрывается без отчёта (он остаётся в
            истории), и App открывает новый (onScenario). */}
        <SituationGrid
          onScenario={(id) => {
            holdRef.current = true
            hangupRef.current?.()
            onScenario?.(id)
          }}
        />
      </div>
    </TutorShell>
  )
}

// Лицо и реплики без комнаты: соединение, ошибка. Та же раскладка, что в
// звонке, — экран не прыгает, когда комната поднимется.
function CallFace({ tutor, lines }) {
  return (
    <div className="tp-call__row">
      <TutorPortrait tutor={tutor} />
      <div className="tp-call__bubbles" role="status" aria-live="polite">
        {lines.filter(Boolean).map((line, i) => (
          <div className="tp-bubble" key={i}>
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}

// Обратный отсчёт до конца сессии — сервер отдаёт ttl (остаток секунд), токен
// LiveKit истекает ровно тогда же, так что таймер отражает реальный лимит.
//
// `running` включается, когда в комнату вошёл ТЬЮТОР: минуты на сервере тоже
// идут с этого момента (armSession в usage.js), и таймер обязан показывать то
// же самое. Пока идёт соединение, на экране полный остаток и он не тает.
function useCountdown(ttl, running = true) {
  const [left, setLeft] = useState(typeof ttl === 'number' ? ttl : null)
  useEffect(() => {
    if (typeof ttl !== 'number') return
    setLeft(ttl)
  }, [ttl])
  useEffect(() => {
    if (!running || typeof ttl !== 'number') return
    const iv = setInterval(() => {
      setLeft((s) => (s !== null && s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(iv)
  }, [running, ttl])
  return left
}

function fmtClock(sec) {
  if (sec === null) return ''
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Сколько держать реакцию на лице ПОСЛЕ того, как тьютор договорил. Тег
// приходит в начале реплики и держится всю реплику и ещё это окно. Потом лицо
// возвращается к «слушаю»: иначе ученик не видит, что микрофон снова его.
const REACTION_MS = 4500

// Волна в полосе микрофона (макет: точки тишины слева, столбики голоса
// справа). Это живая история громкости: каждые 70 мс в конец ленты встаёт
// столбик того, кто сейчас звучит — ученик (его микрофон) или тьютор (его
// дорожка), старое уезжает влево. Отдельный компонент НЕ ради красоты:
// useTrackVolume обновляет стейт по несколько раз в секунду, и внутри
// CallStage это перерисовывало бы заодно лицо тьютора. Пороги шкалы — в
// micLevel(), там же объяснено зачем.
const WAVE_BARS = 46
const WAVE_MS = 70
const WAVE_QUIET = 0.02

function Wave({ micTrack, micLive, agentTrack, agentLive }) {
  const mic = useTrackVolume(micLive ? micTrack : undefined)
  const agent = useTrackVolume(agentLive ? agentTrack : undefined)
  const level = Math.max(
    micLevel(mic, { micOn: micLive, listening: micLive }),
    agentLive ? Math.min(1, agent * 2.2) : 0,
  )
  const levelRef = useRef(0)
  levelRef.current = level
  const [bars, setBars] = useState(() => Array(WAVE_BARS).fill(0))
  useEffect(() => {
    const id = setInterval(() => {
      setBars((prev) => {
        const v = levelRef.current
        // Тишина тишину не сдвигает: лента стоит, а не бежит пустыми точками.
        if (v < WAVE_QUIET && prev.every((b) => b < WAVE_QUIET)) return prev
        return [...prev.slice(1), v]
      })
    }, WAVE_MS)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="tp-wave" aria-hidden="true">
      {bars.map((b, i) => (
        <span key={i} style={{ '--h': b.toFixed(2), '--i': (i / (WAVE_BARS - 1)).toFixed(2) }} />
      ))}
    </div>
  )
}

// Полоса микрофона из макета. «Свободно»: слева выключатель микрофона, по
// центру волна, справа красная трубка. «Рация»: волна сверху, под ней
// «Зажмите чтобы говорить» (пока держат — эфир ученика) и трубка.
//
// В рации волну ученика считаем от факта удержания, а не от мьюта: микрофон в
// рации включён весь звонок (лишнее выбрасывает агент), и по нему уже не
// понять, чья очередь.
function MicBar({ t, ptt, micOn, onToggleMic, holding, pointerHandlers, micTrack, listening, agentTrack, speaking, onEnd }) {
  const micLive = ptt ? holding : micOn && listening
  const wave = <Wave micTrack={micTrack} micLive={micLive} agentTrack={agentTrack} agentLive={speaking} />
  const end = (
    <button className="tp-mic__end" type="button" onClick={onEnd} aria-label={t('voice.end')} title={t('voice.end')}>
      <CallEndIcon size={24} />
    </button>
  )
  if (ptt) {
    return (
      <div className="tp-mic tp-mic--ptt">
        {wave}
        <div className="tp-mic__row">
          <button
            className={'tp-mic__hold t-voice__mic is-ptt' + (holding ? ' is-holding' : '')}
            type="button"
            {...(pointerHandlers || {})}
          >
            {holding ? <MicLineIcon size={24} /> : <MicOffIcon size={24} />}
            {t('voice.holdToTalk')}
          </button>
          {end}
        </div>
      </div>
    )
  }
  return (
    <div className="tp-mic">
      <button
        className={'tp-mic__toggle t-voice__mic' + (micOn ? '' : ' is-muted')}
        type="button"
        onClick={onToggleMic}
        aria-label={micOn ? t('voice.micOn') : t('voice.micOff')}
        title={micOn ? t('voice.micOn') : t('voice.micOff')}
      >
        {micOn ? <MicOffIcon size={24} /> : <MicLineIcon size={24} />}
      </button>
      {wave}
      {end}
    </div>
  )
}

// Внутри LiveKitRoom: состояние агента → выражение лица, реплики, микрофон.
// Экспорт — для теста полосы микрофона (TutorVoiceChatPage.test.jsx).
//
// Расшифровки, шпаргалки ситуации и переключателя «Рация | Свободно» в звонке
// нет — их нет в макете 29.10.2026 (решение владельца «пока строго по макету»).
// Режим выбирается до звонка, в карточке настроек страницы тьютора. Таймер
// лимита владелец вернул тем же днём — плашкой слева вверху шапки, где макет
// ничего не рисует (.tp-call__timer).
export function CallStage({
  onFinish,
  t,
  tutor = {},
  ttl,
  limitSec = 0,
  holdRef,
  roomName = '',
  pushToTalk = false,
  hangupRef,
}) {
  const state = useConnectionState()
  const va = useVoiceAssistant()
  const room = useRoomContext()
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant()
  const transcriptions = useTranscriptions()

  const connected = state === ConnectionState.Connected
  const agentPresent = va.state !== 'disconnected' && (
    Boolean(va.agent) || Boolean(va.audioTrack) || va.state === 'listening' || va.state === 'thinking'
  )
  const speaking = va.state === 'speaking'

  // Учётная сессия: минуты идут с появления тьютора в комнате и держатся
  // пульсом. Раньше сервер считал их от выдачи токена до room_finished, то есть
  // прихватывал и ожидание соединения, и время после того, как ученик положил
  // трубку (комната живёт дальше), а при потерянном вебхуке лимит вообще тёк
  // сам по себе, пока ученик читал разбор.
  const closeCallSession = useCallSession(roomName, agentPresent)

  // Рация. Ход открывает и закрывает ученик, поэтому детектора конца речи у
  // агента в этом режиме нет вовсе — см. usePushToTalk. Режим — тот, что ушёл
  // в metadata комнаты.
  const pttOn = pushToTalk
  const { holding, pointerHandlers, tapHint } = usePushToTalk({
    enabled: pttOn,
    room,
    agentIdentity: va.agent?.identity || '',
  })

  // У сцены со своими часами на экране идёт её бюджет, а не остаток дневного
  // лимита: ученику обещали пять минут — он и должен видеть пять минут. По этим
  // же часам обрывается линия (cutAtSec).
  const left = useCountdown(limitSec > 0 ? limitSec : ttl, agentPresent)

  // Scenario outcome — the agent publishes a JSON verdict on topic "lesson"
  // (report_task_complete) when a structured scenario ends. We render it as a
  // pass/fail card over the call.
  const [verdict, setVerdict] = useState(null)
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
      const level = Number(data?.intensity)
      const key = moodToEmotion(data?.mood, level)
      // Number.isInteger, а не только диапазон: 1.5 прошло бы `>= 1 && <= 3`,
      // а сила — это ступень шкалы агента, дробной она не бывает.
      if (key && Number.isInteger(level) && level >= 1 && level <= 3) {
        stopReactionTimer()
        setReaction(key)
      }
    } catch {
      /* ignore malformed payloads */
    }
  })

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

  // Микрофон ученика — для волны (см. Wave).
  const micTrack = localParticipant?.getTrackPublication(Track.Source.Microphone)?.track || undefined

  let emotion = 'idle'
  if (!connected || !agentPresent) emotion = 'idle'
  else if (va.state === 'thinking') emotion = 'thinking'
  else if (reaction) emotion = reaction
  else if (va.state === 'listening') emotion = 'listening'

  // Субтитры ТЬЮТОРА — из agentTranscriptions (синхрон с аудио). Показываем
  // предложение, которое он произносит сейчас.
  const tutorCaption = useMemo(() => {
    const segs = va.agentTranscriptions ?? []
    if (segs.length === 0) return ''
    const latest = [...segs]
      .sort((a, b) => (a.firstReceivedTime ?? 0) - (b.firstReceivedTime ?? 0))
      .pop()
    return lastSentence(latest?.text || '')
  }, [va.agentTranscriptions])

  // Субтитры УЧЕНИКА — его собственная речь (транскрипции локального участника),
  // чтобы он видел, что сказал.
  const userId = localParticipant?.identity
  const userStreams = useMemo(
    () => transcriptions.filter((ts) => ts.participantInfo?.identity === userId && ts.text.trim()),
    [transcriptions, userId]
  )
  const userCaption = useMemo(() => {
    const last = [...userStreams]
      .sort((a, b) => (a.streamInfo?.timestamp ?? 0) - (b.streamInfo?.timestamp ?? 0))
      .pop()
    return last ? lastSentence(last.text) : ''
  }, [userStreams])

  // Кто сказал последним (см. nextLive): реплика ученика встаёт вторым пузырём
  // под репликой тьютора, пока тьютор не заговорил снова.
  const live = useLiveCaption(tutorCaption, userCaption)
  const userTurn = Boolean(live.text) && live.isUser

  // Первый пузырь — реплика тьютора (до неё — статус соединения), второй —
  // ответ ученика, а пока его нет — «…»: макет так и рисует ожидание.
  const tutorLine =
    tutorCaption ||
    (!userTurn && live.text) ||
    (!connected ? t('voice.connecting') : !agentPresent ? t('voice.waiting') : t('voice.prompt'))

  const micOn = isMicrophoneEnabled
  const toggleMic = () => {
    void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
  }

  // Явное завершение разговора — красная трубка. Рвём соединение →
  // onDisconnected у LiveKitRoom уводит на onFinish.
  //
  // Сессию закрываем ДО disconnect: комната переживает уход ученика (агент её
  // не удаляет), room_finished придёт минутами позже или не придёт вовсе, а
  // считать эти минуты ученику не за что.
  const endCall = () => {
    closeCallSession()
    if (room) void room.disconnect()
    else onFinish?.()
  }
  useEffect(() => {
    if (!hangupRef) return undefined
    hangupRef.current = endCall
    return () => {
      hangupRef.current = null
    }
  })

  // Пауза между обрывом и результатом намеренная: удар должен дойти отдельно
  // от разбора, иначе «связь пропала» проскочит незамеченным.
  if (lineDead && !verdict) {
    return (
      <div className="tp-call__card t-linedead" role="status" aria-live="polite">
        <h2 className="t-linedead__title">{t('scen.lineDead')}</h2>
      </div>
    )
  }

  if (verdict) {
    const passed = Boolean(verdict.passed)
    const tips = Array.isArray(verdict.tips) ? verdict.tips.filter(Boolean) : []
    return (
      <div
        className={'tp-call__card t-verdict' + (passed ? ' is-pass' : ' is-fail')}
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
    <div className="tp-call">
      {/* Плашка стоит в углу шапки (position от .tp-hero), а не в потоке: так
          раскладка звонка остаётся кадром макета. */}
      {left !== null && (
        <span
          className={'tp-call__timer' + (left <= 30 ? ' is-low' : '')}
          role="timer"
          aria-label={t('voice.timeLeft')}
          title={t('voice.timeLeft')}
        >
          <ClockIcon size={18} />
          {fmtClock(left)}
        </span>
      )}
      <div className="tp-call__row">
        <TutorPortrait tutor={tutor} emotion={emotion} speaking={speaking} />
        <div className="tp-call__bubbles" aria-live="polite">
          <div className="tp-bubble">{tutorLine}</div>
          <div className={'tp-bubble' + (userTurn ? ' is-user' : ' is-wait')}>
            {userTurn ? live.text : t('voice.typing')}
          </div>
        </div>
      </div>
      <MicBar
        t={t}
        ptt={pttOn}
        micOn={micOn}
        onToggleMic={toggleMic}
        holding={holding}
        pointerHandlers={pointerHandlers}
        micTrack={micTrack}
        listening={va.state === 'listening'}
        agentTrack={va.audioTrack}
        speaking={speaking}
        onEnd={endCall}
      />
      {/* Тап вместо удержания — короткая подсказка «держи кнопку»: без неё
          рация выглядит сломанной. */}
      {pttOn && tapHint && (
        <span className="tp-call__hint" role="status">
          {t('voice.pttTapHint')}
        </span>
      )}
    </div>
  )
}
