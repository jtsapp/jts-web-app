// «Работа над ошибками» (ТЗ SAT 21.10, задача 9; вёрстка — «NEW 2», 17:9002 / 17:9658): фильтры списка, счётчики,
// полосы статистики. Список приходит целиком (у студента он короткий), поэтому фильтрует экран — сразу, без запроса на
// каждый клик. Статистику и выводы считает сервер (SatErrorStats), здесь — только раскладка его цифр в полосы.

export const SOURCES = ['practice', 'simulation', 'paper', 'diagnostic', 'daily', 'weekly']
/** Причины, которые студент выбирает в окне «Какая это была ошибка?», — порядок чипов макета. */
export const REASONS = ['time', 'calculation', 'knowledge', 'misread', 'strategy', 'careless']
/** Пункты фильтра «Причина»: «Не ответил» — тоже причина (17:9002), отдельного селекта «Вид» больше нет. */
export const REASON_FILTER = [...REASONS, 'none', 'unanswered']
export const STATUSES = ['all', 'open', 'reviewed']

export const EMPTY = {
  section: 'all', skill: 'all', difficulty: [], reason: 'all', source: 'all', status: 'all', from: '', to: '',
}

/** Причина строки: неотвеченный — «unanswered», неверный без причины — «none» (студент закрыл окно). */
export function reasonOf(item) {
  if (item.kind === 'unanswered') return 'unanswered'
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
    const day = String(i.createdAt).slice(0, 10)
    if (f.from && day < f.from) return false
    if (f.to && day > f.to) return false
    return true
  })
}

/** Сколько фильтров отличается от пустых — «Сбросить» видна только тогда, когда есть что сбрасывать. */
export function activeFilters(f = EMPTY) {
  return Object.keys(EMPTY).filter((k) => (Array.isArray(EMPTY[k]) ? f[k]?.length : f[k] !== EMPTY[k])).length
}

/** Навыки, которые встречаются в списке, — для фильтра «Навык». */
export function skillsIn(items = []) {
  return [...new Set(items.map((i) => i.skillId).filter(Boolean))]
}

/** Плитки «всего / разобрано / не разобрано» и полоса «Разобрано N%» — по всему журналу, не по фильтру. */
export function counters(items = []) {
  const total = items.length
  const reviewed = items.filter((i) => i.reviewed).length
  return { total, reviewed, open: total - reviewed, pct: total ? Math.round((reviewed * 100) / total) : 0 }
}

/**
 * «Распределение по причинам» (17:9658): строки только по причинам, которые студент назвал, — от частой к редкой.
 * Процент — от всех ошибок журнала (как в макете), длина полосы — от самой частой причины, чтобы разница читалась и
 * при малых долях. Ошибки без причины — не полоса, а сноска: это не причина, а пропущенный ответ окна.
 */
export function reasonBars(byReason = {}, total = 0) {
  const rows = REASONS.filter((r) => byReason[r] > 0).map((r) => ({ reason: r, n: byReason[r] }))
  rows.sort((a, b) => b.n - a.n)
  const max = rows[0]?.n || 1
  return {
    rows: rows.map((r) => ({ ...r, pct: total ? Math.round((r.n * 100) / total) : 0, width: Math.round((r.n * 100) / max) })),
    none: byReason.none || 0,
  }
}

/** Полосы правой колонки (секции, навыки, сложность): [ключ, число] → длина от наибольшего. */
export function barsOf(pairs = []) {
  const max = Math.max(1, ...pairs.map(([, n]) => n))
  return pairs.map(([key, n]) => ({ key, n, width: Math.round((n * 100) / max) }))
}

/**
 * Цвет и значок вывода «Над чем работать» — от причины, о которой он говорит: тот же цвет, что у её чипа в журнале.
 * knowledgeSkill — пробел в знаниях конкретного навыка, trend — снижение ошибок (зелёный).
 */
export function insightTone(key) {
  if (key === 'knowledgeSkill') return 'knowledge'
  if (key === 'trend') return 'trend'
  return [...REASONS, 'unanswered'].includes(key) ? key : 'unanswered'
}
