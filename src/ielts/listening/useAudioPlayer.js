import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ttsUrl, VOICE } from '../../lib/ttsShared.js'
import { buildTimeline, locate, mapScriptTime } from './listening.js'

/**
 * Плеер записи Listening. Источник — файл (`src`: ссылка из бэкенда) или, если записи нет, транскрипт синтезом по
 * репликам (голос британский, у второго говорящего — мужской).
 *
 * Синтез раньше вёл себя не как запись: ±5 с не работали, пауза начинала реплику заново, между репликами были дыры, а
 * время прыгало по таймкодам сценария. Теперь реплики скачиваются целиком и декодируются — их длина известна точно, и
 * из длин строится одна шкала (`timeline`): перемотка, ±5 с, клик по реплике, пауза и «переслушать отрезок» попадают в
 * точное место внутри реплики. Темп — `playbackRate` того же звука, а не новый синтез: шкала от темпа не зависит.
 *
 * rules — из playerRules(): в экзамене нельзя паузу, перемотку и повтор (maxPlays: 1). «Прослушиванием» считается
 * старт с начала; продолжение после паузы прослушивание не тратит.
 *
 * Дорожка рисуется не через React: время в состоянии обновляется ~5 раз в секунду (подсветка реплики, номера), а бар
 * подписывается на `subscribe` и двигается каждый кадр — иначе плавная дорожка перерисовывала бы весь экран задания.
 */

// Скачанные реплики синтеза: адрес → Promise<{ blobUrl, duration }>. Общие на вкладку: повторное открытие части,
// разбор и диагностика не синтезируют и не качают ту же реплику заново.
const lines = new Map()
const known = new Map()
// уже скачанные — синхронно: на iPhone play() должен прозвучать в том же касании, ждать промис нельзя
const resolved = new Map()
// Потолок кэша: blob-адрес держит mp3 реплики, пока его не отозвать, а кэш живёт всю вкладку (части, разборы,
// диагностика). Полный тест — ~150 реплик; старейшие сверх потолка отзываются. Длительность (known) — числа, её не
// трогаем: перемотка по шкале остаётся точной и для вытесненных реплик.
const MAX_LINES = 300

function evictOld() {
  while (lines.size > MAX_LINES) {
    const oldest = lines.keys().next().value
    lines.delete(oldest)
    const r = resolved.get(oldest)
    if (r) {
      URL.revokeObjectURL(r.blobUrl)
      resolved.delete(oldest)
    }
  }
}

function decodeDuration(buf) {
  const Ctx = typeof window !== 'undefined' && (window.OfflineAudioContext || window.webkitOfflineAudioContext)
  if (!Ctx) return Promise.resolve(null)
  const ctx = new Ctx(1, 1, 44100)
  // промис-форма decodeAudioData есть не везде (старый Safari) — колбэки работают везде
  return new Promise((res) => ctx.decodeAudioData(buf, (ab) => res(ab.duration), () => res(null)))
}

export function loadLine(url) {
  if (!lines.has(url)) {
    const p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`tts ${r.status}`))))
      .then(async (buf) => {
        const blobUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }))
        const duration = await decodeDuration(buf.slice(0))
        if (duration) known.set(url, duration)
        const out = { blobUrl, duration }
        resolved.set(url, out)
        return out
      })
    p.catch(() => lines.delete(url))
    lines.set(url, p)
    evictOld()
  } else {
    // недавно нужная реплика — в конец очереди, вытесняются давно не звучавшие
    const p = lines.get(url)
    lines.delete(url)
    lines.set(url, p)
  }
  return lines.get(url)
}

// Голос устройства — последний запасной путь, когда /api/tts не отвечает (нет ключа Soniox, лимит, сеть): тишина в
// Listening хуже робота. Внутри реплики он перематываться не умеет — продолжает с начала реплики.
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

const EPS = 0.05

export function useAudioPlayer({ src, transcript, rules, onEnded }) {
  const audioRef = useRef(null)
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded
  const rulesRef = useRef(rules)
  rulesRef.current = rules

  const tts = !src && Array.isArray(transcript) && transcript.length > 0
  const script = useMemo(() => (Array.isArray(transcript) ? transcript : []), [transcript])
  const urls = useMemo(() => {
    if (!tts) return []
    const speakers = [...new Set(script.map((l) => l.speaker).filter(Boolean))]
    return script.map((l) => ttsUrl({ text: l.text, voice: speakers.indexOf(l.speaker) === 1 ? VOICE.gbMale : VOICE.gb, lang: 'en', speed: 1 }))
  }, [tts, script])

  // длины реплик синтеза: точные — по мере скачивания, до того — оценка по словам (buildTimeline)
  const [durations, setDurations] = useState([])
  const timeline = useMemo(() => {
    if (tts) return buildTimeline(script, durations)
    // у записи шкала и есть таймкоды транскрипта
    return script.map((l, i) => ({ start: Number(l.start) || 0, end: Number(l.end) || Number(script[i + 1]?.start) || Number(l.start) || 0 }))
  }, [tts, script, durations])
  const timelineRef = useRef(timeline)
  timelineRef.current = timeline

  const [state, setState] = useState({ playing: false, time: 0, duration: 0, rate: 1, plays: 0, error: false, loading: false })
  const stateRef = useRef(state)
  stateRef.current = state
  const set = useCallback((patch) => setState((s) => ({ ...s, ...patch })), [])

  // что сейчас в элементе: реплика синтеза (−1 — ничего), отложенная перемотка до загрузки, конец «отрезка»
  const cur = useRef({ line: -1, blob: false })
  const pendingSeek = useRef(null)
  const endAt = useRef(null)
  const playingRef = useRef(false)
  const finished = useRef(false)
  const device = useRef({ on: false, line: -1, at: 0 })
  const listeners = useRef(new Set())
  const started = useRef(false)

  const total = tts ? timeline.at(-1)?.end || 0 : state.duration

  /** Точное время по шкале плеера — для дорожки каждый кадр. */
  const getTime = useCallback(() => {
    const a = audioRef.current
    if (!a) return 0
    if (!tts) return a.currentTime || 0
    const tl = timelineRef.current
    if (device.current.on) {
      const seg = tl[device.current.line]
      if (!seg) return stateRef.current.time
      // на паузе — то место, где остановились (а не начало реплики)
      if (!playingRef.current && device.current.frozen != null) return device.current.frozen
      const run = playingRef.current ? ((Date.now() - device.current.at) / 1000) * (stateRef.current.rate || 1) : 0
      return Math.min(seg.end, seg.start + run)
    }
    const seg = tl[cur.current.line]
    if (!seg) return finished.current ? tl.at(-1)?.end || 0 : 0
    // пока реплика грузится, а перемотка отложена, время — место перемотки, а не ноль новой реплики
    const within = pendingSeek.current != null ? pendingSeek.current : a.currentTime || 0
    return Math.min(seg.end, seg.start + within)
  }, [tts])

  const emit = useCallback(() => {
    const t = getTime()
    listeners.current.forEach((fn) => fn(t))
    return t
  }, [getTime])

  // кадр: дорожка — каждый кадр через подписчиков, состояние — не чаще ~5 раз в секунду
  useEffect(() => {
    if (!state.playing) return
    let raf = 0
    let last = 0
    const tick = (now) => {
      const t = emit()
      if (endAt.current != null && t >= endAt.current) {
        endAt.current = null
        pauseRef.current()
        return
      }
      if (now - last > 200) {
        last = now
        setState((s) => (Math.abs(s.time - t) < 0.01 ? s : { ...s, time: t }))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [state.playing, emit]) // eslint-disable-line react-hooks/exhaustive-deps

  const subscribe = useCallback((fn) => {
    listeners.current.add(fn)
    fn(getTime())
    return () => listeners.current.delete(fn)
  }, [getTime])

  // ---- синтез: скачать реплики по очереди, начиная с нужной ----
  const failed = useRef(new Set())
  const mounted = useRef(true)
  const fetchFrom = useRef(0)
  const prefetching = useRef(false)
  const prefetch = useCallback((from = 0) => {
    if (!tts || !urls.length) return
    fetchFrom.current = from
    if (prefetching.current) return
    prefetching.current = true
    const next = () => {
      // ближайшая нескачанная начиная с текущей реплики, потом с начала
      const order = [...urls.keys()].slice(fetchFrom.current).concat([...urls.keys()].slice(0, fetchFrom.current))
      const i = order.find((k) => !known.has(urls[k]) && !failed.current.has(k))
      if (i == null || !mounted.current) {
        prefetching.current = false
        return
      }
      loadLine(urls[i])
        .then((r) => mounted.current && setDurations((d) => {
          const out = d.slice()
          out[i] = r.duration
          return out
        }))
        .catch(() => failed.current.add(i))
        .finally(next)
    }
    next()
  }, [tts, urls])

  const finish = useCallback(() => {
    playingRef.current = false
    finished.current = true
    stopDevice()
    set({ playing: false, time: timelineRef.current.at(-1)?.end || audioRef.current?.duration || 0 })
    emit()
    onEndedRef.current?.()
  }, [set, emit])

  // реплика i с места within: запись готова — точно (blob), нет — потоком с начала, и после загрузки доводим до места
  const startLine = useCallback((i, within, autoplay) => {
    const a = audioRef.current
    if (!a) return
    if (i >= urls.length) return finish()
    finished.current = false
    if (device.current.on) {
      device.current = { on: true, line: i, at: Date.now(), frozen: null }
      if (autoplay) {
        const ok = deviceSay(script[i].text, stateRef.current.rate, () => {
          if (device.current.line === i && playingRef.current) startLine(i + 1, 0, true)
        })
        if (!ok) set({ error: true, playing: false })
      }
      emit()
      return
    }
    const url = urls[i]
    prefetch(i)
    const go = (blobUrl) => {
      cur.current = { line: i, blob: !!blobUrl }
      const target = blobUrl || url
      if (a.getAttribute('src') !== target) {
        pendingSeek.current = within > EPS ? within : null
        a.src = target
        a.playbackRate = a.defaultPlaybackRate = stateRef.current.rate || 1
      } else {
        pendingSeek.current = null
        a.currentTime = within
      }
      if (autoplay) {
        a.play().catch((e) => {
          if (e?.name === 'AbortError') return
          // синтез не ответил (503 без ключа, лимит, сеть): элемент отвергает источник раньше, чем приходит error —
          // переходим на голос устройства здесь, иначе плеер красился в «ошибку» и молчал
          if (e?.name === 'NotSupportedError') return toDeviceRef.current(i)
          if (e?.name === 'NotAllowedError') {
            // браузер не пустил звук без касания: стоим на месте, ▶ продолжит отсюда
            playingRef.current = false
            set({ playing: false })
            return
          }
          set({ error: true, playing: false })
        })
      }
      emit()
    }
    const ready = resolved.get(url)
    if (ready) {
      // уже скачано: точный звук сразу, в том же касании
      go(ready.blobUrl)
    } else if (within > EPS) {
      // место внутри нескачанной реплики: поток не перематывается — ждём файл (обычно доли секунды из кэша сервера)
      cur.current = { line: i, blob: false }
      pendingSeek.current = within
      set({ loading: true })
      loadLine(url).then((r) => { set({ loading: false }); if (cur.current.line === i) go(r.blobUrl) }, () => { set({ loading: false }); go(null) })
    } else {
      // старт реплики с начала — сразу потоком: на iPhone play() должен прозвучать в том же касании
      go(null)
      loadLine(url).then((r) => setDurations((d) => {
        const out = d.slice()
        out[i] = r.duration
        return out
      }), () => {})
    }
  }, [urls, script, prefetch, finish, set, emit])

  // реплика не синтезировалась ни потоком, ни файлом — дальше читает голос устройства (один раз за часть)
  const toDevice = useCallback((i) => {
    if (device.current.on) return
    device.current = { on: true, line: i, at: Date.now() }
    audioRef.current?.pause()
    playingRef.current = true
    set({ playing: true, error: false })
    startLine(i, 0, true)
  }, [startLine, set])
  // startLine и toDevice зовут друг друга — через ref, без круга зависимостей
  const toDeviceRef = useRef(toDevice)
  useEffect(() => {
    toDeviceRef.current = toDevice
  }, [toDevice])

  // ---- элемент: один на плеер (разрешение звука на iPhone живёт на элементе) ----
  useEffect(() => {
    mounted.current = true
    const a = new Audio()
    a.preload = 'metadata'
    audioRef.current = a
    return () => {
      mounted.current = false
      // сначала отвязать обработчики: пустой src сам рождает error, и он (в dev — после повторного монтирования
      // StrictMode) красил новый плеер в «Не удалось загрузить запись»
      a.onloadedmetadata = a.ondurationchange = a.onplay = a.onpause = a.onerror = a.onended = null
      a.pause()
      a.removeAttribute('src')
      a.load()
      playingRef.current = false
      stopDevice()
    }
  }, [])

  // обработчики зависят от режима — переназначаются, а не копятся
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.onloadedmetadata = () => {
      if (pendingSeek.current != null && Number.isFinite(a.duration)) {
        a.currentTime = Math.min(pendingSeek.current, Math.max(0, a.duration - EPS))
        pendingSeek.current = null
      } else if (pendingSeek.current != null && !tts) {
        a.currentTime = pendingSeek.current
        pendingSeek.current = null
      }
      if (!tts && Number.isFinite(a.duration)) set({ duration: a.duration })
      emit()
    }
    a.ondurationchange = () => {
      if (!tts && Number.isFinite(a.duration)) set({ duration: a.duration })
    }
    // у записи «играет / пауза» — события элемента; у синтеза смена реплики сама ставит паузу, поэтому там
    // состояние ведут действия плеера, а не события
    a.onplay = () => {
      if (!tts) {
        playingRef.current = true
        set({ playing: true, error: false })
      }
    }
    a.onpause = () => {
      if (!tts) {
        playingRef.current = false
        set({ playing: false, time: a.currentTime })
        emit()
      }
    }
    a.onended = () => {
      if (!tts) return finish()
      const i = cur.current.line
      // реплика отзвучала целиком — её точная длина теперь известна, даже если декодер не справился
      if (i >= 0 && Number.isFinite(a.duration) && !durations[i]) setDurations((d) => {
        const out = d.slice()
        out[i] = a.duration
        return out
      })
      if (playingRef.current) startLine(i + 1, 0, true)
    }
    a.onerror = () => {
      if (!a.getAttribute('src')) return
      if (tts && playingRef.current) return toDevice(Math.max(0, cur.current.line))
      playingRef.current = false
      set({ error: true, playing: false })
    }
  }, [tts, durations, startLine, toDevice, finish, set, emit])

  // новая часть или клип: всё с нуля
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.pause()
    playingRef.current = false
    finished.current = false
    endAt.current = null
    pendingSeek.current = null
    started.current = false
    cur.current = { line: -1, blob: false }
    device.current = { on: false, line: -1, at: 0 }
    failed.current = new Set()
    stopDevice()
    if (src) {
      a.src = src
      a.load()
    } else {
      a.removeAttribute('src')
    }
    setDurations(urls.map((u) => known.get(u) ?? null))
    setState((s) => ({ ...s, time: 0, duration: 0, plays: 0, error: false, playing: false, loading: false }))
    listeners.current.forEach((fn) => fn(0))
  }, [src, urls])

  const play = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    const r = rulesRef.current
    const t = getTime()
    const fromStart = finished.current || t < 0.25
    if (fromStart && r?.maxPlays && stateRef.current.plays >= r.maxPlays) return
    if (fromStart) set({ plays: stateRef.current.plays + 1 })
    started.current = true
    playingRef.current = true
    set({ playing: true, error: false })
    if (tts) {
      if (finished.current || cur.current.line < 0) return startLine(0, 0, true)
      if (device.current.on) return startLine(device.current.line, 0, true)
      // пауза внутри реплики: тот же звук с того же места
      if (a.getAttribute('src') && !a.ended) {
        a.play().catch((e) => e?.name !== 'AbortError' && set({ error: true, playing: false }))
        return
      }
      const { i, within } = locate(timelineRef.current, t)
      return startLine(i, within, true)
    }
    if (finished.current || a.ended) a.currentTime = 0
    finished.current = false
    // автозапуск, который браузер не пустил, единственное прослушивание экзамена не сжигает
    a.play().catch((e) => {
      playingRef.current = false
      set({ error: e?.name !== 'NotAllowedError', playing: false, plays: e?.name === 'NotAllowedError' && fromStart ? Math.max(0, stateRef.current.plays - 1) : stateRef.current.plays })
    })
  }, [tts, getTime, startLine, set])

  // через useCallback, а не просто функцией: pause() раньше запоминал версию с первого рендера, когда транскрипт ещё
  // не пришёл, — и на паузе считал время как у записи (0:00 или время внутри реплики без её начала)
  const pauseInternal = useCallback(() => {
    const a = audioRef.current
    const t = getTime()
    playingRef.current = false
    if (device.current.on) {
      stopDevice()
      // время паузы показываем как есть; голос устройства продолжит с начала этой реплики
      device.current = { ...device.current, frozen: t }
    }
    a?.pause()
    set({ playing: false, time: t })
    emit()
  }, [getTime, set, emit])
  const pauseRef = useRef(pauseInternal)
  useEffect(() => {
    pauseRef.current = pauseInternal
  }, [pauseInternal])

  const pause = useCallback(() => {
    if (rulesRef.current && !rulesRef.current.allowPause) return
    pauseInternal()
  }, [pauseInternal])

  /** Перемотка на время шкалы плеера (секунды). force — мимо правил (разбор, «переслушать отрезок»). */
  const seekTo = useCallback((t, { force = false, autoplay } = {}) => {
    if (!force && rulesRef.current && !rulesRef.current.allowSeek) return
    const a = audioRef.current
    if (!a) return
    endAt.current = null
    const len = tts ? timelineRef.current.at(-1)?.end || 0 : a.duration || stateRef.current.duration || 0
    const x = Math.max(0, len ? Math.min(t, Math.max(0, len - EPS)) : t)
    finished.current = false
    const keep = autoplay ?? playingRef.current
    if (tts) {
      if (!started.current) prefetch(0)
      const { i, within } = locate(timelineRef.current, x)
      if (keep) {
        playingRef.current = true
        set({ playing: true })
      }
      startLine(i, within, keep)
      set({ time: x })
      return
    }
    if (Number.isFinite(a.duration) && a.readyState >= 1) a.currentTime = x
    else pendingSeek.current = x
    set({ time: x })
    emit()
    if (autoplay && a.paused) a.play().catch(() => set({ error: true }))
  }, [tts, prefetch, startLine, set, emit])

  const seek = useCallback((t) => seekTo(t), [seekTo])
  const skip = useCallback((delta) => seekTo(getTime() + delta), [seekTo, getTime])

  /** Реплика транскрипта i: перейти к её началу (и играть, если играло — или если просят play). */
  const seekLine = useCallback((i, { play: andPlay = false, force = false } = {}) => {
    const seg = timelineRef.current[i]
    if (!seg) return
    seekTo(seg.start + 0.001, { force, autoplay: andPlay || playingRef.current })
  }, [seekTo])

  const setRate = useCallback((rate) => {
    if (rulesRef.current && !rulesRef.current.allowRate) return
    const a = audioRef.current
    if (a) a.playbackRate = a.defaultPlaybackRate = rate
    set({ rate })
  }, [set])

  // «Переслушать отрезок» — разбор и «Тренировка»: audioStart..audioEnd вопроса во времени СЦЕНАРИЯ, мимо правил
  const playRange = useCallback((start, end) => {
    if (start == null) return
    const map = (x) => (tts ? mapScriptTime(script, timelineRef.current, x) : x)
    seekTo(map(start), { force: true, autoplay: true })
    endAt.current = end == null ? null : map(end)
    if (!stateRef.current.playing) {
      playingRef.current = true
      set({ playing: true })
    }
  }, [tts, script, seekTo, set])

  const stop = useCallback(() => {
    playingRef.current = false
    stopDevice()
    audioRef.current?.pause()
    set({ playing: false })
  }, [set])

  // текущая реплика — по времени в состоянии (до первого звука — ни одной)
  const line = useMemo(() => {
    if (!timeline.length || (!state.playing && state.time <= 0)) return -1
    return locate(timeline, state.time).i
  }, [timeline, state.time, state.playing])

  return { ...state, duration: tts ? total : state.duration, tts, timeline, line, getTime, subscribe, play, pause, seek, skip, seekLine, setRate, playRange, stop }
}
