'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { ChevronLeftIcon } from '../components/icons.jsx'
import { useI18n } from '../i18n.jsx'
import { saveWord } from '../api.js'
import { loadLyrics, trackProgress, saveWarmup, saveKaraokeResult } from '../practice/karaoke/karaokeData.js'
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
// Режимов в первой версии два — Warm-up (лексика, без микрофона) и Full Karaoke
// (цельное исполнение с оценкой). Остальные пять из ТЗ данными уже обеспечены
// (hotspots/gaps/focus лежат в той же разметке), но экранов у них пока нет.
//
// Почему один компонент, а не экран на режим: у всех стадий общие подсветка
// строк, аудио-элемент и разметка, и держать их в одном месте дешевле, чем
// прокидывать через props в три стороны.

const STAGE = { OVERVIEW: 'overview', WARMUP: 'warmup', SING: 'sing', RESULT: 'result' }

// Сколько слов берём в разогрев. ТЗ просит 8–10; если в словаре трека меньше —
// работаем с тем, что есть, а не прячем режим.
const WARMUP_LIMIT = 10

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

function shuffle(arr, seed = 1) {
  // Свой генератор, а не Math.random: порядок вариантов не должен меняться на
  // каждом ре-рендере, иначе кнопки прыгают под пальцем.
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function KaraokeTrack({ track, token, onBack, onWordSaved }) {
  const { t, lang } = useI18n()
  const [doc, setDoc] = useState(null)
  const [failed, setFailed] = useState(false)
  const [stage, setStage] = useState(STAGE.OVERVIEW)
  const [progress, setProgress] = useState(() => ({ stars: 0, best: {}, attempts: 0, warmupDone: false }))

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
          onWarmup={() => setStage(STAGE.WARMUP)}
          onSing={() => setStage(STAGE.SING)}
        />
      )}
      {stage === STAGE.WARMUP && (
        <Warmup
          track={track}
          doc={doc}
          onDone={() => {
            saveWarmup(track.slug)
            setProgress(trackProgress(track.slug))
            setStage(STAGE.OVERVIEW)
          }}
          onExit={() => setStage(STAGE.OVERVIEW)}
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

function Overview({ track, doc, progress, onWarmup, onSing }) {
  const { t } = useI18n()
  const hasVocab = doc.vocab.length > 0
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
        <button
          type="button"
          className="kk__mode"
          onClick={onWarmup}
          disabled={!hasVocab}
          title={hasVocab ? '' : t('karaoke.warmupUnavailable')}
        >
          <span className="kk__modeIcon">📖</span>
          <span className="kk__modeBody">
            <span className="kk__modeName">{t('karaoke.warmup')}</span>
            <span className="kk__modeDesc">
              {hasVocab ? t('karaoke.warmupDesc', { n: doc.vocab.length }) : t('karaoke.warmupUnavailable')}
            </span>
          </span>
          <span className="kk__modeState">{progress.warmupDone ? '✓' : ''}</span>
        </button>

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

// ── Warm-up ─────────────────────────────────────────────────────────────────

/**
 * Разогрев: три шага по ТЗ 7.1 — знакомство, сопоставление, выбор на слух.
 *
 * Третий шаг в ТЗ описан как «выбрать слово на слух из четырёх», но
 * отдельной озвучки слов у трека нет и синтезировать её ради разогрева
 * незачем: играем фрагмент строки из самой песни и спрашиваем, какое из
 * четырёх слов в ней прозвучало. Задача та же (аудирование), материал —
 * настоящая связная речь, и это ещё и бесплатно.
 */
function Warmup({ track, doc, onDone, onExit }) {
  const { t } = useI18n()
  const [step, setStep] = useState(0) // 0 — знакомство, 1 — пары, 2 — на слух
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(null)
  const audioRef = useRef(null)
  const stopAtRef = useRef(0)

  const words = useMemo(() => doc.vocab.slice(0, WARMUP_LIMIT), [doc])
  const byLine = useMemo(() => new Map(doc.lines.map((l) => [l.id, l])), [doc])

  // Фрагмент строки, в которой слово встретилось. Останавливаем по таймеру
  // rAF, а не по setTimeout: пауза должна попасть в конец строки, а не через
  // «примерно столько же» после старта.
  const playLine = useCallback((word) => {
    const line = byLine.get(word.line)
    const audio = audioRef.current
    if (!line || !audio) return
    audio.currentTime = Math.max(0, line.start - 0.15)
    stopAtRef.current = line.end + 0.1
    audio.play().catch(() => {})
    const tick = () => {
      if (!audioRef.current) return
      if (audioRef.current.currentTime >= stopAtRef.current) {
        audioRef.current.pause()
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [byLine])

  useEffect(() => () => audioRef.current?.pause(), [])

  const current = words[i]
  const options = useMemo(() => {
    if (!current) return []
    const others = words.filter((w) => w.w !== current.w)
    return shuffle([current, ...shuffle(others, i + 7).slice(0, 3)], i + 1)
  }, [current, words, i])

  const advance = () => {
    setPicked(null)
    if (i + 1 < words.length) {
      setI(i + 1)
      return
    }
    setI(0)
    if (step + 1 <= 2) setStep(step + 1)
    else onDone()
  }

  if (!current) return <div className="kk__empty">{t('karaoke.warmupUnavailable')}</div>

  const answerKey = step === 1 ? 'ru' : 'w'
  const correct = picked && picked.w === current.w

  return (
    <div className="kk__warm">
      <audio ref={audioRef} src={track.audioUrl} preload="auto" />
      <div className="kk__warmHead">
        <span className="kk__warmStep">{t(`karaoke.warmStep${step + 1}`)}</span>
        <span className="kk__warmCount">
          {i + 1} / {words.length}
        </span>
        <button type="button" className="kk__warmExit" onClick={onExit}>
          {t('karaoke.exit')}
        </button>
      </div>

      {step === 0 && (
        <div className="kk__card">
          <div className="kk__cardWord">{current.w}</div>
          {current.ru && <div className="kk__cardTr">{current.ru}</div>}
          {byLine.get(current.line) && (
            <>
              <div className="kk__cardLine">{byLine.get(current.line).text}</div>
              <button type="button" className="kk__listen" onClick={() => playLine(current)}>
                ▶ {t('karaoke.listenLine')}
              </button>
            </>
          )}
          <button type="button" className="kk__next" onClick={advance}>
            {t('karaoke.next')}
          </button>
        </div>
      )}

      {step > 0 && (
        <div className="kk__card">
          {step === 1 ? (
            <div className="kk__cardWord">{current.w}</div>
          ) : (
            <button type="button" className="kk__listen kk__listen--big" onClick={() => playLine(current)}>
              ▶ {t('karaoke.listenAgain')}
            </button>
          )}
          <div className="kk__opts">
            {options.map((o) => {
              const state = !picked ? '' : o.w === current.w ? ' kk__opt--ok' : o.w === picked.w ? ' kk__opt--bad' : ''
              return (
                <button
                  key={o.w}
                  type="button"
                  className={`kk__opt${state}`}
                  disabled={Boolean(picked)}
                  onClick={() => setPicked(o)}
                >
                  {o[answerKey] || o.w}
                </button>
              )
            })}
          </div>
          {picked && (
            <button type="button" className="kk__next" onClick={advance}>
              {correct ? t('karaoke.right') : t('karaoke.wrong')} — {t('karaoke.next')}
            </button>
          )}
        </div>
      )}
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
  const [showTranslation, setShowTranslation] = useState(false)
  const [translationUsed, setTranslationUsed] = useState(false)
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
      translationShown: translationUsed,
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
  }, [doc, lines, onExit, onScored, stopAll, track.instrumentalUrl, translationUsed, useInstrumental])

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
        {showTranslation && <div className="kk__lineRu">{cur?.ru || ''}</div>}
      </div>

      <div className="kk__controls">
        {!noScore && (
          <div className="kk__mic" aria-label={t('karaoke.micLevel')}>
            <div className="kk__micFill" style={{ width: `${Math.round(level * 100)}%` }} />
          </div>
        )}
        <button
          type="button"
          className="kk__ghost"
          onClick={() => {
            setShowTranslation((v) => !v)
            // Штраф ×0.95 ставим за сам факт подсматривания, поэтому флаг
            // одноразовый: выключить перевод обратно и «отменить» его нельзя.
            if (!showTranslation) setTranslationUsed(true)
          }}
          aria-pressed={showTranslation}
        >
          {showTranslation ? t('karaoke.hideTranslation') : t('karaoke.showTranslation')}
        </button>
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
