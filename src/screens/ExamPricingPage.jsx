import { useI18n } from '../i18n.jsx'
import { SUPPORT_WHATSAPP_URL } from '../lib/support.js'
import { useOffers } from '../lib/useOffers.js'
import { formatPrice, offerTitle, offerDetails } from '../data/pricing.js'
import OfferCatalog from '../components/OfferCatalog.jsx'
import CatalogError from '../components/CatalogError.jsx'
import LegalDocumentsLinks from '../components/LegalDocumentsLinks.jsx'

export default function ExamPricingPage({ product = 'sat', onBack }) {
  const { t, lang } = useI18n()
  const { offers, failed, reload } = useOffers()
  const ask = (offer) => {
    const text = [product.toUpperCase(), offerTitle(offer, t, lang), offerDetails(offer, t, lang), `${formatPrice(offer.price)} ₸`].join(' · ')
    window.open(`${SUPPORT_WHATSAPP_URL}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }
  return <div className={`exam-pr exam-pr--${product}`}>
    <header className="exam-pr__top">
      <button type="button" className="exam-pr__back" onClick={onBack} aria-label={t('common.back')}>←</button>
      <div><span className="exam-pr__kicker">{product.toUpperCase()}</span>
        <h1>{t(`examPricing.${product}.title`)}</h1><p>{t(`examPricing.${product}.lead`)}</p>
      </div>
    </header>
    {offers === null || failed ? <CatalogError loading={offers === null && !failed} onRetry={reload} />
      : <OfferCatalog offers={offers} product={product} onSelect={ask} />}
    <section className="exam-pr__how"><h2>{t('examPricing.how.title')}</h2><ol>
      {[1, 2, 3].map((n) => <li key={n}>{t(`examPricing.how.${n}`)}</li>)}
    </ol></section>
    <section className="pr-inc"><h2 className="pr-inc__title">{t('legal.title')}</h2><LegalDocumentsLinks /></section>
  </div>
}
