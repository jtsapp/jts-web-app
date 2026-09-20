'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { blobToWav16kMono, isMediaRecordingSupported } from '../../lib/ielts-audio.js'
import { assessAnswer, fetchBudget } from '../../practice/situations/assessClient.js'
import { deleteTake, getTake, saveTake } from '../../practice/situations/recordings.js'
import SituationFeedback from './SituationFeedback.jsx'

// Запись устного ответа + разбор.
//
// Зачёт сценария вешаем на запись (onRecorded), а не на досмотренное видео:
// видео может не проиграться (кодек, автоплей, сеть), и тогда студент, который
// задание выполнил, остался бы без отметки. Той же логикой живёт
// SituativkaOverlay.
//
// Осциллограммы прототипа здесь нет намеренно: она требует живого AudioContext
// на каждый экран, а разбуженный контекст потом гонит аудиопоток по всему
// приложению (ровно это ловили в «Неправильных глаголах»). Состояние записи
// показывают пульсирующая точка и таймер — этого хватает, чтобы понять, что
// микрофон слышит.

// Столько же, сколько принимает роут (6 МБ 16кГц mono WAV ≈ 3 минуты).
// Останавливаем сами: запись, которую сервер потом отвергнет по размеру, —
// это впустую потраченные три минуты студента.
const MAX_SECONDS = 180

function pickMime() {
  for (const m of ['audio/webm', 'audio/mp4', 'audio/ogg']) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(m)) return m
  }
  return ''
}

function fmt(sec) {
  const s = Math.max(0, Math.floor(sec))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function SpeakingRecorder({ level, situation, task, token, onRecorded }) {
  const { t, lang } = useI18n()
  const [phase, setPhase] = useState('idle') // idle | recording | recorded
  const [seconds, setSeconds] = useState(0)
  const [url, setUrl] = useState('')
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const [assessing, setAssessing] = useState(false)
  const [result, setResult] = useState(null)
  const [budget, setBudget] = useState(null)

  const blobRef = useRef(null)
  const recRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const audioRef = useRef(null)
  const startedAtRef = useRef(0)

  const supported = isMediaRecordingSupported()

  // Запись прошлого захода: студент возвращается в сценарий и слышит, как
  // звучал вчера. Разбор не восстанавливаем — он платный и привязан к попытке.
  useEffect(() => {
    let alive = true
    let objectUrl = ''
    getTake(level, situation)
      .then((blob) => {
        if (!alive || !blob) return
        blobRef.current = blob
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
        setPhase('recorded')
      })
      .catch(() => {
        /* нет IndexedDB — просто начнём с чистого листа */
      })
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [level, situation])

  useEffect(() => {
    if (!token) return
    let alive = true
    fetchBudget(token).then((b) => {
      if (alive) setBudget(b)
    })
    return () => {
      alive = false
    }
  }, [token])

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  // Уходя со сценария, гасим и таймер, и микрофон: иначе индикатор записи в
  // браузере остаётся гореть на уже закрытом экране.
  useEffect(
    () => () => {
      clearInterval(timerRef.current)
      if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop()
      stopTracks()
    },
    [stopTracks],
  )

  const stop = useCallback(() => {
    clearInterval(timerRef.current)
    const rec = recRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
  }, [])

  const start = useCallback(async () => {
    setError('')
    setResult(null)
    if (!supported) {
      setError('unsupported')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const mime = pickMime()
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        clearInterval(timerRef.current)
        stopTracks()
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        blobRef.current = blob
        setUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return URL.createObjectURL(blob)
        })
        setPhase('recorded')
        saveTake(level, situation, blob).catch(() => {
          /* нет IndexedDB — запись живёт только до ухода с экрана */
        })
        onRecorded?.()
      }
      recRef.current = rec
      rec.start()
      startedAtRef.current = Date.now()
      setSeconds(0)
      setPhase('recording')
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startedAtRef.current) / 1000
        setSeconds(elapsed)
        if (elapsed >= MAX_SECONDS) stop()
      }, 200)
    } catch {
      stopTracks()
      setError('denied')
    }
  }, [level, onRecorded, situation, stop, stopTracks, supported])

  const playToggle = () => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) {
      el.play().catch(() => setPlaying(false))
    } else {
      el.pause()
    }
  }

  const remove = async () => {
    setUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
    blobRef.current = null
    setPhase('idle')
    setResult(null)
    setSeconds(0)
    await deleteTake(level, situation).catch(() => {})
  }

  const assess = async () => {
    if (!blobRef.current || assessing) return
    setAssessing(true)
    setError('')
    setResult(null)
    try {
      const wav = await blobToWav16kMono(blobRef.current)
      const data = await assessAnswer(wav, { level, task, title: '', lang, token })
      if (data.budget) setBudget(data.budget)
      if (data.empty) {
        setError('empty')
      } else {
        setResult(data)
      }
    } catch (e) {
      if (e?.budget) setBudget(e.budget)
      setError(e?.code || 'failed')
    } finally {
      setAssessing(false)
    }
  }

  return (
    <section className="sit-rec">
      <div className="sit-rec__head">
        <span className="sit-rec__ic" aria-hidden="true">
          🎙
        </span>
        <span>{t('situations.recorder.title')}</span>
      </div>
      <p className="sit-rec__hint">{t('situations.recorder.hint')}</p>

      <div className="sit-rec__bar">
        <span className={`sit-rec__state${phase === 'recording' ? ' is-live' : ''}`}>
          <span className="sit-rec__dot" aria-hidden="true" />
          {t(`situations.recorder.state.${phase}`)}
        </span>
        <span className="sit-rec__timer">{fmt(seconds)}</span>
      </div>

      <div className="sit-rec__controls">
        <button
          type="button"
          className="sit-rec__tool sit-rec__tool--danger"
          onClick={remove}
          disabled={phase !== 'recorded'}
        >
          {t('situations.recorder.delete')}
        </button>
        <button
          type="button"
          className={`sit-rec__mic${phase === 'recording' ? ' is-live' : ''}`}
          onClick={phase === 'recording' ? stop : start}
        >
          {t(phase === 'recording' ? 'situations.recorder.stop' : 'situations.recorder.record')}
        </button>
        <button
          type="button"
          className="sit-rec__tool"
          onClick={playToggle}
          disabled={phase !== 'recorded' || !url}
        >
          {t(playing ? 'situations.recorder.pause' : 'situations.recorder.play')}
        </button>
      </div>

      {url && (
        <audio
          ref={audioRef}
          src={url}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          hidden
        />
      )}

      {/* Разбор — только залогиненным: он платный и считается на аккаунт.
          Гостю показываем, зачем входить, а не мёртвую кнопку. */}
      {token ? (
        <div className="sit-rec__assess">
          <button
            type="button"
            className="sit-rec__go"
            onClick={assess}
            disabled={phase !== 'recorded' || assessing}
          >
            {t(assessing ? 'situations.assess.running' : 'situations.assess.go')}
          </button>
          {budget && (
            <span className="sit-rec__budget">
              {t('situations.assess.left', { n: budget.remaining, of: budget.limit })}
            </span>
          )}
        </div>
      ) : (
        <p className="sit-rec__guest">{t('situations.assess.guest')}</p>
      )}

      {error && <p className="sit-rec__error">{t(`situations.error.${error}`)}</p>}

      {result && <SituationFeedback result={result} />}
    </section>
  )
}
