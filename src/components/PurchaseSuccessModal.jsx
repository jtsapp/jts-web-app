import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n.jsx'
import AssetImage from './AssetImage.jsx'
import { useDialogKeys } from '../lib/useDialogKeys.js'

// «Поздравляем с покупкой!» — окно поверх того экрана, на котором ученика
// застало открытие полного доступа.
//
// Когда оно показывается, решает App: своей оплаты у приложения нет, поэтому
// событием служит сам факт, что аккаунт перестал быть демо (менеджер открыл
// доступ). Здесь — только вёрстка и одна кнопка: закрыть.
export default function PurchaseSuccessModal({ onClose }) {
  const { t } = useI18n()
  const cardRef = useRef(null)
  const okRef = useRef(null)

  useEffect(() => {
    okRef.current?.focus()
  }, [])

  useDialogKeys(cardRef, onClose)

  return (
    <div className="bt-over" onClick={onClose}>
      <div
        className="bt-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bt-title"
        aria-describedby="bt-body"
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bt-art">
          <AssetImage src="/assets/hero-london.jpg" alt="" />
        </div>
        <h2 className="bt-title" id="bt-title">{t('bought.title')}</h2>
        <p className="bt-body" id="bt-body">
          {t('bought.body1')}
          <br />
          {t('bought.body2')}
        </p>
        <button type="button" className="bt-ok" ref={okRef} onClick={onClose}>
          {t('bought.ok')}
        </button>
      </div>
    </div>
  )
}
