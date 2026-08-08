import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import TrainerResult from '../components/TrainerResult.jsx'
import { useI18n } from '../i18n.jsx'
import { VolumeIcon, ChevronLeftIcon } from '../components/icons.jsx'
import {
  buildSession,
  checkAnswer,
  feedbackBody,
  headingFor,
  mix,
  SESSION_SIZE,
  COINS_PER_TASK,
} from '../practice/listening/engine.js'
import { markTaskDone, getListeningDone, LISTENING_PROGRESS_EVENT } from '../practice/listening/listeningProgress.js'
import { recordSkill } from '../practice/skillStats.js'
import { usePracticeEntitlement } from '../practice/usePracticeEntitlement.js'
import PracticeLimitScreen from '../components/PracticeLimitScreen.jsx'

const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1']
const normLevel = (lvl) => {
  const l = String(lvl || 'a1').toLowerCase()
  return LEVELS.includes(l) ? l : 'a1'
}
const audioUrl = (level, file) => `/practice/listening/audio/${level}/${file}`

// Render an explanation string that may contain <b>…</b>.
function Rich({ html }) {
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

// ───────────────────────── Audio ─────────────────────────
// Segment clip player: normal ▶ + a sky-blue "Прослушать медленно" (0.7×).
function AudioBlock({ src }) {
  const { t } = useI18n()
  const ref = useRef(null)
  const startedRef = useRef(false)
  const [playing, setPlaying] = useState(false)

  const play = useCallback((rate) => {
    const a = ref.current
    if (!a) return
    a.pause()
    a.currentTime = 0
    a.playbackRate = rate
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }, [])

  // Auto-play as soon as the NEW clip is ready. Crucially call load() first:
  // swapping the <audio src> attribute does NOT reload the media element, so
  // without this play() would replay the PREVIOUS task's clip. We start on the
  // `canplay` event (below) rather than a fixed timer, so there is no artificial
  // delay before speech ("starts too late").
  useEffect(() => {
    setPlaying(false)
    startedRef.current = false
    const a = ref.current
    if (a) a.load()
    return () => {
      if (ref.current) ref.current.pause()
    }
  }, [src])

  // Fires after (re)load; auto-start the clip exactly once (not on later
  // canplay events from the slow-replay seek).
  const onCanPlay = () => {
    if (startedRef.current) return
    startedRef.current = true
    play(1)
  }

  return (
    <div className="lt-audio">
      <audio
        key={src}
        ref={ref}
        src={src}
        preload="auto"
        onCanPlay={onCanPlay}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        className="lt-audio__btn"
        data-playing={playing}
        aria-label={t('listening.listen')}
        onClick={() => play(1)}
      >
        <VolumeIcon size={26} />
      </button>
      <button type="button" className="lt-audio__slow" onClick={() => play(0.7)}>
        🐢 {t('listening.listenSlow')}
      </button>
    </div>
  )
}

// ───────────────────────── Renderers ─────────────────────────
function ChoiceTask({ task, response, setResponse, disabled, result }) {
  const options = useMemo(() => mix(task.options || []), [task.id])
  const grid = options.length === 4 && options.every((o) => o.length <= 14)
  return (
    <div className={`lt-opts ${grid ? 'lt-opts--grid' : ''}`}>
      {options.map((o) => {
        const chosen = response === o
        let state = ''
        if (result) {
          if (o === task.answer) state = 'is-correct'
          else if (chosen) state = 'is-wrong'
        } else if (chosen) state = 'is-on'
        return (
          <button
            key={o}
            type="button"
            className={`lt-opt ${state}`}
            disabled={disabled}
            onClick={() => setResponse(o)}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}

function AssembleTask({ task, response, setResponse, disabled }) {
  const { t } = useI18n()
  const bank = useMemo(() => mix([...(task.tokens || []), ...(task.distractors || [])]), [task.id])
  const chosen = response || []
  const used = useMemo(() => {
    const counts = {}
    for (const w of chosen) counts[w] = (counts[w] || 0) + 1
    return counts
  }, [chosen])

  const add = (w) => !disabled && setResponse([...chosen, w])
  const removeAt = (i) => !disabled && setResponse(chosen.filter((_, k) => k !== i))

  return (
    <div className="lt-asm">
      <div className="lt-asm__slot">
        {chosen.length === 0 && <span className="lt-asm__ph">{t('listening.asmPh')}</span>}
        {chosen.map((w, i) => (
          <button key={i} type="button" className="lt-tile lt-tile--on" disabled={disabled} onClick={() => removeAt(i)}>
            {w}
          </button>
        ))}
      </div>
      <div className="lt-asm__bank">
        {bank.map((w, i) => {
          const takenAll = (used[w] || 0) >= bank.filter((x) => x === w).length
          return (
            <button
              key={i}
              type="button"
              className="lt-tile"
              disabled={disabled || takenAll}
              data-spent={takenAll}
              onClick={() => add(w)}
            >
              {w}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TypeTask({ task, response, setResponse, disabled, onEnter }) {
  const { t } = useI18n()
  return (
    <input
      className="lt-input"
      type="text"
      value={response || ''}
      disabled={disabled}
      placeholder={t('listening.typePh')}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      onChange={(e) => setResponse(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
    />
  )
}

// ───────────────────────── Feedback ─────────────────────────
function Feedback({ ok, body }) {
  const { t } = useI18n()
  return (
    <div className={`lt-fb ${ok ? 'lt-fb--ok' : 'lt-fb--no'}`}>
      <div className="lt-fb__icon">{ok ? '✓' : '☹'}</div>
      <div className="lt-fb__text">
        <div className="lt-fb__title">{ok ? t('listening.good') : t('listening.bad')}</div>
        <div className="lt-fb__body"><Rich html={body} /></div>
      </div>
      {ok && (
        <div className="lt-fb__coin">
          <img src="/practice/listening/coin.png" alt="" />
          <span>+{COINS_PER_TASK}</span>
        </div>
      )}
    </div>
  )
}

// ───────────────────────── Intro ─────────────────────────
function Intro({ level, loading, onStart, doneCount }) {
  const { t } = useI18n()
  return (
    <div className="lt-intro">
      <div className="lt-intro__mascot">
        <img src="/practice/listening-mascot.png" alt="" />
      </div>
      <h2 className="lt-intro__title">{t('listening.introTitle')}</h2>
      <p className="lt-intro__sub">{t('practice.listening.desc')}</p>
      <div className="lt-intro__hint">🎧 {t('listening.headphones')}</div>
      <button type="button" className="lt-primary" disabled={loading} onClick={onStart}>
        {loading ? t('practice.loading') : t('listening.start')}
      </button>
      <div className="lt-intro__level">
        {t('kingdom.levelBadge', { label: level.toUpperCase() })}
      </div>
      {doneCount > 0 && (
        <div className="lt-intro__done">{t('listening.doneCount', { count: doneCount })}</div>
      )}
    </div>
  )
}

// ───────────────────────── Exit confirm ─────────────────────────
// Показывается при попытке выйти из НЕзавершённой тренировки.
function ExitModal({ onStay, onLeave }) {
  const { t } = useI18n()
  return (
    <div className="lt-modal" role="dialog" aria-modal="true">
      <div className="lt-modal__backdrop" onClick={onStay} />
      <div className="lt-modal__card">
        <button type="button" className="lt-modal__close" aria-label={t('listening.close')} onClick={onStay}>
          ✕
        </button>
        <div className="lt-modal__icon" role="img" aria-label="" />
        <div className="lt-modal__title">{t('listening.exitTitle')}</div>
        <div className="lt-modal__sub">{t('listening.exitSub')}</div>
        <button type="button" className="lt-primary" onClick={onStay}>{t('listening.exitStay')}</button>
        <button type="button" className="lt-modal__leave" onClick={onLeave}>{t('listening.exitLeave')}</button>
      </div>
    </div>
  )
}

// ───────────────────────── Screen ─────────────────────────
export default function ListeningPage({ userLevel, userName, token, onNav, onProfile, isDemoAccount }) {
  const { t } = useI18n()
  const level = normLevel(userLevel)
  const [phase, setPhase] = useState('intro') // 'intro' | 'task' | 'result'
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [queue, setQueue] = useState([])
  const [response, setResponse] = useState(null)
  const [answered, setAnswered] = useState(null) // { ok, body }
  const [coins, setCoins] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [stepsDone, setStepsDone] = useState(0)
  const [stepsTotal, setStepsTotal] = useState(0)
  const [exitOpen, setExitOpen] = useState(false)

  // Счётчик пройденных заданий уровня — обновляется на отметку и на гидратацию
  // (событие LISTENING_PROGRESS_EVENT шлёт и локальная отметка, и синк при входе).
  const [doneCount, setDoneCount] = useState(() => getListeningDone(level).size)
  useEffect(() => {
    const refresh = () => setDoneCount(getListeningDone(level).size)
    refresh()
    window.addEventListener(LISTENING_PROGRESS_EVENT, refresh)
    return () => window.removeEventListener(LISTENING_PROGRESS_EVENT, refresh)
  }, [level])

  const current = queue[0] || null

  const loadContent = useCallback(async () => {
    if (content) return content
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/practice/listening/content/${level}.json`)
      if (!res.ok) throw new Error('bad status ' + res.status)
      const data = await res.json()
      setContent(data)
      return data
    } catch (e) {
      setError(t('listening.loadError'))
      return null
    } finally {
      setLoading(false)
    }
  }, [content, level, t])

  const startSession = useCallback(async () => {
    const data = content || (await loadContent())
    if (!data) return
    const session = buildSession(data, SESSION_SIZE)
    setQueue(session)
    setResponse(null)
    setAnswered(null)
    setCoins(0)
    setCorrect(0)
    setWrong(0)
    setStepsDone(0)
    setStepsTotal(session.length)
    setExitOpen(false)
    setPhase('task')
  }, [content, loadContent])

  const submit = useCallback(() => {
    if (!current || answered) return
    const { ok } = checkAnswer(current, response)
    let requeued = false
    if (!current._retry) recordSkill('listening', ok)
    if (ok) {
      setCoins((c) => c + COINS_PER_TASK)
      setCorrect((c) => c + 1)
      markTaskDone(current.id)
    } else {
      setWrong((w) => w + 1)
      if (!current._retry) {
        requeued = true
        setStepsTotal((s) => s + 1)
        setQueue((q) => [...q, { ...current, _retry: true }])
      }
    }
    setAnswered({ ok, body: feedbackBody(current, ok, requeued, t) })
  }, [current, answered, response, t])

  const next = useCallback(() => {
    setStepsDone((s) => s + 1)
    setQueue((q) => {
      const rest = q.slice(1)
      if (rest.length === 0) setPhase('result')
      return rest
    })
    setResponse(null)
    setAnswered(null)
  }, [])

  const canSubmit = useMemo(() => {
    if (!current) return false
    if (current.type === 'listen_choice') return response != null
    if (current.type === 'listen_assemble') return Array.isArray(response) && response.length > 0
    if (current.type === 'listen_type') return typeof response === 'string' && response.trim() !== ''
    return false
  }, [current, response])

  const progress = stepsTotal ? Math.round((stepsDone / stepsTotal) * 100) : 0

  const back = () => onNav?.('practice')
  // выход из НЕзавершённой тренировки требует подтверждения
  const requestBack = () => (phase === 'task' ? setExitOpen(true) : back())

  const entitlement = usePracticeEntitlement('listening', token)
  if (!entitlement.loading && !entitlement.allowed) {
    return (
      <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
        <PracticeLimitScreen limit={entitlement.limit} onBack={back} isDemoAccount={isDemoAccount} />
      </LearningLayout>
    )
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="lt">
        <div className="lt-top">
          <button type="button" className="lt-back" onClick={requestBack}>
            <ChevronLeftIcon size={16} /> {t('common.back')}
          </button>
          <div className="lt-crumb">
            <b>{t('practice.listening.title')}</b>
            <span>{t('practice.title')}</span>
          </div>
        </div>

        {error && <div className="lt-note lt-note--err">{error}</div>}

        {exitOpen && <ExitModal onStay={() => setExitOpen(false)} onLeave={back} />}

        {phase === 'intro' && (
          <Intro level={level} loading={loading} onStart={startSession} doneCount={doneCount} />
        )}

        {phase === 'result' && (
          <TrainerResult correct={correct} wrong={wrong} onAgain={startSession} onHome={back} />
        )}

        {phase === 'task' && current && (
          <div className="lt-task">
            <div className="lt-bar">
              <div className="lt-bar__track"><span style={{ width: `${progress}%` }} /></div>
              <span className="lt-bar__pct">{progress}%</span>
            </div>

            <h3 className="lt-heading">{headingFor(current, t)}</h3>

            <AudioBlock src={audioUrl(level, current.audio)} />

            {current.type === 'listen_choice' && (
              <ChoiceTask task={current} response={response} setResponse={setResponse} disabled={!!answered} result={answered} />
            )}
            {current.type === 'listen_assemble' && (
              <AssembleTask task={current} response={response} setResponse={setResponse} disabled={!!answered} />
            )}
            {current.type === 'listen_type' && (
              <TypeTask task={current} response={response} setResponse={setResponse} disabled={!!answered} onEnter={() => canSubmit && submit()} />
            )}

            {answered && <Feedback ok={answered.ok} body={answered.body} />}

            {answered ? (
              <button type="button" className="lt-primary" onClick={next}>
                {t('listening.continue')}
              </button>
            ) : (
              <button type="button" className="lt-primary" disabled={!canSubmit} onClick={submit}>
                {t('listening.check')}
              </button>
            )}
          </div>
        )}
      </div>
    </LearningLayout>
  )
}
