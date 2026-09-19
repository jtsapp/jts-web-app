// Правила проверки в рамках прогона — без базы, чтобы их можно было проверить
// тестами и не спорить с моками.
//
// Смысл ограничений: роут проверки не должен быть оракулом. В одном прогоне
// задание проверяется ровно один раз — повтор возвращает тот же вердикт, а не
// новый; заданий в прогоне ограниченное число. Подобрать ключ перебором внутри
// прогона нельзя, а заводить прогон на каждую попытку видно и по счётчику
// прогонов, и по их пустым журналам.

// Брошенный прогон не резюмируется вечно. mergeGradedAnswers отдаёт на повтор
// СТАРЫЙ вердикт по каждому заданию (см. её докстринг) — это и защищает от
// подбора ключа, и, будучи применено к прогону недельной давности, намертво
// приклеивает первый же случайный клик по разминке: студент отвечает верно
// заново, а сервер продолжает засчитывать давний промах. Найдено разбором
// реального случая — «тест всегда показывает A0» — и подтверждено прогоном
// gradeAnswers/mergeGradedAnswers/scoreGradedAnswers на боевом банке заданий:
// вторая, уже верная попытка добавляла 0 новых ответов, потому что все id
// разминки были «известны» по первой.
// Три часа — не научный подбор, а достаточный запас на «отвлекли, вернулся
// в тот же день», и заметно меньше, чем нужно на подбор ключа перебором
// (там счёт на десятки попыток, здесь — на попытку в несколько часов).
export const ABANDONED_RUN_TTL_MS = 3 * 60 * 60 * 1000

/**
 * Что делать с запросом на новый прогон, если у профиля уже есть прогоны.
 * Уровень определяется один раз — при регистрации: законченный прогон закрывает
 * тему, незаконченный продолжается (закрыл вкладку на середине — вернулся и
 * дошёл), а если прогонов нет, заводится новый. Без этого правила «один прогон
 * на попытку» позволяло бы и переигрывать результат, и подбирать ключи, открывая
 * прогон за прогоном.
 *
 * Резюмирование не безусловно: если с последнего ответа прошло больше
 * ABANDONED_RUN_TTL_MS, прогон считается брошенным и заводится новый —
 * иначе случайные клики по разминке в первой попытке залипают навсегда
 * (см. комментарий у ABANDONED_RUN_TTL_MS). `updatedAt` отсутствует у прогонов
 * без записи ответов и у старых записей без колонки — тогда TTL не считаем,
 * поведение как раньше (resume).
 * @param {{finished: boolean, token: string, level: string|null, updatedAt?: string|Date|null}|null} existing
 * @param {number} [now] — для тестов; по умолчанию текущее время
 * @returns {{action: 'blocked'|'resume'|'create', token?: string, level?: string|null}}
 */
export function decideRun(existing, now = Date.now()) {
  if (!existing) return { action: 'create' }
  if (existing.finished) return { action: 'blocked', level: existing.level ?? null }
  const updatedAt = existing.updatedAt ? new Date(existing.updatedAt).getTime() : null
  if (Number.isFinite(updatedAt) && now - updatedAt > ABANDONED_RUN_TTL_MS) {
    return { action: 'create' }
  }
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
