import { useI18n } from '../i18n.jsx'
import { SUPPORT_WHATSAPP_URL } from '../lib/support.js'

// Показывается вместо раздела практики, когда квота на него исчерпана
// (см. usePracticeEntitlement). Своя вёрстка, а не общий .soon: тот рассчитан
// на блок «Скоро» внутри страницы (фиксированные 276px, прижат к верху), а это
// полноэкранный takeover — его нужно центрировать по обеим осям.
//
// isDemoAccount переключает текст на демо-версию со ссылкой на WhatsApp
// поддержки: лимит бывает и не демо-природы (персональный override от
// менеджера), тогда показываем прежний нейтральный текст «свяжитесь с
// куратором» без WhatsApp-CTA.
export default function PracticeLimitScreen({ limit, onBack, isDemoAccount }) {
  const { t } = useI18n()
  const n = limit ?? 0
  const none = n === 0
  return (
    <div className="pl-limit">
      <div className="pl-limit__card">
        <b className="pl-limit__title">🔒 {t('practice.limit.title')}</b>
        {/* Лимит 0 — это «раздел закрыт», а не «доступно до 0»: отдельная
            формулировка, иначе фраза читается как ошибка. */}
        <span className="pl-limit__body">
          {isDemoAccount ? (
            <>
              {none ? t('practice.limit.demoBodyNone') : t('practice.limit.demoBody', { n: String(n) })}{' '}
              <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                {t('demo.cta')}
              </a>
            </>
          ) : none ? (
            t('practice.limit.bodyNone')
          ) : (
            t('practice.limit.body', { n: String(n) })
          )}
        </span>
        {onBack && (
          <button type="button" className="pl-limit__back" onClick={onBack}>
            ← {t('schedule.back')}
          </button>
        )}
      </div>
    </div>
  )
}
