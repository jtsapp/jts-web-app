import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
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
        aria-label="Прослушать"
        onClick={() => play(1)}
      >
        <VolumeIcon size={26} />
      </button>
      <button type="button" className="lt-audio__slow" onClick={() => play(0.7)}>
        🐢 Прослушать медленно
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
        {chosen.length === 0 && <span className="lt-asm__ph">Нажимайте на слова, чтобы собрать фразу…</span>}
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
  return (
    <input
      className="lt-input"
      type="text"
      value={response || ''}
      disabled={disabled}
      placeholder="Что вы услышали?"
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
  return (
    <div className={`lt-fb ${ok ? 'lt-fb--ok' : 'lt-fb--no'}`}>
      <div className="lt-fb__icon">{ok ? '✓' : '☹'}</div>
      <div className="lt-fb__text">
        <div className="lt-fb__title">{ok ? 'Молодец!' : 'Неверный ответ'}</div>
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
function Intro({ level, loading, onStart }) {
  return (
    <div className="lt-intro">
      <div className="lt-intro__mascot">
        <img src="/practice/listening-mascot.png" alt="" />
      </div>
      <h2 className="lt-intro__title">Тренировка Listening</h2>
      <p className="lt-intro__sub">
        Слушай и разбирай английскую речь: собери фразу, напиши диктант, различи похожие слова
      </p>
      <div className="lt-intro__hint">
        🎧 Оденьте наушники для комфортного прохождения и установите правильную громкость
      </div>
      <button type="button" className="lt-primary" disabled={loading} onClick={onStart}>
        {loading ? 'Загрузка…' : 'Начать тренировку'}
      </button>
      <div className="lt-intro__level">Уровень {level.toUpperCase()}</div>
    </div>
  )
}

// ───────────────────────── Result ─────────────────────────
function Result({ correct, total, coins, onAgain, onHome }) {
  const pct = total ? Math.round((correct / total) * 100) : 0
  const good = pct >= 60
  return (
    <div className="lt-result">
      <div className="lt-result__mascot">
        <img src="/practice/listening-mascot.png" alt="" />
      </div>
      <div className="lt-result__pct" data-good={good}>{pct}%</div>
      <h2 className="lt-result__title">{good ? 'Отличный результат!' : 'Можно лучше'}</h2>
      <div className="lt-result__stats">
        <div className="lt-stat"><b>{correct}/{total}</b><span>верных ответов</span></div>
        <div className="lt-stat">
          <b><img src="/practice/listening/coin.png" alt="" />{coins}</b><span>монет</span>
        </div>
      </div>
      <button type="button" className="lt-primary" onClick={onAgain}>Ещё тренировка</button>
      <button type="button" className="lt-ghost" onClick={onHome}>На главную</button>
    </div>
  )
}

// ───────────────────────── Screen ─────────────────────────
export default function ListeningPage({ userLevel, userName, token, onNav, onProfile }) {
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
  const [stepsDone, setStepsDone] = useState(0)
  const [stepsTotal, setStepsTotal] = useState(0)

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
      setError('Не удалось загрузить материалы аудирования.')
      return null
    } finally {
      setLoading(false)
    }
  }, [content, level])

  const startSession = useCallback(async () => {
    const data = content || (await loadContent())
    if (!data) return
    const session = buildSession(data, SESSION_SIZE)
    setQueue(session)
    setResponse(null)
    setAnswered(null)
    setCoins(0)
    setCorrect(0)
    setStepsDone(0)
    setStepsTotal(session.length)
    setPhase('task')
  }, [content, loadContent])

  const submit = useCallback(() => {
    if (!current || answered) return
    const { ok } = checkAnswer(current, response)
    let requeued = false
    if (ok) {
      setCoins((c) => c + COINS_PER_TASK)
      setCorrect((c) => c + 1)
    } else if (!current._retry) {
      requeued = true
      setStepsTotal((s) => s + 1)
      setQueue((q) => [...q, { ...current, _retry: true }])
    }
    setAnswered({ ok, body: feedbackBody(current, ok, requeued) })
  }, [current, answered, response])

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

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="lt">
        <div className="lt-top">
          <button type="button" className="lt-back" onClick={back}>
            <ChevronLeftIcon size={16} /> Назад
          </button>
          <div className="lt-crumb"><b>Аудирование</b><span>Практика</span></div>
        </div>

        {error && <div className="lt-note lt-note--err">{error}</div>}

        {phase === 'intro' && <Intro level={level} loading={loading} onStart={startSession} />}

        {phase === 'result' && (
          <Result correct={correct} total={stepsDone} coins={coins} onAgain={startSession} onHome={back} />
        )}

        {phase === 'task' && current && (
          <div className="lt-task">
            <div className="lt-bar">
              <div className="lt-bar__track"><span style={{ width: `${progress}%` }} /></div>
              <span className="lt-bar__pct">{progress}%</span>
            </div>

            <h3 className="lt-heading">{headingFor(current)}</h3>

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
              <button type="button" className="lt-primary" onClick={next}>Продолжить</button>
            ) : (
              <button type="button" className="lt-primary" disabled={!canSubmit} onClick={submit}>
                Проверить
              </button>
            )}
          </div>
        )}
      </div>
    </LearningLayout>
  )
}
