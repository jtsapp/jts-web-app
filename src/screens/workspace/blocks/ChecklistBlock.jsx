import { useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { sanitizeHtml } from '../sanitizeHtml.js'
import { CheckIcon } from '../../../components/icons.jsx'

/**
 * «You can now…» — самопроверка на закрытие урока (`block.type === 'checklist'`).
 *
 * Источник курса держит галочку перед каждым пунктом прямо в статичной
 * разметке (`<span class="tick">✓</span>`) — в оригинале её включал JS,
 * который наш sanitize() вырезает вместе со всеми `<script>`. Экстрактор
 * отдаёт пункты уже без готовой галочки: сюда приезжает голый список, а
 * «отмечено» — состояние этого компонента, а не текст курса. Ничего не
 * оценивается и никуда не уходит дальше самого ученика — как и переворот
 * карточки в VocabBlock.
 */
export default function ChecklistBlock({ block }) {
  const { t } = useI18n()
  const items = Array.isArray(block?.items) ? block.items.filter(Boolean) : []
  const [done, setDone] = useState(() => new Set())

  if (!items.length) return null

  const toggle = (i) => {
    setDone((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="lw-card lw-checklist">
      {block?.title && <h3 className="lw-checklist__title">{block.title}</h3>}
      <p className="lw-checklist__hint">{t('lesson.ws.checklistHint')}</p>
      <ul className="lw-checklist__list">
        {items.map((html, i) => {
          const isDone = done.has(i)
          return (
            <li key={i}>
              <button
                type="button"
                className={`lw-checklist__item${isDone ? ' is-done' : ''}`}
                aria-pressed={isDone}
                onClick={() => toggle(i)}
              >
                <span className="lw-checklist__box" aria-hidden="true">
                  {isDone && <CheckIcon size={12} />}
                </span>
                <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
