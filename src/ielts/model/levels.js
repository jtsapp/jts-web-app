// Уровень материала и ученика по навыку (backend IeltsLevels, TEST_FORMAT.md §2 «Уровень»). Каталог отдаёт у задания
// bandMin/bandMax, level (fit · below · above · any) и studentBand — уровень ученика в этом навыке. Задания ниже уровня
// ученика «Практика» прячет: ученику с Reading 6.5 тексты на 5.0 ничего не дают; переключатель «Все уровни» их
// возвращает (повторить базу перед экзаменом — право ученика).

/** Каталог навыка без заданий ниже уровня ученика (или целиком, если ученик попросил все уровни). */
export function atLevel(items, showAll = false) {
  const list = Array.isArray(items) ? items : []
  return showAll ? list : list.filter((x) => x?.level !== 'below')
}

/** Сколько заданий навыка спрятано как ниже уровня. */
export function hiddenCount(items) {
  return (Array.isArray(items) ? items : []).filter((x) => x?.level === 'below').length
}

/** Уровень ученика в навыке — его кладёт в каждую строку каталог; нет оценки навыка — null. */
export function studentBandOf(items) {
  const x = (Array.isArray(items) ? items : []).find((i) => typeof i?.studentBand === 'number')
  return x ? x.studentBand : null
}

const fmt = (b) => (Number.isInteger(b) ? `${b}.0` : String(b))

/** Подпись уровня задания: «Band 5.5–6.5»; у задания вне уровней — null. */
export function bandLabel(x) {
  if (typeof x?.bandMin !== 'number' || typeof x?.bandMax !== 'number') return null
  return x.bandMin === x.bandMax ? `Band ${fmt(x.bandMin)}` : `Band ${fmt(x.bandMin)}–${fmt(x.bandMax)}`
}

/**
 * Список заданий по уровню (правка владельца в Figma: не прятать, а делить): «Рекомендуемые» — по силам (fit и задания
 * вне уровней), «Сложнее» — на вырост, «Неподходящие» — ниже уровня ученика, внизу списка.
 */
export function groupByLevel(rows) {
  const out = { recommended: [], harder: [], unsuitable: [] }
  for (const r of rows || []) {
    if (r?.level === 'below') out.unsuitable.push(r)
    else if (r?.level === 'above') out.harder.push(r)
    else out.recommended.push(r)
  }
  return out
}

/** Уровень набора заданий (тренажёр типа, дрилл) для ученика: есть по силам — fit, иначе на вырост, иначе ниже. */
export function aggLevel(tests) {
  const levels = (tests || []).map((x) => x?.level || 'any')
  if (!levels.length) return 'any'
  if (levels.some((l) => l === 'fit' || l === 'any')) return 'fit'
  if (levels.some((l) => l === 'above')) return 'above'
  return 'below'
}

/** Рекомендуемый уровень заданий для ученика: от его балла в навыке до +1 (как fit на бэкенде). */
export function recommendedRange(band) {
  if (typeof band !== 'number') return null
  const hi = Math.min(9, band + 1)
  return `${fmt(band)}–${fmt(hi)}`
}
