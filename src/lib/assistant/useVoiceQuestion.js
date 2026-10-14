'use client'

// Голосовой вопрос помощнику: нажал — говорит — запись сама кончается на
// тишине (endpointer.js) или вторым нажатием, потом распознавание
// /api/assistant/transcribe и onText(текст). Микрофон — тот же useRecorder, что
// у IELTS (WAV 16 кГц), порог голоса — тот же, что у Аркады (voiceActivity.js):
// от шума комнаты и пика гласных самого ученика, иначе тихий ноутбук «молчал»
// бы весь вопрос и запись не кончалась бы сама.
//
// Микрофон отпускается после каждого вопроса. useRecorder держит его до ухода
// с экрана (в IELTS вопросы идут подряд), но помощник смонтирован на всё время
// визита — и браузер показывал бы «идёт запись» на вкладке, пока она открыта.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useRecorder } from '../../ielts/speaking/useRecorder.js'
import { isMediaRecordingSupported } from '../ielts-audio.js'
import { createVoiceActivity } from '../../practice/arcade/voiceActivity.js'
import { analyseFrame, pitched } from '../../practice/arcade/voiceFeatures.js'
import { createEndpointer } from './endpointer.js'

export const MAX_QUESTION_SEC = 30
const FRAME_MS = 100
// Первые кадры — шум комнаты: от него считается порог голоса.
const CALIBRATE_MS = 300

const noop = () => () => {}
// На сервере MediaRecorder нет: false там и при гидратации, настоящее значение —
// после неё, без расхождения разметки.
const useSupported = () => useSyncExternalStore(noop, isMediaRecordingSupported, () => false)

/**
 * @returns {{ supported: boolean, state: 'idle'|'recording'|'transcribing', elapsed: number,
 *   error: null|'denied'|'not_heard'|'stt_failed'|'rate'|'auth', retryAfterSec: number|null,
 *   toggle: () => void, cancel: () => void, clearError: () => void }}
 */
export function useVoiceQuestion({ token, lang, screenId, onText }) {
  const { state: recState, error: recError, elapsed, stream, start: recStart, stop: recStop, release, drop } = useRecorder()
  const supported = useSupported()
  const [busy, setBusy] = useState(false) // идёт распознавание
  const [ownError, setOwnError] = useState(null)
  const [retryAfterSec, setRetryAfterSec] = useState(null)
  const noVoiceRef = useRef(false)
  const cancelledRef = useRef(false)
  // Свежие значения для колбэков записи: они живут дольше одного рендера.
  const ctx = useRef({ token, lang, screenId, onText })
  useLayoutEffect(() => {
    ctx.current = { token, lang, screenId, onText }
  })

  // Слушаем тишину, пока идёт запись.
  const recording = recState === 'recording'
  useEffect(() => {
    if (!recording || !stream) return undefined
    const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext
    if (!Ctx) return undefined
    const ac = new Ctx()
    const src = ac.createMediaStreamSource(stream)
    const analyser = ac.createAnalyser()
    analyser.fftSize = 2048
    src.connect(analyser)
    const buf = new Float32Array(analyser.fftSize)
    const t0 = performance.now()
    let noise = Infinity
    let detect = null
    const endpoint = createEndpointer()
    const id = setInterval(() => {
      analyser.getFloatTimeDomainData(buf)
      const now = performance.now()
      const f = analyseFrame(buf, ac.sampleRate)
      if (now - t0 < CALIBRATE_MS) {
        noise = Math.min(noise, f.volume)
        return
      }
      detect ??= createVoiceActivity(Number.isFinite(noise) ? noise : 0.002)
      const verdict = endpoint(detect(f.volume, now, pitched(f)), now)
      if (verdict === 'no_voice') noVoiceRef.current = true
      if (verdict !== 'go') {
        clearInterval(id)
        recStop()
      }
    }, FRAME_MS)
    return () => {
      clearInterval(id)
      src.disconnect()
      ac.close().catch(() => {})
    }
  }, [recording, stream, recStop])

  const transcribe = useCallback(
    async (out) => {
      const { token: tk, lang: lg, screenId: scr, onText: cb } = ctx.current
      setBusy(true)
      try {
        const fd = new FormData()
        fd.append('audio', new File([out.wav], 'question.wav', { type: 'audio/wav' }))
        fd.append('lang', lg || 'ru')
        if (scr) fd.append('screen', scr)
        const res = await fetch('/api/assistant/transcribe', {
          method: 'POST',
          headers: { authorization: `Bearer ${tk}` },
          body: fd,
        })
        if (res.status === 401) return setOwnError('auth')
        if (res.status === 429) {
          const body = await res.json().catch(() => ({}))
          setRetryAfterSec(body.retryAfterSec ?? 60)
          return setOwnError('rate')
        }
        if (!res.ok) return setOwnError('stt_failed')
        const { text } = await res.json()
        const clean = String(text || '').trim()
        // Окно закрыли, пока шло распознавание: вопрос не задаём — иначе ответ
        // заговорил бы из закрытого окна.
        if (cancelledRef.current) return
        if (!clean) return setOwnError('not_heard')
        cb?.(clean)
      } catch {
        setOwnError('stt_failed')
      } finally {
        drop(out.url)
        setBusy(false)
      }
    },
    [drop],
  )

  const start = useCallback(async () => {
    setOwnError(null)
    noVoiceRef.current = false
    cancelledRef.current = false
    await recStart({
      maxSec: MAX_QUESTION_SEC,
      onDone: (out) => {
        release()
        if (!out) return
        if (cancelledRef.current) return drop(out.url)
        if (noVoiceRef.current) {
          drop(out.url)
          return setOwnError('not_heard')
        }
        transcribe(out)
      },
    })
  }, [recStart, release, drop, transcribe])

  const toggle = useCallback(() => {
    if (busy || recState === 'processing') return
    if (recState === 'recording') recStop()
    else start()
  }, [busy, recState, recStop, start])

  // Окно закрыли посреди записи — запись в мусор, а не в распознавание.
  const cancel = useCallback(() => {
    cancelledRef.current = true
    if (recState === 'recording') recStop()
    else release()
  }, [recState, recStop, release])

  const clearError = useCallback(() => setOwnError(null), [])

  // Ошибки самой записи (нет разрешения, не открылся микрофон) приходят из
  // useRecorder и гаснут с началом следующей записи.
  const error = ownError ?? (recError === 'denied' ? 'denied' : recError === 'failed' ? 'stt_failed' : null)
  const state = recState === 'recording' ? 'recording' : busy || recState === 'processing' ? 'transcribing' : 'idle'
  return { supported, state, elapsed, error, retryAfterSec, toggle, cancel, clearError }
}
