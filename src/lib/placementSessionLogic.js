// Правила проверки в рамках прогона — без базы, чтобы их можно было проверить
// тестами и не спорить с моками.
//
// Смысл ограничений: роут проверки не должен быть оракулом. В одном прогоне
// задание проверяется ровно один раз — повтор возвращает тот же вердикт, а не
// новый; заданий в прогоне ограниченное число. Подобрать ключ перебором внутри
// прогона нельзя, а заводить прогон на каждую попытку видно и по счётчику
// прогонов, и по их пустым журналам.

/**
 * Что делать с запросом на новый прогон, если у профиля уже есть прогоны.
 * Уровень определяется один раз — при регистрации: законченный прогон закрывает
 * тему, незаконченный продолжается (закрыл вкладку на середине — вернулся и
 * дошёл), а если прогонов нет, заводится новый. Без этого правила «один прогон
 * на попытку» позволяло бы и переигрывать результат, и подбирать ключи, открывая
 * прогон за прогоном.
 * @param {{finished: boolean, token: string, level: string|null}|null} existing
 * @returns {{action: 'blocked'|'resume'|'create', token?: string, level?: string|null}}
 */
export function decideRun(existing) {
  if (!existing) return { action: 'create' }
  if (existing.finished) return { action: 'blocked', level: existing.level ?? null }
  return { action: 'resume', token: existing.token }
}

/**
 * Смешивает новые ответы с уже записанными в прогоне.
 * @param {Array<{id: string, correct: number, at?: string}>} existing
 * @param {Array<{id: string, correct: number|null}>} fresh — свежепроверенные
 * @param {{max: number, at?: string}} options
 * @returns {{answers, scores, added, overflow}}
 *   answers — новая запись прогона, scores — что вернуть клиенту (в порядке
 *   запроса), overflow — прогон упёрся в потолок и ответы не приняты.
 */
export function mergeGradedAnswers(existing, fresh, { max, at = null } = {}) {
  const answers = [...(existing || [])]
  const known = new Map(answers.map((a) => [a.id, a]))
  const scores = []
  let added = 0

  for (const item of fresh || []) {
    const seen = known.get(item?.id)
    if (seen) {
      // Повторная проверка того же задания ничего не сообщает: тот же вердикт.
      scores.push({ id: item.id, correct: seen.correct })
      continue
    }
    if (answers.length >= max) {
      return { answers: existing || [], scores: [], added: 0, overflow: true }
    }
    const record = { id: item?.id, correct: item?.correct ?? null, at }
    answers.push(record)
    known.set(record.id, record)
    added++
    scores.push({ id: record.id, correct: record.correct })
  }

  return { answers, scores, added, overflow: false }
}
