import { useCallback, useEffect, useRef, useState } from 'react'
import { blobToWav16kMono, isMediaRecordingSupported } from '../../lib/ielts-audio.js'

function pickMime() {
  for (const m of ['audio/webm', 'audio/mp4', 'audio/ogg']) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(m)) return m
  }
  return ''
}

/**
 * Запись ответа в WAV 16 кГц mono — то, что принимает оценка произношения Azure. Микрофон открывается на первую
 * запись и держится до ухода с экрана: в Part 1 вопросы идут подряд, и спрашивать разрешение на каждый — резать
 * первый слог ответа. Потолок maxSec останавливает запись сам — как экзаменатор на Part 2.
 *
 * state: idle | recording | processing; error: 'unsupported' | 'denied' | 'failed' | null.
 */
export function useRecorder() {
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  // поток микрофона наружу — для живой акустики под записью (liveAcoustics.js): тот же микрофон, второго запроса нет
  const [stream, setStream] = useState(null)
  const streamRef = useRef(null)
  const recRef = useRef(null)
  const timerRef = useRef(null)

  const release = useCallback(() => {
    clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStream(null)
  }, [])

  useEffect(() => release, [release])

  /** Начать запись. Конец — по stop() или потолку maxSec — приходит в onDone({ wav, url, durationSec }) или onDone(null). */
  const start = useCallback(async ({ maxSec = 120, onDone } = {}) => {
    if (!isMediaRecordingSupported()) {
      setError('unsupported')
      return false
    }
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
        setStream(streamRef.current)
      }
    } catch (e) {
      setError(e?.name === 'NotAllowedError' ? 'denied' : 'failed')
      return false
    }
    setError(null)
    const mime = pickMime()
    const rec = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined)
    const chunks = []
    const t0 = Date.now()
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = async () => {
      clearInterval(timerRef.current)
      const durationSec = (Date.now() - t0) / 1000
      setState('processing')
      let out = null
      try {
        const wav = await blobToWav16kMono(new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' }))
        out = { wav, url: URL.createObjectURL(wav), durationSec: Math.round(durationSec * 10) / 10 }
      } catch {
        setError('failed')
      }
      setState('idle')
      onDone?.(out)
    }
    recRef.current = rec
    rec.start()
    setElapsed(0)
    setState('recording')
    timerRef.current = setInterval(() => {
      const s = (Date.now() - t0) / 1000
      setElapsed(s)
      if (s >= maxSec && rec.state === 'recording') rec.stop()
    }, 250)
    return true
  }, [])

  const stop = useCallback(() => {
    if (recRef.current?.state === 'recording') recRef.current.stop()
  }, [])

  return { state, error, elapsed, stream, start, stop, release }
}
