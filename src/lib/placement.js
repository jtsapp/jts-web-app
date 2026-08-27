// Разбор результата теста на определение уровня. Движок (practice/placement)
// отдаёт весь объект result() — с θ, SE, флагами, профилем по навыкам и
// баллами блоков. Приложению из него нужен уровень, и брать его надо
// аккуратно: это единственное поле, которое уезжает в профиль студента и
// определяет весь его дальнейший контент.

// Шкала раннера начинается с A0 — в отличие от старого адаптивного теста
// (src/cefr.js), где нижней ступенью была A1 и новичку было некуда попасть.
export const PLACEMENT_LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

/** Уровень из результата раннера; null, если поле пустое или незнакомое —
 *  лучше не трогать профиль вовсе, чем записать в него мусор. */
export function placementLevel(result) {
  const level = String(result?.level || '').trim().toUpperCase()
  return PLACEMENT_LEVELS.includes(level) ? level : null
}

/** Флаги качества сессии: раннер помечает ими прохождение, которому не стоит
 *  верить как есть (угадывание в LexTALE, слишком быстрые ответы и т.п.).
 *  Уровень при этом всё равно приходит — флаги нужны, чтобы преподаватель
 *  видел, что результат спорный, а не чтобы блокировать студента. */
export function placementFlags(result) {
  return Array.isArray(result?.flags) ? result.flags.filter((f) => typeof f === 'string') : []
}

/** Короткая сводка для профиля и логов: уровень, θ, SE и флаги. θ и SE
 *  сохраняем числами — по ним видно, насколько уверенной была оценка. */
export function placementSummary(result) {
  const level = placementLevel(result)
  if (!level) return null
  const num = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : null)
  return {
    level,
    theta: num(result?.theta),
    se: num(result?.se),
    flags: placementFlags(result),
  }
}
