import { useEffect, useRef } from 'react'
import { useI18n } from '../../i18n.jsx'
import { useDialogKeys } from '../../lib/useDialogKeys.js'
import { LONG_PAUSE, summarise } from '../../practice/arcade/speechSegments.js'
import ArcadeReview from './ArcadeReview.jsx'
import { formatNumber, formatOneDecimal } from './format.js'

// Окно «Анализ» после раунда: раунд читаемым
// текстом, где паузы, заминки и возможные повторы помечены на своих местах.
// Ничего не оценивается и не удаляется; оценку даёт только ИИ-разбор сверху,
// и только по нажатию.
//
// Окно — оверлей jts (role="dialog" + useDialogKeys), а не <dialog>: так же
// устроены остальные окна приложения. Рисуется ВНУТРИ игрового поля, чтобы
// быть видимым и в полноэкранном режиме — fixed-оверлей закрывает окно в
// обоих случаях.

// Кусок текста по отрезку: слова как сказаны, всё остальное — плашкой.
function Inline({ s, t, lang }) {
  const secs = `${formatOneDecimal(s.end - s.start, lang)} ${t('arcade.transcript.s')}`
  if (s.tokens.length)
    return s.tokens.map((k, i) => (
      <span key={i}>
        {k.kind === 'FILLER' ? (
          <span className="ar-chip ar-chip--hes" title={t('arcade.transcript.hesitationTitle')}>
            {k.text}
          </span>
        ) : k.repetition ? (
          <mark className="ar-repeat" title={t('arcade.transcript.repeatTitle')}>
            {k.text}
            <span className="ar-sr" lang={lang}>
              {' '}
              ({t('arcade.transcript.repeatTitle')})
            </span>
          </mark>
        ) : (
          k.text
        )}{' '}
      </span>
    ))
  const chips = {
    PAUSE:
      s.end - s.start >= LONG_PAUSE
        ? ['ar-chip ar-chip--pause', t('arcade.transcript.chip.pause', { seconds: secs })]
        : ['ar-chip ar-chip--short', `· ${secs} ·`],
    FILLER: ['ar-chip ar-chip--hes', t('arcade.transcript.chip.hesitation', { seconds: secs })],
    NON_WORD_SOUND: ['ar-chip ar-chip--sound', t('arcade.transcript.chip.sound', { seconds: secs })],
    UNCLASSIFIED: ['ar-chip ar-chip--unknown', t('arcade.transcript.chip.unknown', { seconds: secs })],
  }
  const [className, label] = chips[s.kind]
  return (
    <>
      <span className={className} lang={lang}>
        {label}
      </span>{' '}
    </>
  )
}

export default function TranscriptDialog({ transcript, note, review, availability, budget, onStart, onClose }) {
  const { t, lang } = useI18n()
  const cardRef = useRef(null)
  const closeRef = useRef(null)
  useDialogKeys(cardRef, onClose)
  useEffect(() => {
    closeRef.current?.focus()
    // Страница под окном не прокручивается.
    const root = document.documentElement
    const prev = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = prev
    }
  }, [])

  const totals = summarise(transcript)
  const { segments } = transcript
  const length = segments.length ? segments[segments.length - 1].end : 0
  const heardAnything = segments.some((s) => s.kind !== 'PAUSE')

  return (
    <div className="ar-modal" data-ar-dialog="" onClick={onClose}>
      <div
        className="ar-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ar-transcript-title"
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="ar-modal__close" ref={closeRef} aria-label={t('arcade.transcript.close')} onClick={onClose}>
          ✕
        </button>
        <span className="ar-eyebrow">
          <span />
          {t('arcade.transcript.eyebrow')}
        </span>
        <h2 id="ar-transcript-title">{t('arcade.transcript.title')}</h2>

        <ArcadeReview state={review} availability={availability} budget={budget} onStart={onStart} />

        {heardAnything ? (
          <>
            <div className="ar-tiles">
              {[
                ['arcade.transcript.words', totals.words],
                ['arcade.transcript.longPauses', totals.longPauses],
                ['arcade.transcript.hesitations', totals.hesitations],
                ['arcade.transcript.repeats', totals.repetitions],
              ].map(([key, value]) => (
                <div key={key} className="ar-tile">
                  <span>{t(key)}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            {/* Весь раунд одним взглядом; легенда ниже называет цвета. */}
            <div className="ar-bar" aria-hidden="true">
              {segments.map((s, i) => (
                <span key={i} className={`ar-bar--${s.kind}`} style={{ flexGrow: Math.max(s.end - s.start, 0.05) }} />
              ))}
            </div>
            <div className="ar-legend">
              {[
                ['WORD', 'arcade.transcript.legend.speech'],
                ['PAUSE', 'arcade.transcript.legend.pause'],
                ['FILLER', 'arcade.transcript.legend.hesitation'],
                ['NON_WORD_SOUND', 'arcade.transcript.legend.sound'],
              ].map(([kind, key]) => (
                <span key={kind}>
                  <i className={`ar-bar--${kind}`} />
                  {t(key)}
                </span>
              ))}
              <span className="ar-legend__len">
                {formatNumber(Math.round(length), lang)} {t('arcade.transcript.s')}
              </span>
            </div>
            <p className="ar-transcript" lang="en">
              {segments.map((s, i) => (
                <Inline key={i} s={s} t={t} lang={lang} />
              ))}
            </p>
            <div className="ar-key">
              <span>
                <span className="ar-chip ar-chip--pause">{t('arcade.transcript.legend.pause')}</span> {t('arcade.transcript.key.pause')}
              </span>
              <span>
                <span className="ar-chip ar-chip--hes" lang="en">
                  uh
                </span>{' '}
                {t('arcade.transcript.key.hesitation')}
              </span>
              <span>
                <span className="ar-chip ar-chip--sound">{t('arcade.transcript.chip.sound', { seconds: '' }).trim()}</span>{' '}
                {t('arcade.transcript.key.sound')}
              </span>
              <span>
                <mark className="ar-chip ar-chip--repeat" lang="en">
                  that
                </mark>{' '}
                {t('arcade.transcript.key.repeat')}
              </span>
            </div>
          </>
        ) : (
          !note && <p className="ar-transcript__empty">{t('arcade.transcript.empty')}</p>
        )}
        {note && (
          <p className="ar-note" role="status">
            {note}
          </p>
        )}
      </div>
    </div>
  )
}
