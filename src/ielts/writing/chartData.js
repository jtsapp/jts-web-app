// Данные визуала Task 1 — чистые функции без React: их берут TaskVisual (рисует), describeChart (текст для модели и
// скринридера) и проверка банка (chartIssues, ТЗ §4.6). Модуль общий для экрана и серверного роута оценки.
//
// Форматы банка (TEST_FORMAT §7, разбор A4): line/bar — x + series; pie — slices ИЛИ одна серия по x (W1-AC-103);
// table — columns + rows ИЛИ series (строки) по x (колонки, W1-AC-104/108). Оба формата документированы и живут
// рядом, поэтому не мигрируем, а приводим к одному виду на входе (normalizeChart).

/** «undefined» в unit — артефакт старого конвертера (W1-AC-020): это «без единицы», а не единица. */
export function unitOf(c) {
  const u = c?.unit
  if (u == null) return ''
  const s = String(u).trim()
  return s === 'undefined' || s === 'null' ? '' : s
}

/** Число как в задании: разделитель тысяч (1,240), не больше двух знаков после точки. Не число — как есть. */
export function fmtNum(v) {
  const n = Number(v)
  if (v == null || v === '' || !Number.isFinite(n)) return v == null ? '' : String(v)
  return (Math.round(n * 100) / 100).toLocaleString('en-US')
}

/** Значение с единицей: «32%», «1,240 visitors», без единицы — только число. */
export function fmtVal(v, unit) {
  const s = fmtNum(v)
  if (!unit || s === '') return s
  return unit === '%' ? `${s}%` : `${s} ${unit}`
}

/** «Красивый» шаг оси: 1/2/2.5/5/10 × 10^n, около четырёх делений до максимума (порт niceStep прототипа). */
export function niceStep(max) {
  if (!(max > 0)) return 1
  const raw = max / 4
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  const f = raw / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p
}

/**
 * Ось Y от 0: шаг — yStep задания или красивый; верх — yMax задания, если он не ниже данных, иначе ближайшее деление
 * над максимумом. Делений не больше 12: слишком мелкий yStep (ошибка данных) заменяется красивым.
 */
export function axisOf(values, yMax, yStep) {
  const nums = values.filter((v) => Number.isFinite(v))
  const max = nums.length ? Math.max(...nums, 0) : 0
  let step = Number(yStep) > 0 ? Number(yStep) : niceStep(max || 1)
  let top = Number(yMax) > 0 && Number(yMax) >= max ? Number(yMax) : Math.ceil((max || 1) / step) * step
  if (top / step > 12) {
    step = niceStep(top)
    top = Math.ceil(top / step) * step
  }
  const ticks = []
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  return { step, top: top || step, ticks }
}

/** Визуал к одному виду: pie — со slices, table — с columns/rows, unit без «undefined». multi — по частям. */
export function normalizeChart(c) {
  if (!c || typeof c !== 'object') return null
  const unit = unitOf(c)
  if (c.type === 'multi') return { ...c, unit, charts: (c.charts || []).map(normalizeChart).filter(Boolean) }
  if (c.type === 'pie' && !Array.isArray(c.slices)) {
    const vals = c.series?.[0]?.values || []
    return { ...c, unit, slices: (c.x || []).map((label, i) => ({ label, value: vals[i] })) }
  }
  if (c.type === 'table' && !Array.isArray(c.columns)) {
    return { ...c, unit, columns: ['', ...(c.x || [])], rows: (c.series || []).map((s) => [s.name ?? '', ...(s.values || [])]) }
  }
  return { ...c, unit }
}

/**
 * Визуал раунда тренировки: свой график inline или ссылка на график задания { ref, sub?, series? } (контракт §3).
 * chartOf(testId) — график задания (из уже загруженного документа); нет его — null, раунд рисуется без картинки.
 */
export function resolveVisual(v, chartOf) {
  if (!v) return null
  if (!v.ref) return v.type ? v : null
  let c = typeof chartOf === 'function' ? chartOf(v.ref) : null
  if (!c) return null
  if (v.sub != null && c.type === 'multi') c = c.charts?.[v.sub] || null
  if (c && Array.isArray(v.series) && Array.isArray(c.series)) c = { ...c, series: v.series.map((i) => c.series[i]).filter(Boolean) }
  return c
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

/**
 * Проверка данных визуала по ТЗ §4.6: длина values = длине x, значения ≤ yMax, сумма pie = 100 ± 0.6 (для долей),
 * длина строки table = числу колонок, у figure есть svg и alt. Пустой список — визуал годен. path — префикс пути
 * для сообщений (у частей multi — charts/<i>).
 */
export function chartIssues(chart, path = '') {
  const out = []
  const at = (p) => `${path}${p}`
  if (!chart || typeof chart !== 'object') return [at('chart: нет визуала')]
  const c = chart
  if (c.unit === 'undefined') out.push(at('unit: «undefined» — убрать или указать единицу'))
  if (c.type === 'multi') {
    if (!Array.isArray(c.charts) || !c.charts.length) out.push(at('charts: нужен хотя бы один визуал'))
    ;(c.charts || []).forEach((x, i) => out.push(...chartIssues(x, at(`charts/${i}/`))))
    return out
  }
  if (c.type === 'figure') {
    if (!String(c.svg || '').trim()) out.push(at('svg: нет схемы'))
    if (!String(c.alt || '').trim()) out.push(at('alt: нет описания схемы'))
    return out
  }
  if (c.type === 'line' || c.type === 'bar' || ((c.type === 'pie' || c.type === 'table') && !c.slices && !c.columns)) {
    const x = Array.isArray(c.x) ? c.x : null
    if (!x || !x.length) out.push(at('x: нужны подписи'))
    const series = Array.isArray(c.series) ? c.series : []
    if (!series.length) out.push(at('series: нужна хотя бы одна серия'))
    series.forEach((s, i) => {
      const vals = Array.isArray(s?.values) ? s.values : []
      if (x && vals.length !== x.length) out.push(at(`series/${i}/values: ${vals.length} значений, а подписей x — ${x.length}`))
      vals.forEach((v, k) => {
        if (v != null && !isNum(v)) out.push(at(`series/${i}/values/${k}: не число`))
        else if (isNum(v) && Number(c.yMax) > 0 && v > Number(c.yMax)) out.push(at(`series/${i}/values/${k}: ${v} больше yMax ${c.yMax}`))
      })
    })
    if (c.type === 'pie' && series[0]) pieSum(series[0].values || [], c, out, at)
    return out
  }
  if (c.type === 'pie') {
    const sl = Array.isArray(c.slices) ? c.slices : []
    if (sl.length < 2) out.push(at('slices: нужно два и больше сектора'))
    sl.forEach((s, i) => {
      if (!s?.label) out.push(at(`slices/${i}/label: нет подписи`))
      if (!isNum(s?.value)) out.push(at(`slices/${i}/value: не число`))
    })
    pieSum(sl.map((s) => s?.value), c, out, at)
    return out
  }
  if (c.type === 'table') {
    const cols = Array.isArray(c.columns) ? c.columns : []
    if (!cols.length) out.push(at('columns: нужны колонки'))
    const rows = Array.isArray(c.rows) ? c.rows : []
    if (!rows.length) out.push(at('rows: нужна хотя бы одна строка'))
    rows.forEach((r, i) => {
      const n = Array.isArray(r) ? r.length : 0
      if (n !== cols.length) out.push(at(`rows/${i}: ${n} ячеек, а колонок — ${cols.length}`))
    })
    return out
  }
  out.push(at(`type: неизвестный вид «${c.type}»`))
  return out
}

// Сумма долей — только у процентов (или без единицы: в банке это всегда доли); круг в абсолютных числах сумму не держит
function pieSum(values, c, out, at) {
  const u = unitOf(c)
  if (u && u !== '%') return
  const sum = values.filter(isNum).reduce((a, v) => a + v, 0)
  if (Math.abs(sum - 100) > 0.6) out.push(at(`pie: сумма долей ${Math.round(sum * 100) / 100}, а должна быть 100 ± 0.6`))
}
