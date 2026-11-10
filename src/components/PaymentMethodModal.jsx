import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n.jsx'
import { useDialogKeys } from '../lib/useDialogKeys.js'

// «Способ оплаты» — последний шаг витрины тарифов.
//
// Диалог собран по образцу DemoSubscriptionModal (роль, aria-modal, подпись
// заголовком, Esc, клик по подложке, замок фокуса): два модальных окна в одном
// приложении должны вести себя одинаково, иначе клавиатурная навигация в одном
// из них внезапно перестаёт работать.
//
// Сам платёж отсюда не проводится: `onPick` получает выбранный способ, а куда
// он ведёт, решает экран (см. PricingPage): «card» — заказ и страница оплаты
// Freedom Pay, остальные — менеджер.
// Kaspi напрямую не подключён: кнопка вела бы к менеджеру, а обещание
// автоматической оплаты, которой нет, злит сильнее её отсутствия. Разметка и
// знак банка оставлены целиком — включить обратно значит поставить здесь true.
const KASPI_ENABLED = false

export default function PaymentMethodModal({ onClose, onPick }) {
  const { t } = useI18n()
  const cardRef = useRef(null)
  const firstRef = useRef(null)

  useEffect(() => {
    firstRef.current?.focus()
  }, [])

  useDialogKeys(cardRef, onClose)

  return (
    <div className="pm-over" onClick={onClose}>
      <div
        className="pm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pm-title"
        aria-describedby="pm-sub"
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="pm-x" onClick={onClose} aria-label={t('common.close')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>

        <h2 className="pm-title" id="pm-title">{t('pay.title')}</h2>
        <p className="pm-sub" id="pm-sub">{t('pay.sub')}</p>

        {/* Карта — через Freedom Pay. Если платёж не создался (эквайринг не
            настроен или не ответил), экран уводит к менеджеру. */}
        <button type="button" className="pm-main" ref={firstRef} onClick={() => onPick?.('card')}>
          <span className="pm-main__ic" aria-hidden="true"><CardMark /></span>
          <span className="pm-main__body">
            <b>{t('pay.card')}</b>
            <span>{t('pay.cardSub')}</span>
          </span>
          <span className="pm-main__chev" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        {KASPI_ENABLED && (
        <button type="button" className="pm-main" onClick={() => onPick?.('kaspi')}>
          <span className="pm-main__ic" aria-hidden="true"><KaspiMark /></span>
          <span className="pm-main__body">
            <b>{t('pay.kaspi')}</b>
            <span>{t('pay.kaspiSub')}</span>
          </span>
          <span className="pm-main__chev" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
        )}

        <div className="pm-alt">
          <button type="button" className="pm-opt" onClick={() => onPick?.('manager')}>
            <b>{t('pay.manager')}</b>
            <span>{t('pay.managerSub')}</span>
            <i className="pm-opt__chev" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </i>
          </button>
          <button type="button" className="pm-opt" onClick={() => onPick?.('callback')}>
            <b>{t('pay.callback')}</b>
            <span>{t('pay.callbackSub')}</span>
            <i className="pm-opt__chev" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </i>
          </button>
        </div>
      </div>
    </div>
  )
}

// Значок банковской карты — нейтральный, без знаков платёжных систем.
function CardMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#1f8a4c" />
      <rect x="7.5" y="10" width="17" height="12" rx="2" fill="none" stroke="#fff" strokeWidth="1.8" />
      <path d="M7.5 14h17" stroke="#fff" strokeWidth="2.2" />
      <path d="M10.5 18.5h4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

// Знак Kaspi рисуем сами: логотипа банка в public/ нет, а тянуть чужую
// картинку с их сервера в вёрстку нельзя (и CSP такое не пропустит).
function KaspiMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#f14635" />
      <path d="M16 6.5 22.5 13h-4.1v6h-4.8v-6H9.5L16 6.5Z" fill="#fff" />
      <rect x="9.5" y="21" width="13" height="4.5" rx="2.25" fill="#fff" />
    </svg>
  )
}
