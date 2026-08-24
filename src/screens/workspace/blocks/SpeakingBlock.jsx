import { useMemo } from 'react'
import TapText from '../TapText.jsx'
import { sanitizeHtml } from '../sanitizeHtml.js'

export default function SpeakingBlock({ block, onWord }) {
  const steps = block?.steps || []
  const phrases = block?.usefulPhrases || []
  const html = useMemo(() => sanitizeHtml(block?.html), [block?.html])
  return (
    <div className="lw-card lw-speaking">
      {block?.title && <TapText as="h3" className="lw-practice__title" text={block.title} onWord={onWord} />}
      {block?.instruction && (
        <TapText as="p" className="lw-practice__instruction" text={block.instruction} onWord={onWord} />
      )}
      {block?.taskDescription && (
        <TapText as="p" className="lw-speaking__task" text={block.taskDescription} onWord={onWord} />
      )}
      {steps.length > 0 && (
        <ol className="lw-speaking__steps">
          {steps.map((step, i) => (
            <li key={i}>
              <TapText as="span" text={step} onWord={onWord} />
            </li>
          ))}
        </ol>
      )}
      {phrases.length > 0 && (
        <ul className="lw-speaking__phrases">
          {phrases.map((line, i) => (
            <li key={i}>
              <TapText as="span" text={line} onWord={onWord} />
            </li>
          ))}
        </ul>
      )}
      {html && <div className="lw-practice__html" dangerouslySetInnerHTML={{ __html: html }} />}
      {block?.hasRecorder && (
        <p className="lw-speaking__rec">Speak with your teacher — say the lines out loud.</p>
      )}
    </div>
  )
}
