import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n.jsx'
import AssetImage from './AssetImage.jsx'
import { useDialogKeys } from '../lib/useDialogKeys.js'

// «Лимит исчерпан» — окно, в которое упирается ученик, израсходовавший минуты
// голосового тьютора.
//
// Раньше на этом месте была строка текста внутри карточки звонка — человек
// читал «возвращайся завтра» и уходил, хотя минуты можно докупить. Теперь это
// момент продажи: «Вернуться» уводит назад, «Докупить минуты» — на витрину
// пакетов.
//
// `kind` — какой именно лимит кончился (daily / monthly / total), `limitSec` —
// его величина, обе приходят с сервера (см. api/livekit/token/route.js). Число
// в подписи серверное намеренно: у ученика может стоять персональный override
// или лимит тарифа, и своя константа клиента врала бы.
export default function TutorLimitModal({ kind = 'daily', limitSec = 0, onBack, onBuy }) {
  const { t } = useI18n()
  const cardRef = useRef(null)
  const backRef = useRef(null)

  // Фокус на «Вернуться», как в DemoSubscriptionModal: вторая кнопка уводит с
  // экрана, и Enter по инерции выдёргивал бы человека из разговора.
  useEffect(() => {
    backRef.current?.focus()
  }, [])

  useDialogKeys(cardRef, onBack)

  const minutes = Math.max(0, Math.round(limitSec / 60))
  // У пула минут тарифа величина в подписи не нужна: «вы использовали 300 мин»
  // звучит как упрёк, а человеку важно, что минуты кончились и их можно купить.
  const body =
    kind === 'total'
      ? t('limit.bodyTotal')
      : t(kind === 'monthly' ? 'limit.bodyMonthly' : 'limit.bodyDaily', { n: String(minutes) })

  return (
    <div className="lm-over" onClick={onBack}>
      <div
        className="lm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lm-title"
        aria-describedby="lm-body"
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lm-art">
          <AssetImage src="/assets/dexter.png" alt="" />
        </div>
        <h2 className="lm-title" id="lm-title">{t('limit.title')}</h2>
        <p className="lm-body" id="lm-body">{body}</p>
        <div className="lm-acts">
          <button type="button" className="lm-back" ref={backRef} onClick={onBack}>
            {t('demo.paywall.back')}
          </button>
          <button type="button" className="lm-buy" onClick={onBuy}>
            {t('limit.buy')}
          </button>
        </div>
      </div>
    </div>
  )
}
