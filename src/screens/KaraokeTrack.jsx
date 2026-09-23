'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { ChevronLeftIcon } from '../components/icons.jsx'
import { useI18n } from '../i18n.jsx'
import { saveWord } from '../api.js'
import { loadLyrics, trackProgress, saveKaraokeResult } from '../practice/karaoke/karaokeData.js'
import { sungSeconds, fullText } from '../practice/karaoke/karaokeShape.js'
import {
  referenceMask,
  rhythmScore,
  coverageScore,
  lyricsScore,
  paceScore,
  syllablesIn,
  finalScore,
  weakestLines,
} from '../practice/karaoke/scoring.js'
import {
  isMicSupported,
  requestMic,
  stopStream,
  startTake,
  transcribeTake,
  unlockPlayback,
  createAudioContext,
} from '../practice/karaoke/mic.js'

// Экран одного караоке-трека: карточка → режим → результат.
//
// Режим один — Full Karaoke (цельное исполнение с оценкой). Warm-up (лексика
// по словарю трека) был, но его убрали 23.09.2026 по решению продукта.
// Остальные пять из ТЗ данными уже обеспечены (hotspots/gaps/focus лежат в той
// же разметке), но экранов у них пока нет.
//
// Почему один компонент, а не экран на режим: у всех стадий общие подсветка
// строк, аудио-элемент и разметка, и держать их в одном месте дешевле, чем
// прокидывать через props в три стороны.

const STAGE = { OVERVIEW: 'overview', SING: 'sing', RESULT: 'result' }

function fmtTime(sec) {
  if (!Number.isFinite(sec)) return '0:00'
  const s = Math.floor(Math.abs(sec) % 60)
  const m = Math.floor(Math.abs(sec) / 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Строка, звучащая в момент `t`. Возвращает индекс или -1 (пауза). */
function lineAt(lines, t) {
  for (let i = 0; i < lines.length; i++) {
    if (t < lines[i].start) return -1
    if (t <= lines[i].end) return i
  }
  return -1
}

/** Ближайшая следующая строка — её показываем приглушённой в паузе. */
function nextLineIndex(lines, t) {
  for (let i = 0; i < lines.length; i++) if (lines[i].start > t) return i
  return -1
}

export default function KaraokeTrack({ track, token, onBack, onWordSaved }) {
  const { t, lang } = useI18n()
  const [doc, setDoc] = useState(null)
  const [failed, setFailed] = useState(false)
  const [stage, setStage] = useState(STAGE.OVERVIEW)
  const [progress, setProgress] = useState(() => ({ stars: 0, best: {}, attempts: 0 }))

  useEffect(() => {
    let alive = true
    loadLyrics(track, token).then((d) => {
      if (!alive) return
      if (d) setDoc(d)
      else setFailed(true)
    })
    return () => {
      alive = false
    }
  }, [track, token])

  // Прогресс читаем в эффекте, а не в useState: localStorage на сервере нет, и
  // инициализатор состояния сорвал бы гидратацию.
  useEffect(() => setProgress(trackProgress(track.slug)), [track.slug])

  const bar = (
    <div className="kk__bar">
      <button type="button" className="kk__back" onClick={onBack}>
        <ChevronLeftIcon size={18} />
        {t('common.back')}
      </button>
      <div className="kk__barTitle">
        {track.title}
        {track.artist && <span className="kk__barArtist">{track.artist}</span>}
      </div>
    </div>
  )

  if (failed) {
    return (
      <div className="kk">
        {bar}
        <div className="kk__empty">{t('karaoke.brokenTrack')}</div>
      </div>
    )
  }
  if (!doc) {
    return (
      <div className="kk">
        {bar}
        <div className="kk__empty">{t('practice.loading')}</div>
      </div>
    )
  }

  return (
    <div className="kk">
      {bar}
      {stage === STAGE.OVERVIEW && (
        <Overview
          track={track}
          doc={doc}
          progress={progress}
          onSing={() => setStage(STAGE.SING)}
        />
      )}
      {stage === STAGE.SING && (
        <Sing
          track={track}
          doc={doc}
          token={token}
          onWordSaved={onWordSaved}
          onExit={() => setStage(STAGE.OVERVIEW)}
          onScored={(res) => {
            setProgress(saveKaraokeResult(track.slug, res))
          }}
        />
      )}
    </div>
  )
}

// ── Карточка трека ──────────────────────────────────────────────────────────

function Stars({ n }) {
  return (
    <span className="kk__stars" aria-label={`${n} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= n ? 'kk__star kk__star--on' : 'kk__star'}>
          ★
        </span>
      ))}
    </span>
  )
}

function Overview({ track, doc, progress, onSing }) {
  const { t } = useI18n()
  return (
    <div className="kk__overview">
      <div className="kk__head">
        {track.coverUrl ? (
          <img className="kk__cover" src={track.coverUrl} alt="" />
        ) : (
          <div className="kk__cover kk__cover--blank">♪</div>
        )}
        <div className="kk__headMeta">
          <h1 className="kk__title">{track.title}</h1>
          {track.artist && <div className="kk__artist">{track.artist}</div>}
          <div className="kk__facts">
            {track.level && <span className="kk__badge">{track.level}</span>}
            <span className="kk__fact">{t('karaoke.lines', { n: doc.lines.length })}</span>
            {track.bpm ? <span className="kk__fact">{track.bpm} BPM</span> : null}
            <span className="kk__fact">{fmtTime(doc.duration)}</span>
          </div>
          {track.tags.length > 0 && (
            <div className="kk__tags">
              {track.tags.map((tag) => (
                <span key={tag} className="kk__tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <Stars n={progress.stars} />
        </div>
      </div>

      <div className="kk__modes">
        <button type="button" className="kk__mode" onClick={onSing}>
          <span className="kk__modeIcon">🎤</span>
          <span className="kk__modeBody">
            <span className="kk__modeName">{t('karaoke.full')}</span>
            <span className="kk__modeDesc">{t('karaoke.fullDesc')}</span>
          </span>
          <span className="kk__modeState">
            {progress.best.full ? t('karaoke.best', { n: progress.best.full }) : ''}
          </span>
        </button>
      </div>

      <p className="kk__privacy">{t('karaoke.privacy')}</p>
    </div>
  )
}

// ── Full Karaoke ────────────────────────────────────────────────────────────

function Sing({ track, doc, token, onExit, onScored, onWordSaved }) {
  const { t } = useI18n()
  // 'setup' — выбор фонограммы и разрешение микрофона; 'run' — поём;
  // 'scoring' — считаем (STT занимает несколько секунд); 'result' — итог.
  const [phase, setPhase] = useState('setup')
  const [useInstrumental, setUseInstrumental] = useState(false)
  const [noScore, setNoScore] = useState(false) // режим урока: без микрофона
  const [micError, setMicError] = useState('')
  const [pos, setPos] = useState(0)
  const [level, setLevel] = useState(0)
  const [result, setResult] = useState(null)

  const audioRef = useRef(null)
  const streamRef = useRef(null)
  const takeRef = useRef(null)
  const rafRef = useRef(0)

  const lines = doc.lines
  const src = useInstrumental && track.instrumentalUrl ? track.instrumentalUrl : track.audioUrl

  // Позиция трека — единственные часы всего экрана: и подсветка, и маска VAD
  // берут её отсюда. Стенные часы разъехались бы с музыкой на первой же
  // паузе буферизации.
  const positionSec = useCallback(() => audioRef.current?.currentTime || 0, [])

  const stopAll = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    audioRef.current?.pause()
    if (streamRef.current) {
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [])

  useEffect(() => stopAll, [stopAll])

  const finish = useCallback(async () => {
    cancelAnimationFrame(rafRef.current)
    audioRef.current?.pause()
    const take = takeRef.current
    takeRef.current = null
    if (!take) {
      // Режим урока: оценки нет, просто возвращаемся к карточке.
      stopAll()
      onExit()
      return
    }
    setPhase('scoring')
    const { mask, sungSec, blob } = await take.stop()
    if (streamRef.current) {
      stopStream(streamRef.current)
      streamRef.current = null
    }

    const ref = referenceMask(lines, doc.duration)
    const rhythm = rhythmScore(ref, mask)
    const { score: coverage, perLine } = coverageScore(lines, mask)
    const text = await transcribeTake(blob)
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
      instrumental: useInstrumental && Boolean(track.instrumentalUrl),
    })
    const weak = weakestLines(perLine, lines)
    const res = {
      score,
      medal,
      rhythm: Math.round(rhythm),
      coverage: Math.round(coverage),
      pace: Math.round(pace),
      lyrics: lyr ? Math.round(lyr.score) : null,
      missed: lyr ? lyr.missed.slice(0, 5) : [],
      weak,
      heard: text,
    }
    setResult(res)
    setPhase('result')
    onScored({ score, weakLines: weak.map((w) => w.id) })
  }, [doc, lines, onExit, onScored, stopAll, track.instrumentalUrl, useInstrumental])

  const start = async () => {
    setMicError('')
    const audio = audioRef.current
    if (!audio) return

    // Всё, что требует жеста, — здесь, до первого await. Дальше идёт запрос
    // разрешения на микрофон и полторы секунды калибровки, и к настоящему
    // play() жест уже не будет засчитан: в Safari трек просто не запускался, а
    // отказ уходил в пустой catch — экран честно показывал караоке, которое
    // стоит на нуле.
    unlockPlayback(audio)
    const ctx = noScore ? null : createAudioContext()

    if (!noScore) {
      if (!isMicSupported()) {
        setMicError(t('karaoke.micUnsupported'))
        ctx?.close?.().catch(() => {})
        return
      }
      try {
        streamRef.current = await requestMic()
      } catch {
        setMicError(t('karaoke.micDenied'))
        ctx?.close?.().catch(() => {})
        return
      }
      // Калибровка фона идёт ДО первой ноты — стартуем трек только после неё,
      // иначе полторы секунды песни улетают в «тишину» и портят и маску, и
      // порог.
      takeRef.current = await startTake({
        stream: streamRef.current,
        durationSec: doc.duration,
        positionSec,
        ctx,
      })
    }
    setPhase('run')
    audio.currentTime = 0
    // Отказ здесь больше не должен случаться, но если случился — говорим об
    // этом, а не оставляем человека смотреть на неподвижный экран.
    const playing = await audio.play().then(() => true).catch(() => false)
    if (!playing) {
      // Дубль уже идёт: у него свой таймер и свой MediaRecorder, и бросить
      // ссылку недостаточно — останавливаем по-настоящему, результат не нужен.
      const take = takeRef.current
      takeRef.current = null
      take?.stop().catch(() => {})
      stopAll()
      setMicError(t('karaoke.playbackBlocked'))
      setPhase('setup')
      return
    }
    const tick = () => {
      const a = audioRef.current
      if (!a) return
      setPos(a.currentTime)
      if (takeRef.current) setLevel(takeRef.current.level())
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  // Экран результата
  if (phase === 'result' && result) {
    return (
      <Result
        result={result}
        doc={doc}
        token={token}
        onWordSaved={onWordSaved}
        onAgain={() => {
          setResult(null)
          setPos(0)
          setPhase('setup')
        }}
        onBack={onExit}
      />
    )
  }

  if (phase === 'scoring') {
    return <div className="kk__empty">{t('karaoke.scoring')}</div>
  }

  if (phase === 'setup') {
    return (
      <div className="kk__setup">
        <audio ref={audioRef} src={src} preload="auto" />
        <h2 className="kk__setupTitle">{t('karaoke.full')}</h2>

        {track.instrumentalUrl && (
          <div className="kk__choice">
            <button
              type="button"
              className={!useInstrumental ? 'kk__choiceBtn kk__choiceBtn--on' : 'kk__choiceBtn'}
              onClick={() => setUseInstrumental(false)}
            >
              {t('karaoke.withVocal')}
            </button>
            <button
              type="button"
              className={useInstrumental ? 'kk__choiceBtn kk__choiceBtn--on' : 'kk__choiceBtn'}
              onClick={() => setUseInstrumental(true)}
            >
              {t('karaoke.instrumental')}
            </button>
          </div>
        )}

        <label className="kk__toggle">
          <input type="checkbox" checked={noScore} onChange={(e) => setNoScore(e.target.checked)} />
          <span>{t('karaoke.noScore')}</span>
        </label>

        <p className="kk__privacy">{noScore ? t('karaoke.noScoreHint') : t('karaoke.privacy')}</p>
        {micError && <p className="kk__error">{micError}</p>}

        <button type="button" className="kk__start" onClick={start}>
          {noScore ? t('karaoke.startNoMic') : t('karaoke.start')}
        </button>
        <button type="button" className="kk__ghost" onClick={onExit}>
          {t('karaoke.exit')}
        </button>
      </div>
    )
  }

  // Исполнение
  const idx = lineAt(lines, pos)
  const nextIdx = idx >= 0 ? Math.min(idx + 1, lines.length - 1) : nextLineIndex(lines, pos)
  const cur = idx >= 0 ? lines[idx] : null
  const prev = idx > 0 ? lines[idx - 1] : null
  const next = nextIdx >= 0 && nextIdx !== idx ? lines[nextIdx] : null
  const countdown = !cur && next ? Math.max(0, next.start - pos) : 0

  return (
    <div className="kk__stage">
      <audio ref={audioRef} src={src} preload="auto" onEnded={finish} />

      <div className="kk__timeline" aria-hidden="true">
        <div className="kk__timelineFill" style={{ width: `${(pos / doc.duration) * 100}%` }} />
        {lines.map((l) => (
          <span key={l.id} className="kk__tick" style={{ left: `${(l.start / doc.duration) * 100}%` }} />
        ))}
      </div>
      <div className="kk__clock">
        {fmtTime(pos)} / {fmtTime(doc.duration)}
      </div>

      <div className="kk__lyrics">
        <div className="kk__line kk__line--prev">{prev?.text || ''}</div>
        <div className="kk__line kk__line--cur">
          {cur ? <LineText line={cur} pos={pos} /> : countdown > 0 ? '· · ·' : ''}
        </div>
        <div className="kk__line kk__line--next">{next?.text || ''}</div>
      </div>

      <div className="kk__controls">
        {!noScore && (
          <div className="kk__mic" aria-label={t('karaoke.micLevel')}>
            <div className="kk__micFill" style={{ width: `${Math.round(level * 100)}%` }} />
          </div>
        )}
        <button type="button" className="kk__ghost" onClick={finish}>
          {noScore ? t('karaoke.exit') : t('karaoke.finish')}
        </button>
      </div>
    </div>
  )
}

/** Текущая строка с подсветкой: пословно, если есть таймкоды слов. */
function LineText({ line, pos }) {
  if (!line.words.length) {
    // Без пословных таймкодов — заливка строки слева направо по её длине.
    const p = Math.max(0, Math.min(1, (pos - line.start) / (line.end - line.start)))
    return (
      <span
        className="kk__fill"
        style={{ backgroundSize: `${p * 100}% 100%` }}
      >
        {line.text}
      </span>
    )
  }
  return (
    <>
      {line.words.map((w, i) => (
        <span key={`${w.w}-${i}`} className={pos >= w.t ? 'kk__w kk__w--on' : 'kk__w'}>
          {w.w}{' '}
        </span>
      ))}
    </>
  )
}

// ── Результат ───────────────────────────────────────────────────────────────

function Metric({ label, value, hint }) {
  if (value == null) return null
  return (
    <div className="kk__metric">
      <div className="kk__metricTop">
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <div className="kk__metricBar">
        <div className="kk__metricFill" style={{ width: `${value}%` }} />
      </div>
      <div className="kk__metricHint">{hint}</div>
    </div>
  )
}

function Result({ result, doc, token, onWordSaved, onAgain, onBack }) {
  const { t, lang } = useI18n()
  const [saved, setSaved] = useState(() => new Set())
  const byId = useMemo(() => new Map(doc.lines.map((l) => [l.id, l])), [doc])

  // Каждая метрика — с фразой, что она значит: голый процент студенту ничего
  // не говорит, и ТЗ прямо это запрещает (раздел 8.3).
  const hint = (key, value) => t(`karaoke.hint.${key}.${value >= 75 ? 'good' : value >= 50 ? 'mid' : 'low'}`)

  const save = async (word) => {
    if (!token || saved.has(word)) return
    try {
      const rec = await saveWord(token, { word, language: lang === 'kk' ? 'kk' : 'ru', source: doc.slug })
      setSaved((s) => new Set(s).add(word))
      onWordSaved?.(rec)
    } catch {
      /* словарь недоступен — кнопка просто останется активной */
    }
  }

  return (
    <div className="kk__result">
      <div className={`kk__score kk__score--${result.medal || 'none'}`}>
        <div className="kk__scoreValue">{result.score}</div>
        <div className="kk__scoreMedal">
          {result.medal ? t(`karaoke.medal.${result.medal}`) : t('karaoke.medal.none')}
        </div>
      </div>

      {result.lyrics == null && <p className="kk__notice">{t('karaoke.noSttNotice')}</p>}

      <div className="kk__metrics">
        <Metric label={t('karaoke.m.lyrics')} value={result.lyrics} hint={hint('lyrics', result.lyrics ?? 0)} />
        <Metric label={t('karaoke.m.rhythm')} value={result.rhythm} hint={hint('rhythm', result.rhythm)} />
        <Metric label={t('karaoke.m.coverage')} value={result.coverage} hint={hint('coverage', result.coverage)} />
        <Metric label={t('karaoke.m.pace')} value={result.pace} hint={hint('pace', result.pace)} />
      </div>

      {result.weak.length > 0 && (
        <div className="kk__weak">
          <h3>{t('karaoke.weakLines')}</h3>
          {result.weak.map((w) => (
            <div key={w.id} className="kk__weakLine">
              <span>{byId.get(w.id)?.text || w.text}</span>
              <b>{Math.round(w.ratio * 100)}%</b>
            </div>
          ))}
        </div>
      )}

      {result.missed.length > 0 && (
        <div className="kk__missed">
          <h3>{t('karaoke.missedWords')}</h3>
          <div className="kk__missedList">
            {result.missed.map((w) => (
              <button
                key={w}
                type="button"
                className={saved.has(w) ? 'kk__chip kk__chip--saved' : 'kk__chip'}
                onClick={() => save(w)}
                disabled={saved.has(w)}
              >
                {w} {saved.has(w) ? '✓' : '+'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="kk__resultBtns">
        <button type="button" className="kk__start" onClick={onAgain}>
          {t('karaoke.again')}
        </button>
        <button type="button" className="kk__ghost" onClick={onBack}>
          {t('karaoke.toTrack')}
        </button>
      </div>
    </div>
  )
}
