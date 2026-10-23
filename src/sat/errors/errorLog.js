// «Работа над ошибками» (ТЗ SAT 21.10, задача 9): фильтры списка. Список приходит целиком (у студента он короткий),
// поэтому фильтрует экран — сразу, без запроса на каждый клик. Статистику и выводы считает сервер (SatErrorStats).

export const SOURCES = ['practice', 'simulation', 'paper', 'diagnostic', 'daily', 'weekly']
export const REASONS = ['knowledge', 'misread', 'calculation', 'strategy', 'time', 'careless', 'none']
export const STATUSES = ['all', 'open', 'reviewed']
export const KINDS = ['all', 'wrong', 'unanswered']

export const EMPTY = {
  section: 'all', skill: 'all', difficulty: [], reason: 'all', source: 'all', status: 'all', kind: 'all', from: '', to: '',
}

/** Причина для фильтра: у неверного без причины — none; у неотвеченного причины нет вовсе. */
export function reasonOf(item) {
  if (item.kind === 'unanswered') return null
  return item.reason || 'none'
}

export function filterItems(items = [], f = EMPTY) {
  return items.filter((i) => {
    if (f.section !== 'all' && i.section !== f.section) return false
    if (f.skill !== 'all' && i.skillId !== f.skill) return false
    if (f.difficulty.length && !f.difficulty.includes(i.difficulty)) return false
    if (f.reason !== 'all' && reasonOf(i) !== f.reason) return false
    if (f.source !== 'all' && i.source !== f.source) return false
    if (f.status === 'open' && i.reviewed) return false
    if (f.status === 'reviewed' && !i.reviewed) return false
    if (f.kind !== 'all' && i.kind !== f.kind) return false
    const day = String(i.createdAt).slice(0, 10)
    if (f.from && day < f.from) return false
    if (f.to && day > f.to) return false
    return true
  })
}

/** Навыки, которые встречаются в списке, — для фильтра «Навык». */
export function skillsIn(items = []) {
  return [...new Set(items.map((i) => i.skillId).filter(Boolean))]
}

/** Доля причины от всех неверных (вместе с «не указана») — проценты не завышаются выкидыванием пропусков. */
export function reasonShares(byReason = {}) {
  const total = Object.values(byReason).reduce((a, n) => a + n, 0)
  return REASONS.filter((r) => byReason[r]).map((r) => ({ reason: r, n: byReason[r], pct: total ? Math.round((byReason[r] * 100) / total) : 0 }))
}
