import { useI18n } from '../i18n.jsx'
import { SUPPORT_WHATSAPP_URL } from '../lib/support.js'
import { EXAM_PLANS, formatExamPrice } from '../data/examPricing.js'

/**
 * Тарифы подготовки к экзамену — свои у SAT и у IELTS (`product`), не общая витрина General English: там цены и состав
 * приезжают с бэкенда (/catalog/offers), а у экзаменов своего каталога ещё нет. Состав карточек — src/data/examPricing.js.
 *
 * Оплаты онлайн пока нет: кнопка пишет менеджеру в WhatsApp с готовым текстом заявки, менеджер выставляет счёт и
 * открывает доступ к разделу. Цены, пока владелец их не прислал, — «уточнит менеджер».
 */
export default function ExamPricingPage({ product = 'sat', onBack }) {
  const { t, lang } = useI18n()
  const plans = EXAM_PLANS[product] || []
  const k = (key, vars) => t(`examPricing.${product}.${key}`, vars)

  const ask = (plan) => {
    const text = t('examPricing.message', { product: product === 'sat' ? 'SAT' : 'IELTS', plan: k(`${plan.id}.title`) })
    window.open(`${SUPPORT_WHATSAPP_URL}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  return (
    <div className={`exam-pr exam-pr--${product}`}>
      <header className="exam-pr__top">
        <button type="button" className="exam-pr__back" onClick={onBack} aria-label={t('common.back')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m15 5-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <span className="exam-pr__kicker">{product === 'sat' ? 'SAT · Digital' : 'IELTS · Academic / General'}</span>
          <h1>{k('title')}</h1>
          <p>{k('lead')}</p>
        </div>
      </header>

      <div className="exam-pr__plans">
        {plans.map((plan) => {
          const price = formatExamPrice(plan.price, lang)
          const old = formatExamPrice(plan.oldPrice, lang)
          return (
            <article key={plan.id} className={`exam-pr__plan${plan.featured ? ' is-featured' : ''}`}>
              {plan.featured && <span className="exam-pr__badge">{t('examPricing.popular')}</span>}
              <h2>{k(`${plan.id}.title`)}</h2>
              <p className="exam-pr__desc">{k(`${plan.id}.desc`)}</p>
              <div className="exam-pr__price">
                {price ? (
                  <>
                    {old && <s>{old}</s>}
                    <b>{price}</b>
                    <small>{t('examPricing.perTerm', { n: String(plan.months) })}</small>
                  </>
                ) : (
                  <>
                    <b className="is-soon">{t('examPricing.priceSoon')}</b>
                    <small>{t('examPricing.term', { n: String(plan.months) })}</small>
                  </>
                )}
              </div>
              <ul>
                {plan.features.map((f) => (
                  <li key={f}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="m5 12 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {t(`examPricing.f.${product}.${f}`)}
                  </li>
                ))}
              </ul>
              <button type="button" className={`exam-pr__cta${plan.featured ? ' is-primary' : ''}`} onClick={() => ask(plan)}>
                {price ? t('examPricing.buy') : t('examPricing.ask')}
              </button>
            </article>
          )
        })}
      </div>

      <section className="exam-pr__how">
        <h2>{t('examPricing.how.title')}</h2>
        <ol>
          <li>{t('examPricing.how.1')}</li>
          <li>{t('examPricing.how.2')}</li>
          <li>{t('examPricing.how.3')}</li>
        </ol>
      </section>
    </div>
  )
}
