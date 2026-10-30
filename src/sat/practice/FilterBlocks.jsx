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
 *
 * Вид «Практики» по макету NEW 2 (17:2184) — по желанию, чтобы «Ошибки» не поменялись заодно:
 *  - variant='counted' — чипы без рамки (выбранный чёрный), «Сбросить» в строке заголовка «Сложность»;
 *  - counts — { difficulty: {1, 2, 3}, status: {right, wrong, new} }: число справа на чипе;
 *  - hint — пояснение под блоками («Внутри блока выбор складывается…»).
 */
export default function FilterBlocks({ value, onChange, count, counts, variant = 'default', hint }) {
  const { t } = useI18n()
  const any = value.difficulty.length > 0 || value.status.length > 0
  const counted = variant === 'counted'
  const reset = any && (
    <button type="button" className={counted ? 'st-filters__reset' : 'st-link'} onClick={() => onChange(EMPTY_FILTERS)}>
      {t(counted ? 'sat.filters.resetShort' : 'sat.filters.reset')}
    </button>
  )
  const chip = (key, on, label, n, onClick) => (
    <button key={key} type="button" aria-pressed={on} className={on ? 'is-on' : ''} onClick={onClick}>
      {label}
      {/* пробел — чтобы читалка называла «Medium 252», а не «Medium252» */}
      {n != null && <>{' '}<span className="st-filters__n">{n}</span></>}
    </button>
  )
  return (
    <div className={`st-filters ${counted ? 'st-filters--counted' : ''}`}>
      {counted ? (
        <div className="st-filters__head">
          <span className="st-sess__label">{t('sat.filters.difficulty')}</span>
          {reset}
        </div>
      ) : <span className="st-sess__label">{t('sat.filters.difficulty')}</span>}
      <div className="st-sess__filters">
        {DIFFICULTIES.map(([d, label]) => (
          chip(d, value.difficulty.includes(d), label, counts?.difficulty?.[d],
            () => onChange({ ...value, difficulty: toggleIn(value.difficulty, d) }))
        ))}
      </div>
      <span className="st-sess__label">{t('sat.filters.answers')}</span>
      <div className="st-sess__filters">
        {ANSWERS.map((a) => (
          chip(a, value.status.includes(a), t(`sat.filters.${a}`), counts?.status?.[a],
            () => onChange({ ...value, status: toggleIn(value.status, a) }))
        ))}
      </div>
      {hint && <p className="st-filters__hint">{hint}</p>}
      {(count != null || (!counted && any)) && (
        <div className="st-filters__foot">
          {count != null && <span className="st-muted">{t('sat.filters.count', { n: String(count) })}</span>}
          {!counted && reset}
        </div>
      )}
    </div>
  )
}
