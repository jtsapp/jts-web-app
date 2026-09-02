// Сопоставление «короткая метка тьютора» ↔ «полный текст ошибки» из журналов.
//
// Зачем отдельный модуль. Ошибку в mistake_log/review_item пишет агент строкой
// `{категория}: {сказал} → {правильно} ({правило})`, а гасит её потом другой
// строкой — коротким ярлыком из log_review / mark_resolved («Past Simple
// questions with did»). Раньше обе стороны сравнивались подстрокой, и на живых
// данных прода это почти всегда промахивалось: в ярлыке «questions», в тексте
// ошибки «question» да ещё в кавычках. Итог — ошибка не гасла НИКОГДА:
// 03.09.2026 в проде все 56 строк review_item висели в box 0 с due_at в
// прошлом, то есть заезжали в промпт КАЖДОГО звонка. Ученик, один раз
// напоровшийся на Past Simple, слышал про него в каждой сессии подряд.
//
// Поэтому сравниваем не подстроки, а множества значимых токенов, одинаково
// нормализованные с обеих сторон.

// Служебные слова выкинуты намеренно узким списком: `was/were/did/is/are` —
// это САМА тема ошибки, их выбрасывать нельзя, иначе «Past Simple with did»
// и «Present Simple with does» станут неотличимы.
const STOPWORDS = new Set(['a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'and', 'or'])

function normalizeText(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

// Грубое приведение к единственному: «questions» → «question». Именно на этом
// расходились ярлык и текст ошибки. Правило намеренно тупое и симметричное —
// обе стороны портятся одинаково («asks» → «ask», «does» → «doe»), так что для
// сравнения этого достаточно, а стеммер тянуть незачем. Короткие слова не
// трогаем: «is», «as», «his» не должны терять «s».
function singular(token) {
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1)
  return token
}

/** Значимые токены строки: нижний регистр, без пунктуации, без служебных слов. */
export function reviewTokens(s) {
  const norm = normalizeText(s)
  if (!norm) return []
  return norm
    .split(' ')
    .filter((t) => t && !STOPWORDS.has(t))
    .map(singular)
}

/**
 * Относится ли `query` (ярлык от тьютора или строка из resolved_log) к
 * конкретной записи журнала `itemText`.
 *
 * Планка сознательно высокая: лучше не погасить ошибку, чем погасить чужую —
 * непогашенная всплывёт ещё раз, а погашенная по ошибке пропадает навсегда.
 */
export function matchesReviewItem(itemText, query) {
  const item = normalizeText(itemText)
  const q = normalizeText(query)
  if (!item || !q) return false

  const queryTokens = new Set(reviewTokens(query))
  if (queryTokens.size === 0) return false

  // Один токен — слишком тупой инструмент для множеств («article» есть в
  // половине журнала), поэтому для него оставляем старое строгое вхождение.
  if (queryTokens.size === 1) return item.includes(q)

  const itemTokens = new Set(reviewTokens(itemText))
  let hits = 0
  for (const t of queryTokens) if (itemTokens.has(t)) hits++

  if (hits === queryTokens.size) return true
  // Длинному ярлыку прощаем одно слово: методист пишет «...with did», агент —
  // «...using did». Три совпадения из четырёх — уже не совпадение наугад.
  return queryTokens.size >= 4 && hits >= 3 && hits / queryTokens.size >= 0.75
}

/**
 * Два списка ошибок для промпта тьютора: что спросить сегодня по расписанию
 * (dueReviews) и что просто держать в уме (mistakes).
 *
 * Инвариант, ради которого функция и существует: строка не может попасть в оба
 * списка сразу. В промпте это два отдельных блока, и оба велят «quiz on these»,
 * так что дубль давал ошибке двойной вес и делал её темой всего урока.
 * Плюс общий отсев «пройденного» из resolved_log — одним правилом для обоих
 * списков, чтобы они не расходились.
 */
export function splitReviewLists({
  mistakes = [],
  due = [],
  parked = [],
  resolved = [],
  cap = 12,
} = {}) {
  const isResolved = (text) => resolved.some((r) => matchesReviewItem(text, r))
  const dueReviews = due.filter((m) => !isResolved(m))
  // Под расписанием — значит спросят тогда, когда спросят. В блок «просто
  // ошибки» такие не идут вовсе: там тот же приказ «quiz on these», и через
  // него отложенная ошибка вернулась бы в промпт уже на следующем звонке.
  // Ошибка БЕЗ строки расписания (миграция не доехала, вставка не прошла)
  // остаётся видимой — иначе тьютор потерял бы её совсем.
  const parkedSet = new Set(parked)
  return {
    dueReviews,
    mistakes: mistakes.filter((m) => !isResolved(m) && !parkedSet.has(m)).slice(0, cap),
  }
}
