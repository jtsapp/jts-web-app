import { useI18n } from '../../i18n.jsx'

// Карточка уровня воркбука — та же геометрия, что у GrammarCard
// (gr-gcard / gr-cover), плюс постер-обложка.
export function WorkbookCard({ level, index = 0, onOpen }) {
  const { t } = useI18n()
  const n = index + 1
  const ang = 120 + ((n * 37) % 90)
  const ox = -70 + ((n * 29) % 80)
  const oy = -80 + ((n * 23) % 60)
  const os = 150 + ((n * 13) % 80)
  return (
    <button
      type="button"
      className="gr-gcard"
      onClick={() => onOpen(level.code)}
      aria-label={`Workbook ${level.label}: ${level.title}`}
    >
      <span
        className={`gr-cover${level.poster ? ' gr-cover--poster' : ''}`}
        data-th={level.theme}
        style={{ '--ang': `${ang}deg`, '--ox': `${ox}px`, '--oy': `${oy}px`, '--os': `${os}px` }}
      >
        {level.poster ? (
          <img className="gr-cov-img" src={level.poster} alt="" draggable={false} />
        ) : null}
        <span className="gr-cov-tex" />
        <span className="gr-cov-orb" />
        <span className="gr-cov-arc" />
        <span className="gr-cov-no">{level.label}</span>
        <span className="gr-cov-brand">
          <span className="gr-cov-mark">JTS</span>
          <span className="gr-cov-wm">Just to Study</span>
        </span>
        <span className="gr-cov-ttl">{level.title}</span>
        <span className="gr-cov-tag">{level.tag}</span>
      </span>
      <span className="gr-gcard__body">
        <span className="gr-unit-no">{level.label}</span>
        <span className="gr-gcard__desc">
          {level.units} {t('practice.workbooks.units')} · {level.lessons}{' '}
          {t('practice.workbooks.lessons')}
        </span>
        <span className="gr-gcard__t">⏱ {level.min}m</span>
      </span>
    </button>
  )
}
