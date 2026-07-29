'use client'

// Shadowing — нативный тренажёр Практики: повторяй за спикером фраза за фразой.
// Порт standalone-тренажёра shadowing.html на React. Данные и чистые функции —
// в src/practice/shadowing/. Дизайн — по образцу ListeningPage (LearningLayout,
// .lt-top с «Назад» и хлебной крошкой, классы .sh-). Прогресс — множество id
// пройденных фраз через shadowingProgress + общий синк практики.
//
// Редактор скрипта и ретайминг — авторский инструмент; открываются только по
// ?dev=1 (пересобрать тайминги урока и выгрузить JSON для lessons.js). Обычный
// пользователь их не видит.

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { ChevronLeftIcon, PlayIcon, MicIcon, StopIcon, RepeatIcon } from '../components/icons.jsx'
import { LESSONS, getLesson } from '../practice/shadowing/lessons.js'
import { fmt, parseCaptions, segmentId } from '../practice/shadowing/engine.js'
import {
  getLessonDone,
  markSegmentDone,
  SHADOWING_PROGRESS_EVENT,
} from '../practice/shadowing/shadowingProgress.js'
import { blobToWav16kMono } from '../lib/ielts-audio.js'
import { assessTake } from '../practice/shadowing/assessClient.js'
import { saveTake, getTakeBlob, getLessonScores } from '../practice/shadowing/recordings.js'
import { lessonMastery, isPhraseMastered } from '../practice/shadowing/mastery.js'
import PhraseScore from '../components/shadowing/PhraseScore.jsx'

// Загрузка YouTube IFrame API — один раз на модуль (как _coversIndexPromise в
// PracticePage). SSR-гард: на сервере window нет, отдаём null и грузим плеер уже
// в эффекте после гидратации, иначе первый рендер клиента разойдётся с сервером
// (см. комментарий про hydration mismatch в App.jsx).
let _ytApiPromise = null
function loadYouTubeApi() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (!_ytApiPromise) {
    _ytApiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === 'function') prev()
        resolve(window.YT)
      }
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    })
  }
  return _ytApiPromise
}

// Лучший поддерживаемый mime для записи — как в исходнике.
function pickMime() {
  const c = ['audio/webm', 'audio/mp4', 'audio/ogg']
  for (const m of c) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(m)) return m
  }
  return ''
}

const SPEEDS = [0.5, 0.75, 1]

export default function ShadowingPage({ userLevel, userName, token, onNav, onProfile, lessonId }) {
  const { t, lang } = useI18n()

  // Текущий урок: стартовый id из пропса (диплинк-выбор карточки), дальше —
  // переключение табами. getLesson с фолбэком не даст упасть на битом id.
  const [curId, setCurId] = useState(() => getLesson(lessonId).id)
  const lesson = getLesson(curId)
  // segments держим в состоянии: в dev-режиме их правит ретайминг/редактор.
  const [segments, setSegments] = useState(lesson.segments)

  const [activeIdx, setActiveIdx] = useState(-1)
  const [rate, setRate] = useState(1)
  const [loopIdx, setLoopIdx] = useState(null) // null = без повтора
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  // Прогресс: множество id пройденных фраз этого урока. Обновляем при записи и
  // на событие гидратации (сервер прислал прогресс аккаунта).
  const [done, setDone] = useState(() => getLessonDone(curId))

  // ?dev=1 читаем в эффекте, а не в render — иначе SSR (dev=false) разойдётся с
  // первым клиентским рендером.
  const [dev, setDev] = useState(false)

  // Запись
  const [recSeg, setRecSeg] = useState(null) // индекс фразы, что сейчас пишется
  const [wholeRec, setWholeRec] = useState(false) // идёт запись всего отрывка
  const [wholeUrl, setWholeUrl] = useState(null)
  const [denied, setDenied] = useState(false)

  // Оценка произношения: результат на фразу (в памяти сессии) + индекс, что
  // сейчас оценивается. scores — лучший балл на фразу (Map segId→score, из
  // IndexedDB), из него считается мастерство.
  const [results, setResults] = useState({}) // segIndex → assessTake-результат
  const [assessingIdx, setAssessingIdx] = useState(-1)
  const [scores, setScores] = useState(() => new Map())

  // Режимы тренировки. syncMode — говорить ПОВЕРХ играющей фразы (настоящий
  // shadowing) vs «по очереди» (пауза → запись). blind — «слепой» parrot-режим:
  // текст скрыт, тренируется ухо.
  const [syncMode, setSyncMode] = useState(false)
  const [blind, setBlind] = useState(false)
  const syncRef = useRef(false)
  useEffect(() => { syncRef.current = syncMode }, [syncMode])

  // Поэтапный показ скрипта (по умолчанию включён): фразы открываются строго по
  // одной — следующую видно ТОЛЬКО после записи текущей (пропуска вперёд нет).
  // Тумблер «Поэтапно» можно выключить, чтобы увидеть весь скрипт сразу.
  const [stepMode, setStepMode] = useState(true)
  const [revealed, setRevealed] = useState(1)

  // Что сейчас проигрывается из записей: индекс фразы, 'whole' или null. Нужно,
  // чтобы «Твоя запись»/«Прослушать» работали как play/stop-тумблер.
  const [playingId, setPlayingId] = useState(null)
  const playingIdRef = useRef(null)
  useEffect(() => { playingIdRef.current = playingId }, [playingId])

  // Императивные рефы плеера/таймера/записи — не должны триггерить рендер.
  const playerRef = useRef(null)
  const timerRef = useRef(null)
  const stopAtRef = useRef(null)
  const loopRef = useRef(null)
  const rateRef = useRef(1)
  const activeRef = useRef(-1)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const recTargetRef = useRef(null)
  const autoStopRef = useRef(null)
  const takesRef = useRef({}) // takes[segIndex] = objectURL (в памяти, per lesson)
  const audioRef = useRef(null) // проигрывание своей записи

  const total = segments.length
  const doneCount = done.size

  // ── синхронизация состояния при смене урока ─────────────────────────────
  useEffect(() => {
    setSegments(lesson.segments)
    setActiveIdx(-1)
    activeRef.current = -1
    stopAtRef.current = null
    setLoopIdx(null)
    loopRef.current = null
    setDone(getLessonDone(curId))
    setResults({})
    setAssessingIdx(-1)
    setRevealed(1)
    // сбрасываем записи предыдущего урока (in-memory url'ы)
    for (const take of Object.values(takesRef.current)) {
      try { URL.revokeObjectURL(take?.url) } catch {}
    }
    takesRef.current = {}
    // лучшие баллы урока из IndexedDB (для мастерства и «освоено»)
    let alive = true
    getLessonScores(curId).then((m) => { if (alive) setScores(m) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curId])

  useEffect(() => {
    setDev(new URLSearchParams(window.location.search).get('dev') === '1')
    if (!audioRef.current) {
      audioRef.current = new Audio()
      // Дослушали запись до конца — снимаем «играет», кнопка снова «play».
      audioRef.current.addEventListener('ended', () => setPlayingId(null))
    }
  }, [])

  useEffect(() => { rateRef.current = rate }, [rate])
  useEffect(() => { loopRef.current = loopIdx }, [loopIdx])

  // Прогресс аккаунта прилетел с сервера (hydratePractice) — перечитываем.
  useEffect(() => {
    const onProgress = () => setDone(getLessonDone(curId))
    window.addEventListener(SHADOWING_PROGRESS_EVENT, onProgress)
    return () => window.removeEventListener(SHADOWING_PROGRESS_EVENT, onProgress)
  }, [curId])

  // ── YouTube player ──────────────────────────────────────────────────────
  const mountRef = useRef(null)
  useEffect(() => {
    let cancelled = false
    setReady(false)
    setError('')
    loadYouTubeApi().then((YT) => {
      if (cancelled || !YT || !mountRef.current) return
      playerRef.current = new YT.Player(mountRef.current, {
        // youtube-nocookie + origin: privacy-домен реже режется защитой от
        // отслеживания/блокировщиками, из-за которых YouTube отдаёт «Playback ID»-
        // ошибку вместо потока. origin помогает встроенному плееру на localhost.
        host: 'https://www.youtube-nocookie.com',
        videoId: lesson.video,
        playerVars: {
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => !cancelled && setReady(true),
          onStateChange: onState,
          // Недоступное/заблокированное видео больше не падает молча — показываем
          // заметку со ссылкой «смотреть на YouTube» (см. рендер .sh-note).
          onError: () => !cancelled && setError(t('shadowing.videoError')),
        },
      })
    })
    return () => {
      cancelled = true
      stopTracking()
      const p = playerRef.current
      playerRef.current = null
      try { p && p.destroy && p.destroy() } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Смена урока → перезагрузка ролика в существующем плеере.
  useEffect(() => {
    const p = playerRef.current
    if (!p || !p.cueVideoById) return
    setError('')
    try {
      p.cueVideoById(lesson.video)
      p.setPlaybackRate(rateRef.current)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.video])

  function onState(e) {
    const YT = window.YT
    if (!YT) return
    if (e.data === YT.PlayerState.PLAYING) startTracking()
    if (e.data === YT.PlayerState.ENDED) setActive(-1)
  }

  function startTracking() {
    if (timerRef.current) return
    timerRef.current = setInterval(() => {
      const p = playerRef.current
      if (!p || !p.getCurrentTime) return
      let cur
      try { cur = p.getCurrentTime() } catch { return }
      if (stopAtRef.current !== null && cur >= stopAtRef.current) {
        if (loopRef.current !== null) {
          try { p.seekTo(segments[loopRef.current][0], true) } catch {}
        } else {
          try { p.pauseVideo() } catch {}
          stopAtRef.current = null
        }
        return
      }
      const i = segments.findIndex((s) => cur >= s[0] && cur < s[1])
      setActive(i)
    }, 140)
  }
  function stopTracking() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function setActive(i) {
    if (i === activeRef.current) return
    activeRef.current = i
    setActiveIdx(i)
  }

  const pauseVideo = useCallback(() => {
    const p = playerRef.current
    try { p && p.pauseVideo && p.pauseVideo() } catch {}
    stopAtRef.current = null
  }, [])

  const playSegment = useCallback(
    (i, keepLoop) => {
      const s = segments[i]
      if (!s) return
      const p = playerRef.current
      if (!p || !p.seekTo) return
      if (!keepLoop && loopRef.current !== null) setLoopIdx(i)
      stopAtRef.current = s[1]
      setActive(i)
      try {
        p.setPlaybackRate(rateRef.current)
        p.seekTo(s[0], true)
        p.playVideo()
      } catch {}
    },
    [segments],
  )

  // ── запись ──────────────────────────────────────────────────────────────
  async function getStream() {
    if (streamRef.current && streamRef.current.active) return streamRef.current
    streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    return streamRef.current
  }

  function stopRec() {
    const r = recorderRef.current
    if (r && r.state !== 'inactive') r.stop()
  }

  async function startRec(target, onDone) {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setDenied(true)
      return false
    }
    try {
      const st = await getStream()
      setDenied(false)
      chunksRef.current = []
      const mt = pickMime()
      const rec = mt ? new MediaRecorder(st, { mimeType: mt }) : new MediaRecorder(st)
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data) }
      rec.onstop = () => {
        clearTimeout(autoStopRef.current)
        recTargetRef.current = null
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        onDone(blob)
      }
      recorderRef.current = rec
      recTargetRef.current = target
      rec.start()
      return true
    } catch {
      setDenied(true)
      return false
    }
  }

  // Запись одной фразы: пишем → сохраняем take → отмечаем попытку → на оценку.
  // syncMode: видео играет, микрофон пишет ОДНОВРЕМЕННО (говоришь поверх), стоп
  // ~на конце фразы. Иначе «по очереди»: пауза видео, тихая запись.
  async function segRecord(i) {
    if (recTargetRef.current) { stopRec(); return }
    const sync = syncRef.current
    if (!sync) pauseVideo()
    const ok = await startRec({ type: 'seg', i }, (blob) => {
      setRecSeg(null)
      const prev = takesRef.current[i]
      if (prev?.url) { try { URL.revokeObjectURL(prev.url) } catch {} }
      takesRef.current[i] = { url: URL.createObjectURL(blob), blob }
      // Попытка засчитана сразу (синкается в аккаунт), балл придёт от оценки.
      markSegmentDone(segmentId(curId, i))
      setDone(getLessonDone(curId))
      // Поэтапный режим: записал фразу → открываем следующую.
      setRevealed((r) => Math.min(total, Math.max(r, i + 2)))
      // Оценка НЕ автоматом (экономия Azure) — по кнопке «Оценить». Новая запись
      // сбрасывает прошлый результат этой фразы, чтобы можно было оценить заново.
      setResults((r) => {
        if (!(i in r)) return r
        const n = { ...r }
        delete n[i]
        return n
      })
    })
    if (!ok) return
    setRecSeg(i)
    const s = segments[i]
    if (sync) {
      // играем фразу (видео стопнется на её конце самим трекингом), а запись
      // обрываем чуть позже — чтобы поймать хвост речи ученика.
      playSegment(i, true)
      const dur = ((s[1] - s[0]) / rateRef.current + 0.6) * 1000
      autoStopRef.current = setTimeout(() => {
        if (recTargetRef.current?.type === 'seg' && recTargetRef.current.i === i) stopRec()
      }, dur)
    } else {
      const dur = Math.min(20, s[1] - s[0] + 3) * 1000
      autoStopRef.current = setTimeout(() => {
        if (recTargetRef.current?.type === 'seg' && recTargetRef.current.i === i) stopRec()
      }, dur)
    }
  }

  // Оценка записанной фразы: webm → 16кГц WAV → Azure (эталон = текст фразы) →
  // балл/послово/совет. Результат в памяти сессии; blob + лучший балл — в
  // IndexedDB (переживут перезагрузку). Осечки не критичны — без падения экрана.
  async function assessAndStore(i, blob) {
    setAssessingIdx(i)
    try {
      const wav = await blobToWav16kMono(blob)
      if (!wav) return
      const res = await assessTake(wav, segments[i][2], lang)
      setResults((r) => ({ ...r, [i]: res }))
      const segId = segmentId(curId, i)
      saveTake(segId, blob, res.overall) // best-effort persist (max балла внутри)
      setScores((m) => {
        const n = new Map(m)
        n.set(segId, Math.max(n.get(segId) || 0, res.overall))
        return n
      })
    } catch (e) {
      console.warn('[shadowing] assess failed', e)
    } finally {
      setAssessingIdx(-1)
    }
  }

  // Оценить фразу по кнопке (blob — из памяти или IndexedDB). Кэш: если результат
  // уже есть и запись не менялась — повторно не гоняем Azure.
  async function assessSeg(i) {
    if (assessingIdx !== -1 || results[i]) return
    let blob = takesRef.current[i]?.blob
    if (!blob) blob = await getTakeBlob(segmentId(curId, i))
    if (blob) assessAndStore(i, blob)
  }

  // URL записи фразы: из памяти или, после перезагрузки, из IndexedDB.
  async function resolveTakeUrl(i) {
    let url = takesRef.current[i]?.url
    if (url) return url
    const blob = await getTakeBlob(segmentId(curId, i))
    if (!blob) return null
    url = URL.createObjectURL(blob)
    takesRef.current[i] = { url, blob }
    return url
  }

  // Проигрывание записи как play/stop-тумблер. id — индекс фразы или 'whole'.
  function startTakeAudio(id, url) {
    if (!audioRef.current) return
    pauseVideo()
    audioRef.current.src = url
    audioRef.current.currentTime = 0
    audioRef.current.play().catch(() => {})
    setPlayingId(id)
  }
  function stopTakeAudio() {
    try { audioRef.current && audioRef.current.pause() } catch {}
    setPlayingId(null)
  }

  // «Твоя запись»: играет → повторный клик останавливает.
  async function playMine(i) {
    if (playingIdRef.current === i) { stopTakeAudio(); return }
    const url = await resolveTakeUrl(i)
    if (!url) return
    startTakeAudio(i, url)
  }

  // Сравнить: проигрываем фразу оригинала, затем свою запись (тоже останавливаемо).
  async function compare(i) {
    const url = await resolveTakeUrl(i)
    if (!url) return
    playSegment(i, true)
    const wait = ((segments[i][1] - segments[i][0]) / rateRef.current) * 1000 + 450
    setTimeout(() => startTakeAudio(i, url), wait)
  }

  // Запись всего отрывка (нижний большой микрофон).
  async function wholeRecord() {
    if (recTargetRef.current) { stopRec(); return }
    const ok = await startRec({ type: 'whole' }, (blob) => {
      setWholeRec(false)
      setWholeUrl((prev) => {
        if (prev) { try { URL.revokeObjectURL(prev) } catch {} }
        return URL.createObjectURL(blob)
      })
    })
    if (!ok) return
    setWholeRec(true)
  }

  // Полная остановка при уходе с экрана: таймер, запись, видео, свои аудио.
  useEffect(() => {
    return () => {
      stopTracking()
      try { recorderRef.current && recorderRef.current.state !== 'inactive' && recorderRef.current.stop() } catch {}
      try { streamRef.current && streamRef.current.getTracks().forEach((tr) => tr.stop()) } catch {}
      try { audioRef.current && audioRef.current.pause() } catch {}
      for (const take of Object.values(takesRef.current)) { try { URL.revokeObjectURL(take?.url) } catch {} }
      if (wholeUrl) { try { URL.revokeObjectURL(wholeUrl) } catch {} }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleLoop = () => {
    if (loopIdx === null) {
      const i = activeIdx >= 0 ? activeIdx : 0
      setLoopIdx(i)
      loopRef.current = i
      playSegment(i, true)
    } else {
      setLoopIdx(null)
      loopRef.current = null
    }
  }

  const back = () => onNav?.('practice')

  const progressPct = total ? Math.round((doneCount / total) * 100) : 0
  const mastery = lessonMastery(scores, total) // { mastered, pct } — локально

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className={`sh ${blind ? 'sh--blind' : ''}`}>
        <div className="sh-top">
          <button type="button" className="sh-back" onClick={back}>
            <ChevronLeftIcon size={16} /> {t('common.back')}
          </button>
          <div className="sh-crumb">
            <b>{t('shadowing.title')}</b>
            <span>{t('practice.title')}</span>
          </div>
        </div>

        {/* Табы уроков — классы .pp-chip как в остальной Практике */}
        <div className="sh-tabs">
          {LESSONS.map((l, i) => (
            <button
              key={l.id}
              type="button"
              className={`pp-chip ${l.id === curId ? 'pp-chip--on' : ''}`}
              onClick={() => setCurId(l.id)}
            >
              <span className="sh-tab__n">{i + 1}</span>
              {l.short}
            </button>
          ))}
        </div>

        {error && (
          <div className="sh-note sh-note--err">
            {error}{' '}
            <a
              className="sh-note__link"
              href={`https://www.youtube.com/watch?v=${lesson.video}`}
              target="_blank"
              rel="noreferrer"
            >
              {t('shadowing.watchOnYt')}
            </a>
          </div>
        )}

        {denied && <div className="sh-note sh-note--err">{t('shadowing.micDenied')}</div>}

        {/* Видео */}
        <section className="sh-card">
          <div className="sh-video">
            <div ref={mountRef} className="sh-video__player" />
          </div>
          <div className="sh-modes">
            <button
              type="button"
              className={`sh-chip ${syncMode ? 'sh-chip--on' : ''}`}
              onClick={() => setSyncMode((v) => !v)}
              title={t('shadowing.syncHint')}
            >
              <MicIcon size={14} /> {t('shadowing.sync')}
            </button>
            <button
              type="button"
              className={`sh-chip ${blind ? 'sh-chip--on' : ''}`}
              onClick={() => setBlind((v) => !v)}
              title={t('shadowing.blindHint')}
            >
              {t(blind ? 'shadowing.showText' : 'shadowing.hideText')}
            </button>
            <button
              type="button"
              className={`sh-chip ${stepMode ? 'sh-chip--on' : ''}`}
              onClick={() =>
                setStepMode((v) => {
                  const on = !v
                  if (on) {
                    // показать уже отработанные фразы + следующую
                    let furthest = 0
                    for (let k = 0; k < total; k++) if (done.has(segmentId(curId, k))) furthest = k + 1
                    setRevealed(Math.max(1, Math.min(total, furthest + 1)))
                  }
                  return on
                })
              }
              title={t('shadowing.stepHint')}
            >
              {t('shadowing.step')}
            </button>
          </div>
          <div className="sh-controls">
            <button
              type="button"
              className={`sh-chip ${loopIdx !== null ? 'sh-chip--on' : ''}`}
              onClick={toggleLoop}
              title={t('shadowing.loop')}
            >
              <RepeatIcon size={16} /> {t('shadowing.loop')}
            </button>
            <span className="sh-controls__lbl">{t('shadowing.speed')}</span>
            {SPEEDS.map((r) => (
              <button
                key={r}
                type="button"
                className={`sh-chip ${rate === r ? 'sh-chip--on' : ''}`}
                onClick={() => {
                  setRate(r)
                  try { playerRef.current && playerRef.current.setPlaybackRate(r) } catch {}
                }}
              >
                {r}×
              </button>
            ))}
            <span className="sh-controls__spacer" />
            <button
              type="button"
              className="sh-chip"
              disabled={activeIdx <= 0}
              onClick={() => playSegment(activeIdx - 1)}
              aria-label={t('shadowing.prev')}
            >
              ←
            </button>
            <button
              type="button"
              className="sh-chip"
              disabled={activeIdx >= total - 1}
              onClick={() => playSegment(activeIdx + 1)}
              aria-label={t('shadowing.next')}
            >
              →
            </button>
          </div>
          <div className="sh-prog">
            <div className="sh-prog__bar"><span style={{ width: `${progressPct}%` }} /></div>
            <span className="sh-prog__val">{t('shadowing.recorded', { done: doneCount, total })}</span>
            {mastery.mastered > 0 && (
              <span className="sh-prog__mastery" title={t('shadowing.masteredHint')}>
                ★ {t('shadowing.mastered', { done: mastery.mastered, total })}
              </span>
            )}
          </div>
        </section>

        {/* Скрипт */}
        <section className="sh-card">
          <div className="sh-sec__head">
            <h2>{t('shadowing.script')}</h2>
            <span className="sh-sec__hint">{t('shadowing.scriptHint')}</span>
          </div>
          <div className="sh-script">
            {(stepMode ? segments.slice(0, Math.min(revealed, total)) : segments).map((s, i) => {
              const segId = segmentId(curId, i)
              const isDone = done.has(segId)
              const bestScore = scores.get(segId)
              const mastered = isPhraseMastered(bestScore)
              const hasTake = !!takesRef.current[i] || isDone
              const active = i === activeIdx
              const recording = recSeg === i
              const result = results[i]
              const assessing = assessingIdx === i
              return (
                <div
                  key={i}
                  className={`sh-seg ${active ? 'is-active' : ''} ${isDone ? 'is-done' : ''} ${mastered ? 'is-mastered' : ''}`}
                  onClick={() => playSegment(i)}
                >
                  <span className="sh-seg__num">{i + 1}</span>
                  <div className="sh-seg__body">
                    <span className="sh-seg__txt">{s[2]}</span>
                    <span className="sh-seg__time">
                      {fmt(s[0])} – {fmt(s[1])}
                      {typeof bestScore === 'number' && (
                        <span
                          className={`sh-seg__score sh-seg__score--${bestScore >= 80 ? 'good' : bestScore >= 60 ? 'mid' : 'bad'}`}
                        >
                          {mastered ? '★ ' : ''}{bestScore}
                        </span>
                      )}
                    </span>
                    {hasTake && !result && !assessing && (
                      <div className="sh-seg__mine">
                        <button
                          type="button"
                          className="sh-seg__assess"
                          onClick={(e) => { e.stopPropagation(); assessSeg(i) }}
                        >
                          ★ {t('shadowing.assess')}
                        </button>
                        <span className="sh-seg__sep" />
                        <button type="button" onClick={(e) => { e.stopPropagation(); playMine(i) }}>
                          {playingId === i ? <StopIcon size={14} /> : <PlayIcon size={14} />}{' '}
                          {playingId === i ? t('shadowing.stop') : t('shadowing.yourTake')}
                        </button>
                        <span className="sh-seg__sep" />
                        <button type="button" onClick={(e) => { e.stopPropagation(); compare(i) }}>
                          <RepeatIcon size={14} /> {t('shadowing.compare')}
                        </button>
                      </div>
                    )}
                    {(result || assessing) && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <PhraseScore
                          result={result}
                          refText={s[2]}
                          assessing={assessing}
                          playing={playingId === i}
                          onRetry={() => segRecord(i)}
                          onPlayMine={() => playMine(i)}
                        />
                      </div>
                    )}
                  </div>
                  <div className="sh-seg__acts">
                    <button
                      type="button"
                      className="sh-seg__act"
                      onClick={(e) => { e.stopPropagation(); playSegment(i) }}
                      aria-label={t('shadowing.listen')}
                    >
                      <PlayIcon size={18} />
                    </button>
                    <button
                      type="button"
                      className={`sh-seg__act ${recording ? 'is-rec' : ''} ${hasTake ? 'has-take' : ''}`}
                      onClick={(e) => { e.stopPropagation(); segRecord(i) }}
                      aria-label={t('shadowing.record')}
                    >
                      {recording ? <StopIcon size={18} /> : <MicIcon size={18} />}
                    </button>
                  </div>
                </div>
              )
            })}
            {stepMode && revealed < total && (
              <div className="sh-locked">{t('shadowing.locked')}</div>
            )}
          </div>
        </section>

        {/* Запись всего отрывка — только в режиме «Синхрон» (говоришь поверх
            аудио целиком). В обычном режиме тренируемся пофразно. */}
        {syncMode && (
        <section className="sh-card">
          <div className="sh-sec__head">
            <h2>{t('shadowing.recordAll')}</h2>
            <span className="sh-sec__hint">{t('shadowing.recordAllHint')}</span>
          </div>
          <div className="sh-mic">
            <button
              type="button"
              className={`sh-mic__btn ${wholeRec ? 'is-rec' : ''}`}
              onClick={wholeRecord}
              aria-label={t('shadowing.record')}
            >
              {wholeRec ? <StopIcon size={40} /> : <MicIcon size={40} />}
            </button>
            <div className={`sh-mic__label ${wholeRec ? 'is-rec' : ''}`}>
              {wholeRec ? t('shadowing.recording') : wholeUrl ? t('shadowing.recorded1') : t('shadowing.micHint')}
            </div>
            {wholeUrl && !wholeRec && (
              <div className="sh-take">
                <button
                  type="button"
                  className="sh-take__listen"
                  onClick={() => (playingId === 'whole' ? stopTakeAudio() : startTakeAudio('whole', wholeUrl))}
                >
                  {playingId === 'whole' ? <StopIcon size={18} /> : <PlayIcon size={18} />}{' '}
                  {playingId === 'whole' ? t('shadowing.stop') : t('shadowing.listenMine')}
                </button>
                <button type="button" className="sh-take__again" onClick={() => setWholeUrl(null)}>
                  <RepeatIcon size={18} /> {t('shadowing.again')}
                </button>
              </div>
            )}
          </div>
        </section>
        )}

        {dev && (
          <DevTools
            lesson={lesson}
            segments={segments}
            onApply={(segs) => setSegments(segs)}
            player={playerRef}
            rows={segments}
            setActive={setActive}
          />
        )}
      </div>
    </LearningLayout>
  )
}

// ── Авторский инструмент (?dev=1): пересобрать скрипт из субтитров, растянуть
// тайминги под длину видео, выгрузить JSON для lessons.js. Обычный пользователь
// сюда не попадает — тайминги уже выверены в lessons.js.
function DevTools({ lesson, segments, onApply, player }) {
  const { t } = useI18n()
  const [raw, setRaw] = useState('')
  const [status, setStatus] = useState('')

  const parse = () => {
    const segs = parseCaptions(raw)
    if (raw.trim() && !segs.length) { setStatus(t('shadowing.dev.parseErr')); return }
    if (segs.length) { onApply(segs); setStatus(t('shadowing.dev.parsed', { n: segs.length })) }
  }

  // Растянуть все тайминги пропорционально под реальную длину ролика.
  const fitToVideo = () => {
    const p = player.current
    let dur = 0
    try { dur = p && p.getDuration ? p.getDuration() : 0 } catch {}
    if (!dur || dur < 10) { setStatus(t('shadowing.dev.needVideo')); return }
    const last = segments[segments.length - 1][1]
    const k = (dur * 0.97) / last
    if (k < 0.3 || k > 3.5) { setStatus(t('shadowing.dev.fitOff')); return }
    onApply(segments.map((s) => [+(s[0] * k).toFixed(2), +(s[1] * k).toFixed(2), s[2]]))
    setStatus(t('shadowing.dev.fitDone', { k: k.toFixed(2) }))
  }

  const exportJson = () => {
    const json = JSON.stringify({ id: lesson.id, title: lesson.title, video: lesson.video, segments }, null, 1)
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${lesson.id}-script.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1500)
  }

  return (
    <section className="sh-card sh-dev">
      <div className="sh-sec__head">
        <h2>{t('shadowing.dev.title')}</h2>
        <span className="sh-sec__hint">?dev=1</span>
      </div>
      <textarea
        className="sh-dev__area"
        spellCheck={false}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={t('shadowing.dev.placeholder')}
      />
      <div className="sh-dev__row">
        <button type="button" className="sh-chip" onClick={parse}>{t('shadowing.dev.parse')}</button>
        <button type="button" className="sh-chip" onClick={fitToVideo}>{t('shadowing.dev.fit')}</button>
        <button type="button" className="sh-chip" onClick={exportJson}>{t('shadowing.dev.export')}</button>
      </div>
      {status && <div className="sh-note">{status}</div>}
    </section>
  )
}
