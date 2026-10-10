import { SECTION_META, SectionTile, sectionStyle } from '../sections.jsx'
import Chip from './Chip.jsx'
import ProgressBar from './ProgressBar.jsx'
import { ArrowForwardIcon } from '../icons.jsx'

// Карточка секции во вкладке «Обучение» (Figma «Обучение — все тренажёры»): плитка, название, подпись цвета
// секции и строки-входы в тренажёры. Строка без onClick — «скоро».
//
// row: { key, title, text, meta, progress: { value, max }, onClick, soon, badge } — badge: подпись чипа вместо «скоро»
export function SkillRow({ row, soonLabel }) {
  const { title, text, meta, progress, onClick, soon, badge } = row
  const body = (
    <>
      <span className="ih-skill__row-body">
        <b>{title}</b>
        {text && <span className="ih-skill__row-text">{text}</span>}
        {(progress || meta) && (
          <span className="ih-skill__row-meta">
            {progress && <ProgressBar value={progress.value} max={progress.max} label={meta} />}
            {meta && <span>{meta}</span>}
          </span>
        )}
      </span>
      {soon ? (
        <Chip tone="muted" size="sm">
          {badge || soonLabel}
        </Chip>
      ) : (
        <span className="ih-skill__go" aria-hidden="true">
          <ArrowForwardIcon size={20} />
        </span>
      )}
    </>
  )
  return soon || !onClick ? (
    <div className={`ih-skill__row ${soon ? 'ih-skill__row--soon' : ''}`}>{body}</div>
  ) : (
    <button type="button" className="ih-skill__row" onClick={onClick}>
      {body}
    </button>
  )
}

export default function SkillCard({ section, subtitle, rows, soonLabel }) {
  return (
    <section className="ih-skill" style={sectionStyle(section)}>
      <header className="ih-skill__head">
        <SectionTile section={section} size={48} iconSize={24} />
        <div>
          <h2>{SECTION_META[section].name}</h2>
          {subtitle && <span className="ih-skill__sub">{subtitle}</span>}
        </div>
      </header>
      <div className="ih-skill__rows">
        {rows.map((r) => (
          <SkillRow key={r.key} row={r} soonLabel={soonLabel} />
        ))}
      </div>
    </section>
  )
}
