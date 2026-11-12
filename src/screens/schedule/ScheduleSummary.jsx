import { useI18n } from '../../i18n.jsx'

export default function ScheduleSummary({ summary }) {
  const { t } = useI18n()
  if (!summary) return null
  // «Отменено» и «Перенесено» ученику не показываем (решение 11.11): счётчики
  // путали, а куда перенесён урок, видно в самом расписании.
  const tiles = ['conducted', 'remaining']
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
