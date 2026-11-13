import { useI18n } from '../i18n.jsx'

const RULES = ['respect', 'feedback', 'noAds', 'ai']

/**
 * «Правила сообщества» (прототип: колонка справа). На телефоне колонки нет — те же правила свёрнутым блоком над
 * лентой (§7); какой из двух видов показать, решает CSS по ширине (src/mobile/birge.css), разметка одна.
 */
export default function RulesCard() {
  const { t } = useI18n()
  const list = (
    <ul className="brg-rules__list">
      {RULES.map((key) => (
        <li key={key}>{t(`birge.rules.${key}`)}</li>
      ))}
    </ul>
  )
  return (
    <aside className="brg-rules-col">
      <section className="brg-card brg-rules">
        <h3>{t('birge.rules.title')}</h3>
        {list}
      </section>
      <details className="brg-card brg-rules-m">
        <summary>{t('birge.rules.title')}</summary>
        {list}
      </details>
    </aside>
  )
}
