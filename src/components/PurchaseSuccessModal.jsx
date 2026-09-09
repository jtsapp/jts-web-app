import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n.jsx'
import AssetImage from './AssetImage.jsx'
import { useDialogKeys } from '../lib/useDialogKeys.js'

// Окно «сбылось»: поздравление с покупкой и — теми же средствами — принятая
// заявка с витрины. Радостная новость выглядит одинаково, а плашка в углу
// корзины для такого повода слишком тиха: человек только что нажал «перейти к
// оплате» и ждёт ответа, а не ищет глазами, где что-то изменилось.
//
// Когда показывать поздравление, решает App: своей оплаты у приложения нет,
// поэтому событием служит сам факт, что аккаунт перестал быть демо (менеджер
// открыл доступ). Заявку показывает экран витрины. Здесь — только вёрстка.
export default function PurchaseSuccessModal({ onClose, title, body }) {
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
          <AssetImage src="/assets/demo/modal-london.webp" alt="" />
        </div>
        <h2 className="bt-title" id="bt-title">{title || t('bought.title')}</h2>
        <p className="bt-body" id="bt-body">
          {body || (
            <>
              {t('bought.body1')}
              <br />
              {t('bought.body2')}
            </>
          )}
        </p>
        <button type="button" className="bt-ok" ref={okRef} onClick={onClose}>
          {t('bought.ok')}
        </button>
      </div>
    </div>
  )
}
