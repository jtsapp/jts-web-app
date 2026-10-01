import Card from '../ui/Card.jsx'
import ProgressRing from '../ui/ProgressRing.jsx'
import PillButton from '../ui/PillButton.jsx'
import PlanTaskRow from './PlanTaskRow.jsx'
import { SyncIcon } from '../icons.jsx'
import { planSummary, recommendedTaskId } from '../model/dashboard.js'
import { formatDuration } from '../format.js'
import { useI18n } from '../../i18n.jsx'

// «План на день» (ТЗ §11, блок 1): кольцо закрытых задач, общая длительность и
// остаток, список задач. «Пересобрать» просит план заново — сейчас это
// перечитывание данных, с бэкендом станет запросом нового плана.
export default function DailyPlanCard({ tasks, onStart, onRebuild }) {
  const { t } = useI18n()
  const s = planSummary(tasks)
  const recId = recommendedTaskId(tasks)
  return (
    <Card className="ih-plan">
      <div className="ih-plan__head">
        <ProgressRing
          value={s.done}
          max={s.count}
          label={`${s.done}/${s.count}`}
          ariaLabel={t('ieltsHub.plan.ringAria', { done: String(s.done), count: String(s.count) })}
        />
        <div className="ih-plan__title">
          <h2>{t('ieltsHub.plan.title')}</h2>
          <span>
            {t('ieltsHub.plan.summary', {
              total: formatDuration(s.totalMinutes, t),
              left: t('ieltsHub.minutes', { n: String(s.leftMinutes) }),
            })}
          </span>
        </div>
        <PillButton variant="outline" icon={<SyncIcon size={16} />} onClick={onRebuild}>
          {t('ieltsHub.plan.rebuild')}
        </PillButton>
      </div>
      <ul className="ih-plan__list">
        {tasks.map((task) => (
          <PlanTaskRow key={task.id} task={task} recommended={task.id === recId} onStart={onStart} />
        ))}
      </ul>
    </Card>
  )
}
