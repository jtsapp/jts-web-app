import { useMemo } from 'react'
import TapText from '../TapText.jsx'
import { sanitizeHtml } from '../sanitizeHtml.js'

export default function WritingBlock({ block, answer, onAnswer, readOnly, onWord, answerKey }) {
  const html = useMemo(() => sanitizeHtml(block?.html), [block?.html])
  const key = block?.id || answerKey
  return (
    <div className="lw-card lw-writing">
      {block?.title && <TapText as="h3" className="lw-practice__title" text={block.title} onWord={onWord} />}
      {block?.instruction && (
        <TapText as="p" className="lw-practice__instruction" text={block.instruction} onWord={onWord} />
      )}
      {html && <div className="lw-practice__html" dangerouslySetInnerHTML={{ __html: html }} />}
      <textarea
        className="lw-writing__field"
        placeholder={block?.placeholder || ''}
        rows={6}
        value={typeof answer === 'string' ? answer : ''}
        readOnly={!!readOnly}
        onChange={(e) => key && onAnswer?.(key, e.target.value)}
      />
    </div>
  )
}
