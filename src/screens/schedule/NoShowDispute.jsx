import { useI18n } from '../../i18n.jsx'

/**
 * Отметка «не пришёл» в строке урока. Ученик в платформе ничего не оспаривает (ТЗ «Отметка уроков», версия 2): пока идут
 * 24 часа после отметки, подсказка «напишите менеджеру» — оспаривает он; потом — статус заявки, если менеджер её подал.
 */
export default function NoShowDispute({ deadline, status }) {
  const { t } = useI18n()

  if (status) {
    return <span className={`sch-badge sch-badge--dispute-${status.toLowerCase()}`}>{t(`schedule.dispute.status.${status}`)}</span>
  }
  if (!deadline) return null
  return <p className="sch-row__dispute-note">{t('schedule.dispute.writeManager')}</p>
}
