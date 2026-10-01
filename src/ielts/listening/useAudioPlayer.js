import { useCallback, useEffect, useRef, useState } from 'react'
import { ttsUrl, VOICE } from '../../lib/ttsShared.js'

/**
 * Плеер записи Listening. Источник — файл ({@code src}: ссылка из бэкенда) или, если записи нет, транскрипт
 * синтезом по репликам (голос — британский, у второго говорящего — мужской).
 *
 * rules — из playerRules(): в экзамене нельзя паузу, перемотку и повтор (maxPlays: 1). «Прослушанным» считается
 * старт с начала: продолжение после паузы прослушивание не тратит.
 */
export function useAudioPlayer({ src, transcript, rules, onEnded }) {
  const audioRef = useRef(null)
  const ttsRef = useRef({ i: -1, stopped: true })
  const endAtRef = useRef(null)
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded
  const [state, setState] = useState({ playing: false, time: 0, duration: 0, rate: 1, plays: 0, error: false })
  const tts = !src && Array.isArray(transcript) && transcript.length > 0

  useEffect(() => {
    const a = new Audio()
    a.preload = 'metadata'
    audioRef.current = a
    const upd = (patch) => setState((s) => ({ ...s, ...patch }))
    a.ontimeupdate = () => {
      if (endAtRef.current != null && a.currentTime >= endAtRef.current) {
        endAtRef.current = null
        a.pause()
      }
      upd({ time: a.currentTime })
    }
    a.onloadedmetadata = () => upd({ duration: a.duration || 0 })
    a.onplay = () => upd({ playing: true })
    a.onpause = () => upd({ playing: false })
    a.onerror = () => upd({ error: true, playing: false })
    a.onended = () => {
      upd({ playing: false })
      onEndedRef.current?.()
    }
    return () => {
      a.pause()
      a.src = ''
      ttsRef.current.stopped = true
    }
  }, [])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    if (src) {
      a.src = src
      a.load()
    } else if (tts) {
      const last = transcript[transcript.length - 1]
      setState((s) => ({ ...s, duration: Number(last?.end) || 0 }))
    }
    setState((s) => ({ ...s, time: 0, plays: 0, error: false, playing: false }))
  }, [src, tts, transcript])

  // синтез по репликам: каждая — своим запросом /api/tts, время плеера — начало реплики
  const speakFrom = useCallback((i) => {
    const a = audioRef.current
    const lines = transcript || []
    if (i >= lines.length) {
      ttsRef.current.stopped = true
      setState((s) => ({ ...s, playing: false }))
      onEndedRef.current?.()
      return
    }
    const speakers = [...new Set(lines.map((l) => l.speaker).filter(Boolean))]
    const voice = speakers.indexOf(lines[i].speaker) === 1 ? VOICE.gbMale : VOICE.gb
    ttsRef.current = { i, stopped: false }
    a.src = ttsUrl({ text: lines[i].text, voice, lang: 'en', speed: state.rate }) || ''
    a.onended = () => !ttsRef.current.stopped && speakFrom(i + 1)
    setState((s) => ({ ...s, time: Number(lines[i].start) || 0 }))
    a.play().catch(() => setState((s) => ({ ...s, error: true, playing: false })))
  }, [transcript, state.rate])

  const play = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    const fromStart = tts ? ttsRef.current.i < 0 || ttsRef.current.stopped : a.currentTime < 0.5 || a.ended
    if (fromStart && rules?.maxPlays && state.plays >= rules.maxPlays) return
    if (fromStart) setState((s) => ({ ...s, plays: s.plays + 1 }))
    if (tts) return speakFrom(fromStart ? 0 : ttsRef.current.i)
    if (a.ended) a.currentTime = 0
    a.play().catch(() => setState((s) => ({ ...s, error: true })))
  }, [rules, state.plays, tts, speakFrom])

  const pause = useCallback(() => {
    if (rules && !rules.allowPause) return
    if (tts) ttsRef.current.stopped = true
    audioRef.current?.pause()
    setState((s) => ({ ...s, playing: false }))
  }, [rules, tts])

  const seek = useCallback((t) => {
    if (rules && !rules.allowSeek) return
    const a = audioRef.current
    if (!a || tts) return
    a.currentTime = Math.max(0, Math.min(a.duration || t, t))
  }, [rules, tts])

  const skip = useCallback((delta) => seek((audioRef.current?.currentTime || 0) + delta), [seek])

  const setRate = useCallback((rate) => {
    if (rules && !rules.allowRate) return
    const a = audioRef.current
    if (a) {
      a.defaultPlaybackRate = rate
      a.playbackRate = rate
    }
    setState((s) => ({ ...s, rate }))
  }, [rules])

  // «Переслушать отрезок» — разбор и «Тренировка»: с audioStart до audioEnd вопроса, мимо правил экзамена
  const playRange = useCallback((start, end) => {
    const a = audioRef.current
    if (!a || tts || start == null) return
    endAtRef.current = end ?? null
    a.currentTime = Math.max(0, start)
    a.play().catch(() => setState((s) => ({ ...s, error: true })))
  }, [tts])

  const stop = useCallback(() => {
    ttsRef.current.stopped = true
    audioRef.current?.pause()
  }, [])

  return { ...state, tts, play, pause, seek, skip, setRate, playRange, stop }
}
