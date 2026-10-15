// Журнал ошибок SAT (SAT-SYNC-PLAN B9, прототип errors.js после cfbaf69d / ab84ead6): плитки-счётчики, причины одной
// строкой как фильтры, карточки по десять на страницу. Чистые функции под тестами.

export const PER_PAGE = 10

// Журнал «Log error» прототипа пишет причины словами («knowledge gap», «time pressure»); бэкенд принимает и их —
// на экране это те же шесть типов
const ALIASES = { 'knowledge gap': 'knowledge', 'time pressure': 'time' }
export function normType(type) {
  return type ? ALIASES[type] || type : null
}
export const STATUSES = ['all', 'due', 'waiting', 'resolved']

/** Где строка: закрыта, пора повторить или ждёт своего срока. */
export function statusOf(e) {
  if (e.resolvedAt) return 'resolved'
  return e.due ? 'due' : 'waiting'
}

/** Плитки: всего, пора повторить, ждут, разобрано. */
export function statusCounts(list = []) {
  const c = { all: list.length, due: 0, waiting: 0, resolved: 0 }
  for (const e of list) c[statusOf(e)]++
  return c
}

/**
 * Причины одной строкой: шесть типов по убыванию, «без причины» — последней, если такие есть. Счёт — по строкам
 * текущего статуса, чтобы цифра на фильтре совпадала с тем, что он покажет.
 */
export function reasonCounts(list = [], types = []) {
  const n = Object.fromEntries(types.map((k) => [k, 0]))
  let none = 0
  for (const e of list) {
    const k = normType(e.errorType)
    if (k && k in n) n[k]++
    else none++
  }
  const rows = types.map((k) => ({ key: k, n: n[k] })).sort((a, b) => b.n - a.n)
  if (none) rows.push({ key: 'none', n: none })
  return rows
}

/** Фильтр по статусу и причине (none — без типа). */
export function filterErrors(list = [], { status = 'all', kind = 'all' } = {}) {
  return list.filter((e) => {
    if (status !== 'all' && statusOf(e) !== status) return false
    if (kind === 'all') return true
    if (kind === 'none') return !e.errorType
    return normType(e.errorType) === kind
  })
}

/** Записанные в журнал («Log error») первыми, затем новые выше. */
export function sortErrors(list = []) {
  return list.slice().sort((a, b) => (!!b.logged - !!a.logged) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

/** Страница списка: номер приводится в границы — после фильтра страниц могло стать меньше. */
export function paginate(list = [], page = 1, per = PER_PAGE) {
  const pages = Math.max(1, Math.ceil(list.length / per))
  const p = Math.min(Math.max(1, Math.floor(Number(page)) || 1), pages)
  return { page: p, pages, items: list.slice((p - 1) * per, p * per) }
}

/** Доля разобранного — кольцо в шапке. */
export function reviewedShare(counts) {
  return counts.all ? Math.round((counts.resolved * 100) / counts.all) : 0
}
