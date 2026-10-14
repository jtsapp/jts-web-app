// Таблица «Результаты» во вкладке «Пробники» (SAT-SYNC-PLAN B5, решение D2; прототип 34658a47 / 24c954ff):
// симуляции JTS + баллы, которые ученик добавил сам (Bluebook, официальный SAT), изменение к предыдущему и траектория
// к цели. Бумажные тесты (past papers) сюда не входят — у них своя страница. Чистые функции под тестами.

export const MANUAL_SOURCES = ['BLUEBOOK', 'OFFICIAL']
export const SECTION_MIN = 200
export const SECTION_MAX = 800

/** Балл секции: 200–800 с шагом 10, как печатает College Board. */
export function validSection(v) {
  const n = Number(v)
  return Number.isInteger(n) && n >= SECTION_MIN && n <= SECTION_MAX && n % 10 === 0
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
  if (!validSection(form.rw)) err.rw = 'section'
  if (!validSection(form.math)) err.math = 'section'
  if (form.label && String(form.label).length > 80) err.label = 'long'
  return err
}

/** Тело POST /mobile/sat/scores из формы: числа — числами, пустая подпись — null. */
export function scoreBody(form) {
  return {
    source: form.source,
    label: form.label && String(form.label).trim() ? String(form.label).trim() : null,
    takenOn: form.takenOn,
    rw: Number(form.rw),
    math: Number(form.math),
  }
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
 * Строки таблицы: без бумажных тестов, новые сверху; изменение — к предыдущей строке по дате (сервер шлёт delta —
 * берём её, иначе считаем сами, у самой старой — null).
 */
export function tableRows(entries = []) {
  const rows = entries.filter((e) => e && e.source !== 'PAPER').slice().sort((a, b) => when(b).localeCompare(when(a)) || String(b.id).localeCompare(String(a.id)))
  return rows.map((e, i) => {
    const prev = rows[i + 1]
    const own = totalOf(e)
    const before = prev ? totalOf(prev) : null
    const delta = e.delta !== undefined && e.delta !== null ? e.delta : own != null && before != null ? own - before : null
    return { ...e, total: own, delta }
  })
}

/** Траектория: старые слева; только строки с итогом. */
export function trajectoryPoints(entries = []) {
  return tableRows(entries).filter((e) => e.total != null).reverse()
}

/** Сколько осталось до цели от последнего результата (≤ 0 — цель достигнута); null — нечего сравнивать. */
export function gapToTarget(entries = [], target) {
  const last = tableRows(entries).find((e) => e.total != null)
  return last && target ? target - last.total : null
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
