'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n.jsx'
import { pluralForm } from '../../lib/plural.js'
import { sungSeconds, fullText } from '../../practice/karaoke/karaokeShape.js'
import {
  referenceMask,
  rhythmScore,
  coverageScore,
  lyricsScore,
  paceScore,
  syllablesIn,
  finalScore,
  lineWordMatches,
  linesToRepeat,
  missedSpan,
} from '../../practice/karaoke/scoring.js'
import {
  isMicSupported,
  requestMic,
  stopStream,
  startTake,
  transcribeTake,
  unlockPlayback,
  createAudioContext,
} from '../../practice/karaoke/mic.js'
import {
  fmtTime,
  lineAt,
  focusLineIndex,
  wordTimes,
  activeWordIndex,
  linesPassed,
} from '../../practice/karaoke/timeline.js'
import { CloseIco, MicIco, Replay5Ico, Forward5Ico, PlayCircleIco, ReplayIco } from './KaraokeIcons.jsx'

// Экран исполнения — макет Figma «Караоке» (1 · Плеер, 2 · Пауза).
//
// Во весь экран, поверх сайдбара: тёмная сцена с крупной строкой, и рядом с
// ней ничего не должно отвлекать. Поэтому плеер рисуется порталом в body, а не
// внутри раскладки Практики, — результат же (3 · Результат) остаётся в ней.
//
// Отдельного экрана «карточка трека → режим → настройка» в макете нет: всё,
// что там выбиралось, стоит прямо на сцене — «Минус» и «Микрофон» сверху,
// старт — кнопкой ▶. Обещание про запись (запись никуда не сохраняется)
// показывается над панелью до первого нажатия: оно обязано быть на экране до
// запроса разрешения на микрофон.
//
// `range` — режим «Повторить» с экрана результата: одна строка с разгоном в
// пару секунд, в конце — её собственное совпадение вместо разбора песни.

const SEEK_STEP = 5
// Высоты полосок в покое — ровно рисунок из макета, чтобы плашка не
// схлопывалась в линию до старта и в паузах.
const IDLE_BARS = [10, 18, 26, 14, 30, 22, 12, 24, 16, 8, 20, 28].map((h) => ({ h, on: false }))

/** Разбор дубля целиком: метрики, медаль, строки для повтора. */
function buildResult({ lines, duration, mask, sungSec, text, instrumental }) {
  const ref = referenceMask(lines, duration)
  const rhythm = rhythmScore(ref, mask)
  const { score: coverage, perLine } = coverageScore(lines, mask)
  const lyr = text ? lyricsScore(fullText(lines), text) : null
  const pace = paceScore({
    refSyllables: syllablesIn(fullText(lines)),
    refSungSec: sungSeconds(lines),
    userSyllables: text ? syllablesIn(text) : null,
    userSungSec: sungSec,
  })
  const { score, medal } = finalScore({
    lyrics: lyr?.score ?? 0,
    rhythm,
    coverage,
    pace,
    hasLyrics: Boolean(text),
    instrumental,
  })
  const matches = text ? lineWordMatches(lines, text) : null
  const repeat = linesToRepeat({ lines, perLine, matches })
  // «Сложнее всего дались …» — сначала сложные слова тех строк, что в списке
  // на повтор (их студент видит подчёркнутыми ниже), потом остальные
  // непрозвучавшие.
  const hard = []
  for (const w of [...repeat.map((r) => r.hard), ...(lyr?.missed || [])]) {
    if (w && !hard.includes(w)) hard.push(w)
    if (hard.length === 3) break
  }
  return {
    score,
    medal,
    rhythm: Math.round(rhythm),
    lyrics: lyr ? Math.round(lyr.score) : null,
    coverage: Math.round(coverage),
    pace: Math.round(pace),
    sungLines: perLine.filter((l) => l.sung).length,
    totalLines: lines.length,
    missed: missedSpan(perLine, lines),
    hard,
    repeat,
  }
}

export default function KaraokePlayer({ track, doc, failed, range, onResult, onLineResult, onExit }) {
  const { t, lang } = useI18n()
  const lines = doc?.lines || []
  const duration = doc?.duration || 0
  const from = range ? range.from : 0

  // ready → calibrating → run ⇄ paused → scoring
  const [phase, setPhase] = useState('ready')
  const [micOn, setMicOn] = useState(() => isMicSupported())
  const [instrumental, setInstrumental] = useState(false)
  const [pos, setPos] = useState(from)
  const [voiced, setVoiced] = useState(false)
  const [bars, setBars] = useState(IDLE_BARS)
  const [note, setNote] = useState('')

  const audioRef = useRef(null)
  const streamRef = useRef(null)
  const takeRef = useRef(null)
  const rafRef = useRef(0)
  const barsAtRef = useRef(0)
  // Смена фонограммы на ходу: пока новый файл грузится, currentTime = 0, и
  // маска с подсветкой прыгнули бы в начало песни. Держим позицию здесь.
  const swapRef = useRef(null)
  const vocalUsedRef = useRef(false)
  const finishingRef = useRef(false)
  // Номер запуска: выход или «Начать заново» посреди калибровки не должен
  // дать старому start() доиграть до play() — он сверяет номер после каждого
  // await и молча сходит с дистанции.
  const runRef = useRef(0)
  const goRef = useRef(null)
  const trackElRef = useRef(null)

  const src = instrumental && track.instrumentalUrl ? track.instrumentalUrl : track.audioUrl

  // Свежие обработчики для requestAnimationFrame и клавиатуры: подписки
  // живут дольше одного рендера и звали бы замыкание с устаревшим состоянием.
  const liveRef = useRef({})
  const loop = useCallback((now) => liveRef.current.tick?.(now), [])
  const callFinish = useCallback(() => liveRef.current.finish?.(), [])

  // Позиция трека — единственные часы экрана: и подсветка, и маска VAD берут
  // её отсюда. Стенные часы разъехались бы с музыкой на первой же паузе
  // буферизации.
  const positionSec = useCallback(
    () => (swapRef.current ? swapRef.current.time : audioRef.current?.currentTime || 0),
    [],
  )

  const releaseMic = useCallback(() => {
    if (streamRef.current) {
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [])

  /** Бросить дубль без результата: трек стоп, запись в корзину, микрофон отпустить. */
  const abandon = useCallback(() => {
    runRef.current++
    cancelAnimationFrame(rafRef.current)
    audioRef.current?.pause()
    const take = takeRef.current
    takeRef.current = null
    take?.stop().catch(() => {})
    releaseMic()
    swapRef.current = null
    finishingRef.current = false
  }, [releaseMic])

  useEffect(() => abandon, [abandon])

  // `now` — метка кадра от requestAnimationFrame: по ней полоски уровня
  // сдвигаются раз в ~90 мс, а не каждый кадр.
  const tick = (now) => {
    const a = audioRef.current
    if (!a) return
    const p = swapRef.current ? swapRef.current.time : a.currentTime
    setPos(p)
    const take = takeRef.current
    if (take) {
      const v = take.voiced()
      setVoiced(v)
      if (now - barsAtRef.current > 90) {
        barsAtRef.current = now
        const h = Math.round(6 + take.level() * 24)
        setBars((b) => [...b.slice(1), { h, on: v }])
      }
    }
    if (range && p >= range.to) {
      finish()
      return
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  const finish = async () => {
    if (finishingRef.current) return
    finishingRef.current = true
    // Разбор идёт секунды (распознавание по сети) — за это время экран могли
    // закрыть. Тот же номер запуска, что у start(): сменился — результат
    // никому не нужен, и колбэки родителя звать нельзя.
    const run = runRef.current
    cancelAnimationFrame(rafRef.current)
    const a = audioRef.current
    a?.pause()
    const take = takeRef.current
    takeRef.current = null
    if (!take) {
      // Без оценки разбирать нечего: песня просто встаёт в начало.
      releaseMic()
      finishingRef.current = false
      if (range) {
        onExit()
        return
      }
      if (a) a.currentTime = 0
      setPos(0)
      setBars(IDLE_BARS)
      setPhase('ready')
      return
    }
    setPhase('scoring')
    const { mask, sungSec, blob } = await take.stop()
    releaseMic()
    const text = await transcribeTake(blob)
    if (run !== runRef.current) return
    if (range) {
      const { perLine } = coverageScore([range.line], mask)
      const m = text ? lineWordMatches([range.line], text)[0] : null
      onLineResult({ id: range.line.id, ratio: m ? m.ratio : perLine[0].ratio })
      return
    }
    onResult(
      buildResult({
        lines,
        duration,
        mask,
        sungSec,
        text,
        // Бонус минуса — только если вокал не включали ни разу за дубль:
        // иначе его можно было бы получить, спев всё под певца и щёлкнув
        // тумблер на последней строке.
        instrumental: Boolean(track.instrumentalUrl) && !vocalUsedRef.current,
      }),
    )
  }

  const start = async () => {
    setNote('')
    const audio = audioRef.current
    if (!audio || !doc) return
    const run = ++runRef.current
    finishingRef.current = false

    // Всё, что требует жеста, — здесь, до первого await. Дальше идёт запрос
    // разрешения на микрофон и полторы секунды калибровки, и к настоящему
    // play() жест уже не будет засчитан: в Safari трек просто не запускался.
    unlockPlayback(audio)
    const ctx = micOn ? createAudioContext() : null

    if (micOn) {
      if (!isMicSupported()) {
        setNote(t('karaoke.micUnsupported'))
        ctx?.close?.().catch(() => {})
        return
      }
      try {
        streamRef.current = streamRef.current || (await requestMic())
      } catch {
        setNote(t('karaoke.micDenied'))
        ctx?.close?.().catch(() => {})
        return
      }
      if (run !== runRef.current) return
      setPhase('calibrating')
      // Калибровка фона идёт ДО первой ноты — стартуем трек только после неё,
      // иначе полторы секунды песни улетают в «тишину» и портят и маску, и
      // порог.
      const take = await startTake({ stream: streamRef.current, durationSec: duration, positionSec, ctx })
      if (run !== runRef.current) {
        take.stop().catch(() => {})
        return
      }
      takeRef.current = take
    }
    vocalUsedRef.current = !(instrumental && track.instrumentalUrl)
    audio.currentTime = from
    setPos(from)
    setPhase('run')
    rafRef.current = requestAnimationFrame(loop)
    const err = await audio.play().then(
      () => null,
      (e) => e,
    )
    if (run !== runRef.current || !err) return
    // AbortError — play() прервали наши же pause() или смена фонограммы:
    // студент нажал паузу, пока трек ещё буферизовался. Это не отказ браузера,
    // и бросать из-за него дубль нельзя — раньше пауза в первую секунду
    // выкидывала на старт с «браузер не дал запустить» (ловил e2e).
    if (err.name === 'AbortError') return
    // Настоящий отказ (автоплей, битый файл). Дубль уже идёт: у него свой
    // таймер и свой MediaRecorder — останавливаем по-настоящему.
    abandon()
    setNote(t('karaoke.playbackBlocked'))
    setPhase('ready')
  }

  const pause = () => {
    cancelAnimationFrame(rafRef.current)
    audioRef.current?.pause()
    takeRef.current?.pause()
    setVoiced(false)
    setPhase('paused')
  }

  const resume = async () => {
    const a = audioRef.current
    if (!a) return
    takeRef.current?.resume()
    setPhase('run')
    rafRef.current = requestAnimationFrame(loop)
    const err = await a.play().then(
      () => null,
      (e) => e,
    )
    // AbortError — снова пауза, пока трек догружался; см. start().
    if (err && err.name !== 'AbortError') {
      cancelAnimationFrame(rafRef.current)
      takeRef.current?.pause()
      setPhase('paused')
    }
  }

  const restart = () => {
    abandon()
    setBars(IDLE_BARS)
    start()
  }

  const quit = () => {
    abandon()
    onExit()
  }

  const onExitClick = () => {
    if (phase === 'run') pause()
    else if (phase === 'ready' || phase === 'calibrating') quit()
  }

  const onPlayClick = () => {
    if (phase === 'ready') start()
    else if (phase === 'run') pause()
    else if (phase === 'paused') resume()
  }

  const toggleInstrumental = () => {
    const a = audioRef.current
    const live = phase === 'run' || phase === 'paused'
    if (a && live) {
      swapRef.current = { time: a.currentTime, play: phase === 'run' }
      if (instrumental) vocalUsedRef.current = true
    }
    setInstrumental((v) => !v)
  }

  // Новый файл фонограммы встал — возвращаемся туда, где пели.
  const onMeta = () => {
    const s = swapRef.current
    const a = audioRef.current
    if (!s || !a) return
    a.currentTime = s.time
    swapRef.current = null
    if (s.play) a.play().catch(() => {})
  }

  const canSeek = !range && (phase === 'run' || phase === 'paused')
  const seekTo = (sec) => {
    const a = audioRef.current
    if (!a || !canSeek) return
    const next = Math.max(0, Math.min(duration, sec))
    a.currentTime = next
    setPos(next)
  }

  const seekFromPointer = (e) => {
    const el = trackElRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    seekTo(((e.clientX - r.left) / r.width) * duration)
  }

  const onTrackKey = (e) => {
    if (e.key === 'ArrowLeft') seekTo(pos - SEEK_STEP)
    else if (e.key === 'ArrowRight') seekTo(pos + SEEK_STEP)
    else return
    e.preventDefault()
  }

  // Пробел — пауза/продолжить, Esc — пауза. На кнопках пробел и так жмёт
  // кнопку, второй раз его не обрабатываем.
  const onKey = (e) => {
    if (e.target.closest?.('button, input, [role="slider"]')) return
    if (e.key === ' ') {
      e.preventDefault()
      onPlayClick()
    } else if (e.key === 'Escape' && phase === 'run') {
      pause()
    }
  }

  useEffect(() => {
    liveRef.current = { tick, finish, key: onKey }
  })
  useEffect(() => {
    const h = (e) => liveRef.current.key?.(e)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  useEffect(() => {
    if (phase === 'paused') goRef.current?.focus()
  }, [phase])

  // Портал — только в браузере; на сервере этот экран не рисуется вовсе (он
  // открывается кликом), но страховка дешевле падения сборки.
  if (typeof document === 'undefined') return null

  // ── Сцена ────────────────────────────────────────────────────────────────
  const scene = (() => {
    if (failed) return <div className="kk-play__msg">{t('karaoke.brokenTrack')}</div>
    if (!doc) return <div className="kk-play__msg">{t('practice.loading')}</div>
    if (phase === 'scoring') return <div className="kk-play__msg">{t('karaoke.scoring')}</div>
    return <Lyrics lines={lines} pos={pos} />
  })()

  const pct = duration ? `${(Math.min(pos, duration) / duration) * 100}%` : '0%'
  const inLine = lineAt(lines, pos) >= 0
  const status = (() => {
    if (!micOn) return { text: t('karaoke.st.noMic'), tone: 'mute' }
    if (phase === 'calibrating') return { text: t('karaoke.st.calibrating'), tone: 'mute' }
    if (phase === 'scoring') return { text: t('karaoke.scoring'), tone: 'mute' }
    if (phase === 'run' || phase === 'paused') {
      if (!inLine) return { text: t('karaoke.st.break'), tone: 'mute' }
      return voiced ? { text: t('karaoke.st.inRhythm'), tone: 'ok' } : { text: t('karaoke.st.singAlong'), tone: 'mute' }
    }
    return { text: t('karaoke.st.ready'), tone: 'mute' }
  })()
  const live = phase === 'run' || phase === 'paused'
  const showPrivacy = phase === 'ready' && micOn && !note && doc && !failed

  const passed = linesPassed(lines, pos)
  const pauseMeta = `${t(`karaoke.pause.sung.${pluralForm(passed, lang)}`, { n: passed, total: lines.length })} · ${t(
    'karaoke.pause.time',
    { at: fmtTime(pos), dur: fmtTime(duration) },
  )}`

  return createPortal(
    <div className="kk-play" data-phase={phase}>
      <span className="kk-play__glow kk-play__glow--violet" aria-hidden="true" />
      <span className="kk-play__glow kk-play__glow--orange" aria-hidden="true" />
      <span className="kk-play__glow kk-play__glow--pink" aria-hidden="true" />
      {doc && <audio ref={audioRef} src={src} preload="auto" onEnded={callFinish} onLoadedMetadata={onMeta} />}

      <header className="kk-top">
        <button type="button" className="kk-pill kk-top__exit" onClick={onExitClick} disabled={phase === 'scoring'}>
          <CloseIco size={20} />
          {t('karaoke.exit')}
        </button>
        <div className="kk-top__song">
          {track.coverUrl ? (
            <img className="kk-top__cover" src={track.coverUrl} alt="" />
          ) : (
            <span className="kk-top__cover kk-top__cover--blank" aria-hidden="true">♪</span>
          )}
          <span className="kk-top__meta">
            <span className="kk-top__title">{track.title}</span>
            {track.artist && <span className="kk-top__artist">{track.artist}</span>}
          </span>
        </div>
        {track.instrumentalUrl && (
          <button
            type="button"
            role="switch"
            aria-checked={instrumental}
            className="kk-pill kk-top__minus"
            onClick={toggleInstrumental}
            disabled={phase === 'scoring' || phase === 'calibrating'}
          >
            <b>{t('karaoke.minus')}</b>
            <span className="kk-top__minusSub">{t('karaoke.minusShort')}</span>
            <span className="kk-sw" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={micOn}
          className="kk-pill kk-top__mic"
          onClick={() => {
            setNote('')
            setMicOn((v) => !v)
          }}
          disabled={phase !== 'ready' || Boolean(range)}
          // Имя — явно: на телефоне подпись скрыта, и без него экранный
          // диктор читал бы подсказку из title.
          aria-label={t('karaoke.mic')}
          title={micOn ? t('karaoke.micOffHint') : t('karaoke.micOnHint')}
        >
          <span className="kk-top__dot" aria-hidden="true" />
          <MicIco size={16} />
          <span className="kk-top__micLabel">{t('karaoke.mic')}</span>
        </button>
      </header>

      <main className="kk-stage">
        {scene}
        {(showPrivacy || note) && (
          <p className={note ? 'kk-stage__note kk-stage__note--error' : 'kk-stage__note'}>{note || t('karaoke.privacy')}</p>
        )}
      </main>

      <footer className="kk-ctl">
        <div className="kk-tl">
          <span className="kk-tl__now">{fmtTime(pos)}</span>
          <div
            ref={trackElRef}
            className="kk-tl__track"
            role="slider"
            tabIndex={canSeek ? 0 : -1}
            aria-label={t('karaoke.seek')}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(pos)}
            aria-valuetext={fmtTime(pos)}
            aria-disabled={!canSeek}
            onPointerDown={(e) => {
              if (!canSeek) return
              e.currentTarget.setPointerCapture?.(e.pointerId)
              seekFromPointer(e)
            }}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture?.(e.pointerId)) seekFromPointer(e)
            }}
            onKeyDown={onTrackKey}
          >
            <span className="kk-tl__fill" style={{ width: pct }} />
            <span className="kk-tl__thumb" style={{ left: pct }} />
          </div>
          <span className="kk-tl__end">{fmtTime(duration)}</span>
        </div>

        <div className="kk-ctl__row">
          <div className="kk-ctl__left">
            <div className={`kk-live kk-live--${status.tone}`} aria-live="polite">
              <MicIco size={18} />
              {micOn && (
                <span className="kk-live__bars" aria-hidden="true">
                  {(live ? bars : IDLE_BARS).map((b, i) => (
                    <i key={i} style={{ height: b.h }} className={b.on ? 'is-on' : ''} />
                  ))}
                </span>
              )}
              <span className="kk-live__text">{status.text}</span>
            </div>
          </div>

          <div className="kk-ctl__center">
            <button
              type="button"
              className="kk-round"
              onClick={() => seekTo(pos - SEEK_STEP)}
              disabled={!canSeek}
              aria-label={t('karaoke.back5')}
            >
              <Replay5Ico size={22} />
            </button>
            <button
              type="button"
              className="kk-main"
              onClick={onPlayClick}
              disabled={!doc || failed || phase === 'calibrating' || phase === 'scoring'}
              aria-label={phase === 'run' ? t('karaoke.pauseBtn') : t('karaoke.playBtn')}
            >
              {phase === 'run' || phase === 'calibrating' ? (
                <span className="kk-main__pause" aria-hidden="true">
                  <i />
                  <i />
                </span>
              ) : (
                <svg className="kk-main__play" width="24" height="26" viewBox="0 0 24 26" aria-hidden="true">
                  <path d="M3 2.6v20.8c0 1.2 1.3 1.9 2.3 1.3l16.4-10.4a1.5 1.5 0 000-2.6L5.3 1.3C4.3.7 3 1.4 3 2.6z" fill="currentColor" />
                </svg>
              )}
            </button>
            <button
              type="button"
              className="kk-round"
              onClick={() => seekTo(pos + SEEK_STEP)}
              disabled={!canSeek}
              aria-label={t('karaoke.fwd5')}
            >
              <Forward5Ico size={22} />
            </button>
          </div>

          <div className="kk-ctl__right">
            <button type="button" className="kk-finish" onClick={callFinish} disabled={!live}>
              {t('karaoke.finish')}
            </button>
          </div>
        </div>
      </footer>

      {phase === 'paused' && (
        <div className="kk-pause" role="dialog" aria-modal="true" aria-labelledby="kk-pause-title">
          <div className="kk-pause__card">
            <span className="kk-pause__icon" aria-hidden="true">
              <i />
              <i />
            </span>
            <h2 id="kk-pause-title" className="kk-pause__title">
              {t('karaoke.pause.title')}
            </h2>
            <p className="kk-pause__meta">{pauseMeta}</p>
            <div className="kk-pause__bar" aria-hidden="true">
              <span style={{ width: pct }} />
            </div>
            {track.instrumentalUrl && (
              <button type="button" role="switch" aria-checked={instrumental} className="kk-pause__minus" onClick={toggleInstrumental}>
                <span className="kk-pause__minusText">
                  <b>{t('karaoke.minus')}</b>
                  <span>{t('karaoke.minusLong')}</span>
                </span>
                <span className="kk-sw kk-sw--light" aria-hidden="true" />
              </button>
            )}
            <div className="kk-pause__btns">
              <button ref={goRef} type="button" className="kk-pause__go" onClick={resume}>
                <PlayCircleIco size={22} />
                {t('karaoke.pause.resume')}
              </button>
              <button type="button" className="kk-pause__again" onClick={restart}>
                <ReplayIco size={18} />
                {t('karaoke.pause.restart')}
              </button>
              <button type="button" className="kk-pause__quit" onClick={quit}>
                {range ? t('karaoke.pause.quitLine') : t('karaoke.pause.quit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}

// ── Текст песни ─────────────────────────────────────────────────────────────

/**
 * Пять строк: две позади, текущая крупно, две впереди. Текущая — пословно:
 * спетые слова белые, звучащее — сиреневое, впереди — приглушённые. Под ней
 * полоса того, сколько строки уже пропето.
 */
function Lyrics({ lines, pos }) {
  const idx = focusLineIndex(lines, pos)
  if (idx < 0) return null
  const cur = lines[idx]
  const words = wordTimes(cur)
  const active = activeWordIndex(words, cur, pos)
  const span = cur.end - cur.start
  const p = span > 0 ? Math.max(0, Math.min(1, (pos - cur.start) / span)) : 0
  const at = (i) => (i >= 0 && i < lines.length ? lines[i].text : '')

  return (
    <div className="kk-lyr">
      <p className="kk-lyr__l kk-lyr__l--p2">{at(idx - 2)}</p>
      <p className="kk-lyr__l kk-lyr__l--p1">{at(idx - 1)}</p>
      <p key={cur.id} className="kk-lyr__cur">
        {words.map((w, i) => (
          <span key={i} className={i < active ? 'is-sung' : i === active ? 'is-now' : undefined}>
            {w.w}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </p>
      <div className="kk-lyr__bar" aria-hidden="true">
        <span style={{ width: `${p * 100}%` }} />
      </div>
      <p className="kk-lyr__l kk-lyr__l--n1">{at(idx + 1)}</p>
      <p className="kk-lyr__l kk-lyr__l--n2">{at(idx + 2)}</p>
    </div>
  )
}
