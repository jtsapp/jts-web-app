import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { DIFFICULTIES, ROUND_SECONDS, advance, initialState, isLost, isOver } from '../../practice/arcade/engine.js'
import { openMicrophone } from '../../practice/arcade/microphone.js'
import { startTranscript } from '../../practice/arcade/transcript.js'
import { emptyTranscript, summarise } from '../../practice/arcade/speechSegments.js'
import { MIN_WORDS, fetchReviewBudget } from '../../practice/arcade/reviewClient.js'
import TranscriptDialog from './TranscriptDialog.jsx'
import { useArcadeReview } from './useArcadeReview.js'
import { createVoiceActivity } from '../../practice/arcade/voiceActivity.js'
import { pitched } from '../../practice/arcade/voiceFeatures.js'
import { nextTopic, topicText, topicTranslated, TOPICS } from '../../practice/arcade/topics.js'
import ArcadeScene from './ArcadeScene.jsx'
import ArcadeResults from './ArcadeResults.jsx'
import { useArcadeFullscreen } from './useArcadeFullscreen.js'
import { formatNumber } from './format.js'
import { CollapseIcon, ExpandIcon, MicIcon, StopIcon } from '../../components/icons.jsx'
import { PkChevron } from '../practice/PracticeIcons.jsx'

// Игра «Аркады» — порт javaTest src/components/Game.tsx. Разделение то же:
// правила раунда — engine.js, микрофон — microphone.js, «слова или звук» и
// стенограмма — transcript.js, ИИ-разбор — reviewClient.js и роут
// /api/practice/arcade/review, а здесь только жизненный цикл раунда и отрисовка.
//
// Что изменилось против исходника. Язык игры — язык интерфейса приложения
// (useI18n), своего переключателя нет; на нём же пишется и ИИ-разбор. Под
// полем — итоги раунда (ArcadeResults). Раунды никуда не сохраняются: в сеть
// уходит только стенограмма, и только по кнопке «ИИ-разбор».

// Ошибки держим ключами словаря: так они следуют за сменой языка.
function micErrorKey(e) {
  if (e?.name === 'NotAllowedError') return 'arcade.error.micDenied'
  if (e?.code === 'unsupported') return 'arcade.error.micUnsupported'
  if (e?.code === 'timeout') return 'arcade.error.micTimeout'
  return 'arcade.error.micGeneric'
}

export default function ArcadeGame({ token = null }) {
  const { t, lang } = useI18n()
  // Средняя сложность по умолчанию — как в исходной игре.
  const [level, setLevel] = useState(1)
  // Тема неизвестна до «Старта», чтобы её нельзя было обдумать заранее.
  const [topic, setTopic] = useState(null)
  const [status, setStatus] = useState('ready') // ready | loading | playing | finished
  const [state, setState] = useState(initialState)
  const [error, setError] = useState(null)
  const [micStage, setMicStage] = useState('waiting') // waiting | calibrating
  const [heard, setHeard] = useState('none') // none | sound | hesitation
  const [noRecognition, setNoRecognition] = useState(false)
  const [result, setResult] = useState(null)
  const [transcript, setTranscript] = useState(emptyTranscript)
  // Код отказа распознавателя посреди раунда (blocked | network | audio | other).
  const [transcriptNote, setTranscriptNote] = useState(null)
  const [showTranscript, setShowTranscript] = useState(false)
  const review = useArcadeReview(token)
  const cleanup = useRef(null)
  // Законченный раунд: сложность и номер темы — то, что уходит в ИИ-разбор.
  const round = useRef(null)
  const analyseButton = useRef(null)
  const stop = useRef(null)
  // Поколение раунда: любой запоздалый колбэк прошлого раунда (разрешение
  // микрофона пришло после «Отмены») сверяет его и молча отваливается.
  const generation = useRef(0)
  const panel = useRef(null)
  const fullscreen = useArcadeFullscreen(panel)

  const difficulty = DIFFICULTIES[level]
  const busy = status === 'playing' || status === 'loading'
  const enoughWords = summarise(transcript).words >= MIN_WORDS

  // Остаток ИИ-разборов на сегодня — чтобы показать его до первого нажатия.
  const { setBudget } = review
  useEffect(() => {
    let alive = true
    fetchReviewBudget(token).then((b) => alive && setBudget(b))
    return () => {
      alive = false
    }
  }, [token, setBudget])

  useEffect(
    () => () => {
      generation.current++
      cleanup.current?.()
    },
    [],
  )
  // Скрытая вкладка заканчивает раунд честно: в фоне браузер душит кадры, и
  // замеры громкости перестают что-либо значить.
  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop.current?.()
    }
    document.addEventListener('visibilitychange', hide)
    return () => document.removeEventListener('visibilitychange', hide)
  }, [])

  async function start() {
    // Прошлый раунд стираем до того, как ждать разрешения микрофона.
    setState(initialState())
    setResult(null)
    setTranscript(emptyTranscript())
    setTranscriptNote(null)
    review.reset()
    round.current = null
    setNoRecognition(false)
    setHeard('none')
    setStatus('loading')
    setError(null)
    setMicStage('waiting')
    // Тема открывается именно нажатием «Старт».
    const chosen = nextTopic(level, topic)
    setTopic(chosen)
    const limit = difficulty.limit
    const id = ++generation.current
    const controller = new AbortController()
    cleanup.current = () => controller.abort()
    try {
      const mic = await openMicrophone(() => {
        if (id === generation.current) setMicStage('calibrating')
      }, controller.signal)
      if (id !== generation.current) {
        mic.close()
        return
      }
      // Распознавание слушает рядом с порогом громкости уже после калибровки.
      const speech = startTranscript(
        (next) => {
          if (id === generation.current) setTranscript(next)
        },
        (code) => {
          if (id === generation.current) setTranscriptNote(code)
        },
      )
      if (!speech) setNoRecognition(true)
      let current = initialState()
      let previous = performance.now()
      let frame = 0
      let ended = false
      const detectVoice = createVoiceActivity(mic.noiseFloor)
      setState(current)
      setStatus('playing')
      const close = () => {
        cancelAnimationFrame(frame)
        mic.close()
        stop.current = null
        cleanup.current = null
      }
      const finish = () => {
        if (ended) return
        ended = true
        close()
        // stop(), а не abort(): последние распознанные слова доезжают уже после раунда.
        speech?.stop()
        setStatus('finished')
        setResult({ ...current, level })
        round.current = { level: DIFFICULTIES[level].key, topicIndex: chosen }
      }
      // Уход с экрана посреди раунда — обрываем всё, недослушанное не нужно.
      cleanup.current = () => {
        close()
        speech?.abort()
      }
      stop.current = finish
      const tick = (now) => {
        if (!mic.active()) {
          setError('arcade.error.micDisconnected')
          finish()
          return
        }
        const features = mic.features()
        const voiced = detectVoice(features.volume, now, pitched(features))
        // Пилу отгоняют только распознанные слова; «э-э-э» и звук без слов —
        // та же тишина.
        const speaking = speech ? speech.sample(voiced, now, features) : voiced
        current = advance(current, speaking, (now - previous) / 1000, limit)
        previous = now
        setHeard(!voiced ? 'none' : speech?.hesitating() ? 'hesitation' : 'sound')
        setState(current)
        if (isOver(current)) finish()
        else frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    } catch (e) {
      if (id !== generation.current) return
      setStatus('ready')
      setTopic(null)
      setError(micErrorKey(e))
    }
  }

  function onMainButton() {
    if (status === 'loading') {
      generation.current++
      cleanup.current?.()
      cleanup.current = null
      setStatus('ready')
      setTopic(null)
    } else if (status === 'playing') stop.current?.()
    else void start()
  }

  // Claude зовётся только по кнопке «ИИ-разбор» в окне стенограммы, один раз
  // за раунд, на языке интерфейса в момент нажатия.
  function startReview() {
    const finished = round.current
    if (!token || !enoughWords || !finished) return
    if (review.state.status === 'error') review.reset()
    else if (review.state.status !== 'idle') return
    void review.review({ ...finished, language: lang, transcript })
  }

  function closeTranscript() {
    setShowTranscript(false)
    // Фокус возвращается туда, откуда окно открыли.
    analyseButton.current?.focus()
  }

  function pickLevel(i) {
    setLevel(i)
    setStatus('ready')
    setState(initialState())
    setTopic(null)
  }

  // Что видит ученик — производное от состояния раунда.
  const remaining = Math.max(0, Math.ceil(ROUND_SECONDS - state.elapsed))
  const urgent = status === 'playing' && remaining <= 10
  const lost = isLost(state)
  const translated = topicTranslated(level, lang)
  const topicShown = topic === null ? null : topicText(level, topic, lang)
  let live
  if (status === 'loading')
    live = { key: micStage === 'waiting' ? 'arcade.status.waiting' : 'arcade.status.calibrating', tone: '' }
  else if (status === 'playing')
    live = state.wasSpeaking
      ? { key: 'arcade.status.speaking', tone: 'is-speaking' }
      : heard === 'hesitation'
        ? { key: 'arcade.status.hesitation', tone: 'is-warning' }
        : heard === 'sound'
          ? { key: 'arcade.status.sound', tone: 'is-warning' }
          : { key: 'arcade.status.silence', tone: 'is-silence' }
  else if (status === 'finished')
    live = lost ? { key: 'arcade.status.lost', tone: 'is-silence' } : { key: 'arcade.status.done', tone: 'is-done' }
  else live = { key: 'arcade.status.ready', tone: '' }
  // Объявляются по разу, а не каждую секунду.
  const announcement =
    status !== 'playing' ? '' : remaining <= 10 ? t('arcade.announce.last') : remaining <= 30 ? t('arcade.announce.half') : ''

  const mainLabel =
    status === 'playing'
      ? t('arcade.stop')
      : status === 'loading'
        ? t('arcade.cancel')
        : status === 'finished'
          ? t('arcade.again')
          : t('arcade.start')

  return (
    <section className="ar-game" aria-label={t('arcade.section')}>
      <div className="ar-choose">
        <h2>{t('arcade.chooseChallenge')}</h2>
        <span>{t('arcade.chooseChallengeHint')}</span>
      </div>
      <div className="ar-levels">
        {DIFFICULTIES.map((d, i) => (
          <button
            key={d.key}
            type="button"
            disabled={busy}
            aria-pressed={i === level}
            className={`ar-level ar-level--${d.key}${i === level ? ' is-on' : ''}`}
            onClick={() => pickLevel(i)}
          >
            <span className="ar-level__top">
              <span className="ar-level__bars" aria-hidden="true">
                {[0, 1, 2, 3].map((n) => (
                  <i key={n} style={{ height: 7 + n * 3, opacity: n <= i ? 1 : 0.25 }} />
                ))}
              </span>
              <b>{t(`arcade.difficulty.${d.key}`)}</b>
              <span className="ar-level__dot" aria-hidden="true" />
            </span>
            <span className="ar-level__meta">
              {t('arcade.band', { band: d.band })}
              <span>{t('arcade.silenceShort', { seconds: formatNumber(d.limit, lang) })}</span>
            </span>
          </button>
        ))}
      </div>

      <div ref={panel} className={`ar-panel${fullscreen.active ? ' is-full' : ''}`}>
        <span className="ar-sun" aria-hidden="true" />
        <div className="ar-panel__top">
          <span className="ar-brand">
            <i aria-hidden="true" /> SPEAK OR DIE
            <b>{t(`arcade.difficulty.${difficulty.key}`)}</b>
          </span>
          <button type="button" className="ar-tool" aria-pressed={fullscreen.active} onClick={() => void fullscreen.toggle()}>
            {fullscreen.active ? <CollapseIcon size={16} /> : <ExpandIcon size={16} />}
            <span>{t(fullscreen.active ? 'arcade.exitFullscreen' : 'arcade.fullscreen')}</span>
          </button>
        </div>

        <div className="ar-stage">
          {topicShown === null ? (
            // До старта — ни намёка на тему, только чего ждать.
            <div className="ar-ready">
              <h3>{t('arcade.ready')}</h3>
              <p>{t('arcade.readyHint')}</p>
              <ul className="ar-rules">
                <li>{t('arcade.rule.round')}</li>
                <li>{t('arcade.rule.silence', { seconds: formatNumber(difficulty.limit, lang) })}</li>
                <li>{t('arcade.rule.words')}</li>
              </ul>
            </div>
          ) : (
            <>
              <div
                className={`ar-timer${urgent ? ' is-urgent' : ''}`}
                role="timer"
                aria-label={t('arcade.timeRemaining', { seconds: remaining })}
              >
                <span aria-hidden="true">{String(remaining).padStart(2, '0')}</span>
                <small aria-hidden="true">{urgent ? t('arcade.lastSeconds') : t('arcade.secondsLeft')}</small>
              </div>
              <p className="ar-sr" aria-live="polite">
                {announcement}
              </p>
              <div className="ar-topic-label">{t('arcade.topic')}</div>
              <h3 className="ar-topic">{topicShown}</h3>
              {translated && (
                <>
                  <p className="ar-topic-note" lang="en">
                    {t('arcade.topicInEnglish', { topic: TOPICS[level].en[topic] })}
                  </p>
                  <p className="ar-hint">{t('arcade.answerInEnglish')}</p>
                </>
              )}
            </>
          )}
          <p className={`ar-status ${live.tone}`} role="status">
            <span className="ar-status__dot" aria-hidden="true" />
            {t(live.key)}
          </p>
        </div>

        <ArcadeScene danger={state.danger} speaking={status === 'playing' && state.wasSpeaking} running={status === 'playing'} />

        <div className="ar-controls">
          <div className="ar-danger__label">
            <span>{t('arcade.danger')}</span>
            <span>{t('arcade.rule.silence', { seconds: formatNumber(difficulty.limit, lang) })}</span>
          </div>
          <div
            className="ar-danger"
            role="progressbar"
            aria-label={t('arcade.danger')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(state.danger * 100)}
          >
            <div style={{ width: `${state.danger * 100}%` }} />
          </div>
          <button type="button" className={`ar-start${status === 'playing' ? ' is-stop' : ''}`} onClick={onMainButton}>
            {status === 'playing' ? <StopIcon size={18} /> : <MicIcon size={19} />}
            {mainLabel}
            {!busy && <PkChevron size={18} />}
          </button>
          {/* Только после раунда: разбор не может начаться посреди игры. */}
          {status === 'finished' && (
            <button type="button" className="ar-analyse" ref={analyseButton} onClick={() => setShowTranscript(true)}>
              {review.state.status === 'loading' ? <span className="ar-spinner" aria-hidden="true" /> : <span aria-hidden="true">≡</span>}
              {review.state.status === 'loading' ? t('arcade.analysing') : t('arcade.analyse')}
            </button>
          )}
        </div>
        {showTranscript && status === 'finished' && (
          <TranscriptDialog
            transcript={transcript}
            note={noRecognition ? t('arcade.transcript.noRecognition') : transcriptNote ? t(`arcade.note.${transcriptNote}`) : ''}
            review={review.state}
            budget={review.budget}
            availability={!token ? 'guest' : !enoughWords ? 'too-short' : 'available'}
            onStart={startReview}
            onClose={closeTranscript}
          />
        )}
      </div>

      {error && (
        <p className="ar-error" role="alert">
          {t(error)}
        </p>
      )}
      {(noRecognition || transcriptNote) && status !== 'ready' && <p className="ar-note">{t('arcade.note.noRecognition')}</p>}
      <p className="ar-mic-note">
        <MicIcon size={13} /> {t('arcade.micNote')}
      </p>

      {result && status === 'finished' && <ArcadeResults result={result} />}
    </section>
  )
}
