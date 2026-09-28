import { useI18n } from '../../i18n.jsx'
import { MIN_WORDS } from '../../practice/arcade/reviewClient.js'
import { formatOneDecimal } from './format.js'

// ИИ-разбор раунда в окне стенограммы (порт javaTest SpeakingAnalysisPanel).
// Стенограмма под ним разбором не меняется; цитаты здесь скопированы из неё.
// Ничего не уходит на сервер, пока ученик сам не нажал «ИИ-разбор».

const ERROR_KEYS = {
  daily_limit_reached: 'arcade.review.error.limit',
  not_configured: 'arcade.review.error.notConfigured',
  too_short: 'arcade.review.tooShort',
  timeout: 'arcade.review.error.timeout',
}

function Remaining({ budget }) {
  const { t } = useI18n()
  if (!budget || budget.limit == null) return null
  return (
    <p className="ar-review__left">{t('arcade.review.remaining', { remaining: budget.remaining, limit: budget.limit })}</p>
  )
}

export default function ArcadeReview({ state, availability, budget, onStart }) {
  const { t, lang } = useI18n()
  if (availability === 'guest') return <p className="ar-review__card">{t('arcade.review.login')}</p>
  if (availability === 'too-short')
    return <p className="ar-review__card">{t('arcade.review.tooShort', { count: MIN_WORDS })}</p>
  // До нажатия в модель не уходит ничего.
  if (state.status === 'idle')
    return (
      <div className="ar-review__card">
        <p>{t('arcade.review.intro')}</p>
        <button type="button" className="ar-review__start" onClick={onStart}>
          <span aria-hidden="true">✦</span> {t('arcade.review.start')}
        </button>
        <Remaining budget={budget} />
      </div>
    )
  if (state.status === 'loading')
    return (
      <p className="ar-review__card ar-review__loading" role="status">
        <span className="ar-spinner" aria-hidden="true" />
        {t('arcade.review.loading')}
      </p>
    )
  if (state.status === 'error') {
    const limit = state.code === 'daily_limit_reached'
    return (
      <div className="ar-review__error" role="alert">
        <span>{t(ERROR_KEYS[state.code] || 'arcade.review.error.failed', { count: MIN_WORDS, limit: budget?.limit ?? '' })}</span>
        {/* Повтор бессмыслен, пока лимит не сбросится. */}
        {!limit && (
          <button type="button" onClick={onStart}>
            ↻ {t('arcade.review.retry')}
          </button>
        )}
      </div>
    )
  }

  const a = state.review
  return (
    <section className="ar-review" aria-label={t('arcade.review.start')}>
      <div className="ar-review__band">
        <div>
          <div className="ar-review__label">{t('arcade.review.band')}</div>
          <strong>{a.estimatedBand == null ? '—' : formatOneDecimal(a.estimatedBand, lang)}</strong>
        </div>
        <p>{a.estimatedBand == null ? t('arcade.review.noBasis') : t('arcade.review.basis', { count: a.assessed })}</p>
      </div>
      <p className="ar-review__summary" lang={a.language}>
        {a.summary}
      </p>
      <div className="ar-review__criteria">
        {a.criteria.map((c) => (
          <article key={c.key} className="ar-review__criterion">
            <div className="ar-review__crit-head">
              <h3>{t(`arcade.review.criterion.${c.key}`)}</h3>
              <span className={c.band == null ? 'is-na' : ''}>{c.band == null ? t('arcade.review.notAssessable') : c.band}</span>
            </div>
            <ul lang={a.language}>
              {(c.key === 'pronunciation' ? [t('arcade.review.pronunciationNote')] : c.comments).map((comment, i) => (
                <li key={i}>{comment}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <div className="ar-review__lists">
        {[
          ['arcade.review.strengths', a.strengths],
          ['arcade.review.weaknesses', a.weaknesses],
        ].map(([key, items]) => (
          <div key={key}>
            <div className="ar-review__label">{t(key)}</div>
            <ul lang={a.language}>
              {items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="ar-review__label">{t('arcade.review.next')}</div>
      <ol className="ar-review__next" lang={a.language}>
        {a.recommendations.map((r, i) => (
          <li key={i}>
            {r.advice}
            {r.evidence && <q lang="en">{r.evidence}</q>}
          </li>
        ))}
      </ol>
      <p className="ar-review__footer">{t('arcade.review.footer', { model: a.model })}</p>
      <Remaining budget={budget} />
    </section>
  )
}
