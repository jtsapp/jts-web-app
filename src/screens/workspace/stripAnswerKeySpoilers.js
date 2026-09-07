/**
 * Спойлеры с ключом ответов курса («Why these answers» и похожие).
 *
 * В исходном HTML урока они лежат в `<details class="gref">` рядом с
 * упражнением. Экстрактор тащит их в info/practice html, и ученик открывает
 * спойлер или видит уже раскрытый разбор — списывает эталон до/вместо
 * проверки. На живом уроке ключ нужен только преподавателю (web-admin /
 * staff-режим); у ученика блок вырезаем целиком.
 *
 * Аудиоскрипт («What you heard») не трогаем: это не ключ ответов.
 */
const ANSWER_KEY_SUMMARY =
  /why\s+these\s+answers|check\s+yourself|answer\s+key|правильн\w*\s+ответ|разбор\s+ответ/i

function summaryText(detailsInnerHtml) {
  const m = /<summary\b[^>]*>([\s\S]*?)<\/summary>/i.exec(detailsInnerHtml || '')
  if (!m) return ''
  return m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Убирает из HTML блоки-разборы ответов. Без DOM — чтобы работало и в Node-тестах.
 */
export function stripAnswerKeySpoilers(html) {
  const source = String(html || '')
  if (!source.trim()) return ''
  return source.replace(/<details\b[^>]*>([\s\S]*?)<\/details>/gi, (full, inner) => {
    const summary = summaryText(inner)
    if (summary && ANSWER_KEY_SUMMARY.test(summary)) return ''
    // Иногда заголовок разбора лежит прямо в классе/теле без <summary>.
    if (!summary && /why\s+these\s+answers/i.test(inner)) return ''
    return full
  })
}

export function isAnswerKeySpoilerHtml(html) {
  const source = String(html || '')
  if (!ANSWER_KEY_SUMMARY.test(source) && !/why\s+these\s+answers/i.test(source)) {
    return false
  }
  // Блок целиком — один спойлер-ключ без другого содержимого.
  const stripped = stripAnswerKeySpoilers(source).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return stripped.length === 0
}
