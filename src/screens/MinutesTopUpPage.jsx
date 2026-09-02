import { useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { plural } from '../lib/plural.js'
import { SUPPORT_WHATSAPP_URL } from '../lib/support.js'
import PaymentMethodModal from '../components/PaymentMethodModal.jsx'
import { CURRENCY, MINUTE_PACKS, formatPrice, packDiscount, pricePerMinute } from '../data/pricing.js'

// «Докупить минуты» — витрина пакетов минут голосового тьютора. Сюда ведёт
// кнопка из окна «Лимит исчерпан».
//
// Отличается от «Тарифов» тем, что покупается ровно один пакет: корзины нет,
// выбор — радиогруппой. Складывать «20 минут + 60 минут» смысла нет — это одна
// и та же сущность, и человеку проще выбрать пакет побольше.
export default function MinutesTopUpPage({ onBack, onDone }) {
  const { t, lang } = useI18n()
  // Предвыбран самый маленький пакет — как в макете: заказ справа не должен
  // быть пустым, иначе непонятно, что вообще произойдёт по кнопке.
  const [pickedId, setPickedId] = useState(MINUTE_PACKS[0].id)
  const [payOpen, setPayOpen] = useState(false)

  const picked = MINUTE_PACKS.find((p) => p.id === pickedId) || MINUTE_PACKS[0]
  const minutesLabel = (n) => plural(t, lang, 'topup.minutes', n)

  // Оплаты в приложении нет — как и на витрине тарифов, заказ уезжает менеджеру
  // текстом (см. комментарий в PricingPage).
  const pay = (method) => {
    const text = [
      t('topup.title'),
      `• ${t('topup.pack', { minutes: minutesLabel(picked.minutes) })} — ${formatPrice(picked.price)} ${CURRENCY}`,
      `[${method}]`,
    ].join('\n')
    window.open(`${SUPPORT_WHATSAPP_URL}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    setPayOpen(false)
    onDone?.(method)
  }

  return (
    <div className="tu">
      <header className="tu__top">
        <button type="button" className="tu__back" onClick={onBack} aria-label={t('common.back')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m15 5-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="tu__title">{t('topup.title')}</h1>
      </header>

      <div className="tu__grid">
        <div className="tu__cols">
          <h2 className="tu-pick__title">{t('topup.pick')}</h2>
          {/* Радиогруппа, а не кнопки: пакет покупается один, и радио говорит об
              этом само — без подписи «можно выбрать только один». */}
          <div className="tu-packs" role="radiogroup" aria-label={t('topup.pick')}>
            {MINUTE_PACKS.map((p) => {
              const off = packDiscount(p)
              const on = p.id === picked.id
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`tu-pack${on ? ' is-on' : ''}`}
                  onClick={() => setPickedId(p.id)}
                >
                  <span className="tu-pack__head">
                    <b className="tu-pack__name">{minutesLabel(p.minutes)}</b>
                    <i className="tu-pack__dot" aria-hidden="true" />
                  </span>
                  <span className="tu-pack__price">{formatPrice(p.price)} {CURRENCY}</span>
                  <span className="tu-pack__foot">
                    <span className="tu-pack__per">
                      {t('topup.perMinute', { price: formatPrice(pricePerMinute(p)) })}
                    </span>
                    {off > 0 && <span className="tu-pack__off">-{off}%</span>}
                  </span>
                </button>
              )
            })}
          </div>

          <h2 className="tu-how__title">{t('topup.how')}</h2>
          <div className="tu-how">
            <div className="tu-how__row">
              <span className="tu-how__ic tu-how__ic--clock" aria-hidden="true"><ClockMark /></span>
              <span className="tu-how__body">
                <b>{t('topup.how1')}</b>
                <i>{t('topup.how1sub')}</i>
              </span>
            </div>
            <div className="tu-how__row">
              <span className="tu-how__ic tu-how__ic--check" aria-hidden="true"><CheckMark /></span>
              <span className="tu-how__body">
                <b>{t('topup.how2')}</b>
                <i>{t('topup.how2sub')}</i>
              </span>
            </div>
          </div>
        </div>

        <aside className="tu-order">
          <div className="tu-order__inner">
            <div className="tu-order__label">{t('topup.order')}</div>
            <div className="tu-order__row">
              <span>{t('topup.pack', { minutes: minutesLabel(picked.minutes) })}</span>
              <b>{formatPrice(picked.price)} {CURRENCY}</b>
            </div>
            <div className="tu-order__total">
              <span>{t('topup.due')}</span>
              <b>{formatPrice(picked.price)} {CURRENCY}</b>
            </div>
            <button type="button" className="tu-order__pay" onClick={() => setPayOpen(true)}>
              {t('topup.pay', { price: formatPrice(picked.price) })}
            </button>
            <p className="tu-order__note">
              <InfoMark />
              {t('topup.note')}
            </p>
          </div>
        </aside>
      </div>

      {payOpen && <PaymentMethodModal onClose={() => setPayOpen(false)} onPick={pay} />}
    </div>
  )
}

function ClockMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.9" />
      <path d="M12 7.6V12l3 1.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.9" />
      <path d="m8 12.3 2.7 2.7L16 9.7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function InfoMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v5.2M12 7.9v.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
