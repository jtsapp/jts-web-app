import { useI18n } from '../../i18n.jsx'

// Сложность — словами College Board (Easy/Medium/Hard), как на экзамене; на сервере это 1–3
export const DIFFICULTIES = [[1, 'Easy'], [2, 'Medium'], [3, 'Hard']]
export const ANSWERS = ['right', 'wrong', 'new']
export const EMPTY_FILTERS = { difficulty: [], status: [] }

export function toggleIn(list, v) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

/** Фильтр задания на клиенте — те же правила, что SatPracticeFilter на сервере: ИЛИ внутри блока, И между блоками. */
export function matchesFilters(filters, difficulty, lastCorrect) {
  if (filters.difficulty.length && !filters.difficulty.includes(difficulty)) return false
  if (!filters.status.length) return true
  const answer = lastCorrect == null ? 'new' : lastCorrect ? 'right' : 'wrong'
  return filters.status.includes(answer)
}

/**
 * Фильтры практики в два блока (ТЗ SAT 21.10, задача 5): «Сложность» и «Ответы». Раньше всё лежало одним списком,
 * и «сложные, где я ошибся» отфильтровать было нельзя. Счётчик подходящих — у вызывающего (он знает, что считать).
 */
export default function FilterBlocks({ value, onChange, count }) {
  const { t } = useI18n()
  const any = value.difficulty.length > 0 || value.status.length > 0
  return (
    <div className="st-filters">
      <span className="st-sess__label">{t('sat.filters.difficulty')}</span>
      <div className="st-sess__filters">
        {DIFFICULTIES.map(([d, label]) => (
          <button key={d} type="button" aria-pressed={value.difficulty.includes(d)} className={value.difficulty.includes(d) ? 'is-on' : ''}
            onClick={() => onChange({ ...value, difficulty: toggleIn(value.difficulty, d) })}>{label}</button>
        ))}
      </div>
      <span className="st-sess__label">{t('sat.filters.answers')}</span>
      <div className="st-sess__filters">
        {ANSWERS.map((a) => (
          <button key={a} type="button" aria-pressed={value.status.includes(a)} className={value.status.includes(a) ? 'is-on' : ''}
            onClick={() => onChange({ ...value, status: toggleIn(value.status, a) })}>{t(`sat.filters.${a}`)}</button>
        ))}
      </div>
      <div className="st-filters__foot">
        {count != null && <span className="st-muted">{t('sat.filters.count', { n: String(count) })}</span>}
        {any && <button type="button" className="st-link" onClick={() => onChange(EMPTY_FILTERS)}>{t('sat.filters.reset')}</button>}
      </div>
    </div>
  )
}
