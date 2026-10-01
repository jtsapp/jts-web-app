import Card from '../ui/Card.jsx'
import Chip from '../ui/Chip.jsx'
import { CheckIcon, EventIcon } from '../icons.jsx'
import { daysUntil, roadmapView } from '../model/dashboard.js'
import { formatDate } from '../format.js'
import { useI18n } from '../../i18n.jsx'

function phaseChip(phase, t, lang) {
  const { status, milestonesDone, milestonesTotal, eta } = phase
  const counts = { done: String(milestonesDone), total: String(milestonesTotal) }
  const hasMilestones = milestonesDone != null && milestonesTotal != null
  if (status === 'done') {
    return (
      <Chip tone="green" size="sm">
        {hasMilestones ? t('ieltsHub.roadmap.doneN', counts) : t('ieltsHub.roadmap.done')}
      </Chip>
    )
  }
  if (status === 'current') {
    return (
      <Chip tone="violet" size="sm">
        {hasMilestones ? t('ieltsHub.roadmap.nowN', counts) : t('ieltsHub.roadmap.now')}
      </Chip>
    )
  }
  if (!eta) return null
  return (
    <Chip tone="muted" size="sm">
      {t('ieltsHub.roadmap.eta', { date: formatDate(eta, lang, true) })}
    </Chip>
  )
}

// Фаза дорожки: кружок (галочка или номер), линия до следующей, название,
// пояснение и статус-чип.
function RoadmapPhase({ phase }) {
  const { t, lang } = useI18n()
  const { key, n, status } = phase
  return (
    <li className={`ih-phase ih-phase--${status}`} aria-current={status === 'current' ? 'step' : undefined}>
      <div className="ih-phase__track">
        <span className="ih-phase__dot">{status === 'done' ? <CheckIcon size={16} /> : n}</span>
        <span className="ih-phase__line" aria-hidden="true" />
      </div>
      <b className="ih-phase__title">{t(`ieltsHub.roadmap.${key}.title`)}</b>
      <span className="ih-phase__text">{t(`ieltsHub.roadmap.${key}.text`)}</span>
      {phaseChip(phase, t, lang)}
    </li>
  )
}

// «Путь до экзамена» (ТЗ §11, блок 2): четыре фазы подготовки и дата экзамена.
// Без даты экзамена фазы идут по вехам, без ориентиров по датам.
export default function ExamRoadmapCard({ roadmap, examDate, startDate }) {
  const { t, lang } = useI18n()
  const days = daysUntil(examDate)
  const phases = roadmapView(roadmap, { examDate, startDate })
  return (
    <Card
      className="ih-roadmap"
      title={t('ieltsHub.roadmap.title')}
      titleSize="lg"
      aside={
        <Chip tone="neutral" icon={<EventIcon size={18} />} className="ih-chip--soft-ink">
          {days != null && days >= 0
            ? t('ieltsHub.roadmap.exam', { date: formatDate(examDate, lang), days: String(days) })
            : t('ieltsHub.roadmap.noExam')}
        </Chip>
      }
    >
      <ol className="ih-roadmap__phases">
        {phases.map((p) => (
          <RoadmapPhase key={p.key} phase={p} />
        ))}
      </ol>
    </Card>
  )
}
