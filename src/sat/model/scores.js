// Таблица «Результаты» во вкладке «Пробники» (SAT-SYNC-PLAN B5, решение D2; прототип 34658a47 / 24c954ff):
// симуляции JTS, Past papers (ТЗ SAT 17.10, задача 13) и баллы, которые ученик добавил сам (Bluebook, официальный SAT),
// изменение к предыдущему и траектория к цели. Чистые функции под тестами.

// Источник ручного балла (Figma 30, 15.10.2026; порядок и подписи — «NEW 2», 17:4989): официальный SAT, Bluebook или
// «Другое». «Другое» на сервере — прежний JTS (пробник вне платформы): значение не меняли, чтобы старые строки не потерялись.
export const MANUAL_SOURCES = ['OFFICIAL', 'BLUEBOOK', 'JTS']
export const SECTION_MIN = 200
export const SECTION_MAX = 800

/** Балл секции: 200–800 с шагом 10, как печатает College Board. */
export function validSection(v) {
  const n = Number(v)
  return Number.isInteger(n) && n >= SECTION_MIN && n <= SECTION_MAX && n % 10 === 0
}

/**
 * Балл секции, как его примет сервер: ближайший кратный 10 в 200–800. null — не число или вне шкалы даже после
 * округления: «625» — опечатка в последней цифре (округлим до 630, спросив), «95» — нет.
 */
export function roundSection(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  const r = Math.round(n / 10) * 10
  return r >= SECTION_MIN && r <= SECTION_MAX ? r : null
}

/** Живая проверка поля секции (17:4989): 'empty' · 'ok' · 'round' (кратно 10 — предложить округление) · 'range'. */
export function sectionState(v) {
  if (v === '' || v == null) return 'empty'
  if (validSection(v)) return 'ok'
  return roundSection(v) != null ? 'round' : 'range'
}

/**
 * Проверка формы «Добавить результат». Возвращает объект ошибок по полям (пустой — можно отправлять).
 * today — 'YYYY-MM-DD' (дата устройства): результат из будущего — опечатка в дате.
 */
export function validateScore(form, today) {
  const err = {}
  if (!MANUAL_SOURCES.includes(form.source)) err.source = 'source'
  if (!form.takenOn || !/^\d{4}-\d{2}-\d{2}$/.test(form.takenOn)) err.takenOn = 'date'
  else if (today && form.takenOn > today) err.takenOn = 'future'
  // некратный 10 балл ошибкой не считаем: форма предложила округление, и уходит уже округлённый (scoreBody)
  if (roundSection(form.rw) == null) err.rw = 'section'
  if (roundSection(form.math) == null) err.math = 'section'
  if (form.label && String(form.label).length > 80) err.label = 'long'
  return err
}

/** Тело POST /mobile/sat/scores из формы: числа — числами, округлёнными до 10 (как показал итог), пустая подпись — null. */
export function scoreBody(form) {
  return {
    source: form.source,
    label: form.label && String(form.label).trim() ? String(form.label).trim() : null,
    takenOn: form.takenOn,
    rw: roundSection(form.rw),
    math: roundSection(form.math),
  }
}

/** Отклонённый куратором Bluebook-тест (дизайн NEW 2): строка в таблице есть, но в Δ, траекторию и «Примерный балл» не идёт. */
export function isRejected(e) {
  return e?.reviewStatus === 'REJECTED'
}

/** Итог строки: сервер его присылает; нет — сумма секций (итог всегда из секций). */
export function totalOf(e) {
  if (e.total != null) return e.total
  return e.rw != null && e.math != null ? Number(e.rw) + Number(e.math) : null
}

function when(e) {
  return String(e.takenOn || e.completedAt || '')
}

/**
 * Строки таблицы: все источники, включая Past papers, новые сверху. Изменение сервера берём как есть, и null тоже: у
 * самой старой строки и у отклонённой его нет нарочно (правило Δ — решение продукта, экран его не переписывает).
 * Сами считаем, только когда поля нет вовсе (запасной список из /mocks) — к предыдущей строке, кроме отклонённых.
 */
export function tableRows(entries = []) {
  const rows = entries.filter(Boolean).slice().sort((a, b) => when(b).localeCompare(when(a)) || String(b.id).localeCompare(String(a.id)))
  return rows.map((e, i) => {
    const own = totalOf(e)
    if (isRejected(e)) return { ...e, total: own, delta: null }
    if (e.delta !== undefined) return { ...e, total: own }
    const prev = rows.slice(i + 1).find((x) => !isRejected(x))
    const before = prev ? totalOf(prev) : null
    return { ...e, total: own, delta: own != null && before != null ? own - before : null }
  })
}

/** Траектория: старые слева; только строки с итогом, без отклонённых. */
export function trajectoryPoints(entries = []) {
  return tableRows(entries).filter((e) => e.total != null && !isRejected(e)).reverse()
}

/**
 * Группа точки на графике траектории (17:2430): официальный SAT и Bluebook — настоящие баллы, через них идёт сплошная
 * линия; симуляция — вертикальная «пилюля» диапазона; Past paper и «Другое» — отдельные точки без линии.
 */
export function pointKind(e) {
  if (e.source === 'OFFICIAL' || e.source === 'BLUEBOOK') return 'real'
  if (e.source === 'SIMULATION') return 'sim'
  if (e.source === 'PAPER') return 'paper'
  return 'other'
}

/** Группы легенды — только те, что есть на графике, в порядке макета. */
export function legendKinds(entries = []) {
  const have = new Set(trajectoryPoints(entries).map(pointKind))
  return ['real', 'sim', 'paper', 'other'].filter((k) => have.has(k))
}

function dayMs(s) {
  return Date.parse(`${String(s).slice(0, 10)}T00:00:00Z`)
}

/**
 * Геометрия графика траектории (17:2430). x — по дате (месяцы на оси идут по времени, а не по номеру попытки),
 * y — по шкале `scale`, в которую входят и края диапазонов симуляций. Возвращает деления, линию цели, ломаную
 * настоящих баллов, диапазоны симуляций, отдельные точки и подписи месяцев (первая точка месяца; слишком близкая к
 * предыдущей подписи — пропускается, иначе «июн» и «июл» налезают). null — точек нет.
 */
export function trajectoryChart(entries, target, { w = 372, h = 210, l = 34, r = 10, t = 12, b = 26, gap = 30 } = {}) {
  const pts = trajectoryPoints(entries)
  const values = pts.flatMap((p) => (p.source === 'SIMULATION' && p.range?.total ? [p.range.total.low, p.range.total.high] : [p.total]))
  const sc = scale([...values, target || null])
  if (!pts.length || !sc) return null
  const y = (v) => t + (1 - (v - sc.lo) / (sc.hi - sc.lo)) * (h - t - b)
  const days = pts.map((p) => dayMs(p.takenOn))
  const d0 = Math.min(...days)
  const d1 = Math.max(...days)
  const left = l + 20
  const right = w - r - 20
  const x = (d) => (d1 === d0 ? (left + right) / 2 : left + ((d - d0) * (right - left)) / (d1 - d0))
  const line = []
  const ranges = []
  const dots = []
  pts.forEach((p, i) => {
    const px = x(days[i])
    const kind = pointKind(p)
    if (kind === 'real') line.push({ id: p.id, x: px, y: y(p.total) })
    else if (kind === 'sim' && p.range?.total) ranges.push({ id: p.id, x: px, top: y(p.range.total.high), bottom: y(p.range.total.low), mid: y(p.total) })
    else dots.push({ id: p.id, x: px, y: y(p.total), kind })
  })
  const months = []
  const seen = new Set()
  pts.forEach((p, i) => {
    const key = String(p.takenOn).slice(0, 7)
    if (seen.has(key)) return
    seen.add(key)
    const px = x(days[i])
    if (months.length && px - months[months.length - 1].x < gap) return
    months.push({ key, x: px, date: `${key}-01` })
  })
  return {
    ticks: sc.ticks.map((v) => ({ v, y: y(v) })),
    goal: target && target >= sc.lo && target <= sc.hi ? y(target) : null,
    line, ranges, dots, months,
  }
}

/** Шкала графика по сотням вокруг точек и цели, не уже 300, в пределах 400–1600. */
export function scale(values) {
  const v = values.filter((x) => x != null)
  if (!v.length) return null
  let lo = Math.floor((Math.min(...v) - 20) / 100) * 100
  let hi = Math.ceil((Math.max(...v) + 20) / 100) * 100
  while (hi - lo < 300) {
    if (lo > 400) lo -= 100
    else hi += 100
  }
  lo = Math.max(400, lo)
  hi = Math.min(1600, hi)
  const step = hi - lo <= 600 ? 100 : 200
  const ticks = []
  for (let x = lo; x <= hi; x += step) ticks.push(x)
  return { lo, hi, ticks }
}
