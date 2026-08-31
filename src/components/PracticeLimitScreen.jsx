import { useI18n } from '../i18n.jsx'
import DemoSubscriptionModal from './DemoSubscriptionModal.jsx'

// Показывается вместо раздела практики, когда квота на него исчерпана
// (см. usePracticeEntitlement). Своя вёрстка, а не общий .soon: тот рассчитан
// на блок «Скоро» внутри страницы (фиксированные 276px, прижат к верху), а это
// полноэкранный takeover — его нужно центрировать по обеим осям.
//
// source (STUDENT / PLAN / SUBSCRIPTION / DEMO / NONE) задаёт текст: лимит
// абонемента/подписки отличается от демо и от точечного override куратора.
// DEMO — не заглушка вовсе, а модалка про подписку (см. ниже).
export default function PracticeLimitScreen({
  limit,
  onBack,
  isDemoAccount,
  source = 'NONE',
  sourceName = null,
}) {
  const { t } = useI18n()
  const n = limit ?? 0
  const none = n === 0
  const resolvedSource = source && source !== 'NONE'
    ? source
    : (isDemoAccount ? 'DEMO' : 'STUDENT')
  const name = sourceName || ''

  // Демо-лимит — это момент продажи, а не сообщение об ошибке: показываем
  // модалку «доступно по подписке» поверх раздела, а не заглушку вместо него.
  // Закрытие модалки (кнопка, Esc, клик по подложке) ведёт туда же, куда вела
  // «Назад» этой заглушки, — onBack у всех вызывающих экранов один и тот же.
  // Остальные источники лимита остались прежним текстом: у абонемента и
  // подписки причина отказа другая, и покупать подписку им незачем.
  if (resolvedSource === 'DEMO') return <DemoSubscriptionModal onClose={onBack} />

  let body
  if (resolvedSource === 'PLAN') {
    body = none
      ? t('practice.limit.planBodyNone', { name })
      : t('practice.limit.planBody', { n: String(n), name })
  } else if (resolvedSource === 'SUBSCRIPTION') {
    body = none
      ? t('practice.limit.subBodyNone', { name })
      : t('practice.limit.subBody', { n: String(n), name })
  } else {
    body = none ? t('practice.limit.bodyNone') : t('practice.limit.body', { n: String(n) })
  }

  return (
    <div className="pl-limit">
      <div className="pl-limit__card">
        <b className="pl-limit__title">🔒 {t('practice.limit.title')}</b>
        <span className="pl-limit__body">{body}</span>
        {onBack && (
          <button type="button" className="pl-limit__back" onClick={onBack}>
            ← {t('schedule.back')}
          </button>
        )}
      </div>
    </div>
  )
}
