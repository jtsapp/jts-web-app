import PillButton from '../ui/PillButton.jsx'
import Chip from '../ui/Chip.jsx'
import { SectionTile } from '../sections.jsx'
import { CheckIcon } from '../icons.jsx'
import { useI18n } from '../../i18n.jsx'

// Строка плана дня: плитка секции, название и «почему именно это», минуты и
// действие. Закрытая задача зачёркнута и вместо кнопки несёт галочку;
// рекомендованная подсвечена рамкой и чипом «Начните с этого».
export default function PlanTaskRow({ task, recommended, onStart }) {
  const { t } = useI18n()
  const { section, title, reason, minutes, done } = task
  return (
    <li className={`ih-task ${done ? 'ih-task--done' : ''} ${recommended ? 'ih-task--rec' : ''}`}>
      <SectionTile section={section} />
      <div className="ih-task__body">
        <div className="ih-task__top">
          <span className="ih-task__title">{title}</span>
          {recommended && (
            <Chip tone="solid" size="sm">
              {t('ieltsHub.plan.startHere')}
            </Chip>
          )}
        </div>
        {reason && <span className="ih-task__reason">{reason}</span>}
      </div>
      <span className="ih-task__min">{t('ieltsHub.minutes', { n: String(minutes) })}</span>
      {done ? (
        <span className="ih-task__check" role="img" aria-label={t('ieltsHub.plan.done')}>
          <CheckIcon size={20} />
        </span>
      ) : (
        <PillButton variant={recommended ? 'primary' : 'soft'} onClick={() => onStart?.(task)}>
          {t('ieltsHub.plan.start')}
        </PillButton>
      )}
    </li>
  )
}
