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
//
// Своего итога у окна НЕТ: оценка пришла — окно сразу отдаёт её тесту и закрывается, а тест открывает результаты.
// Раньше здесь показывались уровень и отзыв с кнопкой «Вернуться к тесту» — отзыв выходил раньше результатов
// остальных навыков, а минута оценки без единой кнопки выглядела зависанием (жалоба 16.10.2026). Отзыв теперь в
// итоге вместе со всеми (speakingFeedback.js), а ожидание прямо говорит, что нажимать ничего не нужно.

// Полосы «идёт запись» — высоты из макета; анимацию задаёт CSS (качаются, пока идёт запись).
const WAVE = [16, 28, 40, 24, 48, 32, 20, 44, 36, 24, 52, 28, 16, 40, 32, 48, 24, 36, 20, 44]

const fmt = (sec) => {
  const s = Math.max(0, Math.ceil(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function SpeakingTask({ token, args, onDone, onSkip }) {
  const { t, lang } = useI18n()
  const measured = { grammar: args?.grammarLevel || null, reading: args?.readingLevel || null, listening: args?.listeningLevel || null }
  const [topic] = useState(() => pickTopic([measured.grammar, measured.reading, measured.listening], Math.random()))
  const [phase, setPhase] = useState('intro') // intro | prep | recording | assessing | retry
  const [left, setLeft] = useState(PREP_SECONDS)
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
      onDone(r)
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

  // Макет «3 · Тест уровня», кадры Speaking: Speaking Buddy сверху (своя поза на каждую фазу), чип «Тема» и тема,
  // ниже — фаза. Подсказки темы макет не показывает: тема одна строкой, остальное ученик говорит сам.
  const pose = phase === 'retry' ? 'error' : phase === 'intro' ? 'topic' : phase
  const skip = () => {
    skipped.current = true
    clearInterval(timer.current)
    rec.stop()
    onSkip()
  }
  const skipButton = (
    <button type="button" className="pl-speak__skip" onClick={skip}>
      {t('placement.speaking.skip')}
    </button>
  )

  return (
    <div className="pl-speak" role="dialog" aria-modal="true" aria-labelledby="pl-speak-title">
      <div className={`pl-speak__card pl-speak__card--${phase}`}>
        <img className="pl-speak__buddy" src={`/placement/v16/skin/buddy-${pose}.webp`} alt="" width="160" height="160" />

        {phase !== 'assessing' && phase !== 'retry' && (
          <div className="pl-speak__head">
            <span className="pl-speak__eyebrow">{t('placement.speaking.topicChip')}</span>
            <h2 id="pl-speak-title" className="pl-speak__topic" lang="en">
              {topic.prompt}
            </h2>
          </div>
        )}

        {phase === 'intro' && (
          <>
            <p className="pl-speak__text">{t('placement.speaking.intro', { prep: String(PREP_SECONDS) })}</p>
            <div className="pl-speak__actions">
              <button type="button" className="pl-btn pl-btn--main" onClick={startPrep}>
                {t('placement.speaking.prep')}
              </button>
              {skipButton}
            </div>
          </>
        )}

        {phase === 'prep' && (
          <>
            <div className="pl-speak__timer" aria-live="polite">
              <span>{t('placement.speaking.prepLeft')}</span>
              <b>{fmt(left)}</b>
            </div>
            <div className="pl-speak__bar">
              <i style={{ width: `${Math.max(0, Math.min(100, (left / PREP_SECONDS) * 100))}%` }} />
            </div>
            <div className="pl-speak__actions">
              <button type="button" className="pl-btn pl-btn--main pl-btn--mic" onClick={startRecording}>
                {t('placement.speaking.recordNow')}
              </button>
              {skipButton}
            </div>
          </>
        )}

        {phase === 'recording' && (
          <>
            <p className="pl-speak__rec" aria-live="polite">
              <i className="pl-speak__dot" aria-hidden="true" />
              {t('placement.speaking.recording')}
            </p>
            <b className="pl-speak__clock">{fmt(rec.elapsed)}</b>
            <div className="pl-speak__wave" aria-hidden="true">
              {WAVE.map((h, i) => (
                <i key={i} style={{ height: h, animationDelay: `${(i % 7) * 0.12}s` }} />
              ))}
            </div>
            <div className="pl-speak__actions">
              <button type="button" className="pl-btn pl-btn--dark" onClick={rec.stop} disabled={rec.state !== 'recording'}>
                {t('placement.speaking.stop')}
              </button>
            </div>
          </>
        )}

        {phase === 'assessing' && (
          <div className="pl-speak__wait" role="status" aria-live="polite">
            <p id="pl-speak-title" className="pl-speak__waitTitle">
              {t('placement.speaking.assessing')}
            </p>
            <div className="pl-speak__bar pl-speak__bar--busy">
              <i />
            </div>
            <p className="pl-speak__waitHint">{t('placement.speaking.assessingHint')}</p>
          </div>
        )}

        {phase === 'retry' && (
          <>
            <p id="pl-speak-title" className={`pl-speak__error${rec.error === 'denied' ? ' pl-speak__error--mic' : ''}`} role="alert">
              {error}
            </p>
            <div className="pl-speak__actions">
              <button type="button" className="pl-btn pl-btn--main pl-btn--again" onClick={startRecording}>
                {t('placement.speaking.again')}
              </button>
              {skipButton}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
