import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { SUPPORT_WHATSAPP_URL } from '../lib/support.js'
import { useOffers } from '../lib/useOffers.js'
import { createLead, createOrder } from '../api.js'
import PaymentMethodModal from '../components/PaymentMethodModal.jsx'
import PurchaseSuccessModal from '../components/PurchaseSuccessModal.jsx'
import CatalogError from '../components/CatalogError.jsx'
import OfferCatalog from '../components/OfferCatalog.jsx'
import LegalDocumentsLinks from '../components/LegalDocumentsLinks.jsx'
import { CURRENCY, formatPrice, offerCategory, offerTitle, offerDetails } from '../data/pricing.js'
import { addItem, cartCount, cartTotal, qtyOf, removeItem, setQty } from '../lib/cart.js'


/**
 * Ключ идемпотентности заказа. Функция модульная, а не внутри компонента:
 * Date.now/Math.random — нечистые, и внутри они читались бы как вызов во время
 * рендера (правило react-hooks/purity), хотя зовём мы их только по нажатию.
 */
function newOrderKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `ord-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// Витрина тарифов (макет демо-доступа, экраны 4-5). Сюда ведут все призывы
// «открыть полный доступ»: плашка демо на «Главной», скидка в сайдбаре и кнопка
// «Приобрести подписку» в окне демо-лимита.
//
// Предложения и цены приезжают с бэкенда (GET /catalog/offers): сумму заказа
// считает сервер, и вторая копия прайса на клиенте означала бы, что человек
// видит одно, а платит другое. Подписи при этом строятся здесь — сервер владеет
// ценой и составом, клиент словами, поэтому экран остаётся трёхъязычным.
export default function PricingPage({ token, onBack, onDone }) {
  const { t, lang } = useI18n()
  const { offers, failed, reload } = useOffers()
  const [items, setItems] = useState([])
  const [payOpen, setPayOpen] = useState(false)
  const [sent, setSent] = useState(false)
  // Окно закрыли — плашка в корзине остаётся, второй раз окно не всплывает.
  const [hidNote, setHidNote] = useState(false)

  const total = cartTotal(items)
  const count = cartCount(items)
  const cartLine = (offer) => ({
    id: offer.code,
    kind: offer.kind === 'SELF_STUDY' ? 'self' : offer.kind === 'GROUP' ? 'group' : 'ind',
    title: t(`catalog.${offerCategory(offer)}`),
    subtitle: [offerTitle(offer, t, lang), offerDetails(offer, t, lang)].filter(Boolean).join(' · '),
    price: offer.price,
  })
  const add = (offer) => setItems((prev) => addItem(prev, cartLine(offer)))
  const bump = (id, delta) => setItems((prev) => setQty(prev, id, qtyOf(prev, id) + delta))

  // Ключ идемпотентности живёт, пока не изменилась корзина: повторный клик по
  // «Перейти к оплате» вернёт тот же заказ, а не создаст второй платёж. Меняется
  // состав — начинается другой заказ, и ключ нужен новый.
  const orderKeyRef = useRef(null)
  useEffect(() => {
    orderKeyRef.current = null
  }, [items])

  const orderKey = () => {
    if (!orderKeyRef.current) orderKeyRef.current = newOrderKey()
    return orderKeyRef.current
  }

  const pay = async (method) => {
    const lines = items.map(
      (x) => `• ${x.title} — ${x.subtitle} × ${x.qty} = ${formatPrice(x.price * x.qty)} ${CURRENCY}`,
    )
    const text = [
      t('pricing.cart'),
      ...lines,
      `${t('pricing.cart.total')}: ${formatPrice(total)} ${CURRENCY}`,
      `[${method}]`,
    ].join('\n')

    // Заявка в CRM уходит при любом способе: даже если человек сейчас уйдёт
    // платить или писать в чат, менеджер увидит, что именно тот выбрал.
    let accepted = false
    try {
      accepted = (await createLead(token, { source: 'PRICING', comment: text, amount: total })).accepted
    } catch {
      // Молча: заявка — не единственный путь, ниже есть и оплата, и чат.
    }

    // Настоящая оплата, если эквайринг подключён. Ссылки нет (провайдер не
    // настроен или не ответил) — идём прежним путём, к менеджеру: пустая
    // страница оплаты хуже, чем живой человек.
    try {
      const order = await createOrder(token, {
        items: items.map((x) => ({ offerCode: x.id, quantity: x.qty })),
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
    // Заявка дошла до менеджера — говорим об этом окном, а не только плашкой в
    // корзине: человек ждёт ответа на своё нажатие.
    if (accepted) setSent(true)
    // «Связаться со мной» — единственный способ, который не уводит из
    // приложения. Но если звонить некуда (в профиле нет телефона), оставлять
    // человека ни с чем нельзя — тогда открываем чат.
    if (method === 'callback' && accepted) {
      onDone?.(method)
      return
    }
    window.open(`${SUPPORT_WHATSAPP_URL}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    onDone?.(method)
  }

  return (
    <div className="pr">
      <header className="pr__top">
        <button type="button" className="pr__back" onClick={onBack} aria-label={t('common.back')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m15 5-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="pr__title">{t('pricing.title')}</h1>
      </header>

      {offers === null || failed ? (
        <CatalogError loading={offers === null && !failed} onRetry={reload} />
      ) : (
        <div className="pr__grid">
          <div className="pr__cols">
            <OfferCatalog offers={offers} onSelect={add} quantity={(id) => qtyOf(items, id)} onBump={bump} />
            <section className="pr-inc"><h2 className="pr-inc__title">{t('legal.title')}</h2><LegalDocumentsLinks /></section>
          </div>

          {/* ——— Корзина ——— */}
          <aside className="pr-cart">
            <div className="pr-cart__inner">
              <div className="pr-cart__head">
                <CartIcon />
                <b>{t('pricing.cart')}</b>
                {count > 0 && <span className="pr-cart__count">{count}</span>}
              </div>

              {count === 0 ? (
                <p className="pr-cart__empty">{t('pricing.cart.empty')}</p>
              ) : (
                <ul className="pr-cart__list">
                  {items.map((x) => (
                    <li className="pr-line" key={x.id}>
                      <span className={`pr-line__ic pr-line__ic--${x.kind}`} aria-hidden="true">
                        <SecIcon kind={x.kind} />
                      </span>
                      <span className="pr-line__body">
                        <b>{x.title}</b>
                        <i>{x.subtitle}</i>
                      </span>
                      <button
                        type="button"
                        className="pr-line__del"
                        onClick={() => setItems((prev) => removeItem(prev, x.id))}
                        aria-label={t('pricing.cart.remove')}
                      >
                        <TrashMark />
                      </button>
                      <span className="pr-line__foot">
                        <Stepper qty={x.qty} onBump={(d) => bump(x.id, d)} t={t} />
                        <b className="pr-line__price">{formatPrice(x.price * x.qty)} {CURRENCY}</b>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="pr-cart__total">
                <span>{t('pricing.cart.total')}</span>
                <b>{formatPrice(total)} {CURRENCY}</b>
              </div>

              {sent ? (
                <div className="pr-sent" role="status">
                  <b>{t('pay.sent')}</b>
                  <span>{t('pay.sentSub')}</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="pr-cart__pay"
                    disabled={count === 0}
                    onClick={() => setPayOpen(true)}
                  >
                    {t('pricing.cart.pay')}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <p className="pr-cart__note">
                    <InfoMark />
                    {t('pricing.cart.note')}
                  </p>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      {payOpen && <PaymentMethodModal onClose={() => setPayOpen(false)} onPick={pay} />}
      {/* Плашка в корзине остаётся после закрытия окна — как напоминание. */}
      {sent && !hidNote && (
        <PurchaseSuccessModal title={t('pay.sent')} body={t('pay.sentSub')} onClose={() => setHidNote(true)} />
      )}
    </div>
  )
}

function Stepper({ qty, onBump, t }) {
  return (
    <span className="pr-step">
      <button type="button" onClick={() => onBump(-1)} aria-label={t('pricing.minus')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
      <i>{qty}</i>
      <button type="button" className="is-plus" onClick={() => onBump(1)} aria-label={t('pricing.plus')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
    </span>
  )
}

function SecIcon({ kind }) {
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (kind === 'self') return <svg {...p}><path d="M12 6c-2-1.3-4.5-1.3-7-1v13c2.5-.3 5-.3 7 1 2-1.3 4.5-1.3 7-1V5c-2.5-.3-5-.3-7 1Z" /><path d="M12 6v13" /></svg>
  if (kind === 'group') return <svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 19a5.6 5.6 0 0 0-2-4.2" /></svg>
  return <svg {...p}><circle cx="12" cy="8" r="3.2" /><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" /></svg>
}



function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 4.5h2.3l2.2 10.2a2 2 0 0 0 2 1.6h7.3a2 2 0 0 0 2-1.5L20.5 8H6.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10.5" cy="19.5" r="1.4" fill="currentColor" />
      <circle cx="17" cy="19.5" r="1.4" fill="currentColor" />
    </svg>
  )
}

function TrashMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 6.5h15M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6.5 6.5 7.5 20a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
