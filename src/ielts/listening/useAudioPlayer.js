import { useCallback, useEffect, useRef, useState } from 'react'
import { ttsUrl, VOICE } from '../../lib/ttsShared.js'

/**
 * Плеер записи Listening. Источник — файл ({@code src}: ссылка из бэкенда) или, если записи нет, транскрипт
 * синтезом по репликам (голос — британский, у второго говорящего — мужской).
 *
 * rules — из playerRules(): в экзамене нельзя паузу, перемотку и повтор (maxPlays: 1). «Прослушанным» считается
 * старт с начала: продолжение после паузы прослушивание не тратит.
 */
// Голос устройства — запасной путь, когда /api/tts не отвечает (нет ключа Soniox, лимит, сеть): тишина в Listening
// хуже робота. Возвращает false, если синтеза в браузере нет вовсе.
function deviceSay(text, rate, onDone) {
  const ss = typeof window !== 'undefined' ? window.speechSynthesis : null
  if (!ss || typeof SpeechSynthesisUtterance === 'undefined') return false
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-GB'
  u.rate = rate || 1
  u.onend = () => onDone()
  u.onerror = () => onDone()
  ss.cancel()
  ss.speak(u)
  return true
}

function stopDevice() {
  try {
    window.speechSynthesis?.cancel()
  } catch {
    /* синтеза нет — нечего останавливать */
  }
}

export function useAudioPlayer({ src, transcript, rules, onEnded }) {
  const audioRef = useRef(null)
  const ttsRef = useRef({ i: -1, stopped: true })
  // true — /api/tts уже не ответил в этом плеере: дальше реплики сразу читает устройство, без ожидания ошибки
  const deviceRef = useRef(false)
  const speakFromRef = useRef(null)
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
    a.onplay = () => upd({ playing: true, error: false })
    a.onpause = () => upd({ playing: false })
    a.onerror = () => {
      // синтез реплики не пришёл — дочитываем голосом устройства с этой же реплики
      if (!ttsRef.current.stopped && ttsRef.current.i >= 0 && speakFromRef.current) {
        deviceRef.current = true
        speakFromRef.current(ttsRef.current.i)
        return
      }
      upd({ error: true, playing: false })
    }
    a.onended = () => {
      upd({ playing: false })
      onEndedRef.current?.()
    }
    return () => {
      // сначала отвязать обработчики: пустой src сам рождает событие error, и оно (в dev — после повторного монтирования
      // StrictMode) красило новый плеер в «Не удалось загрузить запись»
      a.ontimeupdate = a.onloadedmetadata = a.onplay = a.onpause = a.onerror = a.onended = null
      a.pause()
      a.removeAttribute('src')
      a.load()
      ttsRef.current.stopped = true
      stopDevice()
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
    ttsRef.current = { i, stopped: false, at: Date.now() }
    setState((s) => ({ ...s, time: Number(lines[i].start) || 0 }))
    const next = () => !ttsRef.current.stopped && ttsRef.current.i === i && speakFrom(i + 1)
    if (deviceRef.current) {
      setState((s) => ({ ...s, playing: true }))
      if (!deviceSay(lines[i].text, state.rate, next)) setState((s) => ({ ...s, error: true, playing: false }))
      return
    }
    const url = ttsUrl({ text: lines[i].text, voice, lang: 'en', speed: state.rate })
    if (!url) {
      deviceRef.current = true
      return speakFrom(i)
    }
    a.src = url
    a.onended = next
    a.play().catch((e) => {
      // NotAllowedError — браузер не пустил звук без жеста, голос устройства тут не поможет
      if (e?.name === 'NotAllowedError') {
        ttsRef.current.stopped = true
        return setState((s) => ({ ...s, error: true, playing: false, plays: i === 0 ? Math.max(0, s.plays - 1) : s.plays }))
      }
      deviceRef.current = true
      speakFrom(i)
    })
  }, [transcript, state.rate])
  useEffect(() => {
    speakFromRef.current = speakFrom
  }, [speakFrom])

  // Синтез идёт репликами, и время плеера прыгало раз в 5–10 с — дорожка казалась стоящей. Между началами реплик
  // ведём её по часам: от начала реплики с поправкой на темп, но не дальше её конца по транскрипту.
  useEffect(() => {
    if (!tts || !state.playing) return
    const id = setInterval(() => {
      const cur = ttsRef.current
      const line = transcript?.[cur.i]
      if (cur.stopped || !line || !cur.at) return
      const start = Number(line.start) || 0
      const end = Number(line.end) || Number(transcript[cur.i + 1]?.start) || start
      const t = Math.min(Math.max(start, end), start + ((Date.now() - cur.at) / 1000) * (state.rate || 1))
      setState((s) => (Math.abs(s.time - t) < 0.05 ? s : { ...s, time: t }))
    }, 250)
    return () => clearInterval(id)
  }, [tts, state.playing, state.rate, transcript])

  const play = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    // после паузы синтез продолжается с той же реплики и прослушивание не тратит
    const fromStart = tts ? ttsRef.current.i < 0 || (ttsRef.current.stopped && !ttsRef.current.paused) : a.currentTime < 0.5 || a.ended
    if (fromStart && rules?.maxPlays && state.plays >= rules.maxPlays) return
    if (fromStart) setState((s) => ({ ...s, plays: s.plays + 1 }))
    if (tts) return speakFrom(fromStart ? 0 : ttsRef.current.i)
    if (a.ended) a.currentTime = 0
    // автозапуск, который браузер не пустил, единственное прослушивание экзамена не сжигает
    a.play().catch((e) => setState((s) => ({ ...s, error: true, plays: e?.name === 'NotAllowedError' && fromStart ? Math.max(0, s.plays - 1) : s.plays })))
  }, [rules, state.plays, tts, speakFrom])

  const pause = useCallback(() => {
    if (rules && !rules.allowPause) return
    if (tts) {
      ttsRef.current = { ...ttsRef.current, stopped: true, paused: true }
      stopDevice()
    }
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
    stopDevice()
    audioRef.current?.pause()
  }, [])

  return { ...state, tts, play, pause, seek, skip, setRate, playRange, stop }
}
