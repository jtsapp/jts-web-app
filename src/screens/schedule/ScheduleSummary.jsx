import { useI18n } from '../../i18n.jsx'

export default function ScheduleSummary({ summary }) {
  const { t } = useI18n()
  if (!summary) return null
  const tiles = ['conducted', 'remaining', 'cancelled', 'rescheduled']
  return (
    <div className="sch__summary">
      {tiles.map((key) => (
        <div key={key} className={`sch-tile sch-tile--${key}`}>
          <div className="sch-tile__num">{summary[key] ?? 0}</div>
          <div className="sch-tile__label">{t(`schedule.summary.${key}`)}</div>
        </div>
      ))}
    </div>
  )
}
