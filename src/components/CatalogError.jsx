import { useI18n } from '../i18n.jsx'

/**
 * Каталог не приехал — вместо витрины.
 *
 * Запасного прайса в бандле нет намеренно (см. lib/useOffers.js): показать
 * старые цены и посчитать заказ по новым — хуже, чем честно сказать, что не
 * загрузилось, и дать кнопку повтора.
 */
export default function CatalogError({ loading = false, onRetry }) {
  const { t } = useI18n()
  return (
    <div className="pr-load" role="status" aria-live="polite">
      {loading ? (
        <>
          <span className="pr-load__spin" aria-hidden="true" />
          <span className="pr-load__text">{t('pricing.loading')}</span>
        </>
      ) : (
        <>
          <span className="pr-load__text">{t('pricing.loadError')}</span>
          <button type="button" className="pr-load__retry" onClick={onRetry}>
            {t('pricing.retry')}
          </button>
        </>
      )}
    </div>
  )
}
