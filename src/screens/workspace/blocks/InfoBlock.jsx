import { sanitizeHtml } from '../sanitizeHtml.js'

// info-блок живого урока: заголовок (опционально) + произвольный rich-html
// от учителя/экстрактора. Только для чтения, без answers/checked — как
// banner/theory. html санитизируется перед dangerouslySetInnerHTML (см.
// sanitizeHtml.js), не дублируем эту логику здесь.
export default function InfoBlock({ block }) {
  const html = sanitizeHtml(block?.html)
  if (!html && !block?.title) return null

  return (
    <div className="lw-card lw-info">
      {block?.title && <h3 className="lw-info__title">{block.title}</h3>}
      {html && <div className="lw-info__body" dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
  )
}
