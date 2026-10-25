import { Fragment, Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useI18n } from '../i18n.jsx'
import { OPEN_EVENT, navigateTo, setAssistantAvailable } from '../lib/assistant/assistantBus.js'
import { actionMarker } from '../lib/assistant/actions.js'
import { AssistantError, askAssistant } from '../lib/assistant/client.js'
import { destinationName, destinationOf } from '../lib/assistant/destinations.js'
import { installErrorLog, recentErrors } from '../lib/assistant/errorLog.js'
import { OPENING_MARK, WAKE_MARK, screenStateKey } from '../lib/assistant/opening.js'
import { snapshotScreen, snapshotWithRefs } from '../lib/assistant/screenSnapshot.js'
import { pressButton } from '../lib/assistant/clicker.js'
import { playCue } from '../lib/assistant/cue.js'
import { findCommandButtons, matchCommand, stripWake, wakeTail } from '../lib/assistant/voiceCommands.js'
import { wakeSet } from '../lib/assistant/wake/matchWake.js'
import { DEFAULT_PLACE, LAUNCHER_SIZE, clampPos, panelSize, placeRect, readPlace, toAnchor, writePlace } from '../lib/assistant/placement.js'
import { useIntroHint } from '../lib/assistant/introHint.js'
import { assistantPersona } from '../lib/assistant/persona.js'
import { createSpeechChunker } from '../lib/assistant/speechChunks.js'
import { callSpeech, createCallTourVoice } from '../lib/assistant/callBridge.js'
import { assistantCallHidden } from '../lib/assistant/callGate.js'
import { useVoiceQuestion } from '../lib/assistant/useVoiceQuestion.js'
import { createTourVoice, stepPhrases } from '../lib/assistant/tourVoice.js'
import { createVoiceQueue } from '../lib/assistant/voiceQueue.js'
import { useWakeWord } from '../lib/assistant/wake/useWakeWord.js'
import { unlockSpeech } from '../lib/speech.js'
import { cancelTourRequest, onTourEvent, requestTour, setTourNarration, tourRequestPending } from '../lib/tourBus.js'

// Помощник по сайту — Луна: плавающая кнопка и окно чата поверх любого экрана
// ученика. Где он показывается — решает App (lib/assistant/visibility.js).
//
// Смонтирован на уровне App, вне обёртки экрана с key, поэтому переходы между
// экранами разговор не сбрасывают: можно спросить на уроке, открыть «Практику»
// и продолжить. Разговор живёт только в памяти вкладки и сбрасывается при
// смене ученика — хранить его дольше незачем.
//
// Снимок экрана снимается в момент отправки вопроса из `.scr-in` — обёртки
// текущего экрана в App. Сам виджет лежит вне неё и в снимок не попадает
// (для надёжности ещё и помечен data-assistant-ignore).
//
// Голос — «голос на голос» (решение владельца 14.10.2026): вопрос, сказанный в
// микрофон, получает ответ голосом сразу, по мере того как он пишется;
// набранный текстом — только текстом. Озвучку можно выключить кнопкой в шапке.
//
// Действия (15.10.2026): Луна умеет открыть раздел и провести тур по экрану
// (lib/assistant/actions.js, destinations.js). Предложение — кнопка под её
// ответом; «открой» / «да» — переход сразу, по концу ответа. Переход делает App
// (navigateTo → handleNav), тур — сам экран, как по своей кнопке «?»
// (tourBus.js); Луна только просит и потом читает шаги тура вслух. Тур она
// озвучивает и на набранный вопрос: голос — и есть «объясняет, куда нажимать»;
// выключается той же кнопкой звука (и в шапке, и в карточке тура).
//
// Нажатия (21.10.2026, владелец: «больше прав — нажимать на кнопки»): снимок вопроса
// нумерует кнопки, Луна просит нажать по номеру, окно жмёт (clicker.js) — сразу, не
// дожидаясь голоса: нажатие не уводит с экрана, а «нажимаю…» голосом только задержало
// бы его. Что можно жать, решает код (clickPolicy.js), а не модель.
//
// Первая реплика (15.10.2026, владелец: «реальный преподаватель», «когда
// открываешь — подсказать, что правильно, что нет, и что сделать сейчас»): с
// greetOnOpen Луна, открыв окно, заговаривает сама — смотрит на экран и советует,
// чем заняться (lib/assistant/opening.js). Голосом, если звук не выключен:
// открытие окна — нажатие, iPhone звук разрешит. Один раз на состояние экрана:
// закрыл и открыл, ничего не поменяв, — она не повторяется (каждая реплика —
// платный вызов модели). Не вышло (лимит, сеть) — молча обычное приветствие с
// подсказками, без плашки ошибки: ученик ни о чём не спрашивал.
//
// Текст вслед за голосом (живой прогон 15.10.2026): ответ модели доезжает за
// 1–2 с, а голос Gemini — через 3–7 с (синтез не потоковый), и ученик читал
// ответ в тишине, а «открываю Практику» уводило его в раздел раньше, чем Луна
// заговорила. Теперь у озвучиваемого ответа фраза появляется, когда Луна
// начинает её говорить (held), до того — строка «Думаю… / Смотрю на экран… /
// Сейчас скажу…» (StatusBubble), а переход и тур — когда она договорила.
//
// Размер и место (16.10.2026, комментарий руководства: «уменьшить, чтобы не
// мешал при работе с платформой; по команде — больше, как телефон на экране
// компьютера; перемещать окно»): по умолчанию окно компактное, кнопка в шапке
// разворачивает его до размера телефона. Кнопку и окно можно перетащить — за
// шапку окна или за саму кнопку, место запоминается на устройстве
// (lib/assistant/placement.js), двойной клик по шапке возвращает в угол. Размер
// не запоминается: после перезагрузки окно снова компактное.
//
// Звонок (16.10.2026, руководство: «максимально приближенно к Speaking Buddy»):
// кнопка в шапке звонит Луне в реальном времени. Слушает и говорит агент LiveKit
// голосом Луны (AssistantCall, agent/assistant_call.py), а ответ на каждую его
// реплику пишет ЭТОТ виджет тем же /api/assistant/chat — со снимком экрана,
// контекстом ученика и метками действий. Поэтому в звонке Луна видит экран,
// объясняет ошибки, открывает разделы и водит турами так же, как в чате:
// разговор идёт в тот же список сообщений, «открываю…» выполняется, когда она
// договорила, шаги тура читает голос звонка. Окно можно закрыть — звонок
// продолжается, кнопка Луны показывает, что она на связи.
//
// Позывной (16.10.2026, «Луна» — с 19.10, команды — с 21.10): «Луна, дальше» — быстрая
// команда (voiceCommands.js) жмёт кнопку сама, без модели; «Луна, нажми «Начать урок»»
// одним духом — звук, снятый «ухом», уходит в распознавание и модели; одно «Луна» —
// сигнал «слушаю» и одна команда, а промолчал — прежнее приветствие с окном: Луна
// здоровается и, договорив, слушает ОДИН ответ. Дальше — кнопкой: разговор без кнопок
// владелец отменил 15.10 (для разговора есть звонок). На команду окно не открывается
// (решение владельца 21.10.2026): у кнопки плашка «Слушаю вас → Нажала «Далее»», окно —
// когда ответ объяснение или предложение. Распознаёт позывной само устройство
// (lib/assistant/wake/), включает его ученик переключателем в окне; во время звонка
// «ухо» выключено — микрофон у звонка. Те же быстрые команды — и у микрофона окна,
// набранного текста и звонка.

const MAX_INPUT = 2000
// Зазор между кнопкой и облачком-знакомством (хвостик облачка — 7 px).
const HINT_GAP = 14
// Плашка голосовой команды (CmdBadge): высота и зазор до кнопки — макет «При вызове
// Луны» (24 px при кнопке 72, у нас кнопка 56 — ореол меньше, и зазор с ним). Сколько
// плашка «втягивается» в кнопку, уходя, — переход макета (0.2 с), держит и assistant.css.
const BADGE_H = 32
const BADGE_GAP = 20
const BADGE_OUT_MS = 200
// Тур не начался за это время (экран без тура, данные не доехали) — честно
// говорим об этом, а не молчим. Чуть больше срока жизни заявки в tourBus.
const TOUR_START_TIMEOUT_MS = 10_500
// Первый шаг тура ждёт, пока Луна договорит ответ («начинаю тур»), но не
// дольше: очередь ответа, которую оборвал чужой звук, конца уже не сообщит.
const REPLY_WAIT_MAX_MS = 8_000
// Состояние тура «Луна не ведёт» (guideRef в компоненте).
const GUIDE_OFF = { on: false, screen: null, waitReply: false, pending: false, lastKey: null, lastPhrases: [], timer: null, waitTimer: null }
const PHONE_QUERY = '(max-width: 720px)'
// Текст озвучиваемого ответа ждёт первого звука, но не дольше: первая фраза
// (≤ FIRST_MAX символов) у Gemini — до ~5 с; дольше — синтез завис или ушёл в
// запасной путь, и смотреть на «Сейчас скажу…» без конца ученик не должен.
const FIRST_SOUND_MAX_MS = 9_000
// «Открываю…» ждёт, пока Луна договорит, — но не дольше (зависший синтез).
const ACTION_WAIT_MAX_MS = 30_000
// Облачко голосовой команды: сколько висит «нажала», сколько Луна ждёт команду после
// одного «Луна» (дальше — прежнее приветствие), глухота «уха» после команды.
const CMD_SHOW_MS = 2500
const WAKE_LISTEN_MS = 6000
const FAST_COOLDOWN_MS = 1500

// Строка ожидания: что Луна делает, пока ответа не видно. Сменяется по
// времени — одно «Думаю…» на шесть секунд выглядит как зависание.
const STATUS_STEPS = {
  thinking: [
    { key: 'assistant.thinking', ms: 2_200 },
    { key: 'assistant.status.looking', ms: 2_800 },
    { key: 'assistant.status.searching' },
  ],
  // Первая реплика: ученик ничего не спрашивал — Луна смотрит на его экран.
  opening: [
    { key: 'assistant.status.looking', ms: 2_800 },
    { key: 'assistant.thinking', ms: 2_800 },
    { key: 'assistant.status.advice' },
  ],
  // Ответ готов, голос синтезируется.
  voicing: [
    { key: 'assistant.status.voicing', ms: 3_500 },
    { key: 'assistant.status.almost' },
  ],
}

function StatusBubble({ phase, t }) {
  const steps = STATUS_STEPS[phase] || STATUS_STEPS.thinking
  const [i, setI] = useState(0)
  const step = steps[Math.min(i, steps.length - 1)]
  useEffect(() => {
    if (!step.ms) return undefined
    const id = setTimeout(() => setI((n) => n + 1), step.ms)
    return () => clearTimeout(id)
  }, [step])
  return (
    <div className="asst__msg asst__msg--bot asst__msg--typing asst__status" role="status">
      <span className="asst__dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {t(step.key)}
    </div>
  )
}

// Плашка голосовой команды у кнопки (макет Figma «Помощник» → «При вызове Луны», 22.10.2026):
// ученик позвал по имени — из-за кнопки выезжает плашка цвета фона аватарки («Слушаю вас»),
// а вокруг кнопки расходится ореол (.asst__halo). Уходя, плашка втягивается обратно в кнопку,
// поэтому живёт дольше самой команды: { out: true } — ещё BADGE_OUT_MS на анимацию ухода.
// Открытое окно убирает её сразу: кнопки, в которую втягиваться, тогда не видно.
function useBadge(want, open) {
  const [badge, setBadge] = useState(null) // { phase, label, out }
  if (want && (!badge || badge.out || badge.phase !== want.phase || badge.label !== want.label)) {
    setBadge({ phase: want.phase, label: want.label, out: false })
  } else if (!want && badge && (open || !badge.out)) {
    setBadge(open ? null : { ...badge, out: true })
  }
  useEffect(() => {
    if (!badge?.out) return undefined
    const id = setTimeout(() => setBadge(null), BADGE_OUT_MS)
    return () => clearTimeout(id)
  }, [badge])
  return badge
}

function CmdBadge({ badge, style, free, below, t }) {
  const ref = useRef(null)
  const innerRef = useRef(null)
  const text = t(`assistant.cmd.${badge.phase}`, { label: badge.label })
  // В макете растёт сама рамка (smart animate ширины), а не масштаб: текст не тянется,
  // концы плашки остаются круглыми. «auto» не анимируется — ширину содержимого плашка
  // берёт в пикселях и ставит переменной (assistant.css: width, @keyframes asst-badge-in).
  useLayoutEffect(() => {
    const w = innerRef.current?.getBoundingClientRect().width
    if (w) ref.current.style.setProperty('--asst-badge-w', `${Math.ceil(w)}px`)
  }, [text, badge.phase])
  const icon = badge.phase === 'listening' ? 'mic' : badge.phase === 'thinking' ? 'dots' : null
  return (
    <div
      ref={ref}
      className={`asst__badge${free ? ' is-free' : ''}${below ? ' is-below' : ''}${badge.out ? ' is-out' : ''}`}
      style={style}
      role="status"
      aria-live="polite"
      aria-hidden={badge.out || undefined}
      data-cmd={badge.phase}
    >
      <span ref={innerRef} className={`asst__badge-in${icon ? '' : ' is-plain'}`}>
        {icon === 'mic' && <MicGlyph />}
        {icon === 'dots' && (
          <span className="asst__dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        )}
        <span>{text}</span>
      </span>
    </div>
  )
}

// На телефоне окно чата закрывает экран целиком: открыв раздел, Луна убирает
// окно, иначе ученик не увидит, куда его привели.
function isPhone() {
  try {
    return window.matchMedia(PHONE_QUERY).matches
  } catch {
    return false
  }
}

// Двигать окно можно только на компьютере: на телефоне оно — лист снизу во всю
// ширину (assistant.css), и место ему задаёт CSS.
function subscribePhone(cb) {
  let mq
  try {
    mq = window.matchMedia(PHONE_QUERY)
  } catch {
    return () => {}
  }
  mq.addEventListener?.('change', cb)
  return () => mq.removeEventListener?.('change', cb)
}
const usePhone = () => useSyncExternalStore(subscribePhone, isPhone, () => false)

// Размер экрана — только после гидратации: на сервере его нет, и до первого
// эффекта кнопка стоит по CSS (правый нижний угол) — разметка совпадает.
function useViewport() {
  const [vp, setVp] = useState(null)
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return vp
}

// Сдвиг меньше — это нажатие, а не перетаскивание: рука дрожит при клике.
const DRAG_THRESHOLD = 4
const viewportNow = () => ({ w: window.innerWidth, h: window.innerHeight })

// Подпись действия, когда в ответе нет своего текста (и для озвучки).
function actionCaption(action, lang, t) {
  if (action.kind === 'click') return t(action.now ? 'assistant.action.clicking' : 'assistant.action.offerClick', { label: action.label })
  const name = destinationName(action.target, lang)
  const tour = action.kind === 'tour'
  const key = action.now
    ? (tour ? 'assistant.action.touring' : 'assistant.action.opening')
    : (tour ? 'assistant.action.offerTour' : 'assistant.action.offerOpen')
  return t(key, { name })
}

const SCREEN_ROOT = '.scr-in'
// Аватар — persona.avatar (lib/assistant/persona.js): уменьшенные копии
// public/tutor/tutor-<имя>.png — кнопка висит на каждом экране, и 170 КБ
// оригинала ради круга в 56px — лишний вес. При казахском интерфейсе помощник —
// Айзере: её аватар, имя (казахский словарь i18n), голос и тон.
// Компонент звонка подтягивается только по нажатию «Позвонить»: звонят Луне
// редко, а виджет висит на каждом экране (сам livekit-client уже в общем
// бандле — его статически тянет экран тьютора).
const AssistantCall = lazy(() => import('./AssistantCall.jsx'))
// Агент не зашёл в комнату за это время — звонок не состоялся, говорим как есть.
const CALL_AGENT_WAIT_MS = 20_000
// Часы звонка — только в обработчиках и таймерах, не при рендере.
const clockNow = () => Date.now()
// Первая фраза ответа в звонке (см. callAsk): короче, чем в окне.
const CALL_FIRST_MIN = 12
const CALL_FIRST_MAX = 60
const MUTE_KEY = 'jts_assistant_voice_muted'

const VOICE_ERRORS = {
  denied: 'assistant.mic.denied',
  not_heard: 'assistant.mic.notHeard',
  stt_failed: 'assistant.mic.failed',
  auth: 'assistant.err.auth',
}

const WAKE_ERRORS = {
  denied: 'assistant.wake.denied',
  model: 'assistant.wake.modelFailed',
  mic: 'assistant.wake.micFailed',
}

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function writeMuted(value) {
  try {
    if (value) localStorage.setItem(MUTE_KEY, '1')
    else localStorage.removeItem(MUTE_KEY)
  } catch {
    /* приватный режим — выбор проживёт до перезагрузки */
  }
}

const clock = (sec) => {
  const s = Math.max(0, Math.floor(sec || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function MicIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// Микрофон плашки «Слушаю вас» — иконка icon/mic макета (Figma «Помощник», экспорт SVG),
// залитая, а не контурная, как MicIcon у поля ввода.
function MicGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6.584 8.75C6.195 8.361 6.001 7.889 6.001 7.333V3.333C6.001 2.777 6.195 2.305 6.584 1.916C6.973 1.527 7.445 1.333 8.001 1.333C8.556 1.333 9.028 1.527 9.417 1.916C9.806 2.305 10.001 2.777 10.001 3.333V7.333C10.001 7.889 9.806 8.361 9.417 8.75C9.028 9.139 8.556 9.333 8.001 9.333C7.445 9.333 6.973 9.139 6.584 8.75ZM7.334 14V11.95C6.178 11.794 5.223 11.278 4.467 10.4C3.712 9.522 3.334 8.5 3.334 7.333H4.667C4.667 8.255 4.992 9.041 5.642 9.691C6.292 10.341 7.078 10.666 8.001 10.666C8.923 10.666 9.709 10.341 10.359 9.691C11.009 9.041 11.334 8.255 11.334 7.333H12.667C12.667 8.5 12.29 9.522 11.534 10.4C10.778 11.278 9.823 11.794 8.667 11.95V14H7.334ZM8.476 7.808C8.603 7.68 8.667 7.522 8.667 7.333V3.333C8.667 3.144 8.603 2.986 8.476 2.858C8.348 2.73 8.19 2.666 8.001 2.666C7.812 2.666 7.653 2.73 7.526 2.858C7.398 2.986 7.334 3.144 7.334 3.333V7.333C7.334 7.522 7.398 7.68 7.526 7.808C7.653 7.936 7.812 8 8.001 8C8.19 8 8.348 7.936 8.476 7.808Z"
        fill="currentColor"
      />
    </svg>
  )
}

function SizeIcon({ big }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {big ? (
        <path d="M10 4v6H4M14 20v-6h6M10 10 4 4m10 10 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M4 10V4h6M20 14v6h-6M4 4l6 6m10 10-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

function PhoneIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MicOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 9v2a3 3 0 0 0 5.1 2.1M15 10V6a3 3 0 0 0-5.7-1.3M5 11a7 7 0 0 0 11.5 5.4M19 11a7 7 0 0 1-.6 2.8M12 18v3M4 4l16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function NewChatIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SoundIcon({ muted }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {muted ? (
        <path d="m17 9 4 6m0-6-4 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  )
}

// **жирный** и списки «- » — всё форматирование, которое разрешено помощнику
// (см. prompt.js). Текст идёт в React как текст, не как HTML.
function RichText({ text }) {
  const lines = text.split('\n')
  const blocks = []
  let list = null
  const inline = (line) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') && part.length > 4
        ? <b key={i}>{part.slice(2, -2)}</b>
        : <Fragment key={i}>{part}</Fragment>,
    )
  lines.forEach((line, i) => {
    const item = /^\s*[-•]\s+(.*)$/.exec(line)
    if (item) {
      if (!list) {
        list = []
        blocks.push({ type: 'ul', items: list, key: i })
      }
      list.push(item[1])
      return
    }
    list = null
    if (line.trim()) blocks.push({ type: 'p', text: line, key: i })
  })
  return blocks.map((b) =>
    b.type === 'ul'
      ? <ul key={b.key}>{b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ul>
      : <p key={b.key}>{inline(b.text)}</p>,
  )
}

// enabled=false — экран, где помощника быть не должно (экзамен, живой урок):
// окно закрывается и кнопка пропадает, но разговор остаётся и вернётся вместе
// с кнопкой на следующем обычном экране.
export default function AssistantWidget({ token, screen, enabled = true, greetOnOpen = false }) {
  const { t, lang } = useI18n()
  const persona = assistantPersona(lang)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([]) // {role, content, voice?, opening?, offtopic?, reported?, voiceFailed?}
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null) // {text, retry: {text, voice}|null}
  // Выбор «без озвучки» запоминается на устройстве. Читаем сразу: на сервере
  // выйдет false, но расхождения при гидратации нет — кнопка звука рисуется
  // только после голосового вопроса, а в первой разметке окно закрыто.
  const [muted, setMuted] = useState(readMuted)
  // Место кнопки и окна (одно на двоих) и размер окна — см. шапку файла.
  const [place, setPlace] = useState(readPlace)
  const [size, setSize] = useState('compact')
  const phone = usePhone()
  const vp = useViewport()
  const free = Boolean(vp) && !phone
  const panelRef = useRef(null)
  const launcherRef = useRef(null)
  const dragRef = useRef(null)
  // Кнопку только что перетащили — отпускание не должно открыть окно.
  const draggedRef = useRef(false)
  // Звонок Луне (см. шапку): null — нет звонка; { phase: 'starting' } — ждём
  // микрофон и токен; { phase: 'live', session, agentState, micOn, audioBlocked,
  // userText, since } — идёт.
  const [call, setCall] = useState(null)
  const [callThinking, setCallThinking] = useState(false)
  // Строка «звонок завершён» после конца, который ученик не нажимал сам.
  const [callNote, setCallNote] = useState(null)
  const callCtlRef = useRef(null) // кнопки звонка (AssistantCall: hangUp, toggleMic, say, startAudio)
  const callAskRef = useRef(null) // { id, controller } — ответ звонку, который сейчас пишется
  // Черновой ход звонка (упреждающая генерация агента): id → { visible, queue }.
  // Ответ уже готовится, а переписку он тронет только по luna.commit (callCommit).
  const callDraftsRef = useRef(new Map())
  const callActionRef = useRef(null) // { action, spoke, timer } — «открываю…» ждёт конца её реплики
  const callSeqRef = useRef(0) // номер нажатия «Позвонить»: поздний токен отменённого — в мусор
  const hangingUpRef = useRef(false)
  // Комната идущего звонка. LiveKit может прислать «отключено» ещё раз, уже
  // снимаясь со страницы, — такое событие относится к звонку, которого нет.
  const liveCallRef = useRef(null)
  const callLive = call?.phase === 'live'
  const abortRef = useRef(null)
  const listRef = useRef(null)
  const inputRef = useRef(null)
  // Озвучка текущего ответа: её обрывают печать, новый вопрос, закрытие окна.
  const voiceRef = useRef(null)
  // Виджет снят (выход из аккаунта): распознавание, вернувшееся позже, не
  // должно задать вопрос от имени вышедшего ученика и заговорить на экране входа.
  const mountedRef = useRef(false)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])
  // Вопрос в пути. Отдельно от busy: два клика подряд успевают до перерисовки,
  // и по одному busy ушли бы два одинаковых вопроса.
  const inFlightRef = useRef(false)
  // Актуальные значения для send и обработчика события открытия: они живут
  // дольше одного рендера и иначе видели бы устаревший разговор.
  const stateRef = useRef(null)
  // Именно layout-эффект, а не useEffect: пассивный эффект отрабатывает ПОСЛЕ отрисовки, и «Повторить»,
  // нажатая сразу, как показалась ошибка, успевала прочитать разговор прошлого рендера — [вопрос, пустой
  // ответ] — и слала три сообщения вместо одного (так падал тест на медленном раннере CI, 06.10).
  // Layout-эффект идёт внутри коммита, до любого события.
  useLayoutEffect(() => {
    stateRef.current = { messages, screen, token, lang, persona, enabled, muted, t, greetOnOpen, callLive, callRoom: call?.session?.room || null, open }
  })
  // Состояние экрана, о котором Луна уже сказала первую реплику (opening.js).
  const greetedRef = useRef(null)
  // Первая реплика в пути: { base } — разговор до неё, на случай если ученик
  // спросит раньше, чем она договорит (см. send).
  const openingRef = useRef(null)

  // Озвучиваемый ответ: сообщение с этим vid видно до символа shown (см. шапку).
  // null — всё видно. Отдельно от messages: разговор уходит в историю
  // следующего вопроса, а «сколько показано» — забота только экрана.
  const [held, setHeld] = useState(null) // {vid, shown}
  const vidRef = useRef(0)
  const releaseHold = useCallback((vid) => {
    setHeld((h) => (h && (vid == null || h.vid === vid) ? null : h))
  }, [])

  // Облачко голосовой команды у кнопки (окно закрыто): { phase, label }, phase —
  // listening | thinking | pressed | missing; ms — сколько висеть (без него — до смены).
  const [cmd, setCmd] = useState(null)
  const cmdTimerRef = useRef(null)
  const showCmd = useCallback((phase, { label = '', ms = 0 } = {}) => {
    clearTimeout(cmdTimerRef.current)
    setCmd(phase ? { phase, label } : null)
    if (phase && ms) cmdTimerRef.current = setTimeout(() => setCmd(null), ms)
  }, [])
  useEffect(() => () => clearTimeout(cmdTimerRef.current), [])

  // Действие «сейчас» (открыть раздел, тур) ждёт, пока Луна договорит ответ:
  // { action, owner — очередь озвучки этого ответа, timer }.
  const deferredRef = useRef(null)
  const performRef = useRef(null)
  const dropDeferred = useCallback(() => {
    clearTimeout(deferredRef.current?.timer)
    deferredRef.current = null
  }, [])
  const runDeferred = useCallback((owner) => {
    const d = deferredRef.current
    if (!d || (owner && d.owner !== owner)) return
    clearTimeout(d.timer)
    deferredRef.current = null
    if (mountedRef.current && stateRef.current?.enabled) performRef.current?.(d.action)
  }, [])

  // Замолчать. Оборванный ответ показывается целиком, а отложенный переход
  // выполняется сразу: ученик просил открыть раздел, голос был лишь поводом
  // подождать. Где переход уже не нужен (новый чат, выход), его снимают раньше
  // (dropDeferred).
  const silence = useCallback(() => {
    voiceRef.current?.stop()
    voiceRef.current = null
  }, [])
  const stopVoice = useCallback(() => {
    silence()
    releaseHold()
    runDeferred()
  }, [silence, releaseHold, runDeferred])

  // ── Тур, который ведёт Луна ────────────────────────────────────────────
  // on — тур запустила Луна, и его шаги она читает вслух (tourVoice.js).
  // screen — экран, на котором попросить тур, когда переход до него доедет.
  // waitReply — первый шаг ждёт, пока договорит её ответ («начинаю тур…»), и
  // не обрывает его на полуслове; дальше каждый шаг — по «Далее» ученика —
  // обрывает прошлый. lastPhrases — текущий шаг: его повторяет включённый звук.
  const guideRef = useRef({ ...GUIDE_OFF })
  const tourVoiceRef = useRef(null)
  const toggleMutedRef = useRef(null)

  const endGuide = useCallback(() => {
    const g = guideRef.current
    clearTimeout(g.timer)
    clearTimeout(g.waitTimer)
    Object.assign(g, GUIDE_OFF)
    tourVoiceRef.current?.dispose()
    tourVoiceRef.current = null
    setTourNarration({ on: false, muted: false })
  }, [])

  // Сказать текущий шаг — если ничто не мешает (звук выключен, ответ ещё звучит).
  const sayStep = useCallback(() => {
    const g = guideRef.current
    const cur = stateRef.current
    if (!g.on || !g.lastPhrases.length || (cur?.muted && !cur?.callLive) || !cur?.enabled) return
    g.waitReply = false
    g.pending = false
    clearTimeout(g.waitTimer)
    stopVoice()
    tourVoiceRef.current?.say(g.lastPhrases)
  }, [stopVoice])

  const narrate = useCallback((phrases, next) => {
    const g = guideRef.current
    g.lastPhrases = phrases
    const cur = stateRef.current
    if (!g.on || (cur?.muted && !cur?.callLive) || !cur?.enabled) return
    // Синтез начинаем сразу — и этого шага, и следующего: пока звучит этот,
    // следующий успеет, и по «Далее» Луна заговорит без паузы.
    tourVoiceRef.current?.prefetch(phrases)
    tourVoiceRef.current?.prefetch(next)
    if (g.waitReply && voiceRef.current) {
      g.pending = true
      clearTimeout(g.waitTimer)
      g.waitTimer = setTimeout(sayStep, REPLY_WAIT_MAX_MS)
      return
    }
    sayStep()
  }, [sayStep])

  const startGuide = useCallback(({ waitReply }) => {
    const g = guideRef.current
    clearTimeout(g.timer)
    clearTimeout(g.waitTimer)
    tourVoiceRef.current?.dispose()
    // В звонке шаг читает агент: второй голос поверх звонка звучал бы
    // одновременно с ним и попадал бы ему в микрофон.
    tourVoiceRef.current = stateRef.current?.callLive
      ? createCallTourVoice((text) => callCtlRef.current?.say(text))
      : createTourVoice({ token: stateRef.current?.token, persona: stateRef.current?.persona })
    Object.assign(g, { ...GUIDE_OFF, on: true, waitReply })
    setTourNarration({ on: true, muted: Boolean(stateRef.current?.muted), avatar: stateRef.current?.persona?.avatar }, () => toggleMutedRef.current?.())
    g.timer = setTimeout(() => {
      // Ни одного шага: у экрана нет тура или он не дождался своих данных.
      // Молча погасший тур выглядел бы как «Луна соврала» — говорим как есть.
      if (!guideRef.current.on || guideRef.current.lastKey !== null) return
      cancelTourRequest()
      endGuide()
      if (!mountedRef.current || inFlightRef.current || !stateRef.current?.enabled) return
      setMessages((prev) => [...prev, { role: 'assistant', content: stateRef.current.t('assistant.tour.unavailable') }])
      setOpen(true)
    }, TOUR_START_TIMEOUT_MS)
  }, [endGuide])

  // Номера кнопок последнего снимка (screenSnapshot.snapshotWithRefs): по ним окно жмёт
  // кнопку, которую назвала Луна.
  const refsRef = useRef(new Map())
  const takeSnapshot = useCallback(() => {
    const root = typeof document !== 'undefined' ? document.querySelector(SCREEN_ROOT) : null
    const snap = snapshotWithRefs(root)
    refsRef.current = snap.refs
    return snap.text
  }, [])

  // Нажать кнопку Луны. note — сказать в переписке, что кнопки нет (у облачка команды
  // свой ответ); refs — номера снимка, по которому отвечали (звонок держит свои).
  const press = useCallback((action, { note = true, refs = null } = {}) => {
    const cur = stateRef.current
    if (!cur?.enabled) return 'missing'
    const root = typeof document !== 'undefined' ? document.querySelector(SCREEN_ROOT) : null
    const res = pressButton(action, { refs: refs || refsRef.current, root })
    if (res === 'pressed') {
      // На телефоне лист окна закрывает экран — ученик должен видеть, что нажалось.
      if (isPhone()) setOpen(false)
    } else if (note) {
      setMessages((prev) => [...prev, { role: 'assistant', content: cur.t('assistant.click.missing', { label: action.label }), local: true }])
    }
    return res
  }, [])

  // Выполнить действие Луны: открыть раздел, провести тур или нажать кнопку. gesture —
  // нажата кнопка под ответом (тогда ответ дослушивать незачем, а iPhone даст звук).
  const perform = useCallback((action, { gesture = false } = {}) => {
    // Нажатая кнопка заменяет отложенный переход того же ответа — дважды не ведём.
    dropDeferred()
    if (action?.kind === 'click') {
      if (gesture) unlockSpeech()
      return press(action)
    }
    const dest = destinationOf(action?.target)
    const cur = stateRef.current
    if (!dest || !cur?.enabled) return
    const here = dest.screen === cur.screen
    if (action.kind === 'open') {
      if (!here || dest.payload) navigateTo(dest.id)
      if (isPhone()) setOpen(false)
      return
    }
    if (action.kind !== 'tour' || !dest.tour) return
    if (gesture) {
      unlockSpeech()
      stopVoice()
    }
    startGuide({ waitReply: !gesture && Boolean(voiceRef.current) })
    // Тур — затемнение и карточка на весь экран; окно чата ему только мешает.
    // Не close(): тот глушит голос, а ответ «начинаю тур» пусть договорит.
    setOpen(false)
    if (here) requestTour()
    else {
      guideRef.current.screen = dest.screen
      navigateTo(dest.id)
    }
  }, [startGuide, stopVoice, dropDeferred, press])
  useLayoutEffect(() => {
    performRef.current = perform
  })

  // Переход до раздела доехал — просим у экрана тур (как кнопкой «?»).
  useEffect(() => {
    const g = guideRef.current
    if (g.on && g.screen && g.screen === screen) {
      g.screen = null
      requestTour()
    }
  }, [screen])

  // Шаги тура — вслух; конец тура — Луна замолкает.
  useEffect(
    () =>
      onTourEvent((e) => {
        const g = guideRef.current
        if (!g.on) return
        if (e.type === 'step') {
          const key = `${e.index}:${e.title}`
          // Тот же шаг ещё раз (перерисовка экрана, dev StrictMode) — не повторяем.
          if (key === g.lastKey) return
          if (g.lastKey === null) clearTimeout(g.timer)
          else g.waitReply = false
          g.lastKey = key
          narrate(stepPhrases(e), stepPhrases(e.next))
        } else if (e.type === 'end') {
          endGuide()
        }
      }),
    [narrate, endGuide],
  )

  useEffect(
    () => () => {
      if (guideRef.current.on) endGuide()
      if (tourRequestPending()) cancelTourRequest()
    },
    [endGuide],
  )

  // Экран стал запрещённым — окно закрывается. Не эффектом, а при рендере: так
  // окно не успевает мелькнуть на экзамене ни на кадр.
  const [prevEnabled, setPrevEnabled] = useState(enabled)
  if (enabled !== prevEnabled) {
    setPrevEnabled(enabled)
    if (!enabled) {
      setOpen(false)
      setHeld(null)
      // Звонок на экзамене или в звонке тьютору — кладём трубку (AssistantCall
      // снимется и закроет комнату).
      setCall(null)
      setCallThinking(false)
    }
  }

  // Другой ученик на том же устройстве не должен увидеть чужой разговор.
  const [prevToken, setPrevToken] = useState(token)
  if (token !== prevToken) {
    setPrevToken(token)
    setMessages([])
    setError(null)
    setBusy(false)
  }
  // dropCall объявлен ниже, а эффект смены ученика — здесь: зовём через ref.
  const dropCallRef = useRef(null)
  // Ответ, который ещё идёт (или звучит) прошлому ученику, обрываем — и никуда
  // его не ведём.
  useEffect(
    () => () => {
      abortRef.current?.abort()
      dropDeferred()
      stopVoice()
      endGuide()
      greetedRef.current = null
      openingRef.current = null
      dropCallRef.current?.()
    },
    [token, stopVoice, endGuide, dropDeferred],
  )

  useEffect(() => {
    setAssistantAvailable(enabled)
    if (enabled) installErrorLog()
  }, [enabled])

  useEffect(() => () => setAssistantAvailable(false), [])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    // Ученик ещё ничего не спросил — под первой репликой Луны висят подсказки, и
    // прокрутка «в самый низ» уводила начало её реплики за край окна (на десктопе
    // её первая строка пряталась под шапкой). Тогда показываем начало реплики.
    const asked = messages.some((m) => m.role === 'user' && !m.opening)
    const bots = list.querySelectorAll('.asst__msg--bot')
    const greeting = !asked && messages.length > 0 ? bots[bots.length - 1] : null
    list.scrollTop = greeting
      ? Math.max(0, greeting.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop - 8)
      : list.scrollHeight
  }, [messages, busy, error, open, held])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // opening — первая реплика Луны: вместо вопроса уходит OPENING_MARK, на экране
  // его нет, а сбой не показывается плашкой.
  // afterReply — когда ответ кончился: договорён голосом или, без голоса, дописан.
  // На позывной по нему Луна сама начинает слушать ответ ученика.
  // quiet — команда голосом при закрытом окне: ход идёт облачком у кнопки, окно
  // открывается, только если ответ надо прочитать (объяснение, предложение).
  const send = useCallback(async (raw, { voice = false, opening = false, afterReply = null, quiet = false } = {}) => {
    const text = String(raw ?? '').trim().slice(0, MAX_INPUT)
    const cur = stateRef.current
    if (!text || !cur?.token || !mountedRef.current) return
    // Первая реплика ещё идёт, а ученик уже спросил сам — его вопрос важнее:
    // реплику обрываем и убираем, иначе Enter в эти 2–3 секунды молча терялся бы.
    const pending = openingRef.current
    if (inFlightRef.current && !(pending && !opening)) return
    let base = cur.messages
    if (pending) {
      openingRef.current = null
      abortRef.current?.abort()
      base = pending.base
    }
    inFlightRef.current = true
    stopVoice()

    const speaking = voice && !cur.muted
    const vid = speaking ? ++vidRef.current : 0
    const history = [...base, { role: 'user', content: text, ...(voice ? { voice: true } : {}), ...(opening ? { opening: true } : {}) }]
    setMessages([...history, { role: 'assistant', content: '', ...(vid ? { vid } : {}) }])
    // Пары «вопрос не по теме — отказ» модели не нужны: они только удлиняют
    // каждый следующий запрос. На экране остаются, в запрос не идут.
    // Метку действия возвращаем в её ответ: на «да» модель должна видеть, ЧТО
    // она предлагала открыть, а с экрана метка срезана.
    const toSend = history
      .filter((m) => !m.offtopic && !m.local)
      .map(({ role, content, action }) => ({ role, content: action ? `${content.trimEnd()}\n${actionMarker(action)}` : content }))
    setInput('')
    setError(null)
    setBusy(true)
    if (quiet) showCmd('thinking')

    // Озвучка — только голосовому вопросу и только если ученик её не выключил.
    // Текст такого ответа показывается вслед за голосом: фраза i видна, когда
    // она зазвучала (chunker.ends[i] — её конец в потоке), всё — когда очередь
    // кончилась, оборвалась или первый звук так и не пришёл (FIRST_SOUND_MAX_MS).
    let speaker = null
    let chunker = null
    let holdTimer = null
    const reveal = (upto) => {
      if (upto == null) {
        clearTimeout(holdTimer)
        releaseHold(vid)
        return
      }
      setHeld((h) => (h && h.vid === vid ? { vid, shown: Math.max(h.shown, upto) } : h))
    }
    const speak = (phrase) => {
      if (!holdTimer) holdTimer = setTimeout(() => reveal(null), FIRST_SOUND_MAX_MS)
      speaker.say(phrase)
    }
    if (speaking) {
      chunker = createSpeechChunker()
      setHeld({ vid, shown: 0 })
      speaker = createVoiceQueue({
        token: cur.token,
        lang: cur.lang,
        persona: cur.persona,
        onPhrase: (i) => {
          if (i === 0) clearTimeout(holdTimer)
          reveal(chunker.ends[i] ?? null)
        },
        // Чужой звук («послушать» у слова) оборвал Луну — она молчит, текст целиком.
        onInterrupt: () => {
          if (voiceRef.current === speaker) voiceRef.current = null
          reveal(null)
          runDeferred(speaker)
        },
        onFinish: ({ played }) => {
          if (voiceRef.current === speaker) voiceRef.current = null
          reveal(null)
          // Ответ «начинаю тур» договорён — теперь первый шаг тура, который его ждал.
          const g = guideRef.current
          if (g.waitReply) {
            if (g.pending) sayStep()
            else g.waitReply = false
          }
          // «Открываю…» договорено — теперь сам переход (или тур).
          runDeferred(speaker)
          afterReply?.()
          if (played) return
          // Ни одна фраза не зазвучала — говорим об этом тихо, текст ответа на месте.
          setMessages((prev) => {
            const next = prev.slice()
            const last = next[next.length - 1]
            if (last?.role === 'assistant') next[next.length - 1] = { ...last, voiceFailed: true }
            return next
          })
        },
      })
      voiceRef.current = speaker
    }

    const controller = new AbortController()
    abortRef.current = controller
    if (opening) openingRef.current = { base }
    try {
      const reply = await askAssistant({
        token: cur.token,
        messages: toSend,
        screen: { id: cur.screen || null, text: takeSnapshot() },
        lang: cur.lang,
        errors: recentErrors(),
        pageUrl: typeof location !== 'undefined' ? location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        bugReported: history.some((m) => m.reported),
        voice,
        signal: controller.signal,
        onDelta: (chunk) => {
          // Кусок оборванной первой реплики, уже прочитанный до обрыва, не должен
          // дописаться в ответ на вопрос, который её перебил.
          if (controller.signal.aborted) return
          setMessages((prev) => {
            const next = prev.slice()
            const last = next[next.length - 1]
            next[next.length - 1] = { ...last, content: last.content + chunk }
            return next
          })
          if (speaker) chunker.push(chunk).forEach(speak)
        },
      })
      // Действие — в конце ответа. Ответ из одной метки (модель так иногда
      // делает) получает подпись сайта, иначе пузырь остался бы пустым.
      // В первой реплике Луна только предлагает: ученик ни о чём не просил, и
      // увести его с экрана без согласия нельзя, даже если модель сказала «открываю».
      const action = reply.action && opening ? { ...reply.action, now: false } : reply.action
      const fallback = action && !reply.text.trim() ? actionCaption(action, cur.lang, t) : ''
      if (speaker) {
        chunker.flush().forEach(speak)
        // Подпись вместо пустого ответа — фраза без конца в потоке: зазвучав,
        // она открывает весь текст (chunker.ends её не знает).
        if (fallback) speak(fallback)
        speaker.end()
      }
      let clicked = null
      if (action) {
        setMessages((prev) => {
          const next = prev.slice()
          const last = next[next.length - 1]
          next[next.length - 1] = { ...last, content: fallback || last.content, action }
          return next
        })
        // «Открой» / «да» — переход сразу, а у озвучиваемого ответа — когда Луна
        // договорит «открываю…» (runDeferred в onFinish). Ученик ушёл с экрана,
        // где можно (экзамен), или вышел из аккаунта — не ведём никуда.
        if (action.now && mountedRef.current && stateRef.current?.enabled) {
          // Нажатие — сразу (см. шапку); переход и тур — когда Луна договорит.
          if (action.kind === 'click') clicked = perform(action)
          else if (speaker && voiceRef.current === speaker) {
            dropDeferred()
            deferredRef.current = { action, owner: speaker, timer: setTimeout(() => runDeferred(speaker), ACTION_WAIT_MAX_MS) }
          } else perform(action)
        }
      }
      // Команда голосом: нажатие — облачком, переход и тур видно и так; объяснение и
      // предложение («Открыть?», «Нажать?») — в окне: их надо прочитать и нажать.
      if (quiet && mountedRef.current) {
        if (action?.kind === 'click' && action.now) {
          showCmd(clicked === 'pressed' ? 'pressed' : 'missing', { label: action.label, ms: CMD_SHOW_MS })
        } else {
          showCmd(null)
          if (!action?.now) setOpen(true)
        }
      }
      if (reply.offtopic) {
        setMessages((prev) => {
          const next = prev.slice()
          next[next.length - 2] = { ...next[next.length - 2], offtopic: true }
          next[next.length - 1] = { ...next[next.length - 1], offtopic: true }
          return next
        })
      }
      if (reply.reported) {
        setMessages((prev) => {
          const next = prev.slice()
          next[next.length - 1] = { ...next[next.length - 1], reported: true }
          return next
        })
      }
      // Без голоса ответ кончился, когда дописан.
      if (!speaker) afterReply?.()
    } catch (err) {
      speaker?.stop()
      if (speaker) reveal(null)
      if (err?.name === 'AbortError') return
      // Неудачный вопрос убираем из разговора вместе с недописанным ответом:
      // иначе полуответ ушёл бы в историю следующего вопроса как настоящий.
      // base, а не cur.messages: у вопроса, перебившего первую реплику, в
      // cur.messages ещё лежит её недописанный кусок.
      setMessages(base)
      if (opening) return
      // Команда голосом не вышла — окно, где видно, что случилось.
      if (quiet) {
        showCmd(null)
        setOpen(true)
      }
      const kind = err instanceof AssistantError ? err.kind : 'unavailable'
      setError({
        text:
          kind === 'rate' || kind === 'cooldown'
            ? t(kind === 'rate' ? 'assistant.err.rate' : 'assistant.err.cooldown', {
                min: Math.max(1, Math.ceil((err.retryAfterSec || 60) / 60)),
              })
            : kind === 'auth'
              ? t('assistant.err.auth')
              : t('assistant.err.generic'),
        // Повтор сразу после паузы или лимита снова упрётся в них — кнопки нет.
        // Голосовой вопрос и повторяется голосовым: ответ снова прозвучит
        // (нажатие «Повторить» — тоже жест, iPhone звук разрешит).
        retry: kind === 'auth' || kind === 'cooldown' ? null : { text, voice },
      })
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        inFlightRef.current = false
        setBusy(false)
        if (opening) openingRef.current = null
      }
    }
  }, [t, stopVoice, sayStep, perform, releaseHold, runDeferred, dropDeferred, takeSnapshot, showCmd])

  // ── Звонок ───────────────────────────────────────────────────────────
  // Выполнить «открываю…» звонка: Луна договорила (или ждать уже нечего).
  const runCallAction = useCallback(() => {
    const p = callActionRef.current
    if (!p) return
    clearTimeout(p.timer)
    callActionRef.current = null
    if (mountedRef.current && stateRef.current?.enabled) performRef.current?.(p.action)
  }, [])

  // Убрать звонок без следов: экран, где Луны нет, другой ученик, выход.
  // Комнату закрывает сам AssistantCall, снимаясь со страницы. dropCallRefs —
  // только то, что не состояние React: на запрещённом экране состояние
  // сбрасывается при рендере (см. prevEnabled), а ответ и переход — здесь.
  const dropCallRefs = useCallback(() => {
    liveCallRef.current = null
    callSeqRef.current += 1
    callAskRef.current?.controller.abort()
    callAskRef.current = null
    callDraftsRef.current.clear()
    clearTimeout(callActionRef.current?.timer)
    callActionRef.current = null
  }, [])
  const dropCall = useCallback(() => {
    dropCallRefs()
    setCallThinking(false)
    setCall(null)
  }, [dropCallRefs])

  // Агент спросил: ученик сказал text (или звонок только начался — opening).
  // Ответ — тем же чат-роутом, что и окно, фразами в голос звонка.
  //
  // pending — черновик: агент спросил, ещё не решив, что ученик договорил
  // (упреждающая генерация, как у тьюторов Speaking Buddy). Модель спрашиваем
  // сразу — ради этого и спрашивают заранее, — фразы шлём агенту (он придержит
  // их до своего решения), а всё, что видно в окне, копим в draft.queue до
  // luna.commit. Агент выбросил черновик — cancel с drop, и следа в переписке нет.
  const callAsk = useCallback(
    async ({ id, text, opening, pending = false, sender }) => {
      const cur = stateRef.current
      if (!mountedRef.current || !cur?.token || !cur.callLive) {
        sender.end()
        return
      }
      callAskRef.current?.controller.abort()
      // Новый вопрос снимает и прежний черновик: агент спрашивает заново, когда
      // фраза ученика поменялась, — старому ходу в окне уже не бывать.
      callDraftsRef.current.clear()
      const draft = { visible: !pending, queue: [] }
      if (pending) callDraftsRef.current.set(id, draft)
      const ui = (fn) => (draft.visible ? fn() : draft.queue.push(fn))
      // Замеры для строки LATENCY luna агента: где в звонке теряется время.
      const askedAt = performance.now()
      const timing = { pending }
      // Разговор в окне уже идёт (Луна поздоровалась, ученик что-то спрашивал) —
      // вторая первая реплика была бы повтором и лишним запросом к модели: Луна
      // просто говорит, что на связи. Полная реплика по экрану — в пустом окне.
      if (opening && cur.messages.some((m) => m.role === 'assistant' && m.content.trim())) {
        const hello = t('assistant.call.hello')
        sender.phrase(callSpeech(hello))
        sender.end()
        ui(() => setMessages((prev) => [...prev, { role: 'assistant', content: hello, local: true }]))
        return
      }
      const controller = new AbortController()
      callAskRef.current = { id, controller }
      const raw = opening ? OPENING_MARK : String(text ?? '').trim().slice(0, MAX_INPUT)
      if (!raw) {
        sender.end()
        return
      }
      // Ответ, который ученик перебил на первом слове, пуст — в историю не идёт.
      const base = cur.messages.slice()
      while (base.length && base[base.length - 1].role === 'assistant' && !base[base.length - 1].content.trim()) base.pop()
      if (base.length && base[base.length - 1].opening) base.pop()
      const history = [...base, { role: 'user', content: raw, voice: true, call: true, ...(opening ? { opening: true } : {}) }]
      // Быстрая команда и в звонке («дальше» — voiceCommands.js): Луна жмёт сама и
      // говорит одну фразу, без модели. Черновик (pending) нажмёт только по commit — через
      // ui(): ученик мог ещё не договорить. Пара строк в модель не идёт (local).
      const command = opening ? null : matchCommand(raw)
      if (command) {
        takeSnapshot()
        const refs = refsRef.current
        const hits = findCommandButtons(refs, command)
        if (hits.length === 1) {
          const action = { kind: 'click', target: String(hits[0].ref), label: hits[0].label, now: true }
          const say = t('assistant.action.clicking', { label: action.label })
          sender.phrase(callSpeech(say))
          sender.end()
          callAskRef.current = null
          ui(() => {
            setMessages([...base, { ...history[history.length - 1], local: true }, { role: 'assistant', content: say, local: true }])
            setCallThinking(false)
            press(action, { refs })
          })
          return
        }
      }
      ui(() => {
        setMessages([...history, { role: 'assistant', content: '' }])
        setError(null)
        setCallNote(null)
        setCallThinking(true)
      })
      const mine = () => callAskRef.current?.id === id
      const toSend = history
        .filter((m) => !m.offtopic && !m.local)
        .map(({ role, content, action }) => ({ role, content: action ? `${content.trimEnd()}\n${actionMarker(action)}` : content }))
      // Первая фраза звонка — с 12 символов, а не с 30: голос агента начинает,
      // как только есть законченный кусок («Конечно, сейчас.»), а не ждёт
      // длинного предложения (второй живой звонок 16.10.2026: первая фраза
      // приходила агенту через 1.7–2.2 с).
      const chunker = createSpeechChunker({ firstMin: CALL_FIRST_MIN, firstMax: CALL_FIRST_MAX })
      let firstPhrase = true
      const speak = (phrase) => {
        if (firstPhrase) {
          firstPhrase = false
          sender.timing({ ...timing, phrase: Math.round(performance.now() - askedAt) })
        }
        sender.phrase(callSpeech(phrase))
      }
      const patchLast = (fn) =>
        ui(() =>
          setMessages((prev) => {
            const next = prev.slice()
            const lastMsg = next[next.length - 1]
            if (lastMsg?.role === 'assistant') next[next.length - 1] = fn(lastMsg)
            return next
          }),
        )
      const screenText = takeSnapshot()
      timing.snap = Math.round(performance.now() - askedAt)
      try {
        const reply = await askAssistant({
          token: cur.token,
          messages: toSend,
          screen: { id: cur.screen || null, text: screenText },
          lang: cur.lang,
          errors: recentErrors(),
          pageUrl: typeof location !== 'undefined' ? location.href : '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          bugReported: history.some((m) => m.reported),
          voice: true,
          call: cur.callRoom,
          signal: controller.signal,
          onResponse: ({ serverTiming }) => {
            timing.head = Math.round(performance.now() - askedAt)
            if (serverTiming) timing.server = serverTiming
          },
          onDelta: (chunk) => {
            if (controller.signal.aborted || !mine()) return
            ui(() => setCallThinking(false))
            patchLast((m) => ({ ...m, content: m.content + chunk }))
            chunker.push(chunk).forEach(speak)
          },
        })
        if (!mine()) return
        chunker.flush().forEach(speak)
        // Первая реплика только предлагает: увести ученика с экрана без его просьбы нельзя.
        const action = reply.action && opening ? { ...reply.action, now: false } : reply.action
        const fallback = action && !reply.text.trim() ? actionCaption(action, cur.lang, t) : ''
        if (fallback) speak(fallback)
        if (action) {
          patchLast((m) => ({ ...m, content: fallback || m.content, action }))
          ui(() => {
            if (!action.now || !stateRef.current?.enabled) return
            // Нажатие — по commit черновика и сразу; переход — когда Луна договорит.
            if (action.kind === 'click') performRef.current?.(action)
            else {
              clearTimeout(callActionRef.current?.timer)
              callActionRef.current = { action, spoke: false, timer: setTimeout(runCallAction, ACTION_WAIT_MAX_MS) }
            }
          })
        }
        if (reply.offtopic || reply.reported) {
          ui(() => setMessages((prev) => {
            const next = prev.slice()
            const n = next.length
            if (reply.offtopic) {
              next[n - 2] = { ...next[n - 2], offtopic: true }
              next[n - 1] = { ...next[n - 1], offtopic: true }
            }
            if (reply.reported) next[n - 1] = { ...next[n - 1], reported: true }
            return next
          }))
        }
      } catch (err) {
        if (err?.name === 'AbortError' || !mine()) return
        // Слова ученика остаются на экране, а вместо ответа — что не вышло. Эта
        // строка не ответ модели, и в следующий запрос она не идёт (local).
        const kind = err instanceof AssistantError ? err.kind : 'unavailable'
        const note =
          kind === 'rate' || kind === 'cooldown'
            ? t('assistant.call.err.rate')
            : kind === 'auth'
              ? t('assistant.err.auth')
              : t('assistant.call.failed')
        if (!opening) {
          speak(note)
          patchLast((m) => ({ ...m, content: note, local: true }))
        } else {
          // Первая реплика по экрану не вышла — звонок не должен начаться
          // тишиной: Луна хотя бы отзывается.
          ui(() => setMessages(base))
          speak(t('assistant.call.hello'))
        }
      } finally {
        // Снятый ответ («Новый чат», новая реплика, отмена агентом) кончается
        // тихо: иначе агент сказал бы «не получилось» на то, что сняли нарочно.
        sender.end({ silent: controller.signal.aborted })
        if (mine()) {
          callAskRef.current = null
          // Через очередь черновика: commit после конца ответа без текста
          // (ошибка, одна кнопка) иначе включил бы «Думаю…» уже навсегда.
          ui(() => setCallThinking(false))
        }
      }
    },
    [t, runCallAction, takeSnapshot, press],
  )

  // Агент передумал (ученик перебил) — ответ больше не нужен. drop — черновик
  // так и не стал ходом: накопленное для окна выбрасываем вместе с ним.
  const callCancel = useCallback((id, { drop = false } = {}) => {
    if (drop) callDraftsRef.current.delete(id)
    if (callAskRef.current?.id !== id) return
    callAskRef.current.controller.abort()
    callAskRef.current = null
    setCallThinking(false)
  }, [])

  // Черновик стал ходом: агент решил, что ученик договорил. Вопрос и всё, что
  // уже пришло от модели, появляются в окне разом — ответ к этому моменту
  // обычно уже пишется, а то и дописан.
  const callCommit = useCallback((id) => {
    const draft = callDraftsRef.current.get(id)
    if (!draft) return
    callDraftsRef.current.delete(id)
    draft.visible = true
    draft.queue.splice(0).forEach((fn) => fn())
  }, [])

  useLayoutEffect(() => {
    dropCallRef.current = dropCall
  })

  const callState = useCallback((s) => {
    setCall((c) => (c && c.phase === 'live' ? { ...c, ...s } : c))
  }, [])

  // Комната закрылась: ученик положил трубку, кончился дневной лимит (агент
  // прощается и удаляет комнату) или пропала связь.
  const callEnded = useCallback(
    (reason) => {
      if (!liveCallRef.current) return
      const user = hangingUpRef.current
      hangingUpRef.current = false
      // Луна сказала «открываю…» и звонок кончился — ученик всё же просил раздел.
      runCallAction()
      dropCall()
      if (user) return
      const cur = stateRef.current
      setCallNote(cur?.t(reason === 'mic' ? 'assistant.call.err.mic' : reason === 'error' ? 'assistant.call.err.dropped' : 'assistant.call.ended'))
    },
    [dropCall, runCallAction],
  )

  // «Позвонить»: микрофон (жест — разрешение спрашивается в этом же нажатии),
  // токен комнаты, дальше AssistantCall.
  const startCall = async () => {
    if (call || !token) return
    const seq = ++callSeqRef.current
    hangingUpRef.current = false
    unlockSpeech()
    stopVoice()
    cancelRecording()
    // Текстовый ответ, который ещё пишется, в звонок не тянем — звонок начнёт свою реплику.
    abortRef.current?.abort()
    abortRef.current = null
    openingRef.current = null
    inFlightRef.current = false
    setBusy(false)
    setError(null)
    setCallNote(null)
    setCall({ phase: 'starting' })
    const fail = (key, vars) => {
      if (callSeqRef.current !== seq) return
      setCall(null)
      setError({ text: t(key, vars), retry: null })
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((tr) => tr.stop())
    } catch {
      return fail('assistant.call.err.mic')
    }
    if (callSeqRef.current !== seq) return
    try {
      const res = await fetch('/api/assistant/call', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ lang }),
      })
      const data = await res.json().catch(() => ({}))
      if (callSeqRef.current !== seq) return
      if (res.status === 403 && data.limited) return fail('assistant.call.err.limit', { min: Math.round((data.limitSec || 900) / 60) })
      if (res.status === 401) return fail('assistant.err.auth')
      if (res.status === 409) return fail('assistant.call.err.busy')
      if (!res.ok || !data.token || !data.url) return fail('assistant.call.err.unavailable')
      liveCallRef.current = data.room
      setCall({ phase: 'live', session: data, agentState: 'connecting', micOn: true, audioBlocked: false, userText: '', since: clockNow() })
    } catch {
      fail('assistant.call.err.unavailable')
    }
  }

  const endCall = () => {
    if (!call) return
    if (call.phase !== 'live') {
      dropCall()
      return
    }
    hangingUpRef.current = true
    // «Открываю…» уже сказано — переход не отменяем: ученик об этом просил.
    runCallAction()
    if (callCtlRef.current) callCtlRef.current.hangUp()
    else callEnded('disconnected')
  }

  // Луна на связи: «открываю…» ждёт, пока она договорит, — по состоянию агента.
  const agentState = call?.agentState
  useEffect(() => {
    const p = callActionRef.current
    if (!p) return
    if (agentState === 'speaking') p.spoke = true
    else if (p.spoke && (agentState === 'listening' || agentState === 'thinking')) runCallAction()
  }, [agentState, runCallAction])

  // Агент так и не зашёл в комнату (воркер не поднялся) — честно говорим.
  useEffect(() => {
    if (!callLive || agentState !== 'connecting') return undefined
    const id = setTimeout(() => {
      hangingUpRef.current = true
      callCtlRef.current?.hangUp()
      dropCall()
      setError({ text: stateRef.current.t('assistant.call.err.unavailable'), retry: null })
    }, CALL_AGENT_WAIT_MS)
    return () => clearTimeout(id)
  }, [callLive, agentState, dropCall])

  // Остаток минут звонка — раз в 15 с, этого достаточно для «осталось N мин».
  const [callNow, setCallNow] = useState(0)
  useEffect(() => {
    if (!callLive) return undefined
    const id = setInterval(() => setCallNow(clockNow()), 15_000)
    return () => clearInterval(id)
  }, [callLive])

  // Луна заговаривает первой — если экран с прошлой её реплики поменялся.
  const greet = useCallback(() => {
    const cur = stateRef.current
    if (!cur?.greetOnOpen || !cur.token || !cur.enabled || cur.callLive || inFlightRef.current) return
    const root = typeof document !== 'undefined' ? document.querySelector(SCREEN_ROOT) : null
    const key = screenStateKey(cur.screen, snapshotScreen(root))
    if (greetedRef.current === key) return
    // Запоминаем до ответа: и сбой (лимит) не повторяется на каждом открытии.
    greetedRef.current = key
    send(OPENING_MARK, { voice: !cur.muted, opening: true })
  }, [send])

  // Открыть окно кнопкой — синхронно в нажатии: unlockSpeech — жест, без
  // которого iPhone не сыграет первую реплику, пришедшую через секунды.
  const openWindow = () => {
    unlockSpeech()
    showCmd(null)
    setOpen(true)
    greet()
  }

  // Быстрая команда (voiceCommands.js): ровно одна её кнопка на экране — жмём сами, без
  // модели. quiet — облачком (позывной), иначе — парой строк в переписке, которые в
  // модель не идут (local). false — решать модели (кнопок нет или их несколько).
  const tryFast = useCallback((command, text, { quiet = false, voice = true } = {}) => {
    if (command.id === 'stop') stopVoice()
    takeSnapshot()
    const hits = findCommandButtons(refsRef.current, command)
    if (hits.length !== 1) {
      // «Стоп», а кнопки паузы нет — Луна просто замолчала, это и просили.
      if (command.id === 'stop' && !hits.length) {
        if (quiet) showCmd(null)
        return true
      }
      return false
    }
    const action = { kind: 'click', target: String(hits[0].ref), label: hits[0].label, now: true }
    const res = press(action, { note: false })
    if (quiet) {
      showCmd(res === 'pressed' ? 'pressed' : 'missing', { label: action.label, ms: CMD_SHOW_MS })
      if (res === 'pressed') playCue('press')
    } else {
      const say = stateRef.current.t(res === 'pressed' ? 'assistant.action.clicking' : 'assistant.click.missing', { label: action.label })
      setInput('')
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: text, ...(voice ? { voice: true } : {}), local: true },
        { role: 'assistant', content: say, local: true },
      ])
    }
    return true
  }, [stopVoice, takeSnapshot, press, showCmd])

  // Текст ученика — команда на месте, иначе вопрос модели. Голос — и ответ голосом.
  const runText = useCallback((text, { quiet = false, voice = true } = {}) => {
    const command = matchCommand(text)
    if (command && !inFlightRef.current && tryFast(command, text, { quiet, voice })) return
    send(text, { voice, quiet })
  }, [tryFast, send])
  const runTextRef = useRef(runText)
  useLayoutEffect(() => {
    runTextRef.current = runText
  })

  const voiceQ = useVoiceQuestion({
    token,
    lang,
    screenId: screen,
    onText: (text) => runTextRef.current?.(text),
  })
  const { cancel: cancelRecording } = voiceQ
  // Для обработчика события открытия: он подписан один раз на send.
  const cancelRecordingRef = useRef(cancelRecording)
  useLayoutEffect(() => {
    cancelRecordingRef.current = cancelRecording
  })

  // Позывной (см. шапку). Луна отвечает всегда — позвали, значит нужна, правило «один
  // раз на экран» не для неё; но экран запоминается, чтобы открытие кнопкой следом
  // не повторило первую реплику.
  const voiceQRef = useRef(voiceQ)
  useLayoutEffect(() => {
    voiceQRef.current = voiceQ
  })
  const listenAnswer = useCallback(() => {
    const q = voiceQRef.current
    const cur = stateRef.current
    // Окно закрыли, пока она говорила, или ученик уже сам жмёт микрофон — не слушаем.
    if (!mountedRef.current || !cur?.enabled || !cur.open || cur.callLive || !q || q.state !== 'idle') return
    q.clearError()
    q.toggle()
  }, [])
  // Позывной без команды и без слов после имени — прежнее приветствие (окно, WAKE_MARK).
  const greetOnWake = useCallback(() => {
    const cur = stateRef.current
    if (!mountedRef.current || !cur?.enabled || !cur.token || cur.callLive) return
    showCmd(null)
    setOpen(true)
    stateRef.current = { ...cur, open: true }
    const root = typeof document !== 'undefined' ? document.querySelector(SCREEN_ROOT) : null
    greetedRef.current = screenStateKey(cur.screen, snapshotScreen(root))
    send(WAKE_MARK, { voice: !cur.muted, opening: true, afterReply: listenAnswer })
  }, [send, listenAnswer, showCmd])

  // Распознанное после позывного: обращение срезаем, остаток — команда или вопрос.
  const onWakeText = useCallback((raw) => {
    const text = stripWake(raw, stateRef.current?.persona?.id)
    if (!text) {
      greetOnWake()
      return
    }
    runText(text, { quiet: true })
  }, [greetOnWake, runText])

  // Итог «уха» (wake/wakeEar.js): { text — что распознал Vosk, preroll() — звук от имени }.
  // Возвращает «ухо» глухоту: после команды следующую ученик скажет скоро.
  const onWake = useCallback((detail = {}) => {
    const cur = stateRef.current
    if (!mountedRef.current || !cur?.enabled || !cur.token || cur.callLive) return undefined
    const name = wakeSet(cur.persona?.id).name
    const text = String(detail.text || '')
    const fast = { cooldownMs: FAST_COOLDOWN_MS }
    const command = matchCommand(text, { name })
    if (command) {
      if (!tryFast(command, text, { quiet: true })) send(wakeTail(text, name).join(' '), { voice: true, quiet: true })
      return fast
    }
    // Слова после имени — команда одним духом: её звук уже в буфере «уха».
    const wav = wakeTail(text, name).length ? detail.preroll?.() : null
    if (wav) {
      showCmd('thinking')
      voiceQRef.current?.transcribeAudio(wav, { onText: onWakeText })
      return fast
    }
    // Одно имя — сигнал «слушаю» и одна команда; промолчал — прежнее приветствие.
    playCue('listen')
    showCmd('listening')
    voiceQRef.current?.listen({ noVoiceMs: WAKE_LISTEN_MS, onText: onWakeText, onNoVoice: greetOnWake })
    return undefined
  }, [tryFast, send, showCmd, onWakeText, greetOnWake])
  // Во время звонка «ухо» молчит: микрофон у звонка, и Луна и так на связи.
  const wake = useWakeWord({ token, enabled: enabled && !call, open, onWake, persona: persona.id })
  // Облачко «Я Луна…» у кнопки, пока ученик её ни разу не открывал (introHint.js).
  const introHint = useIntroHint({ screen, active: enabled && !call, open })

  // Распознать команду после позывного не вышло (лимит, сбой, не расслышала) — окно,
  // где ошибка видна: облачко «Думаю…» иначе висело бы без конца. При рендере, как
  // prevEnabled выше: ошибка пришла — в этом же кадре облачко уходит, окно открыто.
  const [prevVoiceError, setPrevVoiceError] = useState(null)
  if (voiceQ.error !== prevVoiceError) {
    setPrevVoiceError(voiceQ.error)
    if (voiceQ.error && cmd) {
      setCmd(null)
      setOpen(true)
    }
  }

  // Закрыть окно — замолчать и бросить недоговорённую запись.
  const close = useCallback(() => {
    stopVoice()
    cancelRecording()
    setOpen(false)
  }, [stopVoice, cancelRecording])

  // Экран, где помощника нет (экзамен, звонок), — ни звука, ни микрофона.
  // Недоговорённый ответ вернётся с кнопкой целиком (setHeld — при рендере, рядом
  // с закрытием окна), а «открываю…» с экзамена никуда не ведёт.
  useEffect(() => {
    if (enabled) return
    dropDeferred()
    silence()
    cancelRecording()
    endGuide()
    dropCallRefs()
  }, [enabled, silence, cancelRecording, endGuide, dropDeferred, dropCallRefs])

  // Кнопка «Спросить помощника» из плеера урока: открыть окно и сразу задать
  // вопрос — снимок снимется с того же экрана, где ученик её нажал.
  useEffect(() => {
    const onOpen = (e) => {
      if (!stateRef.current?.enabled) return
      setOpen(true)
      const prompt = e.detail?.prompt
      if (stateRef.current?.callLive) return
      if (!prompt) {
        greet()
        return
      }
      // Готовый вопрос из урока важнее недоговорённого голосового: иначе тот,
      // вернувшись из распознавания, молча потерялся бы за занятым чатом.
      cancelRecordingRef.current?.()
      send(prompt)
    }
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [send, greet])

  const reset = () => {
    abortRef.current?.abort()
    abortRef.current = null
    openingRef.current = null
    inFlightRef.current = false
    // «Новый чат» — с чистого листа: и недоговорённое «открываю…» отменяется.
    dropDeferred()
    stopVoice()
    // В звонке — тоже: ответ, который ещё пишется, снимаем, Луна замолкает, а
    // переход, обещанный в прошлом разговоре, не случается. Сам звонок идёт.
    if (callAskRef.current) {
      callAskRef.current.controller.abort()
      callAskRef.current = null
      callCtlRef.current?.say('')
    }
    clearTimeout(callActionRef.current?.timer)
    callActionRef.current = null
    setCallThinking(false)
    setMessages([])
    setError(null)
    setBusy(false)
    inputRef.current?.focus()
  }

  // Звук один на ответы и на тур: кнопка в шапке и кнопка в карточке тура
  // (tourBus.toggleTourNarrationMute) — одно и то же.
  const toggleMuted = () => {
    const next = !stateRef.current?.muted
    setMuted(next)
    writeMuted(next)
    // До перерисовки stateRef ещё помнит прежнее — а шаг тура озвучивается сейчас.
    stateRef.current = { ...stateRef.current, muted: next }
    if (next) {
      stopVoice()
      tourVoiceRef.current?.stop()
    }
    if (guideRef.current.on) {
      setTourNarration({ on: true, muted: next, avatar: stateRef.current?.persona?.avatar })
      // Звук включили посреди тура — Луна читает текущий шаг.
      if (!next) sayStep()
    }
  }
  useLayoutEffect(() => {
    toggleMutedRef.current = toggleMuted
  })

  // Синхронно в обработчике нажатия: unlockSpeech — это жест, после которого
  // iPhone разрешит сыграть ответ, пришедший через несколько секунд без жеста.
  const onMic = () => {
    unlockSpeech()
    stopVoice()
    voiceQ.clearError()
    voiceQ.toggle()
  }

  // Набранный вопрос — тоже жест. Ответ на него Луна не озвучивает, но если она
  // в ответ поведёт тур, шаги звучат — и iPhone разрешит их только после жеста.
  const sendTyped = (text) => {
    unlockSpeech()
    // «дальше», «проверь» набранным текстом — та же быстрая команда, без модели.
    runText(String(text ?? '').trim(), { voice: false })
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (voiceQ.state === 'idle') sendTyped(input)
    }
  }

  const suggestions = [
    { text: t('assistant.suggest.plan') },
    { text: t('assistant.suggest.whyWrong') },
    { text: t('assistant.suggest.rule') },
    { text: t('assistant.suggest.page') },
    { text: t('assistant.suggest.where') },
    { text: t('assistant.suggest.tour') },
    { text: t('assistant.suggest.bug'), bug: true },
  ]
  const last = messages[messages.length - 1]
  // Подсказки-вопросы висят, пока ученик сам ничего не спросил: первая реплика
  // Луны — не его вопрос, и после неё они как раз к месту; нажатая, пока реплика
  // ещё идёт, подсказка её перебивает (send).
  const asked = messages.some((m) => m.role === 'user' && !m.opening)
  // Занят ответом на вопрос ученика. Первая реплика не в счёт: её перебивают вопросом.
  const questionBusy = busy && asked
  // Сколько видно у сообщения: у озвучиваемого ответа — то, что Луна уже говорит.
  const visibleText = (m) => (held && m.vid === held.vid ? m.content.slice(0, held.shown) : m.content)
  const lastHeld = Boolean(held && last?.vid === held.vid)
  // Что показывать, пока ответа не видно: модель ещё думает (ответа нет вовсе)
  // или ответ есть, а голос готовится.
  const status =
    last?.role !== 'assistant' || visibleText(last).trim()
      ? null
      : !last.content
        ? (busy ? (messages[messages.length - 2]?.opening ? 'opening' : 'thinking') : null)
        : lastHeld
          ? 'voicing'
          : null
  const recording = voiceQ.state === 'recording'
  const transcribing = voiceQ.state === 'transcribing'
  // Пока вопрос голосом не задан до конца, другой вопрос не отправляем: чат
  // занят одним вопросом, и голосовой потерялся бы молча.
  const voiceBusy = voiceQ.state !== 'idle'
  const voiceError = voiceQ.error === 'rate'
    ? t('assistant.err.rate', { min: Math.max(1, Math.ceil((voiceQ.retryAfterSec || 60) / 60)) })
    : voiceQ.error
      ? t(VOICE_ERRORS[voiceQ.error])
      : null
  // Кнопка звука — когда Луна говорила: ответ на голосовой вопрос или тур.
  const spoke = messages.some((m) => m.voice || m.action?.kind === 'tour')

  // ── Перетаскивание (только компьютер) ──────────────────────────────────
  // Пока тянут, элемент двигается напрямую через style — без перерисовки всего
  // разговора на каждое движение мыши; место сохраняется, когда отпустили.
  // Указатель захватывается сразу при нажатии: резкий рывок уводил мышь с
  // 48-пиксельной кнопки раньше первого pointermove, и она не двигалась. Захват —
  // на элементе, который ловит события (шапка или кнопка): захвати его окно,
  // события ушли бы мимо обработчиков шапки. click кнопки захват не ломает.
  // Что тянут — окно или кнопку — говорит data-drag элемента, ловящего события.
  const onDragStart = (e) => {
    const kind = e.currentTarget.dataset.drag
    if (!free || e.button !== 0 || e.isPrimary === false) return
    if (kind === 'panel' && e.target.closest?.('button, a, input, textarea, select')) return
    const el = kind === 'panel' ? panelRef.current : launcherRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    dragRef.current = { kind, el, id: e.pointerId, sx: e.clientX, sy: e.clientY, x0: r.left, y0: r.top, size: { w: r.width, h: r.height }, pos: null }
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch {
      /* старый браузер — тянется, пока мышь над элементом */
    }
  }
  const onDragMove = (e) => {
    const d = dragRef.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.sx
    const dy = e.clientY - d.sy
    if (!d.pos) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      d.el.classList.add('is-dragging')
    }
    d.pos = clampPos({ x: d.x0 + dx, y: d.y0 + dy }, d.size, viewportNow())
    d.el.style.left = `${d.pos.x}px`
    d.el.style.top = `${d.pos.y}px`
  }
  const onDragEnd = (e) => {
    const d = dragRef.current
    if (!d || d.id !== e.pointerId) return
    dragRef.current = null
    if (!d.pos) return
    d.el.classList.remove('is-dragging')
    const next = toAnchor(d.pos, d.size, viewportNow())
    setPlace(next)
    writePlace(next)
    if (d.kind === 'launcher') {
      draggedRef.current = true
      // click приходит сразу за pointerup; не пришёл — следующее нажатие честное.
      setTimeout(() => {
        draggedRef.current = false
      }, 0)
    }
  }
  const resetPlace = (e) => {
    if (!free || e.target.closest?.('button')) return
    setPlace(DEFAULT_PLACE)
    writePlace(null)
  }

  // Компактное окно узкое: длинная подсказка в поле выросла бы в три строки, а
  // подпись о приватности — в пять. Подсказка короче, подпись — пока ученик
  // ничего не спросил (прочитать её до первого вопроса он успел).
  const compact = free && size === 'compact'

  // Звонок: что делает Луна и сколько минут осталось.
  const callStatus = !call || call.phase !== 'live'
    ? 'connecting'
    : call.micOn === false
      ? 'muted'
      : call.agentState === 'listening' || call.agentState === 'thinking' || call.agentState === 'speaking'
        ? call.agentState
        : 'connecting'
  const callLeftMin = callLive && call.session?.ttl
    ? Math.max(0, Math.ceil((call.session.ttl * 1000 - (Math.max(callNow, call.since) - call.since)) / 60_000))
    : null
  // Подпись того, что ученик говорит сейчас: пока Луна слушает и это ещё не
  // ушедшая ей реплика (та уже стоит в разговоре своим сообщением).
  const norm = (x) => String(x || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
  const lastUser = [...messages].reverse().find((m) => m.role === 'user' && !m.opening)
  const liveCaption =
    callLive && call.agentState === 'listening' && call.userText && norm(call.userText) !== norm(lastUser?.content)
      ? call.userText
      : ''
  const panelBox = free ? placeRect(place, panelSize(size, vp), vp) : null
  const launcherBox = free ? placeRect(place, { w: LAUNCHER_SIZE, h: LAUNCHER_SIZE }, vp) : null
  const boxStyle = (b, sized) =>
    b ? { left: b.x, top: b.y, right: 'auto', bottom: 'auto', ...(sized ? { width: b.w, height: b.h, maxHeight: 'none' } : {}) } : undefined
  // Облачко — сбоку от кнопки, к середине экрана: кнопку можно увести в любой угол.
  const hintLeft = free && place.h === 'l'
  const hintStyle = launcherBox
    ? {
        top: launcherBox.y + launcherBox.h / 2,
        bottom: 'auto',
        ...(hintLeft
          ? { left: launcherBox.x + launcherBox.w + HINT_GAP, right: 'auto' }
          : { right: vp.w - launcherBox.x + HINT_GAP, left: 'auto' }),
      }
    : undefined

  // Облачко команды: запись кончилась, идёт распознавание — уже «Думаю…», а не «Слушаю вас».
  const cmdPhase = cmd?.phase === 'listening' && voiceQ.state === 'transcribing' ? 'thinking' : cmd?.phase
  const badge = useBadge(cmd && !open ? { phase: cmdPhase, label: cmd.label } : null, open)
  // Плашка — над кнопкой и по её внешнему краю, как в макете; у кнопки в верхней половине
  // экрана — под ней: сверху там полоса колокольчика кабинета (TOP_EDGE).
  const badgeBelow = free && place.v === 't'
  const badgeStyle = launcherBox
    ? {
        top: badgeBelow ? launcherBox.y + launcherBox.h + BADGE_GAP : launcherBox.y - BADGE_GAP - BADGE_H,
        bottom: 'auto',
        ...(hintLeft
          ? { left: launcherBox.x, right: 'auto' }
          : { right: vp.w - launcherBox.x - launcherBox.w, left: 'auto' }),
      }
    : undefined

  if (!enabled) return null

  return (
    <div className={`asst${free ? ' asst--free' : ''}`} data-persona={persona.id} data-assistant-ignore="">
      {open && (
        <div
          ref={panelRef}
          className={`asst__panel asst__panel--${size}`}
          style={boxStyle(panelBox, true)}
          role="dialog"
          aria-label={t('assistant.title')}
          onKeyDown={(e) => e.key === 'Escape' && close()}
        >
          <div
            className="asst__head"
            title={free ? t('assistant.drag') : undefined}
            data-drag="panel"
            onDoubleClick={resetPlace}
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
          >
            {free && <span className="asst__grip" aria-hidden="true" />}
            <img className="asst__avatar" src={persona.avatar} alt="" width="32" height="32" draggable={false} />
            <div className="asst__who">
              <b>{t('assistant.title')}</b>
              <span>{call ? t('assistant.call.sub') : t('assistant.sub')}</span>
            </div>
            {!call && token && !assistantCallHidden() && (
              <button
                type="button"
                className="asst__icon asst__call-btn"
                aria-label={t('assistant.call.start')}
                title={t('assistant.call.start')}
                onClick={startCall}
              >
                <PhoneIcon />
              </button>
            )}
            {spoke && !call && (
              <button
                type="button"
                className={`asst__sound${muted ? ' is-muted' : ''}`}
                aria-pressed={!muted}
                aria-label={t(muted ? 'assistant.sound.unmute' : 'assistant.sound.mute')}
                title={t(muted ? 'assistant.sound.unmute' : 'assistant.sound.mute')}
                onClick={toggleMuted}
              >
                <SoundIcon muted={muted} />
              </button>
            )}
            {messages.length > 0 && (
              <button type="button" className="asst__icon" aria-label={t('assistant.reset')} title={t('assistant.reset')} onClick={reset}>
                <NewChatIcon />
              </button>
            )}
            {free && (
              <button
                type="button"
                className="asst__icon asst__size"
                aria-pressed={size === 'phone'}
                aria-label={t(size === 'phone' ? 'assistant.size.compact' : 'assistant.size.phone')}
                title={t(size === 'phone' ? 'assistant.size.compact' : 'assistant.size.phone')}
                onClick={() => setSize((v) => (v === 'phone' ? 'compact' : 'phone'))}
              >
                <SizeIcon big={size === 'phone'} />
              </button>
            )}
            <button type="button" className="asst__x" aria-label={t('assistant.close')} onClick={close}>
              ×
            </button>
          </div>

          <div className="asst__list" ref={listRef} data-selectable="" aria-live="polite">
            {messages.length === 0 && (
              <div className="asst__msg asst__msg--bot">
                <p>{t('assistant.hello')}</p>
              </div>
            )}
            {messages.map((m, i) => {
              const text = m.role === 'assistant' ? visibleText(m) : m.content
              // Часть ответа ещё не сказана — кнопка действия и пометки появятся с концом.
              const partial = m.content.slice(text.length).trim() !== ''
              return (m.role === 'assistant' && !text.trim()) || m.opening ? null : (
                <div key={i} className={`asst__msg asst__msg--${m.role === 'user' ? 'me' : 'bot'}`}>
                  {m.role === 'user' ? (
                    <p>
                      {m.voice && (
                        <span className="asst__voice-tag" role="img" aria-label={t('assistant.voice.asked')}>
                          <MicIcon size={13} />
                        </span>
                      )}
                      {m.content}
                    </p>
                  ) : (
                    <RichText text={text} />
                  )}
                  {partial && (
                    <span className="asst__dots asst__dots--more" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  )}
                  {m.action && !partial && (
                    <button
                      type="button"
                      className={`asst__action asst__action--${m.action.kind}`}
                      disabled={voiceBusy}
                      onClick={() => perform(m.action, { gesture: true })}
                    >
                      {m.action.kind === 'click'
                        ? t('assistant.action.click', { label: m.action.label })
                        : t(m.action.kind === 'tour' ? 'assistant.action.tour' : 'assistant.action.open', {
                            name: destinationName(m.action.target, lang),
                          })}
                    </button>
                  )}
                  {m.reported && <p className="asst__reported">{t('assistant.reported')}</p>}
                  {m.voiceFailed && <p className="asst__voice-failed">{t('assistant.voice.failed')}</p>}
                </div>
              )
            })}
            {status && <StatusBubble key={`${last?.vid || messages.length}:${status}`} phase={status} t={t} />}
            {callLive && callThinking && !status && <StatusBubble key={`call:${messages.length}`} phase="thinking" t={t} />}
            {liveCaption && (
              <div className="asst__msg asst__msg--me asst__msg--live" aria-hidden="true">
                <p>{liveCaption}</p>
              </div>
            )}
            {callNote && !call && <p className="asst__call-note">{callNote}</p>}
            {!asked && !call && (
              <div className="asst__chips">
                {suggestions.map((s) => (
                  <button
                    key={s.text}
                    type="button"
                    className={`asst__chip${s.bug ? ' asst__chip--bug' : ''}`}
                    disabled={voiceBusy}
                    onClick={() => sendTyped(s.text)}
                  >
                    {s.text}
                  </button>
                ))}
              </div>
            )}
            {error ? (
              <div className="asst__err" role="alert">
                <span>{error.text}</span>
                {error.retry && (
                  <button
                    type="button"
                    className="asst__ghost"
                    disabled={voiceBusy}
                    onClick={() => {
                      if (error.retry.voice) unlockSpeech()
                      send(error.retry.text, { voice: error.retry.voice })
                    }}
                  >
                    {t('assistant.retry')}
                  </button>
                )}
              </div>
            ) : voiceError ? (
              <div className="asst__err" role="alert">
                <span>{voiceError}</span>
              </div>
            ) : null}
          </div>

          {call ? (
            <div className="asst__call" role="group" aria-label={t('assistant.call.title')}>
              <span className={`asst__call-state is-${callStatus}`} aria-live="polite">
                <i className="asst__call-dot" aria-hidden="true" />
                {t(`assistant.call.state.${callStatus}`)}
                {callLeftMin != null && <small>{t('assistant.call.left', { min: callLeftMin })}</small>}
              </span>
              {/* Перебить кнопкой (живой звонок 16.10.2026: «должна быть возможность
                  перебить»). Голосом тоже можно — агент в звонке перебивается по
                  первому слову, — но в шумной комнате кнопка надёжнее. */}
              {callStatus === 'speaking' && (
                <button
                  type="button"
                  className="asst__call-stop"
                  title={t('assistant.call.interruptHint')}
                  onClick={() => callCtlRef.current?.say('')}
                >
                  {t('assistant.call.interrupt')}
                </button>
              )}
              {call.audioBlocked && (
                <button type="button" className="asst__ghost" onClick={() => callCtlRef.current?.startAudio()}>
                  {t('assistant.call.audio')}
                </button>
              )}
              <button
                type="button"
                className={`asst__call-mic${call.micOn === false ? ' is-off' : ''}`}
                aria-pressed={call.micOn === false}
                aria-label={t(call.micOn === false ? 'assistant.call.micOn' : 'assistant.call.micOff')}
                title={t(call.micOn === false ? 'assistant.call.micOn' : 'assistant.call.micOff')}
                disabled={!callLive}
                onClick={() => callCtlRef.current?.toggleMic()}
              >
                {call.micOn === false ? <MicOffIcon /> : <MicIcon />}
              </button>
              <button type="button" className="asst__call-end" aria-label={t('assistant.call.end')} title={t('assistant.call.end')} onClick={endCall}>
                <PhoneIcon size={20} />
              </button>
            </div>
          ) : (
          <form
            className="asst__form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!voiceBusy) sendTyped(input)
            }}
          >
            {recording || transcribing ? (
              <div className="asst__listening" aria-live="polite">
                {recording && <span className="asst__rec-dot" aria-hidden="true" />}
                {recording ? t('assistant.mic.listening', { sec: clock(voiceQ.elapsed) }) : t('assistant.mic.transcribing')}
              </div>
            ) : (
              <textarea
                ref={inputRef}
                className="asst__input"
                rows={1}
                value={input}
                maxLength={MAX_INPUT}
                placeholder={t(compact ? 'assistant.placeholder.short' : 'assistant.placeholder')}
                onChange={(e) => {
                  // Ученик начал печатать — ответ дослушивать не хочет.
                  if (e.target.value) stopVoice()
                  setInput(e.target.value)
                }}
                onKeyDown={onKeyDown}
              />
            )}
            {voiceQ.supported && (
              <button
                type="button"
                className={`asst__mic${recording ? ' is-rec' : ''}`}
                aria-label={t(recording ? 'assistant.mic.stop' : 'assistant.mic.start')}
                title={t(recording ? 'assistant.mic.stop' : 'assistant.mic.start')}
                disabled={questionBusy || transcribing || voiceQ.state === 'starting'}
                onClick={onMic}
              >
                <MicIcon />
              </button>
            )}
            {!recording && !transcribing && (
              <button type="submit" className="asst__send" disabled={questionBusy || voiceBusy || !input.trim()} aria-label={t('assistant.send')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 12 20 4l-6 16-2.5-6.5L4 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </form>
          )}
          {/* Позывной — там же, где подпись о приватности: в компактном окне после
              первого вопроса места под неё нет, и переключатель уходит вместе с ней. */}
          {(!compact || !asked) && !call && wake.supported && Boolean(token) && (
            <div className="asst__wake">
              <label className="asst__wake-row">
                <input
                  type="checkbox"
                  checked={wake.on}
                  onChange={(e) => (e.target.checked ? wake.enable() : wake.disable())}
                />
                <span>{t('assistant.wake.toggle')}</span>
              </label>
              {(wake.on || wake.error) && (
                <p className="asst__wake-hint" role={wake.error ? 'alert' : undefined}>
                  {wake.error
                    ? t(WAKE_ERRORS[wake.error])
                    : wake.state === 'loading'
                      ? t('assistant.wake.loading')
                      : t('assistant.wake.hint')}
                </p>
              )}
            </div>
          )}
          {(!compact || !asked) && !call && <p className="asst__privacy">{t('assistant.privacy')}</p>}
        </div>
      )}

      {callLive && (
        <Suspense fallback={null}>
          <AssistantCall
            session={call.session}
            onAsk={callAsk}
            onCancel={callCancel}
            onCommit={callCommit}
            onState={callState}
            onEnded={callEnded}
            controlRef={callCtlRef}
          />
        </Suspense>
      )}

      {/* Мышь сквозь облачко проходит (pointer-events: none), а читалке хватает
          подписи самой кнопки — облачко её лишь повторяет. */}
      {/* Плашка голосовой команды (см. шапку): окно закрыто, Луна слушает или нажала.
          В разметке — до кнопки: выезжает из-под неё. */}
      {badge && (
        <CmdBadge badge={badge} style={badgeStyle} free={free} below={badgeBelow} t={t} />
      )}

      {introHint && !open && !badge && (
        <div
          className={`asst__hint${free ? ' is-free' : ''}${hintLeft ? ' is-left' : ''}`}
          style={hintStyle}
          aria-hidden="true"
          data-intro-hint=""
        >
          <b className="asst__hint-title">{t('assistant.hint.title')}</b>
          <span className="asst__hint-text">{t('assistant.hint.text')}</span>
          {wake.on && <span className="asst__hint-voice">{t('assistant.hint.voice')}</span>}
        </div>
      )}

      {/* Открытое окно встаёт на место кнопки, и она прячется (CSS is-open):
          закрывает окно его же «×» в шапке. */}
      <button
        ref={launcherRef}
        type="button"
        className={`asst__launcher${open ? ' is-open' : ''}${call ? ' is-call' : ''}${badge ? ' is-wake' : ''}`}
        style={boxStyle(launcherBox, false)}
        aria-label={t('assistant.launcher')}
        aria-expanded={open}
        data-drag="launcher"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        onClick={() => {
          if (draggedRef.current) return
          if (open) close()
          else openWindow()
        }}
      >
        {/* Ореол «слушаю» (макет «При вызове Луны»): только пока Луна ждёт команду. */}
        {badge && (
          <span className={`asst__halo${badge.phase === 'listening' && !badge.out ? '' : ' is-off'}`} aria-hidden="true" />
        )}
        <img src={persona.avatar} alt="" width="50" height="50" draggable={false} />
        <span className="asst__name" aria-hidden="true">{t('assistant.title')}</span>
        {!open && wake.state !== 'off' && (
          <span
            className={`asst__wake-dot is-${wake.state}`}
            data-wake={wake.state}
            title={t(`assistant.wake.badge.${wake.state}`)}
            aria-hidden="true"
          />
        )}
      </button>
    </div>
  )
}
