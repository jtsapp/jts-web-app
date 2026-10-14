// Статистика дашборда «Сегодня» (SAT-SYNC-PLAN B2, прототип progress.js dashboard + practice-stats.js). Числа считает
// бэкенд (GET /mobile/sat/insights/stats); здесь — раскладка для показа: проценты, тон полосы, сетка 90 дней.
// Только измерения, никакого прогноза балла (правило прототипа §14.12). Чистые функции под тестами.

/** Доля верных в процентах; без попыток — null (на экране «—», а не 0 %). */
export function accuracy(correct, total) {
  return total ? Math.round((correct * 100) / total) : null
}

/** Тон полосы точности, как у прототипа: ≥ 80 освоено, ≥ 50 развивается, ниже — учится. */
export function tone(p) {
  if (p == null) return 'none'
  return p >= 80 ? 'ok' : p >= 50 ? 'mid' : 'low'
}

/**
 * Строки «Точность по доменам»: только домены с попытками, порядок таксономии (сначала R&W, потом Math).
 * order — id доменов по порядку (TAXONOMY.domains), чтобы строки не прыгали от ответа к ответу.
 */
export function domainRows(list = [], order = []) {
  const idx = (d) => {
    const i = order.indexOf(d)
    return i < 0 ? order.length : i
  }
  return list
    .filter((d) => d && d.total > 0)
    .map((d) => {
      const p = accuracy(d.correct, d.total)
      return { ...d, pct: p, tone: tone(p) }
    })
    .sort((a, b) => (a.section === b.section ? idx(a.domain) - idx(b.domain) : a.section === 'math' ? 1 : -1))
}

/** «2 ч 15 мин» / «45 мин» по ключам sat.prog.hm / sat.prog.m. */
export function fmtMinutes(min, t) {
  const m = Math.max(0, Math.round(Number(min) || 0))
  const h = Math.floor(m / 60)
  return h ? t('sat.prog.hm', { h: String(h), m: String(m % 60) }) : t('sat.prog.m', { m: String(m) })
}

function isoDay(d) {
  return d.toISOString().slice(0, 10)
}

/**
 * Сетка «Последние 90 дней»: недели столбцами, поэтому начало сдвигается на понедельник (иначе строки перестают
 * значить дни недели). Ячейка — { date, solved, correct, lvl 0–4, pad } ; pad — дни до окна, рисуются пустыми.
 * today — Date (UTC-полночь дня ученика берём по строке ISO, так тест не зависит от часового пояса машины).
 */
export function heatCells(days = [], today = new Date()) {
  const by = new Map(days.map((d) => [String(d.date).slice(0, 10), d]))
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const start = new Date(end.getTime() - 89 * 86400000)
  const shift = (start.getUTCDay() + 6) % 7 // понедельник = 0
  const first = new Date(start.getTime() - shift * 86400000)
  const max = Math.max(1, ...days.map((d) => d.solved || 0))
  const out = []
  for (let t = first.getTime(); t <= end.getTime(); t += 86400000) {
    const date = isoDay(new Date(t))
    const d = by.get(date)
    const n = d?.solved || 0
    out.push({
      date,
      solved: n,
      correct: d?.correct || 0,
      lvl: n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)),
      pad: t < start.getTime(),
    })
  }
  return out
}

/** Итог окна 90 дней: дней с занятиями и решено за них. */
export function windowTotals(days = []) {
  let active = 0
  let solved = 0
  for (const d of days) {
    if ((d.solved || 0) > 0) active++
    solved += d.solved || 0
  }
  return { active, solved }
}

/** Бейджи: полученные первыми (новые выше), затем остальные в порядке сервера. */
export function sortBadges(badges = []) {
  const got = badges.filter((b) => b.earned).sort((a, b) => String(b.earnedAt || '').localeCompare(String(a.earnedAt || '')))
  return [...got, ...badges.filter((b) => !b.earned)]
}

/**
 * Итог набора «Практики» (карточка после набора, B2): процент, среднее время на вопрос и навыки слабые первыми.
 * summary — ответ GET /sessions/{id}/summary.
 */
export function practiceSummary(summary) {
  if (!summary) return null
  const total = summary.total || 0
  const correct = summary.correct || 0
  // accuracy сервер отдаёт целым процентом 0–100 (не долей)
  const p = summary.accuracy != null ? Math.round(summary.accuracy) : accuracy(correct, total)
  const perQ = total && summary.durationSeconds ? Math.round(summary.durationSeconds / total) : null
  const skills = (summary.bySkill || [])
    .filter((s) => s.total > 0)
    .map((s) => ({ ...s, pct: accuracy(s.correct, s.total) }))
    .sort((a, b) => a.pct - b.pct || b.total - a.total)
  return { total, correct, pct: p ?? 0, perQ, durationSeconds: summary.durationSeconds || 0, skills, masteredNow: summary.masteredNow || [] }
}
