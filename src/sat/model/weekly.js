// Недельный тест SAT (SAT-SYNC-PLAN B1, прототип weekly-test.js): 15 вопросов раз в неделю (7 R&W + 8 Math), набор
// держится всю неделю, экзаменационный режим без помощи, 20 минут — ориентир, а не отсечка. Правила выбора вопросов
// живут на бэкенде (SatWeeklyService); здесь — только то, что экрану нужно посчитать самому. Чистые функции под тестами.

/** Минуты-ориентир, если сервер не прислал timeLimitSeconds. */
export const WEEKLY_MINUTES = 20

/** Ключ черновика на устройстве: одна неделя — один черновик. */
export function draftKey(weekStart) {
  return `weekly-${weekStart}`
}

function parseIso(s) {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** Понедельник и воскресенье недели теста — для подписи «12–18 окт». */
export function weekRange(weekStart) {
  if (!weekStart) return null
  const from = parseIso(weekStart)
  const to = new Date(from.getTime() + 6 * 86400000)
  return { from, to }
}

/** Минуты-ориентир из ответа сервера. */
export function minutesOf(weekly) {
  const s = Number(weekly?.timeLimitSeconds)
  return s > 0 ? Math.round(s / 60) : WEEKLY_MINUTES
}

/**
 * Состояние карточки на «Сегодня»: empty — набора нет (банк пуст или ошибка), done — сдан, inProgress — на
 * устройстве есть начатый черновик этой недели, ready — можно начинать.
 */
export function cardState(weekly, hasDraft = false) {
  if (!weekly || !weekly.questions?.length) return weekly?.status === 'DONE' && weekly.result ? 'done' : 'empty'
  if (weekly.status === 'DONE') return 'done'
  return hasDraft ? 'inProgress' : 'ready'
}

/** Сколько вопросов каждой секции — плашки «R&W · 7», «Math · 8» на экране перед стартом. */
export function sectionCounts(questions = []) {
  let rw = 0
  let math = 0
  for (const q of questions) {
    if (q.section === 'math') math++
    else rw++
  }
  return { rw, math }
}

/**
 * Тело сдачи из сессии экрана вопроса: все вопросы набора по порядку, пустой ответ — null (сервер считает его
 * неверным, а не пропускает), время на вопросе — миллисекунды. timeOf(qid) — функция времени (timeOn из session.js,
 * у открытого вопроса время копится с показа, а не в timeMs).
 */
export function answersPayload(session, timeOf) {
  return session.questions.map(({ id }) => {
    const a = session.answers[id]
    const v = a?.value
    const answer = v == null || String(v).trim() === '' ? null : String(v)
    return { questionId: id, answer, timeSpentMs: Math.max(0, Math.round(timeOf ? timeOf(id) : a?.timeMs || 0)) }
  })
}

/** Тело сдачи: ответы плюс неделя и общее время (сервер принимает оба необязательными; повторная сдача вернёт итог). */
export function submitBody(weekStart, payload, elapsedSeconds) {
  return { weekStart, answers: payload, elapsedSeconds: Math.max(0, Math.round(elapsedSeconds || 0)) }
}

/** Сколько вопросов без ответа — предупреждение перед сдачей. */
export function unansweredCount(payload) {
  return payload.filter((x) => x.answer == null).length
}

/**
 * Строки экрана результата в порядке набора: вопрос (если сервер его прислал), ответ ученика, верный, разбор.
 * Пункт результата без вопроса в наборе тоже показываем — сервер мог заменить вопрос, а ответ уже записан.
 */
export function resultRows(result, questions = []) {
  if (!result) return []
  const byId = new Map((result.items || []).map((it) => [it.questionId, it]))
  const rows = []
  for (const q of questions) {
    const it = byId.get(q.id)
    if (!it) continue
    byId.delete(q.id)
    rows.push({ q, item: it, status: rowStatus(it) })
  }
  for (const it of byId.values()) rows.push({ q: null, item: it, status: rowStatus(it) })
  return rows
}

function rowStatus(it) {
  if (it.correct) return 'right'
  return it.answer == null || String(it.answer).trim() === '' ? 'skipped' : 'wrong'
}

/** Навыки, где ошибся (по разу, в порядке набора) — «Потренировать» после теста. */
export function missedSkills(result) {
  const out = []
  for (const it of result?.items || []) {
    // 'rw' / 'math' — вопрос без навыка (бэкенд метит секцией): тренировать по нему нечего
    if (!it.correct && it.skillId && it.skillId !== 'rw' && it.skillId !== 'math' && !out.includes(it.skillId)) out.push(it.skillId)
  }
  return out
}

/** Доля верных в процентах, без деления на ноль. */
export function pct(correct, total) {
  return total ? Math.round((correct * 100) / total) : 0
}

/** Домены итога: сначала R&W, потом Math, внутри — слабые первыми (по ним «Потренировать»). */
export function domainRows(result) {
  const rows = (result?.byDomain || []).map((d) => ({ ...d, pct: pct(d.correct, d.total) }))
  return rows.sort((a, b) => (a.section === b.section ? a.pct - b.pct : a.section === 'math' ? 1 : -1))
}

/** Прошлые недели для карточки: сданные, новые первыми, без текущей, не больше limit. */
export function pastWeeks(history = [], currentWeek = null, limit = 6) {
  return history
    .filter((h) => h && h.weekStart && h.weekStart !== currentWeek && h.completedAt)
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))
    .slice(0, limit)
}
