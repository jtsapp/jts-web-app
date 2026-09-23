// Уровень, по которому «Практика» фильтрует контент (переключатель A1–C2 в
// шапке раздела, макет Figma «Макеты» 5316:1548).
//
// Переключатель в макете ровно из шести уровней, без A0: ученик A0 видит в
// нём A1 — ближайший уровень, у которого в разделе вообще есть контент. Сами
// каталоги с A0 (грамматика, воркбуки) это не прячет: полный каталог
// грамматики открывается «Посмотреть все» со своими чипами уровней.

export const PRACTICE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

// 'b1', 'B1+', ' B1 ' → 'B1'; всё, что не похоже на CEFR, — null. Уровень у
// книг и караоке приходит из админки свободной строкой, поэтому нормализуем
// по первым двум знакам, а не сравниваем строки целиком.
export function cefrOf(value) {
  const m = /^([ABC])([0-2])/.exec(String(value || '').trim().toUpperCase())
  return m ? m[1] + m[2] : null
}

/** Уровень ученика → пункт переключателя. Неизвестный и A0 — A1. */
export function practiceLevelFor(userLevel) {
  const c = cefrOf(userLevel)
  return c && PRACTICE_LEVELS.includes(c) ? c : 'A1'
}

/**
 * Подходит ли материал выбранному уровню.
 *
 * Материал без уровня (методист его не проставил) остаётся на месте: спрятать
 * его значило бы потерять из раздела совсем — ни один пункт переключателя
 * его бы не показал.
 */
export function matchesLevel(itemLevel, level) {
  const c = cefrOf(itemLevel)
  return !c || c === level
}

/**
 * Ближайший уровень из доступных у раздела (коды в нижнем регистре, по
 * возрастанию). Для ситуаций и грамматики, где у каждого уровня своя
 * программа: пустой раздел на C2 хуже, чем честный C1 — так же, как это
 * уже делает levelToCourse у грамматики.
 */
export function nearestLevelCode(level, codes) {
  const order = ['a0', ...PRACTICE_LEVELS.map((l) => l.toLowerCase())]
  const want = order.indexOf(String(level || '').toLowerCase())
  if (!codes.length) return null
  if (want < 0) return codes[0]
  let best = codes[0]
  for (const code of codes) {
    if (Math.abs(order.indexOf(code) - want) < Math.abs(order.indexOf(best) - want)) best = code
  }
  return best
}
