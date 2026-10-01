import { useI18n } from '../../../i18n.jsx'
import { RUN_DIFFICULTIES } from '../../../practice/arcade/runner/engine.js'
import { PkChevron } from '../../practice/PracticeIcons.jsx'

// Итоги забега: очки, рекорд этой сложности (localStorage этого браузера),
// лучшая серия, удары о препятствия и список ошибок — ради него игра и
// учебная: слово, его перевод и что выбрал ученик.
export default function RunnerResults({ result, onAgain, onExit }) {
  const { t } = useI18n()
  const key = RUN_DIFFICULTIES[result.level].key
  const tiles = [
    { key: 'score', value: result.score },
    { key: 'best', value: result.best },
    { key: 'streak', value: result.bestStreak },
    { key: 'hits', value: result.hits },
  ]
  return (
    <section className="ar-results ar-run-results" aria-labelledby="ar-run-results-title">
      <div className="ar-results__head">
        <h2 id="ar-run-results-title">{t('arcade.run.results.title')}</h2>
        <span className={`ar-results__level ar-level--${key}`}>{t(`arcade.difficulty.${key}`)}</span>
      </div>
      {result.record && <p className="ar-run-record">{t('arcade.run.results.newBest')}</p>}
      <div className="ar-results__grid ar-run-results__grid">
        {tiles.map(({ key: stat, value }) => (
          <article key={stat} className={`ar-stat ar-stat--${stat}`}>
            <span className="ar-stat__label">{t(`arcade.run.results.${stat}`)}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <h3 className="ar-run-results__sub">{t('arcade.run.results.mistakes')}</h3>
      {result.mistakes.length ? (
        <ul className="ar-run-mistakes">
          {result.mistakes.map((m, i) => (
            <li key={i}>
              <b>{m.prompt}</b>
              <span aria-hidden="true">→</span>
              <span lang="en" className="ar-run-mistakes__answer">
                {m.answer}
              </span>
              <small>{t('arcade.run.results.picked', { word: m.picked })}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ar-results__tip">{t('arcade.run.results.noMistakes')}</p>
      )}
      <div className="ar-run-results__actions">
        <button type="button" className="ar-run-btn" onClick={onAgain}>
          {t('arcade.run.again')}
          <PkChevron size={18} />
        </button>
        {onExit && (
          <button type="button" className="ar-run-btn ar-run-btn--ghost" onClick={onExit}>
            {t('arcade.toHub')}
          </button>
        )}
      </div>
    </section>
  )
}
