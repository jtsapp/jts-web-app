import { useI18n } from '../../../i18n.jsx'

// Подсвечивает первое вхождение `accent` в `text` фиолетовым. Простое
// выделение по вхождению — если подстрока не найдена (например, составной
// accent из нескольких несмежных слов в примерном уроке), просто ничего не
// подсвечиваем, текст остаётся как есть.
function highlight(text, accent) {
  if (!accent) return text
  const idx = text.indexOf(accent)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="lw-table__accent">{text.slice(idx, idx + accent.length)}</span>
      {text.slice(idx + accent.length)}
    </>
  )
}

export default function TheoryBlock({ block }) {
  const { t } = useI18n()
  const mistakeText = typeof block?.mistake === 'string' ? block.mistake : block?.mistake?.text

  return (
    <div className="lw-card lw-theory">
      <div className="lw-theory__head">
        <span className="lw-theory__kicker">{t('lesson.ws.theory')}</span>
        {block?.minutes != null && (
          <span className="lw-theory__minutes">{t('lesson.ws.minutes', { n: block.minutes })}</span>
        )}
      </div>

      {block?.title && <h3 className="lw-theory__title">{block.title}</h3>}
      {block?.text && <p className="lw-theory__text">{block.text}</p>}

      {Array.isArray(block?.forms) && block.forms.length > 0 && (
        <div className="lw-forms">
          {block.forms.map((form, i) => (
            <span key={i} className={`lw-form-chip${form.accent ? ' accent' : ''}`}>
              {form.label} <b>{form.example}</b>
            </span>
          ))}
        </div>
      )}

      {Array.isArray(block?.table) && block.table.length > 0 && (
        <div className="lw-table">
          {block.table.map((row, i) => (
            <div key={i} className="lw-table__row">
              <span className="lw-table__kind">{row.kind}</span>
              <span className="lw-table__example">{highlight(row.example, row.accent)}</span>
            </div>
          ))}
        </div>
      )}

      {mistakeText && (
        <div className="lw-mistake" role="note">
          <span className="lw-mistake__icon" aria-hidden="true">⚠</span>
          <div className="lw-mistake__body">
            <b>{t('lesson.ws.mistake')}</b>
            {mistakeText}
          </div>
        </div>
      )}
    </div>
  )
}
