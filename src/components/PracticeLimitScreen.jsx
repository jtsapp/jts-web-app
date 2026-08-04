import { useI18n } from '../i18n.jsx'

// Показывается вместо раздела практики, когда демо-квота на него исчерпана
// (см. usePracticeEntitlement). Тот же принцип, что и .soon у "Клубов" в
// LessonsPage — простая по центру карточка, без похода в контент.
export default function PracticeLimitScreen({ limit, onBack }) {
  const { t } = useI18n()
  return (
    <div className="soon">
      <div className="soon__text">
        <b>🔒 {t('practice.limit.title')}</b>
        <span>{t('practice.limit.body', { n: String(limit ?? 0) })}</span>
      </div>
      {onBack && (
        <button type="button" className="live__back" onClick={onBack}>
          ← {t('schedule.back')}
        </button>
      )}
    </div>
  )
}
