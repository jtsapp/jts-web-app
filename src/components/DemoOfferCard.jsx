import { useI18n } from '../i18n.jsx'
import { RETRY_OFFER, formatPrice, CURRENCY } from '../data/pricing.js'

// Плашка скидки внизу сайдбара демо-аккаунта: перечёркнутая обычная цена
// пробного занятия и цена по скидке.
//
// Стоит на месте стрика и монет, а не над ними: у демо-ученика игровой счётчик
// ещё пустой (заданий он почти не проходил), и две полупустые полосы подряд
// внизу колонки читались бы как незагрузившийся интерфейс. После снятия
// демо-флага плашка исчезает и балансу возвращается его место — см. Sidebar.
export default function DemoOfferCard({ onUse }) {
  const { t } = useI18n()
  return (
    <div className="dm-offer">
      <div className="dm-offer__prices">
        <s className="dm-offer__was">{formatPrice(RETRY_OFFER.was)} {CURRENCY}</s>
        <span className="dm-offer__now">{formatPrice(RETRY_OFFER.now)} {CURRENCY}</span>
      </div>
      <b className="dm-offer__title">{t('demo.retry.title')}</b>
      <span className="dm-offer__sub">{t('demo.retry.sub')}</span>
      <button type="button" className="dm-offer__cta" onClick={onUse}>
        {t('demo.retry.cta')}
      </button>
    </div>
  )
}
