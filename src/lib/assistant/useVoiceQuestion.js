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
//
// Гонки, которые здесь закрыты (ревью 14.10.2026):
//  - второе нажатие, пока браузер спрашивает разрешение, открывало второй
//    поток — первый не гас уже никогда, а через 30 с уходил вопрос, которого
//    ученик не задавал. Пока ждём разрешения — состояние 'starting', нажатия
//    не принимаются;
//  - окно закрыли, пока ждём разрешения, — запись стартовала бы без окна:
//    гасим её сразу после старта;
//  - выход из аккаунта посреди распознавания — запрос обрывается, вопрос не
//    задаётся (иначе Луна заговорила бы уже на экране входа).

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
// Ученик мог заговорить сразу после нажатия, и «шумом» стал бы его же голос:
// порог (шум × 3) тогда выше речи, и вопрос кончился бы «не расслышала».
// Потолок держит порог не выше прежнего жёсткого пола Аркады (0.012).
const NOISE_CAP = 0.004

const noop = () => () => {}
// На сервере MediaRecorder нет: false там и при гидратации, настоящее значение —
// после неё, без расхождения разметки.
const useSupported = () => useSyncExternalStore(noop, isMediaRecordingSupported, () => false)

const AudioCtx = () => globalThis.AudioContext || globalThis.webkitAudioContext || null

/**
 * @returns {{ supported: boolean, state: 'idle'|'starting'|'recording'|'transcribing', elapsed: number,
 *   error: null|'denied'|'not_heard'|'stt_failed'|'rate'|'auth', retryAfterSec: number|null,
 *   toggle: () => void, cancel: () => void, clearError: () => void,
 *   listen: (opts: { noVoiceMs?: number, onText?: (t: string) => void, onNoVoice?: () => void }) => void,
 *   transcribeAudio: (wav: Blob, opts?: { onText?: (t: string) => void }) => Promise<void>|undefined }}
 */
export function useVoiceQuestion({ token, lang, screenId, onText }) {
  const { state: recState, error: recError, elapsed, stream, start: recStart, stop: recStop, release, drop } = useRecorder()
  const supported = useSupported()
  const [starting, setStarting] = useState(false) // ждём разрешения на микрофон
  const [busy, setBusy] = useState(false) // идёт распознавание
  const [ownError, setOwnError] = useState(null)
  const [retryAfterSec, setRetryAfterSec] = useState(null)
  const startingRef = useRef(false)
  const noVoiceRef = useRef(false)
  const cancelledRef = useRef(false)
  const sttAbortRef = useRef(null)
  // Контекст для поиска тишины. Создаётся и будится в тике нажатия: iPhone
  // оставляет спящим контекст, разбуженный не жестом (см. arcade/microphone.js),
  // и анализатор отдавал бы нули — каждый вопрос кончался бы «не расслышала».
  const acRef = useRef(null)
  // Свежие значения для колбэков записи: они живут дольше одного рендера.
  const ctx = useRef({ token, lang, screenId, onText })
  useLayoutEffect(() => {
    ctx.current = { token, lang, screenId, onText }
  })
  // Параметры текущей записи (позывной окна, 21.10.2026): своё ожидание первой речи,
  // свой получатель текста и «промолчал» вместо ошибки. У кнопки микрофона их нет.
  const optsRef = useRef(null)

  // Ушли со страницы (выход из аккаунта размонтирует помощника): запись в
  // мусор, распознавание оборвать, контекст закрыть.
  useEffect(() => {
    return () => {
      cancelledRef.current = true
      sttAbortRef.current?.abort()
      acRef.current?.close?.().catch(() => {})
      acRef.current = null
    }
  }, [])

  // Слушаем тишину, пока идёт запись.
  const recording = recState === 'recording'
  useEffect(() => {
    const ac = acRef.current
    if (!recording || !stream || !ac || ac.state === 'closed') return undefined
    const src = ac.createMediaStreamSource(stream)
    const analyser = ac.createAnalyser()
    analyser.fftSize = 2048
    src.connect(analyser)
    const buf = new Float32Array(analyser.fftSize)
    const t0 = performance.now()
    let noise = Infinity
    let detect = null
    const noVoiceMs = optsRef.current?.noVoiceMs
    const endpoint = createEndpointer(noVoiceMs ? { noVoiceMs } : undefined)
    const id = setInterval(() => {
      analyser.getFloatTimeDomainData(buf)
      const now = performance.now()
      const f = analyseFrame(buf, ac.sampleRate)
      if (now - t0 < CALIBRATE_MS) {
        noise = Math.min(noise, f.volume)
        return
      }
      detect ??= createVoiceActivity(Number.isFinite(noise) ? Math.min(noise, NOISE_CAP) : 0.002)
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
      // Спящий контекст не гонит аудиопоток между вопросами; разбудит следующее нажатие.
      if (ac.state === 'running') ac.suspend?.().catch(() => {})
    }
  }, [recording, stream, recStop])

  const transcribe = useCallback(
    async (out) => {
      const { token: tk, lang: lg, screenId: scr, onText: own } = ctx.current
      const cb = optsRef.current?.onText || own
      const abort = new AbortController()
      sttAbortRef.current = abort
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
          signal: abort.signal,
        })
        if (cancelledRef.current) return
        if (res.status === 401) return setOwnError('auth')
        if (res.status === 429) {
          const body = await res.json().catch(() => ({}))
          setRetryAfterSec(body.retryAfterSec ?? 60)
          return setOwnError('rate')
        }
        if (!res.ok) return setOwnError('stt_failed')
        const { text } = await res.json()
        // Окно закрыли, пока шло распознавание: вопрос не задаём — иначе ответ
        // заговорил бы из закрытого окна.
        if (cancelledRef.current) return
        const clean = String(text || '').trim()
        if (!clean) return setOwnError('not_heard')
        cb?.(clean)
      } catch (e) {
        if (e?.name !== 'AbortError' && !cancelledRef.current) setOwnError('stt_failed')
      } finally {
        drop(out.url)
        if (sttAbortRef.current === abort) sttAbortRef.current = null
        if (!cancelledRef.current) setBusy(false)
      }
    },
    [drop],
  )

  // Зовётся синхронно из нажатия: всё до первого await — ещё в тике жеста.
  const start = useCallback(async (opts = null) => {
    if (startingRef.current) return
    startingRef.current = true
    optsRef.current = opts
    setStarting(true)
    setOwnError(null)
    noVoiceRef.current = false
    cancelledRef.current = false
    const Ctx = AudioCtx()
    if (Ctx && (!acRef.current || acRef.current.state === 'closed')) acRef.current = new Ctx()
    acRef.current?.resume?.().catch(() => {})
    try {
      const ok = await recStart({
        maxSec: MAX_QUESTION_SEC,
        onDone: (out) => {
          release()
          if (!out) return
          if (cancelledRef.current) return drop(out.url)
          if (noVoiceRef.current) {
            drop(out.url)
            const quiet = optsRef.current?.onNoVoice
            if (quiet) return quiet()
            return setOwnError('not_heard')
          }
          transcribe(out)
        },
      })
      // Окно закрыли, пока браузер спрашивал разрешение, — запись уже пошла: гасим.
      if (ok && cancelledRef.current) recStop()
    } finally {
      startingRef.current = false
      setStarting(false)
    }
  }, [recStart, recStop, release, drop, transcribe])

  const toggle = useCallback(() => {
    if (startingRef.current || busy || recState === 'processing') return
    if (recState === 'recording') recStop()
    else start(null)
  }, [busy, recState, recStop, start])

  /** Запись без нажатия — после позывного «Луна» (opts — см. optsRef). */
  const listen = useCallback(
    (opts) => {
      if (startingRef.current || busy || recState !== 'idle') return
      start(opts)
    },
    [busy, recState, start],
  )

  /** Готовая запись (звук, снятый «ухом», wake/preroll.js) — сразу в распознавание. */
  const transcribeAudio = useCallback(
    (wav, opts = null) => {
      if (!wav || busy) return undefined
      optsRef.current = opts
      cancelledRef.current = false
      setOwnError(null)
      return transcribe({ wav, url: null })
    },
    [busy, transcribe],
  )

  // Окно закрыли: запись в мусор, распознавание оборвать.
  const cancel = useCallback(() => {
    cancelledRef.current = true
    sttAbortRef.current?.abort()
    setBusy(false)
    if (recState === 'recording') recStop()
    else if (!startingRef.current) release()
  }, [recState, recStop, release])

  const clearError = useCallback(() => setOwnError(null), [])

  // Ошибки самой записи (нет разрешения, не открылся микрофон) приходят из
  // useRecorder и гаснут с началом следующей записи.
  const error = ownError ?? (recError === 'denied' ? 'denied' : recError === 'failed' ? 'stt_failed' : null)
  const state = recState === 'recording'
    ? 'recording'
    : starting
      ? 'starting'
      : busy || recState === 'processing'
        ? 'transcribing'
        : 'idle'
  return { supported, state, elapsed, error, retryAfterSec, toggle, cancel, clearError, listen, transcribeAudio }
}
