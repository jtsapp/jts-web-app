// Данные вкладки «Прогресс» (Figma «Прогресс»): из ответа GET /mobile/ielts/progress.

// Понедельник недели даты 'YYYY-MM-DD' — тоже строкой: график строится по неделям, а не по дням замеров.
export function weekStart(iso) {
  const d = new Date(`${iso}T00:00:00Z`)
  const shift = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - shift)
  return d.toISOString().slice(0, 10)
}

/** «Балл по неделям»: последний overall каждой недели, где он был; недели по порядку. */
export function weeklyOverall(history) {
  const byWeek = new Map()
  for (const p of history || []) if (p.overall != null) byWeek.set(weekStart(p.date), p.overall)
  return [...byWeek.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([week, band]) => ({ week, band }))
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

/** Плитки секции: сначала канонический список типов, затем встреченные вне его (кроме диктовки и правописания). */
export function typeTiles(list, rows) {
  const by = Object.fromEntries((rows || []).map((r) => [r.type, r]))
  const extra = (rows || []).map((r) => r.type).filter((t) => !(list || []).includes(t) && t !== 'dictation' && t !== 'spelling')
  return [...(list || []), ...extra].map((type) => {
    const r = by[type]
    return { type, correct: r?.correct || 0, total: r?.total || 0, tone: accuracyTone(r?.correct || 0, r?.total || 0) }
  })
}
