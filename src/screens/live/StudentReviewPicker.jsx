import { useI18n } from '../../i18n.jsx'

// Групповой урок — несколько учеников в занятии, и раньше преподаватель видел
// только первого (`participants[0]`) без единого способа переключиться. Ряд
// плиток появляется только когда участников больше одного: для 1-to-1 он был
// бы лишним элементом ради единственного варианта.
export default function StudentReviewPicker({ participants, reviewStudentId, onSelect, onlineUserIds }) {
  const { t } = useI18n()
  if (!participants || participants.length < 2) return null

  return (
    <div className="live-review-picker">
      {participants.map((p) => {
        const online = onlineUserIds?.has(p.studentId)
        const label = p.studentName || `#${p.studentId}`
        return (
          <button
            key={p.studentId}
            type="button"
            className={`live-review-picker__item${p.studentId === reviewStudentId ? ' is-active' : ''}${online ? '' : ' is-offline'}`}
            onClick={() => onSelect(p.studentId)}
            title={label}
            aria-label={t('live.review.pick', { name: label })}
          >
            <span className="live-review-picker__avatar" aria-hidden="true">{(label || '·').trim().charAt(0).toUpperCase()}</span>
            <span className="live-review-picker__name">{label}</span>
            <span className={`live-review-picker__dot${online ? ' is-online' : ''}`} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
