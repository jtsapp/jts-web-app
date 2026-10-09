// Данные вкладки «Прогресс» (Figma «Прогресс»): из ответа GET /mobile/ielts/progress.

// Понедельник недели даты 'YYYY-MM-DD' — тоже строкой: график строится по неделям, а не по дням замеров.
export function weekStart(iso) {
  const d = new Date(`${iso}T00:00:00Z`)
  const shift = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - shift)
  return d.toISOString().slice(0, 10)
}

/**
 * «Балл по неделям»: последний overall каждой недели, где он был; недели по порядку. `n` — номер недели от первой:
 * по нему точка встаёт на ось времени, иначе пропущенные недели схлопывались и две недели выглядели как одна.
 */
export function weeklyOverall(history) {
  const byWeek = new Map()
  for (const p of history || []) if (p.overall != null) byWeek.set(weekStart(p.date), p.overall)
  const weeks = [...byWeek.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
  const first = weeks.length ? Date.parse(`${weeks[0][0]}T00:00:00Z`) : 0
  return weeks.map(([week, band]) => ({ week, band, n: Math.round((Date.parse(`${week}T00:00:00Z`) - first) / (7 * 864e5)) }))
}

/** Шкала графика: шаг 0.5, не уже 1.5 балла, цель — в пределах шкалы. */
export function chartScale(values, target) {
  const all = [...values, ...(target != null ? [target] : [])]
  let hi = Math.ceil(Math.max(...all) * 2) / 2
  let lo = Math.floor(Math.min(...values) * 2) / 2
  if (hi - lo < 1.5) lo = hi - 1.5
  const ticks = []
  for (let v = lo; v <= hi + 1e-9; v += 0.5) ticks.push(Math.round(v * 10) / 10)
  return { lo, hi, ticks }
}

/** Плитка точности: high ≥ 70 %, mid 50–69 %, low < 50 % (легенда Figma), none — ответов нет. */
export function accuracyTone(correct, total) {
  if (!total) return 'none'
  const acc = (correct / total) * 100
  return acc >= 70 ? 'high' : acc >= 50 ? 'mid' : 'low'
}

// Подписи плиток — английские во всех языках (как на экзамене) и короткие, как в макете Figma «Прогресс».
export const TILE_LABEL = {
  tfng: 'True / False / Not Given',
  ynng: 'Yes / No / Not Given',
  matching_headings: 'Matching headings',
  matching_information: 'Matching information',
  matching_features: 'Matching features',
  matching_sentence_endings: 'Sentence endings',
  multiple_choice_single: 'Multiple choice',
  multiple_choice_multi: 'Multiple choice (several)',
  summary_completion: 'Summary completion',
  sentence_completion: 'Sentence completion',
  diagram_label: 'Diagram labelling',
  short_answer: 'Short answer',
  form_completion: 'Form completion',
  note_completion: 'Note completion',
  table_completion: 'Table completion',
  flow_chart_completion: 'Flow-chart completion',
  matching: 'Matching',
  map_labelling: 'Map labelling',
  note_table_flow: 'Note / table / flow-chart',
}

// В Reading у макета 12 плиток, и note/table/flow-chart среди них нет, а в банке такие вопросы есть: их ответы
// сводятся в одну плитку — она появляется, только если ученик на них отвечал.
const READING_EXTRA_GROUP = { note_completion: 'note_table_flow', table_completion: 'note_table_flow', flow_chart_completion: 'note_table_flow' }
const NOT_TILES = new Set(['dictation', 'spelling'])

/**
 * Плитки секции: сначала список типов с бэкенда (плитки макета), затем встреченные вне его — у Reading сведённые
 * в группу. Диктовка и правописание — не типы вопросов экзамена, плиток у них нет.
 */
export function typeTiles(list, rows, section = 'reading') {
  const base = list || []
  const acc = new Map(base.map((t) => [t, { correct: 0, total: 0 }]))
  for (const r of rows || []) {
    if (NOT_TILES.has(r.type)) continue
    const key = base.includes(r.type) ? r.type : (section === 'reading' && READING_EXTRA_GROUP[r.type]) || r.type
    const v = acc.get(key) || { correct: 0, total: 0 }
    acc.set(key, { correct: v.correct + (r.correct || 0), total: v.total + (r.total || 0) })
  }
  return [...acc.entries()].map(([type, v]) => ({ type, label: TILE_LABEL[type] || type, ...v, tone: accuracyTone(v.correct, v.total) }))
}
