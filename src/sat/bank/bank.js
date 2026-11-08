// Режим «Все вопросы» (ТЗ SAT 21.10, задача 8): клетки банка и счётчики. Сервер отдаёт клетку массивом
// [id, сложность, 1 верно · 0 неверно · null не решал] — в R&W ~2000 вопросов, объекты раздули бы ответ.
import { matchesFilters } from '../practice/FilterBlocks.jsx'

export function cellResult(cell) {
  return cell[2] == null ? null : cell[2] === 1
}

/** «124 из 595 · 71% верно» — процент от решённых, а не от всего банка. */
export function topicProgress(topic) {
  const pct = topic.answered ? Math.round((topic.correct * 100) / topic.answered) : 0
  return { answered: topic.answered, total: topic.total, pct }
}

/**
 * Прогресс домена в дереве «Практики» — сумма его навыков в банке. Та же цифра, что у темы в «Все вопросы»
 * (ТЗ 21.10, задача 8: «124 из 595 · 71% верно» вместо «595 в банке»), поэтому числа в двух местах совпадают.
 */
export function skillsProgress(bank, skillIds) {
  const own = (bank?.topics || []).filter((t) => skillIds.includes(t.skillId))
  const sum = own.reduce((a, t) => ({ total: a.total + t.total, answered: a.answered + t.answered, correct: a.correct + t.correct }),
    { total: 0, answered: 0, correct: 0 })
  return topicProgress(sum)
}

/**
 * Клетки, которые оставляют фильтры (те же правила, что у практики): лишние скрываются, порядок и номер в банке
 * сохраняются — [клетка, номер с 1].
 */
export function visibleCells(topic, filters) {
  const out = []
  topic.cells.forEach((c, i) => {
    if (matchesFilters(filters, c[1], cellResult(c))) out.push([c, i + 1])
  })
  return out
}

/** Ответ пришёл — клетка перекрашивается сразу, счётчики темы и секции пересчитываются без перезагрузки. */
export function applyResult(bank, qid, correct) {
  let dAnswered = 0
  let dCorrect = 0
  const topics = bank.topics.map((topic) => {
    const i = topic.cells.findIndex((c) => c[0] === qid)
    if (i < 0) return topic
    const before = cellResult(topic.cells[i])
    const cells = topic.cells.slice()
    cells[i] = [qid, cells[i][1], correct ? 1 : 0]
    const a = before == null ? 1 : 0
    const c = (correct ? 1 : 0) - (before === true ? 1 : 0)
    dAnswered += a
    dCorrect += c
    return { ...topic, cells, answered: topic.answered + a, correct: topic.correct + c }
  })
  return { ...bank, topics, answered: bank.answered + dAnswered, correct: bank.correct + dCorrect }
}

/**
 * Темы «Все вопросы» — домены, а не навыки (Figma «NEW 2», 17:7703): навыков в R&W десяток, и список из десятка
 * строк по 40–600 клеток читался хуже четырёх доменов. Клетки домена идут подряд в порядке его навыков, номер — с 1
 * внутри домена. order — id доменов в порядке таксономии; домен, которого в нём нет, встаёт в конец в порядке банка.
 */
export function groupByDomain(bank, order = []) {
  const byDomain = new Map()
  for (const topic of bank?.topics || []) {
    const id = topic.domain || topic.skillId
    const acc = byDomain.get(id) || { domain: id, skillIds: [], total: 0, answered: 0, correct: 0, cells: [] }
    acc.skillIds.push(topic.skillId)
    acc.total += topic.total
    acc.answered += topic.answered
    acc.correct += topic.correct
    acc.cells = acc.cells.concat(topic.cells || [])
    byDomain.set(id, acc)
  }
  const rank = (id) => {
    const i = order.indexOf(id)
    return i < 0 ? order.length : i
  }
  // sort устойчив: домены вне таксономии сохраняют порядок банка
  return [...byDomain.values()].sort((a, b) => rank(a.domain) - rank(b.domain))
}

/** Строки сетки по 20 клеток с подписью «1–20» — номера берутся из самих клеток, поэтому с фильтром это «3–57». */
export function gridRows(cells, perRow = 20) {
  const rows = []
  for (let i = 0; i < cells.length; i += perRow) {
    const part = cells.slice(i, i + perRow)
    rows.push({ from: part[0][1], to: part[part.length - 1][1], cells: part })
  }
  return rows
}

/**
 * Длинная тема свёрнута до limit строк (макет: 8 строк = 160 клеток, дальше «Показать все 30 строк»): сетка на 600
 * клеток уводила остальные темы за три экрана вниз. hidden — сколько строк спрятано; 0 — сворачивать нечего.
 */
export function collapseRows(rows, limit = 8, expanded = false) {
  if (expanded || rows.length <= limit) return { rows, hidden: 0 }
  return { rows: rows.slice(0, limit), hidden: rows.length - limit }
}

/** Клетки банка в пределах навыков; skillIds = null — вся секция (модуль, свой набор, «Все вопросы»). */
export function scopeCells(bank, skillIds = null) {
  const out = []
  for (const topic of bank?.topics || []) {
    if (skillIds && !skillIds.includes(topic.skillId)) continue
    for (const c of topic.cells || []) out.push(c)
  }
  return out
}

/**
 * Числа на чипах фильтра (Figma 17:2184: «Easy 214 · Medium 252»). Каждый блок считается с выбором только другого
 * блока: выбор внутри блока складывается, и число у соседнего чипа того же блока не должно падать до нуля от того,
 * что рядом уже нажат другой.
 */
export function filterCounts(cells, filters) {
  const difficulty = { 1: 0, 2: 0, 3: 0 }
  const status = { right: 0, wrong: 0, new: 0 }
  for (const c of cells) {
    const r = cellResult(c)
    const answer = r == null ? 'new' : r ? 'right' : 'wrong'
    if (!filters.status.length || filters.status.includes(answer)) difficulty[c[1]] = (difficulty[c[1]] || 0) + 1
    if (!filters.difficulty.length || filters.difficulty.includes(c[1])) status[answer]++
  }
  return { difficulty, status }
}

/** Подпись прогресса темы: пока ничего не решено, «0 из 20 · 0% верно» читалось как провал, а не как «не начато». */
export function progressText(t, p) {
  if (!p.answered) return t('sat.bank.notStarted', { n: String(p.total) })
  return t('sat.bank.progress', { a: String(p.answered), n: String(p.total), p: String(p.pct) })
}
