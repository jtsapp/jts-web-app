import { useI18n } from '../../../i18n.jsx'
import { ReplayIcon } from '../../icons.jsx'
import { useIeltsReviewCount } from './drillProgress.js'

/**
 * Карточка «Повторить ошибки (N)» для хаба IELTS (ТЗ §3.1, замечание A8): очередь ошибок коротких тренировок и
 * упражнений разбора лежит на сервере (/mobile/ielts/review). Пустая очередь — карточки нет. onOpen — открыть
 * повторение (вид хаба writing-drills, testId 'review').
 */
export default function ReviewCard({ token, onOpen, className = '' }) {
  const { t } = useI18n()
  const { count } = useIeltsReviewCount(token)
  if (!count) return null
  return (
    <section className={`ih-card ih-wdrill-review ${className}`.trim()}>
      <div className="ih-wdrill-review__text">
        <h3>{t('ieltsWDrill.reviewCard.title', { n: String(count) })}</h3>
        <p className="ih-muted">{t('ieltsWDrill.reviewCard.text')}</p>
      </div>
      <button type="button" className="ih-btn2 ih-btn2--primary" onClick={onOpen}>
        <ReplayIcon size={14} />
        <span>{t('ieltsWDrill.reviewCard.start')}</span>
      </button>
    </section>
  )
}
