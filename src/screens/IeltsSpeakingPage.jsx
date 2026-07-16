import { useCallback, useEffect, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { IELTS_SPEAKING_TASK } from '../data/ielts-tasks.js'
import { blobToWav16kMono, isMediaRecordingSupported } from '../lib/ielts-audio.js'
import { getDeviceId, authHeaders } from '../lib/identity.js'
import { MicIcon, SquareIcon, LoaderIcon } from '../components/ieltsIcons.jsx'

// Records mic audio and hands back a 16 kHz mono WAV blob (the format Azure
// Pronunciation Assessment takes).
function useWavRecorder() {
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState(null)
  const recRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const resolverRef = useRef(null)

  useEffect(
    () => () => {
      try {
        recRef.current?.stop()
      } catch {
        /* ignore */
      }
      streamRef.current?.getTracks().forEach((t) => t.stop())
    },
    [],
  )

  const start = useCallback(async () => {
    if (recRef.current) return
    setError(null)
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Микрофон недоступен. Разреши доступ в браузере и попробуй снова.')
      return
    }
    streamRef.current = stream
    chunksRef.current = []
    const rec = new MediaRecorder(stream)
    recRef.current = rec
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
      chunksRef.current = []
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      recRef.current = null
      setRecording(false)
      const resolve = resolverRef.current
      resolverRef.current = null
      if (blob.size === 0) return resolve?.(null)
      try {
        resolve?.(await blobToWav16kMono(blob))
      } catch {
        resolve?.(null)
      }
    }
    try {
      rec.start()
      setRecording(true)
    } catch {
      setError('Не удалось начать запись.')
    }
  }, [])

  const stop = useCallback(
    () =>
      new Promise((resolve) => {
        const rec = recRef.current
        if (!rec || rec.state === 'inactive') return resolve(null)
        resolverRef.current = resolve
        try {
          rec.stop()
        } catch {
          resolve(null)
        }
      }),
    [],
  )

  return { recording, error, start, stop }
}

function bandColor(band) {
  if (band >= 7) return '#00a876'
  if (band >= 5.5) return '#e8892b'
  return '#d64545'
}

function fmt(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function IeltsSpeakingPage({ userLevel = 'A1', userName, token, onNav, onProfile, onGo }) {
  const task = IELTS_SPEAKING_TASK
  const rec = useWavRecorder()
  const [supported] = useState(() => isMediaRecordingSupported())
  const [phase, setPhase] = useState('intro')
  const [p1Index, setP1Index] = useState(0)
  const [p1Transcripts, setP1Transcripts] = useState([])
  const [transcribing, setTranscribing] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [saved, setSaved] = useState(null)

  // Ticks the prep/record countdown once per second while either phase is
  // active. Stops itself at zero; the boundary effect below handles the
  // transition.
  useEffect(() => {
    if (phase !== 'part2-prep' && phase !== 'part2-record') return
    const t = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [phase])

  // Stable recorder handles (the hook memoizes start/stop) — safe in deps.
  const recStart = rec.start
  const recStop = rec.stop

  // --- Part 1: record one answer, transcribe it, advance --------------------
  const stopPart1Answer = useCallback(async () => {
    const wav = await recStop()
    if (!wav) {
      setError('Не удалось записать ответ. Попробуй ещё раз.')
      return
    }
    setTranscribing(true)
    setError(null)
    let text = ''
    try {
      const form = new FormData()
      form.append('audio', wav, 'answer.wav')
      form.append('lang', 'en')
      const res = await fetch('/api/transcribe', { method: 'POST', body: form })
      if (res.ok) text = (await res.json()).text ?? ''
    } catch {
      /* transcript stays empty — still advances */
    }
    setTranscribing(false)
    setP1Transcripts((prev) => {
      const next = [...prev]
      next[p1Index] = text.trim()
      return next
    })
    if (p1Index + 1 < task.part1.length) {
      setP1Index(p1Index + 1)
    } else {
      setPhase('part2-prep')
      setCountdown(task.part2.prepSeconds)
    }
  }, [recStop, p1Index, task])

  const submit = useCallback(
    async (wav) => {
      setSaved(null)
      setError(null)
      if (!wav) {
        setError('Запись Part 2 не получилась. Попробуй пройти секцию заново.')
        setPhase('result')
        return
      }
      const answers = [
        ...task.part1.map((q, i) => ({
          part: 1,
          question: q.question,
          transcript: p1Transcripts[i] ?? '',
        })),
        { part: 2, question: task.part2.prompt, transcript: '' },
      ]
      try {
        const form = new FormData()
        form.append('audio', wav, 'part2.wav')
        form.append('answers', JSON.stringify(answers))
        form.append('uiLang', 'ru')
        form.append('deviceId', getDeviceId())
        const res = await fetch('/api/ielts/assess-speaking', {
          method: 'POST',
          headers: authHeaders(token),
          body: form,
        })
        if (!res.ok) throw new Error(String(res.status))
        const data = await res.json()
        setResult(data.assessment)
        setSaved(data.saved)
      } catch {
        setError('Не удалось оценить речь. Попробуй ещё раз.')
      }
      setPhase('result')
    },
    [p1Transcripts, task, token],
  )

  // --- Part 2: prep → record → submit ---------------------------------------
  const beginPart2Recording = useCallback(async () => {
    setPhase('part2-record')
    setCountdown(task.part2.speakSeconds)
    await recStart()
  }, [recStart, task])

  const finishPart2 = useCallback(async () => {
    const wav = await recStop()
    setPhase('submitting')
    void submit(wav)
  }, [recStop, submit])

  // Countdown boundary: prep→record, record→submit. Deferred via setTimeout so
  // the transition (which sets state) runs after the effect, not inside it.
  useEffect(() => {
    if (countdown !== 0) return
    if (phase === 'part2-prep') {
      const id = setTimeout(() => void beginPart2Recording(), 0)
      return () => clearTimeout(id)
    }
    if (phase === 'part2-record') {
      const id = setTimeout(() => void finishPart2(), 0)
      return () => clearTimeout(id)
    }
  }, [countdown, phase, beginPart2Recording, finishPart2])

  const restart = () => {
    setPhase('intro')
    setP1Index(0)
    setP1Transcripts([])
    setResult(null)
    setSaved(null)
    setError(null)
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="ielts" onNav={onNav} onProfile={onProfile}>
      <div className="ie ie--narrow">
        <button type="button" className="ie-back" onClick={() => onGo?.('ielts')}>
          ← К секциям IELTS
        </button>
        <h1 className="ie__title">Speaking</h1>

        {!supported && (
          <p className="ie-err">
            Запись с микрофона не поддерживается в этом браузере. Открой в Chrome или Safari на
            устройстве с микрофоном.
          </p>
        )}
        {(error || rec.error) && <p className="ie-err">{error || rec.error}</p>}

        {phase === 'intro' && (
          <div className="ie-card ie-card--mt">
            <p className="ie-sp__intro">
              Небольшое устное интервью в стиле IELTS. Сначала два коротких вопроса о тебе (Part 1),
              затем монолог по карточке: одна минута на подготовку и две минуты на ответ (Part 2).
              Говори по-английски, запись идёт с микрофона.
            </p>
            <button
              type="button"
              className="ie-btn ie-btn--mt"
              disabled={!supported}
              onClick={() => {
                setPhase('part1')
                setP1Index(0)
              }}
            >
              Начать
            </button>
          </div>
        )}

        {phase === 'part1' && (
          <div className="ie-card ie-card--mt">
            <div className="ie-kicker">
              Part 1 · вопрос {p1Index + 1} из {task.part1.length}
            </div>
            <p className="ie-sp__q">{task.part1[p1Index].question}</p>
            <div className="ie-sp__ctrl">
              {!rec.recording ? (
                <button
                  type="button"
                  className="ie-btn"
                  disabled={transcribing}
                  onClick={() => rec.start()}
                >
                  <MicIcon size={16} /> Записать ответ
                </button>
              ) : (
                <button type="button" className="ie-btn ie-btn--rec" onClick={stopPart1Answer}>
                  <SquareIcon size={16} /> Остановить
                </button>
              )}
              {rec.recording && (
                <span className="ie-sp__live">
                  <span className="ie-sp__dot" />
                  Идёт запись…
                </span>
              )}
              {transcribing && (
                <span className="ie-sp__wait">
                  <LoaderIcon size={16} /> Распознаю…
                </span>
              )}
            </div>
          </div>
        )}

        {phase === 'part2-prep' && (
          <div className="ie-card ie-card--mt">
            <div className="ie-kicker">Part 2 · подготовка</div>
            <p className="ie-sp__q">{task.part2.prompt}</p>
            <ul className="ie-sp__bullets">
              {task.part2.bullets.map((b) => (
                <li key={b}>
                  <span>•</span>
                  {b}
                </li>
              ))}
            </ul>
            <div className="ie-sp__timer">
              <span className="ie-sp__clock">{fmt(countdown)}</span>
              <span className="ie-sp__hint">на подготовку</span>
            </div>
            <button
              type="button"
              className="ie-btn ie-btn--mt"
              onClick={() => {
                setCountdown(0)
                void beginPart2Recording()
              }}
            >
              Начать говорить сейчас
            </button>
          </div>
        )}

        {phase === 'part2-record' && (
          <div className="ie-card ie-card--mt">
            <div className="ie-kicker ie-kicker--rec">Part 2 · идёт запись</div>
            <p className="ie-sp__prompt">{task.part2.prompt}</p>
            <ul className="ie-sp__bullets ie-sp__bullets--sm">
              {task.part2.bullets.map((b) => (
                <li key={b}>• {b}</li>
              ))}
            </ul>
            <div className="ie-sp__timer">
              <span className="ie-sp__clock ie-sp__clock--rec">
                <span className="ie-sp__dot" />
                {fmt(countdown)}
              </span>
              <span className="ie-sp__hint">осталось</span>
            </div>
            <button
              type="button"
              className="ie-btn ie-btn--rec ie-btn--mt"
              onClick={() => {
                setCountdown(0)
                void finishPart2()
              }}
            >
              <SquareIcon size={16} /> Закончить и оценить
            </button>
          </div>
        )}

        {phase === 'submitting' && (
          <div className="ie-card ie-card--mt ie-sp__busy">
            <LoaderIcon size={20} /> Оцениваю произношение и речь…
          </div>
        )}

        {phase === 'result' && result && (
          <SpeakingResult result={result} saved={saved} onRetry={restart} onGo={onGo} />
        )}
        {phase === 'result' && !result && (
          <button type="button" className="ie-btn ie-btn--mt" onClick={restart}>
            Пройти заново
          </button>
        )}
      </div>
    </LearningLayout>
  )
}

const CRITERIA = [
  { key: 'fluencyCoherence', label: 'Беглость и связность' },
  { key: 'lexicalResource', label: 'Словарный запас' },
  { key: 'grammaticalRange', label: 'Грамматика' },
  { key: 'pronunciation', label: 'Произношение' },
]

function SpeakingResult({ result, saved, onRetry, onGo }) {
  return (
    <div className="ie-card ie-card--mt">
      <div className="ie-sp__overall">
        <span className="ie-sp__badge" style={{ background: bandColor(result.overallBand) }}>
          {result.overallBand.toFixed(1)}
        </span>
        <div>
          <div className="ie-sp__ovh">Overall band</div>
          <div className="ie-sp__ovs">среднее по четырём критериям</div>
        </div>
      </div>

      <div className="ie-band__rows">
        {CRITERIA.map(({ key, label }) => {
          const v = result.criteria[key]
          return (
            <div key={key}>
              <div className="ie-band__row">
                <span>
                  {label}
                  {key === 'pronunciation' && result.pronunciation.mock && (
                    <em className="ie-sp__approx">оценочно</em>
                  )}
                </span>
                <b style={{ color: bandColor(v) }}>{v.toFixed(1)}</b>
              </div>
              <div className="ie-bar">
                <div
                  className="ie-bar__fill"
                  style={{ width: `${(v / 9) * 100}%`, background: bandColor(v) }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {result.feedback && <p className="ie-sp__fb">{result.feedback}</p>}
      {result.strengths.length > 0 && (
        <div className="ie-sp__line">
          <b className="ie-sp__good">Сильные стороны: </b>
          {result.strengths.join('; ')}
        </div>
      )}
      {result.improvements.length > 0 && (
        <div className="ie-sp__line">
          <b className="ie-sp__work">Над чем поработать: </b>
          {result.improvements.join('; ')}
        </div>
      )}
      {result.transcript && (
        <details className="ie-sp__tr">
          <summary>Транскрипт монолога</summary>
          <p>{result.transcript}</p>
        </details>
      )}

      <div className="ie-res__saved">
        {saved === null
          ? 'Сохраняю результат…'
          : saved
            ? 'Результат сохранён в твой прогресс.'
            : 'Результат не сохранён (офлайн-режим).'}
      </div>

      <div className="ie-cta">
        <button type="button" className="ie-btn" onClick={() => onGo?.('ielts-progress')}>
          Мой прогресс
        </button>
        <button type="button" className="ie-btn ie-btn--ghost" onClick={onRetry}>
          Пройти ещё раз
        </button>
      </div>
    </div>
  )
}
