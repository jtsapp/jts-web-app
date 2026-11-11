import { useI18n } from '../../i18n.jsx'
import { lessonMove } from './lessonFormat.js'

// «Перенесено с 12 ноября, 18:00» у урока на новом месте и «Перенесено на …» у
// исходного, сгоревшего при позднем переносе: ученик видит, куда делся урок
// (обратная связь 11.11, вместо счётчика «Перенесено»).
export default function MovedNote({ occ }) {
  const { t, lang } = useI18n()
  const move = lessonMove(occ, lang || 'ru')
  if (!move) return null
  return (
    <div className="sch-moved" data-testid="lesson-moved">
      {t(move.key, { when: move.when })}
    </div>
  )
}
