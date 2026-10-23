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
