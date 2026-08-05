import { useI18n } from '../i18n.jsx'

// Показывается вместо раздела практики, когда квота на него исчерпана
// (см. usePracticeEntitlement). Своя вёрстка, а не общий .soon: тот рассчитан
// на блок «Скоро» внутри страницы (фиксированные 276px, прижат к верху), а это
// полноэкранный takeover — его нужно центрировать по обеим осям.
export default function PracticeLimitScreen({ limit, onBack }) {
  const { t } = useI18n()
  const n = limit ?? 0
  return (
    <div className="pl-limit">
      <div className="pl-limit__card">
        <b className="pl-limit__title">🔒 {t('practice.limit.title')}</b>
        {/* Лимит 0 — это «раздел закрыт», а не «доступно до 0»: отдельная
            формулировка, иначе фраза читается как ошибка. */}
        <span className="pl-limit__body">
          {n === 0 ? t('practice.limit.bodyNone') : t('practice.limit.body', { n: String(n) })}
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
