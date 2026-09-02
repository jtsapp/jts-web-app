import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { plural } from '../lib/plural.js'
import { SUPPORT_WHATSAPP_URL } from '../lib/support.js'
import { useOffers } from '../lib/useOffers.js'
import { createLead, createOrder } from '../api.js'
import PaymentMethodModal from '../components/PaymentMethodModal.jsx'
import CatalogError from '../components/CatalogError.jsx'
import { CURRENCY, formatPrice, packDiscount, pricePerMinute, splitOffers } from '../data/pricing.js'


/**
 * Ключ идемпотентности заказа. Функция модульная, а не внутри компонента:
 * Date.now/Math.random — нечистые, и внутри они читались бы как вызов во время
 * рендера (правило react-hooks/purity), хотя зовём мы их только по нажатию.
 */
function newOrderKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `ord-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// «Докупить минуты» — витрина пакетов минут голосового тьютора. Сюда ведёт
// кнопка из окна «Лимит исчерпан».
//
// Отличается от «Тарифов» тем, что покупается ровно один пакет: корзины нет,
// выбор — радиогруппой. Складывать «20 минут + 60 минут» смысла нет — это одна
// и та же сущность, и человеку проще выбрать пакет побольше.
//
// Пакеты и цены приезжают с бэкенда (GET /catalog/offers), как и на «Тарифах»:
// сумму заказа считает сервер.
export default function MinutesTopUpPage({ token, onBack, onDone }) {
  const { t, lang } = useI18n()
  const { offers, failed, reload } = useOffers()
  const [pickedCode, setPickedCode] = useState(null)
  const [payOpen, setPayOpen] = useState(false)
  const [sent, setSent] = useState(false)

  const packs = useMemo(() => splitOffers(offers || []).minutes, [offers])
  const picked = packs.find((p) => p.code === pickedCode) || packs[0] || null

  // Предвыбран самый маленький пакет — как в макете: заказ справа не должен
  // быть пустым, иначе непонятно, что вообще произойдёт по кнопке.
  useEffect(() => {
    if (pickedCode === null && packs.length) {
      const smallest = packs.reduce((a, b) => ((a.minutes || 0) <= (b.minutes || 0) ? a : b))
      setPickedCode(smallest.code)
    }
  }, [pickedCode, packs])

  const minutesLabel = (n) => plural(t, lang, 'topup.minutes', n)

  // Ключ идемпотентности живёт, пока не сменили пакет: повторный клик по оплате
  // вернёт тот же заказ, а не создаст второй платёж.
  const orderKeyRef = useRef(null)
  useEffect(() => {
    orderKeyRef.current = null
  }, [pickedCode])

  const orderKey = () => {
    if (!orderKeyRef.current) orderKeyRef.current = newOrderKey()
    return orderKeyRef.current
  }

  const pay = async (method) => {
    if (!picked) return
    const text = [
      t('topup.title'),
      `• ${t('topup.pack', { minutes: minutesLabel(picked.minutes) })} — ${formatPrice(picked.price)} ${CURRENCY}`,
      `[${method}]`,
    ].join('\n')

    // Как и на витрине тарифов: заявка в CRM при любом способе, оплата — если
    // эквайринг подключён, чат — запасной путь.
    let accepted = false
    try {
      accepted = (await createLead(token, { source: 'MINUTES', comment: text })).accepted
    } catch {
      /* заявка не единственный путь */
    }

    try {
      const order = await createOrder(token, {
        items: [{ offerCode: picked.code, quantity: 1 }],
        idempotencyKey: orderKey(),
        returnUrl: typeof window === 'undefined' ? undefined : window.location.href,
      })
      if (order?.paymentUrl) {
        setPayOpen(false)
        onDone?.(method)
        window.location.assign(order.paymentUrl)
        return
      }
    } catch {
      /* заказ не создался — остаётся запасной путь ниже */
    }

    setPayOpen(false)
    if (method === 'callback' && accepted) {
      setSent(true)
      onDone?.(method)
      return
    }
    window.open(`${SUPPORT_WHATSAPP_URL}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
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

      {offers === null || failed || !picked ? (
        <CatalogError loading={offers === null && !failed} onRetry={reload} />
      ) : (
        <div className="tu__grid">
          <div className="tu__cols">
            <h2 className="tu-pick__title">{t('topup.pick')}</h2>
            {/* Радиогруппа, а не кнопки: пакет покупается один, и радио говорит
                об этом само — без подписи «можно выбрать только один». */}
            <div className="tu-packs" role="radiogroup" aria-label={t('topup.pick')}>
              {packs.map((p) => {
                const off = packDiscount(p, packs)
                const on = p.code === picked.code
                return (
                  <button
                    key={p.code}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`tu-pack${on ? ' is-on' : ''}`}
                    onClick={() => setPickedCode(p.code)}
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
              {sent ? (
                <div className="pr-sent" role="status">
                  <b>{t('pay.sent')}</b>
                  <span>{t('pay.sentSub')}</span>
                </div>
              ) : (
                <>
                  <button type="button" className="tu-order__pay" onClick={() => setPayOpen(true)}>
                    {t('topup.pay', { price: formatPrice(picked.price) })}
                  </button>
                  <p className="tu-order__note">
                    <InfoMark />
                    {t('topup.note')}
                  </p>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

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
