'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { useRecorder } from '../ielts/speaking/useRecorder.js'
import { MAX_SECONDS, MIN_SECONDS, PREP_SECONDS, pickTopic } from './speakingTopics.js'
import { assessSpeaking } from './api.js'

// Говорение теста уровня — окно поверх теста v16 (тест зовёт его крючком Speaking Buddy, см. bridge.js). Ход как у
// SpeakSpin (решение 14.10.2026): тема по уровню, минута подготовки, запись до трёх минут, оценка Azure + Sonnet.
//
// Окно отвечает тесту одним из двух: done(результат) — v16 примет уровень говорения, skip() — ученик отказался
// (микрофона нет, не хочет). На skip тест помечает говорение «не оценено» и сам окно больше не зовёт.

const fmt = (sec) => {
  const s = Math.max(0, Math.ceil(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function SpeakingTask({ token, args, onDone, onSkip }) {
  const { t, lang } = useI18n()
  const measured = { grammar: args?.grammarLevel || null, reading: args?.readingLevel || null, listening: args?.listeningLevel || null }
  const [topic] = useState(() => pickTopic([measured.grammar, measured.reading, measured.listening], Math.random()))
  const [phase, setPhase] = useState('intro') // intro | prep | recording | assessing | result | retry
  const [left, setLeft] = useState(PREP_SECONDS)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const rec = useRecorder()
  const timer = useRef(null)
  // Пропуск посреди записи останавливает рекордер, и его onDone всё равно придёт: без отметки запись ушла бы на платную
  // оценку уже после того, как ученик от неё отказался.
  const skipped = useRef(false)

  useEffect(() => () => clearInterval(timer.current), [])

  const startPrep = () => {
    setPhase('prep')
    setLeft(PREP_SECONDS)
    const t0 = Date.now()
    clearInterval(timer.current)
    timer.current = setInterval(() => {
      const rest = PREP_SECONDS - (Date.now() - t0) / 1000
      setLeft(rest)
      if (rest <= 0) {
        clearInterval(timer.current)
        startRecording()
      }
    }, 250)
  }

  const send = async (take) => {
    if (skipped.current) return
    if (!take?.wav) {
      setError(t('placement.speaking.err.failed'))
      setPhase('retry')
      return
    }
    if (take.durationSec < MIN_SECONDS) {
      setError(t('placement.speaking.err.short', { n: String(MIN_SECONDS) }))
      setPhase('retry')
      return
    }
    setPhase('assessing')
    try {
      const r = await assessSpeaking(token, take.wav, { topicId: topic.id, lang, measured })
      if (r.status !== 'completed') {
        setError(t('placement.speaking.err.short', { n: String(MIN_SECONDS) }))
        setPhase('retry')
        return
      }
      setResult(r)
      setPhase('result')
    } catch (e) {
      const key = e?.code === 'daily_limit_reached' ? 'limit' : e?.code === 'not_configured' ? 'off' : 'failed'
      setError(t(`placement.speaking.err.${key}`))
      setPhase('retry')
    }
  }

  async function startRecording() {
    clearInterval(timer.current)
    setError('')
    const ok = await rec.start({ maxSec: MAX_SECONDS, onDone: send })
    if (ok) setPhase('recording')
    else {
      setError(t(rec.error === 'denied' ? 'placement.speaking.err.mic' : 'placement.speaking.err.failed'))
      setPhase('retry')
    }
  }

  return (
    <div className="pl-speak" role="dialog" aria-modal="true" aria-labelledby="pl-speak-title">
      <div className="pl-speak__card">
        <span className="pl-speak__eyebrow">{t('placement.speaking.eyebrow')}</span>
        <h2 id="pl-speak-title" className="pl-speak__topic" lang="en">
          {topic.prompt}
        </h2>
        {phase !== 'result' && (
          <ul className="pl-speak__hints" lang="en">
            {topic.hints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}

        {phase === 'intro' && (
          <>
            <p className="pl-speak__text">
              {t('placement.speaking.intro', { prep: String(PREP_SECONDS), max: String(MAX_SECONDS / 60) })}
            </p>
            <div className="pl-speak__actions">
              <button type="button" className="pl-btn pl-btn--main" onClick={startPrep}>
                {t('placement.speaking.prep')}
              </button>
            </div>
          </>
        )}

        {phase === 'prep' && (
          <>
            <p className="pl-speak__clock" aria-live="polite">
              {t('placement.speaking.prepLeft')} <b>{fmt(left)}</b>
            </p>
            <div className="pl-speak__actions">
              <button type="button" className="pl-btn pl-btn--main" onClick={startRecording}>
                {t('placement.speaking.recordNow')}
              </button>
            </div>
          </>
        )}

        {phase === 'recording' && (
          <>
            <p className="pl-speak__clock pl-speak__clock--rec" aria-live="polite">
              <i className="pl-speak__dot" aria-hidden="true" />
              {fmt(rec.elapsed)} / {fmt(MAX_SECONDS)}
            </p>
            <div className="pl-speak__actions">
              <button type="button" className="pl-btn pl-btn--main" onClick={rec.stop} disabled={rec.state !== 'recording'}>
                {t('placement.speaking.stop')}
              </button>
            </div>
          </>
        )}

        {phase === 'assessing' && (
          <p className="pl-speak__text" aria-live="polite">
            {t('placement.speaking.assessing')}
          </p>
        )}

        {phase === 'retry' && (
          <>
            <p className="pl-speak__error" role="alert">
              {error}
            </p>
            <div className="pl-speak__actions">
              <button type="button" className="pl-btn pl-btn--main" onClick={startRecording}>
                {t('placement.speaking.again')}
              </button>
            </div>
          </>
        )}

        {phase === 'result' && result && (
          <>
            <div className="pl-speak__level">
              <span>{t('placement.speaking.level')}</span>
              <b>{result.speaking_level}</b>
            </div>
            {result.summary && <p className="pl-speak__text">{result.summary}</p>}
            <div className="pl-speak__actions">
              <button type="button" className="pl-btn pl-btn--main" onClick={() => onDone(result)}>
                {t('placement.speaking.back')}
              </button>
            </div>
          </>
        )}

        {phase !== 'result' && phase !== 'assessing' && (
          <button type="button" className="pl-speak__skip" onClick={() => { skipped.current = true; clearInterval(timer.current); rec.stop(); onSkip() }}>
            {t('placement.speaking.skip')}
          </button>
        )}
      </div>
    </div>
  )
}
