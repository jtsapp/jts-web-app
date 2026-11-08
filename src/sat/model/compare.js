// Bluebook Test 6 → 8 → 10 (ТЗ 21.10, задача 1; Figma «NEW 2», 17:8284–17:8831): форма трёх баллов и экран сравнения.
// Баллы — из тестов (их ввёл студент), домены — из данных платформы (снимок карты на день ввода и карта сейчас).
// Чистые функции под тестами: экран только раскладывает то, что посчитано здесь.
import { checkpointWeek } from './phaseStrip.js'

export const BLUEBOOK_TESTS = [6, 8, 10]
export const TOTAL_MIN = 400
export const TOTAL_MAX = 1600

const section = (v) => Number.isInteger(v) && v >= 200 && v <= 800 && v % 10 === 0
const num = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v))

/**
 * Проверка формы Bluebook (17:8284 / 17:8367): Total вводят сами, но сервер его не берёт — итог всегда сумма секций.
 * Поэтому сохранять можно, только когда Total = Math + R&W: иначе в отчёт закралась опечатка, и спросить надо сейчас.
 * state: 'incomplete' — не все три числа годны; 'match' — сходится; 'mismatch' — секции годны, Total с ними расходится.
 */
export function bluebookCheck({ total, rw, math }) {
  const r = num(rw)
  const m = num(math)
  const tot = num(total)
  if (!section(r) || !section(m)) return { state: 'incomplete', sum: null }
  const sum = r + m
  if (tot == null) return { state: 'incomplete', sum }
  return { state: tot === sum ? 'match' : 'mismatch', sum }
}

/** Тест из адреса (?satBluebook= / ?satCompare=): только 6, 8 или 10, сравнение — только 8 и 10 (у Test 6 базы нет). */
export function testParam(raw, { compare = false } = {}) {
  const n = Number(raw)
  if (!BLUEBOOK_TESTS.includes(n)) return null
  return compare && n === 6 ? null : n
}

/**
 * Заголовок сравнения (17:8528 / 17:8678 / 17:8831). Рост — от двух шагов шкалы (20 баллов): +10 — это шум формы
 * теста, его честнее назвать «почти не изменился», чем радоваться. variant: 'grew' — после Test 8; 'three' — после
 * Test 10, три точки; 'flat' — роста нет (сколько бы тестов ни было). chain — итоги по порядку (6 → … → test).
 * null — сравнивать не с чем (нет Test 6 или самого теста).
 */
export const GROWTH_FROM = 20

export function compareHeadline(tests, test) {
  const shown = (tests || []).filter((x) => x.entered && x.test <= test && x.total != null).sort((a, b) => a.test - b.test)
  const first = shown.find((x) => x.test === 6)
  const last = shown.find((x) => x.test === test)
  if (!first || !last || first === last) return null
  const delta = last.deltaTotal ?? last.total - first.total
  const variant = delta < GROWTH_FROM ? 'flat' : shown.length > 2 ? 'three' : 'grew'
  return { variant, delta, chain: shown.map((x) => x.total), tests: shown.map((x) => x.test) }
}

/** Строки «Total / R&W / Math» карточки «Баллы»: от Test 6 к тесту; рост — зелёный чип, остальное — нейтральный (без красного). */
export function scoreRows(tests, test) {
  const first = (tests || []).find((x) => x.test === 6 && x.entered)
  const last = (tests || []).find((x) => x.test === test && x.entered)
  if (!first || !last) return []
  return [
    ['total', first.total, last.total, last.deltaTotal],
    ['rw', first.rw, last.rw, last.deltaRw],
    ['math', first.math, last.math, last.deltaMath],
  ].map(([key, from, to, d]) => {
    const delta = d ?? to - from
    return { key, from, to, delta, up: delta > 0 }
  })
}

/**
 * Снимок, с которым сравниваем домены: тот же Test 6, что у баллов (одна точка отсчёта на экране). Нет его —
 * самый ранний снимок до теста; нет и такого — null (колонка «было» покажет прочерк).
 */
export function baselineSnapshot(snapshots, test) {
  const before = (snapshots || []).filter((s) => s.test < test).sort((a, b) => a.test - b.test)
  return before.find((s) => s.test === 6) || before[0] || null
}

/**
 * Статус домена (17:8528): в текущих приоритетах и не был в приоритетах снимка — «Новый приоритет»; стал уверенным, а
 * уверенным не был — «Закрыто»; иначе, пока не уверенно, — «Осталось». Уверенный и раньше — без чипа (null).
 */
export function domainStatus(now, before, currentFocus, beforeFocus) {
  if (!now) return null
  if ((currentFocus || []).includes(now.id) && !(beforeFocus || []).includes(now.id)) return 'new'
  const strong = now.band === 'strong'
  if (strong && before?.band !== 'strong') return 'closed'
  if (!strong) return 'left'
  return null
}

const pct = (acc) => (acc == null ? 0 : Math.round(acc * 100))

/**
 * Строки «Карты доменов»: было % → стало % и статус. Домены без статуса (уверенные и раньше) не показываем — в
 * макете карточка про то, что сдвинулось или ещё держит; так она не растягивается на все восемь доменов.
 */
export function domainRows(currentDomains, snapshot, currentFocus) {
  const before = new Map((snapshot?.domains || []).map((d) => [d.id, d]))
  return (currentDomains || [])
    .map((d) => {
      const old = before.get(d.id) || null
      return { id: d.id, section: d.section, from: snapshot ? pct(old?.accuracy) : null, now: pct(d.accuracy), status: domainStatus(d, old, currentFocus, snapshot?.focus) }
    })
    .filter((r) => r.status)
}

/**
 * Шкала графика «Баллы»: деления по 200 (макет — 1000 / 1200 / 1400) вокруг точек и цели, в пределах 400–1600.
 * Точки — по равным шагам слева направо (тесты, а не даты), y — сверху вниз в пикселях.
 */
export function compareChart(values, goal, { w = 500, h = 180, l = 40, r = 20, t = 16, b = 24 } = {}) {
  const v = values.filter((x) => x != null)
  if (!v.length) return null
  const all = goal ? [...v, goal] : v
  let lo = Math.max(TOTAL_MIN, Math.floor((Math.min(...all) - 50) / 200) * 200)
  let hi = Math.min(TOTAL_MAX, Math.ceil((Math.max(...all) + 50) / 200) * 200)
  if (hi - lo < 400) {
    if (hi + 200 <= TOTAL_MAX) hi += 200
    else lo -= 200
  }
  const y = (x) => t + (1 - (x - lo) / (hi - lo)) * (h - t - b)
  const n = v.length
  const x = (i) => (n === 1 ? (l + w - r) / 2 : l + 30 + (i * (w - l - r - 60)) / (n - 1))
  const ticks = []
  for (let k = lo; k <= hi; k += 200) ticks.push({ v: k, y: y(k) })
  return {
    lo, hi, ticks,
    goal: goal && goal >= lo && goal <= hi ? y(goal) : null,
    points: v.map((val, i) => ({ v: val, x: x(i), y: y(val) })),
  }
}

/** Фаза роудмапа с тестом и следующая за ней — куда ведёт «К плану следующей фазы» (null — роудмапа нет). */
export function phaseAfter(roadmap, test) {
  const phases = roadmap?.phases || []
  const at = phases.find((p) => p.bluebookTest === test)
  if (!at) return null
  return phases.find((p) => p.n > at.n && p.kind !== 'exam') || null
}

/** Номер фазы теста — её карточку «План» откроет после формы (satPhase). */
export function phaseOfTest(roadmap, test) {
  return (roadmap?.phases || []).find((p) => p.bluebookTest === test)?.n ?? null
}

/**
 * «Следующая проверка: Test 10 — после недели 8, через 4 недели» (17:8831). Неделя — та же, что у полосы фаз;
 * «через» — целые недели от сегодня до начала фазы теста, не меньше одной. null — следующего теста нет (после 10).
 */
export function nextCheck(roadmap, test, today = new Date()) {
  const next = BLUEBOOK_TESTS.find((n) => n > test)
  if (!next) return null
  const phase = (roadmap?.phases || []).find((p) => p.bluebookTest === next)
  if (!phase) return { test: next, week: null, weeks: null }
  const start = phase.start ? new Date(`${phase.start}T00:00:00Z`) : null
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const weeks = start ? Math.max(1, Math.round((start.getTime() - now) / (7 * 86400000))) : null
  return { test: next, week: checkpointWeek(roadmap, phase.n), weeks }
}
