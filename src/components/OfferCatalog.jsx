import { useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { CATALOG_CATEGORIES, CURRENCY, formatPrice, offerCategory, offerTitle, offerDetails, durationsOf } from '../data/pricing.js'

/** One server catalog for the main price list, IELTS and SAT. No client-side prices. */
export default function OfferCatalog({ offers, product, onSelect, quantity, onBump }) {
  return CATALOG_CATEGORIES.filter((category) => !product || category.startsWith(product.toUpperCase())).map((category) => {
    const list = offers.filter((offer) => offerCategory(offer) === category)
    return list.length ? <OfferSection key={category} category={category} offers={list}
      onSelect={onSelect} quantity={quantity} onBump={onBump} /> : null
  })
}

function OfferSection({ category, offers, onSelect, quantity, onBump }) {
  const { t, lang } = useI18n()
  const durations = durationsOf(offers)
  const [duration, setDuration] = useState(durations[0])
  const mixedKinds = offers.some((o) => o.kind === 'GROUP') && offers.some((o) => o.kind === 'INDIVIDUAL')
  const [kind, setKind] = useState('INDIVIDUAL')
  const visible = offers.filter((o) => (!mixedKinds || o.kind === kind) && (durations.length < 2 || o.durationMinutes === duration))
  return <section className={`pr-sec pr-sec--${category === 'SELF' ? 'self' : category === 'GENERAL_GROUP' ? 'group' : 'ind'}`}>
    <div className="pr-sec__head">
      <h2 className="pr-sec__title">{t(`catalog.${category}`)}</h2>
      <div className="catalog-toggles">
        {durations.length > 1 && <div className="pr-toggle" role="group" aria-label={t(`catalog.${category}`)}>
          {durations.map((d) => <button type="button" key={d} className={`pr-toggle__btn${duration === d ? ' is-on' : ''}`}
            aria-pressed={duration === d} onClick={() => setDuration(d)}>{t('catalog.minutes', { n: d })}</button>)}
        </div>}
        {mixedKinds && <div className="pr-toggle" role="group" aria-label={t(`catalog.${category}`)}>
          {['INDIVIDUAL', 'GROUP'].map((k) => <button type="button" key={k} className={`pr-toggle__btn${kind === k ? ' is-on' : ''}`}
            aria-pressed={kind === k} onClick={() => setKind(k)}>{t(k === 'GROUP' ? 'catalog.group' : 'catalog.individual')}</button>)}
        </div>}
      </div>
    </div>
    <div className={`pr-tiles${category === 'SELF' ? ' pr-tiles--4' : ' pr-tiles--3'}`}>
      {visible.map((offer) => {
        const qty = quantity?.(offer.code) || 0
        return <article key={offer.code} className={`pr-tile${qty ? ' is-chosen' : ''}`} data-offer-code={offer.code}>
          <div className="pr-tile__head"><h3 className="pr-tile__title">{offerTitle(offer, t, lang)}</h3>
            {quantity && (qty ? <span className="pr-step">
              <button type="button" onClick={() => onBump(offer.code, -1)} aria-label={t('pricing.minus')}>−</button>
              <i>{qty}</i><button type="button" className="is-plus" onClick={() => onBump(offer.code, 1)} aria-label={t('pricing.plus')}>+</button>
            </span> : <button type="button" className="pr-tile__add" aria-label={t('pricing.add')}
              onClick={() => onSelect(offer)}>+</button>)}
          </div>
          {offer.previousPrice > offer.price && <s className="catalog-old" aria-label={t('catalog.previousPrice')}>{formatPrice(offer.previousPrice)} {CURRENCY}</s>}
          <div className="pr-tile__price">{formatPrice(offer.price)} {CURRENCY}</div>
          <div className="pr-tile__note">{offerDetails(offer, t, lang)}</div>
          {!quantity && <button type="button" className="exam-pr__cta" onClick={() => onSelect(offer)}>{t('examPricing.ask')}</button>}
        </article>
      })}
    </div>
  </section>
}
