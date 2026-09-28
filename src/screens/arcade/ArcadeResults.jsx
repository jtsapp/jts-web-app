import { useI18n } from '../../i18n.jsx'
import { DIFFICULTIES } from '../../practice/arcade/engine.js'
import { formatOneDecimal } from './format.js'

// Итоги раунда — порт javaTest src/components/Statistics.tsx: время речи,
// время тишины, остановки и соотношение речи к тишине, плюс совет. Кнопки
// «план подготовки» из исходника нет — в приложении ей некуда вести.
// Это счёт игры, а не оценка языка: ничего сверх замеров здесь не выводим.

export default function ArcadeResults({ result }) {
  const { t, lang } = useI18n()
  const { speaking, silence, stops } = result
  const levelKey = DIFFICULTIES[result.level].key
  const seconds = (n) => t('arcade.results.seconds', { n: formatOneDecimal(n, lang) })
  const ratio =
    silence > 0 ? `${formatOneDecimal(speaking / silence, lang)}:1` : speaking > 0 ? t('arcade.results.allSpeech') : '—'
  const tiles = [
    { key: 'speaking', value: seconds(speaking) },
    { key: 'silence', value: seconds(silence) },
    { key: 'stops', value: String(stops) },
    { key: 'ratio', value: ratio },
  ]
  return (
    <section className="ar-results" aria-labelledby="ar-results-title">
      <div className="ar-results__head">
        <h2 id="ar-results-title">{t('arcade.results.title')}</h2>
        <span className={`ar-results__level ar-level--${levelKey}`}>{t(`arcade.difficulty.${levelKey}`)}</span>
      </div>
      <div className="ar-results__grid">
        {tiles.map(({ key, value }) => (
          <article key={key} className={`ar-stat ar-stat--${key}`}>
            <span className="ar-stat__label">{t(`arcade.results.${key}`)}</span>
            <strong>{value}</strong>
            <span className="ar-stat__hint">{t(`arcade.results.${key}Hint`)}</span>
          </article>
        ))}
      </div>
      <p className="ar-results__tip">{t(speaking > silence ? 'arcade.results.good' : 'arcade.results.more')}</p>
    </section>
  )
}
