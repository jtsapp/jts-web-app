'use client'

// Результат оценки одной фразы: кольцо overall, баллы просодии/точности/беглости,
// послово-тепловая карта, совет Claude, пометка mock. Данные — из assessTake.
// Чистый презентационный компонент; логику/сеть держит экран.

import { useI18n } from '../../i18n.jsx'
import { PlayIcon, MicIcon } from '../icons.jsx'
import { wordLevel, MASTERY_THRESHOLD } from '../../practice/shadowing/mastery.js'

function band(score) {
  if (score >= MASTERY_THRESHOLD) return 'good'
  if (score >= 60) return 'mid'
  return 'bad'
}

export default function PhraseScore({ result, refText, assessing, onRetry, onPlayMine }) {
  const { t } = useI18n()

  if (assessing) {
    return (
      <div className="sh-score sh-score--wait">
        <span className="sh-score__spin" aria-hidden="true" />
        {t('shadowing.assessing')}
      </div>
    )
  }
  if (!result) return null

  const { overall, prosody, accuracy, fluency, words, tip, mock } = result
  const hasWords = Array.isArray(words) && words.length > 0

  return (
    <div className={`sh-score sh-score--${band(overall)}`}>
      <div className="sh-score__head">
        <div className="sh-score__ring" data-band={band(overall)}>
          <b>{overall}</b>
          <span>{t('shadowing.scoreOf100')}</span>
        </div>
        <div className="sh-score__stats">
          <span><i>{t('shadowing.prosody')}</i> {prosody}</span>
          <span><i>{t('shadowing.accuracy')}</i> {accuracy}</span>
          <span><i>{t('shadowing.fluency')}</i> {fluency}</span>
        </div>
        {mock && <span className="sh-score__mock">{t('shadowing.mock')}</span>}
      </div>

      {/* Тепловая карта слов (если Azure дал послово); иначе — просто текст фразы */}
      <div className="sh-score__words">
        {hasWords
          ? words.map((w, k) => (
              <span key={k} className={`sh-w sh-w--${wordLevel(w.accuracy, w.error)}`}>
                {w.word}
              </span>
            ))
          : <span className="sh-w sh-w--plain">{refText}</span>}
      </div>

      {tip && <div className="sh-score__tip">{tip}</div>}

      <div className="sh-score__acts">
        <button type="button" className="sh-chip" onClick={onPlayMine}>
          <PlayIcon size={14} /> {t('shadowing.yourTake')}
        </button>
        <button type="button" className="sh-chip" onClick={onRetry}>
          <MicIcon size={14} /> {t('shadowing.retry')}
        </button>
      </div>
    </div>
  )
}
